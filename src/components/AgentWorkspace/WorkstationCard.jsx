import React from 'react';
import { motion } from 'framer-motion';
import { avatars } from '../../data/agents';
import { CATEGORY_STYLES, AGENT_IDLE, formatTimeAgo } from '../../utils/station-mapping';

const AVATAR_LABELS = {
  orchestrator: 'Conductor', chat: 'Azoni AI', blog: 'Scribe', social: 'Moltbook',
  fitness: 'Bench Only', rowing: 'RowCrew', gaming: 'Spell Brigade', oldways: 'Old Ways',
  fabstats: 'FaB Stats', fabstatsbot: 'FaB Bot', medic: 'Medic',
};

function WorkstationCard({
  station,
  lastEvent,
  activityCounts = {},
  visitCount = 0,
  isFlashing,
  walkingAgent,
  walkingAgent2,
  isHighlighted,
  isDimmedByHover,
  idleLevel = 0,
  errorCount = 0,
  onClick,
  index = 0,
  roomNumber,
  door,
  openDesk,
  basement,
  metrics,
  inspection,
  isPacing,
  showChatBubble,
  mcpStatus,
  small,
  wide,
}) {
  const cat = CATEGORY_STYLES[station.category];
  const idle = station.agent ? AGENT_IDLE[station.agent] : null;
  const idle2 = station.secondAgent ? AGENT_IDLE[station.secondAgent] : null;
  const hasAvatar = station.agent && avatars[station.agent];
  const eventMs = lastEvent?.receivedAt || 0;
  const h1 = activityCounts.h1 || 0;
  const h24 = activityCounts.h24 || 0;
  const intensity = Math.min(h24 / 20, 1);

  // Status LED: red (errors/offline), green (active <1h), yellow (1-24h), gray (>24h)
  const statusColor = errorCount > 0 || mcpStatus === false ? '#f87171' : idleLevel === 0 ? '#4ade80' : idleLevel === 1 ? '#facc15' : '#6b6b65';

  const idleClass = idleLevel === 2 ? ' aw-station-idle-2' : idleLevel === 1 ? ' aw-station-idle-1' : '';
  const highlightClass = isHighlighted ? ' aw-station-highlighted' : '';
  const dimClass = isDimmedByHover ? ' aw-station-dim-hover' : '';

  return (
    <motion.div
      className={`aw-station-card aw-theme-${station.id}${small ? ' aw-station-small' : ''}${wide ? ' aw-station-wide' : ''}${openDesk ? ' aw-open-desk' : ''}${basement ? ' aw-basement-station' : ''}${isFlashing ? ' aw-station-active' : ''}${idleClass}${highlightClass}${dimClass}`}
      style={{
        '--station-color': station.color,
        '--activity-intensity': intensity,
      }}
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

      {/* Error badge */}
      {errorCount > 0 && (
        <span className="aw-error-badge">{errorCount}</span>
      )}

      {/* Medic checkup badge */}
      {inspection && (
        <span className={`aw-inspection-badge aw-inspection-${inspection.status}`}>
          {inspection.status === 'online' ? '♥' : inspection.status === 'offline' ? '✗' : '•'}
        </span>
      )}

      {/* Scene area with workspace illustration */}
      <div className="aw-station-scene">
        {/* Themed workspace props (rendered via CSS) */}
        <div className="aw-scene-props">
          <WorkspaceProps stationId={station.id} color={station.color} />
        </div>

        {/* Basement cobweb + flickering light overlay */}
        {basement && <div className="aw-basement-overlay" />}

        {/* Avatar(s) — hide only the one that's walking */}
        {hasAvatar && (
          <div className={`aw-station-avatars${station.secondAgent ? ' aw-dual-avatar' : ''}`}>
            {walkingAgent !== station.agent && (
              <div className="aw-avatar-col">
                <span className="aw-avatar-label">{AVATAR_LABELS[station.agent]}</span>
                <motion.div
                  className={`aw-station-avatar${isPacing ? ' aw-avatar-pacing' : ''}`}
                  animate={{ y: [0, -(idle?.bobAmt || 2), 0] }}
                  transition={{
                    duration: (idle?.bobSpeed || 3000) / 1000,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {avatars[station.agent](station.secondAgent ? 40 : 56)}
                </motion.div>
              </div>
            )}
            {station.secondAgent && avatars[station.secondAgent] && walkingAgent2 !== station.secondAgent && (
              <div className="aw-avatar-col">
                <span className="aw-avatar-label">{AVATAR_LABELS[station.secondAgent]}</span>
                <motion.div
                  className="aw-station-avatar"
                  animate={{ y: [0, -(idle2?.bobAmt || 2), 0] }}
                  transition={{
                    duration: (idle2?.bobSpeed || 3000) / 1000,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {avatars[station.secondAgent](40)}
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* Medic checkup bubble */}
        {showChatBubble && (
          <div className="aw-checkup-bubble">
            <span className="aw-checkup-cross">+</span>
            <span className="aw-checkup-pulse" />
          </div>
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
        {/* Hero metrics — prominent display above station name */}
        {!small && metrics && metrics.length > 0 && (
          <div className="aw-hero-metrics">
            {metrics.map((m, i) => (
              <span key={i} className="aw-hero-metric">
                <span className="aw-hero-val">{m.value}</span>
                <span className="aw-hero-label">{m.label}</span>
              </span>
            ))}
          </div>
        )}

        <div className="aw-station-header">
          <span className="aw-status-led" style={{ background: statusColor }} />
          <span className="aw-station-name">{station.label}</span>
          {mcpStatus === false && <span className="aw-station-offline">OFFLINE</span>}
          {cat && mcpStatus !== false && <span className="aw-station-cat" style={{ color: cat.color }}>{cat.label}</span>}
        </div>

        {/* Tagline */}
        {!small && station.tagline && (
          <div className="aw-station-tagline">{station.tagline}</div>
        )}

        {lastEvent ? (
          <div className="aw-station-event">
            <span className="aw-event-title">{lastEvent.title || lastEvent.type}</span>
            <span className="aw-event-time">{formatTimeAgo(eventMs)}</span>
          </div>
        ) : (
          <div className="aw-station-event">
            <span className="aw-event-title aw-event-idle">No recent activity</span>
          </div>
        )}

        {(h1 > 0 || h24 > 0 || visitCount > 0) && (
          <div className="aw-station-counts">
            {h1 > 0 && <span className="aw-count">{h1}<small>/1h</small></span>}
            {h24 > 0 && <span className="aw-count">{h24}<small>/24h</small></span>}
            {visitCount > 0 && (
              <span className="aw-count aw-visit-count" title={`${visitCount} visits (24h)`}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {visitCount}
              </span>
            )}
          </div>
        )}

        {/* Small station metrics (compact) */}
        {small && metrics && metrics.length > 0 && (
          <div className="aw-station-metrics">
            {metrics.map((m, i) => (
              <span key={i} className="aw-station-metric">
                <span className="aw-metric-val">{m.value}</span>
                <span className="aw-metric-label">{m.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Visit link */}
        {!small && station.url && (
          <div className="aw-visit-chip" style={{ '--chip-color': station.color }}>
            {station.url.startsWith('http') ? (
              <a href={station.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>Visit ↗</a>
            ) : (
              <span>Visit</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Themed workspace props for each station ───
function WorkspaceProps({ stationId, color }) {
  switch (stationId) {
    case 'conductor': return <ConductorWorkspace color={color} />;
    case 'chatbot': return <ChatbotWorkspace color={color} />;
    case 'scribe': return <ScribeWorkspace color={color} />;
    case 'moltbook': return <MoltbookWorkspace color={color} />;
    case 'spellbrigade': return <GamingWorkspace color={color} />;
    case 'oldwaystoday': return <WellnessWorkspace color={color} />;
    case 'benchpress': return <BenchPressWorkspace color={color} />;
    case 'rowcrew': return <RowCrewWorkspace color={color} />;
    case 'fab': return <FaBWorkspace color={color} />;
    case 'activity': return <ActivityWorkspace color={color} />;
    case 'embedroute': return <EmbedRouteWorkspace color={color} />;
    case 'medic': return <MedicWorkspace color={color} />;
    default: return null;
  }
}

// ─── Conductor: Command monitors ───
function ConductorWorkspace() {
  return (
    <div className="aw-props-conductor">
      <div className="aw-orch-monitor aw-orch-monitor-c" style={{ '--mon-color': '#4ade80' }}>
        <div className="aw-orch-screen-line" />
        <div className="aw-orch-screen-line" style={{ width: '50%' }} />
      </div>
      <div className="aw-orch-monitor" style={{ '--mon-color': '#a78bfa' }}>
        <div className="aw-orch-screen-line" />
        <div className="aw-orch-screen-line" style={{ width: '40%' }} />
      </div>
    </div>
  );
}

// ─── Chatbot: Chat terminal + coffee mug ───
function ChatbotWorkspace() {
  return (
    <div className="aw-props-chatbot">
      <div className="aw-chat-monitor" style={{ '--glow': '#60a5fa' }}>
        <div className="aw-chat-screen">
          <div className="aw-chat-line" style={{ width: '70%' }} />
          <div className="aw-chat-line aw-chat-line-cursor" style={{ width: '30%' }} />
        </div>
      </div>
      <div className="aw-chat-mug"><div className="aw-chat-steam"><span /><span /><span /></div></div>
    </div>
  );
}

// ─── Scribe: Books, parchment, candle ───
function ScribeWorkspace() {
  return (
    <div className="aw-props-scribe">
      <div className="aw-blog-books">
        <div className="aw-blog-book" style={{ background: '#c084fc' }} />
        <div className="aw-blog-book" style={{ background: '#f59e0b' }} />
        <div className="aw-blog-book" style={{ background: '#60a5fa' }} />
      </div>
      <div className="aw-blog-parchment">
        <div className="aw-blog-text-line" style={{ width: '80%' }} />
        <div className="aw-blog-text-line" style={{ width: '60%' }} />
      </div>
      <div className="aw-blog-candle"><div className="aw-blog-flame" /><div className="aw-blog-wax" /></div>
    </div>
  );
}

// ─── Moltbook: Microphone + social post bubbles ───
function MoltbookWorkspace() {
  return (
    <div className="aw-props-moltbook">
      <div className="aw-social-mic" />
      <div className="aw-blog-parchment" style={{ right: '10px', left: 'auto', width: '50px' }}>
        <div className="aw-blog-text-line" style={{ width: '90%' }} />
        <div className="aw-blog-text-line" style={{ width: '65%' }} />
      </div>
    </div>
  );
}

// ─── Gaming: Magic circle, crystals, spell book ───
function GamingWorkspace() {
  return (
    <div className="aw-props-gaming">
      <div className="aw-gaming-circle" />
      <div className="aw-gaming-crystal aw-gaming-crystal-l" />
      <div className="aw-gaming-crystal aw-gaming-crystal-r" />
      <div className="aw-gaming-book" />
      <div className="aw-gaming-dice" />
      <div className="aw-gaming-potion" />
      <div className="aw-activity aw-gaming-action">
        <div className="aw-gaming-spark" />
        <div className="aw-gaming-spark aw-gaming-spark-2" />
        <div className="aw-gaming-spark aw-gaming-spark-3" />
      </div>
    </div>
  );
}

// ─── Wellness: Herb garden with plants, mortar ───
function WellnessWorkspace() {
  return (
    <div className="aw-props-wellness">
      <div className="aw-wellness-bed" />
      <div className="aw-wellness-plant aw-wellness-plant-1" />
      <div className="aw-wellness-plant aw-wellness-plant-2" />
      <div className="aw-wellness-plant aw-wellness-plant-3" />
      <div className="aw-wellness-mortar" />
      <div className="aw-wellness-cushion" />
      <div className="aw-wellness-incense" />
      <div className="aw-activity aw-wellness-action">
        <div className="aw-wellness-aroma" />
        <div className="aw-wellness-aroma aw-wellness-aroma-2" />
        <div className="aw-wellness-leaf-float" />
      </div>
    </div>
  );
}

// ─── BenchPress: Squat rack + barbell ───
function BenchPressWorkspace() {
  return (
    <div className="aw-props-benchpress">
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

// ─── RowCrew: Water + oar ───
function RowCrewWorkspace() {
  return (
    <div className="aw-props-rowcrew">
      <div className="aw-rowing-water">
        <div className="aw-rowing-ripple" />
        <div className="aw-rowing-ripple aw-rowing-ripple-2" />
      </div>
      <div className="aw-rowing-oar" />
    </div>
  );
}

// ─── FaB: Card table + Discord headset ───
function FaBWorkspace() {
  return (
    <div className="aw-props-fab">
      <div className="aw-fab-playmat" />
      <div className="aw-fab-cards">
        <div className="aw-fab-card aw-fab-card-1" />
        <div className="aw-fab-card aw-fab-card-2" />
        <div className="aw-fab-card aw-fab-card-3" />
      </div>
      <div className="aw-fab-chart">
        <div className="aw-fab-bar" style={{ height: '60%' }} />
        <div className="aw-fab-bar" style={{ height: '85%' }} />
        <div className="aw-fab-bar" style={{ height: '45%' }} />
      </div>
      <div className="aw-fbot-headset" />
    </div>
  );
}

// ─── Activity Feed: Event log lines ───
function ActivityWorkspace() {
  return (
    <div className="aw-props-activity">
      <div className="aw-log-line"><span className="aw-log-dot" style={{ background: '#4ade80' }} /><span className="aw-log-bar" style={{ width: '70%', background: 'rgba(248,113,113,0.2)' }} /></div>
      <div className="aw-log-line"><span className="aw-log-dot" style={{ background: '#60a5fa' }} /><span className="aw-log-bar" style={{ width: '50%', background: 'rgba(248,113,113,0.2)' }} /></div>
      <div className="aw-log-line"><span className="aw-log-dot" style={{ background: '#fbbf24' }} /><span className="aw-log-bar" style={{ width: '85%', background: 'rgba(248,113,113,0.2)' }} /></div>
      <div className="aw-log-line"><span className="aw-log-dot" style={{ background: '#a78bfa' }} /><span className="aw-log-bar" style={{ width: '60%', background: 'rgba(248,113,113,0.2)' }} /></div>
    </div>
  );
}

// ─── EmbedRoute: Vector node graph ───
function EmbedRouteWorkspace({ color }) {
  return (
    <div className="aw-props-embedroute">
      <div className="aw-embed-center" style={{ borderColor: `${color}40` }}>
        <div className="aw-embed-core" style={{ background: `${color}60` }} />
      </div>
    </div>
  );
}

// ─── Medic: Health station with monitors, first-aid cross, status light ───
function MedicWorkspace() {
  return (
    <div className="aw-props-medic">
      <div className="aw-medic-monitors">
        <div className="aw-medic-mon" />
        <div className="aw-medic-mon" />
      </div>
      <div className="aw-medic-cross" />
      <div className="aw-medic-light" />
      <div className="aw-activity aw-medic-action">
        <div className="aw-medic-pulse" />
      </div>
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
