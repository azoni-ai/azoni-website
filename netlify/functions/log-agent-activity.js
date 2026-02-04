/**
 * Webhook for Moltbook Agent to log activity
 * 
 * POST https://azoni.ai/.netlify/functions/log-agent-activity
 * 
 * Body: {
 *   type: 'moltbook_post' | 'moltbook_comment' | 'moltbook_upvote' | 'moltbook_reply',
 *   title: 'Posted to Moltbook',
 *   description: 'Post title or action summary',
 *   reasoning: 'Why the agent did this',
 *   metadata: { postId, submolt, etc },
 *   secret: process.env.AGENT_WEBHOOK_SECRET
 * }
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    
    // Verify webhook secret
    const secret = body.secret || event.headers['x-webhook-secret'];
    if (secret !== process.env.AGENT_WEBHOOK_SECRET) {
      return { 
        statusCode: 401, 
        headers, 
        body: JSON.stringify({ error: 'Invalid secret' }) 
      };
    }

    const { type, title, description, reasoning, metadata } = body;

    if (!type || !title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'type and title required' })
      };
    }

    // Log to agent_activity collection
    const activity = {
      type,
      title,
      description: description || '',
      reasoning: reasoning || '',
      metadata: metadata || {},
      source: 'moltbook-agent',
      timestamp: admin.firestore.Timestamp.now()
    };

    const ref = await db.collection('agent_activity').add(activity);

    console.log(`[log-agent-activity] Logged ${type}: ${title} (${ref.id})`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: ref.id })
    };

  } catch (error) {
    console.error('[log-agent-activity] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};