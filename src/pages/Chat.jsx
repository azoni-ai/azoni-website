import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { useChat, AVAILABLE_MODELS } from '../hooks/useChat';

const MODES = {
  professional: 'Professional',
  friendly: 'Friendly', 
  casual: 'Casual',
  funny: 'Funny'
};

const SUGGESTIONS = [
  "What's your experience with Python and AI?",
  "Tell me about your projects",
  "Why hire Charlton?",
  "Fun facts about Charlton"
];

/**
 * Chat page using custom useChat hook
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
    changeModel
  } = useChat();

  const [showModelMenu, setShowModelMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const currentModel = AVAILABLE_MODELS.find(m => m.id === model) || AVAILABLE_MODELS[0];

  return (
    <Layout hideFooter>
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-title-row">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Azoni-GPT</h1>
            
            {/* Model Selector - Gear Icon */}
            <div className="model-menu-wrapper" ref={menuRef}>
              <button 
                className="model-gear-btn"
                onClick={() => setShowModelMenu(!showModelMenu)}
                title="Change AI model"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                </svg>
                <span className="current-model-name">{currentModel.name}</span>
              </button>
              
              {showModelMenu && (
                <div className="model-dropdown">
                  {AVAILABLE_MODELS.map(m => (
                    <button
                      key={m.id}
                      className={`model-dropdown-item ${model === m.id ? 'active' : ''}`}
                      onClick={() => {
                        changeModel(m.id);
                        setShowModelMenu(false);
                      }}
                    >
                      <span className="model-provider">{m.provider}</span>
                      <span className="model-name">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="chat-modes">
            {Object.entries(MODES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => changeMode(key)}
                className={`chat-mode-btn ${chatMode === key ? 'active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`chat-message ${message.role}`}
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {message.content}
            </div>
          ))}
          {isLoading && (
            <div className="chat-message assistant">
              <span className="typing-indicator">Thinking...</span>
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
            AI responses may be inaccurate
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;