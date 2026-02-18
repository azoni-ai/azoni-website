// netlify/functions/github-stats.js

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN environment variable is not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'GitHub token not configured' })
    };
  }
  
  // Log token prefix for debugging (safe - only shows first 4 chars)
  console.log('GitHub token configured:', token.substring(0, 4) + '...');

  const username = 'azoni';

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
                target {
                  ... on Commit {
                    history(first: 30) {
                      nodes {
                        message
                        committedDate
                        oid
                        url
                        author {
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
                target {
                  ... on Commit {
                    history(first: 30) {
                      nodes {
                        message
                        committedDate
                        oid
                        url
                        author {
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

    // Extract recent commits from both owned and contributed repos
    const recentCommits = [];
    const seenCommits = new Set();
    
    // Combine both repo lists
    const allRepos = [
      ...(user.repositories?.nodes || []),
      ...(user.repositoriesContributedTo?.nodes || [])
    ];
    
    for (const repo of allRepos) {
      const commits = repo.defaultBranchRef?.target?.history?.nodes || [];
      for (const commit of commits) {
        // Only include commits by this user
        // Check login match, or if GitHub couldn't resolve the email, accept commits from owned repos
        const authorLogin = commit.author?.user?.login;
        const isOwnedRepo = repo.owner?.login === username;
        if (authorLogin && authorLogin !== username) continue;
        if (!authorLogin && !isOwnedRepo) continue;
        
        // Skip duplicates and merge commits
        if (seenCommits.has(commit.oid)) continue;
        if (commit.message?.startsWith('Merge')) continue;
        
        seenCommits.add(commit.oid);
        
        recentCommits.push({
          message: commit.message.split('\n')[0],
          sha: commit.oid?.substring(0, 7),
          repo: repo.name,
          repoUrl: repo.url,
          owner: repo.owner?.login,
          isPrivate: repo.isPrivate,
          timestamp: commit.committedDate,
          url: commit.url,
          claudeCode: /co-authored-by:.*claude/i.test(commit.message),
        });
      }
    }

    // Sort by date
    recentCommits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const topCommits = recentCommits.slice(0, 100);

    // Build repo list — only repos with user/Claude commits in last 3 months
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const activeRepoNames = new Set(
      recentCommits
        .filter(c => new Date(c.timestamp) >= threeMonthsAgo)
        .map(c => c.repo)
    );
    const seenRepos = new Set();
    const repoList = [];
    for (const repo of allRepos) {
      if (seenRepos.has(repo.name)) continue;
      seenRepos.add(repo.name);
      if (!activeRepoNames.has(repo.name)) continue;
      repoList.push({
        name: repo.name,
        url: repo.url,
        isPrivate: repo.isPrivate,
        owner: repo.owner?.login,
        pushedAt: repo.pushedAt,
      });
    }
    repoList.sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt));

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