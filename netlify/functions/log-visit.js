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

const MCP_URL = process.env.MCP_URL || "https://azoni-mcp.onrender.com";
const MCP_KEY = process.env.MCP_ADMIN_KEY;

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: '{"error":"POST only"}' };

  let source = "azoni";
  try { const b = JSON.parse(event.body || "{}"); if (b.source) source = b.source; } catch {}

  const promises = [];

  // Write directly to portfolio Firestore (primary — this is what the dashboard reads)
  if (db) {
    promises.push(
      db.collection('agent_activity').add({
        type: 'site_visit',
        title: 'Site visit',
        source,
        description: '',
        timestamp: admin.firestore.Timestamp.now(),
      }).catch(err => console.error('[log-visit] Firestore write failed:', err.message))
    );
  }

  // MCP mirror removed — portfolio Firestore is the single source of truth for visits

  await Promise.allSettled(promises);
  return { statusCode: 200, headers, body: '{"ok":true}' };
};
