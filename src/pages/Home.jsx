import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import PixelTown from '../components/PixelTown/PixelTown';
import { useFabStats } from '../hooks/useFabStats';
import '../styles/bento.css';

const REPO_TO_SITE = {
  'rowing-tracker': 'https://rowcrew.netlify.app',
  'azoni-website': 'https://azoni.ai',
  'old-ways-today': 'https://oldwaystoday.com',
  'tcgdoku': 'https://tcgdoku.netlify.app',
  'dumarket': 'https://dumarket.netlify.app',
  'kalshi': 'https://kalshi.netlify.app',
  'benchonly': 'https://benchpressonly.com',
  'embedroute': 'https://www.embedroute.com',
};

const Home = () => {
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

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const enrichedStats = useMemo(() => ({
    ...appStats,
    fabstats: { ...appStats?.fabstats, users: fabUserCount, matches: fabMatchCount },
  }), [appStats, fabUserCount, fabMatchCount]);

  return (
    <Layout>
      <div className="home-page">
        {/* ===== COMPACT ACTIVITY ===== */}
        <section className="showcase-section activity-hero-section">
          <div className="container">
            <div className="activity-compact">
              <div className="activity-compact-header">
                <span className="showcase-section-label">Recent Activity</span>
                <div className="activity-compact-stats">
                  <span className="activity-compact-stat"><strong>{githubStats?.today || 0}</strong> today</span>
                  <span className="activity-compact-stat"><strong>{githubStats?.last7Days || 0}</strong> this week</span>
                  <span className="activity-compact-stat"><strong>{githubStats?.last30Days || 0}</strong> this month</span>
                </div>
              </div>
              <div className="commits-list">
                {githubStats?.recentCommits?.slice(0, 5).map((commit, i) => (
                  <div key={`${commit.sha}-${i}`} className="commit-row">
                    <span className="commit-msg">{commit.message}</span>
                    <div className="commit-meta">
                      {commit.isPrivate ? (
                        <span className="commit-repo">{commit.repo}</span>
                      ) : (
                        <a href={commit.repoUrl} target="_blank" rel="noopener noreferrer" className="commit-repo">
                          {commit.repo}
                        </a>
                      )}
                      {REPO_TO_SITE[commit.repo] && (
                        <a href={REPO_TO_SITE[commit.repo]} target="_blank" rel="noopener noreferrer" className="commit-live">↗</a>
                      )}
                      {commit.claudeCode && <span className="commit-claude">Claude Code</span>}
                      {commit.codexCode && <span className="commit-codex">Codex</span>}
                      {commit.branch && <span className="commit-branch">{commit.branch}</span>}
                      <span className="commit-time">{formatTimeAgo(commit.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="activity-compact-links">
                <Link to="/commits" className="activity-compact-link">View all commits →</Link>
                <Link to="/activity" className="activity-compact-link">View agent activity log →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== THE AGENT SYSTEM ===== */}
        <section className="home-section home-section--flush">
          <div className="container">
            <PixelTown appStats={enrichedStats} githubStats={githubStats} profile={profile} />
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Home;
