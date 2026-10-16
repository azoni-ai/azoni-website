const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPublicStats, isPublicIndependentRepository, STATS_SCOPE } = require('../netlify/functions/lib/public-github');
const { handler } = require('../netlify/functions/github-stats');

const now = new Date('2026-10-16T18:00:00Z');
const sha = (number) => number.toString(16).padStart(40, '0');
const commit = (number, date = now.toISOString(), message = 'Public change') => ({
  oid: sha(number), message, committedDate: date, author: { user: { login: 'azoni' } },
});
const repository = (overrides = {}) => ({
  name: 'rowing-tracker', nameWithOwner: 'azoni/rowing-tracker', owner: { login: 'azoni' },
  isPrivate: false, pushedAt: now.toISOString(), defaultBranchRef: { name: 'main', target: { history: { nodes: [commit(1)] } } },
  ...overrides,
});
const push = (overrides = {}) => ({
  type: 'PushEvent', public: true, repo: { name: 'azoni/rowing-tracker' }, created_at: now.toISOString(),
  payload: { ref: 'refs/heads/feature', commits: [{ sha: sha(2), message: 'Public branch change' }] },
  ...overrides,
});

test('private, missing visibility flags, and unlisted collaborator repositories fail closed', () => {
  for (const repo of [repository({ isPrivate: true }), repository({ isPrivate: undefined }),
    repository({ owner: { login: 'unlisted-org' }, nameWithOwner: 'unlisted-org/rowing-tracker' }),
    repository({ name: 'unlisted-project', nameWithOwner: 'azoni/unlisted-project' }),
    repository({ visibility: 'PRIVATE' })]) {
    assert.equal(isPublicIndependentRepository(repo), false);
    assert.deepEqual(buildPublicStats({ repositories: [repo], now }).recentCommits, []);
  }
});

test('a spoofed full-name field does not override the repository owner', () => {
  const repo = repository({ owner: { login: 'unlisted-org' } });
  assert.equal(isPublicIndependentRepository(repo), false);
});

test('private and unlisted data cannot enter names, messages, or aggregate counts', () => {
  const privateRepo = repository({ isPrivate: true, defaultBranchRef: { target: { history: { nodes: [commit(3, undefined, 'PRIVATE_SENTINEL')] } } } });
  const otherRepo = repository({ name: 'unlisted-project', nameWithOwner: 'azoni/unlisted-project', defaultBranchRef: { target: { history: { nodes: [commit(4, undefined, 'UNLISTED_SENTINEL')] } } } });
  const stats = buildPublicStats({ repositories: [repository(), privateRepo, otherRepo], now });
  assert.equal(stats.today, 1);
  assert.equal(stats.commitSplit.sampleSize, 1);
  assert.equal(stats.repos.length, 1);
  assert.doesNotMatch(JSON.stringify(stats), /PRIVATE_SENTINEL|UNLISTED_SENTINEL|unlisted-project/);
});

test('push events require explicit public status and currently verified repository visibility', () => {
  for (const event of [push({ public: false }), push({ public: undefined }), push({ repo: { name: 'unlisted-org/rowing-tracker' } })]) {
    const stats = buildPublicStats({ repositories: [repository()], events: [event], now });
    assert.equal(stats.recentCommits.length, 1);
  }
  assert.equal(buildPublicStats({ repositories: [repository({ isPrivate: true })], events: [push()], now }).recentCommits.length, 0);
  assert.equal(buildPublicStats({ repositories: [], events: [push()], now }).recentCommits.length, 0);
});

test('verified public branch events are included without double-counting default-branch commits', () => {
  const repeated = push({ payload: { commits: [{ sha: sha(1), message: 'Repeated public commit' }] } });
  const stats = buildPublicStats({ repositories: [repository()], events: [push(), repeated], now });
  assert.equal(stats.recentCommits.length, 2);
  assert.equal(stats.today, 2);
  assert.equal(stats.recentCommits.find((item) => item.fullSha === sha(2)).branch, 'feature');
});

test('a later push preserves the actual commit date already returned by GitHub', () => {
  const earlier = commit(2, '2026-10-01T12:00:00Z');
  const repo = repository({ defaultBranchRef: { target: { history: { nodes: [earlier] } } } });
  const stats = buildPublicStats({ repositories: [repo], events: [push()], now });
  assert.equal(stats.today, 0);
  assert.equal(Date.parse(stats.recentCommits[0].timestamp), Date.parse(earlier.committedDate));
});

test('sample totals use Pacific calendar days and exact inclusive 7/30-day windows', () => {
  const dates = ['2026-10-16T18:00:00Z', '2026-10-16T06:59:00Z', '2026-10-10T07:00:00Z',
    '2026-10-09T23:00:00Z', '2026-09-17T07:00:00Z', '2026-09-16T20:00:00Z', '2025-12-01T12:00:00Z'];
  const repo = repository({ defaultBranchRef: { target: { history: { nodes: dates.map((date, i) => commit(i + 10, date)) } } } });
  const stats = buildPublicStats({ repositories: [repo], now });
  assert.equal(stats.today, 1);
  assert.equal(stats.last7Days, 3);
  assert.equal(stats.last30Days, 5);
  assert.equal(stats.thisMonth, 4);
  assert.equal(stats.thisYear, 6);
  assert.equal(stats.countsAreSample, true);
  assert.equal(stats.statsScope, STATS_SCOPE);
});

test('future commits, invalid dates, and invalid hashes never affect counts', () => {
  const nodes = [commit(1), commit(2, '2030-01-01T00:00:00Z'), commit(3, 'invalid'), { ...commit(4), oid: 'not-a-sha' }];
  const repo = repository({ defaultBranchRef: { target: { history: { nodes } } } });
  assert.equal(buildPublicStats({ repositories: [repo], now }).recentCommits.length, 1);
});

test('public feed sample counts and agent splits are bounded by the returned 300 commits', () => {
  const nodes = Array.from({ length: 350 }, (_, i) => commit(i + 1, now.toISOString(), i % 2 ? 'Public update\nCo-authored-by: Codex <noreply@openai.com>' : 'Public update'));
  const repo = repository({ defaultBranchRef: { target: { history: { nodes } } } });
  const stats = buildPublicStats({ repositories: [repo], now });
  assert.equal(stats.recentCommits.length, 300);
  assert.equal(stats.today, 300);
  assert.equal(stats.thisYear, 300);
  assert.equal(stats.commitSplit.sampleSize, 300);
  assert.equal(stats.commitSplit.untagged + stats.commitSplit.codexCode + stats.commitSplit.claudeCode + stats.commitSplit.both, 300);
});

test('missing credentials return unavailable instead of fabricated zero totals', async () => {
  const original = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try {
    const response = await handler({ httpMethod: 'GET' });
    assert.equal(response.statusCode, 503);
    assert.equal(response.headers['Cache-Control'], 'no-store');
    assert.equal(JSON.parse(response.body).today, undefined);
  } finally { if (original === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = original; }
});

test('endpoint queries only reviewed exact repositories and ignores injected unrelated response data', async (t) => {
  const original = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'test-only-placeholder';
  t.mock.method(global, 'fetch', async (url, options) => {
    if (url.endsWith('/graphql')) {
      const query = JSON.parse(options.body).query;
      if (query.includes('contributionsCollection')) {
        assert.doesNotMatch(query, /repository\(|repositoriesContributedTo|ownerAffiliations|nameWithOwner/);
        return { ok: true, json: async () => ({ data: { user: null } }) };
      }
      assert.match(query, /repository\(owner: "azoni", name: "rowing-tracker"\)/);
      assert.doesNotMatch(query, /repositoriesContributedTo|contributionsCollection|ownerAffiliations/);
      const currentPublicRepo = repository({ defaultBranchRef: { target: { history: { nodes: [commit(1, new Date(Date.now() - 60000).toISOString())] } } } });
      return { ok: true, json: async () => ({ data: { repo0: currentPublicRepo, injected: repository({ isPrivate: true }) } }) };
    }
    assert.match(url, /\/events\/public\?/);
    return { ok: true, json: async () => [push({ public: false })] };
  });
  try {
    const result = await handler({ httpMethod: 'GET' });
    const data = JSON.parse(result.body);
    assert.equal(result.statusCode, 200);
    assert.equal(data.recentCommits.length, 1);
    assert.equal(data.recentCommits[0].isPrivate, false);
    assert.equal(data.totalsAvailable, false);
    assert.equal(data.thisYear, null);
  } finally { if (original === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = original; }
});

test('metadata failures return a generic uncached error without upstream repository details', async (t) => {
  const original = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'test-only-placeholder';
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ errors: [{ message: 'PRIVATE_SENTINEL' }] }) }));
  try {
    const result = await handler({ httpMethod: 'GET' });
    assert.equal(result.statusCode, 502);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.doesNotMatch(result.body, /PRIVATE_SENTINEL/);
  } finally { if (original === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = original; }
});
