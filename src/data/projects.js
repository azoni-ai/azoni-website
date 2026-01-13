export const projects = [
  // ===== MAJOR RECENT PROJECTS =====
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
    highlights: [
      "Semantic search RAG with OpenAI embeddings",
      "Full CMS with blog, products, and admin panel",
      "Email subscription system with SMTP",
      "SEO: XML sitemap, meta tags, Google Search Console",
      "Amazon affiliate integration"
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
    highlights: [
      "AI chatbot with custom system prompts",
      "Job description fit analysis for recruiters",
      "Secure API via Netlify serverless functions",
      "Modern React patterns (Context, Suspense, Error Boundaries)",
      "Mobile-first responsive design"
    ],
    links: {
      live: "https://azoni.ai",
      github: null
    },
    image: "/images/azoni.png",
    featured: true,
    category: "ai"
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
    highlights: [
      "Central Limit Order Book (CLOB) matching engine",
      "Automated market maker with inventory-aware pricing",
      "Real-time P&L tracking and position management",
      "Gamification: streaks, achievements, leaderboards"
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
    tagline: "AI-Powered Fitness App",
    description: "Training app using Claude's multimodal API to extract workout metrics from rowing machine photos. Features human-in-the-loop verification and gamification.",
    longDescription: `Users photograph their rowing machine screens after workouts. Claude's multimodal API parses the image and extracts meters rowed, with human-in-the-loop verification where users can edit values before saving.

**AI Integration:**
• Claude multimodal API for image-to-data extraction
• Structured prompts for consistent metric parsing
• Human-in-the-loop verification before saving

**Gamification:**
• Leaderboards across active users
• Streak tracking for consecutive workout days
• Achievement system for milestones
• Architected for scalability to more users`,
    tech: ["React", "Claude API", "Firebase", "JavaScript"],
    highlights: [
      "Claude multimodal API for image parsing",
      "Human-in-the-loop data verification",
      "Gamification: leaderboards, streaks, achievements",
      "Architected for scalability"
    ],
    links: {
      live: null,
      github: "https://github.com/azoni/rowing-tracker"
    },
    image: "/images/rowing.png",
    featured: true,
    category: "ai"
  },

  // ===== OLDER BUT IMPRESSIVE PROJECTS =====
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
    highlights: [
      "50 machines, 2,500+ requests/minute",
      "Redis for real-time floor price caching",
      "Competitive bidding algorithms with safeguards",
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
    highlights: [
      "Real-time joint position tracking at 30fps",
      "Movement scoring algorithms with expert input",
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

  // ===== SMALLER UTILITIES =====
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
    highlights: [
      "Natural language to query translation",
      "AI-powered search interpretation",
      "Accessible to non-technical users",
      "Real-time Scryfall API integration"
    ],
    links: {
      live: "https://scryfall.netlify.app",
      github: null
    },
    image: "/images/scryfall.png",
    featured: false,
    category: "ai"
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
    highlights: [
      "Persistent memory with SQLite",
      "Tool integration (Google Calendar, web search)",
      "Agentic decision-making architecture",
      "Multi-platform (Discord, Twitter)"
    ],
    links: {
      live: null,
      github: null
    },
    image: "/images/bots.png",
    featured: false,
    category: "ai"
  },

  // ===== OTHER PROJECTS =====
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
    id: "adoh",
    title: "A Dawn of Heroes",
    tagline: "Game Development & Analytics",
    description: "Contributing game balance for NeverWinter Nights server, plus a player dashboard with DPS calculations and real-time leaderboards.",
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
    id: "hashmaps",
    title: "HashMaps",
    tagline: "1st Place Hackathon Winner",
    description: "Auto-hashtag generation using OpenCV image analysis and geolocation. Won 1st place at T-Mobile Big Data Hackathon.",
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