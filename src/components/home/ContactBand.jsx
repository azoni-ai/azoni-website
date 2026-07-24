import React from 'react';
import { Link } from 'react-router-dom';
import { profile as staticProfile } from '../../data/profile';
import '../../styles/contact-band.css';

// Closing conversion surface: a recruiter-facing "work with me" band. The whole
// point of the site is to make contacting easy, so the ask is explicit and the
// email is the primary action (not buried in the footer).

const ContactBand = ({ profile }) => {
  const data = profile || staticProfile;
  const email = data?.email || staticProfile.email;
  const github = data?.links?.github || staticProfile.links.github;
  const linkedin = data?.links?.linkedin || staticProfile.links.linkedin;

  return (
    <section className="contact-band" aria-labelledby="contact-band-heading">
      <div className="contact-band-inner">
        <p className="contact-band-eyebrow">Contact</p>
        <h2 id="contact-band-heading" className="contact-band-heading">
          Get in touch
        </h2>
        <p className="contact-band-lede">
          I build AI products and the infrastructure behind them. If you&rsquo;re hiring or want to
          work together, email me.
        </p>
        <div className="contact-band-actions">
          <a href={`mailto:${email}`} className="contact-band-cta contact-band-cta--primary">
            {email}
          </a>
          <Link to="/resume" className="contact-band-cta">Résumé</Link>
          <a href={linkedin} target="_blank" rel="noopener noreferrer" className="contact-band-cta">
            LinkedIn
          </a>
          <a href={github} target="_blank" rel="noopener noreferrer" className="contact-band-cta">
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
};

export default ContactBand;
