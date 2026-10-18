import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/secondary-pages.css';

export default function SecondaryPageLinks({ compact = false }) {
  return (
    <nav className={`secondary-links${compact ? ' secondary-links--compact' : ''}`} aria-label="Explore Charlton's work">
      <Link to="/projects">View projects <span aria-hidden="true">↗</span></Link>
      <Link to="/contact">
        Contact <span aria-hidden="true">↗</span>
      </Link>
    </nav>
  );
}
