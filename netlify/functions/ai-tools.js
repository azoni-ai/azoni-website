// netlify/functions/ai-tools.js
// Public read endpoint for the AI Tools series. No params serves the
// published list from the `settings/ai_tools_public` cache (rebuilt when it
// is older than 10 minutes or after the admin function deletes it), `?slug=`
// serves one published tool, and `?format=rss` serves the list as RSS 2.0.
//
// Every Firestore read is bounded and time-capped (no listeners), and the
// response is CDN-cached, so most visitors never touch Firestore at all.

let admin = null;
let db = null;

const COLLECTION = 'aiTools';
const CACHE_DOC = { collection: 'settings', id: 'ai_tools_public' };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PUBLIC_LIST_LIMIT = 1000;
const SLUG_RE = /^[a-z0-9-]{2,60}$/;

const SITE = 'https://azoni.ai';
// Mirrors AI_TOOLS in src/data/aiToolsMeta.js (functions cannot import src).
const SERIES = {
  title: 'AI Tools · Azoni',
  link: `${SITE}/ai-tools`,
  feed: `${SITE}/ai-tools/feed.xml`,
  description: 'Notes on AI tools: what each one does, pros, cons, what people are saying, and my take.',
};

function initFirebase() {
  if (db) return true;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return false;
  try {
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
    db = admin.firestore();
    return true;
  } catch {
    return false;
  }
}

// Cap a promise so a quota-stalled Firestore op (SDK retries ~20s) can't hang
// the request. Resolves to `fallback` on timeout or error.
function fast(promise, ms = 5000, fallback = null) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const list = (v) => (Array.isArray(v) ? v : []);
const text = (v) => (typeof v === 'string' ? v : '');

// Must stay in step with publicListItem in ai-tools-admin.js, which writes the
// same cache doc. `logo` is the only asset the list page needs.
const publicListItem = (d) => ({
  slug: text(d.slug),
  name: text(d.name),
  maker: text(d.maker),
  logo: text(d.logo),
  category: text(d.category),
  tags: list(d.tags),
  tagline: text(d.tagline),
  verdict: text(d.verdict),
  pricing: text(d.pricing),
  publishedAt: d.publishedAt || null,
  updatedAt: d.updatedAt || null,
});

// Full doc minus history, sharedOn and research. An explicit pick list so a
// field added later never leaks by accident.
const publicDetail = (d) => {
  const links = d.links && typeof d.links === 'object' && !Array.isArray(d.links) ? d.links : {};
  return {
    slug: text(d.slug),
    name: text(d.name),
    maker: text(d.maker),
    url: text(d.url),
    links: { site: text(links.site), docs: text(links.docs), pricing: text(links.pricing) },
    logo: text(d.logo),
    heroImage: text(d.heroImage),
    category: text(d.category),
    tags: list(d.tags),
    tagline: text(d.tagline),
    summary: text(d.summary),
    pricing: text(d.pricing),
    products: list(d.products),
    pros: list(d.pros),
    cons: list(d.cons),
    voices: list(d.voices),
    sources: list(d.sources),
    verdict: text(d.verdict),
    myTake: text(d.myTake),
    status: 'published',
    createdAt: d.createdAt || null,
    updatedAt: d.updatedAt || null,
    publishedAt: d.publishedAt || null,
  };
};

// Published tools, newest publish first, then name. No orderBy in the query
// so it needs no composite index.
async function buildPublicList() {
  const snap = await db
    .collection(COLLECTION)
    .where('status', '==', 'published')
    .limit(PUBLIC_LIST_LIMIT)
    .get();
  const tools = snap.docs
    .map((doc) => publicListItem(doc.data() || {}))
    .sort(
      (a, b) =>
        (b.publishedAt || '').localeCompare(a.publishedAt || '') ||
        a.name.localeCompare(b.name)
    );
  return { tools, count: tools.length, updatedAt: new Date().toISOString() };
}

const normalizeList = (data) => ({
  tools: list(data.tools),
  count: list(data.tools).length,
  updatedAt: data.updatedAt || null,
});

// Serve the cache if fresh, else rebuild and write it. Falls back to a stale
// cache when the rebuild does not finish in time.
async function getList() {
  const ref = db.collection(CACHE_DOC.collection).doc(CACHE_DOC.id);
  const cached = await fast(ref.get());
  const cachedData = cached && cached.exists ? normalizeList(cached.data() || {}) : null;
  if (cachedData) {
    const age = Date.now() - new Date(cachedData.updatedAt || 0).getTime();
    if (age >= 0 && age < CACHE_TTL_MS) return { status: 200, payload: { ...cachedData, cached: true } };
  }

  const built = await fast(buildPublicList(), 9000, null);
  if (!built) {
    if (cachedData) return { status: 200, payload: { ...cachedData, cached: true, stale: true } };
    return { status: 503, payload: { error: 'timeout' } };
  }
  await fast(ref.set(built)); // time-capped write
  return { status: 200, payload: { ...built, cached: false } };
}

// ============ RSS ============

// Drops characters XML 1.0 forbids, then escapes the five reserved ones.
const escapeXml = (v) => {
  let out = '';
  for (const ch of String(v ?? '')) {
    const code = ch.charCodeAt(0);
    if (code >= 32 || code === 9 || code === 10 || code === 13) out += ch;
  }
  return out.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
};

const rfc822 = (iso) => {
  const d = new Date(iso || 0);
  return (Number.isNaN(d.getTime()) ? new Date(0) : d).toUTCString();
};

function rssXml(data) {
  const items = data.tools.map((t) => {
    const link = `${SITE}/ai-tools/${encodeURIComponent(t.slug)}`;
    const description = [t.tagline, t.verdict].filter(Boolean).join(' ');
    return [
      '    <item>',
      `      <title>${escapeXml(t.name)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid>${escapeXml(link)}</guid>`,
      `      <pubDate>${rfc822(t.publishedAt)}</pubDate>`,
      `      <description>${escapeXml(description)}</description>`,
      '    </item>',
    ].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(SERIES.title)}</title>`,
    `    <link>${escapeXml(SERIES.link)}</link>`,
    `    <description>${escapeXml(SERIES.description)}</description>`,
    '    <language>en-us</language>',
    `    <lastBuildDate>${rfc822(data.updatedAt)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(SERIES.feed)}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

// ============ HANDLER ============

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    // Serve instantly from CDN and refresh in the background.
    'Cache-Control': 'public, max-age=120, stale-while-revalidate=600',
  };
  // Errors must not sit in the CDN for two minutes.
  const noStore = { ...headers, 'Cache-Control': 'no-store' };
  const json = (statusCode, payload) => ({
    statusCode,
    headers: statusCode < 500 ? headers : noStore,
    body: JSON.stringify(payload),
  });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return { statusCode: 405, headers: noStore, body: JSON.stringify({ error: 'GET only' }) };
  }
  if (!initFirebase()) return json(503, { error: 'no-db' });

  const params = event.queryStringParameters || {};
  const slug = typeof params.slug === 'string' ? params.slug.trim().toLowerCase() : '';

  if (slug) {
    if (!SLUG_RE.test(slug)) return json(404, { error: 'not found' });
    const snap = await fast(db.collection(COLLECTION).doc(slug).get());
    if (!snap) return json(503, { error: 'timeout' });
    const d = snap.exists ? snap.data() : null;
    if (!d || d.status !== 'published') return json(404, { error: 'not found' });
    return json(200, { tool: publicDetail(d) });
  }

  const result = await getList();
  if (params.format === 'rss') {
    if (result.status !== 200) return json(result.status, result.payload);
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/rss+xml; charset=utf-8' },
      body: rssXml(result.payload),
    };
  }
  return json(result.status, result.payload);
};
