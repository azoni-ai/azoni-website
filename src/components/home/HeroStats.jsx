import React from 'react';
import { PROJECT_STORIES } from '../../data/project-stories';
import useHomeSummary from '../../hooks/useHomeSummary';
import { getCommitAttribution, getContributionTiles } from '../../utils/githubTelemetry';
import '../../styles/commit-band.css';

const HeroStats = ({ githubStats, loading = githubStats == null }) => {
  const summary = useHomeSummary();
  const agentCount24h = Number.isFinite(summary?.agentCount24h) ? summary.agentCount24h : null;
  const tiles = getContributionTiles(githubStats).filter(({ key }) => key === 'thisYear' || key === 'thisMonth').reverse();
  const stats = [
    { value: String(PROJECT_STORIES.length), label: 'projects shipped' },
    ...tiles.map(({ value, label }) => ({
      value: loading ? 'Loading' : value == null ? 'Unavailable' : value.toLocaleString(),
      label: `contributions ${label}`,
    })),
    agentCount24h != null && agentCount24h > 0 && { value: String(agentCount24h), label: 'agent actions / 24h' },
  ].filter(Boolean);
  const attribution = getCommitAttribution(githubStats);

  return (
    <>
      <dl className="hero-stats" aria-label="Live stats" aria-busy={loading}>
        {stats.map((stat) => (
          <div key={stat.label} className="hero-stats-item">
            <dt className="hero-stats-label">{stat.label}</dt>
            <dd className={`hero-stats-value${stat.value === 'Unavailable' || stat.value === 'Loading' ? ' hero-stats-value--status' : ''}`}>{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="hero-stats-scope">Account-wide <a href="https://github.com/azoni" target="_blank" rel="noopener noreferrer">GitHub contributions</a>. Reporting periods use Pacific time.</p>

      {attribution && (
        <div className="hero-split" aria-label="AI tags in a recent public commit sample">
          <span className="hero-split-label">AI tags in {attribution.sampleSize.toLocaleString()} recent public commits</span>
          <div className="hero-split-bar" role="img" aria-label={attribution.segments.map(({ value, label }) => `${value} ${label}`).join(', ')}>
            {attribution.segments.map(({ key, value, label }) => <span key={key} className={`hero-split-seg hero-split-seg--${key}`} style={{ width: `${(value / attribution.sampleSize) * 100}%` }} title={`${value} ${label}`} />)}
          </div>
          <ul className="hero-split-legend">
            {attribution.segments.map(({ key, value, label }) => <li key={key}><span className={`hero-split-dot hero-split-seg--${key}`} /> {label} <strong>{value.toLocaleString()}</strong></li>)}
          </ul>
          <p className="hero-stats-scope">A separate public-project sample. Untagged commits may still involve AI.</p>
        </div>
      )}
    </>
  );
};

export default HeroStats;
