import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Copy } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { consulting, projectEmailHref } from '../data/consulting';
import { profile } from '../data/profile';
export default function Contact() {
  const [copyStatus, setCopyStatus] = useState('');
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(consulting.email); setCopyStatus('Email address copied.'); }
    catch { setCopyStatus('Select the email address above to copy it.'); }
  };
  return <Layout><Seo title="Contact" path="/contact" description="Get in touch with Charlton Smith at Azoni about improving your business with software, AI, and automation." />
    <div className="consult-page consult-container consult-contact">
      <header className="consult-page-heading"><p className="consult-eyebrow">Contact Charlton</p><h1>Let's make things<br /><span>work better.</span></h1><p>Tell me about your business and what you&rsquo;d like to improve. You don&rsquo;t need a finished brief or a technical plan to start a conversation.</p></header>
      <div className="consult-contact-grid"><section className="consult-contact-address"><h2>Email me directly</h2><a className="consult-address" href={projectEmailHref}>{consulting.email}</a><div className="consult-actions"><a className="consult-button" href={projectEmailHref}>Open email app <ArrowUpRight size={18} /></a><button className="consult-copy" onClick={copyEmail}>{copyStatus === 'Email address copied.' ? <Check size={16} /> : <Copy size={16} />} Copy email</button></div><p role="status" className="consult-copy-status">{copyStatus}</p><p className="consult-email-fallback">No email app set up? Copy the address or use your browser.</p><div className="consult-email-options"><a className="consult-text-link" href={'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(consulting.email)} target="_blank" rel="noopener noreferrer">Open Gmail <ArrowUpRight size={16} /></a><a className="consult-text-link" href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <ArrowUpRight size={16} /></a></div></section><section className="consult-contact-notes"><p className="consult-eyebrow">A useful starting point</p><ul><li>What your business does.</li><li>The task, workflow, or system you want to improve.</li><li>What a better day would look like for you and your team.</li></ul><p>Solo businesses, growing teams, and larger organizations are all welcome.</p></section></div>
      <div className="consult-contact-assistant"><div><h2>Want to learn more first?</h2><p>The AI assistant can explain my services, background, and public work. Email me directly to discuss scope or availability.</p></div><Link className="consult-text-link" to="/chat">Ask the assistant <ArrowRight size={17} /></Link></div>
    </div>
  </Layout>;
}
