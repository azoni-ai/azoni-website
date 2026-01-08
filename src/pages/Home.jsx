import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { profile } from '../data/profile';
import { projects } from '../data/projects';

const Home = () => {
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

            <div className="hero-links">
              <a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href={profile.links.resume} target="_blank" rel="noopener noreferrer">Resume</a>
              <a href={`mailto:${profile.email}`}>Contact</a>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Work */}
      <section className="section-tight">
        <div className="container">
          <div className="section-header-row">
            <div className="section-label">Recent Work</div>
            <Link to="/projects" className="section-link">View all projects →</Link>
          </div>
          
          <div className="recent-projects">
            {recentProjects.map(project => (
              <Link key={project.id} to={`/projects/${project.id}`} className="recent-project-card">
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
