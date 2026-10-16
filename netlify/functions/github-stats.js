const { PUBLIC_REPOSITORIES, HISTORY_PER_REPO, buildPublicStats } = require('./lib/public-github');

// Public output is limited to explicitly reviewed independent repositories.
// Never enumerate repositories accessible to the configured GitHub token.
const repositoryFields = `
  name nameWithOwner isPrivate pushedAt owner { login }
  defaultBranchRef {
    name
    target { ... on Commit { history(first: ${HISTORY_PER_REPO}) { nodes {
      message committedDate oid
      author { name email user { login } }
      committer { name email user { login } }
    } } } }
  }
`;

exports.handler = async (event = {}) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod && event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  const token = process.env.GITHUB_TOKEN;
  if (!token || !PUBLIC_REPOSITORIES.size) {
    return { statusCode: 200, headers, body: JSON.stringify(buildPublicStats()) };
  }

  const selections = [...PUBLIC_REPOSITORIES].filter((name) => /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(name)).map((fullName, index) => {
    const [owner, name] = fullName.split('/');
    return `repo${index}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${repositoryFields} }`;
  });
  if (!selections.length) return { statusCode: 200, headers, body: JSON.stringify(buildPublicStats()) };

  try {
    const [graphResult, eventsResult] = await Promise.allSettled([
      fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query { ${selections.join('\n')} }` }),
        signal: AbortSignal.timeout(8000),
      }),
      fetch('https://api.github.com/users/azoni/events/public?per_page=100', {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'azoni-website-public-github' },
        signal: AbortSignal.timeout(8000),
      }),
    ]);
    if (graphResult.status !== 'fulfilled' || !graphResult.value.ok) {
      throw new Error('Public repository metadata unavailable');
    }
    const graph = await graphResult.value.json();
    if (graph.errors || !graph.data) throw new Error('Public repository metadata unavailable');
    let events = [];
    if (eventsResult.status === 'fulfilled' && eventsResult.value.ok) {
      try { const result = await eventsResult.value.json(); if (Array.isArray(result)) events = result; }
      catch { /* Public default-branch history remains available. */ }
    }
    return {
      statusCode: 200, headers,
      body: JSON.stringify(buildPublicStats({ repositories: Object.values(graph.data).filter(Boolean), events })),
    };
  } catch {
    return { statusCode: 502, headers: { ...headers, 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: 'Public code activity is temporarily unavailable' }) };
  }
};
