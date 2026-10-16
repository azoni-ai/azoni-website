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
  return <Layout><Seo title="Contact" path="/contact" description="Email Charlton Smith about software engineering, applied AI, or principal engineering support for your project." />
    <div className="consult-page consult-container consult-contact">
      <header className="consult-page-heading"><p className="consult-eyebrow">Contact</p><h1>Let's talk about<br /><span>your project.</span></h1><p>Building something new, bringing AI into a product, or working through a difficult engineering problem? Start with a short email.</p></header>
      <div className="consult-contact-grid"><section className="consult-contact-address"><h2>Email me directly</h2><a className="consult-address" href={projectEmailHref}>{consulting.email}</a><div className="consult-actions"><a className="consult-button" href={projectEmailHref}>Email about a project <ArrowUpRight size={18} /></a><button className="consult-copy" onClick={copyEmail}>{copyStatus === 'Email address copied.' ? <Check size={16} /> : <Copy size={16} />} Copy email</button></div><p role="status" className="consult-copy-status">{copyStatus}</p><a className="consult-text-link" href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">Find me on LinkedIn <ArrowUpRight size={16} /></a></section><section className="consult-contact-notes"><p className="consult-eyebrow">A useful starting point</p><ul><li>What you're building and who it's for.</li><li>The technical challenge or opportunity.</li><li>The kind of support and timing you have in mind.</li></ul><p>A few sentences are enough to start the conversation.</p></section></div>
      <div className="consult-contact-assistant"><div><h2>Want to learn more first?</h2><p>The AI assistant can explain my services, background, and public work. Email me directly to discuss scope or availability.</p></div><Link className="consult-text-link" to="/chat">Ask the assistant <ArrowRight size={17} /></Link></div>
    </div>
  </Layout>;
}
