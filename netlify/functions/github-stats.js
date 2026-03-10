// netlify/functions/github-stats.js

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('GITHUB_TOKEN not set, returning fallback stats');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        today: 0,
        last7Days: 0,
        last30Days: 0,
        recentCommits: [],
        repos: [],
        updatedAt: new Date().toISOString()
      })
    };
  }

  // Log token prefix for debugging (safe - only shows first 4 chars)
  console.log('GitHub token configured:', token.substring(0, 4) + '...');

  const username = 'azoni';

  const detectAgentTags = ({
    message = '',
    authorName = '',
    authorEmail = '',
    authorLogin = '',
    committerName = '',
    committerEmail = '',
    committerLogin = '',
  } = {}) => {
    const haystack = [
      message,
      authorName,
      authorEmail,
      authorLogin,
      committerName,
      committerEmail,
      committerLogin,
    ].join('\n');
    return {
      claudeCode: /co-authored-by:.*claude|noreply@anthropic\.com|\bclaude code\b/i.test(haystack),
      codexCode: /co-authored-by:.*codex|co-authored-by:.*openai|noreply@openai\.com|\bcodex(?:\s*cli|\s*code)?\b|openai codex/i.test(haystack),
    };
  };

  const firstLine = (message = '') => (message || '').split('\n')[0];
  const normalizeBranch = (ref = '') => ref.replace('refs/heads/', '');
  const extractMergedBranch = (message = '') => {
    if (!message) return null;
    const mergeBranchMatch = message.match(/Merge branch '([^']+)'/i);
    if (mergeBranchMatch?.[1]) return mergeBranchMatch[1];
    const mergePrMatch = message.match(/Merge pull request #\d+ from [^/]+\/([^\s]+)/i);
    if (mergePrMatch?.[1]) return mergePrMatch[1];
    return null;
  };

  try {
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
          repositories(first: 30, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
            nodes {
              name
              url
              isPrivate
              pushedAt
              owner {
                login
              }
              defaultBranchRef {
                name
                target {
                  ... on Commit {
                    history(first: 30) {
                      nodes {
                        message
                        committedDate
                        oid
                        url
                        author {
                          name
                          email
                          user {
                            login
                          }
                        }
                        committer {
                          name
                          email
                          user {
                            login
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          repositoriesContributedTo(first: 20, orderBy: {field: PUSHED_AT, direction: DESC}, contributionTypes: [COMMIT]) {
            nodes {
              name
              url
              isPrivate
              pushedAt
              owner {
                login
              }
              defaultBranchRef {
                name
                target {
                  ... on Commit {
                    history(first: 30) {
                      nodes {
                        message
                        committedDate
                        oid
                        url
                        author {
                          name
                          email
                          user {
                            login
                          }
                        }
                        committer {
                          name
                          email
                          user {
                            login
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          username,
          from: thirtyDaysAgo.toISOString(),
          to: now.toISOString()
        }
      })
    });

    console.log('GitHub API response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error('GitHub API error response:', JSON.stringify(data));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'GitHub API error',
          status: response.status,
          details: data.message || 'Unknown error'
        })
      };
    }

    if (data.errors) {
      console.error('GitHub GraphQL errors:', data.errors);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: data.errors[0].message })
      };
    }

    const user = data.data?.user;
    if (!user) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Could not fetch user data' })
      };
    }

    // Calculate contribution stats
    const calendar = user.contributionsCollection?.contributionCalendar;
    const allDays = calendar?.weeks?.flatMap(week => week.contributionDays) || [];
    const today = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const todayData = allDays.find(d => d.date === today);
    const todayCommits = todayData?.contributionCount || 0;
    const last7Days = allDays
      .filter(d => d.date >= sevenDaysAgoStr && d.date <= today)
      .reduce((sum, d) => sum + d.contributionCount, 0);
    const last30Days = allDays.reduce((sum, d) => sum + d.contributionCount, 0);

    // Combine both repo lists.
    const allRepos = [
      ...(user.repositories?.nodes || []),
      ...(user.repositoriesContributedTo?.nodes || [])
    ];

    // Use maps so GraphQL history + PushEvents can merge cleanly.
    const commitMap = new Map();
    const repoByName = new Map();
    const defaultBranchByRepo = new Map();

    const upsertCommit = (item) => {
      if (!item?.fullSha || !item?.repo || !item?.timestamp) return;
      const existing = commitMap.get(item.fullSha);
      if (!existing) {
        commitMap.set(item.fullSha, item);
        return;
      }
      existing.branch = existing.branch || item.branch || null;
      existing.claudeCode = existing.claudeCode || item.claudeCode;
      existing.codexCode = existing.codexCode || item.codexCode;
      if (new Date(item.timestamp) > new Date(existing.timestamp)) {
        existing.timestamp = item.timestamp;
      }
    };

    const upsertRepo = (repo) => {
      if (!repo?.name) return;
      const existing = repoByName.get(repo.name);
      if (!existing) {
        repoByName.set(repo.name, repo);
        return;
      }
      if (!existing.pushedAt || new Date(repo.pushedAt || 0) > new Date(existing.pushedAt || 0)) {
        repoByName.set(repo.name, { ...existing, ...repo });
      }
    };

    // GraphQL commit history (mostly default-branch reachable commits).
    for (const repo of allRepos) {
      defaultBranchByRepo.set(repo.name, repo.defaultBranchRef?.name || null);
      upsertRepo({
        name: repo.name,
        url: repo.url,
        isPrivate: repo.isPrivate,
        owner: repo.owner?.login,
        pushedAt: repo.pushedAt,
      });

      const commits = repo.defaultBranchRef?.target?.history?.nodes || [];
      for (const commit of commits) {
        const authorLogin = commit.author?.user?.login;
        const ownerLogin = repo.owner?.login;
        const isOwnedRepo = ownerLogin === username || ownerLogin === 'azoni-ai';
        if (authorLogin && authorLogin !== username) continue;
        if (!authorLogin && !isOwnedRepo) continue;
        if (repo.name === 'autoenhance') continue;

        const tags = detectAgentTags({
          message: commit.message || '',
          authorName: commit.author?.name || '',
          authorEmail: commit.author?.email || '',
          authorLogin: commit.author?.user?.login || '',
          committerName: commit.committer?.name || '',
          committerEmail: commit.committer?.email || '',
          committerLogin: commit.committer?.user?.login || '',
        });
        upsertCommit({
          message: firstLine(commit.message),
          sha: commit.oid?.substring(0, 7),
          fullSha: commit.oid,
          repo: repo.name,
          repoUrl: repo.url,
          owner: repo.owner?.login,
          isPrivate: repo.isPrivate,
          timestamp: commit.committedDate,
          url: commit.url,
          branch: extractMergedBranch(commit.message) || repo.defaultBranchRef?.name || null,
          claudeCode: tags.claudeCode,
          codexCode: tags.codexCode,
        });
      }
    }

    // PushEvents include branch refs, so this surfaces any-branch activity quickly.
    try {
      const eventsRes = await fetch(`https://api.github.com/users/${username}/events?per_page=100`, {
        headers: {
          'Authorization': `bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'azoni-website-github-stats',
        },
      });

      if (eventsRes.ok) {
        const events = await eventsRes.json();
        for (const eventItem of events) {
          if (eventItem.type !== 'PushEvent') continue;

          const repoFullName = eventItem.repo?.name || '';
          const [owner, repoName] = repoFullName.split('/');
          if (!repoName || repoName === 'autoenhance') continue;

          const branch = normalizeBranch(eventItem.payload?.ref || '');
          const pushedAt = eventItem.created_at;
          const isPrivate = eventItem.public === false;
          const commits = eventItem.payload?.commits || [];

          upsertRepo({
            name: repoName,
            url: `https://github.com/${repoFullName}`,
            isPrivate,
            owner,
            pushedAt,
          });

          for (const pushCommit of commits) {
            const fullSha = pushCommit.sha;
            if (!fullSha) continue;
            const message = pushCommit.message || '';
            const tags = detectAgentTags({
              message,
              authorName: pushCommit.author?.name || '',
              authorEmail: pushCommit.author?.email || '',
            });
            upsertCommit({
              message: firstLine(message),
              sha: fullSha.substring(0, 7),
              fullSha,
              repo: repoName,
              repoUrl: `https://github.com/${repoFullName}`,
              owner,
              isPrivate,
              timestamp: pushedAt,
              url: `https://github.com/${repoFullName}/commit/${fullSha}`,
              branch: branch || extractMergedBranch(message) || null,
              claudeCode: tags.claudeCode,
              codexCode: tags.codexCode,
            });
          }
        }
      } else {
        console.warn('GitHub Events API non-OK status:', eventsRes.status);
      }
    } catch (eventError) {
      console.warn('GitHub Events API failed, using GraphQL history only:', eventError.message);
    }

    const topCommits = Array.from(commitMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 300)
      .map((commit) => ({
        ...commit,
        // Ensure branch is always populated in UI, even when events payload is limited.
        branch: commit.branch || defaultBranchByRepo.get(commit.repo) || 'main',
      }));

    // Build repo list - only repos that have visible commits in the returned list.
    const activeRepoNames = new Set(topCommits.map(c => c.repo));
    const seenRepos = new Set();
    const repoList = [];
    for (const repo of repoByName.values()) {
      if (seenRepos.has(repo.name)) continue;
      seenRepos.add(repo.name);
      if (!activeRepoNames.has(repo.name)) continue;
      repoList.push(repo);
    }
    repoList.sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        today: todayCommits,
        last7Days,
        last30Days,
        recentCommits: topCommits,
        repos: repoList,
        updatedAt: now.toISOString()
      })
    };

  } catch (error) {
    console.error('GitHub stats error:', error.message, error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch GitHub stats',
        details: error.message
      })
    };
  }
};
