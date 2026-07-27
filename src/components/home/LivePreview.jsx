import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/live-preview.css';

// A compact preview of the /live page for the home page: the top sites by
// traffic, the Chrome extensions and Discord bots (each links out to the store
// / bot), and the running agents incl. Moltbook (each links to where you can
// see it). Reuses the cached leaderboard / extensions / discord-bots endpoints,
// so no extra Firestore reads.

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

const brand = (name) => String(name || '').split('—')[0].trim() || name || '—';

// A panel of external resources (sites / extensions / bots): icon, name, a
// metric, and an ↗ that opens the destination.
const ResourcePanel = ({ title, linkTo, linkLabel, items }) => (
  <div className="lp-panel">
    <div className="lp-panel-head">
      <h3 className="lp-panel-title">{title}</h3>
      <Link to={linkTo} className="lp-panel-link">{linkLabel} &rarr;</Link>
    </div>
    <ul className="lp-list">
      {items === null && <li className="lp-empty">Loading&hellip;</li>}
      {items !== null && items.length === 0 && (
        <li className="lp-empty"><Link to={linkTo}>See on the live page &rarr;</Link></li>
      )}
      {(items || []).map((it) => (
        <li key={it.key}>
          <a href={it.href} target="_blank" rel="noopener noreferrer" className="lp-row lp-site-link">
            <span className="lp-site-icon" aria-hidden="true">
              {it.icon ? <img src={it.icon} alt="" loading="lazy" /> : <span>{it.label?.charAt(0)}</span>}
            </span>
            <span className="lp-site-name">{it.label}</span>
            {it.metric != null && <span className="lp-site-visits">{it.metric}</span>}
            <span className="lp-ext" aria-hidden="true">↗</span>
          </a>
        </li>
      ))}
    </ul>
  </div>
);

const LivePreview = () => {
  const [sites, setSites] = useState(null);
  const [exts, setExts] = useState(null);
  const [bots, setBots] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/leaderboard');
        if (!res.ok) throw new Error('bad');
        if (!(res.headers.get('content-type') || '').includes('application/json')) throw new Error('ct');
        const data = await res.json();
        const ranked = (Array.isArray(data?.sites) ? data.sites : [])
          .map((s) => ({ ...s, v: Number.isFinite(s.total) ? s.total : (s.visits?.d30 ?? s.visits?.d7 ?? 0) }))
          .sort((a, b) => b.v - a.v)
          .slice(0, 5)
          .map((s) => ({ key: s.key, label: s.label, icon: s.icon, href: s.url, metric: fmt(s.v) }));
        if (alive) setSites(ranked);
      } catch { if (alive) setSites([]); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/extensions');
        if (!res.ok) throw new Error('bad');
        if (!(res.headers.get('content-type') || '').includes('application/json')) throw new Error('ct');
        const data = await res.json();
        const list = (Array.isArray(data?.extensions) ? data.extensions : []).map((e) => ({
          key: e.key, label: brand(e.name), icon: e.icon, href: e.store, metric: fmt(e.users),
        }));
        if (alive) setExts(list);
      } catch { if (alive) setExts([]); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/discord-bots');
        if (!res.ok) throw new Error('bad');
        if (!(res.headers.get('content-type') || '').includes('application/json')) throw new Error('ct');
        const data = await res.json();
        const list = (Array.isArray(data?.bots) ? data.bots : []).map((b) => ({
          key: b.key, label: brand(b.name), icon: b.icon, href: b.link, metric: fmt(b.servers),
        }));
        if (alive) setBots(list);
      } catch { if (alive) setBots([]); }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <section className="live-preview" aria-labelledby="live-preview-heading">
      <div className="live-preview-inner">
        <header className="live-preview-head">
          <h2 id="live-preview-heading" className="live-preview-heading">Live</h2>
          <Link to="/live" className="live-preview-cta">Open live view &rarr;</Link>
        </header>

        <div className="live-preview-grid">
          <ResourcePanel title="Top sites" linkTo="/live?view=traffic&tab=sites" linkLabel="Traffic" items={sites} />

          <div className="lp-panel">
            <div className="lp-panel-head">
              <h3 className="lp-panel-title">Agents</h3>
              <Link to="/live?view=activity" className="lp-panel-link">Agent activity &rarr;</Link>
            </div>
            <ul className="lp-list">
              {AGENTS.map((a) => (
                <li key={a.label}>
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

          <ResourcePanel title="Chrome extensions" linkTo="/live?view=traffic&tab=extensions" linkLabel="Extensions" items={exts} />

          <ResourcePanel title="Discord bots" linkTo="/live?view=traffic&tab=bots" linkLabel="Discord bots" items={bots} />
        </div>
      </div>
    </section>
  );
};

export default LivePreview;
