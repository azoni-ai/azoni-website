// ─── Board starter tasks — REAL work pulled from your GitHub (2026-07-09) ───
//
// Sources: open PRs/issues + active feature branches across the azoni /
// azoni-ai orgs, plus a couple of known roadmap items. Each card links back to
// its issue / PR / branch so it's traceable.
//
// These render ONLY while the live `tasks` collection is empty. In owner mode
// there's an "Import starter tasks" button that copies them into Firestore in
// one click — after that you manage everything on the board and this file is
// no longer shown. Edit freely: it's a plain list, grouped by epic.
//
// projectId → src/data/projects.js id ('_meta' = cross-project/Portfolio).
// agentIds  → AGENTS keys (see src/data/agents.js).
// status    → backlog | in_progress | review | done
// source    → short provenance label; link → GitHub URL (optional).

export const SEED_TASKS = [
  // ── FaB Stats (most active) ──────────────────────────────────────────────
  {
    id: 'seed-fab-gem-import',
    projectId: 'fab-stats',
    title: 'Automated GEM match import (admin-only)',
    description: 'Pull match results automatically instead of manual entry.',
    status: 'review',
    agentIds: ['fabstats'],
    priority: 'high',
    source: 'PR #71',
    link: 'https://github.com/azoni/fab-stats/pull/71',
    order: 1,
    isSeed: true,
  },
  {
    id: 'seed-fab-streaks',
    projectId: 'fab-stats',
    title: 'Cross-event win streaks',
    description: 'Track streaks that span multiple tournaments, not just one event.',
    status: 'in_progress',
    agentIds: ['fabstats'],
    priority: 'med',
    source: 'branch: feat/cross-event-streaks',
    link: 'https://github.com/azoni/fab-stats/tree/feat/cross-event-streaks',
    order: 2,
    isSeed: true,
  },
  {
    id: 'seed-fab-bookmarklet',
    projectId: 'fab-stats',
    title: 'Bookmarklet: player-page support + source tracking',
    description: 'One-click import from player pages; tag where each import came from.',
    status: 'in_progress',
    agentIds: ['fabstats'],
    priority: 'med',
    source: 'branch: feat/bookmarklet-*',
    link: 'https://github.com/azoni/fab-stats/branches',
    order: 3,
    isSeed: true,
  },
  {
    id: 'seed-fab-groups-refactor',
    projectId: 'fab-stats',
    title: 'Refactor groups.ts to write/delete membership',
    description: 'useGroup.ts flagged: the lib needs write/delete support for group membership.',
    status: 'backlog',
    agentIds: ['fabstats'],
    priority: 'low',
    source: 'TODO: src/hooks/useGroup.ts',
    link: 'https://github.com/azoni/fab-stats/blob/main/src/hooks/useGroup.ts',
    order: 4,
    isSeed: true,
  },
  {
    id: 'seed-fab-ci',
    projectId: 'fab-stats',
    title: 'CI + CLAUDE.md setup',
    description: 'Wire up CI and repo agent instructions.',
    status: 'backlog',
    agentIds: ['fabstats'],
    priority: 'low',
    source: 'branch: chore/ci-and-claude-md',
    link: 'https://github.com/azoni/fab-stats/tree/chore/ci-and-claude-md',
    order: 5,
    isSeed: true,
  },

  // ── azoni.ai (this portfolio) ────────────────────────────────────────────
  {
    id: 'seed-board-ship',
    projectId: 'azoni-ai',
    title: 'Ship the Board view',
    description: 'Jira-style kanban unifying projects, agents, and the live activity feed.',
    status: 'in_progress',
    agentIds: ['orchestrator'],
    priority: 'high',
    source: 'repo: azoni-ai/azoni-website',
    link: 'https://github.com/azoni-ai/azoni-website',
    order: 6,
    isSeed: true,
  },
  {
    id: 'seed-home-metrics',
    projectId: 'azoni-ai',
    title: 'Home: live showcase metrics',
    description: 'Surface live stats on the home hero.',
    status: 'in_progress',
    agentIds: ['orchestrator', 'chat'],
    priority: 'med',
    source: 'branch: feat/home-live-showcase-metrics',
    link: 'https://github.com/azoni-ai/azoni-website/tree/feat/home-live-showcase-metrics',
    order: 7,
    isSeed: true,
  },

  // ── Old Ways Today ───────────────────────────────────────────────────────
  {
    id: 'seed-owt-audit',
    projectId: 'old-ways-today',
    title: 'Audit fixes (round 2)',
    description: 'Second pass of audit fixes on the wellness site.',
    status: 'in_progress',
    agentIds: ['oldways'],
    priority: 'med',
    source: 'branch: audit-fixes-2',
    link: 'https://github.com/azoni/oldways-app/tree/audit-fixes-2',
    order: 8,
    isSeed: true,
  },
  {
    id: 'seed-owt-langfuse',
    projectId: 'old-ways-today',
    title: 'Wire LangFuse chat monitoring',
    description: 'Production observability over the RAG chat — traces, cost, latency.',
    status: 'backlog',
    agentIds: ['oldways'],
    priority: 'med',
    source: 'roadmap',
    link: '',
    order: 9,
    isSeed: true,
  },

  // ── Dustbunny (NFT bot — archived, but real open items) ───────────────────
  {
    id: 'seed-dust-massbid',
    projectId: 'dustbunny',
    title: "Mass-bid on a specific owner's collection",
    description: 'Feature request: bid across an owner’s whole collection at once.',
    status: 'backlog',
    agentIds: [],
    priority: 'low',
    source: 'issue #8',
    link: 'https://github.com/azoni/dustbunny/issues/8',
    order: 10,
    isSeed: true,
  },
  {
    id: 'seed-dust-placebid',
    projectId: 'dustbunny',
    title: 'Clean up placeBid logic',
    description: 'Refactor the bidding path.',
    status: 'review',
    agentIds: [],
    priority: 'low',
    source: 'PR #22',
    link: 'https://github.com/azoni/dustbunny/pull/22',
    order: 11,
    isSeed: true,
  },

  // ── Polymarket Edge Finder ───────────────────────────────────────────────
  {
    id: 'seed-poly-paper',
    projectId: 'polymarket-tool',
    title: 'Paper-trading harness',
    description: 'Replay strategy signals against live markets, no real capital (paper-first).',
    status: 'backlog',
    agentIds: [],
    priority: 'med',
    source: 'roadmap',
    link: '',
    order: 12,
    isSeed: true,
  },

  // ── Portfolio / cross-project ────────────────────────────────────────────
  {
    id: 'seed-launchpad-polish',
    projectId: '_meta',
    title: 'Launchpad: demo polish + persistent notes',
    description: 'Readability, flow/QoL, and persistent notes across the launched apps.',
    status: 'review',
    agentIds: ['orchestrator'],
    priority: 'low',
    source: 'PR #2 (launchpad)',
    link: 'https://github.com/azoni/launchpad/pull/2',
    order: 13,
    isSeed: true,
  },
];

// Payload for one-click import into Firestore (drops display-only fields).
// seedId gives the server a deterministic doc id, so re-running the import
// after a mid-way failure overwrites instead of duplicating.
export const seedToTaskPayload = (t) => ({
  title: t.title,
  description: t.description || '',
  projectId: t.projectId || '_meta',
  status: t.status || 'backlog',
  agentIds: t.agentIds || [],
  priority: t.priority || null,
  visibility: 'public',
  source: t.source || '',
  link: t.link || '',
  seedId: t.id,
});
