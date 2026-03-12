import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { mapSourceToStation, STATION_DEFS, formatTimeAgo } from '../../utils/station-mapping';

const stationMap = Object.fromEntries(STATION_DEFS.map(s => [s.id, s]));

function WorkspaceTicker({ events, stationHistory = {} }) {
  const [expanded, setExpanded] = useState(false);

  // Aggregate all station history into a single sorted list for expanded view
  const allEvents = useMemo(() => {
    if (!expanded) return [];
    const seen = new Set();
    const all = [];
    Object.entries(stationHistory).forEach(([sid, evts]) => {
      if (sid === 'activity') return; // skip catch-all to avoid dupes
      (evts || []).forEach(evt => {
        const key = `${evt.type}-${evt.ms}-${sid}`;
        if (!seen.has(key)) {
          seen.add(key);
          all.push({ ...evt, stationId: sid });
        }
      });
    });
    all.sort((a, b) => b.ms - a.ms);
    return all.slice(0, 30);
  }, [expanded, stationHistory]);

  if (!events || events.length === 0) return null;

  return (
    <div className={`aw-ticker${expanded ? ' aw-ticker-expanded' : ''}`}>
      <div className="aw-ticker-top">
        <div className="aw-ticker-label">LIVE</div>
        <button
          className="aw-ticker-toggle"
          onClick={() => setExpanded(prev => !prev)}
          title={expanded ? 'Collapse' : 'Show more events'}
        >
          <svg
            width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Live events (always visible) */}
      <div className="aw-ticker-events">
        <AnimatePresence mode="popLayout">
          {events.map((evt, i) => {
            const sid = mapSourceToStation(evt.source, evt.type);
            const station = stationMap[sid];
            const ts = evt.timestamp;
            const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : Date.now();
            return (
              <motion.div
                key={`${evt.type}-${ms}-${i}`}
                className="aw-ticker-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <span className="aw-ticker-dot" style={{ background: station?.color || '#666' }} />
                <span className="aw-ticker-name">{station?.label || evt.source}</span>
                <span className="aw-ticker-title">{evt.title || evt.type}</span>
                <span className="aw-ticker-ago">{formatTimeAgo(ms)}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Expanded history */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="aw-ticker-history"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {allEvents.map((evt, i) => {
              const station = stationMap[evt.stationId];
              return (
                <div key={`hist-${evt.ms}-${evt.type}-${i}`} className="aw-ticker-item aw-ticker-hist-item">
                  <span className="aw-ticker-dot" style={{ background: station?.color || '#666' }} />
                  <span className="aw-ticker-name">{station?.label || evt.stationId}</span>
                  <span className="aw-ticker-title">{evt.title || evt.type}</span>
                  <span className="aw-ticker-ago">{formatTimeAgo(evt.ms)}</span>
                </div>
              );
            })}
            {allEvents.length === 0 && (
              <div className="aw-ticker-empty">No historical events</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WorkspaceTicker;
