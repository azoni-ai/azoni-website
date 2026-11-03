import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { profile } from '../../data/profile';
import { bookingCta, resumePath } from '../../data/consulting';
import { PROOF_AS_OF, projects } from '../../data/projects';

// Counts from my own products, read from the FaB Stats entry in projects.js;
// update them and the date there.
export { PROOF_AS_OF };
const fab = projects.find((project) => project.id === 'fab-stats');
const [players, matches] = fab.proof.items;
const millions = (value) => `${(Number(String(value).replace(/,/g, '')) / 1e6).toFixed(1)}M`;
export const PROOF = [
  { value: players.value, label: 'players on FaB Stats', to: '/projects/fab-stats' },
  { value: millions(matches.value), label: 'matches tracked on FaB Stats', to: '/projects/fab-stats' },
  { value: fab.gemExporter.users.toLocaleString('en-US'), label: 'Chrome users of the FaB Stats GEM Exporter', to: '/projects/fab-stats' },
  { value: fab.discordBot.members.toLocaleString('en-US'), label: `members across ${fab.discordBot.servers} Discord servers with the FaB Stats bot`, to: '/projects/fab-stats' },
];

export default function HomeHero() {
  return (
    <header className="azoni-hero">
      <p className="consult-eyebrow">Principal software engineer &middot; Seattle area</p>
      <div className="azoni-hero-grid">
        <div>
          <h1>I build and run AI products and the infrastructure behind them.</h1>
          <p className="azoni-hero-intro">I&rsquo;m Charlton Smith. I build AI software for a client as a principal software engineer, and I run my own products and agents through Azoni.</p>
          <div className="consult-actions">
            <Link to={bookingCta.to} className="consult-button">{bookingCta.label} <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link to={resumePath} className="consult-button azoni-button-quiet">Résumé</Link>
          </div>
        </div>
        <div className="azoni-hero-person">
          <img className="azoni-person-photo" src={profile.photo} alt="Charlton Smith" width="96" height="96" decoding="async" />
          <p className="azoni-person-name">{profile.name}</p>
          <p className="azoni-person-role">Principal software engineer<br />Seattle area</p>
          <div className="azoni-person-links">
            <Link to="/about" className="consult-text-link">About me <ArrowRight size={16} aria-hidden="true" /></Link>
            <a href={profile.links.linkedin} className="consult-text-link" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile (opens in a new tab)">LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
      <div className="azoni-credentials" aria-label="Engineering background">
        <p>Earlier experience</p>
        <span>T-Mobile</span><span>Capital One</span><span>Co-founder, OLI Fitness</span>
        <Link to="/about#experience">My experience <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
      <div className="azoni-proof" aria-labelledby="azoni-proof-caption">
        <p id="azoni-proof-caption" className="azoni-proof-caption">From products I build and run, as of {PROOF_AS_OF}</p>
        <dl className="azoni-proof-list">
          {PROOF.map(item => <div key={item.label}>
            <dt><Link to={item.to}>{item.label}</Link></dt>
            <dd>{item.value}</dd>
          </div>)}
        </dl>
      </div>
    </header>
  );
}
