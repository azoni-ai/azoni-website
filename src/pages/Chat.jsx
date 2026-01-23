import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useChat, AVAILABLE_MODELS } from '../hooks/useChat';

const MODES = [
  { id: 'professional', name: 'Professional' },
  { id: 'friendly', name: 'Friendly' },
  { id: 'casual', name: 'Casual' },
  { id: 'funny', name: 'Funny' }
];

const SUGGESTIONS = [
  "What's your experience with Python and AI?",
  "Tell me about your projects",
  "Why hire Charlton?",
  "What is Row Crew?"
];

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

  const steps = [
    { icon: Icons.Query, label: 'Query', detail: 'User input' },
    { icon: Icons.Intent, label: 'Intent', detail: 'Classify type' },
    { icon: Icons.Embedding, label: 'Embed', detail: 'OpenAI API' },
    { icon: Icons.Database, label: 'Firestore', detail: 'Vector storage' },
    { icon: Icons.Similarity, label: 'Similarity', detail: 'Cosine ranking' },
    { icon: Icons.Retrieve, label: 'Retrieve', detail: 'Top-K chunks' },
    { icon: Icons.LLM, label: 'Generate', detail: 'LLM response' },
  ];

  return (
    <div className="rag-architecture">
      <div className="rag-architecture-header">
        <div className="rag-header-title">
          <span className="rag-header-icon"><Icons.Brain /></span>
          <h3>RAG Pipeline</h3>
        </div>
        <button className="rag-close-btn" onClick={onToggle} aria-label="Close">
          <Icons.Close />
        </button>
      </div>
      
      <div className="rag-pipeline">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className={`rag-pipeline-step ${index >= 2 && index <= 4 ? 'highlight' : ''}`}>
              <div className="rag-step-icon">
                <step.icon />
              </div>
              <div className="rag-step-label">{step.label}</div>
              <div className="rag-step-detail">{step.detail}</div>
            </div>
            {index < steps.length - 1 && (
              <div className="rag-pipeline-arrow">
                <Icons.Arrow />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="rag-architecture-footer">
        <div className="rag-tech-stack">
          <span className="rag-tech-badge">Firebase Firestore</span>
          <span className="rag-tech-badge">OpenAI Embeddings</span>
          <span className="rag-tech-badge">Cosine Similarity</span>
          <span className="rag-tech-badge">Netlify Functions</span>
        </div>
        <p className="rag-architecture-note">
          Queries are embedded into 1,536-dimensional vectors and matched against stored knowledge chunks 
          using cosine similarity. Relevant context is retrieved and passed to the LLM for grounded responses.
        </p>
      </div>
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

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Auto-collapse diagram after first RAG response
  const showFullDiagram = !hasRagMessages && !diagramCollapsed;

  return (
    <Layout hideFooter>
      <div className="chat-container">
        <div className="chat-header">
          <h1 className="chat-title">Azoni-GPT</h1>
          
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
              {message.role === 'assistant' && message.rag && (
                <RAGStats rag={message.rag} usage={message.usage} />
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
          <div className="chat-suggestions">
            {SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                className="chat-suggestion"
                onClick={() => sendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
          
          <form className="chat-form" onSubmit={handleSubmit}>
            <input
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