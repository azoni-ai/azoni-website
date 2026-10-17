import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import HomeHero from '../components/home/HomeHero';
import HeroChatPrompt from '../components/home/HeroChatPrompt';
import CommitStats from '../components/home/CommitStats';
import { services } from '../data/consulting';
import { workStories } from '../data/workStories';
import { GITHUB_STATS_URL, isContributionPayload } from '../utils/githubTelemetry';
import '../styles/home-v2.css';
import '../styles/home-consulting.css';

const WORK = [
  { id: 'embedroute', name: 'EmbedRoute', image: '/images/work-embedroute.jpg', summary: 'One API for multiple embedding providers, plus a lab to compare models on your own data.' },
  { id: 'fab-stats', name: 'FaB Stats', image: '/images/work-fabstats.jpg', summary: 'Tournament imports, match analytics, and community tools in one connected product.' },
  { id: 'old-ways-today', name: 'Old Ways Today', image: '/images/work-oldways.jpg', summary: 'An interactive household guide with a knowledge-based AI assistant and product discovery.' },
];

export default function Home() {
  const [githubStats, setGithubStats] = useState(null);
  const [githubLoading, setGithubLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    fetch(GITHUB_STATS_URL, { signal: controller.signal })
      .then(async response => {
        if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Unavailable');
        const data = await response.json();
        if (data.error || !isContributionPayload(data)) throw new Error('Unavailable');
        if (active) setGithubStats(data);
      })
      .catch(() => { if (active) setGithubStats(null); })
      .finally(() => { clearTimeout(timeout); if (active) setGithubLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);

  return <Layout>
    <Seo path="/" description="Azoni is Charlton Smith's software and AI consulting business. Helping businesses of any size improve how they work through software, automation, and practical AI." />
    <div className="home-consulting">
      <div className="consult-container"><HomeHero /></div>

      <section className="azoni-work consult-container" aria-labelledby="selected-work-heading">
        <div className="azoni-section-heading">
          <div><p className="consult-eyebrow">Selected work</p><h2 id="selected-work-heading">Built. Shipped. Still improving.</h2></div>
          <Link className="consult-text-link" to="/projects">Explore all work <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <p className="azoni-section-intro">Independent products I design, build, and operate. A closer look at how I turn an idea into working software.</p>
        <div className="azoni-work-grid">
          {WORK.map(work => <Link className="azoni-work-item" to={'/projects/' + work.id} key={work.id}>
            <div className="azoni-work-image"><img src={work.image} alt={`${work.name} website preview`} width="1280" height="820" loading="lazy" /></div>
            <p className="azoni-work-label">{workStories[work.id].label}</p>
            <div className="azoni-work-title"><h3>{work.name}</h3><ArrowUpRight size={21} aria-hidden="true" /></div>
            <p className="azoni-work-summary">{work.summary}</p>
            <span className="azoni-work-read">Explore the work <ArrowRight size={14} aria-hidden="true" /></span>
          </Link>)}
        </div>
      </section>

      <section className="azoni-services consult-container" aria-labelledby="home-help-heading">
        <div className="azoni-section-heading">
          <div><p className="consult-eyebrow">How I can help</p><h2 id="home-help-heading">Start with what slows you down.</h2></div>
          <Link className="consult-text-link" to="/services">Services &amp; approach <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="azoni-service-list">{services.map(service => <Link to={'/services#' + service.id} className="azoni-service-row" key={service.id}><span className="azoni-service-number">{service.number}</span><h3>{service.title}</h3><p>{service.summary}</p><ArrowUpRight size={21} aria-hidden="true" /></Link>)}</div>
      </section>

      <section className="azoni-background consult-container" aria-labelledby="background-heading">
        <div><p className="consult-eyebrow">The engineer behind the work</p><h2 id="background-heading">Curious by nature.<br />Hands-on by choice.</h2></div>
        <div><p>College weekends at hackathons. A master&rsquo;s degree while working at T-Mobile. Engineering at Capital One. And the last few years deep in AI, building and running products of my own.</p><p>Today, I work with a client as a principal software engineer with a strong AI focus. Through Azoni, I bring that experience to businesses looking for a better way to work.</p><Link className="consult-text-link" to="/about">My story &amp; experience <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </section>

      <div className="azoni-telemetry"><CommitStats githubStats={githubStats} loading={githubLoading} compact /><div className="azoni-live-link consult-container"><span>Curious about what&rsquo;s running behind the scenes?</span><Link className="consult-text-link" to="/live">Explore the live dashboard <ArrowRight size={16} aria-hidden="true" /></Link></div></div>

      <section className="azoni-assistant consult-container" aria-labelledby="home-assistant-heading">
        <div><p className="consult-eyebrow">Try something I built</p><h2 id="home-assistant-heading">Meet the Azoni assistant.</h2><p>Ask about my work, explore where AI might help your business, or see a practical example of an assistant grounded in real project knowledge.</p><Link className="consult-text-link" to="/chat">Open the full chat <ArrowRight size={16} aria-hidden="true" /></Link><span className="azoni-assistant-note">AI-generated answers. For scope and availability, talk to me directly.</span></div>
        <HeroChatPrompt />
      </section>

      <section className="azoni-contact consult-container"><div><p className="consult-eyebrow">Let&rsquo;s talk</p><h2>What could work better<br />in your business?</h2><p>An idea, a repetitive process, or a system you&rsquo;ve outgrown. Start there.</p></div><Link className="consult-button" to="/contact">Email me <ArrowUpRight size={18} aria-hidden="true" /></Link></section>
    </div>
  </Layout>;
}
