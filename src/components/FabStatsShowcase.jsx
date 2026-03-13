import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getCountFromServer, getAggregateFromServer, sum } from 'firebase/firestore';

// FabStats Firebase config (public — embedded in client bundle)
const FABSTATS_CONFIG = {
  apiKey: "AIzaSyAT1dymWqysGaLip6dL8m0F6UDfqnIpoS8",
  authDomain: "fab-stats-fc757.firebaseapp.com",
  projectId: "fab-stats-fc757",
  storageBucket: "fab-stats-fc757.firebasestorage.app",
  messagingSenderId: "769863611057",
  appId: "1:769863611057:web:a1908af50e8e149b22e890",
};

// Initialize a named second Firebase app for FabStats
let fabDb = null;
try {
  const existing = getApps().find(a => a.name === 'fabstats');
  const fabApp = existing || initializeApp(FABSTATS_CONFIG, 'fabstats');
  fabDb = getFirestore(fabApp);
} catch {
  // silently fail if Firebase init fails
}

const FabStatsShowcase = ({ onStats } = {}) => {
  const [stats, setStats] = useState({ users: 0, matches: 0, heroes: 0 });
  const [loading, setLoading] = useState(true);
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  useEffect(() => {
    if (!fabDb) { setLoading(false); return; }

    const fetchStats = async () => {
      try {
        const [userSnap, matchSnap, heroSnap] = await Promise.all([
          getCountFromServer(collection(fabDb, 'usernames')),
          getAggregateFromServer(collection(fabDb, 'leaderboard'), { total: sum('totalMatches') }),
          getCountFromServer(collection(fabDb, 'heroMatchups')),
        ]);

        const userCount = userSnap.data().count;
        setStats({
          users: userCount,
          matches: matchSnap.data().total,
          heroes: heroSnap.data().count,
        });
        if (onStatsRef.current) onStatsRef.current({ users: userCount, matches: matchSnap.data().total });
      } catch (err) {
        console.error('FabStats fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatNumber = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k+`;
    return n.toString();
  };

  return (
    <section className="showcase-section">
      <div className="container">
        <div className="fabstats-showcase">
          {/* Left accent */}
          <div className="fabstats-accent" />

          <div className="fabstats-body">
            {/* Header */}
            <div className="fabstats-header">
              <div className="fabstats-header-left">
                <div className="fabstats-icon-wrap">
                  <img src="/images/fabstats-icon.svg" alt="FaB Stats" className="fabstats-icon" />
                </div>
                <div>
                  <div className="fabstats-title-row">
                    <h3>FaB Stats</h3>
                    <span className="fabstats-badge">Live</span>
                  </div>
                  <span className="fabstats-tagline">Competitive TCG match tracking and analytics for Flesh and Blood</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="fabstats-desc">
              Full-stack platform with {stats.users > 0 ? stats.users.toLocaleString() : '2,500+'} registered users.
              Players import matches via Chrome extension, track win rates across heroes and formats,
              and compete on community leaderboards. Features an AI chat assistant with full player context,
              hero matchup analytics, messaging, and event walls.
            </p>

            {/* Live Stats Grid */}
            <div className="fabstats-stats-grid">
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">
                  {loading ? '...' : formatNumber(stats.users)}
                </span>
                <span className="fabstats-stat-label">Players</span>
              </div>
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">
                  {loading ? '...' : formatNumber(stats.matches)}
                </span>
                <span className="fabstats-stat-label">Matches Tracked</span>
              </div>
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">
                  {loading ? '...' : stats.heroes > 0 ? stats.heroes : '200+'}
                </span>
                <span className="fabstats-stat-label">Hero Matchups</span>
              </div>
              <div className="fabstats-stat">
                <span className="fabstats-stat-value">AI</span>
                <span className="fabstats-stat-label">Chat Assistant</span>
              </div>
            </div>

            {/* Highlights */}
            <div className="fabstats-highlights">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                Chrome extension auto-imports matches from tournaments
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
                Community hero matchup matrix aggregated across all users
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                AI chat assistant answers questions about your stats and meta
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                Messaging, activity feeds, friend system, and event walls
              </span>
            </div>

            {/* Tech Tags */}
            <div className="fabstats-tech">
              <span>Next.js 14</span>
              <span>TypeScript</span>
              <span>Firebase</span>
              <span>Claude API</span>
              <span>Tailwind CSS</span>
              <span>Chrome Extension</span>
            </div>

            {/* Actions */}
            <div className="fabstats-actions">
              <a href="https://fabstats.net" target="_blank" rel="noopener noreferrer" className="fabstats-action fabstats-action-primary">
                Visit fabstats.net
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              </a>
              <a href="https://github.com/azoni/fab-stats" target="_blank" rel="noopener noreferrer" className="fabstats-action">
                View Source
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FabStatsShowcase;
