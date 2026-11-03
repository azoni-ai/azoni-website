import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import keepNamesTogether from '../utils/keepNamesTogether';

// A compact card for the Work page lists. It shows what a project is and, when
// projects.js has one, a dated figure. No live traffic or status telemetry.

const FALLBACK = {
  'fab-stats': 'FAB', 'old-ways-today': 'OW', 'azoni-ai': 'AI', 'azoni-mcp': 'MCP',
  'row-crew': 'RC', 'bench-only': 'BO', dustbunny: 'DB', 'oli-fitness': 'OLI',
};

// A project with no page of its own (redirectTo outside /projects/<id>) links
// straight to its live site instead.
export const hasOwnPage = (project) => !project.redirectTo;

function ProductCard({ project }) {
  const [imgError, setImgError] = React.useState(false);
  const proof = project.proof?.items?.[0];
  const stat = proof
    ? { value: proof.value, label: proof.label, note: `As of ${project.proof.asOf}` }
    : project.metric || null;
  const years = project.facts?.years;
  const external = !hasOwnPage(project) && project.links?.live;

  const body = <>
    <div className="product-card-head">
      <span className="product-card-icon" aria-hidden="true">
        {project.image && !imgError ? (
          <img src={project.image} alt="" loading="lazy" onError={() => setImgError(true)} />
        ) : (
          <span className="product-card-icon-fallback">{FALLBACK[project.id] || project.title.charAt(0)}</span>
        )}
      </span>
      <div className="product-card-titlewrap">
        <h3 className="product-card-title">{project.title}</h3>
        <p className="product-card-tagline">{keepNamesTogether(project.tagline)}</p>
      </div>
    </div>

    {(stat || years) && (
      <div className="product-card-metrics">
        {stat && (
          <div className="product-metric product-metric--impact">
            <span className="product-metric-value">{stat.value}</span>
            <span className="product-metric-label">{stat.label}{stat.note ? ` · ${stat.note}` : ''}</span>
          </div>
        )}
        {years && (
          <div className="product-metric">
            <span className="product-metric-value">{years}</span>
            <span className="product-metric-label">dates</span>
          </div>
        )}
      </div>
    )}

    <div className="product-card-foot">
      <div className="product-card-tech">
        {project.tech.slice(0, 4).map((t) => (
          <span key={t} className="product-card-chip">{t}</span>
        ))}
      </div>
      {external
        ? <span className="product-card-visit">Visit site <ArrowUpRight size={14} aria-hidden="true" /></span>
        : <span className="product-card-visit">View project <ArrowRight size={14} aria-hidden="true" /></span>}
    </div>
  </>;

  if (external) {
    return <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="product-card">{body}</a>;
  }
  return <Link to={`/projects/${project.id}`} className="product-card">{body}</Link>;
}

export default React.memo(ProductCard);
