import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { resume, resumePdf } from '../data/resume';
import keepNamesTogether from '../utils/keepNamesTogether';
import '../styles/resume-warm.css';

// The PDF resume as a page: the text comes word for word from data/resume.js,
// and Download PDF serves the file itself.

function Contact({ item }) {
  if (item.to) return <Link to={item.to}>{item.label}</Link>;
  if (!item.href) return item.label;
  const external = item.href.startsWith('http');
  return <a href={item.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.label}</a>;
}

const Resume = () => (
  <Layout>
    <Seo
      title="Resume"
      description="Charlton Smith's resume. Software engineer building AI products and full-stack systems."
      path="/resume"
    />
    <div className="resume-page">
      <div className="resume-page-inner">
        <header className="resume-header">
          <p className="resume-eyebrow">Resume</p>
          <h1 className="resume-heading">{resume.name}</h1>
          <p className="resume-tagline">{resume.headline}</p>
          <div className="resume-contact">
            {resume.contactLines.map(line => (
              <ul className="resume-meta" key={line[0].label}>
                {line.map(item => <li key={item.label}><Contact item={item} /></li>)}
              </ul>
            ))}
          </div>
          <div className="resume-actions">
            <a href={resumePdf} download className="resume-cta resume-cta--primary">
              Download PDF <span aria-hidden="true">↓</span>
            </a>
          </div>
        </header>

        <section className="resume-section" aria-labelledby="resume-summary">
          <h2 id="resume-summary">Summary</h2>
          <div className="resume-section-body"><p className="resume-summary">{resume.summary}</p></div>
        </section>

        <section className="resume-section" aria-labelledby="resume-skills">
          <h2 id="resume-skills">Technical skills</h2>
          <dl className="resume-section-body resume-skills">
            {resume.skills.map(group => (
              <div key={group.label}>
                <dt>{group.label}</dt>
                <dd>{group.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="resume-section" aria-labelledby="resume-experience">
          <h2 id="resume-experience">Professional experience</h2>
          <ol className="resume-section-body resume-entries">
            {resume.experience.map(job => (
              <li key={job.title + job.org} className="resume-entry">
                <div className="resume-entry-heading">
                  <h3>{job.title}</h3>
                  <span className="resume-entry-period">{job.dates}</span>
                </div>
                <p className="resume-entry-org">{keepNamesTogether(job.org)} <span className="resume-entry-place">&middot; {job.place}</span></p>
                <ul className="resume-highlights">
                  {job.bullets.map(line => <li key={line}>{keepNamesTogether(line)}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section className="resume-section" aria-labelledby="resume-projects">
          <h2 id="resume-projects">Selected projects</h2>
          <ul className="resume-section-body resume-projects">
            {resume.projects.map(project => (
              <li key={project.text}>
                <strong>
                  {project.names.map(([label, to], index) => <React.Fragment key={label}>{index > 0 && ' / '}<Link to={to}>{label}</Link></React.Fragment>)}:
                </strong>{' '}
                {project.text}
              </li>
            ))}
          </ul>
        </section>

        <section className="resume-section" aria-labelledby="resume-education">
          <h2 id="resume-education">Education</h2>
          <ul className="resume-section-body resume-entries">
            {resume.education.map(item => (
              <li key={item.degree} className="resume-entry">
                <div className="resume-entry-heading">
                  <h3>{item.degree}</h3>
                  <span className="resume-entry-period">{item.year}</span>
                </div>
                <p className="resume-entry-org">{item.school}</p>
                <p className="resume-entry-note">{keepNamesTogether(item.note)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  </Layout>
);

export default Resume;
