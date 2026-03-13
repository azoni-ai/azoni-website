import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAgentActivity } from '../../hooks/useAgentActivity';
import { useMCPHealth } from '../../hooks/useMCPHealth';
import { STATION_DEFS, STATION_CONNECTIONS, CATEGORY_STYLES, INFRASTRUCTURE_HUBS, DEFAULT_WALK_TARGETS, DOMAIN_TO_STATION, MCP_URL, getEventImportance, formatTimeAgo } from '../../utils/station-mapping';
import { avatars } from '../../data/agents';
import WorkstationCard from './WorkstationCard';
import MCPHub from './MCPHub';
import SecondaryHub from './SecondaryHub';
import WorkspaceTicker from './WorkspaceTicker';
import StationDetailPanel from './StationDetailPanel';
import WorkspaceLegend from './WorkspaceLegend';
import '../../styles/agent-workspace.css';

// ─── Building floor plan: 7-col grid with side corridors ───
// Col layout: office | side-hall | office | center-hall | office | side-hall | office
// Rows: lobby | label | stations | label | stations | label | stations
const GRID_PLACEMENT = {
  // ─── PRODUCT OFFICES (Row 3) ───
  chatbot:        { col: 1, row: 3, room: 1,  door: 'right' },
  orchestrator:   { col: 3, row: 3, room: null, door: 'none', openDesk: true },
  blog:           { col: 5, row: 3, room: 3,  door: 'left' },
  moltbook:       { col: 7, row: 3, room: 4,  door: 'left' },
  // ─── WELLNESS · GAME ROOM (Row 5) ───
  oldwaystoday:   { col: 1, row: 5, room: 5,  door: 'right' },
  fabstats:       { col: 5, row: 5, room: 7,  door: 'left' },
  fabstatsbot:    { col: 7, row: 5, room: 8,  door: 'left' },
  // ─── THE GYM · OPS CENTER (Row 7) ───
  benchpressonly: { col: 1, row: 7, room: 9,  door: 'right' },
  rowcrew:        { col: 3, row: 7, room: 10, door: 'right' },
  activity:       { col: 7, row: 7, room: 12, door: 'left' },
  // ─── THE BASEMENT (Row 10) ───
  spellbrigade:   { col: 3, row: 10, room: null, door: 'right', basement: true },
  embedroute:     { col: 5, row: 10, room: null, door: 'left',  basement: true },
};

// Zone labels between station rows
const ZONE_LABELS = [
  { row: 2, label: 'PRODUCT OFFICES', color: '#60a5fa' },
  { row: 4, left: 'WELLNESS', right: 'GAME ROOM', color: '#c084fc' },
  { row: 6, left: 'THE GYM', right: 'OPS CENTER', color: '#4ade80' },
  { row: 9, label: 'THE BASEMENT', color: '#6b7280' },
];

// Vacant cells (where basement stations used to be)
const VACANT_CELLS = [
  { col: 3, row: 5, zone: 'aw-zone-creative' },
  { col: 5, row: 7, zone: 'aw-zone-ops' },
];

// Zone classes for subtle background textures
const ZONE_CLASSES = {
  chatbot: 'aw-zone-products', orchestrator: 'aw-zone-products',
  blog: 'aw-zone-products', moltbook: 'aw-zone-products',
  oldwaystoday: 'aw-zone-wellness',
  fabstats: 'aw-zone-creative', fabstatsbot: 'aw-zone-creative',
  benchpressonly: 'aw-zone-gym', rowcrew: 'aw-zone-gym',
  activity: 'aw-zone-ops',
  spellbrigade: 'aw-zone-basement', embedroute: 'aw-zone-basement',
};

const workstationStations = STATION_DEFS.filter(s => !s.isHub && !INFRASTRUCTURE_HUBS.has(s.id));
const secondaryHubStations = STATION_DEFS.filter(s => INFRASTRUCTURE_HUBS.has(s.id));
const mcpStation = STATION_DEFS.find(s => s.isHub);
const stationById = Object.fromEntries(STATION_DEFS.map(s => [s.id, s]));

// ─── Waypoint calculation for walking to MCP ───
// Outer offices walk UP the side hallway (never crossing other rooms)
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

  if (isOuter) {
    // Side hallway center X
    const sideHallX = col === 1
      ? cellRect.right - floorRect.left + 17
      : cellRect.left - floorRect.left - 17;
    const sway = col === 1 ? 3 : -3;
    const midY = startY + (mcpY - startY) * 0.5;

    // Outer offices: room → side hall → UP side hall → across lobby → MCP → back
    return {
      points: [
        { x: startX, y: startY },             // In room
        { x: doorX, y: startY },               // Step through doorway
        { x: sideHallX, y: startY },           // Enter side hallway
        { x: sideHallX + sway, y: midY },      // Walk up side hallway (sway)
        { x: sideHallX, y: mcpY },             // Reach MCP lobby level
        { x: mcpX, y: mcpY },                  // Walk across to MCP center
        { x: sideHallX, y: mcpY },             // Leave MCP, back to side hall
        { x: sideHallX + sway, y: midY },      // Walk down side hallway (sway)
        { x: sideHallX, y: startY },           // Back at room level
        { x: doorX, y: startY },               // Re-enter doorway
        { x: startX, y: startY },              // Back in room
      ],
      times: [0, 0.04, 0.08, 0.20, 0.38, 0.50, 0.62, 0.80, 0.92, 0.96, 1],
      duration: 12,
    };
  }

  // Inner offices: step directly into center hallway (no room crossings)
  const sway = door === 'right' ? -4 : 4;
  const hallY1 = startY + (mcpY - startY) * 0.35;
  const hallY2 = startY + (mcpY - startY) * 0.7;

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

// ─── Station-to-station waypoints (e.g., chatbot → specific app) ───
// Routes through side hallways + MCP lobby level to never cross other rooms
function calcStationToStationWaypoints(floorRect, srcCell, destCell, srcDoor, destDoor, srcCol, destCol, lobbyRect) {
  const srcX = srcCell.left + srcCell.width / 2 - floorRect.left;
  const srcY = srcCell.top + srcCell.height * 0.55 - floorRect.top;
  const destX = destCell.left + destCell.width / 2 - floorRect.left;
  const destY = destCell.top + destCell.height * 0.55 - floorRect.top;
  const hallX = floorRect.width / 2;
  const mcpY = lobbyRect.top + lobbyRect.height / 2 - floorRect.top;

  const srcIsOuter = srcCol === 1 || srcCol === 7;
  const destIsOuter = destCol === 1 || destCol === 7;
  const sameSide = (srcCol <= 3 && destCol <= 3) || (srcCol >= 5 && destCol >= 5);

  const srcDoorX = srcDoor === 'right'
    ? srcCell.right - floorRect.left + 6
    : srcCell.left - floorRect.left - 6;
  const destDoorX = destDoor === 'right'
    ? destCell.right - floorRect.left + 6
    : destCell.left - floorRect.left - 6;

  const srcSideX = srcCol === 1 ? srcCell.right - floorRect.left + 17
    : srcCol === 7 ? srcCell.left - floorRect.left - 17 : null;
  const destSideX = destCol === 1 ? destCell.right - floorRect.left + 17
    : destCol === 7 ? destCell.left - floorRect.left - 17 : null;

  // Build forward path — never cross through another room
  const forward = [];
  forward.push({ x: srcX, y: srcY });       // In source room
  forward.push({ x: srcDoorX, y: srcY });   // Source doorway

  if (srcIsOuter && destIsOuter && sameSide) {
    // Same-side outer-to-outer: walk vertically in side hallway
    forward.push({ x: srcSideX, y: srcY });
    if (Math.abs(srcY - destY) > 10) {
      forward.push({ x: srcSideX + 3, y: (srcY + destY) / 2 });
    }
    forward.push({ x: destSideX, y: destY });
  } else if (srcIsOuter && !destIsOuter && sameSide) {
    // Outer to inner, same side: up side hall → lobby → center hall → down
    forward.push({ x: srcSideX, y: srcY });
    forward.push({ x: srcSideX, y: mcpY });
    forward.push({ x: hallX, y: mcpY });
    forward.push({ x: hallX, y: destY });
  } else if (!srcIsOuter && destIsOuter && sameSide) {
    // Inner to outer, same side: center hall → up → lobby → side hall → down
    forward.push({ x: hallX, y: srcY });
    forward.push({ x: hallX, y: mcpY });
    forward.push({ x: destSideX, y: mcpY });
    forward.push({ x: destSideX, y: destY });
  } else if (!srcIsOuter && !destIsOuter) {
    // Both inner: walk center hallway vertically
    forward.push({ x: hallX, y: srcY });
    if (Math.abs(srcY - destY) > 10) {
      forward.push({ x: hallX + 3, y: (srcY + destY) / 2 });
    }
    forward.push({ x: hallX, y: destY });
  } else if (srcIsOuter) {
    // Outer to other side: up side hall → across lobby → down
    forward.push({ x: srcSideX, y: srcY });
    forward.push({ x: srcSideX, y: mcpY });
    if (destIsOuter) {
      forward.push({ x: destSideX, y: mcpY });
      forward.push({ x: destSideX, y: destY });
    } else {
      forward.push({ x: hallX, y: mcpY });
      forward.push({ x: hallX, y: destY });
    }
  } else {
    // Inner to other side outer: center hall → up → across lobby → side hall → down
    forward.push({ x: hallX, y: srcY });
    forward.push({ x: hallX, y: mcpY });
    forward.push({ x: destSideX, y: mcpY });
    forward.push({ x: destSideX, y: destY });
  }

  forward.push({ x: destDoorX, y: destY }); // Dest doorway
  forward.push({ x: destX, y: destY });     // In dest room

  // Return path (reverse, skip last point to avoid duplicate)
  const backward = [...forward].slice(0, -1).reverse();

  // Full path: forward → pause at dest → backward
  const destPoint = forward[forward.length - 1];
  const allPoints = [...forward, destPoint, ...backward];

  // Times: 45% going, 10% pause, 45% returning
  const nFwd = forward.length;
  const nBwd = backward.length;
  const times = [];
  for (let i = 0; i < nFwd; i++) times.push((i / (nFwd - 1)) * 0.45);
  times.push(0.55); // pause at destination
  for (let i = 0; i < nBwd; i++) times.push(0.55 + ((i + 1) / nBwd) * 0.45);

  const duration = Math.max(10, (nFwd + nBwd) * 0.85);
  return { points: allPoints, times, duration };
}

// Maps station IDs to their live app metrics
function getStationMetrics(stationId, appStats, githubStats) {
  if (!appStats && !githubStats) return null;
  const fmt = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n === 0) return null;
    return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
  };
  switch (stationId) {
    case 'fabstats': {
      const s = appStats?.fabstats;
      if (!s) return null;
      const m = [];
      if (fmt(s.users)) m.push({ value: fmt(s.users), label: 'players' });
      if (fmt(s.matches)) m.push({ value: fmt(s.matches), label: 'matches' });
      return m.length ? m : null;
    }
    case 'benchpressonly': {
      const s = appStats?.benchpressonly;
      if (!s) return null;
      const m = [];
      if (fmt(s.users)) m.push({ value: fmt(s.users), label: 'users' });
      if (fmt(s.workoutsLogged)) m.push({ value: fmt(s.workoutsLogged), label: 'workouts' });
      return m.length ? m : null;
    }
    case 'rowcrew': {
      const s = appStats?.rowcrew;
      if (!s) return null;
      const m = [];
      if (fmt(s.sessions || s.totalSessions)) m.push({ value: fmt(s.sessions || s.totalSessions), label: 'sessions' });
      const meters = Number(s.meters || s.totalMeters || 0);
      if (meters > 0) m.push({ value: meters >= 1000000 ? `${(meters / 1000000).toFixed(1)}M` : meters >= 1000 ? `${(meters / 1000).toFixed(0)}k` : String(meters), label: 'meters' });
      return m.length ? m : null;
    }
    case 'oldwaystoday': {
      const s = appStats?.oldwaystoday;
      if (!s) return null;
      const m = [];
      if (fmt(s.requests)) m.push({ value: fmt(s.requests), label: 'requests' });
      return m.length ? m : null;
    }
    case 'blog': {
      const today = githubStats?.today || 0;
      return today > 0 ? [{ value: String(today), label: 'commits today' }] : null;
    }
    default:
      return null;
  }
}

function AgentWorkspace({ appStats, githubStats }) {
  const { stationEvents, tickerEvents, activityCounts, errorCounts, visitCounts, stationHistory, flashingStations, flashTargets, activityHistory, walkQueueRef, lastEventTypeRef } = useAgentActivity();
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
    [...workstationStations, ...secondaryHubStations].forEach(s => {
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
  const walkingAgentsRef = useRef(walkingAgents);
  walkingAgentsRef.current = walkingAgents;
  const floorRef = useRef(null);
  const lobbyRef = useRef(null);
  const cellRefs = useRef({});
  const prevFlashRef = useRef({});

  // Agent pacing state (minor activity → pace inside office)
  const [pacingStations, setPacingStations] = useState({});
  const triggerPace = useCallback((stationId) => {
    setPacingStations(prev => ({ ...prev, [stationId]: Date.now() }));
    setTimeout(() => {
      setPacingStations(prev => {
        const next = { ...prev };
        delete next[stationId];
        return next;
      });
    }, 4000);
  }, []);
  const triggerPaceRef = useRef(triggerPace);
  triggerPaceRef.current = triggerPace;

  // Conductor patrol + health check refs
  const patrolTargetRef = useRef(null);
  const prevHealthRef = useRef(null);
  const isPatrolWalkRef = useRef(false);
  const [inspectedStation, setInspectedStation] = useState(null);
  const inspectedTimerRef = useRef(null);
  const [patrolEvents, setPatrolEvents] = useState([]);

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

  // ─── Data particles (site visits → Activity Feed) ───
  const [particles, setParticles] = useState([]);
  const emitParticlesRef = useRef(null);
  emitParticlesRef.current = (fromStationId, toStationId) => {
    const floorEl = floorRef.current;
    const fromEl = cellRefs.current[fromStationId];
    const toEl = cellRefs.current[toStationId];
    if (!floorEl || !fromEl || !toEl) return;
    const floorRect = floorEl.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const station = stationById[fromStationId];
    const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setParticles(prev => [...prev, {
      id,
      fromX: fromRect.left + fromRect.width / 2 - floorRect.left,
      fromY: fromRect.top + fromRect.height / 2 - floorRect.top,
      toX: toRect.left + toRect.width / 2 - floorRect.left,
      toY: toRect.top + toRect.height / 2 - floorRect.top,
      color: station?.color || '#fff',
    }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 2000);
  };

  // ─── Watch flashes and trigger agent walks ───
  const startWalkRef = useRef(null);
  startWalkRef.current = (stationId, eventType) => {
    const station = stationById[stationId];
    if (!station?.agent || !avatars[station.agent]) return;
    if (INFRASTRUCTURE_HUBS.has(stationId)) return; // hubs don't walk
    if (walkingAgents[stationId]) { triggerPaceRef.current(stationId); return; } // already walking → pace instead

    const pos = GRID_PLACEMENT[stationId];
    if (!pos) return;

    const floorEl = floorRef.current;
    const lobbyEl = lobbyRef.current;
    const cellEl = cellRefs.current[stationId];
    if (!floorEl || !lobbyEl || !cellEl) return;

    const floorRect = floorEl.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();
    const lobbyRect = lobbyEl.getBoundingClientRect();

    // Walk target priority:
    // 1. flashTargets (event metadata)
    // 2. walkQueue (blog sequential visits)
    // 3. DEFAULT_WALK_TARGETS (hardcoded partnerships)
    // 4. Important/medium event → walk to Activity Feed
    // 5. site_visit → particle only (no avatar walk)
    // 6. Default → walk to MCP
    const importance = eventType ? getEventImportance(eventType) : 'low';
    const isPatrol = eventType === 'patrol' || eventType === 'health_check';
    let targetId = flashTargets[stationId]
      || (walkQueueRef.current[stationId]?.length ? walkQueueRef.current[stationId][0] : null)
      || DEFAULT_WALK_TARGETS[stationId]
      || (stationId === 'orchestrator' && patrolTargetRef.current)
      || null;

    // Consume patrol target after reading it
    if (stationId === 'orchestrator' && patrolTargetRef.current) {
      patrolTargetRef.current = null;
    }

    if (!targetId && stationId !== 'activity') {
      if (importance === 'important' || importance === 'medium') {
        targetId = 'activity';
      } else if (eventType === 'site_visit') {
        emitParticlesRef.current(stationId, 'activity');
        triggerPaceRef.current(stationId);
        return;
      }
    }

    const targetPos = targetId ? GRID_PLACEMENT[targetId] : null;
    const targetCell = targetId ? cellRefs.current[targetId] : null;

    let data;
    if (targetPos && targetCell) {
      const targetRect = targetCell.getBoundingClientRect();
      data = calcStationToStationWaypoints(floorRect, cellRect, targetRect, pos.door, targetPos.door, pos.col, targetPos.col, lobbyRect);
      // Blog queue walks: longer duration, more time at destination
      if (walkQueueRef.current[stationId]?.length > 0) {
        data.duration = data.duration * 1.5;
      }
    } else {
      data = calcWaypoints(floorRect, cellRect, lobbyRect, pos.door, pos.col);
    }

    // Faster walks for medium-importance events to Activity Feed
    if (targetId === 'activity' && importance === 'medium') {
      data.duration = Math.max(6, data.duration * 0.7);
    }

    // Patrol/health-check walks: leisurely pace + midpoint health check
    if (isPatrol) {
      data.duration = data.duration * 1.3;
      isPatrolWalkRef.current = true;

      // Schedule a real health check at the walk midpoint (~45% through)
      if (targetId) {
        const dest = targetId;
        const midpointMs = data.duration * 0.45 * 1000;
        setTimeout(() => {
          const domain = Object.entries(DOMAIN_TO_STATION).find(([, v]) => v === dest)?.[0];
          const destStation = stationById[dest];
          const destLabel = destStation?.label || dest;
          const logInspection = (status) => {
            setInspectedStation({ id: dest, status });
            if (inspectedTimerRef.current) clearTimeout(inspectedTimerRef.current);
            inspectedTimerRef.current = setTimeout(() => setInspectedStation(null), 5000);
            const evt = {
              type: 'health_check',
              title: `Inspected ${destLabel} — ${status}`,
              source: 'orchestrator',
              receivedAt: Date.now(),
            };
            setPatrolEvents(prev => [evt, ...prev].slice(0, 10));
          };

          if (domain) {
            fetch(`${MCP_URL}/health`).then(r => r.json()).then(h => {
              logInspection(h[domain] === true ? 'online' : h[domain] === false ? 'offline' : 'unknown');
            }).catch(() => {
              logInspection('offline');
            });
          } else {
            logInspection('checked');
          }
        }, midpointMs);
      }
    } else {
      isPatrolWalkRef.current = false;
    }

    setWalkingAgents(prev => ({
      ...prev,
      [stationId]: { points: data.points, times: data.times, duration: data.duration, agent: station.agent },
    }));
  };

  useEffect(() => {
    const prev = prevFlashRef.current;
    const combined = { ...flashingStations, ...replayFlashes };
    let newFlash = false;

    for (const stationId of Object.keys(combined)) {
      if (!prev[stationId]) {
        const evtType = lastEventTypeRef.current[stationId] || null;
        startWalkRef.current(stationId, evtType);
        newFlash = true;
      }
    }

    if (newFlash && !isPatrolWalkRef.current) {
      setHallwayActive(true);
      if (hallwayTimerRef.current) clearTimeout(hallwayTimerRef.current);
      hallwayTimerRef.current = setTimeout(() => setHallwayActive(false), 12000);
    }

    prevFlashRef.current = combined;
  }, [flashingStations, replayFlashes, lastEventTypeRef]);

  const removeWalkingAgent = useCallback((stationId) => {
    setWalkingAgents(prev => {
      const next = { ...prev };
      delete next[stationId];
      return next;
    });

    // Advance walk queue for sequential walks (e.g., blog visiting stations)
    const queue = walkQueueRef.current[stationId];
    if (queue && queue.length > 0) {
      walkQueueRef.current = {
        ...walkQueueRef.current,
        [stationId]: queue.slice(1),
      };
      if (queue.length > 1) {
        setTimeout(() => {
          startWalkRef.current(stationId);
        }, 2000);
      } else {
        delete walkQueueRef.current[stationId];
      }
    }
  }, [walkQueueRef]);

  // ─── Conductor patrol walks ───
  useEffect(() => {
    const PATROL_STATIONS = ['chatbot', 'blog', 'moltbook', 'benchpressonly', 'rowcrew', 'oldwaystoday', 'fabstats', 'fabstatsbot'];
    let lastIdx = -1;

    const patrol = () => {
      if (walkingAgentsRef.current['orchestrator']) return;
      let idx;
      do { idx = Math.floor(Math.random() * PATROL_STATIONS.length); } while (idx === lastIdx && PATROL_STATIONS.length > 1);
      lastIdx = idx;
      patrolTargetRef.current = PATROL_STATIONS[idx];
      startWalkRef.current('orchestrator', 'patrol');
    };

    const initial = setTimeout(patrol, 20000);
    const interval = setInterval(patrol, 45000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, []);

  // ─── Conductor health-check walks ───
  useEffect(() => {
    if (!health) {
      prevHealthRef.current = health;
      return;
    }
    if (!prevHealthRef.current) {
      prevHealthRef.current = health;
      return;
    }
    for (const [domain, status] of Object.entries(health)) {
      const prev = prevHealthRef.current[domain];
      if (prev !== undefined && prev !== status) {
        const stationId = DOMAIN_TO_STATION[domain];
        if (stationId && !walkingAgentsRef.current['orchestrator']) {
          patrolTargetRef.current = stationId;
          startWalkRef.current('orchestrator', 'health_check');
          break;
        }
      }
    }
    prevHealthRef.current = health;
  }, [health]);

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
          <span className="aw-header-stat">{workstationStations.length} stations</span>
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
        <span className="aw-building-label">MCP SERVER · AZONI PLATFORM</span>

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

        {/* Zone labels */}
        {ZONE_LABELS.map((z, i) => (
          <div
            key={`zone-${i}`}
            className="aw-zone-label"
            style={{ gridColumn: '1 / -1', gridRow: z.row, '--zone-color': z.color }}
          >
            {z.label ? (
              <span className="aw-zone-text">{z.label}</span>
            ) : (
              <>
                <span className="aw-zone-text aw-zone-left">{z.left}</span>
                <span className="aw-zone-divider" />
                <span className="aw-zone-text aw-zone-right">{z.right}</span>
              </>
            )}
          </div>
        ))}

        {/* Central hallway — spans all station rows */}
        <div
          className={`aw-hallway${hallwayActive ? ' aw-hallway-active' : ''}`}
          style={{ gridColumn: 4, gridRow: '2 / 11' }}
        >
          {/* Water cooler — products zone */}
          <div className="aw-hall-decor aw-decor-top">
            <div className="aw-decor-watercooler" />
          </div>
          {/* Bulletin board — game room zone */}
          <div className="aw-hall-decor aw-decor-mid">
            <div className="aw-decor-bulletin" />
          </div>
          {/* Coffee machine — gym/ops zone */}
          <div className="aw-hall-decor aw-decor-bot">
            <div className="aw-decor-coffee" />
          </div>
        </div>

        {/* Left side corridor */}
        <div
          className={`aw-side-hallway${hallwayActive ? ' aw-side-hallway-active' : ''}`}
          style={{ gridColumn: 2, gridRow: '2 / 8' }}
        >
          <div className="aw-hall-decor aw-decor-top">
            <div className="aw-decor-plant" />
          </div>
          <div className="aw-hall-decor aw-decor-mid">
            <div className="aw-decor-bench" />
          </div>
          <div className="aw-hall-decor aw-decor-bot">
            <div className="aw-decor-shoes" />
          </div>
        </div>

        {/* Right side corridor */}
        <div
          className={`aw-side-hallway${hallwayActive ? ' aw-side-hallway-active' : ''}`}
          style={{ gridColumn: 6, gridRow: '2 / 8' }}
        >
          <div className="aw-hall-decor aw-decor-top">
            <div className="aw-decor-umbrella" />
          </div>
          <div className="aw-hall-decor aw-decor-mid">
            <div className="aw-decor-vending" />
          </div>
          <div className="aw-hall-decor aw-decor-bot">
            <div className="aw-decor-serverrack" />
          </div>
        </div>

        {/* Staircase separator — between main floor and basement */}
        <div className="aw-staircase" style={{ gridColumn: '1 / -1', gridRow: 8 }}>
          <div className="aw-staircase-steps" />
          <div className="aw-staircase-label">
            <span className="aw-staircase-arrow">&#x25BE;</span>
            STAIRS
            <span className="aw-staircase-arrow">&#x25BE;</span>
          </div>
        </div>

        {/* Vacant rooms — where basement stations used to be */}
        {VACANT_CELLS.map((cell, i) => (
          <div
            key={`vacant-${i}`}
            className={`aw-grid-cell aw-vacant-cell ${cell.zone}`}
            style={{ gridColumn: cell.col, gridRow: cell.row }}
          >
            <div className="aw-vacant-room">
              <span className="aw-vacant-label">VACANT</span>
            </div>
          </div>
        ))}

        {/* Station rooms */}
        {workstationStations.map((station, i) => {
          const pos = GRID_PLACEMENT[station.id];
          if (!pos) return null;
          const zoneClass = ZONE_CLASSES[station.id] || '';
          const basementClass = pos.basement ? ' aw-basement-cell' : '';
          return (
            <div
              key={station.id}
              ref={(el) => setCellRef(station.id, el)}
              className={`aw-grid-cell${zoneClass ? ` ${zoneClass}` : ''}${basementClass}`}
              style={{ gridColumn: pos.col, gridRow: pos.row }}
              onMouseEnter={() => handleStationEnter(station.id)}
              onMouseLeave={handleStationLeave}
            >
              <WorkstationCard
                station={station}
                lastEvent={station.id === 'orchestrator' && patrolEvents[0] && (!stationEvents[station.id] || patrolEvents[0].receivedAt > stationEvents[station.id].receivedAt) ? patrolEvents[0] : stationEvents[station.id]}
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
                openDesk={pos.openDesk}
                basement={pos.basement}
                metrics={getStationMetrics(station.id, appStats, githubStats)}
                inspection={inspectedStation?.id === station.id ? inspectedStation : null}
                isPacing={!!pacingStations[station.id]}
              />
            </div>
          );
        })}

        {/* Secondary hubs — infrastructure destinations */}
        {secondaryHubStations.map((station, i) => {
          const pos = GRID_PLACEMENT[station.id];
          if (!pos) return null;
          const zoneClass = ZONE_CLASSES[station.id] || '';
          return (
            <div
              key={station.id}
              ref={(el) => setCellRef(station.id, el)}
              className={`aw-grid-cell${zoneClass ? ` ${zoneClass}` : ''}`}
              style={{ gridColumn: pos.col, gridRow: pos.row }}
              onMouseEnter={() => handleStationEnter(station.id)}
              onMouseLeave={handleStationLeave}
            >
              <SecondaryHub
                station={station}
                isFlashing={!!flashingStations[station.id] || !!replayFlashes[station.id]}
                lastEvent={stationEvents[station.id]}
                activityCounts={activityCounts[station.id]}
                visitCount={visitCounts[station.id] || 0}
                idleLevel={idleLevels[station.id] || 0}
                isHighlighted={highlightedSet.has(station.id)}
                isDimmedByHover={highlightedSet.size > 0 && !highlightedSet.has(station.id)}
                onClick={handleStationClick}
                roomNumber={pos.room}
                door={pos.door}
              />
            </div>
          );
        })}

        {/* Data particles (site visits flowing to Activity Feed) */}
        <AnimatePresence>
          {particles.map(p => (
            <motion.div
              key={p.id}
              className="aw-particle-flow"
              style={{ background: p.color }}
              initial={{ x: p.fromX, y: p.fromY, opacity: 0.7, scale: 1 }}
              animate={{ x: p.toX, y: p.toY, opacity: 0, scale: 0.3 }}
              transition={{ duration: 1.5, ease: 'easeIn' }}
            />
          ))}
        </AnimatePresence>

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
      <WorkspaceTicker events={[...patrolEvents, ...tickerEvents].sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0)).slice(0, 5)} stationHistory={stationHistory} />

      {/* Detail panel (portal) */}
      <StationDetailPanel
        station={selectedStation}
        stationHistory={selectedStation ? stationHistory[selectedStation.id] : null}
        activityCounts={selectedStation ? activityCounts[selectedStation.id] : null}
        visitCount={selectedStation ? (visitCounts[selectedStation.id] || 0) : 0}
        health={health}
        appStats={appStats}
        githubStats={githubStats}
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
