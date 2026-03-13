import React from 'react';
import { motion } from 'framer-motion';
import BorderBeam from '../ui/border-beam';
import { formatTimeAgo } from '../../utils/station-mapping';

function SecondaryHub({ station, isFlashing, lastEvent, activityCounts = {}, visitCount = 0, idleLevel = 0, isHighlighted, isDimmedByHover, onClick, roomNumber, door }) {
  const eventMs = lastEvent?.receivedAt || 0;
  const h1 = activityCounts.h1 || 0;
  const h24 = activityCounts.h24 || 0;

  const idleClass = idleLevel === 2 ? ' aw-station-idle-2' : idleLevel === 1 ? ' aw-station-idle-1' : '';
  const highlightClass = isHighlighted ? ' aw-station-highlighted' : isDimmedByHover ? ' aw-station-dim-hover' : '';

  return (
    <motion.div
      className={`aw-secondary-hub${isFlashing ? ' aw-station-active' : ''}${idleClass}${highlightClass}`}
      style={{ '--hub-color': station.color, '--station-color': station.color }}
      data-door={door}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
      onClick={() => onClick(station)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(station)}
    >
      <BorderBeam color={station.color} colorTo={`${station.color}80`} duration={7} borderWidth={1.5} />

      {/* Room number badge */}
      {roomNumber && <span className="aw-room-badge">R{roomNumber}</span>}

      {/* Scene area with hub illustration */}
      <div className="aw-station-scene">
        <div className="aw-scene-props">
          <HubScene icon={station.icon} color={station.color} />
        </div>
        <div className="aw-station-icon">
          <HubIcon icon={station.icon} color={station.color} />
        </div>
      </div>

      {/* Info area — matches workstation card layout */}
      <div className="aw-station-info">
        <div className="aw-station-header">
          <span className="aw-station-dot" style={{ background: station.color }} />
          <span className="aw-station-name">{station.label}</span>
          <span className="aw-hub-badge" style={{ '--hub-color': station.color }}>HUB</span>
        </div>

        {lastEvent && lastEvent.type !== 'site_visit' ? (
          <div className="aw-station-event">
            <span className="aw-event-title">{lastEvent.title || lastEvent.type}</span>
            <span className="aw-event-time">{formatTimeAgo(eventMs)}</span>
          </div>
        ) : eventMs ? (
          <div className="aw-station-event">
            <span className="aw-event-idle">Last activity {formatTimeAgo(eventMs)}</span>
          </div>
        ) : null}

        <div className="aw-station-counts">
          {h1 > 0 && <span className="aw-count" style={{ color: station.color }}>{h1}<small>/1h</small></span>}
          {h24 > 0 && <span className="aw-count" style={{ color: station.color }}>{h24}<small>/24h</small></span>}
          {visitCount > 0 && (
            <span className="aw-count aw-visit-count">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {visitCount}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* Hub scene illustrations */
function HubScene({ icon, color }) {
  if (icon === 'nodes') {
    // EmbedRoute: routing nodes with connections
    return (
      <div className="aw-props-embed">
        <div className="aw-embed-center" style={{ borderColor: `${color}40` }}>
          <div className="aw-embed-core" style={{ background: `${color}60` }} />
        </div>
        <div className="aw-embed-line aw-embed-line-1" style={{ background: `${color}20` }} />
        <div className="aw-embed-line aw-embed-line-2" style={{ background: `${color}20` }} />
        <div className="aw-embed-line aw-embed-line-3" style={{ background: `${color}20` }} />
        <div className="aw-embed-node aw-embed-node-1" style={{ background: `${color}35` }} />
        <div className="aw-embed-node aw-embed-node-2" style={{ background: `${color}35` }} />
        <div className="aw-embed-node aw-embed-node-3" style={{ background: `${color}35` }} />
        <div className="aw-embed-pulse" style={{ borderColor: `${color}25` }} />
      </div>
    );
  }
  if (icon === 'pulse') {
    // Activity Feed: scrolling log lines
    return (
      <div className="aw-props-activity">
        <div className="aw-activity-log">
          <div className="aw-log-line" style={{ '--log-color': color }}>
            <span className="aw-log-dot" style={{ background: '#4ade80' }} />
            <span className="aw-log-bar" style={{ width: '70%', background: `${color}25` }} />
          </div>
          <div className="aw-log-line" style={{ '--log-color': color }}>
            <span className="aw-log-dot" style={{ background: '#60a5fa' }} />
            <span className="aw-log-bar" style={{ width: '50%', background: `${color}25` }} />
          </div>
          <div className="aw-log-line" style={{ '--log-color': color }}>
            <span className="aw-log-dot" style={{ background: '#fbbf24' }} />
            <span className="aw-log-bar" style={{ width: '85%', background: `${color}25` }} />
          </div>
          <div className="aw-log-line" style={{ '--log-color': color }}>
            <span className="aw-log-dot" style={{ background: '#a78bfa' }} />
            <span className="aw-log-bar" style={{ width: '40%', background: `${color}25` }} />
          </div>
        </div>
        <div className="aw-activity-pulse-line" style={{ background: `${color}15` }} />
      </div>
    );
  }
  return null;
}

function HubIcon({ icon, color }) {
  const s = 20;
  switch (icon) {
    case 'nodes':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><circle cx="18" cy="6" r="3" /><path d="M6 9v6M8.5 7.5l7 7M15.5 7.5l-7 7" />
        </svg>
      );
    case 'pulse':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export default SecondaryHub;
