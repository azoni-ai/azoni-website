// ─── Station mapping utilities (shared by hooks and components) ───

export const MCP_URL = 'https://azoni-mcp.onrender.com';

export const SOURCE_TO_STATION = {
  'benchpressonly': 'gym',
  'spell-brigade': 'spellbrigade',
  'moltbook-agent': 'content',
  'rowcrew': 'gym',
  'oldwaystoday': 'oldwaystoday',
  'old-ways-today': 'oldwaystoday',
  'orchestrator': 'hq',
  'daily-blog': 'content',
  'azoni': 'hq',
  'azoni-ai': 'hq',
  'fabstats': 'fab',
  'fab-stats': 'fab',
  'fab-stats-bot': 'fab',
  'discord-bot': 'fab',
  'mcp-server': 'mcp',
  'azoni-mcp': 'mcp',
  'embedroute': 'tools',
  'embed-route': 'tools',
  'admin': 'hq',
};

export const TYPE_TO_STATION = {
  // HQ (Orchestrator + Chatbot)
  'agent_observing': 'hq',
  'agent_deciding': 'hq',
  'agent_drafting': 'hq',
  'orchestrator_summary': 'hq',
  'self_assessment': 'hq',
  'error_reviewed': 'hq',
  'project_updated': 'hq',
  'project_created': 'hq',
  'pr_detected': 'hq',
  'reactive_trigger': 'hq',
  'knowledge_generated': 'hq',
  'assistant_chat': 'hq',
  'chat_answered': 'hq',
  // Tools (Activity + EmbedRoute)
  'health_alert': 'tools',
  'embed_request': 'tools',
  'rag_chunk_created': 'tools',
  'rag_chunk_updated': 'tools',
  // Content (Blog + Moltbook)
  'blog_published': 'content',
  'blog_generated': 'content',
  'scribe_reading': 'content',
  'scribe_drafting': 'content',
  'moltbook_post': 'content',
  'moltbook_comment': 'content',
  'moltbook_upvote': 'content',
  // Spell Brigade
  'wizard_created': 'spellbrigade',
  'dungeon_created': 'spellbrigade',
  'user_login': 'spellbrigade',
  'user_signup': 'spellbrigade',
  'guest_session': 'spellbrigade',
  'game_started': 'spellbrigade',
  // Gym (BenchPress + RowCrew)
  'workout_generated': 'gym',
  'group_workout_generated': 'gym',
  'workout_autofilled': 'gym',
  'progress_analyzed': 'gym',
  'ai_coaching': 'gym',
  'form_check': 'gym',
  'form-check': 'gym',
  'assistant_greeting': 'gym',
  'workout_queued': 'gym',
  'group_workout_queued': 'gym',
  'exercise_swapped': 'gym',
  'program_generated': 'gym',
  'fitness_synced': 'gym',
  'rowing_session': 'gym',
  'row_completed': 'gym',
  'row_verified': 'gym',
  'group_created': 'gym',
  'group_joined': 'gym',
  'challenge_created': 'gym',
  'admin_transferred': 'gym',
  // Old Ways Today
  'owt_chat': 'oldwaystoday',
  'owt_blog': 'oldwaystoday',
  'owt_blog_viewed': 'oldwaystoday',
  'owt_comment': 'oldwaystoday',
  'owt_social_post': 'oldwaystoday',
  // MCP
  'mcp_request': 'mcp',
  // FaB (FabStats + FaB Bot)
  'fabstats_activity': 'fab',
  'match_logged': 'fab',
  'matches_imported': 'fab',
  'minigame_completed': 'fab',
  'fab_match': 'fab',
  'fab_match_tracked': 'fab',
  'discord_command': 'fab',
};

export const DOMAIN_TO_STATION = {
  benchpressonly: 'gym',
  activity: 'tools',
  spellbrigade: 'spellbrigade',
  oldwaystoday: 'oldwaystoday',
  moltbook: 'content',
  embedroute: 'tools',
  rowcrew: 'gym',
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
    id: 'hq', label: 'HQ', color: '#a78bfa', agent: 'orchestrator', secondAgent: 'chat', icon: 'gear', category: 'agent',
    desc: 'Central command — Conductor orchestration + Azoni AI chatbot.',
    actions: ['Gathering sources', 'LLM deciding', 'Answering queries'],
    dataLabel: 'queries + state', url: '/chat',
  },
  {
    id: 'content', label: 'Content', color: '#fbbf24', agent: 'blog', secondAgent: 'social', icon: 'pen', category: 'agent',
    desc: 'Content engine — Scribe daily blog + Moltbook social posts.',
    actions: ['Writing articles', 'Publishing posts', 'Crafting content'],
    dataLabel: 'content', url: '/blog',
  },
  {
    id: 'spellbrigade', label: 'Spell Brigade', color: '#c084fc', agent: 'gaming', icon: 'wand', category: 'app',
    desc: 'Multiplayer wizard combat game. AI generates characters with unique abilities.',
    actions: ['Generating wizards', 'Running battles', 'AI enemies active'],
    dataLabel: 'game data', url: '/game',
  },
  {
    id: 'oldwaystoday', label: 'Old Ways Today', color: '#d97706', agent: 'oldways', icon: 'leaf', category: 'agent',
    desc: 'AI wellness platform — RAG chatbot + auto-blog for natural remedies.',
    actions: ['Curating remedies', 'Auto-blogging', 'RAG retrieval'],
    dataLabel: 'recipes', url: 'https://oldwaystoday.com',
  },
  {
    id: 'gym', label: 'The Gym', color: '#4ade80', agent: 'fitness', secondAgent: 'rowing', icon: 'dumbbell', category: 'app',
    desc: 'AI fitness platform — BenchPressOnly workouts + RowCrew rowing tracker.',
    actions: ['Generating workouts', 'Tracking rowing', 'Analyzing PRs'],
    dataLabel: 'fitness data',
  },
  {
    id: 'fab', label: 'FaB', color: '#D9A05B', agent: 'fabstats', secondAgent: 'fabstatsbot', icon: 'shield', category: 'app',
    desc: 'Flesh and Blood ecosystem — FaB Stats tracker + Discord bot.',
    actions: ['Tracking matches', 'Player lookups', 'Daily minigames'],
    dataLabel: 'FaB data', url: 'https://fabstats.net',
  },
  {
    id: 'tools', label: 'Tools', color: '#20d9d2', icon: 'nodes', category: 'data',
    desc: 'Infrastructure tools — Activity Feed event logs + EmbedRoute embedding API.',
    actions: ['Logging events', 'Routing embeddings', 'Multi-provider vectors'],
    dataLabel: 'events + embeddings',
  },
  {
    id: 'medic', label: 'The Medic', color: '#f87171', agent: 'medic', icon: 'shield', category: 'data',
    desc: 'Office medic — makes rounds checking station health and uptime. Reports status changes.',
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
  hq: ['content', 'mcp'],
  content: ['mcp'],
  spellbrigade: ['mcp'],
  gym: ['mcp'],
  oldwaystoday: ['mcp', 'tools'],
  fab: ['mcp'],
  tools: ['mcp'],
  medic: ['mcp', 'tools'],
};

export const STATION_TO_PROJECT = {
  hq: 'azoni-ai',
  content: 'azoni-ai',
  spellbrigade: 'spell-brigade',
  oldwaystoday: 'old-ways-today',
  gym: 'bench-only',
  tools: 'embedroute',
  fab: 'fab-stats',
  mcp: 'azoni-mcp',
  medic: 'azoni-ai',
};

// Default walk targets for known station partnerships
export const DEFAULT_WALK_TARGETS = {};

// GitHub repo name → station ID (for blog visitedStations)
export const REPO_TO_STATION = {
  'azoni-website': 'hq',
  'azoni-ai': 'hq',
  'spell-brigade': 'spellbrigade',
  'moltbook-agent': 'content',
  'old-ways-today': 'oldwaystoday',
  'oldways-app': 'oldwaystoday',
  'bench-only': 'gym',
  'benchonly': 'gym',
  'embedroute': 'tools',
  'row-crew': 'gym',
  'rowing-tracker': 'gym',
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
