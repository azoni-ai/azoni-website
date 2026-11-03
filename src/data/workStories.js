// Short first-person summaries of the products in projects.js, used on the
// Work page, the project pages and Home. These are my own products, not
// claims about client engagements.
// The featured case studies, in order. Must match visibility: 'featured'.
export const selectedWorkIds = ['fab-stats', 'azoni-ai', 'old-ways-today', 'row-crew'];

export const workStories = {
  'fab-stats': {
    label: 'Community & analytics',
    headline: 'Match tracking and analytics for Flesh and Blood.',
    summary: 'I built FaB Stats because the Flesh and Blood community argued about the meta with no shared data. Players log matches, compare matchup win rates and climb leaderboards, and a one-click import means nobody types matches in by hand.',
    role: 'Solo design, engineering, and operation',
    problem: 'Nobody wants to hand-enter matches after a long tournament day, so most tools go unused.',
    approach: 'I built the stats site, a Chrome extension that imports a whole tournament in one click, and a Discord bot that brings hero and matchup data into community servers.',
    outcome: 'People now cite it in meta arguments instead of going on feel.',
    relevance: 'Full-stack products, data imports, analytics, and community integrations.',
    features: [
      'Tournament imports with a browser extension',
      'Hero performance and matchup statistics',
      'Discord companion and daily puzzles',
    ],
    preview: {
      src: '/images/work-fabstats.jpg',
      alt: 'FaB Stats home page showing 3,898 players and 1.6 million matches tracked.',
      caption: 'The FaB Stats home page.',
      // Show only the top of the capture; the lower panels list real players.
      crop: 'top',
    },
  },
  'azoni-ai': {
    label: 'Agent platform',
    headline: 'The assistant, agents and shared tool API behind this site.',
    summary: 'This site runs on the same agent stack as my other apps. The assistant answers questions about me only from records I wrote or checked, and every agent I run calls one shared, authenticated tool API.',
    role: 'Architecture, implementation, and operation',
    problem: 'Separate agents repeated the same API integrations, access checks, and logging. Investigating their actions meant looking across several systems.',
    approach: 'I moved the tools into one API, organized them by product domain, and added authentication, rate limits, and activity logging to the shared endpoints.',
    outcome: 'Chat and autonomous workflows use the same tools, and their activity can be reviewed in one place.',
    relevance: 'Agent architecture, grounding, API integrations, access controls, and monitoring.',
    features: [
      'Tools grouped by product domain',
      'Authenticated, rate-limited endpoints',
      'Shared logs for agent activity',
    ],
    preview: {
      kind: 'tools',
      caption: 'The assistant and my autonomous agents call the same tool API for product data and activity logs.',
    },
  },
  'old-ways-today': {
    label: 'Content & AI assistant',
    headline: 'A guide to everyday household alternatives.',
    summary: 'A wellness site about non-toxic household alternatives, and my first time using my agent stack for an actual product. Its assistant streams answers from a curated knowledge base, and my code checks every product link before it renders.',
    role: 'Solo design, engineering, and operation',
    problem: 'Household recommendations needed useful context and working product links. An AI assistant also needed a curated source of information to draw on.',
    approach: 'I built the guides and product discovery experience, then connected a streaming assistant to a curated knowledge base with product-link checks in code.',
    outcome: 'Visitors can browse guides, explore products, and ask follow-up questions. The assistant replaces unrecognized product links with search links.',
    relevance: 'Content platforms, product discovery, retrieval, and conversational interfaces.',
    features: [
      'Household guides and a step-by-step swap guide',
      'Product discovery with affiliate links',
      'AI answers informed by curated content',
    ],
    preview: {
      src: '/images/work-oldways.jpg',
      alt: 'Old Ways Today website with household guides and a Find trusted products introduction.',
      caption: 'Guides, product discovery, and an assistant for everyday household questions.',
    },
  },
  'row-crew': {
    label: 'Fitness & community',
    headline: 'A rowing tracker that adds up everyone\'s meters.',
    summary: 'Rowing alone on a machine gets boring. Row Crew adds everyone\'s meters into a shared lap of the planet, and a photo of the erg screen, read on-device and checked by Claude, is a cheap anti-cheat check.',
    role: 'Solo design, engineering, and operation',
    problem: 'Rowing alone on a machine gets boring.',
    approach: 'I built a shared world tour with real landmarks, photo-verified sessions, and real-time leaderboards.',
    outcome: 'Friends row toward one shared total.',
    relevance: 'Mobile web apps, on-device OCR, and real-time data.',
    features: [
      'Shared world-tour progress with milestone landmarks',
      'Photo-verified erg sessions',
      'Real-time leaderboards',
    ],
    preview: {
      src: '/images/rowing.png',
      width: 467,
      height: 566,
      alt: 'Row Crew app showing total meters rowed and progress around the world.',
      caption: 'An earlier screenshot of the Row Crew app.',
    },
  },
  // Home still shows this one; on /projects it sits under "Other things I've built".
  embedroute: {
    label: 'AI infrastructure',
    headline: 'An embedding API and model comparison lab.',
    summary: 'Every RAG project had the same three files: an embedding wrapper, a provider switch and a usage logger. I extracted them into EmbedRoute, one OpenAI-compatible API for several embedding providers, with a Lab for comparing models on your own data.',
    role: 'Product design, engineering, and operation',
    problem: 'Each search project needed another provider integration. Comparing embedding models also meant writing separate evaluation code.',
    approach: 'I built a common API for embedding providers and a browser-based Lab that compares models on a set of documents and queries.',
    outcome: 'Developers can route requests with their own provider keys and compare retrieval results before choosing a model.',
    relevance: 'AI integrations, search infrastructure, and model evaluation.',
    features: [
      'OpenAI-compatible embedding API',
      'Bring your own provider keys',
      'Compare models on your own data',
    ],
    preview: {
      src: '/images/work-embedroute.jpg',
      alt: 'EmbedRoute website introducing its embedding API and model comparison Lab.',
      caption: 'A common API for embedding providers, with a Lab for comparing models.',
    },
  },
};
