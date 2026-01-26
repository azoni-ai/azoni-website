import React from 'react';
import Layout from '../components/Layout';
import { useProfile } from '../hooks/useProjects';

const About = () => {
  const { profile, loading } = useProfile();

  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h1 style={{ marginBottom: 'var(--space-lg)' }}>About Me</h1>
          
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
          ) : (
            <>
              {/* Tagline */}
              {profile?.tagline && (
                <p style={{ 
                  fontSize: '1.25rem', 
                  color: 'var(--accent-primary)',
                  marginBottom: 'var(--space-xl)'
                }}>
                  {profile.tagline}
                </p>
              )}

              {/* About Me */}
              {profile?.aboutMe && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                  {profile.aboutMe.split('\n\n').map((paragraph, i) => (
                    <p key={i} style={{ 
                      marginBottom: 'var(--space-md)',
                      lineHeight: '1.8',
                      color: 'var(--text-secondary)'
                    }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {/* Current Work */}
              {profile?.currentWork && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                  <h2 style={{ 
                    fontSize: '1.25rem', 
                    marginBottom: 'var(--space-md)' 
                  }}>
                    Currently Working On
                  </h2>
                  <p style={{ 
                    color: 'var(--text-secondary)',
                    lineHeight: '1.8'
                  }}>
                    {profile.currentWork}
                  </p>
                </div>
              )}

              {/* Skills */}
              {profile?.skills?.length > 0 && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                  <h2 style={{ 
                    fontSize: '1.25rem', 
                    marginBottom: 'var(--space-md)' 
                  }}>
                    Skills
                  </h2>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 'var(--space-sm)' 
                  }}>
                    {profile.skills.map(skill => (
                      <span 
                        key={skill}
                        style={{
                          padding: 'var(--space-xs) var(--space-sm)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.9rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              {profile?.contact && (
                <div>
                  <h2 style={{ 
                    fontSize: '1.25rem', 
                    marginBottom: 'var(--space-md)' 
                  }}>
                    Get in Touch
                  </h2>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 'var(--space-sm)' 
                  }}>
                    {profile.contact.email && (
                      <a 
                        href={`mailto:${profile.contact.email}`}
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        📧 {profile.contact.email}
                      </a>
                    )}
                    {profile.contact.linkedin && (
                      <a 
                        href={profile.contact.linkedin.startsWith('http') ? profile.contact.linkedin : `https://${profile.contact.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        💼 LinkedIn
                      </a>
                    )}
                    {profile.contact.github && (
                      <a 
                        href={profile.contact.github.startsWith('http') ? profile.contact.github : `https://${profile.contact.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        🐙 GitHub
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default About;