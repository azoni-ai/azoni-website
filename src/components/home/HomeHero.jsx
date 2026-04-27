import React from 'react';
import { Link } from 'react-router-dom';
import { profile as staticProfile } from '../../data/profile';
import CurrentlyBuilding from './CurrentlyBuilding';

const HomeHero = ({ profile, aside, stats }) => {
  const data = profile || staticProfile;
  const name = data?.name || staticProfile.name;
  const location = data?.location || staticProfile.location;

  return (
    <header className="home-hero">
      <div className="home-hero-inner">
        <div className="home-hero-text">
          <p className="home-hero-eyebrow">
            <span className="home-hero-mark" aria-hidden="true" />
            Charlton Smith &middot; {location}
          </p>

          <h1 className="home-hero-name">{name}</h1>

          <p className="home-hero-tagline">
            Software engineer. I build AI products and ship the infrastructure they run on.
          </p>

          <CurrentlyBuilding profile={profile} />

          {stats}

          <div className="home-hero-bio">
            <p>
              Ten years shipping software. Startups, T-Mobile, Capital One. For the last year,
              solo &mdash; building products with real users and agents that keep them running.
            </p>
          </div>

          <div className="home-hero-ctas">
            <Link to="/resume" className="home-hero-cta home-hero-cta--primary">
              Resume
            </Link>
            <a
              href={profile?.links?.github || 'https://github.com/azoni'}
              className="home-hero-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>

        {aside && <aside className="home-hero-aside">{aside}</aside>}
      </div>
    </header>
  );
};

export default HomeHero;
