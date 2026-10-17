// Consulting-facing summaries of the documented work in projects.js.
// These are independent products, not claims about client engagements.
export const selectedWorkIds = ['embedroute', 'fab-stats', 'old-ways-today', 'azoni-mcp'];

export const workStories = {
  embedroute: {
    label: 'AI infrastructure',
    headline: 'One integration for multiple embedding providers.',
    role: 'Product design, engineering, and operation',
    problem: 'Each retrieval project repeated provider integrations, and comparing embedding models required custom code.',
    approach: 'Built an OpenAI-compatible gateway for multiple embedding providers, with a lab for comparing models on your own data.',
    outcome: 'One interface for provider routing and a practical way to evaluate models before choosing an integration.',
    relevance: 'AI integration, retrieval infrastructure, and model evaluation.',
  },
  'fab-stats': {
    label: 'Product & data platform',
    headline: 'Turn community activity into useful product data.',
    role: 'Solo design, engineering, and operation',
    problem: 'Competitive players needed shared match data, but manually entering tournament results created too much friction.',
    approach: 'Connected one-click tournament imports with match analytics, cached public summaries, and a Discord companion.',
    outcome: 'A working analytics platform with match imports, hero performance data, and community tools in one system.',
    relevance: 'Full-stack delivery, data workflows, and product adoption.',
  },
  'old-ways-today': {
    label: 'AI product delivery',
    headline: 'Put a grounded assistant inside a useful product.',
    role: 'Solo design, engineering, and operation',
    problem: 'A household advice assistant needed to use curated content and return usable product links.',
    approach: 'Connected retrieval to a curated knowledge base, streamed responses, and validated product links in code.',
    outcome: 'A live content and recommendation product with a retrieval-based assistant and link fallback handling.',
    relevance: 'Retrieval, conversational interfaces, and output validation.',
  },
  'azoni-mcp': {
    label: 'Agent tooling & operations',
    headline: 'Give agents a shared, observable tool layer.',
    role: 'Architecture, implementation, and operation',
    problem: 'Separate agents duplicated API access and logging, making their actions difficult to inspect in one place.',
    approach: 'Centralized tools behind authenticated, rate-limited endpoints with common activity logging.',
    outcome: 'A shared tool server for chat and autonomous workflows, with common access controls and activity logs.',
    relevance: 'Agent architecture, integrations, and operational visibility.',
  },
};
