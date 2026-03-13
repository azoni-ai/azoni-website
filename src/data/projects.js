export const projects = [
  {
    id: 'fab-stats',
    title: 'FaB Stats',
    tagline: 'Competitive TCG Analytics Platform',
    description: 'Full-stack analytics platform with 300+ registered users and 1,600+ tracked matches for the Flesh and Blood TCG competitive community.',
    longDescription: `FaB Stats is a production analytics platform serving the competitive Flesh and Blood community. Players track match results, explore hero-level performance data, compare matchup win rates, and climb leaderboards.

The app includes player profiles, match history, head-to-head matchup tools, community features, and mini-games — all backed by real user data across 300+ accounts and 1,600+ logged matches.`,
    tech: ['Next.js', 'React', 'TypeScript', 'Firebase', 'Recharts'],
    highlights: [
      '300+ registered users with active match tracking',
      '1,600+ competitive matches logged and analyzed',
      'Hero performance analytics and matchup win rates',
      'Leaderboards, player profiles, and community tools'
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
    tagline: 'Unified Embedding API Gateway',
    description: 'Single API for embeddings across OpenAI, Voyage, Cohere, and Mistral with consistent request and response formats.',
    longDescription: `EmbedRoute is a unified embedding API gateway designed to reduce provider lock-in and integration overhead.

It provides one authentication model, one request shape, and one response contract while routing to multiple providers. The platform focuses on operational simplicity: faster model switching, clearer cost controls, and lower integration time for teams running RAG and semantic search in production.`,
    tech: ['Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'Vercel'],
    highlights: [
      'OpenAI-compatible endpoint design for low-friction adoption',
      'Multi-provider routing across major embedding vendors',
      'Consistent model naming and response handling',
      'Built for RAG and semantic search workloads'
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
    tagline: 'Cross-App Tooling Layer for AI Agents',
    description: 'Domain-based API server exposing live tools for fitness, gaming, content, and ops workflows used by autonomous agents.',
    longDescription: `Azoni MCP Server is the shared tooling backbone across multiple products in this workspace. It exposes authenticated endpoints for activity logs, app health, analytics, and action execution.

The server is organized by domain modules and used by both interactive chat experiences and autonomous workflows. It standardizes access patterns, applies rate limits, and centralizes operational observability across projects.`,
    tech: ['Node.js', 'Express', 'Firebase Admin', 'Rate Limiting', 'REST API'],
    highlights: [
      '40+ tool endpoints across multiple domains',
      'Auth and rate-limiting middleware on all routes',
      'Shared interface for agents and portfolio systems',
      'Cross-project data surface for production automation'
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
    tagline: 'LangGraph Autonomous Social Agent',
    description: 'Autonomous agent that observes feed context, decides actions, drafts content, quality-checks output, and executes on schedule.',
    longDescription: `Azoni Moltbook Agent is a LangGraph-powered system that runs an end-to-end agent loop: observe, decide, draft, evaluate, execute, and log.

It is built as a production workflow with explicit state transitions, external API integrations, and auditable activity logs. The agent is designed to operate safely under scheduled execution while keeping decision quality visible and measurable.`,
    tech: ['Python', 'LangGraph', 'LangChain', 'FastAPI', 'Firebase'],
    highlights: [
      'Stateful agent workflow with explicit step transitions',
      'Scheduled autonomous runs plus manual triggers',
      'Quality evaluation before posting actions',
      'Firestore-backed activity logging'
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
    tagline: 'AI-Powered Consumer Wellness Platform',
    description: 'Full-stack product helping families find non-toxic alternatives with AI chat, editorial content, and conversion-focused product pages.',
    longDescription: `Old Ways Today combines editorial publishing, product discovery, and AI assistance into a single production platform.

The stack includes a Next.js frontend and FastAPI backend with OpenAI integration, SEO-friendly content architecture, and subscription workflows. The system is built to support both educational content and practical purchase decisions.`,
    tech: ['Next.js', 'FastAPI', 'PostgreSQL', 'OpenAI API', 'Netlify', 'Render'],
    highlights: [
      'AI-assisted Q and A for product guidance',
      'Production CMS workflows for content publishing',
      'SEO-focused architecture for discoverability',
      'Integrated backend services and rate control'
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
    tagline: 'AI Strength Training PWA',
    description: 'Progressive web app for lifters with workout tracking, goal management, group coaching, and AI training assistance.',
    longDescription: `Bench Only is a production fitness application focused on measurable progress for strength athletes.

It combines structured workout logging with AI-assisted recommendations and analysis features. The app supports individual and group workflows, runs as an installable PWA, and is designed for frequent mobile usage.`,
    tech: ['React', 'Vite', 'Firebase', 'OpenAI API', 'Tailwind CSS', 'PWA'],
    highlights: [
      'AI-assisted workout recommendations and analysis',
      'Goal tracking and progress visibility',
      'Group training and shared scheduling features',
      'Installable mobile-first PWA experience'
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
    tagline: 'Social Fitness App with Vision Verification',
    description: 'Rowing tracker with AI-assisted workout verification, social challenges, and real-time progress features.',
    longDescription: `Row Crew turns solitary rowing sessions into a connected social product with accountability and competition mechanics.

The app uses vision-based workout verification and supports challenges, rankings, and group workflows. It is designed as a full PWA with mobile-first interaction patterns and real-time updates.`,
    tech: ['React', 'Firebase', 'Claude API', 'Firestore', 'PWA'],
    highlights: [
      'AI-assisted image verification for workout entries',
      'Group challenges and competitive leaderboard loops',
      'Real-time updates via Firestore listeners',
      'PWA support for mobile installation and repeat use'
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
    tagline: 'Portfolio Platform with AI Assistant',
    description: 'Personal portfolio platform with chat assistant, activity dashboards, and live system integrations.',
    longDescription: `This portfolio is built as an operational product rather than a static brochure site.

It includes interactive project detail pages, AI chat workflows, activity telemetry, and live integrations with supporting services. The architecture demonstrates production frontend patterns and practical AI integration in a public-facing application.`,
    tech: ['React', 'Firebase', 'Netlify Functions', 'OpenRouter', 'RAG'],
    highlights: [
      'AI assistant integrated into portfolio experience',
      'Live activity surfaces from production systems',
      'Project detail routing with reusable data structures',
      'Serverless backend functions for integrations'
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
    tagline: 'Companion Bot for Competitive Analytics',
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
    tagline: 'Daily Trading Card Puzzle Game',
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
    tagline: 'Multiplayer Survival Game Platform',
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
    tagline: 'Prediction Market Signal Discovery',
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
    tagline: 'Background Job Processing Service',
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
    tagline: 'Natural Language Card Search',
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
    tagline: 'Distributed NFT Trading Automation',
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
