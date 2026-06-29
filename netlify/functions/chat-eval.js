// netlify/functions/chat-eval.js
// Eval + scoring API for the portfolio chatbot. Auth: Bearer RAG_ADMIN_KEY.
//
// Routes (POST unless noted):
//   GET  /suite       -> the canonical eval question set
//   POST /run-suite   -> run the suite end-to-end against the live /chat endpoint,
//                        LLM-judge each answer (groundedness / relevance / helpfulness),
//                        check intent accuracy + required facts, store a run in chat_evals.
//   POST /score-log   -> score a single { question, answer, chunkIds? } turn on demand.
//
// "Groundedness" is judged against the ACTUAL retrieved chunk contents, so this is a
// real RAG faithfulness eval, not just a vibe check.

const crypto = require('crypto');
const core = require('./chat-core.js');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const JUDGE_MODEL = 'google/gemini-2.5-flash';
const RAG_COLLECTION = 'rag_knowledge_base';
const EVAL_COLLECTION = 'chat_evals';

const ADMIN_KEY = process.env.RAG_ADMIN_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.REACT_APP_OPENROUTER_API_KEY;

// ---- Auth ----
function checkAdminAuth(event, headers) {
  if (!ADMIN_KEY) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Eval not configured', details: 'Set RAG_ADMIN_KEY in Netlify env vars.' }) };
  }
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_KEY);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  return null;
}

// ---- Firebase ----
let db = null;
let admin = null;
function initFirebase() {
  if (db) return true;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return false;
  try {
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }) });
    }
    db = admin.firestore();
    return true;
  } catch (e) {
    console.error('[chat-eval] Firebase init failed:', e.message);
    return false;
  }
}

// ---- Canonical eval suite ----
// expectIntent: the intent the router should detect.
// mustInclude: substrings that a correct, grounded answer should contain (case-insensitive).
const EVAL_SUITE = [
  { id: 'projects', q: 'What projects has Charlton built?', expectIntent: 'projects', mustInclude: ['EmbedRoute'] },
  { id: 'experience-where', q: 'Where did Charlton work before going independent?', expectIntent: 'experience', mustInclude: ['Capital One', 'T-Mobile'] },
  { id: 'leave', q: 'Why did Charlton leave Capital One?', expectIntent: 'experience', mustInclude: [] },
  { id: 'skills', q: 'What is his tech stack?', expectIntent: 'skills', mustInclude: ['React'] },
  { id: 'fitness', q: 'How much does Charlton bench press?', expectIntent: 'fitness', mustInclude: [] },
  { id: 'education', q: 'What is his educational background?', expectIntent: 'education', mustInclude: ['Washington'] },
  { id: 'contact', q: 'How can I contact Charlton?', expectIntent: 'contact', mustInclude: ['charltonuw@gmail.com'] },
  { id: 'negotiation', q: 'What salary would he accept?', expectIntent: 'negotiation', mustInclude: [] },
  { id: 'agents', q: 'How does this chatbot work?', expectIntent: 'agents', mustInclude: [] },
  { id: 'rolefit', q: 'Where would he fit on a backend engineering team?', expectIntent: 'experience', mustInclude: [] },
  { id: 'devops', q: 'What is his DevOps and infrastructure experience?', expectIntent: 'experience', mustInclude: [] },
  { id: 'fabstats', q: 'Tell me about FaB Stats', expectIntent: 'fabstats', mustInclude: [] },
];

// ---- LLM judge ----
async function judgeAnswer({ question, context, answer }) {
  if (!OPENROUTER_API_KEY) return { error: 'OPENROUTER_API_KEY not configured' };

  const system = `You are a strict evaluator for "Azoni AI", a portfolio chatbot that answers questions about software engineer Charlton Smith. You are given the USER QUESTION, the RETRIEVED CONTEXT the bot was allowed to use, and the BOT ANSWER. Score the answer:

- groundedness (0.0-1.0): Is every factual claim in the answer supported by the RETRIEVED CONTEXT? Basic identity facts are always allowed (name "Charlton Smith", Seattle WA, email charltonuw@gmail.com, "7+ years experience"). Heavily penalize invented specifics — dates, company names, job titles, numbers, project details — that are NOT in the context. A refusal/redirect that invents nothing is fully grounded (1.0).
- relevance (0.0-1.0): Does the answer directly address the question that was asked?
- helpfulness (0.0-1.0): Is the answer useful and reasonably complete for a recruiter or visitor?

Then a verdict: "pass" if groundedness >= 0.7 AND relevance >= 0.7; "warn" if borderline; "fail" if it hallucinates or ignores the question.

Respond ONLY with JSON: {"groundedness":0.0,"relevance":0.0,"helpfulness":0.0,"verdict":"pass|warn|fail","notes":"one short sentence, max 160 chars"}`;

  const user = `USER QUESTION:\n${question}\n\nRETRIEVED CONTEXT:\n${context || '(no context retrieved)'}\n\nBOT ANSWER:\n${answer}`;

  try {
    const res = await core.fetchWithTimeout(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni Chat Eval',
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: 300,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    }, 15000);

    const data = await core.readJsonResponse(res, 'judge');
    if (!res.ok) return { error: data.error?.message || `judge HTTP ${res.status}` };
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const usage = data.usage || {};
    const pricing = core.MODEL_PRICING[JUDGE_MODEL] || { input: 0, output: 0 };
    const cost = ((usage.prompt_tokens || 0) / 1000) * pricing.input + ((usage.completion_tokens || 0) / 1000) * pricing.output;
    return {
      groundedness: clamp01(parsed.groundedness),
      relevance: clamp01(parsed.relevance),
      helpfulness: clamp01(parsed.helpfulness),
      verdict: ['pass', 'warn', 'fail'].includes(parsed.verdict) ? parsed.verdict : 'warn',
      notes: String(parsed.notes || '').slice(0, 200),
      judgeCost: cost,
    };
  } catch (err) {
    return { error: err.message };
  }
}

function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

// Fetch chunk contents by id (skips non-Firestore fallback chunks).
async function fetchContextById(chunkIds = []) {
  if (!initFirebase() || !chunkIds.length) return '';
  const realIds = chunkIds.filter((id) => id && !String(id).startsWith('fallback'));
  const docs = await Promise.all(realIds.map((id) => db.collection(RAG_COLLECTION).doc(id).get().catch(() => null)));
  return docs
    .filter((d) => d && d.exists)
    .map((d) => { const x = d.data(); return `--- ${x.title} ---\n${x.content}`; })
    .join('\n\n');
}

// ---- Run one suite case end-to-end against the live /chat endpoint ----
async function runCase(baseUrl, model, testCase) {
  const started = Date.now();
  let answer = '';
  let rag = null;
  let usage = null;
  let chatError = null;

  try {
    const res = await core.fetchWithTimeout(`${baseUrl}/.netlify/functions/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: testCase.q }], mode: 'professional', model, context: 'eval' }),
    }, 20000);
    const data = await core.readJsonResponse(res, 'chat');
    answer = data.choices?.[0]?.message?.content || '';
    rag = data._rag || null;
    usage = data.usage || null;
  } catch (err) {
    chatError = err.message;
  }

  const latencyMs = Date.now() - started;
  const detectedIntent = rag?.intent || core.detectIntent(testCase.q).intent;
  const intentMatch = detectedIntent === testCase.expectIntent;
  const topChunks = rag?.topChunks || [];
  const bestSimilarity = topChunks.length ? Number(topChunks[0].similarity) : null;
  const retrievalMethod = rag?.retrievalMethod || 'none';

  const lowerAnswer = answer.toLowerCase();
  const factHits = (testCase.mustInclude || []).map((f) => ({ fact: f, present: lowerAnswer.includes(f.toLowerCase()) }));
  const factsPassed = factHits.every((f) => f.present);

  // Judge against the actual retrieved context
  const context = await fetchContextById(topChunks.map((c) => c.id));
  const judged = answer ? await judgeAnswer({ question: testCase.q, context, answer }) : { error: chatError || 'no answer' };

  const pass = !judged.error
    && intentMatch
    && factsPassed
    && judged.verdict === 'pass';

  return {
    id: testCase.id,
    question: testCase.q,
    answer: answer.slice(0, 600),
    expectIntent: testCase.expectIntent,
    detectedIntent,
    intentMatch,
    retrievalMethod,
    bestSimilarity,
    chunkTitles: topChunks.slice(0, 3).map((c) => c.title),
    toolsCalled: rag?.toolsCalled || [],
    factHits,
    factsPassed,
    groundedness: judged.groundedness ?? null,
    relevance: judged.relevance ?? null,
    helpfulness: judged.helpfulness ?? null,
    verdict: judged.verdict || 'fail',
    notes: judged.notes || judged.error || '',
    latencyMs,
    chatCost: usage ? parseFloat(usage.totalCost || 0) : 0,
    judgeCost: judged.judgeCost || 0,
    error: judged.error || chatError || null,
    pass,
  };
}

function aggregate(cases) {
  const n = cases.length || 1;
  const avg = (sel) => cases.reduce((s, c) => s + (Number(sel(c)) || 0), 0) / n;
  const rate = (pred) => cases.filter(pred).length / n;
  return {
    total: cases.length,
    passed: cases.filter((c) => c.pass).length,
    passRate: Number(rate((c) => c.pass).toFixed(3)),
    intentAccuracy: Number(rate((c) => c.intentMatch).toFixed(3)),
    avgGroundedness: Number(avg((c) => c.groundedness).toFixed(3)),
    avgRelevance: Number(avg((c) => c.relevance).toFixed(3)),
    avgHelpfulness: Number(avg((c) => c.helpfulness).toFixed(3)),
    avgLatencyMs: Math.round(avg((c) => c.latencyMs)),
    factFailures: cases.filter((c) => !c.factsPassed).map((c) => c.id),
    intentMisses: cases.filter((c) => !c.intentMatch).map((c) => ({ id: c.id, expected: c.expectIntent, got: c.detectedIntent })),
    totalCost: Number((avg((c) => c.chatCost) * cases.length + avg((c) => c.judgeCost) * cases.length).toFixed(6)),
  };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const path = (event.path || '').replace('/.netlify/functions/chat-eval', '');

  // GET /suite is public-readable (just the question list); everything else needs auth.
  if (!(event.httpMethod === 'GET' && path === '/suite')) {
    const authErr = checkAdminAuth(event, headers);
    if (authErr) return authErr;
  }

  try {
    if (event.httpMethod === 'GET' && path === '/suite') {
      return { statusCode: 200, headers, body: JSON.stringify({ suite: EVAL_SUITE }) };
    }

    if (event.httpMethod === 'POST' && path === '/run-suite') {
      const body = event.body ? JSON.parse(event.body) : {};
      const model = core.MODEL_PRICING[body.model] ? body.model : core.DEFAULT_MODEL;
      const baseUrl = (body.baseUrl || process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://azoni.ai').replace(/\/$/, '');

      // Run all cases concurrently to stay under the function timeout.
      const cases = await Promise.all(EVAL_SUITE.map((tc) => runCase(baseUrl, model, tc)));
      const agg = aggregate(cases);

      let runId = null;
      if (initFirebase()) {
        const ref = await db.collection(EVAL_COLLECTION).add({
          model,
          baseUrl,
          aggregate: agg,
          cases,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        runId = ref.id;
      }

      return { statusCode: 200, headers, body: JSON.stringify({ runId, model, aggregate: agg, cases }) };
    }

    if (event.httpMethod === 'POST' && path === '/score-log') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { question, answer, chunkIds } = body;
      if (!question || !answer) return { statusCode: 400, headers, body: JSON.stringify({ error: 'question and answer required' }) };

      let context = '';
      if (Array.isArray(chunkIds) && chunkIds.length) {
        context = await fetchContextById(chunkIds);
      }
      if (!context) {
        // Re-run retrieval to get fresh context for judging.
        const intent = core.detectIntent(question);
        const chunks = await core.retrieveChunks(question, intent, 5, { useEmbedding: true });
        context = chunks.map((c) => `--- ${c.title} ---\n${c.content}`).join('\n\n');
      }
      const judged = await judgeAnswer({ question, context, answer });
      if (judged.error) return { statusCode: 502, headers, body: JSON.stringify({ error: judged.error }) };
      return { statusCode: 200, headers, body: JSON.stringify(judged) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    console.error('[chat-eval] error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
