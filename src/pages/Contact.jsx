import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Copy, Linkedin } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { consulting, projectEmailHref } from '../data/consulting';
import { profile } from '../data/profile';
import '../styles/contact-refined.css';

export default function Contact() {
  const [copyStatus, setCopyStatus] = useState('');
  const emailRef = useRef(null);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(consulting.email);
      setCopyStatus('Email address copied.');
    } catch {
      // Select the visible address so copying remains possible when clipboard access is blocked.
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(emailRef.current);
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        if (!document.execCommand('copy')) throw new Error('Copy unavailable');
        setCopyStatus('Email address copied.');
      } catch {
        setCopyStatus('Email selected. Use your device’s copy command to copy it.');
      }
    }
  };

  return <Layout>
    <Seo title="Contact" path="/contact" description="Email Charlton Smith at Azoni about improving your business with software, AI, and automation." />
    <div className="az-contact consult-container">
      <header className="az-contact-heading">
        <p className="consult-eyebrow">Contact Charlton</p>
        <h1>What could work<br /><span>better for you?</span></h1>
        <p>A better workflow. A new product. A system that needs some attention. Tell me what you have in mind.</p>
      </header>

      <div className="az-contact-main">
        <section className="az-contact-direct" aria-labelledby="az-contact-email-title">
          <h2 id="az-contact-email-title">Email me directly.</h2>
          <a className="az-contact-address" ref={emailRef} href={projectEmailHref}>{consulting.email}</a>
          <div className="az-contact-actions">
            <a className="consult-button" href={projectEmailHref}>Open email app <ArrowUpRight size={17} /></a>
            <button type="button" className="az-contact-copy" onClick={copyEmail}>{copyStatus === 'Email address copied.' ? <Check size={16} /> : <Copy size={16} />} Copy address</button>
          </div>
          <p role="status" className="az-contact-status">{copyStatus}</p>
          <div className="az-contact-alternatives">
            <p>Prefer your browser?</p>
            <a href={'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(consulting.email)} target="_blank" rel="noopener noreferrer">Open Gmail <ArrowUpRight size={15} /></a>
          </div>
          <div className="az-contact-linkedin">
            <a className="consult-text-link" href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Connect on LinkedIn (opens in a new tab)"><Linkedin size={17} aria-hidden="true" /> Connect on LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </section>
        <section className="az-contact-start" aria-labelledby="az-contact-start-title">
          <h2 id="az-contact-start-title">A few lines is enough.</h2>
          <p>Start with what your business does, what is slowing you down, and what you would like to change.</p>
          <p>You don&rsquo;t need a technical plan. We can work through that together.</p>
          <p className="az-contact-welcome">Businesses of any size are welcome.</p>
        </section>
      </div>

      <section className="az-contact-more">
        <div><h2>Get to know my work first.</h2><p>Explore what I&rsquo;ve built and how I approach the work.</p></div>
        <div className="az-contact-more-links"><Link to="/projects">Selected work <ArrowRight size={16} /></Link></div>
      </section>
    </div>
  </Layout>;
}
