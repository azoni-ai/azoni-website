import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { profile } from '../data/profile';
import '../styles/about-warm.css';

const PRINCIPLES = [
  { title: 'Start with the problem', body: 'Understand the users, the existing system, and what a useful result looks like before choosing a model or writing code.' },
  { title: 'Stay close to the implementation', body: 'Architecture and delivery belong together. I work through the data model, APIs, interfaces, and operational details, then build and test the system.' },
  { title: 'Make AI observable', body: 'Treat model output as something to verify. Add the validation, usage tracking, and error reporting that make an AI feature practical to operate.' },
];

const About = () => (
  <Layout>
    <Seo title="About" description="Principal software engineer and consultant focused on AI applications, production systems, and hands-on delivery. Based in Seattle." path="/about" />
    <div className="about-page">
      <div className="about-inner">
        <header className="about-hero">
          <p className="about-eyebrow">About / {profile.location}</p>
          <h1 className="about-title">A technical partner.<br />An engineer who builds.</h1>
          <p className="about-lede">I&rsquo;m Charlton Smith, a principal software engineer and consultant with a focus on AI. I help turn complex product ideas into software that people can use and teams can maintain.</p>
        </header>
        <section className="about-current" aria-labelledby="about-current-heading">
          <p className="about-eyebrow">Current work</p>
          <h2 id="about-current-heading">Principal Software Engineer &amp; Consultant</h2>
          <p>I&rsquo;m currently working with a client in a principal engineering role with a strong focus on AI. Alongside client work, I build and operate my own products through Azoni LLC.</p>
        </section>
        <section className="about-section about-background">
          <h2 className="about-h2">Experience across the whole product.</h2>
          <div className="about-prose">
            <p>My background spans startup product development, enterprise engineering, and independent software. At <strong>Capital One</strong>, I built Python microservices and automated testing infrastructure on AWS. At <strong>T-Mobile</strong>, I developed internal automation and modernized web applications.</p>
            <p>I also co-founded <strong>OLI Fitness</strong>, building real-time computer vision for exercise feedback and publishing an extended abstract at <strong>ACM CHI 2017</strong>. Today, my own work includes a multi-provider embedding gateway, shared AI tooling, and community products with real users.</p>
            <p>That range shapes how I work: connect the technical decisions to the product, keep the system understandable, and follow through after the first release.</p>
            <Link to="/resume" className="about-text-link">View experience and credentials <span aria-hidden="true">&rarr;</span></Link>
          </div>
        </section>
        <section className="about-section" aria-labelledby="about-method-heading">
          <h2 id="about-method-heading" className="about-h2">How I work</h2>
          <div className="about-method-grid">
            {PRINCIPLES.map((item, index) => (
              <article key={item.title} className="about-method-card">
                <span className="about-method-number" aria-hidden="true">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="about-section about-capabilities">
          <h2 className="about-h2">Where I can help</h2>
          <p>AI applications and retrieval systems. Product architecture and full-stack development. Integrations, automation, and the infrastructure behind them.</p>
          <p className="about-tools">Recent tools include Python, TypeScript, React, Next.js, FastAPI, PostgreSQL, Firebase, and AWS. The choice follows the problem.</p>
          <Link to="/services" className="about-text-link">Explore consulting services <span aria-hidden="true">&rarr;</span></Link>
        </section>
        <section className="about-contact">
          <h2>Have a project in mind?</h2>
          <p>Tell me what you&rsquo;re building and where you need help.</p>
          <a href={'mailto:' + profile.email + '?subject=Project%20inquiry'} className="about-contact-button">Email about a project <span aria-hidden="true">&rarr;</span></a>
        </section>
      </div>
    </div>
  </Layout>
);

export default About;
