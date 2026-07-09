// ─── Board status derivation (built on station-mapping) ───
// Reverse-maps stations → projects to give each epic its agents, activity
// sources, and repos, then derives an auto phase from git/activity recency.

import {
  SOURCE_TO_STATION,
  REPO_TO_STATION,
  STATION_TO_PROJECT,
  STATION_DEFS,
  mapSourceToStation,
} from './station-mapping';
import { projects } from '../data/projects';

const DAY = 86400000;

// station id → [agent keys]
const STATION_TO_AGENTS = STATION_DEFS.reduce((acc, def) => {
  const agents = [];
  if (def.agent) agents.push(def.agent);
  if (def.secondAgent) agents.push(def.secondAgent);
  if (agents.length) acc[def.id] = agents;
  return acc;
}, {});

const pushUnique = (map, key, value) => {
  if (!map[key]) map[key] = [];
  if (!map[key].includes(value)) map[key].push(value);
};

// project id → [agent keys] (assignee defaults for an epic)
export const PROJECT_TO_AGENTS = (() => {
  const map = {};
  Object.entries(STATION_TO_PROJECT).forEach(([station, projectId]) => {
    (STATION_TO_AGENTS[station] || []).forEach((a) => pushUnique(map, projectId, a));
  });
  return map;
})();

// project id → [activity source strings]
export const PROJECT_TO_SOURCES = (() => {
  const map = {};
  Object.entries(SOURCE_TO_STATION).forEach(([source, station]) => {
    const projectId = STATION_TO_PROJECT[station];
    if (projectId) pushUnique(map, projectId, source);
  });
  return map;
})();

// project id → [repo names]
export const PROJECT_TO_REPOS = (() => {
  const map = {};
  Object.entries(REPO_TO_STATION).forEach(([repo, station]) => {
    const projectId = STATION_TO_PROJECT[station];
    if (projectId) pushUnique(map, projectId, repo);
  });
  return map;
})();

export const PHASE_META = {
  active: { label: 'Active', color: '#4ade80' },
  live: { label: 'Live', color: '#60a5fa' },
  maintained: { label: 'Maintained', color: '#d9a05b' },
  idle: { label: 'Idle', color: '#6f675c' },
};

export const BOARD_COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'In Review' },
  { id: 'done', label: 'Done' },
];

const commitBelongsToProject = (commit, projectId) => {
  if (PROJECT_TO_REPOS[projectId]?.includes(commit.repo)) return true;
  const station = REPO_TO_STATION[commit.repo];
  return !!(station && STATION_TO_PROJECT[station] === projectId);
};

const activityBelongsToProject = (item, projectId) => {
  const station = mapSourceToStation(item.source, item.type);
  return !!(station && STATION_TO_PROJECT[station] === projectId);
};

const activityMs = (item) => {
  const ts = item.timestamp;
  if (!ts) return 0;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  const t = new Date(ts).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// Most recent commit time (ms) across a project's repos, or 0.
function latestCommitMs(projectId, githubStats) {
  let latest = 0;
  for (const c of githubStats?.recentCommits || []) {
    if (!commitBelongsToProject(c, projectId)) continue;
    const t = new Date(c.timestamp).getTime();
    if (!Number.isNaN(t) && t > latest) latest = t;
  }
  return latest;
}

function latestActivityMs(projectId, activityItems) {
  let latest = 0;
  for (const a of activityItems || []) {
    if (!activityBelongsToProject(a, projectId)) continue;
    const t = activityMs(a);
    if (t > latest) latest = t;
  }
  return latest;
}

/**
 * Auto-derive an epic's phase from git + activity recency.
 * A manual override in phaseOverrides always wins.
 */
export function deriveEpicPhase(projectId, githubStats, activityItems, phaseOverrides = {}) {
  if (phaseOverrides && phaseOverrides[projectId]) return phaseOverrides[projectId];

  const now = Date.now();
  const commitT = latestCommitMs(projectId, githubStats);
  const activityT = latestActivityMs(projectId, activityItems);
  const recent = Math.max(commitT, activityT);
  const hasLive = !!projects.find((p) => p.id === projectId)?.links?.live;

  if (recent && now - recent < 14 * DAY) return 'active';
  if (activityT && now - activityT < 7 * DAY) return 'active';
  if (hasLive) {
    if (recent && now - recent < 30 * DAY) return 'active';
    return 'live';
  }
  if (recent) return 'maintained';
  return 'idle';
}

// Header badge counts for the last 7 days.
export function epicActivityCounts(projectId, githubStats, activityItems) {
  const weekAgo = Date.now() - 7 * DAY;
  const commits = (githubStats?.recentCommits || []).filter(
    (c) => commitBelongsToProject(c, projectId) && new Date(c.timestamp).getTime() >= weekAgo
  ).length;
  const actions = (activityItems || []).filter(
    (a) => activityBelongsToProject(a, projectId) && activityMs(a) >= weekAgo
  ).length;
  return { commits, actions };
}
