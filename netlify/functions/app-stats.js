// netlify/functions/app-stats.js
// Fetches live user/player counts from all apps
// Caches results in Firestore to avoid hammering external services

let db = null;
let admin = null;

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
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
    }
    db = admin.firestore();
    return true;
  } catch (error) {
    return false;
  }
}

// Count documents in a Firestore collection
async function countCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.size;
  } catch (err) {
    console.log(`Collection ${collectionName} not found or error:`, err.message);
    return null;
  }
}

// Try multiple approaches to get user counts
async function fetchAppStats() {
  const stats = {
    benchpressonly: { users: 0, label: 'users' },
    rowcrew: { users: 0, label: 'users' },
    spellbrigade: { users: 0, label: 'players' },
    moltbook: { users: 0, label: 'followers' },
    updatedAt: new Date().toISOString()
  };

  // Try Firestore collections (all apps may share same Firebase project)
  const attempts = [
    // BenchPressOnly
    { app: 'benchpressonly', collections: ['benchpressonly_users', 'bpo_users', 'users'] },
    // RowCrew
    { app: 'rowcrew', collections: ['rowcrew_users', 'rc_users'] },
    // SpellBrigade
    { app: 'spellbrigade', collections: ['spellbrigade_players', 'sb_players', 'players'] },
  ];

  for (const attempt of attempts) {
    for (const col of attempt.collections) {
      const count = await countCollection(col);
      if (count !== null && count > 0) {
        stats[attempt.app].users = count;
        console.log(`${attempt.app}: Found ${count} in ${col}`);
        break;
      }
    }
  }

  // Try MCP server for BenchPressOnly stats
  if (stats.benchpressonly.users === 0) {
    try {
      const MCP_URL = process.env.MCP_SERVER_URL || 'https://azoni-mcp.onrender.com';
      const res = await fetch(`${MCP_URL}/benchpressonly/stats`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.totalUsers || data.userCount || data.users) {
          stats.benchpressonly.users = data.totalUsers || data.userCount || data.users;
        }
      }
    } catch (err) {
      console.log('MCP stats fetch failed:', err.message);
    }
  }

  // Try Moltbook agent for follower count
  try {
    const AGENT_URL = process.env.MOLTBOOK_AGENT_URL || 'https://azoni-moltbook-agent.onrender.com';
    const res = await fetch(`${AGENT_URL}/status`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.followers || data.followerCount) {
        stats.moltbook.users = data.followers || data.followerCount || 0;
      }
    }
  } catch (err) {
    console.log('Moltbook status fetch failed:', err.message);
  }

  return stats;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!initFirebase()) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Firebase not configured' })
    };
  }

  try {
    // Check cache first (valid for 1 hour)
    const cacheDoc = await db.collection('settings').doc('app_stats').get();
    if (cacheDoc.exists) {
      const cached = cacheDoc.data();
      const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
      if (cacheAge < 60 * 60 * 1000) { // 1 hour
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ...cached, cached: true })
        };
      }
    }

    // Fetch fresh stats
    const stats = await fetchAppStats();

    // Cache in Firestore
    await db.collection('settings').doc('app_stats').set(stats);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ...stats, cached: false })
    };
  } catch (err) {
    console.error('Error fetching app stats:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};