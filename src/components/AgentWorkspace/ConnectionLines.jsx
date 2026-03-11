import React, { useState, useEffect } from 'react';
import AnimatedBeam from '../ui/animated-beam';
import { STATION_DEFS } from '../../utils/station-mapping';

// Grid positions for curvature (logical positions, not CSS grid columns)
const GRID_POS = {
  chatbot:        { col: 0, row: 0 },
  oldwaystoday:   { col: 1, row: 0 },
  embedroute:     { col: 3, row: 0 },
  blog:           { col: 4, row: 0 },
  spellbrigade:   { col: 0, row: 1 },
  activity:       { col: 1, row: 1 },
  fabstats:       { col: 3, row: 1 },
  moltbook:       { col: 4, row: 1 },
  benchpressonly: { col: 1, row: 2 },
  fabstatsbot:    { col: 2, row: 2 },
  rowcrew:        { col: 3, row: 2 },
  orchestrator:   { col: 2, row: 3 },
};

function computeCurvature(stationId) {
  const pos = GRID_POS[stationId];
  if (!pos) return 0;
  // Wider spacing needs more curvature
  if (pos.col < 2) return 40 + (pos.row === 0 ? 25 : 0);
  if (pos.col > 2) return -(40 + (pos.row === 0 ? 25 : 0));
  if (pos.row > 1) return 0;
  return 0;
}

function ConnectionLines({ containerRef, hubRef, stationRefs, hoveredStation }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const nonHubStations = STATION_DEFS.filter(s => !s.isHub);

  return (
    <>
      {nonHubStations.map((station, i) => {
        const ref = stationRefs[station.id];
        if (!ref) return null;

        const dimmed = hoveredStation && hoveredStation !== station.id;

        return (
          <AnimatedBeam
            key={station.id}
            containerRef={containerRef}
            fromRef={{ current: ref }}
            toRef={hubRef}
            color={station.color}
            width={dimmed ? 0.5 : 1.2}
            curvature={computeCurvature(station.id)}
            duration={3.5 + i * 0.2}
            delay={i * 0.15}
            visible={!dimmed}
          />
        );
      })}
    </>
  );
}

export default ConnectionLines;
