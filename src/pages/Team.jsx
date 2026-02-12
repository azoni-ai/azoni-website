import React, { useState, useRef, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import '../styles/team.css';

/* ─── SVG Avatars ─── */
const avatars = {
  orchestrator: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <rect x="22" y="28" width="56" height="52" rx="8" fill="#2e1065" stroke="#a78bfa" strokeWidth="2.5"/>
      <rect x="26" y="22" width="48" height="10" rx="4" fill="#7c3aed"/>
      <path d="M38 55 Q38 42 50 42 Q62 42 62 55 Q62 65 50 68 Q38 65 38 55Z" fill="#c4b5fd" stroke="#a78bfa" strokeWidth="1.5"/>
      <path d="M44 48 Q50 44 56 48" fill="none" stroke="#7c3aed" strokeWidth="2"/>
      <path d="M42 56 Q50 52 58 56" fill="none" stroke="#7c3aed" strokeWidth="2"/>
      <path d="M50 42 L50 68" stroke="#7c3aed" strokeWidth="1" opacity="0.5"/>
      <polygon points="35,22 40,12 45,19 50,8 55,19 60,12 65,22" fill="#facc15" stroke="#eab308" strokeWidth="1.5"/>
      <circle cx="40" cy="76" r="3.5" fill="#c4b5fd"/><circle cx="60" cy="76" r="3.5" fill="#c4b5fd"/>
      <circle cx="41" cy="75.5" r="1.5" fill="#2e1065"/><circle cx="61" cy="75.5" r="1.5" fill="#2e1065"/>
      <path d="M45 82 Q50 86 55 82" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="34" cy="48" r="2" fill="none" stroke="#c4b5fd" strokeWidth="1" opacity="0.5"/>
      <circle cx="60" cy="43" r="1.5" fill="none" stroke="#c4b5fd" strokeWidth="1" opacity="0.4"/>
    </svg>
  ),
  chat: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <rect x="15" y="15" width="70" height="55" rx="20" fill="#2563eb"/>
      <polygon points="30,70 42,70 32,88" fill="#2563eb"/>
      <circle cx="37" cy="38" r="7" fill="#dbeafe"/><circle cx="63" cy="38" r="7" fill="#dbeafe"/>
      <circle cx="38.5" cy="37" r="3.5" fill="#1e3a5f"/><circle cx="64.5" cy="37" r="3.5" fill="#1e3a5f"/>
      <circle cx="40" cy="36" r="1.2" fill="white"/><circle cx="66" cy="36" r="1.2" fill="white"/>
      <path d="M38 54 Q50 64 62 54" fill="none" stroke="#dbeafe" strokeWidth="3" strokeLinecap="round"/>
      <line x1="50" y1="15" x2="50" y2="4" stroke="#93c5fd" strokeWidth="2.5"/>
      <circle cx="50" cy="3" r="3.5" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1"/>
    </svg>
  ),
  blog: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <rect x="20" y="18" width="60" height="64" rx="3" fill="#fef3c7" stroke="#d97706" strokeWidth="2"/>
      <ellipse cx="50" cy="18" rx="34" ry="7" fill="#fbbf24" stroke="#d97706" strokeWidth="2"/>
      <ellipse cx="50" cy="82" rx="34" ry="7" fill="#fbbf24" stroke="#d97706" strokeWidth="2"/>
      <circle cx="38" cy="42" r="4.5" fill="#78350f"/><circle cx="62" cy="42" r="4.5" fill="#78350f"/>
      <circle cx="39.5" cy="41" r="1.8" fill="#fef3c7"/><circle cx="63.5" cy="41" r="1.8" fill="#fef3c7"/>
      <path d="M42 52 Q50 57 58 52" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round"/>
      <line x1="32" y1="60" x2="68" y2="60" stroke="#d97706" strokeWidth="1.5" opacity="0.3"/>
      <line x1="32" y1="66" x2="58" y2="66" stroke="#d97706" strokeWidth="1.5" opacity="0.3"/>
      <line x1="32" y1="72" x2="63" y2="72" stroke="#d97706" strokeWidth="1.5" opacity="0.3"/>
      <path d="M72 8 L79 28 L75 26 L71 30 L72 8Z" fill="#d97706"/>
      <line x1="75" y1="26" x2="75" y2="38" stroke="#78350f" strokeWidth="2"/>
    </svg>
  ),
  fitness: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <circle cx="50" cy="55" r="30" fill="#22c55e" stroke="#16a34a" strokeWidth="2.5"/>
      <path d="M25 45 Q50 34 75 45" fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round"/>
      <rect x="70" y="37" width="14" height="7" rx="2" fill="#ef4444" transform="rotate(15 77 41)"/>
      <rect x="35" y="48" width="9" height="6" rx="2" fill="#052e16"/><rect x="56" y="48" width="9" height="6" rx="2" fill="#052e16"/>
      <rect x="37.5" y="49.5" width="3" height="3" rx="1" fill="white"/><rect x="58.5" y="49.5" width="3" height="3" rx="1" fill="white"/>
      <path d="M40 64 L46 68 L50 64 L54 68 L60 64" fill="none" stroke="#052e16" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="4" y="21" width="14" height="18" rx="3" fill="#86efac" stroke="#16a34a" strokeWidth="2"/>
      <rect x="82" y="21" width="14" height="18" rx="3" fill="#86efac" stroke="#16a34a" strokeWidth="2"/>
      <rect x="16" y="26" width="68" height="8" rx="4" fill="#bbf7d0" stroke="#16a34a" strokeWidth="2"/>
      <path d="M22 47 Q14 38 14 29" fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M78 47 Q86 38 86 29" fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  ),
  gaming: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <path d="M50 4 L28 46 L72 46 Z" fill="#6d28d9" stroke="#5b21b6" strokeWidth="2"/>
      <ellipse cx="50" cy="46" rx="26" ry="7" fill="#7c3aed" stroke="#5b21b6" strokeWidth="2"/>
      <polygon points="50,16 52.5,23 60,23 54,28 56.5,35 50,31 43.5,35 46,28 40,23 47.5,23" fill="#facc15"/>
      <circle cx="50" cy="66" r="23" fill="#ede9fe" stroke="#a78bfa" strokeWidth="2"/>
      <ellipse cx="42" cy="63" rx="5" ry="6" fill="white" stroke="#6d28d9" strokeWidth="1.5"/>
      <ellipse cx="58" cy="63" rx="5" ry="6" fill="white" stroke="#6d28d9" strokeWidth="1.5"/>
      <circle cx="43.5" cy="63" r="3" fill="#3b0764"/><circle cx="59.5" cy="63" r="3" fill="#3b0764"/>
      <circle cx="45" cy="62" r="1" fill="white"/><circle cx="61" cy="62" r="1" fill="white"/>
      <path d="M44 76 Q50 80 56 76" fill="none" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round"/>
      <path d="M38 82 Q35 93 33 98" fill="none" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M50 84 Q50 95 50 100" fill="none" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M62 82 Q65 93 67 98" fill="none" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  social: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <path d="M25 38 L65 22 L65 78 L25 62 Z" fill="#ea580c"/>
      <rect x="16" y="36" width="12" height="28" rx="5" fill="#fb923c" stroke="#ea580c" strokeWidth="2"/>
      <ellipse cx="65" cy="50" rx="7" ry="28" fill="#c2410c" stroke="#9a3412" strokeWidth="2"/>
      <path d="M75 36 Q84 50 75 64" fill="none" stroke="#fdba74" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      <path d="M82 28 Q94 50 82 72" fill="none" stroke="#fdba74" strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
      <circle cx="40" cy="44" r="3.5" fill="#431407"/><circle cx="53" cy="42" r="3.5" fill="#431407"/>
      <circle cx="41.2" cy="43.5" r="1.2" fill="white"/><circle cx="54.2" cy="41.5" r="1.2" fill="white"/>
      <ellipse cx="46" cy="56" rx="5.5" ry="4.5" fill="#431407"/>
      <ellipse cx="46" cy="55" rx="3.5" ry="2.5" fill="#fca5a5"/>
      <path d="M28 64 Q19 75 13 78" fill="none" stroke="#ea580c" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M28 36 Q19 25 13 22" fill="none" stroke="#ea580c" strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  ),
  rag: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <rect x="19" y="58" width="62" height="12" rx="2" fill="#059669" stroke="#047857" strokeWidth="2" transform="rotate(-2 50 64)"/>
      <rect x="21" y="46" width="58" height="12" rx="2" fill="#10b981" stroke="#047857" strokeWidth="2" transform="rotate(1.5 50 52)"/>
      <rect x="17" y="34" width="66" height="12" rx="2" fill="#34d399" stroke="#047857" strokeWidth="2" transform="rotate(-1 50 40)"/>
      <path d="M24 34 L50 25 L76 34" fill="none" stroke="#047857" strokeWidth="2.5"/>
      <path d="M24 34 Q37 29 50 25" fill="#d1fae5" stroke="#047857" strokeWidth="1"/>
      <path d="M76 34 Q63 29 50 25" fill="#ecfdf5" stroke="#047857" strokeWidth="1"/>
      <circle cx="37" cy="40" r="3" fill="#022c22"/><circle cx="63" cy="40" r="3" fill="#022c22"/>
      <circle cx="38" cy="39.5" r="1.2" fill="white"/><circle cx="64" cy="39.5" r="1.2" fill="white"/>
      <path d="M44 45 Q50 47.5 56 45" fill="none" stroke="#022c22" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="37" cy="40" r="6.5" fill="none" stroke="#022c22" strokeWidth="1.2" opacity="0.4"/>
      <circle cx="63" cy="40" r="6.5" fill="none" stroke="#022c22" strokeWidth="1.2" opacity="0.4"/>
      <line x1="43.5" y1="40" x2="56.5" y2="40" stroke="#022c22" strokeWidth="1" opacity="0.4"/>
    </svg>
  ),
  errors: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <path d="M50 14 L76 28 L76 56 Q76 78 50 88 Q24 78 24 56 L24 28 Z" fill="#fecaca" stroke="#dc2626" strokeWidth="2.5"/>
      <path d="M50 36 L66 62 L34 62 Z" fill="#facc15" stroke="#eab308" strokeWidth="2"/>
      <line x1="50" y1="44" x2="50" y2="54" stroke="#78350f" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="50" cy="58" r="2" fill="#78350f"/>
      <circle cx="40" cy="26" r="3.5" fill="#7f1d1d"/><circle cx="60" cy="26" r="3.5" fill="#7f1d1d"/>
      <circle cx="41" cy="25.5" r="1.5" fill="white"/><circle cx="61" cy="25.5" r="1.5" fill="white"/>
    </svg>
  ),
};

/* ─── Agent Data ─── */
const AGENTS = {
  orchestrator: {
    name: "The Orchestrator",
    role: "Central Brain",
    color: "#a78bfa",
    bg: "#a78bfa15",
    borderColor: "#a78bfa30",
    quote: "Every 3 hours I wake up, check on the crew, and decide what needs doing. I see everything.",
    whatItIs: "A Netlify scheduled function that runs every 3 hours. Gathers state from 10+ sources across the entire ecosystem, feeds it all into GPT-4o as a single massive prompt, and executes whatever actions the LLM decides on.",
    whyUnique: "Most portfolio sites are static. This one has a brain that wakes up every 3 hours, reviews everything that happened, and makes autonomous decisions — writing blog posts, filling knowledge gaps, reorganizing the RAG database, reviewing error logs, and running self-assessments.",
    tech: ["Netlify Cron", "GPT-4o via OpenRouter", "Firestore", "Multi-action loop"],
    data: ["agent_activity — reads recent events", "blog_posts — checks for gaps", "error_logs — reviews and resolves", "rag_knowledge_base — fills gaps, reorganizes", "GitHub API — commit counts"],
    cycle: ["Cron fires every 3 hours", "Parallel fetch: activity, blogs, commits, errors, RAG health, chat stats", "Build state prompt (~2000 tokens)", "Send to GPT-4o: 'Given this state, pick 1-3 actions'", "Parse JSON response, execute each action", "Log all steps to agent_activity", "Sleep until next cycle"],
    code: `// State sent to GPT-4o every cycle:\n{\n  activity: [...last24h],\n  blogs: [...last48h],\n  github: { totalCommits: 12 },\n  knowledgeGaps: ["AI philosophy", ...],\n  ragHealth: { total: 24, autoGen: 8 },\n  recentErrors: { total: 3, bySeverity: {...} }\n}`,
    starters: ["What are you doing right now?", "How do you decide what to do?", "Who's your favorite agent?", "What's the hardest part of your job?"],
  },
  chat: {
    name: "Azoni AI",
    role: "The Face",
    color: "#60a5fa",
    bg: "#60a5fa15",
    borderColor: "#60a5fa30",
    quote: "Recruiters talk to me, and I make Charlton look great. If I don't know something? I teach myself on the spot.",
    whatItIs: "The user-facing chatbot on azoni.ai. Classifies every message across 12+ intent types, retrieves relevant RAG chunks from Firestore, and generates responses with GPT-4o-mini. When retrieval score is below 10, it generates new knowledge in real-time.",
    whyUnique: "It self-improves. When someone asks something new and the RAG score is low, it generates a new knowledge chunk on the spot, saves it to Firestore, uses it immediately, and logs the learning. Next person who asks gets an instant answer. Protected by a 4-layer safety system.",
    tech: ["GPT-4o-mini", "Firestore RAG", "Real-time knowledge gen", "4-layer safety"],
    data: ["rag_knowledge_base — reads and writes chunks", "chat_conversations — logs exchanges", "agent_activity — logs gaps + generated knowledge", "error_logs — reports failures"],
    cycle: ["Message received, normalize", "Intent detection: 12+ types via regex", "Score bonus per intent category", "Retrieve top 5 chunks, score by keyword overlap", "If bestScore < 10: 4-layer safety check", "Build system prompt with chunks + context", "GPT-4o-mini generates response", "Post-response: log gap if score was low"],
    code: `// 4-layer safety before generating knowledge:\nconst SAFETY_LAYERS = [\n  "Intent filter — only generatable intents",\n  "Blocklist — regex for attacks/off-topic",\n  "Rate limit — max 5 generations/hour",\n  "LLM refusal — model can skip with { skip: true }"\n];`,
    starters: ["How do you learn new things?", "What's a RAG score?", "Have you ever been stumped?", "What's the weirdest question you've gotten?"],
  },
  blog: {
    name: "The Scribe",
    role: "Blog Writer",
    color: "#fbbf24",
    bg: "#fbbf2415",
    borderColor: "#fbbf2430",
    quote: "Every morning I read through Charlton's commits and write about them. He codes, I narrate.",
    whatItIs: "A daily scheduled function (5PM UTC) that fetches yesterday's GitHub commits via GraphQL, groups them by repo, and has GPT-4o write a technical blog post with auto-generated SVG cover art.",
    whyUnique: "It doesn't just list commits — it writes narrative-driven technical content explaining what was built and why. After publishing, it auto-seeds a RAG chunk so the chatbot can reference the blog.",
    tech: ["GitHub GraphQL API", "GPT-4o", "Auto SVG covers", "RAG auto-seeding"],
    data: ["GitHub GraphQL — commit history", "blog_posts — published posts", "rag_knowledge_base — auto-seeds summaries", "agent_activity — logs publishing"],
    cycle: ["5PM UTC cron fires", "Calculate yesterday's date", "GraphQL fetch: all commits across all repos", "Group by repository, extract messages", "GPT-4o writes the blog post", "Generate SVG cover art", "Publish to Firestore", "Auto-seed RAG chunk for chatbot"],
    code: `// GraphQL for commits:\nquery($username: String!, $from: DateTime!) {\n  user(login: $username) {\n    contributionsCollection(from: $from) {\n      commitContributionsByRepository {\n        repository { name, url }\n        contributions { nodes { commitCount } }\n      }\n    }\n  }\n}`,
    starters: ["What did you write about today?", "How do you pick blog titles?", "Do you enjoy writing?", "What's your best blog post?"],
  },
  fitness: {
    name: "Coach",
    role: "Fitness Agent",
    color: "#4ade80",
    bg: "#4ade8015",
    borderColor: "#4ade8030",
    quote: "LETS GOOOO! 315lb bench PR. I track every rep, every set, every PR. No days off.",
    whatItIs: "The AI backend of BenchPressOnly, a real fitness tracking app with actual users. Generates personalized AI workouts, tracks personal records, analyzes progress, and feeds data back to the orchestrator.",
    whyUnique: "It's not a demo — real users log real workouts. The AI tailors plans to user history and goals. Live fitness data is available in chatbot responses.",
    tech: ["React Native / Web", "Firebase Auth", "AI workout gen", "Serverless functions"],
    data: ["users — auth and profiles", "workouts — plans + completions", "personal_records — PR history", "agent_activity — reports to orchestrator"],
    cycle: ["User requests workout", "AI considers: history, PRs, muscle rotation, fatigue", "Generate plan with sets, reps, weights", "User logs completion", "PR detection vs historical bests", "Progress analysis: weekly/monthly trends", "Summary available in chatbot"],
    code: `// Live fitness data available in chat:\n{\n  recentPR: "Bench Press: 315 lbs",\n  weeklyWorkouts: 4,\n  currentStreak: "12 days",\n  focusAreas: ["chest", "shoulders"],\n  lastWorkout: "2 hours ago"\n}`,
    starters: ["What should I bench today?", "What's Charlton's PR?", "Give me a pep talk", "What's the secret to gains?"],
  },
  gaming: {
    name: "The Wizard",
    role: "Gaming Agent",
    color: "#c084fc",
    bg: "#c084fc15",
    borderColor: "#c084fc30",
    quote: "I create wizards with unique backstories and abilities. I also control the dungeon enemies... shhh.",
    whatItIs: "The AI layer inside Spell Brigade, a real-time multiplayer wizard combat game. Generates unique characters with AI-written backstories and custom abilities, controls enemy AI behavior in dungeons.",
    whyUnique: "Every character is genuinely unique — AI writes backstory, personality, and creates custom abilities that affect gameplay. Server was refactored from a 6,743-line monolith into 16 modular files.",
    tech: ["Node.js server", "Socket.io", "Three.js 3D", "GPT-4o-mini"],
    data: ["wizards — characters + abilities", "dungeons — procedural state", "game_sessions — live matches", "agent_activity — creation events"],
    cycle: ["Player creates character", "AI generates: name, backstory, traits", "AI creates 3-4 custom abilities", "Abilities balanced but narratively unique", "In dungeon: enemy AI evaluates game state", "Enemy selects optimal attack patterns", "All combat real-time via Socket.io"],
    code: `// Server modular structure:\nserver/\n  config/     — game constants, balancing\n  db/         — Firestore connections\n  auth/       — session management\n  systems/    — combat, movement, spawning\n  events/     — socket handlers per event\n// 16 files, each < 500 lines`,
    starters: ["Create a wizard for me", "What's the strongest spell?", "How do dungeon enemies think?", "Tell me about the great refactoring"],
  },
  social: {
    name: "The Hype Man",
    role: "Social Agent",
    color: "#fb923c",
    bg: "#fb923c15",
    borderColor: "#fb923c30",
    quote: "I handle the social game so Charlton can focus on building. I never sleep because I literally can't.",
    whatItIs: "Autonomous social presence manager. Posts content, engages with discussions, and maintains visibility across platforms. Managed entirely by the orchestrator's decisions.",
    whyUnique: "Operates on the orchestrator's judgment rather than a fixed schedule. The orchestrator evaluates whether social activity is needed based on recent posts, project updates, and engagement gaps.",
    tech: ["Orchestrator-triggered", "LLM content gen", "Platform APIs", "Activity logging"],
    data: ["agent_activity — all posts logged", "blog_posts — content source", "Orchestrator state — trigger decisions"],
    cycle: ["Orchestrator evaluates activity gaps", "Decides content type and platform", "Generates content with appropriate tone", "Posts via platform APIs", "Logs engagement to activity feed"],
    code: `// Orchestrator decision:\n{\n  "action": "social_post",\n  "reason": "No social activity in 48h,\n    new blog would engage dev community",\n  "platform": "moltbook",\n  "content_seed": "Server refactor: 6743 → 16"\n}`,
    starters: ["What's trending right now?", "How do you decide what to post?", "What gets the most engagement?", "Hype me up"],
  },
  rag: {
    name: "The Library",
    role: "Knowledge Base",
    color: "#34d399",
    bg: "#34d39915",
    borderColor: "#34d39930",
    quote: "Chat reads from me, Blog writes to me, the Orchestrator keeps me tidy. I grow smarter every day.",
    whatItIs: "Firestore-backed RAG system with 20+ seeded chunks plus auto-generated ones. The chat agent queries it, the blog agent writes to it, and the orchestrator maintains it by merging duplicates.",
    whyUnique: "Grows through three channels: manually seeded chunks, auto-generated blog summaries, and real-time chunks from the chat agent. The orchestrator reviews and cleans up when auto-generated chunks exceed 30.",
    tech: ["Firestore collection", "Keyword scoring", "Category filtering", "Auto-generation pipeline"],
    data: ["rag_knowledge_base — the chunks", "agent_activity — gen/cleanup events", "chat_conversations — gap signals"],
    cycle: ["Chunk structure: title, content, category, keywords[]", "Retrieval: normalize query, match keywords", "Scoring: keyword overlaps + category bonus", "Top 5 returned, sorted by score", "Gap detected → new chunk generated + saved", "Orchestrator cleanup: merge duplicates"],
    code: `// RAG chunk example:\n{\n  title: "Career Transitions",\n  category: "negotiation",\n  keywords: ["left", "quit", "career"],\n  content: "T-Mobile (2017-2021): Left after\n    completing M.S. and building a major\n    platform...",\n  autoGenerated: false\n}`,
    starters: ["How many chunks do you have?", "What's a knowledge gap?", "Do you like being organized?", "What's your favorite category?"],
  },
  errors: {
    name: "The Watchdog",
    role: "Error Tracker",
    color: "#f87171",
    bg: "#f8717115",
    borderColor: "#f8717130",
    quote: "I watch everything. Every crash, every timeout, every 500 across all apps. Nothing escapes me.",
    whatItIs: "Centralized error logging endpoint. Any app POSTs errors here with severity levels. High/critical errors surface immediately in the activity feed. The orchestrator reviews patterns each cycle.",
    whyUnique: "Single source of truth for errors across 5 applications. The orchestrator can spot recurring patterns, mark errors resolved, and include error health in self-assessments.",
    tech: ["Netlify Function", "Firestore error_logs", "4 severity levels", "Activity feed integration"],
    data: ["error_logs — writes + reads for review", "agent_activity — high/critical alerts", "Orchestrator state — error summary per cycle"],
    cycle: ["App catches an error", "POST to /log-error with source, severity, context", "Validate auth + fields", "Store in Firestore with resolved: false", "High/critical → write to activity feed", "Orchestrator reads last 24h each cycle", "Orchestrator can summarize + mark resolved"],
    code: `// Any app reports errors:\nfetch('/log-error', {\n  method: 'POST',\n  body: JSON.stringify({\n    source: 'spell-brigade',\n    error: 'Socket disconnect in combat',\n    severity: 'medium',\n    context: { function: 'handleCombat' }\n  })\n})`,
    starters: ["Any errors right now?", "What's the worst error you've seen?", "Are you always this paranoid?", "How do you feel about bugs?"],
  },
};

const AGENT_ORDER = ['orchestrator', 'chat', 'rag', 'blog', 'fitness', 'gaming', 'social', 'errors'];

/* ─── Agent Chat Hook ─── */
function useAgentChat(agentKey) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/.netlify/functions/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: agentKey,
          message: text,
          history: [...messages, userMsg].slice(-6),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        throw new Error(data.error || 'No reply');
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Hmm, something went wrong. Try again?" }]);
    } finally {
      setIsLoading(false);
    }
  }, [agentKey, messages, isLoading]);

  return { messages, isLoading, sendMessage, messagesEndRef };
}

/* ─── Chat Panel Component ─── */
function AgentChat({ agentKey, agent }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, messagesEndRef } = useAgentChat(agentKey);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="team-chat-panel">
      <div className="team-chat-header" onClick={() => setOpen(!open)}>
        <div className="team-chat-header-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={agent.color} strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="team-chat-header-label">Chat with {agent.name}</span>
        </div>
        <span className={`team-chat-header-toggle ${open ? 'open' : ''}`}>+</span>
      </div>

      {open && (
        <>
          <div className="team-chat-messages">
            {messages.length === 0 && (
              <div className="team-chat-msg agent" style={{ background: agent.bg, borderColor: agent.borderColor }}>
                <span className="agent-msg-name" style={{ color: agent.color }}>{agent.name}</span>
                {agent.quote}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`team-chat-msg ${msg.role === 'user' ? 'user' : 'agent'}`}
                style={msg.role === 'assistant' ? { background: agent.bg, borderColor: agent.borderColor } : {}}>
                {msg.role === 'assistant' && (
                  <span className="agent-msg-name" style={{ color: agent.color }}>{agent.name}</span>
                )}
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="team-chat-typing">
                <span style={{ background: agent.color }}/><span style={{ background: agent.color }}/><span style={{ background: agent.color }}/>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Quick starters */}
          {messages.length === 0 && (
            <div className="team-chat-starters">
              {agent.starters.map((q, i) => (
                <button key={i} className="team-chat-starter" onClick={() => { sendMessage(q); }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="team-chat-input-row">
            <input
              className="team-chat-input"
              placeholder={`Ask ${agent.name} something...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              maxLength={500}
              disabled={isLoading}
            />
            <button className="team-chat-send" onClick={handleSend} disabled={isLoading || !input.trim()}>
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main Team Page ─── */
const Team = () => {
  const [selected, setSelected] = useState(null);

  const scrollToProfile = (key) => {
    setSelected(key);
    setTimeout(() => {
      const el = document.getElementById(`profile-${key}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const sel = selected ? AGENTS[selected] : null;

  return (
    <Layout>
      <section className="team-page">
        <div className="container team-container">

          {/* Banner */}
          <div className="team-banner">
            <div className="team-banner-label">azoni.ai / team</div>
            <h1>Meet the Team</h1>
            <p className="team-banner-sub">
              Eight AI agents run this portfolio autonomously — writing blogs, answering questions, tracking errors, generating game characters, and coaching workouts. Each one has a job, a personality, and a chat. Say hi.
            </p>
          </div>

          {/* Agent Grid */}
          <div className="team-grid">
            {AGENT_ORDER.map(key => {
              const a = AGENTS[key];
              return (
                <div
                  key={key}
                  className={`team-grid-card ${selected === key ? 'active' : ''}`}
                  onClick={() => scrollToProfile(key)}
                >
                  <div className="status-dot" style={{ background: a.color }}/>
                  <div className="avatar-wrap">{avatars[key](64)}</div>
                  <div className="agent-name">{a.name}</div>
                  <div className="agent-role">{a.role}</div>
                </div>
              );
            })}
          </div>

          {/* Selected Profile */}
          {sel && (
            <div id={`profile-${selected}`} className="team-profile" style={{ borderColor: sel.borderColor }}>
              {/* Header */}
              <div className="team-profile-header">
                <div className="team-profile-avatar">{avatars[selected](100)}</div>
                <div className="team-profile-info">
                  <h2>{sel.name}</h2>
                  <span className="team-profile-role" style={{ color: sel.color, background: sel.bg, border: `1px solid ${sel.borderColor}` }}>
                    {sel.role}
                  </span>
                  <div className="team-profile-quote" style={{ borderLeftColor: sel.color }}>
                    "{sel.quote}"
                  </div>
                </div>
              </div>

              {/* Body grid */}
              <div className="team-profile-body">
                <div className="team-profile-section">
                  <div className="team-profile-section-label">What It Is</div>
                  <p>{sel.whatItIs}</p>
                </div>
                <div className="team-profile-section">
                  <div className="team-profile-section-label">What Makes It Unique</div>
                  <p>{sel.whyUnique}</p>
                </div>

                <div className="team-profile-section">
                  <div className="team-profile-section-label">Tech Stack</div>
                  <div className="team-tags">
                    {sel.tech.map((t, i) => (
                      <span key={i} className="team-tag" style={{ color: sel.color, borderColor: sel.borderColor }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="team-profile-section">
                  <div className="team-profile-section-label">Data It Touches</div>
                  {sel.data.map((d, i) => (
                    <div key={i} className="team-data-item">
                      <span className="team-data-prefix" style={{ color: sel.color }}>{'// '}</span>{d}
                    </div>
                  ))}
                </div>

                <div className="team-profile-section full-width">
                  <div className="team-profile-section-label">Execution Cycle</div>
                  {sel.cycle.map((step, i) => (
                    <div key={i} className="team-cycle-step">
                      <span className="team-cycle-num" style={{ color: sel.color }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="team-profile-section full-width">
                  <div className="team-profile-section-label">Code</div>
                  <pre className="team-code">{sel.code}</pre>
                </div>
              </div>

              {/* Chat */}
              <AgentChat agentKey={selected} agent={sel}/>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Team;