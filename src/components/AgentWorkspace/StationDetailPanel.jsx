import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AGENTS } from '../../data/agents';
import { getProjectById } from '../../data/projects';
import { CATEGORY_STYLES, DOMAIN_TO_STATION, STATION_TO_PROJECT, formatTimeAgo } from '../../utils/station-mapping';

const AGENT_KEY_MAP = { wellness: 'oldways', oldwaystoday: 'oldways', hq: 'orchestrator', content: 'blog', fab: 'fabstats' };

const TABS = [
  { key: 'activity', label: 'Activity' },
  { key: 'about', label: 'About' },
  { key: 'tech', label: 'Tech' },
];

function StationDetailPanel({ station, stationHistory, activityCounts, visitCount = 0, health, appStats, githubStats, onClose }) {
  const [activeTab, setActiveTab] = useState('activity');

  return createPortal(
    <AnimatePresence>
      {station && (() => {
        const agentKey = station.agent || station.id;
        const agentData = AGENTS[AGENT_KEY_MAP[agentKey] || agentKey] || AGENTS[station.id] || null;
        const cat = CATEGORY_STYLES[station.category];
        const h1 = activityCounts?.h1 || 0;
        const h24 = activityCounts?.h24 || 0;
        const events = (stationHistory || []).filter(e => e.type !== 'site_visit' && e.type !== 'error_logged').slice(0, 10);
        const errors = (stationHistory || []).filter(e => e.type === 'error_logged');
        const domain = Object.entries(DOMAIN_TO_STATION).find(([, v]) => v === station.id)?.[0];
        const mcpStatus = domain && health?.[domain];
        const statusText = mcpStatus === true ? 'online' : mcpStatus === false ? 'offline' : station.isHub ? 'hub' : 'connected';
        const statusColor = mcpStatus === true ? '#4ade80' : mcpStatus === false ? '#f87171' : '#60a5fa';
        const project = getProjectById(STATION_TO_PROJECT[station.id]);
        const isExternal = station.url && station.url.startsWith('http');

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
                      {station.id === 'gym' && (appStats?.benchpressonly || appStats?.rowcrew) && (() => {
                        const bpUsers = Number(appStats.benchpressonly?.users) || 0;
                        const rcUsers = Number(appStats.rowcrew?.users || appStats.rowcrew?.totalUsers) || 0;
                        const totalUsers = bpUsers + rcUsers;
                        const workouts = Number(appStats.benchpressonly?.workoutsLogged) || 0;
                        const meters = Number(appStats.rowcrew?.meters) || 0;
                        return (
                          <div className="aw-detail-section">
                            <div className="aw-detail-section-title">Live Stats</div>
                            <div className="aw-detail-stats">
                              {totalUsers > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{totalUsers.toLocaleString()}</div><div className="aw-detail-stat-label">users</div></div>}
                              {workouts > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{workouts.toLocaleString()}</div><div className="aw-detail-stat-label">workouts</div></div>}
                              {meters > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{meters.toLocaleString()}</div><div className="aw-detail-stat-label">meters rowed</div></div>}
                            </div>
                          </div>
                        );
                      })()}
                      {station.id === 'oldwaystoday' && appStats?.oldwaystoday && (
                        <div className="aw-detail-section">
                          <div className="aw-detail-section-title">Live Stats</div>
                          <div className="aw-detail-stats">
                            {appStats.oldwaystoday.requests > 0 && <div className="aw-detail-stat" style={{ borderColor: `${station.color}30` }}><div className="aw-detail-stat-num" style={{ color: station.color }}>{Number(appStats.oldwaystoday.requests).toLocaleString()}</div><div className="aw-detail-stat-label">requests</div></div>}
                          </div>
                        </div>
                      )}

                      {/* Scribe — recent commits from git activity */}
                      {station.id === 'content' && githubStats?.recentCommits?.length > 0 && (
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
