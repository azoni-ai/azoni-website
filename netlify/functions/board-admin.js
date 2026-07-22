/**
 * Gated writes for the Board (tasks + boardState).
 *
 * POST /.netlify/functions/board-admin
 * Body: { action, token, ...payload }
 *
 * Auth: `token` must equal process.env.BOARD_ADMIN_PASSWORD — a SERVER-ONLY
 * secret (NOT a REACT_APP_* var, so it is never shipped in the client bundle).
 * Reads are done client-side straight from Firestore; only writes go here.
 *
 * Actions: auth | createTask | updateTask | moveTask | deleteTask |
 *          setPhaseOverride | saveBoardState
 *
 * Firebase Admin init mirrors log-agent-activity.js / portfolio-sync.js.
 */

const admin = require('firebase-admin');
const { tokenOk, throttled, recordFailure, clientIp } = require('./owner-auth-util');

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

const STATUSES = ['backlog', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'med', 'high'];
const VISIBILITIES = ['public', 'private'];
const PHASES = ['active', 'live', 'maintained', 'idle'];

function sanitizeTask(input = {}) {
  const out = {};
  if (typeof input.title === 'string') out.title = input.title.slice(0, 200);
  if (typeof input.description === 'string') out.description = input.description.slice(0, 1000);
  if (typeof input.projectId === 'string') out.projectId = input.projectId.slice(0, 80);
  if (STATUSES.includes(input.status)) out.status = input.status;
  if (Array.isArray(input.agentIds)) {
    out.agentIds = input.agentIds.filter((a) => typeof a === 'string').slice(0, 8);
  }
  if (PRIORITIES.includes(input.priority)) out.priority = input.priority;
  else if (input.priority === null || input.priority === '') out.priority = null;
  if (VISIBILITIES.includes(input.visibility)) out.visibility = input.visibility;
  if (typeof input.link === 'string') {
    // Only http(s) URLs are stored — anything else (javascript:, data:) is dropped.
    const link = input.link.slice(0, 300).trim();
    out.link = /^https?:\/\//i.test(link) ? link : '';
  }
  if (typeof input.source === 'string') out.source = input.source.slice(0, 60);
  if (typeof input.order === 'number') out.order = input.order;
  if (typeof input.seedId === 'string' && /^[\w-]{1,60}$/.test(input.seedId)) {
    out.seedId = input.seedId;
  }
  return out;
}

// Auth helpers (tokenOk / throttle) are shared with hub-admin — see
// owner-auth-util.js. One password covers every owner surface.

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Board-Token',
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

  const now = admin.firestore.Timestamp.now();
  const { action } = body;

  try {
    switch (action) {
      case 'auth':
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

      case 'createTask': {
        const data = sanitizeTask(body.task);
        if (!data.title) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'title required' }) };
        }
        data.status = data.status || 'backlog';
        data.projectId = data.projectId || '_meta';
        data.visibility = data.visibility || 'public';
        if (typeof data.order !== 'number') data.order = now.toMillis();
        data.createdAt = now;
        data.updatedAt = now;
        // Seed imports use a deterministic doc id so a retried import
        // overwrites instead of duplicating.
        if (data.seedId) {
          const ref = db.collection('tasks').doc(`seed_${data.seedId}`);
          await ref.set(data);
          return { statusCode: 200, headers, body: JSON.stringify({ id: ref.id }) };
        }
        const ref = await db.collection('tasks').add(data);
        return { statusCode: 200, headers, body: JSON.stringify({ id: ref.id }) };
      }

      case 'updateTask': {
        if (!body.id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) };
        }
        const data = sanitizeTask(body.task);
        data.updatedAt = now;
        await db.collection('tasks').doc(body.id).update(data);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      case 'moveTask': {
        if (!body.id || !STATUSES.includes(body.status)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'id + valid status required' }),
          };
        }
        const patch = { status: body.status, updatedAt: now };
        if (typeof body.order === 'number') patch.order = body.order;
        // Cross-swimlane drops also re-file the task under the target epic.
        if (typeof body.projectId === 'string' && body.projectId) {
          patch.projectId = body.projectId.slice(0, 80);
        }
        await db.collection('tasks').doc(body.id).update(patch);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      case 'deleteTask': {
        if (!body.id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) };
        }
        await db.collection('tasks').doc(body.id).delete();
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      case 'setPhaseOverride': {
        const { projectId, phase } = body;
        if (!projectId) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'projectId required' }) };
        }
        const value =
          phase === null || phase === 'auto'
            ? admin.firestore.FieldValue.delete()
            : phase;
        if (value !== admin.firestore.FieldValue.delete() && !PHASES.includes(phase)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid phase' }) };
        }
        await db
          .collection('boardState')
          .doc('config')
          .set({ phaseOverrides: { [projectId]: value }, updatedAt: now }, { merge: true });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      case 'saveBoardState': {
        const patch = { updatedAt: now };
        if (Array.isArray(body.epicOrder)) {
          patch.epicOrder = body.epicOrder.filter((x) => typeof x === 'string');
        }
        if (body.phaseOverrides && typeof body.phaseOverrides === 'object') {
          patch.phaseOverrides = body.phaseOverrides;
        }
        if (Array.isArray(body.hiddenProjects)) {
          patch.hiddenProjects = body.hiddenProjects.filter((x) => typeof x === 'string');
        }
        await db.collection('boardState').doc('config').set(patch, { merge: true });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
    }
  } catch (err) {
    console.error('[board-admin]', action, err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
