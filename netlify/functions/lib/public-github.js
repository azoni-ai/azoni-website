const policy = require('../../../src/data/publicWritingPolicy.json');
const { getRepositoryFullName: repositoryFullName, isPublicIndependentRepository } = require('./public-writing-policy');

const PUBLIC_REPOSITORIES = new Set((policy.publicRepositoryFullNames || []).map((name) => name.toLowerCase()));
const SAMPLE_LIMIT = 300;
const HISTORY_PER_REPO = 30;
const STATS_SCOPE = 'public-independent-sample';

function agentTags(commit) {
  const text = [commit.message, commit.author?.name, commit.author?.email, commit.author?.user?.login,
    commit.committer?.name, commit.committer?.email, commit.committer?.user?.login].filter(Boolean).join('\n');
  return {
    claudeCode: /co-authored-by:.*claude|noreply@anthropic\.com|\bclaude code\b/i.test(text),
    codexCode: /co-authored-by:.*codex|co-authored-by:.*openai|noreply@openai\.com|\bcodex(?:\s*cli|\s*code)?\b/i.test(text),
  };
}

const dayKey = (date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(date));

function buildPublicStats({ repositories = [], events = [], now = new Date() } = {}) {
  const verifiedRepos = new Map();
  const commits = new Map();
  const nowMs = new Date(now).getTime();

  const addCommit = (repo, commit, timestamp, branch) => {
    const fullSha = commit.oid || commit.sha;
    const timestampMs = new Date(timestamp).getTime();
    if (!/^[a-f0-9]{7,40}$/i.test(fullSha || '') || !Number.isFinite(timestampMs) || timestampMs > nowMs) return;
    const tags = agentTags(commit);
    const authorLogin = commit.author?.user?.login;
    if (authorLogin && authorLogin.toLowerCase() !== 'azoni' && !tags.claudeCode && !tags.codexCode) return;
    const fullName = repositoryFullName(repo);
    const key = `${fullName}:${fullSha}`;
    if (commits.has(key)) return; // Keep the actual committed date from GraphQL over a later push event.
    const [owner, name] = fullName.split('/');
    commits.set(key, {
      message: String(commit.message || '').split('\n')[0],
      sha: fullSha.slice(0, 7), fullSha, repo: name, owner, isPrivate: false,
      repoUrl: `https://github.com/${fullName}`,
      url: `https://github.com/${fullName}/commit/${fullSha}`,
      timestamp: new Date(timestampMs).toISOString(),
      branch: branch || 'main', ...tags,
    });
  };

  for (const repo of repositories) {
    if (!isPublicIndependentRepository(repo)) continue;
    const fullName = repositoryFullName(repo);
    verifiedRepos.set(fullName, repo);
    for (const commit of repo.defaultBranchRef?.target?.history?.nodes || []) {
      addCommit(repo, commit, commit.committedDate, repo.defaultBranchRef?.name);
    }
  }

  for (const event of events) {
    if (event.type !== 'PushEvent' || event.public !== true) continue;
    const repo = verifiedRepos.get(String(event.repo?.name || '').toLowerCase());
    if (!repo) continue;
    const branch = String(event.payload?.ref || '').replace(/^refs\/heads\//, '');
    for (const commit of event.payload?.commits || []) {
      addCommit(repo, commit, commit.timestamp || event.created_at, branch);
    }
  }

  const recentCommits = [...commits.values()]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, SAMPLE_LIMIT);
  const today = dayKey(now);
  const offsetDay = (days) => new Date(Date.parse(`${today}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);
  const days = recentCommits.map((commit) => dayKey(commit.timestamp));
  const countSince = (start) => days.filter((day) => day >= start && day <= today).length;
  const commitSplit = { sampleSize: recentCommits.length, claudeCode: 0, codexCode: 0, solo: 0 };
  for (const commit of recentCommits) {
    commitSplit[commit.claudeCode ? 'claudeCode' : commit.codexCode ? 'codexCode' : 'solo'] += 1;
  }
  const activeNames = new Set(recentCommits.map((commit) => `${commit.owner}/${commit.repo}`));
  const repos = [...verifiedRepos.entries()].filter(([name]) => activeNames.has(name)).map(([fullName, repo]) => {
    const [owner, name] = fullName.split('/');
    return { name, owner, url: `https://github.com/${fullName}`, isPrivate: false, pushedAt: repo.pushedAt || null };
  }).sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0));

  return {
    today: countSince(today), last7Days: countSince(offsetDay(6)), last30Days: countSince(offsetDay(29)),
    thisMonth: countSince(`${today.slice(0, 7)}-01`), thisYear: countSince(`${today.slice(0, 4)}-01-01`),
    commitSplit, recentCommits, repos, updatedAt: new Date(now).toISOString(),
    statsScope: STATS_SCOPE, countsAreSample: true, sampleLimit: SAMPLE_LIMIT, historyPerRepo: HISTORY_PER_REPO,
  };
}

module.exports = { PUBLIC_REPOSITORIES, HISTORY_PER_REPO, SAMPLE_LIMIT, STATS_SCOPE,
  repositoryFullName, isPublicIndependentRepository, buildPublicStats };
