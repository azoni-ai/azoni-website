import React, { useState, useEffect } from 'react';

// Reuses the leaderboard card styles (leaderboard.css) with an extension-specific
// right-hand metric (install count) instead of the visitor stat cluster.

const fmt = (n) => {
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
};

const MEDAL = [null, 'gold', 'silver', 'bronze'];
const brand = (name) => String(name || '').split('—')[0].trim() || name || '—';

export default function ExtensionsBoard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/extensions');
        if (!res.ok) throw new Error('bad status');
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('not json');
        const j = await res.json();
        if (alive) setData(j);
      } catch {
        if (alive) setFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="lb-state">
        <div className="lb-spinner" />
        <p>Fetching install counts…</p>
      </div>
    );
  }

  const exts = data?.extensions || [];
  if (failed || !exts.length) {
    return (
      <div className="lb-state">
        <h3>No extensions yet</h3>
        <p>
          Published browser extensions show here, ranked by installs.
          {failed && ' (Live counts load on the deployed site.)'}
        </p>
      </div>
    );
  }

  const totalInstalls = exts.reduce((t, e) => t + (Number.isFinite(e.users) ? e.users : 0), 0);
  const max = exts.reduce((m, e) => Math.max(m, Number.isFinite(e.users) ? e.users : 0), 0);
  const showBar = exts.length > 1;

  const kpis = [
    { label: 'Total installs', value: fmt(totalInstalls) ?? '0' },
    { label: 'Extensions', value: exts.length },
    { label: 'Store', value: 'Chrome' },
    { label: 'Most installed', value: brand(exts[0]?.name), text: true },
  ];

  return (
    <>
      <div className="lb-kpis">
        {kpis.map((k) => (
          <div className="lb-kpi" key={k.label}>
            <span className={`lb-kpi-val${k.text ? ' is-text' : ''}`}>{k.value}</span>
            <span className="lb-kpi-label">{k.label}</span>
          </div>
        ))}
      </div>

      <ol className="lb-list">
        {exts.map((e, i) => {
          const rank = i + 1;
          const medal = MEDAL[rank] || null;
          const pct = max > 0 && Number.isFinite(e.users) ? Math.max(3, Math.round((e.users / max) * 100)) : 0;
          return (
            <li key={e.key} className={`lb-row${rank === 1 ? ' is-leader' : ''}`} style={{ '--row-color': e.color || '#8a8178' }}>
              <a
                className="lb-card-link"
                href={e.store}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${e.name} — open in the Chrome Web Store`}
              />
              <div className="lb-rank">
                <span className={`lb-rank-badge${medal ? ` ${medal}` : ''}`}>{rank}</span>
              </div>

              <span className="lb-icon" aria-hidden="true">
                {e.icon ? <img src={e.icon} alt="" loading="lazy" /> : <span className="lb-icon-fallback">{e.name?.charAt(0)}</span>}
              </span>

              <div className="lb-body">
                <div className="lb-name-row">
                  <span className="lb-name">
                    {e.name}
                    <span className="lb-ext" aria-hidden="true">↗</span>
                  </span>
                  <span className="lb-tag lb-tag-store">{e.browser || 'Chrome'}</span>
                  {e.category && <span className="lb-tag lb-tag-cat">{e.category}</span>}
                </div>
                {e.blurb && <p className="lb-blurb">{e.blurb}</p>}
                {showBar && (
                  <div className="lb-barwrap">
                    <div className="lb-bar" aria-hidden="true">
                      <div className="lb-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="lb-ext-metric">
                <span className="lb-ext-users">{fmt(e.users) ?? '—'}</span>
                <span className="lb-ext-users-label">installs</span>
              </div>
            </li>
          );
        })}
      </ol>

      {data?.updatedAt && (
        <p className="lb-footnote">Install counts scraped from the Chrome Web Store · cached ~6&nbsp;h.</p>
      )}
    </>
  );
}
