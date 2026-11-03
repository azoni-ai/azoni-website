import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import HomeHero from '../components/home/HomeHero';
import { bookingCta, consulting, meetLive, projectEmailHref, resumePath } from '../data/consulting';
import { projects } from '../data/projects';
import { workStories } from '../data/workStories';
import '../styles/home-consulting.css';

// FaB Stats first; a story without a screenshot is skipped rather than shown broken.
const WORK = ['fab-stats', 'old-ways-today', 'embedroute']
  .map(id => ({ id, name: projects.find(project => project.id === id)?.title, ...workStories[id] }))
  .filter(work => work.name && work.preview?.src);

export default function Home() {
  return <Layout>
    <Seo path="/" description="I build and run AI products and the infrastructure behind them. Principal software engineer in the Seattle area." />
    <div className="home-consulting">
      <div className="consult-container"><HomeHero /></div>

      <section className="azoni-work consult-container" aria-labelledby="selected-work-heading">
        <div className="azoni-section-heading">
          <div><p className="consult-eyebrow">Selected work</p><h2 id="selected-work-heading">Products I build and run</h2></div>
          <Link className="consult-text-link" to="/projects">Explore all work <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <p className="azoni-section-intro">I build and run each of these myself. Each page covers what I built and how it works.</p>
        <div className="azoni-work-grid">
          {WORK.map(work => <Link className="azoni-work-item" to={'/projects/' + work.id} key={work.id}>
            <div className="azoni-work-image"><img src={work.preview.src} alt={work.preview.alt} width="1280" height="820" loading="lazy" /></div>
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
          <p>I spent my college weekends at hackathons and co-founded OLI Fitness. I earned a master&rsquo;s degree while working at T-Mobile, then worked as a senior software engineer at Capital One. Over the last few years I&rsquo;ve gone deep into AI, building and running products of my own.</p>
          <div className="azoni-person-links">
            <Link className="consult-text-link" to="/about">My story and experience <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link className="consult-text-link" to={resumePath}>Résumé <ArrowRight size={16} aria-hidden="true" /></Link>
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

      <section className="azoni-next consult-container" aria-labelledby="home-next-heading">
        <div>
          <h2 id="home-next-heading">Want to talk?</h2>
          <p>{meetLive ? 'Pick a time for a 30-minute call, or send me an email.' : 'Send me an email about what you have in mind.'}</p>
        </div>
        <div className="consult-actions">
          <Link className="consult-button" to={bookingCta.to}>{bookingCta.label} <ArrowRight size={17} aria-hidden="true" /></Link>
          <a className="consult-text-link" href={projectEmailHref}>{consulting.email} <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </section>
    </div>
  </Layout>;
}
