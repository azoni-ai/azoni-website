import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { profile } from '../../data/profile';

export default function HomeHero() {
  return (
    <header className="azoni-hero">
      <p className="consult-eyebrow">Independent software &amp; AI consulting</p>
      <div className="azoni-hero-grid">
        <div>
          <h1>Make your business<br /><span>work better.</span></h1>
          <p className="azoni-hero-intro">Useful software. Connected workflows. AI that earns its place in your business.</p>
          <div className="consult-actions">
            <Link to="/projects" className="consult-button">Explore my work <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="azoni-hero-person">
          <span className="azoni-person-rule" aria-hidden="true" />
          <p className="azoni-person-name">Charlton Smith</p>
          <p className="azoni-person-role">Principal software engineer<br /> The person behind Azoni.</p>
          <p>I help businesses of any size build software, automate repetitive work, and put AI to practical use. You work directly with me, from the first conversation to the implementation.</p>
          <div className="azoni-person-links">
            <Link to="/about" className="consult-text-link">A little about me <ArrowRight size={16} aria-hidden="true" /></Link>
            <a href={profile.links.linkedin} className="consult-text-link" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile (opens in a new tab)">LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
      <div className="azoni-credentials" aria-label="Engineering background">
        <p>Experience that carries into the work</p>
        <span>T-Mobile</span><span>Capital One</span><span>Co-founder, OLI Fitness</span>
        <Link to="/about#experience">My experience <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
    </header>
  );
}
