import React, { useState, useRef, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useChat, AVAILABLE_MODELS } from '../hooks/useChat';

const MODES = [
  { id: 'professional', name: 'Professional' },
  { id: 'friendly', name: 'Friendly' },
  { id: 'casual', name: 'Casual' },
  { id: 'funny', name: 'Funny' }
];

// Initial question pool - shown on first load (third person / neutral phrasing)
const INITIAL_QUESTIONS = [
  "What's Charlton's experience with Python and AI?",
  "Tell me about Charlton's projects",
  "Why should I hire Charlton?",
  "What tech stack does Charlton use?",
  "Tell me about Charlton's time at T-Mobile",
  "How does this AI agent system work?",
  "What's Charlton's background in machine learning?",
  "What does the orchestrator do?",
  "Where did Charlton go to school?",
  "Is Charlton available for work?",
  "What makes Charlton different from other candidates?",
  "Tell me about Charlton's work at Capital One",
  "How many AI agents are running right now?",
  "What is the MCP Data Server?",
  "How does the blog get written automatically?",
  "Paste a job description for fit analysis"
];

// Follow-up questions based on detected intent/topic
const FOLLOW_UP_QUESTIONS = {
  skills: [
    "What AI frameworks has Charlton used?",
    "Tell me about Charlton's frontend experience",
    "What backend technologies does Charlton know?",
    "Has Charlton worked with cloud infrastructure?",
    "What's Charlton's experience with databases?"
  ],
  projects: [
    "How did Charlton build Row Crew's anti-cheat?",
    "What's the tech stack for Bench Only?",
    "Tell me more about EmbedRoute",
    "What challenges did Charlton face building these?",
    "Which project is Charlton most proud of?"
  ],
  experience: [
    "What did Charlton build at T-Mobile?",
    "Tell me about Charlton's Capital One work",
    "What's Charlton's biggest achievement?",
    "Has Charlton led any teams?",
    "What industries has Charlton worked in?"
  ],
  behavioral: [
    "Tell me about a time Charlton solved a hard problem",
    "How does Charlton handle tight deadlines?",
    "Describe a project that didn't go as planned",
    "How does Charlton learn new technologies?",
    "Tell me about Charlton working with stakeholders"
  ],
  hire: [
    "What value would Charlton bring to a team?",
    "What are Charlton's career goals?",
    "What type of role is Charlton looking for?",
    "What's Charlton's ideal work environment?",
    "Why is Charlton interested in AI/ML roles?"
  ],
  contact: [
    "Is Charlton open to remote work?",
    "What's Charlton's availability?",
    "Is Charlton open to contract work?",
    "What locations is Charlton considering?"
  ],
  general: [
    "What is Charlton currently working on?",
    "Tell me something interesting about Charlton",
    "What's Charlton's development philosophy?",
    "How does Charlton stay current with tech?",
    "What excites Charlton about AI?"
  ],
  agents: [
    "How does the orchestrator coordinate agents?",
    "What does the blog writer agent do?",
    "Tell me about the Moltbook social agent",
    "How does the fitness AI work?",
    "What data does the MCP server expose?"
  ]
};

// Helper to shuffle and pick N items from array
const shufflePick = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

// Custom SVG Icons
const Icons = {
  Query: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <line x1="9" y1="9" x2="15" y2="9"/>
      <line x1="9" y1="13" x2="13" y2="13"/>
    </svg>
  ),
  Intent: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Embedding: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <line x1="10" y1="6.5" x2="14" y2="6.5" strokeDasharray="2 2"/>
      <line x1="6.5" y1="10" x2="6.5" y2="14" strokeDasharray="2 2"/>
      <line x1="17.5" y1="10" x2="17.5" y2="14" strokeDasharray="2 2"/>
      <line x1="10" y1="17.5" x2="14" y2="17.5" strokeDasharray="2 2"/>
    </svg>
  ),
  Similarity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  Database: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  Retrieve: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  LLM: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <path d="M9 9h6"/>
      <path d="M9 13h6"/>
      <path d="M9 17h4"/>
      <circle cx="17" cy="17" r="2" fill="currentColor"/>
    </svg>
  ),
  Arrow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Expand: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Collapse: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ),
  Brain: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Server: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/>
      <rect x="2" y="14" width="20" height="8" rx="2"/>
      <circle cx="6" cy="6" r="1" fill="currentColor"/>
      <circle cx="6" cy="18" r="1" fill="currentColor"/>
    </svg>
  ),
  Fitness: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5v14M18 5v14M3 8h3M18 8h3M3 16h3M18 16h3M6 8h12M6 16h12"/>
    </svg>
  ),
};

// RAG Architecture Diagram Component
const RAGArchitectureDiagram = ({ collapsed, onToggle }) => {
  if (collapsed) {
    return (
      <button className="rag-diagram-toggle" onClick={onToggle}>
        <span className="rag-toggle-icon"><Icons.Brain /></span>
        <span>View RAG Architecture</span>
      </button>
    );
  }

  const baseSteps = [
    { icon: Icons.Query, label: 'Query', detail: 'User input' },
    { icon: Icons.Intent, label: 'Intent', detail: 'Classify type' },
  ];

  const finalSteps = [
    { icon: Icons.Retrieve, label: 'Retrieve', detail: 'Merge context' },
    { icon: Icons.LLM, label: 'Generate', detail: 'LLM response' },
  ];

  return (
    <div className="rag-architecture">
      <div className="rag-architecture-header">
        <div className="rag-header-title">
          <span className="rag-header-icon"><Icons.Brain /></span>
          <h3>RAG + MCP Pipeline</h3>
        </div>
        <button className="rag-close-btn" onClick={onToggle} aria-label="Close">
          <Icons.Close />
        </button>
      </div>
      
      <div className="rag-pipeline">
        {/* Base steps: Query → Intent */}
        {baseSteps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className="rag-pipeline-step">
              <div className="rag-step-icon">
                <step.icon />
              </div>
              <div className="rag-step-label">{step.label}</div>
              <div className="rag-step-detail">{step.detail}</div>
            </div>
            <div className="rag-pipeline-arrow">
              <Icons.Arrow />
            </div>
          </React.Fragment>
        ))}

        {/* Branching section */}
        <div className="rag-pipeline-branches">
          {/* RAG Branch */}
          <div className="rag-branch active">
            <div className="rag-branch-label">Knowledge</div>
            <div className="rag-branch-steps">
              <div className="rag-pipeline-step-small">
                <div className="rag-step-icon-small"><Icons.Embedding /></div>
                <div className="rag-step-label-small">Embed</div>
              </div>
              <div className="rag-pipeline-arrow-small">→</div>
              <div className="rag-pipeline-step-small">
                <div className="rag-step-icon-small"><Icons.Database /></div>
                <div className="rag-step-label-small">Firestore</div>
              </div>
              <div className="rag-pipeline-arrow-small">→</div>
              <div className="rag-pipeline-step-small">
                <div className="rag-step-icon-small"><Icons.Similarity /></div>
                <div className="rag-step-label-small">Match</div>
              </div>
            </div>
          </div>

          {/* MCP Branch */}
          <div className="rag-branch mcp-branch active">
            <div className="rag-branch-label">Live Data</div>
            <div className="rag-branch-steps">
              <div className="rag-pipeline-step-small">
                <div className="rag-step-icon-small"><Icons.Server /></div>
                <div className="rag-step-label-small">MCP</div>
              </div>
              <div className="rag-pipeline-arrow-small">→</div>
              <div className="rag-pipeline-step-small">
                <div className="rag-step-icon-small"><Icons.Fitness /></div>
                <div className="rag-step-label-small">Fitness</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rag-pipeline-arrow">
          <Icons.Arrow />
        </div>

        {/* Final steps: Retrieve → Generate */}
        {finalSteps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className="rag-pipeline-step">
              <div className="rag-step-icon">
                <step.icon />
              </div>
              <div className="rag-step-label">{step.label}</div>
              <div className="rag-step-detail">{step.detail}</div>
            </div>
            {index < finalSteps.length - 1 && (
              <div className="rag-pipeline-arrow">
                <Icons.Arrow />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="rag-architecture-footer">
        <div className="rag-tech-stack">
          <span className="rag-tech-badge">RAG</span>
          <span className="rag-tech-badge">MCP Server</span>
          <span className="rag-tech-badge">OpenAI Embeddings</span>
          <span className="rag-tech-badge">Netlify Functions</span>
        </div>
        <p className="rag-architecture-note">
          Intent detection routes queries to either the knowledge base (RAG) or live MCP endpoints. 
          Fitness queries fetch real-time data from BenchPressOnly. Both paths merge into the LLM context.
        </p>
      </div>
    </div>
  );
};
// Add this component near your chat message display
const SourceBadge = ({ rag, fitness }) => {
  if (!rag && !fitness) return null;
  
  return (
    <div className="source-badges">
      {rag?.chunksRetrieved > 0 && (
        <span className="source-badge rag-badge">
          <Icons.Database /> RAG ({rag.chunksRetrieved} chunks)
        </span>
      )}
      {fitness?.enabled && (
        <span className="source-badge mcp-badge">
          <Icons.Fitness /> MCP ({fitness.toolsCalled?.join(', ')})
        </span>
      )}
    </div>
  );
};
// RAG Stats Component (per-message)
const RAGStats = ({ rag, usage }) => {
  const [expanded, setExpanded] = useState(false);

  if (!rag || !rag.enabled) {
    return null;
  }

  const getSimilarityColor = (sim) => {
    const similarity = parseFloat(sim);
    if (similarity >= 0.8) return '#10b981';
    if (similarity >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  return (
    
    <div className="rag-stats">
      <button 
        className="rag-stats-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="rag-stats-summary">
          <span className="rag-intent-pill">{rag.intent}</span>
          {rag.retrievalMethod === 'vector' && (
            <span className="rag-method-pill">vector</span>
          )}
          <span className="rag-chunks-count">{rag.chunksRetrieved} chunks retrieved</span>
          {usage?.totalCost && (
            <span className="rag-cost">${usage.totalCost}</span>
          )}
        </span>
        <span className="rag-expand-icon">
          {expanded ? <Icons.Collapse /> : <Icons.Expand />}
        </span>
      </button>

      {expanded && (
        <div className="rag-stats-details">
          <div className="rag-stats-row">
            <span className="rag-stats-label">Intent Detected:</span>
            <span className="rag-stats-value">
              {rag.intent} 
              <span className={`rag-confidence-badge ${rag.intentConfidence}`}>
                {rag.intentConfidence}
              </span>
            </span>
          </div>

          {rag.topChunks && rag.topChunks.length > 0 && (
            <div className="rag-chunks-used">
              <span className="rag-stats-label">Context Retrieved:</span>
              <div className="rag-chunks-list-mini">
                {rag.topChunks.map((chunk, i) => (
                  <div key={i} className="rag-chunk-mini">
                    <span className="rag-chunk-rank">#{i + 1}</span>
                    <span className="rag-chunk-category">{chunk.category}</span>
                    <span className="rag-chunk-title">{chunk.title}</span>
                    <span 
                      className="rag-chunk-similarity"
                      style={{ color: getSimilarityColor(chunk.similarity) }}
                    >
                      {(parseFloat(chunk.similarity) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {usage && (
            <div className="rag-usage-stats">
              <span>Tokens: {usage.prompt_tokens} in / {usage.completion_tokens} out</span>
              {usage.embeddingCost && parseFloat(usage.embeddingCost) > 0 && (
                <span>Embedding: ${usage.embeddingCost}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Chat page with RAG visualization
 */
const Chat = () => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    chatMode,
    model,
    messagesEndRef,
    sendMessage,
    changeMode,
    changeModel,
    hasRagMessages
  } = useChat();

  const [diagramCollapsed, setDiagramCollapsed] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  // Initialize with random suggestions on mount
  useEffect(() => {
    setSuggestions(shufflePick(INITIAL_QUESTIONS, 4));
  }, []);

  // Update suggestions based on last message's detected intent
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    
    // Only update after assistant responses with RAG data
    if (lastMessage.role === 'assistant' && lastMessage.rag?.intent) {
      const intent = lastMessage.rag.intent;
      const followUps = FOLLOW_UP_QUESTIONS[intent] || FOLLOW_UP_QUESTIONS.general;
      setSuggestions(shufflePick(followUps, 4));
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
    // Keep focus on input after sending
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const shuffleSuggestions = useCallback(() => {
    // If we have messages, use follow-ups based on last intent
    if (messages.length > 0) {
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.rag?.intent);
      if (lastAssistantMsg) {
        const intent = lastAssistantMsg.rag.intent;
        const followUps = FOLLOW_UP_QUESTIONS[intent] || FOLLOW_UP_QUESTIONS.general;
        setSuggestions(shufflePick(followUps, 4));
        return;
      }
    }
    // Otherwise use initial questions
    setSuggestions(shufflePick(INITIAL_QUESTIONS, 4));
  }, [messages]);

  // Auto-collapse diagram after first RAG response
  const showFullDiagram = !hasRagMessages && !diagramCollapsed;

  return (
    <Layout hideFooter>
      <div className="chat-container">
        <div className="chat-header">
          <h1 className="chat-title">Azoni AI</h1>
          
          <div className="chat-controls">
            <div className="chat-control">
              <label>Model</label>
              <select 
                value={model} 
                onChange={(e) => changeModel(e.target.value)}
                className="chat-select"
              >
                {AVAILABLE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="chat-control">
              <label>Tone</label>
              <select 
                value={chatMode} 
                onChange={(e) => changeMode(e.target.value)}
                className="chat-select"
              >
                {MODES.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {/* RAG Architecture Diagram - inside scroll area */}
          <RAGArchitectureDiagram 
            collapsed={!showFullDiagram} 
            onToggle={() => setDiagramCollapsed(!diagramCollapsed)}
          />

          {messages.map((message, index) => (
            <div key={index} className="chat-message-wrapper">
              <div 
                className={`chat-message ${message.role}`}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {message.content}
              </div>
              {message.role === 'assistant' && (
                <>
                  <SourceBadge rag={message.rag} fitness={message.fitness} />
                  {message.rag && <RAGStats rag={message.rag} usage={message.usage} />}
                </>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="chat-message-wrapper">
              <div className="chat-message assistant">
                <span className="typing-indicator">
                  <span className="rag-loading-text">Searching knowledge base</span>
                  <span className="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-suggestions-wrapper">
            <div className="chat-suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="chat-suggestion"
                  onClick={() => sendMessage(suggestion)}
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <button 
              className="chat-suggestions-refresh"
              onClick={shuffleSuggestions}
              title="Get new suggestions"
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M21 12a9 9 0 11-3-6.7"/>
                <path d="M21 4v4h-4"/>
              </svg>
            </button>
          </div>
          
          <form className="chat-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about Charlton..."
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading || !input.trim()}
            >
              Send
            </button>
          </form>
          
          <p className="chat-disclaimer">
            AI responses may be inaccurate • Powered by RAG
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;