import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AGENTS } from '../../data/agents';
import { CATEGORY_STYLES, DOMAIN_TO_STATION, formatTimeAgo } from '../../utils/station-mapping';

const AGENT_KEY_MAP = { wellness: 'oldways', oldwaystoday: 'oldways' };

function StationDetailPanel({ station, stationHistory, activityCounts, health, onClose }) {
  return createPortal(
    <AnimatePresence>
      {station && (() => {
        const agentKey = station.agent || station.id;
        const agentData = AGENTS[AGENT_KEY_MAP[agentKey] || agentKey] || AGENTS[station.id] || null;
        const cat = CATEGORY_STYLES[station.category];
        const h1 = activityCounts?.h1 || 0;
        const h24 = activityCounts?.h24 || 0;
        const events = (stationHistory || []).slice(0, 10);
        const domain = Object.entries(DOMAIN_TO_STATION).find(([, v]) => v === station.id)?.[0];
        const mcpStatus = domain && health?.[domain];
        const statusText = mcpStatus === true ? 'online' : mcpStatus === false ? 'offline' : station.isHub ? 'hub' : 'connected';
        const statusColor = mcpStatus === true ? '#4ade80' : mcpStatus === false ? '#f87171' : '#60a5fa';

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
                <div className="aw-detail-status">
                  <span className="aw-detail-status-dot" style={{ background: statusColor }} />
                  {statusText}
                </div>

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

                {/* About */}
                {(agentData?.whatItIs || station.desc) && (
                  <div className="aw-detail-section">
                    <div className="aw-detail-section-title">About</div>
                    <div className="aw-detail-text">{agentData?.whatItIs || station.desc}</div>
                  </div>
                )}

                {/* Tech stack */}
                {agentData?.tech && (
                  <div className="aw-detail-section">
                    <div className="aw-detail-section-title">Tech Stack</div>
                    <div className="aw-detail-tags">
                      {agentData.tech.map((t, i) => (
                        <span key={i} className="aw-detail-tag" style={{ borderColor: `${station.color}40`, color: station.color }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* How it works */}
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

                {/* Data sources */}
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
