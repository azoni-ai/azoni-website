/**
 * Webhook for all apps to log AI activity to the portfolio feed
 * 
 * POST https://azoni.ai/.netlify/functions/log-agent-activity
 * 
 * Body: {
 *   type: 'workout_generated' | 'group_workout_generated' | 'progress_analyzed' | 
 *         'assistant_chat' | 'workout_autofilled' | 'wizard_created' | 'dungeon_created' |
 *         'moltbook_post' | 'moltbook_comment' | 'moltbook_upvote' | ...,
 *   title: 'Generated Push/Pull Workout',
 *   description: 'Created a 6-exercise upper body workout for azoni',
 *   reasoning: 'Why the AI made this decision (optional)',
 *   source: 'benchpressonly' | 'spell-brigade' | 'moltbook-agent' | 'rowcrew',
 *   model: 'gpt-4o-mini' | 'claude-sonnet-4' | ...,
 *   tokens: { prompt: 1200, completion: 800, total: 2000 },
 *   cost: 0.0012,
 *   metadata: { workoutId, wizardName, etc },
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

    const { type, title, description, reasoning, metadata, source, model, tokens, cost } = body;

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
      source: source || 'unknown',
      metadata: metadata || {},
      timestamp: admin.firestore.Timestamp.now(),
    };

    // Add AI cost/usage fields if provided
    if (model) activity.model = model;
    if (tokens) activity.tokens = tokens;
    if (cost !== undefined && cost !== null) activity.cost = cost;

    const ref = await db.collection('agent_activity').add(activity);

    console.log(`[activity] ${source || '?'}/${type}: ${title} (${ref.id})${cost ? ` $${cost.toFixed(6)}` : ''}`);

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
