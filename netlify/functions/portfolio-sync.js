/**
 * Portfolio Auto-Sync Function
 * 
 * Monitors GitHub repos and automatically updates:
 * - Project descriptions in Firestore
 * - RAG knowledge chunks
 * - Profile/About Me section
 * - Current work summary
 * 
 * Endpoints:
 * GET  - Check sync status (are there new commits?)
 * POST - Perform sync (fetch, summarize, update)
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize Firebase Admin
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

// ============ CONFIGURATION ============

const GITHUB_USERNAME = 'azoni';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Optional, for higher rate limits

// Repo → Content mapping
const REPO_CONFIG = {
  'azoni-portfolio': {
    projectId: 'azoni-ai',
    ragChunkTitle: 'Azoni.ai Portfolio',
    updateProfile: true,
    updateCurrentWork: true,
    description: 'Portfolio website with RAG chatbot'
  },
  'benchpressonly': {
    projectId: 'bench-only',
    ragChunkTitle: 'Bench Only - Strength Training PWA',
    updateProfile: false,
    updateCurrentWork: true,
    description: 'AI-powered strength training app'
  },
  'row-crew': {
    projectId: 'row-crew',
    ragChunkTitle: 'Row Crew - AI Fitness App',
    updateProfile: false,
    updateCurrentWork: true,
    description: 'Social fitness app with AI verification'
  }
};

const REPOS = Object.keys(REPO_CONFIG);

// ============ GITHUB API ============

async function githubFetch(endpoint) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'azoni-portfolio-sync'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  
  const response = await fetch(`https://api.github.com${endpoint}`, { headers });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  return response.json();
}

async function getLatestCommitSha(repo) {
  try {
    const data = await githubFetch(`/repos/${GITHUB_USERNAME}/${repo}/commits?per_page=1`);
    return data[0]?.sha || null;
  } catch (error) {
    console.error(`Error fetching SHA for ${repo}:`, error.message);
    return null;
  }
}

async function getCommitsSince(repo, sinceSha, limit = 10) {
  try {
    // Get recent commits
    const commits = await githubFetch(`/repos/${GITHUB_USERNAME}/${repo}/commits?per_page=${limit}`);
    
    if (!sinceSha) {
      return commits; // Return all if no previous SHA
    }
    
    // Filter to only commits after the last synced one
    const newCommits = [];
    for (const commit of commits) {
      if (commit.sha === sinceSha) break;
      newCommits.push({
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.author.date,
        author: commit.commit.author.name
      });
    }
    
    return newCommits;
  } catch (error) {
    console.error(`Error fetching commits for ${repo}:`, error.message);
    return [];
  }
}

// ============ SYNC STATE ============

async function getSyncState() {
  const doc = await db.collection('syncState').doc('github').get();
  
  if (!doc.exists) {
    return {
      lastSyncedAt: null,
      repos: {},
      lastSummary: null
    };
  }
  
  return doc.data();
}

async function saveSyncState(state) {
  await db.collection('syncState').doc('github').set({
    ...state,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

// ============ LLM SUMMARIZATION ============

async function summarizeCommits(repoCommits) {
  // repoCommits = [{ repo: 'name', commits: [...] }, ...]
  
  const commitText = repoCommits.map(({ repo, commits }) => {
    const config = REPO_CONFIG[repo];
    const commitList = commits.map(c => `- ${c.message}`).join('\n');
    return `## ${config.description} (${repo})\n${commitList}`;
  }).join('\n\n');
  
  const prompt = `Summarize these recent code commits into a brief, professional update (2-3 sentences). Focus on features and improvements, not technical details. Write in third person about "Charlton" or "the developer".

${commitText}

Summary:`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200
      })
    });
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 'Recent updates to projects.';
  } catch (error) {
    console.error('Error summarizing:', error);
    return 'Recent updates to projects.';
  }
}

async function generateProjectUpdate(repo, commits) {
  const config = REPO_CONFIG[repo];
  const commitList = commits.map(c => `- ${c.message}`).join('\n');
  
  const prompt = `Based on these recent commits, write a brief "Recent Updates" section (2-3 bullet points) for a project description. Be specific about features added or improved.

Project: ${config.description}
Commits:
${commitList}

Recent Updates (as bullet points):`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150
      })
    });
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Error generating project update:', error);
    return null;
  }
}

// ============ CONTENT UPDATES ============

async function updateProjectDescription(projectId, recentUpdates) {
  if (!recentUpdates) return false;
  
  try {
    const projectRef = db.collection('projects').doc(projectId);
    const doc = await projectRef.get();
    
    if (!doc.exists) {
      console.log(`Project ${projectId} not found in Firestore`);
      return false;
    }
    
    await projectRef.update({
      recentUpdates,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating project ${projectId}:`, error);
    return false;
  }
}

async function updateRagChunk(chunkTitle, recentUpdates) {
  if (!recentUpdates) return false;
  
  try {
    // Find the chunk by title
    const snapshot = await db.collection('knowledgeBase')
      .where('title', '==', chunkTitle)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log(`RAG chunk "${chunkTitle}" not found`);
      return false;
    }
    
    const chunkDoc = snapshot.docs[0];
    const currentContent = chunkDoc.data().content;
    
    // Append or update the "Recent Updates" section
    let newContent = currentContent;
    const recentSection = `\n\nRecent Updates (auto-synced):\n${recentUpdates}`;
    
    if (currentContent.includes('Recent Updates (auto-synced):')) {
      // Replace existing section
      newContent = currentContent.replace(
        /\n\nRecent Updates \(auto-synced\):[\s\S]*$/,
        recentSection
      );
    } else {
      // Append new section
      newContent = currentContent + recentSection;
    }
    
    await chunkDoc.ref.update({
      content: newContent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Clear embedding so it gets re-embedded
      embedding: null,
      embeddedAt: null
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating RAG chunk "${chunkTitle}":`, error);
    return false;
  }
}

async function updateProfile(summary) {
  try {
    await db.collection('profile').doc('main').set({
      currentWork: summary,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
}

async function updateCurrentWorkChunk(summary) {
  // Update or create a "Current Work" RAG chunk
  try {
    const snapshot = await db.collection('knowledgeBase')
      .where('title', '==', 'Current Work and Projects')
      .limit(1)
      .get();
    
    const content = `Charlton is actively building in public while job searching. ${summary}

Main active projects:
- azoni.ai: Portfolio website with RAG-powered chatbot
- benchpressonly.com: AI strength training coach
- Row Crew: Social fitness app with Claude Vision verification

Check the GitHub activity card on azoni.ai homepage for real-time commits.`;

    if (snapshot.empty) {
      // Create new chunk
      await db.collection('knowledgeBase').add({
        category: 'bio',
        title: 'Current Work and Projects',
        content,
        tokenEstimate: Math.ceil(content.length / 4),
        embedding: null,
        embeddedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Update existing
      await snapshot.docs[0].ref.update({
        content,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        embedding: null,
        embeddedAt: null
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating current work chunk:', error);
    return false;
  }
}

// ============ MAIN HANDLERS ============

async function checkSyncStatus() {
  const syncState = await getSyncState();
  
  // Get latest SHAs from GitHub
  const latestShas = {};
  const reposOutdated = [];
  
  for (const repo of REPOS) {
    const sha = await getLatestCommitSha(repo);
    latestShas[repo] = sha;
    
    if (sha && sha !== syncState.repos?.[repo]?.lastSha) {
      reposOutdated.push(repo);
    }
  }
  
  return {
    lastSyncedAt: syncState.lastSyncedAt,
    hasUpdates: reposOutdated.length > 0,
    reposOutdated,
    lastSummary: syncState.lastSummary
  };
}

async function performSync() {
  const syncState = await getSyncState();
  
  // Gather commits from all repos that have changes
  const allRepoCommits = [];
  const latestShas = {};
  
  for (const repo of REPOS) {
    const latestSha = await getLatestCommitSha(repo);
    latestShas[repo] = latestSha;
    
    if (!latestSha) continue;
    
    const lastSha = syncState.repos?.[repo]?.lastSha;
    
    if (latestSha !== lastSha) {
      const commits = await getCommitsSince(repo, lastSha);
      
      if (commits.length > 0) {
        // Filter out noise commits
        const meaningfulCommits = commits.filter(c => {
          const msg = c.message.toLowerCase();
          return !msg.startsWith('merge') && 
                 !msg.includes('readme') &&
                 !msg.includes('typo') &&
                 msg.length > 5;
        });
        
        if (meaningfulCommits.length > 0) {
          allRepoCommits.push({ repo, commits: meaningfulCommits });
        }
      }
    }
  }
  
  if (allRepoCommits.length === 0) {
    return {
      updated: false,
      message: 'No meaningful updates found'
    };
  }
  
  // Generate summaries and updates
  const overallSummary = await summarizeCommits(allRepoCommits);
  
  const results = {
    projectsUpdated: [],
    ragChunksUpdated: [],
    profileUpdated: false
  };
  
  // Update each repo's content
  for (const { repo, commits } of allRepoCommits) {
    const config = REPO_CONFIG[repo];
    
    // Generate project-specific update
    const projectUpdate = await generateProjectUpdate(repo, commits);
    
    // Update project description
    if (await updateProjectDescription(config.projectId, projectUpdate)) {
      results.projectsUpdated.push(config.projectId);
    }
    
    // Update RAG chunk
    if (await updateRagChunk(config.ragChunkTitle, projectUpdate)) {
      results.ragChunksUpdated.push(config.ragChunkTitle);
    }
    
    // Update profile if this is the portfolio repo
    if (config.updateProfile) {
      results.profileUpdated = await updateProfile(overallSummary);
    }
  }
  
  // Update the "Current Work" chunk with overall summary
  await updateCurrentWorkChunk(overallSummary);
  
  // Save sync state
  const newSyncState = {
    lastSyncedAt: new Date().toISOString(),
    repos: {},
    lastSummary: overallSummary
  };
  
  for (const repo of REPOS) {
    newSyncState.repos[repo] = {
      lastSha: latestShas[repo],
      lastChecked: new Date().toISOString()
    };
  }
  
  await saveSyncState(newSyncState);
  
  return {
    updated: true,
    summary: overallSummary,
    reposUpdated: allRepoCommits.map(r => r.repo),
    ...results
  };
}

// ============ HANDLER ============

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  
  try {
    if (event.httpMethod === 'GET') {
      const status = await checkSyncStatus();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(status)
      };
    }
    
    if (event.httpMethod === 'POST') {
      const result = await performSync();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }
    
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
