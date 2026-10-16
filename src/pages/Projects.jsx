import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { useProjects } from '../hooks/useProjects';
import { profile } from '../data/profile';
import { selectedWorkIds, workStories } from '../data/workStories';
import '../styles/projects-warm.css';

const Projects = () => {
  const { projects: filteredProjects, allProjects, categories, activeCategory, changeCategory } = useProjects('all');
  const selected = selectedWorkIds.map((id) => allProjects.find((project) => project.id === id)).filter(Boolean);

  return (
    <Layout>
      <Seo title="Selected work" description="Selected AI infrastructure, product, and automation work by Charlton Smith. Practical examples of systems designed, built, and operated." path="/projects" />
      <div className="projects-page">
        <div className="projects-page-inner">
          <header className="projects-page-header">
            <p className="projects-eyebrow">Selected work</p>
            <h1 className="projects-heading">Built to solve<br />real problems.</h1>
            <p className="projects-tagline">A few examples of how I approach AI infrastructure, product development, and system design. These are independent products I&rsquo;ve built and operated.</p>
          </header>

          <div className="work-selected-grid">
            {selected.map((project) => {
              const story = workStories[project.id];
              return (
                <Link to={'/projects/' + project.id} className="work-selected-card" key={project.id}>
                  <div className="work-card-top">
                    <span className="work-card-logo" aria-hidden="true"><img src={project.image} alt="" loading="lazy" /></span>
                    <span className="work-card-label">{story.label}</span>
                  </div>
                  <p className="work-card-name">{project.title}</p>
                  <h2>{story.headline}</h2>
                  <p className="work-card-description">{story.outcome}</p>
                  <div className="work-card-bottom"><span>{story.relevance}</span><span className="work-card-read">Read the story <span aria-hidden="true">&rarr;</span></span></div>
                </Link>
              );
            })}
          </div>

          <aside className="work-client-note">
            <span className="projects-eyebrow">Client work</span>
            <p>My current consulting work is a principal software engineering engagement focused on AI. Client details are kept private; the examples above show my independent engineering work.</p>
          </aside>

          <details className="work-library">
            <summary><span>More products &amp; earlier work</span><span className="work-library-count">{allProjects.length} projects</span></summary>
            <div className="work-library-content">
              <p className="work-library-intro">A broader collection of products, prototypes, and experiments.</p>
              <nav className="projects-filters" aria-label="Filter all work">
                {Object.entries(categories).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => changeCategory(key)} className={'projects-filter' + (activeCategory === key ? ' is-active' : '')} aria-pressed={activeCategory === key}>{key === 'all' ? 'All work' : label}</button>
                ))}
              </nav>
              <p className="work-filter-count" aria-live="polite">{filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}</p>
              <div className="work-library-grid">
                {filteredProjects.map((project) => (
                  <Link key={project.id} to={'/projects/' + project.id} className="work-library-card">
                    <div className="work-library-card-title"><h3>{project.title}</h3>{project.archived && <span>Earlier work</span>}</div>
                    <p>{project.description || project.tagline}</p>
                    <span className="work-library-tech">{project.tech.slice(0, 3).join(' / ')}</span>
                    <span className="work-library-arrow" aria-hidden="true">&nearr;</span>
                  </Link>
                ))}
              </div>
              {filteredProjects.length === 0 && <p className="projects-status">No projects in this category yet.</p>}
            </div>
          </details>

          <section className="work-contact">
            <div><h2>Building something similar?</h2><p>Tell me about the problem you&rsquo;re working on.</p></div>
            <a href={'mailto:' + profile.email + '?subject=Project%20inquiry'} className="work-contact-button">Email about a project <span aria-hidden="true">&rarr;</span></a>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Projects;
