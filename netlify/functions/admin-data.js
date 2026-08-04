// netlify/functions/admin-data.js
// Token-gated data plane for the admin panel. Exists so the Firestore rules can
// stop granting public read on chatLogs (visitor conversations) and public write
// on site content (settings/profile/blogPosts) — the panel calls this instead of
// the client SDK, and the Admin SDK here bypasses rules.
//
// Auth matches rag-admin.js: Authorization: Bearer <RAG_ADMIN_KEY>, constant-time
// compare. POST { action, ...params }. The 'auth' action is the login check —
// the panel sends the entered password and stores it as the bearer token on success.

const crypto = require('crypto');

let admin = null;
let db = null;

const ADMIN_KEY = process.env.RAG_ADMIN_KEY;
const MOLTBOOK_ADMIN_KEY = process.env.MOLTBOOK_ADMIN_KEY || '';
const MOLTBOOK_AGENT_URL = process.env.MOLTBOOK_AGENT_URL || 'https://azoni-moltbook-agent.onrender.com';

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
  } catch (err) {
    console.error('[admin-data] Firebase init failed:', err.message);
    return false;
  }
}

// Brute-force throttle on auth attempts (per warm container, best-effort).
const authAttempts = new Map();
function isAuthThrottled(ip, limit = 10, windowMs = 10 * 60 * 1000) {
  if (!ip) return false;
  const now = Date.now();
  const bucket = authAttempts.get(ip);
  if (!bucket || now > bucket.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

function tokenValid(event) {
  if (!ADMIN_KEY) return false;
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  const provided = Buffer.from(token);
  const expected = Buffer.from(ADMIN_KEY);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

const tsToIso = (t) => (t?.toDate?.() ? t.toDate().toISOString() : null);

async function listCollection(name, orderField, count, mapper) {
  const snap = await db.collection(name).orderBy(orderField, 'desc').limit(count).get();
  return snap.docs.map((d) => mapper({ id: d.id, ...d.data() }));
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };
  if (!ADMIN_KEY) return { statusCode: 503, headers, body: JSON.stringify({ error: 'RAG_ADMIN_KEY not configured' }) };

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch { payload = {}; }
  const { action } = payload;

  // ---- Login check (the only unauthenticated action) ----
  if (action === 'auth') {
    const ip = event.headers['x-nf-client-connection-ip'] || '';
    if (isAuthThrottled(ip)) return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many attempts' }) };
    const provided = Buffer.from(String(payload.password || ''));
    const expected = Buffer.from(ADMIN_KEY);
    const ok = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
    return ok
      ? { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
      : { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid password' }) };
  }

  if (!tokenValid(event)) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  if (!initFirebase()) return { statusCode: 503, headers, body: JSON.stringify({ error: 'Firestore unavailable' }) };

  try {
    switch (action) {
      // ---- Reads (replace the panel's client-SDK queries) ----
      case 'list-chat-logs': {
        const count = Math.min(payload.limit || 300, 500);
        const logs = await listCollection('chatLogs', 'timestamp', count, (d) => ({
          ...d, timestamp: tsToIso(d.timestamp),
        }));
        return { statusCode: 200, headers, body: JSON.stringify({ logs }) };
      }
      case 'list-evals': {
        const evals = await listCollection('chat_evals', 'createdAt', Math.min(payload.limit || 20, 50), (d) => ({
          ...d, createdAt: tsToIso(d.createdAt),
        }));
        return { statusCode: 200, headers, body: JSON.stringify({ evals }) };
      }
      case 'list-gaps': {
        const gaps = await listCollection('knowledge_gaps', 'timestamp', Math.min(payload.limit || 50, 200), (d) => ({
          ...d, timestamp: tsToIso(d.timestamp),
        }));
        return { statusCode: 200, headers, body: JSON.stringify({ gaps }) };
      }
      case 'list-errors': {
        const errors = await listCollection('error_logs', 'timestamp', Math.min(payload.limit || 80, 200), (d) => ({
          ...d, timestamp: tsToIso(d.timestamp),
        }));
        return { statusCode: 200, headers, body: JSON.stringify({ errors }) };
      }
      case 'list-agent-chat-logs': {
        const logs = await listCollection('agentChatLogs', 'timestamp', Math.min(payload.limit || 200, 300), (d) => ({
          ...d, timestamp: tsToIso(d.timestamp),
        }));
        return { statusCode: 200, headers, body: JSON.stringify({ logs }) };
      }

      // ---- Writes (replace the panel's client-SDK writes) ----
      case 'save-eval': {
        const { logId, evalData } = payload;
        if (!logId || !evalData) return { statusCode: 400, headers, body: JSON.stringify({ error: 'logId and evalData required' }) };
        await db.collection('chatLogs').doc(String(logId)).update({ eval: evalData });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }
      case 'set-chat-model': {
        const model = String(payload.model || '').slice(0, 100);
        if (!model) return { statusCode: 400, headers, body: JSON.stringify({ error: 'model required' }) };
        await db.collection('settings').doc('chat').set({ model }, { merge: true });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }
      case 'save-profile': {
        if (!payload.profile || typeof payload.profile !== 'object') {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'profile object required' }) };
        }
        await db.collection('profile').doc('main').set(payload.profile, { merge: true });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }
      case 'save-blog-post': {
        // Create (no id) or update (id given). Timestamps are set server-side —
        // client Timestamp objects don't survive JSON.
        if (!payload.post || typeof payload.post !== 'object' || !payload.post.title) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'post object with title required' }) };
        }
        const post = { ...payload.post, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        if (payload.setPublishedAt) post.publishedAt = admin.firestore.FieldValue.serverTimestamp();
        if (payload.id) {
          await db.collection('blogPosts').doc(String(payload.id)).update(post);
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: payload.id }) };
        }
        post.createdAt = admin.firestore.FieldValue.serverTimestamp();
        const ref = await db.collection('blogPosts').add(post);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: ref.id }) };
      }
      case 'delete-blog-post': {
        if (!payload.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) };
        await db.collection('blogPosts').doc(String(payload.id)).delete();
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }
      case 'moderate-comment': {
        const { id, op, reply } = payload;
        if (!id || !op) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id and op required' }) };
        const ref = db.collection('comments').doc(String(id));
        if (op === 'approve') await ref.update({ approved: true });
        else if (op === 'reject') await ref.update({ approved: false });
        else if (op === 'delete') await ref.delete();
        else if (op === 'reply') {
          const text = String(reply || '').slice(0, 2000).trim();
          if (!text) return { statusCode: 400, headers, body: JSON.stringify({ error: 'reply text required' }) };
          await ref.update({
            replies: admin.firestore.FieldValue.arrayUnion({ text, createdAt: admin.firestore.Timestamp.now() }),
          });
        } else return { statusCode: 400, headers, body: JSON.stringify({ error: `unknown op: ${op}` }) };
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      // ---- Moltbook agent proxy (keeps MOLTBOOK_ADMIN_KEY out of the bundle) ----
      case 'moltbook-proxy': {
        const path = String(payload.path || '');
        if (!/^\/[a-zA-Z0-9/_-]*$/.test(path)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid path' }) };
        }
        const method = ['POST', 'PATCH'].includes(payload.method) ? payload.method : 'GET';
        const res = await fetch(`${MOLTBOOK_AGENT_URL}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(MOLTBOOK_ADMIN_KEY ? { 'X-Admin-Key': MOLTBOOK_ADMIN_KEY } : {}),
          },
          ...(method !== 'GET' && payload.body ? { body: JSON.stringify(payload.body) } : {}),
        });
        const text = await res.text();
        return { statusCode: res.status, headers, body: text };
      }

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    }
  } catch (err) {
    console.error('[admin-data] action failed:', action, err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
