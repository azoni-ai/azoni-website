import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { profile, experience, education } from '../data/profile';
import '../styles/resume-warm.css';

const Resume = () => (
  <Layout>
    <Seo title="Experience" description="Charlton Smith's engineering background: principal software engineer and AI consultant, with prior experience at Capital One, T-Mobile, and OLI Fitness." path="/resume" />
    <div className="resume-page">
      <div className="resume-page-inner">
        <header className="resume-header">
          <p className="resume-eyebrow">Experience</p>
          <h1 className="resume-heading">Principal perspective.<br />Hands-on experience.</h1>
          <p className="resume-tagline">Charlton Smith &mdash; principal software engineer and consultant focused on AI applications and production software.</p>
          <ul className="resume-meta">
            <li>{profile.location}</li>
            <li><a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">&nearr;</span></a></li>
            <li><a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">&nearr;</span></a></li>
          </ul>
        </header>

        <section className="resume-current" aria-labelledby="resume-current-heading">
          <p className="resume-eyebrow">Current engagement</p>
          <h2 id="resume-current-heading">Principal Software Engineer &amp; Consultant</h2>
          <p>Client engagement with a strong focus on AI. Independent consulting through Azoni LLC.</p>
          <Link to="/services">How I can help your team <span aria-hidden="true">&rarr;</span></Link>
        </section>

        <section className="resume-section" aria-labelledby="resume-experience-heading">
          <h2 id="resume-experience-heading" className="resume-section-heading">Engineering background</h2>
          <div className="resume-timeline">
            {experience.filter((role) => !/principal/i.test(role.title)).map((role) => (
              <article className="resume-role" key={role.company + role.title}>
                <p className="resume-role-period">{role.period}</p>
                <div>
                  <h3>{role.title}</h3>
                  <p className="resume-role-company">{role.company}</p>
                  <ul>{role.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="resume-section" aria-labelledby="resume-education-heading">
          <h2 id="resume-education-heading" className="resume-section-heading">Education</h2>
          <div className="resume-education">
            {education.map((item) => (
              <article key={item.degree}>
                <h3>{item.degree}</h3>
                <p>{item.school} &middot; {item.year}</p>
                <p className="resume-education-note">{item.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="resume-document">
          <div><h2>R&eacute;sum&eacute; PDF</h2><p>Current consulting focus, selected work, and engineering background.</p></div>
          <a href="/CharltonSmith-Consulting.pdf" download className="resume-cta">Download r&eacute;sum&eacute; <span aria-hidden="true">&darr;</span></a>
        </section>
        <div className="resume-contact">
          <p>Looking for a technical partner for your next project?</p>
          <a href={'mailto:' + profile.email + '?subject=Project%20inquiry'} className="resume-cta resume-cta--primary">Email about a project <span aria-hidden="true">&rarr;</span></a>
        </div>
      </div>
    </div>
  </Layout>
);

export default Resume;
