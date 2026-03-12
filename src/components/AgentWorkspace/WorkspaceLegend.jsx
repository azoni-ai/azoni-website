import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

function WorkspaceLegend({ show, onDismiss }) {
  return createPortal(
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            className="aw-legend-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
          />
          <motion.div
            className="aw-legend"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="aw-legend-title">What am I looking at?</div>
            <div className="aw-legend-desc">
              This is a real-time map of the Azoni agent ecosystem. Each room is an app or service.
            </div>
            <div className="aw-legend-items">
              <div className="aw-legend-item">
                <span className="aw-legend-icon aw-legend-led-green" />
                <span>Green dot = active station (event in last hour)</span>
              </div>
              <div className="aw-legend-item">
                <span className="aw-legend-icon aw-legend-led-yellow" />
                <span>Yellow dot = stale (1-24h since last event)</span>
              </div>
              <div className="aw-legend-item">
                <span className="aw-legend-icon aw-legend-led-gray" />
                <span>Gray dot = dormant (no events in 24h+)</span>
              </div>
              <div className="aw-legend-item">
                <span className="aw-legend-icon aw-legend-flash" />
                <span>Flash animation = new event just arrived</span>
              </div>
              <div className="aw-legend-item">
                <span className="aw-legend-icon aw-legend-walk" />
                <span>Walking avatar = agent talking to MCP Server</span>
              </div>
              <div className="aw-legend-item">
                <span className="aw-legend-icon aw-legend-glow" />
                <span>Brighter glow = more activity in the last 24h</span>
              </div>
            </div>
            <button className="aw-legend-dismiss" onClick={onDismiss}>Got it</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default WorkspaceLegend;
