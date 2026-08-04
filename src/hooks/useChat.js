import { useState, useCallback, useRef, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { getJourneyId, getChatSessionId } from '../utils/chatSession';

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
  // True once the Firestore default-model setting has resolved (or failed) — seeded
  // sends wait for this so a hero handoff doesn't race the model fetch and lock the
  // conversation to the hardcoded default.
  const [modelReady, setModelReady] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  // Per-tab session (survives refresh/back) so one visitor's turns group into a
  // single conversation in the logs instead of a new session per mount.
  const sessionIdRef = useRef(getChatSessionId());
  // When the conversation continues a hero-widget thread, this carries the hero's
  // session id into every log row so the two halves of the journey can be joined.
  const linkedSessionRef = useRef(null);

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
      } finally {
        setModelReady(true);
      }
    };
    fetchModel();
  }, []);

  // Seed a prior conversation (the hero-widget thread) into this one. Seeded turns
  // become model context automatically because sendMessage derives history from
  // `messages`. Also adopts the hero session id as a join key for the logs.
  const seedThread = useCallback((thread, heroSessionId) => {
    if (Array.isArray(thread) && thread.length > 0) {
      setMessages(prev => [...prev, ...thread.map(({ role, content }) => ({ role, content, rag: null }))]);
    }
    if (heroSessionId) linkedSessionRef.current = heroSessionId;
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
      linkedSessionId: linkedSessionRef.current,
      journeyId: getJourneyId(),
      turnId: extra.turnId ?? null,
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
      partial: extra.partial ?? false,
      timestamp: serverTimestamp()
    }).catch(err => console.error('Error logging chat:', err));
  }, [chatMode, model]);

  // Non-streaming path (also the fallback when streaming is unavailable)
  const sendNonStreaming = useCallback(async (messageText, history, signal, turnId) => {
    const startedAt = Date.now();
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...history, { role: 'user', content: messageText }],
        mode: chatMode,
        model,
        sessionId: sessionIdRef.current,
        journeyId: getJourneyId(),
        turnId
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
      streamed: false,
      turnId
    });
  }, [chatMode, model, logTurn]);

  // Streaming path: SSE from /chat-stream, progressively rendering tokens.
  // Throws on any failure so the caller can fall back to /chat.
  const sendStreaming = useCallback(async (messageText, history, signal, turnId) => {
    const startedAt = Date.now();
    // Dedicated controller so an early exit (watchdog, error) tears the stream
    // connection down BEFORE the /chat fallback starts — otherwise the server keeps
    // generating and logging a second paid answer for the same turn.
    const streamCtrl = new AbortController();
    const onOuterAbort = () => streamCtrl.abort();
    if (signal) signal.addEventListener('abort', onOuterAbort);
    let finished = false;

    try {
    const response = await fetch('/.netlify/functions/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...history, { role: 'user', content: messageText }],
        mode: chatMode,
        model,
        sessionId: sessionIdRef.current,
        journeyId: getJourneyId(),
        turnId
      }),
      signal: streamCtrl.signal
    });

    if (!response.ok || !response.body) {
      throw new Error('stream_unavailable');
    }

    // Insert the streaming placeholder only once we have a live stream. Pinned by
    // id so a late thread-seed appending after it can't hijack the updates.
    const msgId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setMessages(prev => [...prev, { id: msgId, role: 'assistant', content: '', rag: null, streaming: true }]);
    const setLastContent = (content, extra = {}) => setMessages(prev => {
      const i = prev.findIndex(m => m.id === msgId);
      if (i === -1) return prev;
      const copy = [...prev];
      copy[i] = { ...copy[i], content, ...extra };
      return copy;
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let acc = '';
    let meta = null;

    // Watchdog: a stalled stream (no bytes at all) would otherwise hang the UI with
    // a disabled input until the connection dies on its own. Live-data turns can
    // legitimately sit ~15s gathering context, so allow headroom past that. The
    // timer is cleared each read so the losing race branch can't reject later.
    const readWithTimeout = async () => {
      let timer;
      try {
        return await Promise.race([
          reader.read(),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('stream stalled')), 25000); }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      while (true) {
        const { done, value } = await readWithTimeout();
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
            setLastContent(acc, { status: null });
          } else if (event === 'status') {
            // Progress note while the server gathers live data (pre-token phase).
            if (!acc) setLastContent('', { status: data.text || null });
          } else if (event === 'meta') {
            meta = data;
            if (data.content) acc = data.content; // authoritative full text
          } else if (event === 'error') {
            throw new Error(data.message || 'stream error');
          }
        }
      }
    } catch (streamErr) {
      // If a real partial answer is already on screen, keep it rather than deleting
      // it and silently re-asking — a visible partial beats a second full wait.
      // (Not on user aborts: those should stay silent, as before.)
      if (streamErr.name !== 'AbortError' && acc.trim().length >= 80) {
        const ragData = meta?._rag || null;
        setLastContent(acc, { rag: ragData, usage: meta?.usage, streaming: false, status: null });
        logTurn(messageText, acc, ragData, null, meta?.usage, meta?.modelName || model, {
          latencyMs: Date.now() - startedAt,
          streamed: true,
          partial: true,
          turnId
        });
        return;
      }
      throw streamErr;
    }

    if (!acc) throw new Error('empty stream');

    const ragData = meta?._rag || null;
    // Streamed live-data turns report their tools via meta._rag — surface them the
    // same way the non-streaming path surfaces _fitness so logs and badges match.
    const fitnessData = ragData?.toolsCalled?.length
      ? { enabled: true, toolsCalled: ragData.toolsCalled }
      : null;
    setLastContent(acc, { rag: ragData, fitness: fitnessData, usage: meta?.usage, streaming: false, status: null });
    logTurn(messageText, acc, ragData, fitnessData, meta?.usage, meta?.modelName || model, {
      latencyMs: Date.now() - startedAt,
      streamed: true,
      turnId
    });
    finished = true;
    } finally {
      if (signal) signal.removeEventListener('abort', onOuterAbort);
      // Any early exit (partial-keep, watchdog, error) closes the connection so the
      // server stops generating; after a clean finish this is a no-op.
      if (!finished) streamCtrl.abort();
    }
  }, [chatMode, model, logTurn]);

  // Send message with abort + streaming-first, fallback-to-/chat behavior.
  // historyOverride: pass explicit prior turns when the caller just seeded state
  // this same tick (React state is async, so `messages` would still be stale).
  const sendMessage = useCallback(async (messageText, historyOverride) => {
    if (!messageText.trim() || isLoading) return;

    setError(null);
    const history = historyOverride
      ? historyOverride.map(m => ({ role: m.role, content: m.content }))
      : messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: messageText, rag: null }]);
    setInput('');
    setIsLoading(true);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // One id per user turn, shared by the stream attempt and any /chat fallback,
    // so the admin dedupe can collapse this turn's client+server rows exactly —
    // without collapsing a genuinely repeated question into the wrong turn.
    const turnId = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      await sendStreaming(messageText, history, signal, turnId);
    } catch (streamErr) {
      if (streamErr.name === 'AbortError') {
        setIsLoading(false);
        return;
      }
      // Drop any half-rendered streaming placeholder (wherever it sits), then
      // fall back to /chat.
      setMessages(prev => prev.some(m => m.streaming) ? prev.filter(m => !m.streaming) : prev);
      try {
        await sendNonStreaming(messageText, history, signal, turnId);
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
        // Both endpoints failed for a real visitor — report it so the admin error
        // feed sees client-side outages (fire and forget).
        fetch('/.netlify/functions/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `chat double-failure: ${err.message}`.slice(0, 500), context: 'useChat' })
        }).catch(() => {});
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
    modelReady,
    messagesEndRef,
    sendMessage,
    seedThread,
    changeMode,
    changeModel,
    hasRagMessages,
  };
};

export default useChat;