import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import InteractiveBackground from '../components/InteractiveBackground';
import CollapsibleSection from '../components/CollapsibleSection';
import AgentWorkspace from '../components/AgentWorkspace/AgentWorkspace';

import FabStatsShowcase from '../components/FabStatsShowcase';
import BenchRowCrewShowcase from '../components/BenchRowCrewShowcase';
import OldWaysTodayShowcase from '../components/OldWaysTodayShowcase';
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

  const [healthStatus, setHealthStatus] = useState(null);
  const [appStats, setAppStats] = useState(null);
  const [fabUserCount, setFabUserCount] = useState(0);

  const heroRef = useRef(null);

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

  // Fetch latest health check from orchestrator
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const healthRef = collection(db, 'health_checks');
        const q = query(healthRef, orderBy('timestamp', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const status = {};
          (data.services || []).forEach(s => {
            if (s.name === 'Moltbook Agent') status.moltbook = s.status;
            if (s.name === 'OWT Backend' || s.name === 'oldwaystoday.com') status.oldways = s.status;
            if (s.name === 'MCP Server') status.mcp = s.status;
          });
          setHealthStatus(status);
        }
      } catch (err) {
        // Permission is expected for some local/dev Firebase rule setups.
        if (err?.code === 'permission-denied' || /insufficient permissions/i.test(err?.message || '')) {
          return;
        }
        console.error('Failed to fetch health status:', err);
      }
    };
    fetchHealth();
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

  // Mouse tracking for hero glow effect — uses ref to avoid re-rendering whole page
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
        heroRef.current.style.setProperty('--mouse-x', `${x}%`);
        heroRef.current.style.setProperty('--mouse-y', `${y}%`);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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

  const formatCountOrLive = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num.toLocaleString() : 'Live';
  };

  const combinedFitnessUsers = Number(appStats?.benchpressonly?.users || 0) + Number(appStats?.rowcrew?.uniqueRowers || 0);

  return (
    <Layout>
      <InteractiveBackground />
      
      <div className="home-page">
        {/* Hero */}
        <section className="hero" ref={heroRef}>
          <div className="hero-glow" />
          
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

              <div className="hero-ai-badge">
                <div className="ai-badge-glow"></div>
                <div className="ai-badge-content">
                  <span className="ai-badge-dot"></span>
                  <span className="ai-badge-text">3 Agents Live</span>
                </div>
                <p className="ai-badge-subtext">Autonomous decisions every 3 hours</p>
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

        {/* ===== NARRATIVE INTRO ===== */}
        <section className="narrative-section">
          <div className="container">
            <p className="narrative-text">
              This portfolio runs itself — 3 AI agents autonomously write blog posts, manage social presence,
              and coordinate data across 8+ live products. Every section below is backed by real systems, real users, and real-time data.
            </p>
          </div>
        </section>

        {/* ===== COLLAPSIBLE SECTIONS ===== */}
        <div className="collapsible-wrapper">

        {/* ===== 1. THE AGENT SYSTEM (merged map + agents) ===== */}
        <CollapsibleSection
          title="The Agent System"
          subtitle="3 autonomous AI agents running this site — real-time map + architecture"
          badge="Live"
          badgeType="live"
          defaultOpen={true}
        >
          <section className="showcase-section">
            <div className="container">
              <AgentWorkspace />
            </div>
          </section>
        </CollapsibleSection>

        {/* ===== 2. FABSTATS ===== */}
        <CollapsibleSection
          title="FaB Stats"
          subtitle="Live match tracking platform for competitive Flesh and Blood players"
          badge={fabUserCount > 0 ? `${fabUserCount.toLocaleString()} players` : 'Live'}
          badgeType="live"
          defaultOpen={true}
          stats={[
            { value: 'fabstats.net', label: '' }
          ]}
        >
          <FabStatsShowcase onStats={({ users }) => setFabUserCount(users)} />
        </CollapsibleSection>

        {/* ===== 3. FITNESS PLATFORM ===== */}
        <CollapsibleSection
          title="BenchPressOnly + RowCrew"
          subtitle="AI-powered strength training and rowing apps with real users"
          badge={`${formatCountOrLive(combinedFitnessUsers)} users`}
          badgeType="count"
          defaultOpen={false}
          stats={[
            { value: formatCountOrLive(combinedFitnessUsers), label: 'users' },
            { value: formatCountOrLive(appStats?.rowcrew?.sessions), label: 'rows' }
          ]}
        >
          <BenchRowCrewShowcase stats={appStats} />
        </CollapsibleSection>

        {/* ===== 4. OLD WAYS TODAY ===== */}
        <CollapsibleSection
          title="Old Ways Today"
          subtitle="Standalone AI wellness product — same agent architecture, different domain"
          badge="Product"
          badgeType="count"
          defaultOpen={false}
          stats={[
            { value: formatCountOrLive(appStats?.oldwaystoday?.requests), label: 'requests' }
          ]}
        >
          <OldWaysTodayShowcase stats={appStats} healthStatus={healthStatus} />
        </CollapsibleSection>

        {/* ===== 5. MORE PROJECTS (deduplicated — only Spell Brigade + Moltbook) ===== */}
        <CollapsibleSection
          title="More Projects"
          subtitle="AI-powered gaming and autonomous social presence"
          badge="2 Apps"
          badgeType="count"
          defaultOpen={false}
        >
        <section className="showcase-section">
          <div className="container">
            <div className="showcase-grid">

              <div className="showcase-card">
                <div className="showcase-card-accent" style={{ background: '#c084fc' }} />
                <div className="showcase-card-body">
                  <div className="showcase-card-header">
                    <div className="showcase-icon" style={{ background: 'rgba(192,132,252,0.12)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                    </div>
                    <div>
                      <div className="showcase-title-row">
                        <h3>Spell Brigade</h3>
                        <span className="showcase-status showcase-status-purple">Playable</span>
                      </div>
                      <span className="showcase-tagline">AI wizard combat game</span>
                    </div>
                  </div>
                  <p className="showcase-desc">
                    Real-time multiplayer wizard combat. AI generates unique characters with custom abilities
                    and backstories. Fight through dungeons with AI-driven enemies.
                  </p>
                  <div className="showcase-tech">
                    <span>Canvas 2D</span>
                    <span>Socket.io</span>
                    <span>GPT-4o-mini</span>
                    <span>Node.js</span>
                  </div>
                  <div className="showcase-actions">
                    <Link to="/game" className="showcase-action showcase-action-primary">Play Now</Link>
                  </div>
                </div>
              </div>

              <div className="showcase-card">
                <div className="showcase-card-accent" style={{ background: '#fb923c' }} />
                <div className="showcase-card-body">
                  <div className="showcase-card-header">
                    <div className="showcase-icon" style={{ background: 'rgba(251,146,60,0.12)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                    </div>
                    <div>
                      <div className="showcase-title-row">
                        <h3>Moltbook</h3>
                        {healthStatus?.moltbook === 'down' || healthStatus?.moltbook === 'degraded' ? (
                          <span className="showcase-status showcase-status-red">Offline</span>
                        ) : (
                          <span className="showcase-status showcase-status-orange">Autonomous</span>
                        )}
                      </div>
                      <span className="showcase-tagline">AI social presence</span>
                    </div>
                  </div>
                  <p className="showcase-desc">
                    The orchestrator decides when to post based on activity gaps and new content. LLM generates
                    posts, comments, and engagement — all triggered autonomously, not on a fixed schedule.
                  </p>
                  <div className="showcase-tech">
                    <span>Render</span>
                    <span>Orchestrator</span>
                    <span>LLM Content</span>
                    <span>REST API</span>
                  </div>
                  <div className="showcase-actions">
                    <Link to="/moltbook" className="showcase-action">View Agent</Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
        </CollapsibleSection>

        {/* ===== 6. TOOLS & SERVICES ===== */}
        <CollapsibleSection
          title="Tools & Services"
          subtitle="APIs powering the agent ecosystem — MCP data server, RAG chatbot, and unified embeddings"
          badge="3 APIs"
          badgeType="count"
          defaultOpen={false}
        >
        <section className="services-section">
          <div className="container">
            <div className="section-header">
              <h2>Services</h2>
            </div>
            <div className="services-grid">
              <Link to="/projects/azoni-mcp" className="service-card">
                <div className="service-card-accent" style={{ background: 'var(--accent-primary)' }} />
                <div className="service-card-body">
                  <div className="service-card-header">
                    <div className="service-icon" style={{ background: 'rgba(255,122,92,0.12)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </div>
                    <h3>MCP Data Server</h3>
                    <span className="service-status">Live</span>
                  </div>
                  <p>Exposes live fitness data, project stats, and activity logs to AI agents and the orchestrator via Model Context Protocol.</p>
                  <div className="service-tech">
                    <span>Node.js</span>
                    <span>REST API</span>
                    <span>Firebase</span>
                    <span>Render</span>
                  </div>
                </div>
              </Link>

              <Link to="/chat" className="service-card">
                <div className="service-card-accent" style={{ background: '#8b5cf6' }} />
                <div className="service-card-body">
                  <div className="service-card-header">
                    <div className="service-icon" style={{ background: 'rgba(139,92,246,0.12)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    </div>
                    <h3>RAG Chatbot</h3>
                    <span className="service-status">Live</span>
                  </div>
                  <p>Intent detection routes queries to RAG knowledge base or live MCP endpoints. Paste a job description for AI-powered fit analysis.</p>
                  <div className="service-tech">
                    <span>OpenRouter</span>
                    <span>RAG</span>
                    <span>MCP</span>
                    <span>Firestore</span>
                  </div>
                </div>
              </Link>

              <a href="https://www.embedroute.com" target="_blank" rel="noopener noreferrer" className="service-card">
                <div className="service-card-accent" style={{ background: '#22d3ee' }} />
                <div className="service-card-body">
                  <div className="service-card-header">
                    <div className="service-icon" style={{ background: 'rgba(34,211,238,0.12)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    </div>
                    <h3>EmbedRoute</h3>
                    <span className="service-status">Live</span>
                  </div>
                  <p>Unified embedding API — one endpoint that routes to OpenAI, Cohere, Voyage, and more. Powers RAG and semantic search across all apps.</p>
                  <div className="service-tech">
                    <span>Node.js</span>
                    <span>REST API</span>
                    <span>Multi-provider</span>
                    <span>Standalone SaaS</span>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>
        </CollapsibleSection>

        {/* ===== 7. BACKGROUND (merged Experience + Earlier Work) ===== */}
        <CollapsibleSection
          title="Background"
          subtitle="7+ years at T-Mobile, Capital One, and startups — plus a 50-machine trading system and ACM publication"
          badge="7+ yrs"
          badgeType="count"
          defaultOpen={false}
        >
        <section className="experience-section">
          <div className="container">
            <div className="section-header"><h2>Experience</h2></div>
            <div className="earlier-work-grid">

              <div className="earlier-card">
                <div className="earlier-card-accent" style={{ background: '#e20074' }} />
                <div className="earlier-card-body">
                  <div className="earlier-card-header">
                    <div className="experience-icon" style={{ background: '#e20074' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                    </div>
                    <div>
                      <h3>T-Mobile</h3>
                      <span className="earlier-card-tagline">Software Engineer II · June 2018 – April 2022</span>
                    </div>
                  </div>
                  <p className="earlier-card-desc">
                    Built an internal automation platform that consolidated 4-5 separate tools into a single interface,
                    reducing manual work for network operations teams by over 80%. Migrated the frontend from Django
                    templates to Angular with reusable components and contributed to the org-wide migration from Jenkins
                    to GitLab CI/CD.
                  </p>
                  <div className="earlier-card-highlights">
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg> Reduced manual work by 80%</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> Consolidated 4-5 tools into one</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e20074" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> Cross-functional enterprise teams</span>
                  </div>
                  <div className="earlier-card-stats">
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">4 yr</span>
                      <span className="earlier-stat-label">Tenure</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">80%</span>
                      <span className="earlier-stat-label">Work reduced</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">4-5</span>
                      <span className="earlier-stat-label">Tools unified</span>
                    </div>
                  </div>
                  <div className="earlier-card-tech">
                    <span>Python</span>
                    <span>Django</span>
                    <span>Angular</span>
                    <span>PostgreSQL</span>
                    <span>GitLab CI/CD</span>
                  </div>
                </div>
              </div>

              <div className="earlier-card">
                <div className="earlier-card-accent" style={{ background: '#004977' }} />
                <div className="earlier-card-body">
                  <div className="earlier-card-header">
                    <div className="experience-icon" style={{ background: '#004977' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </div>
                    <div>
                      <h3>Capital One</h3>
                      <span className="earlier-card-tagline">Senior Software Engineer · Nov 2022 – Nov 2023</span>
                    </div>
                  </div>
                  <p className="earlier-card-desc">
                    Maintained and extended automated testing infrastructure for customer email notifications across the
                    financial services platform. Designed a JSON schema system so new test cases could be added without
                    code changes — test definitions stored in S3, executed via Lambda, results piped to CloudWatch.
                    Mentored a summer intern from project scoping through to production deployment.
                  </p>
                  <div className="earlier-card-highlights">
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg> Zero-code test authoring via JSON schema</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> Mentored intern to production deployment</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#004977" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Regulated financial services environment</span>
                  </div>
                  <div className="earlier-card-stats">
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">Sr.</span>
                      <span className="earlier-stat-label">Level</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">AWS</span>
                      <span className="earlier-stat-label">Platform</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">0-code</span>
                      <span className="earlier-stat-label">Test schema</span>
                    </div>
                  </div>
                  <div className="earlier-card-tech">
                    <span>AWS Lambda</span>
                    <span>S3</span>
                    <span>CloudWatch</span>
                    <span>Python</span>
                    <span>JSON Schema</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <section className="projects-section">
          <div className="container">
            <div className="section-header secondary">
              <h2>Earlier Work</h2>
              <Link to="/projects" className="view-all">All projects →</Link>
            </div>

            <div className="earlier-work-grid">
              <Link to="/projects/dustbunny" className="earlier-card">
                <div className="earlier-card-accent" style={{ background: '#f59e0b' }} />
                <div className="earlier-card-body">
                  <div className="earlier-card-header">
                    <img src="/images/dustbunny.png" alt="" className="earlier-card-icon" />
                    <div>
                      <h3>Dustbunny</h3>
                      <span className="earlier-card-tagline">Autonomous NFT Trading System · Solo Built</span>
                    </div>
                  </div>
                  <p className="earlier-card-desc">
                    Built a fully autonomous bidding system that tracked every collection on OpenSea in real-time,
                    distributed across 50 machines on a local network. A constant arms race — OpenSea added API keys,
                    changed their SDK, and shifted rate limits regularly. Other bots were competing for the same bids,
                    so the system had to adapt daily: monitoring floor prices, maintaining competitive bids, and
                    outmaneuvering rival algorithms — all while staying profitable.
                  </p>
                  <div className="earlier-card-highlights">
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg> Fully autonomous — no manual intervention</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Real-time bot-vs-bot competition</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Constant adaptation to API &amp; SDK changes</span>
                  </div>
                  <div className="earlier-card-stats">
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">50</span>
                      <span className="earlier-stat-label">Machines</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">2,500+</span>
                      <span className="earlier-stat-label">Req/min</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">All</span>
                      <span className="earlier-stat-label">OpenSea</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">6 mo</span>
                      <span className="earlier-stat-label">Profitable</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">1</span>
                      <span className="earlier-stat-label">Engineer</span>
                    </div>
                  </div>
                  <div className="earlier-card-tech">
                    <span>Node.js</span>
                    <span>Redis</span>
                    <span>OpenSea SDK</span>
                    <span>Docker</span>
                    <span>Etherscan API</span>
                    <span>Web3.js</span>
                  </div>
                </div>
              </Link>

              <Link to="/projects/oli-fitness" className="earlier-card">
                <div className="earlier-card-accent" style={{ background: '#22d3ee' }} />
                <div className="earlier-card-body">
                  <div className="earlier-card-header">
                    <img src="/images/oli.png" alt="" className="earlier-card-icon" />
                    <div>
                      <h3>OLI Fitness</h3>
                      <span className="earlier-card-tagline">Computer Vision Startup · Co-founder &amp; Engineer</span>
                    </div>
                  </div>
                  <p className="earlier-card-desc">
                    Co-founded a fitness startup straight out of college that used Microsoft Kinect to analyze
                    weightlifting form in real-time. Built the core tracking engine — 25 joint positions at 30fps,
                    scored against expert references and normalized across body types. Led a small team of 5 plus
                    interns through ACM publication, startup competitions, and an accelerator program until funding ran out.
                  </p>
                  <div className="earlier-card-highlights">
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg> Published at ACM CHI 2017</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 010-5C5.9 4 7 5 7 5s1.1-1 2.5-1a2.5 2.5 0 010 5H8"/><path d="M12 15l-3-3h6l-3 3z"/><rect x="9" y="15" width="6" height="6" rx="1"/></svg> Princeton Tiger Launch finalist</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b5de5" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> UW Business Plan Competition finalist</span>
                  </div>
                  <div className="earlier-card-stats">
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">ACM</span>
                      <span className="earlier-stat-label">Published</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">30fps</span>
                      <span className="earlier-stat-label">Tracking</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">25</span>
                      <span className="earlier-stat-label">Joints</span>
                    </div>
                    <div className="earlier-stat">
                      <span className="earlier-stat-value">5+</span>
                      <span className="earlier-stat-label">Team</span>
                    </div>
                  </div>
                  <div className="earlier-card-tech">
                    <span>C#</span>
                    <span>Kinect SDK</span>
                    <span>Computer Vision</span>
                    <span>Unity</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>
        </CollapsibleSection>

        </div>{/* end collapsible-wrapper */}
      </div>
    </Layout>
  );
};

export default Home;
