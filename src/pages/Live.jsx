import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Leaderboard from './Leaderboard';
import Activity from './Activity';
import Commits from './Commits';
import '../styles/live-warm.css';

// One "Live" page that consolidates the ecosystem-proof views that used to be
// three separate top-level nav tabs (Leaderboard / Activity / Commits). Each
// is rendered in `embedded` mode (no own Layout or page title) under a shared
// header + sub-nav. Only the active view mounts, so its live listeners/fetches
// don't run in the background.

const VIEWS = [
  { key: 'traffic', label: 'Traffic', blurb: 'Every site, app, extension, and bot I run — ranked by real usage.' },
  { key: 'activity', label: 'Agent activity', blurb: 'Every action my agents take across the ecosystem, logged in real time.' },
  { key: 'commits', label: 'Commits', blurb: 'A live feed of every commit I push, across every repo.' },
];

export default function Live() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('view');
  const initial = VIEWS.some((v) => v.key === requested) ? requested : 'traffic';
  const [view, setView] = useState(initial);

  const select = useCallback(
    (key) => {
      setView(key);
      setParams({ view: key }, { replace: true });
    },
    [setParams]
  );

  const active = VIEWS.find((v) => v.key === view) || VIEWS[0];

  return (
    <Layout>
      <div className="live-page">
        <div className="live-header-wrap">
          <header className="live-header">
            <p className="live-eyebrow">Live</p>
            <h1 className="live-heading">The ecosystem, running</h1>
            <p className="live-lede">
              Proof over claims — traffic across everything I run, my agents&rsquo; actions as they
              happen, and every commit I push. All live, no screenshots.
            </p>
            <nav className="live-tabs" role="tablist" aria-label="Live views">
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  role="tab"
                  aria-selected={view === v.key}
                  className={`live-tab${view === v.key ? ' is-active' : ''}`}
                  onClick={() => select(v.key)}
                >
                  {v.label}
                </button>
              ))}
            </nav>
            <p className="live-viewnote">{active.blurb}</p>
          </header>
        </div>

        <div className="live-body">
          {view === 'traffic' && <Leaderboard embedded />}
          {view === 'activity' && <Activity embedded />}
          {view === 'commits' && <Commits embedded />}
        </div>
      </div>
    </Layout>
  );
}
