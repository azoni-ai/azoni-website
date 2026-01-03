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
          <a href={`mailto:${profile.email}`}>Contact</a>
        </div>
        <p>© {currentYear} {profile.name}. Built with React.</p>
      </div>
    </footer>
  );
};

export default Footer;
