import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for chat functionality
 * Demonstrates: useCallback, useRef, useState composition
 */
export const useChat = (initialMode = 'professional') => {
  const [chatMode, setChatMode] = useState(initialMode);
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
      content: `Hi! I'm an AI trained on Charlton's background. Ask me anything, or paste a job description for fit analysis.`
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
        content: 'Sorry, something went wrong. Email charltonuw@gmail.com directly.'
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, chatMode, isLoading]);

  // Change chat mode
  const changeMode = useCallback((mode) => {
    setChatMode(mode);
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    chatMode,
    messagesEndRef,
    sendMessage,
    changeMode,
  };
};

export default useChat;
