import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { profile } from '../data/profile';
import { projects } from '../data/projects';

// Map repo names to live sites
const REPO_TO_SITE = {
  'rowing-tracker': 'https://rowcrew.netlify.app',
  'azoni-website': 'https://azoni.ai',
  'old-ways-today': 'https://oldwaystoday.com',
  'tcgdoku': 'https://tcgdoku.netlify.app',
  'dumarket': 'https://dumarket.netlify.app',
  'kalshi': 'https://kalshi.netlify.app',
};

const Home = () => {
  const [githubStats, setGithubStats] = useState(null);
  const [showAllCommits, setShowAllCommits] = useState(false);

  useEffect(() => {
    fetch('/.netlify/functions/github-stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setGithubStats(data);
      })
      .catch(err => console.error('Failed to fetch GitHub stats:', err));
  }, []);

  const getProject = (id) => projects.find(p => p.id === id);
  
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
  
  const liveProjects = [
    getProject('old-ways-today'),
    getProject('row-crew'),
    getProject('tcgdoku'),
    getProject('azoni-ai'),
    getProject('polymarket-tool')
  ].filter(Boolean);
  
  const featuredProjects = [
    getProject('dustbunny'),
    getProject('oli-fitness')
  ].filter(Boolean);

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-compact">
        <div className="container">
          <div className="hero-intro">
            <h1>{profile.name}</h1>
            <p className="hero-degree">M.S. Software Engineering</p>
            <p className="hero-tagline">
              Full-stack engineer building AI-powered applications and developer tools
            </p>
            
            {/* Credentials Bar */}
            <div className="credentials">
              <div className="credential">
                <span className="credential-value">7+</span>
                <span className="credential-label">Years</span>
              </div>
              <div className="credential-divider"></div>
              <div className="credential">
                <span className="credential-value">Capital One</span>
                <span className="credential-label">Senior SWE</span>
              </div>
              <div className="credential-divider"></div>
              <div className="credential">
                <span className="credential-value">T-Mobile</span>
                <span className="credential-label">SWE II</span>
              </div>
              <div className="credential-divider"></div>
              <div className="credential">
                <span className="credential-value">ACM CHI</span>
                <span className="credential-label">Published</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GitHub Activity - Combined Stats + Commits */}
      {githubStats && (
        <section className="github-section">
          <div className="container">
            <div className="github-card">
              <div className="github-header">
                <div className="github-title">
                  <span className="github-pulse"></span>
                  <svg className="github-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <span>commits</span>
                </div>
                <div className="github-stats-inline">
                  <span><strong>{githubStats.today}</strong> today</span>
                  <span><strong>{githubStats.last7Days}</strong> this week</span>
                  <span><strong>{githubStats.last30Days}</strong> this month</span>
                </div>
              </div>
              
              {githubStats.recentCommits?.length > 0 && (
                <>
                  <div className={`commit-list ${showAllCommits ? 'expanded' : ''}`}>
                    {(showAllCommits ? githubStats.recentCommits : githubStats.recentCommits.slice(0, 4)).map((commit, i) => (
                      <div key={`${commit.sha}-${i}`} className="commit-item">
                        {commit.isPrivate ? (
                          <span className="commit-message private">{commit.message}</span>
                        ) : (
                          <a 
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="commit-message"
                          >
                            {commit.message}
                          </a>
                        )}
                        <div className="commit-meta">
                          {commit.isPrivate && (
                            <span className="commit-private-badge">Private</span>
                          )}
                          {commit.isPrivate ? (
                            <span className="commit-repo private">{commit.repo}</span>
                          ) : (
                            <a 
                              href={commit.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="commit-repo"
                            >
                              {commit.repo}
                            </a>
                          )}
                          {REPO_TO_SITE[commit.repo] && (
                            <a 
                              href={REPO_TO_SITE[commit.repo]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="commit-live-link"
                              title="View live site"
                            >
                              ↗
                            </a>
                          )}
                          <span className="commit-time">{formatTimeAgo(commit.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {githubStats.recentCommits.length > 4 && (
                    <button 
                      className="github-toggle"
                      onClick={() => setShowAllCommits(!showAllCommits)}
                    >
                      {showAllCommits ? 'Show less' : `Show ${githubStats.recentCommits.length - 4} more commits`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Live Projects */}
      <section className="section-tight">
        <div className="container">
          <div className="section-header-row">
            <div className="section-label">Live Projects</div>
            <Link to="/projects" className="section-link">View all projects →</Link>
          </div>
          
          <div className="recent-projects">
            {liveProjects.map(project => (
              <Link key={project.id} to={`/projects/${project.id}`} className="recent-project-card">
                {project.image && (
                  <div className="recent-project-image">
                    <img src={project.image} alt={project.title} />
                  </div>
                )}
                <div className="recent-project-content">
                  <div className="recent-project-header">
                    <h2>{project.title}</h2>
                    {project.links?.live && (
                      <span className="live-badge">Live</span>
                    )}
                  </div>
                  <p className="recent-project-tagline">{project.tagline}</p>
                  <p className="recent-project-desc">{project.description}</p>
                  <div className="recent-project-tech">
                    {project.tech.slice(0, 5).map(t => <span key={t}>{t}</span>)}
                  </div>
                </div>
                <span className="recent-project-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="section-tight" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-label">Featured Projects</div>
          
          <div className="featured-projects">
            {featuredProjects.map(project => (
              <Link key={project.id} to={`/projects/${project.id}`} className="featured-project-card">
                {project.image && (
                  <div className="featured-project-image">
                    <img src={project.image} alt={project.title} />
                  </div>
                )}
                <div className="featured-project-content">
                  <h3>{project.title}</h3>
                  <p className="featured-project-tagline">{project.tagline}</p>
                  <p className="featured-project-desc">{project.description}</p>
                  <div className="featured-project-tech">
                    {project.tech.slice(0, 4).map(t => <span key={t}>{t}</span>)}
                  </div>
                </div>
                <span className="featured-project-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI Chat CTA - Bottom */}
      <section className="section-tight">
        <div className="container">
          <Link to="/chat" className="chat-cta">
            <div className="chat-cta-content">
              <h3>Have questions? Ask my AI assistant</h3>
              <p>Chat with an AI trained on my background, skills, and projects — or paste a job description for fit analysis</p>
            </div>
            <span className="chat-cta-btn">Try it →</span>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Home;