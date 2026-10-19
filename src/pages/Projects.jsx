import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Search, X } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import WorkPreview from '../components/WorkPreview';
import { useProjects } from '../hooks/useProjects';
import useProductMetrics from '../hooks/useProductMetrics';
import { selectedWorkIds, workStories } from '../data/workStories';
import { timeAgo } from '../utils/boardStatus';
import '../styles/products-warm.css';
import '../styles/projects-warm.css';

export default function Projects() {
  const { hash, search } = useLocation();
  const navigate = useNavigate();
  const { allProjects, categories, loading } = useProjects('all');
  const productMetrics = useProductMetrics();
  const params = new URLSearchParams(search);
  const query = params.get('q') || '';
  const requestedCategory = params.get('category');
  const activeCategory = Object.prototype.hasOwnProperty.call(categories, requestedCategory) ? requestedCategory : 'all';
  const setFilters = (nextQuery, nextCategory) => {
    const next = new URLSearchParams(search);
    if (nextQuery) next.set('q', nextQuery); else next.delete('q');
    if (nextCategory !== 'all') next.set('category', nextCategory); else next.delete('category');
    navigate({ pathname: '/projects', search: next.toString(), hash: '#project-collection' }, { replace: true });
  };
  const collectionRef = useRef(null);
  useLayoutEffect(() => {
    if (hash === '#project-collection' && collectionRef.current) {
      collectionRef.current.open = true;
    }
  }, [hash]);
  const selected = selectedWorkIds.map((id) => allProjects.find((project) => project.id === id)).filter(Boolean);
  const visibleProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    return allProjects.filter((project) => (activeCategory === 'all' || project.category === activeCategory) && (!term || [project.title, project.tagline, project.description, workStories[project.id]?.summary, ...(project.tech || [])].join(' ').toLowerCase().includes(term)));
  }, [allProjects, activeCategory, query]);
  const current = visibleProjects.filter((project) => !project.archived);
  const earlier = visibleProjects.filter((project) => project.archived);
  const updatedAt = productMetrics?.updatedAt ? new Date(productMetrics.updatedAt).getTime() : null;
  const reset = () => setFilters('', 'all');
  const workReturn = `/projects${search}#project-collection`;
  const renderProject = (project) => <ProductCard key={project.id} project={project} metrics={productMetrics?.map?.[project.id]} workReturn={workReturn} />;

  return (
    <Layout>
      <Seo title="Work" description="Selected software, AI systems, and data products designed, built, and operated by Charlton Smith at Azoni." path="/projects" />
      <div className="projects-page">
        <div className="projects-page-inner">
          <header className="projects-page-header">
            <p className="projects-eyebrow">Selected work</p>
            <h1 className="projects-heading">Software I&rsquo;ve <span>built.</span></h1>
            <p className="projects-tagline">Independent products across AI, analytics, and everyday tools. I design, build, and run them.</p>
            <Link to={workReturn} className="projects-collection-link" onClick={() => {
              if (collectionRef.current) {
                collectionRef.current.open = true;
                collectionRef.current.scrollIntoView({ block: 'start', behavior: 'instant' });
              }
            }}>Explore the full collection <ArrowRight size={16} /></Link>
          </header>

          <section className="projects-selected" aria-labelledby="projects-selected-heading">
            <h2 id="projects-selected-heading" className="projects-section-title">A few recent projects</h2>
            <div className="projects-selected-grid">{selected.map((project, index) => {
              const story = workStories[project.id];
              return <article key={project.id} className="projects-story">
                <Link to={`/projects/${project.id}`} className="projects-story-main" aria-label={`View ${project.title} project`}>
                  <WorkPreview story={story} showCaption={false} priority={index < 2} />
                  <p className="projects-story-label">{story.label}</p>
                  <div className="projects-story-heading"><h3>{project.title}</h3><ArrowRight size={20} aria-hidden="true" /></div>
                  <p className="projects-story-description">{story.summary}</p>
                </Link>
                <div className="projects-story-links"><span>Designed, built &amp; operated by me</span>{project.links?.live && <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="projects-live-link" aria-label={`Visit ${project.title} website (opens in a new tab)`}>Visit website <ArrowUpRight size={15} aria-hidden="true" /></a>}</div>
              </article>;
            })}</div>
          </section>

          <details className="projects-collection" id="project-collection" ref={collectionRef}>
            <summary>
              <span><span className="projects-collection-eyebrow">Keep exploring</span><span className="projects-collection-title">The full collection <span>({allProjects.length})</span></span></span>
              <span className="projects-collection-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="projects-collection-content">
              <p className="projects-collection-description">Products, smaller experiments, and earlier work. Search by name, technology, or what it does.</p>
              <div className="projects-search-wrap">
                <label className="projects-search" htmlFor="project-search"><Search size={18} aria-hidden="true" /><input id="project-search" type="search" aria-label="Search projects" placeholder="Search projects" value={query} onChange={(event) => setFilters(event.target.value, activeCategory)} /></label>
                {query && <button type="button" className="projects-clear" onClick={() => setFilters('', activeCategory)} aria-label="Clear search"><X size={16} /></button>}
              </div>
              <nav className="projects-filters" aria-label="Filter projects">
                {Object.entries(categories).map(([key, label]) => <button key={key} type="button" onClick={() => setFilters(query, key)} className={`projects-filter${activeCategory === key ? ' is-active' : ''}`} aria-pressed={activeCategory === key}>{key === 'all' ? 'All' : label}</button>)}
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
