const admin = require('firebase-admin');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// How long a raw visit row lives before Firestore TTL cleans it up.
// We only ever aggregate over the last 30 days, so ~40 days is plenty of buffer.
const TTL_DAYS = 40;

// Keep the source list bounded so a stray/hostile caller can't invent sources.
// This is the single canonical visit sink for every portfolio site.
const SOURCE_MAX_LEN = 40;

function cleanSource(raw) {
  if (typeof raw !== 'string') return 'azoni';
  const s = raw.trim().toLowerCase().slice(0, SOURCE_MAX_LEN);
  // allow letters, numbers, dash — nothing else
  return /^[a-z0-9-]+$/.test(s) ? s : 'azoni';
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{"error":"POST only"}' };

  let source = 'azoni';
  try {
    const b = JSON.parse(event.body || '{}');
    if (b.source) source = cleanSource(b.source);
  } catch {}

  // Single source of truth: one tiny row per session-visit in `site_visits`.
  // Kept out of `agent_activity` on purpose so it never bloats the ops feed.
  if (db) {
    const now = admin.firestore.Timestamp.now();
    const ttl = admin.firestore.Timestamp.fromMillis(now.toMillis() + TTL_DAYS * 86_400_000);
    await db
      .collection('site_visits')
      .add({ source, ts: now, ttl })
      .catch((err) => console.error('[log-visit] Firestore write failed:', err.message));
  }

  return { statusCode: 200, headers, body: '{"ok":true}' };
};
