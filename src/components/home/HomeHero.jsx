import React from 'react';
import { Link } from 'react-router-dom';
import { profile as staticProfile } from '../../data/profile';
import CurrentlyBuilding from './CurrentlyBuilding';

const HomeHero = ({ profile, aside, stats }) => {
  const data = profile || staticProfile;
  const name = data?.name || staticProfile.name;
  const location = data?.location || staticProfile.location;
  const github = data?.links?.github || staticProfile.links.github;
  const linkedin = data?.links?.linkedin || staticProfile.links.linkedin;

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
            Software engineer. I build AI products and the infrastructure they run on.
          </p>

          <CurrentlyBuilding profile={profile} />

          {stats}

          <div className="home-hero-bio">
            <p>
              Seven years of experience across startups, T-Mobile, and Capital One. For the past two
              years I&rsquo;ve worked independently, building products that people use and the agents
              that keep them running.
            </p>
          </div>

          <div className="home-hero-ctas">
            <Link to="/resume" className="home-hero-cta home-hero-cta--primary">
              Résumé
            </Link>
            <a
              href={github}
              className="home-hero-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href={linkedin}
              className="home-hero-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>
        </div>

        {aside && <aside className="home-hero-aside">{aside}</aside>}
      </div>
    </header>
  );
};

export default HomeHero;
