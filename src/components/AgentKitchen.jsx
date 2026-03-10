import React, { useEffect, useRef, useState, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { avatars, AGENTS } from '../data/agents';
import { AnimatePresence, motion } from 'framer-motion';
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
  'fabstats': 'fabstats',
  'fab-stats-bot': 'fabstatsbot',
  'discord-bot': 'fabstatsbot',
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

// ─── Station categories ───
// agent = autonomous AI agent, app = AI-powered application, data = data source / infrastructure
const CATEGORY_STYLES = {
  agent: { label: 'AGENT', color: '#a78bfa' },
  app:   { label: 'APP',   color: '#60a5fa' },
  data:  { label: 'DATA',  color: '#6b6b65' },
};

// ─── Station definitions ───
const STATION_DEFS = [
  {
    id: 'mcp', label: 'MCP Server', x: 0.50, y: 0.40, color: '#ff7a5c', isHub: true, category: 'data',
    desc: 'Tool registry and data gateway — exposes 33 tools across 9 domains. Agents query MCP to read data from services. Activity events flow through Firebase.',
    actions: ['Routing requests', 'Serving 33 tools', 'Health monitoring'],
  },
  {
    id: 'chatbot', label: 'Azoni AI', x: 0.20, y: 0.16, color: '#60a5fa', agent: 'chat', icon: 'chat', category: 'agent',
    desc: 'RAG chatbot — queries Firestore knowledge base, generates missing knowledge on the fly. Logs every chat to agent_activity directly.',
    actions: ['Answering queries', 'Vector searching', 'Building context'],
    dataLabel: 'queries',
  },
  {
    id: 'blog', label: 'The Scribe', x: 0.80, y: 0.16, color: '#fbbf24', agent: 'blog', icon: 'pen', category: 'agent',
    desc: 'Daily autonomous blog agent — reads GitHub commits, writes analysis posts via LLM, publishes to Firestore. Logs each post to agent_activity.',
    actions: ['Analyzing commits', 'Writing article', 'Publishing post'],
    dataLabel: 'blog content',
  },
  {
    id: 'orchestrator', label: 'The Conductor', x: 0.50, y: 0.82, color: '#a78bfa', agent: 'orchestrator', icon: 'gear', roams: true, category: 'agent',
    desc: 'Central brain. Wakes every 3 hours, reads state from MCP + Firebase, sends to LLM for decisions, validates, then executes. Logs decisions to agent_activity.',
    actions: ['Gathering 11 sources', 'LLM deciding', 'Executing actions'],
    dataLabel: 'health + state',
  },
  {
    id: 'spellbrigade', label: 'Spell Brigade', x: 0.10, y: 0.52, color: '#c084fc', agent: 'gaming', icon: 'wand', category: 'app',
    desc: 'Multiplayer wizard combat game. AI generates characters with unique abilities. Logs wizard/dungeon creation to agent_activity via webhook.',
    actions: ['Generating wizards', 'Running battles', 'AI enemies active'],
    dataLabel: 'game data',
  },
  {
    id: 'moltbook', label: 'Moltbook', x: 0.90, y: 0.52, color: '#fb923c', agent: 'social', icon: 'megaphone', category: 'agent',
    desc: 'Autonomous social platform. The orchestrator triggers posts via MCP tools — LLM generates content, comments, and engagement. Logs via webhook.',
    actions: ['Crafting posts', 'Scheduling content', 'Engaging users'],
    dataLabel: 'social content',
  },
  {
    id: 'oldwaystoday', label: 'Old Ways Today', x: 0.10, y: 0.30, color: '#d97706', agent: 'wellness', icon: 'leaf', category: 'app',
    desc: 'AI wellness platform — RAG chatbot + auto-blog. Separate backend on Render. Logs chat events to agent_activity via webhook.',
    actions: ['Curating remedies', 'Auto-blogging', 'RAG retrieval'],
    dataLabel: 'recipes',
  },
  {
    id: 'benchpressonly', label: 'BenchPress', x: 0.30, y: 0.68, color: '#4ade80', agent: 'fitness', icon: 'dumbbell', category: 'app',
    desc: 'AI fitness app with real users. Generates personalized workouts, tracks PRs. Logs AI activity via webhook. MCP reads its 12 Firestore collections.',
    actions: ['Tracking workouts', 'AI coaching', 'Analyzing PRs'],
    dataLabel: 'fitness data',
  },
  {
    id: 'embedroute', label: 'EmbedRoute', x: 0.90, y: 0.30, color: '#20d9d2', icon: 'nodes', category: 'data',
    desc: 'Standalone embedding API — one endpoint routes to OpenAI, Cohere, Voyage, and more. MCP exposes it as tools; other services call it directly.',
    actions: ['Routing embeddings', 'Multi-provider', 'Serving vectors'],
    dataLabel: 'embeddings',
  },
  {
    id: 'rowcrew', label: 'RowCrew', x: 0.68, y: 0.68, color: '#34d399', icon: 'waves', agent: 'rowing', category: 'agent',
    desc: 'AI-powered rowing tracker — Claude Vision verifies workout photos, extracts meters and display data. Shares Firebase with BenchPress. MCP reads its session data.',
    actions: ['Logging sessions', 'Stroke analysis', 'Progress tracking'],
    dataLabel: 'rowing data',
  },
  {
    id: 'activity', label: 'Activity Feed', x: 0.35, y: 0.28, color: '#f87171', icon: 'pulse', category: 'data',
    desc: 'Firestore collection (agent_activity) — the single source of truth. All services write here directly or via webhook. This visualization watches it in real time.',
    actions: ['Logging events', 'Cross-app tracking', 'Agent monitoring'],
    dataLabel: 'event logs',
  },
  {
    id: 'fabstats', label: 'FaB Stats', x: 0.74, y: 0.42, color: '#D9A05B', icon: 'shield', category: 'data',
    desc: 'Flesh and Blood TCG stats tracker at fabstats.net. Tracks matches, heroes, tournaments, and 13 daily minigames across 50+ players. MCP reads leaderboard and community data.',
    actions: ['Tracking matches', 'Meta analysis', 'Daily minigames'],
    dataLabel: 'FaB data',
  },
  {
    id: 'fabstatsbot', label: 'FaB Bot', x: 0.66, y: 0.52, color: '#c9a84c', icon: 'chat', category: 'app',
    desc: 'Discord bot for FaB Stats — serves player stats, leaderboards, matchups, and daily puzzle results to Discord communities via 20+ slash commands.',
    actions: ['Player lookups', 'Leaderboards', 'Puzzle results'],
    dataLabel: 'Discord data',
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
  rowing:       { bobSpeed: 3200, bobAmt: 3.0, breathSpeed: 3800, breathAmt: 0.008, lean: 0.01 },
};

const DOMAIN_TO_STATION = {
  benchpressonly: 'benchpressonly',
  activity: 'activity',
  spellbrigade: 'spellbrigade',
  oldwaystoday: 'oldwaystoday',
  moltbook: 'moltbook',
  embedroute: 'embedroute',
  rowcrew: 'rowcrew',
  fabstats: 'fabstats',
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

    case 'shield': // shield with stats bars
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.9);
      ctx.lineTo(x + s * 0.8, y - s * 0.5);
      ctx.lineTo(x + s * 0.8, y + s * 0.2);
      ctx.quadraticCurveTo(x + s * 0.6, y + s * 0.8, x, y + s);
      ctx.quadraticCurveTo(x - s * 0.6, y + s * 0.8, x - s * 0.8, y + s * 0.2);
      ctx.lineTo(x - s * 0.8, y - s * 0.5);
      ctx.closePath();
      ctx.stroke();
      // bars inside
      ctx.fillStyle = color;
      ctx.globalAlpha = ctx.globalAlpha * 0.7;
      ctx.fillRect(x - s * 0.4, y + s * 0.1, s * 0.2, s * 0.5);
      ctx.fillRect(x - s * 0.1, y - s * 0.2, s * 0.2, s * 0.8);
      ctx.fillRect(x + s * 0.2, y - s * 0.4, s * 0.2, s * 1.0);
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
  const activityHistoryRef = useRef([]); // { stationId, ms } — all events from last 24h for counting
  const stationHistoryRef = useRef({});  // { [stationId]: [{ title, type, source, ms }, ...] } — last 20 per station
  const [tooltip, setTooltip] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const touchStartRef = useRef(null); // for tap detection
  const avatarImagesRef = useRef({});
  const effectsRef = useRef([]);       // free-floating visual particles
  const connectionFlashRef = useRef({}); // { stationId: timestamp }

  // Pre-render SVG avatars as Image objects for canvas drawing
  useEffect(() => {
    const agentToAvatar = {
      chat: 'chat', blog: 'blog', orchestrator: 'orchestrator',
      gaming: 'gaming', social: 'social', fitness: 'fitness',
      wellness: 'oldways',
      rowing: 'rowing',
    };
    let isActive = true;
    Object.entries(agentToAvatar).forEach(([agentKey, avatarKey]) => {
      if (!avatars[avatarKey]) return;
      const svgEl = avatars[avatarKey](256);
      let svgString = renderToStaticMarkup(svgEl);
      // Standalone SVG documents loaded via Blob URL require xmlns namespace
      if (!svgString.includes('xmlns')) {
        svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      }
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
      const img = new Image();
      img.onload = () => {
        if (isActive) avatarImagesRef.current[agentKey] = img;
      };
      img.onerror = (e) => console.warn(`Avatar failed to load: ${agentKey}`, e);
      img.src = url;
    });
    return () => {
      isActive = false;
    };
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

  // Fetch 24h activity history for counting badges
  useEffect(() => {
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 86400000));
    getDocs(query(
      collection(db, 'agent_activity'),
      where('timestamp', '>=', cutoff),
      orderBy('timestamp', 'desc'),
      limit(500)
    )).then(snap => {
      snap.docs.forEach(doc => {
        const data = doc.data();
        const sid = mapSourceToStation(data.source, data.type);
        const ts = data.timestamp;
        const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
        if (sid && ms) {
          activityHistoryRef.current.push({ stationId: sid, ms });
          if (!stationHistoryRef.current[sid]) stationHistoryRef.current[sid] = [];
          stationHistoryRef.current[sid].push({ title: data.title || data.type, type: data.type, source: data.source, ms });
        }
      });
      // Sort each station's history newest-first and cap at 20
      Object.values(stationHistoryRef.current).forEach(arr => {
        arr.sort((a, b) => b.ms - a.ms);
        if (arr.length > 20) arr.length = 20;
      });
    }).catch(() => {});
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
            const ts = data.timestamp;
            const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
            if (ms) activityHistoryRef.current.push({ stationId, ms });
            if (!stationHistoryRef.current[stationId]) stationHistoryRef.current[stationId] = [];
            stationHistoryRef.current[stationId].unshift({ title: data.title || data.type, type: data.type, source: data.source, ms: Date.now() });
            if (stationHistoryRef.current[stationId].length > 20) stationHistoryRef.current[stationId].pop();
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

    const handleTouch = (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;
      mouseRef.current = { x: tx, y: ty };
      if (e.type === 'touchstart') {
        touchStartRef.current = { x: tx, y: ty, t: Date.now() };
      }
    };

    const handleTouchEnd = () => {
      // Tap detection — short press, small movement
      const ts = touchStartRef.current;
      if (ts && Date.now() - ts.t < 300) {
        const stations = stationsRef.current;
        for (const s of stations) {
          const dx = ts.x - s.px;
          const dy = ts.y - s.py;
          if (Math.sqrt(dx * dx + dy * dy) < s.radius + 12) {
            setSelectedStation(s);
            touchStartRef.current = null;
            return;
          }
        }
      }
      touchStartRef.current = null;
      // Keep tooltip visible briefly after touch ends
      setTimeout(() => {
        mouseRef.current = { x: -1, y: -1 };
        setTooltip(null);
      }, 3000);
    };

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const stations = stationsRef.current;
      for (const s of stations) {
        const dx = cx - s.px;
        const dy = cy - s.py;
        if (Math.sqrt(dx * dx + dy * dy) < s.radius + 12) {
          setSelectedStation(s);
          return;
        }
      }
    };

    let activityCountsMap = {}; // computed each frame in draw()

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

    // ─── Water channel connection for RowCrew (replaces standard bezier line) ───
    const drawWaterConnection = (s, hub, now) => {
      const mx = (s.px + hub.px) / 2;
      const my = (s.py + hub.py) / 2 - 30;

      const flashStart = connectionFlashRef.current[s.id];
      const flashAge = flashStart ? now - flashStart : Infinity;
      const isFlashing = flashAge < 1800;
      const flashAlpha = isFlashing ? Math.max(0, 1 - flashAge / 1800) : 0;

      // Sample points along bezier
      const N = 40;
      const points = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const px = (1 - t) * (1 - t) * s.px + 2 * (1 - t) * t * mx + t * t * hub.px;
        const py = (1 - t) * (1 - t) * s.py + 2 * (1 - t) * t * my + t * t * hub.py;
        const dx = 2 * (1 - t) * (mx - s.px) + 2 * t * (hub.px - mx);
        const dy = 2 * (1 - t) * (my - s.py) + 2 * t * (hub.py - my);
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        points.push({ x: px, y: py, nx: -dy / len, ny: dx / len, t });
      }

      // Animated channel width with sinusoidal ripple edges
      const baseWidth = isFlashing ? 5 + flashAlpha * 3 : 4;
      const leftEdge = [];
      const rightEdge = [];
      for (let i = 0; i <= N; i++) {
        const p = points[i];
        const ripple = Math.sin(p.t * 12 + now / 400) * 1.2;
        const w = baseWidth + ripple;
        leftEdge.push({ x: p.x + p.nx * w, y: p.y + p.ny * w });
        rightEdge.push({ x: p.x - p.nx * w, y: p.y - p.ny * w });
      }

      ctx.save();

      // Filled water channel polygon
      ctx.beginPath();
      ctx.moveTo(leftEdge[0].x, leftEdge[0].y);
      for (let i = 1; i <= N; i++) ctx.lineTo(leftEdge[i].x, leftEdge[i].y);
      for (let i = N; i >= 0; i--) ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
      ctx.closePath();
      const waterGrad = ctx.createLinearGradient(s.px, s.py, hub.px, hub.py);
      waterGrad.addColorStop(0, isFlashing ? 'rgba(52, 211, 153, 0.25)' : 'rgba(52, 211, 153, 0.1)');
      waterGrad.addColorStop(0.5, isFlashing ? 'rgba(20, 184, 166, 0.2)' : 'rgba(20, 184, 166, 0.06)');
      waterGrad.addColorStop(1, isFlashing ? 'rgba(255, 122, 92, 0.18)' : 'rgba(255, 122, 92, 0.04)');
      ctx.fillStyle = waterGrad;
      ctx.fill();

      // Channel edge lines
      ctx.strokeStyle = isFlashing ? 'rgba(52, 211, 153, 0.3)' : 'rgba(52, 211, 153, 0.12)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(leftEdge[0].x, leftEdge[0].y);
      for (let i = 1; i <= N; i++) ctx.lineTo(leftEdge[i].x, leftEdge[i].y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rightEdge[0].x, rightEdge[0].y);
      for (let i = 1; i <= N; i++) ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
      ctx.stroke();

      // 6 animated flow dashes traveling along path
      for (let d = 0; d < 6; d++) {
        const flowT = ((now / 3000 + d / 6) % 1);
        const idx = Math.min(Math.floor(flowT * N), N - 2);
        const p0 = points[idx];
        const p1 = points[idx + 2];
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4 + (isFlashing ? flashAlpha * 0.3 : 0);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Flash: bright wave pulse traveling along channel
      if (isFlashing) {
        const pulseIdx = Math.min(Math.floor((1 - flashAlpha) * N), N);
        const p = points[pulseIdx];
        const pulseGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22);
        pulseGlow.addColorStop(0, 'rgba(52, 211, 153, 0.6)');
        pulseGlow.addColorStop(0.5, 'rgba(52, 211, 153, 0.15)');
        pulseGlow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = pulseGlow;
        ctx.globalAlpha = flashAlpha * 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Data label along channel
      if (s.dataLabel) {
        const lt = 0.45;
        const lx = (1 - lt) * (1 - lt) * s.px + 2 * (1 - lt) * lt * mx + lt * lt * hub.px;
        const ly = (1 - lt) * (1 - lt) * s.py + 2 * (1 - lt) * lt * my + lt * lt * hub.py;
        ctx.globalAlpha = isFlashing ? 0.5 + flashAlpha * 0.3 : 0.2;
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#34d399';
        ctx.fillText(s.dataLabel, lx, ly - 10);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    };

    const drawConnections = (stations, now) => {
      const hub = stations.find(s => s.isHub);
      if (!hub) return;

      stations.forEach(s => {
        if (s.isHub) return;

        // RowCrew gets a water channel instead of a standard line
        if (s.id === 'rowcrew') {
          drawWaterConnection(s, hub, now);
          return;
        }

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

      // ─── Category tag ───
      const cat = CATEGORY_STYLES[s.category];
      if (cat) {
        ctx.save();
        ctx.font = 'bold 6px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = cat.color;
        ctx.globalAlpha = hovered ? 0.75 : 0.35;
        ctx.fillText(cat.label, s.px, s.py - r - 4);
        ctx.restore();
      }

      // ─── "tap to explore" CTA ───
      if (hovered && !s.isHub) {
        ctx.save();
        ctx.font = '7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.45;
        ctx.fillText('tap to explore \u203A', s.px, s.py + r + 44 + pulse);
        ctx.restore();
      }

      // ─── Activity count badges ───
      const acts = activityCountsMap[s.id];
      if (acts && acts.h24 > 0) {
        ctx.save();
        const bx = s.px - r - 10;
        let by = s.py - 4;

        if (acts.h1 > 0) {
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = s.color;
          ctx.globalAlpha = hovered ? 0.9 : 0.6;
          ctx.fillText(`${acts.h1}/1h`, bx, by);
          by += 12;
        }

        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = s.color;
        ctx.globalAlpha = hovered ? 0.5 : 0.25;
        ctx.fillText(`${acts.h24}/24h`, bx, by);

        ctx.restore();
      }
    };

    const drawMCPHub = (hub, now) => {
      const r = hub.radius;
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
    // Each agent gets ONE bold ground element + a signature accent.
    // Agent home position = (station.px, station.py - 8), sprite ~68px (80 for orc).
    // Feet land at roughly station.py + 26 (orc +32). Draw ground at that level.
    const drawAgentWorkspace = (station) => {
      if (!station.agent) return;
      const x = station.px;
      const y = station.py;
      const c = station.color;
      const isOrc = station.agent === 'orchestrator';
      const footY = y + (isOrc ? 32 : 26); // where the character's feet are

      ctx.save();

      switch (station.agent) {
        case 'orchestrator': {
          // Raised hex command platform with glow
          const platY = footY - 2;

          // Platform glow beneath
          const glow = ctx.createRadialGradient(x, platY, 0, x, platY, 55);
          glow.addColorStop(0, `${c}18`);
          glow.addColorStop(0.6, `${c}08`);
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(x, platY, 55, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Hex platform
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const px = x + Math.cos(a) * 48;
            const py = platY + Math.sin(a) * 18;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = `${c}15`;
          ctx.fill();
          ctx.strokeStyle = `${c}40`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Inner hex ring
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const px = x + Math.cos(a) * 30;
            const py = platY + Math.sin(a) * 11;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = `${c}25`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          break;
        }

        case 'chat': {
          // Glowing monitor screen behind character
          const scrY = y - 34; // well above character center, behind head

          // Screen glow
          const glow = ctx.createRadialGradient(x, scrY + 8, 0, x, scrY + 8, 40);
          glow.addColorStop(0, `${c}12`);
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(x, scrY + 8, 40, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Monitor body
          roundRect(ctx, x - 28, scrY - 10, 56, 36, 4);
          ctx.fillStyle = 'rgba(10, 10, 18, 0.85)';
          ctx.fill();
          ctx.strokeStyle = `${c}50`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Screen scanlines
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = c;
          const lw = [0.7, 0.5, 0.85, 0.4, 0.65, 0.55];
          lw.forEach((len, i) => {
            ctx.fillRect(x - 22, scrY - 4 + i * 4, 40 * len, 1.5);
          });
          ctx.globalAlpha = 1;

          // Monitor stand
          ctx.fillStyle = `${c}30`;
          ctx.fillRect(x - 2, scrY + 26, 4, 8);
          ctx.fillRect(x - 10, scrY + 33, 20, 3);
          break;
        }

        case 'blog': {
          // Writing desk — wide surface beneath character
          const deskY = footY - 4;

          // Desk glow
          const glow = ctx.createRadialGradient(x, deskY, 0, x, deskY, 50);
          glow.addColorStop(0, `${c}10`);
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(x, deskY, 50, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Desk surface (isometric-ish trapezoid)
          ctx.beginPath();
          ctx.moveTo(x - 46, deskY);
          ctx.lineTo(x - 40, deskY + 12);
          ctx.lineTo(x + 40, deskY + 12);
          ctx.lineTo(x + 46, deskY);
          ctx.closePath();
          ctx.fillStyle = 'rgba(30, 22, 10, 0.7)';
          ctx.fill();
          ctx.strokeStyle = `${c}45`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Papers on desk
          ctx.save();
          ctx.translate(x - 20, deskY + 2);
          ctx.rotate(-0.1);
          ctx.fillStyle = 'rgba(254, 243, 199, 0.15)';
          ctx.fillRect(0, 0, 16, 11);
          ctx.strokeStyle = `${c}30`;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(0, 0, 16, 11);
          ctx.restore();

          ctx.save();
          ctx.translate(x + 6, deskY + 1);
          ctx.rotate(0.06);
          ctx.fillStyle = 'rgba(254, 243, 199, 0.12)';
          ctx.fillRect(0, 0, 14, 10);
          ctx.strokeStyle = `${c}25`;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(0, 0, 14, 10);
          ctx.restore();
          break;
        }

        case 'gaming': {
          // Bold arcane circle on the ground
          const circY = footY;
          const circR = 44;

          // Strong center glow
          const glow = ctx.createRadialGradient(x, circY, 0, x, circY, circR);
          glow.addColorStop(0, `${c}20`);
          glow.addColorStop(0.5, `${c}0c`);
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(x, circY, circR, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Outer ring
          ctx.beginPath();
          ctx.arc(x, circY, circR, 0, Math.PI * 2);
          ctx.strokeStyle = `${c}50`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Inner ring
          ctx.beginPath();
          ctx.arc(x, circY, circR * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = `${c}35`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Star pattern — two overlapping triangles
          for (let t = 0; t < 2; t++) {
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
              const a = (i / 3) * Math.PI * 2 - Math.PI / 2 + t * (Math.PI / 3);
              const px = x + Math.cos(a) * circR * 0.7;
              const py = circY + Math.sin(a) * circR * 0.45;
              i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = `${c}30`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // 6 rune dots on outer ring
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const rx = x + Math.cos(a) * circR * 0.92;
            const ry = circY + Math.sin(a) * circR * 0.6;
            ctx.beginPath();
            ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `${c}50`;
            ctx.fill();
          }
          break;
        }

        case 'social': {
          // Spotlight/stage beneath character
          const stageY = footY;

          // Spotlight cone from above
          ctx.beginPath();
          ctx.moveTo(x - 6, y - 50);
          ctx.lineTo(x - 36, stageY + 8);
          ctx.lineTo(x + 36, stageY + 8);
          ctx.lineTo(x + 6, y - 50);
          ctx.closePath();
          const spot = ctx.createLinearGradient(x, y - 50, x, stageY + 8);
          spot.addColorStop(0, `${c}04`);
          spot.addColorStop(0.4, `${c}0c`);
          spot.addColorStop(1, `${c}18`);
          ctx.fillStyle = spot;
          ctx.fill();

          // Stage floor ellipse
          ctx.beginPath();
          ctx.ellipse(x, stageY + 6, 38, 8, 0, 0, Math.PI * 2);
          ctx.fillStyle = `${c}15`;
          ctx.fill();
          ctx.strokeStyle = `${c}35`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          break;
        }

        case 'wellness': {
          // Earthy ground patch with sprouts
          const groundY = footY - 2;

          // Earth glow
          const glow = ctx.createRadialGradient(x, groundY + 4, 0, x, groundY + 4, 45);
          glow.addColorStop(0, 'rgba(22, 163, 74, 0.10)');
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(x, groundY + 4, 45, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Ground patch ellipse
          ctx.beginPath();
          ctx.ellipse(x, groundY + 6, 42, 10, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(120, 53, 15, 0.20)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(22, 163, 74, 0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // 3 sprouts
          const sprouts = [
            { ox: -22, h: 18, dir: -1 },
            { ox: 0, h: 22, dir: 1 },
            { ox: 20, h: 16, dir: -1 },
          ];
          sprouts.forEach(sp => {
            const sx = x + sp.ox;
            const base = groundY + 4;

            // Stem
            ctx.beginPath();
            ctx.moveTo(sx, base);
            ctx.quadraticCurveTo(sx + sp.dir * 4, base - sp.h * 0.5, sx, base - sp.h);
            ctx.strokeStyle = 'rgba(22, 163, 74, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Leaf
            ctx.beginPath();
            const lx = sx;
            const ly = base - sp.h;
            ctx.moveTo(lx, ly);
            ctx.quadraticCurveTo(lx + sp.dir * 8, ly - 4, lx + sp.dir * 12, ly);
            ctx.quadraticCurveTo(lx + sp.dir * 8, ly + 3, lx, ly);
            ctx.fillStyle = 'rgba(22, 163, 74, 0.35)';
            ctx.fill();
          });
          break;
        }

        case 'fitness': {
          // Gym floor plate
          const matY = footY - 2;

          // Floor glow
          const glow = ctx.createRadialGradient(x, matY + 4, 0, x, matY + 4, 45);
          glow.addColorStop(0, `${c}10`);
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(x, matY + 4, 45, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Gym mat rectangle
          roundRect(ctx, x - 42, matY, 84, 14, 4);
          ctx.fillStyle = 'rgba(4, 120, 87, 0.12)';
          ctx.fill();
          ctx.strokeStyle = `${c}35`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Left dumbbell
          const dbY = matY + 7;
          ctx.strokeStyle = 'rgba(160, 160, 170, 0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 34, dbY);
          ctx.lineTo(x - 22, dbY);
          ctx.stroke();
          ctx.fillStyle = 'rgba(160, 160, 170, 0.35)';
          ctx.fillRect(x - 37, dbY - 4, 5, 8);
          ctx.fillRect(x - 22, dbY - 4, 5, 8);

          // Right dumbbell
          ctx.beginPath();
          ctx.moveTo(x + 22, dbY);
          ctx.lineTo(x + 34, dbY);
          ctx.stroke();
          ctx.fillRect(x + 19, dbY - 4, 5, 8);
          ctx.fillRect(x + 32, dbY - 4, 5, 8);
          break;
        }

        case 'rowing': {
          // Dock + water surface beneath idle rower
          const waterY = footY;

          // Water glow
          const waterGlow = ctx.createRadialGradient(x, waterY, 0, x, waterY, 48);
          waterGlow.addColorStop(0, 'rgba(52, 211, 153, 0.1)');
          waterGlow.addColorStop(0.5, 'rgba(20, 184, 166, 0.05)');
          waterGlow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(x, waterY, 48, 0, Math.PI * 2);
          ctx.fillStyle = waterGlow;
          ctx.fill();

          // Water surface ellipse
          ctx.beginPath();
          ctx.ellipse(x, waterY + 2, 42, 10, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(52, 211, 153, 0.06)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.15)';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Animated concentric ripple rings
          const ripNow = performance.now();
          for (let i = 0; i < 2; i++) {
            const ripT = ((ripNow / 2500 + i * 0.5) % 1);
            const ripR = 12 + ripT * 28;
            ctx.beginPath();
            ctx.ellipse(x, waterY + 2, ripR, ripR * 0.25, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(52, 211, 153, ${(1 - ripT) * 0.12})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }

          // Small dock/pier on the left
          const dockX = x - 38;
          const dockY = waterY - 2;
          ctx.fillStyle = 'rgba(139, 92, 46, 0.3)';
          ctx.fillRect(dockX - 8, dockY, 18, 8);
          // Plank grain lines
          ctx.strokeStyle = 'rgba(100, 60, 20, 0.2)';
          ctx.lineWidth = 0.5;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(dockX - 8, dockY + 2 + i * 3);
            ctx.lineTo(dockX + 10, dockY + 2 + i * 3);
            ctx.stroke();
          }
          // Dock post
          ctx.fillStyle = 'rgba(139, 92, 46, 0.4)';
          ctx.fillRect(dockX - 4, dockY - 10, 3, 12);
          // Mooring rope
          ctx.beginPath();
          ctx.moveTo(dockX - 2, dockY - 8);
          ctx.quadraticCurveTo(dockX + 8, dockY - 12, x - 20, waterY);
          ctx.strokeStyle = 'rgba(160, 130, 80, 0.25)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
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

    // ─── Canvas-drawn rowing shell with animated oars ───
    const drawRowingShell = (x, y, angle, oarPhase, scale = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(scale, scale);

      // Hull — sleek racing shell, bow pointing right
      ctx.beginPath();
      ctx.moveTo(38, 0);
      ctx.quadraticCurveTo(25, -4, 0, -3.5);
      ctx.quadraticCurveTo(-28, -3, -35, 0);
      ctx.quadraticCurveTo(-28, 3, 0, 3.5);
      ctx.quadraticCurveTo(25, 4, 38, 0);
      ctx.closePath();
      const hullGrad = ctx.createLinearGradient(-35, 0, 38, 0);
      hullGrad.addColorStop(0, '#1e293b');
      hullGrad.addColorStop(0.5, '#334155');
      hullGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = hullGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Teal racing stripe
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(34, 0);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Seated rower (faces stern = left)
      ctx.beginPath();
      ctx.ellipse(-2, -5, 3, 4.5, 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#059669';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-2, -11, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#fcd9a8';
      ctx.fill();
      // Cap
      ctx.beginPath();
      ctx.ellipse(-2, -12.5, 3.8, 1.3, 0, Math.PI, 0);
      ctx.fillStyle = '#34d399';
      ctx.fill();

      // Oars — pivot at oarlocks, swing with phase
      const oarAngle = Math.sin(oarPhase) * 0.4;
      const isRecovery = Math.cos(oarPhase) > 0;
      const bladeAlpha = isRecovery ? 0.5 : 0.85;
      const oarLen = 22;

      // Port oar (top side)
      ctx.save();
      ctx.translate(0, -3.5);
      ctx.rotate(-1.35 + oarAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(oarLen, 0);
      ctx.strokeStyle = '#c4a86c';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.globalAlpha = bladeAlpha;
      ctx.fillStyle = '#34d399';
      ctx.fillRect(oarLen - 1, -2.5, 4, 5);
      ctx.globalAlpha = 1;
      ctx.restore();

      // Starboard oar (bottom side)
      ctx.save();
      ctx.translate(0, 3.5);
      ctx.rotate(1.35 - oarAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(oarLen, 0);
      ctx.strokeStyle = '#c4a86c';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.globalAlpha = bladeAlpha;
      ctx.fillStyle = '#34d399';
      ctx.fillRect(oarLen - 1, -2.5, 4, 5);
      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.restore();
    };

    // ─── V-shaped wake trail behind rowing shell ───
    const drawBoatWake = (x, y, angle, speed) => {
      if (speed < 0.01) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      for (let i = 0; i < 3; i++) {
        const wakeLen = 15 + i * 8;
        const spread = 3 + i * 4;
        const alpha = (0.2 - i * 0.05) * speed;
        ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
        ctx.lineWidth = 1 - i * 0.2;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-20 - wakeLen, -spread);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-20 - wakeLen, spread);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawAgent = (station, now) => {
      if (!station.agent) return;

      const colors = {
        chat: '#60a5fa', blog: '#fbbf24', orchestrator: '#a78bfa',
        social: '#fb923c', fitness: '#4ade80', gaming: '#c084fc',
        wellness: '#d97706', rowing: '#34d399',
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

          if (station.agent === 'rowing') {
            // Rowing: follow the quadratic bezier curve (same as water channel)
            const cx = (homeX + hubX) / 2;
            const cy = (homeY + hubY) / 2 - 30;
            let t;
            if (trip.state === 'toHub') { t = eased; }
            else if (trip.state === 'atHub') { t = 1; }
            else { t = 1 - eased; }
            ax = (1 - t) * (1 - t) * homeX + 2 * (1 - t) * t * cx + t * t * hubX;
            ay = (1 - t) * (1 - t) * homeY + 2 * (1 - t) * t * cy + t * t * hubY;
            // Travel angle from bezier derivative
            const ddx = 2 * (1 - t) * (cx - homeX) + 2 * t * (hubX - cx);
            const ddy = 2 * (1 - t) * (cy - homeY) + 2 * t * (hubY - cy);
            trip._boatAngle = Math.atan2(ddy, ddx);
            if (trip.state === 'toStation') trip._boatAngle += Math.PI;
            trip._oarPhase = now / 400;
            trip._speed = trip.state === 'atHub' ? 0.1 : 1;
          } else if (trip.state === 'toHub') {
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

      if (station.agent === 'rowing' && !isAtStation) {
        // ─── ROWING SHELL (during trip) ───
        const trip = agentTripsRef.current[station.id];
        if (trip) {
          const boatAngle = trip._boatAngle || 0;
          const oarPhase = trip._oarPhase || 0;
          const speed = trip._speed || 1;
          drawBoatWake(ax, ay, boatAngle, speed);
          drawRowingShell(ax, ay, boatAngle, oarPhase * speed);
          // Water glow around boat
          ctx.beginPath();
          ctx.ellipse(ax, ay, 18, 8, boatAngle, 0, Math.PI * 2);
          const boatGlow = ctx.createRadialGradient(ax, ay, 0, ax, ay, 18);
          boatGlow.addColorStop(0, 'rgba(52, 211, 153, 0.12)');
          boatGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = boatGlow;
          ctx.fill();
        }
      } else if (avatarImg) {
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
      if (!isAtStation && station.agent === 'rowing') {
        // Small glowing data dot above the boat
        const trip = agentTripsRef.current[station.id];
        if (trip && (trip.state === 'toHub' || trip.state === 'toStation')) {
          const dotColor = trip.state === 'toHub' ? station.color : '#ff7a5c';
          ctx.beginPath();
          ctx.arc(ax, ay - 22, 3, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.globalAlpha = 0.6;
          ctx.shadowColor = dotColor;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;

          // Label
          const tripEvent = stationEventsRef.current[station.id];
          const dotLabel = trip.state === 'toHub'
            ? (tripEvent?.title || station.dataLabel || 'data').slice(0, 22)
            : 'response';
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = dotColor;
          ctx.fillText(dotLabel, ax, ay - 30);
          ctx.restore();
        }
      } else if (!isAtStation) {
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

        if (station.agent === 'rowing') {
          // Rowing: expanding elliptical water ripple rings (oar splash)
          for (let i = 0; i < 3; i++) {
            const ripT = ((now / 2000 + i * 0.33) % 1);
            const ripR = halfSprite + ripT * 16;
            ctx.beginPath();
            ctx.ellipse(ax, ay + bob + halfSprite * 0.3, ripR, ripR * 0.3, 0, 0, Math.PI * 2);
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 1;
            ctx.globalAlpha = (1 - ripT) * 0.25 * activityFade;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          // Splash droplets
          for (let i = 0; i < 2; i++) {
            const dropT = ((now / 1500 + i * 0.5) % 1);
            const dropX = ax + (i === 0 ? -1 : 1) * (halfSprite * 0.5);
            const dropY = ay + bob - dropT * 18;
            ctx.beginPath();
            ctx.arc(dropX, dropY, 1.5 - dropT, 0, Math.PI * 2);
            ctx.fillStyle = '#34d399';
            ctx.globalAlpha = (1 - dropT) * 0.3 * activityFade;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
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

      // Cursor changes to pointer over stations
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hovered ? 'pointer' : 'default';
      }

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

      // Compute activity counts for this frame
      const actNow = Date.now();
      activityCountsMap = {};
      activityHistoryRef.current.forEach(e => {
        if (e.ms > actNow - 86400000) {
          if (!activityCountsMap[e.stationId]) activityCountsMap[e.stationId] = { h1: 0, h24: 0 };
          activityCountsMap[e.stationId].h24++;
          if (e.ms > actNow - 3600000) activityCountsMap[e.stationId].h1++;
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
        const hoveredActs = activityCountsMap[hovered.id];
        const catInfo = CATEGORY_STYLES[hovered.category];

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
          category: catInfo?.label,
          categoryColor: catInfo?.color,
          act1h: hoveredActs?.h1 || 0,
          act24h: hoveredActs?.h24 || 0,
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
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: true });
    canvas.addEventListener('touchmove', handleTouch, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd);
    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchmove', handleTouch);
      canvas.removeEventListener('touchend', handleTouchEnd);
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
          <div className="agent-kitchen-tooltip-name">
            {tooltip.name}
            {tooltip.category && (
              <span style={{ marginLeft: 6, fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: tooltip.categoryColor, opacity: 0.7 }}>
                {tooltip.category}
              </span>
            )}
          </div>
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
          {tooltip.act24h > 0 && (
            <div className="agent-kitchen-tooltip-data" style={{ color: '#a8a8a0', marginTop: 4 }}>
              Activity: {tooltip.act1h > 0 && <>{tooltip.act1h}/1h &middot; </>}{tooltip.act24h}/24h
            </div>
          )}
          <div className="agent-kitchen-tooltip-status">
            <span className="agent-kitchen-tooltip-dot" style={{ background: tooltip.statusColor }} />
            {tooltip.status}
          </div>
        </div>
      )}
      <AnimatePresence>
        {selectedStation && (() => {
          const s = selectedStation;
          const agentKey = s.agent || s.id;
          const AGENT_KEY_MAP = { wellness: 'oldways', oldwaystoday: 'oldways' };
          const agentData = AGENTS[AGENT_KEY_MAP[agentKey] || agentKey] || AGENTS[s.id] || null;
          const cat = CATEGORY_STYLES[s.category];
          const now = Date.now();
          const history = activityHistoryRef.current.filter(e => e.stationId === s.id);
          const h1 = history.filter(e => now - e.ms < 3600000).length;
          const h24 = history.length;
          const events = (stationHistoryRef.current[s.id] || []).slice(0, 10);
          const lastEvt = stationEventsRef.current[s.id];
          const domain = Object.entries(DOMAIN_TO_STATION).find(([, v]) => v === s.id)?.[0];
          const mcpStatus = domain && mcpRef.current.health?.[domain];
          const statusText = mcpStatus === true ? 'online' : mcpStatus === false ? 'offline' : s.isHub ? 'hub' : 'connected';
          const statusColor = mcpStatus === true ? '#4ade80' : mcpStatus === false ? '#f87171' : '#60a5fa';

          return (
            <>
              <motion.div
                className="agent-kitchen-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedStation(null)}
              />
              <motion.div
                className="agent-kitchen-detail"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <button className="agent-kitchen-detail-close" onClick={() => setSelectedStation(null)}>&times;</button>

                {/* Header */}
                <div className="agent-kitchen-detail-header">
                  <span className="agent-kitchen-detail-dot" style={{ background: s.color }} />
                  <h2 className="agent-kitchen-detail-name">{agentData?.name || s.label}</h2>
                  {cat && <span className="agent-kitchen-detail-cat" style={{ color: cat.color }}>{cat.label}</span>}
                </div>
                {agentData?.role && <div className="agent-kitchen-detail-role">{agentData.role}</div>}
                {(agentData?.quote || s.desc) && (
                  <div className="agent-kitchen-detail-quote">{agentData?.quote || s.desc}</div>
                )}
                <div className="agent-kitchen-detail-status">
                  <span className="agent-kitchen-tooltip-dot" style={{ background: statusColor }} />
                  {statusText}
                </div>

                {/* Activity stats */}
                <div className="agent-kitchen-detail-stats">
                  <div className="agent-kitchen-detail-stat" style={{ borderColor: `${s.color}30` }}>
                    <div className="agent-kitchen-detail-stat-num" style={{ color: s.color }}>{h1}</div>
                    <div className="agent-kitchen-detail-stat-label">last hour</div>
                  </div>
                  <div className="agent-kitchen-detail-stat" style={{ borderColor: `${s.color}30` }}>
                    <div className="agent-kitchen-detail-stat-num" style={{ color: s.color }}>{h24}</div>
                    <div className="agent-kitchen-detail-stat-label">last 24h</div>
                  </div>
                </div>

                {/* Recent events */}
                <div className="agent-kitchen-detail-section">
                  <div className="agent-kitchen-detail-section-title">Recent Activity</div>
                  {events.length > 0 ? (
                    <div className="agent-kitchen-detail-events">
                      {events.map((evt, i) => (
                        <div key={i} className="agent-kitchen-detail-event">
                          <span className="agent-kitchen-detail-event-title">{evt.title || evt.type}</span>
                          <span className="agent-kitchen-detail-event-ago">{formatTimeAgo(evt.ms)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="agent-kitchen-detail-empty">No events recorded yet</div>
                  )}
                </div>

                {/* About */}
                {(agentData?.whatItIs || s.desc) && (
                  <div className="agent-kitchen-detail-section">
                    <div className="agent-kitchen-detail-section-title">About</div>
                    <div className="agent-kitchen-detail-text">{agentData?.whatItIs || s.desc}</div>
                  </div>
                )}

                {/* Tech stack */}
                {agentData?.tech && (
                  <div className="agent-kitchen-detail-section">
                    <div className="agent-kitchen-detail-section-title">Tech Stack</div>
                    <div className="agent-kitchen-detail-tags">
                      {agentData.tech.map((t, i) => (
                        <span key={i} className="agent-kitchen-detail-tag" style={{ borderColor: `${s.color}40`, color: s.color }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* How it works */}
                {agentData?.cycle && (
                  <div className="agent-kitchen-detail-section">
                    <div className="agent-kitchen-detail-section-title">How It Works</div>
                    <ol className="agent-kitchen-detail-cycle">
                      {agentData.cycle.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Data sources */}
                {agentData?.data && (
                  <div className="agent-kitchen-detail-section">
                    <div className="agent-kitchen-detail-section-title">Data Sources</div>
                    <ul className="agent-kitchen-detail-data-list">
                      {agentData.data.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

export default AgentKitchen;
