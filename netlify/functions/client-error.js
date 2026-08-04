// netlify/functions/client-error.js
// Public, size-capped error reporting from the browser. The chat UI calls this when
// BOTH chat endpoints fail for a visitor — without it those failures were invisible
// (log-error.js is secret-gated and uncallable from the client). Writes error_logs
// via the Admin SDK so no Firestore rules need to allow client writes.

let admin = null;
let db = null;

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

// Tight per-IP throttle: error reports should be rare; a burst is noise or abuse.
const rateBuckets = new Map();
function isRateLimited(ip, limit = 5, windowMs = 5 * 60 * 1000) {
  if (!ip) return false;
  const now = Date.now();
  if (rateBuckets.size > 500) {
    for (const [k, v] of rateBuckets) { if (now > v.resetAt) rateBuckets.delete(k); }
  }
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };

  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || '';
  if (isRateLimited(ip)) return { statusCode: 429, headers, body: JSON.stringify({ error: 'rate_limited' }) };

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch { payload = {}; }

  const message = typeof payload.message === 'string' ? payload.message.slice(0, 500) : '';
  const context = typeof payload.context === 'string' ? payload.context.slice(0, 200) : '';
  if (!message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'message required' }) };

  if (!initFirebase()) return { statusCode: 200, headers, body: JSON.stringify({ logged: false }) };

  try {
    // Shape matches the established logError rows ({source, error, severity,
    // resolved}) — the admin monitor filters on /chat/i.test(source) and renders
    // e.error, so a different shape would be silently invisible there.
    await db.collection('error_logs').add({
      source: 'client-chat',
      error: message,
      severity: 'high',
      resolved: false,
      context,
      userAgent: (event.headers['user-agent'] || '').slice(0, 200),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { statusCode: 200, headers, body: JSON.stringify({ logged: true }) };
  } catch (err) {
    console.error('[client-error] write failed:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ logged: false }) };
  }
};
