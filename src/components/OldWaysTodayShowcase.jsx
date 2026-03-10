import React from 'react';

const formatNumber = (n) => {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString();
};

const formatTokenCount = (n) => {
  if (!Number.isFinite(n)) return '0';
  return formatNumber(Math.round(n));
};

const formatCost = (cost) => {
  const value = Number(cost || 0);
  if (!Number.isFinite(value)) return '$0';
  if (value >= 1000) return `$${formatNumber(value)}`;
  return `$${value.toFixed(2)}`;
};

const OldWaysTodayShowcase = ({ stats, healthStatus }) => {
  const owt = stats?.oldwaystoday || {};
  const loading = !stats;
  const healthy = (owt.status === 'ok' || owt.status === 'healthy') && healthStatus?.oldways !== 'down';

  return (
    <section className="showcase-section">
      <div className="container">
        <div className="fabstats-showcase oldways-showcase">
          <div className="fabstats-accent" />

          <div className="fabstats-body">
            <div className="fabstats-header">
              <div className="fabstats-header-left">
                <div className="fabstats-icon-wrap">
                  <img src="/images/oldways.png" alt="Old Ways Today" className="fabstats-icon" />
                </div>
                <div>
                  <div className="fabstats-title-row">
                    <h3>Old Ways Today</h3>
                    <span className="fabstats-badge">{healthy ? 'Live' : 'Degraded'}</span>
                  </div>
                  <span className="fabstats-tagline">AI wellness platform for non-toxic alternatives and family-safe swaps</span>
                </div>
              </div>
            </div>

            <p className="fabstats-desc">
              Standalone product proving the same agent stack can run beyond a portfolio app. It combines a RAG
              wellness assistant with automated content workflows and tracks live backend usage over time.
            </p>

            <div className="fabstats-stats-grid">
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">{loading ? '...' : formatNumber(Number(owt.requests || 0))}</span>
                <span className="fabstats-stat-label">AI Requests</span>
              </div>
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">{loading ? '...' : formatTokenCount(Number(owt.inputTokens || 0))}</span>
                <span className="fabstats-stat-label">Input Tokens</span>
              </div>
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">{loading ? '...' : formatTokenCount(Number(owt.outputTokens || 0))}</span>
                <span className="fabstats-stat-label">Output Tokens</span>
              </div>
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">{loading ? '...' : formatCost(owt.totalCost)}</span>
                <span className="fabstats-stat-label">Model Cost</span>
              </div>
            </div>

            <div className="fabstats-highlights">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M12 2C13 7 17 10 12 17C7 10 11 7 12 2Z"/><path d="M12 17v5"/><path d="M8 21h8"/></svg>
                RAG assistant focused on practical, non-toxic swaps
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
                Live backend usage metrics from production service endpoints
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Shares orchestration patterns with azoni.ai while running independently
              </span>
            </div>

            <div className="fabstats-tech">
              <span>React + Next.js</span>
              <span>FastAPI</span>
              <span>RAG</span>
              <span>Automated Content</span>
            </div>

            <div className="fabstats-actions">
              <a href="https://oldwaystoday.com" target="_blank" rel="noopener noreferrer" className="fabstats-action fabstats-action-primary">
                Visit oldwaystoday.com
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OldWaysTodayShowcase;
