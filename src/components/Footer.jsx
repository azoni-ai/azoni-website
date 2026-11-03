import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Linkedin } from 'lucide-react';
import { profile } from '../data/profile';
import { projectEmailHref, resumePath } from '../data/consulting';
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div><Link to="/" className="site-footer-name navbar-logo">azoni<span className="navbar-logo-dot">.</span></Link><p>Charlton Smith, principal software engineer in the Seattle area.</p></div>
          <div className="site-footer-contact">
            <a className="site-footer-email" href={projectEmailHref}>charlton@azoni.ai <ArrowUpRight size={19} aria-hidden="true" /></a>
            <a className="site-footer-linkedin" href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Connect on LinkedIn (opens in a new tab)"><Linkedin size={16} aria-hidden="true" /> Connect on LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
        <nav className="site-footer-links" aria-label="Footer navigation">
          <Link to="/projects">Work</Link><Link to="/about">About</Link><Link to={resumePath}>Resume</Link><Link to="/services">Consulting</Link><Link to="/contact">Contact</Link><Link to="/blog">Build notes</Link><Link to="/live">Usage and code changes</Link>
        </nav>
        <div className="site-footer-bottom"><span>&copy; {new Date().getFullYear()} Azoni LLC</span><div><a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub</a><Link to="/privacy">Privacy</Link></div></div>
      </div>
    </footer>
  );
}
