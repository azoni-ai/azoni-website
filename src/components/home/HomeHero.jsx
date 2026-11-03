import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { profile } from '../../data/profile';

// The GitHub activity band follows the hero on the home page (Home.jsx).
export default function HomeHero() {
  return (
    <header className="azoni-hero">
      <p className="consult-eyebrow">Principal software engineer &middot; Seattle area</p>
      {/* Each clause stays whole, so a wrap falls after the comma, not before "running." */}
      <h1><span className="azoni-hero-clause">I build software people use,</span> <span className="azoni-hero-clause">and I keep it running.</span></h1>
      <p className="azoni-hero-intro">I&rsquo;m Charlton Smith, a principal software engineer in the Seattle area. Most of my work is in AI, from client platforms to products I run myself through Azoni.</p>
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
