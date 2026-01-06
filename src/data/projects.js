export const projects = [
  {
    id: "scryfall-ai",
    title: "Scryfall AI",
    tagline: "Natural Language Card Search",
    description: "AI-powered search tool that translates plain English queries into complex Scryfall database searches. Makes Magic: The Gathering card discovery accessible to everyone.",
    longDescription: `An AI application that leverages natural language processing to run complex queries on the Scryfall Magic: The Gathering database.

Instead of learning Scryfall's complex query syntax, users can simply type what they're looking for in plain English:
• "Show me all red dragons that cost less than 5 mana"
• "Find blue instant spells that draw cards"
• "What legendary creatures are in the latest set?"

The AI interprets the natural language input and translates it into the appropriate Scryfall query syntax, making card discovery accessible to players of all technical levels.`,
    tech: ["React", "OpenAI API", "Scryfall API", "NLP"],
    highlights: [
      "Natural language to query translation",
      "AI-powered search interpretation",
      "Accessible card discovery for all skill levels",
      "Real-time Scryfall API integration"
    ],
    links: {
      live: "https://scryfall.netlify.app",
      github: null
    },
    image: "/images/scryfall.png",
    featured: true,
    category: "ai"
  },
  {
    id: "old-ways-today",
    title: "Old Ways Today",
    tagline: "AI-Powered Product Research",
    description: "Full-stack AI chatbot helping families find non-toxic, traditional product alternatives. Features real-time chat, blog system, and admin panel.",
    longDescription: `A full-stack AI chatbot web application helping families find non-toxic, traditional product alternatives. Built with a modern React frontend and FastAPI backend.

Features include:
• Real-time AI chat interface with markdown rendering and typing indicators
• Conversation persistence across sessions
• Mobile-first responsive design with custom CSS (no frameworks)
• IP-based rate limiting with configurable thresholds
• Token usage logging and cost tracking per API call
• Full blog system with PostgreSQL persistence
• Password-protected admin panel for content management
• Tag filtering and SEO-friendly URL slugs

Architecture highlights:
• Clean separation of concerns (hooks, components, pages)
• RESTful API design with proper error handling
• SQLAlchemy ORM with automatic table creation
• Environment-based configuration for multi-environment deployment`,
    tech: ["React", "FastAPI", "PostgreSQL", "OpenAI API", "Vite"],
    highlights: [
      "Real-time AI chat with markdown rendering",
      "IP-based rate limiting and token cost tracking",
      "Full blog CMS with admin panel",
      "Mobile-first responsive design",
      "SQLAlchemy ORM with PostgreSQL"
    ],
    links: {
      live: "https://oldwaystoday.com",
      github: null
    },
    image: "/images/oldways.png",
    featured: true,
    category: "ai"
  },
  {
    id: "dumarket",
    title: "DuMarket",
    tagline: "Prediction Market Platform",
    description: "Full-stack prediction market platform with real-time order matching, automated market making, and gamification — built for friend groups to bet on anything.",
    longDescription: `A complete prediction market platform featuring a Central Limit Order Book (CLOB) matching engine with price-time priority algorithm. Includes an automated market maker bot that provides continuous liquidity with inventory-aware pricing, real-time position tracking with cost basis calculation and P&L attribution.

Built with React frontend, FastAPI backend, and PostgreSQL database. Features Firebase Authentication, daily login rewards with streak multipliers, 14 achievements across 5 categories, and a full admin panel.`,
    tech: ["React", "FastAPI", "PostgreSQL", "Firebase Auth", "Python"],
    highlights: [
      "Central Limit Order Book (CLOB) matching engine",
      "Automated market maker with inventory-aware pricing",
      "Real-time P&L tracking and position management",
      "18 API endpoints, 6 database models",
      "~4,300 lines of code"
    ],
    links: {
      live: "https://dumarket.netlify.app",
      github: null
    },
    image: "/images/dumarket.png",
    featured: true,
    category: "fintech"
  },
  {
    id: "rowing-tracker",
    title: "Rowing Tracker",
    tagline: "AI-Powered Training App",
    description: "Training app that uses Claude's multimodal API to extract workout metrics from rowing machine screen photos. Gamified with leaderboards, streaks, and achievements.",
    longDescription: `Users photograph their rowing machine screens after workouts. Claude's multimodal API parses the image and extracts meters rowed, with human-in-the-loop verification where users can edit before saving.

Features Firebase for data storage, gamification elements including leaderboards, streaks, and achievements to drive engagement among the rowing crew.`,
    tech: ["React", "Claude API", "Firebase", "JavaScript"],
    highlights: [
      "Claude multimodal API for image parsing",
      "Human-in-the-loop data verification",
      "Gamification: leaderboards, streaks, achievements",
      "Used by local rowing crew"
    ],
    links: {
      live: "https://rowcrew.netlify.app/",
      github: "https://github.com/azoni/rowing-tracker"
    },
    image: "/images/rowing.png",
    featured: true,
    category: "ai"
  },
  {
    id: "polymarket-tool",
    title: "Polymarket Analysis Tool",
    tagline: "Trading Signal Detection",
    description: "Prediction market analysis tool to detect trading opportunities via Polymarket API using multiple signal detection strategies.",
    longDescription: `Building a tool to analyze Polymarket prediction markets and identify trading opportunities through multiple strategies:

• Arbitrage — Price differences across markets or YES+NO not summing to 100%
• Spread Analysis — Wide bid-ask spreads for buy low/sell high opportunities  
• Volume Anomalies — Unusual volume spikes that often precede price moves
• Momentum — Price trending in one direction tends to continue
• Mean Reversion — Prices far from historical average tend to snap back`,
    tech: ["Python", "React", "Polymarket API"],
    highlights: [
      "Multiple signal detection strategies",
      "Arbitrage and spread analysis",
      "Volume anomaly detection",
      "Momentum and mean reversion signals"
    ],
    links: {
      live: null,
      github: null
    },
    image: "/images/polymarket.png",
    featured: false,
    category: "fintech"
  },
  {
    id: "discord-bots",
    title: "LLM-Powered Bots",
    tagline: "Agentic AI Systems",
    description: "Context-aware Twitter and Discord bots with conversation memory, tool integration, and agentic architectures using OpenAI and Anthropic APIs.",
    longDescription: `Built multiple AI agents that go beyond simple chatbots:

• Persistent Memory — Conversation history stored in SQLite, fetched for context
• Tool Integration — Google Calendar integration for scheduling
• Agentic Architecture — Bots decide when to use tools vs just respond
• Multi-platform — Discord and Twitter implementations

These bots can reason about what action to take, remember past conversations, and execute external tools — the defining characteristics of AI agents.`,
    tech: ["Python", "OpenAI API", "SQLite", "Discord.py"],
    highlights: [
      "Persistent memory with SQLite",
      "Tool integration (Google Calendar)",
      "Agentic decision-making",
      "Context-aware responses"
    ],
    links: {
      live: null,
      github: null
    },
    image: "/images/bots.png",
    featured: true,
    category: "ai"
  },
  {
    id: "dustbunny",
    title: "Dustbunny",
    tagline: "High-Frequency NFT Trading",
    description: "Automated NFT bidding system distributed across 50 machines, processing 2,500+ requests per minute with intelligent bidding algorithms.",
    longDescription: `High-performance NFT bidding system built to handle OpenSea's IP-based rate limits by distributing across 50 MacBooks, each running the bidding bot independently.

Features included:
• Real-time floor price polling aggregated to Redis
• Intelligent bidding algorithms analyzing floor prices, existing bids, and historical data
• Max bid safeguards and competitive margin calculations
• Support for ERC-721 and ERC-1155 tokens
• Deployed CryptoHeartZ NFT collection via Remix`,
    tech: ["Node.js", "Redis", "OpenSea SDK", "Docker", "Etherscan API"],
    highlights: [
      "50 machines, 2,500 requests/minute",
      "Redis for real-time floor price caching",
      "Intelligent bidding with safeguards",
      "Deployed ERC-721 smart contract"
    ],
    links: {
      live: null,
      github: null
    },
    image: "/images/dustbunny.png",
    featured: true,
    category: "web3"
  },
  {
    id: "adoh",
    title: "A Dawn of Heroes",
    tagline: "Game Development & Analytics",
    description: "Contributing game balance and mechanics for NeverWinter Nights persistent world server, plus a player dashboard with DPS calculations and real-time leaderboards.",
    longDescription: `Active contributor to a persistent world server for NeverWinter Nights: Enhanced Edition with 20-50 concurrent players.

Contributions include game balance, custom mechanics, and quality of life improvements. Built an external player dashboard that parses game log files to calculate theoretical DPS based on weapon stats, class, and abilities — displayed with real-time leaderboards.`,
    tech: ["Python", "React", "NWScript", "Log Parsing"],
    highlights: [
      "Game balance and custom mechanics",
      "DPS calculator from log parsing",
      "Real-time player leaderboards",
      "20-50 concurrent players"
    ],
    links: {
      live: "https://adoh.online",
      github: null
    },
    image: "/images/adoh.png",
    featured: false,
    category: "games"
  },
  {
    id: "oli-fitness",
    title: "OLI Fitness",
    tagline: "Computer Vision Startup",
    description: "Co-founded fitness startup using Microsoft Kinect and computer vision to analyze weightlifting form and detect injury-risk movements. Published at ACM CHI 2017.",
    longDescription: `Co-founded a fitness technology startup that used Microsoft Kinect SDK to track joint positions during weightlifting exercises like squats and deadlifts.

Developed movement scoring algorithms that compared user joint angles against professional form overlays in real-time, flagging potentially dangerous movements. Consulted with fitness experts to define "good" vs "bad" form parameters.

• Regional finalist at Princeton Tiger Launch
• Finalist at UW Business Plan Competition  
• Selected for Collision Alpha startup program
• Published extended abstract at ACM CHI 2017`,
    tech: ["C#", "Kinect SDK", "Computer Vision", "Unity"],
    highlights: [
      "Real-time joint position tracking",
      "Movement scoring algorithms",
      "ACM CHI 2017 publication",
      "Princeton Tiger Launch finalist"
    ],
    links: {
      live: null,
      github: null,
      paper: "https://dl.acm.org/doi/abs/10.1145/3027063.3048429"
    },
    image: "/images/oli.png",
    featured: true,
    category: "ai"
  },
  {
    id: "hashmaps",
    title: "HashMaps",
    tagline: "1st Place Hackathon Winner",
    description: "Auto-hashtag generation tool using OpenCV image analysis and geolocation. Won 1st place at T-Mobile Big Data Hackathon.",
    longDescription: `Built at T-Mobile Big Data Hackathon. HashMaps analyzes photos using OpenCV and combines that with geolocation metadata to generate trending, relevant hashtags for maximum social media reach.

Example: A coffee photo taken in Seattle would generate hashtags like #SeattleCoffee #PNW #CoffeeLovers based on both the image content and location context.`,
    tech: ["Python", "OpenCV", "Geolocation API"],
    highlights: [
      "1st Place — T-Mobile Big Data Hackathon",
      "OpenCV image analysis",
      "Geolocation-aware hashtag generation"
    ],
    links: {
      live: null,
      github: null
    },
    image: "/images/hashmaps.png",
    featured: false,
    category: "ai"
  }
];

export const categories = {
  all: "All Projects",
  ai: "AI & ML",
  fintech: "Fintech",
  web3: "Web3",
  games: "Games"
};

export const getFeaturedProjects = () => projects.filter(p => p.featured);
export const getProjectById = (id) => projects.find(p => p.id === id);
export const getProjectsByCategory = (category) => 
  category === 'all' ? projects : projects.filter(p => p.category === category);