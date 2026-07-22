// netlify/functions/discord-bots.js
// Discord-bot leaderboard endpoint (mirror of extensions.js for the /leaderboard
// "Discord Bots" tab).
//
// GET  → roster + live server counts: each bot's stats come from the
//        `settings/discord_bots` doc, which the bots themselves keep fresh via
//        the POST beacon below. Falls back to `fallbackServers` (marked
//        live:false) for bots that haven't beaconed yet.
// POST → the beacon: { secret, bot, servers, members?, commandsTotal? }.
//        Gated by AGENT_WEBHOOK_SECRET (same secret the activity webhook uses,
//        so bot hosts only need one azoni.ai credential).

let admin = null;
let db = null;

// ---- Bot roster -------------------------------------------------------------
// `key` must match the `bot` field each beacon POSTs. `fallbackServers` is
// stripped from responses (used only when no beacon data exists yet).
const BOTS = [
  {
    key: 'fabstats-bot',
    name: 'FaB Stats Bot',
    link: 'https://www.fabstats.net',
    icon: '/images/bots.png',
    color: '#ef4444',
    game: 'Flesh and Blood',
    blurb:
      'Hero stats, matchup win rates, leaderboards, and daily meta digests — 24 slash commands for Flesh and Blood communities.',
    openSource: false,
    fallbackServers: 20,
  },
  {
    key: 'riftbound-card-bot',
    name: 'Riftbound Card Bot',
    link: 'https://github.com/azoni/riftbound-card-bot',
    icon: null,
    color: '#a78bfa',
    game: 'Riftbound (LoL TCG)',
    blurb:
      'Instant /card image lookup for Riot’s Riftbound TCG — fuzzy autocomplete, /search filters, keyword glossary, and inline [[card]] mentions across 1,450 vendored cards.',
    openSource: true,
    fallbackServers: null,
  },
];

const BOT_KEYS = new Set(BOTS.map((b) => b.key));
const STATS_DOC = { collection: 'settings', id: 'discord_bots' };

// In-memory cache per warm container (same pattern as extensions.js), plus CDN
// caching via headers below.
let CACHE = { at: 0, data: null };
const TTL_MS = 10 * 60 * 1000;

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

// null/undefined → null (NOT 0 — Number(null) === 0 would clobber a stored
// total when a beacon omits a field or sends null).
const asNumber = (v) => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function fast(promise, ms = 4000, fallback = null) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// Strip roster-internal fields and merge beacon stats.
function publicBot(bot, stats) {
  const { fallbackServers, ...pub } = bot;
  const s = stats || null;
  return {
    ...pub,
    servers: s && asNumber(s.servers) != null ? asNumber(s.servers) : fallbackServers,
    members: s ? asNumber(s.members) : null,
    commandsTotal: s ? asNumber(s.commandsTotal) : null,
    live: !!s,
    reportedAt: s?.updatedAt || null,
  };
}

async function buildBoard() {
  let stats = {};
  if (initFirebase()) {
    const snap = await fast(db.collection(STATS_DOC.collection).doc(STATS_DOC.id).get());
    if (snap && snap.exists) stats = snap.data() || {};
  }
  const bots = BOTS.map((b) => publicBot(b, stats[b.key])).sort(
    (a, b) => (b.servers ?? -1) - (a.servers ?? -1)
  );
  return { bots, updatedAt: new Date().toISOString() };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // ---- Beacon (bots report their own stats) ----
  if (event.httpMethod === 'POST') {
    const noStore = { ...headers, 'Cache-Control': 'no-store' };
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers: noStore, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    const secret = process.env.AGENT_WEBHOOK_SECRET;
    if (!secret || body.secret !== secret) {
      return { statusCode: 401, headers: noStore, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    if (!BOT_KEYS.has(body.bot)) {
      return { statusCode: 400, headers: noStore, body: JSON.stringify({ error: 'unknown bot' }) };
    }
    const servers = asNumber(body.servers);
    if (servers == null || servers < 0 || servers > 1_000_000) {
      return { statusCode: 400, headers: noStore, body: JSON.stringify({ error: 'servers required' }) };
    }
    if (!initFirebase()) {
      return { statusCode: 503, headers: noStore, body: JSON.stringify({ error: 'no-db' }) };
    }
    // Only overwrite optional fields when the beacon actually provides them,
    // so a transient null (e.g. a bot's Firestore read failing at send time)
    // can't wipe a previously-reported members/commandsTotal.
    const patch = { servers, updatedAt: new Date().toISOString() };
    const members = asNumber(body.members);
    if (members != null) patch.members = members;
    const commandsTotal = asNumber(body.commandsTotal);
    if (commandsTotal != null) patch.commandsTotal = commandsTotal;
    await db
      .collection(STATS_DOC.collection)
      .doc(STATS_DOC.id)
      .set({ [body.bot]: patch }, { merge: true });
    CACHE = { at: 0, data: null }; // fresh numbers on the next GET
    return { statusCode: 200, headers: noStore, body: JSON.stringify({ ok: true }) };
  }

  // ---- Board (GET) ----
  const force = event.queryStringParameters?.refresh === '1';
  if (!force && CACHE.data && Date.now() - CACHE.at < TTL_MS) {
    return { statusCode: 200, headers, body: JSON.stringify({ ...CACHE.data, cached: true }) };
  }

  try {
    const board = await buildBoard();
    CACHE = { at: Date.now(), data: board };
    return { statusCode: 200, headers, body: JSON.stringify({ ...board, cached: false }) };
  } catch (err) {
    console.error('[discord-bots] error:', err);
    const fallback = {
      bots: BOTS.map((b) => publicBot(b, null)),
      updatedAt: new Date().toISOString(),
      degraded: true,
    };
    return { statusCode: 200, headers, body: JSON.stringify(fallback) };
  }
};
