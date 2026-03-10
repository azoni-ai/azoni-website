// netlify/functions/app-stats.js
// Aggregates live metrics for homepage product cards.

let db = null;
let admin = null;

const CACHE_DOC_PATH = { collection: 'settings', id: 'app_stats' };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
    db = admin.firestore();
    return true;
  } catch {
    return false;
  }
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function fetchJson(url, headers = {}, timeoutMs = 10000) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`${url} responded ${res.status}`);
  }

  return await res.json();
}

async function fetchAppStats() {
  const mcpBase = process.env.MCP_SERVER_URL || 'https://azoni-mcp.onrender.com';
  const mcpKey = process.env.MCP_READ_KEY || process.env.MCP_ADMIN_KEY;
  const mcpHeaders = { Accept: 'application/json' };
  if (mcpKey) mcpHeaders.Authorization = `Bearer ${mcpKey}`;

  const stats = {
    benchpressonly: {
      users: 0,
      workoutsLogged: 0,
      personalWorkouts: 0,
      groupWorkouts: 0,
    },
    rowcrew: {
      sessions: 0,
      meters: 0,
      kilometers: 0,
      uniqueRowers: 0,
      worldGoalMeters: 40075000,
      worldProgressPercent: 0,
      metersRemaining: 40075000,
      loopsCompleted: 0,
    },
    oldwaystoday: {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      status: 'unknown',
    },
    updatedAt: new Date().toISOString(),
  };

  const [benchResult, rowResult, owtResult] = await Promise.allSettled([
    fetchJson(`${mcpBase}/benchpressonly/stats`, mcpHeaders),
    fetchJson(`${mcpBase}/rowcrew/stats`, mcpHeaders),
    fetchJson(`${mcpBase}/oldwaystoday/stats`, mcpHeaders),
  ]);

  if (benchResult.status === 'fulfilled') {
    const payload = benchResult.value || {};
    const totals = payload.totals || payload;
    stats.benchpressonly.users = asNumber(totals.users);
    stats.benchpressonly.workoutsLogged = asNumber(totals.workoutsLogged);
    stats.benchpressonly.personalWorkouts = asNumber(totals.personalWorkouts);
    stats.benchpressonly.groupWorkouts = asNumber(totals.groupWorkouts);
  }

  if (rowResult.status === 'fulfilled') {
    const payload = rowResult.value || {};
    const totals = payload.totals || {};
    const worldGoal = payload.worldGoal || {};

    stats.rowcrew.sessions = asNumber(totals.sessions);
    stats.rowcrew.meters = asNumber(totals.meters);
    stats.rowcrew.kilometers = asNumber(totals.kilometers, round(stats.rowcrew.meters / 1000, 2));
    stats.rowcrew.uniqueRowers = asNumber(totals.uniqueRowers);
    stats.rowcrew.worldGoalMeters = asNumber(worldGoal.meters, 40075000);
    stats.rowcrew.worldProgressPercent = asNumber(worldGoal.progressPercent);
    stats.rowcrew.metersRemaining = asNumber(
      worldGoal.metersRemaining,
      Math.max(0, stats.rowcrew.worldGoalMeters - stats.rowcrew.meters)
    );
    stats.rowcrew.loopsCompleted = asNumber(worldGoal.loopsCompleted, round(
      stats.rowcrew.worldGoalMeters > 0 ? stats.rowcrew.meters / stats.rowcrew.worldGoalMeters : 0,
      3
    ));
  }

  if (owtResult.status === 'fulfilled') {
    const payload = owtResult.value || {};
    const totals = payload.totals || payload.usage || payload.stats || {};
    stats.oldwaystoday.requests = asNumber(totals.requests ?? totals.total_requests);
    stats.oldwaystoday.inputTokens = asNumber(totals.inputTokens ?? totals.total_input_tokens);
    stats.oldwaystoday.outputTokens = asNumber(totals.outputTokens ?? totals.total_output_tokens);
    stats.oldwaystoday.totalCost = asNumber(totals.totalCost ?? totals.total_cost);
    stats.oldwaystoday.status = payload.status || 'ok';
  }

  stats.updatedAt = new Date().toISOString();
  return stats;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const canCache = initFirebase();

  try {
    if (canCache) {
      const cacheDoc = await db.collection(CACHE_DOC_PATH.collection).doc(CACHE_DOC_PATH.id).get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        const cacheAgeMs = Date.now() - new Date(cached.updatedAt || 0).getTime();
        if (cacheAgeMs >= 0 && cacheAgeMs < CACHE_TTL_MS) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ ...cached, cached: true }),
          };
        }
      }
    }

    const stats = await fetchAppStats();

    if (canCache) {
      await db.collection(CACHE_DOC_PATH.collection).doc(CACHE_DOC_PATH.id).set(stats);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ...stats, cached: false }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
