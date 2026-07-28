import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/commit-band.css';

// The "full commits metric" on the home front: cadence counts
// (today / week / month / year) plus the solo-vs-Claude-Code-vs-Codex author
// split, which shows both that I ship constantly and that AI-assisted dev is
// how I work. Data from the cached github-stats endpoint (passed from Home).

const CommitStats = ({ githubStats }) => {
  // While the cached github-stats endpoint is in flight, render a skeleton with
  // the exact same structure so the band reserves its space (no layout shift)
  // and has something alive to look at.
  if (!githubStats) {
    const labels = ['today', 'this week', 'this month', `in ${new Date().getFullYear()}`];
    return (
      <section className="commit-band" aria-labelledby="commit-band-heading" aria-busy="true">
        <div className="commit-band-inner">
          <div className="commit-band-head">
            <div>
              <p className="commit-band-eyebrow">
                <span className="commit-band-pulse" aria-hidden="true" />
                GitHub
              </p>
              <h2 id="commit-band-heading" className="commit-band-heading">Commit activity</h2>
            </div>
            <Link to="/live?view=commits" className="commit-band-link">Full commit feed &rarr;</Link>
          </div>

          <dl className="commit-band-tiles">
            {labels.map((label, i) => (
              <div key={label} className="commit-tile" style={{ '--cs-delay': `${i * 0.12}s` }}>
                <dd className="commit-tile-value"><span className="cs-skel cs-skel-num" /></dd>
                <dt className="commit-tile-label">commits {label}</dt>
              </div>
            ))}
          </dl>

          <div className="commit-band-split">
            <p className="commit-split-caption"><span className="cs-skel cs-skel-caption" /></p>
            <div
              className="hero-split-bar commit-split-bar cs-skel-bar"
              role="img"
              aria-label="Loading commit activity"
            />
            <ul className="hero-split-legend commit-split-legend">
              {[0, 1, 2].map((i) => (
                <li key={i}>
                  <span className="hero-split-dot cs-skel-dot" />
                  <span className="cs-skel cs-skel-legend" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  }

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
              GitHub
            </p>
            <h2 id="commit-band-heading" className="commit-band-heading">
              Commit activity
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
