// ─── Station mapping utilities (shared by hooks and components) ───

export const MCP_URL = 'https://azoni-mcp.onrender.com';

export const SOURCE_TO_STATION = {
  'benchpressonly': 'benchpressonly',
  'spell-brigade': 'spellbrigade',
  'moltbook-agent': 'moltbook',
  'rowcrew': 'rowcrew',
  'oldwaystoday': 'oldwaystoday',
  'old-ways-today': 'oldwaystoday',
  'orchestrator': 'orchestrator',
  'daily-blog': 'blog',
  'azoni': 'chatbot',
  'azoni-ai': 'chatbot',
  'fabstats': 'fabstats',
  'fab-stats': 'fabstats',
  'fab-stats-bot': 'fabstatsbot',
  'discord-bot': 'fabstatsbot',
  'mcp-server': 'mcp',
  'azoni-mcp': 'mcp',
  'embedroute': 'embedroute',
  'embed-route': 'embedroute',
  'admin': 'orchestrator',
};

export const TYPE_TO_STATION = {
  // Orchestrator
  'agent_observing': 'orchestrator',
  'agent_deciding': 'orchestrator',
  'agent_drafting': 'orchestrator',
  'orchestrator_summary': 'orchestrator',
  'self_assessment': 'orchestrator',
  'error_reviewed': 'orchestrator',
  'project_updated': 'orchestrator',
  'project_created': 'orchestrator',
  'pr_detected': 'orchestrator',
  'reactive_trigger': 'orchestrator',
  // Activity feed
  'health_alert': 'activity',
  // Blog
  'blog_published': 'blog',
  'blog_generated': 'blog',
  // Chatbot
  'knowledge_generated': 'chatbot',
  'assistant_chat': 'chatbot',
  'chat_answered': 'chatbot',
  // Spell Brigade
  'wizard_created': 'spellbrigade',
  'dungeon_created': 'spellbrigade',
  'user_login': 'spellbrigade',
  'user_signup': 'spellbrigade',
  'guest_session': 'spellbrigade',
  'game_started': 'spellbrigade',
  // BenchPress
  'workout_generated': 'benchpressonly',
  'group_workout_generated': 'benchpressonly',
  'workout_autofilled': 'benchpressonly',
  'progress_analyzed': 'benchpressonly',
  'ai_coaching': 'benchpressonly',
  'form_check': 'benchpressonly',
  'form-check': 'benchpressonly',
  'assistant_greeting': 'benchpressonly',
  'workout_queued': 'benchpressonly',
  'group_workout_queued': 'benchpressonly',
  'exercise_swapped': 'benchpressonly',
  'program_generated': 'benchpressonly',
  'fitness_synced': 'benchpressonly',
  // Moltbook
  'moltbook_post': 'moltbook',
  'moltbook_comment': 'moltbook',
  'moltbook_upvote': 'moltbook',
  // Old Ways Today
  'owt_chat': 'oldwaystoday',
  'owt_blog': 'oldwaystoday',
  'owt_blog_viewed': 'oldwaystoday',
  'owt_comment': 'oldwaystoday',
  'owt_social_post': 'oldwaystoday',
  // RowCrew
  'rowing_session': 'rowcrew',
  'row_completed': 'rowcrew',
  'row_verified': 'rowcrew',
  'group_created': 'rowcrew',
  'group_joined': 'rowcrew',
  'challenge_created': 'rowcrew',
  'admin_transferred': 'rowcrew',
  // EmbedRoute
  'embed_request': 'embedroute',
  'rag_chunk_created': 'embedroute',
  'rag_chunk_updated': 'embedroute',
  // MCP
  'mcp_request': 'mcp',
  // FabStats
  'fabstats_activity': 'fabstats',
  'match_logged': 'fabstats',
  'matches_imported': 'fabstats',
  'minigame_completed': 'fabstats',
  'fab_match': 'fabstats',
  'fab_match_tracked': 'fabstats',
  // FaB Bot
  'discord_command': 'fabstatsbot',
};

export const DOMAIN_TO_STATION = {
  benchpressonly: 'benchpressonly',
  activity: 'activity',
  spellbrigade: 'spellbrigade',
  oldwaystoday: 'oldwaystoday',
  moltbook: 'moltbook',
  embedroute: 'embedroute',
  rowcrew: 'rowcrew',
  fabstats: 'fabstats',
};

export const CATEGORY_STYLES = {
  agent: { label: 'AGENT', color: '#a78bfa' },
  app:   { label: 'APP',   color: '#60a5fa' },
  data:  { label: 'DATA',  color: '#6b6b65' },
};

export const STATION_DEFS = [
  {
    id: 'mcp', label: 'MCP Server', color: '#ff7a5c', isHub: true, category: 'data',
    desc: 'Tool registry and data gateway — exposes 37 tools across 9 domains.',
    actions: ['Routing requests', 'Serving 37 tools', 'Health monitoring'],
  },
  {
    id: 'chatbot', label: 'Azoni AI', color: '#60a5fa', agent: 'chat', icon: 'chat', category: 'agent',
    desc: 'RAG chatbot — queries knowledge base, generates missing knowledge on the fly.',
    actions: ['Answering queries', 'Vector searching', 'Building context'],
    dataLabel: 'queries', url: '/chat',
  },
  {
    id: 'blog', label: 'The Scribe', color: '#fbbf24', agent: 'blog', icon: 'pen', category: 'agent',
    desc: 'Daily autonomous blog agent — reads commits, writes analysis, publishes.',
    actions: ['Analyzing commits', 'Writing article', 'Publishing post'],
    dataLabel: 'blog content', url: '/blog',
  },
  {
    id: 'orchestrator', label: 'The Conductor', color: '#a78bfa', agent: 'orchestrator', icon: 'gear', category: 'agent',
    desc: 'Central brain. Wakes every 3h, reads state, decides actions, executes.',
    actions: ['Gathering 11 sources', 'LLM deciding', 'Executing actions'],
    dataLabel: 'health + state',
  },
  {
    id: 'spellbrigade', label: 'Spell Brigade', color: '#c084fc', agent: 'gaming', icon: 'wand', category: 'app',
    desc: 'Multiplayer wizard combat game. AI generates characters with unique abilities.',
    actions: ['Generating wizards', 'Running battles', 'AI enemies active'],
    dataLabel: 'game data', url: '/game',
  },
  {
    id: 'moltbook', label: 'Moltbook', color: '#fb923c', agent: 'social', icon: 'megaphone', category: 'agent',
    desc: 'Autonomous social platform. LLM generates posts, comments, and engagement.',
    actions: ['Crafting posts', 'Scheduling content', 'Engaging users'],
    dataLabel: 'social content', url: '/moltbook',
  },
  {
    id: 'oldwaystoday', label: 'Old Ways Today', color: '#d97706', agent: 'oldways', icon: 'leaf', category: 'agent',
    desc: 'AI wellness platform — RAG chatbot + auto-blog for natural remedies.',
    actions: ['Curating remedies', 'Auto-blogging', 'RAG retrieval'],
    dataLabel: 'recipes', url: 'https://oldwaystoday.com',
  },
  {
    id: 'benchpressonly', label: 'BenchPress', color: '#4ade80', agent: 'fitness', icon: 'dumbbell', category: 'agent',
    desc: 'AI fitness app. Generates personalized workouts, tracks PRs.',
    actions: ['Tracking workouts', 'AI coaching', 'Analyzing PRs'],
    dataLabel: 'fitness data', url: 'https://benchpressonly.com',
  },
  {
    id: 'embedroute', label: 'EmbedRoute', color: '#20d9d2', icon: 'nodes', category: 'data',
    desc: 'Unified embedding API — routes to OpenAI, Cohere, Voyage, and more.',
    actions: ['Routing embeddings', 'Multi-provider', 'Serving vectors'],
    dataLabel: 'embeddings', url: 'https://www.embedroute.com',
  },
  {
    id: 'rowcrew', label: 'RowCrew', color: '#34d399', agent: 'rowing', icon: 'waves', category: 'app',
    desc: 'AI rowing tracker — Claude Vision verifies workout photos, extracts data.',
    actions: ['Logging sessions', 'Stroke analysis', 'Progress tracking'],
    dataLabel: 'rowing data', url: 'https://rowcrew.netlify.app',
  },
  {
    id: 'activity', label: 'Activity Feed', color: '#f87171', icon: 'pulse', category: 'data',
    desc: 'Firestore agent_activity — single source of truth for all services.',
    actions: ['Logging events', 'Cross-app tracking', 'Agent monitoring'],
    dataLabel: 'event logs', url: '/activity',
  },
  {
    id: 'fabstats', label: 'FaB Stats', color: '#D9A05B', agent: 'fabstats', icon: 'shield', category: 'app',
    desc: 'Flesh and Blood TCG tracker. Matches, heroes, tournaments, minigames.',
    actions: ['Tracking matches', 'Meta analysis', 'Daily minigames'],
    dataLabel: 'FaB data', url: 'https://fabstats.net',
  },
  {
    id: 'fabstatsbot', label: 'FaB Bot', color: '#c9a84c', agent: 'fabstatsbot', icon: 'chat', category: 'app',
    desc: 'Discord bot for FaB Stats — player stats, leaderboards, puzzle results.',
    actions: ['Player lookups', 'Leaderboards', 'Puzzle results'],
    dataLabel: 'Discord data',
  },
];

export const AGENT_IDLE = {
  orchestrator: { bobSpeed: 5000, bobAmt: 2.5, breathSpeed: 4000, breathAmt: 0.015, lean: 0 },
  chat:         { bobSpeed: 2800, bobAmt: 1.8, breathSpeed: 2500, breathAmt: 0.012, lean: 0.02 },
  blog:         { bobSpeed: 4200, bobAmt: 1.5, breathSpeed: 3500, breathAmt: 0.01, lean: -0.015 },
  fitness:      { bobSpeed: 2200, bobAmt: 2.5, breathSpeed: 2000, breathAmt: 0.02, lean: 0 },
  gaming:       { bobSpeed: 3600, bobAmt: 2.0, breathSpeed: 3000, breathAmt: 0.018, lean: 0.01 },
  social:       { bobSpeed: 2000, bobAmt: 3.0, breathSpeed: 2200, breathAmt: 0.015, lean: -0.02 },
  oldways:      { bobSpeed: 3800, bobAmt: 1.5, breathSpeed: 3400, breathAmt: 0.01, lean: -0.01 },
  fabstats:     { bobSpeed: 3400, bobAmt: 1.8, breathSpeed: 3200, breathAmt: 0.012, lean: 0.01 },
  fabstatsbot:  { bobSpeed: 2600, bobAmt: 2.2, breathSpeed: 2800, breathAmt: 0.015, lean: -0.01 },
  rowing:       { bobSpeed: 3200, bobAmt: 2.0, breathSpeed: 3000, breathAmt: 0.015, lean: 0 },
};

export const STATION_CONNECTIONS = {
  orchestrator: ['blog', 'chatbot', 'moltbook', 'mcp'],
  blog: ['mcp', 'moltbook'],
  chatbot: ['mcp', 'embedroute'],
  spellbrigade: ['mcp'],
  benchpressonly: ['mcp'],
  moltbook: ['mcp'],
  oldwaystoday: ['mcp', 'embedroute'],
  rowcrew: ['mcp'],
  fabstats: ['mcp'],
  fabstatsbot: ['mcp', 'fabstats'],
  embedroute: ['mcp'],
  activity: ['mcp'],
};

export const STATION_TO_PROJECT = {
  chatbot: 'azoni-ai',
  blog: 'azoni-ai',
  orchestrator: 'azoni-ai',
  spellbrigade: 'spell-brigade',
  moltbook: 'moltbook-agent',
  oldwaystoday: 'old-ways-today',
  benchpressonly: 'bench-only',
  embedroute: 'embedroute',
  rowcrew: 'row-crew',
  fabstats: 'fab-stats',
  fabstatsbot: 'fab-stats-bot',
  mcp: 'azoni-mcp',
};

export function mapSourceToStation(source, type) {
  if (SOURCE_TO_STATION[source]) return SOURCE_TO_STATION[source];
  if (TYPE_TO_STATION[type]) return TYPE_TO_STATION[type];
  return null;
}

export function formatTimeAgo(ms) {
  const diff = Date.now() - ms;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
