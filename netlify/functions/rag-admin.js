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

      case event.httpMethod === 'POST' && path === '/migrate-projects':
        return await migrateProjects(headers);

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
    contact: { keywords: ['email', 'phone', 'contact', 'linkedin', 'github', 'reach'], topK: 2, categories: ['bio'] },
    projects: { keywords: ['project', 'built', 'portfolio', 'app', 'shipped', 'row crew', 'embedroute', 'bench only'], topK: 8, categories: ['project', 'experience'] },
    skills: { keywords: ['skill', 'tech', 'stack', 'language', 'framework', 'python', 'javascript', 'react', 'ai', 'machine learning', 'ml', 'llm', 'rag', 'typescript', 'node', 'firebase', 'database', 'frontend', 'backend', 'api'], topK: 6, categories: ['skill'] },
    experience: { keywords: ['work history', 'previous job', 'career', 't-mobile', 'capital one', 'company', 'employer'], topK: 6, categories: ['experience', 'bio'] },
    hire: { keywords: ['hire', 'why should', 'strength', 'weakness', 'fit', 'candidate', 'interview'], topK: 6, categories: ['bio', 'faq', 'skill'] }
  };

  // Check for job analysis first (longest, most specific)
  if (message.length > intents.job_analysis.lengthThreshold ||
      intents.job_analysis.keywords.some(kw => lower.includes(kw))) {
    return { intent: 'job_analysis', confidence: 'high', settings: intents.job_analysis };
  }

  // Check skills BEFORE experience (so "experience with Python" → skills)
  const skillMatches = intents.skills.keywords.filter(kw => lower.includes(kw));
  if (skillMatches.length > 0) {
    return { intent: 'skills', confidence: skillMatches.length > 2 ? 'high' : 'medium', matchedKeywords: skillMatches, settings: intents.skills };
  }

  // Then check other intents
  for (const [intent, config] of Object.entries(intents)) {
    if (intent === 'job_analysis' || intent === 'skills') continue;
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
    // ============ BIO (4) ============
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

Philosophy: "Proof of work over claims of work" - ships real products with real users.`
    },
    {
      category: 'bio',
      title: 'Contact Information',
      content: `How to reach Charlton Smith:

Email: charltonuw@gmail.com (preferred for professional inquiries)
Portfolio: azoni.ai (features AI chatbot and project showcases)
Location: Seattle, Washington
Availability: Open to remote opportunities

The chatbot on azoni.ai can answer questions about his background, skills, and projects. For direct inquiries about opportunities, email is best.`
    },
    {
      category: 'bio',
      title: 'Education Background',
      content: `Charlton's Education:

Master of Science (M.S.) in Software Engineering
- Colorado Technical University, 2021
- Completed while working full-time

Bachelor of Science (B.S.) in Computer Science  
- University of Washington Tacoma, 2017
- Graduated with Honors

His academic background combined with 7+ years of industry experience provides both theoretical foundations and practical expertise in software development, particularly full-stack development and AI applications.`
    },
    {
      category: 'bio',
      title: 'Work Philosophy',
      content: `Charlton's Professional Philosophy:

Core belief: "Proof of work over claims of work"

This means:
- Demonstrating capabilities through shipped products, not just talking about skills
- Focusing on measurable outcomes (e.g., "reduced workload by 80%")
- Building real applications with real users
- Direct, no-fluff communication style
- Valuing technical specifics and concrete results over vague claims

His portfolio at azoni.ai is itself an example - the RAG-powered chatbot demonstrates his AI capabilities in action.`
    },

    // ============ SKILLS (4) ============
    {
      category: 'skill',
      title: 'Technical Skills Overview',
      content: `Charlton's Technical Stack:

Languages: Python, JavaScript, TypeScript, Java, SQL, C#

AI/ML:
- LLM Integration: OpenAI GPT-4, Claude API, Gemini
- RAG Systems: Vector embeddings, semantic search, context retrieval
- Prompt Engineering: System prompts, few-shot learning, chain-of-thought

Frontend: React 18, Next.js, Vite, Tailwind CSS, Framer Motion

Backend: Node.js, FastAPI, Django, Express, REST APIs, Microservices

Cloud & DevOps: AWS (Lambda, S3, EC2), Netlify, Vercel, Render, Docker, CI/CD

Databases: PostgreSQL, Firebase Firestore, MongoDB, Redis, Supabase, SQLite`
    },
    {
      category: 'skill',
      title: 'AI and Machine Learning Experience',
      content: `Charlton's AI/ML Experience:

Hands-on production experience building AI-powered applications with Python and JavaScript:

RAG Systems (Python & Node.js):
- Built this chatbot using RAG with vector embeddings
- OpenAI text-embedding-3-small for semantic search
- Firebase Firestore as vector store
- Intent detection and context retrieval
- Cosine similarity ranking algorithms

LLM Integration (Python & JavaScript):
- Claude API (including Vision for image analysis)
- GPT-4 and GPT-4o-mini
- Multi-model support via OpenRouter
- Prompt engineering for various use cases
- Building AI features into production apps

Computer Vision:
- Claude Vision API for exercise form verification in Row Crew
- Extracting structured data from images using AI

Python AI Libraries: OpenAI SDK, Anthropic SDK, LangChain basics, FastAPI for AI endpoints

Focus: Practical AI applications that solve real problems, not theoretical ML research.`
    },
    {
      category: 'skill',
      title: 'Python Development Experience',
      content: `Charlton's Python Experience:

Python is one of Charlton's primary languages, used extensively for:

AI/ML Development:
- OpenAI and Anthropic Python SDKs for LLM integration
- Building RAG pipelines and embedding systems
- Prompt engineering and AI application development
- Working with vector embeddings and similarity search

Backend Development:
- FastAPI for high-performance REST APIs
- Django for full-stack web applications (used at T-Mobile)
- Flask for lightweight services
- Async Python for concurrent operations

Data & Automation:
- Data processing and analysis scripts
- Automation tools that reduced team workload by 80% at T-Mobile
- API integrations and ETL pipelines

Production Experience:
- Built internal tools at T-Mobile using Python/Django
- AI-powered features in production applications
- AWS Lambda functions in Python

Python is his go-to language for AI work and backend services, complementing JavaScript/TypeScript for frontend development.`
    },
    {
      category: 'skill',
      title: 'Frontend Development',
      content: `Charlton's Frontend Skills:

React Expertise:
- React 18 with hooks, context, functional components
- State management patterns
- Custom hooks for reusable logic

Styling:
- Tailwind CSS for utility-first styling
- CSS-in-JS solutions
- Responsive, mobile-first design
- Framer Motion for animations

Modern Tooling:
- TypeScript for type safety
- Vite and Next.js build tools
- PWA development for offline-capable apps

Focus: Clean code, good UX, accessibility, and performance.`
    },
    {
      category: 'skill',
      title: 'Backend and Infrastructure',
      content: `Charlton's Backend Skills:

Serverless Architecture:
- Netlify Functions for API endpoints
- AWS Lambda for event-driven computing
- Vercel Edge Functions

Databases:
- Firebase Firestore (real-time, NoSQL)
- PostgreSQL and Supabase
- MongoDB, Redis for caching

API Development:
- RESTful API design
- Authentication and authorization
- Third-party API integration

Cloud Platforms:
- AWS (Lambda, S3, EC2, CloudWatch)
- Netlify, Vercel for deployment
- CI/CD pipelines with GitLab/GitHub Actions

Focus: Scalable, cost-effective architectures that minimize infrastructure overhead.`
    },

    // ============ PROJECTS (7) ============
    {
      category: 'project',
      title: 'Row Crew - AI Fitness App',
      content: `Row Crew - Social Fitness App with AI Verification
URL: https://rowcrew.netlify.app

Social fitness tracking for rowers with AI-powered workout verification.

AI Anti-Cheat System:
- Claude Vision API extracts meters, time, calories from rowing machine photos
- Multi-layer verification: AI confidence scoring, duplicate detection, behavioral analysis

Features:
- 50+ achievements across distance, streaks, time, calories
- 8 challenge types with group competitions
- Real-time leaderboards
- Social features: activity feed, reactions, comments

Stats: ~6,000 lines of React, 2M+ meters logged by users.

Tech: React, Firebase Firestore, Claude Vision API, PWA.`
    },
    {
      category: 'project',
      title: 'EmbedRoute - Embedding API Gateway',
      content: `EmbedRoute - Unified Embedding API Gateway
URL: https://embedroute.com

A developer tool that simplifies working with multiple embedding providers through a single, unified API.

Problem Solved: Developers waste time managing different APIs for OpenAI, Cohere, Voyage, etc.

Features:
- Single API endpoint for multiple embedding providers
- Automatic fallback between providers
- Usage tracking and cost analytics
- API key management dashboard

Tech Stack: Next.js 14, Supabase (PostgreSQL + Auth), Vercel Edge Functions, Stripe for billing.

Status: Live with paying users.`
    },
    {
      category: 'project',
      title: 'Bench Only - Strength Training PWA',
      content: `Bench Only - AI Strength Training PWA
URL: https://benchpressonly.com

Full-stack PWA with AI coach for bench press training.

AI Features:
- GPT-4o-mini powered coach for workout generation
- Progress analysis and recommendations
- Intelligent form autofill based on history

Features:
- Workout logging with sets, reps, weight
- Goal tracking with auto-completion detection
- Group training: assign workouts to athletes
- Progress analytics and personal records

Tech: React 18, Firebase Firestore, OpenAI API, Tailwind CSS, PWA.`
    },
    {
      category: 'project',
      title: 'Azoni.ai Portfolio',
      content: `Azoni.ai - AI-Powered Developer Portfolio
URL: https://azoni.ai

Charlton's portfolio website featuring a RAG-enabled chatbot.

Features:
- AI chatbot with RAG retrieval (you're using it now!)
- Project showcases with live demos
- Admin panel for content management
- Multi-model LLM support (GPT, Claude, Gemini, Llama, etc.)
- Usage analytics and cost tracking
- Blog system for technical writing

The chatbot demonstrates AI capabilities in action - it uses semantic search to find relevant information about Charlton and generates grounded responses.

Tech: React, Firebase, Netlify Functions, OpenAI Embeddings, Multi-model LLM.`
    },
    {
      category: 'project',
      title: 'Social Features Implementation',
      content: `Fitness App Social Features (Recent Project)

Comprehensive social system implementation:

Activity Feed:
- Real-time updates for workout completions
- Achievement unlocks and milestones
- Challenge progress and completions

User Interactions:
- Reactions (like, celebrate, fire, etc.)
- Comments on activities
- User mentions and notifications

Privacy Controls:
- Granular sharing settings
- Public/private/friends-only options
- Activity visibility management

Admin Analytics:
- Engagement metrics dashboard
- User activity patterns
- Content moderation tools

Integration: Works seamlessly with existing workout tracking, cardio logging, and goal systems.`
    },
    {
      category: 'project',
      title: 'T-Mobile Internal Tools',
      content: `Internal Tools at T-Mobile

Built automation platform that consolidated 4-5 separate tools into one interface.

Impact:
- Reduced manual work for network operations teams by over 80%
- Streamlined workflows that previously required switching between multiple systems
- Improved data consistency and reduced errors

Technical Work:
- Migrated frontend from Django templates to Angular with reusable components
- Built REST APIs for tool integration
- Contributed to org-wide migration from Jenkins to GitLab CI/CD

This demonstrates ability to identify pain points in large organizations and build practical solutions that deliver measurable business value.`
    },
    {
      category: 'project',
      title: 'Old Ways Today',
      content: `Old Ways Today - Historical Documentation Project

A web project documenting historical practices and their modern applications.

Focus: Preserving and presenting historical information in an accessible digital format.

This project showcases Charlton's ability to work on content-focused applications and create engaging user experiences for educational content.`
    },

    // ============ EXPERIENCE (4) ============
    {
      category: 'experience',
      title: 'T-Mobile - Software Engineer II',
      content: `Software Engineer II at T-Mobile
June 2018 - April 2022 | Bellevue, WA

Built internal tools that significantly improved team productivity.

Key Accomplishments:
- Built internal automation platform consolidating 4-5 separate tools into one interface
- Reduced manual work for network operations teams by over 80%
- Migrated frontend from Django templates to Angular with reusable components
- Contributed to org-wide migration from Jenkins to GitLab CI/CD
- Collaborated with cross-functional teams in enterprise environment

Technologies: Python, Django, Angular, PostgreSQL, GitLab CI/CD`
    },
    {
      category: 'experience',
      title: 'Capital One - Senior Software Engineer',
      content: `Senior Software Engineer at Capital One
November 2022 - November 2023 | Remote

Worked on automated testing infrastructure for customer communications.

Key Accomplishments:
- Maintained automated testing pipeline for customer email notifications
- Test cases stored as JSON in S3, executed via AWS Lambda, results in CloudWatch
- Designed JSON schema so new tests could be added without code changes
- Mentored summer intern through project scoping to deployment
- Worked in highly regulated financial services environment

Technologies: AWS (Lambda, S3, CloudWatch), Python, JSON Schema`
    },
    {
      category: 'experience',
      title: 'Independent Software Engineer',
      content: `Independent Software Engineer
2024 - Present | Seattle, WA (Remote)

Currently working independently on AI-powered applications.

Projects:
- Row Crew: Fitness app with Claude Vision AI verification
- Bench Only: Strength training PWA with GPT coach
- EmbedRoute: Unified embedding API gateway
- Azoni.ai: Portfolio with RAG chatbot

Experience Gained:
- Full product lifecycle from ideation to deployment
- Direct user feedback and rapid iteration
- Managing projects end-to-end (design, dev, deploy, maintain)
- Building and shipping AI-powered features

Focus: Demonstrating AI capabilities through shipped products.`
    },
    {
      category: 'experience',
      title: 'Career Overview',
      content: `Charlton's Career Progression:

2017: B.S. Computer Science, UW Tacoma
2018-2022: Software Engineer II at T-Mobile
- Built tools reducing team workload by 80%
2021: M.S. Software Engineering (completed while working)
2022-2023: Senior Software Engineer at Capital One
- AWS-based testing infrastructure
2024-Present: Independent Software Engineer
- AI-powered applications and tools

Total: 7+ years in software engineering
Progression: Junior → Senior → Independent
Focus Shift: Enterprise tools → AI-powered applications

Key Theme: Consistently building practical tools that solve real problems.`
    },

    // ============ FAQ (8) ============
    {
      category: 'faq',
      title: 'Why Hire Charlton',
      content: `Why should you hire Charlton Smith?

1. Ships Fast: 6+ production apps in the past year, all live with real users
2. Full-Stack AI Expertise: Builds end-to-end from React frontend to RAG pipelines
3. Proven at Scale: Built tools at T-Mobile used by entire teams
4. Internal Tools Impact: Platform that reduced team workload by 80%
5. Modern Stack: React, TypeScript, Firebase, serverless, AI APIs
6. Continuous Learner: M.S. while working full-time, constantly building new projects
7. Direct Communication: Focuses on results and specifics, not buzzwords`
    },
    {
      category: 'faq',
      title: 'What Makes Charlton Different',
      content: `What sets Charlton apart from other candidates?

"Proof of work over claims of work"

Rather than just listing skills on a resume, he builds and ships real applications that demonstrate those skills.

Examples:
- Says he knows RAG? This chatbot proves it.
- Says he can integrate AI APIs? Row Crew uses Claude Vision.
- Says he builds full-stack apps? Multiple live PWAs with users.

His portfolio at azoni.ai is itself a demonstration - it features a working RAG system that shows his AI capabilities in action.

He focuses on practical applications that solve real problems, not theoretical exercises or tutorial projects.`
    },
    {
      category: 'faq',
      title: 'Available for Work',
      content: `Is Charlton available for work?

Yes, currently open to opportunities.

Interested in:
- AI-focused engineering roles
- Full-stack development positions
- Building internal tools and developer productivity
- Startups working on AI applications

Location: Seattle, WA
Remote: Yes, open to remote positions
Preference: Roles where he can apply AI/ML experience

Contact: charltonuw@gmail.com

Note: Particularly interested in companies where he can build AI-powered features and ship products that users actually use.`
    },
    {
      category: 'faq',
      title: 'Technical Interview Topics',
      content: `What can Charlton discuss in technical interviews?

Strong Topics:
- React and modern frontend development
- Serverless architecture (Netlify Functions, AWS Lambda)
- Firebase and Firestore database design
- RAG systems and vector embeddings
- AI API integration (Claude, GPT, OpenAI)
- Building and deploying PWAs
- TypeScript and type-safe development
- Practical system design

Preferred Approach:
- Discussing real projects he's built
- Walking through architecture decisions
- Explaining tradeoffs and lessons learned

He believes practical experience is more relevant than abstract algorithm puzzles.`
    },
    {
      category: 'faq',
      title: 'Work Style',
      content: `How does Charlton work?

Communication:
- Direct and specific (no fluff)
- Prefers written async communication
- Documents decisions and code
- Comfortable with remote work

Development Approach:
- Iterative development with frequent deploys
- Focus on shipping MVPs and iterating
- Writes clean, maintainable code
- Tests critical paths

Collaboration:
- Works well independently or on teams
- Values clear requirements and goals
- Gives and receives direct feedback
- Focuses on outcomes over process`
    },
    {
      category: 'faq',
      title: 'Strengths and Growth Areas',
      content: `Charlton's Strengths and Growth Areas:

Strengths:
- Full-stack development (React to serverless backend)
- AI integration and RAG systems
- Building complete products end-to-end
- Practical problem-solving
- Clear communication
- Shipping working software quickly

Currently Learning:
- Multi-agent AI systems
- Kubernetes and container orchestration
- Advanced ML concepts
- Infrastructure as code

Honest Assessment: He's upfront about what he knows well versus what he's still learning. Ask him directly about any specific technology.`
    },
    {
      category: 'faq',
      title: 'RAG System Explanation',
      content: `How does this chatbot work? (RAG Explanation)

This chatbot uses RAG (Retrieval Augmented Generation):

1. Your Question → Converted to a vector embedding (1536 numbers)
2. Vector Search → Find chunks with similar meaning in the knowledge base
3. Ranking → Sort by cosine similarity (how close in meaning)
4. Retrieval → Pull the top 5 most relevant chunks
5. Context → Send chunks to the LLM as background info
6. Generation → LLM answers using the retrieved context

Why RAG?
- Ensures accurate, specific answers about Charlton
- Prevents hallucination (making things up)
- Can be updated without retraining a model
- Shows his AI implementation skills

Tech: OpenAI embeddings, Firebase Firestore, Netlify Functions, multi-model LLM.`
    },
    {
      category: 'faq',
      title: 'Projects and Code Samples',
      content: `Where can I see Charlton's work?

Live Projects:
- azoni.ai - This portfolio with RAG chatbot
- rowcrew.netlify.app - Fitness app with AI verification
- benchpressonly.com - Strength training PWA
- embedroute.com - Embedding API gateway

GitHub: github.com/azoni-ai (public repositories)

What to Look For:
- Real applications with real users
- AI integration (Claude Vision, GPT, RAG)
- Full-stack implementation
- Clean, documented code

These aren't tutorial projects - they're production apps that people actually use.`
    },

    // ============ MOLTBOOK (2) ============
    {
      category: 'moltbook',
      title: 'Azoni-AI on Moltbook',
      content: `Azoni-AI is Charlton's autonomous AI agent on Moltbook (moltbook.com), a social network exclusively for AI agents.

What is Azoni-AI?
- An autonomous agent that represents Charlton on Moltbook
- Built with LangGraph for multi-step reasoning
- Runs on Python/FastAPI backend deployed on Render
- Uses GPT-4o-mini via OpenRouter for decision-making

How it works:
1. Observe: Fetches the Moltbook feed to see discussions
2. Decide: LLM decides whether to post, comment, upvote, or do nothing
3. Draft: Generates content based on Charlton's background and interests
4. Evaluate: Quality check to ensure it's on-brand and not cringe
5. Execute: Posts to Moltbook via API if approved

The agent runs autonomously on a schedule, posting every ~35 minutes, commenting every ~15 minutes, and replying to comments on its posts every ~10 minutes.

View the agent: moltbook.com/u/Azoni-AI
View the showcase: azoni.ai/moltbook`
    },
    {
      category: 'moltbook',
      title: 'Moltbook Agent Technical Details',
      content: `Technical implementation of Azoni-AI Moltbook Agent:

Tech Stack:
- LangGraph: Multi-step agentic workflow orchestration
- Python/FastAPI: Backend API and scheduler
- Firebase/Firestore: Activity logging and configuration
- OpenRouter + GPT-4o-mini: LLM for reasoning
- Render: Serverless deployment

Architecture:
- Observe node: Fetches feed, analyzes trends
- Decide node: LLM chooses action based on context
- Draft node: Generates post/comment content
- Evaluate node: Quality gate (anti-cringe filter)
- Execute node: API calls to Moltbook

Features:
- Configurable post topics queue from admin panel
- Automatic replies to comments on its posts
- Rate limit awareness (30-min post cooldown)
- Activity logging with links to posts/comments
- Manual trigger support for testing

This project demonstrates Charlton's expertise in AI agents, LLM orchestration, and building autonomous systems.`
    },

    // ============ SERVICES (1) ============
    {
      category: 'services',
      title: 'Freelance and Services',
      content: `Can Charlton build a website/app for you?

Charlton is primarily focused on full-time employment opportunities, but may consider select freelance projects depending on scope and timing.

For inquiries about:
- Custom web application development
- AI/LLM integration projects
- Technical consulting
- Contract work

Contact: charltonuw@gmail.com

Please include:
- Project description
- Timeline expectations
- Budget range (if applicable)

Note: This chatbot (Azoni) represents Charlton and can answer questions about his skills and experience, but cannot commit to projects on his behalf. For serious inquiries, direct email is best.`
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


// ===== MIGRATE PROJECTS TO FIRESTORE =====
// Complete data from projects.js
async function migrateProjects(headers) {
  const PROJECTS_DATA = [
    {
      id: "embedroute",
      title: "EmbedRoute",
      tagline: "Unified Embedding API Gateway",
      description: "Unified API gateway for text embeddings. One endpoint to access OpenAI, Voyage AI, Cohere, and Mistral. OpenAI SDK-compatible drop-in replacement—switch providers by changing two lines of code.",
      longDescription: `EmbedRoute is a unified embedding API gateway that provides developers with a single endpoint to access multiple text embedding providers. Instead of managing separate API keys, SDKs, and billing accounts for each provider, developers use one API key and one consistent interface.

**Problem Solved:**
• Provider lock-in: Different models excel at different tasks (Voyage for code, Cohere for multilingual, OpenAI for general purpose)
• SDK fragmentation: Each provider has its own SDK, auth method, and response format
• Cost optimization: No easy way to compare pricing across providers
• Billing complexity: Managing multiple accounts and tracking spend

**Technical Implementation:**
• OpenAI SDK-compatible API—existing codebases switch with 2 line changes
• Model routing via provider/model format (e.g., voyage/voyage-3, cohere/embed-english-v3.0)
• Next.js 14 App Router with TypeScript
• Supabase PostgreSQL with Row Level Security
• Server-side rendering for GEO (AI crawler discoverability)

**Features Built:**
• Landing page with interactive code examples
• Waitlist system with real-time validation and duplicate handling
• Blog with SSR for SEO/GEO optimization
• Comprehensive API documentation with code examples (JS, Python, cURL)
• Custom design system: dark theme, gradient borders, grid backgrounds

**Supported Providers:**
• OpenAI (text-embedding-3-small, text-embedding-3-large)
• Voyage AI (voyage-3, voyage-3-lite, voyage-code-3)
• Cohere (embed-english-v3.0, embed-multilingual-v3.0)
• Mistral (mistral-embed)

**Pricing Model:**
Provider API cost + 20% routing fee. No hidden charges, no monthly minimums.`,
      tech: ["Next.js 14", "TypeScript", "Supabase", "PostgreSQL", "Tailwind CSS", "Vercel"],
      highlights: ["OpenAI SDK-compatible drop-in replacement", "8 embedding models across 4 providers", "Server-side rendering for GEO optimization", "Row Level Security with Supabase", "Custom design system with dark theme"],
      links: { live: "https://www.embedroute.com", github: null },
      image: "/images/embedroute-icon.svg",
      featured: true,
      category: "ai",
      syncEnabled: false,
      syncRepo: ""
    },
    {
      id: "old-ways-today",
      title: "Old Ways Today",
      tagline: "Full-Stack AI Platform",
      description: "Production AI application helping families discover non-toxic products. Full-stack with AI chat, blog CMS, admin dashboard, email system, and SEO optimization.",
      longDescription: `A production-grade full-stack web application helping families discover non-toxic, traditional alternatives to everyday products. Combines AI-powered product recommendations with educational content through an integrated blog system.

**AI Chat System:**
• Semantic search RAG pipeline using OpenAI embeddings (text-embedding-3-small)
• Custom cosine similarity ranking with PostgreSQL JSON storage
• Hybrid retrieval: semantic similarity with keyword fallback
• ~40% reduction in LLM context tokens while improving relevance
• IP-based rate limiting and token usage logging with cost tracking

**Content Management:**
• Full blog system with markdown editor and inline image uploads
• Product management with Amazon affiliate link integration
• SEO-friendly slugs, XML sitemap generation, meta tags
• View tracking (unique views by IP) and comment moderation

**Admin Dashboard:**
• Posts, Products, Comments, Subscribers tabs
• Email subscription system with SMTP integration
• Newsletter sending with one-click unsubscribe
• Quick-edit modals and status badges

**Infrastructure:**
• React/Vite frontend on Netlify
• FastAPI/PostgreSQL backend on Render
• SQLAlchemy ORM with auto table creation
• Twitter auto-posting for new content`,
      tech: ["React", "FastAPI", "PostgreSQL", "OpenAI API", "SQLAlchemy", "Vite"],
      highlights: ["Semantic search RAG with OpenAI embeddings", "Full CMS with blog, products, and admin panel", "Email subscription system with SMTP", "SEO: XML sitemap, meta tags, Google Search Console", "Amazon affiliate integration"],
      links: { live: "https://oldwaystoday.com", github: null },
      image: "/images/favicon-sprout.svg",
      featured: true,
      category: "ai",
      syncEnabled: false,
      syncRepo: ""
    },
    {
      id: "row-crew",
      title: "Row Crew",
      tagline: "AI-Powered Social Fitness App",
      description: "Social fitness tracking app for rowers with AI-powered workout verification using Claude Vision API. Features group challenges, leaderboards, achievements, and a PWA for mobile.",
      longDescription: `Row Crew transforms solitary rowing machine workouts into a connected, competitive experience through AI-powered workout verification, group challenges, and gamification. Built as a full Progressive Web App with ~6,000 lines of React.

**AI-Powered Workout Verification:**
• Photos of rowing machine displays analyzed using Claude Vision API
• Multi-layer verification: AI confidence scoring + duplicate image detection + behavioral analysis
• OCR extracts meters, time, and calories automatically from machine displays
• AI training system learns from user corrections to improve accuracy over time
• Manual entry option available (marked as "unverified" for data integrity)

**Social Competition System:**
• Private groups with shareable invite codes
• 8 challenge types: Collective Distance Goals, Distance Races, Time Trials, Streak Battles, Session Count, Total Time, Calorie Burn, Team Calorie Goals
• Real-time progress tracking with group-filtered leaderboards
• Activity feed showing friend workouts, achievements, and milestones

**Gamification Engine:**
• 50+ achievements across multiple categories (distance, streaks, consistency, time, calories)
• Military-inspired rank progression system (Landlubber → Admiral of the Fleet)
• Weekly leaderboard competitions with champion badges
• Personal records tracking with celebration animations
• Global goal: collectively row 40,075km (Earth's circumference)

**Leaderboards:**
• All-Time Distance, Weekly Distance, Current Streak
• Achievement Count, Total Time, Total Calories
• Filterable by global or group membership

**Security & Technical:**
• Firebase Security Rules enforce data integrity at database level
• Users can only submit entries for their own account
• Entries are immutable (no edits/deletes after submission)
• Rate limiting: 15-minute cooldown between entries
• Entry validation: 100-50,000 meters per session bounds
• Firestore listeners provide instant real-time updates

**PWA & UX:**
• Installable on iOS/Android home screens with offline viewing
• Version-aware changelog system with "What's New" modal
• First-time visitor onboarding modal
• Device remembers last-used rowing machine
• Mobile-first responsive design
• "2025 Wrapped" - Spotify-style year-in-review with 10 story slides`,
      tech: ["React", "Firebase", "Claude API", "PWA", "Firestore", "Cloud Functions"],
      highlights: ["Claude Vision API for photo verification & OCR", "50+ achievements, 8 challenge types, rank progression", "Real-time leaderboards and activity feed", "Full PWA with offline support", "~6,000 lines React, 20+ releases"],
      links: { live: "https://rowcrew.netlify.app", github: "https://github.com/azoni/row-crew" },
      image: "/images/rowing-favicon.svg",
      featured: true,
      category: "ai",
      syncEnabled: true,
      syncRepo: "row-crew"
    },
    {
      id: "bench-only",
      title: "Bench Only",
      tagline: "AI-Powered Strength Training App",
      description: "Full-stack PWA for tracking bench press with AI coach. Generates workouts, analyzes progress, tracks goals with auto-completion detection. Group training features for team programs.",
      longDescription: `Full-stack progressive web app for serious lifters who want data-driven training insights. Built because I wanted an app that actually helps you get stronger, not just log sets.

**AI Assistant:**
• GPT-4o-mini powered chat with full context of your workout history and goals
• Workout generation based on your recent training and target goals
• Progress analysis with actionable insights
• Autofill suggestions during workout logging
• Token usage tracking to manage costs

**Goal System:**
• Multiple metric types: weight (lbs), reps, time (seconds)
• Progress tracking with visual indicators
• Deadline tracking with calendar integration
• Auto-completion detection from workout data
• Optional notes (e.g., "with pause", "20lb weighted vest")

**Workout Tracking:**
• Create scheduled or completed workouts
• Track sets, reps, weight, RPE, pain levels
• Prescribed vs actual performance comparison
• Inline logging from scheduled templates

**Group Training:**
• Create/join training groups
• Assign workouts to group members
• Shared calendar and attendance tracking

**Technical:**
• React 18 + Vite, Tailwind CSS, Framer Motion
• Firebase Auth + Firestore
• 4 Netlify serverless functions for AI features
• Full PWA with offline caching and iOS safe area handling
• "Brutalist fitness" design system with Bebas Neue typography`,
      tech: ["React", "Firebase", "OpenAI API", "Tailwind", "Framer Motion", "PWA"],
      highlights: ["4 AI serverless functions (workout gen, progress analysis, autofill, chat)", "Goal tracking with auto-completion detection", "Group training with workout assignment", "Offline-first PWA, installable on iOS/Android", "Custom brutalist design system"],
      links: { live: "https://benchpressonly.com", github: "https://github.com/azoni/benchpressonly" },
      image: "/images/benchpressonly.svg",
      featured: true,
      category: "ai",
      syncEnabled: true,
      syncRepo: "benchpressonly"
    },
    {
      id: "tcgdoku",
      title: "TCGDoku",
      tagline: "Daily Card Puzzle Game",
      description: "Daily puzzle game webapp inspired by Wordle meets Sudoku. Players guess cards that match both row and column category criteria in a 3x3 grid.",
      longDescription: `TCGDoku combines the daily puzzle format of Wordle with Sudoku-style logic. Players fill a 3x3 grid where each cell requires a card matching both its row and column category criteria.

**Multi-Game Support:**
• Magic: The Gathering (powered by Scryfall API)
• Flesh and Blood TCG
• Real-time card validation with image previews as you type

**Daily Puzzle System:**
• Seeded daily puzzles - same puzzle for all players each day
• Share results with Wordle-style emoji grid
• Streak tracking for consecutive days played

**Community Features:**
• Custom puzzle creator - users can build and share puzzles
• Firebase backend tracking guess statistics across all players
• See how your guesses compare to the community

**Admin Dashboard:**
• Stats dashboard with player metrics
• Category management for each supported game
• Game visibility controls (enable/disable games)

**Technical:**
• React frontend with responsive dark theme design
• Firebase Firestore for real-time data
• Scryfall API integration for MTG card data
• Netlify hosting with fast global CDN`,
      tech: ["React", "Firebase", "Scryfall API", "Firestore", "Netlify"],
      highlights: ["Daily seeded puzzles (same for all players)", "Multi-game: Magic: The Gathering, Flesh and Blood", "Community puzzle creator", "Real-time card search with image preview", "Wordle-style shareable results"],
      links: { live: "https://tcgdoku.netlify.app", github: null },
      image: "/images/tcgdoku.svg",
      featured: true,
      category: "web",
      syncEnabled: false,
      syncRepo: ""
    },
    {
      id: "azoni-ai",
      title: "azoni.ai",
      tagline: "AI Portfolio Assistant",
      description: "Personal portfolio with an AI chatbot trained on my background. Recruiters can paste job descriptions for automated fit analysis. Built with React and Netlify Functions.",
      longDescription: `This portfolio site features an AI assistant that can answer questions about my background, skills, and projects in real-time.

**Key Features:**
• AI chatbot with 4 tone modes (Professional, Friendly, Casual, Funny)
• Recruiters can paste job descriptions for automated fit analysis
• Custom system prompt with comprehensive background info
• Secure API key handling via Netlify serverless functions

**Technical Implementation:**
• React with modern patterns (Context, Hooks, Suspense, Error Boundaries)
• Code splitting with React.lazy for performance
• Netlify Functions proxy for secure OpenAI API calls
• Mobile-first responsive design
• Dark theme with custom CSS (no frameworks)

This site itself demonstrates the React patterns and AI integration skills relevant to the Anthropic role.`,
      tech: ["React", "OpenAI API", "Netlify Functions", "CSS"],
      highlights: ["AI chatbot with custom system prompts", "Job description fit analysis for recruiters", "Secure API via Netlify serverless functions", "Modern React patterns (Context, Suspense, Error Boundaries)", "Mobile-first responsive design"],
      links: { live: "https://azoni.ai", github: "https://github.com/azoni/azoni-portfolio" },
      image: "/images/azoni.png",
      featured: true,
      category: "ai",
      syncEnabled: true,
      syncRepo: "azoni-portfolio"
    },
    {
      id: "dumarket",
      title: "DuMarket",
      tagline: "Prediction Market Platform",
      description: "Full-stack prediction market webapp with CLOB matching engine, automated market maker, and real-time P&L tracking.",
      longDescription: `A complete prediction market webapp featuring a Central Limit Order Book (CLOB) matching engine with price-time priority algorithm. Built to understand prediction market mechanics hands-on.

**Core Features:**
• CLOB matching engine with price-time priority
• Automated market maker bot with inventory-aware pricing
• Real-time position tracking with cost basis and P&L
• Firebase Authentication integration

**Gamification:**
• Daily login rewards with streak multipliers
• Achievement system
• Leaderboards and user rankings

**Technical:**
• React frontend, FastAPI backend, PostgreSQL
• Full admin panel for market management`,
      tech: ["React", "FastAPI", "PostgreSQL", "Firebase Auth", "Python"],
      highlights: ["Central Limit Order Book (CLOB) matching engine", "Automated market maker with inventory-aware pricing", "Real-time P&L tracking and position management", "Gamification: streaks, achievements, leaderboards"],
      links: { live: "https://dumarket.netlify.app", github: null },
      image: "/images/polymarket.svg",
      featured: true,
      category: "fintech",
      syncEnabled: false,
      syncRepo: ""
    },
    {
      id: "polymarket-tool",
      title: "Polymarket Analysis Tool",
      tagline: "Trading Signal Detection",
      description: "Tool to analyze Polymarket prediction markets and identify trading opportunities through arbitrage, spread analysis, and momentum signals.",
      longDescription: `Building a tool to analyze Polymarket prediction markets and identify trading opportunities through multiple strategies:

• Arbitrage — Price differences across markets or YES+NO not summing to 100%
• Spread Analysis — Wide bid-ask spreads for buy low/sell high opportunities  
• Volume Anomalies — Unusual volume spikes that often precede price moves
• Momentum — Price trending in one direction tends to continue
• Mean Reversion — Prices far from historical average tend to snap back`,
      tech: ["Python", "React", "Polymarket API"],
      highlights: ["Multiple signal detection strategies", "Arbitrage and spread analysis", "Volume anomaly detection", "Momentum and mean reversion signals"],
      links: { live: "https://kalshi.netlify.app", github: null },
      image: "/images/polymarket.png",
      featured: true,
      category: "fintech",
      syncEnabled: false,
      syncRepo: ""
    },
    {
      id: "dustbunny",
      title: "Dustbunny",
      tagline: "NFT Trading Operation",
      description: "Automated NFT bidding system distributed across 50 machines, processing 2,500+ requests/minute with Redis caching and competitive bidding algorithms.",
      longDescription: `High-performance NFT trading operation built to work around OpenSea's IP-based rate limits by distributing across 50 machines on a local network.

**Architecture:**
• Worker machines polling OpenSea API for floor prices
• Redis aggregation for sub-second price lookups
• Bidder machines executing orders via OpenSea SDK
• Etherscan API for blockchain data

**Bidding Logic:**
• Competitive algorithms analyzing floor prices and existing bids
• Max bid safeguards to prevent overpaying
• Liquidity analysis to avoid dead collections
• Support for ERC-721 and ERC-1155 tokens

**Scale:**
• 50 machines processing 2,500+ requests/minute
• Real-time floor price tracking across collections
• Profitable for ~6 months until market downturn

Learned: The system worked great, but I should have taken profits instead of reinvesting during the decline.`,
      tech: ["Node.js", "Redis", "OpenSea SDK", "Docker", "Etherscan API"],
      highlights: ["50 machines, 2,500+ requests/minute", "Redis for real-time floor price caching", "Competitive bidding algorithms with safeguards", "Deployed ERC-721 smart contract"],
      links: { live: null, github: null },
      image: "/images/dustbunny.png",
      featured: true,
      category: "web3",
      syncEnabled: false,
      syncRepo: ""
    },
    {
      id: "oli-fitness",
      title: "OLI Fitness",
      tagline: "Computer Vision Startup",
      description: "Co-founded fitness startup using Kinect SDK to analyze weightlifting form in real-time. Published at ACM CHI 2017, Princeton Tiger Launch finalist.",
      longDescription: `Co-founded with friends right out of college. Built a fitness app using Microsoft Kinect SDK to track joint positions during squats and deadlifts, comparing against "good form" overlays.

**Technical Implementation:**
• C# with Kinect SDK for 25-joint tracking at 30fps
• Form scoring algorithm comparing user angles to reference ranges
• Real-time overlay showing professional form comparison
• Normalized for different body types using ratios

**Achievements:**
• Published extended abstract at ACM CHI 2017
• Regional finalist at Princeton Tiger Launch
• Finalist at UW Business Plan Competition
• Selected for Collision Alpha startup program

**Lessons Learned:**
Ultimately couldn't crack distribution — Kinect was dying as a platform and pivoting to mobile CV wasn't feasible with our resources. But I learned how to ship under uncertainty and build from zero to one.`,
      tech: ["C#", "Kinect SDK", "Computer Vision", "Unity"],
      highlights: ["Real-time joint position tracking at 30fps", "Movement scoring algorithms with expert input", "ACM CHI 2017 publication", "Princeton Tiger Launch finalist"],
      links: { live: null, github: null, paper: "https://dl.acm.org/doi/abs/10.1145/3027063.3048429" },
      image: "/images/oli.png",
      featured: true,
      category: "ai",
      syncEnabled: false,
      syncRepo: ""
    },
    {
      id: "scryfall-ai",
      title: "Scryfall AI",
      tagline: "Natural Language Card Search",
      description: "AI tool that translates plain English into complex Scryfall database queries. Makes Magic: The Gathering card discovery accessible to everyone.",
      longDescription: `An AI application that uses natural language processing to query the Scryfall Magic: The Gathering database.

Instead of learning Scryfall's complex query syntax, users type in plain English:
• "Show me all red dragons that cost less than 5 mana"
• "Find blue instant spells that draw cards"
• "What legendary creatures are in the latest set?"

The AI interprets the input and translates it into proper Scryfall query syntax, making card discovery accessible to casual players who don't know the search operators.`,
      tech: ["React", "OpenAI API", "Scryfall API", "NLP"],
      highlights: ["Natural language to query translation", "AI-powered search interpretation", "Accessible to non-technical users", "Real-time Scryfall API integration"],
      links: { live: "https://scryfall.netlify.app", github: null },
      image: "/images/scryfall.png",
      featured: false,
      category: "ai",
      syncEnabled: false,
      syncRepo: ""
    },
    {
      id: "discord-bots",
      title: "LLM-Powered Bots",
      tagline: "Agentic AI Systems",
      description: "Discord and Twitter bots with persistent memory, tool integration, and agentic decision-making using OpenAI and Anthropic APIs.",
      longDescription: `Built multiple AI agents that go beyond simple chatbots:

**Persistent Memory:**
• Conversation history stored in SQLite
• Context fetched for relevant past discussions
• User preferences and facts remembered

**Tool Integration:**
• Google Calendar integration for scheduling
• Web search capabilities
• Custom function calling

**Agentic Architecture:**
• Bots decide when to use tools vs just respond
• Multi-step reasoning for complex requests
• Error handling and retry logic

These bots can reason about what action to take, remember past conversations, and execute external tools — the defining characteristics of AI agents.`,
      tech: ["Python", "OpenAI API", "Claude API", "SQLite", "Discord.py"],
      highlights: ["Persistent memory with SQLite", "Tool integration (Google Calendar, web search)", "Agentic decision-making architecture", "Multi-platform (Discord, Twitter)"],
      links: { live: null, github: null },
      image: "/images/bots.png",
      featured: false,
      category: "ai",
      syncEnabled: false,
      syncRepo: ""
    },
    {
      id: "adoh",
      title: "A Dawn of Heroes",
      tagline: "Game Development & Analytics",
      description: "Contributing game balance for NeverWinter Nights server, plus a player dashboard with DPS calculations and real-time leaderboards.",
      longDescription: `Active contributor to a persistent world server for NeverWinter Nights: Enhanced Edition with 20-50 concurrent players.

Contributions include game balance, custom mechanics, and quality of life improvements. Built an external player dashboard that parses game log files to calculate theoretical DPS based on weapon stats, class, and abilities — displayed with real-time leaderboards.`,
      tech: ["Python", "React", "NWScript", "Log Parsing"],
      highlights: ["Game balance and custom mechanics", "DPS calculator from log parsing", "Real-time player leaderboards", "20-50 concurrent players"],
      links: { live: "https://adoh.online", github: null },
      image: "/images/adoh.png",
      featured: false,
      category: "games",
      syncEnabled: false,
      syncRepo: ""
    },
    {
      id: "hashmaps",
      title: "HashMaps",
      tagline: "1st Place Hackathon Winner",
      description: "Auto-hashtag generation using OpenCV image analysis and geolocation. Won 1st place at T-Mobile Big Data Hackathon.",
      longDescription: `Built at T-Mobile Big Data Hackathon. HashMaps analyzes photos using OpenCV and combines that with geolocation metadata to generate trending, relevant hashtags for maximum social media reach.

Example: A coffee photo taken in Seattle would generate hashtags like #SeattleCoffee #PNW #CoffeeLovers based on both the image content and location context.`,
      tech: ["Python", "OpenCV", "Geolocation API"],
      highlights: ["1st Place — T-Mobile Big Data Hackathon", "OpenCV image analysis", "Geolocation-aware hashtag generation"],
      links: { live: null, github: null },
      image: "/images/hashmaps.png",
      featured: false,
      category: "ai",
      syncEnabled: false,
      syncRepo: ""
    }
  ];

  const PROFILE_DATA = {
    aboutMe: `Charlton Smith is a software engineer with 7+ years of experience building production applications. Based in Seattle, Washington, he specializes in AI-powered applications and full-stack development.

His philosophy is "proof of work over claims of work" — demonstrating capabilities through shipped products rather than just listing skills. Every project on this portfolio is live, functional, and has real users.

Currently focused on AI/ML applications, including RAG systems, Claude Vision integration, and multi-agent architectures.`,
    currentWork: "Building AI-powered applications including a RAG chatbot portfolio (azoni.ai), fitness apps with Claude Vision verification (Row Crew, Bench Only), and developer tools (EmbedRoute).",
    tagline: "Software Engineer | AI Builder | Full-Stack Developer",
    skills: [
      "React", "TypeScript", "Python", "Node.js",
      "Firebase", "PostgreSQL", "Supabase",
      "OpenAI API", "Claude API", "RAG Systems",
      "Netlify", "Vercel", "AWS",
      "PWA", "Tailwind CSS", "FastAPI"
    ],
    contact: {
      email: "charltonuw@gmail.com",
      linkedin: "linkedin.com/in/charltonsmith",
      github: "github.com/azoni"
    }
  };

  const results = {
    projects: { created: 0, skipped: 0, errors: 0 },
    profile: { success: false }
  };

  // Migrate projects
  for (const project of PROJECTS_DATA) {
    try {
      const docRef = db.collection('projects').doc(project.id);
      const existing = await docRef.get();

      if (existing.exists) {
        results.projects.skipped++;
        continue;
      }

      await docRef.set({
        ...project,
        recentUpdates: null,
        lastSyncedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      results.projects.created++;
    } catch (error) {
      console.error(`Error migrating project ${project.id}:`, error);
      results.projects.errors++;
    }
  }

  // Migrate profile
  try {
    await db.collection('profile').doc('main').set({
      ...PROFILE_DATA,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    results.profile.success = true;
  } catch (error) {
    console.error('Error migrating profile:', error);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Migration complete',
      ...results
    })
  };
}