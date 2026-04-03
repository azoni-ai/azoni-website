import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import PixelTown from '../components/PixelTown/PixelTown';
import { useFabStats } from '../hooks/useFabStats';

const Town = () => {
  const [githubStats, setGithubStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [appStats, setAppStats] = useState(null);
  const { users: fabUserCount, matches: fabMatchCount } = useFabStats();

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
    const interval = setInterval(fetchAppStats, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const enrichedStats = useMemo(() => ({
    ...appStats,
    fabstats: { ...appStats?.fabstats, users: fabUserCount, matches: fabMatchCount },
  }), [appStats, fabUserCount, fabMatchCount]);

  return (
    <Layout>
      <div className="construction-banner">
        <span className="construction-stripe" />
        <span>Under Construction — building the town</span>
        <span className="construction-stripe" />
      </div>
      <div className="home-page home-page--fullscreen home-page--has-banner">
        <PixelTown appStats={enrichedStats} githubStats={githubStats} profile={profile} />
      </div>
    </Layout>
  );
};

export default Town;
