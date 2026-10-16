import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Layers3, Workflow, Code2 } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { consulting, projectEmailHref, services } from '../data/consulting';

const selectedWork = [
  { id: 'embedroute', label: 'AI infrastructure', name: 'EmbedRoute', copy: 'One integration for embedding providers. Routing, usage tracking, and a shared foundation for AI search.', icon: Layers3, className: 'infra' },
  { id: 'fab-stats', label: 'Product & data', name: 'FaB Stats', copy: 'A community analytics platform that turns match data into useful tools for competitive players.', icon: Code2, className: 'product' },
  { id: 'azoni-mcp', label: 'Agent systems', name: 'Shared agent infrastructure', copy: 'Authenticated tools that connect AI agents to real application data and operations.', icon: Workflow, className: 'agents' },
];
export default function Home() {
  return (
    <Layout>
      <Seo description={consulting.description} path="/" />
      <div className="consult-home">
        <section className="consult-hero consult-container">
          <div className="consult-hero-copy">
            <p className="consult-eyebrow">Charlton Smith &middot; Independent consultant</p>
            <h1>Software that works.<br /><span>AI with a purpose.</span></h1>
            <p className="consult-intro">I help teams design, build, and improve software &mdash; with principal-level engineering and a practical focus on AI.</p>
            <div className="consult-actions"><a className="consult-button" href={projectEmailHref}>Email about a project <ArrowUpRight size={18} /></a><Link className="consult-text-link" to="/projects">Explore my work <ArrowRight size={17} /></Link></div>
          </div>
          <aside className="consult-focus" aria-label="Current focus">
            <p className="consult-eyebrow"><span className="consult-status-dot" /> Current focus</p>
            <h2>Principal software engineer.<br /> Hands-on AI consultant.</h2>
            <p>Currently working with a client on software engineering with a strong AI focus.</p>
            <div className="consult-focus-lines"><span>Architecture & direction</span><span>AI systems & integrations</span><span>Product & implementation</span></div>
            <Link to="/about">Meet Charlton <ArrowRight size={16} /></Link>
          </aside>
        </section>
        <div className="consult-experience-strip consult-container"><p>Engineering experience</p><span>Capital One</span><span>T-Mobile</span><span>Co-founder, OLI Fitness</span><Link to="/resume">View experience <ArrowUpRight size={15} /></Link></div>
        <section className="consult-section consult-container" aria-labelledby="services-heading">
          <div className="consult-section-heading"><div><p className="consult-eyebrow">How I can help</p><h2 id="services-heading">From technical direction<br />to working software.</h2></div><Link className="consult-text-link" to="/services">Explore services <ArrowRight size={17} /></Link></div>
          <div className="consult-services-grid">{services.map(service => <Link to={`/services#${service.id}`} className="consult-service" key={service.id}><span className="consult-number">{service.number}</span><h3>{service.title}</h3><p>{service.summary}</p><ArrowUpRight className="consult-service-arrow" size={21} aria-hidden="true" /></Link>)}</div>
        </section>
        <section className="consult-work-section" aria-labelledby="work-heading"><div className="consult-container consult-section">
          <div className="consult-section-heading"><div><p className="consult-eyebrow">Selected work</p><h2 id="work-heading">Built, shipped, and operated.</h2><p className="consult-section-note">Independent products that show how I approach engineering.</p></div><Link className="consult-text-link" to="/projects">View all work <ArrowRight size={17} /></Link></div>
          <div className="consult-work-grid">{selectedWork.map(work => <Link className={`consult-work-card ${work.className}`} to={`/projects/${work.id}`} key={work.id}><div className="consult-work-art"><work.icon strokeWidth={1.2} size={55} /><span>{work.label}</span><ArrowUpRight size={22} /></div><div className="consult-work-copy"><h3>{work.name}</h3><p>{work.copy}</p><span className="consult-work-read">Read the case study <ArrowRight size={16} /></span></div></Link>)}</div>
        </div></section>
        <section className="consult-section consult-container consult-approach"><div><p className="consult-eyebrow">Working together</p><h2>A clear problem.<br />A practical next step.</h2><p>I bring technical judgment and implementation into the same conversation.</p></div><ol><li><span>01</span><div><h3>Understand the problem</h3><p>Start with the people, the system, and the outcome you need.</p></div></li><li><span>02</span><div><h3>Choose a focused approach</h3><p>Make the tradeoffs explicit and define a useful piece of work.</p></div></li><li><span>03</span><div><h3>Build and improve</h3><p>Ship working software, learn from its use, and leave the team with a clear path forward.</p></div></li></ol></section>
        <section className="consult-cta consult-container"><div><p className="consult-eyebrow">Let's talk</p><h2>What are you working on?</h2><p>Tell me about your project and where you need help.</p></div><div><a className="consult-button" href={projectEmailHref}>Email about a project <ArrowUpRight size={18} /></a><Link className="consult-text-link" to="/chat">Questions first? Ask the AI assistant <ArrowRight size={16} /></Link></div></section>
      </div>
    </Layout>
  );
}
