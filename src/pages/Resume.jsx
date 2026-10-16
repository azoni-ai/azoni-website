import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { profile, experience, education, awards } from '../data/profile';
import '../styles/resume-warm.css';

export default function Resume() {
  return (
    <Layout>
      <Seo title="Experience" description="Charlton Smith's work at Azoni, Capital One, T-Mobile, and OLI Fitness, plus education, hackathons, and a downloadable resume." path="/resume" />
      <div className="resume-page">
        <div className="resume-page-inner">
          <header className="resume-header">
            <p className="resume-eyebrow">Charlton Smith &middot; Azoni</p>
            <h1 className="resume-heading">Experience &amp; r&eacute;sum&eacute;.</h1>
            <p className="resume-tagline">I&rsquo;ve built software at T-Mobile and Capital One, co-founded a computer-vision startup, and spent the last few years deep in AI. Today I work with a client as a principal software engineer and build my own products through Azoni.</p>
            <ul className="resume-meta"><li>{profile.location}</li><li><a href={'mailto:' + profile.email}>{profile.email}</a></li><li><a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">&nearr;</span></a></li><li><a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">&nearr;</span></a></li></ul>
            <div className="resume-actions"><a href={profile.links.resume} download className="resume-cta resume-cta--primary">Download r&eacute;sum&eacute; <span aria-hidden="true">&darr;</span></a><Link to="/contact" className="resume-cta">Email me <span aria-hidden="true">&rarr;</span></Link></div>
          </header>

          <section className="resume-section" aria-labelledby="resume-experience-heading">
            <h2 id="resume-experience-heading" className="resume-section-heading">Where I&rsquo;ve worked</h2>
            <div className="resume-timeline">{experience.map((role) => <article className={'resume-role' + (/principal/i.test(role.title) ? ' resume-role--current' : '')} key={role.company + role.title}><p className="resume-role-period">{role.period}</p><div><h3>{role.company}</h3><p className="resume-role-title">{role.title}</p><ul>{role.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul></div></article>)}</div>
          </section>

          <section className="resume-section" aria-labelledby="resume-education-heading">
            <h2 id="resume-education-heading" className="resume-section-heading">Education</h2>
            <div className="resume-education">{education.map((item) => <article key={item.degree}><h3>{item.degree}</h3><p>{item.school} &middot; {item.year}</p><p className="resume-education-note">{item.note}</p></article>)}</div>
          </section>

          <section className="resume-section" aria-labelledby="resume-awards-heading">
            <h2 id="resume-awards-heading" className="resume-section-heading">Hackathons, research &amp; community</h2>
            <p className="resume-section-intro">I spent my college weekends at hackathons, building with other people and learning by doing. A few highlights from that part of my life and the work that followed:</p>
            <div className="resume-awards">{awards.map((award) => <article key={award.event}><span>{award.title}</span><div><h3>{award.event}</h3><p>{award.description}</p></div></article>)}</div>
          </section>

          <details className="resume-document"><summary>Preview the r&eacute;sum&eacute; <span aria-hidden="true">+</span></summary><div className="resume-preview"><p><a href={profile.links.resume} target="_blank" rel="noopener noreferrer">Open PDF in a new tab <span aria-hidden="true">&nearr;</span></a></p><iframe src={profile.links.resume + '#page=1&view=FitH&pagemode=none'} title="Charlton Smith resume" loading="lazy" /></div></details>

          <section className="resume-contact"><div><h2>Have something I can help with?</h2><p>I work with businesses of any size on software, AI, and automation.</p></div><Link to="/contact" className="resume-cta resume-cta--primary">Email me <span aria-hidden="true">&rarr;</span></Link></section>
        </div>
      </div>
    </Layout>
  );
}
