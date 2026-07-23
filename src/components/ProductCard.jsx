import React from 'react';
import { Link } from 'react-router-dom';
import { timeAgo } from '../utils/boardStatus';

// One card = marketing (what it is) + live metrics (how it's doing). Live data
// comes from useProductMetrics (may be null while loading or for archived work).

const STATUS_COLOR = {
  healthy: '#4ade80',
  up: '#4ade80',
  degraded: '#d9a05b',
  down: '#f87171',
  unknown: '#8d8478',
};

const fmt = (n) => {
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
};

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Visit';
  }
};

const FALLBACK = {
  'fab-stats': 'FAB', 'old-ways-today': 'OW', 'azoni-ai': 'AI', 'azoni-mcp': 'MCP',
  'row-crew': 'RC', 'bench-only': 'BO', dustbunny: 'DB', 'oli-fitness': 'OLI',
};

function ProductCard({ project, metrics }) {
  const [imgError, setImgError] = React.useState(false);
  const archived = !!project.archived;
  const status = metrics?.status;
  const statusColor = status ? STATUS_COLOR[status] || STATUS_COLOR.unknown : null;

  // Impact stat: live number wins, else the project's static headline metric.
  const impact = metrics?.impact
    ? { ...metrics.impact, live: true }
    : project.metric
      ? { ...project.metric, live: false }
      : null;

  const visitors = fmt(metrics?.visitors7d);
  const lastMs = metrics?.lastActivityMs;

  return (
    <Link
      to={`/projects/${project.id}`}
      className={`product-card${archived ? ' is-archived' : ''}`}
    >
      <div className="product-card-head">
        <span className="product-card-icon" aria-hidden="true">
          {project.image && !imgError ? (
            <img src={project.image} alt="" loading="lazy" onError={() => setImgError(true)} />
          ) : (
            <span className="product-card-icon-fallback">{FALLBACK[project.id] || project.title.charAt(0)}</span>
          )}
        </span>
        <div className="product-card-titlewrap">
          <h3 className="product-card-title">
            {project.title}
            {statusColor && !archived && (
              <span
                className="product-card-status"
                style={{ background: statusColor }}
                title={`Status: ${status}`}
                role="img"
                aria-label={`Status: ${status}`}
              />
            )}
          </h3>
          <p className="product-card-tagline">{project.tagline}</p>
        </div>
        {archived && <span className="product-card-tag">Archived</span>}
      </div>

      {(impact || visitors || lastMs) && (
        <div className="product-card-metrics">
          {impact && (
            <div className="product-metric product-metric--impact">
              <span className="product-metric-value">
                {impact.live && <span className="product-metric-live" aria-label="live" />}
                {impact.value}
              </span>
              <span className="product-metric-label">{impact.label}</span>
            </div>
          )}
          {visitors && (
            <div className="product-metric">
              <span className="product-metric-value">{visitors}</span>
              <span className="product-metric-label">visitors / 7d</span>
            </div>
          )}
          {lastMs && (
            <div className="product-metric">
              <span className="product-metric-value">{timeAgo(lastMs)}</span>
              <span className="product-metric-label">last active</span>
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
        {project.links?.live && (
          <span className="product-card-visit">{hostOf(project.links.live)} ↗</span>
        )}
      </div>
    </Link>
  );
}

export default React.memo(ProductCard);
