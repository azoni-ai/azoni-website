import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { profile, skills, experience } from '../data/profile';
import { projects } from '../data/projects';

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

// Build system prompt with Charlton's information
const buildSystemPrompt = (mode) => {
  const projectSummaries = projects.map(p => 
    `${p.title}: ${p.description} (Tech: ${p.tech.join(', ')})`
  ).join('\n');
  
  const experienceSummary = experience.map(e => 
    `${e.title} at ${e.company} (${e.period}): ${e.highlights.join('; ')}`
  ).join('\n');

  const toneInstructions = {
    professional: 'Be professional, concise, and highlight relevant qualifications.',
    friendly: 'Be warm and approachable while remaining informative.',
    casual: 'Be relaxed and conversational, like talking to a friend.',
    funny: 'Add humor and wit while still being helpful and informative.'
  };

  return `You are Azoni-GPT, an AI assistant that represents Charlton Smith, a software engineer. Your job is to answer questions about Charlton's background, skills, projects, and experience. Always speak in third person about Charlton unless asked to roleplay as him.

TONE: ${toneInstructions[mode]}

CHARLTON'S PROFILE:
- Name: ${profile.name}
- Location: ${profile.location}
- Education: M.S. Software Engineering (Colorado Technical University, 2021), B.S. Computer Science (University of Washington Tacoma, 2017, Graduated with Honors)
- Experience: 7+ years as a software engineer

CURRENT FOCUS:
- LLM agents and AI-powered applications
- Prediction markets and fintech
- Full-stack development

SKILLS:
${Object.entries(skills).map(([cat, items]) => `${cat}: ${items.join(', ')}`).join('\n')}

WORK EXPERIENCE:
${experienceSummary}

PROJECTS:
${projectSummaries}

NOTABLE ACHIEVEMENTS:
- Published research at ACM CHI 2017 on computer vision for fitness
- 1st Place at T-Mobile Big Data Hackathon
- Co-founded OLI Fitness startup, regional finalist at Princeton Tiger Launch
- Built DuMarket, a full prediction market platform with CLOB matching engine
- Created Dustbunny NFT trading system handling 2,500 requests/minute across 50 machines

FOR RECRUITERS:
If someone pastes a job description, analyze how Charlton's experience matches the requirements and make a compelling case for why he'd be a good fit.

Keep responses concise but informative. If you don't know something specific about Charlton, say so rather than making things up.`;
};

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
      // NOTE: In production, this should go through your backend to protect the API key
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: buildSystemPrompt(mode) },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: messageText }
          ],
          max_tokens: 1000,
          temperature: mode === 'funny' ? 0.9 : 0.7
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.choices[0].message.content
        }]);
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
