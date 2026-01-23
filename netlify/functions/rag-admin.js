// netlify/functions/rag-admin.js
// Admin API for RAG knowledge base management

const admin = require('firebase-admin');

// Initialize Firebase Admin
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
const COLLECTION = 'rag_knowledge_base';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// ===== MAIN HANDLER =====
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path.replace('/.netlify/functions/rag-admin', '');
    const body = event.body ? JSON.parse(event.body) : {};

    // Route handling
    switch (true) {
      // GET /chunks - List all chunks
      case event.httpMethod === 'GET' && path === '/chunks':
        return await listChunks(headers);

      // GET /chunks/:id - Get single chunk
      case event.httpMethod === 'GET' && path.startsWith('/chunks/'):
        return await getChunk(path.split('/')[2], headers);

      // POST /chunks - Create new chunk
      case event.httpMethod === 'POST' && path === '/chunks':
        return await createChunk(body, headers);

      // PUT /chunks/:id - Update chunk
      case event.httpMethod === 'PUT' && path.startsWith('/chunks/'):
        return await updateChunk(path.split('/')[2], body, headers);

      // DELETE /chunks/:id - Delete chunk
      case event.httpMethod === 'DELETE' && path.startsWith('/chunks/'):
        return await deleteChunk(path.split('/')[2], headers);

      // POST /chunks/:id/embed - Re-embed single chunk
      case event.httpMethod === 'POST' && path.endsWith('/embed'):
        const embedId = path.split('/')[2];
        return await embedChunk(embedId, headers);

      // POST /embed-all - Re-embed all chunks
      case event.httpMethod === 'POST' && path === '/embed-all':
        return await embedAllChunks(headers);

      // POST /test-retrieval - Test retrieval with a query
      case event.httpMethod === 'POST' && path === '/test-retrieval':
        return await testRetrieval(body, headers);

      // POST /test-intent - Test intent detection
      case event.httpMethod === 'POST' && path === '/test-intent':
        return await testIntent(body, headers);

      // GET /stats - Get RAG system stats
      case event.httpMethod === 'GET' && path === '/stats':
        return await getStats(headers);

      // POST /seed-defaults - Seed default knowledge chunks
      case event.httpMethod === 'POST' && path === '/seed-defaults':
        return await seedDefaults(headers);

      default:
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
    }

  } catch (error) {
    console.error('RAG Admin error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// ===== CRUD OPERATIONS =====

async function listChunks(headers) {
  const snapshot = await db.collection(COLLECTION)
    .orderBy('category')
    .orderBy('title')
    .get();

  const chunks = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    // Don't send full embedding to frontend (too large)
    embedding: doc.data().embedding ? {
      exists: true,
      dimensions: doc.data().embedding.length
    } : null
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ chunks, count: chunks.length })
  };
}

async function getChunk(id, headers) {
  const doc = await db.collection(COLLECTION).doc(id).get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chunk not found' }) };
  }

  const data = doc.data();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      id: doc.id,
      ...data,
      embedding: data.embedding ? {
        exists: true,
        dimensions: data.embedding.length,
        sample: data.embedding.slice(0, 10) // First 10 values for debugging
      } : null
    })
  };
}

async function createChunk(body, headers) {
  const { category, title, content, metadata = {}, autoEmbed = true } = body;

  if (!category || !title || !content) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing required fields: category, title, content' })
    };
  }

  // Calculate token estimate
  const tokenEstimate = Math.ceil(content.length / 4);

  const chunkData = {
    category,
    title,
    content,
    metadata,
    tokenEstimate,
    embedding: null,
    embeddedAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection(COLLECTION).add(chunkData);

  // Auto-embed if requested
  let embeddingResult = null;
  if (autoEmbed) {
    embeddingResult = await generateAndStoreEmbedding(docRef.id, content);
  }

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      id: docRef.id,
      ...chunkData,
      embeddingResult
    })
  };
}

async function updateChunk(id, body, headers) {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chunk not found' }) };
  }

  const { category, title, content, metadata, autoEmbed = true } = body;
  const oldContent = doc.data().content;

  const updates = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (category !== undefined) updates.category = category;
  if (title !== undefined) updates.title = title;
  if (content !== undefined) {
    updates.content = content;
    updates.tokenEstimate = Math.ceil(content.length / 4);
  }
  if (metadata !== undefined) updates.metadata = metadata;

  await docRef.update(updates);

  // Re-embed if content changed
  let embeddingResult = null;
  if (content && content !== oldContent && autoEmbed) {
    embeddingResult = await generateAndStoreEmbedding(id, content);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      id,
      updated: true,
      contentChanged: content !== oldContent,
      embeddingResult
    })
  };
}

async function deleteChunk(id, headers) {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chunk not found' }) };
  }

  await docRef.delete();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ id, deleted: true })
  };
}

// ===== EMBEDDING OPERATIONS =====

async function getEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000)
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`OpenAI error: ${data.error.message}`);
  }

  return {
    embedding: data.data[0].embedding,
    usage: data.usage
  };
}

async function generateAndStoreEmbedding(chunkId, content) {
  const startTime = Date.now();

  try {
    const { embedding, usage } = await getEmbedding(content);

    await db.collection(COLLECTION).doc(chunkId).update({
      embedding,
      embeddedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastEmbeddingModel: EMBEDDING_MODEL,
      lastEmbeddingTokens: usage.total_tokens
    });

    return {
      success: true,
      dimensions: embedding.length,
      tokens: usage.total_tokens,
      cost: (usage.total_tokens / 1000000 * 0.02).toFixed(6),
      latencyMs: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function embedChunk(id, headers) {
  const doc = await db.collection(COLLECTION).doc(id).get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chunk not found' }) };
  }

  const result = await generateAndStoreEmbedding(id, doc.data().content);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ id, ...result })
  };
}

async function embedAllChunks(headers) {
  const snapshot = await db.collection(COLLECTION).get();
  const results = [];
  let totalTokens = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const doc of snapshot.docs) {
    const result = await generateAndStoreEmbedding(doc.id, doc.data().content);
    results.push({
      id: doc.id,
      title: doc.data().title,
      ...result
    });

    if (result.success) {
      successCount++;
      totalTokens += result.tokens;
    } else {
      errorCount++;
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      total: snapshot.docs.length,
      success: successCount,
      errors: errorCount,
      totalTokens,
      totalCost: (totalTokens / 1000000 * 0.02).toFixed(6),
      results
    })
  };
}

// ===== RETRIEVAL TESTING =====

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function testRetrieval(body, headers) {
  const { query, topK = 5, threshold = 0.0, category = null } = body;

  if (!query) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing query' }) };
  }

  const startTime = Date.now();

  // Get query embedding
  const { embedding: queryEmbedding, usage } = await getEmbedding(query);
  const embedTime = Date.now() - startTime;

  // Fetch all chunks
  let chunksQuery = db.collection(COLLECTION);
  if (category) {
    chunksQuery = chunksQuery.where('category', '==', category);
  }
  const snapshot = await chunksQuery.get();

  // Calculate similarities
  const results = snapshot.docs
    .filter(doc => doc.data().embedding)
    .map(doc => {
      const data = doc.data();
      const similarity = cosineSimilarity(queryEmbedding, data.embedding);
      return {
        id: doc.id,
        title: data.title,
        category: data.category,
        similarity: parseFloat(similarity.toFixed(4)),
        tokenEstimate: data.tokenEstimate,
        preview: data.content.slice(0, 200) + (data.content.length > 200 ? '...' : '')
      };
    })
    .filter(r => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  const totalTime = Date.now() - startTime;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      query,
      topK,
      threshold,
      category,
      results,
      stats: {
        chunksSearched: snapshot.docs.length,
        chunksWithEmbeddings: snapshot.docs.filter(d => d.data().embedding).length,
        resultsReturned: results.length,
        queryTokens: usage.total_tokens,
        embedLatencyMs: embedTime,
        totalLatencyMs: totalTime,
        queryCost: (usage.total_tokens / 1000000 * 0.02).toFixed(6)
      }
    })
  };
}

// ===== INTENT DETECTION =====

function detectIntent(message) {
  const lower = message.toLowerCase();

  const intents = {
    job_analysis: {
      keywords: ['responsibilities', 'requirements', 'qualifications', 'experience required', 'we are looking', 'ideal candidate', 'job description', 'role:', 'about the role'],
      lengthThreshold: 400
    },
    contact: {
      keywords: ['email', 'phone', 'contact', 'linkedin', 'github', 'reach', 'hire']
    },
    project_specific: {
      keywords: ['embedroute', 'row crew', 'rowcrew', 'bench only', 'benchonly', 'old ways', 'oldways', 'tcgdoku', 'dumarket', 'azoni.ai', 'dustbunny', 'oli fitness']
    },
    projects: {
      keywords: ['project', 'built', 'portfolio', 'app', 'shipped', 'work on', 'created', 'developed']
    },
    experience: {
      keywords: ['experience', 'work history', 'previous job', 'capital one', 't-mobile', 'tmobile', 'career', 'background']
    },
    skills: {
      keywords: ['skill', 'tech', 'stack', 'language', 'framework', 'know', 'proficient', 'python', 'react', 'javascript', 'ai', 'ml', 'database']
    },
    hire: {
      keywords: ['hire', 'why', 'strength', 'weakness', 'good at', 'best at', 'stand out']
    }
  };

  // Check job analysis first (length-based)
  if (message.length > intents.job_analysis.lengthThreshold ||
      intents.job_analysis.keywords.some(kw => lower.includes(kw))) {
    return { intent: 'job_analysis', confidence: 'high', matchedKeywords: intents.job_analysis.keywords.filter(kw => lower.includes(kw)) };
  }

  // Check other intents
  for (const [intent, config] of Object.entries(intents)) {
    if (intent === 'job_analysis') continue;
    const matches = config.keywords.filter(kw => lower.includes(kw));
    if (matches.length > 0) {
      return {
        intent,
        confidence: matches.length > 2 ? 'high' : 'medium',
        matchedKeywords: matches
      };
    }
  }

  return { intent: 'general', confidence: 'low', matchedKeywords: [] };
}

async function testIntent(body, headers) {
  const { query } = body;

  if (!query) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing query' }) };
  }

  const result = detectIntent(query);

  // Get recommended retrieval settings for this intent
  const retrievalSettings = {
    job_analysis: { topK: 12, categories: ['bio', 'experience', 'project', 'skill'] },
    contact: { topK: 2, categories: ['bio'] },
    project_specific: { topK: 4, categories: ['project'] },
    projects: { topK: 8, categories: ['project', 'experience'] },
    experience: { topK: 6, categories: ['experience', 'bio'] },
    skills: { topK: 5, categories: ['skill'] },
    hire: { topK: 6, categories: ['bio', 'faq'] },
    general: { topK: 5, categories: null }
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      query,
      queryLength: query.length,
      ...result,
      recommendedRetrieval: retrievalSettings[result.intent] || retrievalSettings.general
    })
  };
}

// ===== STATS =====

async function getStats(headers) {
  const snapshot = await db.collection(COLLECTION).get();

  const stats = {
    totalChunks: 0,
    chunksWithEmbeddings: 0,
    chunksMissingEmbeddings: 0,
    totalTokens: 0,
    byCategory: {},
    recentlyUpdated: [],
    oldestEmbedding: null,
    newestEmbedding: null
  };

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    stats.totalChunks++;

    if (data.embedding) {
      stats.chunksWithEmbeddings++;
    } else {
      stats.chunksMissingEmbeddings++;
    }

    stats.totalTokens += data.tokenEstimate || 0;

    // By category
    if (!stats.byCategory[data.category]) {
      stats.byCategory[data.category] = { count: 0, tokens: 0 };
    }
    stats.byCategory[data.category].count++;
    stats.byCategory[data.category].tokens += data.tokenEstimate || 0;
  });

  // Estimate costs
  stats.estimatedEmbeddingCost = (stats.totalTokens / 1000000 * 0.02).toFixed(4);
  stats.estimatedQueryCost = '~$0.0005 per query';

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(stats)
  };
}

// ===== SEED DEFAULTS =====

async function seedDefaults(headers) {
  const defaultChunks = [
    {
      category: 'bio',
      title: 'Professional Summary',
      content: `Charlton Smith is a software engineer with 7+ years of experience, currently building AI-powered applications independently in Seattle. He's shipped 6+ production apps in the past year, all live with real users.

Background: Co-founded a fitness startup (OLI Fitness, published at ACM CHI 2017), worked at Capital One and T-Mobile on internal tools and automation, ran an automated NFT trading operation processing 2,500 bids/minute across 50 machines.

Education: M.S. Software Engineering from Colorado Technical University (2021), B.S. Computer Science from University of Washington Tacoma (2017, graduated with honors).

Philosophy: "Proof of work over claims of work." Ships fast, iterates based on real user feedback, values craft and end-to-end ownership.`,
      metadata: { priority: 1, tags: ['summary', 'overview', 'about'] }
    },
    {
      category: 'bio',
      title: 'Contact Information',
      content: `Charlton Smith's contact information:
- Email: charltonuw@gmail.com
- Phone: (360) 349-1661
- Location: Seattle, WA
- LinkedIn: linkedin.com/in/charltonsmith
- GitHub: github.com/azoni
- Portfolio: azoni.ai`,
      metadata: { priority: 1, tags: ['contact', 'email', 'phone', 'linkedin', 'github'] }
    },
    {
      category: 'bio',
      title: 'What Charlton is Looking For',
      content: `Charlton is looking for software engineering roles focused on:
- AI-powered tools and applications
- End-to-end ownership from design to deployment
- Teams that care about craft and shipping quality software
- Fast iteration based on real user feedback

Ideal companies: AI companies (Anthropic, OpenAI), developer tools (Vercel, Netlify, Supabase, Replit), or startups building with AI. Prefers roles that value shipping over process.`,
      metadata: { priority: 2, tags: ['looking-for', 'job-search', 'goals'] }
    },
    {
      category: 'skill',
      title: 'AI and Machine Learning',
      content: `Charlton's AI/ML experience:
- OpenAI APIs: GPT-4o, GPT-4o-mini, text-embedding-3-small for semantic search and RAG
- Anthropic Claude: Claude Vision API for image analysis (extracts workout data from photos in Row Crew)
- RAG Systems: Built semantic search with embeddings + cosine similarity (Old Ways Today, portfolio chatbot)
- Embeddings: Experience with OpenAI, Voyage AI, Cohere, Mistral (building EmbedRoute unified API)
- Prompt Engineering: System prompts, few-shot examples, structured outputs
- LLM Agents: Built Discord/Twitter bots with memory, tool use, and agentic decision-making`,
      metadata: { priority: 1, tags: ['ai', 'ml', 'llm', 'openai', 'claude', 'rag'] }
    },
    {
      category: 'skill',
      title: 'Frontend Development',
      content: `Charlton's frontend skills:
- React 18: Hooks, Context, Suspense, Error Boundaries, lazy loading
- Next.js 14: App Router, Server Components, SSR/SSG for SEO
- Styling: Tailwind CSS, CSS variables, Framer Motion animations
- PWA Development: Service workers, offline support, iOS safe area handling (Row Crew, Bench Only)
- Build Tools: Vite, webpack`,
      metadata: { priority: 1, tags: ['frontend', 'react', 'nextjs', 'tailwind', 'pwa'] }
    },
    {
      category: 'skill',
      title: 'Backend Development',
      content: `Charlton's backend skills:
- Python: FastAPI, Django (used at T-Mobile)
- Node.js: Netlify Functions, serverless APIs
- Databases: PostgreSQL, Firebase Firestore, Supabase, Redis, MongoDB, SQLite
- APIs: REST design, OpenAI/Claude integration, third-party API consumption
- Cloud: AWS (Lambda, EC2, S3, CloudWatch), Netlify, Vercel, Render`,
      metadata: { priority: 1, tags: ['backend', 'python', 'nodejs', 'database', 'aws'] }
    },
    {
      category: 'project',
      title: 'EmbedRoute',
      content: `EmbedRoute - Unified Embedding API Gateway (https://www.embedroute.com)

A unified API gateway for text embeddings. One endpoint to access OpenAI, Voyage AI, Cohere, and Mistral. OpenAI SDK-compatible—switch providers by changing two lines of code.

Problem solved: Provider lock-in, SDK fragmentation, billing complexity across embedding providers.

Tech: Next.js 14, TypeScript, Supabase (PostgreSQL with Row Level Security), Tailwind CSS, Vercel.

Features:
- 8 embedding models across 4 providers
- Server-side rendering for GEO (AI crawler discoverability)
- Waitlist system with real-time validation
- API documentation with code examples in JS, Python, cURL
- Blog with SSR for SEO`,
      metadata: { priority: 1, url: 'https://www.embedroute.com', tech: ['Next.js', 'TypeScript', 'Supabase', 'Vercel'] }
    },
    {
      category: 'project',
      title: 'Old Ways Today',
      content: `Old Ways Today - AI Product Search Platform (https://oldwaystoday.com)

Full-stack platform helping families find non-toxic household products.

AI System:
- Semantic search using OpenAI embeddings (text-embedding-3-small)
- RAG pipeline with ~40% reduction in LLM context tokens
- Server-side cosine similarity ranking with PostgreSQL

Features:
- Blog CMS with markdown editor
- Admin dashboard (posts, products, comments, subscribers)
- Email subscription with SMTP
- Amazon affiliate integration
- Auto Twitter posting

Tech: React/Vite on Netlify, FastAPI/PostgreSQL on Render.`,
      metadata: { priority: 1, url: 'https://oldwaystoday.com', tech: ['React', 'FastAPI', 'PostgreSQL', 'OpenAI'] }
    },
    {
      category: 'project',
      title: 'Row Crew',
      content: `Row Crew - Social Fitness App with AI Verification (https://rowcrew.netlify.app)

Social fitness tracking for rowers with AI-powered workout verification.

AI Anti-Cheat System:
- Claude Vision API extracts meters, time, calories from rowing machine photos
- Multi-layer verification: AI confidence scoring, perceptual hash duplicate detection, behavioral analysis
- 15-minute cooldown between entries
- Immutable entries once verified

Features:
- 50+ achievements across distance, streaks, time, calories
- 8 challenge types (distance races, time trials, streaks, team goals)
- Group features with shareable invite codes
- Real-time leaderboards (global and group-filtered)
- Military-inspired rank progression

Stats: ~6,000 lines of React, 2M+ meters logged by users.

Tech: React, Firebase Firestore, Claude Vision API, PWA.`,
      metadata: { priority: 1, url: 'https://rowcrew.netlify.app', tech: ['React', 'Firebase', 'Claude Vision', 'PWA'] }
    },
    {
      category: 'project',
      title: 'Bench Only',
      content: `Bench Only - AI Strength Training PWA (https://benchpressonly.com)

Full-stack PWA with AI coach for bench press training.

AI Features:
- GPT-4o-mini powered coach for workout generation
- Progress analysis and recommendations
- Intelligent form autofill based on history
- 4 Netlify serverless functions for AI features

Features:
- Goal tracking with auto-completion detection
- Group training: assign workouts to athletes, shared calendars
- "Brutalist fitness" design: Bebas Neue typography, iron/gunmetal colors

Tech: React 18, Firebase Firestore, OpenAI API, Tailwind CSS, Framer Motion. PWA with offline support.`,
      metadata: { priority: 1, url: 'https://benchpressonly.com', tech: ['React', 'Firebase', 'OpenAI', 'PWA'] }
    },
    {
      category: 'experience',
      title: 'Independent Software Engineer',
      content: `Independent Software Engineer (November 2023 - Present)
Seattle, WA

Building AI-powered applications and developer tools independently. All projects live with active users.

Key accomplishments:
- Shipped 6+ production applications in one year
- EmbedRoute: Unified embedding API gateway (Next.js, Supabase, Vercel)
- Old Ways Today: AI product search with RAG pipeline
- Row Crew: Social fitness app with Claude Vision verification
- Bench Only: AI strength training PWA with GPT-4o-mini coach`,
      metadata: { priority: 1, company: 'Self-Employed', dates: '2023-present' }
    },
    {
      category: 'experience',
      title: 'Capital One - Senior Software Engineer',
      content: `Senior Software Engineer at Capital One (November 2022 - November 2023)
Remote

Worked on automated testing infrastructure for customer communications.

Key accomplishments:
- Maintained automated testing pipeline for customer email notifications
- Test cases stored as JSON in S3, executed via AWS Lambda, results in CloudWatch
- Designed JSON schema so new tests could be added without code changes
- Added Slack and email alerts for failure notifications
- Mentored summer intern through project scoping to deployment; intern shipped internal automation tool`,
      metadata: { priority: 1, company: 'Capital One', dates: '2022-2023' }
    },
    {
      category: 'experience',
      title: 'Dustbunny - Founder',
      content: `Founder at Dustbunny (September 2021 - June 2022)
Seattle, WA

Built and operated automated NFT bidding system at scale.

Key accomplishments:
- Distributed system across 50 machines processing ~2,500 bids per minute
- Redis cache for floor prices with pub/sub updates (sub-second lookups)
- Bidding logic with max bid safeguards, liquidity analysis, cooldown windows
- OpenSea SDK integration for order execution
- Deployed custom ERC-721 smart contract via Remix`,
      metadata: { priority: 1, company: 'Dustbunny', dates: '2021-2022' }
    },
    {
      category: 'experience',
      title: 'T-Mobile - Software Engineer II',
      content: `Software Engineer II at T-Mobile (June 2018 - April 2022)
Bellevue, WA

Built internal tools that significantly improved team productivity.

Key accomplishments:
- Built internal automation platform consolidating 4-5 separate tools into one interface
- Reduced manual work for network operations teams by over 80%
- Started as Python/Django monolith, later split into microservices
- Migrated frontend from Django templates to Angular with reusable components
- Contributed to org-wide migration from Jenkins to GitLab CI/CD`,
      metadata: { priority: 1, company: 'T-Mobile', dates: '2018-2022' }
    },
    {
      category: 'experience',
      title: 'OLI Fitness - Co-Founder',
      content: `Co-Founder & Technical Lead at OLI Fitness (January 2016 - March 2018)
Seattle, WA

Co-founded a fitness startup focused on preventing injuries during weightlifting.

Key accomplishments:
- Built real-time joint tracking using Microsoft Kinect SDK (C#) to analyze squat and deadlift form
- Scoring system comparing user joint angles to "good form" parameters defined with certified trainer
- Published extended abstract at ACM CHI 2017
- Princeton Tiger Launch regional finalist
- UW Business Plan Competition finalist
- Collision Alpha startup program alumni`,
      metadata: { priority: 2, company: 'OLI Fitness', dates: '2016-2018' }
    },
    {
      category: 'faq',
      title: 'Why Hire Charlton',
      content: `Why should you hire Charlton Smith?

1. Ships fast: 6+ production apps in the past year, all live with real users
2. Full-stack AI expertise: Builds end-to-end from React frontend to RAG pipelines to serverless APIs
3. Proven at scale: Ran distributed system processing 2,500 bids/minute across 50 machines
4. Internal tools impact: Built platform at T-Mobile that reduced team workload by 80%
5. Startup experience: Co-founded OLI Fitness, published at ACM CHI, Princeton Tiger Launch finalist
6. Continuous learner: M.S. while working full-time, constantly building new projects`,
      metadata: { priority: 1, tags: ['hire', 'strengths', 'why'] }
    },
    {
      category: 'faq',
      title: 'Weaknesses and Gaps',
      content: `Areas where Charlton has less experience:

- Mobile development: Focuses on PWAs rather than native iOS/Android
- Low-level systems: Less experience with C/C++, systems programming
- DevOps depth: Uses managed services (Netlify, Vercel, Render) rather than deep Kubernetes/infrastructure
- Large team leadership: Individual contributor or small team lead, not managing large engineering orgs

He's honest about gaps and quick to learn new domains when needed.`,
      metadata: { priority: 2, tags: ['weaknesses', 'gaps', 'honest'] }
    },
    {
      category: 'faq',
      title: 'Work Style',
      content: `Charlton's work style:

- "Proof of work over claims of work" - shows results, not just talks about them
- Ships fast and iterates based on real user feedback
- Prefers end-to-end ownership over narrow specialization
- Values craft and clean architecture
- Direct communication style, no fluff
- Works well independently but enjoys collaborative teams`,
      metadata: { priority: 2, tags: ['work-style', 'culture', 'values'] }
    }
  ];

  let created = 0;
  let errors = 0;

  for (const chunk of defaultChunks) {
    try {
      // Check if chunk with same title exists
      const existing = await db.collection(COLLECTION)
        .where('title', '==', chunk.title)
        .get();

      if (existing.empty) {
        const docRef = await db.collection(COLLECTION).add({
          ...chunk,
          tokenEstimate: Math.ceil(chunk.content.length / 4),
          embedding: null,
          embeddedAt: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Generate embedding
        await generateAndStoreEmbedding(docRef.id, chunk.content);
        created++;

        // Rate limiting
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (error) {
      console.error(`Error seeding ${chunk.title}:`, error);
      errors++;
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Seeding complete',
      created,
      skipped: defaultChunks.length - created - errors,
      errors
    })
  };
}