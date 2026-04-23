import React from 'react';
import { Link } from 'react-router-dom';

const ROWS = [
  {
    label: 'Scribe',
    accent: '#fbbf24',
    icon: '/images/scribe-pen.svg',
    desc: 'Reads yesterday\u2019s commits off GitHub GraphQL at 5pm UTC, asks Claude Sonnet (via OpenRouter) to turn them into a narrative post, and publishes.',
    link: { to: '/blog', label: 'Latest post' },
  },
  {
    label: 'Azoni AI',
    accent: '#60a5fa',
    icon: '/images/azoni.png',
    desc: 'The chatbot you used up top. Cosine-similarity RAG over a Firestore knowledge base that generates new chunks on the fly when the retrieval score drops below a threshold.',
    link: { to: '/chat', label: 'Open chat' },
  },
  {
    label: 'Conductor',
    accent: '#a78bfa',
    icon: null,
    desc: 'A Netlify cron that wakes up every few hours, reads the state of everything (activity, errors, RAG health), and asks GPT-4o-mini what\u2019s worth doing next.',
    link: { to: '/activity', label: 'Agent log' },
  },
  {
    label: 'Moltbook agent',
    accent: '#fb923c',
    icon: '/images/moltbook-lobster.svg',
    desc: 'A LangGraph state machine. Decides whether to post, comment, or upvote, evaluates its own output, and respects the cooldown.',
    link: { to: '/moltbook', label: 'Moltbook' },
  },
];

const HowThisSiteRuns = () => (
  <section className="how-runs" aria-labelledby="how-runs-heading">
    <header className="how-runs-intro">
      <p className="how-runs-eyebrow">Colophon</p>
      <h2 id="how-runs-heading" className="how-runs-heading">
        Most of this site is written by agents.
      </h2>
      <p className="how-runs-lede">
        Not just for show &mdash; the same stack I ship in production runs this portfolio. The blog,
        the chatbot, and the activity feed you scrolled past are all live systems, not mocked content.
      </p>
    </header>

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

export default HowThisSiteRuns;
