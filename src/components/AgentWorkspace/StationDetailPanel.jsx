import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AGENTS } from '../../data/agents';
import { getProjectById } from '../../data/projects';
import { CATEGORY_STYLES, DOMAIN_TO_STATION, STATION_TO_PROJECT, formatTimeAgo } from '../../utils/station-mapping';

const AGENT_KEY_MAP = { wellness: 'oldways', oldwaystoday: 'oldways', conductor: 'orchestrator', chatbot: 'chat', scribe: 'blog', moltbook: 'social', fab: 'fabstats' };

const TABS = [
  { key: 'activity', label: 'Activity' },
  { key: 'about', label: 'About' },
  { key: 'tech', label: 'Tech' },
];

function StationDetailPanel({ station, stationHistory, activityCounts, visitCount = 0, pageViewCount = 0, health, appStats, githubStats, onClose }) {
  const [activeTab, setActiveTab] = useState('activity');

  return createPortal(
    <AnimatePresence>
      {station && (() => {
        const agentKey = station.agent || station.id;
        const agentData = AGENTS[AGENT_KEY_MAP[agentKey] || agentKey] || AGENTS[station.id] || null;
        const cat = CATEGORY_STYLES[station.category];
        const h1 = activityCounts?.h1 || 0;
        const h24 = activityCounts?.h24 || 0;
        const events = (stationHistory || []).filter(e => e.type !== 'site_visit' && e.type !== 'error_logged' && e.type !== 'page_view_summary').slice(0, 10);
        const errors = (stationHistory || []).filter(e => e.type === 'error_logged');
        const domain = Object.entries(DOMAIN_TO_STATION).find(([, v]) => v === station.id)?.[0];
        const mcpStatus = domain && health?.[domain];
        const statusText = mcpStatus === true ? 'online' : mcpStatus === false ? 'offline' : station.isHub ? 'hub' : 'connected';
        const statusColor = mcpStatus === true ? '#4ade80' : mcpStatus === false ? '#f87171' : '#60a5fa';
        const project = getProjectById(STATION_TO_PROJECT[station.id]);
        const isExternal = station.url && station.url.startsWith('http');

        // Archive stations (career/earlier work) — simplified panel
        if (station.isArchive) {
          return (
            <>
              <motion.div
                className="aw-detail-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
              />
              <motion.div
                className="aw-detail-wrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <motion.div
                  className="aw-detail"
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <button className="aw-detail-close" onClick={onClose}>&times;</button>
                  <div className="aw-detail-header">
                    {station.logo && <img src={station.logo} alt="" style={{ width: 32, height: 32, borderRadius: 6, marginRight: 8 }} />}
                    <h2 className="aw-detail-name">{station.label}</h2>
                    {cat && <span className="aw-detail-cat" style={{ color: cat.color }}>{cat.label}</span>}
                  </div>
                  <div className="aw-detail-role">{station.tagline}</div>
                  <div className="aw-detail-quote">{station.desc}</div>
                  {station.tech && station.tech.length > 0 && (
                    <div className="aw-detail-tech-inline">
                      {station.tech.map((t, i) => (
                        <span key={i} className="aw-detail-tech-chip" style={{ borderColor: `${station.color}30`, color: station.color }}>{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="aw-detail-status-row" style={{ marginTop: 12 }}>
                    <Link to="/resume" className="aw-detail-visit-link" style={{ background: station.color }}>
                      View Resume
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            </>
          );
        }

        return (
          <>
            <motion.div
              className="aw-detail-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              className="aw-detail-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <motion.div
                className="aw-detail"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <button className="aw-detail-close" onClick={onClose}>&times;</button>

                {/* Header */}
                <div className="aw-detail-header">
                  <span className="aw-detail-dot" style={{ background: station.color }} />
                  <h2 className="aw-detail-name">{agentData?.name || station.label}</h2>
                  {cat && <span className="aw-detail-cat" style={{ color: cat.color }}>{cat.label}</span>}
                </div>
                {agentData?.role && <div className="aw-detail-role">{agentData.role}</div>}
                {(agentData?.quote || station.desc) && (
                  <div className="aw-detail-quote">{agentData?.quote || station.desc}</div>
                )}
                {/* Inline tech chips (always visible) */}
                {(() => {
                  const techList = project?.tech || agentData?.tech;
                  return techList && techList.length > 0 ? (
                    <div className="aw-detail-tech-inline">
                      {techList.slice(0, 5).map((t, i) => (
                        <span key={i} className="aw-detail-tech-chip" style={{ borderColor: `${station.color}30`, color: station.color }}>{t}</span>
                      ))}
                    </div>
                  ) : null;
                })()}

                <div className="aw-detail-status-row">
                  <div className="aw-detail-status">
                    <span className="aw-detail-status-dot" style={{ background: statusColor }} />
                    {statusText}
                  </div>
                  {station.url && (
                    isExternal ? (
                      <a href={station.url} target="_blank" rel="noopener noreferrer" className="aw-detail-visit-link" style={{ background: station.color }}>
                        Visit ↗
                      </a>
                    ) : (
                      <Link to={station.url} className="aw-detail-visit-link" style={{ background: station.color }}>
                        Visit
                      </Link>
                    )
                  )}
                </div>

                {/* Tabs */}
                <div className="aw-detail-tabs">
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      className={`aw-detail-tab${activeTab === tab.key ? ' aw-detail-tab-active' : ''}`}
                      style={activeTab === tab.key ? { '--tab-color': station.color } : undefined}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="aw-detail-tab-content">
                  {activeTab === 'activity' && (
                    <>
                      {/* Activity stats */}
                      <div className="aw-detail-stats">
                        <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}>
                          <div className="aw-detail-stat-num" style={{ color: station.color }}>{h1}</div>
                          <div className="aw-detail-stat-label">last hour</div>
                        </div>
                        <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}>
                          <div className="aw-detail-stat-num" style={{ color: station.color }}>{h24}</div>
                          <div className="aw-detail-stat-label">last 24h</div>
                        </div>
                        {visitCount > 0 && (
                          <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}>
                            <div className="aw-detail-stat-num" style={{ color: station.color }}>{visitCount}</div>
                            <div className="aw-detail-stat-label">visits (24h)</div>
                          </div>
                        )}
                        {pageViewCount > 0 && (
                          <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}>
                            <div className="aw-detail-stat-num" style={{ color: station.color }}>{pageViewCount.toLocaleString()}</div>
                            <div className="aw-detail-stat-label">page views (24h)</div>
                          </div>
                        )}
                      </div>

                      {/* Recent events */}
                      <div className="aw-detail-section">
                        <div className="aw-detail-section-title">Recent Activity</div>
                        {events.length > 0 ? (
                          <div className="aw-detail-events">
                            {events.map((evt, i) => (
                              <div key={i} className="aw-detail-event">
                                <span className="aw-detail-event-title">{evt.title || evt.type}</span>
                                <span className="aw-detail-event-ago">{formatTimeAgo(evt.ms)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="aw-detail-empty">No events recorded yet</div>
                        )}
                      </div>

                      {/* Errors */}
                      {errors.length > 0 && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title" style={{ color: '#f87171' }}>Errors ({errors.length})</div>
                          <div className="aw-detail-events">
                            {errors.slice(0, 10).map((err, i) => (
                              <div key={i} className="aw-detail-event aw-detail-error-event">
                                <span className="aw-detail-event-title">{err.title || err.description || err.type}</span>
                                <span className="aw-detail-event-ago">{formatTimeAgo(err.ms)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Live app metrics */}
                      {station.id === 'fab' && appStats?.fabstats && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title">Live Stats</div>
                          <div className="aw-detail-stats">
                            {appStats.fabstats.users > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{Number(appStats.fabstats.users).toLocaleString()}</div><div className="aw-detail-stat-label">players</div></div>}
                            {appStats.fabstats.matches > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{Number(appStats.fabstats.matches).toLocaleString()}</div><div className="aw-detail-stat-label">matches</div></div>}
                          </div>
                        </div>
                      )}
                      {station.id === 'benchpress' && appStats?.benchpressonly && (() => {
                        const bp = appStats.benchpressonly;
                        const users = Number(bp.users) || 0;
                        const workouts = Number(bp.workoutsLogged) || 0;
                        return (users > 0 || workouts > 0) ? (
                          <div className="aw-detail-section">
                            <div className="aw-detail-section-title">Live Stats</div>
                            <div className="aw-detail-stats">
                              {users > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{users.toLocaleString()}</div><div className="aw-detail-stat-label">users</div></div>}
                              {workouts > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{workouts.toLocaleString()}</div><div className="aw-detail-stat-label">workouts</div></div>}
                            </div>
                          </div>
                        ) : null;
                      })()}
                      {station.id === 'rowcrew' && appStats?.rowcrew && (() => {
                        const rc = appStats.rowcrew;
                        const meters = Number(rc.meters) || 0;
                        const users = Number(rc.users || rc.totalUsers || rc.uniqueRowers) || 0;
                        const progress = Number(rc.worldProgressPercent) || 0;
                        const goalMeters = Number(rc.worldGoalMeters) || 40075000;
                        return (meters > 0 || users > 0) ? (
                          <div className="aw-detail-section">
                            <div className="aw-detail-section-title">Live Stats</div>
                            <div className="aw-detail-stats">
                              {users > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{users.toLocaleString()}</div><div className="aw-detail-stat-label">rowers</div></div>}
                              {meters > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{meters.toLocaleString()}</div><div className="aw-detail-stat-label">meters rowed</div></div>}
                            </div>
                            {progress > 0 && (
                              <div className="aw-detail-progress">
                                <div className="aw-detail-progress-label">Around the World ({(goalMeters / 1000).toLocaleString()} km)</div>
                                <div className="aw-detail-progress-bar">
                                  <div className="aw-detail-progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: station.color }} />
                                </div>
                                <div className="aw-detail-progress-pct">{progress.toFixed(1)}%</div>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                      {station.id === 'oldwaystoday' && appStats?.oldwaystoday && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title">Live Stats</div>
                          <div className="aw-detail-stats">
                            {appStats.oldwaystoday.requests > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{Number(appStats.oldwaystoday.requests).toLocaleString()}</div><div className="aw-detail-stat-label">requests</div></div>}
                          </div>
                        </div>
                      )}

                      {/* Launchpad — per-app view breakdown */}
                      {station.id === 'launchpad' && appStats?.launchpad && (() => {
                        const lp = appStats.launchpad;
                        const totalApps = Number(lp.totalApps) || 0;
                        const totalViews = Number(lp.totalViews24h) || 0;
                        const apps = lp.apps || [];
                        return (
                          <div className="aw-detail-section">
                            <div className="aw-detail-section-title">Live Stats</div>
                            <div className="aw-detail-stats">
                              <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}>
                                <div className="aw-detail-stat-num" style={{ color: station.color }}>{totalApps}</div>
                                <div className="aw-detail-stat-label">apps</div>
                              </div>
                              <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}>
                                <div className="aw-detail-stat-num" style={{ color: station.color }}>{totalViews.toLocaleString()}</div>
                                <div className="aw-detail-stat-label">views (24h)</div>
                              </div>
                            </div>
                            {apps.length > 0 && (
                              <div className="aw-detail-events" style={{ marginTop: '8px' }}>
                                {apps.map((app) => (
                                  <div key={app.name} className="aw-detail-event" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="aw-detail-event-title" style={{ fontWeight: 600 }}>{app.name}</span>
                                    <span style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', opacity: 0.7 }}>
                                      <span>{app.views24h} today</span>
                                      <span>{app.viewsTotal?.toLocaleString()} total</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Scribe — recent commits from git activity */}
                      {station.id === 'scribe' && githubStats?.recentCommits?.length > 0 && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title">Recent Commits</div>
                          <div className="aw-detail-events">
                            {githubStats.recentCommits.slice(0, 8).map((c, i) => (
                              <div key={i} className="aw-detail-event">
                                <span className="aw-detail-event-title">{(c.message || '').split('\n')[0]}</span>
                                <span className="aw-detail-event-ago">{c.repo}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'about' && (
                    <>
                      {(agentData?.whatItIs || station.desc) && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title">About</div>
                          <div className="aw-detail-text">{agentData?.whatItIs || station.desc}</div>
                        </div>
                      )}
                      {project?.description && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-text">{project.description}</div>
                        </div>
                      )}
                      {agentData?.cycle && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title">How It Works</div>
                          <ol className="aw-detail-cycle">
                            {agentData.cycle.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {agentData?.data && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title">Data Sources</div>
                          <ul className="aw-detail-data-list">
                            {agentData.data.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {project?.highlights && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title">Highlights</div>
                          <ul className="aw-detail-highlights">
                            {project.highlights.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {project?.links && (project.links.live || project.links.github) && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title">Links</div>
                          <div className="aw-detail-links">
                            {project.links.live && (
                              <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="aw-detail-link" style={{ borderColor: `${station.color}40`, color: station.color }}>
                                Live Site ↗
                              </a>
                            )}
                            {project.links.github && (
                              <a href={project.links.github} target="_blank" rel="noopener noreferrer" className="aw-detail-link" style={{ borderColor: `${station.color}40`, color: station.color }}>
                                GitHub ↗
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'tech' && (
                    <>
                      {agentData?.tech ? (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title">Tech Stack</div>
                          <div className="aw-detail-tags">
                            {agentData.tech.map((t, i) => (
                              <span key={i} className="aw-detail-tag" style={{ borderColor: `${station.color}40`, color: station.color }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="aw-detail-empty">No tech info available</div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        );
      })()}
    </AnimatePresence>,
    document.body
  );
}

export default StationDetailPanel;
