import React from 'react';
import { Link } from 'react-router-dom';
import { profile as staticProfile } from '../../data/profile';
import CurrentlyBuilding from './CurrentlyBuilding';

const HomeHero = ({ profile, aside, stats }) => {
  const data = profile || staticProfile;
  const name = data?.name || staticProfile.name;
  const location = data?.location || staticProfile.location;
  const github = data?.links?.github || staticProfile.links.github;

  return (
    <header className="home-hero">
      <div className="home-hero-inner">
        <div className="home-hero-text">
          <p className="home-hero-eyebrow">
            <span className="home-hero-mark" aria-hidden="true" />
            Software &amp; AI consulting &middot; {location}
          </p>

          <h1 className="home-hero-name">{name}</h1>

          <p className="home-hero-tagline">
            I help businesses work better with software, AI, and automation.
          </p>

          <CurrentlyBuilding profile={profile} />

          {stats}

          <div className="home-hero-bio">
            <p>
              I&rsquo;m a principal software engineer and the person behind Azoni. From small businesses
              to enterprise teams, I build useful tools, connect systems, and take repetitive work off people&rsquo;s plates.
            </p>
            <p>
              My background spans T-Mobile, Capital One, and co-founding OLI Fitness. I&rsquo;ve spent the last few years deep in AI,
              building the products and workflows you can explore here.
            </p>
          </div>

          <div className="home-hero-ctas">
            <Link to="/contact" className="home-hero-cta home-hero-cta--primary">
              Email me
            </Link>
            <Link to="/about" className="home-hero-cta">My story</Link>
            <a
              href={github}
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
