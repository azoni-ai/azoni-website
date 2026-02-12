/**
 * Daily Blog Generator
 * 
 * Scheduled Netlify Function that runs every morning at 9am PT (5pm UTC).
 * Fetches yesterday's GitHub commits, generates a blog post via LLM,
 * creates an SVG cover image, and publishes to Firestore.
 * 
 * Schedule: Daily at 17:00 UTC (9:00 AM Pacific)
 * 
 * Required env vars:
 * - GITHUB_TOKEN (already configured)
 * - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (already configured)
 * - OPENROUTER_API_KEY (for LLM blog generation)
 * 
 * Can also be triggered manually:
 * POST /.netlify/functions/daily-blog
 * Body: { "date": "2026-01-31" }  (optional, defaults to yesterday)
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (shared across functions)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

// Centralized error logger
async function logError(source, error, severity = 'medium', context = {}) {
  try {
    await db.collection('error_logs').add({
      source,
      error: String(error).slice(0, 2000),
      severity,
      context,
      resolved: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('[logError] Failed to log error:', err.message);
  }
}

const GITHUB_USERNAME = 'azoni';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ============ GITHUB: Fetch Yesterday's Commits ============

async function fetchCommitsForDate(targetDate) {
  // targetDate: "2026-01-31"
  const from = new Date(`${targetDate}T00:00:00Z`);
  const to = new Date(`${targetDate}T23:59:59Z`);

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
            description
            owner { login }
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 30, since: "${from.toISOString()}", until: "${to.toISOString()}") {
                    nodes {
                      message
                      committedDate
                      oid
                      additions
                      deletions
                      changedFilesIfAvailable
                      author {
                        user { login }
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

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        username: GITHUB_USERNAME,
        from: from.toISOString(),
        to: to.toISOString()
      }
    })
  });

  const data = await response.json();

  if (data.errors) {
    console.error('GitHub GraphQL errors:', data.errors);
    throw new Error(data.errors[0].message);
  }

  const user = data.data?.user;
  if (!user) throw new Error('Could not fetch user data');

  // Extract commits from all repos
  const commitsByRepo = {};
  const repos = user.repositories?.nodes || [];

  for (const repo of repos) {
    const commits = repo.defaultBranchRef?.target?.history?.nodes || [];
    const myCommits = commits.filter(c => c.author?.user?.login === GITHUB_USERNAME);
    
    if (myCommits.length > 0) {
      commitsByRepo[repo.name] = {
        repoName: repo.name,
        repoUrl: repo.url,
        isPrivate: repo.isPrivate,
        description: repo.description,
        commits: myCommits.map(c => ({
          message: c.message.split('\n')[0], // first line only
          fullMessage: c.message,
          sha: c.oid?.substring(0, 7),
          timestamp: c.committedDate,
          additions: c.additions || 0,
          deletions: c.deletions || 0,
          filesChanged: c.changedFilesIfAvailable || 0
        }))
      };
    }
  }

  return commitsByRepo;
}


// ============ SVG: Generate Cover Image ============

function generateCoverSVG(title, repos, totalCommits, date) {
  // Pick colors based on repo names for variety
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
  
  // Build repo activity bars
  const repoEntries = Object.entries(repos);
  const maxCommits = Math.max(...repoEntries.map(([_, r]) => r.commits.length));
  
  const barsSVG = repoEntries.slice(0, 5).map(([name, repo], i) => {
    const barWidth = Math.max(40, (repo.commits.length / maxCommits) * 280);
    const color = colors[i % colors.length];
    const y = 195 + (i * 42);
    const displayName = name.length > 20 ? name.substring(0, 18) + '…' : name;
    return `
      <g>
        <rect x="60" y="${y}" width="${barWidth}" height="28" rx="6" fill="${color}" opacity="0.85"/>
        <text x="70" y="${y + 19}" font-family="monospace" font-size="12" fill="white" font-weight="bold">${displayName}</text>
        <text x="${60 + barWidth + 10}" y="${y + 19}" font-family="monospace" font-size="11" fill="#94a3b8">${repo.commits.length} commit${repo.commits.length !== 1 ? 's' : ''}</text>
      </g>`;
  }).join('\n');

  // Format date nicely
  const dateObj = new Date(date + 'T12:00:00Z');
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
  });

  // Wrap title to fit
  const maxTitleLen = 40;
  let titleLine1 = title;
  let titleLine2 = '';
  if (title.length > maxTitleLen) {
    const mid = title.lastIndexOf(' ', maxTitleLen);
    titleLine1 = title.substring(0, mid);
    titleLine2 = title.substring(mid + 1);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1e1b4b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="450" fill="url(#bg)" rx="12"/>
  
  <!-- Grid pattern -->
  <g opacity="0.05">
    ${Array.from({length: 20}, (_, i) => `<line x1="${i*40}" y1="0" x2="${i*40}" y2="450" stroke="white" stroke-width="0.5"/>`).join('\n    ')}
    ${Array.from({length: 12}, (_, i) => `<line x1="0" y1="${i*40}" x2="800" y2="${i*40}" stroke="white" stroke-width="0.5"/>`).join('\n    ')}
  </g>
  
  <!-- Decorative circles -->
  <circle cx="700" cy="80" r="60" fill="#6366f1" opacity="0.1"/>
  <circle cx="720" cy="100" r="40" fill="#8b5cf6" opacity="0.1"/>
  
  <!-- Header bar -->
  <rect x="0" y="0" width="800" height="4" fill="url(#accent)"/>
  
  <!-- Date badge -->
  <rect x="60" y="30" width="${formattedDate.length * 8 + 24}" height="28" rx="14" fill="url(#accent)" opacity="0.2"/>
  <text x="72" y="49" font-family="monospace" font-size="12" fill="#a5b4fc">${formattedDate}</text>
  
  <!-- Title -->
  <text x="60" y="100" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="white" font-weight="bold" filter="url(#glow)">${titleLine1}</text>
  ${titleLine2 ? `<text x="60" y="135" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="white" font-weight="bold">${titleLine2}</text>` : ''}
  
  <!-- Stats line -->
  <text x="60" y="${titleLine2 ? 170 : 140}" font-family="monospace" font-size="14" fill="#94a3b8">
    <tspan fill="#22c55e">●</tspan> ${totalCommits} commits across ${repoEntries.length} repo${repoEntries.length !== 1 ? 's' : ''}
  </text>
  
  <!-- Repo activity bars -->
  ${barsSVG}
  
  <!-- Footer -->
  <text x="60" y="430" font-family="monospace" font-size="11" fill="#475569">azoni.ai/blog · built in public</text>
  <text x="740" y="430" font-family="monospace" font-size="11" fill="#475569" text-anchor="end">🤖 auto-generated</text>
</svg>`;
}


// ============ LLM: Generate Blog Post ============

async function generateBlogPost(commitsByRepo, targetDate) {
  // Build a summary of what was done
  const repoSummaries = Object.entries(commitsByRepo).map(([name, repo]) => {
    const commitList = repo.commits.map(c => {
      let line = `  - ${c.message}`;
      if (c.additions || c.deletions) {
        line += ` (+${c.additions}/-${c.deletions})`;
      }
      return line;
    }).join('\n');
    
    return `**${name}**${repo.isPrivate ? ' (private)' : ''}${repo.description ? ` — ${repo.description}` : ''}:\n${commitList}`;
  }).join('\n\n');

  const totalCommits = Object.values(commitsByRepo)
    .reduce((sum, r) => sum + r.commits.length, 0);
  const repoCount = Object.keys(commitsByRepo).length;

  const dateObj = new Date(targetDate + 'T12:00:00Z');
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric' 
  });

  const prompt = `You are Azoni, a software engineer who writes casual daily dev blog posts. Write a blog post recapping yesterday's coding work.

Date: ${formattedDate}
Total commits: ${totalCommits} across ${repoCount} repos

Here are the commits:

${repoSummaries}

Write a blog post with these rules:
1. Write in first person, casual/conversational tone. Not overly polished — like you're talking to a friend who codes.
2. Don't just list commits. Tell the story of what you were working on, what problems you hit, what you figured out.
3. Group related work together thematically, not just by repo.
4. If there were bug fixes, talk about what broke and how you fixed it.
5. If there were new features, explain what they do and why you built them.
6. Keep it between 300-600 words.
7. Use markdown formatting (## headers, **bold**, \`code\`, code blocks where relevant).
8. End with what you're planning to work on next (make a reasonable guess based on the commits).
9. Don't start with "Hey everyone" or "Welcome back". Just dive in.
10. For private repos, don't reveal internal details — keep it vague but interesting.

Respond with ONLY a JSON object (no markdown fences):
{
  "title": "catchy title for the post (not generic, reference specific things you worked on)",
  "excerpt": "1-2 sentence summary for the blog card (max 160 chars)",
  "content": "the full markdown blog post content",
  "tags": ["tag1", "tag2", "tag3"] (2-4 relevant tags like "python", "devops", "ai", "react", "firebase", etc)
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    console.error('LLM response:', JSON.stringify(data));
    throw new Error('No content from LLM');
  }

  // Parse JSON (strip markdown fences if present)
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
}


// ============ FIRESTORE: Publish Blog Post ============

async function publishBlogPost({ title, excerpt, content, tags, coverSvg, targetDate }) {
  const slug = targetDate + '-' + title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60);

  // Check if we already published for this date
  const existing = await db.collection('blogPosts')
    .where('slug', '>=', targetDate)
    .where('slug', '<', targetDate + '\uf8ff')
    .get();

  if (!existing.empty) {
    console.log(`Blog post already exists for ${targetDate}, skipping.`);
    return { skipped: true, existingSlug: existing.docs[0].data().slug };
  }

  // Store SVG as data URI for the cover image
  const svgBase64 = Buffer.from(coverSvg).toString('base64');
  const coverImage = `data:image/svg+xml;base64,${svgBase64}`;

  const doc = {
    title,
    slug,
    excerpt,
    content,
    tags: [...tags, 'daily-log'],
    coverImage,
    published: true,
    publishedAt: admin.firestore.Timestamp.fromDate(new Date(targetDate + 'T17:00:00Z')),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    autoGenerated: true,
    commitDate: targetDate
  };

  const ref = await db.collection('blogPosts').add(doc);
  console.log(`Published blog post: ${title} (${ref.id})`);

  // Auto-generate RAG chunk so the chatbot knows about this post
  try {
    const ragContent = `Blog Post: "${title}" (${targetDate}, auto-generated)

${excerpt}

Key topics: ${tags.join(', ')}

Full content summary:
${content.slice(0, 2000)}`;

    const ragDoc = {
      category: 'blog',
      title: `Blog: ${title}`,
      content: ragContent,
      metadata: { blogId: ref.id, slug, autoGenerated: true, blogDate: targetDate },
      tokenEstimate: Math.ceil(ragContent.length / 4),
      embedding: null,
      embeddedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Check if RAG chunk already exists for this blog
    const existingRag = await db.collection('rag_knowledge_base')
      .where('title', '==', `Blog: ${title}`).get();
    
    if (existingRag.empty) {
      const ragRef = await db.collection('rag_knowledge_base').add(ragDoc);
      console.log(`[daily-blog] Auto-created RAG chunk for blog: ${ragRef.id}`);
    }
  } catch (ragErr) {
    console.error('[daily-blog] Failed to create RAG chunk (non-fatal):', ragErr.message);
  }

  return { published: true, id: ref.id, slug, title };
}


// ============ MAIN HANDLER ============

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Determine target date (default: yesterday)
  let targetDate;
  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      targetDate = body.date;
    } catch (e) {}
  }

  if (!targetDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    targetDate = yesterday.toISOString().split('T')[0];
  }

  console.log(`[daily-blog] Generating blog for ${targetDate}`);

  // Helper to log activity steps
  async function logStep(type, title, description, reasoning, metadata = {}) {
    try {
      await db.collection('agent_activity').add({
        type,
        title,
        description,
        reasoning,
        metadata: { ...metadata, step: type },
        source: 'daily-blog',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error('[daily-blog] Failed to log activity:', err.message);
    }
  }

  try {
    // 1. Check required env vars
    if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not configured');
    if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
    if (!process.env.FIREBASE_PROJECT_ID) throw new Error('Firebase not configured');

    // Log: Starting observation
    await logStep(
      'agent_observing',
      'Scanning GitHub activity',
      `Checking commits for ${targetDate}`,
      'Starting daily blog generation cycle - need to see what was built yesterday',
      { date: targetDate }
    );

    // 2. Fetch commits
    const commitsByRepo = await fetchCommitsForDate(targetDate);
    const totalCommits = Object.values(commitsByRepo)
      .reduce((sum, r) => sum + r.commits.length, 0);

    console.log(`[daily-blog] Found ${totalCommits} commits across ${Object.keys(commitsByRepo).length} repos`);

    // Log: Analysis complete
    const repoNames = Object.keys(commitsByRepo);
    if (totalCommits > 0) {
      await logStep(
        'agent_deciding',
        `Found ${totalCommits} commits`,
        `Activity in ${repoNames.length} repo${repoNames.length > 1 ? 's' : ''}: ${repoNames.join(', ')}`,
        `Analyzed GitHub activity and found ${totalCommits} commits to write about. Will generate a narrative around the main themes.`,
        { totalCommits, repos: repoNames }
      );
    }

    // 3. No commits? Skip.
    if (totalCommits === 0) {
      console.log(`[daily-blog] No commits for ${targetDate}, skipping.`);
      await logStep(
        'agent_deciding',
        'No commits found',
        `Nothing to write about for ${targetDate}`,
        'Checked GitHub but found no commits for this date. Will skip blog generation.',
        { date: targetDate }
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          skipped: true, 
          reason: 'no commits', 
          date: targetDate 
        })
      };
    }

    // 4. Generate blog post via LLM
    console.log('[daily-blog] Generating blog post...');
    
    // Log: Drafting
    await logStep(
      'agent_drafting',
      'Writing blog post',
      `Crafting narrative from ${totalCommits} commits`,
      `Sending commit data to LLM to generate an engaging dev log. Looking for themes and storytelling angles.`,
      { totalCommits, repos: repoNames }
    );
    
    const blogPost = await generateBlogPost(commitsByRepo, targetDate);
    console.log(`[daily-blog] Generated: "${blogPost.title}"`);

    // 5. Generate SVG cover image
    const coverSvg = generateCoverSVG(
      blogPost.title,
      commitsByRepo,
      totalCommits,
      targetDate
    );

    // 6. Publish to Firestore
    const result = await publishBlogPost({
      title: blogPost.title,
      excerpt: blogPost.excerpt,
      content: blogPost.content,
      tags: blogPost.tags,
      coverSvg,
      targetDate
    });

    // 7. Log activity with reasoning
    if (result.published) {
      const repoNames = Object.keys(commitsByRepo);
      const topRepo = Object.entries(commitsByRepo)
        .sort((a, b) => b[1].commits.length - a[1].commits.length)[0];
      
      // Generate reasoning about focus
      let reasoning = `Found ${totalCommits} commits across ${repoNames.length} repo${repoNames.length > 1 ? 's' : ''}: ${repoNames.join(', ')}. `;
      
      if (topRepo) {
        const [repoName, repoData] = topRepo;
        reasoning += `Most activity was in ${repoName} (${repoData.commits.length} commits), `;
        
        // Analyze commit patterns
        const commitMessages = repoData.commits.map(c => c.message.toLowerCase());
        if (commitMessages.some(m => m.includes('fix'))) {
          reasoning += 'which included bug fixes. ';
        } else if (commitMessages.some(m => m.includes('add') || m.includes('new'))) {
          reasoning += 'with new features being added. ';
        } else {
          reasoning += 'so focused the narrative there. ';
        }
      }
      
      reasoning += `Generated title "${blogPost.title}" to capture the day's main theme.`;

      await db.collection('agent_activity').add({
        type: 'blog_generated',
        title: `Published: ${blogPost.title}`,
        description: `${totalCommits} commits across ${repoNames.length} project${repoNames.length > 1 ? 's' : ''} — ${repoNames.join(', ')}`,
        reasoning: reasoning,
        metadata: {
          id: result.id,
          slug: result.slug,
          totalCommits,
          repos: repoNames
        },
        source: 'daily-blog',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('[daily-blog] Logged activity to agent_activity');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        date: targetDate,
        totalCommits,
        repos: Object.keys(commitsByRepo),
        ...result
      })
    };

  } catch (error) {
    console.error(`[daily-blog] Error:`, error);
    await logError('daily-blog', error.message, 'high', { function: 'main-handler', date: targetDate });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message, 
        date: targetDate 
      })
    };
  }
};

// Netlify Scheduled Function: every day at 5pm UTC (9am PT)
exports.config = {
  schedule: "0 17 * * *"
};