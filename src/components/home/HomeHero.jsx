import React from 'react';
import { Link } from 'react-router-dom';
import { profile as staticProfile } from '../../data/profile';

const HomeHero = ({ profile }) => {
  const data = profile || staticProfile;
  const name = data?.name || staticProfile.name;
  const location = data?.location || staticProfile.location;

  return (
    <header className="home-hero">
      <div className="home-hero-inner">
        <p className="home-hero-eyebrow">
          <span className="home-hero-mark" aria-hidden="true" />
          Charlton Smith &middot; {location}
        </p>

        <h1 className="home-hero-name">{name}</h1>

        <p className="home-hero-tagline">
          Software engineer. I build AI-powered products and the systems underneath them.
        </p>

        <div className="home-hero-bio">
          <p>
            About a decade of shipping software &mdash; startups, T-Mobile, Capital One, and for the
            last year, working solo on a pile of things I make for myself. This page is most of them.
          </p>
          <p>
            Lately I care about two things: products with real users, and agents that can run them
            without me watching. If something here catches your eye, ask my chatbot or scroll the
            commit feed &mdash; it&rsquo;s easier than reading a bio.
          </p>
        </div>

        <div className="home-hero-ctas">
          <Link to="/chat" className="home-hero-cta home-hero-cta--primary">
            Chat with my AI
            <span aria-hidden="true">→</span>
          </Link>
          <Link to="/resume" className="home-hero-cta">
            Resume
            <span aria-hidden="true">→</span>
          </Link>
          <a
            href="mailto:charltonuw@gmail.com"
            className="home-hero-cta"
          >
            Email me
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default HomeHero;
