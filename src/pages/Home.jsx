import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import AgentWorkspace from '../components/AgentWorkspace/AgentWorkspace';
import { useFabStats } from '../hooks/useFabStats';
import '../styles/bento.css';


// Map repo names to live sites
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
        // Silent fail in local/dev when functions or env vars are unavailable.
      }
    };
    fetchGithubStats();
  }, []);

  // Fetch app metrics for homepage product cards
  useEffect(() => {
    const fetchAppStats = async () => {
      try {
        const res = await fetch('/.netlify/functions/app-stats');
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const data = await res.json();
        if (!data.error) {
          setAppStats(data);
        }
      } catch (_err) {
        // Silent fail in local/dev when function env vars are unavailable.
      }
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
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  // Enrich appStats with FabStats user count (comes from separate Firebase)
  const enrichedStats = useMemo(() => ({
    ...appStats,
    fabstats: { ...appStats?.fabstats, users: fabUserCount, matches: fabMatchCount },
  }), [appStats, fabUserCount, fabMatchCount]);


  return (
    <Layout>
      <div className="home-page">
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <div className="hero-top">
              <div className="hero-intro">
                <h1 className="hero-name">{profile?.name || 'Charlton Smith'}</h1>
                <p className="hero-title">{profile?.tagline || 'Senior Software Engineer · AI Systems in Production'}</p>
                
                <div className="hero-meta">
                  <span className="meta-item">M.S. Software Engineering</span>
                  <span className="meta-dot">·</span>
                  <span className="meta-item">Previously Capital One, T-Mobile</span>
                  <span className="meta-dot">·</span>
                  <span className="meta-item">Co-founded OLI Fitness</span>
                </div>
              </div>

            </div>

          </div>
        </section>

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
                      {commit.claudeCode && (
                        <span className="commit-claude">Claude Code</span>
                      )}
                      {commit.codexCode && (
                        <span className="commit-codex">Codex</span>
                      )}
                      {commit.branch && (
                        <span className="commit-branch">{commit.branch}</span>
                      )}
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

        {/* ===== 1. THE AGENT SYSTEM ===== */}
        <section className="home-section home-section--flush">
          <div className="container">
            <AgentWorkspace appStats={enrichedStats} githubStats={githubStats} />
          </div>
        </section>

        {/* ===== 2. PROFESSIONAL EXPERIENCE ===== */}
        <section className="home-section">
          <div className="container">
            <div className="home-section-header">
              <div className="home-section-header-top">
                <div className="home-section-header-left">
                  <h2 className="home-section-title">Professional Experience</h2>
                  <span className="home-section-badge badge-count">7+ yrs</span>
                </div>
                <Link to="/resume" className="home-section-link">View resume →</Link>
              </div>
              <p className="home-section-subtitle">T-Mobile, Capital One, and startups — plus a 50-machine trading system and ACM publication</p>
            </div>
            <div className="experience-list">

              <div className="exp-entry">
                <div className="exp-where">
                  <img src="/images/tmobile-logo.svg" alt="T-Mobile" className="exp-logo" />
                  <div>
                    <h3>T-Mobile</h3>
                    <span className="exp-role">Software Engineer II · 2018 – 2022</span>
                  </div>
                </div>
                <p className="exp-desc">
                  Built an internal automation platform that consolidated 4-5 separate tools into a single interface,
                  reducing manual work for network operations teams by over 80%. Migrated the frontend from Django
                  templates to Angular with reusable components and contributed to the org-wide migration from Jenkins
                  to GitLab CI/CD.
                </p>
                <div className="exp-tech">
                  <span>Python</span><span>Django</span><span>Angular</span><span>PostgreSQL</span><span>GitLab CI/CD</span>
                </div>
              </div>

              <div className="exp-entry">
                <div className="exp-where">
                  <img src="/images/capitalone-logo.svg" alt="Capital One" className="exp-logo" />
                  <div>
                    <h3>Capital One</h3>
                    <span className="exp-role">Senior Software Engineer · 2022 – 2023</span>
                  </div>
                </div>
                <p className="exp-desc">
                  Designed a JSON schema system for automated email testing — new test cases added without code changes.
                  Definitions stored in S3, executed via Lambda, results piped to CloudWatch. Mentored a summer intern
                  from project scoping through to production deployment.
                </p>
                <div className="exp-tech">
                  <span>AWS Lambda</span><span>S3</span><span>CloudWatch</span><span>Python</span><span>JSON Schema</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        <section className="home-section">
          <div className="container">
            <div className="home-section-header">
              <div className="home-section-header-top">
                <div className="home-section-header-left">
                  <h2 className="home-section-title">Earlier Work</h2>
                </div>
                <Link to="/projects" className="home-section-link">All projects →</Link>
              </div>
            </div>

            <div className="experience-list">
              <Link to="/projects/dustbunny" className="exp-entry exp-entry--link">
                <div className="exp-where">
                  <img src="/images/dustbunny.png" alt="" className="exp-logo" />
                  <div>
                    <h3>Dustbunny</h3>
                    <span className="exp-role">Autonomous NFT Trading System · Solo</span>
                  </div>
                </div>
                <p className="exp-desc">
                  Fully autonomous bidding system distributed across 50 machines, tracking every collection on OpenSea
                  in real-time. A constant arms race against other bots and API changes — adapted daily to stay profitable
                  over 6 months.
                </p>
                <div className="exp-tech">
                  <span>Node.js</span><span>Redis</span><span>OpenSea SDK</span><span>Docker</span><span>Web3.js</span>
                </div>
              </Link>

              <Link to="/projects/oli-fitness" className="exp-entry exp-entry--link">
                <div className="exp-where">
                  <img src="/images/oli.png" alt="" className="exp-logo" />
                  <div>
                    <h3>OLI Fitness</h3>
                    <span className="exp-role">Co-founder &amp; Engineer · Computer Vision Startup</span>
                  </div>
                </div>
                <p className="exp-desc">
                  Built a real-time weightlifting form analyzer using Kinect — 25 joints at 30fps, scored against
                  expert references. Led a team of 5 through ACM CHI publication, Princeton Tiger Launch, and UW
                  Business Plan Competition before funding ran out.
                </p>
                <div className="exp-tech">
                  <span>C#</span><span>Kinect SDK</span><span>Computer Vision</span><span>Unity</span>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Home;
