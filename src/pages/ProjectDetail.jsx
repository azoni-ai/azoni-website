import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getProjectById } from '../data/projects';

const ProjectDetail = () => {
  const { id } = useParams();
  const project = getProjectById(id);

  if (!project) {
    return (
      <Layout>
        <section className="section" style={{ paddingTop: '120px', textAlign: 'center' }}>
          <div className="container">
            <h1>Project Not Found</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-md)' }}>
              The project you're looking for doesn't exist.
            </p>
            <Link to="/projects" className="btn btn-secondary" style={{ marginTop: 'var(--space-xl)' }}>
              ← Back to Projects
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container container-narrow">
          {/* Back Link */}
          <Link 
            to="/projects" 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-xl)',
              fontSize: '0.9rem'
            }}
          >
            ← Back to Projects
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <p style={{ 
              color: 'var(--accent-primary)', 
              marginBottom: 'var(--space-sm)',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              {project.tagline}
            </p>
            <h1 style={{ marginBottom: 'var(--space-lg)' }}>{project.title}</h1>
            
            <div className="tags" style={{ marginBottom: 'var(--space-xl)' }}>
              {project.tech.map((tech) => (
                <span key={tech} className="tag">{tech}</span>
              ))}
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {project.links.live && (
                <a 
                  href={project.links.live} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  View Live →
                </a>
              )}
              {project.links.github && (
                <a 
                  href={project.links.github} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  View Code
                </a>
              )}
              {project.links.paper && (
                <a 
                  href={project.links.paper} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  Read Paper
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Overview</h2>
            <div style={{ 
              color: 'var(--text-secondary)', 
              lineHeight: 1.8,
              whiteSpace: 'pre-line'
            }}>
              {project.longDescription}
            </div>
          </div>

          {/* Highlights */}
          {project.highlights && project.highlights.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Key Features</h2>
              <ul style={{ 
                color: 'var(--text-secondary)',
                paddingLeft: 'var(--space-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)'
              }}>
                {project.highlights.map((highlight, index) => (
                  <li key={index}>{highlight}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProjectDetail;
