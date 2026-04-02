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

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function preserveMonotonicOldWaysTotals(currentStats, previousStats) {
  if (!currentStats || !previousStats) return currentStats;

  const current = currentStats.oldwaystoday;
  const previous = previousStats.oldwaystoday;
  if (!current || !previous) return currentStats;

  current.requests = Math.max(asNumber(current.requests), asNumber(previous.requests));
  current.inputTokens = Math.max(asNumber(current.inputTokens), asNumber(previous.inputTokens));
  current.outputTokens = Math.max(asNumber(current.outputTokens), asNumber(previous.outputTokens));
  current.totalCost = Math.max(asNumber(current.totalCost), asNumber(previous.totalCost));

  return currentStats;
}

async function fetchOldWaysFromActivityLogs() {
  if (!db) return null;

  try {
    const snapshot = await db
      .collection('agent_activity')
      .where('source', 'in', ['oldwaystoday', 'old-ways-today'])
      .get();

    if (snapshot.empty) return null;

    let requests = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let totalCost = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const tokens = data.tokens || {};

      requests += 1;
      inputTokens += asNumber(firstDefined(tokens.prompt, tokens.input, tokens.inputTokens));
      outputTokens += asNumber(firstDefined(tokens.completion, tokens.output, tokens.outputTokens));
      totalCost += asNumber(data.cost);
    });

    return {
      requests,
      inputTokens,
      outputTokens,
      totalCost: round(totalCost, 6),
    };
  } catch {
    return null;
  }
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
    fabstats: {
      matches: 0,
    },
    launchpad: {
      totalApps: 0,
      totalViews24h: 0,
      apps: [],
    },
    updatedAt: new Date().toISOString(),
  };

  const [benchResult, rowResult, owtResult, fabResult, launchpadResult] = await Promise.allSettled([
    fetchJson(`${mcpBase}/benchpressonly/stats`, mcpHeaders),
    fetchJson(`${mcpBase}/rowcrew/stats`, mcpHeaders),
    fetchJson(`${mcpBase}/oldwaystoday/stats`, mcpHeaders),
    fetchJson(`${mcpBase}/fabstats/stats`, mcpHeaders),
    fetchJson(`${mcpBase}/launchpad/stats`, mcpHeaders),
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
    const totals = payload.totals || payload.stats || payload.usage || payload || {};
    const worldGoal = payload.worldGoal || payload.world_goal || payload.goal || payload || {};

    stats.rowcrew.sessions = asNumber(firstDefined(
      totals.sessions,
      totals.totalSessions,
      totals.total_sessions,
      totals.sessionsLogged,
      payload.sessions,
      payload.totalSessions,
      payload.total_sessions
    ));

    stats.rowcrew.meters = asNumber(firstDefined(
      totals.meters,
      totals.totalMeters,
      totals.total_meters,
      totals.distanceMeters,
      totals.distance_meters,
      payload.meters,
      payload.totalMeters,
      payload.total_meters
    ));

    stats.rowcrew.kilometers = asNumber(
      firstDefined(
        totals.kilometers,
        totals.kilometres,
        totals.totalKilometers,
        totals.total_kilometers,
        payload.kilometers,
        payload.totalKilometers
      ),
      round(stats.rowcrew.meters / 1000, 2)
    );

    stats.rowcrew.uniqueRowers = asNumber(firstDefined(
      totals.uniqueRowers,
      totals.unique_rowers,
      totals.uniqueUsers,
      totals.unique_users,
      totals.rowers,
      payload.uniqueRowers,
      payload.unique_rowers
    ));

    stats.rowcrew.worldGoalMeters = asNumber(firstDefined(
      worldGoal.meters,
      worldGoal.targetMeters,
      worldGoal.worldGoalMeters,
      worldGoal.goalMeters,
      worldGoal.goal_meters,
      payload.worldGoalMeters,
      payload.goalMeters
    ), 40075000);

    stats.rowcrew.worldProgressPercent = asNumber(firstDefined(
      worldGoal.progressPercent,
      worldGoal.progress,
      worldGoal.progress_percentage,
      payload.worldProgressPercent,
      payload.progressPercent
    ));
    stats.rowcrew.metersRemaining = asNumber(
      firstDefined(
        worldGoal.metersRemaining,
        worldGoal.remainingMeters,
        worldGoal.remaining_meters,
        worldGoal.remaining,
        payload.metersRemaining,
        payload.remainingMeters
      ),
      Math.max(0, stats.rowcrew.worldGoalMeters - stats.rowcrew.meters)
    );
    stats.rowcrew.loopsCompleted = asNumber(firstDefined(
      worldGoal.loopsCompleted,
      worldGoal.loops,
      worldGoal.loops_completed,
      payload.loopsCompleted,
      payload.loops
    ), round(
      stats.rowcrew.worldGoalMeters > 0 ? stats.rowcrew.meters / stats.rowcrew.worldGoalMeters : 0,
      3
    ));

    // If only meters + goal are present, compute progress as a final fallback.
    if (!stats.rowcrew.worldProgressPercent && stats.rowcrew.worldGoalMeters > 0 && stats.rowcrew.meters > 0) {
      stats.rowcrew.worldProgressPercent = round(
        (stats.rowcrew.meters / stats.rowcrew.worldGoalMeters) * 100,
        2
      );
    }
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

  if (fabResult.status === 'fulfilled') {
    const payload = fabResult.value || {};
    const totals = payload.totals || payload.stats || payload;
    stats.fabstats.matches = asNumber(firstDefined(
      totals.matches,
      totals.totalMatches,
      totals.total_matches,
      payload.matches,
      payload.totalMatches
    ));
    stats.fabstats.users = asNumber(firstDefined(
      totals.users,
      totals.totalUsers,
      totals.total_users,
      totals.players,
      payload.users,
      payload.totalUsers
    ));
  }

  if (launchpadResult.status === 'fulfilled') {
    const payload = launchpadResult.value || {};
    stats.launchpad.totalApps = asNumber(payload.totalApps);
    stats.launchpad.totalViews24h = asNumber(payload.totalViews24h);
    stats.launchpad.apps = (payload.apps || []).map(a => ({
      name: a.name,
      views24h: asNumber(a.views24h),
      viewsTotal: asNumber(a.viewsTotal),
    }));
  }

  // If OWT backend counters reset, recover from durable activity logs.
  if (
    db
    && stats.oldwaystoday.requests === 0
    && stats.oldwaystoday.inputTokens === 0
    && stats.oldwaystoday.outputTokens === 0
  ) {
    const activityTotals = await fetchOldWaysFromActivityLogs();
    if (activityTotals) {
      stats.oldwaystoday.requests = Math.max(stats.oldwaystoday.requests, activityTotals.requests);
      stats.oldwaystoday.inputTokens = Math.max(stats.oldwaystoday.inputTokens, activityTotals.inputTokens);
      stats.oldwaystoday.outputTokens = Math.max(stats.oldwaystoday.outputTokens, activityTotals.outputTokens);
      stats.oldwaystoday.totalCost = Math.max(stats.oldwaystoday.totalCost, activityTotals.totalCost);
      if (stats.oldwaystoday.status === 'unknown') stats.oldwaystoday.status = 'ok';
    }
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
  let previousCached = null;

  try {
    if (canCache) {
      const cacheDoc = await db.collection(CACHE_DOC_PATH.collection).doc(CACHE_DOC_PATH.id).get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        previousCached = cached;
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

    const stats = preserveMonotonicOldWaysTotals(
      await fetchAppStats(),
      previousCached
    );

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
