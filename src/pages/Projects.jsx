import React from 'react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import { useProjects } from '../hooks/useProjects';
import '../styles/projects-warm.css';

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
      <div className="projects-page">
        <div className="projects-page-inner">
          <header className="projects-page-header">
            <h1 className="projects-heading">Projects</h1>
            <p className="projects-tagline">
              Production AI products, infrastructure, tooling, and hackathon experiments. Every
              project I&rsquo;ve shipped publicly.
            </p>
          </header>

          {categories && Object.keys(categories).length > 0 && (
            <nav className="projects-filters" aria-label="Filter projects">
              {Object.entries(categories).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeCategory(key)}
                  className={`projects-filter${activeCategory === key ? ' is-active' : ''}`}
                  aria-pressed={activeCategory === key}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}

          {loading ? (
            <p className="projects-status">Loading projects…</p>
          ) : (
            <>
              <div className="project-grid projects-grid">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>

              {filteredProjects.length === 0 && (
                <p className="projects-status">No projects in this category yet.</p>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Projects;
