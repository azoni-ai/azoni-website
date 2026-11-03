import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import HomeHero from '../components/home/HomeHero';
import CommitStats from '../components/home/CommitStats';
import useGithubStats from '../hooks/useGithubStats';
import { resumePath } from '../data/consulting';
import { projects } from '../data/projects';
import { workStories } from '../data/workStories';
import '../styles/home-consulting.css';

const project = id => projects.find(p => p.id === id);

// Matches tracked reads better as 1.6M than 1,634,956 on a card.
const short = value => {
  const n = Number(String(value).replace(/,/g, ''));
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : value;
};

// Three wide cards: BumbleJax, then FaB Stats and Old Ways Today, each with its
// figures. BumbleJax has no project page on this site, so its card links to the
// store, and its figures are the ones BumbleJax publishes on its home page; the
// other two take theirs from projects.js.
const FEATURES = [
  {
    id: 'bumblejax', name: 'BumbleJax', href: 'https://www.bumblejax.com/', linkLabel: 'Visit bumblejax.com',
    label: 'E-commerce · Fine art prints',
    summary: 'A Seattle print shop’s online store for museum-quality fine art prints. I built and maintain the platform it runs on, from the storefront and checkout to order emails, shipping labels and marketing integrations.',
    stats: [['15K+', 'creators served'], ['90K+', 'pieces of art printed'], ['99%', 'satisfaction rate']],
    source: 'Figures from bumblejax.com.',
    preview: { src: '/images/work-bumblejax.jpg', alt: 'The BumbleJax storefront.', width: 1280, height: 820 },
  },
  ...['fab-stats', 'old-ways-today'].map(id => {
    const { title, proof } = project(id);
    return {
      id, name: title, to: '/projects/' + id, linkLabel: 'Explore the work', ...workStories[id],
      stats: proof.items.map(item => [short(item.value), item.label]),
      source: `As of ${proof.asOf}.`,
    };
  }),
];

export default function Home() {
  const { githubStats, loading: githubLoading } = useGithubStats();

  return <Layout>
    <Seo path="/" description="I build software people use, and I keep it running. Principal software engineer in the Seattle area." />
    <div className="home-consulting">
      <div className="consult-container"><HomeHero /></div>

      {/* GitHub activity right under the hero, where the FaB Stats counts used to be. */}
      <div className="azoni-telemetry"><CommitStats githubStats={githubStats} loading={githubLoading} compact /><div className="azoni-live-link consult-container"><span>Curious about what&rsquo;s running behind the scenes?</span><Link className="consult-text-link" to="/live">Explore the live dashboard <ArrowRight size={16} aria-hidden="true" /></Link></div></div>

      <section className="azoni-work consult-container" aria-labelledby="selected-work-heading">
        <div className="azoni-section-heading">
          <div><p className="consult-eyebrow">Selected work</p><h2 id="selected-work-heading">What I&rsquo;ve built and maintained</h2></div>
          <Link className="consult-text-link" to="/projects">Explore all work <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        {FEATURES.map((work, index) => {
          const card = <>
            <div className="azoni-work-image"><img src={work.preview.src} alt={work.preview.alt} width={work.preview.width || 1280} height={work.preview.height || 820} loading="lazy" /></div>
            <div className="azoni-work-feature-body">
              <p className="azoni-work-label">{work.label}</p>
              <div className="azoni-work-title"><h3>{work.name}</h3><ArrowUpRight size={24} aria-hidden="true" /></div>
              <p className="azoni-work-summary">{work.summary}</p>
              <dl className="azoni-work-stats">
                {work.stats.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <p className="azoni-work-source">{work.source}</p>
              <span className="azoni-work-read">{work.linkLabel} {work.href ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}</span>
            </div>
          </>;
          const className = `azoni-work-feature${index % 2 ? ' azoni-work-feature--flip' : ''}`;
          return work.href
            ? <a className={className} href={work.href} target="_blank" rel="noopener noreferrer" key={work.id}>{card}</a>
            : <Link className={className} to={work.to} key={work.id}>{card}</Link>;
        })}
      </section>

      <section className="azoni-background consult-container" aria-labelledby="background-heading">
        <div><p className="consult-eyebrow">Background</p><h2 id="background-heading">How I got here</h2></div>
        <div>
          <p>I spent my college weekends at hackathons and co-founded OLI Fitness. I earned a master&rsquo;s degree while working at <span className="azoni-nowrap">T-Mobile</span>, then worked as a senior software engineer at Capital One. Over the last few years I&rsquo;ve gone deep into AI, building and running products of my own.</p>
          <div className="azoni-person-links">
            <Link className="consult-text-link" to="/about">My story and experience <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link className="consult-text-link" to={resumePath}>Resume <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="azoni-consulting consult-container" aria-labelledby="home-consulting-heading">
        <div><p className="consult-eyebrow">Consulting</p><h2 id="home-consulting-heading">Work with me through Azoni</h2></div>
        <div>
          <p>Through Azoni LLC, I consult on the three kinds of work described on the consulting page. You work directly with me, from the first conversation through implementation.</p>
          <Link className="consult-text-link" to="/services">How consulting works <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  </Layout>;
}
