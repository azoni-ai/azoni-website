import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { profile } from '../data/profile';
import { projects } from '../data/projects';

const Home = () => {
  // Get specific projects by ID
  const getProject = (id) => projects.find(p => p.id === id);
  
  const recentProjects = [
    getProject('old-ways-today'),
    getProject('azoni-ai')
  ].filter(Boolean);
  
  const featuredProjects = [
    getProject('dustbunny'),
    getProject('oli-fitness')
  ].filter(Boolean);

  return (
    <Layout>
      {/* Hero - Compact */}
      <section className="hero-compact">
        <div className="container">
          <div className="hero-compact-content">
            <div className="hero-intro">
              <span className="status-badge">
                <span className="status-dot"></span>
                Open to opportunities
              </span>
              <h1>{profile.name}</h1>
              <p className="hero-tagline">
                Software Engineer · Building AI tools and full-stack applications
              </p>
              <div className="hero-links">
                <a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href={profile.links.resume} target="_blank" rel="noopener noreferrer">Resume</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Work */}
      <section className="section-tight">
        <div className="container">
          <div className="section-header-row">
            <div className="section-label">Recent Work</div>
            <Link to="/projects" className="section-link">View all →</Link>
          </div>
          
          <div className="recent-projects">
            {recentProjects.map(project => (
              <Link key={project.id} to={`/projects/${project.id}`} className="recent-project-card">
                <div className="recent-project-emoji">{getEmoji(project.id)}</div>
                <div className="recent-project-content">
                  <div className="recent-project-tag">{project.category.toUpperCase()}</div>
                  <h2>{project.title}</h2>
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

      {/* AI Chat CTA */}
      <section className="section-tight">
        <div className="container">
          <Link to="/chat" className="chat-banner">
            <div className="chat-banner-icon">💬</div>
            <div className="chat-banner-content">
              <strong>Ask me anything</strong>
              <span>Chat with an AI trained on my background — or paste a job description</span>
            </div>
            <span className="chat-banner-arrow">Try it →</span>
          </Link>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="section-tight" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-label">Featured Projects</div>
          
          <div className="featured-projects">
            {featuredProjects.map(project => (
              <Link key={project.id} to={`/projects/${project.id}`} className="featured-project-card">
                <div className="featured-project-emoji">{getEmoji(project.id)}</div>
                <div className="featured-project-content">
                  <h3>{project.title}</h3>
                  <p>{project.tagline}</p>
                  <div className="featured-project-tech">
                    {project.tech.slice(0, 3).map(t => <span key={t}>{t}</span>)}
                  </div>
                </div>
                <span className="featured-project-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

const getEmoji = (id) => {
  const emojis = {
    'old-ways-today': '🌿',
    'azoni-ai': '🤖',
    'dumarket': '📊',
    'rowing-tracker': '🚣',
    'dustbunny': '🐰',
    'oli-fitness': '🏋️',
    'scryfall-ai': '🃏',
    'discord-bots': '🤖',
  };
  return emojis[id] || '📁';
};

export default Home;
