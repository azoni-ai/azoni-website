import React from 'react';
import Layout from '../components/Layout';
import { profile } from '../data/profile';

const Resume = () => {
  const resumePreviewSrc = `${profile.links.resume}#page=1&view=FitH&pagemode=none&navpanes=0&scrollbar=1`;

  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 'var(--space-xl)',
            flexWrap: 'wrap',
            gap: 'var(--space-md)'
          }}>
            <h1>Resume</h1>
            <a 
              href={profile.links.resume} 
              download 
              className="btn btn-primary"
            >
              Download PDF
            </a>
          </div>
          
          <div style={{ 
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <iframe
              src={resumePreviewSrc}
              title="Charlton Smith Resume"
              style={{
                width: '100%',
                height: '80vh',
                border: 'none',
                borderRadius: 'var(--radius-md)'
              }}
            />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Resume;
