import React from 'react';
import { PROJECT_STORIES } from '../../data/project-stories';
import useHomeSummary from '../../hooks/useHomeSummary';

const HeroStats = ({ githubStats }) => {
  const summary = useHomeSummary();
  const agentCount24h = Number.isFinite(summary?.agentCount24h) ? summary.agentCount24h : null;

  const yearLabel = new Date().getFullYear();
  const stats = [
    {
      value: String(PROJECT_STORIES.length),
      label: 'projects shipped',
    },
    githubStats?.thisYear != null && {
      value: githubStats.thisYear.toLocaleString(),
      label: `commits · ${yearLabel}`,
    },
    githubStats?.thisMonth != null && {
      value: githubStats.thisMonth.toLocaleString(),
      label: 'commits · this month',
    },
    agentCount24h != null && agentCount24h > 0 && {
      value: String(agentCount24h),
      label: 'agent actions · 24h',
    },
  ].filter(Boolean);

  if (stats.length === 0) return null;

  const split = githubStats?.commitSplit;
  const showSplit =
    split?.sampleSize > 0 &&
    (split.claudeCode > 0 || split.codexCode > 0 || split.solo > 0);
  const total = showSplit
    ? Math.max(1, split.claudeCode + split.codexCode + split.solo)
    : 0;

  return (
    <>
      <dl className="hero-stats" aria-label="Live stats">
        {stats.map((s, i) => (
          <div key={i} className="hero-stats-item">
            <dt className="hero-stats-label">{s.label}</dt>
            <dd className="hero-stats-value">{s.value}</dd>
          </div>
        ))}
      </dl>

      {showSplit && (
        <div className="hero-split" aria-label="Commit author split (recent sample)">
          <span className="hero-split-label">
            Of last {split.sampleSize.toLocaleString()} commits
          </span>
          <div
            className="hero-split-bar"
            role="img"
            aria-label={`${split.solo} solo, ${split.claudeCode} Claude Code, ${split.codexCode} Codex`}
          >
            <span
              className="hero-split-seg hero-split-seg--solo"
              style={{ width: `${(split.solo / total) * 100}%` }}
              title={`${split.solo} solo`}
            />
            <span
              className="hero-split-seg hero-split-seg--claude"
              style={{ width: `${(split.claudeCode / total) * 100}%` }}
              title={`${split.claudeCode} Claude Code`}
            />
            <span
              className="hero-split-seg hero-split-seg--codex"
              style={{ width: `${(split.codexCode / total) * 100}%` }}
              title={`${split.codexCode} Codex`}
            />
          </div>
          <ul className="hero-split-legend">
            <li>
              <span className="hero-split-dot hero-split-seg--solo" /> Mine{' '}
              <strong>{split.solo}</strong>
            </li>
            <li>
              <span className="hero-split-dot hero-split-seg--claude" /> Claude Code{' '}
              <strong>{split.claudeCode}</strong>
            </li>
            <li>
              <span className="hero-split-dot hero-split-seg--codex" /> Codex{' '}
              <strong>{split.codexCode}</strong>
            </li>
          </ul>
        </div>
      )}
    </>
  );
};

export default HeroStats;
