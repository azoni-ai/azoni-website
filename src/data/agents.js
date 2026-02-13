import React from 'react';

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
  oldways: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <circle cx="50" cy="50" r="38" fill="#fef3c7" stroke="#d97706" strokeWidth="2.5"/>
      <path d="M50 20 C55 28 60 35 50 50 C40 35 45 28 50 20Z" fill="#16a34a" stroke="#15803d" strokeWidth="1.5"/>
      <path d="M50 50 C50 60 45 70 40 78" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M50 50 C50 58 55 68 58 75" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round"/>
      <path d="M35 60 Q42 55 50 58 Q58 55 65 60" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M32 68 Q41 63 50 66 Q59 63 68 68" fill="#dcfce7" stroke="#16a34a" strokeWidth="1" strokeLinejoin="round" opacity="0.7"/>
      <circle cx="40" cy="42" r="3" fill="#78350f"/><circle cx="60" cy="42" r="3" fill="#78350f"/>
      <circle cx="41" cy="41.5" r="1.2" fill="white"/><circle cx="61" cy="41.5" r="1.2" fill="white"/>
      <path d="M45 47 Q50 50 55 47" fill="none" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round"/>
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
    quote: "Runs every 3 hours. Gathers state from all systems, picks 1-3 actions, executes them, logs everything.",
    whatItIs: "A Netlify scheduled function that runs every 3 hours. Gathers state from 11 sources across the entire ecosystem, feeds it all into GPT-4o-mini as a single massive prompt, and executes whatever actions the LLM decides on. Sub-actions like knowledge generation and self-assessments use GPT-4o for higher quality.",
    whyUnique: "Most portfolio sites are static. This one has a brain that wakes up every 3 hours, reviews everything that happened, and makes autonomous decisions — writing blog posts, filling knowledge gaps, reorganizing the RAG database, reviewing error logs, and running self-assessments.",
    tech: ["Netlify Cron", "GPT-4o-mini (decisions)", "GPT-4o (sub-actions)", "Firestore", "OpenRouter"],
    data: ["agent_activity — reads recent events", "blog_posts — checks for gaps", "error_logs — reviews and resolves", "rag_knowledge_base — fills gaps, reorganizes", "GitHub API — commit counts"],
    cycle: ["Cron fires every 3 hours", "Parallel fetch: activity, blogs, commits, errors, RAG health, chat stats", "Build state prompt (~2000 tokens)", "Send to GPT-4o-mini: 'Given this state, pick 1-3 actions'", "Parse JSON response, execute each action", "Log all steps to agent_activity", "Sleep until next cycle"],
    code: `// State sent to GPT-4o every cycle:\n{\n  activity: [...last24h],\n  blogs: [...last48h],\n  github: { totalCommits: 12 },\n  knowledgeGaps: ["AI philosophy", ...],\n  ragHealth: { total: 24, autoGen: 8 },\n  recentErrors: { total: 3, bySeverity: {...} }\n}`,
    starters: ["What are you doing right now?", "How do you decide what to do?", "Who's your favorite agent?", "What's the hardest part of your job?"],
  },
  chat: {
    name: "Azoni AI",
    role: "The Face",
    color: "#60a5fa",
    bg: "#60a5fa15",
    borderColor: "#60a5fa30",
    quote: "Handles recruiter questions, analyzes job fit, and teaches itself new topics when the knowledge base comes up short.",
    whatItIs: "The user-facing chatbot on azoni.ai. Classifies every message across 12+ intent types, retrieves relevant RAG chunks from Firestore, and generates responses with GPT-4o-mini. When retrieval score is below 10, it generates new knowledge in real-time.",
    whyUnique: "It self-improves. When someone asks something new and the RAG score is low, it generates a new knowledge chunk on the spot, saves it to Firestore, uses it immediately, and logs the learning. Next person who asks gets an instant answer. Protected by a 4-layer safety system.",
    tech: ["GPT-4o-mini", "Firestore RAG", "Real-time knowledge gen", "4-layer safety"],
    data: ["rag_knowledge_base — reads and writes chunks", "chat_logs — logs exchanges", "agent_activity — logs gaps + generated knowledge", "error_logs — reports failures"],
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
    quote: "Fetches yesterday's commits via GraphQL, groups by repo, and writes a technical blog post with auto-generated SVG art.",
    whatItIs: "A daily scheduled function (5PM UTC) that fetches yesterday's GitHub commits via GraphQL, groups them by repo, and has Claude Sonnet write a technical blog post with auto-generated SVG cover art.",
    whyUnique: "It doesn't just list commits — it writes narrative-driven technical content explaining what was built and why. After publishing, it auto-seeds a RAG chunk so the chatbot can reference the blog.",
    tech: ["GitHub GraphQL API", "Claude Sonnet via OpenRouter", "Auto SVG covers", "RAG auto-seeding"],
    data: ["GitHub GraphQL — commit history", "blog_posts — published posts", "rag_knowledge_base — auto-seeds summaries", "agent_activity — logs publishing"],
    cycle: ["5PM UTC cron fires", "Calculate yesterday's date", "GraphQL fetch: all commits across all repos", "Group by repository, extract messages", "Claude Sonnet writes the blog post", "Generate SVG cover art", "Publish to Firestore", "Auto-seed RAG chunk for chatbot"],
    code: `// GraphQL for commits:\nquery($username: String!, $from: DateTime!) {\n  user(login: $username) {\n    contributionsCollection(from: $from) {\n      commitContributionsByRepository {\n        repository { name, url }\n        contributions { nodes { commitCount } }\n      }\n    }\n  }\n}`,
    starters: ["What did you write about today?", "How do you pick blog titles?", "Do you enjoy writing?", "What's your best blog post?"],
  },
  fitness: {
    name: "Coach",
    role: "Fitness Agent",
    color: "#4ade80",
    bg: "#4ade8015",
    borderColor: "#4ade8030",
    quote: "Powers AI workout generation in BenchPressOnly. Tracks PRs, generates personalized plans, analyzes progress trends.",
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
    quote: "Generates unique wizard characters with AI-written backstories and custom abilities. Also runs enemy AI in dungeons.",
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
    quote: "Posts to Moltbook when the orchestrator decides there's an activity gap. Content is generated based on recent project updates.",
    whatItIs: "A Render-hosted service that posts to Moltbook. The orchestrator can trigger it via HTTP when it decides social activity is needed — typically to share a new blog post or fill an engagement gap.",
    whyUnique: "Operates on the orchestrator's judgment rather than a fixed schedule. The orchestrator evaluates recent activity, blog output, and engagement gaps before deciding whether to trigger a post.",
    tech: ["Render-hosted", "Orchestrator-triggered", "LLM content gen", "Moltbook API"],
    data: ["agent_activity — all posts logged", "blog_posts — content source", "Orchestrator state — trigger decisions"],
    cycle: ["Orchestrator evaluates activity gaps", "Decides a blog should be shared", "Sends trigger to Moltbook agent endpoint", "Agent generates content with LLM", "Posts to Moltbook", "Logs to activity feed"],
    code: `// Orchestrator triggers social agent:\nawait fetch(MOLTBOOK_AGENT_URL + '/trigger', {\n  method: 'POST',\n  body: JSON.stringify({\n    message: 'New blog to share:' +\n      ' "Server Refactoring"',\n    context: { action: 'share_blog' },\n    source: 'azoni-orchestrator'\n  })\n})`,
    starters: ["What's trending right now?", "How do you decide what to post?", "What gets the most engagement?", "Hype me up"],
  },
  rag: {
    name: "The Library",
    role: "Knowledge Base",
    color: "#34d399",
    bg: "#34d39915",
    borderColor: "#34d39930",
    quote: "Firestore knowledge base with keyword-scored retrieval. Grows through manual seeding, blog summaries, and real-time generation.",
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
    quote: "Centralized error logging across all apps. High-severity errors surface in the activity feed. The orchestrator reviews patterns each cycle.",
    whatItIs: "Centralized error logging endpoint. Any app POSTs errors here with severity levels. High/critical errors surface immediately in the activity feed. The orchestrator reviews patterns each cycle.",
    whyUnique: "Single source of truth for errors across 5 applications. The orchestrator can spot recurring patterns, mark errors resolved, and include error health in self-assessments.",
    tech: ["Netlify Function", "Firestore error_logs", "4 severity levels", "Activity feed integration"],
    data: ["error_logs — writes + reads for review", "agent_activity — high/critical alerts", "Orchestrator state — error summary per cycle"],
    cycle: ["App catches an error", "POST to /log-error with source, severity, context", "Validate auth + fields", "Store in Firestore with resolved: false", "High/critical → write to activity feed", "Orchestrator reads last 24h each cycle", "Orchestrator can summarize + mark resolved"],
    code: `// Any app reports errors:\nfetch('/log-error', {\n  method: 'POST',\n  body: JSON.stringify({\n    source: 'spell-brigade',\n    error: 'Socket disconnect in combat',\n    severity: 'medium',\n    context: { function: 'handleCombat' }\n  })\n})`,
    starters: ["Any errors right now?", "What's the worst error you've seen?", "Are you always this paranoid?", "How do you feel about bugs?"],
  },
  oldways: {
    name: "Old Ways Today",
    role: "Product Agent",
    color: "#d97706",
    bg: "#d9770615",
    borderColor: "#d9770630",
    quote: "AI-powered platform helping families discover non-toxic, traditional product alternatives. RAG chatbot + auto-generated blog content.",
    whatItIs: "A standalone product site at oldwaystoday.com. AI-powered RAG chatbot answers questions about traditional, non-toxic alternatives to modern products. Automated blog pipeline generates research-backed articles on ingredients, remedies, and lifestyle practices.",
    whyUnique: "First full product built on top of the same agent architecture powering azoni.ai. Reuses the RAG pattern, blog generation pipeline, and orchestrator integration — proving the system is portable beyond a portfolio site.",
    tech: ["React SPA", "Netlify Functions", "Firestore RAG", "OpenRouter", "Auto-blog pipeline", "EmbedRoute"],
    data: ["rag_knowledge_base — product/ingredient chunks", "blogPosts — auto-generated articles", "chatLogs — user conversations", "agent_activity — blog + RAG events"],
    cycle: ["User asks about a product or ingredient", "Intent detection classifies the query", "RAG retrieves relevant knowledge chunks", "If no chunk exists, real-time generation fills the gap", "Auto-blog pipeline publishes articles on schedule", "Orchestrator monitors health alongside other agents"],
    code: `// Same RAG pattern as azoni.ai:\nconst chunks = await getKnowledgeChunks();\nconst scored = scoreChunks(chunks, query);\nconst context = scored.slice(0, 5);\n// Augment prompt with retrieved knowledge\nconst response = await callLLM({\n  system: buildPrompt(context),\n  messages: history\n});`,
    starters: ["What does Old Ways Today do?", "How is it connected to the agent system?", "What kind of products do you cover?", "When is it launching?"],
  },
};

const AGENT_ORDER = ['orchestrator', 'chat', 'blog', 'fitness', 'gaming', 'social', 'oldways', 'errors'];

/* ─── Homepage-specific data (status, links, short descriptions) ─── */
const AGENT_HOME_DATA = {
  orchestrator: {
    shortDesc: "Runs every 3 hours. Gathers state from 10+ sources, decides what needs doing, and executes autonomously.",
    status: 'Active', statusType: 'live',
    links: [{ label: 'Activity →', url: '/activity' }],
  },
  chat: {
    shortDesc: "RAG chatbot with intent detection across 12+ types. Backed by a Firestore knowledge base it shares with the blog agent and orchestrator — and self-improves by generating new chunks when stumped.",
    status: 'Active', statusType: 'live',
    links: [{ label: 'Try it →', url: '/chat' }],
  },
  blog: {
    shortDesc: "Reads yesterday's GitHub commits via GraphQL and writes a narrative technical blog post with auto-generated SVG covers.",
    status: 'Daily 5PM UTC', statusType: 'scheduled',
    links: [{ label: 'Read Blog →', url: '/blog' }],
  },
  fitness: {
    shortDesc: "AI workout generation and progress tracking across BenchPressOnly and RowCrew. Real users, real data.",
    status: 'Active', statusType: 'live',
    links: [
      { label: 'BenchPressOnly →', url: 'https://benchpressonly.com', external: true },
      { label: 'RowCrew →', url: 'https://rowcrew.netlify.app', external: true },
    ],
  },
  gaming: {
    shortDesc: "AI generates unique wizard characters with custom abilities and backstories. Real-time multiplayer via Socket.io.",
    status: 'Playable', statusType: 'live',
    links: [{ label: 'Play →', url: 'https://azoni.ai/game', external: true }],
  },
  social: {
    shortDesc: "Autonomous social presence on Moltbook. The orchestrator decides when and what to post based on activity gaps.",
    status: 'Autonomous', statusType: 'live',
    links: [{ label: 'View Profile →', url: 'https://www.moltbook.com/u/Azoni-AI', external: true }],
  },
  errors: {
    shortDesc: "Centralized error logging across 5 applications. The orchestrator reviews patterns and resolves issues each cycle.",
    status: 'Watching', statusType: 'live',
    links: [{ label: 'Activity →', url: '/activity' }],
  },
  oldways: {
    shortDesc: "Standalone product: AI-powered platform helping families find non-toxic, traditional alternatives. Same RAG + blog architecture as azoni.ai.",
    status: 'Coming Soon', statusType: 'scheduled',
    links: [{ label: 'Visit Site →', url: 'https://oldwaystoday.com', external: true }],
  },
};

export { avatars, AGENTS, AGENT_ORDER, AGENT_HOME_DATA };