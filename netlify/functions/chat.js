// netlify/functions/chat.js
// Portfolio chatbot with optional RAG enhancement
// Falls back to static prompt if Firebase Admin isn't configured

// OpenRouter pricing per 1K tokens
const MODEL_PRICING = {
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006, name: 'GPT-4o Mini', provider: 'OpenAI' },
  'anthropic/claude-3-5-haiku-latest': { input: 0.0008, output: 0.004, name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  'google/gemini-2.0-flash-001': { input: 0.0001, output: 0.0004, name: 'Gemini 2.0 Flash', provider: 'Google' },
  'meta-llama/llama-3.3-70b-instruct': { input: 0.0003, output: 0.0004, name: 'Llama 3.3 70B', provider: 'Meta' },
  'mistralai/mistral-small-24b-instruct-2501': { input: 0.00014, output: 0.00014, name: 'Mistral Small', provider: 'Mistral' },
  'deepseek/deepseek-chat': { input: 0.00014, output: 0.00028, name: 'DeepSeek V3', provider: 'DeepSeek' },
};

const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;

// Firebase Admin - only initialize if credentials are available
let db = null;
let admin = null;
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return !!db;
  firebaseInitialized = true;
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!projectId || !clientEmail || !privateKey) {
    console.log('Firebase Admin credentials not configured - RAG disabled');
    return false;
  }
  
  try {
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
    }
    db = admin.firestore();
    console.log('Firebase Admin initialized - RAG enabled');
    return true;
  } catch (error) {
    console.error('Firebase Admin init failed:', error.message);
    return false;
  }
}

// ===== MAIN HANDLER =====
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { messages, mode = 'professional', model: requestedModel, sessionId } = JSON.parse(event.body);
    const model = MODEL_PRICING[requestedModel] ? requestedModel : DEFAULT_MODEL;
    const pricing = MODEL_PRICING[model];

    // Get user's latest message
    const userMessage = messages[messages.length - 1]?.content || '';

    // Try RAG if Firebase is available
    let systemPrompt;
    let ragInfo = null;
    
    const ragEnabled = initFirebase();
    
    if (ragEnabled && OPENAI_API_KEY) {
      try {
        const ragResult = await getRAGContext(userMessage, mode, messages.length);
        systemPrompt = ragResult.systemPrompt;
        ragInfo = ragResult.ragInfo;
      } catch (ragError) {
        console.error('RAG error, falling back to static prompt:', ragError.message);
        systemPrompt = buildStaticSystemPrompt(mode);
      }
    } else {
      systemPrompt = buildStaticSystemPrompt(mode);
    }

    // Call LLM via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni Portfolio Chat'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 1024,
        temperature: mode === 'funny' ? 0.9 : 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter error:', data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'LLM API error' })
      };
    }

    // Calculate costs
    const usage = data.usage || {};
    const inputCost = (usage.prompt_tokens || 0) / 1000 * pricing.input;
    const outputCost = (usage.completion_tokens || 0) / 1000 * pricing.output;
    const embeddingCost = ragInfo?.embeddingCost || 0;
    const totalCost = inputCost + outputCost + embeddingCost;

    // Log to Firebase if available (async, don't wait)
    if (db) {
      logChat({
        sessionId,
        userMessage,
        assistantMessage: data.choices?.[0]?.message?.content,
        model,
        mode,
        ragEnabled: !!ragInfo,
        usage,
        costs: { input: inputCost, output: outputCost, embedding: embeddingCost, total: totalCost }
      }).catch(console.error);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...data,
        model,
        modelName: pricing.name,
        provider: pricing.provider,
        _rag: ragInfo || { enabled: false },
        usage: {
          ...usage,
          inputCost: inputCost.toFixed(6),
          outputCost: outputCost.toFixed(6),
          embeddingCost: embeddingCost.toFixed(6),
          totalCost: totalCost.toFixed(6)
        }
      })
    };

  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};

// ===== RAG FUNCTIONS =====

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000)
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  return {
    embedding: data.data[0].embedding,
    tokens: data.usage.total_tokens
  };
}

async function getRAGContext(query, mode, messageCount) {
  const RAG_COLLECTION = 'rag_knowledge_base';
  
  // Detect intent
  const intent = detectIntent(query);
  const { topK, categories } = intent.settings;
  
  // Get query embedding
  const { embedding: queryEmbedding, tokens } = await getEmbedding(query);
  const embeddingCost = tokens / 1000000 * 0.02;
  
  // Fetch and rank chunks
  const snapshot = await db.collection(RAG_COLLECTION).get();
  
  let results = snapshot.docs
    .filter(doc => {
      const data = doc.data();
      if (!data.embedding) return false;
      if (categories && !categories.includes(data.category)) return false;
      return true;
    })
    .map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        category: data.category,
        content: data.content,
        similarity: cosineSimilarity(queryEmbedding, data.embedding),
        tokenEstimate: data.tokenEstimate
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
  
  // Fallback to all categories if no results
  if (results.length === 0 && categories) {
    results = snapshot.docs
      .filter(doc => doc.data().embedding)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          category: data.category,
          content: data.content,
          similarity: cosineSimilarity(queryEmbedding, data.embedding),
          tokenEstimate: data.tokenEstimate
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
  
  // Build system prompt with RAG context
  const systemPrompt = buildRAGSystemPrompt(mode, intent, results, messageCount);
  
  return {
    systemPrompt,
    ragInfo: {
      enabled: true,
      intent: intent.intent,
      intentConfidence: intent.confidence,
      chunksRetrieved: results.length,
      topChunks: results.slice(0, 3).map(c => ({
        title: c.title,
        category: c.category,
        similarity: c.similarity.toFixed(3)
      })),
      embeddingCost
    }
  };
}

function detectIntent(message) {
  const lower = message.toLowerCase();
  
  const intents = {
    job_analysis: {
      keywords: ['responsibilities', 'requirements', 'qualifications', 'experience required', 'we are looking', 'ideal candidate', 'job description', 'role:', 'about the role', 'years of experience'],
      lengthThreshold: 400,
      topK: 12,
      categories: null
    },
    contact: {
      keywords: ['email', 'phone', 'contact', 'linkedin', 'github', 'reach', 'get in touch'],
      topK: 2,
      categories: ['bio']
    },
    project_specific: {
      keywords: ['embedroute', 'row crew', 'rowcrew', 'bench only', 'benchonly', 'old ways', 'oldways', 'tcgdoku', 'dumarket', 'azoni.ai', 'dustbunny', 'oli fitness'],
      topK: 4,
      categories: ['project']
    },
    projects: {
      keywords: ['project', 'built', 'portfolio', 'app', 'shipped', 'work on', 'created', 'developed', 'building'],
      topK: 8,
      categories: ['project', 'experience']
    },
    experience: {
      keywords: ['experience', 'work history', 'previous job', 'capital one', 't-mobile', 'tmobile', 'career', 'background', 'worked at'],
      topK: 6,
      categories: ['experience', 'bio']
    },
    skills: {
      keywords: ['skill', 'tech', 'stack', 'language', 'framework', 'know', 'proficient', 'python', 'react', 'javascript', 'typescript', 'ai', 'ml', 'machine learning', 'llm', 'rag', 'embedding', 'database', 'aws', 'frontend', 'backend', 'api', 'node', 'firebase', 'openai', 'claude', 'gpt'],
      topK: 6,
      categories: ['skill']
    },
    hire: {
      keywords: ['hire', 'why should', 'strength', 'weakness', 'good at', 'best at', 'stand out', 'different'],
      topK: 6,
      categories: ['bio', 'faq']
    }
  };

  // Check job analysis first
  if (message.length > intents.job_analysis.lengthThreshold ||
      intents.job_analysis.keywords.some(kw => lower.includes(kw))) {
    return {
      intent: 'job_analysis',
      confidence: 'high',
      settings: intents.job_analysis
    };
  }

  // Check skills BEFORE experience - so "experience with Python" → skills
  const skillMatches = intents.skills.keywords.filter(kw => lower.includes(kw));
  if (skillMatches.length > 0) {
    return {
      intent: 'skills',
      confidence: skillMatches.length > 2 ? 'high' : 'medium',
      matchedKeywords: skillMatches,
      settings: intents.skills
    };
  }

  // Check other intents
  for (const [intent, config] of Object.entries(intents)) {
    if (intent === 'job_analysis' || intent === 'skills') continue;
    const matches = config.keywords.filter(kw => lower.includes(kw));
    if (matches.length > 0) {
      return {
        intent,
        confidence: matches.length > 2 ? 'high' : 'medium',
        matchedKeywords: matches,
        settings: config
      };
    }
  }

  return {
    intent: 'general',
    confidence: 'low',
    settings: { topK: 5, categories: null }
  };
}

function buildRAGSystemPrompt(mode, intent, chunks, messageCount) {
  const tones = {
    professional: 'Be professional and concise. Highlight relevant qualifications clearly.',
    friendly: 'Be warm and approachable while remaining informative.',
    casual: 'Be relaxed and conversational, like talking to a colleague.',
    funny: 'Add humor and personality while still being helpful and accurate.'
  };

  const contextBlocks = chunks.map(c => {
    const similarityNote = c.similarity > 0 ? ` [relevance: ${(c.similarity * 100).toFixed(0)}%]` : '';
    return `### ${c.title} (${c.category})${similarityNote}\n${c.content}`;
  }).join('\n\n');

  let prompt = `You are Azoni-GPT, an AI assistant representing Charlton Smith, a software engineer based in Seattle. Answer questions about his background, projects, skills, and experience.

TONE: ${tones[mode] || tones.professional}

RULES:
1. Use ONLY the information in CONTEXT below. Do not invent or assume details.
2. If the context doesn't have the answer, say so honestly.
3. Refer to Charlton in third person unless asked to roleplay.
4. Be concise but thorough.
5. Include specific numbers, dates, project names, and URLs when available.
6. DO NOT use markdown formatting (no **, no ##, no \`code\`, no bullet points with -). Write in plain conversational text. Use line breaks to separate thoughts if needed.

DETECTED INTENT: ${intent.intent} (confidence: ${intent.confidence})

---
CONTEXT:
${contextBlocks}
---
`;

  if (intent.intent === 'job_analysis') {
    prompt += `
JOB DESCRIPTION ANALYSIS MODE:
Provide a detailed fit analysis covering:
1. Matching Requirements - Requirements Charlton meets with evidence
2. Strong Points - His unique strengths for this role  
3. Potential Gaps - Honestly note areas with less experience
4. Fit Assessment - Strong/Good/Moderate Fit with reasoning

Use plain text with line breaks between sections. No markdown.
`;
  }

  if (messageCount > 2) {
    prompt += `\nThis is message ${messageCount}. Build on previous context naturally.`;
  }

  return prompt;
}

// ===== STATIC FALLBACK PROMPT =====
function buildStaticSystemPrompt(mode) {
  const toneInstructions = {
    professional: 'Be professional, concise, and highlight relevant qualifications.',
    friendly: 'Be warm and approachable while remaining informative.',
    casual: 'Be relaxed and conversational, like talking to a friend.',
    funny: 'Add humor and wit while still being helpful and informative.'
  };

  return `You are Azoni-GPT, an AI assistant that represents Charlton Smith, a software engineer. Your job is to answer questions about Charlton's background, skills, projects, and experience. Always speak in third person about Charlton unless asked to roleplay as him.

TONE: ${toneInstructions[mode] || toneInstructions.professional}

CHARLTON'S PROFILE:
- Name: Charlton Smith
- Location: Seattle, WA
- Education: M.S. Software Engineering (Colorado Technical University, 2021), B.S. Computer Science (University of Washington Tacoma, 2017, Graduated with Honors)
- Experience: 7+ years as a software engineer

CURRENT FOCUS:
- LLM agents and AI-powered applications
- Tools for web3, crypto, and fintech
- Full-stack development with React and FastAPI

SKILLS:
Languages: Python, JavaScript, Java, SQL, C#
AI/ML: OpenAI APIs (GPT-4), Claude API, LLM Agents, RAG, LangChain, Prompt Engineering
Frontend: React, Vite, HTML, CSS, Mobile-First Responsive Design
Backend: Node.js, FastAPI, Django, REST APIs, Microservices
Cloud: AWS (Lambda, EC2, S3), Docker, CI/CD, Netlify, Render
Databases: PostgreSQL, MongoDB, Redis, Firebase, SQLite

WORK EXPERIENCE:
- Senior Software Engineer at Capital One (Nov 2022 - Nov 2023): Led automated testing pipelines using AWS Lambda, S3, CloudWatch. Built Python microservices. Mentored junior engineers.
- Software Engineer II at T-Mobile (Jun 2018 - Apr 2022): Built automation platform reducing workload by 80%. Designed Python/Django backend with microservices. Led Angular frontend development.
- Computer Science Instructor at Nucamp (2018): Taught full-stack development to career-transition students.
- Co-founder at OLI Fitness (2016-2018): Built computer vision fitness tracking with Kinect SDK. Published at ACM CHI 2017.

CURRENT PROJECTS:
- EmbedRoute: Unified embedding API gateway (Next.js, Supabase, Vercel)
- Old Ways Today: Full-stack AI chatbot helping families find non-toxic products.
- Row Crew: AI fitness app using Claude's multimodal API to extract workout metrics from photos.
- Bench Only: AI strength training PWA with GPT-4o-mini coach.
- Dustbunny (2021-2022): NFT bidding system across 50 machines, 2,500+ requests/minute.
- azoni.ai: This portfolio with AI assistant.

NOTABLE ACHIEVEMENTS:
- Published extended abstract at ACM CHI 2017 on computer vision for fitness
- 1st Place at T-Mobile Big Data Hackathon
- Co-founded OLI Fitness startup, regional finalist at Princeton Tiger Launch
- Head Organizer, Global AI Hackathon Seattle 2017

FOR RECRUITERS:
If someone pastes a job description, analyze how Charlton's experience matches the requirements and make a compelling case for why he'd be a good fit.

FORMATTING:
Do NOT use markdown formatting (no **, no ##, no \`code\`, no bullet points with - or *). Write in plain conversational text. Use line breaks to separate thoughts if needed.

Keep responses concise but informative. If you don't know something specific about Charlton, say so rather than making things up.`;
}

// ===== LOGGING =====
async function logChat(data) {
  if (!db) return;
  try {
    await db.collection('chat_logs').add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log chat:', error);
  }
}