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
const { embedAndStore } = require('./embed-util');

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

const MOLTBOOK_AGENT_URL = process.env.REACT_APP_MOLTBOOK_AGENT_URL || 'https://azoni-moltbook-agent.onrender.com';
const ORCHESTRATOR_URL = process.env.URL ? `${process.env.URL}/.netlify/functions/azoni-orchestrator` : 'https://azoni.ai/.netlify/functions/azoni-orchestrator';

// ============ EVENT ROUTER ============
// After logging an event, route it to downstream agents based on event type.
// Fire-and-forget — failures are logged but never block the response.
// Safety: only writes to rag_knowledge_base, never to agent_activity (no circular triggers).

async function routeEvent(activity) {
  const tasks = [];
  const { type, source, metadata, title, description } = activity;

  // blog_published → trigger social share + embed RAG chunk
  if (type === 'blog_published') {
    const adminKey = process.env.MOLTBOOK_ADMIN_KEY;
    if (adminKey) {
      tasks.push(
        fetch(`${MOLTBOOK_AGENT_URL}/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': adminKey
          },
          body: JSON.stringify({
            message: `New blog post published: "${title}". Share it on Moltbook with a brief intro.`,
            context: { action: 'share_blog', blogTitle: title },
            source: 'event-router'
          }),
          signal: AbortSignal.timeout(5000)
        }).catch(err => console.log('[event-router] Social share failed:', err.message))
      );
    }

    // Embed the blog RAG chunk if chunkId provided
    if (metadata?.chunkId) {
      tasks.push(embedBlogChunk(metadata.chunkId));
    }
  }

  // knowledge_generated → embed the chunk
  if (type === 'knowledge_generated' && metadata?.chunkId) {
    tasks.push(embedBlogChunk(metadata.chunkId));
  }

  // Critical errors → trigger reactive orchestrator
  if (type === 'error_logged' && (metadata?.severity === 'critical')) {
    tasks.push(
      fetch(ORCHESTRATOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reactive: true,
          event: { type, title, source, description, metadata }
        }),
        signal: AbortSignal.timeout(5000)
      }).catch(err => console.log('[event-router] Reactive orchestrator failed:', err.message))
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
    console.log(`[event-router] Routed ${type} → ${tasks.length} downstream task(s)`);
  }
}

async function embedBlogChunk(chunkId) {
  try {
    const doc = await db.collection('rag_knowledge_base').doc(chunkId).get();
    if (!doc.exists) return;
    const data = doc.data();
    // Skip if already embedded
    if (data.embedding && data.embedding.length > 0) return;
    await embedAndStore(db, admin, chunkId, data.content);
    console.log(`[event-router] Embedded chunk ${chunkId}`);
  } catch (err) {
    console.log(`[event-router] Embed chunk ${chunkId} failed:`, err.message);
  }
}

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

    // Route event to downstream agents (fire-and-forget)
    routeEvent(activity).catch(err => console.log('[event-router] Route failed:', err.message));

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
