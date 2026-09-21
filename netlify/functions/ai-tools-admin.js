// Private data plane for the /admin AI Tools tab.
// Every read and write to the `aiTools` collection goes through this function
// with the Admin SDK. The collection has no allow rule in firestore.rules, so
// browsers never touch it directly. Auth reuses the admin panel bearer token
// (RAG_ADMIN_KEY) with a constant-time hash compare and the same per-IP
// failure throttle billing-admin uses.
//
// Actions (POST JSON { action, ...params }): list, get, create, research,
// update, publish, unpublish, delete, share, refresh-cache, import-seed.
// `research` makes one OpenRouter call with the web plugin (no tool rounds)
// and logs its cost to agent_activity with a top-level `cost`, which is what
// the cost dashboard reads. `import-seed` creates the starter entries from
// src/data/aiToolsSeed.js as drafts and never overwrites an existing doc.
//
// The public list cache (settings/ai_tools_public) is invalidated by deleting
// it; netlify/functions/ai-tools.js rebuilds it on the next public request.

const crypto = require('crypto');
const admin = require('firebase-admin');
// Cross-boundary require of a src module, the same way leaderboard.js pulls in
// src/data/sites.js: esbuild bundles it and interops the ESM named export.
const { AI_TOOLS_SEED } = require('../../src/data/aiToolsSeed');

if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest();

// Hash both sides before timingSafeEqual: constant-time and no length leak.
const tokenOk = (token) => {
  const secret = process.env.RAG_ADMIN_KEY;
  if (!secret || !token) return false;
  return crypto.timingSafeEqual(sha256(token), sha256(secret));
};

// Per-IP failed-auth throttle (per warm lambda instance).
const FAILURES = new Map();
const MAX_FAILURES = 10;
const WINDOW_MS = 10 * 60 * 1000;

const clientIp = (event) =>
  event.headers['x-nf-client-connection-ip'] ||
  (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  'unknown';

const throttled = (ip) => {
  const rec = FAILURES.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    FAILURES.delete(ip);
    return false;
  }
  return rec.count >= MAX_FAILURES;
};

const recordFailure = (ip) => {
  if (FAILURES.size > 500) FAILURES.clear();
  const rec = FAILURES.get(ip);
  if (rec && Date.now() - rec.first <= WINDOW_MS) rec.count += 1;
  else FAILURES.set(ip, { count: 1, first: Date.now() });
};

// ============ CONSTANTS ============

const COLLECTION = 'aiTools';
const CACHE_DOC = { collection: 'settings', id: 'ai_tools_public' };
// Mirrors SHARE_VENUES in src/data/aiToolsMeta.js (functions cannot import src).
const SHARE_VENUES = ['LinkedIn', 'X', 'Other'];
const SLUG_RE = /^[a-z0-9-]{2,60}$/;
const SLUG_MAX = 60;
const HISTORY_CAP = 200;
const SHARED_CAP = 100;
const LIST_LIMIT = 500;
const PUBLIC_LIST_LIMIT = 1000;
const URL_MAX = 300;
const LINK_URL_MAX = 500;
const ASSET_URL_MAX = 300;
const SOURCES_CAP = 20;
const PRODUCTS_CAP = 8;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
// Netlify kills the function at ~26s; leave room for the Firestore writes.
const RESEARCH_TIMEOUT_MS = 22000;
// USD per 1000 tokens. Unknown models cost 0 in the log (the web search fee still applies).
const MODEL_PRICES = {
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'openai/gpt-5-mini': { input: 0.00025, output: 0.002 },
  'openai/gpt-5-nano': { input: 0.00005, output: 0.0004 },
};
// 8 web results at $4 per 1000 results.
// OpenRouter bills the web plugin per result ($4 per 1000 at the time of
// writing; max_results 8 = $0.032). Override if the price changes.
const WEB_SEARCH_COST = Number(process.env.AI_TOOLS_WEB_SEARCH_COST) || 0.032;

const nowIso = () => new Date().toISOString();

// ============ SANITIZERS ============
// Every incoming field (client or model) passes through one of these before
// it reaches Firestore.

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const isHttpUrl = (v, max = LINK_URL_MAX) => {
  if (typeof v !== 'string' || !v || v.length > max) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const urlOrEmpty = (v, max = LINK_URL_MAX) => {
  const s = str(v, max);
  return isHttpUrl(s, max) ? s : '';
};

// A site-relative asset path: exactly one leading slash (a second slash or a
// backslash would make it protocol-relative, so `//evil.test/x` is rejected),
// then path characters only.
const SITE_PATH_RE = /^\/(?![/\\])[\w\-./]{1,280}$/;

// Images may live on this site (/images/tools/x.png) or on the tool's own
// domain (https://...). Anything else becomes ''.
const assetOrEmpty = (v) => {
  const s = str(v, ASSET_URL_MAX);
  if (!s) return '';
  if (s.startsWith('/')) return SITE_PATH_RE.test(s) ? s : '';
  return isHttpUrl(s, ASSET_URL_MAX) ? s : '';
};

const hostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const strList = (v, maxItems, maxLen) =>
  Array.isArray(v)
    ? v
        .filter((s) => typeof s === 'string')
        .map((s) => s.trim().slice(0, maxLen))
        .filter(Boolean)
        .slice(0, maxItems)
    : [];

const sanitizeTags = (v) => {
  const out = [];
  for (const t of strList(v, 100, 30).map((s) => s.toLowerCase())) {
    if (!out.includes(t)) out.push(t);
    if (out.length >= 12) break;
  }
  return out;
};

const sanitizeLinks = (v) => {
  const l = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  return { site: urlOrEmpty(l.site), docs: urlOrEmpty(l.docs), pricing: urlOrEmpty(l.pricing) };
};

const sanitizeVoices = (v) =>
  (Array.isArray(v) ? v : [])
    .filter((x) => x && typeof x === 'object' && !Array.isArray(x))
    .map((x) => ({ summary: str(x.summary, 400), source: str(x.source, 120), url: urlOrEmpty(x.url) }))
    .filter((x) => x.summary)
    .slice(0, 12);

// Owner-curated product tiles. A row without a name has nothing to show, so
// it is dropped rather than saved empty.
const sanitizeProducts = (v) =>
  (Array.isArray(v) ? v : [])
    .filter((x) => x && typeof x === 'object' && !Array.isArray(x))
    .map((x) => ({
      name: str(x.name, 60),
      description: str(x.description, 240),
      image: assetOrEmpty(x.image),
      url: urlOrEmpty(x.url),
    }))
    .filter((x) => x.name)
    .slice(0, PRODUCTS_CAP);

const sanitizeSources = (v) => {
  const out = [];
  const seen = new Set();
  for (const x of Array.isArray(v) ? v : []) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) continue;
    const url = urlOrEmpty(x.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: str(x.title, 200) || hostname(url), url });
    if (out.length >= SOURCES_CAP) break;
  }
  return out;
};

// Allowlist for `update`. Anything not listed here is dropped. logo,
// heroImage and products are owner-curated: the research modes never write
// them (factsPatch and voicesPatch set named keys only).
const FIELD_SANITIZERS = {
  name: (v) => str(v, 80),
  maker: (v) => str(v, 80),
  url: (v) => urlOrEmpty(v, URL_MAX),
  links: sanitizeLinks,
  logo: assetOrEmpty,
  heroImage: assetOrEmpty,
  category: (v) => str(v, 40),
  tags: sanitizeTags,
  tagline: (v) => str(v, 160),
  summary: (v) => str(v, 4000),
  pricing: (v) => str(v, 200),
  products: sanitizeProducts,
  pros: (v) => strList(v, 10, 240),
  cons: (v) => strList(v, 10, 240),
  voices: sanitizeVoices,
  sources: sanitizeSources,
  verdict: (v) => str(v, 200),
  myTake: (v) => str(v, 8000),
};

// Fills defaults so the admin UI always gets the full shape.
const withDefaults = (d) => {
  const links = d.links && typeof d.links === 'object' && !Array.isArray(d.links) ? d.links : {};
  return {
    slug: d.slug || '',
    name: d.name || '',
    maker: d.maker || '',
    url: d.url || '',
    links: { site: links.site || '', docs: links.docs || '', pricing: links.pricing || '' },
    logo: d.logo || '',
    heroImage: d.heroImage || '',
    category: d.category || '',
    tags: Array.isArray(d.tags) ? d.tags : [],
    tagline: d.tagline || '',
    summary: d.summary || '',
    pricing: d.pricing || '',
    products: Array.isArray(d.products) ? d.products : [],
    pros: Array.isArray(d.pros) ? d.pros : [],
    cons: Array.isArray(d.cons) ? d.cons : [],
    voices: Array.isArray(d.voices) ? d.voices : [],
    sources: Array.isArray(d.sources) ? d.sources : [],
    verdict: d.verdict || '',
    myTake: d.myTake || '',
    status: d.status === 'published' ? 'published' : 'draft',
    createdAt: d.createdAt || null,
    updatedAt: d.updatedAt || null,
    publishedAt: d.publishedAt || null,
    research: d.research || null,
    history: Array.isArray(d.history) ? d.history : [],
    sharedOn: Array.isArray(d.sharedOn) ? d.sharedOn : [],
  };
};

// The admin list row carries `logo` (the table shows it) but not heroImage or
// products, which are only needed once a tool is open in the editor.
const listItem = (d) => ({
  slug: d.slug,
  name: d.name,
  maker: d.maker,
  logo: d.logo,
  category: d.category,
  tags: d.tags,
  tagline: d.tagline,
  verdict: d.verdict,
  status: d.status,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
  publishedAt: d.publishedAt,
  sharedOn: d.sharedOn,
  research: d.research ? { at: d.research.at || null, mode: d.research.mode || null } : null,
  hasTake: d.myTake.trim().length > 0,
});

// Must stay in step with publicListItem in netlify/functions/ai-tools.js:
// whichever function rebuilds the cache first writes the rows the public list
// page renders.
const publicListItem = (d) => ({
  slug: d.slug,
  name: d.name,
  maker: d.maker,
  logo: d.logo,
  category: d.category,
  tags: d.tags,
  tagline: d.tagline,
  verdict: d.verdict,
  pricing: d.pricing,
  publishedAt: d.publishedAt,
  updatedAt: d.updatedAt,
});

// ============ DOC HELPERS ============

const slugify = (name) => {
  let s = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '');
  if (s.length < 2) s = s ? `tool-${s}` : 'tool';
  return s;
};

// First free slug: base, base-2, base-3 ... (suffix always fits in 60 chars).
async function uniqueSlug(col, base) {
  for (let n = 1; n <= 50; n += 1) {
    const suffix = n === 1 ? '' : `-${n}`;
    const slug = `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, '')}${suffix}`;
    const snap = await col.doc(slug).get();
    if (!snap.exists) return slug;
  }
  return null;
}

// Append-only history, capped by dropping the oldest entries.
const appendHistory = (history, event, note = '') => {
  const next = [
    ...(Array.isArray(history) ? history : []),
    { at: nowIso(), event, note: String(note || '').slice(0, 200) },
  ];
  return next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next;
};

// Union by url, existing first, capped.
const mergeSources = (existing, incoming) => sanitizeSources([...(existing || []), ...(incoming || [])]);

// A seed entry becomes a draft doc. Every content field goes through the same
// sanitizer `update` uses, and status, timestamps, research, history and
// sharedOn are set here, so a seed file cannot publish anything by itself.
function seedDoc(entry, slug) {
  const now = nowIso();
  const doc = { slug };
  for (const key of Object.keys(FIELD_SANITIZERS)) doc[key] = FIELD_SANITIZERS[key](entry[key]);
  return {
    ...doc,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    research: null,
    history: [{ at: now, event: 'created', note: 'seed' }],
    sharedOn: [],
  };
}

async function invalidateCache(db) {
  try {
    await db.collection(CACHE_DOC.collection).doc(CACHE_DOC.id).delete();
  } catch (err) {
    console.error('[ai-tools-admin] cache invalidate failed:', err.message);
  }
}

// Published tools, newest publish first, then name. No orderBy in the query
// so it needs no composite index.
async function buildPublicList(db) {
  const snap = await db
    .collection(COLLECTION)
    .where('status', '==', 'published')
    .limit(PUBLIC_LIST_LIMIT)
    .get();
  const tools = snap.docs
    .map((doc) => publicListItem(withDefaults(doc.data() || {})))
    .sort(
      (a, b) =>
        (b.publishedAt || '').localeCompare(a.publishedAt || '') ||
        (a.name || '').localeCompare(b.name || '')
    );
  return { tools, count: tools.length, updatedAt: nowIso() };
}

// ============ FETCH HELPERS ============
// Copied from chat-core.js (not required, so this function stays standalone).

async function readJsonResponse(response, label) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error(`[ai-tools-admin] ${label} returned non-JSON response`, {
      status: response.status,
      preview: text.slice(0, 300),
    });
    throw new Error(`${label} returned non-JSON response (${response.status})`);
  }
}

// ============ RESEARCH ============

const RESEARCH_SYSTEM =
  'You research software products for a personal review site written in a plain, factual voice. Use the web results. Return JSON only.';

const HONESTY =
  'Do not invent facts, prices, or quotes. If something is unknown, say so. Avoid em-dashes and marketing adjectives.';

const FACTS_SHAPE = `{ "maker": "", "tagline": "one plain sentence, max 120 characters, no hype",
  "summary": "two or three short paragraphs: what it is, who it is for, how it is used. Plain sentences. No marketing language. No em-dashes.",
  "pricing": "one line, only what is published; otherwise 'Not published'",
  "links": { "site": "", "docs": "", "pricing": "" },
  "tags": ["3 to 8 lowercase tags"],
  "pros": ["3 to 6 specific points, one sentence each"],
  "cons": ["3 to 6 specific points, one sentence each"],
  "verdict": "one factual sentence on who should consider it" }`;

const VOICES_SHAPE = `{ "voices": [ { "summary": "one sentence paraphrasing one specific point", "source": "site or author", "url": "" } ],
  "themes": ["2 to 4 short phrases"] }`;

function factsPrompt(tool) {
  const lines = [
    'Research this software product and fill in every field of the JSON shape below.',
    '',
    `Name: ${tool.name}`,
    `URL: ${tool.url}`,
  ];
  if (tool.myTake) {
    lines.push('', 'My existing notes (context only, do not copy them into the fields):', tool.myTake.slice(0, 2000));
  }
  lines.push(
    '',
    'JSON shape (replace each placeholder with the value; separate summary paragraphs with a blank line):',
    FACTS_SHAPE,
    '',
    HONESTY
  );
  return { system: RESEARCH_SYSTEM, user: lines.join('\n') };
}

function voicesPrompt(tool) {
  const lines = [
    'Find what users and reviewers have said about this software product in the last 12 months across Reddit, Hacker News, X, YouTube reviews, blogs, and app store reviews.',
    '',
    `Name: ${tool.name}`,
    `URL: ${tool.url}`,
    '',
    'JSON shape (5 to 8 voices, a mix of positive and negative; url is the exact page the point came from, or empty if you are not sure):',
    VOICES_SHAPE,
    '',
    HONESTY,
  ];
  return { system: RESEARCH_SYSTEM, user: lines.join('\n') };
}

// Strip ``` fences, take the outermost {...}, parse.
function parseJsonObject(text) {
  const stripped = String(text).replace(/```(?:json)?/gi, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Model returned no JSON object');
  return JSON.parse(stripped.slice(start, end + 1));
}

// URL citations from the web plugin: message annotations plus the top-level
// citations array some providers return. Deduped by url, https? only.
function collectCitations(data) {
  const out = [];
  const seen = new Set();
  const push = (url, title) => {
    if (!isHttpUrl(url) || seen.has(url)) return;
    seen.add(url);
    out.push({ title: str(title, 200) || hostname(url), url });
  };
  const annotations = data.choices?.[0]?.message?.annotations;
  if (Array.isArray(annotations)) {
    for (const a of annotations) {
      if (a && a.type === 'url_citation' && a.url_citation) push(a.url_citation.url, a.url_citation.title);
    }
  }
  if (Array.isArray(data.citations)) {
    for (const c of data.citations) if (typeof c === 'string') push(c, '');
  }
  return out;
}

// The prompts ask for no em-dashes; this catches the ones that slip through.
const plainDash = (s) => s.replace(/\s*—\s*/g, ', ').replace(/,\s*$/, '');
const cleanModelOutput = (v) => {
  if (typeof v === 'string') return plainDash(v);
  if (Array.isArray(v)) return v.map(cleanModelOutput);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cleanModelOutput(x)]));
  }
  return v;
};

const asNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// One OpenRouter call with the web plugin. Throws on any failure; the caller
// turns that into a 502 and leaves the doc untouched.
async function callResearchModel({ system, user }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');
  const model = process.env.AI_TOOLS_RESEARCH_MODEL || DEFAULT_MODEL;
  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    plugins: [{ id: 'web', max_results: 8 }],
    response_format: { type: 'json_object' },
    max_tokens: 1800,
    ...(/^openai\/gpt-5/.test(model) ? { reasoning: { effort: 'low' } } : { temperature: 0.2 }),
  };

  // One abort signal covers both the headers and the body read, so a stalled
  // stream cannot outlive the function's time budget.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESEARCH_TIMEOUT_MS);
  let response;
  let data;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni AI Tools',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    data = await readJsonResponse(response, 'OpenRouter');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenRouter returned ${response.status}`);
  }

  const message = data.choices?.[0]?.message;
  const content = typeof message?.content === 'string' ? message.content : '';
  if (!content) {
    console.error('[ai-tools-admin] empty model response:', JSON.stringify(data).slice(0, 500));
    throw new Error('No content from model');
  }
  const parsed = cleanModelOutput(parseJsonObject(content));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Model returned no JSON object');
  }

  const usage = data.usage || {};
  const prompt = asNumber(usage.prompt_tokens);
  const completion = asNumber(usage.completion_tokens);
  const total = asNumber(usage.total_tokens) || prompt + completion;
  const price = MODEL_PRICES[model] || { input: 0, output: 0 };
  const cost = (prompt / 1000) * price.input + (completion / 1000) * price.output + WEB_SEARCH_COST;

  return {
    model,
    parsed,
    citations: collectCitations(data),
    usage: { prompt, completion, total },
    cost: Math.round(cost * 1e6) / 1e6,
  };
}

// Facts mode writes maker, tagline, summary, pricing, links, tags, pros, cons,
// verdict. A field the model left empty keeps its current value.
function factsPatch(tool, parsed) {
  const patch = {};
  const put = (key, value) => {
    if (typeof value === 'string' ? value : value.length) patch[key] = value;
  };
  put('maker', str(parsed.maker, 80));
  put('tagline', str(parsed.tagline, 160));
  put('summary', str(parsed.summary, 4000));
  put('pricing', str(parsed.pricing, 200));
  put('tags', sanitizeTags(parsed.tags));
  put('pros', strList(parsed.pros, 10, 240));
  put('cons', strList(parsed.cons, 10, 240));
  put('verdict', str(parsed.verdict, 200));
  const links = sanitizeLinks(parsed.links);
  if (links.site || links.docs || links.pricing) {
    patch.links = {
      site: links.site || tool.links.site,
      docs: links.docs || tool.links.docs,
      pricing: links.pricing || tool.links.pricing,
    };
  }
  return patch;
}

// Voices mode writes voices (and tags from themes when tags were empty). A
// voice keeps its url only when it exactly matches a citation the model was
// given, so an unsourced quote is visible as such in the editor.
function voicesPatch(tool, parsed, citations) {
  const patch = {};
  const cited = new Set(citations.map((c) => c.url));
  const voices = sanitizeVoices(parsed.voices).map((v) => ({
    ...v,
    url: cited.has(v.url) ? v.url : '',
  }));
  if (voices.length) patch.voices = voices;
  if (!tool.tags.length) {
    const themes = sanitizeTags(parsed.themes);
    if (themes.length) patch.tags = themes;
  }
  return patch;
}

// One agent_activity doc per model call. Top-level `cost` and `tokens` are
// what the cost dashboard and home summary read.
async function logResearch(db, tool, mode, result, description) {
  // agent_activity feeds the public /live page, so a tool that is still a
  // draft is logged without its name or slug.
  const isPublic = tool.status === 'published';
  try {
    await db.collection('agent_activity').add({
      type: 'ai_tool_researched',
      title: (isPublic ? `Researched ${tool.name} (${mode})` : `Researched a draft tool (${mode})`).slice(0, 200),
      description: (isPublic
        ? description
        : `${mode === 'facts' ? 'Web' : 'Reception'} research on a draft: ${result.citations.length} sources, ${result.usage.total} tokens.`
      ).slice(0, 200),
      source: 'ai-tools',
      model: result.model,
      tokens: result.usage,
      cost: result.cost,
      metadata: { slug: isPublic ? tool.slug : null, mode, sources: result.citations.length },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[ai-tools-admin] activity log failed:', err.message);
  }
}

// ============ HANDLER ============

const SLUG_ACTIONS = new Set(['get', 'research', 'update', 'publish', 'unpublish', 'delete', 'share']);
const OTHER_ACTIONS = new Set(['list', 'create', 'refresh-cache', 'import-seed']);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };
  }
  if (!process.env.RAG_ADMIN_KEY) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Admin key not configured' }) };
  }
  if (!admin.apps.length) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Firebase not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // The throttle only ever blocks FAILED auth attempts. A valid token is
  // always let through, so bad-token floods from a shared IP (CGNAT, office
  // NAT) can't lock the owner out.
  const ip = clientIp(event);
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!tokenOk(token)) {
    if (throttled(ip)) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many attempts. Try again later.' }) };
    }
    recordFailure(ip);
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const db = admin.firestore();
  const col = db.collection(COLLECTION);
  const json = (statusCode, payload) => ({ statusCode, headers, body: JSON.stringify(payload) });
  const bad = (message) => json(400, { error: message });

  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Invalid JSON');
  const action = typeof body.action === 'string' ? body.action : '';
  if (!SLUG_ACTIONS.has(action) && !OTHER_ACTIONS.has(action)) return bad('Unknown action');

  try {
    if (action === 'list') {
      const snap = await col.limit(LIST_LIMIT).get();
      const tools = snap.docs
        .map((doc) => listItem(withDefaults(doc.data() || {})))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      return json(200, { tools });
    }

    if (action === 'refresh-cache') {
      const list = await buildPublicList(db);
      await db.collection(CACHE_DOC.collection).doc(CACHE_DOC.id).set(list);
      return json(200, { count: list.count });
    }

    if (action === 'create') {
      const name = str(body.name, 80);
      if (!name) return bad('Name is required.');
      const url = str(body.url, URL_MAX);
      if (!isHttpUrl(url, URL_MAX)) return bad('URL must start with http:// or https://.');
      const category = str(body.category, 40);
      const notes = str(body.notes, 8000);

      const slug = await uniqueSlug(col, slugify(name));
      if (!slug) return json(409, { error: 'No free slug for that name. Try a different name.' });

      const now = nowIso();
      const doc = {
        slug,
        name,
        maker: '',
        url,
        links: { site: '', docs: '', pricing: '' },
        logo: '',
        heroImage: '',
        category,
        tags: [],
        tagline: '',
        summary: '',
        pricing: '',
        products: [],
        pros: [],
        cons: [],
        voices: [],
        sources: [],
        verdict: '',
        myTake: notes,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        research: null,
        history: [{ at: now, event: 'created', note: '' }],
        sharedOn: [],
      };
      // create() refuses to overwrite, so two parallel creates cannot collide.
      await col.doc(slug).create(doc);
      return json(200, { tool: withDefaults(doc) });
    }

    if (action === 'import-seed') {
      const created = [];
      const skipped = [];
      for (const entry of Array.isArray(AI_TOOLS_SEED) ? AI_TOOLS_SEED : []) {
        const seedSlug = str(entry && entry.slug, SLUG_MAX);
        if (!SLUG_RE.test(seedSlug)) {
          console.error('[ai-tools-admin] seed entry has an invalid slug:', seedSlug);
          skipped.push(seedSlug || '(no slug)');
          continue;
        }
        const seedRef = col.doc(seedSlug);
        // An existing tool is left exactly as it is: the import never
        // overwrites edits made in the admin editor.
        const existing = await seedRef.get();
        if (existing.exists) {
          skipped.push(seedSlug);
          continue;
        }
        try {
          // create() refuses to overwrite, so a doc written between the read
          // above and this write survives.
          await seedRef.create(seedDoc(entry, seedSlug));
          created.push(seedSlug);
        } catch (err) {
          console.error(`[ai-tools-admin] seed import failed for ${seedSlug}:`, err.message);
          skipped.push(seedSlug);
        }
      }
      return json(200, { created, skipped });
    }

    // Everything below works on one existing doc.
    const slug = str(body.slug, SLUG_MAX);
    if (!SLUG_RE.test(slug)) return bad('Invalid slug.');
    const ref = col.doc(slug);
    const snap = await ref.get();
    if (!snap.exists) return json(404, { error: 'Tool not found.' });
    const tool = withDefaults(snap.data() || {});
    const reload = async () => withDefaults((await ref.get()).data() || {});

    if (action === 'get') {
      return json(200, { tool });
    }

    if (action === 'research') {
      const mode = body.mode === 'facts' || body.mode === 'voices' ? body.mode : '';
      if (!mode) return bad('Mode must be facts or voices.');
      if (!process.env.OPENROUTER_API_KEY) return json(503, { error: 'Research key not configured' });

      let result;
      try {
        result = await callResearchModel(mode === 'facts' ? factsPrompt(tool) : voicesPrompt(tool));
      } catch (err) {
        console.error('[ai-tools-admin] research failed:', err);
        const reason = err.name === 'AbortError' ? 'the model did not answer in time' : err.message;
        return json(502, { error: `Research failed: ${reason}.` });
      }

      const now = nowIso();
      const patch =
        mode === 'facts' ? factsPatch(tool, result.parsed) : voicesPatch(tool, result.parsed, result.citations);
      patch.sources = mergeSources(tool.sources, result.citations);
      patch.research = { at: now, model: result.model, cost: result.cost, tokens: result.usage.total, mode };
      patch.history = appendHistory(tool.history, 'researched', mode);
      patch.updatedAt = now;
      await ref.update(patch);
      if (tool.status === 'published') await invalidateCache(db);

      const description =
        mode === 'facts'
          ? `Web research for ${tool.name}: ${result.citations.length} sources, ${result.usage.total} tokens.`
          : `Reception research for ${tool.name}: ${(patch.voices || []).length} voices, ${result.citations.length} sources.`;
      await logResearch(db, tool, mode, result, description);

      return json(200, { tool: await reload(), cost: result.cost });
    }

    if (action === 'update') {
      const fields =
        body.fields && typeof body.fields === 'object' && !Array.isArray(body.fields) ? body.fields : null;
      if (!fields) return bad('Missing fields.');

      const patch = {};
      for (const key of Object.keys(FIELD_SANITIZERS)) {
        if (!Object.prototype.hasOwnProperty.call(fields, key)) continue;
        patch[key] = FIELD_SANITIZERS[key](fields[key]);
      }
      const changed = Object.keys(patch);
      if (!changed.length) return bad('Nothing to update.');
      if ('name' in patch && !patch.name) return bad('Name is required.');
      if ('url' in patch && !patch.url) return bad('URL must start with http:// or https://.');

      const now = nowIso();
      patch.updatedAt = now;
      patch.history = appendHistory(tool.history, 'edited', changed.join(', '));
      await ref.update(patch);
      if (tool.status === 'published') await invalidateCache(db);
      return json(200, { tool: await reload() });
    }

    if (action === 'publish') {
      const missing = [];
      if (!tool.name) missing.push('name');
      if (!tool.url) missing.push('URL');
      if (!tool.tagline) missing.push('tagline');
      if (!tool.summary) missing.push('summary');
      if (!tool.verdict) missing.push('verdict');
      if (!tool.pros.length && !tool.cons.length) missing.push('at least one pro or con');
      if (missing.length) return bad(`Cannot publish yet. Missing: ${missing.join(', ')}.`);

      const now = nowIso();
      await ref.update({
        status: 'published',
        publishedAt: tool.publishedAt || now,
        updatedAt: now,
        history: appendHistory(tool.history, 'published', ''),
      });
      await invalidateCache(db);
      return json(200, { tool: await reload() });
    }

    if (action === 'unpublish') {
      const now = nowIso();
      await ref.update({
        status: 'draft',
        updatedAt: now,
        history: appendHistory(tool.history, 'unpublished', ''),
      });
      await invalidateCache(db);
      return json(200, { tool: await reload() });
    }

    if (action === 'delete') {
      await ref.delete();
      await invalidateCache(db);
      return json(200, { ok: true });
    }

    if (action === 'share') {
      const venue = typeof body.venue === 'string' && SHARE_VENUES.includes(body.venue) ? body.venue : '';
      if (!venue) return bad(`Venue must be one of: ${SHARE_VENUES.join(', ')}.`);
      const url = urlOrEmpty(body.url);
      const now = nowIso();
      const sharedOn = [...tool.sharedOn, { venue, at: now, url }];
      await ref.update({
        // No updatedAt bump: sharing changes no content, and the public page
        // shows "Updated" whenever updatedAt moves.
        sharedOn: sharedOn.length > SHARED_CAP ? sharedOn.slice(sharedOn.length - SHARED_CAP) : sharedOn,
        history: appendHistory(tool.history, 'shared', venue),
      });
      return json(200, { tool: await reload() });
    }

    return bad('Unknown action');
  } catch (err) {
    console.error('[ai-tools-admin]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
