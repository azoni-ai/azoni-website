import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import HomeHero from '../components/home/HomeHero';
import HeroChatPrompt from '../components/home/HeroChatPrompt';
import ProjectShowcase from '../components/ProjectShowcase';
import CareerSection from '../components/CareerSection';
import EducationSection from '../components/EducationSection';
import '../styles/home-v2.css';
import '../styles/project-showcase.css';

// Portfolio-first landing: identity (hero + live chat demo) → the work
// (project showcase) → experience → education. The live-ops surfaces
// (agent activity, commits, traffic, "how it runs") now live on /live so the
// home page reads as a curated portfolio rather than a dashboard.

const Home = () => {
  const [profile, setProfile] = useState(null);
  const [appStats, setAppStats] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'content', 'profile');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setProfile(docSnap.data());
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchAppStats = async () => {
      try {
        const res = await fetch('/.netlify/functions/app-stats');
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const data = await res.json();
        if (!data.error) setAppStats(data);
      } catch (_err) { /* silent */ }
    };
    fetchAppStats();
    const id = setInterval(fetchAppStats, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Layout>
      <div className="home-page-v2">
        <HomeHero profile={profile} aside={<HeroChatPrompt />} />
        <ProjectShowcase appStats={appStats} />
        <CareerSection />
        <EducationSection />
      </div>
    </Layout>
  );
};

export default Home;
