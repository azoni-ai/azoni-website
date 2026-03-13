import React from 'react';
import { motion } from 'framer-motion';
import BorderBeam from '../ui/border-beam';

function MCPHub({ totalTools, isFlashing, onClick }) {
  return (
    <motion.div
      className={`aw-mcp-hub${isFlashing ? ' aw-station-active' : ''}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <BorderBeam color="#ff7a5c" colorTo="#ffb347" duration={5} borderWidth={2} />

      {/* Lobby decorations */}
      <div className="aw-mcp-lobby-plant" />
      <div className="aw-mcp-clock">
        <div className="aw-mcp-clock-hand aw-mcp-clock-hour" />
        <div className="aw-mcp-clock-hand aw-mcp-clock-min" />
      </div>

      <div className="aw-mcp-content">
        {/* Orbital ring */}
        <div className="aw-mcp-orbit">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="aw-mcp-orbit-dot" style={{ '--i': i }} />
          ))}
        </div>

        {/* Center icon */}
        <div className="aw-mcp-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff7a5c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" />
            <circle cx="6" cy="6" r="1" fill="#ff7a5c" />
            <circle cx="6" cy="18" r="1" fill="#ff7a5c" />
          </svg>
        </div>

        <div className="aw-mcp-info">
          <div className="aw-mcp-label">MCP Server</div>
          <div className="aw-mcp-sublabel">RECEPTION</div>
          <div className="aw-mcp-meta">
            <span className="aw-mcp-tools">{totalTools || 33} tools</span>
            <span className="aw-mcp-dot-sep" />
            <span className="aw-mcp-domains">9 domains</span>
          </div>
        </div>

        <div className="aw-mcp-status">
          <span className="aw-mcp-status-dot" />
          hub
        </div>
      </div>

      {/* Reception desk */}
      <div className="aw-mcp-desk" />
    </motion.div>
  );
}

export default MCPHub;
