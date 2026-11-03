import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { bookingCta, consulting, projectEmailHref, resumePath, services } from '../data/consulting';
import { profile } from '../data/profile';
import '../styles/services-consulting.css';

const DETAILS = {
  'applied-ai': {
    description: 'Find the manual steps slowing your team down, connect the tools you already use, and put AI to work where it can make a difference.',
    delivery: 'A working integration or AI workflow, with evaluation, visibility into costs and errors, and human review where it matters.',
  },
  'product-engineering': {
    description: 'Build an application people can use, or improve one you already rely on. I work across the interface, APIs, data, and infrastructure.',
    delivery: 'Working software, deployed and documented, with a clear path for maintenance and the next improvement.',
  },
  'principal-engineering': {
    description: 'Work through a technical decision, move a stalled project forward, or add hands-on engineering leadership to your team.',
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
      <Seo title="Consulting" path="/services" description="Software and AI consulting through Azoni LLC: AI and workflow automation, software for your business, and hands-on engineering help." />
      <div className="services-page consult-container">
        <header className="services-hero">
          <p className="consult-eyebrow">Consulting through Azoni LLC</p>
          <h1>Software and AI consulting</h1>
          <p>The work suits teams that need an experienced engineer for something specific: a manual process to automate, a product to build or improve, or a system that needs senior attention. You work directly with me, from the first conversation through implementation.</p>
          <div className="services-byline">
            <img src={profile.photo} alt="" width="56" height="56" decoding="async" />
            <div>
              <p className="services-byline-name">{profile.name}</p>
              <p>Principal software engineer. Previously <span className="services-nowrap">T-Mobile</span> and Capital One, and co-founder of OLI Fitness.</p>
              <p className="services-byline-links"><Link to="/about">About me</Link><Link to={resumePath}>Resume</Link></p>
            </div>
          </div>
        </header>

        <div id="services" className="services-list">
          {services.map(service => {
            const detail = DETAILS[service.id];
            return (
              <section className="services-detail" id={service.id} key={service.id} aria-labelledby={`${service.id}-heading`}>
                <div className="services-index"><span>{service.number}</span></div>
                <div className="services-main">
                  <h2 id={`${service.id}-heading`}>{service.title}</h2>
                  <p>{detail.description}</p>
                  <div className="services-fit"><h3>Good fit if&hellip;</h3><p>{service.fit}</p></div>
                  <div className="services-delivery"><h3>What you leave with</h3><p>{detail.delivery}</p></div>
                </div>
                <div className="services-examples">
                  <h3>Work I&rsquo;ve done like this</h3>
                  <ul className="services-proof">{service.proof.map(item => <li key={item.name}>
                    <p className="services-proof-name">{item.name} <span>{item.kind}</span></p>
                    <p>{item.text}</p>
                    <Link className="consult-text-link" to={item.to}>{item.linkLabel}<span className="sr-only">: {item.name}</span> <ArrowRight size={15} aria-hidden="true" /></Link>
                  </li>)}</ul>
                </div>
              </section>
            );
          })}
        </div>

        <section className="services-process" aria-labelledby="services-process-title">
          <div><p className="consult-eyebrow">How a project runs</p><h2 id="services-process-title">We start with the problem, then build something useful.</h2><p>The work can be a focused improvement, a new product, or an ongoing engineering partnership, shaped around what you need.</p></div>
          <ol>{PROCESS.map((step, index) => <li key={step.title}><span aria-hidden="true">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
        </section>

        <section className="services-cta" aria-labelledby="services-cta-title">
          <div>
            <h2 id="services-cta-title">Tell me what you&rsquo;re working on.</h2>
            <p>Send me a short email about the problem and the business around it. We can work out the technical side together.</p>
          </div>
          <div className="consult-actions">
            <Link className="consult-button" to={bookingCta.to}>{bookingCta.label} <ArrowRight size={17} aria-hidden="true" /></Link>
            <a className="consult-text-link" href={projectEmailHref}>{consulting.email} <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </section>
      </div>
    </Layout>
  );
}
