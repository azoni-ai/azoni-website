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
const fab = project('fab-stats');
const dustbunny = project('dustbunny');
const oli = project('oli-fitness');

// FaB Stats is the largest product I run today; Dustbunny and OLI Fitness are
// the larger projects that came before it. Their text comes from projects.js. OLI Fitness
// has no photo, so its card shows its CHI 2017 paper instead.
const WORK = [
  { id: fab.id, name: fab.title, ...workStories[fab.id] },
  { id: dustbunny.id, name: dustbunny.title, label: `Distributed systems · ${dustbunny.facts.years}`, summary: dustbunny.description, preview: { ...dustbunny.photo, position: 'center 30%' } },
  { id: oli.id, name: oli.title, label: `Computer vision · ${oli.facts.years}`, summary: oli.description, fact: oli.metric },
];

export default function Home() {
  const { githubStats, loading: githubLoading } = useGithubStats();

  return <Layout>
    <Seo path="/" description="I build and run AI products and the infrastructure behind them. Principal software engineer in the Seattle area." />
    <div className="home-consulting">
      <div className="consult-container"><HomeHero /></div>

      {/* GitHub activity right under the hero, where the FaB Stats counts used to be. */}
      <div className="azoni-telemetry"><CommitStats githubStats={githubStats} loading={githubLoading} compact /><div className="azoni-live-link consult-container"><span>Curious about what&rsquo;s running behind the scenes?</span><Link className="consult-text-link" to="/live">Explore the live dashboard <ArrowRight size={16} aria-hidden="true" /></Link></div></div>

      <section className="azoni-work consult-container" aria-labelledby="selected-work-heading">
        <div className="azoni-section-heading">
          <div><p className="consult-eyebrow">Selected work</p><h2 id="selected-work-heading">What I&rsquo;ve built</h2></div>
          <Link className="consult-text-link" to="/projects">Explore all work <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <p className="azoni-section-intro">FaB Stats is the largest product I run today. Dustbunny and OLI Fitness came before it.</p>
        <div className="azoni-work-grid">
          {WORK.map(work => <Link className="azoni-work-item" to={'/projects/' + work.id} key={work.id}>
            {work.fact
              ? <div className="azoni-work-image azoni-work-fact"><strong>{work.fact.value}</strong><span>{work.fact.label}</span></div>
              : <div className="azoni-work-image"><img src={work.preview.src} alt={work.preview.alt} width={work.preview.width || 1280} height={work.preview.height || 820} loading="lazy" style={work.preview.position ? { objectPosition: work.preview.position } : undefined} /></div>}
            <p className="azoni-work-label">{work.label}</p>
            <div className="azoni-work-title"><h3>{work.name}</h3><ArrowUpRight size={21} aria-hidden="true" /></div>
            <p className="azoni-work-summary">{work.summary}</p>
            <span className="azoni-work-read">Explore the work <ArrowRight size={14} aria-hidden="true" /></span>
          </Link>)}
        </div>
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
