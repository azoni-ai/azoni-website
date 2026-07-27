import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import HomeHero from '../components/home/HomeHero';
import HeroChatPrompt from '../components/home/HeroChatPrompt';
import CommitStats from '../components/home/CommitStats';
import LivePreview from '../components/home/LivePreview';
import LivePulseStrip from '../components/home/LivePulseStrip';
import CareerSection from '../components/CareerSection';
import EducationSection from '../components/EducationSection';
import ContactBand from '../components/home/ContactBand';
import '../styles/home-v2.css';

// Proof-led landing: identity (hero + live chat) → commit activity → a preview
// of the live ecosystem (top sites + agents, links into /live) → recent
// activity → experience → education → contact.

const Home = () => {
  const [profile, setProfile] = useState(null);
  const [githubStats, setGithubStats] = useState(null);

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
        description="Charlton Smith, a software engineer in Seattle. I build AI products and the infrastructure behind them: FaB Stats (2,900+ users), a live agent stack, and 15+ apps."
      />
      <div className="home-page-v2">
        <HomeHero profile={profile} aside={<HeroChatPrompt />} />

        <CommitStats githubStats={githubStats} />

        <LivePreview />

        <LivePulseStrip githubStats={githubStats} />

        <CareerSection />
        <EducationSection />
        <ContactBand profile={profile} />
      </div>
    </Layout>
  );
};

export default Home;
