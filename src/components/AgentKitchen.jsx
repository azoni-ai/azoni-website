import React, { useEffect, useRef, useState, useCallback } from 'react';
import '../styles/agent-kitchen.css';

const MCP_URL = 'https://azoni-mcp.onrender.com';

// ─── Station definitions ───
const STATION_DEFS = [
  {
    id: 'mcp', label: 'MCP Server', x: 0.50, y: 0.40, color: '#ff7a5c', isHub: true,
    desc: 'Central data hub — routes requests between all agents and services via REST API.',
    actions: ['Routing requests', 'Serving 33 tools', 'Health monitoring'],
  },
  {
    id: 'chatbot', label: 'Azoni AI', x: 0.20, y: 0.16, color: '#60a5fa', agent: 'chat', icon: 'chat',
    desc: 'RAG chatbot with vector search. Finds relevant knowledge or generates it on the fly. Paste a job description for AI fit analysis.',
    actions: ['Answering queries', 'Vector searching', 'Building context'],
    dataLabel: 'queries',
  },
  {
    id: 'blog', label: 'The Scribe', x: 0.80, y: 0.16, color: '#fbbf24', agent: 'blog', icon: 'pen',
    desc: 'Every day, reviews GitHub commits and autonomously writes + publishes a blog post with code analysis. No human input needed.',
    actions: ['Analyzing commits', 'Writing article', 'Publishing post'],
    dataLabel: 'blog content',
  },
  {
    id: 'orchestrator', label: 'The Conductor', x: 0.50, y: 0.82, color: '#a78bfa', agent: 'orchestrator', icon: 'gear', roams: true,
    desc: 'Central brain. Wakes every 3 hours, gathers state from 11 sources, sends to LLM for decisions, validates, then executes. Rate-limited and action-whitelisted.',
    actions: ['Gathering 11 sources', 'LLM deciding', 'Executing actions'],
    dataLabel: 'health + state',
  },
  {
    id: 'spellbrigade', label: 'Spell Brigade', x: 0.10, y: 0.52, color: '#c084fc', agent: 'gaming', icon: 'wand',
    desc: 'Real-time multiplayer wizard combat game. AI generates unique characters with custom abilities and backstories.',
    actions: ['Generating wizards', 'Running battles', 'AI enemies active'],
    dataLabel: 'game data',
  },
  {
    id: 'moltbook', label: 'Moltbook', x: 0.90, y: 0.52, color: '#fb923c', agent: 'social', icon: 'megaphone',
    desc: 'Autonomous social media agent. The orchestrator decides when to post — LLM generates content, comments, and engagement.',
    actions: ['Crafting posts', 'Scheduling content', 'Engaging users'],
    dataLabel: 'social content',
  },
  {
    id: 'oldwaystoday', label: 'Old Ways Today', x: 0.10, y: 0.30, color: '#d97706', icon: 'leaf',
    desc: 'AI wellness platform helping families find non-toxic, traditional alternatives. Same RAG + auto-blog architecture as azoni.ai.',
    actions: ['Curating remedies', 'Auto-blogging', 'RAG retrieval'],
    dataLabel: 'recipes',
  },
  {
    id: 'benchpressonly', label: 'BenchPress', x: 0.30, y: 0.68, color: '#4ade80', agent: 'fitness', icon: 'dumbbell',
    desc: 'AI fitness app with real users. Generates personalized workouts, real-time form correction, tracks PRs and progress trends.',
    actions: ['Tracking workouts', 'AI coaching', 'Analyzing PRs'],
    dataLabel: 'fitness data',
  },
  {
    id: 'embedroute', label: 'EmbedRoute', x: 0.90, y: 0.30, color: '#20d9d2', icon: 'nodes',
    desc: 'Unified embedding API — one endpoint routes to OpenAI, Cohere, Voyage, and more. Powers RAG and semantic search across all apps.',
    actions: ['Routing embeddings', 'Multi-provider', 'Serving vectors'],
    dataLabel: 'vectors',
  },
  {
    id: 'rowcrew', label: 'RowCrew', x: 0.68, y: 0.68, color: '#34d399', icon: 'waves',
    desc: 'Rowing fitness tracker extending the BenchPressOnly platform to rowing. Stroke analysis and progress tracking.',
    actions: ['Logging sessions', 'Stroke analysis', 'Progress tracking'],
    dataLabel: 'rowing data',
  },
  {
    id: 'activity', label: 'Activity Feed', x: 0.35, y: 0.28, color: '#f87171', icon: 'pulse',
    desc: 'Cross-app AI activity log. Every agent action is logged here — blog posts, social posts, health checks, orchestrator decisions.',
    actions: ['Logging events', 'Cross-app tracking', 'Agent monitoring'],
    dataLabel: 'event logs',
  },
];

const DOMAIN_TO_STATION = {
  benchpressonly: 'benchpressonly',
  activity: 'activity',
  spellbrigade: 'spellbrigade',
  oldwaystoday: 'oldwaystoday',
  moltbook: 'moltbook',
  embedroute: 'embedroute',
  rowcrew: 'rowcrew',
};

// ─── Icon drawing ───
function drawIcon(ctx, icon, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (icon) {
    case 'chat': // speech bubble
      ctx.beginPath();
      ctx.moveTo(x - s, y - s * 0.7);
      ctx.lineTo(x + s, y - s * 0.7);
      ctx.quadraticCurveTo(x + s * 1.2, y - s * 0.7, x + s * 1.2, y - s * 0.2);
      ctx.lineTo(x + s * 1.2, y + s * 0.3);
      ctx.quadraticCurveTo(x + s * 1.2, y + s * 0.7, x + s * 0.5, y + s * 0.7);
      ctx.lineTo(x - s * 0.3, y + s * 1.1);
      ctx.lineTo(x - s * 0.1, y + s * 0.7);
      ctx.lineTo(x - s, y + s * 0.7);
      ctx.quadraticCurveTo(x - s * 1.2, y + s * 0.7, x - s * 1.2, y + s * 0.2);
      ctx.lineTo(x - s * 1.2, y - s * 0.2);
      ctx.quadraticCurveTo(x - s * 1.2, y - s * 0.7, x - s, y - s * 0.7);
      ctx.stroke();
      break;

    case 'pen': // pencil
      ctx.beginPath();
      ctx.moveTo(x + s * 0.8, y - s * 0.8);
      ctx.lineTo(x - s * 0.5, y + s * 0.5);
      ctx.lineTo(x - s * 0.8, y + s * 0.8);
      ctx.lineTo(x - s * 0.5, y + s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * 0.8, y - s * 0.8);
      ctx.lineTo(x + s * 0.5, y - s * 0.5);
      ctx.stroke();
      // nib dot
      ctx.beginPath();
      ctx.arc(x - s * 0.8, y + s * 0.8, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'gear': // cog
      ctx.beginPath();
      ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55);
        ctx.lineTo(x + Math.cos(a) * s * 0.85, y + Math.sin(a) * s * 0.85);
        ctx.stroke();
      }
      break;

    case 'wand': // magic wand with star
      ctx.beginPath();
      ctx.moveTo(x - s * 0.7, y + s * 0.7);
      ctx.lineTo(x + s * 0.3, y - s * 0.3);
      ctx.stroke();
      // star
      const starX = x + s * 0.5, starY = y - s * 0.5;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(starX, starY);
        ctx.lineTo(starX + Math.cos(a) * s * 0.4, starY + Math.sin(a) * s * 0.4);
        ctx.stroke();
      }
      break;

    case 'megaphone': // speaker/broadcast
      ctx.beginPath();
      ctx.moveTo(x - s * 0.6, y - s * 0.3);
      ctx.lineTo(x + s * 0.2, y - s * 0.7);
      ctx.lineTo(x + s * 0.2, y + s * 0.7);
      ctx.lineTo(x - s * 0.6, y + s * 0.3);
      ctx.closePath();
      ctx.stroke();
      // sound waves
      ctx.beginPath();
      ctx.arc(x + s * 0.3, y, s * 0.5, -0.6, 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + s * 0.3, y, s * 0.8, -0.5, 0.5);
      ctx.stroke();
      break;

    case 'leaf': // leaf shape
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.8);
      ctx.quadraticCurveTo(x + s, y - s * 0.2, x, y + s * 0.8);
      ctx.quadraticCurveTo(x - s, y - s * 0.2, x, y - s * 0.8);
      ctx.stroke();
      // stem
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.5);
      ctx.lineTo(x, y + s * 0.6);
      ctx.stroke();
      break;

    case 'dumbbell': // barbell
      ctx.beginPath();
      ctx.moveTo(x - s * 0.8, y);
      ctx.lineTo(x + s * 0.8, y);
      ctx.stroke();
      // weights
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.7, y - s * 0.5);
      ctx.lineTo(x - s * 0.7, y + s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * 0.7, y - s * 0.5);
      ctx.lineTo(x + s * 0.7, y + s * 0.5);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      break;

    case 'nodes': // connected nodes
      ctx.beginPath();
      ctx.arc(x - s * 0.4, y - s * 0.3, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + s * 0.4, y + s * 0.3, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - s * 0.15, y - s * 0.1);
      ctx.lineTo(x + s * 0.15, y + s * 0.1);
      ctx.stroke();
      break;

    case 'waves': // water waves
      for (let i = -1; i <= 1; i++) {
        const wy = y + i * s * 0.5;
        ctx.beginPath();
        ctx.moveTo(x - s, wy);
        ctx.quadraticCurveTo(x - s * 0.3, wy - s * 0.3, x, wy);
        ctx.quadraticCurveTo(x + s * 0.3, wy + s * 0.3, x + s, wy);
        ctx.stroke();
      }
      break;

    case 'pulse': // heartbeat line
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.lineTo(x - s * 0.4, y);
      ctx.lineTo(x - s * 0.2, y - s * 0.7);
      ctx.lineTo(x + s * 0.1, y + s * 0.5);
      ctx.lineTo(x + s * 0.3, y - s * 0.3);
      ctx.lineTo(x + s * 0.5, y);
      ctx.lineTo(x + s, y);
      ctx.stroke();
      break;

    default:
      ctx.beginPath();
      ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

// ─── Component ───
function AgentKitchen() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const animRef = useRef(null);
  const stationsRef = useRef([]);
  const pulsesRef = useRef([]);
  const mcpRef = useRef({ health: null, tools: null, toolCounts: {} });
  const mouseRef = useRef({ x: -1, y: -1 });
  const orchestratorRef = useRef({ targetIdx: 0, progress: 0, paused: 0 });
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

  const computeStations = useCallback((w, h) => {
    return STATION_DEFS.map(def => ({
      ...def,
      px: def.x * w,
      py: def.y * h,
      radius: def.isHub ? 44 : 26,
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

    // ─── Pulse spawner ───
    const spawnPulse = () => {
      const stations = stationsRef.current;
      const hub = stations.find(s => s.isHub);
      if (!hub) return;

      const others = stations.filter(s => !s.isHub);
      const src = others[Math.floor(Math.random() * others.length)];
      const toHub = Math.random() > 0.3;

      pulsesRef.current.push({
        sx: toHub ? src.px : hub.px,
        sy: toHub ? src.py : hub.py,
        ex: toHub ? hub.px : src.px,
        ey: toHub ? hub.py : src.py,
        progress: 0,
        speed: 0.006 + Math.random() * 0.005,
        color: src.color,
        label: src.dataLabel || '',
        showLabel: Math.random() > 0.6, // 40% of pulses show label
      });

      if (pulsesRef.current.length > 35) {
        pulsesRef.current = pulsesRef.current.slice(-28);
      }
    };

    let pulseTimer = setInterval(spawnPulse, 350);

    // ─── Drawing functions ───

    const drawBackground = (now) => {
      // Gradient background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#08080d');
      bg.addColorStop(0.5, '#0a0a12');
      bg.addColorStop(1, '#08080d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Hex dot grid
      const spacing = 50;
      const dotR = 0.8;
      for (let row = 0; row < h / spacing + 1; row++) {
        for (let col = 0; col < w / spacing + 1; col++) {
          const gx = col * spacing + (row % 2 ? spacing / 2 : 0);
          const gy = row * spacing;
          // Fade dots near the MCP hub center
          const hub = stationsRef.current.find(s => s.isHub);
          let alpha = 0.06;
          if (hub) {
            const dx = gx - hub.px;
            const dy = gy - hub.py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) alpha = 0.02 + (dist / 120) * 0.04;
          }
          ctx.beginPath();
          ctx.arc(gx, gy, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 122, 92, ${alpha})`;
          ctx.fill();
        }
      }
    };

    const drawConnections = (stations, now) => {
      const hub = stations.find(s => s.isHub);
      if (!hub) return;

      stations.forEach(s => {
        if (s.isHub) return;

        const mx = (s.px + hub.px) / 2;
        const my = (s.py + hub.py) / 2 - 30;

        // Connection line
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.quadraticCurveTo(mx, my, hub.px, hub.py);
        ctx.strokeStyle = `${s.color}20`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -now / 50;
        ctx.stroke();
        ctx.setLineDash([]);

        // Data flow label at midpoint
        if (s.dataLabel) {
          const labelT = 0.45;
          const lx = (1 - labelT) * (1 - labelT) * s.px + 2 * (1 - labelT) * labelT * mx + labelT * labelT * hub.px;
          const ly = (1 - labelT) * (1 - labelT) * s.py + 2 * (1 - labelT) * labelT * my + labelT * labelT * hub.py;

          ctx.save();
          ctx.globalAlpha = 0.25 + Math.sin(now / 2000 + s.x * 5) * 0.1;
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = s.color;
          ctx.fillText(s.dataLabel, lx, ly - 8);
          ctx.restore();
        }
      });
    };

    const drawPulses = (now) => {
      pulsesRef.current.forEach(p => {
        p.progress += p.speed;
        if (p.progress > 1) return;

        const t = p.progress;
        const mx = (p.sx + p.ex) / 2;
        const my = (p.sy + p.ey) / 2 - 30;

        const x = (1 - t) * (1 - t) * p.sx + 2 * (1 - t) * t * mx + t * t * p.ex;
        const y = (1 - t) * (1 - t) * p.sy + 2 * (1 - t) * t * my + t * t * p.ey;

        const alpha = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;

        // Glow trail
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.15;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Pulse label (on select pulses)
        if (p.showLabel && p.label && t > 0.2 && t < 0.7) {
          ctx.save();
          ctx.globalAlpha = alpha * 0.5;
          ctx.font = '7px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#a8a8a0';
          ctx.fillText(p.label, x, y - 10);
          ctx.restore();
        }
      });

      pulsesRef.current = pulsesRef.current.filter(p => p.progress <= 1);
    };

    const drawStation = (s, now, hovered) => {
      const r = s.radius;
      const pulse = Math.sin(now / 600 + s.x * 10) * 2;
      const outerR = r + pulse;

      // Outer glow ring on hover
      if (hovered) {
        const glow = ctx.createRadialGradient(s.px, s.py, r * 0.5, s.px, s.py, r + 20);
        glow.addColorStop(0, `${s.color}15`);
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(s.px, s.py, r + 20, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // Background circle with gradient
      const bgGrad = ctx.createRadialGradient(s.px, s.py, 0, s.px, s.py, outerR);
      bgGrad.addColorStop(0, `${s.color}18`);
      bgGrad.addColorStop(1, `${s.color}08`);
      ctx.beginPath();
      ctx.arc(s.px, s.py, outerR, 0, Math.PI * 2);
      ctx.fillStyle = bgGrad;
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.arc(s.px, s.py, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = `${s.color}${hovered ? '90' : '40'}`;
      ctx.lineWidth = hovered ? 2 : 1.5;
      ctx.stroke();

      // Draw icon inside circle
      if (s.icon) {
        ctx.save();
        ctx.globalAlpha = hovered ? 0.9 : 0.55;
        drawIcon(ctx, s.icon, s.px, s.py, r * 0.35, s.color);
        ctx.restore();
      }

      // Status dot
      const { toolCounts, health } = mcpRef.current;
      const hasDomain = !!DOMAIN_TO_STATION[s.id];
      const isOnline = health?.domains?.includes(s.id) || s.isHub;
      let dotColor;
      if (!health) {
        dotColor = '#6b6b65';
      } else if (hasDomain) {
        dotColor = isOnline ? '#4ade80' : '#ff6b6b';
      } else {
        dotColor = '#60a5fa';
      }

      ctx.beginPath();
      ctx.arc(s.px + r * 0.75, s.py - r * 0.75, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a12';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.px + r * 0.75, s.py - r * 0.75, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.shadowColor = dotColor;
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Tool count badge
      const count = toolCounts[s.id] || 0;
      if (count > 0) {
        ctx.beginPath();
        ctx.arc(s.px + r * 0.75, s.py + r * 0.65, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#12121a';
        ctx.fill();
        ctx.fillStyle = s.color;
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count, s.px + r * 0.75, s.py + r * 0.65);
      }

      // Station label
      ctx.fillStyle = hovered ? '#fafaf9' : '#b0b0a8';
      ctx.font = `${hovered ? '600' : '500'} 11px "DM Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(s.label, s.px, s.py + r + 6 + pulse);

      // Cycling activity text
      if (s.actions) {
        const actionIdx = Math.floor(now / 3000) % s.actions.length;
        const actionProgress = (now % 3000) / 3000;
        // Fade in/out at boundaries
        let actionAlpha = 1;
        if (actionProgress < 0.1) actionAlpha = actionProgress / 0.1;
        else if (actionProgress > 0.85) actionAlpha = (1 - actionProgress) / 0.15;

        ctx.save();
        ctx.globalAlpha = (hovered ? 0.7 : 0.35) * actionAlpha;
        ctx.fillStyle = s.color;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(s.actions[actionIdx], s.px, s.py + r + 20 + pulse);
        ctx.restore();
      }
    };

    const drawMCPHub = (hub, now) => {
      const r = hub.radius;
      const pulse = Math.sin(now / 500) * 3;

      // Large ambient glow
      const ambientGlow = ctx.createRadialGradient(hub.px, hub.py, 0, hub.px, hub.py, r * 3);
      ambientGlow.addColorStop(0, 'rgba(255, 122, 92, 0.08)');
      ambientGlow.addColorStop(0.5, 'rgba(255, 179, 71, 0.03)');
      ambientGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(hub.px, hub.py, r * 3, 0, Math.PI * 2);
      ctx.fillStyle = ambientGlow;
      ctx.fill();

      // Outer pulsing ring
      const outerRing = ctx.createRadialGradient(hub.px, hub.py, r + 5, hub.px, hub.py, r + 20 + pulse);
      outerRing.addColorStop(0, 'rgba(255, 122, 92, 0.15)');
      outerRing.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(hub.px, hub.py, r + 20 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = outerRing;
      ctx.fill();

      // Rotating orbit dots
      const dotCount = 10;
      for (let i = 0; i < dotCount; i++) {
        const angle = (now / 3000) + (i / dotCount) * Math.PI * 2;
        const orbitR = r + 8 + Math.sin(now / 800 + i) * 3;
        const dx = Math.cos(angle) * orbitR;
        const dy = Math.sin(angle) * orbitR;
        const dotAlpha = 0.2 + Math.sin(now / 400 + i * 0.7) * 0.15;
        ctx.beginPath();
        ctx.arc(hub.px + dx, hub.py + dy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 179, 71, ${dotAlpha})`;
        ctx.fill();
      }

      // Second orbit ring (counter-rotating)
      for (let i = 0; i < 6; i++) {
        const angle = -(now / 4000) + (i / 6) * Math.PI * 2;
        const orbitR = r + 16;
        const dx = Math.cos(angle) * orbitR;
        const dy = Math.sin(angle) * orbitR;
        ctx.beginPath();
        ctx.arc(hub.px + dx, hub.py + dy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 122, 92, ${0.15 + Math.sin(now / 500 + i) * 0.1})`;
        ctx.fill();
      }

      // Main circle
      const hubGrad = ctx.createRadialGradient(hub.px - r * 0.3, hub.py - r * 0.3, 0, hub.px, hub.py, r);
      hubGrad.addColorStop(0, 'rgba(255, 140, 100, 0.25)');
      hubGrad.addColorStop(0.7, 'rgba(255, 122, 92, 0.15)');
      hubGrad.addColorStop(1, 'rgba(255, 179, 71, 0.08)');
      ctx.beginPath();
      ctx.arc(hub.px, hub.py, r, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad;
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(255, 122, 92, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(hub.px, hub.py, r * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 179, 71, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // MCP label
      ctx.fillStyle = '#fafaf9';
      ctx.font = 'bold 14px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MCP', hub.px, hub.py - 10);

      // Domain and tool count
      const total = mcpRef.current.tools?.totalTools;
      const domains = mcpRef.current.health?.domains?.length;
      if (total) {
        ctx.fillStyle = '#ffb347';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${total} tools`, hub.px, hub.py + 5);
        if (domains) {
          ctx.fillStyle = 'rgba(255, 179, 71, 0.6)';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(`${domains} domains`, hub.px, hub.py + 18);
        }
      } else {
        ctx.fillStyle = '#6b6b65';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('loading...', hub.px, hub.py + 6);
      }

      // Label below
      ctx.fillStyle = '#b0b0a8';
      ctx.font = '500 11px "DM Sans", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('MCP Server', hub.px, hub.py + r + 8);

      // Activity text
      const hubActions = hub.actions;
      if (hubActions) {
        const idx = Math.floor(now / 3000) % hubActions.length;
        const prog = (now % 3000) / 3000;
        let alpha = 1;
        if (prog < 0.1) alpha = prog / 0.1;
        else if (prog > 0.85) alpha = (1 - prog) / 0.15;
        ctx.save();
        ctx.globalAlpha = 0.4 * alpha;
        ctx.fillStyle = '#ff7a5c';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(hubActions[idx], hub.px, hub.py + r + 22);
        ctx.restore();
      }
    };

    const drawAgent = (station, now) => {
      if (!station.agent) return;

      const colors = {
        chat: '#60a5fa', blog: '#fbbf24', orchestrator: '#a78bfa',
        social: '#fb923c', fitness: '#4ade80', gaming: '#c084fc',
      };

      let ax, ay;

      if (station.roams) {
        const orc = orchestratorRef.current;
        const patrolTargets = [0, 4, 1, 5, 2, 6, 3, 7, 8, 9];
        const target = stationsRef.current[patrolTargets[orc.targetIdx]];

        if (target) {
          if (orc.paused > 0) {
            orc.paused -= 16;
          } else {
            orc.progress += 0.003;
            if (orc.progress >= 1) {
              orc.progress = 0;
              orc.paused = 2000;
              orc.targetIdx = (orc.targetIdx + 1) % patrolTargets.length;
            }
          }

          const t = orc.progress;
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out
          const prevTarget = stationsRef.current[patrolTargets[(orc.targetIdx - 1 + patrolTargets.length) % patrolTargets.length]] || station;
          ax = prevTarget.px + (target.px - prevTarget.px) * eased;
          ay = prevTarget.py + (target.py - prevTarget.py) * eased;
        } else {
          ax = station.px;
          ay = station.py;
        }
      } else {
        ax = station.px;
        ay = station.py - station.radius - 18;
      }

      const bob = Math.sin(now / 400 + (station.x || 0) * 20) * 2.5;
      const color = colors[station.agent] || station.color;

      // Shadow
      ctx.beginPath();
      ctx.ellipse(ax, ay + 18, 6, 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.ellipse(ax, ay + 8 + bob, 7, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Head
      ctx.beginPath();
      ctx.arc(ax, ay - 4 + bob, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Eyes
      const mex = mouseRef.current.x;
      const mey = mouseRef.current.y;
      const lookDx = mex > 0 ? Math.min(1.5, Math.max(-1.5, (mex - ax) / 100)) : 0;
      const lookDy = mey > 0 ? Math.min(1, Math.max(-1, (mey - ay) / 100)) : 0;

      ctx.fillStyle = '#fafaf9';
      ctx.beginPath();
      ctx.arc(ax - 3 + lookDx, ay - 5 + bob + lookDy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ax + 3 + lookDx, ay - 5 + bob + lookDy, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(ax - 3 + lookDx * 1.2, ay - 5 + bob + lookDy * 1.2, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ax + 3 + lookDx * 1.2, ay - 5 + bob + lookDy * 1.2, 1, 0, Math.PI * 2);
      ctx.fill();

      // ─── Role-specific animations ───

      if (station.agent === 'blog' && (!station.roams || orchestratorRef.current.paused > 0)) {
        // Scribe: writing animation — pen strokes
        const penPhase = (now / 200) % (Math.PI * 2);
        const penX = ax + 12 + Math.sin(penPhase) * 4;
        const penY = ay + bob + Math.cos(penPhase * 2) * 2;
        ctx.beginPath();
        ctx.moveTo(penX, penY);
        ctx.lineTo(penX + 3, penY - 6);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Ink dots
        if (Math.sin(penPhase * 3) > 0.5) {
          ctx.beginPath();
          ctx.arc(penX + Math.random() * 3, penY + 2, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf2480';
          ctx.fill();
        }
      }

      if (station.agent === 'chat' && (!station.roams || orchestratorRef.current.paused > 0)) {
        // Chatbot: speech bubbles floating up
        for (let i = 0; i < 2; i++) {
          const bubbleT = ((now / 2000 + i * 0.5) % 1);
          const bubbleAlpha = bubbleT < 0.7 ? 1 : (1 - bubbleT) / 0.3;
          const bx = ax + 14 + i * 6;
          const by = ay - 10 + bob - bubbleT * 20;
          const br = 3 + i * 1.5;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fillStyle = '#60a5fa';
          ctx.globalAlpha = bubbleAlpha * 0.25;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      if (station.agent === 'social' && (!station.roams || orchestratorRef.current.paused > 0)) {
        // Moltbook: broadcast waves
        for (let i = 0; i < 3; i++) {
          const waveT = ((now / 1500 + i * 0.33) % 1);
          const waveR = 10 + waveT * 18;
          ctx.beginPath();
          ctx.arc(ax + 10, ay + bob, waveR, -0.6, 0.6);
          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = 1;
          ctx.globalAlpha = (1 - waveT) * 0.3;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      if (station.agent === 'fitness' && (!station.roams || orchestratorRef.current.paused > 0)) {
        // Fitness: lifting animation
        const liftPhase = Math.sin(now / 600);
        const liftY = ay - 14 + bob + liftPhase * 3;
        ctx.beginPath();
        ctx.moveTo(ax - 8, liftY);
        ctx.lineTo(ax + 8, liftY);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ax - 8, liftY, 2.5, 0, Math.PI * 2);
        ctx.arc(ax + 8, liftY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#4ade80';
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (station.agent === 'gaming' && (!station.roams || orchestratorRef.current.paused > 0)) {
        // Gaming: sparkle/magic effect
        for (let i = 0; i < 5; i++) {
          const sa = now / 250 + i * 1.26;
          const sr = 14 + Math.sin(now / 200 + i) * 5;
          const sx = ax + Math.cos(sa) * sr;
          const sy = ay - 4 + bob + Math.sin(sa) * sr;
          const sparkAlpha = 0.3 + Math.sin(now / 120 + i * 1.5) * 0.3;
          ctx.beginPath();
          // Draw tiny star shape
          ctx.moveTo(sx, sy - 2);
          ctx.lineTo(sx + 0.7, sy - 0.7);
          ctx.lineTo(sx + 2, sy);
          ctx.lineTo(sx + 0.7, sy + 0.7);
          ctx.lineTo(sx, sy + 2);
          ctx.lineTo(sx - 0.7, sy + 0.7);
          ctx.lineTo(sx - 2, sy);
          ctx.lineTo(sx - 0.7, sy - 0.7);
          ctx.closePath();
          ctx.fillStyle = '#c084fc';
          ctx.globalAlpha = sparkAlpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Generic working sparkles for agents without specific animation
      if (!['blog', 'chat', 'social', 'fitness', 'gaming'].includes(station.agent)) {
        if (!station.roams || orchestratorRef.current.paused > 0) {
          for (let i = 0; i < 3; i++) {
            const sa = now / 300 + i * 2.1;
            const sr = 12 + Math.sin(now / 200 + i) * 4;
            const sx = ax + Math.cos(sa) * sr;
            const sy = ay - 4 + bob + Math.sin(sa) * sr;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3 + Math.sin(now / 150 + i * 1.5) * 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }

      // Orchestrator: inspection beam when paused at station
      if (station.roams && orchestratorRef.current.paused > 500) {
        const beamAlpha = Math.min(1, (orchestratorRef.current.paused - 500) / 500) * 0.15;
        ctx.beginPath();
        ctx.moveTo(ax, ay + 17);
        ctx.lineTo(ax - 8, ay + 30);
        ctx.lineTo(ax + 8, ay + 30);
        ctx.closePath();
        ctx.fillStyle = '#a78bfa';
        ctx.globalAlpha = beamAlpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    const drawLegend = (now) => {
      const legendY = h - 28;
      const centerX = w / 2;

      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textBaseline = 'middle';

      // Legend items
      const items = [
        { color: '#4ade80', label: 'MCP Connected' },
        { color: '#60a5fa', label: 'Agent / Function' },
        { color: '#ff6b6b', label: 'Offline' },
      ];

      const totalWidth = items.reduce((sum, item) => sum + ctx.measureText(item.label).width + 22, 0) + (items.length - 1) * 16;
      let lx = centerX - totalWidth / 2;

      items.forEach((item, i) => {
        // Dot
        ctx.beginPath();
        ctx.arc(lx + 4, legendY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();

        // Label
        ctx.fillStyle = '#6b6b65';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, lx + 12, legendY);
        lx += ctx.measureText(item.label).width + 28;
      });

      // Ecosystem stats on the right
      const { health, tools } = mcpRef.current;
      if (tools?.totalTools) {
        const statsText = `${tools.totalTools} tools · ${health?.domains?.length || '?'} domains · ${STATION_DEFS.length - 1} stations`;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#4a4a45';
        ctx.fillText(statsText, w - 16, legendY);
      }

      ctx.restore();
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

      let hovered = null;
      stations.forEach(s => {
        const dx = mx - s.px;
        const dy = my - s.py;
        if (Math.sqrt(dx * dx + dy * dy) < s.radius + 12) {
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

      // Draw legend
      drawLegend(now);

      // Update tooltip
      if (hovered) {
        const { toolCounts, health } = mcpRef.current;
        const domainId = hovered.id;
        const count = hovered.isHub ? mcpRef.current.tools?.totalTools : (toolCounts[domainId] || 0);
        const hasMCPDomain = !!DOMAIN_TO_STATION[domainId];
        const isOnline = health?.domains?.includes(domainId) || hovered.isHub;

        let status, statusColor;
        if (!health) {
          status = 'checking...';
          statusColor = '#6b6b65';
        } else if (hovered.isHub) {
          status = 'online';
          statusColor = '#4ade80';
        } else if (hasMCPDomain) {
          status = isOnline ? 'connected' : 'offline';
          statusColor = isOnline ? '#4ade80' : '#ff6b6b';
        } else {
          status = 'agent';
          statusColor = '#60a5fa';
        }

        const showBelow = hovered.py < 120;
        const tooltipX = Math.max(130, Math.min(w - 130, hovered.px));
        const tooltipY = showBelow
          ? hovered.py + hovered.radius + 20
          : hovered.py - hovered.radius - 10;

        setTooltip({
          x: tooltipX,
          y: tooltipY,
          showBelow,
          name: hovered.label,
          desc: hovered.desc,
          tools: count > 0 ? `${count} tools registered` : null,
          dataLabel: hovered.dataLabel ? `Data: ${hovered.dataLabel}` : null,
          status,
          statusColor,
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
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: tooltip.showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            marginTop: tooltip.showBelow ? 0 : -12,
          }}
        >
          <div className="agent-kitchen-tooltip-name">{tooltip.name}</div>
          <div className="agent-kitchen-tooltip-desc">{tooltip.desc}</div>
          {tooltip.tools && (
            <div className="agent-kitchen-tooltip-tools">{tooltip.tools}</div>
          )}
          {tooltip.dataLabel && (
            <div className="agent-kitchen-tooltip-data">{tooltip.dataLabel}</div>
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
