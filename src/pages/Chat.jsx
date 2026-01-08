import React from 'react';
import Layout from '../components/Layout';
import { useChat } from '../hooks/useChat';

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
 * Demonstrates: Custom hooks, controlled components
 */
const Chat = () => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    chatMode,
    messagesEndRef,
    sendMessage,
    changeMode
  } = useChat();

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <Layout hideFooter>
      <div className="chat-container">
        <div className="chat-header">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Azoni-GPT</h1>
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
            AI responses may be inaccurate. Contact charltonuw@gmail.com for specifics.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
