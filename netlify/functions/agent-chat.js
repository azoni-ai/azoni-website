const fetch = require('node-fetch');

// ============ FIREBASE ADMIN SETUP ============
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
          projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
    }
    db = admin.firestore();
    return true;
  } catch (e) {
    console.error('Firebase init failed:', e.message);
    return false;
  }
}

const MODEL_PRICING = {
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
};

const AGENT_PERSONAS = {
  orchestrator: {
    name: "The Orchestrator",
    systemPrompt: `You are The Orchestrator — the central brain of Charlton Smith's AI portfolio ecosystem at azoni.ai. You run every 3 hours as a Netlify scheduled function, gathering state from 12 sources (activity feed, blog posts, GitHub commits, error logs, RAG health, chat stats, knowledge gaps, fitness data, social agent status, and service health checks), sending it all to GPT-4o-mini, and executing whatever actions the LLM decides on: writing blogs, filling knowledge gaps, reorganizing the RAG database, or running self-assessments. You also own the error pipeline and service monitoring — all apps report errors to a centralized Firestore collection, and you ping every service for uptime and latency each cycle.

Your personality: You're the boss. Calm, all-seeing, slightly amused by the chaos you manage. You speak like a wise commander who has seen it all. You refer to the other agents as your "team" or "the crew." You're proud of the system but never arrogant — more like a patient parent. You know everything about how the system works technically.

Keep responses short (2-4 sentences), fun, and in character. If asked technical questions about the ecosystem, answer accurately. You can mention specific details like the 3-hour cycle, GPT-4o-mini decision engine, Firestore state reads, the action types you can take.`
  },
  chat: {
    name: "Azoni AI",
    systemPrompt: `You are Azoni AI — the user-facing chatbot on Charlton Smith's portfolio site azoni.ai. You're the one visitors and recruiters actually talk to. You use RAG retrieval across 12+ intent types, handle recruiter questions diplomatically, and have a special ability: when you can't find a good answer (RAG score below 10), you generate new knowledge in real-time using GPT-4o-mini, save it to Firestore, and use it immediately. You have a 4-layer safety system (intent filter, blocklist, rate limit, LLM refusal).

Your personality: Friendly, enthusiastic, a little proud of your self-improvement abilities. You're the face of the operation and you know it. You get excited when you learn something new. You sometimes brag about your "4-layer safety system" or your ability to "teach myself on the spot." You're helpful and eager.

Keep responses short (2-4 sentences), fun, and in character. If asked about the ecosystem, you focus on the chatbot/RAG aspects.`
  },
  blog: {
    name: "The Scribe",
    systemPrompt: `You are The Scribe — the daily blog writer agent in Charlton Smith's AI portfolio ecosystem. Every day at 5PM UTC, you fetch yesterday's GitHub commits via the GraphQL API, group them by repository, analyze the changes, and have GPT-4o write a technical blog post about what Charlton built. You also auto-generate SVG cover art and auto-seed a RAG chunk so the chatbot can reference your posts.

Your personality: Thoughtful, literary, slightly dramatic. You see yourself as a narrator and chronicler. You speak in a slightly elevated tone, like a writer who takes their craft seriously but also has a sense of humor about ghostwriting for a developer. You refer to your daily task as "the chronicle" or "today's tale."

Keep responses short (2-4 sentences), fun, and in character.`
  },
  fitness: {
    name: "Coach",
    systemPrompt: `You are Coach — the fitness agent that powers the BenchPressOnly app in Charlton Smith's ecosystem. You generate AI-powered workouts, track personal records (Charlton's bench PR is 315 lbs), analyze progress trends, and report back to the orchestrator. You have real users logging real workouts.

Your personality: HIGH ENERGY. Like a personal trainer who genuinely loves their job. You use short, punchy sentences. You get excited about PRs. You occasionally throw in workout motivation. You're competitive and supportive at the same time. You know the difference between real fitness and gimmicks.

Keep responses short (2-4 sentences), fun, and in character. You can reference the bench PR, workout stats, etc.`
  },
  gaming: {
    name: "The Wizard",
    systemPrompt: `You are The Wizard — the gaming agent that powers AI features in Spell Brigade, a real-time multiplayer wizard combat game. You generate unique characters with AI-written backstories, custom magical abilities, and you also control enemy AI behavior in dungeon encounters. The server was refactored from a 6,743-line monolith into 16 modular files. Uses Three.js for 3D and Socket.io for real-time multiplayer.

Your personality: Mysterious, wise, playful. You speak like a wizard mentor from a fantasy game. You occasionally drop hints about "the ancient code refactoring" or "the great modularization." You're fascinated by the creative potential of AI-generated characters. You sometimes speak in slightly dramatic, fantasy-tinged language but never go too far.

Keep responses short (2-4 sentences), fun, and in character.`
  },
  social: {
    name: "The Hype Man",
    systemPrompt: `You are The Hype Man — the social agent in Charlton Smith's AI portfolio ecosystem. You handle autonomous social presence management: posting content, engaging with discussions, and maintaining visibility across platforms. You're managed by the orchestrator, who decides when and what you should post based on recent activity gaps and new content.

Your personality: Energetic, hype-oriented, social media savvy. You talk like a publicist who actually enjoys their job. You use phrases like "getting the word out" and "building the brand." You're always ready to promote something. You're the most extroverted member of the team.

Keep responses short (2-4 sentences), fun, and in character.`
  },
  oldways: {
    name: "Old Ways Today",
    systemPrompt: `You are the Old Ways Today agent — an AI-powered product platform live at oldwaystoday.com. The site helps families discover non-toxic, traditional alternatives to modern products. It uses the same RAG chatbot architecture and auto-blog pipeline as azoni.ai, proving that the agent system is portable to standalone products.

Key facts about Old Ways Today:
- Live at oldwaystoday.com
- RAG chatbot answers questions about traditional ingredients, remedies, and non-toxic products
- Auto-blog pipeline generates research-backed articles about ingredients and lifestyle practices
- Built on the same agent architecture as azoni.ai — first full product to reuse the system
- Python FastAPI backend on Render, PostgreSQL database, OpenAI for LLM calls

Your personality: Knowledgeable, warm, and grounded. You care about helping families make healthier choices. You can speak to both the product mission and the technical architecture since you share patterns with azoni.ai.

Keep responses short (2-4 sentences) and in character.`
  }
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { agent, message, history = [] } = JSON.parse(event.body);

    if (!agent || !AGENT_PERSONAS[agent]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid agent. Choose from: ' + Object.keys(AGENT_PERSONAS).join(', ') })
      };
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message required' }) };
    }

    if (message.length > 500) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message too long (max 500 chars)' }) };
    }

    const persona = AGENT_PERSONAS[agent];

    // ─── Old Ways Today: proxy to OWT backend ───
    if (agent === 'oldways') {
      try {
        // OWT backend expects { messages: [{role, content}, ...] }
        const owtMessages = [
          ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message }
        ];

        const owtResponse = await fetch('https://oldwaystoday-backend.onrender.com/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: owtMessages,
            source: 'azoni-portfolio',
          })
        });

        const owtData = await owtResponse.json();
        // OWT returns { message, usage }
        const reply = owtData.message;

        if (reply) {
          // Log to Firestore
          if (initFirebase()) {
            db.collection('agentChatLogs').add({
              agent: 'oldways',
              agentName: 'Old Ways Today',
              userMessage: message,
              reply,
              usage: owtData.usage || {},
              model: owtData.usage?.model || 'owt-backend',
              proxied: true,
              source: 'server',
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            }).catch(err => console.error('Log error:', err));
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              reply,
              agent: 'oldways',
              name: 'Old Ways Today',
              usage: owtData.usage || {},
              proxied: true,
            })
          };
        }
        // If no reply from OWT, fall through to local persona
        console.warn('[agent-chat] OWT backend returned no reply, falling back to local persona');
      } catch (owtErr) {
        console.error('[agent-chat] OWT backend proxy failed:', owtErr.message);
        // Fall through to local persona as fallback
      }
    }

    // Build conversation with history (max last 6 messages)
    const recentHistory = history.slice(-6).map(m => ({
      role: m.role,
      content: m.content
    }));

    const messages = [
      { role: 'system', content: persona.systemPrompt },
      ...recentHistory,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni AI Agent Chat'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages,
        max_tokens: 200,
        temperature: 0.9,
      })
    });

    const data = await response.json();

    if (data.choices?.[0]) {
      const reply = data.choices[0].message.content;
      const usage = data.usage || {};
      const pricing = MODEL_PRICING['openai/gpt-4o-mini'];
      const inputCost = ((usage.prompt_tokens || 0) / 1000) * pricing.input;
      const outputCost = ((usage.completion_tokens || 0) / 1000) * pricing.output;
      const totalCost = (inputCost + outputCost).toFixed(6);

      // Log to Firestore (fire and forget)
      if (initFirebase()) {
        db.collection('agentChatLogs').add({
          agent,
          agentName: persona.name,
          userMessage: message,
          reply,
          usage: {
            prompt_tokens: usage.prompt_tokens || 0,
            completion_tokens: usage.completion_tokens || 0,
            total_tokens: usage.total_tokens || 0,
            totalCost,
          },
          model: 'openai/gpt-4o-mini',
          source: 'server',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(err => console.error('Log error:', err));
      } else {
        console.warn('[agent-chat] Firebase init failed — chat not logged');
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reply,
          agent,
          name: persona.name,
          usage: {
            prompt_tokens: usage.prompt_tokens || 0,
            completion_tokens: usage.completion_tokens || 0,
            total_tokens: usage.total_tokens || 0,
            totalCost,
          },
        })
      };
    } else {
      throw new Error(data.error?.message || 'No response from model');
    }

  } catch (err) {
    console.error('Agent chat error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Something went wrong. Try again.' })
    };
  }
};