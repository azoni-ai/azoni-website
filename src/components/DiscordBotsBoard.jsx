import React, { useState, useEffect } from 'react';
import { projects } from '../data/projects';

const fabBot = projects.find((project) => project.id === 'fab-stats').discordBot;

// Discord bots I run, with the server and member counts each bot reports about
// itself. Uses the leaderboard row styles (leaderboard.css). A bot that hasn't
// reported yet shows the function's dated fallback, or "Not measured".

export default function DiscordBotsBoard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/discord-bots');
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
        <p>Loading server counts…</p>
      </div>
    );
  }

  const bots = data?.bots || [];
  if (failed || !bots.length) {
    return (
      <p className="lb-state-note" role="status">
        Live server counts are unavailable right now. As of {fabBot.asOf}, the FaB Stats bot was in {fabBot.servers} servers with {fabBot.members.toLocaleString('en-US')} members.
      </p>
    );
  }

  return (
    <ul className="lb-list">
      {bots.map((b) => {
        const servers = Number.isFinite(b.servers) ? b.servers : null;
        const members = Number.isFinite(b.members) ? b.members : null;
        const source = servers == null ? 'Not measured' : b.live ? 'Reported by the bot' : `As of ${fabBot.asOf}`;
        return (
          <li key={b.key} className="lb-row is-plain" style={{ '--row-color': b.color || '#8a8178' }}>
            <a
              className="lb-card-link"
              href={b.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${b.name}, ${b.openSource ? 'view on GitHub' : 'learn more'}`}
            />
            <span className="lb-icon" aria-hidden="true">
              {b.icon ? (
                <img src={b.icon} alt="" loading="lazy" />
              ) : (
                <span className="lb-icon-fallback">{b.name?.charAt(0)}</span>
              )}
            </span>

            <div className="lb-body">
              <div className="lb-name-row">
                <span className="lb-name">
                  {b.name}
                  <span className="lb-ext" aria-hidden="true">↗</span>
                </span>
                <span className="lb-tag lb-tag-store">{b.game || 'Discord'}</span>
                {b.openSource && <span className="lb-tag lb-tag-cat">Open source</span>}
              </div>
              {b.blurb && <p className="lb-blurb">{b.blurb}</p>}
            </div>

            <div className="lb-ext-metric">
              {servers != null && (
                <>
                  <span className="lb-ext-users">{servers.toLocaleString()}</span>
                  <span className="lb-ext-users-label">servers</span>
                  {members != null && <span className="lb-metric-note">{members.toLocaleString()} members</span>}
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
