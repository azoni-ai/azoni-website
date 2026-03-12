import React from 'react';
import { motion } from 'framer-motion';
import BorderBeam from '../ui/border-beam';
import { formatTimeAgo } from '../../utils/station-mapping';

function SecondaryHub({ station, isFlashing, lastEvent, activityCounts = {}, visitCount = 0, onClick }) {
  const eventMs = lastEvent?.receivedAt || 0;
  const h24 = activityCounts.h24 || 0;

  return (
    <motion.div
      className={`aw-secondary-hub${isFlashing ? ' aw-station-active' : ''}`}
      style={{ '--hub-color': station.color, '--station-color': station.color }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
      onClick={() => onClick(station)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(station)}
    >
      <BorderBeam color={station.color} colorTo={`${station.color}80`} duration={7} borderWidth={1.5} />

      <div className="aw-secondary-content">
        <div className="aw-secondary-icon">
          <HubIcon icon={station.icon} color={station.color} />
        </div>

        <div className="aw-secondary-info">
          <div className="aw-secondary-label">{station.label}</div>
          <div className="aw-secondary-desc">{station.desc}</div>
        </div>

        <div className="aw-secondary-stats">
          {h24 > 0 && <span className="aw-secondary-stat">{h24}<small>/24h</small></span>}
          {visitCount > 0 && <span className="aw-secondary-stat">{visitCount}<small> visits</small></span>}
          {lastEvent && <span className="aw-secondary-ago">{formatTimeAgo(eventMs)}</span>}
        </div>

        <div className="aw-secondary-badge">
          <span className="aw-secondary-badge-dot" style={{ background: station.color }} />
          hub
        </div>
      </div>
    </motion.div>
  );
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
