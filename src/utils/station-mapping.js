// ─── Station mapping utilities (shared by hooks and components) ───

export const MCP_URL = 'https://azoni-mcp.onrender.com';

export const SOURCE_TO_STATION = {
  'benchpressonly': 'benchpress',
  'spell-brigade': 'spellbrigade',
  'moltbook-agent': 'moltbook',
  'rowcrew': 'rowcrew',
  'oldwaystoday': 'oldwaystoday',
  'old-ways-today': 'oldwaystoday',
  'orchestrator': 'conductor',
  'daily-blog': 'scribe',
  'azoni': 'conductor',
  'azoni-ai': 'chatbot',
  'fabstats': 'fab',
  'fab-stats': 'fab',
  'fab-stats-bot': 'fab',
  'discord-bot': 'fab',
  'mcp-server': 'mcp',
  'azoni-mcp': 'mcp',
  'embedroute': 'embedroute',
  'embed-route': 'embedroute',
  'admin': 'conductor',
};

export const TYPE_TO_STATION = {
  // Conductor
  'agent_observing': 'conductor',
  'agent_deciding': 'conductor',
  'agent_drafting': 'conductor',
  'orchestrator_summary': 'conductor',
  'self_assessment': 'conductor',
  'error_reviewed': 'conductor',
  'project_updated': 'conductor',
  'project_created': 'conductor',
  'pr_detected': 'conductor',
  'reactive_trigger': 'conductor',
  'knowledge_generated': 'conductor',
  // Chatbot
  'assistant_chat': 'chatbot',
  'chat_answered': 'chatbot',
  // Activity Feed
  'health_alert': 'activity',
  // EmbedRoute
  'embed_request': 'embedroute',
  'rag_chunk_created': 'embedroute',
  'rag_chunk_updated': 'embedroute',
  // Scribe
  'blog_published': 'scribe',
  'blog_generated': 'scribe',
  'scribe_reading': 'scribe',
  'scribe_drafting': 'scribe',
  // Moltbook
  'moltbook_post': 'moltbook',
  'moltbook_comment': 'moltbook',
  'moltbook_upvote': 'moltbook',
  // Spell Brigade
  'wizard_created': 'spellbrigade',
  'dungeon_created': 'spellbrigade',
  'user_login': 'spellbrigade',
  'user_signup': 'spellbrigade',
  'guest_session': 'spellbrigade',
  'game_started': 'spellbrigade',
  // BenchPress
  'workout_generated': 'benchpress',
  'group_workout_generated': 'benchpress',
  'workout_autofilled': 'benchpress',
  'progress_analyzed': 'benchpress',
  'ai_coaching': 'benchpress',
  'form_check': 'benchpress',
  'form-check': 'benchpress',
  'assistant_greeting': 'benchpress',
  'workout_queued': 'benchpress',
  'group_workout_queued': 'benchpress',
  'exercise_swapped': 'benchpress',
  'program_generated': 'benchpress',
  'fitness_synced': 'benchpress',
  // RowCrew
  'rowing_session': 'rowcrew',
  'row_completed': 'rowcrew',
  'row_verified': 'rowcrew',
  'group_created': 'rowcrew',
  'group_joined': 'rowcrew',
  'challenge_created': 'rowcrew',
  'admin_transferred': 'rowcrew',
  // Old Ways Today
  'owt_chat': 'oldwaystoday',
  'owt_blog': 'oldwaystoday',
  'owt_blog_viewed': 'oldwaystoday',
  'owt_comment': 'oldwaystoday',
  'owt_social_post': 'oldwaystoday',
  // MCP
  'mcp_request': 'mcp',
  // FaB (FabStats + Discord Bot)
  'fabstats_activity': 'fab',
  'match_logged': 'fab',
  'matches_imported': 'fab',
  'minigame_completed': 'fab',
  'fab_match': 'fab',
  'fab_match_tracked': 'fab',
  'discord_command': 'fab',
};

export const DOMAIN_TO_STATION = {
  benchpressonly: 'benchpress',
  activity: 'activity',
  spellbrigade: 'spellbrigade',
  oldwaystoday: 'oldwaystoday',
  moltbook: 'moltbook',
  embedroute: 'embedroute',
  rowcrew: 'rowcrew',
  fabstats: 'fab',
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
    id: 'conductor', label: 'Conductor', color: '#a78bfa', agent: 'orchestrator', icon: 'gear', category: 'agent',
    desc: 'Central orchestrator — observes, decides, and coordinates all agents.',
    tagline: 'Central AI orchestrator',
    actions: ['Gathering sources', 'LLM deciding', 'Coordinating agents'],
    dataLabel: 'state',
  },
  {
    id: 'chatbot', label: 'Azoni AI', color: '#60a5fa', agent: 'chat', icon: 'chat', category: 'agent',
    desc: 'AI chatbot — answers questions about the Azoni ecosystem.',
    tagline: 'RAG-powered AI assistant',
    actions: ['Answering queries', 'RAG retrieval', 'Conversing'],
    dataLabel: 'queries', url: '/chat',
  },
  {
    id: 'scribe', label: 'Scribe', color: '#fbbf24', agent: 'blog', icon: 'pen', category: 'agent',
    desc: 'Daily blog writer — reads sources and publishes articles autonomously.',
    tagline: 'Autonomous blog writer',
    actions: ['Reading sources', 'Writing articles', 'Publishing posts'],
    dataLabel: 'content', url: '/blog',
  },
  {
    id: 'moltbook', label: 'Moltbook', color: '#fb923c', agent: 'social', icon: 'megaphone', category: 'agent',
    desc: 'Social platform — AI-powered posts, comments, and engagement.',
    tagline: 'Autonomous social agent',
    actions: ['Crafting posts', 'Social engagement', 'Content curation'],
    dataLabel: 'posts', url: '/moltbook',
  },
  {
    id: 'spellbrigade', label: 'Spell Brigade', color: '#c084fc', agent: 'gaming', icon: 'wand', category: 'app',
    desc: 'Multiplayer wizard combat game. AI generates characters with unique abilities.',
    tagline: 'Multiplayer wizard combat',
    actions: ['Generating wizards', 'Running battles', 'AI enemies active'],
    dataLabel: 'game data', url: '/game',
  },
  {
    id: 'oldwaystoday', label: 'Old Ways Today', color: '#d97706', agent: 'oldways', icon: 'leaf', category: 'app',
    desc: 'AI wellness platform — RAG chatbot + auto-blog for natural remedies.',
    tagline: 'AI wellness platform',
    actions: ['Curating remedies', 'Auto-blogging', 'RAG retrieval'],
    dataLabel: 'recipes', url: 'https://oldwaystoday.com',
  },
  {
    id: 'benchpress', label: 'Bench Only', color: '#4ade80', agent: 'fitness', icon: 'dumbbell', category: 'app',
    desc: 'AI workout generator — personalized programs, progress tracking, AI coaching.',
    tagline: 'AI strength training PWA',
    actions: ['Generating workouts', 'Analyzing PRs', 'AI coaching'],
    dataLabel: 'fitness data', url: 'https://benchpressonly.com',
  },
  {
    id: 'rowcrew', label: 'RowCrew', color: '#34d399', agent: 'rowing', icon: 'waves', category: 'app',
    desc: 'Rowing tracker — log sessions, track meters, team challenges.',
    tagline: 'Social fitness with AI verification',
    actions: ['Tracking sessions', 'Logging meters', 'Group challenges'],
    dataLabel: 'rowing data', url: 'https://rowcrew.netlify.app',
  },
  {
    id: 'fab', label: 'FaB Stats', color: '#D9A05B', agent: 'fabstats', secondAgent: 'fabstatsbot', icon: 'shield', category: 'app',
    desc: 'Flesh and Blood ecosystem — FaB Stats tracker + Discord bot.',
    tagline: 'Competitive TCG analytics',
    actions: ['Tracking matches', 'Player lookups', 'Daily minigames'],
    dataLabel: 'FaB data', url: 'https://fabstats.net',
  },
  {
    id: 'activity', label: 'Activity Feed', color: '#f87171', icon: 'pulse', category: 'data',
    desc: 'Event logging service — tracks all activity across the ecosystem.',
    tagline: 'Ecosystem event logger',
    actions: ['Logging events', 'Streaming updates', 'Event history'],
    dataLabel: 'events',
  },
  {
    id: 'embedroute', label: 'EmbedRoute', color: '#20d9d2', icon: 'nodes', category: 'data',
    desc: 'Multi-provider embedding API — routes text to optimal vector models.',
    tagline: 'Multi-provider embedding API',
    actions: ['Routing embeddings', 'Multi-provider vectors', 'Caching'],
    dataLabel: 'embeddings', url: 'https://www.embedroute.com',
  },
  {
    id: 'medic', label: 'The Medic', color: '#f87171', agent: 'medic', icon: 'shield', category: 'data',
    desc: 'Office medic — makes rounds checking station health and uptime.',
    tagline: 'Station health monitor',
    actions: ['Health checkups', 'Making rounds', 'Status alerts'],
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
  medic:        { bobSpeed: 3000, bobAmt: 2.0, breathSpeed: 2800, breathAmt: 0.015, lean: 0 },
};

export const STATION_CONNECTIONS = {
  conductor: ['scribe', 'mcp'],
  chatbot: ['mcp'],
  scribe: ['mcp'],
  moltbook: ['mcp'],
  spellbrigade: ['mcp'],
  benchpress: ['mcp'],
  rowcrew: ['mcp'],
  oldwaystoday: ['mcp', 'activity'],
  fab: ['mcp'],
  activity: ['mcp'],
  embedroute: ['mcp'],
  medic: ['mcp', 'activity'],
};

export const STATION_TO_PROJECT = {
  conductor: 'azoni-ai',
  chatbot: 'azoni-ai',
  scribe: 'azoni-ai',
  moltbook: 'moltbook-agent',
  spellbrigade: 'spell-brigade',
  oldwaystoday: 'old-ways-today',
  benchpress: 'bench-only',
  rowcrew: 'row-crew',
  activity: 'azoni-ai',
  embedroute: 'embedroute',
  fab: 'fab-stats',
  mcp: 'azoni-mcp',
  medic: 'azoni-ai',
};

// Default walk targets for known station partnerships
export const DEFAULT_WALK_TARGETS = {};

// GitHub repo name → station ID (for blog visitedStations)
export const REPO_TO_STATION = {
  'azoni-website': 'conductor',
  'azoni-ai': 'conductor',
  'spell-brigade': 'spellbrigade',
  'moltbook-agent': 'moltbook',
  'old-ways-today': 'oldwaystoday',
  'oldways-app': 'oldwaystoday',
  'bench-only': 'benchpress',
  'benchonly': 'benchpress',
  'embedroute': 'embedroute',
  'row-crew': 'rowcrew',
  'rowing-tracker': 'rowcrew',
  'fab-stats': 'fab',
  'fab-stats-bot': 'fab',
  'azoni-mcp': 'mcp',
};

// Event importance tiers for walk rules
export const IMPORTANT_EVENTS = new Set([
  'blog_generated', 'blog_published', 'orchestrator_summary',
  'error_logged', 'error_reviewed', 'health_alert',
  'self_assessment', 'reactive_trigger',
]);

export const MEDIUM_EVENTS = new Set([
  'assistant_chat', 'knowledge_generated', 'moltbook_post',
  'owt_blog', 'owt_blog_viewed', 'owt_chat',
  'workout_generated', 'program_generated', 'rowing_session',
  'wizard_created', 'match_logged', 'discord_command',
  'scribe_reading', 'scribe_drafting',
]);

export function getEventImportance(type) {
  if (IMPORTANT_EVENTS.has(type)) return 'important';
  if (MEDIUM_EVENTS.has(type)) return 'medium';
  return 'low';
}

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
