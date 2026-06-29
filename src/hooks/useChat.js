import { useState, useCallback, useRef, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

// Generate unique session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Available models for frontend selection.
// Keep in sync with MODEL_PRICING in netlify/functions/chat.js.
export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'Google' },
  { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta' },
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek' },
  { id: 'mistralai/mistral-small-3.2-24b-instruct', name: 'Mistral Small 3.2', provider: 'Mistral' },
];

/**
 * Custom hook for chat functionality with RAG metadata
 */
export const useChat = (initialMode = 'professional') => {
  const [chatMode, setChatMode] = useState(initialMode);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState('openai/gpt-5-mini');
  const [, setDefaultModel] = useState('openai/gpt-5-mini');
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const sessionIdRef = useRef(generateSessionId());

  // Initial greeting
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Hi. I'm Charlton's chatbot. Ask about his experience, projects, or paste a job description for fit analysis. I can also pull live data from his apps (try "how much does he bench?").`,
      rag: null // No RAG for initial message
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

  // Log a completed turn to Firestore (fire and forget)
  const logTurn = useCallback((messageText, assistantContent, ragData, fitnessData, usage, modelName, extra = {}) => {
    addDoc(collection(db, 'chatLogs'), {
      sessionId: sessionIdRef.current,
      userMessage: messageText,
      assistantMessage: assistantContent,
      mode: chatMode,
      model: usage?.model || model,
      modelName: modelName || model,
      usage: usage || null,
      rag: ragData,
      fitness: fitnessData,
      latencyMs: extra.latencyMs ?? null,
      streamed: extra.streamed ?? false,
      timestamp: serverTimestamp()
    }).catch(err => console.error('Error logging chat:', err));
  }, [chatMode, model]);

  // Non-streaming path (also the fallback when streaming is unavailable)
  const sendNonStreaming = useCallback(async (messageText, history, signal) => {
    const startedAt = Date.now();
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...history, { role: 'user', content: messageText }],
        mode: chatMode,
        model,
        sessionId: sessionIdRef.current
      }),
      signal
    });

    const data = await response.json();
    if (!data.choices?.[0]) {
      throw new Error(data.error || 'Invalid response');
    }

    const assistantContent = data.choices[0].message.content;
    const ragData = data._rag || null;
    const fitnessData = data._fitness || null;

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: assistantContent,
      rag: ragData,
      fitness: fitnessData,
      usage: data.usage
    }]);
    logTurn(messageText, assistantContent, ragData, fitnessData, data.usage, data.modelName || model, {
      latencyMs: Date.now() - startedAt,
      streamed: false
    });
  }, [chatMode, model, logTurn]);

  // Streaming path: SSE from /chat-stream, progressively rendering tokens.
  // Throws on any failure so the caller can fall back to /chat.
  const sendStreaming = useCallback(async (messageText, history, signal) => {
    const startedAt = Date.now();
    const response = await fetch('/.netlify/functions/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...history, { role: 'user', content: messageText }],
        mode: chatMode,
        model,
        sessionId: sessionIdRef.current
      }),
      signal
    });

    if (!response.ok || !response.body) {
      throw new Error('stream_unavailable');
    }

    // Insert the streaming placeholder only once we have a live stream.
    setMessages(prev => [...prev, { role: 'assistant', content: '', rag: null, streaming: true }]);
    const setLastContent = (content, extra = {}) => setMessages(prev => {
      if (!prev.length) return prev;
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, content, ...extra };
      return copy;
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let acc = '';
    let meta = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';
      for (const block of blocks) {
        let event = 'message';
        let dataStr = '';
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
        }
        if (!dataStr) continue;
        let data;
        try { data = JSON.parse(dataStr); } catch { continue; }

        if (event === 'token') {
          acc += data.text || '';
          setLastContent(acc);
        } else if (event === 'meta') {
          meta = data;
          if (data.content) acc = data.content; // authoritative full text
        } else if (event === 'error') {
          throw new Error(data.message || 'stream error');
        }
      }
    }

    if (!acc) throw new Error('empty stream');

    const ragData = meta?._rag || null;
    setLastContent(acc, { rag: ragData, usage: meta?.usage, streaming: false });
    logTurn(messageText, acc, ragData, null, meta?.usage, meta?.modelName || model, {
      latencyMs: Date.now() - startedAt,
      streamed: true
    });
  }, [chatMode, model, logTurn]);

  // Send message with abort + streaming-first, fallback-to-/chat behavior
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    setError(null);
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: messageText, rag: null }]);
    setInput('');
    setIsLoading(true);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      await sendStreaming(messageText, history, signal);
    } catch (streamErr) {
      if (streamErr.name === 'AbortError') {
        setIsLoading(false);
        return;
      }
      // Drop any half-rendered streaming placeholder, then fall back to /chat.
      setMessages(prev => (prev.length && prev[prev.length - 1].streaming) ? prev.slice(0, -1) : prev);
      try {
        await sendNonStreaming(messageText, history, signal);
      } catch (err) {
        if (err.name === 'AbortError') {
          setIsLoading(false);
          return;
        }
        console.error('Chat error:', err);
        setError(err.message);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, something went wrong. Email charltonuw@gmail.com directly.',
          rag: null
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, sendStreaming, sendNonStreaming]);

  // Change chat mode
  const changeMode = useCallback((mode) => {
    setChatMode(mode);
  }, []);

  // Change model
  const changeModel = useCallback((newModel) => {
    setModel(newModel);
  }, []);

  // Check if any message has RAG data (for showing/hiding intro)
  const hasRagMessages = messages.some(m => m.rag?.enabled);

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
    hasRagMessages,
  };
};

export default useChat;