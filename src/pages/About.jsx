import React from 'react';
import Layout from '../components/Layout';
import { useProfile } from '../hooks/useProjects';

const About = () => {
  const { profile, loading } = useProfile();

  return (
    <Layout>
      <section className="about-page">
        <div className="container about-container">
          {loading ? (
            <div className="about-loading">Loading...</div>
          ) : (
            <>
              {/* Header */}
              <header className="about-header">
                <h1>About Me</h1>
                {profile?.tagline && (
                  <p className="about-tagline">{profile.tagline}</p>
                )}
              </header>

              {/* Bio */}
              {profile?.aboutMe && (
                <div className="about-bio">
                  {profile.aboutMe.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              )}

              {/* Skills */}
              {profile?.skills?.length > 0 && (
                <div className="about-section">
                  <h2>Skills</h2>
                  <div className="about-skills">
                    {profile.skills.map(skill => (
                      <span key={skill} className="about-skill">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              {profile?.contact && (
                <div className="about-section">
                  <h2>Get in Touch</h2>
                  <div className="about-contact">
                    {profile.contact.email && (
                      <a href={`mailto:${profile.contact.email}`}>
                        {profile.contact.email}
                      </a>
                    )}
                    {profile.contact.linkedin && (
                      <a 
                        href={profile.contact.linkedin.startsWith('http') ? profile.contact.linkedin : `https://${profile.contact.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        LinkedIn
                      </a>
                    )}
                    {profile.contact.github && (
                      <a 
                        href={profile.contact.github.startsWith('http') ? profile.contact.github : `https://${profile.contact.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        GitHub
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