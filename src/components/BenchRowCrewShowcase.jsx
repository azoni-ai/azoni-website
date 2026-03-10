import React from 'react';

const formatNumber = (n) => {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString();
};

const formatMeters = (meters) => {
  if (!Number.isFinite(meters)) return '0';
  if (meters >= 1000000) return `${(meters / 1000000).toFixed(2).replace(/\.00$/, '')}M`;
  return formatNumber(meters);
};

const BenchRowCrewShowcase = ({ stats }) => {
  const bench = stats?.benchpressonly || {};
  const row = stats?.rowcrew || {};
  const loading = !stats;

  const benchUsers = Number(bench.users || 0);
  const rowUsers = Number(row.uniqueRowers || 0);
  const users = benchUsers + rowUsers;
  const workoutsLogged = Number(bench.workoutsLogged || 0);
  const rowSessions = Number(row.sessions || 0);
  const totalMeters = Number(row.meters || 0);
  const progressPercent = Number(row.worldProgressPercent || 0);
  const metersRemaining = Number(row.metersRemaining || 0);

  return (
    <section className="showcase-section">
      <div className="container">
        <div className="fabstats-showcase fitness-showcase">
          <div className="fabstats-accent" />

          <div className="fabstats-body">
            <div className="fabstats-header">
              <div className="fabstats-header-left">
                <div className="fabstats-icon-wrap dual-app-icon-wrap">
                  <img
                    src="/images/benchpressonly.svg"
                    alt="BenchPressOnly"
                    className="dual-app-icon dual-app-icon-primary"
                  />
                  <img
                    src="/images/rowing-favicon.svg"
                    alt="RowCrew"
                    className="dual-app-icon dual-app-icon-secondary"
                  />
                </div>
                <div>
                  <div className="fabstats-title-row">
                    <h3>BenchPressOnly + RowCrew</h3>
                    <span className="fabstats-badge">Live</span>
                  </div>
                  <span className="fabstats-tagline">AI fitness platform with shared real-time performance data</span>
                </div>
              </div>
            </div>

            <p className="fabstats-desc">
              Strength and rowing products running on a shared data backbone. BenchPressOnly tracks user workouts,
              while RowCrew logs sessions and meters toward the team&apos;s around-the-world distance goal.
            </p>

            <div className="fabstats-stats-grid">
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">{loading ? '...' : formatNumber(users)}</span>
                <span className="fabstats-stat-label">Users</span>
              </div>
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">{loading ? '...' : formatNumber(workoutsLogged)}</span>
                <span className="fabstats-stat-label">Workouts Logged</span>
              </div>
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">{loading ? '...' : formatNumber(rowSessions)}</span>
                <span className="fabstats-stat-label">Row Sessions</span>
              </div>
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">{loading ? '...' : formatMeters(totalMeters)}</span>
                <span className="fabstats-stat-label">Meters Rowed</span>
              </div>
            </div>

            <div className="showcase-progress">
              <div className="showcase-progress-header">
                <span>Around-the-world challenge</span>
                <strong>{loading ? '...' : `${progressPercent.toFixed(2)}%`}</strong>
              </div>
              <div className="showcase-progress-track">
                <span style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
              </div>
              <div className="showcase-progress-meta">
                {loading
                  ? 'Loading rowing totals...'
                  : `${formatNumber(Math.round(metersRemaining / 1000))} km remaining to 40,075 km`}
              </div>
            </div>

            <div className="fabstats-highlights">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                AI-generated workouts and tracking across personal + group training
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M2 12h4l3-9 6 18 3-9h4"/></svg>
                RowCrew session data powers live distance and progress milestones
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
                MCP endpoints aggregate cross-app metrics for shared dashboards
              </span>
            </div>

            <div className="fabstats-tech">
              <span>React Native + PWA</span>
              <span>Firebase</span>
              <span>Netlify Functions</span>
              <span>MCP API</span>
            </div>

            <div className="fabstats-actions">
              <a href="https://benchpressonly.com" target="_blank" rel="noopener noreferrer" className="fabstats-action fabstats-action-primary">
                Visit BenchPressOnly
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              </a>
              <a href="https://rowcrew.netlify.app" target="_blank" rel="noopener noreferrer" className="fabstats-action">
                Visit RowCrew
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenchRowCrewShowcase;
