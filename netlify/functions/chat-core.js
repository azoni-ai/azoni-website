// netlify/functions/chat-core.js
// Shared RAG + intent + MCP logic used by the streaming chat endpoint (chat-stream.js).
//
// This intentionally mirrors the proven logic in chat.js so that chat.js (the
// non-streaming fallback) stays untouched and low-risk. Keep MODEL_PRICING,
// detectIntent, retrieveChunks, and buildSystemPrompt in sync between the two.
// Once /chat-stream is verified in production, chat.js can be refactored to import
// from here and the duplication removed.

// ============ MODEL CONFIGURATION ============
// Prices are USD per 1K tokens (input / output). Keep in sync with chat.js.
const MODEL_PRICING = {
  'openai/gpt-5-mini': { input: 0.00025, output: 0.002, name: 'GPT-5 Mini', provider: 'OpenAI' },
  'openai/gpt-5-nano': { input: 0.00005, output: 0.0004, name: 'GPT-5 Nano', provider: 'OpenAI' },
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006, name: 'GPT-4o Mini', provider: 'OpenAI' },
  'anthropic/claude-haiku-4.5': { input: 0.001, output: 0.005, name: 'Claude Haiku 4.5', provider: 'Anthropic' },
  'google/gemini-2.5-flash': { input: 0.0003, output: 0.0025, name: 'Gemini 2.5 Flash', provider: 'Google' },
  'google/gemini-2.5-flash-lite': { input: 0.0001, output: 0.0004, name: 'Gemini 2.5 Flash Lite', provider: 'Google' },
  'meta-llama/llama-4-scout': { input: 0.0001, output: 0.0003, name: 'Llama 4 Scout', provider: 'Meta' },
  'deepseek/deepseek-v3.2': { input: 0.000229, output: 0.000343, name: 'DeepSeek V3.2', provider: 'DeepSeek' },
  'mistralai/mistral-small-3.2-24b-instruct': { input: 0.000075, output: 0.0002, name: 'Mistral Small 3.2', provider: 'Mistral' },
};

const DEFAULT_MODEL = 'openai/gpt-5-mini';

// The GPT-5 family only accepts the default temperature (1).
function supportsCustomTemperature(model) {
  return !/^openai\/gpt-5/.test(model);
}

// ============ FETCH HELPERS ============
async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
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

async function readJsonResponse(response, label) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error(`[chat-core] ${label} returned non-JSON response`, {
      status: response.status,
      preview: text.slice(0, 300)
    });
    throw new Error(`${label} returned non-JSON response (${response.status})`);
  }
}

// ============ VECTOR SEARCH ============
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) })
    }, 6000);
    const data = await response.json();
    if (data.error) {
      console.error('[chat-core] Embedding error:', data.error.message);
      return null;
    }
    return data.data[0].embedding;
  } catch (err) {
    console.error('[chat-core] Embedding failed:', err.message);
    return null;
  }
}

// ============ MCP SERVER ============
const MCP_BASE_URL = process.env.MCP_SERVER_URL || 'https://azoni-mcp.onrender.com';
// Use whichever key is present, same as app-stats. All chat calls are GETs, so the
// admin key is a safe fallback; without this the chat sends unauthenticated requests
// (401 → null → canned fallback) whenever only MCP_ADMIN_KEY is set in the env.
const MCP_KEY = process.env.MCP_READ_KEY || process.env.MCP_ADMIN_KEY;

async function callMCPTool(endpoint, options = {}) {
  try {
    const headers = {};
    if (MCP_KEY) headers['Authorization'] = `Bearer ${MCP_KEY}`;
    const timeoutMs = options.timeoutMs || 5000;
    const response = await fetchWithTimeout(`${MCP_BASE_URL}${endpoint}`, { headers }, timeoutMs);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('[chat-core] MCP call failed:', error.message);
    return null;
  }
}

// ============ FIREBASE ============
let db = null;
let admin = null;
let firebaseInitError = null;
// The ESM/NFT chat-stream entry imports firebase-admin statically and injects it
// here — bundlers repeatedly broke the lazy require() in that runtime (esbuild
// rewrote the SDK's internal requires; NFT's trace missed the module entirely).
// Consumers that don't inject fall through to require('firebase-admin'). No such
// consumer exists in-repo (chat.js is self-contained and never imports chat-core);
// the fallback covers running chat-core outside the bundled chat-stream entry.
let injectedAdmin = null;
function provideFirebaseAdmin(mod) {
  injectedAdmin = mod && (mod.default || mod);
}

function initFirebase() {
  if (db) return true;
  if (firebaseInitError) return false;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    firebaseInitError = 'Firebase credentials not configured';
    console.error('[chat-core] initFirebase:', firebaseInitError);
    return false;
  }

  try {
    admin = injectedAdmin || require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') })
      });
    }
    db = admin.firestore();
    return true;
  } catch (error) {
    // Log loudly: a silent failure here once hid a broken bundle for weeks — every
    // streamed answer silently fell back to canned chunks with no Firestore access.
    firebaseInitError = `Firebase init failed: ${error.message}`;
    console.error('[chat-core] initFirebase:', firebaseInitError);
    return false;
  }
}

const RAG_COLLECTION = 'rag_knowledge_base';
let chunksCache = null;
let chunksCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getKnowledgeChunks() {
  if (chunksCache && (Date.now() - chunksCacheTime) < CACHE_TTL) return chunksCache;
  if (!initFirebase()) return [];
  try {
    const snapshot = await db.collection(RAG_COLLECTION).get();
    const chunks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    chunksCache = chunks;
    chunksCacheTime = Date.now();
    return chunks;
  } catch (error) {
    console.error('[chat-core] Error fetching RAG chunks:', error.message);
    return chunksCache || [];
  }
}

// ============ FALLBACK CHUNKS ============
const FALLBACK_CHUNK = {
  id: 'fallback-intro',
  category: 'general',
  title: 'About Charlton Smith',
  content: 'Charlton Smith is a software engineer with 7+ years of experience based in Seattle. Contact: charltonuw@gmail.com',
  keywords: ['charlton', 'about', 'contact', 'seattle']
};

function getFallbackChunks(query, intent) {
  const q = (query || '').toLowerCase();
  const chunks = [{ ...FALLBACK_CHUNK, score: 1, vectorSimilarity: null }];

  if (intent?.intent === 'experience' || /devops|infra|infrastructure|aws|cloud|backend|production/.test(q)) {
    chunks.unshift({
      id: 'fallback-infra-experience',
      category: 'experience',
      title: 'DevOps and infrastructure experience',
      content: `Charlton has production infrastructure experience across AWS, Netlify Functions, Firebase/Firestore, Docker, Render, FastAPI, Node, and CI/CD-style deployment flows. At Capital One he worked on automated testing pipelines with AWS Lambda and S3. In his independent product work, he has shipped serverless functions, authenticated backends, observability, cost logging, health checks, scheduled agents, and live activity feeds. Recent infrastructure-heavy projects include EmbedRoute, the Azoni MCP server, the RAG chatbot pipeline, Old Ways Today, and the multi-agent systems behind the portfolio.`,
      keywords: ['devops', 'infra', 'infrastructure', 'aws', 'lambda', 's3', 'docker', 'render', 'netlify', 'observability'],
      score: 50, vectorSimilarity: null
    });
  }

  if (intent?.intent === 'projects' || /built|projects|apps|products/.test(q)) {
    chunks.unshift({
      id: 'fallback-projects',
      category: 'projects',
      title: 'Recent product work',
      content: `Charlton has built and shipped FaB Stats, EmbedRoute, the Azoni MCP server, the Azoni Moltbook agent, Old Ways Today, Bench Only, Row Crew, Spell Brigade, and the azoni.ai portfolio. These projects combine full-stack product engineering with AI workflows, serverless or managed infrastructure, live data, and operational logging.`,
      keywords: ['projects', 'products', 'fab stats', 'embedroute', 'mcp', 'old ways today', 'bench only', 'row crew', 'spell brigade'],
      score: 45, vectorSimilarity: null
    });
  }

  if (intent?.intent === 'skills' || /skills|stack|technologies|languages/.test(q)) {
    chunks.unshift({
      id: 'fallback-skills',
      category: 'skills',
      title: 'Technical stack',
      content: `Charlton's core stack includes React, JavaScript/TypeScript, Python, Node.js, FastAPI, Firebase/Firestore, PostgreSQL, AWS, Docker, Netlify Functions, Render, OpenAI APIs, Claude API, RAG systems, and LLM agents. He is strongest where product engineering meets backend systems and AI infrastructure.`,
      keywords: ['skills', 'stack', 'typescript', 'python', 'react', 'fastapi', 'firebase', 'postgresql', 'aws', 'llm agents'],
      score: 40, vectorSimilarity: null
    });
  }

  return chunks;
}

// ============ MESSAGE HELPERS ============
// Per-message cap. 12k chars fits full job descriptions (the greeting invites
// pasting them); longer input is cut with an explicit note so the model can
// disclose it analyzed a partial message. Keep in sync with chat.js.
const MESSAGE_CHAR_CAP = 12000;

function sanitizeChatMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];
  return rawMessages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({
      role: m.role,
      content: m.content.length > MESSAGE_CHAR_CAP
        ? `${m.content.slice(0, MESSAGE_CHAR_CAP)}\n[Note: message truncated at ${MESSAGE_CHAR_CAP} characters]`
        : m.content
    }))
    .slice(-12);
}

function selectModelMessages(messages, isFastRequest) {
  return messages.slice(isFastRequest ? -4 : -10);
}

function getUserFormatInstruction(query) {
  const q = query || '';
  const sentenceLimit = q.match(/(?:in|under|within)?\s*(\d+)\s+sentences?\s*(?:or less|max|maximum)?/i);
  if (sentenceLimit) return `The user requested ${sentenceLimit[1]} sentences or less. Do not exceed that sentence count.`;
  if (/\b(short|brief|concise|quick|tl;dr|tldr)\b/i.test(q)) return 'The user requested a brief answer. Keep it concise and avoid extra background.';
  if (/\bbullets?\b|\blist\b/i.test(q)) return 'The user requested bullets or a list. Use short plain-text lines starting with "- " (no markdown).';
  return '';
}

// ============ INTENT DETECTION (mirror of chat.js) ============
function detectIntent(query) {
  const q = query.toLowerCase();

  const agentTriggers = ['orchestrat', 'agent system', 'agent architect', 'how do you work', 'what do you do',
    'what are you', 'tell me about yourself', 'how does this work', 'how does azoni ai',
    'azoni ai', 'ai agent', 'blog.*agent', 'fitness.*agent', 'gaming.*agent', 'social.*agent', 'blog writer',
    'multi.?agent', 'central intelligence', 'chatbot', 'how (does|do) (this|the|you).*(work|bot)'];
  if (agentTriggers.some(t => new RegExp(t).test(q))) return { intent: 'agents', confidence: 'HIGH', reason: 'agent_keyword' };

  const moltbookTriggers = ['moltbook', 'azoni-ai', 'autonomous agent'];
  if (moltbookTriggers.some(t => q.includes(t))) return { intent: 'moltbook', confidence: 'HIGH', reason: 'moltbook_keyword' };

  const activityTriggers = ['ai activity', 'ai cost', 'ai spend', 'ai usage', 'token usage', 'token cost',
    'activity feed', 'activity log', 'how much.*spent.*ai', 'how much.*cost',
    'what.*ai.*doing', 'what.*ai.*been', 'api cost', 'api spend',
    'spell brigade.*ai', 'benchpress.*ai', 'ai.*spell brigade', 'ai.*benchpress',
    // "what has he been working on / up to lately" → recent activity feed (recency word required so it
    // doesn't grab "what did he work on at Capital One", which should stay experience).
    '(working on|been up to|up to|building|shipping|been doing|doing).*(lately|recently|now|these days|currently|right now)',
    '(lately|recently|these days|currently|right now).*(working on|been up to|building|shipping|doing)',
    'what.?s he been up to', 'been up to lately', 'been up to recently'];
  if (activityTriggers.some(t => new RegExp(t).test(q))) return { intent: 'activity', confidence: 'HIGH', reason: 'activity_keyword' };

  const nonFitnessQualifiers = ['career', 'job', 'work', 'professional', 'life', 'personal', 'future'];
  // Word-boundary match so "work" doesn't swallow "workout"/"working" (fitness/activity, not career).
  const hasNonFitnessQualifier = nonFitnessQualifiers.some(t => new RegExp(`\\b${t}\\b`).test(q));

  const companyTriggers = ['capital one', 'capitalone', 't-mobile', 'tmobile', 't mobile', 'slalom', 'nucamp', 'oli fitness', 'oli'];
  if (companyTriggers.some(t => q.includes(t))) return { intent: 'experience', confidence: 'HIGH', reason: 'company_name' };

  const experiencePatterns = [/work(ed)?\s+(at|for|with)/, /job\s+(at|with)/, /role\s+(at|with)/, /experience\s+(at|with)/,
    /position\s+(at|with)/, /employed\s+(at|by)/, /previous\s+(job|role|position|employer)/, /work\s+history/, /career/, /employment/,
    /where (did|does|has) (he|charlton).*(work|job|employ)/, /work(ed)?\s+before/];
  if (experiencePatterns.some(p => p.test(q))) return { intent: 'experience', confidence: 'HIGH', reason: 'work_pattern' };

  const interviewStoryPatterns = [/technical decision.*regret/, /decision.*regret/, /missed signal/, /signal.*miss/,
    /risky.*assumption/, /assumption.*validate/, /lesson(s)? learned/, /customer[-\s]?facing/, /real users/];
  if (interviewStoryPatterns.some(p => p.test(q))) return { intent: 'experience', confidence: 'HIGH', reason: 'interview_story' };

  const infraExperienceTriggers = ['devops', 'infra', 'infrastructure', 'platform engineering', 'platform engineer',
    'cloud', 'aws', 'lambda', 's3', 'docker', 'ci/cd', 'cicd', 'deployment', 'deploy', 'observability', 'monitoring',
    'serverless', 'netlify functions', 'render', 'production systems'];
  if (infraExperienceTriggers.some(t => q.includes(t))) return { intent: 'experience', confidence: 'HIGH', reason: 'infra_keyword' };

  const roleFitPatterns = [/where (would|does) (he|charlton).*(fit|slot)/, /(best|ideal).*(role|team|fit).*(for|with)? (him|charlton)?/,
    /fit.*(software|engineering|product|platform|backend|ai).*team/];
  if (roleFitPatterns.some(p => p.test(q))) return { intent: 'experience', confidence: 'HIGH', reason: 'role_fit' };

  const fabStatsTriggers = ['fab stats', 'fabstats', 'flesh and blood', 'tcg', 'card game', 'fab bot'];
  if (fabStatsTriggers.some(t => q.includes(t))) return { intent: 'fabstats', confidence: 'HIGH', reason: 'fabstats_keyword' };

  const rowCrewTriggers = ['row crew', 'rowcrew', 'rowing', 'ergometer', 'concept2', 'erg '];
  if (rowCrewTriggers.some(t => q.includes(t))) return { intent: 'rowcrew', confidence: 'HIGH', reason: 'rowcrew_keyword' };

  const spellBrigadeTriggers = ['spell brigade', 'spellbrigade', 'wizard game', 'wizard combat'];
  if (spellBrigadeTriggers.some(t => q.includes(t))) return { intent: 'spellbrigade', confidence: 'HIGH', reason: 'spellbrigade_keyword' };

  const owtTriggers = ['old ways', 'oldways', 'non-toxic', 'non toxic', 'natural remedies'];
  if (owtTriggers.some(t => q.includes(t))) return { intent: 'oldways', confidence: 'HIGH', reason: 'oldways_keyword' };

  const projectIntentPatterns = [/what (has|did) (he|charlton).*(built|build|ship|shipped|make|made|create|created)/,
    /(his|charlton's|charlton).*(projects?|apps?|products?|portfolio work)/, /\b(projects?|portfolio projects?|products he built)\b/];
  if (projectIntentPatterns.some(p => p.test(q))) return { intent: 'projects', confidence: 'HIGH', reason: 'project_pattern' };

  const projectTriggers = ['dumarket', 'du market', 'dustbunny', 'dust bunny', 'azoni', 'prediction market', 'nft',
    'discord bot', 'twitter bot', 'embed route', 'embedroute'];
  if (projectTriggers.some(t => q.includes(t))) return { intent: 'projects', confidence: 'HIGH', reason: 'project_name' };

  const educationTriggers = ['degree', 'university', 'college', 'school', 'graduate', 'study', 'studied', 'education', 'masters', 'bachelors', 'uw', 'colorado'];
  if (educationTriggers.some(t => q.includes(t))) return { intent: 'education', confidence: 'HIGH', reason: 'education_keyword' };

  if (!hasNonFitnessQualifier) {
    const strongFitnessTriggers = ['workout', 'workouts', 'gym', 'lifting', 'bench press', 'bench', 'squat', 'deadlift',
      'coach', 'coaching', 'trainer', 'athlete', 'athletes', 'benchpressonly', 'bench only', 'benchonly',
      'pr ', 'prs', 'personal record', '1rm', 'one rep max', 'streak', 'consistency', 'consistent', 'reps', 'sets', 'volume', 'training', 'trains',
      'how much does he bench', 'how much can he lift', 'how strong', 'bmi', 'body stats', 'physique'];
    if (strongFitnessTriggers.some(t => q.includes(t))) return { intent: 'fitness', confidence: 'HIGH', reason: 'fitness_keyword' };

    const weakFitnessTriggers = ['goal', 'goals', 'target', 'weight', 'weigh', 'height', 'tall', 'max', 'strong', 'strength'];
    const fitnessContextWords = ['fitness', 'gym', 'lift', 'training', 'workout', 'exercise', 'bench', 'squat', 'deadlift', 'muscle', 'gains', 'body', 'physique'];
    if (weakFitnessTriggers.some(t => q.includes(t)) && fitnessContextWords.some(t => q.includes(t))) {
      return { intent: 'fitness', confidence: 'HIGH', reason: 'fitness_context' };
    }

    const bodyQueries = ['how much do you weigh', 'how much does he weigh', 'how much does charlton weigh', 'how tall', 'what is your weight', 'what is charlton\'s weight', 'body measurement', 'body measurements', 'body fat', 'body composition', 'physique'];
    if (bodyQueries.some(t => q.includes(t))) return { intent: 'fitness', confidence: 'MEDIUM', reason: 'body_query' };
  }

  const skillsPatterns = [/what (languages?|technologies?|tools?|frameworks?)/, /can (he|charlton) (use|code|program|work with)/,
    /does (he|charlton) know/, /skills?/, /tech stack/, /proficien/];
  if (skillsPatterns.some(p => p.test(q))) return { intent: 'skills', confidence: 'MEDIUM', reason: 'skills_pattern' };

  const contactTriggers = ['contact', 'email', 'hire', 'hiring', 'reach', 'linkedin', 'github', 'resume'];
  if (contactTriggers.some(t => q.includes(t))) return { intent: 'contact', confidence: 'HIGH', reason: 'contact_keyword' };

  const servicesTriggers = ['make me a', 'build me a', 'create me a', 'can you make', 'can you build',
    'website for me', 'app for me', 'freelance', 'available for', 'for hire', 'services', 'consulting', 'contract work'];
  if (servicesTriggers.some(t => q.includes(t))) return { intent: 'services', confidence: 'HIGH', reason: 'services_request' };

  const negotiationTriggers = ['salary', 'compensation', 'pay rate', 'pay range', 'paid', 'annual pay',
    'how much does he make', 'how much should he', 'how much would he', 'how much does charlton', 'how much do you charge',
    'how much to hire', 'offer him', 'salary offer', 'comp package', 'accept the', 'would he accept', 'will he accept',
    'would charlton accept', 'budget for', 'afford him', 'what is he worth', 'what\'s he worth', 'salary expect',
    'comp expect', 'rate expect', 'why did he leave', 'why did charlton leave', 'why leave', 'left his job', 'left his role',
    'fired', 'laid off', 'layoff', 'let go', 'terminated', 'quit his', 'looking for work', 'why is he looking',
    'open to opportunities', 'open to roles', 'not interview', 'won\'t interview', 'will not interview',
    'negotiate', 'negotiable', 'salary range', 'comp range', 'minimum salary', 'salary floor'];
  if (negotiationTriggers.some(t => q.includes(t))) return { intent: 'negotiation', confidence: 'HIGH', reason: 'negotiation_keyword' };

  const generalTriggers = ['who is', 'tell me about', 'background', 'about charlton', 'introduce'];
  if (generalTriggers.some(t => q.includes(t))) return { intent: 'general', confidence: 'MEDIUM', reason: 'general_about' };

  return { intent: 'general', confidence: 'LOW', reason: 'no_match' };
}

// ============ CHUNK RETRIEVAL (mirror of chat.js) ============
async function retrieveChunks(query, intent, maxChunks = 5, options = {}) {
  const q = query.toLowerCase();
  const useEmbedding = options.useEmbedding !== false;
  let chunks = [];
  try {
    chunks = await promiseWithTimeout(getKnowledgeChunks(), options.chunkTimeoutMs || 4000, 'RAG chunk load');
  } catch (err) {
    console.error('[chat-core] RAG chunk load failed:', err.message);
  }

  if (!chunks || chunks.length === 0) {
    return getFallbackChunks(query, intent).slice(0, maxChunks);
  }

  const fallbackChunks = getFallbackChunks(query, intent);
  const seenChunkKeys = new Set(chunks.map(c => c.id || c.title).filter(Boolean));
  for (const fallbackChunk of fallbackChunks) {
    const key = fallbackChunk.id || fallbackChunk.title;
    if (!key || !seenChunkKeys.has(key)) {
      chunks.push(fallbackChunk);
      if (key) seenChunkKeys.add(key);
    }
  }

  const queryEmbedding = useEmbedding ? await embedQuery(query) : null;
  const results = [];

  for (const chunk of chunks) {
    let score = 0;
    let vectorSimilarity = null;
    const hasVector = queryEmbedding && chunk.embedding;

    if (hasVector) {
      vectorSimilarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      score = vectorSimilarity * 100;
    }

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

    const kwBonus = hasVector ? 10 : 15;
    const kwLongBonus = hasVector ? 3 : 5;
    const keywords = chunk.keywords || chunk.metadata?.keywords || [];
    for (const keyword of keywords) {
      if (q.includes(keyword.toLowerCase())) {
        score += kwBonus;
        if (keyword.length > 5) score += kwLongBonus;
      }
    }

    if (chunk.title && chunk.title.toLowerCase().split(' ').some(word => q.includes(word) && word.length > 3)) {
      score += hasVector ? 10 : 20;
    }

    if (!hasVector) {
      const queryWords = q.split(/\s+/).filter(w => w.length > 3);
      const contentLower = (chunk.content || '').toLowerCase();
      for (const word of queryWords) {
        if (contentLower.includes(word)) score += 3;
      }
    }

    if (score > 0) results.push({ ...chunk, score, vectorSimilarity });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxChunks);
}

// ============ MCP LIVE CONTEXT GETTERS (mirror of chat.js) ============
async function getFitnessContext(query, options = {}) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];
  const mcpOptions = { timeoutMs: options.mcpTimeoutMs || 5000 };
  const username = 'azoni';

  const isCoachQuery = /coach|trainer|athlete|clients|trains|training clients/.test(q);
  const isMaxQuery = /max|pr|1rm|strongest|best lift|how much|bench|squat|deadlift/.test(q);
  const isGoalQuery = /goal|target/.test(q);
  const isWorkoutQuery = /workout|session|routine/.test(q);
  const isStreakQuery = /streak|consistent|discipline|dedicated|commitment/.test(q);
  const isVolumeQuery = /volume|sets|reps|tonnage/.test(q);
  const isExerciseQuery = /exercise|favorite|most trained/.test(q);
  const isBodyQuery = /weigh|weight|tall|height|bmi|body/.test(q);
  const isProfileQuery = /profile|about|who is|member|how long/.test(q);

  try {
    if (isCoachQuery) {
      const summary = await callMCPTool(`/benchpressonly/coach/${username}`, mcpOptions);
      if (summary && !summary.error) { context.push({ title: 'Coaching Overview', data: summary }); toolsCalled.push('get_coach_summary'); }
      const athletes = await callMCPTool(`/benchpressonly/coach/${username}/athletes`, mcpOptions);
      if (athletes && !athletes.error) { context.push({ title: 'Athlete Progress', data: athletes }); toolsCalled.push('get_athlete_progress'); }
    }
    if (isMaxQuery) {
      const maxes = await callMCPTool(`/benchpressonly/maxes/${username}`, mcpOptions);
      if (maxes && !maxes.error) { context.push({ title: 'Personal Records', data: maxes }); toolsCalled.push('get_max_lifts'); }
    }
    if (isGoalQuery) {
      const goals = await callMCPTool(`/benchpressonly/goals/${username}`, mcpOptions);
      if (goals && !goals.error) { context.push({ title: 'Fitness Goals', data: goals }); toolsCalled.push('get_goals'); }
    }
    if (isStreakQuery) {
      const streak = await callMCPTool(`/benchpressonly/streak/${username}`, mcpOptions);
      if (streak && !streak.error) { context.push({ title: 'Workout Streak', data: streak }); toolsCalled.push('get_streak'); }
      const consistency = await callMCPTool(`/benchpressonly/consistency/${username}`, mcpOptions);
      if (consistency && !consistency.error) { context.push({ title: 'Training Consistency', data: consistency }); toolsCalled.push('get_consistency'); }
    }
    if (isVolumeQuery) {
      const volume = await callMCPTool(`/benchpressonly/volume/${username}`, mcpOptions);
      if (volume && !volume.error) { context.push({ title: 'Training Volume', data: volume }); toolsCalled.push('get_training_volume'); }
    }
    if (isExerciseQuery) {
      const exercises = await callMCPTool(`/benchpressonly/exercises/${username}`, mcpOptions);
      if (exercises && !exercises.error) { context.push({ title: 'Top Exercises', data: exercises }); toolsCalled.push('get_top_exercises'); }
    }
    if (isBodyQuery) {
      const body = await callMCPTool(`/benchpressonly/body/${username}`, mcpOptions);
      if (body && !body.error) { context.push({ title: 'Body Stats', data: body }); toolsCalled.push('get_body_stats'); }
    }
    if (isProfileQuery) {
      const profile = await callMCPTool(`/benchpressonly/profile/${username}`, mcpOptions);
      if (profile && !profile.error) { context.push({ title: 'Fitness Profile', data: profile }); toolsCalled.push('get_user_profile'); }
    }
    if (isWorkoutQuery || context.length === 0) {
      const workouts = await callMCPTool(`/benchpressonly/workouts/${username}`, mcpOptions);
      if (workouts && !workouts.error) { context.push({ title: 'Recent Workouts', data: workouts }); toolsCalled.push('get_recent_workouts'); }
    }
  } catch (error) {
    console.error('[chat-core] Fitness context error:', error.message);
  }
  return { context, toolsCalled };
}

async function getActivityContext(query, options = {}) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];
  const mcpOptions = { timeoutMs: options.mcpTimeoutMs || 5000 };
  try {
    const recent = await callMCPTool('/activity/recent?limit=15', mcpOptions);
    if (recent && !recent.error) { context.push({ title: 'Recent AI Activity', data: recent }); toolsCalled.push('get_recent_activity'); }
    if (/cost|spend|usage|token|price|expensive|cheap|money|dollar|\$|budget/.test(q)) {
      const days = /month|30/.test(q) ? 30 : /week|7/.test(q) ? 7 : /year|365/.test(q) ? 365 : 30;
      const costs = await callMCPTool(`/activity/costs?days=${days}`, mcpOptions);
      if (costs && !costs.error) { context.push({ title: `AI Cost Summary (${days} days)`, data: costs }); toolsCalled.push('get_cost_summary'); }
    }
    if (/active|busy|frequent|trend|stats|how (much|often|many)/.test(q)) {
      const days = /month|30/.test(q) ? 30 : 7;
      const stats = await callMCPTool(`/activity/stats?days=${days}`, mcpOptions);
      if (stats && !stats.error) { context.push({ title: `Activity Stats (${days} days)`, data: stats }); toolsCalled.push('get_activity_stats'); }
    }
  } catch (error) {
    console.error('[chat-core] Activity context error:', error.message);
  }
  return { context, toolsCalled };
}

async function getFabStatsContext(query, options = {}) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];
  const mcpOptions = { timeoutMs: options.mcpTimeoutMs || 5000 };
  try {
    const community = await callMCPTool('/fabstats/community', mcpOptions);
    if (community && !community.error) { context.push({ title: 'FaB Stats Community Overview', data: community }); toolsCalled.push('get_community_stats'); }
    if (/leaderboard|ranking|top|best|elo/.test(q)) {
      const lb = await callMCPTool('/fabstats/leaderboard', mcpOptions);
      if (lb && !lb.error) { context.push({ title: 'FaB Stats Leaderboard', data: lb }); toolsCalled.push('get_leaderboard'); }
    }
    if (/minigame|puzzle|daily|fabdoku|crossword/.test(q)) {
      const game = q.includes('crossword') ? 'crossword' : 'fabdoku';
      const mg = await callMCPTool(`/fabstats/minigame/${game}`, mcpOptions);
      if (mg && !mg.error) { context.push({ title: `Minigame Stats: ${game}`, data: mg }); toolsCalled.push('get_minigame_stats'); }
    }
  } catch (error) {
    console.error('[chat-core] FaB Stats context error:', error.message);
  }
  return { context, toolsCalled };
}

async function getRowCrewContext(options = {}) {
  const context = [];
  const toolsCalled = [];
  const mcpOptions = { timeoutMs: options.mcpTimeoutMs || 5000 };
  try {
    const stats = await callMCPTool('/rowcrew/stats', mcpOptions);
    if (stats && !stats.error) { context.push({ title: 'RowCrew Rowing Stats', data: stats }); toolsCalled.push('get_rowing_stats'); }
  } catch (error) {
    console.error('[chat-core] RowCrew context error:', error.message);
  }
  return { context, toolsCalled };
}

async function getSpellBrigadeContext(query, options = {}) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];
  const mcpOptions = { timeoutMs: options.mcpTimeoutMs || 5000 };
  try {
    const status = await callMCPTool('/spellbrigade/status', mcpOptions);
    if (status && !status.error) { context.push({ title: 'Spell Brigade Status', data: status }); toolsCalled.push('get_spellbrigade_status'); }
    if (/leaderboard|ranking|top|best|winner/.test(q)) {
      const lb = await callMCPTool('/spellbrigade/leaderboard', mcpOptions);
      if (lb && !lb.error) { context.push({ title: 'Spell Brigade Leaderboard', data: lb }); toolsCalled.push('get_spellbrigade_leaderboard'); }
    }
  } catch (error) {
    console.error('[chat-core] Spell Brigade context error:', error.message);
  }
  return { context, toolsCalled };
}

async function getMoltbookContext(query, options = {}) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];
  const mcpOptions = { timeoutMs: options.mcpTimeoutMs || 5000 };
  try {
    const status = await callMCPTool('/moltbook/status', mcpOptions);
    if (status && !status.error) { context.push({ title: 'Moltbook Agent Status', data: status }); toolsCalled.push('get_moltbook_status'); }
    if (/feed|post|content|recent|what.*post/.test(q)) {
      const feed = await callMCPTool('/moltbook/feed', mcpOptions);
      if (feed && !feed.error) { context.push({ title: 'Moltbook Recent Feed', data: feed }); toolsCalled.push('get_moltbook_feed'); }
    }
  } catch (error) {
    console.error('[chat-core] Moltbook context error:', error.message);
  }
  return { context, toolsCalled };
}

async function getOWTContext(query, options = {}) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];
  const mcpOptions = { timeoutMs: options.mcpTimeoutMs || 5000 };
  try {
    const health = await callMCPTool('/oldwaystoday/health', mcpOptions);
    if (health && !health.error) { context.push({ title: 'Old Ways Today Health', data: health }); toolsCalled.push('get_owt_health'); }
    if (/stats|usage|request|token|traffic/.test(q)) {
      const stats = await callMCPTool('/oldwaystoday/stats', mcpOptions);
      if (stats && !stats.error) { context.push({ title: 'Old Ways Today Usage Stats', data: stats }); toolsCalled.push('get_owt_stats'); }
    }
  } catch (error) {
    console.error('[chat-core] OWT context error:', error.message);
  }
  return { context, toolsCalled };
}

// ============ TOOL-CALLING (LLM function calling for live MCP data) ============
// Tool schema sent to the model. Each maps to an MCP context getter above.
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_fitness_data',
      description: "Live training data from Charlton's BenchPressOnly app: max lifts / PRs, recent workouts, streak, consistency, goals, body stats, training volume, top exercises, coaching. Call this for ANY question about his lifting, strength, bench/squat/deadlift, workouts, fitness goals, or coaching.",
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'The user question verbatim, used to choose which fitness metrics to pull.' } }, required: ['query'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_ai_activity',
      description: "Live activity, token usage, and cost across Charlton's autonomous AI agent system. Call this for questions about what the AI has been doing, how much it costs/spends, or token usage.",
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'The user question verbatim.' } }, required: ['query'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_fabstats',
      description: 'Live FaB Stats (Flesh and Blood TCG) community overview, leaderboard, and daily minigame stats.',
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'The user question verbatim.' } }, required: ['query'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_rowcrew',
      description: 'Live RowCrew rowing verification stats.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_spellbrigade',
      description: 'Live Spell Brigade multiplayer game status and leaderboard.',
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'The user question verbatim.' } }, required: ['query'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_moltbook',
      description: "Live status and recent feed for Azoni-AI, Charlton's autonomous agent on Moltbook.",
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'The user question verbatim.' } }, required: ['query'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_oldwaystoday',
      description: 'Live Old Ways Today health and usage stats.',
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'The user question verbatim.' } }, required: ['query'] }
    }
  }
];

// Execute a single tool call by name; returns { title, context: [...], toolsCalled: [...] }.
async function executeToolCall(name, args = {}, options = {}) {
  const query = typeof args.query === 'string' ? args.query : '';
  switch (name) {
    case 'get_fitness_data': return { ...(await getFitnessContext(query, options)), tool: name };
    case 'get_ai_activity': return { ...(await getActivityContext(query, options)), tool: name };
    case 'get_fabstats': return { ...(await getFabStatsContext(query, options)), tool: name };
    case 'get_rowcrew': return { ...(await getRowCrewContext(options)), tool: name };
    case 'get_spellbrigade': return { ...(await getSpellBrigadeContext(query, options)), tool: name };
    case 'get_moltbook': return { ...(await getMoltbookContext(query, options)), tool: name };
    case 'get_oldwaystoday': return { ...(await getOWTContext(query, options)), tool: name };
    default: return { context: [], toolsCalled: [], tool: name, error: `Unknown tool: ${name}` };
  }
}

// ============ SYSTEM PROMPT (mirror of chat.js) ============
function buildSystemPrompt(mode, retrievedChunks, intent, fitnessData = [], activityData = [], appData = [], hasRealtimeChunk = false, options = {}) {
  const toneInstructions = {
    professional: 'Be professional, concise, and highlight relevant qualifications.',
    friendly: 'Be warm and approachable while remaining informative.',
    casual: 'Be relaxed and conversational, like talking to a friend.',
    funny: 'Add humor and wit while still being helpful and informative.'
  };
  const isFastRequest = !!options.isFastRequest;
  const userFormatInstruction = options.userFormatInstruction || '';
  const responseShape = isFastRequest
    ? 'This is a compact home-page chat. Answer quickly in 2-4 useful sentences or a few short lines starting with "- ". Do not mention model names, RAG, MCP, chunks, or internal pipeline details unless the user directly asks how the chatbot works.'
    : 'This is the full chat page. Be direct first, then add detail where it helps. Do not lead with implementation details unless the user asks for them.';

  const contextSection = retrievedChunks.length > 0
    ? `\n\nRETRIEVED CONTEXT (use ONLY this information to answer):\n${retrievedChunks.map(c => `--- ${c.title} ---\n${c.content}`).join('\n\n')}`
    : '';
  const fitnessSection = fitnessData.length > 0
    ? `\n\nLIVE FITNESS DATA (from BenchPressOnly app - use these real numbers):\n${fitnessData.map(f => `--- ${f.title} ---\n${JSON.stringify(f.data, null, 2)}`).join('\n\n')}`
    : '';
  const activitySection = activityData.length > 0
    ? `\n\nLIVE AI ACTIVITY DATA (real-time from across all apps):\n${activityData.map(a => `--- ${a.title} ---\n${JSON.stringify(a.data, null, 2)}`).join('\n\n')}`
    : '';
  const appDataSection = appData.length > 0
    ? `\n\nLIVE APP DATA (real-time from portfolio apps - use these real numbers):\n${appData.map(a => `--- ${a.title} ---\n${JSON.stringify(a.data, null, 2)}`).join('\n\n')}`
    : '';

  return `You are Azoni AI, the portfolio chatbot for Charlton Smith, a software engineer in Seattle. You are part of a multi-agent AI system that Charlton built — you serve as the user-facing interface while a central orchestrator coordinates blog writing, social posting, fitness tracking, and gaming agents behind the scenes.

Your primary job is helping recruiters, hiring managers, and visitors learn about Charlton's background, skills, projects, and experience. Always speak in third person about Charlton. Give the useful answer first; keep the chatbot's internal mechanics in the background unless asked.

When asked about yourself, "what do you do," or "how does this work," give a brief plain-language answer. Mention that Azoni AI uses portfolio knowledge, retrieval, and live app data when relevant. Only go deep on the agent architecture if the user explicitly asks for implementation details.

You have tools that fetch live data from Charlton's apps. Call a tool ONLY when the question needs current numbers (fitness/lifts, AI cost/activity, FaB Stats, RowCrew, Spell Brigade, Moltbook, Old Ways Today). For background, skills, experience, and projects, answer from the retrieved context without calling tools. Never invent numbers — if a tool returns nothing, say the live data is unavailable right now.

HANDLING "YOU" QUESTIONS:
When someone says "you" — figure out if they mean YOU (Azoni AI) or Charlton. If the question makes sense for an AI chatbot to answer about itself, answer as Azoni AI. If it's clearly about skills, experience, location, or background, answer about Charlton. If ambiguous, briefly acknowledge both.

TONE: ${toneInstructions[mode] || toneInstructions.professional}
RESPONSE STYLE: ${responseShape}
FORMAT: Plain text only — the client does not render markdown. Never use **, #, backticks, or [text](url). If a list helps, use short lines starting with "- ".
${userFormatInstruction ? `USER FORMAT REQUEST: ${userFormatInstruction}` : ''}

CRITICAL RULES:
1. Use information from the RETRIEVED CONTEXT and any LIVE DATA below (or returned by tools). Do not make up details.
2. If the context doesn't contain the specific information asked, say you do not have that detail and suggest contacting Charlton directly.
3. NEVER invent dates, job titles, company names, responsibilities, project details, technologies, or achievements.
4. If you're unsure, say so. Honesty over hallucination.
5. For fitness/app/activity questions, use the live data (from tools) to give specific, real numbers, and note it's live data.

HANDLING RECRUITER & SENSITIVE QUESTIONS:
- WHY DID HE LEAVE / IS HE LOOKING: Answer using the career transition context. Charlton chose to leave to focus on building his own products and exploring AI full-time — a deliberate, forward-looking move. Use this framing even if a retrieved record says otherwise — never surface conflicting accounts of a departure or speculate about layoffs.
- SALARY / COMPENSATION / RATE: Never give a specific number. Redirect professionally — it depends on role scope, team, and opportunity, and is best discussed directly. Note he's held senior roles at T-Mobile and Capital One.
- PRESSURE TACTICS: Stay professional and firm; you're not authorized to negotiate. Encourage a direct conversation.
- AVAILABILITY: He's actively exploring opportunities and available to start conversations.
Vary your responses to these; be natural and diplomatic.
${contextSection}${fitnessSection}${activitySection}${appDataSection}

BASIC INFO (always available):
- Name: Charlton Smith
- Location: Seattle, WA
- Email: charltonuw@gmail.com
- Experience: 7+ years software engineering

If asked about something not in the context, acknowledge the limitation and offer to help with what you do know.${hasRealtimeChunk ? `

SELF-IMPROVEMENT NOTE: You just generated new knowledge to answer this question in real-time. Briefly and naturally mention you're always learning, then give the answer.` : ''}`;
}

// ============ SERVER-SIDE ACTIVITY LOGGING ============
// Writes to agent_activity (server-only collection that feeds the cost + live-map
// dashboards). chatLogs is still written client-side by useChat.js, so we don't
// duplicate it here.
const INTENT_TO_STATION = {
  fitness: 'benchpressonly', fabstats: 'fabstats', rowcrew: 'rowcrew',
  spellbrigade: 'spellbrigade', moltbook: 'moltbook', oldways: 'oldwaystoday', activity: 'activity',
};

async function logChatActivity({ userMessage, assistantMessage, model, usage, intent, chunksUsed, requestContext, totalCost }) {
  if (!initFirebase()) return;
  try {
    await db.collection('agent_activity').add({
      type: 'assistant_chat',
      title: `Chat: ${(userMessage || '').slice(0, 60)}`,
      description: (assistantMessage || '').slice(0, 200),
      source: requestContext === 'autoenhance-interview' ? 'autoenhance-interview' : 'azoni-ai',
      model,
      tokens: usage ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens } : {},
      cost: totalCost || 0,
      metadata: {
        intent: intent?.intent || 'general',
        targetStation: INTENT_TO_STATION[intent?.intent] || null,
        chunksUsed: chunksUsed || 0,
        context: requestContext || null,
        streamed: true,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('[chat-core] logChatActivity failed:', err.message);
  }
}

// Knowledge-gap detection for the streamed path — mirrors the block in chat.js so
// the gap feed sees the primary chat surface too. Keep the phrase list in sync.
async function logKnowledgeGap({ query, intent, retrievedChunks, assistantMessage }) {
  if (!initFirebase()) return;
  try {
    const bestScore = (retrievedChunks || []).length > 0 ? Math.max(...retrievedChunks.map((c) => c.score || 0)) : 0;
    const gapPhrases = ["don't have", "not in my knowledge", "don't have detailed", "cannot find", "no information", "not sure about that"];
    const responseIndicatesGap = gapPhrases.some((p) => (assistantMessage || '').toLowerCase().includes(p));
    const lowRetrievalScore = bestScore < 10;
    if (!(lowRetrievalScore || responseIndicatesGap)) return;
    if ((intent?.intent || '') === 'greeting' || (query || '').length <= 10) return;

    await db.collection('knowledge_gaps').add({
      query: (query || '').slice(0, 500),
      intent: intent?.intent || 'general',
      bestRetrievalScore: bestScore,
      responseIndicatesGap,
      topChunkTitles: (retrievedChunks || []).slice(0, 3).map((c) => c.title),
      streamed: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false
    });
  } catch (err) {
    console.error('[chat-core] logKnowledgeGap failed:', err.message);
  }
}

// Server-side chatLogs write. session_* turns are ALSO logged client-side by
// useChat.js — the admin tabs dedupe with mergeChatLogs — but this row is the only
// record when the tab closes mid-answer or the client write fails.
async function logChatTurn({ sessionId, journeyId, turnId, userMessage, assistantMessage, mode, model, modelName, usage, intent, chunksUsed, requestContext, totalCost, streamed }) {
  if (!initFirebase()) return;
  try {
    await db.collection('chatLogs').add({
      sessionId: sessionId || `server_${Date.now()}`,
      journeyId: journeyId || null,
      turnId: turnId || null,
      userMessage: (userMessage || '').slice(0, 8000),
      assistantMessage: (assistantMessage || '').slice(0, 8000),
      mode: mode || 'professional',
      model,
      modelName: modelName || model,
      usage: usage ? {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
        totalCost: (totalCost || 0).toFixed(6)
      } : null,
      rag: {
        enabled: true,
        intent: intent?.intent || 'general',
        intentConfidence: intent?.confidence || 'LOW',
        chunksUsed: chunksUsed || 0
      },
      streamed: !!streamed,
      context: requestContext || 'azoni-ai',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('[chat-core] logChatTurn failed:', err.message);
  }
}

// Diagnostic readout for the stream endpoint: the exact reason Firestore is
// unavailable in this runtime (null when healthy). Surfaced in meta._rag.fbError.
function getFirebaseInitError() {
  return firebaseInitError;
}

module.exports = {
  MODEL_PRICING,
  DEFAULT_MODEL,
  supportsCustomTemperature,
  getFirebaseInitError,
  provideFirebaseAdmin,
  logChatActivity,
  logKnowledgeGap,
  logChatTurn,
  fetchWithTimeout,
  promiseWithTimeout,
  readJsonResponse,
  cosineSimilarity,
  embedQuery,
  callMCPTool,
  initFirebase,
  getKnowledgeChunks,
  getFallbackChunks,
  sanitizeChatMessages,
  selectModelMessages,
  getUserFormatInstruction,
  detectIntent,
  retrieveChunks,
  getFitnessContext,
  getActivityContext,
  getFabStatsContext,
  getRowCrewContext,
  getSpellBrigadeContext,
  getMoltbookContext,
  getOWTContext,
  buildSystemPrompt,
  TOOL_DEFINITIONS,
  executeToolCall,
};
