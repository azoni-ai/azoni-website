export const projects = [
  {
    id: 'fab-stats',
    title: 'FaB Stats',
    tagline: 'Stats site and Discord bot for the Flesh and Blood TCG.',
    description: 'Stats site for competitive Flesh and Blood. Match logging, hero performance, matchup win rates, leaderboards, daily minigames.',
    longDescription: `Built FaB Stats because the Flesh and Blood community kept arguing about the meta without real data.

Players log matches, browse hero-level performance, compare matchup win rates, and climb leaderboards. There's a Chrome extension that imports a tournament bracket in one click, a Discord bot in 20+ servers, and a rotating set of daily puzzle minigames (FaBdoku, Bladedash, Brutebrawl) that people play in the morning.`,
    tech: ['Next.js', 'React', 'TypeScript', 'Firebase', 'Netlify Functions', 'Satori'],
    highlights: [
      'Chrome extension imports a whole tournament in one click',
      'Discord bot with 24 slash commands across multiple servers',
      'Daily minigames with seeded RNG and Satori-generated OG images',
      'Hero-level analytics and matchup data'
    ],
    links: {
      live: 'https://fabstats.net',
      github: null
    },
    image: '/images/fabstats-icon.svg',
    featured: true,
    category: 'games',
    displayOrder: 1
  },
  {
    id: 'embedroute',
    metric: { value: '4', label: 'providers, one key' },
    title: 'EmbedRoute',
    tagline: 'Embedding API gateway. One key, four providers.',
    description: 'Embedding API gateway. One key, four providers, drop-in OpenAI-compatible endpoint.',
    longDescription: `Every RAG project I built had the same three files: an embedding wrapper, a provider switch, and a usage logger. EmbedRoute is the gateway I extracted so I'd stop writing them.

OpenAI-compatible endpoint — drop-in for existing SDK code. Routes to OpenAI, Voyage, Cohere, or Mistral. Caches duplicate requests. Logs cost per call. Scopes usage per API key. Swapping models is a config change, not a deploy.`,
    tech: ['Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'Netlify'],
    highlights: [
      'OpenAI-compatible endpoint — drop-in for existing SDK code',
      'Supabase auth + per-key usage scoping, PostgreSQL request log',
      'Provider routing with dedup caching to cut bill',
      'Powers azoni.ai chatbot and Old Ways Today'
    ],
    links: {
      live: 'https://www.embedroute.com',
      github: null
    },
    image: '/images/embedroute-icon.svg',
    featured: true,
    category: 'infra'
  },
  {
    id: 'azoni-mcp',
    metric: { value: '37', label: 'tools across 9 domains' },
    title: 'Azoni MCP Server',
    tagline: 'Shared tooling backbone. Agents call this for live data.',
    description: 'Shared tooling backbone for the agent ecosystem. 37 tools across 9 domains, behind auth + rate limits.',
    longDescription: `MCP server is what every agent in this ecosystem calls into for live data. Activity logs, per-app health, analytics, action execution — all behind one authenticated surface.

Organized by domain (fitness, gaming, content, ops). Auth and rate limits on every route. Both interactive chat and autonomous workflows hit the same endpoints, so observability lives in one place. Hosted on Render, called from Netlify Functions and the Moltbook agent.`,
    tech: ['Node.js', 'Express', 'Firebase Admin', 'Render', 'REST'],
    highlights: [
      '37 tools across 9 domains',
      'Auth + rate limits on every route',
      'Single observability surface for the agent ecosystem',
      'Hosted on Render; called by every other agent'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/mcp-logo-nodes.svg',
    featured: true,
    category: 'infra'
  },
  {
    id: 'moltbook-agent',
    title: 'Azoni Moltbook Agent',
    tagline: 'LangGraph agent running a social presence on autopilot.',
    description: 'LangGraph agent that runs a social presence on autopilot. Observe, decide, draft, self-evaluate, post.',
    longDescription: `Moltbook is a social network where AI agents are allowed to post. I built one of the agents.

LangGraph state machine on Render. Wakes up every few hours, reads the feed, decides whether to post, comment, or upvote. If it drafts something, it evaluates its own output before publishing. Respects the platform's 30-minute cooldown. Every state transition is logged to Firestore.`,
    tech: ['Python', 'LangGraph', 'FastAPI', 'Firestore', 'OpenRouter', 'Render'],
    highlights: [
      'Stateful workflow — explicit transitions, no hidden steps',
      'Self-evaluates output before posting',
      'Respects platform cooldown and rate limits',
      'Every transition logged for replay/debug'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/moltbook-lobster.svg',
    featured: true,
    category: 'ai'
  },
  {
    id: 'old-ways-today',
    title: 'Old Ways Today',
    tagline: 'Wellness site about non-toxic household alternatives.',
    description: 'Wellness site about non-toxic household alternatives. RAG chatbot, editorial blog, and product recommendations.',
    longDescription: `First test of pointing my agent stack at a real product instead of a portfolio.

RAG chatbot grounded in a curated Firestore knowledge base. Editorial blog and product recommendation flow. FastAPI backend, Next.js frontend, EmbedRoute for vector search. Same observability and per-call cost logging as the rest of the ecosystem.`,
    tech: ['Next.js', 'FastAPI', 'Firestore', 'PostgreSQL', 'EmbedRoute', 'Render'],
    highlights: [
      'RAG chatbot over a curated Firestore knowledge base',
      'Editorial blog + product recommendation flow',
      'EmbedRoute for vector search across providers',
      'Per-call cost logging surfaces in the agent feed'
    ],
    links: {
      live: 'https://oldwaystoday.com',
      github: null
    },
    image: '/images/favicon-sprout.svg',
    featured: true,
    category: 'ai'
  },
  {
    id: 'bench-only',
    title: 'Bench Only',
    tagline: 'Strength training app that writes the program for you.',
    description: 'Strength training app that writes the program. Offline-first PWA, Netlify Functions behind Firebase auth.',
    longDescription: `I was tired of fiddling with spreadsheets between sets. I wanted an app that knew what I lifted last week and could just give me today's session.

Generates workouts from your history and recent fatigue. Offline-first PWA — works in basement gyms, syncs when you leave. Netlify Functions handle the OpenAI calls behind Firebase auth so the API key never ships to clients. Per-user token dashboard tracks spend per account.`,
    tech: ['React', 'Vite', 'Firebase', 'Netlify Functions', 'OpenAI', 'PWA'],
    highlights: [
      'Per-user AI workout generation that adapts to volume + fatigue',
      'Offline-first PWA — service worker handles sync',
      'API key stays server-side via Netlify Functions',
      'Per-user token dashboard for OpenAI spend'
    ],
    links: {
      live: 'https://benchpressonly.com',
      github: null
    },
    image: '/images/benchpressonly.svg',
    featured: true,
    category: 'ai'
  },
  {
    id: 'row-crew',
    title: 'Row Crew',
    tagline: 'Rowing tracker with photo-verified meters.',
    description: 'Rowing tracker that turns ergs into a team. Tesseract OCR + Claude verification of erg photos.',
    longDescription: `Rowing alone on a machine is lonely. RowCrew totals everyone's meters into a shared lap of the planet (40,075 km), hitting real landmarks as the community passes them.

At the end of a session users photograph their erg screen. Tesseract pulls the numbers on-device. A Claude API call verifies the photo matches the claimed meters. Cheapest anti-cheat I could build, and it holds up.`,
    tech: ['React', 'Firebase', 'Tesseract.js', 'Claude API', 'Netlify'],
    highlights: [
      'Client-side Tesseract OCR + Claude verification',
      'Shared world-tour progress with milestone landmarks',
      'Real-time leaderboards via Firestore listeners',
      'PWA — works on mobile, syncs when online'
    ],
    links: {
      live: 'https://rowcrew.netlify.app',
      github: 'https://github.com/azoni/rowing-tracker'
    },
    image: '/images/rowing-favicon.svg',
    featured: true,
    category: 'ai'
  },
  {
    id: 'azoni-ai',
    title: 'azoni.ai',
    tagline: 'This site. Chatbot, agents, and the stack underneath.',
    description: 'This site. Chatbot answering questions, agents writing the blog, activity feed running live.',
    longDescription: `The portfolio is itself a live AI product. Same stack I run in production for the other apps.

Scribe writes a blog post every weekday from my GitHub commits. Conductor runs every 3 hours, decides what's worth doing next. Azoni AI answers questions over a Firestore RAG index that grows itself when retrieval scores drop. Every action — chat reply, blog post, knowledge generation — is logged with model and cost.`,
    tech: ['React', 'Firebase', 'Netlify Functions', 'OpenRouter', 'EmbedRoute'],
    highlights: [
      'Live RAG chatbot with on-the-fly knowledge generation',
      'Daily Scribe cron writes blog posts from commits',
      'Conductor cron picks the next agent action every 3h',
      'All cost + tokens logged in the activity feed'
    ],
    links: {
      live: 'https://azoni.ai',
      github: null
    },
    image: '/images/azoni.png',
    featured: true,
    category: 'web'
  },
  {
    id: 'launchpad',
    title: 'Launchpad',
    tagline: 'Monorepo and checklist for shipping small web apps fast.',
    description: 'App factory: a monorepo + quality checklist that turns one prompt into a deployed app. 8 apps shipped so far.',
    longDescription: `I kept losing app ideas to setup friction. Launchpad is a Next.js template plus a CLAUDE.md quality checklist — SEO, llms.txt, analytics, OG images, PWA icons, Firebase, Netlify, security headers — that gets one prompt from idea to deployed app.

Every app deploys independently from one monorepo and reports back to a central console: views, errors, and uptime in one place. Eight apps shipped from the template so far, and each one beacons traffic into the site leaderboard.`,
    tech: ['Next.js', 'TypeScript', 'Firebase', 'Netlify', 'Claude Code'],
    highlights: [
      'One prompt from idea to a deployed, SEO-complete app',
      'Quality checklist: SEO, llms.txt, PWA icons, OG images, security headers, LLM cost logging',
      'Central console gallery aggregating views and errors across apps',
      '8 apps shipped: MeepleMatch, PyroGuard, MacroMarket, Daily, and more'
    ],
    links: {
      live: 'https://launchpad-console.netlify.app',
      github: null
    },
    image: '/images/launchpad-rocket.svg',
    featured: true,
    category: 'launchpad'
  },
  {
    id: 'meeplematch',
    title: 'MeepleMatch',
    tagline: 'Swipe to discover your next board game.',
    description: 'Board game discovery with swipe-based voting. Swipe through curated games, get recommendations, buy on Amazon.',
    longDescription: `Tinder-style discovery for board games. Swipe through a curated catalog, and your votes drive personalized recommendations you can buy straight on Amazon.

First app shipped from the Launchpad template, and the design reference for the rest of the set: Comic Neue and Lilita One type, kraft-cardboard cards, candy colors, chunky offset-shadow buttons. No generic AI aesthetic allowed.`,
    tech: ['Next.js', 'Firebase', 'Amazon API', 'Tailwind'],
    highlights: [
      'Swipe-based discovery over a curated game catalog',
      'Personalized recommendations driven by your votes',
      'Amazon affiliate integration for instant buying',
      'Set the design bar for the launchpad — kraft cards, candy colors'
    ],
    links: {
      live: 'https://meeplematch.netlify.app',
      github: null
    },
    image: '/images/launchpad/meeplematch.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'blackdiamond',
    title: 'Black Diamond Alpine Wash',
    tagline: 'Exterior cleaning company site with quote flow.',
    description: 'Exterior cleaning company site with service pages, quote request form, and local SEO.',
    longDescription: `Small-business site for an exterior cleaning company — service pages, a quote request form backed by Firebase, and local SEO so it shows up for nearby searches.

The least flashy app in the launchpad set, which is the point: the template handles a plain services business as cleanly as an AI toy.`,
    tech: ['Next.js', 'Firebase', 'Tailwind'],
    highlights: [
      'Service pages plus a quote request flow',
      'Local SEO: metadata, JSON-LD, and sitemap done properly',
      'Firebase-backed quote submissions',
      'Proof the template handles real client work'
    ],
    links: {
      live: 'https://blackdiamond-alpine-wash.netlify.app',
      github: null
    },
    image: '/images/launchpad/blackdiamond.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'benchmark',
    title: 'Benchmark',
    tagline: 'Turn any achievement into a bench press max.',
    description: 'A memeable, shareable universal achievement-to-bench-press translator powered by AI.',
    longDescription: `Tell it anything you've done — ran a marathon, shipped a startup, survived a group project — and Claude converts it into the one metric that matters: pounds on the bench.

Built to be shared, with screenshot-ready result cards. Every LLM call is cost-logged to the portfolio's activity feed like the rest of the ecosystem.`,
    tech: ['React', 'Vite', 'Claude API', 'Netlify Functions'],
    highlights: [
      'Claude translates any achievement into a bench max',
      'Screenshot-ready, shareable result cards',
      'API key stays server-side via Netlify Functions',
      'Per-call cost logging into the portfolio activity feed'
    ],
    links: {
      live: 'https://benchmark-app-azoni.netlify.app',
      github: null
    },
    image: '/images/launchpad/benchmark.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'repmatch',
    title: 'RepMatch',
    tagline: 'Workout rep-equivalence calculator for friends.',
    description: 'Input your max, roll a random rep count, and compete with friends at equal effort.',
    longDescription: `Lifting with friends who are stronger or weaker than you stops being fun when the loads aren't comparable. RepMatch normalizes effort: everyone enters their max, the app rolls a rep count, and each lifter gets a weight that's equally hard for them.

Small, fast Vite app from the launchpad template.`,
    tech: ['React', 'Vite', 'Tailwind'],
    highlights: [
      'Normalizes effort across different strength levels',
      'Roll a rep count, get everyone\'s equivalent weight',
      'Built for competing with friends at equal difficulty'
    ],
    links: {
      live: 'https://repmatch-app.netlify.app',
      github: null
    },
    image: '/images/launchpad/repmatch.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'crypto-tax-2025',
    title: 'Crypto Tax 2025',
    tagline: 'Wallet-first crypto tax reconstruction. Single-user, auth-gated.',
    description: 'Personal 2025 crypto tax reconstruction. Wallet-first imports, deterministic FIFO, audit-ready exports for TurboTax.',
    longDescription: `Built to solve my own problem: reconstructing a year of crypto activity for taxes without trusting a black-box service. Wallet-first imports, deterministic FIFO cost-basis math, and a review queue for the transactions that need a human call.

Exports are audit-ready and TurboTax-shaped. Single-user and auth-gated — this one's for me, but the pipeline generalizes.`,
    tech: ['React', 'Vite', 'Firebase', 'Claude API'],
    highlights: [
      'Wallet-first transaction imports',
      'Deterministic FIFO cost-basis engine',
      'Audit-ready, TurboTax-friendly exports',
      'Single-user and auth-gated — built for my own filing'
    ],
    links: {
      live: 'https://crypto-tax-2025.netlify.app',
      github: null
    },
    image: '/images/launchpad/crypto-tax-2025.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'pyroguard',
    title: 'PyroGuard',
    tagline: 'Ops platform for fire & life-safety inspection contractors.',
    description: 'All-in-one operations platform for fire/life-safety inspection contractors — a SedonaOffice replacement in ground-up rebuild.',
    longDescription: `All-in-one operations platform for fire and life-safety inspection contractors — a ground-up replacement for SedonaOffice, the legacy system the industry runs on.

The demo is playable: "A Day in the Field" walks one real NFPA 25 inspection from riser to invoice, including offline photo capture in a cellular dead zone.`,
    tech: ['Next.js', 'TypeScript', 'Tailwind'],
    highlights: [
      'Playable demo: one real NFPA 25 inspection, riser to invoice',
      'Offline photo capture in a cellular dead zone',
      'SedonaOffice replacement, rebuilt from the ground up',
      'Tactical ops-console design language'
    ],
    links: {
      live: 'https://pyroguard-demo.netlify.app',
      github: null
    },
    image: '/images/launchpad/pyroguard.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'dayrun',
    title: 'Daily',
    tagline: 'An opt-in calendar and interview pipeline.',
    description: 'Sign in with Google, sync your Calendar, track interviews and opportunities, and toggle what the world sees on your public profile.',
    longDescription: `An opt-in calendar. Sign in with Google, sync your real Calendar, and choose exactly which events the world can see on your public /u/username profile.

Underneath it is an interview-and-opportunity pipeline — applications, follow-ups, and scheduling tracked in one place instead of a spreadsheet.`,
    tech: ['Next.js', 'Firebase', 'Google Calendar API', 'Claude API'],
    highlights: [
      'Google sign-in with real Calendar sync',
      'Public /u/username profile with per-event visibility',
      'Interview and opportunity pipeline tracking',
      'Opt-in by design — nothing is public unless you toggle it'
    ],
    links: {
      live: 'https://dayrun-app.netlify.app',
      github: null
    },
    image: '/images/launchpad/dayrun.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'macromarket',
    title: 'MacroMarket',
    tagline: 'Foods ranked by cost per gram of protein.',
    description: 'Ranks 187 foods, snacks, and supplements by dollars per gram of protein, with a goal calculator, deals tab, and AI protein coach.',
    longDescription: `Protein is the macro everyone's chasing and nobody prices. MacroMarket ranks 187 foods, snacks, and supplements by dollars per gram of protein so you can hit your number without overpaying.

Includes a protein-goal calculator, a deals tab, and a Claude-powered coach that recommends the cheapest picks for your target. Amazon affiliate links close the loop.`,
    tech: ['Next.js', 'Firebase', 'Claude API', 'Amazon Affiliate'],
    highlights: [
      '187 foods ranked by dollars per gram of protein',
      'Protein-goal calculator plus a deals tab',
      'Claude-powered coach recommends the cheapest picks',
      'Amazon affiliate integration'
    ],
    links: {
      live: 'https://macromarket-app.netlify.app',
      github: null
    },
    image: '/images/launchpad/macromarket.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'fab-stats-bot',
    metric: { value: '24', label: 'slash commands' },
    title: 'FaB Stats Discord Bot',
    tagline: 'Companion bot for FaB Stats. Lives in 20+ servers.',
    description: 'TypeScript Discord bot with 24 slash commands. Lives in 20+ FaB community servers.',
    longDescription: `Companion bot for FaB Stats. Slash commands answer hero stats, matchup queries, and leaderboards directly in Discord without leaving the channel.

Background scheduler heartbeats every minute, autocomplete handlers reduce search friction, and per-command analytics tell me which queries actually matter.`,
    tech: ['TypeScript', 'Discord.js', 'Firebase Admin', 'Node.js'],
    highlights: [
      '24 slash commands across hero stats, matchups, and leaderboards',
      'Autocomplete on every searchable parameter',
      'Heartbeat + per-command analytics',
      'Lives in 20+ community servers'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/bots.png',
    featured: false,
    category: 'games'
  },
  {
    id: 'tcgdoku',
    title: 'TCGDoku',
    tagline: 'Daily TCG puzzle. Wordle for card games.',
    description: 'Daily TCG puzzle. Same seed for everyone, share results.',
    longDescription: `Wordle for trading card games. Same seeded daily puzzle for every player so results are comparable, plus a custom puzzle builder for sharing your own.

Card validation hits the Scryfall API on submit. Streaks and shares persist in Firebase.`,
    tech: ['React', 'Firebase', 'Scryfall API', 'Netlify'],
    highlights: [
      'Seeded daily puzzle — same answer worldwide',
      'Custom puzzle builder + shareable links',
      'Live card validation against Scryfall',
      'Streaks and stats per player'
    ],
    links: {
      live: 'https://tcgdoku.netlify.app',
      github: null
    },
    image: '/images/tcgdoku.svg',
    featured: true,
    category: 'games'
  },
  {
    id: 'spell-brigade',
    metric: { value: '6', label: 'zones · 3 classes' },
    title: 'Spell Brigade',
    tagline: 'Real-time multiplayer wizard game with AI-generated characters.',
    description: 'Real-time multiplayer wizard game with AI-generated characters. Server-authoritative Socket.IO loop.',
    longDescription: `Multiplayer that isn't a chat app. Socket.IO wizards co-op through procedural dungeons. Three classes (Pyromancer, Cryomancer, Arcanist), six zones from Sanctuary to the Abyss.

Started as a single Node.js file. After it grew past readable I refactored the server into bounded modules — auth, room manager, combat tick, persistence, AI generation — each their own file. Bug fixes stopped being archaeology.`,
    tech: ['React', 'Node.js', 'Socket.IO', 'Express', 'Firebase Admin'],
    highlights: [
      'Server-authoritative Socket.IO game loop',
      'Refactor: monolith → bounded modules, no downtime',
      'GPT-4o-mini character generator with balancing constraints',
      'Six progression zones, three classes, persistent ranks'
    ],
    links: {
      live: 'https://azoni.ai/game',
      github: null
    },
    image: '/images/spell-brigade-hero.svg',
    featured: true,
    category: 'games'
  },
  {
    id: 'polymarket-tool',
    archived: true,
    metric: { value: '3', label: 'strategy modules' },
    title: 'Polymarket Edge Finder',
    tagline: 'Edge-finder for prediction markets.',
    description: 'Edge-finder for Polymarket. FastAPI backend ingests markets, React frontend explores spreads.',
    longDescription: `Pulls live Polymarket data, runs it through a few strategy modules — spread inefficiency, volume anomaly, directional momentum — and surfaces candidate edges.

Research tool, not a trading bot. The frontend is for poking around and forming hypotheses; the backend is what would feed an actual auto-trader if I built one.`,
    tech: ['FastAPI', 'Python', 'React', 'Vite', 'Recharts'],
    highlights: [
      'Live Polymarket ingestion pipeline',
      'Spread, volume, and momentum strategy modules',
      'Interactive frontend for scenario exploration',
      'Built for hypothesis-forming, not auto-trading'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/polymarket.svg',
    featured: false,
    category: 'fintech'
  },
  {
    id: 'image-pipeline-api',
    archived: true,
    title: 'Image Pipeline API',
    tagline: 'FastAPI image worker with job queues and observability.',
    description: 'FastAPI image worker. Job queues, request tracing, agent lifecycles, dashboard endpoint.',
    longDescription: `Backend for handling image uploads, transformations, and async jobs without a queue service. SQLAlchemy-backed job tracking, Pydantic schemas, Pillow for the actual work.

Every request gets a trace ID and a duration metric. Background workers spin up and down with the FastAPI lifespan so a redeploy doesn't strand jobs. A small dashboard endpoint exposes queue depth, error rate, and recent traces.`,
    tech: ['FastAPI', 'SQLAlchemy', 'Pydantic', 'Pillow', 'Pytest'],
    highlights: [
      'Async job queue with SQLAlchemy persistence',
      'Trace IDs + duration metrics on every request',
      'Worker lifecycle managed via FastAPI lifespan',
      'Dashboard endpoint for queue depth + error rate'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/admin-panel.png',
    featured: false,
    category: 'infra'
  },
  {
    id: 'scryfall-ai',
    archived: true,
    title: 'Scryfall AI',
    tagline: 'Natural-language card search over Scryfall.',
    description: 'Plain-English to Scryfall query syntax. Ask for "blue counter spells under 3 mana", get the search string.',
    longDescription: `Scryfall's query language is powerful but unfriendly. Scryfall AI wraps an LLM around it so you can ask in plain English and get a working query.

Constrained output — the prompt forces structured Scryfall syntax, no chatter. Drop the result into Scryfall's URL bar and the search just works.`,
    tech: ['Node.js', 'Express', 'OpenAI API', 'Scryfall API'],
    highlights: [
      'Plain English → Scryfall query syntax',
      'Constrained output prompt — no LLM chatter',
      'Simple API; drop straight into a search URL',
      'Fast lane for non-power users of Scryfall'
    ],
    links: {
      live: 'https://scryfall.netlify.app',
      github: null
    },
    image: '/images/scryfall.png',
    featured: false,
    category: 'ai'
  },
  {
    id: 'dustbunny',
    archived: true,
    metric: { value: '2,500/min', label: 'bids at peak' },
    title: 'Dustbunny',
    tagline: '50 Dockerized bots, 2,500 req/min, 24/7 uptime.',
    description: 'Distributed NFT bidding bot. 50 Dockerized workers, Redis coordination, ~2,500 req/min, 24/7 uptime.',
    longDescription: `Solo bot-vs-bot arms race against every other floor sniper on OpenSea. Distributed bidding system across 50 Dockerized workers with Redis-backed coordination so they didn't trip over each other.

Sustained around 2,500 req/min for six months. Adapted the strategy daily — when other bots changed their bidding patterns, mine had to change too or stop being profitable. Eventually the marketplace cooled and I shut it down.`,
    tech: ['Node.js', 'Redis', 'Docker', 'OpenSea SDK', 'Web3'],
    highlights: [
      '50 Dockerized workers + Redis coordination',
      '~2,500 req/min sustained for 6 months',
      'Daily strategy adaptation in a bot arms race',
      'Operational kill-switches for runaway bid scenarios'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/dustbunny.png',
    featured: false,
    category: 'web3'
  },
  {
    id: 'oli-fitness',
    archived: true,
    metric: { value: 'CHI 2017', label: 'ACM published' },
    title: 'OLI Fitness',
    tagline: 'Co-founded a Kinect-based form analyzer. ACM CHI 2017.',
    description: 'Real-time weightlifting form analyzer using Kinect — 25 joints at 30fps, scored against expert references.',
    longDescription: `Co-founded OLI Fitness in college. Kinect-based body tracker that scored your lifting form against expert reference movements in real time — 25 joints, 30 frames per second.

Led a team of five through an ACM CHI 2017 publication and multiple startup competitions, including Princeton Tiger Launch finalist. First experience taking a product from zero to working demo to public presentation.`,
    tech: ['C#', 'Kinect SDK', 'Computer Vision', 'Unity'],
    highlights: [
      '25-joint body tracking at 30fps with reference scoring',
      'ACM CHI 2017 publication',
      'Princeton Tiger Launch finalist',
      'Led team of 5 — first zero-to-one experience'
    ],
    links: {
      live: null,
      github: null,
      paper: 'https://dl.acm.org/doi/abs/10.1145/3027063.3048429'
    },
    image: '/images/oli.png',
    featured: false,
    category: 'ai'
  },
  {
    id: 'hashmaps',
    archived: true,
    metric: { value: '1st', label: 'hackathon win' },
    title: 'HashMaps',
    tagline: 'OpenCV + geolocation hashtag generator. 1st place, T-Mobile Big Data Hackathon.',
    description: 'Contextual hashtag generator combining image analysis with location data. Built in a weekend, won 1st place.',
    longDescription: `Built in 36 hours for the T-Mobile Big Data Hackathon. Take a photo, extract objects and scenes via OpenCV, fuse with the device location, return context-aware hashtags ready to paste.

Won 1st place for the cross-modal approach (vision + geo + temporal context). One of the first times I shipped something end-to-end under hard time pressure.`,
    tech: ['Python', 'OpenCV', 'Geolocation API'],
    highlights: [
      '1st place at T-Mobile Big Data Hackathon',
      'Vision + geolocation + temporal context fusion',
      'Built and presented in 36 hours'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/hashmaps.png',
    featured: false,
    category: 'ai'
  }
];

export const categories = {
  all: 'All Projects',
  ai: 'AI and ML',
  infra: 'Platforms and Infra',
  launchpad: 'Launchpad',
  fintech: 'Fintech',
  web3: 'Web3',
  games: 'Games',
  web: 'Web Apps'
};

export const getFeaturedProjects = () => projects.filter((p) => p.featured);
export const getProjectById = (id) => projects.find((p) => p.id === id);
export const getProjectsByCategory = (category) =>
  category === 'all' ? projects : projects.filter((p) => p.category === category);
