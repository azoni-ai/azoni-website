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
          Software engineer. I build production AI systems and the products they live inside of.
        </p>

        <div className="home-hero-bio">
          <p>
            I&rsquo;ve been writing software for about a decade &mdash; startups, T-Mobile, Capital One,
            and for the last year, a pile of things I make for myself. This page is most of them.
          </p>
          <p>
            I like shipping real products that handle real users, agents that do the boring work while
            I sleep, and tools that make the next project faster than the last. If something on this
            page looks interesting, the easiest way to dig in is to ask my AI or read the commits.
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
