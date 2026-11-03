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

// Usage and code changes for the products I run. Only the active view mounts,
// so its fetches don't run in the background. `activity` and `stack` are off the
// tab bar but still open from their ?view= links.

const VIEWS = [
  { key: 'traffic', label: 'Usage', blurb: 'Install, server and visit counts for the products I run.', tab: true },
  { key: 'commits', label: 'Code changes', blurb: 'Contribution totals and recent commits from my public projects.', tab: true },
  { key: 'activity', label: 'Agent operations', blurb: 'Aggregate usage and operational totals from the agent services.' },
  { key: 'stack', label: 'How it runs', blurb: 'The agents and infrastructure behind this site.' },
];
const TABS = VIEWS.filter((v) => v.tab);

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
  const inTabs = TABS.some((v) => v.key === view);
  const onTabKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TABS.length - 1;
    else return;
    event.preventDefault();
    select(TABS[nextIndex].key);
    document.getElementById(`live-tab-${TABS[nextIndex].key}`)?.focus();
  };

  const panelProps = inTabs
    ? { role: 'tabpanel', 'aria-labelledby': `live-tab-${view}` }
    : { role: 'region', 'aria-label': active.label };

  return (
    <Layout>
      <Seo
        title="Usage and code changes"
        description="Measured use of the products Charlton Smith runs, and recent commits to public projects."
        path="/live"
      />
      <div className="live-page secondary-page">
        <div className="live-header-wrap">
          <header className="live-header">
            <h1 className="live-heading">Usage and code changes</h1>
            <p className="live-lede">
              How many people use the products I run, where I can measure it, and what I&rsquo;ve
              changed in my public projects recently.
            </p>
            <SecondaryPageLinks compact />
            <nav className="live-tabs" role="tablist" aria-label="Live views">
              {TABS.map((v, index) => (
                <button
                  key={v.key}
                  id={`live-tab-${v.key}`}
                  type="button"
                  role="tab"
                  aria-selected={view === v.key}
                  aria-controls="live-view-panel"
                  tabIndex={view === v.key || (!inTabs && index === 0) ? 0 : -1}
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

        <div className="live-body" id="live-view-panel" tabIndex={0} {...panelProps}>
          {view === 'traffic' && <Leaderboard embedded />}
          {view === 'commits' && <Commits embedded withCommitStats />}
          {view === 'activity' && <div className="live-panel"><Activity embedded /></div>}
          {view === 'stack' && <div className="live-panel"><HowThisSiteRuns /></div>}
        </div>
      </div>
    </Layout>
  );
}
