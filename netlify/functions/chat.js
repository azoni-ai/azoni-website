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

// ============ MCP SERVER CONFIG ============
const MCP_BASE_URL = process.env.MCP_SERVER_URL || 'https://azoni-mcp.onrender.com';

async function callMCPTool(endpoint) {
  try {
    const response = await fetch(`${MCP_BASE_URL}${endpoint}`);
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
const FALLBACK_CHUNK = {
  id: 'fallback-intro',
  category: 'general',
  title: 'About Charlton Smith',
  content: 'Charlton Smith is a software engineer with 7+ years of experience based in Seattle. Contact: charltonuw@gmail.com',
  keywords: ['charlton', 'about', 'contact', 'seattle']
};

// REMOVED: Old hardcoded KNOWLEDGE_CHUNKS array
// Chunks are now fetched from Firestore collection: rag_knowledge_base

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
  
  // PRIORITY 3: Project name triggers → projects
  const projectTriggers = [
    'old ways', 'oldways',
    'dumarket', 'du market',
    'dustbunny', 'dust bunny',
    'row crew', 'rowcrew',
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
  
  // PRIORITY 9: General about/background
  const generalTriggers = ['who is', 'tell me about', 'background', 'about charlton', 'introduce'];
  if (generalTriggers.some(t => q.includes(t))) {
    return { intent: 'general', confidence: 'MEDIUM', reason: 'general_about' };
  }
  
  // Default: general with low confidence
  return { intent: 'general', confidence: 'LOW', reason: 'no_match' };
}

// ============ CHUNK RETRIEVAL ============
async function retrieveChunks(query, intent, maxChunks = 5) {
  const q = query.toLowerCase();
  const results = [];
  
  // Fetch chunks from Firestore
  const chunks = await getKnowledgeChunks();
  
  // If no chunks available, return fallback
  if (!chunks || chunks.length === 0) {
    console.warn('No chunks available, using fallback');
    return [{ ...FALLBACK_CHUNK, score: 1 }];
  }
  
  // Score each chunk
  for (const chunk of chunks) {
    let score = 0;
    
    // Category match bonus
    if (intent.intent === 'experience' && chunk.category === 'experience') score += 30;
    if (intent.intent === 'projects' && chunk.category === 'projects') score += 30;
    if (intent.intent === 'skills' && chunk.category === 'skills') score += 30;
    if (intent.intent === 'education' && chunk.category === 'education') score += 30;
    if (intent.intent === 'contact' && chunk.category === 'personal') score += 30;
    if (intent.intent === 'fitness' && (chunk.id === 'proj-benchpressonly' || chunk.category === 'fitness')) score += 30;
    if (intent.intent === 'moltbook' && (chunk.category === 'moltbook' || chunk.id?.includes('moltbook'))) score += 30;
    if (intent.intent === 'agents' && (chunk.category === 'agents' || chunk.category === 'moltbook')) score += 30;
    if (intent.intent === 'services' && (chunk.category === 'services' || chunk.category === 'personal')) score += 30;
    if (intent.intent === 'general') score += 5; // Small bonus for all in general queries
    
    // Keyword matching (handle both 'keywords' array and 'metadata.keywords')
    const keywords = chunk.keywords || chunk.metadata?.keywords || [];
    for (const keyword of keywords) {
      if (q.includes(keyword.toLowerCase())) {
        score += 15;
        // Extra boost for exact important matches
        if (keyword.length > 5) score += 5;
      }
    }
    
    // Title matching
    if (chunk.title && chunk.title.toLowerCase().split(' ').some(word => q.includes(word) && word.length > 3)) {
      score += 20;
    }
    
    // Content snippet matching (check if query words appear in content)
    const queryWords = q.split(/\s+/).filter(w => w.length > 3);
    const contentLower = (chunk.content || '').toLowerCase();
    for (const word of queryWords) {
      if (contentLower.includes(word)) score += 3;
    }
    
    if (score > 0) {
      results.push({ ...chunk, score });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  // Return top chunks
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
function buildSystemPrompt(mode, retrievedChunks, intent, fitnessData = [], activityData = []) {
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

  return `You are Azoni AI, the portfolio chatbot for Charlton Smith, a software engineer in Seattle. You are part of a multi-agent AI system that Charlton built — you serve as the user-facing interface while a central orchestrator coordinates blog writing, social posting, fitness tracking, and gaming agents behind the scenes.

Your primary job is helping recruiters, hiring managers, and visitors learn about Charlton's background, skills, projects, and experience. Always speak in third person about Charlton.

When asked about yourself or "what do you do" or "how does this work," explain the agent architecture — you're one of 5 AI agents running autonomously across Charlton's portfolio. You can reference the orchestrator, blog agent, social agent, fitness agent, and gaming agent.

TONE: ${toneInstructions[mode] || toneInstructions.professional}

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ONLY use information from the RETRIEVED CONTEXT and LIVE FITNESS DATA and LIVE AI ACTIVITY DATA below. Do not make up details.
2. If the context doesn't contain specific information about what the user is asking, say "I don't have detailed information about that in my knowledge base" and suggest they contact Charlton directly.
3. NEVER invent dates, job titles, company names, or responsibilities that aren't in the context.
4. NEVER fabricate project details, technologies, or achievements.
5. If you're unsure, say so. It's better to be honest than to hallucinate.
6. For fitness questions, use the LIVE FITNESS DATA to give specific, real numbers. This data is pulled in real-time from Charlton's BenchPressOnly app.
7. When discussing fitness data, mention that this is live data from his actual training log.
8. For AI activity questions, use the LIVE AI ACTIVITY DATA to give specific numbers about costs, token usage, and activity across apps. This is real-time data from Charlton's AI systems.
${contextSection}
${fitnessSection}
${activitySection}

BASIC INFO (always available):
- Name: Charlton Smith
- Location: Seattle, WA
- Email: charltonuw@gmail.com
- Experience: 7+ years software engineering

If asked about something not in the context, acknowledge the limitation and offer to help with what you do know.`;
}

// ============ MAIN HANDLER ============
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { messages, mode, model: requestedModel } = JSON.parse(event.body);
    
    const model = MODEL_PRICING[requestedModel] ? requestedModel : DEFAULT_MODEL;
    const pricing = MODEL_PRICING[model];

    // Get the latest user message for intent detection
    const latestUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // Detect intent
    const intent = detectIntent(latestUserMessage);
    
    // Retrieve relevant chunks from Firestore
    const retrievedChunks = await retrieveChunks(latestUserMessage, intent);
    
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
    if (intent.intent === 'activity') {
      const activityResult = await getActivityContext(latestUserMessage);
      activityContext = activityResult.context;
      activityToolsCalled = activityResult.toolsCalled;
    }
    
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(mode, retrievedChunks, intent, fitnessContext, activityContext);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni Portfolio Chat'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 1000,
        temperature: mode === 'funny' ? 0.9 : 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter error:', data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'API error' })
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
      similarity: Math.min(c.score / maxScore, 1.0).toFixed(2)
    }));

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
          intent: intent.intent,
          intentConfidence: intent.confidence,
          reason: intent.reason,
          chunksRetrieved: retrievedChunks.length,
          topChunks: topChunks
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};