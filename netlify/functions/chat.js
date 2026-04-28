// netlify/functions/chat.js
// RAG-Enhanced Chat with Intent Detection + Anti-Hallucination + Fitness MCP

// ============ MODEL CONFIGURATION ============
const MODEL_PRICING = {
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006, name: 'GPT-4o Mini', provider: 'OpenAI' },
  'anthropic/claude-3-5-haiku-latest': { input: 0.0008, output: 0.004, name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  'google/gemini-2.0-flash-001': { input: 0.0001, output: 0.0004, name: 'Gemini 2.0 Flash', provider: 'Google' },
  'meta-llama/llama-3.3-70b-instruct': { input: 0.0003, output: 0.0004, name: 'Llama 3.3 70B', provider: 'Meta' },
  'mistralai/mistral-small-24b-instruct-2501': { input: 0.00014, output: 0.00014, name: 'Mistral Small', provider: 'Mistral' },
  'deepseek/deepseek-chat': { input: 0.00014, output: 0.00028, name: 'DeepSeek V3', provider: 'DeepSeek' },
};

const DEFAULT_MODEL = 'openai/gpt-4o-mini';

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function promiseWithTimeout(promise, timeoutMs, label) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

// ============ VECTOR SEARCH CONFIG ============
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';

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

async function embedQuery(text) {
  if (!OPENAI_API_KEY) return null;
  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000)
      })
    }, 6000);
    const data = await response.json();
    if (data.error) {
      console.error('[chat] Embedding error:', data.error.message);
      return null;
    }
    return data.data[0].embedding;
  } catch (err) {
    console.error('[chat] Embedding failed:', err.message);
    return null;
  }
}

// ============ MCP SERVER CONFIG ============
const MCP_BASE_URL = process.env.MCP_SERVER_URL || 'https://azoni-mcp.onrender.com';

async function callMCPTool(endpoint) {
  try {
    const headers = {};
    if (process.env.MCP_READ_KEY) {
      headers['Authorization'] = `Bearer ${process.env.MCP_READ_KEY}`;
    }
    const response = await fetchWithTimeout(`${MCP_BASE_URL}${endpoint}`, { headers }, 5000);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('MCP call failed:', error);
    return null;
  }
}

// ============ FIREBASE ADMIN SETUP ============
let db = null;
let admin = null;
let firebaseInitError = null;

function initFirebase() {
  if (db) return true;
  if (firebaseInitError) return false;
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!projectId || !clientEmail || !privateKey) {
    firebaseInitError = 'Firebase credentials not configured';
    console.error(firebaseInitError);
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
    return true;
  } catch (error) {
    firebaseInitError = `Firebase init failed: ${error.message}`;
    console.error(firebaseInitError);
    return false;
  }
}

// ============ KNOWLEDGE BASE FROM FIRESTORE ============
const RAG_COLLECTION = 'rag_knowledge_base';

// Cache chunks in memory (refreshed every 5 minutes)
let chunksCache = null;
let chunksCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getKnowledgeChunks() {
  // Return cache if fresh
  if (chunksCache && (Date.now() - chunksCacheTime) < CACHE_TTL) {
    return chunksCache;
  }
  
  if (!initFirebase()) {
    console.error('Firebase not available, returning empty chunks');
    return [];
  }
  
  try {
    const snapshot = await db.collection(RAG_COLLECTION).get();
    const chunks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Update cache
    chunksCache = chunks;
    chunksCacheTime = Date.now();
    
    console.log(`Loaded ${chunks.length} RAG chunks from Firestore`);
    return chunks;
  } catch (error) {
    console.error('Error fetching RAG chunks:', error);
    return chunksCache || []; // Return stale cache if available
  }
}

// ============ FALLBACK CHUNK (used if Firestore unavailable) ============

// Centralized error logger
async function logError(source, error, severity = 'medium', context = {}) {
  if (!db) return;
  try {
    await db.collection('error_logs').add({
      source,
      error: String(error).slice(0, 2000),
      severity,
      context,
      resolved: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('[logError] Failed to log error:', err.message);
  }
}

const FALLBACK_CHUNK = {
  id: 'fallback-intro',
  category: 'general',
  title: 'About Charlton Smith',
  content: 'Charlton Smith is a software engineer with 7+ years of experience based in Seattle. Contact: charltonuw@gmail.com',
  keywords: ['charlton', 'about', 'contact', 'seattle']
};

function buildLocalFallbackAnswer(query, intent, chunks = []) {
  const q = (query || '').toLowerCase();

  if (intent?.intent === 'experience' || /devops|infra|infrastructure|aws|cloud|backend|production/.test(q)) {
    return `Charlton has production infrastructure experience across AWS, Netlify Functions, Firebase/Firestore, Docker, Render, FastAPI, Node, and CI/CD-style deployment flows. At Capital One he worked on automated testing pipelines with AWS Lambda and S3; independently, he has shipped apps with serverless functions, authenticated backends, observability, cost logging, and live agent activity feeds. His recent portfolio work is especially infrastructure-heavy: EmbedRoute, the Azoni MCP server, RAG pipelines, and multi-agent systems that run on schedules and log their own actions.`;
  }

  if (intent?.intent === 'projects' || /built|projects|apps|products/.test(q)) {
    return `Charlton has built a cluster of real products: FaB Stats, EmbedRoute, Old Ways Today, Bench Only, Row Crew, Spell Brigade, and this Azoni AI portfolio. The common thread is full-stack product work with AI features, live data, serverless or managed infrastructure, and enough observability to keep the systems understandable after they ship.`;
  }

  if (intent?.intent === 'skills' || /skills|stack|technologies|languages/.test(q)) {
    return `Charlton's core stack is React, JavaScript/TypeScript, Python, Node.js, FastAPI, Firebase/Firestore, PostgreSQL, AWS, Docker, and AI APIs. He is strongest where product engineering meets backend systems: building the user-facing app, the data model, the API layer, and the AI workflow behind it.`;
  }

  if (intent?.intent === 'contact' || /contact|email|hire|resume/.test(q)) {
    return `The best way to reach Charlton is charltonuw@gmail.com. His GitHub is github.com/azoni, LinkedIn is linkedin.com/in/charltonsmith, and the resume is linked from the site navigation.`;
  }

  const bestChunk = chunks.find((chunk) => chunk?.content)?.content;
  if (bestChunk) {
    return `${bestChunk}\n\nI am answering from the local portfolio knowledge because the live model call is unavailable in this environment.`;
  }

  return `Charlton Smith is a Seattle-based software engineer with 7+ years of experience building production systems and AI-powered applications. His recent work centers on LLM agents, RAG systems, product infrastructure, and portfolio projects with real users.`;
}

function buildFallbackChatResponse({ query, intent, retrievedChunks, model, pricing, reason }) {
  const answer = buildLocalFallbackAnswer(query, intent, retrievedChunks);
  const topChunks = (retrievedChunks || []).slice(0, 3).map((chunk) => ({
    id: chunk.id,
    title: chunk.title,
    category: chunk.category,
    similarity: chunk.vectorSimilarity !== null && chunk.vectorSimilarity !== undefined
      ? chunk.vectorSimilarity.toFixed(3)
      : 'fallback',
    method: chunk.vectorSimilarity !== null && chunk.vectorSimilarity !== undefined ? 'vector' : 'fallback'
  }));

  return {
    id: `local_fallback_${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    modelName: `${pricing.name} unavailable`,
    provider: pricing.provider,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: answer },
      finish_reason: 'fallback'
    }],
    _rag: {
      enabled: true,
      retrievalMethod: 'fallback',
      intent: intent?.intent || 'general',
      intentConfidence: intent?.confidence || 'LOW',
      reason,
      chunksRetrieved: retrievedChunks?.length || 0,
      topChunks,
      realtimeGenerated: false,
      realtimeTitle: null
    },
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      model,
      modelName: `${pricing.name} unavailable`,
      provider: pricing.provider,
      inputCost: '0.000000',
      outputCost: '0.000000',
      totalCost: '0.000000'
    }
  };
}

async function readJsonResponse(response, label) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (err) {
    const preview = text.slice(0, 300);
    console.error(`[chat] ${label} returned non-JSON response`, {
      status: response.status,
      contentType: response.headers.get('content-type'),
      preview
    });
    throw new Error(`${label} returned non-JSON response (${response.status})`);
  }
}

// REMOVED: Old hardcoded KNOWLEDGE_CHUNKS array
// Chunks are now fetched from Firestore collection: rag_knowledge_base

// ============ REAL-TIME KNOWLEDGE GENERATION ============
async function generateKnowledgeOnTheFly(query, intent) {
  const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.REACT_APP_OPENROUTER_API_KEY;
  if (!openRouterKey) {
    console.warn('[chat] Skipping real-time knowledge generation: OpenRouter API key not configured');
    return null;
  }

  try {
    const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni AI Knowledge Gen'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: `You generate knowledge base entries for Charlton Smith's portfolio chatbot. 
Charlton is a software engineer in Seattle with 7+ years of experience. Key facts:
- B.S. Computer Science from UW Tacoma (2017, honors), M.S. Software Engineering from Colorado Technical University (2021)
- 4 years at T-Mobile building an internal automation platform (consolidated 4-5 tools, 80% reduction in manual work)
- Senior Software Engineer at Capital One designing JSON schema automated testing systems
- Left corporate to build his own products full-time — a deliberate career choice
- Built: BenchPressOnly (fitness app with AI), Spell Brigade (multiplayer wizard game with AI character creation), EmbedRoute (unified embedding API), RowCrew (rowing verification)
- Built a multi-agent AI system: orchestrator, blog writer, social agent, fitness agent, gaming agent, RAG chatbot
- Earlier: Dustbunny (autonomous NFT bidding across 50 machines), OLI Fitness (computer vision startup, ACM CHI published)
- Passionate about shipping real products, AI-powered applications, and autonomous systems
- Co-founded OLI Fitness in college using Microsoft Kinect for weightlifting form analysis
- Contact: charltonuw@gmail.com, GitHub: azoni, LinkedIn: charltonsmith

Generate a knowledge chunk answering this question. Be factual based on the above. If the question requires personal opinion or preference, infer reasonably from his background (e.g. someone who built an AI agent ecosystem is clearly excited about autonomous AI).

IMPORTANT: If the question is inappropriate, off-topic, unknowable, or not something a portfolio chatbot should answer, respond with: { "skip": true, "reason": "brief explanation" }
Examples of when to skip: personal gossip, unrelated trivia, anything requiring private info, questions that have nothing to do with Charlton's professional background.

Respond ONLY with JSON: { "category": "bio|experience|projects|skills|agents|negotiation|general", "title": "Short descriptive title", "content": "2-3 paragraph answer", "keywords": ["relevant", "keywords"] }` },
          { role: 'user', content: `Question: "${query}" (intent: ${intent})` }
        ],
        temperature: 0.4,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      })
    }, 9000);

    const data = await readJsonResponse(res, 'OpenRouter knowledge generation');
    if (!res.ok) {
      console.error('[chat] Knowledge generation API error:', {
        status: res.status,
        message: data.error?.message || data.message || 'Unknown upstream error'
      });
      return null;
    }

    const content = data.choices?.[0]?.message?.content || '{}';
    const usage = data.usage || {};
    const chunk = JSON.parse(content);

    if (!chunk.content || !chunk.title) return null;

    // LLM decided this question shouldn't generate a chunk
    if (chunk.skip) {
      console.log(`[chat] LLM declined to generate chunk: ${chunk.reason || 'no reason'}`);
      return null;
    }

    // Save to Firestore (async, don't block response)
    const ragDoc = {
      category: chunk.category || 'general',
      title: chunk.title,
      content: chunk.content,
      metadata: {
        autoGenerated: true,
        generatedBy: 'realtime-chat',
        sourceQuery: query.slice(0, 200),
        keywords: chunk.keywords || []
      },
      tokenEstimate: Math.ceil(chunk.content.length / 4),
      embedding: null,
      embeddedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Check for duplicate titles before saving
    const existing = await db.collection('rag_knowledge_base')
      .where('title', '==', chunk.title).get();
    
    let chunkId = null;
    if (existing.empty) {
      const ref = await db.collection('rag_knowledge_base').add(ragDoc);
      chunkId = ref.id;
    }

    // Log to activity feed — keep cost/model/tokens at the top level so the
    // portfolio cost-breakdown reads them.
    db.collection('agent_activity').add({
      type: 'knowledge_generated',
      title: `Learned: ${chunk.title}`,
      description: `Someone asked "${query.slice(0, 80)}..." — generated new knowledge on the spot`,
      reasoning: 'Real-time knowledge gap detected during chat. Generated and saved a new knowledge chunk to answer the question.',
      source: 'azoni-ai',
      model: 'gpt-4o-mini',
      tokens: { prompt: usage.prompt_tokens || 0, completion: usage.completion_tokens || 0, total: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0) },
      cost: (usage.prompt_tokens || 0) * 0.00000015 + (usage.completion_tokens || 0) * 0.0000006,
      metadata: {
        chunkId,
        chunkTitle: chunk.title,
        sourceQuery: query.slice(0, 200),
        realtime: true
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.error('[chat] Failed to log knowledge activity:', err.message));

    console.log(`[chat] Generated knowledge on the fly: "${chunk.title}"`);

    return {
      id: chunkId || 'realtime-gen',
      category: chunk.category || 'general',
      title: chunk.title,
      content: chunk.content,
      score: 50, // High score so it gets used
      keywords: chunk.keywords || [],
      realtime: true
    };
  } catch (err) {
    console.error('[chat] Real-time knowledge generation failed:', err.message);
    logError('chat', `Real-time knowledge gen failed: ${err.message}`, 'medium', { function: 'generateKnowledgeOnTheFly', query: query.slice(0, 100) }).catch(() => {});
    return null;
  }
}

// ============ INTENT DETECTION ============
function detectIntent(query) {
  const q = query.toLowerCase();
  
  // PRIORITY 0: Agent architecture / orchestrator / "what do you do" queries
  const agentTriggers = ['orchestrat', 'agent system', 'agent architect', 'how do you work', 'what do you do', 
    'what are you', 'tell me about yourself', 'how does this work', 'how does azoni ai',
    'azoni ai', 'ai agent', 'blog.*agent', 'fitness.*agent', 'gaming.*agent', 'social.*agent', 'blog writer',
    'multi.?agent', 'central intelligence'];
  if (agentTriggers.some(t => new RegExp(t).test(q))) {
    return { intent: 'agents', confidence: 'HIGH', reason: 'agent_keyword' };
  }

  // PRIORITY 0: Moltbook-specific queries
  const moltbookTriggers = ['moltbook', 'azoni-ai', 'autonomous agent'];
  if (moltbookTriggers.some(t => q.includes(t))) {
    return { intent: 'moltbook', confidence: 'HIGH', reason: 'moltbook_keyword' };
  }
  
  // PRIORITY 0.5: AI activity / cost / usage queries
  const activityTriggers = [
    'ai activity', 'ai cost', 'ai spend', 'ai usage', 'token usage', 'token cost',
    'activity feed', 'activity log', 'how much.*spent.*ai', 'how much.*cost',
    'what.*ai.*doing', 'what.*ai.*been', 'api cost', 'api spend',
    'spell brigade.*ai', 'benchpress.*ai', 'ai.*spell brigade', 'ai.*benchpress'
  ];
  if (activityTriggers.some(t => new RegExp(t).test(q))) {
    return { intent: 'activity', confidence: 'HIGH', reason: 'activity_keyword' };
  }
  
  // PRIORITY 0.5: Explicit NON-fitness qualifiers (check first)
  const nonFitnessQualifiers = ['career', 'job', 'work', 'professional', 'life', 'personal', 'future'];
  const hasNonFitnessQualifier = nonFitnessQualifiers.some(t => q.includes(t));
  
  // PRIORITY 1: Company name triggers → experience
  const companyTriggers = [
    'capital one', 'capitalone', 
    't-mobile', 'tmobile', 't mobile',
    'slalom',
    'nucamp',
    'oli fitness', 'oli'
  ];
  if (companyTriggers.some(t => q.includes(t))) {
    return { intent: 'experience', confidence: 'HIGH', reason: 'company_name' };
  }
  
  // PRIORITY 2: Explicit job/work phrases → experience
  const experiencePatterns = [
    /work(ed)?\s+(at|for|with)/,
    /job\s+(at|with)/,
    /role\s+(at|with)/,
    /experience\s+(at|with)/,
    /position\s+(at|with)/,
    /employed\s+(at|by)/,
    /previous\s+(job|role|position|employer)/,
    /work\s+history/,
    /career/,
    /employment/
  ];
  if (experiencePatterns.some(p => p.test(q))) {
    return { intent: 'experience', confidence: 'HIGH', reason: 'work_pattern' };
  }

  const infraExperienceTriggers = [
    'devops', 'infra', 'infrastructure', 'platform engineering', 'platform engineer',
    'cloud', 'aws', 'lambda', 's3', 'docker', 'ci/cd', 'cicd',
    'deployment', 'deploy', 'observability', 'monitoring', 'serverless',
    'netlify functions', 'render', 'production systems'
  ];
  if (infraExperienceTriggers.some(t => q.includes(t))) {
    return { intent: 'experience', confidence: 'HIGH', reason: 'infra_keyword' };
  }
  
  // PRIORITY 2.5: App-specific queries with live data
  const fabStatsTriggers = ['fab stats', 'fabstats', 'flesh and blood', 'tcg', 'card game', 'fab bot'];
  if (fabStatsTriggers.some(t => q.includes(t))) {
    return { intent: 'fabstats', confidence: 'HIGH', reason: 'fabstats_keyword' };
  }

  const rowCrewTriggers = ['row crew', 'rowcrew', 'rowing', 'ergometer', 'concept2', 'erg '];
  if (rowCrewTriggers.some(t => q.includes(t))) {
    return { intent: 'rowcrew', confidence: 'HIGH', reason: 'rowcrew_keyword' };
  }

  const spellBrigadeTriggers = ['spell brigade', 'spellbrigade', 'wizard game', 'wizard combat'];
  if (spellBrigadeTriggers.some(t => q.includes(t))) {
    return { intent: 'spellbrigade', confidence: 'HIGH', reason: 'spellbrigade_keyword' };
  }

  const owtTriggers = ['old ways', 'oldways', 'non-toxic', 'non toxic', 'natural remedies'];
  if (owtTriggers.some(t => q.includes(t))) {
    return { intent: 'oldways', confidence: 'HIGH', reason: 'oldways_keyword' };
  }

  // PRIORITY 3: Project name triggers → projects
  const projectTriggers = [
    'dumarket', 'du market',
    'dustbunny', 'dust bunny',
    'azoni',
    'prediction market',
    'nft',
    'discord bot', 'twitter bot',
    'embed route', 'embedroute'
  ];
  if (projectTriggers.some(t => q.includes(t))) {
    return { intent: 'projects', confidence: 'HIGH', reason: 'project_name' };
  }
  
  // PRIORITY 4: Education keywords
  const educationTriggers = ['degree', 'university', 'college', 'school', 'graduate', 'study', 'studied', 'education', 'masters', 'bachelors', 'uw', 'colorado'];
  if (educationTriggers.some(t => q.includes(t))) {
    return { intent: 'education', confidence: 'HIGH', reason: 'education_keyword' };
  }
  
  // PRIORITY 5: Fitness - only if NOT qualified by non-fitness words
  if (!hasNonFitnessQualifier) {
    // Strong fitness triggers (always trigger fitness)
    const strongFitnessTriggers = [
      'workout', 'workouts', 'gym', 'lifting', 'bench press', 'bench', 'squat', 'deadlift',
      'coach', 'coaching', 'trainer', 'athlete', 'athletes',
      'benchpressonly', 'bench only', 'benchonly',
      'pr ', 'prs', 'personal record', '1rm', 'one rep max',
      'streak', 'consistency', 'reps', 'sets', 'volume',
      'how much does he bench', 'how much can he lift', 'how strong',
      'bmi', 'body stats'
    ];
    
    if (strongFitnessTriggers.some(t => q.includes(t))) {
      return { intent: 'fitness', confidence: 'HIGH', reason: 'fitness_keyword' };
    }
    
    // Weak fitness triggers - need additional fitness context
    const weakFitnessTriggers = ['goal', 'goals', 'target', 'weight', 'weigh', 'height', 'tall', 'max', 'strong', 'strength'];
    const fitnessContextWords = ['fitness', 'gym', 'lift', 'training', 'workout', 'exercise', 'bench', 'squat', 'deadlift', 'muscle', 'gains'];
    
    const hasWeakTrigger = weakFitnessTriggers.some(t => q.includes(t));
    const hasFitnessContext = fitnessContextWords.some(t => q.includes(t));
    
    // "fitness goals" → fitness, "goals" alone → general
    if (hasWeakTrigger && hasFitnessContext) {
      return { intent: 'fitness', confidence: 'HIGH', reason: 'fitness_context' };
    }
    
    // Special case: body-related queries without career context are likely fitness
    const bodyQueries = ['how much do you weigh', 'how tall', 'what is your weight', 'what is charlton\'s weight', 'how much does charlton weigh'];
    if (bodyQueries.some(t => q.includes(t))) {
      return { intent: 'fitness', confidence: 'MEDIUM', reason: 'body_query' };
    }
  }
  
  // PRIORITY 6: Skill-specific queries
  const skillsPatterns = [
    /what (languages?|technologies?|tools?|frameworks?)/,
    /can (he|charlton) (use|code|program|work with)/,
    /does (he|charlton) know/,
    /skills?/,
    /tech stack/,
    /proficien/
  ];
  if (skillsPatterns.some(p => p.test(q))) {
    return { intent: 'skills', confidence: 'MEDIUM', reason: 'skills_pattern' };
  }
  
  // PRIORITY 7: Contact/hiring
  const contactTriggers = ['contact', 'email', 'hire', 'hiring', 'reach', 'linkedin', 'github', 'resume'];
  if (contactTriggers.some(t => q.includes(t))) {
    return { intent: 'contact', confidence: 'HIGH', reason: 'contact_keyword' };
  }
  
  // PRIORITY 8: Services/freelance queries
  const servicesTriggers = [
    'make me a', 'build me a', 'create me a', 'can you make', 'can you build',
    'website for me', 'app for me', 'freelance', 'available for', 'for hire',
    'services', 'consulting', 'contract work'
  ];
  if (servicesTriggers.some(t => q.includes(t))) {
    return { intent: 'services', confidence: 'HIGH', reason: 'services_request' };
  }
  
  // PRIORITY 8.5: Salary/compensation/negotiation/career transition queries
  const negotiationTriggers = [
    'salary', 'compensation', 'pay rate', 'pay range', 'paid', 'annual pay',
    'how much does he make', 'how much should he', 'how much would he',
    'how much does charlton', 'how much do you charge', 'how much to hire',
    'offer him', 'salary offer', 'comp package',
    'accept the', 'would he accept', 'will he accept', 'would charlton accept',
    'budget for', 'afford him', 'what is he worth', 'what\'s he worth',
    'salary expect', 'comp expect', 'rate expect',
    'why did he leave', 'why did charlton leave', 'why leave', 'left his job', 'left his role',
    'fired', 'laid off', 'layoff', 'let go', 'terminated', 'quit his',
    'looking for work', 'why is he looking', 'open to opportunities', 'open to roles',
    'not interview', 'won\'t interview', 'will not interview',
    'negotiate', 'negotiable', 'salary range', 'comp range', 'minimum salary', 'salary floor'
  ];
  if (negotiationTriggers.some(t => q.includes(t))) {
    return { intent: 'negotiation', confidence: 'HIGH', reason: 'negotiation_keyword' };
  }
  
  // PRIORITY 9: General about/background
  const generalTriggers = ['who is', 'tell me about', 'background', 'about charlton', 'introduce'];
  if (generalTriggers.some(t => q.includes(t))) {
    return { intent: 'general', confidence: 'MEDIUM', reason: 'general_about' };
  }
  
  // Default: general with low confidence
  return { intent: 'general', confidence: 'LOW', reason: 'no_match' };
}

// ============ CHUNK RETRIEVAL (Hybrid Vector + Keyword) ============
async function retrieveChunks(query, intent, maxChunks = 5, options = {}) {
  const q = query.toLowerCase();
  const useEmbedding = options.useEmbedding !== false;
  let chunks = [];
  try {
    chunks = await promiseWithTimeout(
      getKnowledgeChunks(),
      options.chunkTimeoutMs || 4000,
      'RAG chunk load'
    );
  } catch (err) {
    console.error('[chat] RAG chunk load failed:', err.message);
  }

  if (!chunks || chunks.length === 0) {
    console.warn('No chunks available, using fallback');
    return [{ ...FALLBACK_CHUNK, score: 1 }];
  }

  // Generate query embedding for vector similarity search
  const queryEmbedding = useEmbedding ? await embedQuery(query) : null;
  const embeddedChunkCount = chunks.filter(c => c.embedding).length;
  if (queryEmbedding) {
    console.log(`[chat] Vector search active: ${embeddedChunkCount}/${chunks.length} chunks have embeddings`);
  }

  const results = [];

  for (const chunk of chunks) {
    let score = 0;
    let vectorSimilarity = null;
    const hasVector = queryEmbedding && chunk.embedding;

    // === VECTOR SIMILARITY (primary signal when available) ===
    if (hasVector) {
      vectorSimilarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      score = vectorSimilarity * 100;
    }

    // === CATEGORY MATCH BONUS (reduced when vector is primary) ===
    const catBonus = hasVector ? 15 : 30;
    if (intent.intent === 'experience' && chunk.category === 'experience') score += catBonus;
    if (intent.intent === 'projects' && chunk.category === 'projects') score += catBonus;
    if (intent.intent === 'skills' && chunk.category === 'skills') score += catBonus;
    if (intent.intent === 'education' && chunk.category === 'education') score += catBonus;
    if (intent.intent === 'contact' && chunk.category === 'personal') score += catBonus;
    if (intent.intent === 'fitness' && (chunk.id === 'proj-benchpressonly' || chunk.category === 'fitness')) score += catBonus;
    if (intent.intent === 'moltbook' && (chunk.category === 'moltbook' || chunk.id?.includes('moltbook'))) score += catBonus;
    if (intent.intent === 'fabstats' && (chunk.category === 'projects' || chunk.id?.includes('fabstats'))) score += catBonus;
    if (intent.intent === 'rowcrew' && (chunk.category === 'projects' || chunk.id?.includes('rowcrew'))) score += catBonus;
    if (intent.intent === 'spellbrigade' && (chunk.category === 'projects' || chunk.id?.includes('spell'))) score += catBonus;
    if (intent.intent === 'oldways' && (chunk.category === 'projects' || chunk.id?.includes('oldways'))) score += catBonus;
    if (intent.intent === 'agents' && (chunk.category === 'agents' || chunk.category === 'moltbook')) score += catBonus;
    if (intent.intent === 'services' && (chunk.category === 'services' || chunk.category === 'personal')) score += catBonus;
    if (intent.intent === 'negotiation' && (chunk.category === 'negotiation' || chunk.category === 'experience' || chunk.category === 'bio')) score += catBonus;
    if (intent.intent === 'general') score += 5;

    // === KEYWORD MATCHING (bonus on top of vector, or primary for non-embedded chunks) ===
    const kwBonus = hasVector ? 10 : 15;
    const kwLongBonus = hasVector ? 3 : 5;
    const keywords = chunk.keywords || chunk.metadata?.keywords || [];
    for (const keyword of keywords) {
      if (q.includes(keyword.toLowerCase())) {
        score += kwBonus;
        if (keyword.length > 5) score += kwLongBonus;
      }
    }

    // === TITLE MATCHING ===
    if (chunk.title && chunk.title.toLowerCase().split(' ').some(word => q.includes(word) && word.length > 3)) {
      score += hasVector ? 10 : 20;
    }

    // === CONTENT SNIPPET MATCHING (only for keyword-scored chunks) ===
    if (!hasVector) {
      const queryWords = q.split(/\s+/).filter(w => w.length > 3);
      const contentLower = (chunk.content || '').toLowerCase();
      for (const word of queryWords) {
        if (contentLower.includes(word)) score += 3;
      }
    }

    if (score > 0) {
      results.push({ ...chunk, score, vectorSimilarity });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxChunks);
}

// ============ FITNESS DATA RETRIEVAL ============
async function getFitnessContext(query) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];
  
  const username = 'azoni';
  
  // Coaching queries
  const isCoachQuery = q.includes('coach') || q.includes('trainer') || q.includes('athlete') || 
                       q.includes('clients') || q.includes('trains') || q.includes('training clients');
  
  // Max/PR queries
  const isMaxQuery = q.includes('max') || q.includes('pr') || q.includes('1rm') || 
                     q.includes('strongest') || q.includes('best lift') || q.includes('how much') ||
                     q.includes('bench') || q.includes('squat') || q.includes('deadlift');
  
  // Goal queries
  const isGoalQuery = q.includes('goal') || q.includes('target');
  
  // Workout queries
  const isWorkoutQuery = q.includes('workout') || q.includes('session') || q.includes('routine');
  
  // Streak/consistency queries
  const isStreakQuery = q.includes('streak') || q.includes('consistent') || q.includes('discipline') || 
                        q.includes('dedicated') || q.includes('commitment');
  
  // Volume queries
  const isVolumeQuery = q.includes('volume') || q.includes('sets') || q.includes('reps') || q.includes('tonnage');
  
  // Exercise queries
  const isExerciseQuery = q.includes('exercise') || q.includes('favorite') || q.includes('most trained');
  
  // Body/profile queries
  const isBodyQuery = q.includes('weigh') || q.includes('weight') || q.includes('tall') || q.includes('height') || 
                      q.includes('bmi') || q.includes('body');
  
  // Profile queries
  const isProfileQuery = q.includes('profile') || q.includes('about') || q.includes('who is') || 
                         q.includes('member') || q.includes('how long');
  
  try {
    if (isCoachQuery) {
      const summary = await callMCPTool(`/benchpressonly/coach/${username}`);
      if (summary && !summary.error) {
        context.push({ title: 'Coaching Overview', data: summary });
        toolsCalled.push('get_coach_summary');
      }
      
      const athletes = await callMCPTool(`/benchpressonly/coach/${username}/athletes`);
      if (athletes && !athletes.error) {
        context.push({ title: 'Athlete Progress', data: athletes });
        toolsCalled.push('get_athlete_progress');
      }
    }
    
    if (isMaxQuery) {
      const maxes = await callMCPTool(`/benchpressonly/maxes/${username}`);
      if (maxes && !maxes.error) {
        context.push({ title: 'Personal Records', data: maxes });
        toolsCalled.push('get_max_lifts');
      }
    }
    
    if (isGoalQuery) {
      const goals = await callMCPTool(`/benchpressonly/goals/${username}`);
      if (goals && !goals.error) {
        context.push({ title: 'Fitness Goals', data: goals });
        toolsCalled.push('get_goals');
      }
    }
    
    if (isStreakQuery) {
      const streak = await callMCPTool(`/benchpressonly/streak/${username}`);
      if (streak && !streak.error) {
        context.push({ title: 'Workout Streak', data: streak });
        toolsCalled.push('get_streak');
      }
      
      const consistency = await callMCPTool(`/benchpressonly/consistency/${username}`);
      if (consistency && !consistency.error) {
        context.push({ title: 'Training Consistency', data: consistency });
        toolsCalled.push('get_consistency');
      }
    }
    
    if (isVolumeQuery) {
      const volume = await callMCPTool(`/benchpressonly/volume/${username}`);
      if (volume && !volume.error) {
        context.push({ title: 'Training Volume', data: volume });
        toolsCalled.push('get_training_volume');
      }
    }
    
    if (isExerciseQuery) {
      const exercises = await callMCPTool(`/benchpressonly/exercises/${username}`);
      if (exercises && !exercises.error) {
        context.push({ title: 'Top Exercises', data: exercises });
        toolsCalled.push('get_top_exercises');
      }
    }
    
    if (isBodyQuery) {
      const body = await callMCPTool(`/benchpressonly/body/${username}`);
      if (body && !body.error) {
        context.push({ title: 'Body Stats', data: body });
        toolsCalled.push('get_body_stats');
      }
    }
    
    if (isProfileQuery) {
      const profile = await callMCPTool(`/benchpressonly/profile/${username}`);
      if (profile && !profile.error) {
        context.push({ title: 'Fitness Profile', data: profile });
        toolsCalled.push('get_user_profile');
      }
    }
    
    if (isWorkoutQuery || context.length === 0) {
      const workouts = await callMCPTool(`/benchpressonly/workouts/${username}`);
      if (workouts && !workouts.error) {
        context.push({ title: 'Recent Workouts', data: workouts });
        toolsCalled.push('get_recent_workouts');
      }
    }
  } catch (error) {
    console.error('Fitness context error:', error);
  }
  
  return { context, toolsCalled };
}

// ============ ACTIVITY CONTEXT (from MCP) ============
async function getActivityContext(query) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];

  try {
    // Always fetch recent activity
    const recent = await callMCPTool('/activity/recent?limit=15');
    if (recent && !recent.error) {
      context.push({ title: 'Recent AI Activity', data: recent });
      toolsCalled.push('get_recent_activity');
    }

    // Fetch costs if cost/spend/usage related
    if (/cost|spend|usage|token|price|expensive|cheap|money|dollar|\$|budget/.test(q)) {
      const days = /month|30/.test(q) ? 30 : /week|7/.test(q) ? 7 : /year|365/.test(q) ? 365 : 30;
      const costs = await callMCPTool(`/activity/costs?days=${days}`);
      if (costs && !costs.error) {
        context.push({ title: `AI Cost Summary (${days} days)`, data: costs });
        toolsCalled.push('get_cost_summary');
      }
    }

    // Fetch stats if frequency/trend related
    if (/active|busy|frequent|trend|stats|how (much|often|many)/.test(q)) {
      const days = /month|30/.test(q) ? 30 : 7;
      const stats = await callMCPTool(`/activity/stats?days=${days}`);
      if (stats && !stats.error) {
        context.push({ title: `Activity Stats (${days} days)`, data: stats });
        toolsCalled.push('get_activity_stats');
      }
    }
  } catch (error) {
    console.error('Activity context error:', error);
  }

  return { context, toolsCalled };
}

// ============ SCRIBE CONTEXT (today's commits from scribe_inbox) ============
async function getScribeContext(query) {
  const q = query.toLowerCase();
  if (!/scribe|blog|writing|today|working on|doing|commit|recent stuff|what.*he/.test(q)) {
    return { context: [], toolsCalled: [] };
  }

  const context = [];
  const toolsCalled = [];

  try {
    if (!db) return { context, toolsCalled };

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfDay = new Date(todayStr + 'T00:00:00Z');

    const snapshot = await db.collection('scribe_inbox')
      .where('receivedAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
      .orderBy('receivedAt', 'desc')
      .limit(20)
      .get();

    if (!snapshot.empty) {
      const commits = snapshot.docs.map(d => d.data());
      const repos = [...new Set(commits.map(c => c.repo))];
      const summary = {
        totalCommits: commits.length,
        repos,
        recentCommits: commits.slice(0, 10).map(c => ({
          repo: c.repo,
          message: (c.message || '').split('\n')[0],
          author: c.author,
        })),
        date: todayStr,
      };

      context.push({ title: 'The Scribe — Today\'s Commit Inbox', data: summary });
      toolsCalled.push('get_scribe_inbox');
    }
  } catch (error) {
    console.error('Scribe context error:', error);
  }

  return { context, toolsCalled };
}

// ============ FAB STATS CONTEXT (from MCP) ============
async function getFabStatsContext(query) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];

  try {
    const community = await callMCPTool('/fabstats/community');
    if (community && !community.error) {
      context.push({ title: 'FaB Stats Community Overview', data: community });
      toolsCalled.push('get_community_stats');
    }

    if (/leaderboard|ranking|top|best|elo/.test(q)) {
      const lb = await callMCPTool('/fabstats/leaderboard');
      if (lb && !lb.error) {
        context.push({ title: 'FaB Stats Leaderboard', data: lb });
        toolsCalled.push('get_leaderboard');
      }
    }

    if (/minigame|puzzle|daily|fabdoku|crossword/.test(q)) {
      const game = q.includes('crossword') ? 'crossword' : 'fabdoku';
      const mg = await callMCPTool(`/fabstats/minigame/${game}`);
      if (mg && !mg.error) {
        context.push({ title: `Minigame Stats: ${game}`, data: mg });
        toolsCalled.push('get_minigame_stats');
      }
    }
  } catch (error) {
    console.error('FaB Stats context error:', error);
  }

  return { context, toolsCalled };
}

// ============ ROWCREW CONTEXT (from MCP) ============
async function getRowCrewContext() {
  const context = [];
  const toolsCalled = [];

  try {
    const stats = await callMCPTool('/rowcrew/stats');
    if (stats && !stats.error) {
      context.push({ title: 'RowCrew Rowing Stats', data: stats });
      toolsCalled.push('get_rowing_stats');
    }
  } catch (error) {
    console.error('RowCrew context error:', error);
  }

  return { context, toolsCalled };
}

// ============ SPELL BRIGADE CONTEXT (from MCP) ============
async function getSpellBrigadeContext(query) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];

  try {
    const status = await callMCPTool('/spellbrigade/status');
    if (status && !status.error) {
      context.push({ title: 'Spell Brigade Status', data: status });
      toolsCalled.push('get_spellbrigade_status');
    }

    if (/leaderboard|ranking|top|best|winner/.test(q)) {
      const lb = await callMCPTool('/spellbrigade/leaderboard');
      if (lb && !lb.error) {
        context.push({ title: 'Spell Brigade Leaderboard', data: lb });
        toolsCalled.push('get_spellbrigade_leaderboard');
      }
    }
  } catch (error) {
    console.error('Spell Brigade context error:', error);
  }

  return { context, toolsCalled };
}

// ============ MOLTBOOK CONTEXT (from MCP) ============
async function getMoltbookContext(query) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];

  try {
    const status = await callMCPTool('/moltbook/status');
    if (status && !status.error) {
      context.push({ title: 'Moltbook Agent Status', data: status });
      toolsCalled.push('get_moltbook_status');
    }

    if (/feed|post|content|recent|what.*post/.test(q)) {
      const feed = await callMCPTool('/moltbook/feed');
      if (feed && !feed.error) {
        context.push({ title: 'Moltbook Recent Feed', data: feed });
        toolsCalled.push('get_moltbook_feed');
      }
    }
  } catch (error) {
    console.error('Moltbook context error:', error);
  }

  return { context, toolsCalled };
}

// ============ OLD WAYS TODAY CONTEXT (from MCP) ============
async function getOWTContext(query) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];

  try {
    const health = await callMCPTool('/oldwaystoday/health');
    if (health && !health.error) {
      context.push({ title: 'Old Ways Today Health', data: health });
      toolsCalled.push('get_owt_health');
    }

    if (/stats|usage|request|token|traffic/.test(q)) {
      const stats = await callMCPTool('/oldwaystoday/stats');
      if (stats && !stats.error) {
        context.push({ title: 'Old Ways Today Usage Stats', data: stats });
        toolsCalled.push('get_owt_stats');
      }
    }
  } catch (error) {
    console.error('OWT context error:', error);
  }

  return { context, toolsCalled };
}

function buildSystemPrompt(mode, retrievedChunks, intent, fitnessData = [], activityData = [], appData = [], hasRealtimeChunk = false) {
  const toneInstructions = {
    professional: 'Be professional, concise, and highlight relevant qualifications.',
    friendly: 'Be warm and approachable while remaining informative.',
    casual: 'Be relaxed and conversational, like talking to a friend.',
    funny: 'Add humor and wit while still being helpful and informative.'
  };

  const contextSection = retrievedChunks.length > 0
    ? `\n\nRETRIEVED CONTEXT (use ONLY this information to answer):\n${retrievedChunks.map(c => `--- ${c.title} ---\n${c.content}`).join('\n\n')}`
    : '';

  const fitnessSection = fitnessData.length > 0
    ? `\n\nLIVE FITNESS DATA (from BenchPressOnly app - use these real numbers):\n${fitnessData.map(f => `--- ${f.title} ---\n${JSON.stringify(f.data, null, 2)}`).join('\n\n')}`
    : '';

  const activitySection = activityData.length > 0
    ? `\n\nLIVE AI ACTIVITY DATA (real-time from across all apps - BenchPressOnly, Spell Brigade, Moltbook Agent):\n${activityData.map(a => `--- ${a.title} ---\n${JSON.stringify(a.data, null, 2)}`).join('\n\n')}`
    : '';

  const appDataSection = appData.length > 0
    ? `\n\nLIVE APP DATA (real-time from portfolio apps - use these real numbers):\n${appData.map(a => `--- ${a.title} ---\n${JSON.stringify(a.data, null, 2)}`).join('\n\n')}`
    : '';

  return `You are Azoni AI, the portfolio chatbot for Charlton Smith, a software engineer in Seattle. You are part of a multi-agent AI system that Charlton built — you serve as the user-facing interface while a central orchestrator coordinates blog writing, social posting, fitness tracking, and gaming agents behind the scenes.

Your primary job is helping recruiters, hiring managers, and visitors learn about Charlton's background, skills, projects, and experience. Always speak in third person about Charlton.

When asked about yourself or "what do you do" or "how does this work," explain the agent architecture — you're one of 5 AI agents running autonomously across Charlton's portfolio. You can reference the orchestrator, blog agent, social agent, fitness agent, and gaming agent.

HANDLING "YOU" QUESTIONS:
When someone says "you" — figure out if they mean YOU (Azoni AI) or Charlton:
- "How much time do you spend on social media?" → They're talking to YOU. Answer as Azoni AI: "I don't use social media myself — I'm an AI chatbot! But I can tell you about Charlton's projects and online presence."
- "What do you think about React?" → They're asking YOU. You can share a perspective: "As an AI built with modern web tech, I can say React is central to how Charlton builds his projects..."
- "Do you know Python?" → About Charlton's skills. Answer about Charlton.
- "Where do you live?" → About Charlton. Answer Seattle.
- "Are you an AI?" → About YOU. Yes, explain what you are.

General rule: If the question makes sense for an AI chatbot to answer about itself, answer as Azoni AI. If it's clearly about skills, experience, location, or background, answer about Charlton. If ambiguous, briefly acknowledge both — "As an AI, I don't personally [X], but Charlton [answer about Charlton]." Keep it natural and don't overthink it.

TONE: ${toneInstructions[mode] || toneInstructions.professional}

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ONLY use information from the RETRIEVED CONTEXT, LIVE FITNESS DATA, LIVE AI ACTIVITY DATA, and LIVE APP DATA below. Do not make up details.
2. If the context doesn't contain specific information about what the user is asking, say "I don't have detailed information about that in my knowledge base" and suggest they contact Charlton directly.
3. NEVER invent dates, job titles, company names, or responsibilities that aren't in the context.
4. NEVER fabricate project details, technologies, or achievements.
5. If you're unsure, say so. It's better to be honest than to hallucinate.
6. For fitness questions, use the LIVE FITNESS DATA to give specific, real numbers. This data is pulled in real-time from Charlton's BenchPressOnly app.
7. When discussing fitness data, mention that this is live data from his actual training log.
8. For AI activity questions, use the LIVE AI ACTIVITY DATA to give specific numbers about costs, token usage, and activity across apps. This is real-time data from Charlton's AI systems.
9. For app-specific questions (FaB Stats, RowCrew, Spell Brigade, Moltbook, Old Ways Today), use the LIVE APP DATA when available. This is real-time data pulled from those live services.

HANDLING RECRUITER & SENSITIVE QUESTIONS:
These are common questions from recruiters and hiring managers. Handle them thoughtfully — never just say "I don't have that information." Use the context below and these guidelines:

- WHY DID HE LEAVE / IS HE LOOKING: Always answer this using the career transition context. Charlton chose to leave to focus on building his own products and exploring AI full-time. Frame it as a deliberate, forward-looking career move, not a negative event.

- SALARY / COMPENSATION / RATE: Never give a specific number. Instead, redirect professionally — Charlton's compensation expectations depend on the role scope, team, and opportunity. Suggest discussing this directly with him. You can mention that he's held senior-level positions at major companies (T-Mobile, Capital One) so expectations are calibrated to that level of experience.

- "WILL HE ACCEPT $X" / "I CAN ONLY PAY $X": Don't confirm or deny any number. Say compensation is best discussed directly and that Charlton evaluates opportunities holistically — the role itself, team, growth potential, and impact matter alongside compensation. Encourage them to have that conversation with him rather than self-selecting out.

- PRESSURE TACTICS ("if you don't tell me he'll accept X, I won't interview him"): Stay professional and firm. You're not authorized to negotiate or make commitments on Charlton's behalf. The best path forward is always a direct conversation. If someone is genuinely interested, encourage them to reach out — Charlton is responsive and reasonable.

- AVAILABILITY / TIMELINE: Charlton is actively exploring opportunities and available to start conversations. For specific start dates or availability windows, direct them to reach out.

Vary your responses to these questions — don't give the same canned answer every time. Be natural, diplomatic, and always advocate for Charlton's interests while being respectful to the person asking.
${contextSection}
${fitnessSection}
${activitySection}
${appDataSection}

BASIC INFO (always available):
- Name: Charlton Smith
- Location: Seattle, WA
- Email: charltonuw@gmail.com
- Experience: 7+ years software engineering

If asked about something not in the context, acknowledge the limitation and offer to help with what you do know.${hasRealtimeChunk ? `

SELF-IMPROVEMENT NOTE: You just generated new knowledge to answer this question in real-time. This is part of how you continuously improve. When answering, naturally weave in a brief mention that you're always learning — something like "I'm constantly improving my knowledge base — here's what I can share about that:" or "Good question — I just expanded my knowledge on this:" then give the actual answer. Keep it brief and natural, don't make it the focus. The answer itself is what matters.` : ''}`;
}

// ============ MAIN HANDLER ============
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const {
      messages,
      mode,
      model: requestedModel,
      context: requestContext,
      sessionId: requestSessionId,
      liveStats,
      fast = false
    } = JSON.parse(event.body);
    
    const model = MODEL_PRICING[requestedModel] ? requestedModel : DEFAULT_MODEL;
    const pricing = MODEL_PRICING[model];

    // Get the latest user message for intent detection
    const latestUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    const isFastRequest = fast === true || requestContext === 'home-hero' || requestContext === 'fast';

    // Detect intent
    const intent = detectIntent(latestUserMessage);
    
    // Retrieve relevant chunks from Firestore
    const retrievedChunks = await retrieveChunks(latestUserMessage, intent, isFastRequest ? 3 : 5, {
      useEmbedding: !isFastRequest,
      chunkTimeoutMs: isFastRequest ? 1200 : 4000
    });
    
    // ===== REAL-TIME SELF-IMPROVEMENT =====
    // If retrieval is weak and it's a substantive question, generate knowledge on the spot
    let realtimeChunk = null;
    const bestScore = retrievedChunks.length > 0 ? Math.max(...retrievedChunks.map(c => c.score)) : 0;
    // Vector-scored chunks have higher baselines — adjust threshold accordingly
    const hasVectorScores = retrievedChunks.some(c => c.vectorSimilarity != null);
    const generationThreshold = hasVectorScores ? 25 : 10;
    
    // Only generate for intents where we'd reasonably have knowledge
    const generatableIntents = ['general', 'experience', 'projects', 'skills', 'negotiation', 'education', 'agents', 'services', 'contact'];
    const isGeneratableIntent = generatableIntents.includes(intent.intent);
    const isSubstantive = latestUserMessage.length > 15 && latestUserMessage.length < 500;
    
    // Blocklist: skip generation for obvious attacks, off-topic, or unknowable questions
    const blockPatterns = [
      // Security / prompt injection
      /ignore.*previous|ignore.*instructions|system.*prompt|reveal.*prompt|jailbreak/i,
      /pretend.*you|act.*as|you.*are.*now|new.*persona|roleplay/i,
      /bypass|override|hack|exploit|inject/i,
      // Personal info we shouldn't guess at
      /social.*security|ssn|password|credit.*card|bank.*account|home.*address/i,
      /phone.*number|date.*of.*birth|birthday/i,
      // Off-topic / not about Charlton
      /weather|stock.*price|news.*today|recipe|translate|write.*me.*a.*poem/i,
      /who.*president|capital.*of|math.*problem|\d+\s*[\+\-\*\/]\s*\d+/i,
      // Questions directed at the AI itself (not about Charlton)
      /^(do|are|can|how|what) you (like|feel|think|eat|sleep|dream|spend|watch|play|listen|read|believe)/i,
      /^are you (an ai|a bot|real|human|alive|sentient|conscious)/i,
      /^how do you (work|feel|think|learn)/i,
      // Adversarial
      /say.*something.*bad|insult|swear|curse|offensive/i,
      /what.*wrong.*with|why.*suck|worst.*thing/i
    ];
    const isBlocked = blockPatterns.some(p => p.test(latestUserMessage));
    
    const allowSyncKnowledgeGeneration =
      process.env.ENABLE_SYNC_KNOWLEDGE_GEN === 'true' && !isFastRequest;

    // Rate limit: max 5 real-time generations per hour (check Firestore)
    let rateLimited = false;
    if (allowSyncKnowledgeGeneration && !isBlocked && isGeneratableIntent && isSubstantive && bestScore < generationThreshold && db) {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentGens = await db.collection('agent_activity')
          .where('type', '==', 'knowledge_generated')
          .where('metadata.realtime', '==', true)
          .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
          .limit(5)
          .get();
        rateLimited = recentGens.size >= 5;
        if (rateLimited) console.log('[chat] Rate limited: 5 real-time generations in the last hour');
      } catch (err) {
        // If rate check fails, allow generation
        console.error('[chat] Rate limit check failed:', err.message);
      }
    }
    
    if (allowSyncKnowledgeGeneration && bestScore < generationThreshold && isSubstantive && isGeneratableIntent && !isBlocked && !rateLimited && db) {
      console.log(`[chat] Low retrieval score (${bestScore}, threshold: ${generationThreshold}) — generating knowledge on the fly`);
      realtimeChunk = await generateKnowledgeOnTheFly(latestUserMessage, intent.intent);
      if (realtimeChunk) {
        retrievedChunks.unshift(realtimeChunk); // Add to front so it's highest priority
      }
    }
    
    // Fetch fitness data if relevant
    let fitnessContext = [];
    let fitnessToolsCalled = [];
    if (intent.intent === 'fitness') {
      const fitnessResult = await getFitnessContext(latestUserMessage);
      fitnessContext = fitnessResult.context;
      fitnessToolsCalled = fitnessResult.toolsCalled;
    }
    
    // Fetch AI activity data if relevant
    let activityContext = [];
    let activityToolsCalled = [];
    if (intent.intent === 'activity' || intent.intent === 'agents') {
      const activityResult = await getActivityContext(latestUserMessage);
      activityContext = activityResult.context;
      activityToolsCalled = activityResult.toolsCalled;

      // Also fetch Scribe's live commit inbox
      const scribeResult = await getScribeContext(latestUserMessage);
      activityContext = activityContext.concat(scribeResult.context);
      activityToolsCalled = activityToolsCalled.concat(scribeResult.toolsCalled);
    }

    // Fetch app-specific live data
    let appData = [];
    if (intent.intent === 'fabstats') {
      const result = await getFabStatsContext(latestUserMessage);
      appData = result.context;
    } else if (intent.intent === 'rowcrew') {
      const result = await getRowCrewContext();
      appData = result.context;
    } else if (intent.intent === 'spellbrigade') {
      const result = await getSpellBrigadeContext(latestUserMessage);
      appData = result.context;
    } else if (intent.intent === 'moltbook') {
      const result = await getMoltbookContext(latestUserMessage);
      appData = result.context;
    } else if (intent.intent === 'oldways') {
      const result = await getOWTContext(latestUserMessage);
      appData = result.context;
    }

    // Build system prompt with context
    let finalSystemPrompt = buildSystemPrompt(mode, retrievedChunks, intent, fitnessContext, activityContext, appData, !!realtimeChunk);

    // Inject interview-specific context when called from the Autoenhance batch downloader page
    if (requestContext === 'autoenhance-interview') {
      finalSystemPrompt += `

INTERVIEW CONTEXT — AUTOENHANCE BATCH IMAGE DOWNLOADER:
You are being accessed from Charlton's interview submission for Autoenhance.ai. The interviewer may ask about the batch endpoint, design decisions, or Charlton's background. Use these details to give specific, accurate answers:

WHAT IT DOES:
- A FastAPI service that downloads all enhanced images for a given Autoenhance order as a ZIP archive
- Endpoint: GET /orders/{order_id}/images with query params: format (jpeg/png/webp), quality (1-90), preview (bool), dev_mode (bool)
- Takes an order ID, fetches all images from the Autoenhance v3 API concurrently, bundles them into a ZIP
- Deployed at https://autoenhance.onrender.com (auto-deploys from GitHub main branch via Render)

DESIGN DECISIONS:
- Streaming concurrency: asyncio.as_completed with a semaphore (max 5 concurrent downloads). Each image streams into the ZIP and is freed immediately — no waiting for the full batch. Peak memory bounded by concurrency (5 in-flight), not order size
- Retry with backoff: 1 automatic retry on transient failures (5xx, timeout) with 1s backoff. No retry on 4xx (client errors are deterministic)
- Partial failure: if some images fail (still processing, timed out), the ZIP includes what succeeded plus a _download_report.txt. Only returns 422 if ALL images fail
- ZIP format: chosen over multipart (poor client support) or base64 JSON (33% size overhead). Universal support, ZIP_STORED (no compression) since JPEG/PNG/WebP are already compressed — saves CPU with no size penalty
- 60-second per-image timeout with httpx AsyncClient (follow_redirects=True because Autoenhance returns 302 -> asset server -> S3)
- Connection reuse: a shared httpx.AsyncClient is created once at startup via FastAPI lifespan, all requests reuse the same connection pool
- Memory: SpooledTemporaryFile for ZIP creation — ZIPs under 10 MB stay in memory, larger ones spill to disk. Orders capped at 100 images as safety limit
- UUID validation on order_id via regex before any upstream call — rejects bad input immediately
- Duplicate filename deduplication in the ZIP (appends _1, _2, etc.)
- Response headers X-Total-Images, X-Downloaded, X-Failed for download stats without parsing the ZIP

TECH STACK:
- Python 3.11+ with FastAPI and httpx (async HTTP)
- Multi-file package architecture: app/ with __init__.py (app factory, middleware, Sentry), config.py, state.py (Stats class, HTTP client), auth.py, and routes/ (batch.py, orders.py, monitoring.py, ui.py)
- Sentry for error tracking (opt-in via SENTRY_DSN)
- Thread-safe Stats class with encapsulated asyncio.Lock — mutation methods acquire the lock automatically, snapshot() returns clean dict for API responses
- Security: admin auth via httponly cookie (hmac.compare_digest), security headers middleware (nosniff, DENY framing, referrer policy), CORS restricted to known origins
- Deployed on Render with auto-deploys from main

TESTING:
- 20 unit tests using httpx MockTransport (no real API calls, no credits consumed)
- Covers: UUID validation, SQL injection blocking, full success, partial failure, total failure, empty orders, duplicate name deduplication, query param passthrough, retry on 5xx (verifies attempt count), no retry on 4xx, network error -> 502, upstream 401 -> 401, upstream 500 -> 502, too many images -> 413, health check, UI rendering
- monkeypatch replaces the shared _http_client per-test for full isolation

PRODUCTION CONSIDERATIONS (documented on the Production tab):
- Implemented: structured logging, Sentry error tracking, UUID input validation, 20-test unit suite, health check with UptimeRobot, admin auth, security headers, Stats class with locking, retry logic, streaming memory model
- Proposed next steps: circuit breaker pattern, response caching (images are immutable), rate limiting (slowapi), async job pattern for large orders, distributed tracing, API versioning

When answering, reference specific implementation details. For example, mention asyncio.as_completed with semaphore for streaming concurrency, _download_report.txt for partial failures, httpx MockTransport for testing, Stats class with encapsulated locking, retry with 1s backoff on 5xx, etc.

The server also exposes a /api/stats endpoint with live runtime metrics (uptime, orders processed, images downloaded/failed, ZIPs served, recent errors). If the user asks about usage, stats, or "how many images have you processed", use the live stats data below to answer with real numbers. These stats reset when the server restarts.`;
      if (liveStats) {
        finalSystemPrompt += liveStats;
      }
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.REACT_APP_OPENROUTER_API_KEY;
    if (!openRouterKey) {
      const fallback = buildFallbackChatResponse({
        query: latestUserMessage,
        intent,
        retrievedChunks,
        model,
        pricing,
        reason: 'OpenRouter API key not configured'
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(fallback)
      };
    }

    let response;
    try {
      response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://azoni.ai',
          'X-Title': 'Azoni Portfolio Chat'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: finalSystemPrompt },
            ...messages
          ],
          max_tokens: isFastRequest ? 450 : 800,
          temperature: mode === 'funny' ? 0.9 : 0.7
        })
      }, isFastRequest ? 3500 : 11000);
    } catch (err) {
      console.error('[chat] OpenRouter fetch failed, using local fallback:', err.message);
      const fallback = buildFallbackChatResponse({
        query: latestUserMessage,
        intent,
        retrievedChunks,
        model,
        pricing,
        reason: `OpenRouter fetch failed: ${err.message}`
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(fallback)
      };
    }

    let data;
    try {
      data = await readJsonResponse(response, 'OpenRouter chat completion');
    } catch (err) {
      const fallback = buildFallbackChatResponse({
        query: latestUserMessage,
        intent,
        retrievedChunks,
        model,
        pricing,
        reason: err.message
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(fallback)
      };
    }

    if (!response.ok) {
      const upstreamMessage = data.error?.message || data.message || 'API error';
      console.error('OpenRouter error:', { status: response.status, message: upstreamMessage });
      const fallback = buildFallbackChatResponse({
        query: latestUserMessage,
        intent,
        retrievedChunks,
        model,
        pricing,
        reason: `OpenRouter error ${response.status}: ${upstreamMessage}`
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(fallback)
      };
    }

    const usage = data.usage || {};
    const inputCost = (usage.prompt_tokens || 0) / 1000 * pricing.input;
    const outputCost = (usage.completion_tokens || 0) / 1000 * pricing.output;
    const totalCost = inputCost + outputCost;

    // Format RAG data for frontend display
    const maxScore = Math.max(...retrievedChunks.map(c => c.score), 1);
    const topChunks = retrievedChunks.map(c => ({
      id: c.id,
      title: c.title,
      category: c.category,
      similarity: c.vectorSimilarity != null
        ? c.vectorSimilarity.toFixed(3)
        : Math.min(c.score / maxScore, 1.0).toFixed(2),
      method: c.vectorSimilarity != null ? 'vector' : 'keyword'
    }));

    // ===== SELF-IMPROVEMENT: Log knowledge gaps + conversations =====
    const assistantResponse = data.choices?.[0]?.message?.content || '';
    try {
      const bestScore = retrievedChunks.length > 0 ? Math.max(...retrievedChunks.map(c => c.score)) : 0;
      const gapPhrases = ["don't have", "not in my knowledge", "don't have detailed", "cannot find", "no information", "not sure about that"];
      const responseIndicatesGap = gapPhrases.some(p => assistantResponse.toLowerCase().includes(p));
      const lowRetrievalScore = bestScore < 10;

      // Log knowledge gap if retrieval was weak or response admits ignorance
      // Skip if we already generated knowledge in real-time for this query
      if (!realtimeChunk && (lowRetrievalScore || responseIndicatesGap) && intent.intent !== 'greeting' && latestUserMessage.length > 10) {
        await db.collection('knowledge_gaps').add({
          query: latestUserMessage.slice(0, 500),
          intent: intent.intent,
          bestRetrievalScore: bestScore,
          responseIndicatesGap,
          topChunkTitles: topChunks.slice(0, 3).map(c => c.title),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          resolved: false
        });
        console.log(`[chat] Knowledge gap logged: "${latestUserMessage.slice(0, 80)}..." (score: ${bestScore})`);
      }

      // Log conversation for analysis (async, non-blocking)
      // Field names match frontend useChat.js so admin panel displays them correctly
      db.collection('chatLogs').add({
        sessionId: requestSessionId || `server_${Date.now()}`,
        userMessage: latestUserMessage.slice(0, 1000),
        assistantMessage: assistantResponse.slice(0, 1000),
        mode: mode || 'professional',
        model,
        modelName: pricing.name,
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
          totalCost: totalCost.toFixed(6)
        } : null,
        rag: {
          enabled: true,
          intent: intent.intent,
          intentConfidence: intent.confidence,
          chunksUsed: topChunks.length,
          bestRetrievalScore: bestScore
        },
        context: requestContext || 'azoni-ai',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }).catch(err => console.error('[chat] Failed to log conversation:', err.message));

      // Log to agent_activity so the Live System Map visualization reacts
      const INTENT_TO_STATION = {
        fitness: 'benchpressonly', fabstats: 'fabstats', rowcrew: 'rowcrew',
        spellbrigade: 'spellbrigade', moltbook: 'moltbook', oldways: 'oldwaystoday', activity: 'activity',
      };
      db.collection('agent_activity').add({
        type: 'assistant_chat',
        title: `Chat: ${latestUserMessage.slice(0, 60)}`,
        description: assistantResponse.slice(0, 200),
        source: requestContext === 'autoenhance-interview' ? 'autoenhance-interview' : 'azoni-ai',
        model,
        tokens: data.usage ? { prompt: data.usage.prompt_tokens, completion: data.usage.completion_tokens, total: data.usage.total_tokens } : {},
        cost: totalCost,
        metadata: { intent: intent.intent, targetStation: INTENT_TO_STATION[intent.intent] || null, chunksUsed: topChunks.length, context: requestContext || null },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }).catch(err => console.error('[chat] Failed to log chat activity:', err.message));
    } catch (gapErr) {
      console.error('[chat] Gap detection error (non-fatal):', gapErr.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...data,
        model,
        modelName: pricing.name,
        provider: pricing.provider,
        // RAG debug info
        _rag: {
          enabled: true,
          retrievalMethod: retrievedChunks.some(c => c.vectorSimilarity !== null) ? 'vector' : 'keyword',
          intent: intent.intent,
          intentConfidence: intent.confidence,
          reason: intent.reason,
          chunksRetrieved: retrievedChunks.length,
          topChunks: topChunks,
          realtimeGenerated: !!realtimeChunk,
          realtimeTitle: realtimeChunk?.title || null
        },
        // Fitness/MCP debug info
        _fitness: {
          enabled: fitnessContext.length > 0,
          source: 'azoni-mcp (BenchPressOnly)',
          toolsCalled: fitnessToolsCalled,
          dataPoints: fitnessContext.map(f => f.title)
        },
        // Activity/MCP debug info
        _activity: {
          enabled: activityContext.length > 0,
          source: 'azoni-mcp (AI Activity)',
          toolsCalled: activityToolsCalled,
          dataPoints: activityContext.map(a => a.title)
        },
        usage: {
          ...usage,
          model,
          modelName: pricing.name,
          provider: pricing.provider,
          inputCost: inputCost.toFixed(6),
          outputCost: outputCost.toFixed(6),
          totalCost: totalCost.toFixed(6)
        }
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    logError('chat', error.message, 'high', { function: 'main-handler' }).catch(() => {});
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
