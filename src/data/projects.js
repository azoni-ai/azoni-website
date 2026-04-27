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
    id: 'fab-stats-bot',
    title: 'FaB Stats Discord Bot',
    tagline: 'Companion bot for FaB Stats. Lives in 20+ servers.',
    description: 'TypeScript Discord bot with command routing, analytics tracking, and game-specific utilities connected to platform data.',
    longDescription: `FaB Stats Bot extends analytics workflows into Discord with slash commands, autocomplete, scheduled jobs, and usage tracking.

It acts as a companion layer to the main platform, providing quick access to stats and utility commands directly in community channels.`,
    tech: ['TypeScript', 'Discord.js', 'Firebase Admin', 'Node.js'],
    highlights: [
      'Command router supporting many game-focused actions',
      'Autocomplete and interaction handling patterns',
      'Background scheduler and heartbeat monitoring',
      'Analytics instrumentation for command usage'
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
    description: 'Daily puzzle game blending category logic and card knowledge with shareable outcomes and community play.',
    longDescription: `TCGDoku applies daily puzzle mechanics to trading card games, combining repeatable retention loops with community participation.

The product includes seeded daily puzzles, custom puzzle creation, and game-specific data integrations for real-time validation and search.`,
    tech: ['React', 'Firebase', 'Scryfall API', 'Netlify'],
    highlights: [
      'Seeded daily puzzle logic for consistent global play',
      'Custom puzzle builder and share flows',
      'Card validation and lookup integrations',
      'Community-oriented progression mechanics'
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
    title: 'Spell Brigade',
    tagline: 'Real-time multiplayer wizard game with AI-generated characters.',
    description: 'Real-time multiplayer wizard game with class systems, progression, and persistent backend state.',
    longDescription: `Spell Brigade pairs a React game client with a Socket.IO/Express backend for live multiplayer sessions.

The system includes class mechanics, zone progression, persistent player data, and backend services for session coordination and long-term state.`,
    tech: ['React', 'Node.js', 'Socket.IO', 'Express', 'Firebase Admin'],
    highlights: [
      'Real-time multiplayer architecture with Socket.IO',
      'Class-based combat and progression systems',
      'Persistent player profiles and unlock paths',
      'Integrated backend state and server coordination'
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
    title: 'Polymarket Edge Finder',
    tagline: 'Edge-finder for prediction markets.',
    description: 'Full-stack analysis tool for identifying potential edge cases in prediction markets using multiple strategy modules.',
    longDescription: `Polymarket Edge Finder combines a FastAPI backend with a React frontend to ingest market data and surface candidate opportunities.

The project explores detection patterns such as spread inefficiencies, volume anomalies, and directional momentum to support research-driven decision making.`,
    tech: ['FastAPI', 'Python', 'React', 'Vite', 'Recharts'],
    highlights: [
      'Market ingestion and analysis pipeline',
      'Multiple strategy modules for edge detection',
      'Interactive frontend for scenario exploration',
      'Designed for iterative research workflows'
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
    title: 'Image Pipeline API',
    tagline: 'FastAPI image worker with job queues and observability.',
    description: 'FastAPI service for image processing with job queues, observability middleware, and agent-managed worker lifecycles.',
    longDescription: `Image Pipeline API is a backend service that manages image uploads, processing jobs, and runtime observability.

It includes request tracing, metrics collection, background execution orchestration, and a lightweight dashboard endpoint for operational visibility.`,
    tech: ['FastAPI', 'SQLAlchemy', 'Pydantic', 'Pillow', 'Pytest'],
    highlights: [
      'Job-based processing architecture',
      'Request trace IDs and duration metrics',
      'Agent lifecycle management in app lifespan',
      'Operational health and dashboard endpoints'
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
    title: 'Scryfall AI',
    tagline: 'Natural-language card search over Scryfall.',
    description: 'Service that translates natural-language card requests into structured Scryfall query syntax.',
    longDescription: `Scryfall AI focuses on one practical interface problem: making complex card database search accessible to non-expert users.

Users ask in plain language, and the service returns structured query syntax suitable for direct Scryfall lookups.`,
    tech: ['Node.js', 'Express', 'OpenAI API', 'Scryfall API'],
    highlights: [
      'Natural-language to query-string transformation',
      'Prompt design for constrained output format',
      'Simple API surface for frontend integration',
      'Domain-specific search productivity gains'
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
    title: 'Dustbunny',
    tagline: '50 Dockerized bots, 2,500 req/min, 24/7 uptime.',
    description: 'Distributed bidding operation across 50 machines with high request throughput and real-time pricing logic.',
    longDescription: `Dustbunny was an automation-heavy trading system built for high-frequency NFT market monitoring and bidding.

The platform used distributed workers, caching, and strategy controls to sustain high request throughput while adapting to changing API and marketplace conditions.`,
    tech: ['Node.js', 'Redis', 'Docker', 'OpenSea SDK', 'Web3'],
    highlights: [
      'Distributed architecture across 50 machines',
      'Real-time floor monitoring and bid automation',
      'Throughput in the 2,500+ requests per minute range',
      'Operational safeguards for bidding decisions'
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
    title: 'OLI Fitness',
    tagline: 'Computer Vision Startup',
    description: 'Co-founded computer vision fitness startup using Kinect-based movement analysis; work published at ACM CHI 2017.',
    longDescription: `OLI Fitness used Kinect-based body tracking to evaluate lifting form in real time and compare movement against reference patterns.

The project combined product development, technical execution, and early-stage startup operations, resulting in an ACM CHI publication and multiple startup program appearances.`,
    tech: ['C#', 'Kinect SDK', 'Computer Vision', 'Unity'],
    highlights: [
      'Real-time movement tracking and form scoring',
      'ACM CHI 2017 publication',
      'Startup competition finalist experience',
      'Zero-to-one product and team execution'
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
    title: 'HashMaps',
    tagline: 'Hackathon Winner: Contextual Hashtag Generation',
    description: 'OpenCV and geolocation-based system for contextual hashtag generation; won first place at T-Mobile Big Data Hackathon.',
    longDescription: `HashMaps generated context-aware social hashtags by combining image analysis with location context.

The project was built and presented in a hackathon setting and won first place for applied use of computer vision and metadata fusion.`,
    tech: ['Python', 'OpenCV', 'Geolocation API'],
    highlights: [
      'First place at T-Mobile Big Data Hackathon',
      'Image understanding plus location-aware recommendations',
      'Rapid prototyping and presentation under time constraints'
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
  fintech: 'Fintech',
  web3: 'Web3',
  games: 'Games',
  web: 'Web Apps'
};

export const getFeaturedProjects = () => projects.filter((p) => p.featured);
export const getProjectById = (id) => projects.find((p) => p.id === id);
export const getProjectsByCategory = (category) =>
  category === 'all' ? projects : projects.filter((p) => p.category === category);
