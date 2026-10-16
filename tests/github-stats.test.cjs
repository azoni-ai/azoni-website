const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const contributions = require('../netlify/functions/lib/github-contributions');
const publicGithub = require('../netlify/functions/lib/public-github');

const NOW = new Date('2026-10-16T18:00:00Z');
const sha = value => value.toString(16).padStart(40, '0');
const commit = (value, message = 'Public update') => ({
  oid: sha(value), message, committedDate: '2026-10-16T12:00:00Z', author: { user: { login: 'azoni' } },
});
const repository = (nodes = [commit(1)], overrides = {}) => ({
  name: 'rowing-tracker', nameWithOwner: 'azoni/rowing-tracker', owner: { login: 'azoni' }, isPrivate: false,
  defaultBranchRef: { name: 'main', target: { history: { nodes } } }, ...overrides,
});
function aggregatePayload({ now = NOW, count = 25 } = {}) {
  const { statsDate, ranges } = contributions.getContributionRanges(now);
  const user = {};
  for (const range of ranges) {
    const contributionDays = [];
    const end = range.name === 'year' ? statsDate : range.to.slice(0, 10);
    for (let day = Date.parse(range.from); day <= Date.parse(`${end}T00:00:00Z`); day += 86400000) {
      contributionDays.push({ date: new Date(day).toISOString().slice(0, 10), contributionCount: count });
    }
    user[range.name] = { contributionCalendar: { weeks: [{ contributionDays }] } };
  }
  return { data: { user } };
}
function loadHandler({ now = NOW, token = 'test-only-token', aggregate = aggregatePayload({ now }),
  feed = { data: { repo0: repository() } }, events = [] } = {}) {
  const requests = [];
  const module = { exports: {} };
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
    static now() { return now.getTime(); }
  }
  const fetch = async (url, options = {}) => {
    const query = options.body ? JSON.parse(options.body).query : null;
    requests.push({ url, query, headers: options.headers });
    let payload;
    if (url === 'https://api.github.com/graphql') payload = query.includes('contributionsCollection') ? aggregate : feed;
    else if (url === 'https://api.github.com/users/azoni/events/public?per_page=100') payload = events;
    else throw new Error(`Unexpected network URL: ${url}`);
    if (payload instanceof Error) throw payload;
    return { ok: true, json: async () => payload };
  };
  const sandbox = {
    module, exports: module.exports, fetch, Date: FixedDate, AbortSignal,
    process: { env: token ? { GITHUB_TOKEN: token } : {} },
    require: name => {
      if (name === './lib/public-github') return publicGithub;
      if (name === './lib/github-contributions') return contributions;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../netlify/functions/github-stats.js'), 'utf8'), sandbox);
  return { handler: module.exports.handler, requests };
}

test('full-year contribution totals remain independent from a capped public commit sample', async () => {
  const loaded = loadHandler({ feed: { data: { repo0: repository(Array.from({ length: 350 }, (_, i) => commit(i + 1))) } } });
  const response = await loaded.handler({ httpMethod: 'GET' });
  const result = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(result.thisYear, 7225);
  assert.equal(result.thisMonth, 400);
  assert.equal(result.last30Days, 750);
  assert.equal(result.today, 25);
  assert.equal(result.recentCommits.length, 300);
  assert.equal(result.commitSplit.sampleSize, 300);
  assert.equal(result.totalsAvailable, true);
  assert.equal(result.feedAvailable, true);
  assert.equal(result.countsAreSample, false);
  assert.equal(result.metric, 'contributions');
  assert.equal(result.statsScope, 'github-contributions-with-public-feed');
  assert.equal(result.feedScope, 'public-independent-sample');
  const aggregateQuery = loaded.requests.find(request => request.query?.includes('contributionsCollection')).query;
  assert.doesNotMatch(aggregateQuery, /repository\(|repositoriesContributedTo|commitContributionsByRepository|message|nameWithOwner/);
  const feedQuery = loaded.requests.find(request => request.query?.includes('repository(')).query;
  assert.doesNotMatch(feedQuery, /ownerAffiliations|repositoriesContributedTo|user\(/);
  assert.ok(loaded.requests.filter(request => request.url.endsWith('/graphql')).length === 2);
});

test('missing credentials are unavailable instead of a convincing zero and make no requests', async () => {
  const loaded = loadHandler({ token: null });
  const response = await loaded.handler({ httpMethod: 'GET' });
  assert.equal(response.statusCode, 503);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(loaded.requests.length, 0);
  assert.doesNotMatch(response.body, /"today"|test-only-token/);
});

test('failed or partially errored aggregate queries do not reuse public sample counts as totals', async () => {
  for (const aggregate of [new Error('PRIVATE_FAILURE'), { ...aggregatePayload(), errors: [{ message: 'PRIVATE_FAILURE' }] }]) {
    const { handler } = loadHandler({ aggregate });
    const response = await handler({ httpMethod: 'GET' });
    const result = JSON.parse(response.body);
    assert.equal(response.statusCode, 200);
    assert.equal(result.totalsAvailable, false);
    assert.equal(result.feedAvailable, true);
    assert.equal(result.recentCommits.length, 1);
    for (const field of ['today', 'last7Days', 'last30Days', 'thisMonth', 'thisYear']) assert.equal(result[field], null);
    assert.doesNotMatch(response.body, /PRIVATE_FAILURE/);
  }
});

test('aggregate success survives unavailable repository metadata and cannot trust unverified public events', async () => {
  const { handler } = loadHandler({ feed: new Error('PRIVATE_METADATA'), events: [{
    type: 'PushEvent', public: true, repo: { name: 'azoni/rowing-tracker' }, created_at: NOW.toISOString(),
    payload: { commits: [{ sha: sha(2), message: 'UNVERIFIED_EVENT' }] },
  }] });
  const response = await handler({ httpMethod: 'GET' });
  const result = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(result.thisYear, 7225);
  assert.equal(result.feedAvailable, false);
  assert.deepEqual(result.recentCommits, []);
  assert.deepEqual(result.repos, []);
  assert.doesNotMatch(response.body, /PRIVATE_METADATA|UNVERIFIED_EVENT/);
});

test('failure of both independent sources returns a generic uncached error', async () => {
  const { handler } = loadHandler({ aggregate: new Error('PRIVATE_AGGREGATE'), feed: { errors: [{ message: 'PRIVATE_REPO' }] } });
  const response = await handler({ httpMethod: 'GET' });
  assert.equal(response.statusCode, 502);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.doesNotMatch(response.body, /PRIVATE_|test-only-token/);
});

test('events failure does not discard valid contribution totals or verified default-branch history', async () => {
  const { handler } = loadHandler({ events: new Error('Events unavailable') });
  const response = await handler({ httpMethod: 'GET' });
  const result = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(result.thisYear, 7225);
  assert.equal(result.recentCommits.length, 1);
});

test('January requires both calendar ranges even if year-to-date data is present', async () => {
  const now = new Date('2027-01-01T20:00:00Z');
  const complete = aggregatePayload({ now, count: 2 });
  const loaded = loadHandler({ now, aggregate: complete });
  const result = JSON.parse((await loaded.handler({ httpMethod: 'GET' })).body);
  assert.equal(result.last30Days, 60);
  assert.equal(result.thisYear, 2);
  assert.match(loaded.requests.find(request => request.query?.includes('contributionsCollection')).query, /previous: contributionsCollection/);
  delete complete.data.user.previous;
  const incomplete = JSON.parse((await loadHandler({ now, aggregate: complete }).handler({ httpMethod: 'GET' })).body);
  assert.equal(incomplete.totalsAvailable, false);
  assert.equal(incomplete.thisYear, null);
});

test('detailed feed excludes private, unknown, and missing-visibility repositories while retaining aggregate counts', async () => {
  const { handler } = loadHandler({ feed: { data: {
    repo0: repository(),
    repo1: repository([commit(2, 'PRIVATE_SENTINEL')], { isPrivate: true }),
    repo2: repository([commit(3, 'UNKNOWN_SENTINEL')], { name: 'private-work', nameWithOwner: 'azoni/private-work' }),
    repo3: repository([commit(4, 'NO_VISIBILITY_SENTINEL')], { isPrivate: undefined }),
  } } });
  const response = await handler({ httpMethod: 'GET' });
  const result = JSON.parse(response.body);
  assert.equal(result.thisYear, 7225);
  assert.equal(result.recentCommits.length, 1);
  assert.doesNotMatch(response.body, /PRIVATE_SENTINEL|UNKNOWN_SENTINEL|NO_VISIBILITY_SENTINEL|private-work/);
});

test('agent attribution uses explicit metadata and trailers; unmarked does not mean solo', () => {
  const result = publicGithub.buildPublicStats({ now: NOW, repositories: [repository([
    commit(1, 'Fix Codex settings and document Claude Code'),
    commit(2, 'Public update\n\nCo-authored-by: Claude <noreply@anthropic.com>'),
    commit(3, 'Public update\n\nCo-authored-by: Codex <noreply@openai.com>'),
    commit(4, 'Public update\n\nCo-authored-by: Claude <noreply@anthropic.com>\nCo-authored-by: Codex <noreply@openai.com>'),
  ])] });
  assert.deepEqual(result.commitSplit, { sampleSize: 4, claudeCode: 1, codexCode: 1, both: 1, untagged: 1 });
  assert.equal(result.recentCommits.find(item => item.fullSha === sha(1)).codexCode, false);
});

test('HTTP preflight and unsupported methods do not query GitHub', async () => {
  const loaded = loadHandler();
  assert.equal((await loaded.handler({ httpMethod: 'OPTIONS' })).statusCode, 200);
  assert.equal((await loaded.handler({ httpMethod: 'POST' })).statusCode, 405);
  assert.equal(loaded.requests.length, 0);
});
