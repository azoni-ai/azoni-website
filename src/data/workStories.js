// Consulting-facing summaries of the documented work in projects.js.
// These are independent products, not claims about client engagements.
export const selectedWorkIds = ['embedroute', 'fab-stats', 'old-ways-today', 'azoni-mcp'];

export const workStories = {
  embedroute: {
    label: 'AI infrastructure',
    headline: 'An embedding API and model comparison lab.',
    summary: 'EmbedRoute helps developers connect to embedding providers and compare search results using their own data.',
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
  'fab-stats': {
    label: 'Community & analytics',
    headline: 'Match tracking and analytics for Flesh and Blood.',
    summary: 'FaB Stats helps Flesh and Blood players track matches, compare hero performance, and explore tournament results.',
    role: 'Solo design, engineering, and operation',
    problem: 'Players wanted data to understand the competitive card game, but entering every match by hand made it difficult to keep records.',
    approach: 'I built the stats site, a browser extension for tournament imports, and a Discord bot that brings hero and matchup data into community servers.',
    outcome: 'Players can import results, review their match history, and use shared hero and matchup statistics between events.',
    relevance: 'Full-stack products, data imports, analytics, and community integrations.',
    features: [
      'Tournament imports with a browser extension',
      'Hero performance and matchup statistics',
      'Discord companion and daily puzzles',
    ],
    preview: {
      src: '/images/work-fabstats.jpg',
      alt: 'FaB Stats website for Flesh and Blood match tracking and community statistics.',
      caption: 'Match records, hero statistics, and community tools for card-game players.',
    },
  },
  'old-ways-today': {
    label: 'Content & AI assistant',
    headline: 'A guide to everyday household alternatives.',
    summary: 'Old Ways Today brings household guides, product recommendations, and an AI assistant together for people exploring everyday swaps.',
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
  'azoni-mcp': {
    label: 'Agent infrastructure',
    headline: 'Shared tools and activity logs for AI agents.',
    summary: 'Azoni MCP is the backend my chat and autonomous agents use to access product data, run tools, and record their activity.',
    role: 'Architecture, implementation, and operation',
    problem: 'Separate agents repeated the same API integrations, access checks, and logging. Investigating their actions meant looking across several systems.',
    approach: 'I moved the tools into one server, organized them by product domain, and added authentication, rate limits, and activity logging to the shared endpoints.',
    outcome: 'Chat and autonomous workflows use the same tools, and their activity can be reviewed in one place.',
    relevance: 'Agent architecture, API integrations, access controls, and monitoring.',
    features: [
      'Tools grouped by product domain',
      'Authenticated, rate-limited endpoints',
      'Shared logs for agent activity',
    ],
    preview: {
      kind: 'tools',
      caption: 'Chat and autonomous agents use the same server for product tools and activity logs.',
    },
  },
};
