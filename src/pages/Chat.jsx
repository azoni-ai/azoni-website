import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, SlidersHorizontal, Send, Sparkles, MessageSquare, Database, Workflow, RotateCw, ChevronDown } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { useChat, AVAILABLE_MODELS } from '../hooks/useChat';
import useVisitTracker from '../hooks/useVisitTracker';
import { projectEmailHref } from '../data/consulting';
import '../styles/chat-warm.css';

const MODES = ['professional', 'friendly', 'casual', 'funny'];
const TOPICS = [
  { id: 'business', label: 'For your business', questions: [
    'What could AI improve in my business?', 'Can you help automate a repetitive workflow?',
    'What consulting services does Charlton offer?', 'Can Azoni help a small business?',
    'How would you approach improving our existing software?', 'Where should we start with an AI idea?',
  ] },
  { id: 'work', label: 'Charlton & his work', questions: [
    'What has Charlton built?', 'How did Charlton get into software and AI?',
    'Tell me about his college hackathons.', 'What did he work on at T-Mobile?',
    'How does EmbedRoute work?', 'What is RowCrew?',
  ] },
  { id: 'technical', label: 'Under the hood', questions: [
    'How does this assistant work?', 'How do retrieval and live tools work together?',
    'How does Charlton build AI workflows?', 'What keeps an AI assistant grounded?',
    'What does the MCP server do?', 'How are model costs tracked?',
  ] },
];
const INITIAL_QUESTIONS = [
  'What could AI improve in my business?', 'What has Charlton built?',
  'How did Charlton get into software and AI?', 'How does this assistant work?',
];
const FOLLOW_UPS = {
  services: ['How could we start small?', 'Which work is relevant to applied AI?'],
  projects: ['How was this built?', 'What could this approach look like for my business?'],
  experience: ['Which work shows his technical approach?', 'How did his path lead to AI?'],
  skills: ['What has he built with that stack?', 'Can he help review our architecture?'],
  contact: ['What could AI improve in my business?', 'What has Charlton built?'],
  negotiation: ['What information helps scope an engagement?', 'How do I contact Charlton directly?'],
};

const PIPELINE_STEPS = [
  { name: 'Your question', icon: MessageSquare, detail: 'Start with a business problem, an idea, or something you’re curious about. Follow-up questions keep the conversation in context.' },
  { name: 'Knowledge + tools', icon: Database, detail: 'Curated background and project notes ground the answer. Relevant questions can also use live tools for public app data.' },
  { name: 'A useful answer', icon: Workflow, detail: 'The selected model brings that context together. Open Sources and details below an answer to inspect its sources, model, and usage.' },
];

function ChatArchitecture() {
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState(1);
  return (
    <section className="chat-architecture" aria-label="How Azoni AI works">
      <button type="button" className="chat-architecture-toggle" aria-expanded={expanded} aria-controls="chat-pipeline-details" onClick={() => setExpanded(!expanded)}>
        <span><Sparkles size={16} aria-hidden="true" /> See how Azoni AI works</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {expanded && <div id="chat-pipeline-details">
        <div className="chat-pipeline" role="group" aria-label="Explore the answer pipeline">
          {PIPELINE_STEPS.map(({ name, icon: Icon }, index) => <button type="button" key={name} aria-pressed={step === index} onClick={() => setStep(index)}><Icon size={20} aria-hidden="true" /><span>{name}</span></button>)}
        </div>
        <p className="chat-pipeline-explanation">{PIPELINE_STEPS[step].detail}</p>
      </div>}
    </section>
  );
}

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
  const [topic, setTopic] = useState(null);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
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
  const questionPool = topic
    ? TOPICS.find(item => item.id === topic).questions
    : hasConversation ? (FOLLOW_UPS[lastIntent] || FOLLOW_UPS.services) : INITIAL_QUESTIONS;
  const suggestions = Array.from({ length: Math.min(4, questionPool.length) }, (_, index) => questionPool[(index + suggestionOffset) % questionPool.length]);
  const activeModelName = AVAILABLE_MODELS.find(item => item.id === model)?.name || model;
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
      <Seo title="Ask Azoni AI" description="Explore Charlton Smith’s work, talk through software and AI ideas for your business, or look under the hood of Azoni AI." path="/chat" />
      <div className="chat-container chat-page-warm consulting-chat">
        <header className="chat-header">
          <div>
            <p className="chat-eyebrow">Meet the AI side of Azoni</p>
            <h1 className="chat-title"><Sparkles size={26} aria-hidden="true" /> Azoni AI</h1>
            <p className="chat-intro">Explore the work. Kick around an idea. See what’s possible.</p>
          </div>
          <button type="button" className="chat-settings-toggle" onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen} aria-controls="chat-settings-panel">
            <SlidersHorizontal size={16} aria-hidden="true" /><span><strong>Model &amp; tone</strong><small>{activeModelName} · {chatMode}</small></span>
          </button>
        </header>
        <div className="chat-direct-links">
          <a href={projectEmailHref}>Email Charlton <ArrowUpRight size={15} aria-hidden="true" /></a>
          <Link to="/projects">Explore the work <ArrowUpRight size={15} aria-hidden="true" /></Link>
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
          <ChatArchitecture />
          {messages.map((message, index) => (
            <div key={index} className={`chat-message-wrapper ${message.role}`}>
              <span className="chat-speaker">{message.role === 'user' ? 'You' : 'Azoni AI'}</span>
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
          <div className="chat-discovery">
            <div className="chat-topics" role="group" aria-label="Choose something to explore">
              {TOPICS.map(item => <button type="button" key={item.id} aria-pressed={topic === item.id} onClick={() => { setTopic(topic === item.id ? null : item.id); setSuggestionOffset(0); }}>{item.label}</button>)}
            </div>
            <button type="button" className="chat-more-questions" aria-label="More question ideas" title="More question ideas" onClick={() => {
              if (!topic) { setTopic('business'); setSuggestionOffset(4); }
              else setSuggestionOffset(offset => offset + 2);
            }}><RotateCw size={15} aria-hidden="true" /></button>
          </div>
          <div className="chat-suggestions" aria-label={hasConversation ? 'Follow-up questions' : 'Suggested questions'}>
            {suggestions.map(question => (
              <button type="button" key={question} className="chat-suggestion" onClick={() => sendMessage(question)} disabled={busy}>{question}</button>
            ))}
          </div>
          <form className="chat-form" onSubmit={handleSubmit}>
            <textarea ref={inputRef} className="chat-input" value={input} onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) handleSubmit(event);
              }}
              aria-label="Your question or idea" placeholder="Ask anything about the work, or tell me what you’d like to improve…" rows={2} maxLength={12000} disabled={busy} />
            <button type="submit" className="btn btn-primary" aria-label="Send message" disabled={busy || !input.trim()}><Send size={18} aria-hidden="true" /><span>Send</span></button>
          </form>
          <p className="chat-disclaimer">AI answers can be imperfect. Want to talk with the human? <a href={projectEmailHref}>Email Charlton</a>. Chat messages aren’t sent as email.</p>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
