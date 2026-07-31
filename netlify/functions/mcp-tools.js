// netlify/functions/mcp-tools.js
// Cached view of the Azoni MCP server's tool registry + per-tool call counts.
// The MCP runs on Render (free plan, cold starts), so we never hit it from the
// browser: this function fetches /tools, caches the result in Firestore
// (settings/mcp_tools) + on the CDN, and serves stale on any hiccup.

let admin = null;
let db = null;

const CACHE_DOC = { collection: 'settings', id: 'mcp_tools' };
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MCP_BASE = process.env.MCP_SERVER_URL || 'https://azoni-mcp.onrender.com';

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

function fast(promise, ms, fallback = null) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function fetchTools() {
  const res = await fetch(`${MCP_BASE}/tools`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`/tools responded ${res.status}`);
  const data = await res.json();
  const tools = (Array.isArray(data.tools) ? data.tools : []).map((t) => ({
    name: t.name,
    domain: t.domain,
    description: t.description || '',
    calls: Number.isFinite(t.calls) ? t.calls : 0,
  }));
  return {
    totalTools: Number.isFinite(data.totalTools) ? data.totalTools : tools.length,
    totalCalls: Number.isFinite(data.totalCalls) ? data.totalCalls : tools.reduce((s, t) => s + t.calls, 0),
    domainCount: Array.isArray(data.domains) ? data.domains.length : null,
    callsUpdatedAt: data.callsUpdatedAt || null,
    tools,
    updatedAt: new Date().toISOString(),
  };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const hasDb = initFirebase();
  const ref = hasDb ? db.collection(CACHE_DOC.collection).doc(CACHE_DOC.id) : null;

  // Serve fresh cache if we have it.
  if (ref) {
    const cached = await fast(ref.get(), 4000);
    if (cached && cached.exists) {
      const data = cached.data();
      const age = Date.now() - new Date(data.updatedAt || 0).getTime();
      if (age >= 0 && age < CACHE_TTL_MS) {
        return { statusCode: 200, headers, body: JSON.stringify({ ...data, cached: true }) };
      }
    }
  }

  // Rebuild from the MCP (time-capped so a cold Render never hangs the request).
  const fresh = await fast(fetchTools(), 9000, null);
  if (fresh) {
    if (ref) await fast(ref.set(fresh), 3000);
    return { statusCode: 200, headers, body: JSON.stringify({ ...fresh, cached: false }) };
  }

  // Couldn't reach the MCP — serve the last cached copy if any.
  if (ref) {
    const cached = await fast(ref.get(), 3000);
    if (cached && cached.exists) {
      return { statusCode: 200, headers, body: JSON.stringify({ ...cached.data(), cached: true, stale: true }) };
    }
  }
  return { statusCode: 200, headers, body: JSON.stringify({ error: 'unavailable', tools: [], totalCalls: 0, totalTools: 0 }) };
};
