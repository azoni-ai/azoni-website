const { PUBLIC_REPOSITORIES, HISTORY_PER_REPO, buildPublicStats } = require('./lib/public-github');
const { getContributionRanges, buildContributionStats } = require('./lib/github-contributions');

const STATS_SCOPE = 'github-contributions-with-public-feed';
const FEED_SCOPE = 'public-independent-sample';
const repositoryFields = 'name nameWithOwner isPrivate pushedAt owner { login } defaultBranchRef { name target { ... on Commit { history(first: ' + HISTORY_PER_REPO + ') { nodes { message committedDate oid author { name email user { login } } committer { name email user { login } } } } } } }';

exports.handler = async (event = {}) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod && event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 503, headers, body: JSON.stringify({ error: 'GitHub activity is temporarily unavailable' }) };
  const now = new Date();
  const { ranges } = getContributionRanges(now);
  // Counters query only the user's contribution calendar: never derive an
  // account-wide month/year total from a paginated recent-commit feed.
  const contributionFields = ranges.map(range => range.name + ': contributionsCollection(from: ' + JSON.stringify(range.from) + ', to: ' + JSON.stringify(range.to) + ') { contributionCalendar { weeks { contributionDays { date contributionCount } } } }').join('\n');
  const aggregateQuery = 'query { user(login: "azoni") { ' + contributionFields + ' } }';
  // Detailed commits still come only from explicitly approved public projects.
  // No private repository names, messages, or URLs enter the response.
  const selections = [...PUBLIC_REPOSITORIES].filter(name => /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(name)).map((fullName, index) => {
    const [owner, name] = fullName.split('/');
    return 'repo' + index + ': repository(owner: ' + JSON.stringify(owner) + ', name: ' + JSON.stringify(name) + ') { ' + repositoryFields + ' }';
  });
  const graph = async query => {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST', headers: { Authorization: 'bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }), signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('GitHub unavailable');
    const result = await response.json();
    if (result.errors?.length || !result.data) throw new Error('GitHub query incomplete');
    return result.data;
  };
  const getEvents = async () => {
    const response = await fetch('https://api.github.com/users/azoni/events/public?per_page=100', {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'azoni-website-public-github' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Public events unavailable');
    const result = await response.json();
    return Array.isArray(result) ? result : [];
  };
  const [aggregate, feed, events] = await Promise.allSettled([
    graph(aggregateQuery), selections.length ? graph('query { ' + selections.join('\n') + ' }') : Promise.resolve({}), getEvents(),
  ]);
  const calendars = aggregate.status === 'fulfilled'
    ? ranges.map(range => aggregate.value.user?.[range.name]?.contributionCalendar) : [];
  const totals = buildContributionStats(calendars, now);
  const feedAvailable = feed.status === 'fulfilled';
  const sample = buildPublicStats({
    repositories: feedAvailable ? Object.values(feed.value).filter(Boolean) : [],
    events: events.status === 'fulfilled' ? events.value : [], now,
  });
  if (!totals.totalsAvailable && !feedAvailable) return {
    statusCode: 502, headers, body: JSON.stringify({ error: 'GitHub activity is temporarily unavailable' }),
  };
  return { statusCode: 200, headers, body: JSON.stringify({
    ...sample, ...totals, statsScope: STATS_SCOPE, feedScope: FEED_SCOPE,
    countsAreSample: false, feedAvailable, updatedAt: now.toISOString(),
  }) };
};
