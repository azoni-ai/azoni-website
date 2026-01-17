import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import InteractiveBackground from '../components/InteractiveBackground';
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
  const heroRef = useRef(null);

  useEffect(() => {
    fetch('/.netlify/functions/github-stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setGithubStats(data);
      })
      .catch(err => console.error('Failed to fetch GitHub stats:', err));
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
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const mainProjects = [
    getProject('old-ways-today'),
    getProject('row-crew'),
    getProject('tcgdoku'),
    getProject('azoni-ai'),
    getProject('polymarket-tool'),
    getProject('dumarket'),
  ].filter(Boolean);

  const olderProjects = [
    getProject('dustbunny'),
    getProject('oli-fitness'),
  ].filter(Boolean);

  return (
    <Layout>
      <InteractiveBackground />
      
      <div className="home-page">
        {/* Hero */}
        <section className="hero" ref={heroRef}>
          <div className="hero-glow" style={{
            '--mouse-x': `${mousePos.x * 100}%`,
            '--mouse-y': `${mousePos.y * 100}%`,
          }} />
          
          <div className="container">
            <h1 className="hero-name">Charlton Smith</h1>
            <p className="hero-title">Senior Software Engineer · 7+ Years Experience</p>
            
            <div className="hero-meta">
              <span className="meta-item">M.S. Software Engineering</span>
              <span className="meta-dot">·</span>
              <span className="meta-item">Previously Capital One, T-Mobile</span>
              <span className="meta-dot">·</span>
              <span className="meta-item">Co-founded OLI Fitness</span>
            </div>

            <p className="hero-desc">
              Building web apps, AI tools, and side projects. Currently focused on full-stack development and shipping in public.
            </p>
          </div>
        </section>

        {/* GitHub Activity */}
        {githubStats && (
          <section className="activity-section">
            <div className="container">
              <div className="activity-card">
                <div className="activity-header">
                  <div className="activity-stats">
                    <div className="stat">
                      <span className="stat-num">{githubStats.today}</span>
                      <span className="stat-label">today</span>
                    </div>
                    <div className="stat">
                      <span className="stat-num">{githubStats.last7Days}</span>
                      <span className="stat-label">this week</span>
                    </div>
                    <div className="stat">
                      <span className="stat-num">{githubStats.last30Days}</span>
                      <span className="stat-label">this month</span>
                    </div>
                  </div>
                  <span className="activity-label">commits</span>
                </div>
                
                <div className="commits-list">
                  {githubStats.recentCommits?.slice(0, 6).map((commit, i) => (
                    <div key={`${commit.sha}-${i}`} className="commit-row">
                      <span className="commit-msg">{commit.message}</span>
                      <div className="commit-meta">
                        {commit.isPrivate ? (
                          <span className="commit-repo">{commit.repo}</span>
                        ) : (
                          <a href={commit.repoUrl} target="_blank" rel="noopener noreferrer" className="commit-repo">
                            {commit.repo}
                          </a>
                        )}
                        {REPO_TO_SITE[commit.repo] && (
                          <a href={REPO_TO_SITE[commit.repo]} target="_blank" rel="noopener noreferrer" className="commit-live">↗</a>
                        )}
                        <span className="commit-time">{formatTimeAgo(commit.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Projects */}
        <section className="projects-section">
          <div className="container">
            <div className="section-header">
              <h2>Projects</h2>
              <Link to="/projects" className="view-all">View all →</Link>
            </div>
            
            <div className="projects-grid">
              {mainProjects.map((project) => (
                <Link key={project.id} to={`/projects/${project.id}`} className="project-card">
                  <div className="project-top">
                    {project.image && <img src={project.image} alt="" className="project-icon" />}
                    {project.links?.live && <span className="project-live">Live</span>}
                  </div>
                  <h3>{project.title}</h3>
                  <p className="project-tagline">{project.tagline}</p>
                  <p className="project-desc">{project.description}</p>
                  <div className="project-tech">
                    {project.tech.map(t => <span key={t}>{t}</span>)}
                  </div>
                </Link>
              ))}
            </div>

            {/* Older Projects */}
            <div className="section-header secondary">
              <h2>Earlier Work</h2>
            </div>
            
            <div className="projects-grid">
              {olderProjects.map((project) => (
                <Link key={project.id} to={`/projects/${project.id}`} className="project-card">
                  <div className="project-top">
                    {project.image && <img src={project.image} alt="" className="project-icon" />}
                  </div>
                  <h3>{project.title}</h3>
                  <p className="project-tagline">{project.tagline}</p>
                  <p className="project-desc">{project.description}</p>
                  <div className="project-tech">
                    {project.tech.map(t => <span key={t}>{t}</span>)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Chat CTA */}
        <section className="cta-section">
          <div className="container">
            <Link to="/chat" className="cta-card">
              <div className="cta-icon">🤖</div>
              <div className="cta-text">
                <h3>Chat with my AI</h3>
                <p>Ask questions about my work or paste a job description for fit analysis</p>
              </div>
              <span className="cta-btn">Start Chat</span>
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Home;