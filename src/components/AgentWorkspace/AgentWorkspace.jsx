import React, { useState, useRef, useCallback } from 'react';
import { useAgentActivity } from '../../hooks/useAgentActivity';
import { useMCPHealth } from '../../hooks/useMCPHealth';
import { STATION_DEFS } from '../../utils/station-mapping';
import WorkstationCard from './WorkstationCard';
import MCPHub from './MCPHub';
import ConnectionLines from './ConnectionLines';
import WorkspaceTicker from './WorkspaceTicker';
import StationDetailPanel from './StationDetailPanel';
import '../../styles/agent-workspace.css';

// Grid placement order — defines which cell each station occupies
// Row 1: chatbot, oldwaystoday, (empty), embedroute, blog
// Row 2: spellbrigade, activity, MCP HUB, fabstats, moltbook
// Row 3: (empty), benchpressonly, fabstatsbot, rowcrew, (empty)
// Row 4: (empty), (empty), orchestrator, (empty), (empty)
const GRID_PLACEMENT = {
  chatbot:        { col: 1, row: 1 },
  oldwaystoday:   { col: 2, row: 1 },
  embedroute:     { col: 4, row: 1 },
  blog:           { col: 5, row: 1 },
  spellbrigade:   { col: 1, row: 2 },
  activity:       { col: 2, row: 2 },
  // mcp hub is col 3, row 2
  fabstats:       { col: 4, row: 2 },
  moltbook:       { col: 5, row: 2 },
  benchpressonly: { col: 2, row: 3 },
  fabstatsbot:    { col: 3, row: 3 },
  rowcrew:        { col: 4, row: 3 },
  orchestrator:   { col: 3, row: 4 },
};

const nonHubStations = STATION_DEFS.filter(s => !s.isHub);
const mcpStation = STATION_DEFS.find(s => s.isHub);

function AgentWorkspace() {
  const { stationEvents, tickerEvents, activityCounts, stationHistory, flashingStations } = useAgentActivity();
  const { health, totalTools } = useMCPHealth();

  const [selectedStation, setSelectedStation] = useState(null);
  const [hoveredStation, setHoveredStation] = useState(null);

  const containerRef = useRef(null);
  const hubRef = useRef(null);
  const stationRefs = useRef({});

  const setStationRef = useCallback((id, el) => {
    if (el) stationRefs.current[id] = el;
  }, []);

  const handleStationClick = useCallback((station) => {
    setSelectedStation(station);
  }, []);

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
        </div>
      </div>

      {/* Workspace floor */}
      <div className="aw-floor">
        {/* Connection lines (SVG overlay) */}
        <ConnectionLines
          containerRef={containerRef}
          hubRef={hubRef}
          stationRefs={stationRefs.current}
          hoveredStation={hoveredStation}
        />

        {/* MCP Hub — center of grid */}
        <div className="aw-grid-cell aw-grid-hub" style={{ gridColumn: 3, gridRow: 2 }}>
          <MCPHub
            ref={hubRef}
            totalTools={totalTools}
            isFlashing={!!flashingStations.mcp}
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
              onMouseEnter={() => setHoveredStation(station.id)}
              onMouseLeave={() => setHoveredStation(null)}
            >
              <WorkstationCard
                ref={(el) => setStationRef(station.id, el)}
                station={station}
                lastEvent={stationEvents[station.id]}
                activityCounts={activityCounts[station.id]}
                isFlashing={!!flashingStations[station.id]}
                onClick={handleStationClick}
                index={i}
              />
            </div>
          );
        })}
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
