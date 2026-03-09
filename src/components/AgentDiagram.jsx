import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { ExternalLink, ArrowRight, Database, Server, Cloud, GitBranch, Cpu, Globe } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { avatars, AGENTS, AGENT_HOME_DATA } from '../data/agents';
import AnimatedBeam from './ui/animated-beam';
import BorderBeam from './ui/border-beam';
import '../styles/agent-diagram.css';

const MCP_URL = 'https://azoni-mcp.onrender.com';

/* ─── Source / Type → agent key mapping (from AgentKitchen) ─── */
const SOURCE_TO_AGENT = {
  'benchpressonly': 'fitness',
  'spell-brigade': 'gaming',
  'moltbook-agent': 'social',
  'rowcrew': 'fitness',
  'oldwaystoday': 'oldways',
  'old-ways-today': 'oldways',
  'orchestrator': 'orchestrator',
  'daily-blog': 'blog',
  'azoni-ai': 'chat',
  'fabstats': 'fabstats',
};

const TYPE_TO_AGENT = {
  'agent_observing': 'orchestrator',
  'agent_deciding': 'orchestrator',
  'agent_drafting': 'orchestrator',
  'orchestrator_summary': 'orchestrator',
  'self_assessment': 'orchestrator',
  'error_reviewed': 'orchestrator',
  'project_updated': 'orchestrator',
  'blog_published': 'blog',
  'blog_generated': 'blog',
  'knowledge_generated': 'chat',
  'wizard_created': 'gaming',
  'dungeon_created': 'gaming',
  'workout_generated': 'fitness',
  'workout_autofilled': 'fitness',
  'progress_analyzed': 'fitness',
  'assistant_chat': 'chat',
  'moltbook_post': 'social',
  'moltbook_comment': 'social',
  'moltbook_upvote': 'social',
  'owt_chat': 'oldways',
  'owt_blog': 'oldways',
};

function mapToAgent(source, type) {
  if (TYPE_TO_AGENT[type]) return TYPE_TO_AGENT[type];
  if (SOURCE_TO_AGENT[source]) return SOURCE_TO_AGENT[source];
  return null;
}

function formatTimeAgo(ms) {
  const diff = Date.now() - ms;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/* ─── Node layout config ─── */
const AGENT_CONFIGS = [
  { key: 'chat',    col: 'left' },
  { key: 'social',  col: 'right' },
  { key: 'blog',    col: 'left' },
  { key: 'gaming',  col: 'right' },
  { key: 'fitness', col: 'left' },
  { key: 'oldways', col: 'right' },
  { key: 'fabstats', col: 'left' },
  { key: 'rag',     col: 'center' },
];

const DESTINATIONS = {
  chat:    { label: 'azoni.ai/chat', url: '/chat', external: false },
  social:  { label: 'moltbook.com', url: 'https://www.moltbook.com/u/Azoni-AI', external: true },
  blog:    { label: 'azoni.ai/blog', url: '/blog', external: false },
  gaming:  { label: 'Spell Brigade', url: '/game', external: false },
  fitness: { label: 'benchpressonly.com', url: 'https://benchpressonly.com', external: true },
  oldways: { label: 'oldwaystoday.com', url: 'https://oldwaystoday.com', external: true },
  fabstats: { label: 'fabstats.net', url: 'https://www.fabstats.net', external: true },
};

const INFRA = [
  { name: 'Firebase', icon: Database, sub: 'state' },
  { name: 'Netlify', icon: Cloud, sub: 'hosting' },
  { name: 'MCP Server', icon: Server, sub: null },
  { name: 'Claude API', icon: Cpu, sub: 'LLM' },
  { name: 'GitHub API', icon: GitBranch, sub: 'commits' },
  { name: 'EmbedRoute', icon: Globe, sub: 'embeddings' },
];

/* ─── Orchestrator Node ─── */
const OrchestratorNode = ({ nodeRef, inView, lastEvent }) => {
  const agent = AGENTS.orchestrator;
  const eventTitle = lastEvent?.title || lastEvent?.type || null;
  const eventMs = lastEvent?.timestamp?.toMillis ? lastEvent.timestamp.toMillis()
    : lastEvent?.timestamp?.seconds ? lastEvent.timestamp.seconds * 1000 : 0;

  return (
    <motion.div
      className="ad-orch"
      ref={nodeRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : {}}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
    >
      <BorderBeam color="#ff7a5c" colorTo="#ffb347" duration={5} borderWidth={2} />
      <div className="ad-orch-inner">
        <span className="ad-type-label">orchestrator</span>
        <motion.div
          className="ad-orch-avatar"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {avatars.orchestrator(80)}
        </motion.div>
        <div className="ad-orch-name">{agent.name}</div>
        <div className="ad-orch-role">{agent.role}</div>
        <div className="ad-orch-pipeline">
          <span className="ad-pipeline-step">observe</span>
          <span className="ad-pipeline-arrow">&rarr;</span>
          <span className="ad-pipeline-step">think</span>
          <span className="ad-pipeline-arrow">&rarr;</span>
          <span className="ad-pipeline-step ad-pipeline-route">route</span>
        </div>
        <div className="ad-orch-fanout">
          {AGENT_CONFIGS.map(({ key }) => (
            <span
              key={key}
              className="ad-fanout-dot"
              style={{ background: AGENTS[key]?.color || '#666' }}
            />
          ))}
        </div>
        <span className="ad-conditional-label">conditional_edge</span>
        <div className="ad-orch-status">
          <span className="ad-status-dot" />
          Active &mdash; every 3hrs
        </div>
        {eventTitle && (
          <div className="ad-node-event">
            <span className="ad-node-event-text">{eventTitle.slice(0, 35)}</span>
            {eventMs > 0 && <span className="ad-node-event-time">{formatTimeAgo(eventMs)}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Agent Character Node ─── */
const AgentCharacterNode = ({ agentKey, nodeRef, inView, delay, isHovered, onHover, lastEvent }) => {
  const agent = AGENTS[agentKey];
  const homeData = AGENT_HOME_DATA[agentKey];
  if (!agent) return null;

  const bobDuration = 3.5 + (delay * 0.7);
  const eventTitle = lastEvent?.title || lastEvent?.type || null;
  const eventMs = lastEvent?.timestamp?.toMillis ? lastEvent.timestamp.toMillis()
    : lastEvent?.timestamp?.seconds ? lastEvent.timestamp.seconds * 1000 : 0;
  const isRecent = eventMs > 0 && (Date.now() - eventMs) < 300000; // within 5min

  return (
    <motion.div
      className={`ad-agent ${isHovered ? 'ad-agent-hovered' : ''} ${isRecent ? 'ad-agent-active' : ''}`}
      ref={nodeRef}
      style={{ '--node-color': agent.color, '--node-bg': agent.bg }}
      initial={{ scale: 0, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : {}}
      transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.5 + delay * 0.08 }}
      onMouseEnter={() => onHover(agentKey)}
      onMouseLeave={() => onHover(null)}
      whileHover={{ scale: 1.04, y: -3 }}
    >
      <div className="ad-agent-accent" style={{ background: agent.color }} />
      <div className="ad-agent-body">
        <motion.div
          className="ad-agent-avatar"
          animate={{ y: [0, -2.5, 0] }}
          transition={{ duration: bobDuration, repeat: Infinity, ease: 'easeInOut' }}
        >
          {avatars[agentKey]?.(48)}
        </motion.div>
        <div className="ad-agent-header">
          <span className="ad-agent-name">{agent.name}</span>
          <span className={`ad-agent-badge ad-badge-${homeData?.statusType || 'live'}`}>
            <span className="ad-badge-dot" style={{ background: agent.color }} />
            {homeData?.status || 'Active'}
          </span>
        </div>
        <div className="ad-agent-role">{agent.role}</div>
        <div className="ad-agent-desc">
          {homeData?.shortDesc?.slice(0, 80)}...
        </div>
        {eventTitle && (
          <div className="ad-node-event">
            <span className="ad-node-event-text">{eventTitle.slice(0, 30)}</span>
            {eventMs > 0 && <span className="ad-node-event-time">{formatTimeAgo(eventMs)}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Destination Node ─── */
const DestinationNode = ({ agentKey, nodeRef, inView, delay }) => {
  const dest = DESTINATIONS[agentKey];
  const agent = AGENTS[agentKey];
  if (!dest) return null;

  return (
    <motion.a
      className="ad-dest"
      ref={nodeRef}
      href={dest.url}
      target={dest.external ? '_blank' : undefined}
      rel={dest.external ? 'noopener noreferrer' : undefined}
      style={{ '--dest-color': agent?.color || '#666' }}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 1.0 + delay * 0.06, duration: 0.4 }}
      whileHover={{ scale: 1.06 }}
    >
      <span className="ad-dest-label">{dest.label}</span>
      {dest.external ? <ExternalLink size={11} /> : <ArrowRight size={11} />}
    </motion.a>
  );
};

/* ─── Live Event Ticker ─── */
const EventTicker = ({ events }) => {
  if (!events.length) {
    return (
      <div className="ad-ticker">
        <span className="ad-ticker-dot" />
        <span className="ad-ticker-waiting">Listening for real-time events...</span>
      </div>
    );
  }

  return (
    <div className="ad-ticker">
      <span className="ad-ticker-live">
        <span className="ad-ticker-dot" />
        LIVE
      </span>
      <div className="ad-ticker-events">
        {events.map((evt, i) => {
          const agentKey = mapToAgent(evt.source, evt.type);
          const agent = agentKey ? AGENTS[agentKey] : null;
          return (
            <span className="ad-ticker-event" key={i}>
              <span className="ad-ticker-source" style={{ color: agent?.color || '#a8a8a0' }}>
                {agent?.name || evt.source || '?'}
              </span>
              <span className="ad-ticker-title">{(evt.title || evt.type || '').slice(0, 30)}</span>
              {i < events.length - 1 && <span className="ad-ticker-sep">&middot;</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Main Diagram ─── */
const AgentDiagram = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const [hoveredAgent, setHoveredAgent] = useState(null);

  // Refs for beam connections
  const orchRef = useRef(null);
  const agentRefs = useRef({});
  const destRefs = useRef({});
  const stateRef = useRef(null);

  // Force re-render after mount so beams can measure positions
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getAgentRef = (key) => {
    if (!agentRefs.current[key]) agentRefs.current[key] = React.createRef();
    return agentRefs.current[key];
  };

  const getDestRef = (key) => {
    if (!destRefs.current[key]) destRefs.current[key] = React.createRef();
    return destRefs.current[key];
  };

  // Beam visibility tied to entrance animation timing
  const [beamsVisible, setBeamsVisible] = useState(false);
  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setBeamsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [isInView]);

  /* ────── LIVE DATA (from AgentKitchen) ────── */

  // Last event per agent
  const [agentEvents, setAgentEvents] = useState({});
  // Ticker events
  const [tickerEvents, setTickerEvents] = useState([]);
  // MCP health + tool counts
  const [mcpData, setMcpData] = useState({ health: null, tools: null, toolCounts: {} });

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
        setMcpData({ health, tools, toolCounts });
      });
    };
    fetchMCP();
    const interval = setInterval(fetchMCP, 30000);
    return () => clearInterval(interval);
  }, []);

  // Firebase real-time listener
  const isFirstLoad = useRef(true);
  useEffect(() => {
    const q = query(
      collection(db, 'agent_activity'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (isFirstLoad.current) {
        // Initial load — seed events
        const docs = snapshot.docs.map(d => d.data());
        const events = {};
        docs.forEach(data => {
          const key = mapToAgent(data.source, data.type);
          if (key && !events[key]) events[key] = data;
        });
        setAgentEvents(events);
        setTickerEvents(docs.slice(0, 5));
        isFirstLoad.current = false;
        return;
      }
      // New events
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const key = mapToAgent(data.source, data.type);
          if (key) {
            setAgentEvents(prev => ({ ...prev, [key]: data }));
            setTickerEvents(prev => [data, ...prev].slice(0, 5));
          }
        }
      });
    });
    return () => unsub();
  }, []);

  // MCP tool count for infra bar
  const mcpToolCount = mcpData.tools?.totalTools;
  const infraWithData = INFRA.map(item => {
    if (item.name === 'MCP Server') {
      return { ...item, sub: mcpToolCount ? `${mcpToolCount} tools` : 'loading...' };
    }
    return item;
  });

  return (
    <div
      className={`agent-diagram ${hoveredAgent ? `ad-focused ad-focus-${hoveredAgent}` : ''}`}
      ref={containerRef}
    >
      {/* Dot grid bg */}
      <div className="ad-dots" />

      {/* Header */}
      <motion.div
        className="ad-header"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <span className="ad-header-icon">&#x2B21;</span>
        <span className="ad-header-label">agent ecosystem</span>
        <span className="ad-header-sep">&middot;</span>
        <span className="ad-header-tag">state_graph v2.0</span>
        <span className="ad-header-sep">&middot;</span>
        <span className="ad-header-status">
          <span className="ad-status-dot" />
          7 agents operational
        </span>
      </motion.div>

      {/* ── Graph area ── */}
      <div className="ad-graph">

        {/* Orchestrator (center) */}
        <div className="ad-graph-center">
          <OrchestratorNode
            nodeRef={orchRef}
            inView={isInView}
            lastEvent={agentEvents.orchestrator}
          />
        </div>

        {/* Agent nodes (left + right columns) */}
        <div className="ad-graph-left">
          {AGENT_CONFIGS.filter(c => c.col === 'left').map((cfg, i) => (
            <div className="ad-agent-slot" key={cfg.key}>
              <DestinationNode
                agentKey={cfg.key}
                nodeRef={getDestRef(cfg.key)}
                inView={isInView}
                delay={i}
              />
              <AgentCharacterNode
                agentKey={cfg.key}
                nodeRef={getAgentRef(cfg.key)}
                inView={isInView}
                delay={i}
                isHovered={hoveredAgent === cfg.key}
                onHover={setHoveredAgent}
                lastEvent={agentEvents[cfg.key]}
              />
            </div>
          ))}
        </div>

        <div className="ad-graph-right">
          {AGENT_CONFIGS.filter(c => c.col === 'right').map((cfg, i) => (
            <div className="ad-agent-slot" key={cfg.key}>
              <AgentCharacterNode
                agentKey={cfg.key}
                nodeRef={getAgentRef(cfg.key)}
                inView={isInView}
                delay={i + 3}
                isHovered={hoveredAgent === cfg.key}
                onHover={setHoveredAgent}
                lastEvent={agentEvents[cfg.key]}
              />
              <DestinationNode
                agentKey={cfg.key}
                nodeRef={getDestRef(cfg.key)}
                inView={isInView}
                delay={i + 3}
              />
            </div>
          ))}
        </div>

        {/* RAG (bottom center) */}
        <div className="ad-graph-bottom">
          <AgentCharacterNode
            agentKey="rag"
            nodeRef={getAgentRef('rag')}
            inView={isInView}
            delay={6}
            isHovered={hoveredAgent === 'rag'}
            onHover={setHoveredAgent}
            lastEvent={agentEvents.rag}
          />
        </div>

        {/* ── Animated Beams (Orchestrator ↔ Agents) ── */}
        {mounted && beamsVisible && AGENT_CONFIGS.map((cfg, i) => (
          <AnimatedBeam
            key={`beam-${cfg.key}`}
            containerRef={containerRef}
            fromRef={orchRef}
            toRef={getAgentRef(cfg.key)}
            color={AGENTS[cfg.key]?.color || '#666'}
            width={1.5}
            curvature={cfg.col === 'center' ? 0 : (cfg.col === 'left' ? 30 : -30)}
            duration={3 + i * 0.4}
            delay={i * 0.3}
            visible={!hoveredAgent || hoveredAgent === cfg.key}
          />
        ))}

        {/* Beams: Agents → Destinations */}
        {mounted && beamsVisible && Object.keys(DESTINATIONS).map((key, i) => (
          <AnimatedBeam
            key={`dest-beam-${key}`}
            containerRef={containerRef}
            fromRef={getAgentRef(key)}
            toRef={getDestRef(key)}
            color={AGENTS[key]?.color || '#666'}
            width={1}
            curvature={0}
            duration={4 + i * 0.3}
            delay={i * 0.4}
            visible={!hoveredAgent || hoveredAgent === key}
          />
        ))}

        {/* Beams: Agents → State layer */}
        {mounted && beamsVisible && stateRef.current && AGENT_CONFIGS.map((cfg, i) => (
          <AnimatedBeam
            key={`state-beam-${cfg.key}`}
            containerRef={containerRef}
            fromRef={getAgentRef(cfg.key)}
            toRef={stateRef}
            color="#20d9d2"
            width={0.8}
            curvature={cfg.col === 'left' ? 20 : cfg.col === 'right' ? -20 : 0}
            duration={6}
            delay={i * 0.5}
            visible={!hoveredAgent || hoveredAgent === cfg.key}
          />
        ))}
      </div>

      {/* ── Shared State Layer ── */}
      <motion.div
        className="ad-state"
        ref={stateRef}
        initial={{ opacity: 0, y: 15 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 1.4, duration: 0.5 }}
      >
        <span className="ad-state-label">shared memory</span>
        <div className="ad-state-items">
          <code>Vector Store</code>
          <code>Firebase State</code>
          <code>Conversation History</code>
          <code>EmbedRoute Embeddings</code>
        </div>
      </motion.div>

      {/* ── Live Event Ticker ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <EventTicker events={tickerEvents} />
      </motion.div>

      {/* ── Infrastructure Bar ── */}
      <motion.div
        className="ad-infra"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 1.6, duration: 0.5 }}
      >
        <span className="ad-infra-label">infrastructure</span>
        <div className="ad-infra-items">
          {infraWithData.map(({ name, icon: Icon, sub }) => (
            <div className="ad-infra-node" key={name}>
              <Icon size={12} strokeWidth={1.5} />
              <span className="ad-infra-name">{name}</span>
              {sub && <span className="ad-infra-sub">{sub}</span>}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default AgentDiagram;
