import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, SlidersHorizontal, Send } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { useChat, AVAILABLE_MODELS } from '../hooks/useChat';
import useVisitTracker from '../hooks/useVisitTracker';
import { projectEmailHref } from '../data/consulting';
import '../styles/chat-warm.css';

const MODES = ['professional', 'friendly', 'casual', 'funny'];
const INITIAL_QUESTIONS = [
  { label: 'How can you help?', question: 'What consulting services does Charlton offer?' },
  { label: 'Explore the work', question: 'Which projects show Charlton’s AI and product engineering work?' },
  { label: 'Discuss project fit', question: 'What should I share to find out if Charlton is a fit for my project?' },
  { label: 'Start a conversation', question: 'How do I contact Charlton about a project?' },
];
const FOLLOW_UPS = {
  services: ['What is a useful first project brief?', 'Which work is relevant to applied AI?'],
  projects: ['How does this connect to consulting work?', 'What should I include in a project inquiry?'],
  experience: ['Which work shows his technical approach?', 'How can I discuss project fit with Charlton?'],
  skills: ['What has he built with that stack?', 'Can he help review our architecture?'],
  contact: ['What should I include in the first email?', 'What consulting services does he offer?'],
  negotiation: ['What information helps scope an engagement?', 'How do I contact Charlton directly?'],
};

function AnswerSources({ message }) {
  if (!message.rag || message.streaming) return null;
  const sources = [...new Set((message.rag.topChunks || []).map(source => source.title).filter(Boolean))];
  return (
    <details className="chat-answer-sources">
      <summary>Sources and details</summary>
      <ul>
        <li>Current consulting profile</li>
        {sources.map(title => <li key={title}>{title}</li>)}
        {message.fitness?.enabled && <li>Live app data</li>}
      </ul>
      <p>Sources inform this answer; confirm project details directly with Charlton.</p>
      <details className="chat-technical-details">
        <summary>Technical details</summary>
        <dl>
          {message.usage?.modelName && <><dt>Model</dt><dd>{message.usage.modelName}</dd></>}
          {message.rag.retrievalMethod && <><dt>Retrieval</dt><dd>{message.rag.retrievalMethod}</dd></>}
          {message.usage?.total_tokens != null && <><dt>Tokens</dt><dd>{message.usage.total_tokens}</dd></>}
          {message.usage?.totalCost && <><dt>Estimated cost</dt><dd>${message.usage.totalCost}</dd></>}
        </dl>
      </details>
    </details>
  );
}

const Chat = () => {
  useVisitTracker('azoni-ai');
  const {
    messages, input, setInput, isLoading, chatMode, model, modelReady,
    messagesEndRef, sendMessage, seedThread, changeMode, changeModel,
  } = useChat();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const seededRef = useRef(false);
  // Continue the hero-widget thread (router state) or seed from ?q= (fallback for
  // direct/shared URLs). Waits for modelReady so a seeded send doesn't race the
  // Firestore default-model fetch and run on the wrong model.
  useEffect(() => {
    if (seededRef.current || !modelReady) return;

    const heroThread = location.state?.heroThread;
    if (Array.isArray(heroThread) && heroThread.length > 0) {
      seededRef.current = true;
      const last = heroThread[heroThread.length - 1];
      if (last.role === 'user') {
        // Hero errored before answering — seed the prior turns and retry the
        // unanswered question here. History is passed explicitly because the
        // seeded state hasn't rendered yet (React state updates are async).
        // Clear router state so refresh doesn't re-send.
        const prior = heroThread.slice(0, -1);
        seedThread(prior, location.state?.heroSessionId);
        sendMessage(last.content, prior);
        navigate(location.pathname, { replace: true, state: null });
      } else {
        // Completed thread: show it as-is, no re-ask. Follow-ups get their context
        // because sendMessage builds history from the seeded messages. Router state
        // stays put — re-seeding on refresh is display-only and restores the view.
        seedThread(heroThread, location.state?.heroSessionId);
      }
      return;
    }

    const params = new URLSearchParams(location.search);
    const seed = params.get('q');
    if (seed && seed.trim()) {
      seededRef.current = true;
      sendMessage(seed.trim());
      // Strip ?q= so refresh/back/re-open doesn't re-send the question. seededRef
      // short-circuits the effect re-run this navigation triggers.
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate, sendMessage, seedThread, modelReady]);


  const hasConversation = messages.some(message => message.role === 'user');
  const lastIntent = [...messages].reverse().find(message => message.role === 'assistant' && message.rag?.intent)?.rag.intent;
  const suggestions = hasConversation
    ? (FOLLOW_UPS[lastIntent] || FOLLOW_UPS.services).map(question => ({ label: question, question }))
    : INITIAL_QUESTIONS;
  const seedPending = !seededRef.current && !modelReady && (
    (Array.isArray(location.state?.heroThread) && location.state.heroThread.length > 0) ||
    !!new URLSearchParams(location.search).get('q')
  );
  const busy = isLoading || seedPending;
  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy || !input.trim()) return;
    sendMessage(input);
    inputRef.current?.focus();
  };

  return (
    <Layout hideFooter>
      <Seo title="Ask about working together" description="Explore Charlton Smith’s consulting services, AI experience, and selected work with his AI assistant." path="/chat" />
      <div className="chat-container chat-page-warm consulting-chat">
        <header className="chat-header">
          <div>
            <p className="chat-eyebrow">Charlton Smith · AI assistant</p>
            <h1 className="chat-title">Ask about working together.</h1>
            <p className="chat-intro">Services, relevant work, and where your project might fit.</p>
          </div>
          <button type="button" className="chat-settings-toggle" onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen} aria-controls="chat-settings-panel">
            <SlidersHorizontal size={16} aria-hidden="true" /> Options
          </button>
        </header>
        <div className="chat-direct-links">
          <a href={projectEmailHref}>Email about a project <ArrowUpRight size={15} aria-hidden="true" /></a>
          <Link to="/projects">Selected work <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
        {settingsOpen && (
          <div className="chat-settings-panel" id="chat-settings-panel">
            <div className="chat-control">
              <label htmlFor="chat-model">Model</label>
              <select id="chat-model" value={model} onChange={event => changeModel(event.target.value)} className="chat-select" disabled={busy}>
                {AVAILABLE_MODELS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="chat-control">
              <label htmlFor="chat-tone">Tone</label>
              <select id="chat-tone" value={chatMode} onChange={event => changeMode(event.target.value)} className="chat-select" disabled={busy}>
                {MODES.map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="chat-messages" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text" aria-busy={isLoading}>
          {messages.map((message, index) => (
            <div key={index} className={`chat-message-wrapper ${message.role}`}>
              <span className="chat-speaker">{message.role === 'user' ? 'You' : 'AI assistant'}</span>
              <div className={`chat-message ${message.role}`}>
                {message.streaming && !message.content ? <span className="chat-thinking">{message.status || 'Looking into that…'}</span> : message.content}
              </div>
              {message.role === 'assistant' && <AnswerSources message={message} />}
            </div>
          ))}
          {isLoading && !messages[messages.length - 1]?.streaming && <p className="chat-thinking">Looking into that…</p>}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-area">
          <div className="chat-suggestions" aria-label={hasConversation ? 'Follow-up questions' : 'Suggested questions'}>
            {suggestions.map(({ label, question }) => (
              <button type="button" key={question} className="chat-suggestion" onClick={() => sendMessage(question)} disabled={busy}>{label}</button>
            ))}
          </div>
          <form className="chat-form" onSubmit={handleSubmit}>
            <textarea ref={inputRef} className="chat-input" value={input} onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) handleSubmit(event);
              }}
              aria-label="Your question or project brief" placeholder="Ask a question or describe your project…" rows={2} maxLength={12000} disabled={busy} />
            <button type="submit" className="btn btn-primary" aria-label="Send message" disabled={busy || !input.trim()}><Send size={18} aria-hidden="true" /><span>Send</span></button>
          </form>
          <p className="chat-disclaimer">AI answers can be imperfect. This chat does not send an inquiry; <a href={projectEmailHref}>email Charlton directly</a>.</p>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;