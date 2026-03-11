import React from 'react';
import { motion } from 'framer-motion';
import { avatars } from '../../data/agents';
import { CATEGORY_STYLES, AGENT_IDLE, formatTimeAgo } from '../../utils/station-mapping';

function WorkstationCard({
  station,
  lastEvent,
  activityCounts = {},
  isFlashing,
  isWalking,
  onClick,
  index = 0,
  roomNumber,
  door,
}) {
  const cat = CATEGORY_STYLES[station.category];
  const idle = station.agent ? AGENT_IDLE[station.agent] : null;
  const hasAvatar = station.agent && avatars[station.agent];
  const eventMs = lastEvent?.receivedAt || 0;
  const h1 = activityCounts.h1 || 0;
  const h24 = activityCounts.h24 || 0;

  return (
    <motion.div
      className={`aw-station-card aw-theme-${station.id}${isFlashing ? ' aw-station-active' : ''}${isWalking ? ' aw-agent-walking' : ''}`}
      style={{ '--station-color': station.color }}
      data-door={door}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.06, ease: 'easeOut' }}
      onClick={() => onClick(station)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(station)}
    >
      {/* Room number badge */}
      {roomNumber && <span className="aw-room-badge">R-{String(roomNumber).padStart(2, '0')}</span>}

      {/* Scene area with workspace illustration */}
      <div className="aw-station-scene">
        {/* Themed workspace props (rendered via CSS) */}
        <div className="aw-scene-props">
          <WorkspaceProps stationId={station.id} color={station.color} />
        </div>

        {/* Avatar */}
        {hasAvatar && (
          <motion.div
            className="aw-station-avatar"
            animate={{ y: [0, -(idle?.bobAmt || 2), 0] }}
            transition={{
              duration: (idle?.bobSpeed || 3000) / 1000,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {avatars[station.agent](56)}
          </motion.div>
        )}

        {/* Non-agent icon */}
        {!hasAvatar && (
          <div className="aw-station-icon">
            <StationIcon icon={station.icon} color={station.color} />
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="aw-station-info">
        <div className="aw-station-header">
          <span className="aw-station-dot" style={{ background: station.color }} />
          <span className="aw-station-name">{station.label}</span>
          {cat && <span className="aw-station-cat" style={{ color: cat.color }}>{cat.label}</span>}
        </div>

        {lastEvent && (
          <div className="aw-station-event">
            <span className="aw-event-title">{lastEvent.title || lastEvent.type}</span>
            <span className="aw-event-time">{formatTimeAgo(eventMs)}</span>
          </div>
        )}

        {(h1 > 0 || h24 > 0) && (
          <div className="aw-station-counts">
            {h1 > 0 && <span className="aw-count">{h1}<small>/1h</small></span>}
            {h24 > 0 && <span className="aw-count">{h24}<small>/24h</small></span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Themed workspace props for each station ───
function WorkspaceProps({ stationId, color }) {
  switch (stationId) {
    case 'chatbot': return <ChatWorkspace color={color} />;
    case 'blog': return <BlogWorkspace color={color} />;
    case 'orchestrator': return <OrchestratorWorkspace color={color} />;
    case 'spellbrigade': return <GamingWorkspace color={color} />;
    case 'moltbook': return <SocialWorkspace color={color} />;
    case 'oldwaystoday': return <WellnessWorkspace color={color} />;
    case 'benchpressonly': return <FitnessWorkspace color={color} />;
    case 'rowcrew': return <RowingWorkspace color={color} />;
    case 'embedroute': return <DataWorkspace icon="nodes" color={color} />;
    case 'activity': return <DataWorkspace icon="pulse" color={color} />;
    case 'fabstats': return <DataWorkspace icon="shield" color={color} />;
    case 'fabstatsbot': return <DataWorkspace icon="bot" color={color} />;
    default: return null;
  }
}

// ─── Chat: Terminal desk with monitor, keyboard, coffee ───
function ChatWorkspace({ color }) {
  return (
    <div className="aw-props-chat">
      <div className="aw-chat-monitor" style={{ '--glow': color }}>
        <div className="aw-chat-screen">
          <div className="aw-chat-line" style={{ width: '70%' }} />
          <div className="aw-chat-line" style={{ width: '50%' }} />
          <div className="aw-chat-line aw-chat-line-cursor" style={{ width: '30%' }} />
        </div>
      </div>
      <div className="aw-chat-keyboard">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aw-chat-key" />
        ))}
      </div>
      <div className="aw-chat-mug">
        <div className="aw-chat-steam">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

// ─── Blog: Writer's study with books, parchment, candle ───
function BlogWorkspace({ color }) {
  return (
    <div className="aw-props-blog">
      <div className="aw-blog-books">
        <div className="aw-blog-book" style={{ background: '#c084fc' }} />
        <div className="aw-blog-book" style={{ background: '#f59e0b' }} />
        <div className="aw-blog-book" style={{ background: '#60a5fa' }} />
      </div>
      <div className="aw-blog-parchment">
        <div className="aw-blog-text-line" style={{ width: '80%' }} />
        <div className="aw-blog-text-line" style={{ width: '60%' }} />
        <div className="aw-blog-text-line" style={{ width: '70%' }} />
      </div>
      <div className="aw-blog-candle">
        <div className="aw-blog-flame" />
        <div className="aw-blog-wax" />
      </div>
    </div>
  );
}

// ─── Orchestrator: Command center with hex platform, holo panels ───
function OrchestratorWorkspace({ color }) {
  return (
    <div className="aw-props-orch">
      <div className="aw-orch-hex" />
      <div className="aw-orch-panel aw-orch-panel-l">
        <div className="aw-orch-bar" style={{ height: '60%' }} />
        <div className="aw-orch-bar" style={{ height: '80%' }} />
        <div className="aw-orch-bar" style={{ height: '40%' }} />
        <div className="aw-orch-bar" style={{ height: '90%' }} />
      </div>
      <div className="aw-orch-panel aw-orch-panel-r">
        <div className="aw-orch-bar" style={{ height: '50%' }} />
        <div className="aw-orch-bar" style={{ height: '70%' }} />
        <div className="aw-orch-bar" style={{ height: '85%' }} />
        <div className="aw-orch-bar" style={{ height: '35%' }} />
      </div>
      <div className="aw-orch-ring">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="aw-orch-dot" style={{ '--i': i }} />
        ))}
      </div>
    </div>
  );
}

// ─── Gaming: Magic circle, crystals, spell book ───
function GamingWorkspace({ color }) {
  return (
    <div className="aw-props-gaming">
      <div className="aw-gaming-circle" />
      <div className="aw-gaming-crystal aw-gaming-crystal-l" />
      <div className="aw-gaming-crystal aw-gaming-crystal-r" />
      <div className="aw-gaming-book" />
    </div>
  );
}

// ─── Social: Broadcast stage with mic, speakers, sound bars ───
function SocialWorkspace({ color }) {
  return (
    <div className="aw-props-social">
      <div className="aw-social-stage" />
      <div className="aw-social-speaker aw-social-speaker-l" />
      <div className="aw-social-speaker aw-social-speaker-r" />
      <div className="aw-social-mic" />
      <div className="aw-social-bars">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="aw-social-bar" style={{ '--i': i }} />
        ))}
      </div>
    </div>
  );
}

// ─── Wellness: Herb garden with plants, mortar ───
function WellnessWorkspace({ color }) {
  return (
    <div className="aw-props-wellness">
      <div className="aw-wellness-bed" />
      <div className="aw-wellness-plant aw-wellness-plant-1" />
      <div className="aw-wellness-plant aw-wellness-plant-2" />
      <div className="aw-wellness-plant aw-wellness-plant-3" />
      <div className="aw-wellness-mortar" />
    </div>
  );
}

// ─── Fitness: Home gym with rack, barbell, mat ───
function FitnessWorkspace({ color }) {
  return (
    <div className="aw-props-fitness">
      <div className="aw-fitness-mat" />
      <div className="aw-fitness-rack">
        <div className="aw-fitness-post" />
        <div className="aw-fitness-post" />
        <div className="aw-fitness-plate" />
        <div className="aw-fitness-plate aw-fitness-plate-2" />
      </div>
      <div className="aw-fitness-barbell">
        <div className="aw-fitness-weight" />
        <div className="aw-fitness-bar" />
        <div className="aw-fitness-weight" />
      </div>
    </div>
  );
}

// ─── Rowing: Dock with water, oar rack ───
function RowingWorkspace({ color }) {
  return (
    <div className="aw-props-rowing">
      <div className="aw-rowing-water">
        <div className="aw-rowing-ripple" />
        <div className="aw-rowing-ripple aw-rowing-ripple-2" />
      </div>
      <div className="aw-rowing-dock" />
      <div className="aw-rowing-oar" />
    </div>
  );
}

// ─── Data stations: Simple icon-focused ───
function DataWorkspace({ icon, color }) {
  return (
    <div className="aw-props-data">
      <div className="aw-data-glow" style={{ background: `radial-gradient(circle, ${color}15 0%, transparent 70%)` }} />
      <div className="aw-data-ring" style={{ borderColor: `${color}30` }} />
    </div>
  );
}

// ─── Station icon SVGs ───
function StationIcon({ icon, color }) {
  const s = 24;
  switch (icon) {
    case 'chat':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      );
    case 'pen':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    case 'gear':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      );
    case 'wand':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5" />
          <path d="M9.5 14.5l-7 7" />
        </svg>
      );
    case 'megaphone':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      );
    case 'leaf':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.5.36C19.32 21.34 22 13 22 4c-5 0-9.27 1-13 4" />
          <path d="M6 15c-2 0-4 1.5-4 3.5C2 20.68 4 22 6 22c2.5 0 4-1 4-3.5C10 16.5 8 15 6 15z" />
        </svg>
      );
    case 'dumbbell':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 6.5h11M6.5 17.5h11" /><rect x="2" y="4.5" width="4.5" height="15" rx="1" /><rect x="17.5" y="4.5" width="4.5" height="15" rx="1" /><path d="M6.5 12h11" />
        </svg>
      );
    case 'nodes':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><circle cx="18" cy="6" r="3" /><path d="M6 9v6M8.5 7.5l7 7M15.5 7.5l-7 7" />
        </svg>
      );
    case 'waves':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
          <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
          <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        </svg>
      );
    case 'pulse':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'shield':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'bot':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
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

export default WorkstationCard;
