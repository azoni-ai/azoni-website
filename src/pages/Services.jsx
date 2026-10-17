import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { services } from '../data/consulting';
import '../styles/services-consulting.css';

const DETAILS = {
  'applied-ai': {
    heading: 'Less busywork. More useful work.',
    description: 'Find the manual steps slowing your team down, connect the tools you already use, and put AI to work where it can make a difference.',
    examples: ['Find answers across your internal documents', 'Turn incoming information into organized, actionable work', 'Connect business tools and automate repeated handoffs'],
    delivery: 'A working integration or AI workflow, with evaluation, visibility into costs and errors, and human review where it matters.',
  },
  'product-engineering': {
    heading: 'Software built around your business.',
    description: 'Build an application people can use, or improve one you already rely on. I work across the interface, APIs, data, and infrastructure.',
    examples: ['Replace a cumbersome spreadsheet with an internal tool', 'Create a customer portal, dashboard, or web application', 'Connect your data and make existing systems easier to use'],
    delivery: 'Working software, deployed and documented, with a clear path for maintenance and the next improvement.',
  },
  'principal-engineering': {
    heading: 'An experienced engineer on your side.',
    description: 'Work through a technical decision, move a stalled project forward, or add hands-on engineering leadership to your team.',
    examples: ['Review an existing system and prioritize improvements', 'Choose an architecture for a new product or AI capability', 'Work alongside your engineers on implementation and delivery'],
    delivery: 'Clear technical direction and hands-on implementation, shaped around your team and the work ahead.',
  },
};

const PROCESS = [
  { title: 'Understand the work', description: 'We talk through how your business operates, what is getting in the way, and what a useful outcome would look like.' },
  { title: 'Choose a focused first step', description: 'We agree on the scope, priorities, and how to tell whether the change is helping before building.' },
  { title: 'Build, use, improve', description: 'I work in small, reviewable steps, get your feedback, and make the result something your team can run and maintain.' },
];

export default function Services() {
  return (
    <Layout>
      <Seo title="Software & AI consulting" path="/services" description="Azoni helps businesses of any size improve with software, AI automation, connected workflows, and hands-on engineering by Charlton Smith." />
      <div className="services-page consult-container">
        <header className="services-hero">
          <p className="consult-eyebrow">Software · AI · Automation</p>
          <h1>Make your business<br /><span>work better.</span></h1>
          <p>I help businesses of any size turn slow processes, disconnected tools, and new ideas into useful software. You work directly with me, from the first conversation through implementation.</p>
          <div className="services-hero-actions"><Link className="consult-button" to="/contact">Email me <ArrowUpRight size={18} aria-hidden="true" /></Link><a className="consult-text-link" href="#services">Explore the services <ArrowRight size={16} aria-hidden="true" /></a></div>
        </header>

        <div id="services" className="services-list">
          {services.map(service => {
            const detail = DETAILS[service.id];
            return (
              <section className="services-detail" id={service.id} key={service.id} aria-labelledby={`${service.id}-heading`}>
                <div className="services-index"><span>{service.number}</span><p>{service.title}</p></div>
                <div className="services-main">
                  <h2 id={`${service.id}-heading`}>{detail.heading}</h2>
                  <p>{detail.description}</p>
                  <Link className="consult-text-link" to={service.example}>{service.exampleLabel} <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                <div className="services-examples">
                  <h3>What this could look like</h3>
                  <ul>{detail.examples.map(example => <li key={example}>{example}</li>)}</ul>
                  <div className="services-delivery"><h3>What you leave with</h3><p>{detail.delivery}</p></div>
                </div>
              </section>
            );
          })}
        </div>

        <section className="services-process" aria-labelledby="services-process-title">
          <div><p className="consult-eyebrow">A straightforward process</p><h2 id="services-process-title">Start with the problem.<br />Make something useful.</h2><p>A focused improvement, a new product, or an ongoing engineering partnership. We can shape the work around what your business needs.</p></div>
          <ol>{PROCESS.map((step, index) => <li key={step.title}><span aria-hidden="true">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
        </section>

        <section className="services-closing" aria-labelledby="services-contact-title">
          <div><h2 id="services-contact-title">What could work better?</h2><p>You don’t need a technical brief. Tell me about your business and what you would like to improve.</p></div>
          <Link className="consult-button" to="/contact">Email me <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </section>
      </div>
    </Layout>
  );
}
