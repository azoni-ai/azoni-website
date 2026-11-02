// netlify/functions/board-activity.js
// The /board page derives epic phases and weekly counts from recent
// agent_activity rows, and only ever reads source, type and timestamp. Serving
// just those fields lets firestore.rules close the collection to browsers:
// older rows still carry visitors' chat text in their titles and descriptions.

let db = null;

const LIMIT = 150;

function initFirebase() {
  if (db) return true;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return false;
  try {
    const admin = require('firebase-admin');
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

function toIso(ts) {
  if (!ts) return null;
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function recentActivity(database) {
  const snap = await database.collection('agent_activity')
    .orderBy('timestamp', 'desc')
    .limit(LIMIT)
    .select('source', 'type', 'timestamp')
    .get();
  return snap.docs.map((doc) => {
    const { source, type, timestamp } = doc.data();
    return { source: source || null, type: type || null, timestamp: toIso(timestamp) };
  });
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: { Allow: 'GET' }, body: '' };
  if (!initFirebase()) return { statusCode: 200, headers, body: JSON.stringify({ items: [], error: 'no-db' }) };
  try {
    return { statusCode: 200, headers, body: JSON.stringify({ items: await recentActivity(db) }) };
  } catch (err) {
    console.error('[board-activity]', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ items: [], error: 'unavailable' }) };
  }
};

exports.recentActivity = recentActivity;
