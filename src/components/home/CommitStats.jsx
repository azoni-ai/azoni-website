import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/commit-band.css';

// The "full commits metric" on the home front: cadence counts
// (today / week / month / year) plus the solo-vs-Claude-Code-vs-Codex author
// split, which shows both that I ship constantly and that AI-assisted dev is
// how I work. Data from the cached github-stats endpoint (passed from Home).

const CommitStats = ({ githubStats }) => {
  if (!githubStats) return null;

  const tiles = [
    { value: githubStats.today, label: 'today' },
    { value: githubStats.last7Days, label: 'this week' },
    { value: githubStats.thisMonth, label: 'this month' },
    { value: githubStats.thisYear, label: `in ${new Date().getFullYear()}` },
  ].filter((t) => Number.isFinite(t.value));

  if (tiles.length === 0) return null;

  const split = githubStats.commitSplit;
  const showSplit =
    split?.sampleSize > 0 && (split.claudeCode > 0 || split.codexCode > 0 || split.solo > 0);
  const total = showSplit ? Math.max(1, split.claudeCode + split.codexCode + split.solo) : 0;
  const pct = (n) => `${(n / total) * 100}%`;

  return (
    <section className="commit-band" aria-labelledby="commit-band-heading">
      <div className="commit-band-inner">
        <div className="commit-band-head">
          <div>
            <p className="commit-band-eyebrow">
              <span className="commit-band-pulse" aria-hidden="true" />
              Commit activity
            </p>
            <h2 id="commit-band-heading" className="commit-band-heading">
              The work, as it lands
            </h2>
          </div>
          <Link to="/live?view=commits" className="commit-band-link">
            Full commit feed &rarr;
          </Link>
        </div>

        <dl className="commit-band-tiles">
          {tiles.map((t) => (
            <div key={t.label} className="commit-tile">
              <dd className="commit-tile-value">{t.value.toLocaleString()}</dd>
              <dt className="commit-tile-label">commits {t.label}</dt>
            </div>
          ))}
        </dl>

        {showSplit && (
          <div className="commit-band-split">
            <p className="commit-split-caption">
              How the last {split.sampleSize.toLocaleString()} commits got written
            </p>
            <div
              className="hero-split-bar commit-split-bar"
              role="img"
              aria-label={`${split.solo} solo, ${split.claudeCode} Claude Code, ${split.codexCode} Codex`}
            >
              <span className="hero-split-seg hero-split-seg--claude" style={{ width: pct(split.claudeCode) }} title={`${split.claudeCode} Claude Code`} />
              <span className="hero-split-seg hero-split-seg--codex" style={{ width: pct(split.codexCode) }} title={`${split.codexCode} Codex`} />
              <span className="hero-split-seg hero-split-seg--solo" style={{ width: pct(split.solo) }} title={`${split.solo} solo`} />
            </div>
            <ul className="hero-split-legend commit-split-legend">
              <li><span className="hero-split-dot hero-split-seg--claude" /> Claude Code <strong>{split.claudeCode}</strong></li>
              <li><span className="hero-split-dot hero-split-seg--codex" /> Codex <strong>{split.codexCode}</strong></li>
              <li><span className="hero-split-dot hero-split-seg--solo" /> Solo <strong>{split.solo}</strong></li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

export default CommitStats;
