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
  'launchpad': 'launchpad',
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
  // Canonical cross-site content event (hub cadence tracking); the emitting
  // site's `source` normally routes it — this is only the fallback.
  'content_posted': 'activity',
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
  launchpad: 'launchpad',
};

export const CATEGORY_STYLES = {
  agent:  { label: 'AGENT',  color: '#a78bfa' },
  app:    { label: 'APP',    color: '#60a5fa' },
  data:   { label: 'DATA',   color: '#6b6b65' },
  career: { label: 'CAREER', color: '#60a5fa' },
};

export const STATION_DEFS = [
  {
    id: 'mcp', label: 'MCP Server', color: '#ff7a5c', isHub: true, category: 'data',
    desc: 'Tool registry and data gateway. Exposes 37 tools across 9 domains.',
    actions: ['Routing requests', 'Serving 37 tools', 'Health monitoring'],
  },
  {
    id: 'conductor', label: 'Conductor', color: '#a78bfa', agent: 'orchestrator', icon: 'gear', category: 'agent',
    desc: 'Orchestrator that coordinates the other agents.',
    tagline: 'Central AI orchestrator',
    actions: ['Gathering sources', 'LLM deciding', 'Coordinating agents'],
    dataLabel: 'state',
  },
  {
    id: 'chatbot', label: 'Azoni AI', color: '#60a5fa', agent: 'chat', icon: 'chat', category: 'agent',
    desc: 'Chatbot that answers questions about the Azoni apps.',
    tagline: 'RAG-powered AI assistant',
    actions: ['Answering queries', 'RAG retrieval', 'Conversing'],
    dataLabel: 'queries', url: '/chat',
  },
  {
    id: 'scribe', label: 'Scribe', color: '#fbbf24', agent: 'blog', icon: 'pen', category: 'agent',
    desc: 'Daily blog writer. Reads sources and publishes articles on its own.',
    tagline: 'Autonomous blog writer',
    actions: ['Reading sources', 'Writing articles', 'Publishing posts'],
    dataLabel: 'content', url: '/blog',
  },
  {
    id: 'moltbook', label: 'Moltbook', color: '#fb923c', agent: 'social', icon: 'megaphone', category: 'agent',
    desc: 'Social platform with AI-generated posts and comments.',
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
    desc: 'Natural-remedies site with a RAG chatbot and an auto-blog.',
    tagline: 'AI wellness platform',
    actions: ['Curating remedies', 'Auto-blogging', 'RAG retrieval'],
    dataLabel: 'recipes', url: 'https://oldwaystoday.com',
  },
  {
    id: 'benchpress', label: 'Bench Only', color: '#4ade80', agent: 'fitness', icon: 'dumbbell', category: 'app',
    desc: 'Workout generator with personalized programs, progress tracking, and coaching.',
    tagline: 'AI strength training PWA',
    actions: ['Generating workouts', 'Analyzing PRs', 'AI coaching'],
    dataLabel: 'fitness data', url: 'https://benchpressonly.com',
  },
  {
    id: 'rowcrew', label: 'RowCrew', color: '#34d399', agent: 'rowing', icon: 'waves', category: 'app',
    desc: 'Rowing tracker for logging sessions, meters, and team challenges.',
    tagline: 'Rowing tracker with team challenges',
    actions: ['Tracking sessions', 'Logging meters', 'Group challenges'],
    dataLabel: 'rowing data', url: 'https://rowcrew.netlify.app',
  },
  {
    id: 'fab', label: 'FaB Stats', color: '#D9A05B', agent: 'fabstats', secondAgent: 'fabstatsbot', icon: 'shield', category: 'app',
    desc: 'Flesh and Blood stats site and Discord bot.',
    tagline: 'Competitive TCG analytics',
    actions: ['Tracking matches', 'Player lookups', 'Daily minigames'],
    dataLabel: 'FaB data', url: 'https://fabstats.net',
  },
  {
    id: 'activity', label: 'Activity Feed', color: '#f87171', icon: 'pulse', category: 'data',
    desc: 'Event logging service. Tracks activity across the apps.',
    tagline: 'Ecosystem event logger',
    actions: ['Logging events', 'Streaming updates', 'Event history'],
    dataLabel: 'events',
  },
  {
    id: 'embedroute', label: 'EmbedRoute', color: '#20d9d2', icon: 'nodes', category: 'data',
    desc: 'Embedding API that routes text across multiple providers.',
    tagline: 'Multi-provider embedding API',
    actions: ['Routing embeddings', 'Multi-provider vectors', 'Caching'],
    dataLabel: 'embeddings', url: 'https://www.embedroute.com',
  },
  {
    id: 'medic', label: 'The Medic', color: '#f87171', agent: 'medic', icon: 'shield', category: 'data',
    desc: 'Health monitor. Checks each service\'s status and uptime.',
    tagline: 'Station health monitor',
    actions: ['Health checkups', 'Making rounds', 'Status alerts'],
  },
  {
    id: 'launchpad', label: 'Launchpad', color: '#FF6B35', icon: 'rocket', category: 'app',
    desc: 'Web app factory — tracks views and activity across all launched apps.',
    tagline: 'Web app factory',
    actions: ['Tracking views', 'Monitoring apps', 'Reporting stats'],
    dataLabel: 'views',
  },
  // ─── CAREER (archive stations) ───
  {
    id: 'tmobile', label: 'T-Mobile', color: '#e20074', icon: 'building', category: 'career', isArchive: true,
    desc: 'Owned the GitLab CI/CD pipeline and Python/Django microservice backend for an internal network-ops platform. Migrated the frontend from Django templates to Angular with no downtime. Consolidated 4-5 tools into one, cutting manual work about 80%.',
    tagline: 'Software Engineer II · 2018–2022',
    tech: ['Python', 'Django', 'Angular', 'PostgreSQL', 'GitLab CI/CD', 'Microservices'],
    logo: '/images/tmobile-logo.svg',
  },
  {
    id: 'capitalone', label: 'Capital One', color: '#004977', icon: 'building', category: 'career', isArchive: true,
    desc: 'Designed a serverless email-testing pipeline on AWS: JSON schema definitions in S3, Lambda execution, results in CloudWatch. Engineers added new tests without code changes. Mentored an intern through their first prod deploy.',
    tagline: 'Senior Software Engineer · 2022–2023',
    tech: ['AWS Lambda', 'S3', 'CloudWatch', 'Python', 'IaC'],
    logo: '/images/capitalone-logo.svg',
  },
  {
    id: 'dustbunny', label: 'Dustbunny', color: '#8b5cf6', icon: 'bot', category: 'career', isArchive: true,
    desc: 'Distributed bidding system across 50 Dockerized workers, coordinated through Redis at ~2,500 req/min with 24/7 uptime. Tuned the strategy daily and stayed profitable for 6 months against OpenSea floor bots.',
    tagline: 'NFT Trading Bot · Solo',
    tech: ['Node.js', 'Docker', 'Redis', 'OpenSea SDK', 'Web3.js'],
    logo: '/images/dustbunny.png',
  },
  {
    id: 'oli', label: 'OLI Fitness', color: '#06b6d4', icon: 'camera', category: 'career', isArchive: true,
    desc: 'Real-time weightlifting form analyzer using Kinect: 25 joints at 30fps, scored against expert references. Led a team of 5 to an ACM CHI 2017 extended abstract and startup competitions.',
    tagline: 'Co-founder & Engineer · Startup',
    tech: ['C#', 'Kinect SDK', 'Computer Vision', 'Unity'],
    logo: '/images/oli.png',
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
  launchpad: ['mcp', 'activity'],
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
  launchpad: 'launchpad',
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
  'swipecart': 'launchpad',
};

// Event importance tiers for walk rules
export const IMPORTANT_EVENTS = new Set([
  'blog_generated', 'blog_published', 'orchestrator_summary',
  'error_logged', 'error_reviewed', 'health_alert',
  'self_assessment', 'reactive_trigger',
]);

export const MEDIUM_EVENTS = new Set([
  'assistant_chat', 'knowledge_generated', 'moltbook_post',
  'content_posted',
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
  // Handle prefixed sources like "launchpad:swipecart"
  if (source && source.startsWith('launchpad:')) return 'launchpad';
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
