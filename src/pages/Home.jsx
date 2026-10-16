import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import HomeHero from '../components/home/HomeHero';
import HeroChatPrompt from '../components/home/HeroChatPrompt';
import CommitStats from '../components/home/CommitStats';
import LivePreview from '../components/home/LivePreview';
import LivePulseStrip from '../components/home/LivePulseStrip';
import CareerSection from '../components/CareerSection';
import EducationSection from '../components/EducationSection';
import { services } from '../data/consulting';
import { GITHUB_STATS_URL, isContributionPayload } from '../utils/githubTelemetry';
import '../styles/home-v2.css';

export default function Home() {
  const [githubStats, setGithubStats] = useState(null);
  const [githubUnavailable, setGithubUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    fetch(GITHUB_STATS_URL, { signal: controller.signal })
      .then(async response => {
        if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Unavailable');
        const data = await response.json();
        if (data.error || !isContributionPayload(data)) throw new Error('Unavailable');
        if (active) { setGithubStats(data); setGithubUnavailable(false); }
      })
      .catch(() => { if (active) setGithubUnavailable(true); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);

  return <Layout>
    <Seo path="/" description="Azoni is Charlton Smith's software and AI consulting business. Helping businesses of any size improve how they work through software, automation, and practical AI." />
    <div className="home-page-v2">
      <HomeHero aside={<HeroChatPrompt />} />
      <section className="home-help" aria-labelledby="home-help-heading">
        <div className="home-help-heading"><div><p className="consult-eyebrow">How I can help</p><h2 id="home-help-heading">Better ways to run your business.</h2></div><Link className="consult-text-link" to="/services">Explore services <ArrowRight size={16} /></Link></div>
        <div className="consult-services-grid">{services.map(service => <Link to={'/services#' + service.id} className="consult-service" key={service.id}><span className="consult-number">{service.number}</span><h3>{service.title}</h3><p>{service.summary}</p><ArrowRight className="consult-service-arrow" size={17} /></Link>)}</div>
      </section>
      {githubUnavailable ? <section className="home-telemetry-fallback"><h2>GitHub activity</h2><p>Live stats are temporarily unavailable.</p><a href="https://github.com/azoni" target="_blank" rel="noopener noreferrer">View my GitHub &nearr;</a></section> : <CommitStats githubStats={githubStats} />}
      <LivePreview />
      <LivePulseStrip githubStats={githubStats} />
      <CareerSection />
      <EducationSection />
      <section className="home-contact"><div><p className="consult-eyebrow">Let's talk</p><h2>What could work better?</h2><p>A small business, a growing team, or an established company &mdash; I&rsquo;d like to hear what you&rsquo;re working through.</p></div><Link className="home-hero-cta home-hero-cta--primary" to="/contact">Email me <ArrowRight size={17} /></Link></section>
    </div>
  </Layout>;
}
