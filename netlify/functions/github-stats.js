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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'GitHub token not configured' })
    };
  }

  const username = 'azoni';

  try {
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            commitContributionsByRepository(maxRepositories: 10) {
              repository {
                name
                url
                isPrivate
              }
              contributions(first: 10) {
                nodes {
                  commitCount
                  occurredAt
                }
              }
            }
            contributionCalendar {
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
          repositories(first: 20, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: OWNER) {
            nodes {
              name
              url
              isPrivate
              defaultBranchRef {
                target {
                  ... on Commit {
                    history(first: 5) {
                      nodes {
                        message
                        committedDate
                        oid
                        url
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

    const data = await response.json();

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

    // Extract recent commits from repositories
    const recentCommits = [];
    const repos = user.repositories?.nodes || [];
    
    for (const repo of repos) {
      const commits = repo.defaultBranchRef?.target?.history?.nodes || [];
      for (const commit of commits) {
        // Skip merge commits
        if (commit.message?.startsWith('Merge')) continue;
        
        recentCommits.push({
          message: commit.message.split('\n')[0],
          sha: commit.oid?.substring(0, 7),
          repo: repo.name,
          repoUrl: repo.url,
          isPrivate: repo.isPrivate,
          timestamp: commit.committedDate,
          url: commit.url
        });
      }
    }

    // Sort by date and take top 20
    recentCommits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const topCommits = recentCommits.slice(0, 20);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        today: todayCommits,
        last7Days,
        last30Days,
        recentCommits: topCommits,
        updatedAt: now.toISOString()
      })
    };

  } catch (error) {
    console.error('GitHub stats error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch GitHub stats' })
    };
  }
};