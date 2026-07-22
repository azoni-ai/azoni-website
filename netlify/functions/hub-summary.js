// netlify/functions/hub-summary.js
// One cached endpoint that feeds the /hub mission-control page: per-site
// health, traffic, costs, open tasks, last-posted content + staleness, and a
// cross-site content calendar.
//
// Same quota discipline as home-summary.js: everything is a bounded read or a
// count()/sum() aggregate, computed once server-side, cached in
// `settings/hub_summary`, and CDN-cached on top — a public /hub visit
// normally costs ZERO Firestore reads.
//
// Wherever another cached function already computed a number (leaderboard
// traffic, home-summary costs) we read that cache doc instead of recomputing.

const {
  SITES,
  ALL_CONTENT_TYPES,
  resolveContentChannel,
} = require('../../src/data/sites');

let admin = null;
let db = null;

const CACHE_DOC = { collection: 'settings', id: 'hub_summary' };
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const CALENDAR_DAYS = 45;
const OPEN_STATUSES = ['backlog', 'in_progress', 'review'];

// Orchestrator health_checks service names → site ids (see azoni-orchestrator
// SERVICES). Services not listed (e.g. Moltbook Agent) don't map to a site.
const HEALTH_SERVICE_TO_SITE = {
  'azoni.ai': 'azoni',
  'MCP Server': 'mcp',
  'OWT Backend': 'oldwaystoday',
  'oldwaystoday.com': 'oldwaystoday',
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
function tsAgo(days) { return admin.firestore.Timestamp.fromMillis(Date.now() - days * 86_400_000); }
function toMs(ts) { return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null; }

// Cap a promise so a quota-stalled Firestore op can't hang the request.
function fast(promise, ms = 5000, fallback = null) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const activity = () => db.collection('agent_activity');

async function readSettingsDoc(id) {
  const snap = await fast(db.collection('settings').doc(id).get());
  return snap && snap.exists ? snap.data() : null;
}

async function latestHealthCheck() {
  try {
    const snap = await db
      .collection('health_checks')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0].data();
    return { services: d.services || [], checkedAtMs: toMs(d.timestamp) };
  } catch (err) {
    console.error('[hub-summary] health read failed:', err.message);
    return null;
  }
}

// One bounded query covers the calendar AND most-recent-post-per-channel.
async function contentEvents() {
  if (ALL_CONTENT_TYPES.length === 0) return [];
  try {
    const snap = await activity()
      .where('type', 'in', ALL_CONTENT_TYPES)
      .where('timestamp', '>=', tsAgo(CALENDAR_DAYS))
      .orderBy('timestamp', 'desc')
      .limit(400)
      .get();
    return snap.docs.map((d) => {
      const a = d.data() || {};
      return {
        type: a.type || null,
        source: a.source || null,
        title: a.title || a.description || null,
        ms: toMs(a.timestamp),
        platform: a.metadata?.platform || null,
        url: a.metadata?.url || null,
        channel: a.metadata?.channel || null,
      };
    });
  } catch (err) {
    console.error('[hub-summary] contentEvents failed:', err.message);
    return [];
  }
}

// Per-site recent-activity probe: doc[0] gives liveness; when the site tracks
// content channels that had no hit in the calendar window, the extra docs are
// scanned for older content events so "last posted 83d ago" stays exact.
async function siteRecent(site, needContentScan) {
  const sources = (site.activitySources || []).slice(0, 10);
  if (sources.length === 0) return [];
  try {
    const snap = await activity()
      .where('source', 'in', sources)
      .orderBy('timestamp', 'desc')
      .limit(needContentScan ? 12 : 1)
      .get();
    return snap.docs.map((d) => {
      const a = d.data() || {};
      return {
        type: a.type || null,
        title: a.title || a.description || null,
        ms: toMs(a.timestamp),
        platform: a.metadata?.platform || null,
        url: a.metadata?.url || null,
        channel: a.metadata?.channel || null,
      };
    });
  } catch (err) {
    console.error(`[hub-summary] siteRecent(${site.id}) failed:`, err.message);
    return [];
  }
}

async function openTaskCount(projectId) {
  if (!projectId) return null;
  try {
    const snap = await db
      .collection('tasks')
      .where('projectId', '==', projectId)
      .where('status', 'in', OPEN_STATUSES)
      .count()
      .get();
    return asNumber(snap.data().count);
  } catch (err) {
    // Missing composite index or quota — the card just hides the stat.
    return null;
  }
}

function channelStatus(daysSince, cadenceDays, snoozeUntilMs, now) {
  if (snoozeUntilMs && snoozeUntilMs > now) return 'snoozed';
  if (!cadenceDays) return 'untracked';
  if (daysSince == null) return 'stale';
  if (daysSince <= cadenceDays) return 'fresh';
  if (daysSince <= 2 * cadenceDays) return 'due';
  return 'stale';
}

async function build() {
  const now = Date.now();

  const [leaderboardCache, homeCache, health, hubStateSnap, events] = await Promise.all([
    readSettingsDoc('leaderboard'),
    readSettingsDoc('home_summary'),
    fast(latestHealthCheck()),
    fast(db.collection('hubState').doc('sites').get()),
    fast(contentEvents(), 6000, []),
  ]);

  const hubState = hubStateSnap && hubStateSnap.exists ? hubStateSnap.data() : {};
  const trafficByKey = {};
  (leaderboardCache?.sites || []).forEach((s) => { trafficByKey[s.key] = s; });
  const costBySource = {};
  (homeCache?.bySource || []).forEach((r) => { costBySource[r.source] = asNumber(r.value); });

  // Health by site (worst status wins when two services map to one site).
  const RANK = { down: 0, degraded: 1, healthy: 2 };
  const healthBySite = {};
  (health?.services || []).forEach((svc) => {
    const siteId = HEALTH_SERVICE_TO_SITE[svc.name];
    if (!siteId) return;
    const prev = healthBySite[siteId];
    if (!prev || (RANK[svc.status] ?? 3) < (RANK[prev.status] ?? 3)) {
      healthBySite[siteId] = {
        status: svc.status || 'unknown',
        latencyMs: asNumber(svc.latencyMs, null),
        checkedAt: health.checkedAtMs || null,
      };
    }
  });

  // Bucket calendar events per site/channel.
  const bySiteChannel = {}; // siteId -> channel -> newest event
  const calendar = [];
  const sourceToSite = {};
  SITES.forEach((s) => (s.activitySources || []).forEach((src) => {
    if (!(src in sourceToSite)) sourceToSite[src] = s;
  }));

  for (const ev of events) {
    const site = sourceToSite[ev.source];
    if (!site || !ev.ms) continue;
    const channel = resolveContentChannel(site, ev.type, ev.channel);
    if (!channel) continue;
    calendar.push({
      ms: ev.ms,
      date: new Date(ev.ms).toISOString().slice(0, 10),
      siteId: site.id,
      channel,
      platform: ev.platform,
      title: ev.title,
      url: ev.url,
    });
    const bucket = (bySiteChannel[site.id] = bySiteChannel[site.id] || {});
    if (!bucket[channel] || ev.ms > bucket[channel].ms) bucket[channel] = ev;
  }

  // Per-site probes (liveness + content fallback) and open-task counts.
  const probes = await Promise.all(
    SITES.map(async (site) => {
      const trackedChannels = Object.keys(site.cadence || {}).filter((c) => site.cadence[c]);
      const missing = trackedChannels.filter((c) => !bySiteChannel[site.id]?.[c]);
      const [recent, tasks] = await Promise.all([
        fast(siteRecent(site, missing.length > 0), 4500, []),
        fast(openTaskCount(site.boardProjectId), 4000, null),
      ]);
      return { site, recent, tasks };
    })
  );

  const sites = probes.map(({ site, recent, tasks }) => {
    const state = hubState[site.id] || {};
    const cadence = { ...(site.cadence || {}), ...(state.cadence || {}) };
    const lastSeenMs = recent[0]?.ms || null;

    // Fill missing channels from the deeper recent scan.
    const bucket = bySiteChannel[site.id] || {};
    for (const ev of recent) {
      const channel = resolveContentChannel(site, ev.type, ev.channel);
      if (channel && (!bucket[channel] || ev.ms > bucket[channel].ms)) bucket[channel] = ev;
    }

    const content = {};
    const channels = new Set([...Object.keys(site.contentTypes || {}), ...Object.keys(cadence)]);
    channels.forEach((channel) => {
      const ev = bucket[channel] || null;
      const daysSince = ev?.ms ? Math.floor((now - ev.ms) / 86_400_000) : null;
      const snoozeMs = state.snoozeUntil ? new Date(state.snoozeUntil).getTime() : null;
      content[channel] = {
        lastMs: ev?.ms || null,
        daysSince,
        title: ev?.title || null,
        url: ev?.url || null,
        platform: ev?.platform || null,
        cadenceDays: cadence[channel] || null,
        status: channelStatus(daysSince, cadence[channel], snoozeMs, now),
      };
    });

    const traffic = site.visitKey && trafficByKey[site.visitKey]
      ? { ...trafficByKey[site.visitKey].visits, total: trafficByKey[site.visitKey].total }
      : null;
    const cost30d = (site.costSources || []).reduce(
      (sum, src) => (costBySource[src] != null ? (sum || 0) + costBySource[src] : sum),
      null
    );

    return {
      id: site.id,
      name: site.name,
      url: site.url,
      icon: site.icon,
      color: site.color,
      group: site.group,
      category: site.category,
      composeUrl: site.compose?.url || null,
      composeLabel: site.compose?.label || null,
      health: healthBySite[site.id] || (site.health ? { status: 'unknown', kind: site.health.kind } : null),
      lastSeenMs,
      traffic,
      cost30d,
      openTasks: tasks,
      content,
      notes: state.notes || null,
      reviewedAt: state.reviewedAt || null,
    };
  });

  calendar.sort((a, b) => b.ms - a.ms);

  const weekAgo = now - 7 * 86_400_000;
  const totals = {
    sites: sites.length,
    healthy: sites.filter((s) => s.health?.status === 'healthy').length,
    staleChannels: sites.reduce(
      (n, s) => n + Object.values(s.content).filter((c) => c.status === 'stale').length,
      0
    ),
    posts7d: calendar.filter((c) => c.ms >= weekAgo).length,
    cost30d: sites.reduce((sum, s) => sum + (s.cost30d || 0), 0),
    openTasks: sites.reduce((sum, s) => sum + (s.openTasks || 0), 0),
  };

  return {
    sites,
    calendar,
    totals,
    calendarDays: CALENDAR_DAYS,
    updatedAt: new Date().toISOString(),
  };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    // Serve instantly from CDN; refresh in the background so a slow rebuild
    // never blocks the page.
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (!initFirebase()) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'no-db' }) };
  }

  const force = event.queryStringParameters?.refresh === '1';
  const ref = db.collection(CACHE_DOC.collection).doc(CACHE_DOC.id);

  const cached = await fast(ref.get());
  const previous = cached && cached.exists ? cached.data() : null;
  if (!force && previous) {
    const age = Date.now() - new Date(previous.updatedAt || 0).getTime();
    if (age >= 0 && age < CACHE_TTL_MS) {
      return { statusCode: 200, headers, body: JSON.stringify({ ...previous, cached: true }) };
    }
  }

  const summary = await fast(build(), 9000, null);
  if (!summary) {
    if (previous) {
      return { statusCode: 200, headers, body: JSON.stringify({ ...previous, cached: true, stale: true }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'timeout' }) };
  }

  await fast(ref.set(summary)); // time-capped write
  return { statusCode: 200, headers, body: JSON.stringify({ ...summary, cached: false }) };
};
