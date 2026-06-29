#!/usr/bin/env node

/*
 * Audit portfolio chatbot logs for questions the current knowledge base
 * cannot answer well.
 *
 * Usage:
 *   node scripts/audit-chat-knowledge.js
 *   node scripts/audit-chat-knowledge.js --logs path/to/chatLogs.json
 *
 * With no --logs file, the script reads Firestore through firebase-admin and
 * requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.
 */

const fs = require('fs');

const GAP_PHRASES = [
  "i don't have detailed",
  "i do not have detailed",
  "not in my knowledge base",
  "don't have that specific detail",
  "do not have that specific detail",
  "for more specific details",
  "would be best to contact",
  "reach out directly",
  "contact him directly",
  "contact charlton directly",
  "i'm not sure",
  "i am not sure",
  "no information"
];

const THEMES = [
  {
    key: 'interview_stories',
    label: 'Interview stories and lessons learned',
    patterns: [
      /regret|missed signal|lesson learned|mistake|failure|would.*redo/i,
      /risky.*assumption|assumption.*validat|technical assumption/i,
      /hardest|tradeoff|trade-off|constraint|incident/i
    ]
  },
  {
    key: 'product_experience',
    label: 'Product, customers, and user validation',
    patterns: [
      /customer[-\s]?facing|real users|users|product|validated|traction|adoption/i,
      /how many years.*customer|product-market|market/i
    ]
  },
  {
    key: 'role_fit',
    label: 'Role fit and hiring signal',
    patterns: [
      /fit|role|team|why.*hire|value.*bring|strength|weakness|senior|staff/i,
      /startup|enterprise|remote|hybrid/i
    ]
  },
  {
    key: 'career_story',
    label: 'Career transitions and motivations',
    patterns: [
      /why.*leave|left|looking|available|career|gap|laid off|quit/i,
      /capital one|t-mobile|tmobile|slalom/i
    ]
  },
  {
    key: 'project_deep_dives',
    label: 'Project deep dives',
    patterns: [
      /fab stats|embedroute|row crew|bench|spell brigade|moltbook|old ways|tcgdoku|azoni/i,
      /architecture|scale|performance|security|privacy|extension|discord bot/i
    ]
  },
  {
    key: 'technical_depth',
    label: 'Technical skills and system design',
    patterns: [
      /aws|lambda|firestore|firebase|postgres|python|react|typescript|node|fastapi/i,
      /rag|embedding|vector|mcp|agent|llm|openai|claude|devops|infrastructure/i
    ]
  },
  {
    key: 'personal_working_style',
    label: 'Working style and personal preferences',
    patterns: [
      /work style|communicat|conflict|feedback|manage|mentor|collaborat/i,
      /prefer|motivat|culture|values/i
    ]
  },
  {
    key: 'compensation',
    label: 'Compensation and negotiation',
    patterns: [
      /salary|compensation|pay|rate|equity|offer|budget|negot/i
    ]
  }
];

function parseArgs(argv) {
  const args = { limit: 250, logsPath: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--logs') args.logsPath = argv[++i];
    else if (argv[i] === '--limit') args.limit = Number(argv[++i] || args.limit);
  }
  return args;
}

function normalizeLog(doc) {
  const data = doc.data ? doc.data() : doc;
  return {
    id: doc.id || data.id || null,
    userMessage: data.userMessage || data.user || data.query || '',
    assistantMessage: data.assistantMessage || data.assistant || data.response || '',
    context: data.context || 'unknown',
    mode: data.mode || null,
    model: data.model || null,
    rag: data.rag || null,
    usage: data.usage || null,
    timestamp: data.timestamp || data.createdAt || null
  };
}

function isWeakAnswer(log) {
  const assistant = String(log.assistantMessage || '').toLowerCase();
  const user = String(log.userMessage || '').trim();
  if (!user) return false;

  const gapPhrase = GAP_PHRASES.some((phrase) => assistant.includes(phrase));
  const bestScore = Number(log.rag?.bestRetrievalScore ?? log.rag?.score ?? NaN);
  const lowScore = Number.isFinite(bestScore) && bestScore < 10;
  const noChunks = log.rag && Number(log.rag.chunksUsed ?? log.rag.chunksRetrieved ?? 1) === 0;
  const veryShortDeflection = assistant.length < 260 && /contact|reach out|don't have|do not have/i.test(assistant);

  return gapPhrase || lowScore || noChunks || veryShortDeflection;
}

function themeForQuestion(question) {
  for (const theme of THEMES) {
    if (theme.patterns.some((pattern) => pattern.test(question))) return theme;
  }
  return { key: 'unknown', label: 'Unknown / needs review' };
}

function groupLogs(logs) {
  const weak = logs.filter(isWeakAnswer);
  const groups = new Map();

  for (const log of weak) {
    const theme = themeForQuestion(log.userMessage);
    if (!groups.has(theme.key)) {
      groups.set(theme.key, {
        key: theme.key,
        label: theme.label,
        count: 0,
        examples: []
      });
    }

    const group = groups.get(theme.key);
    group.count += 1;
    if (group.examples.length < 12) {
      group.examples.push({
        question: log.userMessage,
        answer: String(log.assistantMessage || '').slice(0, 360),
        context: log.context,
        model: log.model,
        rag: log.rag
      });
    }
  }

  return {
    totalLogs: logs.length,
    weakAnswers: weak.length,
    groups: [...groups.values()].sort((a, b) => b.count - a.count)
  };
}

async function readLogsFromFile(logsPath) {
  const raw = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
  const docs = Array.isArray(raw) ? raw : raw.docs || raw.chatLogs || raw.logs || [];
  return docs.map(normalizeLog);
}

async function readLogsFromFirestore(limitCount) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase admin env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, or pass --logs exported-chatLogs.json.');
  }

  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      })
    });
  }

  const db = admin.firestore();
  const snapshot = await db.collection('chatLogs')
    .orderBy('timestamp', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map(normalizeLog);
}

async function main() {
  const args = parseArgs(process.argv);
  const logs = args.logsPath
    ? await readLogsFromFile(args.logsPath)
    : await readLogsFromFirestore(args.limit);

  console.log(JSON.stringify(groupLogs(logs), null, 2));
}

main().catch((err) => {
  console.error(`audit failed: ${err.message}`);
  process.exit(1);
});
