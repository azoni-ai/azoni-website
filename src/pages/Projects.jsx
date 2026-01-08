import React from 'react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import { useProjects } from '../hooks/useProjects';

/**
 * Projects page demonstrating:
 * - Custom hooks for data management
 * - Memoized filtering via useProjects hook
 */
const Projects = () => {
  const { 
    projects: filteredProjects, 
    categories, 
    activeCategory, 
    changeCategory 
  } = useProjects('all');

  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container">
          {/* Header */}
          <div className="section-header">
            <h1>Projects</h1>
            <p>
              A collection of things I've built — from AI platforms to prediction markets 
              to high-frequency trading systems.
            </p>
          </div>

          {/* Category Filter */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-2xl)'
          }}>
            {Object.entries(categories).map(([key, label]) => (
              <button
                key={key}
                onClick={() => changeCategory(key)}
                className={`chat-mode-btn ${activeCategory === key ? 'active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Project Grid */}
          <div className="project-grid">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              No projects in this category yet.
            </p>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Projects;
