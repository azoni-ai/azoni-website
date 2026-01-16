import { useState, useCallback, useRef, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

// Generate unique session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Available models for frontend selection
export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'anthropic/claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
  { id: 'mistralai/mistral-small-24b-instruct-2501', name: 'Mistral Small', provider: 'Mistral' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
];

/**
 * Custom hook for chat functionality
 */
export const useChat = (initialMode = 'professional') => {
  const [chatMode, setChatMode] = useState(initialMode);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [, setDefaultModel] = useState('openai/gpt-4o-mini');
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

  // Fetch default model setting from Firestore
  useEffect(() => {
    const fetchModel = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'chat'));
        if (settingsDoc.exists() && settingsDoc.data().model) {
          const savedModel = settingsDoc.data().model;
          setDefaultModel(savedModel);
          setModel(savedModel);
        }
      } catch (err) {
        console.error('Error fetching model setting:', err);
      }
    };
    fetchModel();
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

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), 
                    { role: 'user', content: messageText }],
          mode: chatMode,
          model
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
          model: data.usage?.model || model,
          modelName: data.modelName || model,
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
  }, [messages, chatMode, isLoading, model]);

  // Change chat mode
  const changeMode = useCallback((mode) => {
    setChatMode(mode);
  }, []);

  // Change model
  const changeModel = useCallback((newModel) => {
    setModel(newModel);
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    chatMode,
    model,
    messagesEndRef,
    sendMessage,
    changeMode,
    changeModel,
  };
};

export default useChat;