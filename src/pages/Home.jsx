import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import InteractiveBackground from '../components/InteractiveBackground';
import AgentActivityFeed from '../components/AgentActivityFeed';
import CollapsibleSection from '../components/CollapsibleSection';

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

  const [latestBlog, setLatestBlog] = useState(null);
  const [agentActivityCount, setAgentActivityCount] = useState(0);

  const heroRef = useRef(null);

  // Fetch latest blog post
  useEffect(() => {
    const fetchLatestBlog = async () => {
      try {
        const blogRef = collection(db, 'blogPosts');
        const q = query(blogRef, where('published', '==', true), orderBy('publishedAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setLatestBlog({ id: doc.id, ...doc.data() });
        }
      } catch (err) {
        console.error('Failed to fetch latest blog:', err);
      }
    };
    fetchLatestBlog();
  }, []);

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

  // Fetch agent activity count (recent)
  useEffect(() => {
    const fetchActivityCount = async () => {
      try {
        const activityRef = collection(db, 'agent_activity');
        const q = query(activityRef, orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        // Count items from last 24h
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const recentCount = snapshot.docs.filter(d => {
          const ts = d.data().timestamp;
          const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
          return ms > cutoff;
        }).length;
        setAgentActivityCount(recentCount);
      } catch (err) {
        console.error('Failed to fetch activity count:', err);
      }
    };
    fetchActivityCount();
  }, []);

  // Fetch GitHub stats
  useEffect(() => {
    fetch('/.netlify/functions/github-stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setGithubStats(data);
      })
      .catch(err => console.error('Failed to fetch GitHub stats:', err));
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

            {/* Hero Stats */}
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">3</span>
                <span className="hero-stat-label">AI Agents</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">{githubStats?.last30Days || '–'}</span>
                <span className="hero-stat-label">Commits / Mo</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">{Object.keys(REPO_TO_SITE).length}</span>
                <span className="hero-stat-label">Live Apps</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== NARRATIVE STATEMENT ===== */}
        <section className="narrative-section">
          <div className="container">
            <p className="narrative-text">
              Three autonomous AI agents run this portfolio — an orchestrator that wakes up every 3 hours
              to make decisions, a blog writer that turns commits into posts, and a RAG chatbot that
              teaches itself new topics when stumped. I've spent 7+ years shipping production software at
              places like T-Mobile and Capital One. Now I build the AI systems that ship alongside me.
            </p>
          </div>
        </section>

        {/* ===== CTA ROW ===== */}
        <div className="cta-row">
          <Link to="/resume" className="cta-card">
            <div className="cta-card-icon" style={{ background: 'rgba(255,122,92,0.12)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff7a5c" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            </div>
            <div className="cta-card-text">
              <span className="cta-card-title">Resume</span>
              <span className="cta-card-sub">7+ years · T-Mobile, Capital One</span>
            </div>
          </Link>
          <Link to="/projects" className="cta-card">
            <div className="cta-card-icon" style={{ background: 'rgba(251,191,36,0.12)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <div className="cta-card-text">
              <span className="cta-card-title">Projects</span>
              <span className="cta-card-sub">{Object.keys(REPO_TO_SITE).length} live apps</span>
            </div>
          </Link>
          <Link to="/chat" className="cta-card cta-card-highlight">
            <div className="cta-card-icon" style={{ background: 'rgba(96,165,250,0.15)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <div className="cta-card-text">
              <span className="cta-card-title">Chat with my AI</span>
              <span className="cta-card-sub">RAG chatbot · Job fit analysis</span>
            </div>
          </Link>
        </div>

        {/* ===== THE 3 AGENTS ===== */}
        <section className="showcase-section">
          <div className="container">
            <div className="showcase-section-header">
              <span className="showcase-section-label">The Agents</span>
              <span className="showcase-section-sub">3 autonomous systems running this site right now</span>
            </div>
            <div className="showcase-grid showcase-grid-3">

              <Link to="/activity" className="showcase-card">
                <div className="showcase-card-accent" style={{ background: '#ff7a5c' }} />
                <div className="showcase-card-body">
                  <div className="showcase-card-header">
                    <div className="showcase-icon" style={{ background: 'rgba(255,122,92,0.12)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff7a5c" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                    </div>
                    <div>
                      <div className="showcase-title-row">
                        <h3>The Conductor</h3>
                        <span className="showcase-status showcase-status-orange">Every 3h</span>
                      </div>
                      <span className="showcase-tagline">Central intelligence coordinating all agents</span>
                    </div>
                  </div>
                  <p className="showcase-desc">
                    Wakes up every 3 hours, gathers state from 11 data sources, sends it to an LLM for analysis,
                    then validates and executes the decided actions. Rate-limited and action-whitelisted.
                  </p>
                  <div className="showcase-flow">
                    <span className="showcase-flow-step">11 Sources</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">LLM Decides</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Validate</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Execute</span>
                  </div>
                  {agentActivityCount > 0 && (
                    <div className="showcase-preview">
                      <span className="showcase-preview-label">24h</span>
                      <span className="showcase-preview-title">{agentActivityCount} agent events</span>
                    </div>
                  )}
                  <div className="showcase-tech">
                    <span>GPT-4o-mini</span>
                    <span>GitHub API</span>
                    <span>Firebase</span>
                    <span>Cron</span>
                  </div>
                </div>
              </Link>

              <Link to="/blog" className="showcase-card">
                <div className="showcase-card-accent" style={{ background: '#fbbf24' }} />
                <div className="showcase-card-body">
                  <div className="showcase-card-header">
                    <div className="showcase-icon" style={{ background: 'rgba(251,191,36,0.12)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </div>
                    <div>
                      <div className="showcase-title-row">
                        <h3>The Scribe</h3>
                        <span className="showcase-status showcase-status-yellow">Daily</span>
                      </div>
                      <span className="showcase-tagline">Writes and publishes without human input</span>
                    </div>
                  </div>
                  <p className="showcase-desc">
                    Every day the orchestrator reviews GitHub commits, decides if there's something worth
                    writing about, and generates a full blog post with code analysis. No prompts, no drafts.
                  </p>
                  <div className="showcase-flow">
                    <span className="showcase-flow-step">Commits</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Orchestrator</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Claude Blog</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Published</span>
                  </div>
                  {latestBlog && (
                    <div className="showcase-preview">
                      <span className="showcase-preview-label">Latest</span>
                      <span className="showcase-preview-title">{latestBlog.title}</span>
                    </div>
                  )}
                  <div className="showcase-tech">
                    <span>Claude Sonnet</span>
                    <span>GitHub API</span>
                    <span>Firestore</span>
                    <span>SVG Covers</span>
                  </div>
                </div>
              </Link>

              <Link to="/chat" className="showcase-card">
                <div className="showcase-card-accent" style={{ background: '#60a5fa' }} />
                <div className="showcase-card-body">
                  <div className="showcase-card-header">
                    <div className="showcase-icon" style={{ background: 'rgba(96,165,250,0.12)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    </div>
                    <div>
                      <div className="showcase-title-row">
                        <h3>Azoni AI</h3>
                        <span className="showcase-status">Try it</span>
                      </div>
                      <span className="showcase-tagline">Self-improving RAG chatbot</span>
                    </div>
                  </div>
                  <p className="showcase-desc">
                    Vector search with OpenAI embeddings finds relevant knowledge. When stumped, generates
                    new knowledge on the spot and saves it. Paste a job description for AI fit analysis.
                  </p>
                  <div className="showcase-flow">
                    <span className="showcase-flow-step">Question</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Intent</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Vector + MCP</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Response</span>
                  </div>
                  <div className="showcase-preview">
                    <span className="showcase-preview-label">Try</span>
                    <span className="showcase-preview-title">Paste a job description for AI fit analysis</span>
                  </div>
                  <div className="showcase-tech">
                    <span>OpenRouter</span>
                    <span>Embeddings</span>
                    <span>MCP</span>
                    <span>Firestore RAG</span>
                  </div>
                </div>
              </Link>

            </div>
          </div>
        </section>

        {/* ===== AI PRODUCTS ===== */}
        <section className="showcase-section">
          <div className="container">
            <div className="showcase-section-header">
              <span className="showcase-section-label">AI Products</span>
              <span className="showcase-section-sub">Shipping AI in fitness, gaming, social, and wellness apps</span>
            </div>
            <div className="showcase-grid showcase-grid-2x2">

              <a href="https://benchpressonly.com" target="_blank" rel="noopener noreferrer" className="showcase-card">
                <div className="showcase-card-accent" style={{ background: '#4ade80' }} />
                <div className="showcase-card-body">
                  <div className="showcase-card-header">
                    <div className="showcase-icon" style={{ background: 'rgba(74,222,128,0.12)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"><path d="M6.5 6.5h11M6.5 17.5h11M4 10h2.5v4H4zM17.5 10H20v4h-2.5zM6.5 11h11v2h-11z"/></svg>
                    </div>
                    <div>
                      <div className="showcase-title-row">
                        <h3>BenchPressOnly + RowCrew</h3>
                        <span className="showcase-status showcase-status-green">Live</span>
                      </div>
                      <span className="showcase-tagline">AI fitness platform</span>
                    </div>
                  </div>
                  <p className="showcase-desc">
                    Two fitness apps with real users. AI generates personalized workouts, provides real-time form
                    correction, tracks PRs, and analyzes progress trends. RowCrew extends the same platform to rowing.
                    Live data feeds back to the agent ecosystem.
                  </p>
                  <div className="showcase-tech">
                    <span>React Native</span>
                    <span>AI Form Correction</span>
                    <span>AI Workouts</span>
                    <span>Firebase</span>
                  </div>
                </div>
              </a>

              <Link to="/game" className="showcase-card">
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
                    Real-time multiplayer wizard combat built with Three.js. AI generates unique characters with
                    custom abilities and backstories. Fight through dungeons with AI-driven enemies. Playable now.
                  </p>
                  <div className="showcase-tech">
                    <span>Three.js</span>
                    <span>Socket.io</span>
                    <span>GPT-4o-mini</span>
                    <span>Node.js</span>
                  </div>
                </div>
              </Link>

              <Link to="/moltbook" className="showcase-card">
                <div className="showcase-card-accent" style={{ background: '#fb923c' }} />
                <div className="showcase-card-body">
                  <div className="showcase-card-header">
                    <div className="showcase-icon" style={{ background: 'rgba(251,146,60,0.12)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                    </div>
                    <div>
                      <div className="showcase-title-row">
                        <h3>Moltbook</h3>
                        <span className="showcase-status showcase-status-orange">Autonomous</span>
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
                </div>
              </Link>

              <a href="https://oldwaystoday.com" target="_blank" rel="noopener noreferrer" className="showcase-card">
                <div className="showcase-card-accent" style={{ background: '#d97706' }} />
                <div className="showcase-card-body">
                  <div className="showcase-card-header">
                    <div className="showcase-icon" style={{ background: 'rgba(217,119,6,0.12)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><path d="M12 2C13 7 17 10 12 17C7 10 11 7 12 2Z"/><path d="M12 17v5"/><path d="M8 21h8"/></svg>
                    </div>
                    <div>
                      <div className="showcase-title-row">
                        <h3>Old Ways Today</h3>
                        <span className="showcase-status showcase-status-amber">Live</span>
                      </div>
                      <span className="showcase-tagline">AI wellness platform</span>
                    </div>
                  </div>
                  <p className="showcase-desc">
                    Standalone product helping families find non-toxic, traditional alternatives. Same RAG + blog
                    architecture as azoni.ai — proving the agent system is portable beyond a portfolio site.
                  </p>
                  <div className="showcase-tech">
                    <span>React</span>
                    <span>RAG</span>
                    <span>Auto-blog</span>
                    <span>EmbedRoute</span>
                  </div>
                </div>
              </a>

            </div>
          </div>
        </section>

        {/* ===== COLLAPSIBLE SECTIONS ===== */}
        <div className="collapsible-wrapper">

        <CollapsibleSection
          title="Activity"
          subtitle="Live GitHub commits and AI agent actions across all systems"
          badge="Live"
          badgeType="live"
          stats={[
            { value: githubStats?.today || '–', label: 'today' },
            { value: githubStats?.last7Days || '–', label: 'this week' },
            { value: agentActivityCount || '–', label: 'agent events' },
          ]}
          defaultOpen={true}
        >
        {/* Activity Row - GitHub Commits + Agent Activity Side by Side */}
        <section className="activity-section">
          <div className="container">
            <div className="activity-row">
              {/* GitHub Commits */}
              <div className="activity-card activity-half">
                <div className="activity-header">
                  <div className="activity-stats">
                    <div className="stat">
                      <span className="stat-num">{githubStats?.today || 0}</span>
                      <span className="stat-label">today</span>
                    </div>
                    <div className="stat">
                      <span className="stat-num">{githubStats?.last7Days || 0}</span>
                      <span className="stat-label">this week</span>
                    </div>
                    <div className="stat">
                      <span className="stat-num">{githubStats?.last30Days || 0}</span>
                      <span className="stat-label">this month</span>
                    </div>
                  </div>
                  <span className="activity-label">commits</span>
                </div>

                <div className="commits-list">
                  {githubStats?.recentCommits?.slice(0, 6).map((commit, i) => (
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
                        <span className="commit-time">{formatTimeAgo(commit.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/commits" className="activity-view-all">View all commits →</Link>
              </div>

              {/* Agent Activity */}
              <div className="activity-card activity-half agent-activity-card">
                <AgentActivityFeed maxItems={8} showReasoning={true} compact={true} />
              </div>
            </div>
          </div>
        </section>
        </CollapsibleSection>

        <CollapsibleSection
          title="Tools & Services"
          subtitle="Live APIs and tools powering the agent ecosystem — MCP data server, RAG chatbot, and unified embeddings"
          badge="3 Live"
          badgeType="live"
          defaultOpen={false}
        >
        {/* Services */}
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

        <CollapsibleSection
          title="Experience"
          subtitle="7+ years shipping production software at T-Mobile, Capital One, and startups"
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
        </CollapsibleSection>

        <CollapsibleSection
          title="Earlier Work"
          subtitle="A 50-machine autonomous trading system and an ACM-published computer vision startup"
          defaultOpen={false}

        >
        {/* Projects */}
        <section className="projects-section">
          <div className="container">

            {/* Earlier Work - Showcase */}
            <div className="section-header">
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