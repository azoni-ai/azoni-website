import React from 'react';
import Layout from '../components/Layout';
import { profile } from '../data/profile';
import '../styles/resume-warm.css';

const Resume = () => {
  const resumePreviewSrc = `${profile.links.resume}#page=1&view=FitH&pagemode=none&navpanes=0&scrollbar=1`;

  return (
    <Layout>
      <div className="resume-page">
        <div className="resume-page-inner">
          <header className="resume-header">
            <p className="resume-eyebrow">Resume · PDF</p>
            <h1 className="resume-heading">Charlton Smith</h1>
            <p className="resume-tagline">
              Software engineer · AI-assisted development · Full-stack product engineering
            </p>
            <ul className="resume-meta">
              <li>{profile.location}</li>
              <li>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </li>
              <li>
                <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </li>
              <li>
                <a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub</a>
              </li>
            </ul>
            <div className="resume-actions">
              <a
                href={profile.links.resume}
                download
                className="resume-cta resume-cta--primary"
              >
                Download PDF
                <span aria-hidden="true">↓</span>
              </a>
              <a
                href={profile.links.resume}
                target="_blank"
                rel="noopener noreferrer"
                className="resume-cta"
              >
                Open in new tab
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </header>

          <div className="resume-frame">
            <iframe
              src={resumePreviewSrc}
              title="Charlton Smith Resume"
              className="resume-iframe"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Resume;
