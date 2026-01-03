import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import { profile } from '../data/profile';
import { getFeaturedProjects } from '../data/projects';

const Home = () => {
  const featuredProjects = getFeaturedProjects();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge animate-in">
              <span className="hero-badge-dot"></span>
              <span>Available for opportunities</span>
            </div>
            
            <h1 className="hero-title animate-in animate-delay-1">
              Hi, I'm <span className="text-gradient">{profile.name}</span>
            </h1>
            
            <p className="hero-description animate-in animate-delay-2">
              {profile.bio}
            </p>
            
            <div className="hero-actions animate-in animate-delay-3">
              <Link to="/chat" className="btn btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Chat with AI
              </Link>
              <Link to="/projects" className="btn btn-secondary">
                View Projects
              </Link>
              <a href={profile.links.resume} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                Download Resume →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Preview Section */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Ask Me Anything</h2>
            <p>
              I built an AI assistant trained on my background, skills, and projects. 
              Recruiters and hiring managers — paste a job description and see why I'm a fit.
            </p>
          </div>
          
          <div className="chat-preview" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div className="chat-preview-header">
              <div className="chat-preview-avatar"></div>
              <div>
                <div style={{ fontWeight: 600 }}>Azoni-GPT</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>AI Assistant</div>
              </div>
            </div>
            <div className="chat-preview-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                👋 I'm an AI trained on Charlton's experience. Try asking:
              </p>
              <ul style={{ color: 'var(--text-secondary)', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <li>"What's your experience with Python and AI?"</li>
                <li>"Tell me about the prediction market platform you built"</li>
                <li>"Why should we hire you for a senior engineer role?"</li>
              </ul>
            </div>
            <div className="chat-preview-input">
              <input type="text" placeholder="Type a message..." disabled />
              <Link to="/chat" className="btn btn-primary">Try it →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-header">
            <h2>Featured Projects</h2>
            <p>
              From prediction markets to AI agents to high-frequency trading systems — 
              here's what I've been building.
            </p>
          </div>
          
          <div className="project-grid">
            {featuredProjects.slice(0, 6).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          
          <div style={{ textAlign: 'center', marginTop: 'var(--space-2xl)' }}>
            <Link to="/projects" className="btn btn-secondary">
              View All Projects →
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats / Skills */}
      <section className="section">
        <div className="container">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-xl)',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--accent-primary)' }}>7+</div>
              <div style={{ color: 'var(--text-secondary)' }}>Years Experience</div>
            </div>
            <div>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--accent-primary)' }}>M.S.</div>
              <div style={{ color: 'var(--text-secondary)' }}>Software Engineering</div>
            </div>
            <div>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--accent-primary)' }}>1st</div>
              <div style={{ color: 'var(--text-secondary)' }}>Place Hackathon</div>
            </div>
            <div>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--accent-primary)' }}>ACM</div>
              <div style={{ color: 'var(--text-secondary)' }}>Published Research</div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;
