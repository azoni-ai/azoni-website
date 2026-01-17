import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import InteractiveBackground from '../components/InteractiveBackground';
import ContributionGarden from '../components/ContributionGarden';
import {  } from '../data/profile';
import { projects } from '../data/projects';
import '../styles/bento.css';

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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(new Date());
  const heroRef = useRef(null);

  useEffect(() => {
    fetch('/.netlify/functions/github-stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setGithubStats(data);
      })
      .catch(err => console.error('Failed to fetch GitHub stats:', err));

    // Update time every minute
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getProject = (id) => projects.find(p => p.id === id);
  
  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const liveProjects = [
    getProject('old-ways-today'),
    getProject('row-crew'),
    getProject('tcgdoku'),
    getProject('azoni-ai'),
    getProject('polymarket-tool')
  ].filter(Boolean);

  const currentHour = time.getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Layout>
      <InteractiveBackground />
      
      <div className="bento-page">
        {/* Hero Section */}
        <section className="bento-hero" ref={heroRef}>
          <div className="hero-glow" style={{
            '--mouse-x': `${mousePos.x * 100}%`,
            '--mouse-y': `${mousePos.y * 100}%`,
          }} />
          
          <div className="container">
            <div className="hero-content">
              <div className="hero-greeting">{greeting}, I'm</div>
              <h1 className="hero-name">
                <span className="name-char">C</span>
                <span className="name-char">h</span>
                <span className="name-char">a</span>
                <span className="name-char">r</span>
                <span className="name-char">l</span>
                <span className="name-char">t</span>
                <span className="name-char">o</span>
                <span className="name-char">n</span>
              </h1>
              <p className="hero-role">
                <span className="role-line" />
                Full-Stack Engineer
                <span className="role-dot" />
                AI Builder
                <span className="role-dot" />
                Startup Founder
              </p>
            </div>
          </div>
        </section>

        {/* Bento Grid */}
        <section className="bento-section">
          <div className="container">
            <div className="bento-grid">
              
              {/* Stats Card - Large */}
              <div className="bento-card bento-stats">
                <div className="bento-card-inner glass">
                  <div className="stats-header">
                    <span className="stats-label">Currently</span>
                    <span className="stats-live-dot" />
                  </div>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-value">{githubStats?.today || '—'}</span>
                      <span className="stat-label">commits today</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{githubStats?.last7Days || '—'}</span>
                      <span className="stat-label">this week</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">7+</span>
                      <span className="stat-label">years exp</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">M.S.</span>
                      <span className="stat-label">SWE degree</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Garden Card */}
              <div className="bento-card bento-garden">
                <div className="bento-card-inner glass">
                  <div className="garden-header">
                    <span>Contribution Garden</span>
                    <span className="garden-count">{githubStats?.last30Days || 0} commits growing</span>
                  </div>
                  <div className="garden-canvas">
                    <ContributionGarden stats={githubStats || {}} />
                  </div>
                </div>
              </div>

              {/* Experience Card */}
              <div className="bento-card bento-experience">
                <div className="bento-card-inner glass">
                  <div className="experience-list">
                    <div className="exp-item">
                      <span className="exp-company">Capital One</span>
                      <span className="exp-role">Senior SWE</span>
                    </div>
                    <div className="exp-item">
                      <span className="exp-company">T-Mobile</span>
                      <span className="exp-role">SWE II</span>
                    </div>
                    <div className="exp-item">
                      <span className="exp-company">OLI Fitness</span>
                      <span className="exp-role">Co-Founder</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Commits */}
              <div className="bento-card bento-commits">
                <div className="bento-card-inner glass">
                  <div className="commits-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    <span>Latest Commits</span>
                  </div>
                  <div className="commits-list">
                    {githubStats?.recentCommits?.slice(0, 5).map((commit, i) => (
                      <div key={`${commit.sha}-${i}`} className="commit-row">
                        <span className="commit-msg">{commit.message}</span>
                        <div className="commit-info">
                          {commit.isPrivate ? (
                            <span className="commit-repo">{commit.repo}</span>
                          ) : (
                            <a href={commit.repoUrl} target="_blank" rel="noopener noreferrer" className="commit-repo">
                              {commit.repo}
                            </a>
                          )}
                          <span className="commit-time">{formatTimeAgo(commit.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Featured Project - Large */}
              {liveProjects[0] && (
                <Link to={`/projects/${liveProjects[0].id}`} className="bento-card bento-featured">
                  <div className="bento-card-inner glass">
                    <div className="featured-badge">Featured Project</div>
                    <div className="featured-content">
                      {liveProjects[0].image && (
                        <img src={liveProjects[0].image} alt="" className="featured-icon" />
                      )}
                      <h3>{liveProjects[0].title}</h3>
                      <p>{liveProjects[0].tagline}</p>
                    </div>
                    <div className="featured-tech">
                      {liveProjects[0].tech.slice(0, 4).map(t => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    <div className="featured-arrow">→</div>
                  </div>
                </Link>
              )}

              {/* Project Grid */}
              {liveProjects.slice(1, 4).map((project) => (
                <Link 
                  key={project.id} 
                  to={`/projects/${project.id}`} 
                  className="bento-card bento-project"
                >
                  <div className="bento-card-inner glass">
                    <div className="project-header">
                      {project.image && (
                        <img src={project.image} alt="" className="project-icon" />
                      )}
                      {project.links?.live && <span className="project-live">Live</span>}
                    </div>
                    <h4>{project.title}</h4>
                    <p>{project.tagline}</p>
                  </div>
                </Link>
              ))}

              {/* Chat CTA */}
              <Link to="/chat" className="bento-card bento-chat">
                <div className="bento-card-inner gradient">
                  <div className="chat-icon">💬</div>
                  <div className="chat-content">
                    <h4>Ask me anything</h4>
                    <p>Chat with my AI assistant</p>
                  </div>
                  <div className="chat-arrow">→</div>
                </div>
              </Link>

              {/* All Projects Link */}
              <Link to="/projects" className="bento-card bento-more">
                <div className="bento-card-inner">
                  <span>View all projects</span>
                  <span className="more-count">{projects.length}</span>
                </div>
              </Link>

            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Home;