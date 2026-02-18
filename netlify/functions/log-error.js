/**
 * Centralized Error Logger
 * 
 * Any app in the ecosystem can POST errors here.
 * The orchestrator reviews them each cycle and flags patterns.
 * 
 * POST /.netlify/functions/log-error
 * Body: {
 *   source: "benchpressonly" | "spell-brigade" | "azoni-ai" | "rowcrew" | "moltbook-agent" | "embedroute",
 *   error: "Error message",
 *   stack: "Optional stack trace",
 *   severity: "low" | "medium" | "high" | "critical",
 *   context: { function: "daily-blog", action: "publish", userId: "..." },
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

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { source, error, stack, severity, context, secret } = body;

    // Auth check
    if (secret !== process.env.AGENT_WEBHOOK_SECRET) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    if (!source || !error) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields: source, error' }) };
    }

    const validSources = ['benchpressonly', 'spell-brigade', 'azoni-ai', 'rowcrew', 'moltbook-agent', 'embedroute', 'daily-blog', 'orchestrator', 'chat', 'rag-admin', 'old-ways-today'];
    const validSeverities = ['low', 'medium', 'high', 'critical'];

    const doc = {
      source: validSources.includes(source) ? source : 'unknown',
      error: String(error).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 5000) : null,
      severity: validSeverities.includes(severity) ? severity : 'medium',
      context: context || {},
      resolved: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const ref = await db.collection('error_logs').add(doc);

    // For critical/high errors, route through log-agent-activity so the event router
    // can trigger downstream actions (e.g., reactive orchestrator for critical errors)
    if (doc.severity === 'critical' || doc.severity === 'high') {
      const SITE_URL = process.env.URL || 'https://azoni.ai';
      fetch(`${SITE_URL}/.netlify/functions/log-agent-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error_logged',
          title: `${doc.severity === 'critical' ? '🚨' : '⚠️'} ${doc.source}: ${doc.error.slice(0, 100)}`,
          description: `${doc.severity.toUpperCase()} error in ${doc.source}${doc.context?.function ? ` (${doc.context.function})` : ''}`,
          source: doc.source,
          metadata: {
            errorId: ref.id,
            severity: doc.severity,
            context: doc.context
          },
          secret: process.env.AGENT_WEBHOOK_SECRET
        }),
        signal: AbortSignal.timeout(5000)
      }).catch(err => console.log('[log-error] Event router notify failed:', err.message));
    }

    console.log(`[log-error] ${doc.severity} error from ${doc.source}: ${doc.error.slice(0, 100)}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: ref.id, severity: doc.severity })
    };
  } catch (err) {
    console.error('[log-error] Failed:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};