import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJourneyId, getHeroSessionId } from '../../utils/chatSession';

const SUGGESTIONS = [
  "What has Charlton built?",
  "What's his DevOps + infra experience?",
  "How does this chatbot work?",
];

const SYSTEM_GREETING = null; // no pre-seeded history; keeps the one-shot clean

// Hero is the fast path (tight timeout) — use a low-latency, temperature-friendly model.
const MODEL = 'google/gemini-2.5-flash-lite';

const HeroChatPrompt = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]); // [{ role, content, meta? }]
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Per-tab ids so this widget's turns and a later full-chat visit group into
  // one conversation in the admin logs.
  const sessionIdRef = useRef(getHeroSessionId());
  const replyBoxRef = useRef(null);

  const send = useCallback(async (text) => {
    const content = text.trim();
    if (!content || isLoading) return;

    setError(null);
    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          mode: 'professional',
          model: MODEL,
          sessionId: sessionIdRef.current,
          journeyId: getJourneyId(),
          turnId: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          context: 'home-hero',
          fast: true,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.choices?.[0]) {
        throw new Error(data.error || 'Chat failed');
      }

      const reply = data.choices[0].message.content;
      const meta = {
        model: data.modelName || data.usage?.model || MODEL,
        chunks: data._rag?.chunksRetrieved,
        intent: data._rag?.intent,
        topChunks: data._rag?.topChunks?.slice(0, 3) || [],
      };

      setMessages((prev) => [...prev, { role: 'assistant', content: reply, meta }]);

      // Scroll reply into view on next paint
      requestAnimationFrame(() => {
        replyBoxRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    } catch (err) {
      console.error('hero chat error', err);
      setError('Something went wrong. Use "Continue in full chat" below to retry.');
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const onSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const onSuggestion = (text) => {
    setInput(text);
    send(text);
  };

  const conversation = messages.filter((m) => m.content);

  return (
    <div className="hero-chat" aria-label="Inline Azoni AI chat">
      <form className="hero-chat-form" onSubmit={onSubmit} role="search">
        <label className="hero-chat-label" htmlFor="hero-chat-input">
          Ask my chatbot
        </label>
        <div className="hero-chat-inputwrap">
          <input
            id="hero-chat-input"
            className="hero-chat-input"
            type="text"
            placeholder="Ask anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            autoComplete="off"
          />
          <button
            type="submit"
            className="hero-chat-send"
            disabled={isLoading || !input.trim()}
            aria-label="Send question"
          >
            {isLoading ? (
              <span className="hero-chat-spinner" aria-hidden="true" />
            ) : (
              <span aria-hidden="true">→</span>
            )}
          </button>
        </div>

        {conversation.length === 0 && (
          <div className="hero-chat-suggestions" role="list">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="hero-chat-suggestion"
                onClick={() => onSuggestion(s)}
                disabled={isLoading}
                role="listitem"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>

      {conversation.length > 0 && (
        <div className="hero-chat-thread" ref={replyBoxRef}>
          {conversation.map((m, i) => (
            <div key={i} className={`hero-chat-msg hero-chat-msg--${m.role}`}>
              {m.role === 'user' ? (
                <p className="hero-chat-msg-body hero-chat-msg-body--user">{m.content}</p>
              ) : (
                <div className="hero-chat-msg-body hero-chat-msg-body--assistant">
                  <p className="hero-chat-msg-label">Azoni AI</p>
                  <div className="hero-chat-msg-text">
                    {m.content.split('\n').map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                  {m.meta?.topChunks?.length > 0 && (
                    <p className="hero-chat-msg-sources">
                      <span className="hero-chat-msg-sources-label">Drew from</span>
                      {m.meta.topChunks.map((chunk, idx) => (
                        <span key={idx} className="hero-chat-msg-source-chip">
                          {chunk.title || chunk.category}
                        </span>
                      ))}
                    </p>
                  )}
                  {m.meta && (m.meta.model || m.meta.chunks != null) && (
                    <p className="hero-chat-msg-meta">
                      {m.meta.model && <span>{m.meta.model}</span>}
                      {m.meta.chunks != null && (
                        <>
                          <span className="hero-chat-msg-sep">·</span>
                          <span>{m.meta.chunks} RAG chunk{m.meta.chunks === 1 ? '' : 's'}</span>
                        </>
                      )}
                      {m.meta.intent && (
                        <>
                          <span className="hero-chat-msg-sep">·</span>
                          <span>{m.meta.intent}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="hero-chat-msg hero-chat-msg--assistant">
              <div className="hero-chat-msg-body hero-chat-msg-body--assistant hero-chat-msg-body--loading">
                <p className="hero-chat-msg-label">Azoni AI</p>
                <p className="hero-chat-msg-text hero-chat-msg-text--dim">Thinking…</p>
              </div>
            </div>
          )}
          {error && <p className="hero-chat-error">{error}</p>}
          <div className="hero-chat-cta-row">
            {/* Carry the whole hero thread (and session id, as a log join key) into
                the full chat via router state, so the conversation continues instead
                of re-asking the question from scratch. ?q= remains the fallback for
                direct/shared URLs with no router state. */}
            <Link
              to="/chat"
              state={{
                heroThread: conversation.map(({ role, content }) => ({ role, content })),
                heroSessionId: sessionIdRef.current,
              }}
              className="hero-chat-continue"
            >
              Continue in full chat →
            </Link>
          </div>
        </div>
      )}

      {SYSTEM_GREETING && <p className="hero-chat-footnote">{SYSTEM_GREETING}</p>}
    </div>
  );
};

export default HeroChatPrompt;
