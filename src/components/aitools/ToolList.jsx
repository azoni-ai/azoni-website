import React from 'react';
import { fmtDateTime, relativeTime, sharedVenues } from './aitools-lib';

const ToolList = ({ state, error, tools, total, openSlug, opening, now, onOpen, onRetry }) => {
  if (state === 'loading') {
    return <div className="ait-note">Loading tools…</div>;
  }
  if (state === 'error') {
    return (
      <div className="ait-note">
        <p className="ait-error">Could not load tools: {error}</p>
        <button className="ait-btn" style={{ marginTop: 10 }} onClick={onRetry}>Retry</button>
      </div>
    );
  }

  const countLine =
    tools.length === total
      ? `${total} tool${total === 1 ? '' : 's'}`
      : `${tools.length} of ${total} tool${total === 1 ? '' : 's'}`;

  return (
    <div className="ait-card">
      <div className="ait-card-head">
        <h3>All tools</h3>
        <span className="ait-hint nowrap">{countLine}</span>
      </div>
      {tools.length ? (
        <div className="ait-tablewrap">
          <table className="ait-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Category</th>
                <th>Updated</th>
                <th>Shared</th>
                <th>Research</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => (
                <tr key={t.slug} className={t.slug === openSlug ? 'is-open' : ''}>
                  <td>
                    <button
                      className="ait-linkish strong"
                      disabled={!!opening}
                      onClick={() => onOpen(t.slug)}
                    >
                      {t.name || t.slug}
                    </button>
                    {opening === t.slug && <span className="ait-hint inline"> Opening…</span>}
                    {t.maker && <div className="ait-hint">{t.maker}</div>}
                  </td>
                  <td>
                    <span className={`ait-pill ${t.status}`}>{t.status}</span>
                  </td>
                  <td className="nowrap">
                    {t.category || <span className="ait-blank">none</span>}
                  </td>
                  <td className="nowrap" title={fmtDateTime(t.updatedAt)}>
                    {relativeTime(t.updatedAt, now)}
                  </td>
                  <td className="nowrap">{sharedVenues(t.sharedOn)}</td>
                  <td className="nowrap">
                    {t.research && t.research.at ? (
                      `${t.research.mode} · ${relativeTime(t.research.at, now)}`
                    ) : (
                      <span className="ait-blank">none</span>
                    )}
                    {t.hasTake && <div className="ait-hint">take written</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ait-empty">{total ? 'No tools match.' : 'No tools yet.'}</div>
      )}
    </div>
  );
};

export default ToolList;
