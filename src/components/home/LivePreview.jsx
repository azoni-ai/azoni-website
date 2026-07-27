import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/live-preview.css';

// A compact preview of the /live page for the home page: the top sites by
// traffic (each links out to the actual site) and the running agents (each
// links to where you can see it, including Moltbook). Reuses the cached
// leaderboard endpoint, so no extra Firestore reads.

const AGENTS = [
  { label: 'Conductor', desc: 'Orchestrates the other agents', to: '/live?view=activity' },
  { label: 'Scribe', desc: 'Writes the daily blog', to: '/blog' },
  { label: 'Azoni AI', desc: 'Answers questions about my work', to: '/chat' },
  { label: 'Moltbook', desc: 'Posts to a social network on its own', to: '/moltbook' },
];

const fmt = (n) => {
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
};

const LivePreview = () => {
  const [sites, setSites] = useState(null); // null = loading, [] = none/failed

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/leaderboard');
        if (!res.ok) throw new Error('bad status');
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('not json');
        const data = await res.json();
        if (!alive) return;
        const ranked = (Array.isArray(data?.sites) ? data.sites : [])
          .map((s) => ({ ...s, v: Number.isFinite(s.total) ? s.total : (s.visits?.d30 ?? s.visits?.d7 ?? 0) }))
          .sort((a, b) => b.v - a.v)
          .slice(0, 5);
        setSites(ranked);
      } catch {
        if (alive) setSites([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <section className="live-preview" aria-labelledby="live-preview-heading">
      <div className="live-preview-inner">
        <header className="live-preview-head">
          <div>
            <p className="live-preview-eyebrow">Live</p>
            <h2 id="live-preview-heading" className="live-preview-heading">Everything I run</h2>
          </div>
          <Link to="/live" className="live-preview-cta">Open live view &rarr;</Link>
        </header>

        <div className="live-preview-grid">
          <div className="lp-panel">
            <div className="lp-panel-head">
              <h3 className="lp-panel-title">Top sites</h3>
              <Link to="/live?view=traffic" className="lp-panel-link">Traffic &rarr;</Link>
            </div>
            <ul className="lp-list">
              {sites === null && (
                <li className="lp-empty">Loading&hellip;</li>
              )}
              {sites !== null && sites.length === 0 && (
                <li className="lp-empty">
                  <Link to="/live?view=traffic">See traffic on the live page &rarr;</Link>
                </li>
              )}
              {(sites || []).map((s) => (
                <li key={s.key} className="lp-site">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-row lp-site-link"
                  >
                    <span className="lp-site-icon" aria-hidden="true">
                      {s.icon ? <img src={s.icon} alt="" loading="lazy" /> : <span>{s.label?.charAt(0)}</span>}
                    </span>
                    <span className="lp-site-name">{s.label}</span>
                    <span className="lp-site-visits">{fmt(s.v) ?? '—'}</span>
                    <span className="lp-ext" aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lp-panel">
            <div className="lp-panel-head">
              <h3 className="lp-panel-title">Agents</h3>
              <Link to="/live?view=activity" className="lp-panel-link">Agent activity &rarr;</Link>
            </div>
            <ul className="lp-list">
              {AGENTS.map((a) => (
                <li key={a.label} className="lp-agent">
                  <Link to={a.to} className="lp-row lp-agent-link">
                    <span className="lp-agent-dot" aria-hidden="true" />
                    <span className="lp-agent-name">{a.label}</span>
                    <span className="lp-agent-desc">{a.desc}</span>
                    <span className="lp-arrow" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LivePreview;
