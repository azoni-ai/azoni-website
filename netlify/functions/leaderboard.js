// netlify/functions/leaderboard.js
// Cross-site visitor leaderboard for the portfolio.
//
// Two providers, one board:
//   • 'beacon'    — sites firing the shared session beacon into `site_visits`.
//                   Counted with Firestore count() aggregations.
//   • 'launchpad' — the launchpad mini-apps, which ALREADY fire their own
//                   once-per-session view beacon to the MCP server (their
//                   documented standard). We reuse that via /launchpad/stats —
//                   no second logging path, no touching those apps.
//
// Cached in Firestore `settings/leaderboard` so the page fetches ONE endpoint.
// Launchpad data is resilient: if the MCP call misses (Render cold-start), we
// keep the last-known launchpad rows from the previous cache instead of dropping
// the apps off the board.

let admin = null;
let db = null;

const CACHE_DOC = { collection: 'settings', id: 'leaderboard' };
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// The day visitor tracking went live. Shown so the numbers have context.
const START_DATE = '2026-07-05';

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

// ---- Launchpad apps (bridged from MCP, keyed by the name MCP returns) --------
const LAUNCHPAD_ICON = '/images/launchpad-rocket.svg';
const LAUNCHPAD_META = {
  'MeepleMatch':               { url: 'https://meeplematch.netlify.app',             color: '#f472b6' },
  'Black Diamond Alpine Wash': { url: 'https://blackdiamond-alpine-wash.netlify.app', color: '#38bdf8', label: 'Black Diamond' },
  'Benchmark':                 { url: 'https://benchmark-app-azoni.netlify.app',      color: '#facc15' },
  'RepMatch':                  { url: 'https://repmatch-app.netlify.app',             color: '#a3e635' },
  'Crypto Tax 2025':           { url: 'https://crypto-tax-2025.netlify.app',          color: '#fb923c', label: 'Crypto Tax' },
  'PyroGuard':                 { url: 'https://pyroguard-demo.netlify.app',           color: '#f87171' },
  'Daily':                     { url: 'https://dayrun-app.netlify.app',               color: '#818cf8' },
  'MacroMarket':               { url: 'https://macromarket-app.netlify.app',          color: '#2dd4bf' },
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

function asNumber(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

// All-time count for a source. Only needs the auto single-field index, so it
// works before the composite (source, ts) index is created.
async function countTotal(source) {
  try {
    const snap = await db.collection('site_visits').where('source', '==', source).count().get();
    return asNumber(snap.data().count);
  } catch (err) {
    console.error(`[leaderboard] total(${source}) failed:`, err.message);
    return null;
  }
}

// Windowed count. Needs a composite index on site_visits(source ASC, ts ASC).
async function countWindow(source, sinceTs) {
  try {
    const snap = await db
      .collection('site_visits')
      .where('source', '==', source)
      .where('ts', '>=', sinceTs)
      .count()
      .get();
    return asNumber(snap.data().count);
  } catch (err) {
    console.error(`[leaderboard] window(${source}) failed:`, err.message);
    return null;
  }
}

async function fetchLaunchpad() {
  const base = process.env.MCP_SERVER_URL || 'https://azoni-mcp.onrender.com';
  const key = process.env.MCP_READ_KEY || process.env.MCP_ADMIN_KEY;
  const headers = { Accept: 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  try {
    // 25s: MCP runs on Render and can cold-start. Requires the function's own
    // timeout to be raised past the 10s default (see netlify.toml).
    const res = await fetch(`${base}/launchpad/stats`, { headers, signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error(`launchpad ${res.status}`);
    const payload = await res.json();
    return Array.isArray(payload.apps) ? payload.apps : [];
  } catch (err) {
    console.error('[leaderboard] launchpad fetch failed:', err.message);
    return null; // null = miss (reuse previous), [] would mean "known empty"
  }
}

function launchpadRowsFrom(apps) {
  return apps
    .map((a) => {
      const meta = LAUNCHPAD_META[a.name] || {};
      const total = asNumber(a.viewsTotal);
      return {
        key: `lp-${(a.name || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: meta.label || a.name || 'Launchpad app',
        url: meta.url || 'https://azoni.ai/projects',
        icon: LAUNCHPAD_ICON,
        color: meta.color || '#f472b6',
        provider: 'launchpad',
        group: 'launchpad',
        // Only 24h is a true window from MCP; 7d/30d aren't available, so the
        // card leans on the always-visible total instead.
        visits: { d1: asNumber(a.views24h), d7: null, d30: null },
        total,
      };
    })
    .filter((r) => r.visits.d1 > 0 || r.total > 0);
}

async function buildBoard(previous) {
  const now = Date.now();
  const sinceTs = {};
  for (const [w, days] of Object.entries(WINDOWS)) {
    sinceTs[w] = admin.firestore.Timestamp.fromMillis(now - days * 86_400_000);
  }

  const beaconJobs = BEACON_SITES.map(async (site) => {
    const [d1, d7, d30, total] = await Promise.all([
      countWindow(site.key, sinceTs.d1),
      countWindow(site.key, sinceTs.d7),
      countWindow(site.key, sinceTs.d30),
      countTotal(site.key),
    ]);
    return { ...site, provider: 'beacon', visits: { d1, d7, d30 }, total };
  });

  const [beaconRows, launchpadApps] = await Promise.all([
    Promise.all(beaconJobs),
    fetchLaunchpad(),
  ]);

  // Resilience: on a cold-start miss, keep the last-known launchpad rows.
  let launchpadRows;
  if (launchpadApps === null) {
    launchpadRows = (previous?.sites || []).filter((s) => s.group === 'launchpad');
  } else {
    launchpadRows = launchpadRowsFrom(launchpadApps);
  }

  return {
    sites: [...beaconRows, ...launchpadRows],
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
    'Cache-Control': 'public, max-age=120',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (!initFirebase()) {
    return { statusCode: 200, headers, body: JSON.stringify({ sites: [], windows: Object.keys(WINDOWS), startDate: START_DATE, error: 'no-db' }) };
  }

  const force = event.queryStringParameters?.refresh === '1';

  try {
    const cacheRef = db.collection(CACHE_DOC.collection).doc(CACHE_DOC.id);
    const cachedSnap = await cacheRef.get();
    const previous = cachedSnap.exists ? cachedSnap.data() : null;

    if (!force && previous) {
      const age = Date.now() - new Date(previous.updatedAt || 0).getTime();
      if (age >= 0 && age < CACHE_TTL_MS) {
        return { statusCode: 200, headers, body: JSON.stringify({ ...previous, cached: true }) };
      }
    }

    const board = await buildBoard(previous);
    await cacheRef.set(board).catch((e) => console.error('[leaderboard] cache write failed:', e.message));
    return { statusCode: 200, headers, body: JSON.stringify({ ...board, cached: false }) };
  } catch (error) {
    console.error('[leaderboard] error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
