import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import SecondaryPageLinks from '../components/SecondaryPageLinks';
import Leaderboard from './Leaderboard';
import Activity from './Activity';
import Commits from './Commits';
import HowThisSiteRuns from '../components/home/HowThisSiteRuns';
import '../styles/live-warm.css';

// One "Live" page that consolidates the ecosystem-proof views that used to be
// three separate top-level nav tabs (Leaderboard / Activity / Commits). Each
// is rendered in `embedded` mode (no own Layout or page title) under a shared
// header + sub-nav. Only the active view mounts, so its live listeners/fetches
// don't run in the background.

const VIEWS = [
  { key: 'traffic', label: 'Usage', blurb: 'Reported traffic across public sites, applications, extensions, and bots.' },
  { key: 'activity', label: 'Agent operations', blurb: 'Aggregate usage and operational totals from the agent services.' },
  { key: 'commits', label: 'Code changes', blurb: 'Recent commits from connected public repositories.' },
  { key: 'stack', label: 'How it runs', blurb: 'The agents and infrastructure behind this site.' },
];

export default function Live() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('view');
  const view = VIEWS.some((v) => v.key === requested) ? requested : 'traffic';

  const select = useCallback(
    (key) => {
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('view', key);
        return next;
      }, { replace: true });
    },
    [setParams]
  );

  const active = VIEWS.find((v) => v.key === view) || VIEWS[0];
  const tabParam = params.get('tab');
  const initialTab = ['sites', 'extensions', 'bots'].includes(tabParam) ? tabParam : 'sites';
  const onTabKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % VIEWS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + VIEWS.length - 1) % VIEWS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = VIEWS.length - 1;
    else return;
    event.preventDefault();
    select(VIEWS[nextIndex].key);
    document.getElementById(`live-tab-${VIEWS[nextIndex].key}`)?.focus();
  };

  return (
    <Layout>
      <Seo
        title="Public systems"
        description="A live view of usage, agent activity, and code changes across Charlton Smith's public software projects."
        path="/live"
      />
      <div className="live-page secondary-page">
        <div className="live-header-wrap">
          <header className="live-header">
            <p className="secondary-eyebrow">Studio / Operations</p>
            <h1 className="live-heading">Public systems</h1>
            <p className="live-lede">
              A view into the software I build and run independently: usage, agent activity,
              and ongoing development across my independent projects.
            </p>
            <SecondaryPageLinks compact />
            <nav className="live-tabs" role="tablist" aria-label="Live views">
              {VIEWS.map((v, index) => (
                <button
                  key={v.key}
                  id={`live-tab-${v.key}`}
                  type="button"
                  role="tab"
                  aria-selected={view === v.key}
                  aria-controls="live-view-panel"
                  tabIndex={view === v.key ? 0 : -1}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
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

        <div className="live-body" id="live-view-panel" role="tabpanel" aria-labelledby={`live-tab-${view}`} tabIndex={0}>
          {view === 'traffic' && <Leaderboard embedded initialTab={initialTab} />}
          {view === 'activity' && <Activity embedded />}
          {view === 'commits' && <Commits embedded />}
          {view === 'stack' && <HowThisSiteRuns />}
        </div>
      </div>
    </Layout>
  );
}
