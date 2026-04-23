import React from 'react';
import { Link } from 'react-router-dom';

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

const formatTimeAgo = (timestamp) => {
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const RecentActivityStrip = ({ githubStats }) => {
  const commits = githubStats?.recentCommits?.slice(0, 4) || [];

  return (
    <section className="activity-strip" aria-label="Recent GitHub activity">
      <div className="activity-strip-inner">
        <div className="activity-strip-header">
          <p className="activity-strip-eyebrow">Live from the repo</p>
          <div className="activity-strip-stats">
            <span><strong>{githubStats?.today ?? '—'}</strong> today</span>
            <span className="activity-strip-divider" aria-hidden="true">/</span>
            <span><strong>{githubStats?.last7Days ?? '—'}</strong> this week</span>
            <span className="activity-strip-divider" aria-hidden="true">/</span>
            <span><strong>{githubStats?.last30Days ?? '—'}</strong> this month</span>
          </div>
        </div>

        {commits.length > 0 ? (
          <ul className="activity-strip-list">
            {commits.map((commit, i) => (
              <li key={`${commit.sha}-${i}`} className="activity-strip-row">
                <span className="activity-strip-msg">{commit.message}</span>
                <div className="activity-strip-meta">
                  {commit.isPrivate ? (
                    <span className="activity-strip-repo">{commit.repo}</span>
                  ) : (
                    <a
                      href={commit.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="activity-strip-repo"
                    >
                      {commit.repo}
                    </a>
                  )}
                  {REPO_TO_SITE[commit.repo] && (
                    <a
                      href={REPO_TO_SITE[commit.repo]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="activity-strip-live"
                      aria-label={`${commit.repo} live site`}
                    >
                      ↗
                    </a>
                  )}
                  <span className="activity-strip-time">{formatTimeAgo(commit.timestamp)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="activity-strip-empty">Loading recent commits…</p>
        )}

        <div className="activity-strip-footer">
          <Link to="/commits" className="activity-strip-link">Full commit log →</Link>
          <Link to="/blog" className="activity-strip-link">Scribe&rsquo;s daily writeup →</Link>
        </div>
      </div>
    </section>
  );
};

export default RecentActivityStrip;
