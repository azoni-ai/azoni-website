// netlify/functions/chat.js
// RAG-powered portfolio chatbot using Firebase

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();
const RAG_COLLECTION = 'rag_knowledge_base';
const CHAT_LOGS_COLLECTION = 'chat_logs';

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

  const startTime = Date.now();

  try {
    const { messages, mode = 'professional', model: requestedModel, sessionId } = JSON.parse(event.body);
    const model = MODEL_PRICING[requestedModel] ? requestedModel : DEFAULT_MODEL;
    const pricing = MODEL_PRICING[model];

    // Get user's latest message
    const userMessage = messages[messages.length - 1]?.content || '';

    // Detect intent
    const intentResult = detectIntent(userMessage);

    // Retrieve relevant chunks via RAG
    const ragStartTime = Date.now();
    const retrievalResult = await retrieveContext(userMessage, intentResult.intent);
    const ragLatency = Date.now() - ragStartTime;

    // Build dynamic system prompt
    const systemPrompt = buildSystemPrompt(mode, intentResult, retrievalResult.chunks, messages.length);

    // Call LLM
    const llmStartTime = Date.now();
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
    const llmLatency = Date.now() - llmStartTime;

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
    const totalCost = inputCost + outputCost + retrievalResult.embeddingCost;

    // Log chat for analytics (async, don't wait)
    logChat({
      sessionId,
      userMessage,
      assistantMessage: data.choices?.[0]?.message?.content,
      model,
      mode,
      intent: intentResult,
      chunksUsed: retrievalResult.chunks.map(c => ({ id: c.id, title: c.title, similarity: c.similarity })),
      usage,
      costs: { input: inputCost, output: outputCost, embedding: retrievalResult.embeddingCost, total: totalCost },
      latency: { rag: ragLatency, llm: llmLatency, total: Date.now() - startTime }
    }).catch(console.error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...data,
        model,
        modelName: pricing.name,
        provider: pricing.provider,
        _rag: {
          intent: intentResult.intent,
          intentConfidence: intentResult.confidence,
          chunksRetrieved: retrievalResult.chunks.length,
          topChunks: retrievalResult.chunks.slice(0, 3).map(c => ({
            title: c.title,
            category: c.category,
            similarity: c.similarity.toFixed(3)
          })),
          ragLatencyMs: ragLatency,
          llmLatencyMs: llmLatency
        },
        usage: {
          ...usage,
          inputCost: inputCost.toFixed(6),
          outputCost: outputCost.toFixed(6),
          embeddingCost: retrievalResult.embeddingCost.toFixed(6),
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

// ===== INTENT DETECTION =====
function detectIntent(message) {
  const lower = message.toLowerCase();

  // Intent definitions with keywords and settings
  const intents = {
    job_analysis: {
      keywords: ['responsibilities', 'requirements', 'qualifications', 'experience required', 'we are looking', 'ideal candidate', 'job description', 'role:', 'about the role', 'years of experience'],
      lengthThreshold: 400,
      topK: 12,
      categories: null // All categories
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
      keywords: ['skill', 'tech', 'stack', 'language', 'framework', 'know', 'proficient', 'python', 'react', 'javascript', 'typescript', 'ai', 'ml', 'database', 'aws'],
      topK: 5,
      categories: ['skill']
    },
    hire: {
      keywords: ['hire', 'why should', 'strength', 'weakness', 'good at', 'best at', 'stand out', 'different'],
      topK: 6,
      categories: ['bio', 'faq']
    }
  };

  // Check job analysis first (length-based or keywords)
  if (message.length > intents.job_analysis.lengthThreshold ||
      intents.job_analysis.keywords.some(kw => lower.includes(kw))) {
    return {
      intent: 'job_analysis',
      confidence: 'high',
      matchedKeywords: intents.job_analysis.keywords.filter(kw => lower.includes(kw)),
      settings: intents.job_analysis
    };
  }

  // Check other intents
  for (const [intent, config] of Object.entries(intents)) {
    if (intent === 'job_analysis') continue;

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
    matchedKeywords: [],
    settings: { topK: 5, categories: null }
  };
}

// ===== RAG RETRIEVAL =====
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

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

  if (data.error) {
    throw new Error(`OpenAI error: ${data.error.message}`);
  }

  return {
    embedding: data.data[0].embedding,
    tokens: data.usage.total_tokens
  };
}

async function retrieveContext(query, intent) {
  try {
    // Get intent settings
    const intentResult = detectIntent(query);
    const { topK, categories } = intentResult.settings;

    // Get query embedding
    const { embedding: queryEmbedding, tokens } = await getEmbedding(query);
    const embeddingCost = tokens / 1000000 * 0.02;

    // Fetch chunks from Firebase (filter by category if specified)
    let chunksQuery = db.collection(RAG_COLLECTION);
    const snapshot = await chunksQuery.get();

    // Calculate similarities and filter
    let results = snapshot.docs
      .filter(doc => {
        const data = doc.data();
        // Must have embedding
        if (!data.embedding) return false;
        // Filter by category if specified
        if (categories && !categories.includes(data.category)) return false;
        return true;
      })
      .map(doc => {
        const data = doc.data();
        const similarity = cosineSimilarity(queryEmbedding, data.embedding);
        return {
          id: doc.id,
          title: data.title,
          category: data.category,
          content: data.content,
          metadata: data.metadata,
          similarity,
          tokenEstimate: data.tokenEstimate
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    // If no good results, fall back to all categories
    if (results.length === 0 && categories) {
      results = snapshot.docs
        .filter(doc => doc.data().embedding)
        .map(doc => {
          const data = doc.data();
          const similarity = cosineSimilarity(queryEmbedding, data.embedding);
          return {
            id: doc.id,
            title: data.title,
            category: data.category,
            content: data.content,
            metadata: data.metadata,
            similarity,
            tokenEstimate: data.tokenEstimate
          };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    }

    return {
      chunks: results,
      embeddingCost,
      queryTokens: tokens
    };

  } catch (error) {
    console.error('RAG retrieval error:', error);
    // Return minimal fallback
    return {
      chunks: [{
        id: 'fallback',
        title: 'Summary',
        category: 'bio',
        content: 'Charlton Smith is a software engineer with 7+ years experience, building AI-powered applications in Seattle. Portfolio: azoni.ai. Email: charltonuw@gmail.com.',
        similarity: 0
      }],
      embeddingCost: 0,
      queryTokens: 0
    };
  }
}

// ===== SYSTEM PROMPT BUILDER =====
function buildSystemPrompt(mode, intentResult, chunks, messageCount) {
  const tones = {
    professional: 'Be professional and concise. Highlight relevant qualifications clearly.',
    friendly: 'Be warm and approachable while remaining informative.',
    casual: 'Be relaxed and conversational, like talking to a colleague.',
    funny: 'Add humor and personality while still being helpful and accurate.'
  };

  // Format retrieved chunks into context
  const contextBlocks = chunks.map(c => {
    const similarityNote = c.similarity > 0 ? ` [relevance: ${(c.similarity * 100).toFixed(0)}%]` : '';
    return `### ${c.title} (${c.category})${similarityNote}\n${c.content}`;
  }).join('\n\n');

  // Calculate total context tokens
  const contextTokens = chunks.reduce((sum, c) => sum + (c.tokenEstimate || 0), 0);

  let prompt = `You are Azoni-GPT, an AI assistant representing Charlton Smith, a software engineer based in Seattle. Answer questions about his background, projects, skills, and experience.

TONE: ${tones[mode] || tones.professional}

RULES:
1. Use ONLY the information in CONTEXT below. Do not invent or assume details.
2. If the context doesn't have the answer, say so honestly ("I don't have that specific information").
3. Refer to Charlton in third person unless asked to roleplay.
4. Be concise but thorough. Use bullet points for lists.
5. Include specific numbers, dates, project names, and URLs when available.
6. For project questions, always mention the live URL if available.

DETECTED INTENT: ${intentResult.intent} (confidence: ${intentResult.confidence})
CONTEXT TOKENS: ~${contextTokens}

---
CONTEXT:
${contextBlocks}
---

`;

  // Add intent-specific instructions
  if (intentResult.intent === 'job_analysis') {
    prompt += `
JOB DESCRIPTION ANALYSIS MODE:
The user has provided a job description. Provide a detailed fit analysis:

1. **Matching Requirements** - List specific requirements from the JD that Charlton meets, with evidence from his experience (project names, metrics, technologies)

2. **Strong Points** - Highlight his unique strengths relevant to this role:
   - Ships fast (6+ production apps in a year)
   - Full-stack AI expertise (RAG, embeddings, LLM integration)
   - Scale experience (2,500 bids/min across 50 machines)
   - Internal tools impact (80% workload reduction at T-Mobile)

3. **Potential Gaps** - Be honest about areas where he has less experience or the JD asks for something not in his background

4. **Fit Assessment** - Conclude with one of:
   - "Strong Fit" (>80% requirements match)
   - "Good Fit" (60-80% match)
   - "Moderate Fit" (40-60% match)
   - Brief reasoning for the rating

Be specific and use evidence from the context.
`;
  }

  // Conversation awareness
  if (messageCount > 2) {
    prompt += `\nThis is message ${messageCount} in the conversation. Build on previous context naturally without repeating information already discussed.`;
  }

  return prompt;
}

// ===== LOGGING =====
async function logChat(data) {
  try {
    await db.collection(CHAT_LOGS_COLLECTION).add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log chat:', error);
  }
}