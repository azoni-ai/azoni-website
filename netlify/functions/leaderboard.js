// netlify/functions/leaderboard.js
// Cross-site visitor leaderboard for the portfolio.
//
// Every site — the 6 flagship sites AND the 8 launchpad mini-apps — fires the
// same one-per-session beacon into `site_visits`. This function counts them all
// with Firestore count() aggregations (per window + all-time total) and caches
// the whole board in `settings/leaderboard` so the page fetches ONE endpoint.
//
// Launchpad note: those apps also keep their own MCP `/launchpad/view` beacon
// (which powers the launchpad console) — this is a second, portfolio-specific
// ping so the leaderboard is reliable and uniform with every other site.

let admin = null;
let db = null;

const CACHE_DOC = { collection: 'settings', id: 'leaderboard' };
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// The day visitor tracking went live. Shown so the numbers have context.
const START_DATE = '2026-07-06';

const WINDOWS = { d1: 1, d7: 7, d30: 30 };

// ---- Beacon sites (counted from site_visits) --------------------------------
// `key` must match the `source` each site's beacon POSTs to /log-visit.
const BEACON_SITES = [
  { key: 'azoni',          label: 'azoni.ai',       url: 'https://azoni.ai',            icon: '/images/azoni.png',           color: '#60a5fa' },
  { key: 'benchpressonly', label: 'Bench Only',     url: 'https://benchpressonly.com',  icon: '/images/benchpressonly.svg',  color: '#4ade80' },
  { key: 'rowcrew',        label: 'RowCrew',        url: 'https://rowcrew.netlify.app', icon: '/images/rowing-favicon.svg',  color: '#34d399' },
  { key: 'oldwaystoday',   label: 'Old Ways Today', url: 'https://oldwaystoday.com',    icon: '/images/oldways.png',         color: '#d97706' },
  { key: 'fabstats',       label: 'FaB Stats',      url: 'https://www.fabstats.net',    icon: '/images/fabstats-icon.svg',   color: '#ef4444' },
  { key: 'embedroute',     label: 'EmbedRoute',     url: 'https://www.embedroute.com',  icon: '/images/embedroute-icon.svg', color: '#20d9d2' },
];

// ---- Launchpad apps (each fires the shared beacon; `key` = its source) -------
// Each app shows its OWN icon (copied from the app's public/icon.svg into
// /images/launchpad/); the `group: 'launchpad'` tag carries the rocket marker.
const LAUNCHPAD_SITES = [
  { key: 'meeplematch',     label: 'MeepleMatch',   url: 'https://meeplematch.netlify.app',              color: '#f472b6' },
  { key: 'blackdiamond',    label: 'Black Diamond', url: 'https://blackdiamond-alpine-wash.netlify.app', color: '#38bdf8' },
  { key: 'benchmark',       label: 'Benchmark',     url: 'https://benchmark-app-azoni.netlify.app',      color: '#facc15' },
  { key: 'repmatch',        label: 'RepMatch',      url: 'https://repmatch-app.netlify.app',             color: '#a3e635' },
  { key: 'crypto-tax-2025', label: 'Crypto Tax',    url: 'https://crypto-tax-2025.netlify.app',          color: '#fb923c' },
  { key: 'pyroguard',       label: 'PyroGuard',     url: 'https://pyroguard-demo.netlify.app',           color: '#f87171' },
  { key: 'dayrun',          label: 'Daily',         url: 'https://dayrun-app.netlify.app',               color: '#818cf8' },
  { key: 'macromarket',     label: 'MacroMarket',   url: 'https://macromarket-app.netlify.app',          color: '#2dd4bf' },
].map((s) => ({ ...s, icon: `/images/launchpad/${s.key}.svg`, group: 'launchpad' }));

const ALL_SITES = [...BEACON_SITES, ...LAUNCHPAD_SITES];

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

function asNumber(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

// Resolve to null instead of hanging: the Firestore SDK retries RESOURCE_EXHAUSTED
// with backoff (~20s), so we cap each query and move on. Keeps the endpoint snappy
// even when the DB is over quota — the row just shows no count until it recovers.
const QUERY_TIMEOUT_MS = 4000;
function fast(promise) {
  return Promise.race([
    promise.catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), QUERY_TIMEOUT_MS)),
  ]);
}

// All-time count for a source. Only needs the auto single-field index, so it
// works before the composite (source, ts) index is created.
async function countTotal(source) {
  const snap = await fast(db.collection('site_visits').where('source', '==', source).count().get());
  return snap ? asNumber(snap.data().count) : null;
}

// Windowed count. Needs a composite index on site_visits(source ASC, ts ASC).
async function countWindow(source, sinceTs) {
  const snap = await fast(
    db.collection('site_visits').where('source', '==', source).where('ts', '>=', sinceTs).count().get()
  );
  return snap ? asNumber(snap.data().count) : null;
}

async function buildBoard() {
  const now = Date.now();
  const sinceTs = {};
  for (const [w, days] of Object.entries(WINDOWS)) {
    sinceTs[w] = admin.firestore.Timestamp.fromMillis(now - days * 86_400_000);
  }

  const sites = await Promise.all(
    ALL_SITES.map(async (site) => {
      const [d1, d7, d30, total] = await Promise.all([
        countWindow(site.key, sinceTs.d1),
        countWindow(site.key, sinceTs.d7),
        countWindow(site.key, sinceTs.d30),
        countTotal(site.key),
      ]);
      return { ...site, provider: 'beacon', visits: { d1, d7, d30 }, total };
    })
  );

  return {
    sites,
    windows: Object.keys(WINDOWS),
    startDate: START_DATE,
    updatedAt: new Date().toISOString(),
  };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    // Serve instantly from CDN; refresh in the background so a slow rebuild
    // never blocks a visitor.
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (!initFirebase()) {
    return { statusCode: 200, headers, body: JSON.stringify({ sites: [], windows: Object.keys(WINDOWS), startDate: START_DATE, error: 'no-db' }) };
  }

  const force = event.queryStringParameters?.refresh === '1';
  const cacheRef = db.collection(CACHE_DOC.collection).doc(CACHE_DOC.id);

  // Cache read is best-effort and time-capped — a quota-stalled read must not
  // blank the board or hang the request.
  const snap = await fast(cacheRef.get());
  const previous = snap && snap.exists ? snap.data() : null;

  if (!force && previous) {
    const age = Date.now() - new Date(previous.updatedAt || 0).getTime();
    if (age >= 0 && age < CACHE_TTL_MS) {
      return { statusCode: 200, headers, body: JSON.stringify({ ...previous, cached: true }) };
    }
  }

  try {
    // Individual counts already swallow their errors (return null), so this
    // returns the full 14-site roster even when Firestore is over quota —
    // just with empty counts until the DB recovers.
    const board = await buildBoard();
    await fast(cacheRef.set(board)); // time-capped; won't block on a quota-stalled write
    return { statusCode: 200, headers, body: JSON.stringify({ ...board, cached: false }) };
  } catch (error) {
    console.error('[leaderboard] error:', error);
    // Last resort: the static roster (all sites, empty counts) or stale cache,
    // so visitors always see the full lineup rather than an error.
    const fallback = previous || {
      sites: ALL_SITES.map((s) => ({ ...s, provider: 'beacon', visits: { d1: null, d7: null, d30: null }, total: null })),
      windows: Object.keys(WINDOWS),
      startDate: START_DATE,
      updatedAt: new Date().toISOString(),
    };
    return { statusCode: 200, headers, body: JSON.stringify({ ...fallback, degraded: true }) };
  }
};
