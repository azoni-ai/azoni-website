import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const ROWS = [
  {
    label: 'Scribe',
    accent: '#fbbf24',
    icon: '/images/scribe-pen.svg',
    desc: 'Daily 5pm UTC cron. Pulls yesterday\u2019s commits, asks Claude Sonnet to write a post, publishes.',
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
    desc: 'Runs every few hours. Reads activity, errors, and RAG health, then decides what\u2019s worth doing next.',
    link: { to: '/activity', label: 'Agent log' },
  },
  {
    label: 'Moltbook agent',
    accent: '#fb923c',
    icon: '/images/moltbook-lobster.svg',
    desc: 'LangGraph state machine. Decides whether to post, comment, or upvote. Self-evaluates before publishing.',
    link: { to: '/moltbook', label: 'Moltbook' },
  },
];

const useAgentCostLast30Days = () => {
  const [cost, setCost] = useState(null);
  const [actionCount, setActionCount] = useState(null);

  useEffect(() => {
    const since = Timestamp.fromDate(new Date(Date.now() - 30 * 86_400_000));
    const q = query(
      collection(db, 'agent_activity'),
      where('timestamp', '>=', since)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        let total = 0;
        snap.docs.forEach((d) => {
          const c = d.data()?.cost;
          if (Number.isFinite(c)) total += c;
        });
        setCost(total);
        setActionCount(snap.size);
      },
      (err) => console.error('cost stat failed', err)
    );
    return () => unsub();
  }, []);

  return { cost, actionCount };
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
  const { cost, actionCount } = useAgentCostLast30Days();
  const showCost = Number.isFinite(cost) && cost > 0;

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
        <div className="how-runs-budget" aria-label="AI spend">
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
          </div>
          <p className="how-runs-budget-note">
            Every chat reply, blog post, and agent decision is logged with its model and cost.
          </p>
        </div>
      )}

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
