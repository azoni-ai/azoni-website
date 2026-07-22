import React from 'react';
import { Link } from 'react-router-dom';
import { timeAgo } from '../../utils/boardStatus';

const STATUS_META = {
  fresh: { label: 'Fresh', color: '#4ade80' },
  due: { label: 'Due', color: '#d9a05b' },
  stale: { label: 'Stale', color: '#f87171' },
  snoozed: { label: 'Snoozed', color: '#818cf8' },
  untracked: { label: '—', color: null },
};

const HEALTH_COLOR = {
  healthy: '#4ade80',
  degraded: '#d9a05b',
  down: '#f87171',
  unknown: '#6f675c',
};

const fmt = (n) => (n == null ? '—' : n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString());
const fmtCost = (v) => (v == null ? '—' : v >= 10 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`);

function ChannelRow({ channel, data }) {
  if (!data || data.status === 'untracked') return null;
  const meta = STATUS_META[data.status] || STATUS_META.untracked;
  return (
    <div className="hub-channel-row">
      <span className="hub-channel-name">{channel}</span>
      <span
        className="hub-status-chip"
        style={meta.color ? { color: meta.color, borderColor: `${meta.color}55` } : undefined}
      >
        {meta.label}
      </span>
      <span className="hub-channel-last" title={data.title || undefined}>
        {data.lastMs ? (
          data.url ? (
            <a href={data.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              {timeAgo(data.lastMs)} ago ↗
            </a>
          ) : (
            `${timeAgo(data.lastMs)} ago`
          )
        ) : (
          'never'
        )}
      </span>
    </div>
  );
}

function SiteCard({ site, isOwner, onEdit }) {
  const [imgError, setImgError] = React.useState(false);
  const channels = Object.entries(site.content || {}).filter(([, d]) => d.status !== 'untracked');
  const healthColor = site.health ? HEALTH_COLOR[site.health.status] || HEALTH_COLOR.unknown : null;

  return (
    <article className="hub-card" style={{ '--site-color': site.color }}>
      <header className="hub-card-head">
        <span className="hub-card-icon">
          {site.icon && !imgError ? (
            <img src={site.icon} alt="" loading="lazy" onError={() => setImgError(true)} />
          ) : (
            <span aria-hidden="true">{site.name.charAt(0)}</span>
          )}
        </span>
        <div className="hub-card-title-wrap">
          <h3 className="hub-card-title">
            <a href={site.url} target="_blank" rel="noopener noreferrer">
              {site.name}
            </a>
          </h3>
          <span className="hub-card-group">{site.group}</span>
        </div>
        {healthColor && (
          <span
            className="hub-health-dot"
            style={{ background: healthColor }}
            title={`${site.health.status}${site.health.latencyMs ? ` · ${site.health.latencyMs}ms` : ''}`}
            aria-label={`Health: ${site.health.status}`}
            role="img"
          />
        )}
        {isOwner && (
          <button type="button" className="hub-card-edit" onClick={() => onEdit?.(site)} title="Edit site state">
            ✎
          </button>
        )}
      </header>

      {channels.length > 0 && (
        <div className="hub-card-channels">
          {channels.map(([channel, data]) => (
            <ChannelRow key={channel} channel={channel} data={data} />
          ))}
        </div>
      )}

      <div className="hub-card-stats">
        <span title="visitors, past 7 days">
          <strong>{fmt(site.traffic?.d7)}</strong> visits/7d
        </span>
        <span title={site.cost30d == null ? 'costs tracked elsewhere' : 'AI spend, past 30 days'}>
          <strong>{fmtCost(site.cost30d)}</strong> ai/30d
        </span>
        <span title="open board tasks">
          <strong>{site.openTasks == null ? '—' : site.openTasks}</strong> tasks
        </span>
        {!site.health && site.lastSeenMs && (
          <span title="last activity event">
            <strong>{timeAgo(site.lastSeenMs)}</strong> ago
          </span>
        )}
      </div>

      {site.notes && <p className="hub-card-notes">{site.notes}</p>}

      <footer className="hub-card-links">
        <a href={site.url} target="_blank" rel="noopener noreferrer">
          Visit ↗
        </a>
        {site.composeUrl && (
          <a href={site.composeUrl} target="_blank" rel="noopener noreferrer">
            {site.composeLabel || 'Composer'} ↗
          </a>
        )}
        <Link to="/board">Board</Link>
      </footer>
    </article>
  );
}

export default React.memo(SiteCard);
