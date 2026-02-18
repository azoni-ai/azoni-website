import React, { useEffect, useRef, useState, useCallback } from 'react';
import '../styles/agent-kitchen.css';

const MCP_URL = 'https://azoni-mcp.onrender.com';

// Station definitions with layout positions (% of canvas)
const STATION_DEFS = [
  { id: 'mcp',          label: 'MCP Server',     x: 0.50, y: 0.42, color: '#ff7a5c', desc: 'Central data hub for all agents', isHub: true },
  { id: 'chatbot',      label: 'Chatbot',        x: 0.22, y: 0.18, color: '#60a5fa', desc: 'RAG chatbot with vector search', agent: 'chat' },
  { id: 'blog',         label: 'Blog Writer',    x: 0.78, y: 0.18, color: '#fbbf24', desc: 'Daily AI blog from commits', agent: 'blog' },
  { id: 'orchestrator', label: 'Orchestrator',   x: 0.50, y: 0.82, color: '#a78bfa', desc: 'Central brain, runs every 3h', agent: 'orchestrator', roams: true },
  { id: 'spellbrigade', label: 'Spell Brigade',  x: 0.12, y: 0.52, color: '#c084fc', desc: 'Multiplayer wizard battle game', agent: 'gaming' },
  { id: 'moltbook',     label: 'Moltbook',       x: 0.88, y: 0.52, color: '#fb923c', desc: 'Autonomous social media agent', agent: 'social' },
  { id: 'oldwaystoday', label: 'Old Ways Today', x: 0.12, y: 0.32, color: '#d97706', desc: 'Cultural heritage recipes' },
  { id: 'benchpressonly',label: 'BenchPressOnly', x: 0.32, y: 0.68, color: '#4ade80', desc: 'Fitness tracking app', agent: 'fitness' },
  { id: 'embedroute',   label: 'EmbedRoute',     x: 0.88, y: 0.32, color: '#20d9d2', desc: 'Unified embedding API' },
  { id: 'rowcrew',      label: 'RowCrew',        x: 0.68, y: 0.68, color: '#34d399', desc: 'Rowing fitness tracker' },
  { id: 'activity',     label: 'Activity Feed',  x: 0.35, y: 0.30, color: '#f87171', desc: 'Cross-app AI activity log' },
];

// Map MCP domain names to station IDs
const DOMAIN_TO_STATION = {
  benchpressonly: 'benchpressonly',
  activity: 'activity',
  spellbrigade: 'spellbrigade',
  oldwaystoday: 'oldwaystoday',
  moltbook: 'moltbook',
  embedroute: 'embedroute',
  rowcrew: 'rowcrew',
};

function AgentKitchen() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const animRef = useRef(null);
  const stationsRef = useRef([]);
  const pulsesRef = useRef([]);
  const mcpRef = useRef({ health: null, tools: null, toolCounts: {} });
  const mouseRef = useRef({ x: -1, y: -1 });
  const orchestratorRef = useRef({ x: 0.5, y: 0.82, targetIdx: 0, progress: 0, paused: 0 });
  const [tooltip, setTooltip] = useState(null);

  // Fetch MCP data on mount
  useEffect(() => {
    Promise.all([
      fetch(`${MCP_URL}/health`).then(r => r.json()).catch(() => null),
      fetch(`${MCP_URL}/tools`).then(r => r.json()).catch(() => null),
    ]).then(([health, tools]) => {
      const toolCounts = {};
      if (tools?.tools) {
        tools.tools.forEach(t => {
          toolCounts[t.domain] = (toolCounts[t.domain] || 0) + 1;
        });
      }
      mcpRef.current = { health, tools, toolCounts };
    });
  }, []);

  // Compute station pixel positions
  const computeStations = useCallback((w, h) => {
    return STATION_DEFS.map(def => ({
      ...def,
      px: def.x * w,
      py: def.y * h,
      radius: def.isHub ? 38 : 24,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let w, h;

    const resize = () => {
      const rect = wrapRef.current.getBoundingClientRect();
      w = rect.width;
      h = canvas.offsetHeight;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      stationsRef.current = computeStations(w, h);
    };

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1, y: -1 };
      setTooltip(null);
    };

    // Spawn data pulses
    const spawnPulse = () => {
      const stations = stationsRef.current;
      const hub = stations.find(s => s.isHub);
      if (!hub) return;

      const others = stations.filter(s => !s.isHub);
      const src = others[Math.floor(Math.random() * others.length)];
      const toHub = Math.random() > 0.3; // 70% toward hub, 30% away

      pulsesRef.current.push({
        sx: toHub ? src.px : hub.px,
        sy: toHub ? src.py : hub.py,
        ex: toHub ? hub.px : src.px,
        ey: toHub ? hub.py : src.py,
        progress: 0,
        speed: 0.008 + Math.random() * 0.006,
        color: src.color,
      });

      // Cap at 30 active pulses
      if (pulsesRef.current.length > 30) {
        pulsesRef.current = pulsesRef.current.slice(-25);
      }
    };

    let pulseTimer = setInterval(spawnPulse, 400);

    // ─── Drawing functions ───

    const drawBackground = (now) => {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'rgba(255, 122, 92, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };

    const drawConnections = (stations, now) => {
      const hub = stations.find(s => s.isHub);
      if (!hub) return;

      stations.forEach(s => {
        if (s.isHub) return;

        // Control point for curved line
        const mx = (s.px + hub.px) / 2;
        const my = (s.py + hub.py) / 2 - 20;

        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.quadraticCurveTo(mx, my, hub.px, hub.py);

        ctx.strokeStyle = `${s.color}25`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -now / 60;
        ctx.stroke();
        ctx.setLineDash([]);
      });
    };

    const drawPulses = (now) => {
      pulsesRef.current.forEach(p => {
        p.progress += p.speed;
        if (p.progress > 1) return;

        const t = p.progress;
        const mx = (p.sx + p.ex) / 2;
        const my = (p.sy + p.ey) / 2 - 20;

        // Quadratic bezier position
        const x = (1 - t) * (1 - t) * p.sx + 2 * (1 - t) * t * mx + t * t * p.ex;
        const y = (1 - t) * (1 - t) * p.sy + 2 * (1 - t) * t * my + t * t * p.ey;

        const alpha = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      // Remove completed pulses
      pulsesRef.current = pulsesRef.current.filter(p => p.progress <= 1);
    };

    const drawStation = (s, now, hovered) => {
      const r = s.radius;
      const glow = hovered ? 12 : 0;
      const pulse = Math.sin(now / 600 + s.x * 10) * 2;

      // Background circle
      ctx.beginPath();
      ctx.arc(s.px, s.py, r + pulse, 0, Math.PI * 2);
      ctx.fillStyle = `${s.color}15`;
      if (hovered) {
        ctx.shadowColor = s.color;
        ctx.shadowBlur = glow;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Border
      ctx.beginPath();
      ctx.arc(s.px, s.py, r + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `${s.color}${hovered ? '80' : '40'}`;
      ctx.lineWidth = hovered ? 2 : 1.5;
      ctx.stroke();

      // Inner icon circle
      ctx.beginPath();
      ctx.arc(s.px, s.py, r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = `${s.color}30`;
      ctx.fill();

      // Status dot
      const { toolCounts, health } = mcpRef.current;
      const domainId = DOMAIN_TO_STATION[s.id] ? s.id : null;
      const isOnline = health?.domains?.includes(domainId) || s.isHub;
      const dotColor = health ? (isOnline ? '#4ade80' : '#ffb347') : '#6b6b65';

      ctx.beginPath();
      ctx.arc(s.px + r * 0.7, s.py - r * 0.7, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();

      // Tool count badge
      const count = s.isHub ? mcpRef.current.tools?.totalTools : (toolCounts[s.id] || 0);
      if (count > 0) {
        ctx.beginPath();
        ctx.arc(s.px + r * 0.7, s.py + r * 0.6, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.fillStyle = s.color;
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count, s.px + r * 0.7, s.py + r * 0.6);
      }

      // Label
      ctx.fillStyle = hovered ? '#fafaf9' : '#a8a8a0';
      ctx.font = `${hovered ? '600' : '400'} 11px "DM Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(s.label, s.px, s.py + r + 6 + pulse);
    };

    const drawMCPHub = (hub, now) => {
      const r = hub.radius;
      const pulse = Math.sin(now / 500) * 3;

      // Outer glow ring
      const grad = ctx.createRadialGradient(hub.px, hub.py, r * 0.5, hub.px, hub.py, r + 15 + pulse);
      grad.addColorStop(0, 'rgba(255, 122, 92, 0.15)');
      grad.addColorStop(0.6, 'rgba(255, 179, 71, 0.08)');
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(hub.px, hub.py, r + 15 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Rotating dots
      const dotCount = 8;
      for (let i = 0; i < dotCount; i++) {
        const angle = (now / 2000) + (i / dotCount) * Math.PI * 2;
        const dx = Math.cos(angle) * (r + 5);
        const dy = Math.sin(angle) * (r + 5);
        ctx.beginPath();
        ctx.arc(hub.px + dx, hub.py + dy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 179, 71, ${0.3 + Math.sin(now / 300 + i) * 0.2})`;
        ctx.fill();
      }

      // Main circle
      const hubGrad = ctx.createRadialGradient(hub.px - 5, hub.py - 5, 0, hub.px, hub.py, r);
      hubGrad.addColorStop(0, '#ff7a5c');
      hubGrad.addColorStop(1, '#ffb347');
      ctx.beginPath();
      ctx.arc(hub.px, hub.py, r, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Border
      ctx.strokeStyle = '#ff7a5c80';
      ctx.lineWidth = 2;
      ctx.stroke();

      // MCP label
      ctx.fillStyle = '#fafaf9';
      ctx.font = 'bold 13px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MCP', hub.px, hub.py - 6);

      // Tool count
      const total = mcpRef.current.tools?.totalTools || '...';
      ctx.fillStyle = '#ffb347';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${total} tools`, hub.px, hub.py + 8);
    };

    const drawAgent = (station, now) => {
      if (!station.agent) return;

      const colors = {
        chat: '#60a5fa',
        blog: '#fbbf24',
        orchestrator: '#a78bfa',
        social: '#fb923c',
        fitness: '#4ade80',
        gaming: '#c084fc',
      };

      let ax, ay;

      if (station.roams) {
        // Orchestrator patrols
        const orc = orchestratorRef.current;
        const patrolTargets = [0, 4, 1, 5, 2, 6, 3, 7, 8, 9]; // station indices to visit
        const target = stationsRef.current[patrolTargets[orc.targetIdx]];

        if (target) {
          if (orc.paused > 0) {
            orc.paused -= 16;
          } else {
            orc.progress += 0.004;
            if (orc.progress >= 1) {
              orc.progress = 0;
              orc.paused = 1500; // pause 1.5s at each station
              orc.targetIdx = (orc.targetIdx + 1) % patrolTargets.length;
            }
          }

          const t = orc.progress;
          const prevTarget = stationsRef.current[patrolTargets[(orc.targetIdx - 1 + patrolTargets.length) % patrolTargets.length]] || station;
          ax = prevTarget.px + (target.px - prevTarget.px) * t;
          ay = prevTarget.py + (target.py - prevTarget.py) * t;
        } else {
          ax = station.px;
          ay = station.py;
        }
      } else {
        // Static agent at station
        ax = station.px;
        ay = station.py - station.radius - 16;
      }

      const bob = Math.sin(now / 400 + (station.x || 0) * 20) * 2;
      const color = colors[station.agent] || station.color;

      // Body
      ctx.beginPath();
      ctx.ellipse(ax, ay + 8 + bob, 7, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Head
      ctx.beginPath();
      ctx.arc(ax, ay - 4 + bob, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Eyes (follow mouse if close)
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const lookDx = mx > 0 ? Math.min(1.5, Math.max(-1.5, (mx - ax) / 100)) : 0;
      const lookDy = my > 0 ? Math.min(1, Math.max(-1, (my - ay) / 100)) : 0;

      ctx.fillStyle = '#fafaf9';
      ctx.beginPath();
      ctx.arc(ax - 3 + lookDx, ay - 5 + bob + lookDy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ax + 3 + lookDx, ay - 5 + bob + lookDy, 2, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(ax - 3 + lookDx * 1.2, ay - 5 + bob + lookDy * 1.2, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ax + 3 + lookDx * 1.2, ay - 5 + bob + lookDy * 1.2, 1, 0, Math.PI * 2);
      ctx.fill();

      // Working sparkles
      if (!station.roams || orchestratorRef.current.paused > 0) {
        const sparkleCount = 3;
        for (let i = 0; i < sparkleCount; i++) {
          const sa = now / 300 + i * 2.1;
          const sr = 12 + Math.sin(now / 200 + i) * 4;
          const sx = ax + Math.cos(sa) * sr;
          const sy = ay - 4 + bob + Math.sin(sa) * sr;
          const alpha = 0.3 + Math.sin(now / 150 + i * 1.5) * 0.3;

          ctx.beginPath();
          ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    };

    // ─── Animation loop ───

    const draw = () => {
      const now = performance.now();
      const stations = stationsRef.current;
      if (!stations.length) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      drawBackground(now);
      drawConnections(stations, now);
      drawPulses(now);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Find hovered station
      let hovered = null;
      stations.forEach(s => {
        const dx = mx - s.px;
        const dy = my - s.py;
        if (Math.sqrt(dx * dx + dy * dy) < s.radius + 10) {
          hovered = s;
        }
      });

      // Draw stations
      stations.forEach(s => {
        if (s.isHub) {
          drawMCPHub(s, now);
        } else {
          drawStation(s, now, hovered === s);
        }
      });

      // Draw agents
      stations.forEach(s => {
        if (s.agent) drawAgent(s, now);
      });

      // Update tooltip
      if (hovered) {
        const { toolCounts, health } = mcpRef.current;
        const domainId = hovered.id;
        const count = hovered.isHub ? mcpRef.current.tools?.totalTools : (toolCounts[domainId] || 0);
        const isOnline = health?.domains?.includes(domainId) || hovered.isHub;

        setTooltip({
          x: hovered.px,
          y: hovered.py - hovered.radius - 8,
          name: hovered.label,
          desc: hovered.desc,
          tools: count > 0 ? `${count} tools` : null,
          status: health ? (isOnline ? 'connected' : 'unreachable') : 'checking...',
          statusColor: health ? (isOnline ? '#4ade80' : '#ffb347') : '#6b6b65',
        });
      } else {
        setTooltip(null);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animRef.current);
      clearInterval(pulseTimer);
    };
  }, [computeStations]);

  return (
    <div className="agent-kitchen-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="agent-kitchen-canvas" />
      {tooltip && (
        <div
          className="agent-kitchen-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="agent-kitchen-tooltip-name">{tooltip.name}</div>
          <div className="agent-kitchen-tooltip-desc">{tooltip.desc}</div>
          {tooltip.tools && (
            <div className="agent-kitchen-tooltip-tools">{tooltip.tools}</div>
          )}
          <div className="agent-kitchen-tooltip-status">
            <span className="agent-kitchen-tooltip-dot" style={{ background: tooltip.statusColor }} />
            {tooltip.status}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentKitchen;
