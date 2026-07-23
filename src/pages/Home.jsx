import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import HomeHero from '../components/home/HomeHero';
import HeroChatPrompt from '../components/home/HeroChatPrompt';
import CommitStats from '../components/home/CommitStats';
import LivePulseStrip from '../components/home/LivePulseStrip';
import ProductCard from '../components/ProductCard';
import CareerSection from '../components/CareerSection';
import EducationSection from '../components/EducationSection';
import ContactBand from '../components/home/ContactBand';
import { getFeaturedProjects } from '../data/projects';
import useProductMetrics from '../hooks/useProductMetrics';
import '../styles/home-v2.css';
import '../styles/products-warm.css';

// Portfolio-first, proof-led landing: identity (hero + live chat) → a live
// activity pulse (actively shipping) → selected live products with real
// metrics → experience → education. The deeper live-ops surfaces live on /live.

const FEATURED_LIMIT = 6;

const Home = () => {
  const [profile, setProfile] = useState(null);
  const [githubStats, setGithubStats] = useState(null);
  const productMetrics = useProductMetrics();
  const metricsMap = productMetrics?.map || {};

  const featured = getFeaturedProjects()
    .filter((p) => !p.archived)
    .slice(0, FEATURED_LIMIT);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'content', 'profile'));
        if (snap.exists()) setProfile(snap.data());
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/github-stats');
        if (!res.ok) return;
        if (!(res.headers.get('content-type') || '').includes('application/json')) return;
        const data = await res.json();
        if (!data.error) setGithubStats(data);
      } catch (_err) { /* silent */ }
    })();
  }, []);

  return (
    <Layout>
      <Seo
        path="/"
        description="Charlton Smith — software engineer in Seattle building AI products and the infrastructure they run on. FaB Stats (2,900+ users), a live agent stack, and 15+ shipped apps, instrumented in public."
      />
      <div className="home-page-v2">
        <HomeHero profile={profile} aside={<HeroChatPrompt />} />

        <CommitStats githubStats={githubStats} />

        <section className="home-featured">
          <div className="home-featured-inner">
            <header className="home-featured-head">
              <div>
                <p className="home-featured-eyebrow">Selected work</p>
                <h2 className="home-featured-heading">Products, live &mdash; not screenshots</h2>
              </div>
              <Link to="/projects" className="home-featured-link">
                All projects &rarr;
              </Link>
            </header>
            <div className="product-grid">
              {featured.map((project) => (
                <ProductCard key={project.id} project={project} metrics={metricsMap[project.id]} />
              ))}
            </div>
          </div>
        </section>

        <LivePulseStrip githubStats={githubStats} />

        <CareerSection />
        <EducationSection />
        <ContactBand profile={profile} />
      </div>
    </Layout>
  );
};

export default Home;
