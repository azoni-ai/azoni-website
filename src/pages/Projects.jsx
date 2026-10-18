import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Search, X } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import { useProjects } from '../hooks/useProjects';
import useProductMetrics from '../hooks/useProductMetrics';
import { selectedWorkIds, workStories } from '../data/workStories';
import { timeAgo } from '../utils/boardStatus';
import '../styles/products-warm.css';
import '../styles/projects-warm.css';

export default function Projects() {
  const { hash } = useLocation();
  const { projects, allProjects, categories, activeCategory, changeCategory, loading } = useProjects('all');
  const productMetrics = useProductMetrics();
  const [query, setQuery] = useState('');
  const collectionRef = useRef(null);
  useLayoutEffect(() => {
    if (hash === '#project-collection' && collectionRef.current) {
      collectionRef.current.open = true;
    }
  }, [hash]);
  const selected = selectedWorkIds.map((id) => allProjects.find((project) => project.id === id)).filter(Boolean);
  const visibleProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects.filter((project) => !term || [project.title, project.tagline, project.description, ...(project.tech || [])].join(' ').toLowerCase().includes(term));
  }, [projects, query]);
  const current = visibleProjects.filter((project) => !project.archived);
  const earlier = visibleProjects.filter((project) => project.archived);
  const updatedAt = productMetrics?.updatedAt ? new Date(productMetrics.updatedAt).getTime() : null;
  const reset = () => { setQuery(''); changeCategory('all'); };
  const renderProject = (project) => <ProductCard key={project.id} project={project} metrics={productMetrics?.map?.[project.id]} />;

  return (
    <Layout>
      <Seo title="Work" description="Selected software, AI systems, and data products designed, built, and operated by Charlton Smith at Azoni." path="/projects" />
      <div className="projects-page">
        <div className="projects-page-inner">
          <header className="projects-page-header">
            <p className="projects-eyebrow">Selected work</p>
            <h1 className="projects-heading">Ideas into<br /><span>working software.</span></h1>
            <p className="projects-tagline">A closer look at the products, AI systems, and data workflows I design, build, and operate.</p>
            <Link to="#project-collection" className="projects-collection-link" onClick={() => {
              if (collectionRef.current) {
                collectionRef.current.open = true;
                collectionRef.current.scrollIntoView({ block: 'start', behavior: 'instant' });
              }
            }}>Explore the full collection <ArrowRight size={16} /></Link>
          </header>

          <section className="projects-selected" aria-labelledby="projects-selected-heading">
            <div className="projects-section-heading">
              <h2 id="projects-selected-heading">Built and in use.</h2>
              <p>These are my own products. Each one shows how I approach a different engineering problem.</p>
            </div>
            {selected.map((project, index) => {
              const story = workStories[project.id];
              return <article key={project.id} className="projects-story">
                <div className="projects-story-identity">
                  <p className="projects-story-label"><span>{String(index + 1).padStart(2, '0')}</span>{story.label}</p>
                  <h3><Link to={`/projects/${project.id}`}>{project.title}</Link></h3>
                  <p className="projects-story-role">{story.role}</p>
                </div>
                <div className="projects-story-body">
                  <p className="projects-story-headline">{story.headline}</p>
                  <p className="projects-story-description">{story.approach}</p>
                  <div className="projects-story-links">
                    <Link to={`/projects/${project.id}`} className="projects-read-link">View project <ArrowRight size={16} /></Link>
                    {project.links?.live && <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="projects-live-link">Visit product <ArrowUpRight size={15} /></a>}
                  </div>
                </div>
              </article>;
            })}
          </section>

          <details className="projects-collection" id="project-collection" ref={collectionRef}>
            <summary>
              <span><span className="projects-collection-eyebrow">Keep exploring</span><span className="projects-collection-title">The full collection <span>({allProjects.length})</span></span></span>
              <span className="projects-collection-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="projects-collection-content">
              <p className="projects-collection-description">Products, smaller experiments, and earlier work. Search by name, technology, or what it does.</p>
              <div className="projects-search-wrap">
                <label className="projects-search" htmlFor="project-search"><Search size={18} aria-hidden="true" /><input id="project-search" type="search" aria-label="Search projects" placeholder="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
                {query && <button type="button" className="projects-clear" onClick={() => setQuery('')} aria-label="Clear search"><X size={16} /></button>}
              </div>
              <nav className="projects-filters" aria-label="Filter projects">
                {Object.entries(categories).map(([key, label]) => <button key={key} type="button" onClick={() => changeCategory(key)} className={`projects-filter${activeCategory === key ? ' is-active' : ''}`} aria-pressed={activeCategory === key}>{key === 'all' ? 'All' : label}</button>)}
              </nav>
              <div className="projects-results-summary">
                <p aria-live="polite">{visibleProjects.length} {visibleProjects.length === 1 ? 'project' : 'projects'}{activeCategory !== 'all' ? ` in ${categories[activeCategory]}` : ''}</p>
                {Number.isFinite(updatedAt) && <p>Usage updated {timeAgo(updatedAt)} ago</p>}
              </div>
              {loading ? <p className="projects-status">Loading projects&hellip;</p> : <>
                {current.length > 0 && <div className="product-grid">{current.map(renderProject)}</div>}
                {earlier.length > 0 && <><h3 className="projects-archive-heading">Earlier work</h3><div className="product-grid">{earlier.map(renderProject)}</div></>}
                {visibleProjects.length === 0 && <div className="projects-status"><p>No projects match your search.</p><button type="button" onClick={reset}>Clear search and filters <ArrowRight size={16} /></button></div>}
              </>}
            </div>
          </details>
        </div>
      </div>
    </Layout>
  );
}
