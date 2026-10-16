import React from 'react';
import { Link } from 'react-router-dom';
import { getCommitAttribution, getContributionDate, getContributionTiles } from '../../utils/githubTelemetry';
import '../../styles/commit-band.css';

const CommitStats = ({ githubStats, loading = githubStats == null }) => {
  const tiles = getContributionTiles(githubStats);
  const unavailable = !loading && tiles.some(({ value }) => value == null);
  const throughDate = getContributionDate(githubStats);
  const attribution = getCommitAttribution(githubStats);

  return (
    <section className="commit-band" aria-labelledby="commit-band-heading" aria-busy={loading}>
      <div className="commit-band-inner">
        <div className="commit-band-head">
          <div>
            <p className="commit-band-eyebrow">
              <span className="commit-band-pulse" aria-hidden="true" />
              GitHub &middot; azoni
            </p>
            <h2 id="commit-band-heading" className="commit-band-heading">Contribution activity</h2>
          </div>
          <Link to="/live?view=commits" className="commit-band-link">Public commit feed &rarr;</Link>
        </div>

        <dl className="commit-band-tiles" aria-label="Account-wide GitHub contributions">
          {tiles.map((tile, i) => (
            <div key={tile.key} className="commit-tile" style={{ '--cs-delay': `${i * 0.12}s` }}>
              <dd className="commit-tile-value">
                {loading ? <span className="cs-skel cs-skel-num" aria-label="Loading" />
                  : tile.value == null ? <span aria-label="Unavailable">&mdash;</span>
                    : tile.value.toLocaleString()}
              </dd>
              <dt className="commit-tile-label">contributions {tile.label}</dt>
            </div>
          ))}
        </dl>

        <p className="commit-scope">
          Account-wide <a href="https://github.com/azoni" target="_blank" rel="noopener noreferrer">GitHub contribution calendar</a> totals. Reporting periods use Pacific time{throughDate ? `, through ${throughDate}` : ''}.
        </p>
        {unavailable && <p className="commit-scope" role="status">Contribution totals are temporarily unavailable. <a href="https://github.com/azoni" target="_blank" rel="noopener noreferrer">View GitHub &nearr;</a></p>}

        {attribution && (
          <div className="commit-band-split">
            <p className="commit-split-caption">AI tags in {attribution.sampleSize.toLocaleString()} recent public commits</p>
            <div
              className="hero-split-bar commit-split-bar"
              role="img"
              aria-label={attribution.segments.map(({ value, label }) => `${value} ${label}`).join(', ')}
            >
              {attribution.segments.map(({ key, value, label }) => <span key={key} className={`hero-split-seg hero-split-seg--${key}`} style={{ width: `${(value / attribution.sampleSize) * 100}%` }} title={`${value} ${label}`} />)}
            </div>
            <ul className="hero-split-legend commit-split-legend">
              {attribution.segments.map(({ key, value, label }) => <li key={key}><span className={`hero-split-dot hero-split-seg--${key}`} /> {label} <strong>{value.toLocaleString()}</strong></li>)}
            </ul>
            <p className="commit-attribution-note">A separate sample from selected public projects, based on commit metadata. Untagged commits may still involve AI.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CommitStats;
