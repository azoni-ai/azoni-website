import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Copy, Linkedin } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { consulting, meetLive, projectEmailHref, resumePath } from '../data/consulting';
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
    <Seo title="Contact" path="/contact" description="Email Charlton Smith at charlton@azoni.ai. A few lines is enough." />
    <div className="az-contact consult-container">
      <header className="az-contact-heading">
        <p className="consult-eyebrow">Contact Charlton</p>
        <h1>Get in touch</h1>
        <p>Email is the quickest way to reach me. Tell me who you are and what you&rsquo;d like to talk about.</p>
      </header>

      <div className="az-contact-main">
        <section className="az-contact-direct" aria-labelledby="az-contact-email-title">
          <h2 id="az-contact-email-title">Email me directly.</h2>
          {/* One mailto link: the address itself opens the email app. */}
          <a className="az-contact-address" ref={emailRef} href={projectEmailHref}>{consulting.email}</a>
          <div className="az-contact-actions">
            <button type="button" className="az-contact-copy" onClick={copyEmail}>{copyStatus === 'Email address copied.' ? <Check size={16} /> : <Copy size={16} />} Copy address</button>
          </div>
          <p role="status" className="az-contact-status">{copyStatus}</p>
          {meetLive && <p className="az-contact-call">Prefer to talk? <Link to="/meet">Book a 30-minute call.</Link></p>}
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
          <p>If it&rsquo;s a project, start with what your business does, what is slowing you down, and what you&rsquo;d like to change. You don&rsquo;t need a technical plan. We can work through that together.</p>
        </section>
      </div>

      <section className="az-contact-more">
        <div><h2>Get to know my work first.</h2><p>Explore what I&rsquo;ve built and how I approach the work.</p></div>
        <div className="az-contact-more-links">
          <Link to="/projects">Work <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link to="/services">Consulting <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link to={resumePath}>Resume <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  </Layout>;
}
