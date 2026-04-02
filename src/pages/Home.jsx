import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import AgentWorkspace from '../components/AgentWorkspace/AgentWorkspace';
import { useFabStats } from '../hooks/useFabStats';

const Home = () => {
  const [githubStats, setGithubStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [appStats, setAppStats] = useState(null);
  const { users: fabUserCount, matches: fabMatchCount } = useFabStats();

  // Fetch profile from Firestore
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'content', 'profile');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, []);

  // Fetch GitHub stats
  useEffect(() => {
    const fetchGithubStats = async () => {
      try {
        const res = await fetch('/.netlify/functions/github-stats');
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const data = await res.json();
        if (!data.error) setGithubStats(data);
      } catch (_err) {
        // Silent fail in local/dev
      }
    };
    fetchGithubStats();
  }, []);

  // Fetch app metrics
  useEffect(() => {
    const fetchAppStats = async () => {
      try {
        const res = await fetch('/.netlify/functions/app-stats');
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const data = await res.json();
        if (!data.error) setAppStats(data);
      } catch (_err) {
        // Silent fail in local/dev
      }
    };
    fetchAppStats();
    const interval = setInterval(fetchAppStats, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const enrichedStats = useMemo(() => ({
    ...appStats,
    fabstats: { ...appStats?.fabstats, users: fabUserCount, matches: fabMatchCount },
  }), [appStats, fabUserCount, fabMatchCount]);

  return (
    <Layout>
      <div className="home-page" style={{ position: 'relative', zIndex: 1 }}>
        <section className="home-section home-section--flush">
          <div className="container">
            <AgentWorkspace appStats={enrichedStats} githubStats={githubStats} profile={profile} />
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Home;
