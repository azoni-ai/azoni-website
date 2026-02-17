/**
 * Azoni AI Orchestrator
 * 
 * Central intelligence that monitors all systems and coordinates agents.
 * Runs every 3 hours, gathers state from GitHub, Firestore, MCP, and
 * agent services, then uses an LLM to decide what actions to take.
 * 
 * Schedule: Every 3 hours (cron: 0 every-3-hours)
 * 
 * Actions it can take:
 * - Trigger daily-blog if commits exist but no blog was written
 * - Tell social agent to share new blog posts on Moltbook
 * - Log fitness milestones or streaks worth highlighting
 * - Flag system health issues (agent down, no activity, etc.)
 * - Summarize daily portfolio activity
 * - Health check all services (azoni.ai, MCP, Moltbook, OWT) with latency tracking
 * 
 * Required env vars:
 * - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * - OPENROUTER_API_KEY
 * - GITHUB_TOKEN
 * - MOLTBOOK_AGENT_URL (optional, defaults to Render URL)
 * - MCP_SERVER_URL (optional, defaults to Render URL)
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

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Centralized error logger
async function logError(source, error, severity = 'medium', context = {}) {
  try {
    await db.collection('error_logs').add({
      source,
      error: String(error).slice(0, 2000),
      severity,
      context,
      resolved: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('[logError] Failed to log error:', err.message);
  }
}
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = 'azoni';
const MCP_BASE_URL = process.env.MCP_SERVER_URL || 'https://azoni-mcp.onrender.com';
const MOLTBOOK_AGENT_URL = process.env.REACT_APP_MOLTBOOK_AGENT_URL || 'https://azoni-moltbook-agent.onrender.com';
const SITE_URL = process.env.URL || 'https://azoni.ai';

// ============ ACTION VALIDATION & RATE LIMITING ============

const ACTION_SCHEMA = {
  trigger_blog: { required: ['date'] },
  share_blog: { required: ['blogTitle'] },
  flag_health: { required: ['system', 'issue'] },
  log_milestone: { required: ['title', 'description'] },
  fill_knowledge_gap: { required: ['gapQuery', 'gapIntent'] },
  self_assessment: {},
  reorganize_knowledge: {},
  review_errors: {},
  none: {}
};

function validateActions(actions) {
  if (!Array.isArray(actions)) {
    console.log('[orchestrator] LLM returned non-array actions, rejecting');
    return [];
  }

  const validated = [];
  for (const action of actions) {
    if (!action || typeof action.action !== 'string') {
      console.log('[orchestrator] Skipped malformed action:', JSON.stringify(action));
      continue;
    }

    const schema = ACTION_SCHEMA[action.action];
    if (!schema) {
      console.log(`[orchestrator] Rejected unknown action: "${action.action}"`);
      continue;
    }

    if (schema.required) {
      const missing = schema.required.filter(p => !action[p]);
      if (missing.length > 0) {
        console.log(`[orchestrator] Rejected "${action.action}": missing params [${missing.join(', ')}]`);
        continue;
      }
    }

    validated.push(action);
  }
  return validated;
}

function applyRateLimits(actions, recentActivity) {
  const now = Date.now();
  const checked = [];

  for (const action of actions) {
    switch (action.action) {
      case 'trigger_blog': {
        const recentBlog = recentActivity.find(a =>
          (a.title?.includes('blog generation') || a.title?.includes('Published blog') || a.title?.includes('Blog skipped')) &&
          (now - new Date(a.timestamp).getTime()) < 6 * 60 * 60 * 1000
        );
        if (recentBlog) {
          console.log('[orchestrator] Rate-limited trigger_blog: already triggered in last 6h');
          continue;
        }
        break;
      }
      case 'fill_knowledge_gap': {
        const gapFills = checked.filter(a => a.action === 'fill_knowledge_gap').length;
        if (gapFills >= 2) {
          console.log('[orchestrator] Rate-limited fill_knowledge_gap: max 2 per cycle');
          continue;
        }
        break;
      }
      case 'reorganize_knowledge': {
        const recentReorg = recentActivity.find(a =>
          a.title?.includes('Reorganized knowledge') &&
          (now - new Date(a.timestamp).getTime()) < 24 * 60 * 60 * 1000
        );
        if (recentReorg) {
          console.log('[orchestrator] Rate-limited reorganize_knowledge: done in last 24h');
          continue;
        }
        break;
      }
      case 'self_assessment': {
        // Only check within available activity window (24h). The LLM prompt
        // already handles the 5-day check via lastAssessment state.
        const recentAssess = recentActivity.find(a =>
          a.type === 'self_assessment'
        );
        if (recentAssess) {
          console.log('[orchestrator] Rate-limited self_assessment: already done in last 24h');
          continue;
        }
        break;
      }
    }
    checked.push(action);
  }

  // Hard cap: max 4 actions per cycle
  if (checked.length > 4) {
    console.log(`[orchestrator] Capping actions from ${checked.length} to 4`);
    return checked.slice(0, 4);
  }
  return checked;
}

// ============ STATE GATHERING ============

async function getRecentActivity(hoursBack = 24) {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const snapshot = await db.collection('agent_activity')
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(cutoff))
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      type: data.type,
      title: data.title,
      description: data.description,
      source: data.source,
      timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
    };
  });
}

async function getRecentBlogPosts(hoursBack = 48) {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const snapshot = await db.collection('blogPosts')
    .where('publishedAt', '>=', admin.firestore.Timestamp.fromDate(cutoff))
    .orderBy('publishedAt', 'desc')
    .limit(5)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      slug: data.slug,
      publishedAt: data.publishedAt?.toDate?.()?.toISOString() || null,
      autoGenerated: data.autoGenerated || false,
      tags: data.tags || [],
    };
  });
}

async function getTodayCommitCount() {
  if (!GITHUB_TOKEN) return null;

  const today = new Date().toISOString().split('T')[0];
  const from = `${today}T00:00:00Z`;
  const to = `${today}T23:59:59Z`;

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
          }
        }
        repositories(first: 10, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: [OWNER]) {
          nodes {
            name
            pushedAt
            defaultBranchRef {
              target {
                ... on Commit {
                  history(since: $from, until: $to) {
                    totalCount
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { username: GITHUB_USERNAME, from, to }
      })
    });

    const data = await res.json();
    const repos = data?.data?.user?.repositories?.nodes || [];

    let totalCommits = 0;
    const activeRepos = [];

    for (const repo of repos) {
      const count = repo.defaultBranchRef?.target?.history?.totalCount || 0;
      if (count > 0) {
        totalCommits += count;
        activeRepos.push({ name: repo.name, commits: count });
      }
    }

    return { totalCommits, activeRepos, date: today };
  } catch (err) {
    console.error('[orchestrator] GitHub fetch failed:', err.message);
    return null;
  }
}

async function getMoltbookAgentStatus() {
  try {
    const res = await fetch(`${MOLTBOOK_AGENT_URL}/status`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { online: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

// ============ SERVICE HEALTH CHECKS ============
const SERVICES = [
  { name: 'azoni.ai', url: `${SITE_URL}`, type: 'frontend' },
  { name: 'MCP Server', url: `${MCP_BASE_URL}/health`, type: 'api' },
  { name: 'Moltbook Agent', url: `${MOLTBOOK_AGENT_URL}/status`, type: 'agent' },
  { name: 'OWT Backend', url: 'https://oldwaystoday-backend.onrender.com/health', type: 'api' },
  { name: 'oldwaystoday.com', url: 'https://oldwaystoday.com', type: 'frontend' },
];

async function checkServiceHealth() {
  const results = [];

  for (const service of SERVICES) {
    const start = Date.now();
    try {
      const res = await fetch(service.url, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
        headers: { 'Accept': 'application/json, text/html' }
      });
      const latency = Date.now() - start;
      results.push({
        name: service.name,
        url: service.url,
        type: service.type,
        status: res.ok ? 'healthy' : 'degraded',
        httpStatus: res.status,
        latencyMs: latency,
        error: res.ok ? null : `HTTP ${res.status}`
      });
    } catch (err) {
      const latency = Date.now() - start;
      results.push({
        name: service.name,
        url: service.url,
        type: service.type,
        status: 'down',
        httpStatus: null,
        latencyMs: latency,
        error: err.message
      });
    }
  }

  // Save to Firestore
  try {
    await db.collection('health_checks').add({
      services: results,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.status === 'healthy').length,
        degraded: results.filter(r => r.status === 'degraded').length,
        down: results.filter(r => r.status === 'down').length,
        avgLatencyMs: Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length),
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('[orchestrator] Failed to save health check:', err.message);
  }

  // Log any down services to activity feed
  const downServices = results.filter(r => r.status === 'down');
  if (downServices.length > 0) {
    await db.collection('agent_activity').add({
      type: 'health_alert',
      title: `⚠️ ${downServices.length} service${downServices.length > 1 ? 's' : ''} down: ${downServices.map(s => s.name).join(', ')}`,
      description: downServices.map(s => `${s.name}: ${s.error}`).join('\n'),
      reasoning: 'Health check detected unreachable services during orchestration cycle.',
      source: 'azoni-ai',
      metadata: {
        services: downServices.map(s => ({ name: s.name, error: s.error })),
        orchestrator: true
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.error('[orchestrator] Failed to log health alert:', err.message));
  }

  return results;
}

async function getFitnessSummary() {
  try {
    const res = await fetch(`${MCP_BASE_URL}/benchpressonly/coach/azoni`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[orchestrator] MCP fitness fetch failed:', err.message);
    return null;
  }
}

async function getLastOrchestratorRun() {
  const snapshot = await db.collection('agent_activity')
    .where('source', '==', 'azoni-ai')
    .where('type', '==', 'agent_observing')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data().timestamp?.toDate?.() || null;
}

// ===== NEW: Self-improvement state gathering =====

async function getKnowledgeGaps(limit = 20) {
  try {
    const snapshot = await db.collection('knowledge_gaps')
      .where('resolved', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      query: doc.data().query,
      intent: doc.data().intent,
      bestRetrievalScore: doc.data().bestRetrievalScore,
      responseIndicatesGap: doc.data().responseIndicatesGap,
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null
    }));
  } catch (err) {
    console.error('[orchestrator] Knowledge gaps fetch failed:', err.message);
    return [];
  }
}

async function getChatStats(hoursBack = 72) {
  try {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const snapshot = await db.collection('chat_logs')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(cutoff))
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const logs = snapshot.docs.map(doc => doc.data());
    const totalChats = logs.length;
    const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
    const intentCounts = {};
    const lowScoreQueries = [];
    
    for (const log of logs) {
      intentCounts[log.intent] = (intentCounts[log.intent] || 0) + 1;
      if (log.bestRetrievalScore < 10) {
        lowScoreQueries.push(log.query?.slice(0, 100));
      }
    }

    return {
      totalChats,
      totalCost: totalCost.toFixed(6),
      intentBreakdown: intentCounts,
      lowScoreQueries: lowScoreQueries.slice(0, 5),
      period: `${hoursBack}h`
    };
  } catch (err) {
    console.error('[orchestrator] Chat stats fetch failed:', err.message);
    return { totalChats: 0, error: err.message };
  }
}

async function getRagHealth() {
  try {
    const snapshot = await db.collection('rag_knowledge_base').get();
    const chunks = snapshot.docs.map(doc => ({
      id: doc.id,
      category: doc.data().category,
      title: doc.data().title,
      hasEmbedding: !!doc.data().embedding,
      autoGenerated: !!doc.data().metadata?.autoGenerated,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    }));

    const categories = {};
    let withEmbedding = 0;
    let withoutEmbedding = 0;
    let autoGenerated = 0;

    for (const chunk of chunks) {
      categories[chunk.category] = (categories[chunk.category] || 0) + 1;
      if (chunk.hasEmbedding) withEmbedding++;
      else withoutEmbedding++;
      if (chunk.autoGenerated) autoGenerated++;
    }

    return {
      totalChunks: chunks.length,
      autoGenerated,
      categories,
      withEmbedding,
      withoutEmbedding,
      titles: chunks.map(c => c.title)
    };
  } catch (err) {
    console.error('[orchestrator] RAG health fetch failed:', err.message);
    return { totalChunks: 0, error: err.message };
  }
}

async function getLastSelfAssessment() {
  try {
    const snapshot = await db.collection('agent_activity')
      .where('type', '==', 'self_assessment')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data().timestamp?.toDate?.() || null;
  } catch (err) {
    return null;
  }
}

async function getRecentErrors(hoursBack = 24) {
  try {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const snapshot = await db.collection('error_logs')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(cutoff))
      .orderBy('timestamp', 'desc')
      .limit(30)
      .get();

    const errors = snapshot.docs.map(doc => ({
      id: doc.id,
      source: doc.data().source,
      error: doc.data().error,
      severity: doc.data().severity,
      context: doc.data().context,
      resolved: doc.data().resolved,
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null
    }));

    // Summarize by source
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    const bySource = {};
    for (const err of errors) {
      bySeverity[err.severity] = (bySeverity[err.severity] || 0) + 1;
      bySource[err.source] = (bySource[err.source] || 0) + 1;
    }

    return {
      total: errors.length,
      unresolved: errors.filter(e => !e.resolved).length,
      bySeverity,
      bySource,
      recent: errors.slice(0, 10)
    };
  } catch (err) {
    console.error('[orchestrator] Error logs fetch failed:', err.message);
    return { total: 0, error: err.message };
  }
}

// ============ ACTION EXECUTION ============

async function triggerBlogGeneration(date) {
  try {
    const res = await fetch(`${SITE_URL}/.netlify/functions/daily-blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });
    const body = await res.json().catch(() => ({}));
    const skipped = body.skipped || body.message?.includes('already exists') || body.message?.includes('No commits');
    return {
      success: res.ok && !skipped,
      skipped: !!skipped,
      status: res.status,
      message: body.message || body.error || null
    };
  } catch (err) {
    return { success: false, skipped: false, error: err.message };
  }
}

async function nudgeSocialAgent(message, context) {
  // The social agent runs autonomously, but we can log a recommendation
  // that it picks up on its next cycle, or hit its trigger endpoint if available
  try {
    const res = await fetch(`${MOLTBOOK_AGENT_URL}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message, 
        context,
        source: 'azoni-orchestrator' 
      }),
      signal: AbortSignal.timeout(5000)
    });
    return { sent: res.ok, status: res.status };
  } catch (err) {
    // Agent may not have a trigger endpoint — that's fine, just log the recommendation
    return { sent: false, note: 'No trigger endpoint, logged recommendation only' };
  }
}

// ============ LOGGING ============

async function logStep(type, title, description, reasoning, metadata = {}) {
  try {
    await db.collection('agent_activity').add({
      type,
      title,
      description,
      reasoning,
      metadata: { ...metadata, orchestrator: true },
      source: 'azoni-ai',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('[orchestrator] Failed to log:', err.message);
  }
}

// ============ NEW ACTION EXECUTION ============

async function fillKnowledgeGap(gapQuery, gapIntent) {
  // Use GPT-4o (stronger model) to generate a high-quality RAG chunk
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni AI Knowledge Gap Fill'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: `You are generating knowledge base content for Charlton Smith's portfolio chatbot. 
Charlton is a software engineer in Seattle with 7+ years experience. He built:
- BenchPressOnly (fitness app), Spell Brigade (multiplayer game), RowCrew (rowing verification)
- An AI agent system: orchestrator, blog writer, social agent, fitness agent, gaming agent
- MCP data server, EmbedRoute (unified embeddings API), RAG chatbot
- Previously: T-Mobile (4 yrs, automation platform), Capital One (1 yr, test infrastructure)
- Earlier: Dustbunny (autonomous NFT trading, 50 machines), OLI Fitness (CV startup, ACM published)

Generate a knowledge chunk that would help the chatbot answer this type of question. Be factual — only include what's reasonable based on Charlton's background. If the question is about something you can't reasonably answer, still create a helpful chunk that addresses the topic area.

Respond with JSON: { "category": "...", "title": "...", "content": "...", "keywords": ["..."] }
Category must be one of: bio, experience, projects, skills, agents, services, blog, fitness, general` },
          { role: 'user', content: `A user asked the chatbot: "${gapQuery}" (detected intent: ${gapIntent}) and the chatbot couldn't find good information. Generate a knowledge chunk to fill this gap.` }
        ],
        temperature: 0.4,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const usage = data.usage || {};
    const cost = (usage.prompt_tokens || 0) * 0.0000025 + (usage.completion_tokens || 0) * 0.00001;

    const chunk = JSON.parse(content);
    
    if (!chunk.category || !chunk.title || !chunk.content) {
      return { success: false, error: 'LLM returned incomplete chunk', cost };
    }

    // Write directly to rag_knowledge_base
    const ragDoc = {
      category: chunk.category,
      title: chunk.title,
      content: chunk.content,
      metadata: { 
        autoGenerated: true, 
        generatedBy: 'orchestrator',
        sourceQuery: gapQuery.slice(0, 200),
        keywords: chunk.keywords || []
      },
      tokenEstimate: Math.ceil(chunk.content.length / 4),
      embedding: null,
      embeddedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Check for duplicate titles
    const existing = await db.collection('rag_knowledge_base')
      .where('title', '==', chunk.title).get();

    if (!existing.empty) {
      return { success: false, error: 'Chunk with this title already exists', cost };
    }

    // Check for duplicate source queries (same question asked before)
    const existingByQuery = await db.collection('rag_knowledge_base')
      .where('metadata.sourceQuery', '==', gapQuery.slice(0, 200)).get();

    if (!existingByQuery.empty) {
      return { success: false, error: 'Chunk for this query already exists', cost };
    }

    const ref = await db.collection('rag_knowledge_base').add(ragDoc);
    console.log(`[orchestrator] Created RAG chunk: ${chunk.title} (${ref.id})`);

    return { 
      success: true, 
      chunkId: ref.id, 
      title: chunk.title, 
      category: chunk.category,
      cost,
      tokens: { prompt: usage.prompt_tokens, completion: usage.completion_tokens }
    };
  } catch (err) {
    console.error('[orchestrator] Fill knowledge gap failed:', err.message);
    return { success: false, error: err.message };
  }
}

async function markGapResolved(gapId) {
  try {
    await db.collection('knowledge_gaps').doc(gapId).update({
      resolved: true,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      resolvedBy: 'orchestrator'
    });
  } catch (err) {
    console.error('[orchestrator] Failed to mark gap resolved:', err.message);
  }
}

async function generateSelfAssessment(state) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni AI Self Assessment'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: `You are Azoni AI performing a self-assessment of the portfolio's AI systems. 
Analyze the data provided and write a brief, actionable assessment covering:
1. What's working well (be specific)
2. What needs improvement (be specific)  
3. Top 3 concrete recommendations for the next week

Be direct and honest. No fluff. Focus on actionable insights.
Respond as JSON: { "working_well": ["..."], "needs_improvement": ["..."], "recommendations": ["..."], "overall_health": "healthy|degraded|concerning" }` },
          { role: 'user', content: `SYSTEM DATA FOR ASSESSMENT:

Chat Stats (72h): ${JSON.stringify(state.chatStats)}
Knowledge Gaps (unresolved): ${state.knowledgeGaps.length} gaps
Top gap queries: ${state.knowledgeGaps.slice(0, 5).map(g => g.query).join('; ')}
RAG Health: ${JSON.stringify(state.ragHealth)}
Recent Activity: ${state.activity.length} events in 24h
Blog Posts (48h): ${state.blogs.length}
Commits Today: ${state.github?.totalCommits || 0}
Moltbook: ${state.moltbook.online ? 'Online' : 'Offline'}
MCP/Fitness: ${state.fitness ? 'Reachable' : 'Unreachable'}` }
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const usage = data.usage || {};
    const cost = (usage.prompt_tokens || 0) * 0.0000025 + (usage.completion_tokens || 0) * 0.00001;

    return { ...JSON.parse(content), cost, tokens: usage };
  } catch (err) {
    console.error('[orchestrator] Self-assessment failed:', err.message);
    return { error: err.message };
  }
}

// ============ KNOWLEDGE REORGANIZATION ============

async function reorganizeKnowledge() {
  try {
    // Get all chunks
    const snapshot = await db.collection('rag_knowledge_base').get();
    const chunks = snapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      category: doc.data().category,
      content: (doc.data().content || '').slice(0, 200),
      autoGenerated: doc.data().metadata?.autoGenerated || false,
      generatedBy: doc.data().metadata?.generatedBy || 'manual',
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    }));

    const autoChunks = chunks.filter(c => c.autoGenerated);
    const manualChunks = chunks.filter(c => !c.autoGenerated);

    // Ask LLM to identify cleanup actions
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni AI Knowledge Reorg'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: `You manage a RAG knowledge base. Review the chunks below and identify cleanup actions.

Rules:
- NEVER delete manually-created chunks (generatedBy: "manual" or not auto-generated)
- Only flag auto-generated chunks for deletion if they are clearly redundant (same topic covered by another chunk)
- Merge is preferred over delete — combine overlapping auto-generated chunks into one
- Keep total auto-generated chunks reasonable (under 50)
- Be conservative — only act on clear duplicates or very low-quality entries

Respond with JSON: { "actions": [...], "summary": "..." }
Each action: { "type": "delete"|"merge", "chunkIds": ["..."], "reason": "..." }
For merge: chunkIds lists the IDs to merge (first one kept, rest deleted)
If no cleanup needed: { "actions": [], "summary": "Knowledge base is clean" }` },
          { role: 'user', content: `KNOWLEDGE BASE (${chunks.length} total, ${autoChunks.length} auto-generated, ${manualChunks.length} manual):

${chunks.map(c => `[${c.id}] (${c.autoGenerated ? 'auto:' + c.generatedBy : 'manual'}) ${c.category} — "${c.title}": ${c.content}...`).join('\n')}` }
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
    });

    const data = await res.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const usage = data.usage || {};
    const cost = (usage.prompt_tokens || 0) * 0.00000015 + (usage.completion_tokens || 0) * 0.0000006;

    let deleted = 0;
    let merged = 0;

    for (const action of (result.actions || [])) {
      if (action.type === 'delete' && action.chunkIds?.length > 0) {
        for (const id of action.chunkIds) {
          // Safety: verify it's auto-generated before deleting
          const doc = await db.collection('rag_knowledge_base').doc(id).get();
          if (doc.exists && doc.data()?.metadata?.autoGenerated) {
            await db.collection('rag_knowledge_base').doc(id).delete();
            deleted++;
          }
        }
      } else if (action.type === 'merge' && action.chunkIds?.length > 1) {
        // Keep first, delete rest (only auto-generated ones)
        for (let i = 1; i < action.chunkIds.length; i++) {
          const doc = await db.collection('rag_knowledge_base').doc(action.chunkIds[i]).get();
          if (doc.exists && doc.data()?.metadata?.autoGenerated) {
            await db.collection('rag_knowledge_base').doc(action.chunkIds[i]).delete();
            merged++;
          }
        }
      }
    }

    return {
      success: true,
      summary: result.summary || 'Reorganization complete',
      deleted,
      merged,
      totalChunks: chunks.length,
      autoChunks: autoChunks.length,
      cost
    };
  } catch (err) {
    console.error('[orchestrator] Knowledge reorganization failed:', err.message);
    return { success: false, error: err.message };
  }
}

// ============ LLM DECISION ENGINE ============

async function makeDecisions(state) {
  const systemPrompt = `You are Azoni AI, the central orchestrator for a portfolio of AI agents and projects built by a software engineer named Azoni. You run every 3 hours and your job is to:

1. Analyze the current state of all systems
2. Decide what actions to take
3. Explain your reasoning

Available actions (respond with a JSON array of actions):
- { "action": "trigger_blog", "date": "YYYY-MM-DD", "reason": "..." } — Generate a blog post for a date that has commits but no blog
- { "action": "share_blog", "blogTitle": "...", "reason": "..." } — Tell social agent to share a recent blog post on Moltbook
- { "action": "flag_health", "system": "...", "issue": "...", "reason": "..." } — Log a system health concern
- { "action": "log_milestone", "title": "...", "description": "...", "reason": "..." } — Highlight a notable achievement or milestone
- { "action": "fill_knowledge_gap", "gapId": "...", "gapQuery": "...", "gapIntent": "...", "reason": "..." } — Generate a new RAG knowledge chunk to fill a chatbot knowledge gap. Use GPT-4o to create high-quality content.
- { "action": "self_assessment", "reason": "..." } — Generate a weekly self-assessment of system health, chatbot performance, and recommendations. Only do this once per week.
- { "action": "reorganize_knowledge", "reason": "..." } — Review and clean up the RAG knowledge base. Merge duplicate auto-generated chunks, remove low-quality ones. Run when auto-generated chunks exceed 30 or weekly.
- { "action": "review_errors", "reason": "..." } — Acknowledge and summarize error patterns. Flag recurring issues or critical failures. Mark errors as reviewed.
- { "action": "none", "reason": "..." } — No action needed, explain why

Rules:
- Don't trigger a blog if one was already generated today
- Blog generation is only allowed between 10am–8pm Pacific (17:00–04:00 UTC). Outside this window, skip it.
- Don't share a blog on Moltbook if social agent already posted about it
- Only flag health issues if something seems genuinely broken (agent offline, zero activity for 24h+)
- Log milestones for things like commit streaks, new project launches, unusual activity spikes
- Fill knowledge gaps when there are unresolved gaps. Pick the most impactful 1-2 gaps per cycle (don't fill more than 2 at a time). Prioritize gaps that seem like recruiter questions.
- Only run self_assessment if the last one was more than 5 days ago (or never)
- Run reorganize_knowledge when auto-generated chunks exceed 30, or if it hasn't been done in 7+ days. Never run it more than once per cycle.
- Be conservative — don't spam actions. Quality over quantity.
- Always return valid JSON: { "reasoning": "...", "actions": [...] }`;

  const userMessage = `Current time: ${new Date().toISOString()}

SYSTEM STATE:

## GitHub Activity (today)
${state.github ? `${state.github.totalCommits} commits across ${state.github.activeRepos.length} repos: ${state.github.activeRepos.map(r => `${r.name} (${r.commits})`).join(', ')}` : 'Unable to fetch'}

## Recent Blog Posts (last 48h)
${state.blogs.length > 0 ? state.blogs.map(b => `- "${b.title}" (${b.publishedAt}, auto: ${b.autoGenerated})`).join('\n') : 'No blog posts in last 48h'}

## Agent Activity (last 24h)
${state.activity.length > 0 ? state.activity.slice(0, 20).map(a => `- [${a.source}] ${a.type}: ${a.title}${a.description ? ' — ' + a.description : ''} (${a.timestamp})`).join('\n') : 'No activity in last 24h'}

## Moltbook Social Agent
${state.moltbook.online ? `Online. Mode: ${state.moltbook.autonomous_mode ? 'Autonomous' : 'Manual'}. Status: ${state.moltbook.moltbook_status || 'unknown'}` : `OFFLINE — ${state.moltbook.error}`}

## Fitness (BenchPressOnly via MCP)
${state.fitness ? JSON.stringify(state.fitness, null, 2) : 'MCP server unreachable'}

## Chatbot Performance (72h)
${state.chatStats ? `${state.chatStats.totalChats} conversations, $${state.chatStats.totalCost} spent
Intent breakdown: ${JSON.stringify(state.chatStats.intentBreakdown)}
Low-score queries: ${state.chatStats.lowScoreQueries?.join('; ') || 'none'}` : 'No chat data'}

## Knowledge Gaps (unresolved)
${state.knowledgeGaps.length > 0 ? state.knowledgeGaps.slice(0, 10).map(g => `- [${g.id}] "${g.query}" (intent: ${g.intent}, score: ${g.bestRetrievalScore})`).join('\n') : 'No unresolved gaps'}

## RAG Knowledge Base Health
${state.ragHealth ? `${state.ragHealth.totalChunks} chunks (${state.ragHealth.autoGenerated} auto-generated, ${state.ragHealth.withEmbedding} embedded, ${state.ragHealth.withoutEmbedding} without)
Categories: ${JSON.stringify(state.ragHealth.categories)}` : 'Unable to check'}

## Last Self-Assessment
${state.lastAssessment ? state.lastAssessment.toISOString() : 'Never — should run one'}

## Error Logs (last 24h)
${state.recentErrors?.total > 0 ? `${state.recentErrors.total} errors (${state.recentErrors.unresolved} unresolved)
By severity: ${JSON.stringify(state.recentErrors.bySeverity)}
By source: ${JSON.stringify(state.recentErrors.bySource)}
Recent errors:
${(state.recentErrors.recent || []).map(e => `- [${e.severity.toUpperCase()}] ${e.source}: ${e.error.slice(0, 120)}${e.context?.function ? ` (in ${e.context.function})` : ''}`).join('\n')}` : 'No errors in the last 24 hours ✓'}

## Last Orchestrator Run
${state.lastRun ? state.lastRun.toISOString() : 'First run'}

## Service Health Checks
${state.healthChecks && state.healthChecks.length > 0 ? state.healthChecks.map(h => `- ${h.name}: ${h.status.toUpperCase()} (${h.latencyMs}ms)${h.error ? ' — ' + h.error : ''}`).join('\n') : 'Health checks unavailable'}

Analyze this state and decide what actions to take. Return JSON only.`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni AI Orchestrator'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    // Track cost
    const usage = data.usage || {};
    const cost = (usage.prompt_tokens || 0) * 0.00000015 + (usage.completion_tokens || 0) * 0.0000006;

    const parsed = JSON.parse(content);
    return {
      reasoning: parsed.reasoning || '',
      actions: parsed.actions || [],
      model: 'gpt-4o-mini',
      tokens: { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens },
      cost
    };
  } catch (err) {
    console.error('[orchestrator] LLM decision failed:', err.message);
    return { reasoning: `LLM call failed: ${err.message}`, actions: [], cost: 0 };
  }
}

// ============ MAIN HANDLER ============

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('[orchestrator] Starting Azoni AI orchestration cycle');

  if (!OPENROUTER_API_KEY) {
    console.error('[orchestrator] OPENROUTER_API_KEY not set — cannot make decisions');
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' })
    };
  }

  try {
    // 1. Observe — gather state from all systems
    await logStep(
      'agent_observing',
      'Scanning all systems',
      'Checking GitHub, agents, fitness data, recent activity, and service health',
      'Starting orchestration cycle — need to understand current state before making decisions'
    );

    const [activity, blogs, github, moltbook, fitness, lastRun, knowledgeGaps, chatStats, ragHealth, lastAssessment, recentErrors, healthChecks] = await Promise.all([
      getRecentActivity(24),
      getRecentBlogPosts(48),
      getTodayCommitCount(),
      getMoltbookAgentStatus(),
      getFitnessSummary(),
      getLastOrchestratorRun(),
      getKnowledgeGaps(20),
      getChatStats(72),
      getRagHealth(),
      getLastSelfAssessment(),
      getRecentErrors(24),
      checkServiceHealth()
    ]);

    const state = { activity, blogs, github, moltbook, fitness, lastRun, knowledgeGaps, chatStats, ragHealth, lastAssessment, recentErrors, healthChecks };

    console.log('[orchestrator] State gathered:', {
      activityCount: activity.length,
      blogCount: blogs.length,
      commits: github?.totalCommits,
      moltbookOnline: moltbook.online,
      fitnessAvailable: !!fitness,
      knowledgeGaps: knowledgeGaps.length,
      chatCount: chatStats?.totalChats || 0,
      ragChunks: ragHealth?.totalChunks || 0,
      errors: recentErrors?.total || 0,
      servicesHealthy: healthChecks?.filter(h => h.status === 'healthy').length || 0,
      servicesDown: healthChecks?.filter(h => h.status === 'down').length || 0
    });

    // 2. Decide — send state to LLM for analysis
    await logStep(
      'agent_deciding',
      `Analyzing ${activity.length} events`,
      `${github?.totalCommits || 0} commits today, ${blogs.length} blog posts, social agent ${moltbook.online ? 'online' : 'offline'}, ${healthChecks?.filter(h => h.status === 'healthy').length || 0}/${healthChecks?.length || 0} services healthy`,
      'Sending system state to LLM for analysis and action planning'
    );

    const decision = await makeDecisions(state);

    console.log('[orchestrator] LLM raw decision:', {
      reasoning: decision.reasoning,
      actionCount: decision.actions.length,
      actions: decision.actions.map(a => a.action),
      cost: decision.cost
    });

    // 2b. Validate — reject unknown/malformed actions
    const validatedActions = validateActions(decision.actions);
    const skippedCount = decision.actions.length - validatedActions.length;
    if (skippedCount > 0) {
      console.log(`[orchestrator] Validation removed ${skippedCount} invalid action(s)`);
    }

    // 2c. Rate-limit — prevent spam across cycles
    const finalActions = applyRateLimits(validatedActions, activity);
    const rateLimitedCount = validatedActions.length - finalActions.length;
    if (rateLimitedCount > 0) {
      console.log(`[orchestrator] Rate limiting removed ${rateLimitedCount} action(s)`);
      await logStep(
        'agent_deciding',
        `Rate-limited ${rateLimitedCount} action(s)`,
        `Validated ${validatedActions.length} actions, rate-limited ${rateLimitedCount}. Final: [${finalActions.map(a => a.action).join(', ')}]`,
        'Preventing action spam — some actions were recently performed'
      );
    }

    // 3. Act — execute decided actions
    const results = [];

    for (const action of finalActions) {
      console.log(`[orchestrator] Executing action: ${action.action}`);

      switch (action.action) {
        case 'trigger_blog': {
          // Hard guard: only allow blog triggers 10am–8pm Pacific (UTC-8)
          const ptHour = new Date().getUTCHours() - 8;
          const ptHourNorm = ptHour < 0 ? ptHour + 24 : ptHour;
          if (ptHourNorm < 10 || ptHourNorm >= 20) {
            console.log(`[orchestrator] Blocked blog trigger — ${ptHourNorm}:00 PT is outside 10am–8pm window`);
            results.push({ action: 'trigger_blog', blocked: true, reason: 'Outside allowed hours' });
            await logStep(
              'agent_deciding',
              'Skipped blog trigger — outside hours',
              `${ptHourNorm}:00 PT is outside the 10am–8pm blog generation window`,
              action.reason,
              { date: action.date, blocked: true }
            );
            break;
          }
          const blogResult = await triggerBlogGeneration(action.date);
          results.push({ action: 'trigger_blog', ...blogResult });
          if (blogResult.skipped) {
            await logStep(
              'agent_deciding',
              `Blog skipped for ${action.date}`,
              blogResult.message || 'Already exists or no commits',
              action.reason,
              { date: action.date, skipped: true }
            );
          } else {
            await logStep(
              blogResult.success ? 'blog_published' : 'agent_deciding',
              blogResult.success
                ? `Published blog for ${action.date}`
                : `Blog generation failed for ${action.date}`,
              blogResult.success
                ? `Blog post generated and published for ${action.date}`
                : `Error: ${blogResult.error || blogResult.message || 'unknown'}`,
              action.reason,
              { date: action.date, result: blogResult }
            );
          }
          break;
        }

        case 'share_blog': {
          const shareResult = await nudgeSocialAgent(
            `New blog post to share: "${action.blogTitle}"`,
            { action: 'share_blog', blogTitle: action.blogTitle }
          );
          results.push({ action: 'share_blog', ...shareResult });
          await logStep(
            'agent_drafting',
            `Recommended sharing: ${action.blogTitle}`,
            action.reason,
            `Notified social agent to share recent blog post. ${shareResult.sent ? 'Trigger sent.' : shareResult.note || 'Agent unreachable.'}`,
            { blogTitle: action.blogTitle, result: shareResult }
          );
          break;
        }

        case 'flag_health': {
          results.push({ action: 'flag_health', system: action.system });
          await logStep(
            'agent_deciding',
            `Health alert: ${action.system}`,
            action.issue,
            action.reason,
            { system: action.system, issue: action.issue }
          );
          break;
        }

        case 'log_milestone': {
          results.push({ action: 'log_milestone', title: action.title });
          await logStep(
            'project_updated',
            action.title,
            action.description,
            action.reason,
            { milestone: true }
          );
          break;
        }

        case 'none':
        default: {
          results.push({ action: 'none', reason: action.reason });
          break;
        }

        case 'fill_knowledge_gap': {
          const gapResult = await fillKnowledgeGap(action.gapQuery, action.gapIntent);
          results.push({ action: 'fill_knowledge_gap', ...gapResult });
          
          if (gapResult.success && action.gapId) {
            await markGapResolved(action.gapId);
          }

          await logStep(
            'knowledge_generated',
            gapResult.success 
              ? `Created knowledge chunk: ${gapResult.title}` 
              : `Failed to fill knowledge gap`,
            gapResult.success
              ? `Generated "${gapResult.title}" (${gapResult.category}) to answer: "${action.gapQuery?.slice(0, 100)}"`
              : `Error: ${gapResult.error}`,
            action.reason,
            { 
              gapQuery: action.gapQuery, 
              gapIntent: action.gapIntent, 
              chunkId: gapResult.chunkId,
              cost: gapResult.cost,
              model: 'gpt-4o'
            }
          );
          break;
        }

        case 'self_assessment': {
          const assessment = await generateSelfAssessment(state);
          results.push({ action: 'self_assessment', ...assessment });

          if (!assessment.error) {
            await logStep(
              'self_assessment',
              `Self-assessment: ${assessment.overall_health || 'complete'}`,
              [
                `Working well: ${(assessment.working_well || []).join('; ')}`,
                `Needs improvement: ${(assessment.needs_improvement || []).join('; ')}`,
                `Recommendations: ${(assessment.recommendations || []).join('; ')}`
              ].join('\n\n'),
              action.reason,
              {
                overall_health: assessment.overall_health,
                working_well: assessment.working_well,
                needs_improvement: assessment.needs_improvement,
                recommendations: assessment.recommendations,
                cost: assessment.cost,
                model: 'gpt-4o'
              }
            );
          }
          break;
        }

        case 'reorganize_knowledge': {
          const reorgResult = await reorganizeKnowledge();
          results.push({ action: 'reorganize_knowledge', ...reorgResult });

          await logStep(
            'knowledge_generated',
            reorgResult.success
              ? `Reorganized knowledge base: ${reorgResult.deleted} removed, ${reorgResult.merged} merged`
              : 'Knowledge reorganization failed',
            reorgResult.summary || reorgResult.error,
            action.reason,
            {
              deleted: reorgResult.deleted,
              merged: reorgResult.merged,
              totalChunks: reorgResult.totalChunks,
              autoChunks: reorgResult.autoChunks,
              cost: reorgResult.cost
            }
          );
          break;
        }

        case 'review_errors': {
          // Summarize and mark errors as reviewed
          const errorsData = state.recentErrors;
          if (errorsData && errorsData.total > 0) {
            // Mark unresolved errors as resolved
            const unresolvedSnapshot = await db.collection('error_logs')
              .where('resolved', '==', false)
              .limit(30)
              .get();
            
            const batch = db.batch();
            let resolved = 0;
            unresolvedSnapshot.docs.forEach(doc => {
              batch.update(doc.ref, { resolved: true, resolvedAt: admin.firestore.FieldValue.serverTimestamp() });
              resolved++;
            });
            if (resolved > 0) await batch.commit();

            // Build summary for activity feed
            const sourceSummary = Object.entries(errorsData.bySource || {})
              .map(([src, count]) => `${src}: ${count}`)
              .join(', ');
            const severitySummary = Object.entries(errorsData.bySeverity || {})
              .filter(([, count]) => count > 0)
              .map(([sev, count]) => `${count} ${sev}`)
              .join(', ');

            await logStep(
              'error_reviewed',
              `Reviewed ${errorsData.total} errors (${severitySummary})`,
              `Sources: ${sourceSummary}\n\nTop errors:\n${(errorsData.recent || []).slice(0, 5).map(e => `• [${e.severity}] ${e.source}: ${e.error.slice(0, 100)}`).join('\n')}\n\nMarked ${resolved} errors as resolved.`,
              action.reason,
              {
                totalErrors: errorsData.total,
                resolved,
                bySeverity: errorsData.bySeverity,
                bySource: errorsData.bySource
              }
            );

            results.push({ action: 'review_errors', resolved, total: errorsData.total });
          } else {
            results.push({ action: 'review_errors', resolved: 0, note: 'No errors to review' });
          }
          break;
        }
      }
    }

    // 4. Final summary log
    const executedActions = finalActions.filter(a => a.action !== 'none');
    const healthyCount = healthChecks?.filter(h => h.status === 'healthy').length || 0;
    const totalServices = healthChecks?.length || 0;

    const summaryParts = [];
    if (executedActions.length > 0) {
      summaryParts.push(`Executed ${executedActions.length} action${executedActions.length > 1 ? 's' : ''}: ${executedActions.map(a => a.action).join(', ')}`);
    }
    if (skippedCount > 0) summaryParts.push(`${skippedCount} invalid rejected`);
    if (rateLimitedCount > 0) summaryParts.push(`${rateLimitedCount} rate-limited`);
    const summaryTitle = summaryParts.length > 0
      ? summaryParts.join(' · ')
      : 'All systems nominal — no action needed';

    await logStep(
      'orchestrator_summary',
      summaryTitle,
      decision.reasoning,
      `Cycle complete. ${activity.length} events, ${github?.totalCommits || 0} commits, ${blogs.length} blogs. Services: ${healthyCount}/${totalServices} healthy. LLM proposed ${decision.actions.length} → validated ${validatedActions.length} → executed ${finalActions.length}. Cost: $${decision.cost?.toFixed(6) || '0'}`,
      {
        proposed: decision.actions.length,
        validated: validatedActions.length,
        executed: finalActions.length,
        skipped: skippedCount,
        rateLimited: rateLimitedCount,
        totalEvents: activity.length,
        commits: github?.totalCommits || 0,
        servicesHealthy: healthyCount,
        servicesTotal: totalServices,
        cost: decision.cost,
        model: decision.model
      }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reasoning: decision.reasoning,
        actions: { proposed: decision.actions, executed: finalActions },
        validation: { proposed: decision.actions.length, validated: validatedActions.length, executed: finalActions.length, skipped: skippedCount, rateLimited: rateLimitedCount },
        results,
        cost: decision.cost,
        state: {
          activityCount: activity.length,
          blogCount: blogs.length,
          commits: github?.totalCommits,
          moltbookOnline: moltbook.online,
          knowledgeGaps: knowledgeGaps.length,
          chatConversations: chatStats?.totalChats || 0,
          ragChunks: ragHealth?.totalChunks || 0,
          serviceHealth: {
            total: healthChecks?.length || 0,
            healthy: healthChecks?.filter(h => h.status === 'healthy').length || 0,
            down: healthChecks?.filter(h => h.status === 'down').length || 0,
            services: healthChecks?.map(h => ({ name: h.name, status: h.status, latencyMs: h.latencyMs })) || []
          }
        }
      })
    };

  } catch (error) {
    console.error('[orchestrator] Error:', error);
    await logError('orchestrator', error.message, 'high', { function: 'main-handler' });

    await logStep(
      'agent_deciding',
      'Orchestration cycle failed',
      error.message,
      `Encountered an error during orchestration: ${error.message}. Will retry next cycle.`,
      { error: error.message }
    );

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Netlify Scheduled Function: every 3 hours
exports.config = {
  schedule: "0 */3 * * *"
};