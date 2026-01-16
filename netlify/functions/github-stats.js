// netlify/functions/github-stats.js

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
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
    // Fetch contribution stats via GraphQL
    const statsPromise = fetchContributionStats(token, username);
    
    // Fetch recent commits via Events API
    const commitsPromise = fetchRecentCommits(token, username);

    const [stats, commits] = await Promise.all([statsPromise, commitsPromise]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...stats,
        recentCommits: commits,
        updatedAt: new Date().toISOString()
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

async function fetchContributionStats(token, username) {
  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
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
    throw new Error(data.errors[0].message);
  }

  const calendar = data.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    throw new Error('Could not fetch contribution data');
  }

  const allDays = calendar.weeks.flatMap(week => week.contributionDays);
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

  return { today: todayCommits, last7Days, last30Days };
}

async function fetchRecentCommits(token, username) {
  // Fetch user's recent push events
  const response = await fetch(
    `https://api.github.com/users/${username}/events?per_page=100`,
    {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    console.error('Events API error:', response.status, await response.text());
    return [];
  }

  const events = await response.json();
  console.log('Total events fetched:', events.length);
  
  // Filter to push events and extract commits
  const commits = [];
  
  for (const event of events) {
    if (event.type === 'PushEvent' && event.payload?.commits) {
      const repoName = event.repo?.name?.split('/')[1] || event.repo?.name;
      const repoUrl = `https://github.com/${event.repo?.name}`;
      
      for (const commit of event.payload.commits) {
        // Skip merge commits
        if (commit.message?.startsWith('Merge')) continue;
        
        commits.push({
          message: commit.message.split('\n')[0], // First line only
          sha: commit.sha?.substring(0, 7),
          repo: repoName,
          repoUrl,
          timestamp: event.created_at,
          url: `https://github.com/${event.repo?.name}/commit/${commit.sha}`
        });
      }
    }
    
    // Limit to 20 commits
    if (commits.length >= 20) break;
  }

  console.log('Commits extracted:', commits.length);
  return commits.slice(0, 20);
}