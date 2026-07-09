// netlify/functions/extensions.js
// Ranks my published browser extensions by install count.
//
// The Chrome Web Store has no public stats API, so we scrape the install count
// ("N users") off the detail page server-side (CORS blocks doing it in the
// browser). Cached in-memory per warm container + at the CDN, with a hardcoded
// fallback per extension so a scrape miss still shows a number.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Add a row here to put another extension on the board. `fallbackUsers` is the
// last-known count, shown if the live scrape fails.
const EXTENSIONS = [
  {
    key: 'fabstats-gem',
    name: 'FaB Stats — GEM Exporter',
    store:
      'https://chromewebstore.google.com/detail/fab-stats-gem-exporter/kcaaaibikofempdbphoeeljdbjakhmjh',
    id: 'kcaaaibikofempdbphoeeljdbjakhmjh',
    icon: '/images/fabstats-icon.svg',
    color: '#ef4444',
    browser: 'Chrome',
    blurb: 'Export your GEM match history into FaB Stats in one click',
    fallbackUsers: 557,
  },
];

const TTL_MS = 6 * 60 * 60 * 1000; // 6h
let CACHE = { at: 0, data: null };

function toInt(s) {
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
// The install count renders as "557 users" exactly once on the detail page.
function parseUsers(html) {
  const m = html.match(/([\d,]+)\s*users/);
  return m ? toInt(m[1]) : null;
}
// Category is glued right before the count, e.g. ">Games557 users".
function parseCategory(html) {
  const m = html.match(/>([A-Za-z][A-Za-z &/]{1,24}?)[\d,]+\s*users/);
  return m ? m[1].trim() : null;
}

// Strip the private `fallbackUsers` before returning to clients.
function pub(ext) {
  const { fallbackUsers, ...rest } = ext; // eslint-disable-line no-unused-vars
  return rest;
}

async function fetchOne(ext) {
  try {
    const signal =
      typeof AbortSignal !== 'undefined' && AbortSignal.timeout
        ? AbortSignal.timeout(6000)
        : undefined;
    const res = await fetch(ext.store, { headers: { 'User-Agent': UA }, signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const html = await res.text();
    const users = parseUsers(html);
    return {
      ...pub(ext),
      users: users != null ? users : ext.fallbackUsers ?? null,
      category: parseCategory(html),
      live: users != null,
    };
  } catch {
    return { ...pub(ext), users: ext.fallbackUsers ?? null, category: null, live: false };
  }
}

async function build() {
  const extensions = await Promise.all(EXTENSIONS.map(fetchOne));
  extensions.sort((a, b) => (b.users || 0) - (a.users || 0));
  return { extensions, updatedAt: new Date().toISOString() };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const force = event.queryStringParameters?.refresh === '1';
  if (!force && CACHE.data && Date.now() - CACHE.at < TTL_MS) {
    return { statusCode: 200, headers, body: JSON.stringify({ ...CACHE.data, cached: true }) };
  }

  try {
    const data = await build();
    CACHE = { at: Date.now(), data };
    return { statusCode: 200, headers, body: JSON.stringify({ ...data, cached: false }) };
  } catch (error) {
    console.error('[extensions] error:', error);
    const data = {
      extensions: EXTENSIONS.map((e) => ({ ...pub(e), users: e.fallbackUsers ?? null, live: false })),
      updatedAt: new Date().toISOString(),
      degraded: true,
    };
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  }
};
