import React, { useEffect, useRef, useState, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { avatars } from '../data/agents';
import '../styles/agent-kitchen.css';

const MCP_URL = 'https://azoni-mcp.onrender.com';

// ─── Source / Type → Station mapping ───
const SOURCE_TO_STATION = {
  'benchpressonly': 'benchpressonly',
  'spell-brigade': 'spellbrigade',
  'moltbook-agent': 'moltbook',
  'rowcrew': 'rowcrew',
  'oldwaystoday': 'oldwaystoday',
  'old-ways-today': 'oldwaystoday',
  'orchestrator': 'orchestrator',
  'daily-blog': 'blog',
  'azoni-ai': 'chatbot',
};

const TYPE_TO_STATION = {
  'agent_observing': 'orchestrator',
  'agent_deciding': 'orchestrator',
  'orchestrator_summary': 'orchestrator',
  'self_assessment': 'orchestrator',
  'error_reviewed': 'orchestrator',
  'project_updated': 'orchestrator',
  'health_alert': 'activity',
  'blog_published': 'blog',
  'blog_generated': 'blog',
  'knowledge_generated': 'chatbot',
  'wizard_created': 'spellbrigade',
  'dungeon_created': 'spellbrigade',
  'workout_generated': 'benchpressonly',
  'workout_autofilled': 'benchpressonly',
  'progress_analyzed': 'benchpressonly',
  'assistant_chat': 'chatbot',
  'moltbook_post': 'moltbook',
  'moltbook_comment': 'moltbook',
  'moltbook_upvote': 'moltbook',
  'owt_chat': 'oldwaystoday',
  'owt_blog': 'oldwaystoday',
};

function mapSourceToStation(source, type) {
  // Source is more specific (tells us which agent/service), type is the fallback
  if (SOURCE_TO_STATION[source]) return SOURCE_TO_STATION[source];
  if (TYPE_TO_STATION[type]) return TYPE_TO_STATION[type];
  return null;
}

function formatTimeAgo(ms) {
  const diff = Date.now() - ms;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ─── Station definitions ───
const STATION_DEFS = [
  {
    id: 'mcp', label: 'MCP Server', x: 0.50, y: 0.40, color: '#ff7a5c', isHub: true,
    desc: 'Tool registry and data gateway — exposes 33 tools across 9 domains. Agents query MCP to read data from services. Activity events flow through Firebase.',
    actions: ['Routing requests', 'Serving 33 tools', 'Health monitoring'],
  },
  {
    id: 'chatbot', label: 'Azoni AI', x: 0.20, y: 0.16, color: '#60a5fa', agent: 'chat', icon: 'chat',
    desc: 'RAG chatbot — queries Firestore knowledge base, generates missing knowledge on the fly. Logs every chat to agent_activity directly.',
    actions: ['Answering queries', 'Vector searching', 'Building context'],
    dataLabel: 'queries',
  },
  {
    id: 'blog', label: 'The Scribe', x: 0.80, y: 0.16, color: '#fbbf24', agent: 'blog', icon: 'pen',
    desc: 'Daily autonomous blog agent — reads GitHub commits, writes analysis posts via LLM, publishes to Firestore. Logs each post to agent_activity.',
    actions: ['Analyzing commits', 'Writing article', 'Publishing post'],
    dataLabel: 'blog content',
  },
  {
    id: 'orchestrator', label: 'The Conductor', x: 0.50, y: 0.82, color: '#a78bfa', agent: 'orchestrator', icon: 'gear', roams: true,
    desc: 'Central brain. Wakes every 3 hours, reads state from MCP + Firebase, sends to LLM for decisions, validates, then executes. Logs decisions to agent_activity.',
    actions: ['Gathering 11 sources', 'LLM deciding', 'Executing actions'],
    dataLabel: 'health + state',
  },
  {
    id: 'spellbrigade', label: 'Spell Brigade', x: 0.10, y: 0.52, color: '#c084fc', agent: 'gaming', icon: 'wand',
    desc: 'Multiplayer wizard combat game. AI generates characters with unique abilities. Logs wizard/dungeon creation to agent_activity via webhook.',
    actions: ['Generating wizards', 'Running battles', 'AI enemies active'],
    dataLabel: 'game data',
  },
  {
    id: 'moltbook', label: 'Moltbook', x: 0.90, y: 0.52, color: '#fb923c', agent: 'social', icon: 'megaphone',
    desc: 'Autonomous social platform. The orchestrator triggers posts via MCP tools — LLM generates content, comments, and engagement. Logs via webhook.',
    actions: ['Crafting posts', 'Scheduling content', 'Engaging users'],
    dataLabel: 'social content',
  },
  {
    id: 'oldwaystoday', label: 'Old Ways Today', x: 0.10, y: 0.30, color: '#d97706', agent: 'wellness', icon: 'leaf',
    desc: 'AI wellness platform — RAG chatbot + auto-blog. Separate backend on Render. Logs chat events to agent_activity via webhook.',
    actions: ['Curating remedies', 'Auto-blogging', 'RAG retrieval'],
    dataLabel: 'recipes',
  },
  {
    id: 'benchpressonly', label: 'BenchPress', x: 0.30, y: 0.68, color: '#4ade80', agent: 'fitness', icon: 'dumbbell',
    desc: 'AI fitness app with real users. Generates personalized workouts, tracks PRs. Logs AI activity via webhook. MCP reads its 12 Firestore collections.',
    actions: ['Tracking workouts', 'AI coaching', 'Analyzing PRs'],
    dataLabel: 'fitness data',
  },
  {
    id: 'embedroute', label: 'EmbedRoute', x: 0.90, y: 0.30, color: '#20d9d2', icon: 'nodes',
    desc: 'Standalone embedding API — one endpoint routes to OpenAI, Cohere, Voyage, and more. MCP exposes it as tools; other services call it directly.',
    actions: ['Routing embeddings', 'Multi-provider', 'Serving vectors'],
    dataLabel: 'embeddings',
  },
  {
    id: 'rowcrew', label: 'RowCrew', x: 0.68, y: 0.68, color: '#34d399', icon: 'waves',
    desc: 'Rowing fitness tracker sharing Firebase with BenchPress. Claude Vision verifies workout photos. MCP reads its session data.',
    actions: ['Logging sessions', 'Stroke analysis', 'Progress tracking'],
    dataLabel: 'rowing data',
  },
  {
    id: 'activity', label: 'Activity Feed', x: 0.35, y: 0.28, color: '#f87171', icon: 'pulse',
    desc: 'Firestore collection (agent_activity) — the single source of truth. All services write here directly or via webhook. This visualization watches it in real time.',
    actions: ['Logging events', 'Cross-app tracking', 'Agent monitoring'],
    dataLabel: 'event logs',
  },
];

// ─── Per-agent idle personality ───
// Each character has unique movement feel — different rhythms prevent mechanical sameness
const AGENT_IDLE = {
  orchestrator: { bobSpeed: 5000, bobAmt: 2.5, breathSpeed: 4000, breathAmt: 0.015, lean: 0 },
  chat:         { bobSpeed: 2800, bobAmt: 1.8, breathSpeed: 2500, breathAmt: 0.012, lean: 0.02 },
  blog:         { bobSpeed: 4200, bobAmt: 1.5, breathSpeed: 3500, breathAmt: 0.01, lean: -0.015 },
  fitness:      { bobSpeed: 2200, bobAmt: 2.5, breathSpeed: 2000, breathAmt: 0.02, lean: 0 },
  gaming:       { bobSpeed: 3600, bobAmt: 2.0, breathSpeed: 3000, breathAmt: 0.018, lean: 0.01 },
  social:       { bobSpeed: 2000, bobAmt: 3.0, breathSpeed: 2200, breathAmt: 0.015, lean: -0.02 },
  wellness:     { bobSpeed: 4800, bobAmt: 1.5, breathSpeed: 4200, breathAmt: 0.01, lean: 0.012 },
};

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
  // Agent trip state: each agent walks to MCP hub when a real event arrives (including orchestrator)
  const agentTripsRef = useRef(
    STATION_DEFS.filter(s => s.agent).reduce((acc, s) => {
      acc[s.id] = {
        state: 'idle', // idle → toHub → atHub → toStation → idle
        progress: 0,
        waitUntil: 0,
      };
      return acc;
    }, {})
  );
  // Real-time event data
  const stationEventsRef = useRef({});  // last event per station { [stationId]: { title, type, source, timestamp, receivedAt } }
  const tickerRef = useRef([]);         // last 5 events for bottom ticker
  const isFirstLoadRef = useRef(true);  // gate initial snapshot vs new events
  const [tooltip, setTooltip] = useState(null);
  const avatarImagesRef = useRef({});
  const effectsRef = useRef([]);       // free-floating visual particles
  const connectionFlashRef = useRef({}); // { stationId: timestamp }

  // Pre-render SVG avatars as Image objects for canvas drawing
  useEffect(() => {
    const agentToAvatar = {
      chat: 'chat', blog: 'blog', orchestrator: 'orchestrator',
      gaming: 'gaming', social: 'social', fitness: 'fitness',
      wellness: 'oldways',
    };
    const urls = [];
    Object.entries(agentToAvatar).forEach(([agentKey, avatarKey]) => {
      if (!avatars[avatarKey]) return;
      const svgEl = avatars[avatarKey](256);
      let svgString = renderToStaticMarkup(svgEl);
      // Standalone SVG documents loaded via Blob URL require xmlns namespace
      if (!svgString.includes('xmlns')) {
        svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      }
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      urls.push(url);
      const img = new Image();
      img.onload = () => { avatarImagesRef.current[agentKey] = img; };
      img.onerror = (e) => console.warn(`Avatar failed to load: ${agentKey}`, e);
      img.src = url;
    });
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, []);

  // Event-driven pulse spawning (called from onSnapshot)
  const spawnEventPulse = useCallback((stationId, eventData) => {
    const stations = stationsRef.current;
    const hub = stations.find(s => s.isHub);
    const src = stations.find(s => s.id === stationId);
    if (!hub || !src) return;

    pulsesRef.current.push({
      sx: src.px, sy: src.py,
      ex: hub.px, ey: hub.py,
      progress: 0,
      speed: 0.006,
      color: src.color,
      label: (eventData.title || '').slice(0, 25) || src.dataLabel || '',
      showLabel: true,
    });
    // Directional particle stream toward hub (event-driven, restrained)
    const dx = hub.px - src.px;
    const dy = hub.py - src.py;
    const baseAngle = Math.atan2(dy, dx);
    for (let i = 0; i < 6; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 1.2;
      const speed = 0.6 + Math.random() * 1.2;
      effectsRef.current.push({
        x: src.px, y: src.py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, decay: 0.015 + Math.random() * 0.01,
        color: src.color, size: 1.5 + Math.random() * 2,
      });
    }
    // Flash the connection line bright
    connectionFlashRef.current[stationId] = performance.now();
    // Cap pulses to prevent memory issues
    if (pulsesRef.current.length > 30) {
      pulsesRef.current = pulsesRef.current.slice(-20);
    }
  }, []);

  // Event-driven agent trip (called from onSnapshot)
  const triggerAgentTrip = useCallback((stationId) => {
    const trip = agentTripsRef.current[stationId];
    if (!trip) return;
    if (trip.state === 'idle') {
      trip.state = 'toHub';
      trip.progress = 0;
    }
  }, []);

  // Fetch MCP data every 30s
  useEffect(() => {
    const fetchMCP = () => {
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
    };
    fetchMCP();
    const interval = setInterval(fetchMCP, 30000);
    return () => clearInterval(interval);
  }, []);

  // Firebase real-time listener for agent_activity
  useEffect(() => {
    const q = query(
      collection(db, 'agent_activity'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (isFirstLoadRef.current) {
        // Initial load — seed station events and ticker, but no pulses/trips
        const docs = snapshot.docs.map(d => d.data());
        docs.forEach(data => {
          const sid = mapSourceToStation(data.source, data.type);
          if (sid && !stationEventsRef.current[sid]) {
            const ts = data.timestamp;
            const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
            stationEventsRef.current[sid] = { ...data, receivedAt: ms || Date.now() };
          }
        });
        tickerRef.current = docs.slice(0, 5);
        isFirstLoadRef.current = false;
        return;
      }
      // New events only
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const stationId = mapSourceToStation(data.source, data.type);
          if (stationId) {
            spawnEventPulse(stationId, data);
            triggerAgentTrip(stationId);
            stationEventsRef.current[stationId] = { ...data, receivedAt: Date.now() };
            tickerRef.current = [data, ...tickerRef.current].slice(0, 5);
          }
        }
      });
    });
    return () => unsub();
  }, [spawnEventPulse, triggerAgentTrip]);

  const computeStations = useCallback((w, h) => {
    return STATION_DEFS.map(def => ({
      ...def,
      px: def.x * w,
      py: def.y * h,
      radius: def.isHub ? 44 : 20,
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

    // ─── Drawing functions ───

    const drawBackground = (now) => {
      // Gradient background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#08080d');
      bg.addColorStop(0.5, '#0a0a12');
      bg.addColorStop(1, '#08080d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Hex dot grid — subtle, restrained
      const spacing = 55;
      const dotR = 0.6;
      const hub = stationsRef.current.find(s => s.isHub);
      for (let row = 0; row < h / spacing + 1; row++) {
        for (let col = 0; col < w / spacing + 1; col++) {
          const gx = col * spacing + (row % 2 ? spacing / 2 : 0);
          const gy = row * spacing;
          let alpha = 0.04;
          if (hub) {
            const ddx = gx - hub.px;
            const ddy = gy - hub.py;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dist < 140) alpha = 0.01 + (dist / 140) * 0.03;
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

        // Connection line — quiet gradient curve, brightens on event
        const flashStart = connectionFlashRef.current[s.id];
        const flashAge = flashStart ? now - flashStart : Infinity;
        const isFlashing = flashAge < 1800;
        const flashAlpha = isFlashing ? Math.max(0, 1 - flashAge / 1800) : 0;

        // Base line — subtle solid gradient (not dashed)
        const lineGrad = ctx.createLinearGradient(s.px, s.py, hub.px, hub.py);
        lineGrad.addColorStop(0, `${s.color}${isFlashing ? '60' : '18'}`);
        lineGrad.addColorStop(0.5, `${s.color}${isFlashing ? '40' : '0c'}`);
        lineGrad.addColorStop(1, `rgba(255, 122, 92, ${isFlashing ? 0.2 : 0.06})`);
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.quadraticCurveTo(mx, my, hub.px, hub.py);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = isFlashing ? 1.5 + flashAlpha : 1;
        ctx.stroke();

        // Event flash: bright pulse traveling along the curve
        if (isFlashing) {
          const pulseT = 1 - flashAlpha; // 0→1 as flash ages
          const pt = pulseT;
          const px = (1 - pt) * (1 - pt) * s.px + 2 * (1 - pt) * pt * mx + pt * pt * hub.px;
          const py = (1 - pt) * (1 - pt) * s.py + 2 * (1 - pt) * pt * my + pt * pt * hub.py;
          const pulseGlow = ctx.createRadialGradient(px, py, 0, px, py, 18);
          pulseGlow.addColorStop(0, `${s.color}`);
          pulseGlow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(px, py, 18, 0, Math.PI * 2);
          ctx.fillStyle = pulseGlow;
          ctx.globalAlpha = flashAlpha * 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Data flow label at midpoint — only on hover or flash
        if (s.dataLabel) {
          const labelT = 0.45;
          const lx = (1 - labelT) * (1 - labelT) * s.px + 2 * (1 - labelT) * labelT * mx + labelT * labelT * hub.px;
          const ly = (1 - labelT) * (1 - labelT) * s.py + 2 * (1 - labelT) * labelT * my + labelT * labelT * hub.py;

          ctx.save();
          ctx.globalAlpha = isFlashing ? 0.35 + flashAlpha * 0.3 : 0.15;
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

    const drawEffects = () => {
      effectsRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.01;
        p.life -= p.decay;
        if (p.life <= 0) return;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      effectsRef.current = effectsRef.current.filter(p => p.life > 0);
      if (effectsRef.current.length > 100) {
        effectsRef.current = effectsRef.current.slice(-60);
      }
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

      if (s.agent) {
        // Agent stations: subtle platform glow only — workspace drawing provides the visual grounding
        const platGrad = ctx.createRadialGradient(s.px, s.py, 0, s.px, s.py, outerR + 10);
        platGrad.addColorStop(0, `${s.color}10`);
        platGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(s.px, s.py, outerR + 10, 0, Math.PI * 2);
        ctx.fillStyle = platGrad;
        ctx.fill();
      } else {
        // Non-agent stations: full circle with icon (EmbedRoute, RowCrew, etc.)
        // Ground shadow so they don't float
        ctx.beginPath();
        ctx.ellipse(s.px, s.py + outerR + 4, outerR * 0.7, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();

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

      // Real event activity text
      const lastEvent = stationEventsRef.current[s.id];
      if (lastEvent) {
        const text = (lastEvent.title || lastEvent.type || '').slice(0, 30);
        ctx.save();
        ctx.globalAlpha = hovered ? 0.7 : 0.35;
        ctx.fillStyle = s.color;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(text, s.px, s.py + r + 20 + pulse);
        ctx.restore();

        // Time ago
        const ts = lastEvent.timestamp;
        const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
        if (ms) {
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = '#a8a8a0';
          ctx.font = '7px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(formatTimeAgo(ms), s.px, s.py + r + 32 + pulse);
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = s.color;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Listening...', s.px, s.py + r + 20 + pulse);
        ctx.restore();
      }
    };

    const drawMCPHub = (hub, now) => {
      const r = hub.radius;
      const pulse = Math.sin(now / 800) * 2;

      // Ambient glow — soft, not flashy
      const ambientGlow = ctx.createRadialGradient(hub.px, hub.py, 0, hub.px, hub.py, r * 2.5);
      ambientGlow.addColorStop(0, 'rgba(255, 122, 92, 0.06)');
      ambientGlow.addColorStop(0.6, 'rgba(255, 179, 71, 0.02)');
      ambientGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(hub.px, hub.py, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = ambientGlow;
      ctx.fill();

      // Single slow orbit ring — 6 dots, restrained
      for (let i = 0; i < 6; i++) {
        const angle = (now / 5000) + (i / 6) * Math.PI * 2;
        const orbitR = r + 10;
        const dx = Math.cos(angle) * orbitR;
        const dy = Math.sin(angle) * orbitR;
        const dotAlpha = 0.12 + Math.sin(now / 600 + i * 1.05) * 0.08;
        ctx.beginPath();
        ctx.arc(hub.px + dx, hub.py + dy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 179, 71, ${dotAlpha})`;
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

      // Hub activity — show MCP status + tool count
      const totalTools = mcpRef.current.tools?.totalTools;
      if (totalTools) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ff7a5c';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`${totalTools} tools · 9 domains`, hub.px, hub.py + r + 22);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ff7a5c';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText('Connecting...', hub.px, hub.py + r + 22);
        ctx.restore();
      }
    };

    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // ─── Role-specific workspace environments ───
    // Draws contextual scenery behind each agent so they feel grounded, not floating
    const drawAgentWorkspace = (station) => {
      if (!station.agent) return;
      const x = station.px;
      const y = station.py;
      const c = station.color;

      ctx.save();

      switch (station.agent) {
        case 'orchestrator': {
          // Command console — hexagonal platform + floating screens + console bar
          const platY = y + 28;

          // Hexagonal dais
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const px = x + Math.cos(a) * 42;
            const py = platY + Math.sin(a) * 16;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = `${c}0a`;
          ctx.fill();
          ctx.strokeStyle = `${c}20`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Three floating screens in arc behind
          const screens = [
            { ox: -30, oy: -42, w: 18, h: 12, rot: 0.15 },
            { ox: 0, oy: -48, w: 22, h: 14, rot: 0 },
            { ox: 30, oy: -42, w: 18, h: 12, rot: -0.15 },
          ];
          screens.forEach(sc => {
            ctx.save();
            ctx.translate(x + sc.ox, y + sc.oy);
            ctx.rotate(sc.rot);
            // Screen body
            ctx.fillStyle = '#0c0c14';
            ctx.strokeStyle = `${c}30`;
            ctx.lineWidth = 1;
            roundRect(ctx, -sc.w / 2, -sc.h / 2, sc.w, sc.h, 2);
            ctx.fill();
            ctx.stroke();
            // Screen content lines
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = c;
            for (let i = 0; i < 3; i++) {
              const lw = sc.w * (0.5 + Math.random() * 0.3);
              ctx.fillRect(-sc.w / 2 + 3, -sc.h / 2 + 3 + i * 3.5, lw - 6, 1.5);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
          });

          // Console bar beneath
          ctx.fillStyle = '#0c0c14';
          ctx.strokeStyle = `${c}18`;
          ctx.lineWidth = 1;
          roundRect(ctx, x - 32, platY + 4, 64, 6, 2);
          ctx.fill();
          ctx.stroke();
          // Indicator lights on console
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(x - 16 + i * 8, platY + 7, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = i === 2 ? '#4ade80' : `${c}25`;
            ctx.fill();
          }
          break;
        }

        case 'chat': {
          // Terminal station — monitor + code lines + keyboard
          const monY = y - 10;

          // Monitor
          ctx.fillStyle = '#0c0c14';
          ctx.strokeStyle = `${c}35`;
          ctx.lineWidth = 1;
          roundRect(ctx, x - 24, monY - 20, 48, 30, 3);
          ctx.fill();
          ctx.stroke();

          // Screen content — code/chat lines
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = c;
          const lines = [0.7, 0.5, 0.8, 0.4, 0.6];
          lines.forEach((len, i) => {
            ctx.fillRect(x - 20, monY - 16 + i * 4.5, 36 * len, 2);
          });
          ctx.globalAlpha = 1;

          // Monitor stand
          ctx.fillStyle = `${c}15`;
          ctx.fillRect(x - 3, monY + 10, 6, 6);

          // Keyboard
          ctx.fillStyle = '#0c0c14';
          ctx.strokeStyle = `${c}20`;
          roundRect(ctx, x - 18, monY + 18, 36, 8, 2);
          ctx.fill();
          ctx.stroke();
          // Key dots
          ctx.globalAlpha = 0.12;
          ctx.fillStyle = c;
          for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 8; col++) {
              ctx.fillRect(x - 15 + col * 4, monY + 20 + row * 3, 2.5, 1.5);
            }
          }
          ctx.globalAlpha = 1;
          break;
        }

        case 'blog': {
          // Writing desk — surface + papers + ink pot
          const deskY = y + 18;

          // Desk surface
          ctx.fillStyle = '#0e0c08';
          ctx.strokeStyle = `${c}20`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x - 38, deskY);
          ctx.lineTo(x - 34, deskY + 10);
          ctx.lineTo(x + 34, deskY + 10);
          ctx.lineTo(x + 38, deskY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Scattered papers
          const papers = [
            { ox: -16, oy: -4, w: 14, h: 10, rot: -0.12 },
            { ox: 8, oy: -2, w: 12, h: 9, rot: 0.08 },
            { ox: -4, oy: -8, w: 13, h: 10, rot: 0.04 },
          ];
          papers.forEach(p => {
            ctx.save();
            ctx.translate(x + p.ox, deskY + p.oy);
            ctx.rotate(p.rot);
            ctx.fillStyle = '#fef3c710';
            ctx.strokeStyle = `${c}18`;
            ctx.lineWidth = 0.5;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
            // Text lines on paper
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = c;
            for (let i = 0; i < 3; i++) {
              ctx.fillRect(-p.w / 2 + 2, -p.h / 2 + 2 + i * 2.5, p.w * 0.6, 1);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
          });

          // Ink pot
          ctx.beginPath();
          ctx.arc(x + 26, deskY - 2, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#1a150a';
          ctx.strokeStyle = `${c}25`;
          ctx.lineWidth = 0.8;
          ctx.fill();
          ctx.stroke();
          // Ink sheen
          ctx.beginPath();
          ctx.arc(x + 25, deskY - 3, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `${c}20`;
          ctx.fill();
          break;
        }

        case 'gaming': {
          // Arcane circle — magic circle + runes + center glow
          const circY = y + 20;
          const circR = 34;

          // Center glow
          const glow = ctx.createRadialGradient(x, circY, 0, x, circY, circR);
          glow.addColorStop(0, `${c}08`);
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(x, circY, circR, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Outer circle
          ctx.beginPath();
          ctx.arc(x, circY, circR, 0, Math.PI * 2);
          ctx.strokeStyle = `${c}18`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Inner circle
          ctx.beginPath();
          ctx.arc(x, circY, circR * 0.6, 0, Math.PI * 2);
          ctx.strokeStyle = `${c}12`;
          ctx.stroke();

          // Hexagram
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const px = x + Math.cos(a) * circR * 0.75;
            const py = circY + Math.sin(a) * circR * 0.5;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = `${c}14`;
          ctx.stroke();

          // Rune marks at 6 points
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const rx = x + Math.cos(a) * circR;
            const ry = circY + Math.sin(a) * circR * 0.65;
            ctx.beginPath();
            ctx.arc(rx, ry, 2, 0, Math.PI * 2);
            ctx.fillStyle = `${c}20`;
            ctx.fill();
          }
          break;
        }

        case 'social': {
          // Broadcast podium — stage + antenna + audience dots
          const stageY = y + 22;

          // Stage/podium trapezoid
          ctx.beginPath();
          ctx.moveTo(x - 28, stageY);
          ctx.lineTo(x - 34, stageY + 10);
          ctx.lineTo(x + 34, stageY + 10);
          ctx.lineTo(x + 28, stageY);
          ctx.closePath();
          ctx.fillStyle = `${c}0a`;
          ctx.strokeStyle = `${c}18`;
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();

          // Stage front edge highlight
          ctx.beginPath();
          ctx.moveTo(x - 34, stageY + 10);
          ctx.lineTo(x + 34, stageY + 10);
          ctx.strokeStyle = `${c}25`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Small antenna behind
          ctx.beginPath();
          ctx.moveTo(x + 22, y - 24);
          ctx.lineTo(x + 22, y - 38);
          ctx.strokeStyle = `${c}20`;
          ctx.lineWidth = 1;
          ctx.stroke();
          // Antenna tip
          ctx.beginPath();
          ctx.arc(x + 22, y - 40, 2, 0, Math.PI * 2);
          ctx.fillStyle = `${c}30`;
          ctx.fill();
          // Signal arcs
          for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.arc(x + 22, y - 40, 5 + i * 5, -0.8, 0.8);
            ctx.strokeStyle = `${c}${i === 0 ? '15' : '0c'}`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }

          // Audience dots
          const dots = [
            { ox: -18, oy: 18 }, { ox: -8, oy: 20 }, { ox: 4, oy: 19 },
            { ox: 14, oy: 21 }, { ox: -12, oy: 24 }, { ox: 8, oy: 25 },
          ];
          dots.forEach(d => {
            ctx.beginPath();
            ctx.arc(x + d.ox, stageY + d.oy, 2, 0, Math.PI * 2);
            ctx.fillStyle = `${c}12`;
            ctx.fill();
          });
          break;
        }

        case 'wellness': {
          // Garden patch — earth bed + sprouts + mortar stone
          const groundY = y + 22;

          // Earth patch
          ctx.fillStyle = 'rgba(120, 53, 15, 0.08)';
          ctx.strokeStyle = 'rgba(120, 53, 15, 0.12)';
          ctx.lineWidth = 1;
          roundRect(ctx, x - 32, groundY, 64, 14, 6);
          ctx.fill();
          ctx.stroke();

          // Soil texture lines
          ctx.globalAlpha = 0.06;
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 0.5;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 26 + i * 18, groundY + 4);
            ctx.quadraticCurveTo(x - 20 + i * 18, groundY + 8, x - 14 + i * 18, groundY + 5);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;

          // Sprouts
          const sprouts = [
            { ox: -18, stemH: 14, leafDir: -1 },
            { ox: -4, stemH: 18, leafDir: 1 },
            { ox: 12, stemH: 12, leafDir: -1 },
          ];
          sprouts.forEach(sp => {
            const sx = x + sp.ox;
            const base = groundY + 2;

            // Stem
            ctx.beginPath();
            ctx.moveTo(sx, base);
            ctx.quadraticCurveTo(sx + sp.leafDir * 3, base - sp.stemH * 0.6, sx, base - sp.stemH);
            ctx.strokeStyle = 'rgba(22, 163, 74, 0.18)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Leaf
            ctx.save();
            ctx.translate(sx, base - sp.stemH);
            ctx.rotate(sp.leafDir * 0.3);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(sp.leafDir * 6, -3, sp.leafDir * 8, 0);
            ctx.quadraticCurveTo(sp.leafDir * 6, 2, 0, 0);
            ctx.fillStyle = 'rgba(22, 163, 74, 0.15)';
            ctx.fill();
            ctx.restore();
          });

          // Mortar & pestle stone
          ctx.beginPath();
          ctx.arc(x + 26, groundY + 4, 5, 0, Math.PI, true);
          ctx.fillStyle = 'rgba(120, 113, 108, 0.12)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + 26, groundY + 4, 5, 0, Math.PI, true);
          ctx.strokeStyle = 'rgba(120, 113, 108, 0.15)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          // Pestle stick
          ctx.beginPath();
          ctx.moveTo(x + 28, groundY);
          ctx.lineTo(x + 32, groundY - 6);
          ctx.strokeStyle = 'rgba(120, 113, 108, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.lineCap = 'butt';
          break;
        }

        case 'fitness': {
          // Training platform — mat + dumbbells + chalk line
          const matY = y + 18;

          // Training mat
          ctx.fillStyle = 'rgba(4, 120, 87, 0.06)';
          ctx.strokeStyle = `${c}15`;
          ctx.lineWidth = 1;
          roundRect(ctx, x - 36, matY, 72, 14, 3);
          ctx.fill();
          ctx.stroke();

          // Mat center line
          ctx.beginPath();
          ctx.moveTo(x, matY + 2);
          ctx.lineTo(x, matY + 12);
          ctx.strokeStyle = `${c}0c`;
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Left dumbbell
          const dbY = matY + 7;
          ctx.strokeStyle = 'rgba(113, 113, 122, 0.18)';
          ctx.lineWidth = 1.5;
          // Bar
          ctx.beginPath();
          ctx.moveTo(x - 28, dbY);
          ctx.lineTo(x - 16, dbY);
          ctx.stroke();
          // Weights
          ctx.fillStyle = 'rgba(113, 113, 122, 0.12)';
          ctx.fillRect(x - 30, dbY - 3, 4, 6);
          ctx.fillRect(x - 16, dbY - 3, 4, 6);

          // Right dumbbell
          ctx.beginPath();
          ctx.moveTo(x + 16, dbY);
          ctx.lineTo(x + 28, dbY);
          ctx.stroke();
          ctx.fillRect(x + 14, dbY - 3, 4, 6);
          ctx.fillRect(x + 26, dbY - 3, 4, 6);

          // Chalk mark / PR line
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x - 30, matY - 4);
          ctx.lineTo(x + 30, matY - 4);
          ctx.strokeStyle = `${c}10`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.setLineDash([]);

          // PR label
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = c;
          ctx.font = '6px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText('PR', x + 30, matY - 5);
          ctx.globalAlpha = 1;
          break;
        }

        default:
          break;
      }

      ctx.restore();
    };

    // Helper: draw rounded rectangle path
    const roundRect = (context, rx, ry, rw, rh, radius) => {
      context.beginPath();
      context.moveTo(rx + radius, ry);
      context.lineTo(rx + rw - radius, ry);
      context.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      context.lineTo(rx + rw, ry + rh - radius);
      context.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      context.lineTo(rx + radius, ry + rh);
      context.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      context.lineTo(rx, ry + radius);
      context.quadraticCurveTo(rx, ry, rx + radius, ry);
      context.closePath();
    };

    const drawAgent = (station, now) => {
      if (!station.agent) return;

      const colors = {
        chat: '#60a5fa', blog: '#fbbf24', orchestrator: '#a78bfa',
        social: '#fb923c', fitness: '#4ade80', gaming: '#c084fc',
        wellness: '#d97706',
      };

      let ax, ay;
      let isAtStation = true;

      {
        const trip = agentTripsRef.current[station.id];
        const homeX = station.px;
        const homeY = station.py - 8;
        const hub = stationsRef.current.find(s => s.isHub);
        const hubX = hub ? hub.px : homeX;
        const hubY = hub ? hub.py - hub.radius - 30 : homeY;

        if (trip && trip.state !== 'idle') {
          isAtStation = false;
          const eased = easeInOut(trip.progress);
          if (trip.state === 'toHub') {
            ax = homeX + (hubX - homeX) * eased;
            ay = homeY + (hubY - homeY) * eased;
          } else if (trip.state === 'atHub') {
            ax = hubX;
            ay = hubY;
          } else {
            ax = hubX + (homeX - hubX) * eased;
            ay = hubY + (homeY - hubY) * eased;
          }
        } else {
          ax = homeX;
          ay = homeY;
        }
      }

      const color = colors[station.agent] || station.color;
      const avatarImg = avatarImagesRef.current[station.agent];
      const spriteSize = station.agent === 'orchestrator' ? 80 : 68;

      // Per-character idle personality
      const idle = AGENT_IDLE[station.agent] || { bobSpeed: 3000, bobAmt: 2, breathSpeed: 3000, breathAmt: 0.012, lean: 0 };
      const phase = (station.x || 0) * 10; // offset so characters aren't in sync
      const bob = isAtStation ? Math.sin(now / idle.bobSpeed + phase) * idle.bobAmt : 0;
      const breathScale = isAtStation ? 1 + Math.sin(now / idle.breathSpeed + phase) * idle.breathAmt : 1;
      const leanRot = isAtStation ? Math.sin(now / (idle.bobSpeed * 1.3) + phase) * idle.lean : 0;

      // Shadow — subtle, responds to bob
      ctx.beginPath();
      const shadowScale = 1 - bob * 0.008; // shadow shrinks slightly when character floats up
      ctx.ellipse(ax, ay + spriteSize * 0.42, spriteSize * 0.28 * shadowScale, spriteSize * 0.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fill();

      if (avatarImg) {
        // ─── SVG CHARACTER SPRITE ───
        ctx.save();

        // Soft glow behind character
        const glowR = spriteSize * 0.5;
        const spriteGlow = ctx.createRadialGradient(ax, ay + bob, 0, ax, ay + bob, glowR);
        spriteGlow.addColorStop(0, `${color}12`);
        spriteGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = spriteGlow;
        ctx.beginPath();
        ctx.arc(ax, ay + bob, glowR, 0, Math.PI * 2);
        ctx.fill();

        // All sprite drawing goes through translate + transform for breathing/lean
        ctx.translate(ax, ay + bob);

        if (!isAtStation) {
          // Walking: gentle tilt wobble + squash/stretch
          const wobble = Math.sin(now / 150) * 0.05;
          const bounce = Math.abs(Math.sin(now / 120)) * 0.03;
          ctx.rotate(wobble);
          ctx.scale(1 - bounce, 1 + bounce);
        } else {
          // Idle: breathing scale + personality lean
          ctx.rotate(leanRot);
          ctx.scale(breathScale, breathScale);
        }

        ctx.drawImage(avatarImg, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
        ctx.restore();
      } else {
        // ─── FALLBACK: simple body/head/eyes (before images load) ───
        const fallbackBob = Math.sin(now / 400 + (station.x || 0) * 20) * 2.5;
        ctx.beginPath();
        ctx.ellipse(ax, ay + 8 + fallbackBob, 7, 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.75;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(ax, ay - 4 + fallbackBob, 7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        const mex = mouseRef.current.x;
        const mey = mouseRef.current.y;
        const lookDx = mex > 0 ? Math.min(1.5, Math.max(-1.5, (mex - ax) / 100)) : 0;
        const lookDy = mey > 0 ? Math.min(1, Math.max(-1, (mey - ay) / 100)) : 0;
        ctx.fillStyle = '#fafaf9';
        ctx.beginPath(); ctx.arc(ax - 3 + lookDx, ay - 5 + fallbackBob + lookDy, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ax + 3 + lookDx, ay - 5 + fallbackBob + lookDy, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.arc(ax - 3 + lookDx * 1.2, ay - 5 + fallbackBob + lookDy * 1.2, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ax + 3 + lookDx * 1.2, ay - 5 + fallbackBob + lookDy * 1.2, 1, 0, Math.PI * 2); ctx.fill();
      }

      // ─── Carrying data visual (when walking to/from hub) ───
      if (!isAtStation) {
        const trip = agentTripsRef.current[station.id];
        if (trip && (trip.state === 'toHub' || trip.state === 'toStation')) {
          const orbColor = trip.state === 'toHub' ? station.color : '#ff7a5c';
          const orbPulse = Math.sin(now / 200) * 2;
          const orbY = ay - spriteSize * 0.4 + bob + orbPulse;

          // Outer glow
          ctx.beginPath();
          ctx.arc(ax, orbY, 9, 0, Math.PI * 2);
          ctx.fillStyle = orbColor;
          ctx.globalAlpha = 0.12;
          ctx.fill();
          ctx.globalAlpha = 1;

          // Core orb (bigger, brighter)
          ctx.beginPath();
          ctx.arc(ax, orbY, 5, 0, Math.PI * 2);
          ctx.fillStyle = orbColor;
          ctx.globalAlpha = 0.65;
          ctx.shadowColor = orbColor;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;

          // Spinning ring around orb
          for (let i = 0; i < 4; i++) {
            const ra = now / 300 + (i / 4) * Math.PI * 2;
            const rx = ax + Math.cos(ra) * 8;
            const ry = orbY + Math.sin(ra) * 3.5;
            ctx.beginPath();
            ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = orbColor;
            ctx.globalAlpha = 0.4;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          // Event title label
          const tripEvent = stationEventsRef.current[station.id];
          const orbLabel = trip.state === 'toHub'
            ? (tripEvent?.title || station.dataLabel || 'data').slice(0, 22)
            : 'response';
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = orbColor;
          ctx.fillText(orbLabel, ax, orbY - 13);
          ctx.restore();
        }
      }

      // ─── Active aura (EVENT-DRIVEN: only on recent events within 8s) ───
      const stationEvent = stationEventsRef.current[station.id];
      const eventAge = stationEvent?.receivedAt ? (Date.now() - stationEvent.receivedAt) : Infinity;
      const isRecentlyActive = eventAge < 8000;
      const activityFade = isRecentlyActive ? (eventAge > 5000 ? (8000 - eventAge) / 3000 : 1) : 0;

      if (isAtStation && isRecentlyActive) {
        const halfSprite = spriteSize * 0.4;

        // Universal: soft colored aura ring that pulses when active
        const auraR = halfSprite + 8 + Math.sin(now / 600) * 3;
        const auraGrad = ctx.createRadialGradient(ax, ay + bob, halfSprite, ax, ay + bob, auraR);
        auraGrad.addColorStop(0, `${color}00`);
        auraGrad.addColorStop(0.6, `${color}${Math.round(activityFade * 12).toString(16).padStart(2, '0')}`);
        auraGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(ax, ay + bob, auraR, 0, Math.PI * 2);
        ctx.fillStyle = auraGrad;
        ctx.fill();

        // Per-agent contextual effects (subtle, meaningful)
        if (station.agent === 'blog') {
          // Scribe: pen nib writing
          ctx.save();
          const penPhase = (now / 250) % (Math.PI * 2);
          const penX = ax + halfSprite + Math.sin(penPhase) * 6;
          const penY = ay + bob + Math.cos(penPhase * 1.5) * 3;
          ctx.beginPath();
          ctx.arc(penX, penY, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.globalAlpha = activityFade * 0.7;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }

        if (station.agent === 'chat') {
          // Chat: two speech dots rising
          for (let i = 0; i < 2; i++) {
            const bubbleT = ((now / 2500 + i * 0.5) % 1);
            const bx = ax + halfSprite + i * 8;
            const by = ay - halfSprite * 0.3 + bob - bubbleT * 22;
            ctx.beginPath();
            ctx.arc(bx, by, 3 - i, 0, Math.PI * 2);
            ctx.fillStyle = '#60a5fa';
            ctx.globalAlpha = (1 - bubbleT) * 0.25 * activityFade;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }

        if (station.agent === 'social') {
          // Social: two broadcast arcs
          for (let i = 0; i < 2; i++) {
            const waveT = ((now / 2000 + i * 0.5) % 1);
            const waveR = 14 + waveT * 20;
            ctx.beginPath();
            ctx.arc(ax + halfSprite * 0.8, ay + bob, waveR, -0.5, 0.5);
            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 1;
            ctx.globalAlpha = (1 - waveT) * 0.25 * activityFade;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }

        if (station.agent === 'fitness') {
          // Fitness: heartbeat pulse ring
          const beatPhase = (now / 800) % 1;
          const beatR = halfSprite + beatPhase * 12;
          ctx.beginPath();
          ctx.arc(ax, ay + bob, beatR, 0, Math.PI * 2);
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = (1 - beatPhase) * 0.3 * activityFade;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        if (station.agent === 'gaming') {
          // Gaming: gentle magic glow with 3 slow-orbiting motes
          for (let i = 0; i < 3; i++) {
            const sa = now / 800 + i * (Math.PI * 2 / 3);
            const sr = halfSprite + 4;
            const sx = ax + Math.cos(sa) * sr;
            const sy = ay + bob + Math.sin(sa) * sr * 0.6;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#c084fc';
            ctx.globalAlpha = 0.35 * activityFade;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }

        if (station.agent === 'wellness') {
          // Wellness: two gently rising leaves
          for (let i = 0; i < 2; i++) {
            const leafT = ((now / 3000 + i * 0.5) % 1);
            const leafX = ax + halfSprite * 0.6 + i * 8 + Math.sin(now / 500 + i) * 3;
            const leafY = ay + bob - leafT * 20;
            ctx.save();
            ctx.globalAlpha = (1 - leafT) * 0.35 * activityFade;
            ctx.fillStyle = '#d97706';
            ctx.translate(leafX, leafY);
            ctx.rotate(now / 800 + i * 3);
            ctx.beginPath();
            ctx.moveTo(0, -2.5);
            ctx.quadraticCurveTo(2.5, 0, 0, 2.5);
            ctx.quadraticCurveTo(-2.5, 0, 0, -2.5);
            ctx.fill();
            ctx.restore();
          }
        }

        if (station.agent === 'orchestrator') {
          // Orchestrator: slow radar sweep
          const sweepAngle = (now / 2000) % (Math.PI * 2);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(ax, ay + bob);
          ctx.arc(ax, ay + bob, halfSprite + 6, sweepAngle, sweepAngle + 0.8);
          ctx.closePath();
          const sweepGrad = ctx.createRadialGradient(ax, ay + bob, 0, ax, ay + bob, halfSprite + 6);
          sweepGrad.addColorStop(0, 'transparent');
          sweepGrad.addColorStop(1, `rgba(167, 139, 250, ${0.15 * activityFade})`);
          ctx.fillStyle = sweepGrad;
          ctx.fill();
          ctx.restore();
        }
      }
    };

    const drawTicker = (now) => {
      const events = tickerRef.current;
      const tickerY = h - 28;

      ctx.save();

      // Semi-transparent background bar
      ctx.fillStyle = 'rgba(8, 8, 13, 0.85)';
      ctx.fillRect(0, tickerY - 12, w, 28);
      ctx.strokeStyle = 'rgba(255, 122, 92, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, tickerY - 12);
      ctx.lineTo(w, tickerY - 12);
      ctx.stroke();

      if (!events.length) {
        // No events yet
        ctx.globalAlpha = 0.3;
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#6b6b65';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Listening for real-time events...', w / 2, tickerY + 2);
        ctx.restore();
        return;
      }

      // "LIVE" indicator with pulsing dot
      const livePulse = 0.5 + Math.sin(now / 500) * 0.5;
      ctx.beginPath();
      ctx.arc(14, tickerY + 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#4ade80';
      ctx.globalAlpha = 0.5 + livePulse * 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('LIVE', 22, tickerY + 2);

      // Event entries
      let textX = 56;
      events.forEach((evt, i) => {
        if (textX > w - 20) return;
        const source = evt.source || '?';
        const title = evt.title || evt.type || '';
        const stationId = mapSourceToStation(source, evt.type);
        const station = STATION_DEFS.find(s => s.id === stationId);
        const color = station?.color || '#a8a8a0';

        // Source tag
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fillText(station?.label || source, textX, tickerY + 2);
        textX += ctx.measureText(station?.label || source).width + 6;

        // Event title
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#a8a8a0';
        ctx.globalAlpha = 0.5;
        const shortTitle = title.slice(0, 30);
        ctx.fillText(shortTitle, textX, tickerY + 2);
        textX += ctx.measureText(shortTitle).width + 20;

        // Separator dot
        if (i < events.length - 1 && textX < w - 20) {
          ctx.fillStyle = 'rgba(255, 122, 92, 0.3)';
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(textX - 10, tickerY + 2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
      });

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
      drawEffects();

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

      // ─── Update agent trips (event-driven, no random timers) ───
      stations.forEach(s => {
        if (!s.agent) return;
        const trip = agentTripsRef.current[s.id];
        if (!trip) return;

        switch (trip.state) {
          case 'idle':
            // Trips are triggered by triggerAgentTrip() from Firebase events
            break;
          case 'toHub':
            trip.progress += 0.004;
            if (trip.progress >= 1) {
              trip.state = 'atHub';
              trip.progress = 1;
              trip.waitUntil = now + 1200;
              // Subtle arrival pulse at hub
              const hub = stations.find(st => st.isHub);
              if (hub) {
                for (let i = 0; i < 5; i++) {
                  const angle = (i / 5) * Math.PI * 2;
                  const speed = 0.3 + Math.random() * 0.8;
                  effectsRef.current.push({
                    x: hub.px, y: hub.py,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1, decay: 0.02 + Math.random() * 0.01,
                    color: s.color, size: 1 + Math.random() * 1.5,
                  });
                }
              }
            }
            break;
          case 'atHub':
            if (now > trip.waitUntil) {
              trip.state = 'toStation';
              trip.progress = 0;
            }
            break;
          case 'toStation':
            trip.progress += 0.004;
            if (trip.progress >= 1) {
              trip.state = 'idle';
              trip.progress = 0;
            }
            break;
          default: break;
        }
      });

      // Draw stations + workspaces + agents (layered: station → workspace → agent)
      stations.forEach(s => {
        if (s.isHub) {
          drawMCPHub(s, now);
        } else {
          drawStation(s, now, hovered === s);
          if (s.agent) drawAgentWorkspace(s);
        }
      });

      // Draw agents on top of everything
      stations.forEach(s => {
        if (s.agent) drawAgent(s, now);
      });

      // Draw live event ticker
      drawTicker(now);

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

        // Show last real event in tooltip
        const lastEvt = stationEventsRef.current[hovered.id];
        const lastEventText = lastEvt ? (lastEvt.title || lastEvt.type) : null;
        const lastEventTime = lastEvt?.timestamp;
        const lastEventMs = lastEventTime?.toMillis ? lastEventTime.toMillis() : lastEventTime?.seconds ? lastEventTime.seconds * 1000 : 0;

        setTooltip({
          x: tooltipX,
          y: tooltipY,
          showBelow,
          name: hovered.label,
          desc: hovered.desc,
          tools: count > 0 ? `${count} tools registered` : null,
          dataLabel: hovered.dataLabel ? `Data: ${hovered.dataLabel}` : null,
          lastEvent: lastEventText,
          lastEventAgo: lastEventMs ? formatTimeAgo(lastEventMs) : null,
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
          {tooltip.lastEvent && (
            <div className="agent-kitchen-tooltip-data" style={{ color: '#8a8a85', marginTop: 6 }}>
              Last: {tooltip.lastEvent} {tooltip.lastEventAgo && <span style={{ opacity: 0.6 }}>({tooltip.lastEventAgo})</span>}
            </div>
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
