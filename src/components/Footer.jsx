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
          <div><Link to="/" className="site-footer-name navbar-logo">azoni<span className="navbar-logo-dot">.</span></Link><p>Software, AI &amp; automation by Charlton Smith.<br />Based in Seattle. Working with businesses of any size.</p></div>
          <a className="site-footer-email" href={projectEmailHref}>charlton@azoni.ai <ArrowUpRight size={19} /></a>
        </div>
        <nav className="site-footer-links" aria-label="Footer navigation">
          <Link to="/services">Services</Link><Link to="/projects">Projects</Link><Link to="/about">About</Link><Link to="/resume">Resume</Link><Link to="/contact">Contact</Link><Link to="/chat">AI assistant</Link><Link to="/blog">Writing</Link><Link to="/live">Live projects</Link>
        </nav>
        <div className="site-footer-bottom"><span>&copy; {new Date().getFullYear()} Azoni LLC</span><div><a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a><a href={profile.links.github} target="_blank" rel="noopener noreferrer">GitHub</a><Link to="/privacy">Privacy</Link></div></div>
      </div>
    </footer>
  );
}
