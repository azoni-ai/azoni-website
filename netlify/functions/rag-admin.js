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

Hands-on production experience with:

RAG Systems:
- Built this chatbot using RAG with vector embeddings
- OpenAI text-embedding-3-small for semantic search
- Firebase Firestore as vector store
- Intent detection and context retrieval

LLM Integration:
- Claude API (including Vision for image analysis)
- GPT-4 and GPT-4o-mini
- Multi-model support via OpenRouter
- Prompt engineering for various use cases

Computer Vision:
- Claude Vision API for exercise form verification in Row Crew
- Extracting structured data from images

Focus: Practical AI applications that solve real problems, not theoretical ML research.`
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