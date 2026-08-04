import React from 'react';
import { Link } from 'react-router-dom';
import { profile } from '../data/profile';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-links">
          <a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href={profile.links.twitter} target="_blank" rel="noopener noreferrer">Twitter</a>
          <Link to="/resume">Resume</Link>
          <Link to="/privacy">Privacy</Link>
          <a href={`mailto:${profile.email}`}>Contact</a>
        </div>
        <p>
          © {currentYear} Azoni LLC &middot; Seattle, WA &middot; Auto-deployed from{' '}
          <a
            href="https://github.com/azoni-ai/azoni-website"
            target="_blank"
            rel="noopener noreferrer"
          >
            azoni-ai/azoni-website
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
