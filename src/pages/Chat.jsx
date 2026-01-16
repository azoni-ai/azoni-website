import React from 'react';
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
  "Tell me about DuMarket",
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

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const currentModel = AVAILABLE_MODELS.find(m => m.id === model) || AVAILABLE_MODELS[0];

  return (
    <Layout hideFooter>
      <div className="chat-container">
        <div className="chat-header">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Azoni-GPT</h1>
          
          {/* Model Selector */}
          <div className="chat-model-selector">
            <select 
              value={model} 
              onChange={(e) => changeModel(e.target.value)}
              className="model-select"
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.provider}: {m.name}
                </option>
              ))}
            </select>
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
            Powered by {currentModel.provider} · AI responses may be inaccurate
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;