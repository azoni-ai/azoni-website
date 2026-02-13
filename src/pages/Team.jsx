import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { avatars, AGENTS, AGENT_ORDER } from '../data/agents';
import '../styles/team.css';

/* ─── Agent Chat Hook ─── */
function useAgentChat(agentKey) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/.netlify/functions/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: agentKey,
          message: text,
          history: [...messages, userMsg].slice(-6),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, agentName: data.name || agentKey }]);
      } else {
        throw new Error(data.error || 'No reply');
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Hmm, something went wrong. Try again?", agentName: agentKey }]);
    } finally {
      setIsLoading(false);
    }
  }, [agentKey, messages, isLoading]);

  return { messages, isLoading, sendMessage, chatContainerRef };
}

/* ─── Chat Panel Component ─── */
function AgentChat({ agentKey, agent }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, chatContainerRef } = useAgentChat(agentKey);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="team-chat-panel" style={{ borderTop: `2px solid ${agent.color}40` }}>
      <div className="team-chat-header" onClick={() => setOpen(!open)} style={open ? { background: `${agent.color}08` } : {}}>
        <div className="team-chat-header-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={agent.color} strokeWidth="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="team-chat-header-label" style={{ color: agent.color }}>Chat with {agent.name}</span>
        </div>
        <span className={`team-chat-header-toggle ${open ? 'open' : ''}`} style={{ color: agent.color }}>+</span>
      </div>

      {open && (
        <>
          <div className="team-chat-scope-note">
            {agent.name} only knows about its own domain and role.
          </div>
          <div className="team-chat-messages" ref={chatContainerRef}>
            {messages.length === 0 && (
              <div className="team-chat-msg agent" style={{ background: agent.bg, borderColor: agent.borderColor }}>
                <span className="agent-msg-name" style={{ color: agent.color }}>{agent.name}</span>
                {agent.quote}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`team-chat-msg ${msg.role === 'user' ? 'user' : 'agent'}`}
                style={msg.role === 'assistant' ? { background: agent.bg, borderColor: agent.borderColor } : {}}>
                {msg.role === 'assistant' && (
                  <span className="agent-msg-name" style={{ color: agent.color }}>
                    {msg.agentName ? (AGENTS[msg.agentName]?.name || msg.agentName) : agent.name}
                  </span>
                )}
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="team-chat-typing">
                <span style={{ background: agent.color }}/><span style={{ background: agent.color }}/><span style={{ background: agent.color }}/>
              </div>
            )}
          </div>

          {/* Quick starters */}
          {messages.length === 0 && (
            <div className="team-chat-starters">
              {agent.starters.map((q, i) => (
                <button key={i} className="team-chat-starter" onClick={() => { sendMessage(q); }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="team-chat-input-row">
            <input
              className="team-chat-input"
              placeholder={`Ask ${agent.name} something...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              maxLength={500}
              disabled={isLoading}
            />
            <button className="team-chat-send" onClick={handleSend} disabled={isLoading || !input.trim()}>
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main Team Page ─── */
const Team = () => {
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState(null);

  // Deep-link: /team?agent=orchestrator opens that agent
  useEffect(() => {
    const agentParam = searchParams.get('agent');
    if (agentParam && AGENTS[agentParam]) {
      setSelected(agentParam);
      setTimeout(() => {
        const el = document.getElementById(`profile-${agentParam}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [searchParams]);

  const scrollToProfile = (key) => {
    setSelected(key);
    setTimeout(() => {
      const el = document.getElementById(`profile-${key}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const sel = selected ? AGENTS[selected] : null;

  return (
    <Layout>
      <section className="team-page">
        <div className="container team-container">

          {/* Banner */}
          <div className="team-banner">
            <div className="team-banner-label">azoni.ai / team</div>
            <h1>Meet the Team</h1>
            <p className="team-banner-sub">
              Eight AI agents run this portfolio autonomously — writing blogs, answering questions, tracking errors, generating game characters, and coaching workouts. Each one has a job, a personality, and a chat. Say hi.
            </p>
          </div>

          {/* Agent Grid */}
          <div className="team-grid">
            {AGENT_ORDER.map(key => {
              const a = AGENTS[key];
              return (
                <div
                  key={key}
                  className={`team-grid-card ${selected === key ? 'active' : ''}`}
                  onClick={() => scrollToProfile(key)}
                >
                  <div className="status-dot" style={{ background: a.color }}/>
                  <div className="avatar-wrap">{avatars[key](64)}</div>
                  <div className="agent-name">{a.name}</div>
                  <div className="agent-role">{a.role}</div>
                </div>
              );
            })}
          </div>

          {/* Selected Profile */}
          {sel && (
            <div id={`profile-${selected}`} className="team-profile" style={{ borderColor: sel.borderColor }}>
              {/* Header */}
              <div className="team-profile-header">
                <div className="team-profile-avatar">{avatars[selected](100)}</div>
                <div className="team-profile-info">
                  <h2>{sel.name}</h2>
                  <span className="team-profile-role" style={{ color: sel.color, background: sel.bg, border: `1px solid ${sel.borderColor}` }}>
                    {sel.role}
                  </span>
                  <div className="team-profile-quote" style={{ borderLeftColor: sel.color }}>
                    "{sel.quote}"
                  </div>
                </div>
              </div>

              {/* Body grid */}
              <div className="team-profile-body">
                <div className="team-profile-section">
                  <div className="team-profile-section-label">What It Is</div>
                  <p>{sel.whatItIs}</p>
                </div>
                <div className="team-profile-section">
                  <div className="team-profile-section-label">What Makes It Unique</div>
                  <p>{sel.whyUnique}</p>
                </div>

                <div className="team-profile-section">
                  <div className="team-profile-section-label">Tech Stack</div>
                  <div className="team-tags">
                    {sel.tech.map((t, i) => (
                      <span key={i} className="team-tag" style={{ color: sel.color, borderColor: sel.borderColor }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="team-profile-section">
                  <div className="team-profile-section-label">Data It Touches</div>
                  {sel.data.map((d, i) => (
                    <div key={i} className="team-data-item">
                      <span className="team-data-prefix" style={{ color: sel.color }}>{'// '}</span>{d}
                    </div>
                  ))}
                </div>

                <div className="team-profile-section full-width">
                  <div className="team-profile-section-label">Execution Cycle</div>
                  {sel.cycle.map((step, i) => (
                    <div key={i} className="team-cycle-step">
                      <span className="team-cycle-num" style={{ color: sel.color }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="team-profile-section full-width">
                  <div className="team-profile-section-label">Code</div>
                  <pre className="team-code">{sel.code}</pre>
                </div>
              </div>

              {/* Chat */}
              <AgentChat key={selected} agentKey={selected} agent={sel}/>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Team;