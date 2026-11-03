import React, { useState, useEffect } from 'react';
import { projects } from '../data/projects';

// Browser extensions I publish, with their Chrome Web Store user counts. Uses the
// leaderboard row styles (leaderboard.css). When the live scrape fails, a dated
// count is shown instead of the function's older fallback.

const gem = projects.find((project) => project.id === 'fab-stats').gemExporter;
const DATED = {
  [gem.key]: { users: gem.users, asOf: `As of ${gem.asOf}` },
};

const displayName = (name) => String(name || '').replace(/\s*—\s*/, ' ').trim();

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
        <p>Loading user counts…</p>
      </div>
    );
  }

  const exts = data?.extensions || [];
  if (failed || !exts.length) {
    return (
      <p className="lb-state-note" role="status">
        Live user counts are unavailable right now. As of {gem.asOf}, the FaB Stats GEM Exporter had {gem.users.toLocaleString('en-US')} users.
      </p>
    );
  }

  return (
    <ul className="lb-list">
      {exts.map((e) => {
        const dated = DATED[e.key];
        const users = e.live && Number.isFinite(e.users) ? e.users : dated?.users ?? null;
        const source = e.live ? 'Chrome Web Store' : dated ? dated.asOf : 'Not measured';
        const name = displayName(e.name);
        return (
          <li key={e.key} className="lb-row is-plain" style={{ '--row-color': e.color || '#8a8178' }}>
            <a
              className="lb-card-link"
              href={e.store}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name}, open in the Chrome Web Store`}
            />
            <span className="lb-icon" aria-hidden="true">
              {e.icon ? <img src={e.icon} alt="" loading="lazy" /> : <span className="lb-icon-fallback">{name.charAt(0)}</span>}
            </span>

            <div className="lb-body">
              <div className="lb-name-row">
                <span className="lb-name">
                  {name}
                  <span className="lb-ext" aria-hidden="true">↗</span>
                </span>
                <span className="lb-tag lb-tag-store">{e.browser || 'Chrome'}</span>
              </div>
              {e.blurb && <p className="lb-blurb">{e.blurb}</p>}
            </div>

            <div className="lb-ext-metric">
              {Number.isFinite(users) && (
                <>
                  <span className="lb-ext-users">{users.toLocaleString()}</span>
                  <span className="lb-ext-users-label">users</span>
                </>
              )}
              <span className="lb-metric-note">{source}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
