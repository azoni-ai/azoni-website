import { useState, useCallback, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Custom hook for chat functionality
 * Demonstrates: useCallback, useRef, custom hooks composing other hooks
 */
export const useChat = () => {
  const { chatMode, setChatMode } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Send message with abort capability
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    setError(null);
    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), 
                    { role: 'user', content: messageText }],
          mode: chatMode
        }),
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();

      if (data.choices?.[0]) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.choices[0].message.content
        }]);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      console.error('Chat error:', err);
      setError(err.message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or reach out to Charlton directly at charltonuw@gmail.com.'
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, chatMode, isLoading]);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([{
      role: 'assistant',
      content: '👋 Chat cleared! How can I help you learn about Charlton?'
    }]);
    setError(null);
  }, []);

  // Change chat mode
  const changeMode = useCallback((mode) => {
    setChatMode(mode);
  }, [setChatMode]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    chatMode,
    messagesEndRef,
    sendMessage,
    cancelRequest,
    clearChat,
    changeMode,
  };
};

export default useChat;
