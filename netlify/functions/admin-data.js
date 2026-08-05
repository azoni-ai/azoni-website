// netlify/functions/admin-data.js
// Token-gated data plane for the admin panel. Exists so the Firestore rules can
// stop granting public read on chatLogs (visitor conversations) and public write
// on settings — the panel calls this instead of the client SDK, and the Admin
// SDK here bypasses rules.
//
// Auth: Authorization: Bearer <RAG_ADMIN_KEY>, constant-time compare. POST
// { action, ...params }. The 'auth' action is the login check — the panel sends
// the entered password and stores it as the bearer token on success.
//
// 2026-08 admin cleanup: the panel is now Chat usage + Comments + Billing, so
// this function keeps only their actions. The removed actions (blog/eval/gaps/
// errors/agent-logs/profile writes and the Moltbook proxy) are in git history
// if a tab ever comes back.

const crypto = require('crypto');

let admin = null;
let db = null;

const ADMIN_KEY = process.env.RAG_ADMIN_KEY;

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
      // Chat usage tab: bounded read of visitor conversations.
      case 'list-chat-logs': {
        const count = Math.min(payload.limit || 300, 500);
        const snap = await db.collection('chatLogs').orderBy('timestamp', 'desc').limit(count).get();
        const logs = snap.docs.map((d) => {
          const row = { id: d.id, ...d.data() };
          return { ...row, timestamp: tsToIso(row.timestamp) };
        });
        return { statusCode: 200, headers, body: JSON.stringify({ logs }) };
      }

      // Chat usage tab: which model the public chatbot uses.
      case 'set-chat-model': {
        const model = String(payload.model || '').slice(0, 100);
        if (!model) return { statusCode: 400, headers, body: JSON.stringify({ error: 'model required' }) };
        await db.collection('settings').doc('chat').set({ model }, { merge: true });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      // Comments tab: the only approval path (client update/delete is rules-denied).
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

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    }
  } catch (err) {
    console.error('[admin-data] action failed:', action, err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
