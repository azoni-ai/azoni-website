import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import '../styles/floating-assistant.css';

const AssistantChat = lazy(() => import('./home/HeroChatPrompt'));

export default function FloatingAssistant() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false);
  const launcher = useRef(null);
  const panel = useRef(null);
  const hiddenRoute = /^\/(admin|chat|game)(\/|$)/.test(pathname);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open || hiddenRoute) return undefined;
    const close = event => {
      if (event.key === 'Escape') { setOpen(false); launcher.current?.focus(); }
    };
    const input = panel.current?.querySelector('input:not(:disabled)');
    (input || panel.current?.querySelector('button'))?.focus({ preventScroll: true });
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, hiddenRoute]);

  // Keep the composer above the software keyboard when the visual viewport shrinks.
  useEffect(() => {
    if (!open || !window.visualViewport) return undefined;
    const viewport = window.visualViewport;
    const update = () => {
      if (!panel.current) return;
      panel.current.style.setProperty('--assistant-height', `${viewport.height}px`);
      panel.current.style.setProperty('--assistant-keyboard', `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => { viewport.removeEventListener('resize', update); viewport.removeEventListener('scroll', update); };
  }, [open]);

  if (hiddenRoute) return null;
  const close = () => { setOpen(false); launcher.current?.focus({ preventScroll: true }); };

  return <div className="assistant-widget">
    {activated && <section ref={panel} id="azoni-assistant-panel" className="assistant-panel" role="dialog" aria-labelledby="azoni-assistant-title" hidden={!open}>
      <header className="assistant-panel-header">
        <div><h2 id="azoni-assistant-title">Azoni AI</h2><p>Software, AI, and the work behind Azoni.</p></div>
        <button type="button" onClick={close} aria-label="Close assistant"><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="assistant-panel-body"><Suspense fallback={<p className="assistant-loading" role="status">Opening the assistant…</p>}><AssistantChat floating autoFocus={open} /></Suspense></div>
      <p className="assistant-panel-note">AI answers. For a conversation with Charlton, <a href="mailto:charlton@azoni.ai">email me</a>.</p>
    </section>}
    <button ref={launcher} type="button" className="assistant-launcher" aria-label={open ? 'Close AI assistant' : 'Ask Azoni AI'} aria-expanded={open} aria-controls={activated ? 'azoni-assistant-panel' : undefined} onClick={() => { setActivated(true); setOpen(value => !value); }}>
      {open ? <X size={25} aria-hidden="true" /> : <><MessageCircle size={27} aria-hidden="true" /><span aria-hidden="true">AI</span></>}
    </button>
  </div>;
}
