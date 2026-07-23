import React, { useMemo } from 'react';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import { useProjects } from '../hooks/useProjects';
import useProductMetrics from '../hooks/useProductMetrics';
import { timeAgo } from '../utils/boardStatus';
import '../styles/projects-warm.css';
import '../styles/products-warm.css';

const Projects = () => {
  const {
    projects: filteredProjects,
    categories,
    activeCategory,
    changeCategory,
    loading,
  } = useProjects('all');

  const productMetrics = useProductMetrics();
  const metricsMap = useMemo(() => productMetrics?.map || {}, [productMetrics]);

  // Live products up top (sorted by recent traffic), archived work below.
  const { live, archived } = useMemo(() => {
    const liveList = filteredProjects.filter((p) => !p.archived);
    const archivedList = filteredProjects.filter((p) => p.archived);
    liveList.sort((a, b) => {
      const av = metricsMap[a.id]?.visitors7d || 0;
      const bv = metricsMap[b.id]?.visitors7d || 0;
      if (av !== bv) return bv - av;
      if (a.featured !== b.featured) return b.featured ? 1 : -1;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
    return { live: liveList, archived: archivedList };
  }, [filteredProjects, metricsMap]);

  return (
    <Layout>
      <div className="projects-page">
        <div className="projects-page-inner">
          <header className="projects-page-header">
            <h1 className="projects-heading">Projects</h1>
            <p className="projects-tagline">
              Every product I run, live. Real traffic, real status, real usage &mdash; not
              screenshots. Click any card for the story behind it.
            </p>
            {productMetrics?.updatedAt && (
              <p className="projects-metrics-note">
                Metrics updated {timeAgo(new Date(productMetrics.updatedAt).getTime())} ago
              </p>
            )}
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
            <p className="projects-status">Loading projects&hellip;</p>
          ) : (
            <>
              {live.length > 0 && (
                <div className="product-grid">
                  {live.map((project) => (
                    <ProductCard key={project.id} project={project} metrics={metricsMap[project.id]} />
                  ))}
                </div>
              )}

              {archived.length > 0 && (
                <>
                  <h2 className="projects-archive-heading">Earlier work</h2>
                  <div className="product-grid">
                    {archived.map((project) => (
                      <ProductCard key={project.id} project={project} metrics={metricsMap[project.id]} />
                    ))}
                  </div>
                </>
              )}

              {live.length === 0 && archived.length === 0 && (
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
