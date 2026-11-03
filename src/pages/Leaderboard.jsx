import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import ExtensionsBoard from '../components/ExtensionsBoard';
import DiscordBotsBoard from '../components/DiscordBotsBoard';
import { projects } from '../data/projects';
import '../styles/leaderboard.css';

// Usage for the products I run: extension users, Discord bot reach and site
// visits. Products are listed in the order of the projects page, never ranked.

// Beacon source key -> projects.js id. Launchpad apps use their project id as key.
const PROJECT_FOR_SITE = {
  azoni: 'azoni-ai',
  fabstats: 'fab-stats',
  embedroute: 'embedroute',
  oldwaystoday: 'old-ways-today',
  benchpressonly: 'bench-only',
  rowcrew: 'row-crew',
};
const SITE_ORDER = ['fabstats', 'azoni', 'oldwaystoday', 'rowcrew', 'benchpressonly', 'embedroute'];
const NAMES = { rowcrew: 'Row Crew' };

const projectFor = (key) => projects.find((p) => p.id === (PROJECT_FOR_SITE[key] || key));
// Unlisted projects stay off this page too.
const isListedSite = (key) => projectFor(key)?.visibility !== 'unlisted';
const orderOf = (key) => {
  const index = SITE_ORDER.indexOf(key);
  return index === -1 ? SITE_ORDER.length : index;
};

const formatStart = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const Leaderboard = ({ embedded = false }) => {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

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

  // Windowed counts need a composite index on site_visits(source, ts); until it
  // exists every window is null and the counts are reported as unavailable.
  const { measured, unmeasured, windowsLive } = useMemo(() => {
    const sites = (board?.sites || [])
      .filter((s) => isListedSite(s.key))
      .map((s, index) => ({ ...s, name: NAMES[s.key] || s.label, blurb: projectFor(s.key)?.tagline, index }))
      .sort((a, b) => orderOf(a.key) - orderOf(b.key) || a.index - b.index);
    const live = sites.some((s) => Number.isFinite(s.visits?.d30));
    return {
      windowsLive: live,
      measured: sites.filter((s) => s.visits?.d30 > 0),
      unmeasured: sites.filter((s) => !(s.visits?.d30 > 0)),
    };
  }, [board]);

  const startLabel = formatStart(board?.startDate);
  const count = (n) => (Number.isFinite(n) ? n.toLocaleString() : '—');

  const visits = loading ? (
    <div className="lb-state">
      <div className="lb-spinner" />
      <p>Loading visit counts…</p>
    </div>
  ) : failed || !windowsLive ? (
    <p className="lb-state-note" role="status">Visit counts are unavailable right now.</p>
  ) : (
    <>
      {measured.length > 0 && (
        <ul className="lb-list">
          {measured.map((s) => (
            <li key={s.key} className="lb-row is-plain" style={{ '--row-color': s.color || '#8a8178' }}>
              <a className="lb-card-link" href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${s.name}, open site`} />
              <span className="lb-icon" aria-hidden="true">
                {s.icon ? <img src={s.icon} alt="" loading="lazy" /> : <span className="lb-icon-fallback">{s.name?.charAt(0)}</span>}
              </span>
              <div className="lb-body">
                <div className="lb-name-row">
                  <span className="lb-name">
                    {s.name}
                    <span className="lb-ext" aria-hidden="true">↗</span>
                  </span>
                  {s.group === 'launchpad' && (
                    <span className="lb-tag lb-tag-lp">
                      <img src="/images/launchpad-rocket.svg" alt="" className="lb-tag-icon" />
                      Launchpad
                    </span>
                  )}
                </div>
                {s.blurb && <p className="lb-blurb">{s.blurb}</p>}
              </div>
              <dl className="lb-stats">
                <div className="lb-stat">
                  <dt className="lb-stat-label">7 days</dt>
                  <dd className="lb-stat-val">{count(s.visits?.d7)}</dd>
                </div>
                <div className="lb-stat">
                  <dt className="lb-stat-label">30 days</dt>
                  <dd className="lb-stat-val">{count(s.visits?.d30)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
      {unmeasured.length > 0 && (
        <p className="lb-unmeasured">
          <strong>No visits recorded in the last 30 days:</strong>{' '}
          {unmeasured.map((s) => s.name).join(', ')}.
        </p>
      )}
    </>
  );

  const body = (
    <div className={`lb-page${embedded ? ' is-embedded' : ''}`}>
      <div className="lb-container">
        {!embedded && (
          <header className="lb-header">
            <h1 className="lb-title">Usage</h1>
            <p className="lb-lede">Install, server and visit counts for the products I run.</p>
          </header>
        )}

        <section className="lb-section" aria-labelledby="usage-extensions-heading">
          <h2 id="usage-extensions-heading" className="lb-section-title">Chrome extension</h2>
          <ExtensionsBoard />
        </section>

        <section className="lb-section" aria-labelledby="usage-bots-heading">
          <h2 id="usage-bots-heading" className="lb-section-title">Discord bots</h2>
          <DiscordBotsBoard />
        </section>

        <section className="lb-section" aria-labelledby="usage-sites-heading">
          <h2 id="usage-sites-heading" className="lb-section-title">Site visits</h2>
          <p className="lb-section-note">
            Each site counts one visit per browser session{startLabel ? `, starting ${startLabel}` : ''}.
            The counts can include automated traffic. These counts cover the last 7 and 30 days.
          </p>
          {visits}
          {board?.updatedAt && !loading && !failed && windowsLive && (
            <p className="lb-footnote">Updated {new Date(board.updatedAt).toLocaleString()}. Cached for about 15 minutes.</p>
          )}
        </section>
      </div>
    </div>
  );
  return embedded ? body : <Layout>{body}</Layout>;
};

export default Leaderboard;
