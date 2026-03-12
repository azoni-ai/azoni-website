import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAgentActivity } from '../../hooks/useAgentActivity';
import { useMCPHealth } from '../../hooks/useMCPHealth';
import { STATION_DEFS, STATION_CONNECTIONS, CATEGORY_STYLES, formatTimeAgo } from '../../utils/station-mapping';
import { avatars } from '../../data/agents';
import WorkstationCard from './WorkstationCard';
import MCPHub from './MCPHub';
import WorkspaceTicker from './WorkspaceTicker';
import StationDetailPanel from './StationDetailPanel';
import WorkspaceLegend from './WorkspaceLegend';
import '../../styles/agent-workspace.css';

// ─── Building floor plan: 7-col grid with side corridors ───
// Col layout: office | side-hall | office | center-hall | office | side-hall | office
const GRID_PLACEMENT = {
  chatbot:        { col: 1, row: 2, room: 1,  door: 'right' },
  spellbrigade:   { col: 3, row: 2, room: 2,  door: 'right' },
  moltbook:       { col: 5, row: 2, room: 3,  door: 'left' },
  blog:           { col: 7, row: 2, room: 4,  door: 'left' },
  benchpressonly: { col: 1, row: 3, room: 5,  door: 'right' },
  activity:       { col: 3, row: 3, room: 6,  door: 'right' },
  fabstatsbot:    { col: 5, row: 3, room: 7,  door: 'left' },
  rowcrew:        { col: 7, row: 3, room: 8,  door: 'left' },
  oldwaystoday:   { col: 1, row: 4, room: 9,  door: 'right' },
  orchestrator:   { col: 3, row: 4, room: 10, door: 'right' },
  embedroute:     { col: 5, row: 4, room: 11, door: 'left' },
  fabstats:       { col: 7, row: 4, room: 12, door: 'left' },
};

const HALLWAY_CELLS = [
  { col: 4, row: 2 },
  { col: 4, row: 3 },
  { col: 4, row: 4 },
];

const SIDE_HALLWAY_CELLS = [
  { col: 2, row: 2 }, { col: 2, row: 3 }, { col: 2, row: 4 },
  { col: 6, row: 2 }, { col: 6, row: 3 }, { col: 6, row: 4 },
];

const nonHubStations = STATION_DEFS.filter(s => !s.isHub);
const mcpStation = STATION_DEFS.find(s => s.isHub);
const stationById = Object.fromEntries(STATION_DEFS.map(s => [s.id, s]));

// ─── Waypoint calculation for walking path ───
// Returns { points, times, duration } — outer offices route through side hallway
function calcWaypoints(floorRect, cellRect, lobbyRect, door, col) {
  const startX = cellRect.left + cellRect.width / 2 - floorRect.left;
  const startY = cellRect.top + cellRect.height * 0.55 - floorRect.top;
  const hallX = floorRect.width / 2;
  const mcpX = lobbyRect.left + lobbyRect.width / 2 - floorRect.left;
  const mcpY = lobbyRect.top + lobbyRect.height / 2 - floorRect.top;

  const isOuter = col === 1 || col === 7;
  const doorX = door === 'right'
    ? cellRect.right - floorRect.left + 6
    : cellRect.left - floorRect.left - 6;

  // Side hallway center X (outer offices only)
  const sideHallX = col === 1
    ? cellRect.right - floorRect.left + 14
    : col === 7
      ? cellRect.left - floorRect.left - 14
      : null;

  const sway = door === 'right' ? -4 : 4;
  const hallY1 = startY + (mcpY - startY) * 0.35;
  const hallY2 = startY + (mcpY - startY) * 0.7;

  if (isOuter) {
    // Outer offices walk: room → side hall → center hall → MCP → back
    return {
      points: [
        { x: startX, y: startY },         // In room
        { x: doorX, y: startY },           // Step through doorway
        { x: sideHallX, y: startY },       // Enter side hallway
        { x: hallX, y: startY },           // Cross to center hallway
        { x: hallX + sway, y: hallY1 },    // Walk center hallway
        { x: hallX, y: hallY2 },           // Continue down hallway
        { x: hallX, y: mcpY },             // Reach MCP level
        { x: mcpX, y: mcpY },              // Arrive at MCP lobby
        { x: hallX, y: mcpY },             // Exit MCP
        { x: hallX + sway, y: hallY2 },    // Return hallway
        { x: hallX, y: hallY1 },           // Continue back
        { x: hallX, y: startY },           // Back at junction
        { x: sideHallX, y: startY },       // Side hallway
        { x: doorX, y: startY },           // Re-enter doorway
        { x: startX, y: startY },          // Back in room
      ],
      times: [0, 0.03, 0.06, 0.12, 0.22, 0.32, 0.42, 0.50, 0.58, 0.68, 0.78, 0.88, 0.94, 0.97, 1],
      duration: 12,
    };
  }

  // Inner offices walk: room → center hall → MCP → back
  return {
    points: [
      { x: startX, y: startY },
      { x: doorX, y: startY },
      { x: hallX, y: startY },
      { x: hallX + sway, y: hallY1 },
      { x: hallX, y: hallY2 },
      { x: hallX, y: mcpY },
      { x: mcpX, y: mcpY },
      { x: hallX, y: mcpY },
      { x: hallX + sway, y: hallY2 },
      { x: hallX, y: hallY1 },
      { x: hallX, y: startY },
      { x: doorX, y: startY },
      { x: startX, y: startY },
    ],
    times: [0, 0.04, 0.08, 0.20, 0.32, 0.42, 0.50, 0.58, 0.68, 0.80, 0.92, 0.96, 1],
    duration: 10,
  };
}

function AgentWorkspace() {
  const { stationEvents, tickerEvents, activityCounts, errorCounts, visitCounts, stationHistory, flashingStations, activityHistory } = useAgentActivity();
  const { health, totalTools } = useMCPHealth();

  const [selectedStation, setSelectedStation] = useState(null);
  const [hoverDelayId, setHoverDelayId] = useState(null);
  const [tooltipStation, setTooltipStation] = useState(null);
  const [showLegend, setShowLegend] = useState(() => !localStorage.getItem('aw-legend-dismissed'));
  const [hallwayActive, setHallwayActive] = useState(false);
  const hallwayTimerRef = useRef(null);

  // Compute idle levels and highlighted stations
  const { idleLevels, highlightedSet } = useMemo(() => {
    const now = Date.now();
    const levels = {};
    nonHubStations.forEach(s => {
      const lastMs = stationEvents[s.id]?.receivedAt || 0;
      const diff = now - lastMs;
      if (!lastMs || diff > 86400000) levels[s.id] = 2;
      else if (diff > 3600000) levels[s.id] = 1;
      else levels[s.id] = 0;
    });
    const highlighted = new Set();
    if (tooltipStation && STATION_CONNECTIONS[tooltipStation]) {
      STATION_CONNECTIONS[tooltipStation].forEach(id => highlighted.add(id));
      highlighted.add(tooltipStation);
    }
    return { idleLevels: levels, highlightedSet: highlighted };
  }, [stationEvents, tooltipStation]);

  // Replay state
  const [replayProgress, setReplayProgress] = useState(null);
  const [replayFlashes, setReplayFlashes] = useState({});
  const replayRef = useRef(null);
  const replayRafRef = useRef(null);

  // Walking agents state
  const [walkingAgents, setWalkingAgents] = useState({});
  const floorRef = useRef(null);
  const lobbyRef = useRef(null);
  const cellRefs = useRef({});
  const prevFlashRef = useRef({});

  const setCellRef = useCallback((id, el) => {
    if (el) cellRefs.current[id] = el;
  }, []);

  const handleStationClick = useCallback((station) => {
    if (replayProgress !== null) return;
    setSelectedStation(station);
  }, [replayProgress]);

  const handleStationEnter = useCallback((stationId) => {
    if (replayProgress !== null) return;
    const id = setTimeout(() => setTooltipStation(stationId), 200);
    setHoverDelayId(id);
  }, [replayProgress]);

  const handleStationLeave = useCallback(() => {
    setTooltipStation(null);
    if (hoverDelayId) clearTimeout(hoverDelayId);
  }, [hoverDelayId]);

  // ─── Watch flashes and trigger agent walks ───
  const startWalkRef = useRef(null);
  startWalkRef.current = (stationId) => {
    const station = stationById[stationId];
    if (!station?.agent || !avatars[station.agent]) return;
    if (walkingAgents[stationId]) return; // already walking

    const pos = GRID_PLACEMENT[stationId];
    if (!pos) return;

    const floorEl = floorRef.current;
    const lobbyEl = lobbyRef.current;
    const cellEl = cellRefs.current[stationId];
    if (!floorEl || !lobbyEl || !cellEl) return;

    const floorRect = floorEl.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();
    const lobbyRect = lobbyEl.getBoundingClientRect();
    const { points, times, duration } = calcWaypoints(floorRect, cellRect, lobbyRect, pos.door, pos.col);

    setWalkingAgents(prev => ({
      ...prev,
      [stationId]: { points, times, duration, agent: station.agent },
    }));
  };

  useEffect(() => {
    const prev = prevFlashRef.current;
    const combined = { ...flashingStations, ...replayFlashes };
    let newFlash = false;

    for (const stationId of Object.keys(combined)) {
      if (!prev[stationId]) {
        startWalkRef.current(stationId);
        newFlash = true;
      }
    }

    if (newFlash) {
      setHallwayActive(true);
      if (hallwayTimerRef.current) clearTimeout(hallwayTimerRef.current);
      hallwayTimerRef.current = setTimeout(() => setHallwayActive(false), 12000);
    }

    prevFlashRef.current = combined;
  }, [flashingStations, replayFlashes]);

  const removeWalkingAgent = useCallback((stationId) => {
    setWalkingAgents(prev => {
      const next = { ...prev };
      delete next[stationId];
      return next;
    });
  }, []);

  // ─── 24h Replay ───
  const startReplay = useCallback(() => {
    if (activityHistory.length === 0) return;

    const sorted = [...activityHistory].sort((a, b) => a.ms - b.ms);
    const minMs = sorted[0].ms;
    const maxMs = sorted[sorted.length - 1].ms;
    const timeSpanMs = maxMs - minMs || 1;

    replayRef.current = {
      events: sorted,
      eventIndex: 0,
      minMs,
      timeSpanMs,
      duration: 8000,
      startTime: performance.now(),
    };

    setReplayProgress(0);
    setReplayFlashes({});
    setTooltipStation(null);
    setWalkingAgents({});

    const tick = () => {
      const r = replayRef.current;
      if (!r) return;

      const elapsed = performance.now() - r.startTime;
      const progress = Math.min(elapsed / r.duration, 1);
      const virtualTime = r.minMs + progress * r.timeSpanMs;

      while (r.eventIndex < r.events.length && r.events[r.eventIndex].ms <= virtualTime) {
        const evt = r.events[r.eventIndex];
        setReplayFlashes(prev => ({ ...prev, [evt.stationId]: Date.now() }));
        const sid = evt.stationId;
        setTimeout(() => {
          setReplayFlashes(prev => {
            const next = { ...prev };
            delete next[sid];
            return next;
          });
        }, 600);
        r.eventIndex++;
      }

      setReplayProgress(progress);

      if (progress >= 1) {
        replayRef.current = null;
        setTimeout(() => setReplayProgress(null), 500);
        return;
      }

      replayRafRef.current = requestAnimationFrame(tick);
    };

    replayRafRef.current = requestAnimationFrame(tick);
  }, [activityHistory]);

  useEffect(() => {
    return () => {
      if (replayRafRef.current) cancelAnimationFrame(replayRafRef.current);
    };
  }, []);

  const isReplaying = replayProgress !== null;

  return (
    <div className="aw-container">
      {/* Header */}
      <div className="aw-header">
        <div className="aw-header-left">
          <span className="aw-header-dot" />
          <span className="aw-header-title">Agent Workspace</span>
        </div>
        <div className="aw-header-right">
          <span className="aw-header-stat">{totalTools || 37} tools</span>
          <span className="aw-header-stat">{nonHubStations.length} stations</span>
          <button
            className="aw-replay-btn"
            onClick={startReplay}
            disabled={isReplaying || activityHistory.length === 0}
            title="Replay last 24 hours of activity"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="6,3 20,12 6,21" />
            </svg>
            24h
          </button>
          <button
            className="aw-replay-btn"
            onClick={() => setShowLegend(true)}
            title="What am I looking at?"
          >
            ?
          </button>
        </div>
      </div>

      {/* Building floor plan */}
      <div className="aw-floor" ref={floorRef}>
        <span className="aw-building-label">FL-01 · AZONI HQ</span>

        {/* Replay progress bar */}
        {isReplaying && (
          <div className="aw-replay-bar">
            <div className="aw-replay-fill" style={{ width: `${(replayProgress || 0) * 100}%` }} />
            <span className="aw-replay-label">REPLAYING 24H</span>
          </div>
        )}

        {/* MCP Hub — Lobby (row 1, full width) */}
        <div
          ref={lobbyRef}
          className="aw-lobby"
          style={{ gridColumn: '1 / -1', gridRow: 1 }}
        >
          <MCPHub
            totalTools={totalTools}
            isFlashing={!!flashingStations.mcp || !!replayFlashes.mcp}
            onClick={() => handleStationClick(mcpStation)}
          />
        </div>

        {/* Central hallway */}
        {HALLWAY_CELLS.map((h, i) => (
          <div
            key={`hall-${i}`}
            className={`aw-hallway${hallwayActive ? ' aw-hallway-active' : ''}`}
            style={{ gridColumn: h.col, gridRow: h.row }}
          />
        ))}

        {/* Side corridors */}
        {SIDE_HALLWAY_CELLS.map((h, i) => (
          <div
            key={`side-hall-${i}`}
            className={`aw-side-hallway${hallwayActive ? ' aw-side-hallway-active' : ''}`}
            style={{ gridColumn: h.col, gridRow: h.row }}
          />
        ))}

        {/* Station rooms */}
        {nonHubStations.map((station, i) => {
          const pos = GRID_PLACEMENT[station.id];
          if (!pos) return null;
          return (
            <div
              key={station.id}
              ref={(el) => setCellRef(station.id, el)}
              className="aw-grid-cell"
              style={{ gridColumn: pos.col, gridRow: pos.row }}
              onMouseEnter={() => handleStationEnter(station.id)}
              onMouseLeave={handleStationLeave}
            >
              <WorkstationCard
                station={station}
                lastEvent={stationEvents[station.id]}
                activityCounts={activityCounts[station.id]}
                visitCount={visitCounts[station.id] || 0}
                isFlashing={!!flashingStations[station.id] || !!replayFlashes[station.id]}
                isWalking={!!walkingAgents[station.id]}
                idleLevel={idleLevels[station.id] || 0}
                errorCount={errorCounts[station.id] || 0}
                isHighlighted={highlightedSet.has(station.id)}
                isDimmedByHover={highlightedSet.size > 0 && !highlightedSet.has(station.id)}
                onClick={handleStationClick}
                index={i}
                roomNumber={pos.room}
                door={pos.door}
              />
            </div>
          );
        })}

        {/* Walking agent avatars */}
        <AnimatePresence>
          {Object.entries(walkingAgents).map(([stationId, data]) => (
            <motion.div
              key={`walk-${stationId}`}
              className="aw-walking-agent"
              initial={{ x: data.points[0].x, y: data.points[0].y }}
              animate={{
                x: data.points.map(w => w.x),
                y: data.points.map(w => w.y),
              }}
              transition={{
                duration: data.duration,
                times: data.times,
                ease: 'linear',
              }}
              onAnimationComplete={() => removeWalkingAgent(stationId)}
            >
              {avatars[data.agent](28)}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Hover tooltip */}
        <AnimatePresence>
          {tooltipStation && !isReplaying && (() => {
            const station = stationById[tooltipStation];
            const pos = GRID_PLACEMENT[tooltipStation];
            if (!station || !pos) return null;
            const cat = CATEGORY_STYLES[station.category];
            const lastEvent = stationEvents[tooltipStation];
            const counts = activityCounts[tooltipStation] || {};
            const visits = visitCounts[tooltipStation] || 0;
            const eventMs = lastEvent?.receivedAt || 0;

            const tooltipCol = pos.col <= 2 ? pos.col + 2 : pos.col >= 6 ? pos.col - 2 : pos.col <= 3 ? pos.col + 1 : pos.col - 1;
            const tooltipRow = pos.row;

            return (
              <motion.div
                key="tooltip"
                className="aw-tooltip"
                style={{ gridColumn: tooltipCol, gridRow: tooltipRow, '--tip-color': station.color }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
              >
                <div className="aw-tooltip-header">
                  <span className="aw-tooltip-dot" style={{ background: station.color }} />
                  <span className="aw-tooltip-name">{station.label}</span>
                  {cat && <span className="aw-tooltip-cat" style={{ color: cat.color }}>{cat.label}</span>}
                </div>
                <div className="aw-tooltip-desc">{station.desc}</div>
                {lastEvent && (
                  <div className="aw-tooltip-event">
                    <span className="aw-tooltip-event-title">{lastEvent.title || lastEvent.type}</span>
                    <span className="aw-tooltip-event-time">{formatTimeAgo(eventMs)}</span>
                  </div>
                )}
                {(counts.h1 > 0 || counts.h24 > 0 || visits > 0) && (
                  <div className="aw-tooltip-counts">
                    {counts.h1 > 0 && <span>{counts.h1} /1h</span>}
                    {counts.h24 > 0 && <span>{counts.h24} /24h</span>}
                    {visits > 0 && <span>{visits} visits</span>}
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Event ticker */}
      <WorkspaceTicker events={tickerEvents} stationHistory={stationHistory} />

      {/* Detail panel (portal) */}
      <StationDetailPanel
        station={selectedStation}
        stationHistory={selectedStation ? stationHistory[selectedStation.id] : null}
        activityCounts={selectedStation ? activityCounts[selectedStation.id] : null}
        visitCount={selectedStation ? (visitCounts[selectedStation.id] || 0) : 0}
        health={health}
        onClose={() => setSelectedStation(null)}
      />

      {/* Onboarding legend */}
      <WorkspaceLegend
        show={showLegend}
        onDismiss={() => {
          setShowLegend(false);
          localStorage.setItem('aw-legend-dismissed', '1');
        }}
      />
    </div>
  );
}

export default AgentWorkspace;
