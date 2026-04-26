import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';

const REPO_TO_SITE = {
  'rowing-tracker': 'https://rowcrew.netlify.app',
  'azoni-website': 'https://azoni.ai',
  'old-ways-today': 'https://oldwaystoday.com',
  'tcgdoku': 'https://tcgdoku.netlify.app',
  'dumarket': 'https://dumarket.netlify.app',
  'kalshi': 'https://kalshi.netlify.app',
  'benchonly': 'https://benchpressonly.com',
  'embedroute': 'https://www.embedroute.com',
};

// Human-readable labels for agent sources
const SOURCE_LABEL = {
  'orchestrator': 'Conductor',
  'daily-blog': 'Scribe',
  'azoni-ai': 'Azoni AI',
  'azoni': 'Azoni',
  'moltbook-agent': 'Moltbook agent',
  'benchpressonly': 'Bench Only',
  'rowcrew': 'RowCrew',
  'spell-brigade': 'Spell Brigade',
  'old-ways-today': 'Old Ways Today',
  'oldwaystoday': 'Old Ways Today',
  'embedroute': 'EmbedRoute',
  'medic': 'Medic',
};

// Which agent-activity types to surface on the home pulse (most meaningful)
const AGENT_TYPES_TO_SHOW = new Set([
  'blog_published',
  'blog_generated',
  'moltbook_post',
  'moltbook_comment',
  'orchestrator_summary',
  'knowledge_generated',
  'self_assessment',
  'wizard_created',
  'row_verified',
  'owt_blog',
]);

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const toMs = (t) => (t?.toDate ? t.toDate().getTime() : new Date(t).getTime());

const LivePulseStrip = ({ githubStats }) => {
  const [agentItems, setAgentItems] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, 'agent_activity'),
      orderBy('timestamp', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => AGENT_TYPES_TO_SHOW.has(a.type));
        setAgentItems(items);
      },
      (err) => {
        console.error('agent_activity listen failed', err);
      }
    );
    return () => unsub();
  }, []);

  // Normalize commits + agent activity into a single time-sorted feed.
  const commitItems = (githubStats?.recentCommits || []).map((c) => ({
    kind: 'commit',
    id: `commit-${c.sha}`,
    title: c.message,
    repo: c.repo,
    repoUrl: c.repoUrl,
    isPrivate: c.isPrivate,
    timestamp: c.timestamp,
    ms: new Date(c.timestamp).getTime(),
  }));

  const agentNormalized = agentItems.map((a) => ({
    kind: 'agent',
    id: `agent-${a.id}`,
    title: a.title || a.description || a.type,
    source: a.source,
    link: a.metadata?.slug
      ? `/blog/${a.metadata.slug}`
      : a.source === 'moltbook-agent'
        ? '/moltbook'
        : null,
    timestamp: a.timestamp,
    ms: toMs(a.timestamp),
  }));

  const feed = [...commitItems, ...agentNormalized]
    .filter((x) => Number.isFinite(x.ms))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 7);

  return (
    <section className="pulse-strip" aria-label="Live activity from the site and its agents">
      <div className="pulse-strip-inner">
        <div className="pulse-strip-header">
          <div className="pulse-strip-eyebrow">
            <span className="pulse-strip-dot" aria-hidden="true" />
            <span>Recent activity</span>
          </div>
          {(() => {
            const todayCommits = githubStats?.today;
            const agents24h = agentItems.filter((a) => Date.now() - toMs(a.timestamp) < 86400000).length;
            const parts = [];
            if (todayCommits != null) {
              parts.push(<span key="commits"><strong>{todayCommits}</strong> commits today</span>);
            }
            if (agents24h > 0) {
              parts.push(<span key="agents"><strong>{agents24h}</strong> agent actions · 24h</span>);
            }
            if (parts.length === 0) return null;
            return (
              <div className="pulse-strip-stats">
                {parts.flatMap((p, i) => i === 0
                  ? [p]
                  : [<span key={`d-${i}`} className="pulse-strip-divider" aria-hidden="true">·</span>, p])}
              </div>
            );
          })()}
        </div>

        {feed.length > 0 ? (
          <ul className="pulse-strip-list">
            {feed.map((item) => (
              <li
                key={item.id}
                className={`pulse-row pulse-row--${item.kind}`}
              >
                <span className="pulse-row-kind" aria-hidden="true">
                  {item.kind === 'agent' ? '◆' : '●'}
                </span>
                <span className="pulse-row-title">{item.title}</span>
                <span className="pulse-row-meta">
                  {item.kind === 'commit' ? (
                    <>
                      {item.isPrivate ? (
                        <span className="pulse-row-source">{item.repo}</span>
                      ) : (
                        <a
                          href={item.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pulse-row-source pulse-row-source--link"
                        >
                          {item.repo}
                        </a>
                      )}
                      {REPO_TO_SITE[item.repo] && (
                        <a
                          href={REPO_TO_SITE[item.repo]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pulse-row-live"
                          aria-label={`${item.repo} live site`}
                        >
                          ↗
                        </a>
                      )}
                    </>
                  ) : (
                    (() => {
                      const label = SOURCE_LABEL[item.source] || (item.source && !/^unknown$/i.test(item.source) ? item.source : null);
                      if (!label) return null;
                      return item.link ? (
                        <Link to={item.link} className="pulse-row-source pulse-row-source--link">
                          {label}
                        </Link>
                      ) : (
                        <span className="pulse-row-source">{label}</span>
                      );
                    })()
                  )}
                  <span className="pulse-row-time">{formatTimeAgo(item.timestamp)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pulse-strip-empty">Loading activity…</p>
        )}

        <div className="pulse-strip-footer">
          <Link to="/commits" className="pulse-strip-link">All commits →</Link>
          <Link to="/activity" className="pulse-strip-link">All agent actions →</Link>
          <Link to="/blog" className="pulse-strip-link">Today&rsquo;s post →</Link>
        </div>
      </div>
    </section>
  );
};

export default LivePulseStrip;
