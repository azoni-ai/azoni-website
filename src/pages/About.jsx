import React from 'react';
import Layout from '../components/Layout';
import { profile, skills, experience, education, awards } from '../data/profile';

const About = () => {
  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container container-narrow">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
            <h1 style={{ marginBottom: 'var(--space-md)' }}>About Me</h1>
            <p style={{ 
              fontSize: '1.25rem', 
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              {profile.tagline}
            </p>
          </div>

          {/* Bio */}
          <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              {profile.bio}
            </p>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--text-secondary)', marginTop: 'var(--space-lg)' }}>
              Currently focused on LLM agents, prediction markets, and building tools that leverage AI 
              in practical ways. I'm the type of engineer who builds side projects because I genuinely 
              enjoy creating things — my GitHub has everything from trading bots to game development to 
              AI assistants.
            </p>
          </div>

          {/* Skills */}
          <h2 style={{ marginBottom: 'var(--space-xl)' }}>Technical Skills</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-3xl)'
          }}>
            {Object.entries(skills).map(([category, items]) => (
              <div key={category} className="card">
                <h3 style={{ 
                  fontSize: '0.85rem', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.1em',
                  color: 'var(--accent-primary)',
                  marginBottom: 'var(--space-md)'
                }}>
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <div className="tags">
                  {items.map((skill) => (
                    <span key={skill} className="tag">{skill}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Experience */}
          <h2 style={{ marginBottom: 'var(--space-xl)' }}>Experience</h2>
          <div style={{ marginBottom: 'var(--space-3xl)' }}>
            {experience.map((job, index) => (
              <div 
                key={index} 
                className="card" 
                style={{ 
                  marginBottom: 'var(--space-lg)',
                  borderLeft: '3px solid var(--accent-primary)'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 'var(--space-sm)',
                  marginBottom: 'var(--space-md)'
                }}>
                  <div>
                    <h3 style={{ marginBottom: 'var(--space-xs)' }}>{job.title}</h3>
                    <p style={{ color: 'var(--accent-primary)' }}>{job.company}</p>
                  </div>
                  <span style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {job.period}
                  </span>
                </div>
                <ul style={{ 
                  color: 'var(--text-secondary)',
                  paddingLeft: 'var(--space-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-sm)'
                }}>
                  {job.highlights.map((highlight, i) => (
                    <li key={i}>{highlight}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Education */}
          <h2 style={{ marginBottom: 'var(--space-xl)' }}>Education</h2>
          <div style={{ marginBottom: 'var(--space-3xl)' }}>
            {education.map((edu, index) => (
              <div key={index} className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 'var(--space-sm)'
                }}>
                  <div>
                    <h3 style={{ marginBottom: 'var(--space-xs)' }}>{edu.degree}</h3>
                    <p style={{ color: 'var(--accent-primary)', marginBottom: 'var(--space-sm)' }}>
                      {edu.school}
                    </p>
                    {edu.note && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{edu.note}</p>
                    )}
                  </div>
                  <span style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {edu.year}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Awards */}
          <h2 style={{ marginBottom: 'var(--space-xl)' }}>Awards & Recognition</h2>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--space-lg)'
          }}>
            {awards.map((award, index) => (
              <div key={index} className="card">
                <div style={{ 
                  fontSize: '0.85rem',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                  marginBottom: 'var(--space-xs)'
                }}>
                  {award.title}
                </div>
                <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>{award.event}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{award.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
