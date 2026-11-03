import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { profile } from '../../data/profile';

// The GitHub activity band follows the hero on the home page (Home.jsx).
export default function HomeHero() {
  return (
    <header className="azoni-hero">
      <p className="consult-eyebrow">Principal software engineer &middot; Seattle area</p>
      <h1>I build and run AI products and the infrastructure behind them.</h1>
      <p className="azoni-hero-intro">I&rsquo;m Charlton Smith. I build AI software for a client as a principal software engineer, and I run my own products and agents through Azoni.</p>
      <div className="azoni-person-links">
        <Link to="/about" className="consult-text-link">About me <ArrowRight size={16} aria-hidden="true" /></Link>
        <a href={profile.links.linkedin} className="consult-text-link" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile (opens in a new tab)">LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
      <div className="azoni-credentials" aria-label="Engineering background">
        <p>Earlier experience</p>
        <span>T-Mobile</span><span>Capital One</span><span>Co-founder, OLI Fitness</span>
        <Link to="/about#experience">My experience <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
    </header>
  );
}
