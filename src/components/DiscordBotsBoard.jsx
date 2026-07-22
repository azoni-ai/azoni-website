import React, { useState, useEffect } from 'react';

// Discord-bot leaderboard tab — reuses the leaderboard card styles with the
// extension-style right-hand metric (server count instead of installs).

const fmt = (n) => {
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
};

const MEDAL = [null, 'gold', 'silver', 'bronze'];
const brand = (name) => String(name || '').split('—')[0].trim() || name || '—';

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
        <p>Counting servers…</p>
      </div>
    );
  }

  const bots = data?.bots || [];
  if (failed || !bots.length) {
    return (
      <div className="lb-state">
        <h3>No bots yet</h3>
        <p>
          Discord bots show here, ranked by the servers they live in.
          {failed && ' (Live counts load on the deployed site.)'}
        </p>
      </div>
    );
  }

  const totalServers = bots.reduce((t, b) => t + (Number.isFinite(b.servers) ? b.servers : 0), 0);
  const totalMembers = bots.reduce((t, b) => t + (Number.isFinite(b.members) ? b.members : 0), 0);
  const max = bots.reduce((m, b) => Math.max(m, Number.isFinite(b.servers) ? b.servers : 0), 0);
  const showBar = bots.length > 1;

  const kpis = [
    { label: 'Total servers', value: fmt(totalServers) ?? '0' },
    { label: 'Bots', value: bots.length },
    totalMembers > 0
      ? { label: 'Members reached', value: fmt(totalMembers) }
      : { label: 'Platform', value: 'Discord' },
    { label: 'Most adopted', value: brand(bots[0]?.name), text: true },
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
        {bots.map((b, i) => {
          const rank = i + 1;
          const medal = MEDAL[rank] || null;
          const pct =
            max > 0 && Number.isFinite(b.servers)
              ? Math.max(3, Math.round((b.servers / max) * 100))
              : 0;
          return (
            <li
              key={b.key}
              className={`lb-row${rank === 1 ? ' is-leader' : ''}`}
              style={{ '--row-color': b.color || '#8a8178' }}
            >
              <a
                className="lb-card-link"
                href={b.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${b.name} — ${b.openSource ? 'view on GitHub' : 'learn more'}`}
              />
              <div className="lb-rank">
                <span className={`lb-rank-badge${medal ? ` ${medal}` : ''}`}>{rank}</span>
              </div>

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
                  {!b.live && b.servers == null && <span className="lb-tag lb-tag-cat">New</span>}
                </div>
                {b.blurb && <p className="lb-blurb">{b.blurb}</p>}
                {showBar && (
                  <div className="lb-barwrap">
                    <div className="lb-bar" aria-hidden="true">
                      <div className="lb-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="lb-ext-metric">
                <span className="lb-ext-users">{fmt(b.servers) ?? '—'}</span>
                <span className="lb-ext-users-label">servers</span>
              </div>
            </li>
          );
        })}
      </ol>

      {data?.updatedAt && (
        <p className="lb-footnote">
          Server counts reported by each bot&rsquo;s daily beacon
          {bots.some((b) => !b.live) && ' · bots without a beacon yet show estimates or —'}.
        </p>
      )}
    </>
  );
}
