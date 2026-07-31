/**
 * Gated writes + owner actions for the /hub mission-control page.
 *
 * POST /.netlify/functions/hub-admin
 * Body: { action, token, ...payload }
 *
 * Auth: same server-only BOARD_ADMIN_PASSWORD as board-admin (shared helpers
 * in owner-auth-util.js) — one sign-in covers /board and /hub.
 *
 * Actions:
 *   auth           — verify the password (used by useOwnerAuth)
 *   setSiteState   — merge per-site owner state (notes, cadence overrides,
 *                    snoozeUntil, reviewedAt) into hubState/sites
 *   refreshSummary — drop the hub_summary cache so the next fetch rebuilds
 *   checkHealth    — live server-side health probes (http/mcp), time-capped
 */

const admin = require('firebase-admin');
const { tokenOk, throttled, recordFailure, clientIp } = require('./owner-auth-util');
const { SITES } = require('../../src/data/sites');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

const MCP_URL = 'https://azoni-mcp.onrender.com';
const SITE_IDS = new Set(SITES.map((s) => s.id));

function sanitizeSiteState(input = {}) {
  const out = {};
  if (typeof input.notes === 'string') out.notes = input.notes.slice(0, 500);
  if (input.notes === null) out.notes = null;
  if (input.cadence && typeof input.cadence === 'object') {
    const cadence = {};
    for (const channel of ['social', 'blog']) {
      const v = input.cadence[channel];
      if (v === null) cadence[channel] = null;
      else if (Number.isFinite(Number(v)) && Number(v) >= 1 && Number(v) <= 90) {
        cadence[channel] = Math.round(Number(v));
      }
    }
    if (Object.keys(cadence).length) out.cadence = cadence;
  }
  if (input.snoozeUntil === null) out.snoozeUntil = null;
  else if (typeof input.snoozeUntil === 'string') {
    const t = new Date(input.snoozeUntil).getTime();
    const max = Date.now() + 90 * 86_400_000;
    if (Number.isFinite(t) && t > Date.now() && t <= max) out.snoozeUntil = input.snoozeUntil;
  }
  if (input.markReviewed === true) out.reviewedAt = new Date().toISOString();
  return out;
}

async function probe(url, headers = {}, timeoutMs = 4500) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json, text/html', ...headers },
    });
    const latencyMs = Date.now() - start;
    if (res.ok) return { status: latencyMs > 3000 ? 'degraded' : 'healthy', latencyMs };
    return { status: res.status >= 500 ? 'down' : 'degraded', latencyMs, httpStatus: res.status };
  } catch {
    return { status: 'down', latencyMs: Date.now() - start };
  }
}

async function checkHealthAll() {
  // Use whichever MCP key is present (READ preferred, ADMIN fallback) — same as app-stats.
  const mcpKey = process.env.MCP_READ_KEY || process.env.MCP_ADMIN_KEY;
  const mcpHeaders = mcpKey ? { Authorization: `Bearer ${mcpKey}` } : {};
  const targets = SITES.filter((s) => s.health);
  const results = await Promise.all(
    targets.map(async (s) => {
      const url = s.health.kind === 'mcp' ? `${MCP_URL}${s.health.path}` : s.health.url;
      const headers = s.health.kind === 'mcp' ? mcpHeaders : {};
      const r = await probe(url, headers);
      return { siteId: s.id, ...r, checkedAt: Date.now() };
    })
  );
  return results;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const ip = clientIp(event);
  if (throttled(ip)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: 'Too many attempts — try again later' }),
    };
  }

  const token = body.token || event.headers['x-board-token'];
  if (!tokenOk(token)) {
    recordFailure(ip);
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { action } = body;

  try {
    switch (action) {
      case 'auth':
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

      case 'setSiteState': {
        const { siteId } = body;
        if (!siteId || !SITE_IDS.has(siteId)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'valid siteId required' }) };
        }
        const state = sanitizeSiteState(body.state);
        if (!Object.keys(state).length) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'no valid fields' }) };
        }
        await db
          .collection('hubState')
          .doc('sites')
          .set({ [siteId]: state, updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
        // Owner edits should show up on next fetch — drop the cache.
        await db.collection('settings').doc('hub_summary').delete().catch(() => {});
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      case 'refreshSummary': {
        await db.collection('settings').doc('hub_summary').delete().catch(() => {});
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      case 'checkHealth': {
        const results = await checkHealthAll();
        return { statusCode: 200, headers, body: JSON.stringify({ results }) };
      }

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
    }
  } catch (err) {
    console.error('[hub-admin]', action, err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
