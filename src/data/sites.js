// ─── Canonical site registry ───
//
// ONE source of truth for every site/app in the ecosystem, consumed by both
// the React UI and Netlify functions (esbuild bundles this into each function
// that requires it). The leaderboard roster, the /hub mission-control page,
// and the content-cadence tracker all derive from here.
//
// Field notes:
// - visitKey:        `source` the site's beacon POSTs to /log-visit (null = no beacon,
//                    excluded from the leaderboard).
// - activitySources: `source` values this site uses on the agent_activity bus.
//                    'launchpad:<id>' prefixed sources are matched automatically
//                    for launchpad apps.
// - costSources:     keys into home-summary's cost bySource map (empty = costs
//                    tracked on the second bus (azoni-mcp/benchonly project) or
//                    not at all — the hub shows "—").
// - contentTypes:    agent_activity types that count as published content, per
//                    channel. For the canonical 'content_posted' type the
//                    channel is read from event metadata.channel instead.
// - cadence:         target days between posts per channel; missing/null
//                    channel = untracked (no staleness chip).
// - compose:         deep link into the site's OWN composer/admin — the hub
//                    tracks and links, it never posts.
// - health:          how the owner "check health" action probes the site.
//                    null = static hosting, no meaningful backend to probe.
// - boardProjectId:  projects.js id — joins /board tasks + project pages.
// - stationId:       crosswalk into station-mapping.js STATION_DEFS.

export const SITES = [
  // ── Flagship ──────────────────────────────────────────────────────────────
  {
    id: 'azoni',
    name: 'azoni.ai',
    url: 'https://azoni.ai',
    icon: '/images/azoni.png',
    color: '#60a5fa',
    group: 'flagship',
    category: 'app',
    repos: ['azoni-website', 'azoni-portfolio'],
    stationId: 'chatbot',
    boardProjectId: 'azoni-ai',
    visitKey: 'azoni',
    activitySources: ['azoni', 'azoni-ai', 'orchestrator', 'daily-blog', 'moltbook-agent', 'admin'],
    costSources: ['orchestrator', 'daily-blog', 'azoni-ai', 'azoni', 'moltbook-agent'],
    contentTypes: {
      blog: ['blog_published'],
      social: ['moltbook_post', 'content_posted'],
    },
    cadence: { blog: 1, social: 2 },
    compose: { url: '/admin', label: 'Blog editor' },
    health: { kind: 'http', url: 'https://azoni.ai/.netlify/functions/home-summary' },
  },
  {
    id: 'benchpressonly',
    name: 'Bench Only',
    url: 'https://benchpressonly.com',
    icon: '/images/benchpressonly.svg',
    color: '#4ade80',
    group: 'flagship',
    category: 'app',
    repos: ['benchpressonly', 'benchonly'],
    stationId: 'benchpress',
    boardProjectId: 'bench-only',
    visitKey: 'benchpressonly',
    activitySources: ['benchpressonly'],
    costSources: ['benchpressonly'],
    contentTypes: {},
    cadence: {},
    compose: null,
    health: { kind: 'http', url: 'https://benchpressonly.com' },
  },
  {
    id: 'rowcrew',
    name: 'RowCrew',
    url: 'https://rowcrew.netlify.app',
    icon: '/images/rowing-favicon.svg',
    color: '#34d399',
    group: 'flagship',
    category: 'app',
    repos: ['rowing-tracker', 'row-crew'],
    stationId: 'rowcrew',
    boardProjectId: 'row-crew',
    visitKey: 'rowcrew',
    activitySources: ['rowcrew'],
    costSources: ['rowcrew'],
    contentTypes: {},
    cadence: {},
    compose: null,
    health: { kind: 'http', url: 'https://rowcrew.netlify.app' },
  },
  {
    id: 'oldwaystoday',
    name: 'Old Ways Today',
    url: 'https://oldwaystoday.com',
    icon: '/images/oldways.png',
    color: '#d97706',
    group: 'flagship',
    category: 'app',
    repos: ['oldways-app', 'old-ways-today', 'oldwaystoday-backend'],
    stationId: 'oldwaystoday',
    boardProjectId: 'old-ways-today',
    visitKey: 'oldwaystoday',
    activitySources: ['oldwaystoday', 'old-ways-today'],
    costSources: ['oldwaystoday', 'old-ways-today'],
    contentTypes: {
      social: ['owt_social_post', 'content_posted'],
      blog: ['owt_blog'],
    },
    cadence: { social: 1, blog: 3 },
    compose: { url: 'https://oldwaystoday.com/admin', label: 'Daily Post composer' },
    health: { kind: 'mcp', path: '/oldwaystoday/health' },
  },
  {
    id: 'fabstats',
    name: 'FaB Stats',
    url: 'https://www.fabstats.net',
    icon: '/images/fabstats-icon.svg',
    color: '#ef4444',
    group: 'flagship',
    category: 'app',
    repos: ['fab-stats', 'fab-stats-bot'],
    stationId: 'fab',
    boardProjectId: 'fab-stats',
    visitKey: 'fabstats',
    activitySources: ['fabstats', 'fab-stats', 'fab-stats-bot', 'discord-bot'],
    costSources: [],
    contentTypes: {
      social: ['content_posted'],
    },
    cadence: { social: 7 },
    compose: null, // TODO(owner): admin URL for the tweet-thread generator
    health: { kind: 'http', url: 'https://www.fabstats.net' },
  },
  {
    id: 'embedroute',
    name: 'EmbedRoute',
    url: 'https://www.embedroute.com',
    icon: '/images/embedroute-icon.svg',
    color: '#20d9d2',
    group: 'flagship',
    category: 'data',
    repos: ['embedroute'],
    stationId: 'embedroute',
    boardProjectId: 'embedroute',
    visitKey: 'embedroute',
    activitySources: ['embedroute', 'embed-route'],
    costSources: ['embedroute'],
    contentTypes: {},
    cadence: {},
    compose: null,
    health: { kind: 'http', url: 'https://www.embedroute.com' },
  },

  // ── Launchpad apps ────────────────────────────────────────────────────────
  // Icons resolve to /images/launchpad/<id>.svg (copied from each app's repo).
  ...[
    { id: 'meeplematch', name: 'MeepleMatch', url: 'https://meeplematch.netlify.app', color: '#f472b6' },
    { id: 'blackdiamond', name: 'Black Diamond', url: 'https://blackdiamond-alpine-wash.netlify.app', color: '#38bdf8' },
    { id: 'benchmark', name: 'Benchmark', url: 'https://benchmark-app-azoni.netlify.app', color: '#facc15' },
    { id: 'repmatch', name: 'RepMatch', url: 'https://repmatch-app.netlify.app', color: '#a3e635' },
    { id: 'crypto-tax-2025', name: 'Crypto Tax', url: 'https://crypto-tax-2025.netlify.app', color: '#fb923c' },
    { id: 'pyroguard', name: 'PyroGuard', url: 'https://pyroguard-demo.netlify.app', color: '#f87171' },
    { id: 'dayrun', name: 'Daily', url: 'https://dayrun-app.netlify.app', color: '#818cf8' },
    {
      id: 'macromarket',
      name: 'MacroMarket',
      url: 'https://macromarket-app.netlify.app',
      color: '#2dd4bf',
      contentTypes: { social: ['content_posted'] },
      cadence: { social: 1 },
      compose: { url: 'https://macromarket-app.netlify.app/admin', label: 'Social composer' },
    },
  ].map((s) => ({
    icon: `/images/launchpad/${s.id}.svg`,
    group: 'launchpad',
    category: 'app',
    repos: ['launchpad'],
    stationId: 'launchpad',
    boardProjectId: s.id,
    visitKey: s.id,
    activitySources: [s.id, `launchpad:${s.id}`],
    costSources: [], // launchpad LLM costs log to the second bus (azoni-mcp)
    contentTypes: {},
    cadence: {},
    compose: null,
    health: null, // static Netlify hosting
    ...s,
  })),

  // ── Infra / agents (no visit beacon — not on the leaderboard) ────────────
  {
    id: 'spellbrigade',
    name: 'Spell Brigade',
    url: 'https://azoni.ai/game',
    icon: '/images/spell.svg',
    color: '#c084fc',
    group: 'infra',
    category: 'app',
    repos: ['spell-brigade'],
    stationId: 'spellbrigade',
    boardProjectId: 'spell-brigade',
    visitKey: null,
    activitySources: ['spell-brigade'],
    costSources: ['spell-brigade'],
    contentTypes: {},
    cadence: {},
    compose: null,
    health: { kind: 'mcp', path: '/spellbrigade/status' },
  },
  {
    id: 'launchpad',
    name: 'Launchpad Console',
    url: 'https://launchpad-console.netlify.app',
    icon: '/images/launchpad-rocket.svg',
    color: '#FF6B35',
    group: 'infra',
    category: 'data',
    repos: ['launchpad'],
    stationId: 'launchpad',
    boardProjectId: 'launchpad',
    visitKey: null,
    activitySources: ['launchpad'],
    costSources: ['launchpad'],
    contentTypes: {},
    cadence: {},
    compose: null,
    health: null,
  },
  {
    id: 'mcp',
    name: 'MCP Server',
    url: 'https://azoni-mcp.onrender.com',
    icon: '/images/mcp-logo-nodes.svg',
    color: '#ff7a5c',
    group: 'infra',
    category: 'data',
    repos: ['azoni-mcp'],
    stationId: 'mcp',
    boardProjectId: 'azoni-mcp',
    visitKey: null,
    activitySources: ['mcp-server', 'azoni-mcp'],
    costSources: ['medic'],
    contentTypes: {},
    cadence: {},
    compose: null,
    health: { kind: 'http', url: 'https://azoni-mcp.onrender.com/health' },
  },
];

export const siteById = (id) => SITES.find((s) => s.id === id) || null;

// Every agent_activity type that counts as published content (for the
// hub-summary calendar query). Kept well under Firestore's 30-value `in` cap.
export const ALL_CONTENT_TYPES = [
  ...new Set(
    SITES.flatMap((s) => Object.values(s.contentTypes || {}).flat())
  ),
];

// activity `source` → site id (launchpad: prefixes included).
export const SOURCE_TO_SITE = SITES.reduce((acc, s) => {
  (s.activitySources || []).forEach((src) => {
    if (!(src in acc)) acc[src] = s.id;
  });
  return acc;
}, {});

// Resolve which channel a content event belongs to for a given site.
// 'content_posted' carries its channel in metadata; legacy types are looked
// up in the site's contentTypes lists.
export function resolveContentChannel(site, type, metadataChannel) {
  if (type === 'content_posted') {
    return metadataChannel === 'blog' ? 'blog' : 'social';
  }
  for (const [channel, types] of Object.entries(site.contentTypes || {})) {
    if (types.includes(type)) return channel;
  }
  return null;
}

// ── Leaderboard rosters (derived; field order matches the original literals
//    in netlify/functions/leaderboard.js so the cached JSON stays identical) ──
export const BEACON_SITES = SITES.filter((s) => s.group === 'flagship' && s.visitKey).map(
  (s) => ({ key: s.visitKey, label: s.name, url: s.url, icon: s.icon, color: s.color })
);

export const LAUNCHPAD_SITES = SITES.filter((s) => s.group === 'launchpad' && s.visitKey).map(
  (s) => ({ key: s.visitKey, label: s.name, url: s.url, color: s.color, icon: s.icon, group: 'launchpad' })
);
