import React from 'react';
import Layout from '../components/Layout';
import { profile, skills, experience } from '../data/profile';

const About = () => {
  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container container-narrow">
          {/* Intro */}
          <div style={{ marginBottom: 'var(--space-3xl)' }}>
            <h1 style={{ marginBottom: 'var(--space-lg)' }}>About</h1>
            <p className="about-intro">
              I'm a software engineer based in Seattle with 7+ years of experience building 
              production systems. Currently focused on AI applications and tools.
            </p>
            <p className="about-intro">
              I started a computer vision company out of college, spent 4 years at T-Mobile 
              building automation platforms, and led testing infrastructure at Capital One. 
              Now I'm building LLM agents and full-stack AI apps.
            </p>
            <p className="about-intro">
              I build things because I enjoy it — prediction markets, trading bots, 
              fitness apps, game tools. Check out the <a href="/projects">projects</a> page.
            </p>
          </div>

          {/* Skills - Compact */}
          <div style={{ marginBottom: 'var(--space-3xl)' }}>
            <div className="section-label">Skills</div>
            <div className="skills-compact">
              {Object.entries(skills).map(([category, items]) => (
                <div key={category} className="skill-row">
                  <span className="skill-category">{formatCategory(category)}</span>
                  <span className="skill-items">{items.join(' · ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Experience - Timeline */}
          <div style={{ marginBottom: 'var(--space-3xl)' }}>
            <div className="section-label">Experience</div>
            <div className="timeline">
              {experience.map((job, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-date">{job.period}</div>
                  <div className="timeline-content">
                    <strong>{job.title}</strong>
                    <span className="timeline-company">{job.company}</span>
                  </div>
                </div>
              ))}
            </div>
            <a href="/resume" className="section-link" style={{ marginTop: 'var(--space-lg)', display: 'inline-block' }}>
              View full resume →
            </a>
          </div>

          {/* Contact */}
          <div>
            <div className="section-label">Get in touch</div>
            <div className="contact-links">
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
              <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

const formatCategory = (cat) => {
  return cat.replace(/([A-Z])/g, ' $1').trim();
};

export default About;
