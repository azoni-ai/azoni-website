import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import HomeHero from '../components/home/HomeHero';
import RecentActivityStrip from '../components/home/RecentActivityStrip';
import ProjectShowcase from '../components/ProjectShowcase';
import CareerSection from '../components/CareerSection';
import EducationSection from '../components/EducationSection';
import '../styles/home-v2.css';
import '../styles/project-showcase.css';

const Home = () => {
  const [profile, setProfile] = useState(null);
  const [githubStats, setGithubStats] = useState(null);

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
    const fetchGithubStats = async () => {
      try {
        const res = await fetch('/.netlify/functions/github-stats');
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const data = await res.json();
        if (!data.error) setGithubStats(data);
      } catch (_err) { /* silent */ }
    };
    fetchGithubStats();
  }, []);

  return (
    <Layout>
      <div className="home-page-v2">
        <HomeHero profile={profile} />
        <RecentActivityStrip githubStats={githubStats} />
        <ProjectShowcase />
        <CareerSection />
        <EducationSection />
      </div>
    </Layout>
  );
};

export default Home;
