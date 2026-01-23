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

// RAG Architecture Diagram Component
const RAGArchitectureDiagram = ({ collapsed, onToggle }) => {
  if (collapsed) {
    return (
      <button className="rag-diagram-toggle" onClick={onToggle}>
        <span>🧠</span> View RAG Architecture
      </button>
    );
  }

  return (
    <div className="rag-architecture">
      <div className="rag-architecture-header">
        <h3>🧠 RAG-Powered Response System</h3>
        <button className="rag-close-btn" onClick={onToggle}>×</button>
      </div>
      
      <div className="rag-pipeline">
        <div className="rag-pipeline-step">
          <div className="rag-step-icon">💬</div>
          <div className="rag-step-label">Your Query</div>
        </div>
        
        <div className="rag-pipeline-arrow">→</div>
        
        <div className="rag-pipeline-step">
          <div className="rag-step-icon">🎯</div>
          <div className="rag-step-label">Intent Detection</div>
          <div className="rag-step-detail">Classify query type</div>
        </div>
        
        <div className="rag-pipeline-arrow">→</div>
        
        <div className="rag-pipeline-step highlight">
          <div className="rag-step-icon">🔢</div>
          <div className="rag-step-label">Embedding</div>
          <div className="rag-step-detail">OpenAI text-embedding-3-small</div>
        </div>
        
        <div className="rag-pipeline-arrow">→</div>
        
        <div className="rag-pipeline-step highlight">
          <div className="rag-step-icon">🔍</div>
          <div className="rag-step-label">Vector Search</div>
          <div className="rag-step-detail">Cosine similarity ranking</div>
        </div>
        
        <div className="rag-pipeline-arrow">→</div>
        
        <div className="rag-pipeline-step">
          <div className="rag-step-icon">📚</div>
          <div className="rag-step-label">Context Retrieval</div>
          <div className="rag-step-detail">Top-K relevant chunks</div>
        </div>
        
        <div className="rag-pipeline-arrow">→</div>
        
        <div className="rag-pipeline-step">
          <div className="rag-step-icon">🤖</div>
          <div className="rag-step-label">LLM Generation</div>
          <div className="rag-step-detail">Context-aware response</div>
        </div>
      </div>

      <div className="rag-architecture-footer">
        <div className="rag-tech-stack">
          <span className="rag-tech-badge">Firebase Firestore</span>
          <span className="rag-tech-badge">OpenAI Embeddings</span>
          <span className="rag-tech-badge">Netlify Functions</span>
          <span className="rag-tech-badge">Multi-model LLM</span>
        </div>
        <p className="rag-architecture-note">
          Each response retrieves relevant knowledge chunks from a custom vector database, 
          ensuring accurate, grounded answers about Charlton's experience.
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
          <span className="rag-chunks-count">{rag.chunksRetrieved} chunks</span>
          {usage?.totalCost && (
            <span className="rag-cost">${usage.totalCost}</span>
          )}
        </span>
        <span className="rag-expand-icon">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="rag-stats-details">
          <div className="rag-stats-row">
            <span className="rag-stats-label">Intent:</span>
            <span className="rag-stats-value">
              {rag.intent} 
              <span className={`rag-confidence-badge ${rag.intentConfidence}`}>
                {rag.intentConfidence}
              </span>
            </span>
          </div>

          {rag.topChunks && rag.topChunks.length > 0 && (
            <div className="rag-chunks-used">
              <span className="rag-stats-label">Retrieved Chunks:</span>
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

        {/* RAG Architecture Diagram */}
        <RAGArchitectureDiagram 
          collapsed={!showFullDiagram} 
          onToggle={() => setDiagramCollapsed(!diagramCollapsed)}
        />

        <div className="chat-messages">
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