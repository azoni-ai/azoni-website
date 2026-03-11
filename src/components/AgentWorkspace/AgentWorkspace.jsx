import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAgentActivity } from '../../hooks/useAgentActivity';
import { useMCPHealth } from '../../hooks/useMCPHealth';
import { STATION_DEFS, CATEGORY_STYLES, formatTimeAgo } from '../../utils/station-mapping';
import WorkstationCard from './WorkstationCard';
import MCPHub from './MCPHub';
import ConnectionLines from './ConnectionLines';
import WorkspaceTicker from './WorkspaceTicker';
import StationDetailPanel from './StationDetailPanel';
import '../../styles/agent-workspace.css';

// ─── Grid placement (9-col × 7-row with corridor channels) ───
// Rooms on odd cols/rows: 1,3,5,7,9 × 1,3,5,7
// Corridors on even cols/rows: 2,4,6,8 × 2,4,6
const GRID_PLACEMENT = {
  chatbot:        { col: 1, row: 1, room: 1 },
  oldwaystoday:   { col: 3, row: 1, room: 2 },
  embedroute:     { col: 7, row: 1, room: 3 },
  blog:           { col: 9, row: 1, room: 4 },
  spellbrigade:   { col: 1, row: 3, room: 5 },
  activity:       { col: 3, row: 3, room: 6 },
  // mcp hub is col 5, row 3
  fabstats:       { col: 7, row: 3, room: 7 },
  moltbook:       { col: 9, row: 3, room: 8 },
  benchpressonly: { col: 3, row: 5, room: 9 },
  fabstatsbot:    { col: 5, row: 5, room: 10 },
  rowcrew:        { col: 7, row: 5, room: 11 },
  orchestrator:   { col: 5, row: 7, room: 12 },
};

// Corridor segments — connect adjacent rooms through the grid gaps
const CORRIDORS = [
  // Row 1 horizontal corridors
  { col: 2, row: 1, dir: 'h' },  // chatbot ↔ oldways
  { col: 8, row: 1, dir: 'h' },  // embedroute ↔ blog
  // Row 3 horizontal corridors
  { col: 2, row: 3, dir: 'h' },  // spell ↔ activity
  { col: 4, row: 3, dir: 'h' },  // activity ↔ hub
  { col: 6, row: 3, dir: 'h' },  // hub ↔ fabstats
  { col: 8, row: 3, dir: 'h' },  // fabstats ↔ moltbook
  // Row 5 horizontal corridors
  { col: 4, row: 5, dir: 'h' },  // bench ↔ fabbot (through col4)
  { col: 6, row: 5, dir: 'h' },  // fabbot ↔ rowcrew
  // Vertical corridors
  { col: 1, row: 2, dir: 'v' },  // chatbot ↔ spell
  { col: 3, row: 2, dir: 'v' },  // oldways ↔ activity
  { col: 7, row: 2, dir: 'v' },  // embedroute ↔ fabstats
  { col: 9, row: 2, dir: 'v' },  // blog ↔ moltbook
  { col: 3, row: 4, dir: 'v' },  // activity ↔ bench
  { col: 5, row: 4, dir: 'v' },  // hub ↔ fabbot
  { col: 7, row: 4, dir: 'v' },  // fabstats ↔ rowcrew
  { col: 5, row: 6, dir: 'v' },  // fabbot ↔ conductor
  // Junction dots (intersections)
  { col: 4, row: 4, dir: 'j' },  // junction
  { col: 6, row: 4, dir: 'j' },  // junction
];

const nonHubStations = STATION_DEFS.filter(s => !s.isHub);
const mcpStation = STATION_DEFS.find(s => s.isHub);
const stationById = Object.fromEntries(STATION_DEFS.map(s => [s.id, s]));

function AgentWorkspace() {
  const { stationEvents, tickerEvents, activityCounts, stationHistory, flashingStations, activityHistory } = useAgentActivity();
  const { health, totalTools } = useMCPHealth();

  const [selectedStation, setSelectedStation] = useState(null);
  const [hoveredStation, setHoveredStation] = useState(null);
  const [hoverDelayId, setHoverDelayId] = useState(null);
  const [tooltipStation, setTooltipStation] = useState(null);

  // Replay state
  const [replayProgress, setReplayProgress] = useState(null); // null = inactive, 0-1 = progress
  const [replayFlashes, setReplayFlashes] = useState({});
  const replayRef = useRef(null);
  const replayRafRef = useRef(null);

  const containerRef = useRef(null);
  const hubRef = useRef(null);
  const stationRefs = useRef({});

  const setStationRef = useCallback((id, el) => {
    if (el) stationRefs.current[id] = el;
  }, []);

  const handleStationClick = useCallback((station) => {
    if (replayProgress !== null) return; // disabled during replay
    setSelectedStation(station);
  }, [replayProgress]);

  // ─── Hover tooltip with delay ───
  const handleStationEnter = useCallback((stationId) => {
    if (replayProgress !== null) return;
    setHoveredStation(stationId);
    const id = setTimeout(() => setTooltipStation(stationId), 200);
    setHoverDelayId(id);
  }, [replayProgress]);

  const handleStationLeave = useCallback(() => {
    setHoveredStation(null);
    setTooltipStation(null);
    if (hoverDelayId) clearTimeout(hoverDelayId);
  }, [hoverDelayId]);

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
    setHoveredStation(null);

    const tick = () => {
      const r = replayRef.current;
      if (!r) return;

      const elapsed = performance.now() - r.startTime;
      const progress = Math.min(elapsed / r.duration, 1);
      const virtualTime = r.minMs + progress * r.timeSpanMs;

      // Fire events as virtual time passes them
      while (r.eventIndex < r.events.length && r.events[r.eventIndex].ms <= virtualTime) {
        const evt = r.events[r.eventIndex];
        setReplayFlashes(prev => ({ ...prev, [evt.stationId]: Date.now() }));
        // Clear flash after 600ms
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

  // Cleanup replay on unmount
  useEffect(() => {
    return () => {
      if (replayRafRef.current) cancelAnimationFrame(replayRafRef.current);
    };
  }, []);

  const isReplaying = replayProgress !== null;

  return (
    <div className="aw-container" ref={containerRef}>
      {/* Header */}
      <div className="aw-header">
        <div className="aw-header-left">
          <span className="aw-header-dot" />
          <span className="aw-header-title">Agent Workspace</span>
        </div>
        <div className="aw-header-right">
          <span className="aw-header-stat">{totalTools || 33} tools</span>
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
        </div>
      </div>

      {/* Workspace floor */}
      <div className="aw-floor">
        {/* Replay progress bar */}
        {isReplaying && (
          <div className="aw-replay-bar">
            <div className="aw-replay-fill" style={{ width: `${(replayProgress || 0) * 100}%` }} />
            <span className="aw-replay-label">REPLAYING 24H</span>
          </div>
        )}

        {/* Connection lines (SVG overlay) */}
        <ConnectionLines
          containerRef={containerRef}
          hubRef={hubRef}
          stationRefs={stationRefs.current}
          hoveredStation={hoveredStation}
        />

        {/* Corridors */}
        {CORRIDORS.map((c, i) => (
          <div
            key={i}
            className={`aw-corridor ${c.dir === 'h' ? 'aw-corridor-h' : c.dir === 'v' ? 'aw-corridor-v' : 'aw-corridor-j'}`}
            style={{ gridColumn: c.col, gridRow: c.row }}
          />
        ))}

        {/* MCP Hub — center */}
        <div className="aw-grid-cell aw-grid-hub" style={{ gridColumn: 5, gridRow: 3 }}>
          <MCPHub
            ref={hubRef}
            totalTools={totalTools}
            isFlashing={!!flashingStations.mcp || !!replayFlashes.mcp}
            onClick={() => handleStationClick(mcpStation)}
          />
        </div>

        {/* Station cards */}
        {nonHubStations.map((station, i) => {
          const pos = GRID_PLACEMENT[station.id];
          if (!pos) return null;
          return (
            <div
              key={station.id}
              className="aw-grid-cell"
              style={{ gridColumn: pos.col, gridRow: pos.row }}
              onMouseEnter={() => handleStationEnter(station.id)}
              onMouseLeave={handleStationLeave}
            >
              <WorkstationCard
                ref={(el) => setStationRef(station.id, el)}
                station={station}
                lastEvent={stationEvents[station.id]}
                activityCounts={activityCounts[station.id]}
                isFlashing={!!flashingStations[station.id] || !!replayFlashes[station.id]}
                onClick={handleStationClick}
                index={i}
                roomNumber={pos.room}
              />
            </div>
          );
        })}

        {/* Hover tooltip */}
        <AnimatePresence>
          {tooltipStation && !isReplaying && (() => {
            const station = stationById[tooltipStation];
            const pos = GRID_PLACEMENT[tooltipStation];
            if (!station || !pos) return null;
            const cat = CATEGORY_STYLES[station.category];
            const lastEvent = stationEvents[tooltipStation];
            const counts = activityCounts[tooltipStation] || {};
            const eventMs = lastEvent?.receivedAt || 0;

            // Position tooltip based on grid column
            const tooltipCol = pos.col <= 3 ? pos.col + 1 : pos.col >= 7 ? pos.col - 1 : pos.col;
            const tooltipRow = pos.col >= 3 && pos.col <= 7 ? pos.row : pos.row;

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
                {(counts.h1 > 0 || counts.h24 > 0) && (
                  <div className="aw-tooltip-counts">
                    {counts.h1 > 0 && <span>{counts.h1} /1h</span>}
                    {counts.h24 > 0 && <span>{counts.h24} /24h</span>}
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Event ticker */}
      <WorkspaceTicker events={tickerEvents} />

      {/* Detail panel (portal) */}
      <StationDetailPanel
        station={selectedStation}
        stationHistory={selectedStation ? stationHistory[selectedStation.id] : null}
        activityCounts={selectedStation ? activityCounts[selectedStation.id] : null}
        health={health}
        onClose={() => setSelectedStation(null)}
      />
    </div>
  );
}

export default AgentWorkspace;
