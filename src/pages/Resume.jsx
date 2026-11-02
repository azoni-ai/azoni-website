import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { profile, experience, education, awards, skills, skillLabels } from '../data/profile';
import { bookingCta } from '../data/consulting';
import '../styles/resume-warm.css';

function EntryLink({ link }) {
  if (link.to) return <Link to={link.to}>{link.label}</Link>;
  return <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`}>{link.label} <span aria-hidden="true">↗</span></a>;
}

const Resume = () => (
  <Layout>
    <Seo
      title="Résumé"
      description="Experience, skills and education for Charlton Smith, principal software engineer in the Seattle area."
      path="/resume"
    />
    <div className="resume-page">
      <div className="resume-page-inner">
        <header className="resume-header">
          <p className="resume-eyebrow">Résumé</p>
          <h1 className="resume-heading">{profile.name}</h1>
          <p className="resume-tagline">{profile.title} &middot; Seattle area</p>
          <ul className="resume-meta">
            <li><a href={`mailto:${profile.email}`}>{profile.email}</a></li>
            <li><a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
            <li><a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub</a></li>
          </ul>
          <div className="resume-actions">
            <button type="button" onClick={() => window.print()} className="resume-cta resume-cta--primary">
              Print or save as PDF
            </button>
            {/* The only PDF so far is the consulting two-pager; it stays until a résumé PDF exists. */}
            <a href={profile.links.resume} target="_blank" rel="noopener noreferrer" className="resume-cta">
              Consulting summary (PDF) <span aria-hidden="true">↗</span>
            </a>
          </div>
        </header>

        <section className="resume-section" aria-labelledby="resume-summary">
          <h2 id="resume-summary">Summary</h2>
          <div className="resume-section-body"><p className="resume-summary">{profile.summary}</p></div>
        </section>

        <section className="resume-section" aria-labelledby="resume-experience">
          <h2 id="resume-experience">Experience</h2>
          <ol className="resume-section-body resume-entries">
            {experience.map(job => (
              <li key={job.id} className="resume-entry">
                <div className="resume-entry-heading">
                  <h3>{job.title}</h3>
                  <span className="resume-entry-period">{job.period}</span>
                </div>
                <p className="resume-entry-org">{job.company}</p>
                <ul className="resume-highlights">
                  {job.highlights.map(line => <li key={line}>{line}</li>)}
                </ul>
                {job.links?.length > 0 && <p className="resume-entry-links">{job.links.map(link => <EntryLink key={link.label} link={link} />)}</p>}
              </li>
            ))}
          </ol>
        </section>

        <section className="resume-section" aria-labelledby="resume-education">
          <h2 id="resume-education">Education</h2>
          <ul className="resume-section-body resume-entries">
            {education.map(item => (
              <li key={item.degree} className="resume-entry">
                <div className="resume-entry-heading">
                  <h3>{item.degree}</h3>
                  <span className="resume-entry-period">{item.year}</span>
                </div>
                <p className="resume-entry-org">{item.school}</p>
                {item.note && <p className="resume-entry-note">{item.note}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section className="resume-section" aria-labelledby="resume-awards">
          <h2 id="resume-awards">Awards</h2>
          <ul className="resume-section-body resume-awards">
            {awards.map(award => (
              <li key={award.event}>
                <p><strong>{award.title}</strong> &middot; {award.event}</p>
                {award.description && <p className="resume-entry-note">{award.description}{award.link && <> &middot; <EntryLink link={award.link} /></>}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section className="resume-section" aria-labelledby="resume-skills">
          <h2 id="resume-skills">Skills</h2>
          <dl className="resume-section-body resume-skills">
            {Object.entries(skills).map(([group, items]) => (
              <div key={group}>
                <dt>{skillLabels[group] || group}</dt>
                <dd>{items.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="resume-closing">
          <p>The <Link to="/about">About page</Link> has the longer story, and the <Link to="/projects">Work page</Link> has the products I build and run.</p>
          <Link to={bookingCta.to} className="resume-cta resume-cta--primary">{bookingCta.label} <ArrowRight size={16} aria-hidden="true" /></Link>
        </footer>
      </div>
    </div>
  </Layout>
);

export default Resume;
