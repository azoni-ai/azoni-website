import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';

const MODES = {
  professional: 'Professional',
  friendly: 'Friendly',
  casual: 'Casual',
  funny: 'Funny'
};

const SUGGESTIONS = [
  "What's your experience with Python and AI?",
  "Tell me about DuMarket and how you built it",
  "Why would Charlton be great for a senior engineer role?",
  "What are some fun facts about Charlton?"
];

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('professional');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Initial greeting
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `👋 Hi! I'm Azoni-GPT, an AI assistant trained on Charlton Smith's background, skills, and projects.

**Recruiters:** Paste a job description and I'll explain why Charlton is a strong fit.
**Hiring Managers:** Ask about specific technologies or projects.
**Curious Visitors:** Try "What are some fun facts about Charlton?" or ask about any project.

You can also switch between tones (Professional, Friendly, Casual, Funny) above.`
    }]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call Netlify function (API key is secure on server)
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: messageText }],
          mode: mode
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.choices[0].message.content
        }]);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or reach out to Charlton directly at charltonuw@gmail.com.'
      }]);
    }

    setIsLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (suggestion) => {
    sendMessage(suggestion);
  };

  return (
    <Layout hideFooter>
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <h1 style={{ fontSize: '2rem' }}>Azoni-GPT</h1>
          <div className="chat-modes">
            {Object.entries(MODES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`chat-mode-btn ${mode === key ? 'active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
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
              <span style={{ opacity: 0.7 }}>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="chat-suggestions">
            {SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                className="chat-suggestion"
                onClick={() => handleSuggestion(suggestion)}
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
              placeholder="Type your message here..."
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
            Responses may contain inaccuracies. For accurate information, contact Charlton directly.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
