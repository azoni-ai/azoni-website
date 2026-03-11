import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { mapSourceToStation, STATION_DEFS, formatTimeAgo } from '../../utils/station-mapping';

const stationMap = Object.fromEntries(STATION_DEFS.map(s => [s.id, s]));

function WorkspaceTicker({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="aw-ticker">
      <div className="aw-ticker-label">LIVE</div>
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
    </div>
  );
}

export default WorkspaceTicker;
