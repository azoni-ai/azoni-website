import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { profile } from '../data/profile';
import { projectEmailHref } from '../data/consulting';
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div><Link to="/" className="site-footer-name">Charlton Smith</Link><p>Principal engineering. Applied AI.<br />Based in Seattle.</p></div>
          <a className="site-footer-email" href={projectEmailHref}>Have a project in mind? <ArrowUpRight size={19} /></a>
        </div>
        <nav className="site-footer-links" aria-label="Footer navigation">
          <Link to="/services">Services</Link><Link to="/projects">Work</Link><Link to="/about">About</Link><Link to="/resume">Experience</Link><Link to="/contact">Contact</Link><Link to="/chat">AI assistant</Link><Link to="/blog">Writing</Link><Link to="/live">Live projects</Link>
        </nav>
        <div className="site-footer-bottom"><span>&copy; {new Date().getFullYear()} Azoni LLC</span><div><a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a><a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub</a><Link to="/privacy">Privacy</Link></div></div>
      </div>
    </footer>
  );
}
