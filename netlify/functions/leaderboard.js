// netlify/functions/leaderboard.js
// Cross-site visitor leaderboard for the portfolio.
//
// Two data providers, merged into one board:
//   • 'beacon'    — sites that fire the shared session beacon into `site_visits`.
//                   Counted with cheap Firestore count() aggregations per window.
//   • 'launchpad' — the launchpad mini-apps, whose views are already tracked by
//                   the MCP server. Reused as-is (no second logging path).
//
// The whole payload is cached in Firestore `settings/leaderboard` for CACHE_TTL_MS
// so the page fetches ONE endpoint and we never scan raw visit rows on the client.

let admin = null;
let db = null;

const CACHE_DOC = { collection: 'settings', id: 'leaderboard' };
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const WINDOWS = { d1: 1, d7: 7, d30: 30 };

// ---- Canonical site registry -------------------------------------------------
// `source` must match what each site's beacon POSTs to /log-visit.
const BEACON_SITES = [
  { key: 'azoni',          label: 'azoni.ai',        url: 'https://azoni.ai',            icon: '/images/azoni.png',            color: '#60a5fa' },
  { key: 'benchpressonly', label: 'Bench Only',      url: 'https://benchpressonly.com',  icon: '/images/benchpressonly.svg',   color: '#4ade80' },
  { key: 'rowcrew',        label: 'RowCrew',         url: 'https://rowcrew.netlify.app', icon: '/images/rowing-favicon.svg',   color: '#34d399' },
  { key: 'oldwaystoday',   label: 'Old Ways Today',  url: 'https://oldwaystoday.com',    icon: '/images/oldways.png',          color: '#d97706' },
  { key: 'fabstats',       label: 'FaB Stats',       url: 'https://www.fabstats.net',    icon: '/images/fabstats-icon.svg',    color: '#ef4444' },
  { key: 'embedroute',     label: 'EmbedRoute',      url: 'https://www.embedroute.com',  icon: '/images/embedroute-icon.svg',  color: '#20d9d2' },
];

// Launchpad apps keyed by the `name` the MCP /launchpad/stats endpoint returns.
const LAUNCHPAD_META = {
  'MeepleMatch':               { url: 'https://meeplematch.netlify.app',            color: '#f472b6' },
  'Black Diamond Alpine Wash': { url: 'https://blackdiamond-alpine-wash.netlify.app', color: '#38bdf8' },
  'Benchmark':                 { url: 'https://benchmark-app-azoni.netlify.app',     color: '#facc15' },
  'RepMatch':                  { url: 'https://repmatch-app.netlify.app',            color: '#a3e635' },
  'Crypto Tax 2025':           { url: 'https://crypto-tax-2025.netlify.app',         color: '#fb923c' },
  'PyroGuard':                 { url: 'https://pyroguard-demo.netlify.app',          color: '#f87171' },
  'Daily':                     { url: 'https://dayrun-app.netlify.app',              color: '#818cf8' },
  'MacroMarket':               { url: 'https://macromarket-app.netlify.app',         color: '#2dd4bf' },
};
const LAUNCHPAD_ICON = '/images/launchpad-rocket.svg';

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

// Count visits for one source over one window via Firestore aggregation.
// Requires a composite index on site_visits(source ASC, ts ASC) — see README.
async function countVisits(source, sinceTs) {
  try {
    const snap = await db
      .collection('site_visits')
      .where('source', '==', source)
      .where('ts', '>=', sinceTs)
      .count()
      .get();
    return asNumber(snap.data().count);
  } catch (err) {
    console.error(`[leaderboard] count(${source}) failed:`, err.message);
    return null; // null = "couldn't measure" (distinct from a real 0)
  }
}

async function fetchLaunchpad() {
  const base = process.env.MCP_SERVER_URL || 'https://azoni-mcp.onrender.com';
  const key = process.env.MCP_READ_KEY || process.env.MCP_ADMIN_KEY;
  const headers = { Accept: 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  try {
    const res = await fetch(`${base}/launchpad/stats`, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`launchpad ${res.status}`);
    const payload = await res.json();
    return Array.isArray(payload.apps) ? payload.apps : [];
  } catch (err) {
    console.error('[leaderboard] launchpad fetch failed:', err.message);
    return [];
  }
}

async function buildBoard() {
  const now = Date.now();
  const sinceTs = {};
  for (const [w, days] of Object.entries(WINDOWS)) {
    sinceTs[w] = admin.firestore.Timestamp.fromMillis(now - days * 86_400_000);
  }

  // Beacon sites: one count() per (site, window), all in parallel.
  const beaconJobs = BEACON_SITES.map(async (site) => {
    const [d1, d7, d30] = await Promise.all([
      countVisits(site.key, sinceTs.d1),
      countVisits(site.key, sinceTs.d7),
      countVisits(site.key, sinceTs.d30),
    ]);
    return {
      ...site,
      provider: 'beacon',
      visits: { d1, d7, d30 },
      approxWindow: false,
    };
  });

  const [beaconRows, launchpadApps] = await Promise.all([
    Promise.all(beaconJobs),
    fetchLaunchpad(),
  ]);

  // Launchpad apps: 24h is real; longer windows fall back to lifetime total
  // (MCP only exposes views24h + viewsTotal), flagged so the UI can mark it.
  const launchpadRows = launchpadApps
    .map((a) => {
      const meta = LAUNCHPAD_META[a.name] || {};
      const v24 = asNumber(a.views24h);
      const total = asNumber(a.viewsTotal);
      return {
        key: `lp-${(a.name || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: a.name || 'Launchpad app',
        url: meta.url || 'https://azoni.ai/projects',
        icon: LAUNCHPAD_ICON,
        color: meta.color || '#f472b6',
        provider: 'launchpad',
        group: 'launchpad',
        visits: { d1: v24, d7: total, d30: total },
        approxWindow: true, // d7/d30 are lifetime totals, not true windows
      };
    })
    .filter((r) => r.visits.d1 > 0 || r.visits.d30 > 0);

  return {
    sites: [...beaconRows, ...launchpadRows],
    windows: Object.keys(WINDOWS),
    updatedAt: new Date().toISOString(),
  };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=120',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (!initFirebase()) {
    return { statusCode: 200, headers, body: JSON.stringify({ sites: [], windows: Object.keys(WINDOWS), error: 'no-db' }) };
  }

  const force = event.queryStringParameters?.refresh === '1';

  try {
    const cacheRef = db.collection(CACHE_DOC.collection).doc(CACHE_DOC.id);
    if (!force) {
      const cached = await cacheRef.get();
      if (cached.exists) {
        const data = cached.data();
        const age = Date.now() - new Date(data.updatedAt || 0).getTime();
        if (age >= 0 && age < CACHE_TTL_MS) {
          return { statusCode: 200, headers, body: JSON.stringify({ ...data, cached: true }) };
        }
      }
    }

    const board = await buildBoard();
    await cacheRef.set(board).catch((e) => console.error('[leaderboard] cache write failed:', e.message));
    return { statusCode: 200, headers, body: JSON.stringify({ ...board, cached: false }) };
  } catch (error) {
    console.error('[leaderboard] error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
