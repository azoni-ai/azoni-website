import React from 'react';
import { Link } from 'react-router-dom';

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const ActivityTicker = ({ githubStats }) => (
  <div className="aw-ticker-strip" style={{ gridColumn: '1 / -1', gridRow: 2 }}>
    <div className="aw-ticker-stats">
      <span className="aw-ticker-stat"><strong>{githubStats?.today || 0}</strong> today</span>
      <span className="aw-ticker-stat"><strong>{githubStats?.last7Days || 0}</strong> this week</span>
      <span className="aw-ticker-stat"><strong>{githubStats?.last30Days || 0}</strong> this month</span>
    </div>
    <div className="aw-ticker-commits">
      {githubStats?.recentCommits?.slice(0, 5).map((commit, i) => (
        <span key={`${commit.sha}-${i}`} className="aw-ticker-commit">
          <span className="aw-ticker-msg">{commit.message}</span>
          {commit.isPrivate ? (
            <span className="aw-ticker-repo">{commit.repo}</span>
          ) : (
            <a href={commit.repoUrl} target="_blank" rel="noopener noreferrer" className="aw-ticker-repo">{commit.repo}</a>
          )}
          {commit.claudeCode && <span className="aw-ticker-badge">Claude</span>}
          <span className="aw-ticker-time">{formatTimeAgo(commit.timestamp)}</span>
        </span>
      ))}
    </div>
    <div className="aw-ticker-links">
      <Link to="/commits">commits →</Link>
      <Link to="/activity">activity →</Link>
    </div>
  </div>
);

export default ActivityTicker;
