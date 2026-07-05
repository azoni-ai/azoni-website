import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import '../styles/leaderboard.css';

const WINDOW_OPTS = [
  { key: 'd1', label: '24h' },
  { key: 'd7', label: '7 days' },
  { key: 'd30', label: '30 days' },
];

const fmt = (n) => {
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
};

const formatStart = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const Leaderboard = () => {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [win, setWin] = useState('d1');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/leaderboard');
        if (!res.ok) throw new Error('bad status');
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('not json');
        const data = await res.json();
        if (alive) setBoard(data);
      } catch {
        if (alive) setFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Sort by the active window, then by all-time total as a tiebreaker so sites
  // with history still order sensibly before the windowed index is live.
  const rows = useMemo(() => {
    const sites = board?.sites || [];
    const val = (s) => (Number.isFinite(s.visits?.[win]) ? s.visits[win] : -1);
    const tot = (s) => (Number.isFinite(s.total) ? s.total : -1);
    return [...sites].sort((a, b) => val(b) - val(a) || tot(b) - tot(a));
  }, [board, win]);

  const maxVal = useMemo(
    () => rows.reduce((m, s) => Math.max(m, Number.isFinite(s.visits?.[win]) ? s.visits[win] : 0), 0),
    [rows, win]
  );

  const totalVisitors = useMemo(
    () => rows.reduce((sum, s) => sum + (Number.isFinite(s.visits?.[win]) ? s.visits[win] : 0), 0),
    [rows, win]
  );

  const startLabel = formatStart(board?.startDate);

  return (
    <Layout>
      <div className="lb-page">
        <div className="lb-container">
          <header className="lb-header">
            <p className="lb-eyebrow">Portfolio</p>
            <h1 className="lb-title">Traffic leaderboard</h1>
            <p className="lb-lede">
              Every site I run, ranked by visitors. One shared beacon per site,
              aggregated live. Pick a window.
            </p>

            {startLabel && (
              <p className="lb-since">
                <span className="lb-since-dot" aria-hidden="true" />
                Tracking since {startLabel}
              </p>
            )}

            <div className="lb-controls">
              <div className="lb-windows" role="tablist" aria-label="Time window">
                {WINDOW_OPTS.map((w) => (
                  <button
                    key={w.key}
                    role="tab"
                    aria-selected={win === w.key}
                    className={`lb-window-btn ${win === w.key ? 'active' : ''}`}
                    onClick={() => setWin(w.key)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              {Number.isFinite(totalVisitors) && totalVisitors > 0 && (
                <div className="lb-total">
                  <span className="lb-total-value">{fmt(totalVisitors)}</span>
                  <span className="lb-total-label">visits · {WINDOW_OPTS.find((w) => w.key === win).label}</span>
                </div>
              )}
            </div>
          </header>

          {loading ? (
            <div className="lb-state">
              <div className="lb-spinner" />
              <p>Tallying visits…</p>
            </div>
          ) : failed || !board?.sites?.length ? (
            <div className="lb-state">
              <h3>No traffic data yet</h3>
              <p>
                Once each site is reporting visits, the board fills in here.
                {failed && ' (Live data loads on the deployed site.)'}
              </p>
            </div>
          ) : (
            <ol className="lb-list">
              {rows.map((s, i) => {
                const raw = s.visits?.[win];
                const has = Number.isFinite(raw);
                const pct = maxVal > 0 && has ? Math.max(2, Math.round((raw / maxVal) * 100)) : 0;
                const totalStr = fmt(s.total);
                return (
                  <li key={s.key} className="lb-row" style={{ '--row-color': s.color || '#8a8178' }}>
                    <span className="lb-rank">{i + 1}</span>
                    <span className="lb-icon" aria-hidden="true">
                      {s.icon ? <img src={s.icon} alt="" loading="lazy" /> : <span className="lb-icon-fallback">{s.label?.charAt(0)}</span>}
                    </span>
                    <div className="lb-body">
                      <div className="lb-name-row">
                        <a className="lb-name" href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.label} <span className="lb-ext" aria-hidden="true">↗</span>
                        </a>
                        {s.group === 'launchpad' && (
                          <span className="lb-tag lb-tag-lp">
                            <img src="/images/launchpad-rocket.svg" alt="" className="lb-tag-icon" />
                            Launchpad
                          </span>
                        )}
                      </div>
                      <div className="lb-bar" aria-hidden="true">
                        <div className="lb-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="lb-metric">
                      <span className="lb-count">{has ? fmt(raw) : '—'}</span>
                      <span className="lb-total-views">{totalStr != null ? totalStr : '0'} total</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {board?.updatedAt && !loading && !failed && (
            <p className="lb-footnote">
              Updated {new Date(board.updatedAt).toLocaleString()} · cached ~15&nbsp;min ·
              one session beacon per site.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
