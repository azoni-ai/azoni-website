import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import { profile } from '../data/profile';
import { getFeaturedProjects } from '../data/projects';

const Home = () => {
  const featuredProjects = getFeaturedProjects();
  const [topProject, secondProject, ...otherProjects] = featuredProjects;

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

      {/* Recent Work - Hero Projects */}
      <section className="section-tight">
        <div className="container">
          <div className="section-label">Recent Work</div>
          
          <div className="featured-projects-hero">
            {topProject && (
              <Link to={`/projects/${topProject.id}`} className="project-hero-card">
                <div className="project-hero-emoji">{getEmoji(topProject.id)}</div>
                <div className="project-hero-content">
                  <div className="project-hero-tag">{topProject.category.toUpperCase()}</div>
                  <h2>{topProject.title}</h2>
                  <p>{topProject.tagline}</p>
                  <div className="project-hero-tech">
                    {topProject.tech.slice(0, 4).map(t => <span key={t}>{t}</span>)}
                  </div>
                </div>
                <span className="project-hero-arrow">→</span>
              </Link>
            )}
            
            {secondProject && (
              <Link to={`/projects/${secondProject.id}`} className="project-hero-card">
                <div className="project-hero-emoji">{getEmoji(secondProject.id)}</div>
                <div className="project-hero-content">
                  <div className="project-hero-tag">{secondProject.category.toUpperCase()}</div>
                  <h2>{secondProject.title}</h2>
                  <p>{secondProject.tagline}</p>
                  <div className="project-hero-tech">
                    {secondProject.tech.slice(0, 4).map(t => <span key={t}>{t}</span>)}
                  </div>
                </div>
                <span className="project-hero-arrow">→</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* AI Chat CTA - Inline Banner */}
      <section className="section-tight">
        <div className="container">
          <Link to="/chat" className="chat-banner">
            <div className="chat-banner-icon">💬</div>
            <div className="chat-banner-content">
              <strong>Ask me anything</strong>
              <span>Chat with an AI trained on my background — or paste a job description for fit analysis</span>
            </div>
            <span className="chat-banner-arrow">Try it →</span>
          </Link>
        </div>
      </section>

      {/* More Projects */}
      <section className="section-tight" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-header-row">
            <div className="section-label">More Projects</div>
            <Link to="/projects" className="section-link">View all →</Link>
          </div>
          
          <div className="project-grid-compact">
            {otherProjects.slice(0, 4).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

// Simple emoji getter (matches ProjectCard fallbacks)
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
