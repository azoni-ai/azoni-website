import { useState, useCallback, useRef, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Generate unique session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Custom hook for chat functionality
 */
export const useChat = (initialMode = 'professional') => {
  const [chatMode, setChatMode] = useState(initialMode);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const sessionIdRef = useRef(generateSessionId());

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
        const assistantContent = data.choices[0].message.content;
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: assistantContent
        }]);

        // Log to Firestore (fire and forget)
        addDoc(collection(db, 'chatLogs'), {
          sessionId: sessionIdRef.current,
          userMessage: messageText,
          assistantMessage: assistantContent,
          mode: chatMode,
          usage: data.usage || null,
          timestamp: serverTimestamp()
        }).catch(err => console.error('Error logging chat:', err));

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