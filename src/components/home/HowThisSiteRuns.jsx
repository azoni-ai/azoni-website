import React from 'react';
import { Link } from 'react-router-dom';
import useHomeSummary from '../../hooks/useHomeSummary';

const ROWS = [
  {
    label: 'Scribe',
    accent: '#fbbf24',
    icon: '/images/scribe-pen.svg',
    desc: 'Netlify scheduled function, 5pm UTC. GitHub GraphQL → Claude Sonnet via OpenRouter → published Firestore doc with auto-generated SVG cover.',
    link: { to: '/blog', label: 'Latest post' },
  },
  {
    label: 'Azoni AI',
    accent: '#60a5fa',
    icon: '/images/azoni.png',
    desc: 'The chatbot above. RAG over a Firestore knowledge base that generates new chunks when retrieval scores drop.',
    link: { to: '/chat', label: 'Open chat' },
  },
  {
    label: 'Conductor',
    accent: '#a78bfa',
    icon: null,
    desc: 'Netlify cron, every 3h. Pulls activity, errors, and RAG health from Firestore in parallel, then asks GPT-4o-mini what to do. Owns the error-review pipeline.',
    link: { to: '/activity', label: 'Agent log' },
  },
  {
    label: 'Moltbook agent',
    accent: '#fb923c',
    icon: '/images/moltbook-lobster.svg',
    desc: 'LangGraph workflow on Render. Decides whether to post, comment, or upvote. Self-evaluates, respects the rate-limit cooldown, logs every transition.',
    link: { to: '/moltbook', label: 'Moltbook' },
  },
];

const SOURCE_DISPLAY = {
  orchestrator: { label: 'Conductor', color: '#a78bfa' },
  'daily-blog': { label: 'Scribe', color: '#fbbf24' },
  'azoni-ai': { label: 'Azoni AI', color: '#60a5fa' },
  azoni: { label: 'Azoni AI', color: '#60a5fa' },
  'moltbook-agent': { label: 'Moltbook agent', color: '#fb923c' },
  benchpressonly: { label: 'Bench Only', color: '#4ade80' },
  rowcrew: { label: 'RowCrew', color: '#34d399' },
  'spell-brigade': { label: 'Spell Brigade', color: '#c084fc' },
  oldwaystoday: { label: 'Old Ways Today', color: '#d97706' },
  'old-ways-today': { label: 'Old Ways Today', color: '#d97706' },
  embedroute: { label: 'EmbedRoute', color: '#20d9d2' },
  launchpad: { label: 'Launchpad', color: '#f472b6' },
};

// Reads the shared cached summary instead of streaming the whole
// `agent_activity` collection to every home-page visitor.
const useAgentOpsStats = () => {
  const summary = useHomeSummary();
  return {
    cost: Number.isFinite(summary?.cost30d) ? summary.cost30d : null,
    actionCount: Number.isFinite(summary?.actionCount30d) ? summary.actionCount30d : null,
    errors7d: Number.isFinite(summary?.errors7d) ? summary.errors7d : null,
    bySource: Array.isArray(summary?.bySource) ? summary.bySource : [],
  };
};

const formatCost = (n) => {
  if (!Number.isFinite(n)) return null;
  if (n >= 100) return `$${n.toFixed(0)}`;
  if (n >= 10) return `$${n.toFixed(2)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(5)}`;
};

const HowThisSiteRuns = () => {
  const { cost, actionCount, errors7d, bySource } = useAgentOpsStats();
  const showCost = Number.isFinite(cost) && cost > 0;
  const topSources = bySource.slice(0, 8);
  const topSourceTotal = topSources.reduce((sum, s) => sum + s.value, 0);

  return (
    <section className="how-runs" aria-labelledby="how-runs-heading">
      <header className="how-runs-intro">
        <h2 id="how-runs-heading" className="how-runs-heading">
          How this site works
        </h2>
        <p className="how-runs-lede">
          The blog, the chatbot, and the activity feed are all live systems. Same stack I run in
          production.
        </p>
      </header>

      {showCost && (
        <div className="how-runs-budget" aria-label="Live ops stats">
          <div className="how-runs-budget-row">
            <div className="how-runs-budget-stat">
              <span className="how-runs-budget-value">{formatCost(cost)}</span>
              <span className="how-runs-budget-label">spent on AI &middot; last 30 days</span>
            </div>
            {Number.isFinite(actionCount) && actionCount > 0 && (
              <div className="how-runs-budget-stat">
                <span className="how-runs-budget-value">{actionCount.toLocaleString()}</span>
                <span className="how-runs-budget-label">agent actions logged</span>
              </div>
            )}
            {Number.isFinite(errors7d) && (
              <div className="how-runs-budget-stat">
                <span className="how-runs-budget-value">{errors7d}</span>
                <span className="how-runs-budget-label">errors caught &middot; last 7 days</span>
              </div>
            )}
          </div>
          <p className="how-runs-budget-note">
            Every chat reply, blog post, and agent decision is logged with its model and cost.
            Errors flow into the same feed so I see them before users do.
          </p>

          {topSources.length > 0 && topSourceTotal > 0 && (
            <div className="how-runs-budget-breakdown" aria-label="Cost by app">
              <p className="how-runs-budget-breakdown-label">Where it goes</p>
              <ul className="how-runs-budget-breakdown-list">
                {topSources.map(({ source, value }) => {
                  const display = SOURCE_DISPLAY[source] || { label: source, color: '#6f675c' };
                  const pct = topSourceTotal > 0 ? Math.round((value / topSourceTotal) * 100) : 0;
                  return (
                    <li
                      key={source}
                      className="how-runs-budget-breakdown-row"
                      style={{ '--breakdown-color': display.color }}
                    >
                      <span className="how-runs-budget-breakdown-name">{display.label}</span>
                      <span className="how-runs-budget-breakdown-bar" aria-hidden="true">
                        <span
                          className="how-runs-budget-breakdown-fill"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </span>
                      <span className="how-runs-budget-breakdown-value">
                        {formatCost(value)}
                        <span className="how-runs-budget-breakdown-pct"> · {pct}%</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <dl className="how-runs-stack" aria-label="Stack and operations">
        <div className="how-runs-stack-row">
          <dt>Compute</dt>
          <dd>Netlify Functions · Render</dd>
        </div>
        <div className="how-runs-stack-row">
          <dt>Storage</dt>
          <dd>Firestore · PostgreSQL · Supabase</dd>
        </div>
        <div className="how-runs-stack-row">
          <dt>Schedule</dt>
          <dd>
            Conductor every 3h · Scribe daily 5pm UTC · Moltbook every 4h ·
            Medic every 2 min
          </dd>
        </div>
        <div className="how-runs-stack-row">
          <dt>Observability</dt>
          <dd>
            Activity log · per-call cost &amp; tokens · error log · Medic health checks
          </dd>
        </div>
        <div className="how-runs-stack-row">
          <dt>Deploy</dt>
          <dd>Git push &rarr; Netlify autodeploys · 13 functions · 2 Render services</dd>
        </div>
      </dl>

      <figure className="how-runs-diagram" aria-label="Agent architecture diagram">
        <div className="how-runs-diagram-row">
          <span className="how-runs-diagram-node how-runs-diagram-node--start">Visitor</span>
          <span className="how-runs-diagram-arrow" aria-hidden="true">→</span>
          <span className="how-runs-diagram-node">Azoni AI</span>
          <span className="how-runs-diagram-arrow" aria-hidden="true">→</span>
          <span className="how-runs-diagram-node">MCP</span>
          <span className="how-runs-diagram-arrow" aria-hidden="true">→</span>
          <span className="how-runs-diagram-node-list">
            BenchPress&nbsp;· RowCrew · FaB&nbsp;Stats · Old&nbsp;Ways · …
          </span>
        </div>
        <div className="how-runs-diagram-row how-runs-diagram-row--cron">
          <span className="how-runs-diagram-label">cron · 3h</span>
          <span className="how-runs-diagram-arrow" aria-hidden="true">→</span>
          <span className="how-runs-diagram-node how-runs-diagram-node--conductor">Conductor</span>
          <span className="how-runs-diagram-arrow" aria-hidden="true">→</span>
          <span className="how-runs-diagram-node-list">
            Scribe · Moltbook agent · Medic
          </span>
        </div>
        <figcaption className="how-runs-diagram-caption">
          Triggered by visitors and cron. Every action logged.
        </figcaption>
      </figure>

      <ol className="how-runs-list">
        {ROWS.map((row, i) => (
          <li
            key={row.label}
            className="how-runs-row"
            style={{ '--row-accent': row.accent }}
          >
            <div className="how-runs-row-index">{String(i + 1).padStart(2, '0')}</div>
            <div className="how-runs-row-icon" aria-hidden="true">
              {row.icon ? (
                <img src={row.icon} alt="" />
              ) : (
                <span className="how-runs-row-icon-placeholder">
                  {row.label.charAt(0)}
                </span>
              )}
            </div>
            <div className="how-runs-row-body">
              <h3 className="how-runs-row-name">{row.label}</h3>
              <p className="how-runs-row-desc">{row.desc}</p>
            </div>
            {row.link && (
              <Link to={row.link.to} className="how-runs-row-link">
                {row.link.label} <span aria-hidden="true">→</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};

export default HowThisSiteRuns;
