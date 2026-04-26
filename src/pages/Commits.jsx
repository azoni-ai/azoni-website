import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import '../styles/commits.css';
import '../styles/commits-warm.css';

// Map repo names to live sites
const REPO_TO_SITE = {
  'rowing-tracker': 'https://rowcrew.netlify.app',
  'azoni-website': 'https://azoni.ai',
  'old-ways-today': 'https://oldwaystoday.com',
  'tcgdoku': 'https://tcgdoku.netlify.app',
  'dumarket': 'https://dumarket.netlify.app',
  'kalshi': 'https://kalshi.netlify.app',
  'benchonly': 'https://benchpressonly.com',
  'embedroute': 'https://www.embedroute.com',
};

// Repo colors for visual distinction
const REPO_COLORS = {
  'azoni-website': '#3b82f6',
  'benchonly': '#4ade80',
  'rowing-tracker': '#22d3ee',
  'old-ways-today': '#fb923c',
  'spell-brigade': '#9b5de5',
  'embedroute': '#f472b6',
  'tcgdoku': '#fbbf24',
  'dumarket': '#a78bfa',
  'kalshi': '#34d399',
};

const Commits = () => {
  const [githubStats, setGithubStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [repoFilter, setRepoFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchGithubStats = async () => {
      try {
        const res = await fetch('/.netlify/functions/github-stats');
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const data = await res.json();
        if (!data.error) setGithubStats(data);
      } catch (_err) {
        // Silent fail in local/dev when function env vars are unavailable.
      } finally {
        setLoading(false);
      }
    };
    fetchGithubStats();
  }, []);

  // Get repo list from API (includes all repos, even those without recent commits)
  const repos = useMemo(() => {
    if (githubStats?.repos) return githubStats.repos.map(r => r.name);
    // Fallback: derive from commits
    if (!githubStats?.recentCommits) return [];
    const repoSet = new Set(githubStats.recentCommits.map(c => c.repo));
    return Array.from(repoSet).sort();
  }, [githubStats]);

  // Filter commits
  const filteredCommits = useMemo(() => {
    if (!githubStats?.recentCommits) return [];
    return githubStats.recentCommits.filter(commit => {
      const matchesRepo = repoFilter === 'all' || commit.repo === repoFilter;
      const matchesSearch = !searchQuery || 
        commit.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commit.repo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRepo && matchesSearch;
    });
  }, [githubStats, repoFilter, searchQuery]);

  // Group commits by date
  const groupedCommits = useMemo(() => {
    const groups = {};
    filteredCommits.forEach(commit => {
      const date = new Date(commit.timestamp);
      const key = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(commit);
    });
    return groups;
  }, [filteredCommits]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getRepoColor = (repo) => REPO_COLORS[repo] || '#888';

  return (
    <Layout>
      <div className="commits-page commits-page-warm">
        <div className="commits-container">
          {/* Header */}
          <div className="commits-page-header">
            <div className="commits-title-section">
              <div className="commits-breadcrumb">
                <Link to="/" className="breadcrumb-link">Home</Link>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">Commits</span>
              </div>
              <h1>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <line x1="3" y1="12" x2="9" y2="12"/>
                  <line x1="15" y1="12" x2="21" y2="12"/>
                </svg>
                Commits
              </h1>
              <p>Live feed across every repo I push to.</p>
            </div>

            {/* Stats bar */}
            {githubStats && (
              <div className="commits-stats-bar">
                <div className="commits-stat">
                  <span className="commits-stat-value">{githubStats.today || 0}</span>
                  <span className="commits-stat-label">today</span>
                </div>
                <div className="commits-stat">
                  <span className="commits-stat-value">{githubStats.last7Days || 0}</span>
                  <span className="commits-stat-label">this week</span>
                </div>
                <div className="commits-stat">
                  <span className="commits-stat-value">{githubStats.last30Days || 0}</span>
                  <span className="commits-stat-label">this month</span>
                </div>
                <div className="commits-stat">
                  <span className="commits-stat-value">{repos.length}</span>
                  <span className="commits-stat-label">repos</span>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="commits-controls">
              <div className="commits-repo-filters">
                <button
                  className={`repo-filter-btn ${repoFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setRepoFilter('all')}
                >
                  All Repos
                </button>
                {repos.map(repo => (
                  <button
                    key={repo}
                    className={`repo-filter-btn ${repoFilter === repo ? 'active' : ''}`}
                    style={{ '--repo-color': getRepoColor(repo) }}
                    onClick={() => setRepoFilter(repo)}
                  >
                    <span className="repo-dot" style={{ background: getRepoColor(repo) }}></span>
                    {repo}
                  </button>
                ))}
              </div>
              <div className="commits-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search commits..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Commit list */}
          {loading ? (
            <div className="commits-loading">
              <div className="commits-loading-pulse"></div>
              <span>Loading commits...</span>
            </div>
          ) : filteredCommits.length === 0 ? (
            <div className="commits-empty">
              <p>No recent commits{repoFilter !== 'all' ? ` for ${repoFilter}` : ''}{searchQuery ? ` matching "${searchQuery}"` : ''}</p>
              {repoFilter !== 'all' && githubStats?.repos && (() => {
                const repoInfo = githubStats.repos.find(r => r.name === repoFilter);
                return repoInfo?.pushedAt ? (
                  <p style={{ opacity: 0.5, fontSize: '0.85em', marginTop: '0.5rem' }}>
                    Last pushed: {new Date(repoInfo.pushedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="commits-timeline">
              {Object.entries(groupedCommits).map(([date, commits]) => (
                <div key={date} className="commits-day-group">
                  <div className="commits-day-header">
                    <div className="commits-day-line"></div>
                    <span className="commits-day-label">{date}</span>
                    <span className="commits-day-count">{commits.length} commit{commits.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="commits-day-list">
                    {commits.map((commit, i) => (
                      <div key={`${commit.sha}-${i}`} className="commit-item">
                        <div className="commit-timeline-dot" style={{ background: getRepoColor(commit.repo) }}></div>
                        <div className="commit-item-content">
                          <div className="commit-item-main">
                            <span className="commit-item-msg">{commit.message}</span>
                            <span className="commit-item-time">{formatTime(commit.timestamp)}</span>
                          </div>
                          <div className="commit-item-meta">
                            <span 
                              className="commit-item-repo"
                              style={{ '--repo-color': getRepoColor(commit.repo) }}
                            >
                              {commit.isPrivate ? (
                                <span>{commit.repo}</span>
                              ) : (
                                <a href={commit.repoUrl} target="_blank" rel="noopener noreferrer">{commit.repo}</a>
                              )}
                            </span>
                            {REPO_TO_SITE[commit.repo] && (
                              <a href={REPO_TO_SITE[commit.repo]} target="_blank" rel="noopener noreferrer" className="commit-item-live">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                  <polyline points="15 3 21 3 21 9"/>
                                  <line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                                Live
                              </a>
                            )}
                            {commit.claudeCode && (
                              <span className="commit-item-claude">Claude Code</span>
                            )}
                            {commit.codexCode && (
                              <span className="commit-item-codex">Codex</span>
                            )}
                            {commit.branch && (
                              <span className="commit-item-branch">{commit.branch}</span>
                            )}
                            {commit.sha && (
                              <span className="commit-item-sha">{commit.sha.slice(0, 7)}</span>
                            )}
                            <span className="commit-item-ago">{formatTimeAgo(commit.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Commits;
