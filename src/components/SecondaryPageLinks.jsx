import React from 'react';
import { Link } from 'react-router-dom';
import { profile } from '../data/profile';
import '../styles/secondary-pages.css';

export default function SecondaryPageLinks({ compact = false }) {
  return (
    <nav className={`secondary-links${compact ? ' secondary-links--compact' : ''}`} aria-label="Explore Charlton's work">
      <Link to="/projects">View selected work <span aria-hidden="true">↗</span></Link>
      <a href={`mailto:${profile.email}?subject=${encodeURIComponent('A project to discuss')}`}>
        Email about a project <span aria-hidden="true">↗</span>
      </a>
    </nav>
  );
}
