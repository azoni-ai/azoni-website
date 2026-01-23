// netlify/functions/rag-admin.js
// Admin API for RAG knowledge base management
// Requires Firebase Admin SDK credentials to function

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';

// Firebase Admin - check if credentials are available
let db = null;
let admin = null;
let initError = null;

function initFirebase() {
  if (db) return true;
  if (initError) return false;
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!projectId || !clientEmail || !privateKey) {
    initError = 'Firebase Admin SDK credentials not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to Netlify environment variables.';
    return false;
  }
  
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
    initError = `Firebase Admin initialization failed: ${error.message}`;
    return false;
  }
}

const COLLECTION = 'rag_knowledge_base';

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

  // Check Firebase initialization
  if (!initFirebase()) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ 
        error: 'RAG system not available',
        details: initError,
        setup: {
          required: ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'],
          instructions: 'Add these environment variables in Netlify: Site Settings > Environment Variables. Get them from Firebase Console > Project Settings > Service Accounts > Generate New Private Key.'
        }
      })
    };
  }

  try {
    const path = event.path.replace('/.netlify/functions/rag-admin', '');
    const body = event.body ? JSON.parse(event.body) : {};

    // Route handling
    switch (true) {
      case event.httpMethod === 'GET' && path === '/chunks':
        return await listChunks(headers);

      case event.httpMethod === 'GET' && path.startsWith('/chunks/'):
        return await getChunk(path.split('/')[2], headers);

      case event.httpMethod === 'POST' && path === '/chunks':
        return await createChunk(body, headers);

      case event.httpMethod === 'PUT' && path.startsWith('/chunks/'):
        return await updateChunk(path.split('/')[2], body, headers);

      case event.httpMethod === 'DELETE' && path.startsWith('/chunks/'):
        return await deleteChunk(path.split('/')[2], headers);

      case event.httpMethod === 'POST' && path.endsWith('/embed'):
        const embedId = path.split('/')[2];
        return await embedChunk(embedId, headers);

      case event.httpMethod === 'POST' && path === '/embed-all':
        return await embedAllChunks(headers);

      case event.httpMethod === 'POST' && path === '/test-retrieval':
        return await testRetrieval(body, headers);

      case event.httpMethod === 'POST' && path === '/test-intent':
        return await testIntent(body, headers);

      case event.httpMethod === 'GET' && path === '/stats':
        return await getStats(headers);

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
        dimensions: data.embedding.length
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

  let embeddingResult = null;
  if (autoEmbed) {
    embeddingResult = await generateAndStoreEmbedding(docRef.id, content);
  }

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ id: docRef.id, ...chunkData, embeddingResult })
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

  const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  if (category !== undefined) updates.category = category;
  if (title !== undefined) updates.title = title;
  if (content !== undefined) {
    updates.content = content;
    updates.tokenEstimate = Math.ceil(content.length / 4);
  }
  if (metadata !== undefined) updates.metadata = metadata;

  await docRef.update(updates);

  let embeddingResult = null;
  if (content && content !== oldContent && autoEmbed) {
    embeddingResult = await generateAndStoreEmbedding(id, content);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ id, updated: true, embeddingResult })
  };
}

async function deleteChunk(id, headers) {
  await db.collection(COLLECTION).doc(id).delete();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ id, deleted: true })
  };
}

// ===== EMBEDDING OPERATIONS =====

async function generateAndStoreEmbedding(docId, content) {
  if (!OPENAI_API_KEY) {
    return { success: false, error: 'OpenAI API key not configured' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: content.slice(0, 8000)
      })
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    const embedding = data.data[0].embedding;

    await db.collection(COLLECTION).doc(docId).update({
      embedding,
      embeddedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      dimensions: embedding.length,
      tokens: data.usage.total_tokens,
      cost: (data.usage.total_tokens / 1000000 * 0.02).toFixed(6)
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function embedChunk(id, headers) {
  const doc = await db.collection(COLLECTION).doc(id).get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chunk not found' }) };
  }

  const result = await generateAndStoreEmbedding(id, doc.data().content);

  return {
    statusCode: result.success ? 200 : 500,
    headers,
    body: JSON.stringify(result)
  };
}

async function embedAllChunks(headers) {
  const snapshot = await db.collection(COLLECTION).get();
  const results = { success: 0, failed: 0, errors: [] };

  for (const doc of snapshot.docs) {
    const result = await generateAndStoreEmbedding(doc.id, doc.data().content);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({ id: doc.id, error: result.error });
    }
    await new Promise(r => setTimeout(r, 100)); // Rate limiting
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(results)
  };
}

// ===== TESTING =====

async function testRetrieval(body, headers) {
  const { query, topK = 5 } = body;

  if (!query) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Query required' }) };
  }

  // Get query embedding
  const embResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: query })
  });

  const embData = await embResponse.json();
  if (embData.error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: embData.error.message }) };
  }

  const queryEmbedding = embData.data[0].embedding;

  // Fetch and rank chunks
  const snapshot = await db.collection(COLLECTION).get();

  const results = snapshot.docs
    .filter(doc => doc.data().embedding)
    .map(doc => {
      const data = doc.data();
      const similarity = cosineSimilarity(queryEmbedding, data.embedding);
      return {
        id: doc.id,
        title: data.title,
        category: data.category,
        similarity,
        preview: data.content.slice(0, 200) + '...'
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      query,
      results,
      embeddingTokens: embData.usage.total_tokens,
      chunksSearched: snapshot.docs.filter(d => d.data().embedding).length
    })
  };
}

async function testIntent(body, headers) {
  const { query } = body;

  if (!query) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Query required' }) };
  }

  const result = detectIntent(query);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result)
  };
}

function detectIntent(message) {
  const lower = message.toLowerCase();

  const intents = {
    job_analysis: {
      keywords: ['responsibilities', 'requirements', 'qualifications', 'experience required', 'we are looking', 'ideal candidate', 'job description'],
      lengthThreshold: 400,
      topK: 12,
      categories: null
    },
    contact: { keywords: ['email', 'phone', 'contact', 'linkedin', 'github'], topK: 2, categories: ['bio'] },
    projects: { keywords: ['project', 'built', 'portfolio', 'app', 'shipped'], topK: 8, categories: ['project', 'experience'] },
    experience: { keywords: ['experience', 'work history', 'previous job', 'career', 'background'], topK: 6, categories: ['experience', 'bio'] },
    skills: { keywords: ['skill', 'tech', 'stack', 'language', 'framework'], topK: 5, categories: ['skill'] },
    hire: { keywords: ['hire', 'why should', 'strength', 'weakness'], topK: 6, categories: ['bio', 'faq'] }
  };

  if (message.length > intents.job_analysis.lengthThreshold ||
      intents.job_analysis.keywords.some(kw => lower.includes(kw))) {
    return { intent: 'job_analysis', confidence: 'high', settings: intents.job_analysis };
  }

  for (const [intent, config] of Object.entries(intents)) {
    if (intent === 'job_analysis') continue;
    const matches = config.keywords.filter(kw => lower.includes(kw));
    if (matches.length > 0) {
      return { intent, confidence: matches.length > 2 ? 'high' : 'medium', matchedKeywords: matches, settings: config };
    }
  }

  return { intent: 'general', confidence: 'low', settings: { topK: 5, categories: null } };
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ===== STATS =====

async function getStats(headers) {
  const snapshot = await db.collection(COLLECTION).get();

  const stats = {
    totalChunks: 0,
    embeddedChunks: 0,
    missingEmbeddings: 0,
    totalTokens: 0,
    byCategory: {}
  };

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    stats.totalChunks++;
    stats.totalTokens += data.tokenEstimate || 0;

    if (data.embedding) {
      stats.embeddedChunks++;
    } else {
      stats.missingEmbeddings++;
    }

    const cat = data.category || 'unknown';
    if (!stats.byCategory[cat]) {
      stats.byCategory[cat] = { count: 0, tokens: 0 };
    }
    stats.byCategory[cat].count++;
    stats.byCategory[cat].tokens += data.tokenEstimate || 0;
  });

  // Cost estimates
  stats.costs = {
    embedding: (stats.totalTokens / 1000000 * 0.02).toFixed(4),
    queryEstimate: (500 / 1000000 * 0.02).toFixed(6) // ~500 tokens per query
  };

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
      title: 'About Charlton Smith',
      content: `Charlton Smith - Software Engineer based in Seattle, WA

Education:
- M.S. Software Engineering, Colorado Technical University (2021)
- B.S. Computer Science, University of Washington Tacoma (2017, Graduated with Honors)

7+ years of professional experience building software. Currently focusing on AI-powered applications and developer tools.

Contact:
- Email: charltonuw@gmail.com
- LinkedIn: linkedin.com/in/charltonsmith
- GitHub: github.com/azoni-ai
- Portfolio: azoni.ai

Philosophy: "Proof of work over claims of work" - ships real products with real users.`,
      metadata: { priority: 1 }
    },
    {
      category: 'skill',
      title: 'Technical Skills',
      content: `Charlton's Technical Skills:

Languages: Python, JavaScript, TypeScript, Java, SQL, C#

AI/ML:
- LLM Integration: OpenAI GPT-4, Claude API, Gemini
- RAG Systems: Vector embeddings, semantic search, context retrieval
- Prompt Engineering: System prompts, few-shot learning, chain-of-thought

Frontend: React 18, Next.js, Vite, Tailwind CSS, Framer Motion

Backend: Node.js, FastAPI, Django, Express, REST APIs, Microservices

Cloud & DevOps: AWS (Lambda, S3, EC2), Netlify, Vercel, Render, Docker, CI/CD

Databases: PostgreSQL, Firebase Firestore, MongoDB, Redis, Supabase, SQLite`,
      metadata: { priority: 1 }
    },
    {
      category: 'project',
      title: 'EmbedRoute',
      content: `EmbedRoute - Unified Embedding API Gateway (https://embedroute.com)

A developer tool that simplifies working with multiple embedding providers through a single, unified API.

Problem Solved: Developers waste time managing different APIs for OpenAI, Cohere, Voyage, etc.

Features:
- Single API endpoint for multiple embedding providers
- Automatic fallback between providers
- Usage tracking and cost analytics
- API key management dashboard

Tech Stack: Next.js 14, Supabase (PostgreSQL + Auth), Vercel Edge Functions, Stripe for billing.

Status: Live with paying users.`,
      metadata: { priority: 1, url: 'https://embedroute.com', tech: ['Next.js', 'Supabase', 'Vercel'] }
    },
    {
      category: 'project',
      title: 'Row Crew',
      content: `Row Crew - Social Fitness App with AI Verification (https://rowcrew.netlify.app)

Social fitness tracking for rowers with AI-powered workout verification.

AI Anti-Cheat System:
- Claude Vision API extracts meters, time, calories from rowing machine photos
- Multi-layer verification: AI confidence scoring, duplicate detection, behavioral analysis

Features:
- 50+ achievements across distance, streaks, time, calories
- 8 challenge types with group competitions
- Real-time leaderboards

Stats: ~6,000 lines of React, 2M+ meters logged by users.

Tech: React, Firebase Firestore, Claude Vision API, PWA.`,
      metadata: { priority: 1, url: 'https://rowcrew.netlify.app', tech: ['React', 'Firebase', 'Claude Vision'] }
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

Features:
- Goal tracking with auto-completion detection
- Group training: assign workouts to athletes

Tech: React 18, Firebase Firestore, OpenAI API, Tailwind CSS, PWA.`,
      metadata: { priority: 1, url: 'https://benchpressonly.com', tech: ['React', 'Firebase', 'OpenAI'] }
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
- Migrated frontend from Django templates to Angular with reusable components
- Contributed to org-wide migration from Jenkins to GitLab CI/CD`,
      metadata: { priority: 1, company: 'T-Mobile', dates: '2018-2022' }
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
- Mentored summer intern through project scoping to deployment`,
      metadata: { priority: 1, company: 'Capital One', dates: '2022-2023' }
    },
    {
      category: 'faq',
      title: 'Why Hire Charlton',
      content: `Why should you hire Charlton Smith?

1. Ships fast: 6+ production apps in the past year, all live with real users
2. Full-stack AI expertise: Builds end-to-end from React frontend to RAG pipelines
3. Proven at scale: Ran distributed system processing 2,500 bids/minute across 50 machines
4. Internal tools impact: Built platform at T-Mobile that reduced team workload by 80%
5. Startup experience: Co-founded OLI Fitness, published at ACM CHI
6. Continuous learner: M.S. while working full-time, constantly building new projects`,
      metadata: { priority: 1 }
    }
  ];

  let created = 0;
  let errors = 0;

  for (const chunk of defaultChunks) {
    try {
      const existing = await db.collection(COLLECTION).where('title', '==', chunk.title).get();

      if (existing.empty) {
        const docRef = await db.collection(COLLECTION).add({
          ...chunk,
          tokenEstimate: Math.ceil(chunk.content.length / 4),
          embedding: null,
          embeddedAt: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await generateAndStoreEmbedding(docRef.id, chunk.content);
        created++;
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