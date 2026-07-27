import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import ExtensionsBoard from '../components/ExtensionsBoard';
import DiscordBotsBoard from '../components/DiscordBotsBoard';
import '../styles/leaderboard.css';

// Short window labels (the long "7 days / 30 days" ran too wide). `longer` points
// at the next window up so we can derive a momentum arrow from the two counts.
const WINDOW_OPTS = [
  { key: 'd1', label: '24h', full: 'past 24 hours', days: 1, longer: 'd7' },
  { key: 'd7', label: '7d', full: 'past 7 days', days: 7, longer: 'd30' },
  { key: 'd30', label: '30d', full: 'past 30 days', days: 30, longer: null },
];

// Soft one-line headline per site, keyed by beacon source key. Sourced from the
// site's own tagline (data/projects.js) / launchpad apps.json, trimmed to fit.
const BLURBS = {
  azoni: 'This site — chatbot, agents, and the stack underneath',
  fabstats: 'Match stats & Discord bot for the Flesh and Blood TCG',
  embedroute: 'Embedding API gateway — one key, four providers',
  oldwaystoday: 'Non-toxic swaps for the modern household',
  benchpressonly: 'Strength app that writes the program for you',
  rowcrew: 'Rowing tracker with photo-verified meters',
  meeplematch: 'Swipe to discover your next board game',
  blackdiamond: 'Exterior cleaning company site & quote flow',
  benchmark: 'Turn any achievement into a bench-press max',
  repmatch: 'Workout rep-equivalence calculator for friends',
  'crypto-tax-2025': 'Wallet-first crypto tax reconstruction for 2025',
  pyroguard: 'AI fire & life-safety inspection platform',
  dayrun: 'An opt-in calendar & interview pipeline',
  macromarket: 'Foods ranked by cost per gram of protein',
};

const MEDAL = [null, 'gold', 'silver', 'bronze'];

const fmt = (n) => {
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
};

const formatStart = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const Leaderboard = ({ embedded = false, initialTab = 'sites' }) => {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [win, setWin] = useState('d1');
  const [tab, setTab] = useState(initialTab); // 'sites' | 'extensions' | 'bots'

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

  const winOpt = WINDOW_OPTS.find((w) => w.key === win) || WINDOW_OPTS[0];

  // Enrich every row with the effective metric (windowed count, or all-time total
  // as a fallback while the composite index is still building), plus share of
  // traffic and a momentum arrow vs the prior period.
  const rows = useMemo(() => {
    const sites = board?.sites || [];

    const effective = (s) => {
      const v = s.visits?.[win];
      if (Number.isFinite(v)) return v;
      return Number.isFinite(s.total) ? s.total : 0;
    };

    const withTrend = (s) => {
      const cur = s.visits?.[win];
      const longerKey = winOpt.longer;
      const lon = longerKey ? s.visits?.[longerKey] : null;
      if (!Number.isFinite(cur) || !Number.isFinite(lon)) return null;
      const longerOpt = WINDOW_OPTS.find((w) => w.key === longerKey);
      const priorDays = longerOpt.days - winOpt.days;
      const priorTotal = lon - cur;
      if (priorDays <= 0 || priorTotal <= 0) return null; // no prior history yet
      const curRate = cur / winOpt.days;
      const priorRate = priorTotal / priorDays;
      if (priorRate <= 0) return null;
      const pct = Math.round(((curRate - priorRate) / priorRate) * 100);
      return Math.abs(pct) >= 5 ? pct : null; // hide sub-5% noise
    };

    const list = sites.map((s) => ({
      ...s,
      value: effective(s),
      windowed: Number.isFinite(s.visits?.[win]),
      trend: withTrend(s),
    }));

    list.sort((a, b) => b.value - a.value || (b.total || 0) - (a.total || 0));

    const sum = list.reduce((t, s) => t + s.value, 0);
    const max = list.reduce((m, s) => Math.max(m, s.value), 0);

    return list.map((s) => ({
      ...s,
      share: sum > 0 ? (s.value / sum) * 100 : 0,
      pct: max > 0 ? Math.max(3, Math.round((s.value / max) * 100)) : 0,
    }));
  }, [board, win, winOpt]);

  // Windowed counts need a composite index on site_visits(source, ts). Until it
  // exists the function returns null for every window, so detect that and lean on
  // all-time totals instead of showing a wall of "—".
  const windowsLive = useMemo(() => {
    const sites = board?.sites || [];
    return sites.some((s) => ['d1', 'd7', 'd30'].some((k) => Number.isFinite(s.visits?.[k])));
  }, [board]);

  // The stat cell to emphasise: the selected window when live, else all-time.
  const heroKey = windowsLive ? win : 'all';

  const summary = useMemo(() => {
    const windowVisits = rows.reduce((t, s) => t + s.value, 0);
    const allTime = rows.reduce((t, s) => t + (Number.isFinite(s.total) ? s.total : 0), 0);
    const launchpad = rows.filter((s) => s.group === 'launchpad').length;
    return { windowVisits, allTime, sites: rows.length, launchpad };
  }, [rows]);

  const startLabel = formatStart(board?.startDate);

  const kpis = windowsLive
    ? [
        { label: `Visits · ${winOpt.label}`, value: fmt(summary.windowVisits) ?? '0' },
        { label: 'All-time', value: fmt(summary.allTime) ?? '0' },
        { label: 'Sites tracked', value: summary.sites || '—' },
        { label: 'Current leader', value: rows[0]?.label ?? '—', text: true },
      ]
    : [
        { label: 'All-time visits', value: fmt(summary.allTime) ?? '0' },
        { label: 'Sites tracked', value: summary.sites || '—' },
        { label: 'Launchpad apps', value: summary.launchpad || '—' },
        { label: 'Current leader', value: rows[0]?.label ?? '—', text: true },
      ];

  const hasRows = rows.length > 0;

  const body = (
      <div className={`lb-page${embedded ? ' is-embedded' : ''}`}>
        <div className="lb-container">
          <header className="lb-header">
            {!embedded && (
              <>
                <p className="lb-eyebrow">Portfolio</p>
                <h1 className="lb-title">
                  {tab === 'sites'
                    ? 'Traffic leaderboard'
                    : tab === 'extensions'
                      ? 'Extension leaderboard'
                      : 'Discord bot leaderboard'}
                </h1>
                <p className="lb-lede">
                  {tab === 'sites'
                    ? 'Every site I run, ranked by visitors — one shared beacon per site, aggregated live.'
                    : tab === 'extensions'
                      ? "Browser extensions I've shipped, ranked by installs from the Chrome Web Store."
                      : "Discord bots I run, ranked by the servers they live in — counts reported by the bots themselves."}
                </p>
              </>
            )}

            <div className="lb-tabs" role="tablist" aria-label="Leaderboard">
              {[
                ['sites', 'Sites'],
                ['extensions', 'Extensions'],
                ['bots', 'Discord Bots'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  className={`lb-tab ${tab === k ? 'active' : ''}`}
                  onClick={() => setTab(k)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'sites' && (
              <>
                {startLabel && (
                  <p className="lb-since">
                    <span className="lb-since-dot" aria-hidden="true" />
                    Tracking since {startLabel}
                  </p>
                )}

                {hasRows && !loading && (
                  <div className="lb-kpis">
                    {kpis.map((k) => (
                      <div className="lb-kpi" key={k.label}>
                        <span className={`lb-kpi-val${k.text ? ' is-text' : ''}`}>{k.value}</span>
                        <span className="lb-kpi-label">{k.label}</span>
                      </div>
                    ))}
                  </div>
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
                  <p className="lb-sortnote">
                    {windowsLive ? (
                      <>Ranked by visits in the <strong>{winOpt.full}</strong></>
                    ) : (
                      <>Ranked by <strong>all-time visits</strong> · windows indexing</>
                    )}
                  </p>
                </div>
              </>
            )}
          </header>

          {tab === 'sites' ? (
            <>
          {loading ? (
            <div className="lb-state">
              <div className="lb-spinner" />
              <p>Tallying visits…</p>
            </div>
          ) : failed || !hasRows ? (
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
                const rank = i + 1;
                const medal = MEDAL[rank] || null;
                const blurb = BLURBS[s.key];
                return (
                  <li
                    key={s.key}
                    className={`lb-row${rank === 1 ? ' is-leader' : ''}`}
                    style={{ '--row-color': s.color || '#8a8178' }}
                  >
                    {/* Stretched link — makes the entire card navigate to the site */}
                    <a
                      className="lb-card-link"
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${s.label} — open site`}
                    />
                    <div className="lb-rank">
                      <span className={`lb-rank-badge${medal ? ` ${medal}` : ''}`}>{rank}</span>
                    </div>

                    <span className="lb-icon" aria-hidden="true">
                      {s.icon ? (
                        <img src={s.icon} alt="" loading="lazy" />
                      ) : (
                        <span className="lb-icon-fallback">{s.label?.charAt(0)}</span>
                      )}
                    </span>

                    <div className="lb-body">
                      <div className="lb-name-row">
                        <span className="lb-name">
                          {s.label}
                          <span className="lb-ext" aria-hidden="true">↗</span>
                        </span>
                        {s.group === 'launchpad' && (
                          <span className="lb-tag lb-tag-lp">
                            <img src="/images/launchpad-rocket.svg" alt="" className="lb-tag-icon" />
                            Launchpad
                          </span>
                        )}
                      </div>

                      {blurb && <p className="lb-blurb">{blurb}</p>}

                      <div className="lb-barwrap">
                        <div className="lb-bar" aria-hidden="true">
                          <div className="lb-bar-fill" style={{ width: `${s.pct}%` }} />
                        </div>
                        <div className="lb-barmeta">
                          {s.share > 0 && (
                            <span className="lb-share">
                              {s.share >= 10 ? Math.round(s.share) : s.share.toFixed(1)}% of traffic
                            </span>
                          )}
                          {s.trend != null && (
                            <span className={`lb-trend ${s.trend > 0 ? 'up' : 'down'}`}>
                              {s.trend > 0 ? '▲' : '▼'} {Math.abs(s.trend)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="lb-stats">
                      {WINDOW_OPTS.map((o) => {
                        const raw = s.visits?.[o.key];
                        return (
                          <div key={o.key} className={`lb-stat${o.key === heroKey ? ' is-active' : ''}`}>
                            <span className="lb-stat-label">{o.label}</span>
                            <span className="lb-stat-val">
                              {Number.isFinite(raw) ? fmt(raw) : '—'}
                            </span>
                          </div>
                        );
                      })}
                      <div className={`lb-stat lb-stat-all${heroKey === 'all' ? ' is-active' : ''}`}>
                        <span className="lb-stat-label">All</span>
                        <span className="lb-stat-val">{fmt(s.total) ?? '0'}</span>
                      </div>
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
            </>
          ) : tab === 'extensions' ? (
            <ExtensionsBoard />
          ) : (
            <DiscordBotsBoard />
          )}
        </div>
      </div>
  );
  return embedded ? body : <Layout>{body}</Layout>;
};

export default Leaderboard;
