import React, { useState } from 'react';
import '../styles/agent-diagram.css';

const AgentDiagram = () => {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="arch">
      {/* Dot grid bg */}
      <div className="arch-dots"></div>

      {/* Orchestrator */}
      <div className="arch-tier">
        <div className="arch-tier-label">orchestration</div>
        <div className="arch-tier-content">
          <div 
            className={`arch-card arch-card-main ${hovered === 'azoni' ? 'is-active' : ''}`}
            onMouseEnter={() => setHovered('azoni')}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="arch-card-left" style={{background: '#3b82f6'}}></div>
            <div className="arch-card-body">
              <div className="arch-card-row">
                <span className="arch-card-name">Azoni AI</span>
                <span className="arch-card-badge badge-soon">coming soon</span>
              </div>
              <div className="arch-card-desc">central agent — orchestrates all sub-agents, manages site content, powers RAG chatbot</div>
              <div className="arch-card-stack">
                <code>LangGraph</code><code>Firebase</code><code>MCP</code><code>Claude API</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flow connectors */}
      <div className="arch-connectors">
        <svg viewBox="0 0 1000 40" preserveAspectRatio="none" className="arch-connector-svg">
          <line x1="500" y1="0" x2="500" y2="20" stroke="var(--border-subtle)" strokeWidth="1"/>
          <line x1="100" y1="20" x2="900" y2="20" stroke="var(--border-subtle)" strokeWidth="1"/>
          <line x1="100" y1="20" x2="100" y2="40" stroke="var(--border-subtle)" strokeWidth="1"/>
          <line x1="300" y1="20" x2="300" y2="40" stroke="var(--border-subtle)" strokeWidth="1"/>
          <line x1="500" y1="20" x2="500" y2="40" stroke="var(--border-subtle)" strokeWidth="1"/>
          <line x1="700" y1="20" x2="700" y2="40" stroke="var(--border-subtle)" strokeWidth="1"/>
          <line x1="900" y1="20" x2="900" y2="40" stroke="var(--border-subtle)" strokeWidth="1"/>
        </svg>
      </div>

      {/* Agents tier */}
      <div className="arch-tier">
        <div className="arch-tier-label">agents</div>
        <div className="arch-tier-content arch-agents-row">
          
          <div 
            className={`arch-card ${hovered === 'social' ? 'is-active' : ''}`}
            onMouseEnter={() => setHovered('social')}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="arch-card-left" style={{background: '#ff6b35'}}></div>
            <div className="arch-card-body">
              <div className="arch-card-row">
                <span className="arch-card-name">Social</span>
                <span className="arch-card-badge badge-live">live</span>
              </div>
              <div className="arch-card-desc">autonomous browsing, reasoning, posting on Moltbook</div>
              <div className="arch-card-io">
                <span>in: <code>schedule</code> <code>topics</code></span>
                <span>out: <code>posts</code> <code>replies</code></span>
              </div>
            </div>
          </div>

          <div 
            className={`arch-card ${hovered === 'gaming' ? 'is-active' : ''}`}
            onMouseEnter={() => setHovered('gaming')}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="arch-card-left" style={{background: '#9b5de5'}}></div>
            <div className="arch-card-body">
              <div className="arch-card-row">
                <span className="arch-card-name">Gaming</span>
                <span className="arch-card-badge badge-live">live</span>
              </div>
              <div className="arch-card-desc">generates wizards, dungeons, enemy encounters in real-time</div>
              <div className="arch-card-io">
                <span>in: <code>player state</code></span>
                <span>out: <code>AI content</code> <code>NPCs</code></span>
              </div>
            </div>
          </div>

          <div 
            className={`arch-card ${hovered === 'fitness' ? 'is-active' : ''}`}
            onMouseEnter={() => setHovered('fitness')}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="arch-card-left" style={{background: '#4ade80'}}></div>
            <div className="arch-card-body">
              <div className="arch-card-row">
                <span className="arch-card-name">Fitness</span>
                <span className="arch-card-badge badge-live">live</span>
              </div>
              <div className="arch-card-desc">workout generation, progress tracking, rowing photo verification</div>
              <div className="arch-card-io">
                <span>in: <code>logs</code> <code>photos</code></span>
                <span>out: <code>plans</code> <code>stats</code></span>
              </div>
            </div>
          </div>

          <div 
            className={`arch-card ${hovered === 'blog' ? 'is-active' : ''}`}
            onMouseEnter={() => setHovered('blog')}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="arch-card-left" style={{background: '#6366f1'}}></div>
            <div className="arch-card-body">
              <div className="arch-card-row">
                <span className="arch-card-name">Blog Writer</span>
                <span className="arch-card-badge badge-sched">9am daily</span>
              </div>
              <div className="arch-card-desc">reads git commits, writes and publishes dev log posts</div>
              <div className="arch-card-io">
                <span>in: <code>commits</code> <code>diffs</code></span>
                <span>out: <code>blog post</code></span>
              </div>
            </div>
          </div>

          <div 
            className={`arch-card ${hovered === 'oldways' ? 'is-active' : ''}`}
            onMouseEnter={() => setHovered('oldways')}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="arch-card-left" style={{background: '#fb923c'}}></div>
            <div className="arch-card-body">
              <div className="arch-card-row">
                <span className="arch-card-name">Old Ways</span>
                <span className="arch-card-badge badge-soon">soon</span>
              </div>
              <div className="arch-card-desc">RAG-powered non-toxic product recommendations for families</div>
              <div className="arch-card-io">
                <span>in: <code>queries</code></span>
                <span>out: <code>products</code> <code>guides</code></span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Connectors down */}
      <div className="arch-connectors">
        <svg viewBox="0 0 1000 24" preserveAspectRatio="none" className="arch-connector-svg">
          <line x1="100" y1="0" x2="100" y2="24" stroke="var(--border-subtle)" strokeWidth="1"/>
          <line x1="300" y1="0" x2="300" y2="24" stroke="var(--border-subtle)" strokeWidth="1"/>
          <line x1="500" y1="0" x2="500" y2="24" stroke="var(--border-subtle)" strokeWidth="1"/>
          <line x1="700" y1="0" x2="700" y2="24" stroke="var(--border-subtle)" strokeWidth="1"/>
          <line x1="900" y1="0" x2="900" y2="24" stroke="var(--border-subtle)" strokeWidth="1"/>
        </svg>
      </div>

      {/* Outputs tier */}
      <div className="arch-tier">
        <div className="arch-tier-label">destinations</div>
        <div className="arch-tier-content arch-outputs-row">
          <div className="arch-dest" style={{'--dest-color': '#ff6b35'}}>moltbook.com</div>
          <div className="arch-dest" style={{'--dest-color': '#9b5de5'}}>spell brigade</div>
          <div className="arch-dest-split">
            <div className="arch-dest" style={{'--dest-color': '#4ade80'}}>benchpressonly.com</div>
            <div className="arch-dest" style={{'--dest-color': '#22d3ee'}}>rowcrew.app</div>
          </div>
          <div className="arch-dest" style={{'--dest-color': '#6366f1'}}>azoni.ai/blog</div>
          <div className="arch-dest" style={{'--dest-color': '#fb923c'}}>oldwaystoday.com</div>
        </div>
      </div>

      {/* Infrastructure bar */}
      <div className="arch-infra-bar">
        <span className="arch-infra-label">infra:</span>
        <code>Firebase</code>
        <code>Netlify</code>
        <code>GitHub API</code>
        <code>MCP Server</code>
        <code>Claude API</code>
        <code>EmbedRoute</code>
      </div>
    </div>
  );
};

export default AgentDiagram;
