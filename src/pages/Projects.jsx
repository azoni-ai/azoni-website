import React from 'react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import { useProjects } from '../hooks/useProjects';

/**
 * Projects page with loading state to prevent flash
 */
const Projects = () => {
  const {
    projects: filteredProjects,
    categories,
    activeCategory,
    changeCategory,
    loading
  } = useProjects('all');

  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container">
          <div className="section-header">
            <h1>Projects</h1>
            <p>
              Selected production work across AI products, platform infrastructure,
              developer tooling, and consumer applications.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-2xl)'
            }}
          >
            {Object.entries(categories || {}).map(([key, label]) => (
              <button
                key={key}
                onClick={() => changeCategory(key)}
                className={`chat-mode-btn ${activeCategory === key ? 'active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: 'var(--space-2xl)'
              }}
            >
              <p style={{ color: 'var(--text-muted)' }}>Loading projects...</p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Projects;
