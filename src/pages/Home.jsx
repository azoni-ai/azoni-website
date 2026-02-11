import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import InteractiveBackground from '../components/InteractiveBackground';
import AgentActivityFeed from '../components/AgentActivityFeed';
import AgentBanner from '../components/AgentBanner';
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
  const [moltbookStatus, setMoltbookStatus] = useState(null);
  const [latestBlog, setLatestBlog] = useState(null);
  const [agentActivityCount, setAgentActivityCount] = useState(0);
  const [appStats, setAppStats] = useState(null);
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

  // Fetch Moltbook agent status
  useEffect(() => {
    const fetchMoltbookStatus = async () => {
      try {
        const AGENT_URL = process.env.REACT_APP_MOLTBOOK_AGENT_URL || 'https://azoni-moltbook-agent.onrender.com';
        const res = await fetch(`${AGENT_URL}/status`);
        if (res.ok) {
          const data = await res.json();
          setMoltbookStatus(data);
        }
      } catch (err) {
        console.error('Failed to fetch Moltbook status:', err);
      }
    };
    fetchMoltbookStatus();
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

  // Fetch app user/player counts
  useEffect(() => {
    fetch('/.netlify/functions/app-stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setAppStats(data);
      })
      .catch(err => console.error('Failed to fetch app stats:', err));
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
                <p className="hero-title">{profile?.tagline || 'Senior Software Engineer · 7+ Years Experience'}</p>
                
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
                  <span className="ai-badge-text">Powered by AI</span>
                </div>
                <p className="ai-badge-subtext">This site runs itself</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== NARRATIVE STATEMENT ===== */}
        <section className="narrative-section">
          <div className="container">
            <p className="narrative-text">
              I try to build apps that people enjoy, take their feedback, and keep making things better. 
              Below you can see my recent commits and the AI agents I built that run alongside my apps. 
              Everything here is live and updated in real time.
            </p>
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
          title="AI Agents"
          subtitle="Autonomous systems running 24/7 — writing blogs, posting on social media, coaching workouts, and generating game characters"
          badge="6"
          badgeType="count"
          stats={appStats ? [
            { value: appStats.benchpressonly?.users || '–', label: 'lifters' },
            { value: appStats.spellbrigade?.users || '–', label: 'players' },
            { value: appStats.rowcrew?.users || '–', label: 'rowers' },
          ].filter(s => s.value !== '–' && s.value !== 0) : []}
          defaultOpen={false}
          rightLink="All activity →"
          rightLinkTo="/activity"
        >
        {/* ===== AI AGENT BANNERS ===== */}
        <section className="agent-banners-section">
          <div className="container">
            <div className="section-header">
              <h2><span className="section-header-pulse"></span> AI Agents</h2>
              <Link to="/activity" className="view-all">All agent activity →</Link>
            </div>

            <div className="agent-banners-grid">
              {/* Azoni AI - Master Agent */}
              <AgentBanner
                name="Azoni AI"
                description="Central intelligence that orchestrates all agents, manages this website, and powers the portfolio chatbot"
                color="#3b82f6"
                secondaryColor="#8b5cf6"
                sources={['azoni-ai']}
                links={[
                  { label: 'Chat →', url: '/chat', external: false },
                ]}
                statusLabel="Active"
                statusType="live"
                stats={[
                  { value: '5', label: 'agents' },
                  { value: 'RAG', label: 'powered' },
                ]}
                icon={
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="18" stroke="#3b82f6" strokeWidth="2.5" fill="none"/>
                    <circle cx="24" cy="24" r="8" stroke="#8b5cf6" strokeWidth="2" fill="none"/>
                    <circle cx="24" cy="24" r="3" fill="#3b82f6"/>
                    <path d="M24 6V12M24 36V42M6 24H12M36 24H42" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M11 11L15.5 15.5M32.5 32.5L37 37M37 11L32.5 15.5M15.5 32.5L11 37" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                  </svg>
                }
              />

              {/* Blog Writer Agent */}
              <AgentBanner
                name="Blog Writer Agent"
                description="Reads GitHub commits every morning and writes a dev log post automatically"
                color="#9b5de5"
                secondaryColor="#3b82f6"
                sources={['daily-blog']}
                links={[
                  { label: 'Read Blog →', url: '/blog', external: false },
                ]}
                statusLabel="Daily 9am"
                statusType="scheduled"
                stats={[
                  { value: githubStats?.today || 0, label: 'commits' },
                  { value: 'Auto', label: 'generated' },
                ]}
                icon={
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                    <path d="M12 6H36C37.66 6 39 7.34 39 9V39C39 40.66 37.66 42 36 42H12C10.34 42 9 40.66 9 39V9C9 7.34 10.34 6 12 6Z" stroke="#9b5de5" strokeWidth="2.5" fill="none"/>
                    <path d="M15 15H33M15 22.5H33M15 30H24" stroke="#9b5de5" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="33" cy="33" r="6" fill="#9b5de5"/>
                    <path d="M31.5 33L33.5 35M33.5 31L31.5 33" stroke="#0f0f1a" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                }
              >
                {latestBlog && (
                  <Link to={`/blog/${latestBlog.slug || latestBlog.id}`} className="banner-blog-preview" onClick={e => e.stopPropagation()}>
                    <div className="banner-blog-meta">
                      {latestBlog.autoGenerated && (
                        <span className="banner-blog-ai-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
                          </svg>
                          AI Generated
                        </span>
                      )}
                      <span className="banner-blog-date">
                        {latestBlog.publishedAt?.toDate ? 
                          latestBlog.publishedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                          new Date(latestBlog.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }
                      </span>
                    </div>
                    <h4 className="banner-blog-title">{latestBlog.title}</h4>
                    <p className="banner-blog-excerpt">{latestBlog.excerpt || latestBlog.description}</p>
                    <div className="banner-blog-footer">
                      <div className="banner-blog-tags">
                        {latestBlog.tags?.slice(0, 3).map(tag => (
                          <span key={tag} className="banner-blog-tag">{tag}</span>
                        ))}
                      </div>
                      <span className="banner-blog-read">Read Post →</span>
                    </div>
                  </Link>
                )}
              </AgentBanner>

              {/* Fitness Agent - BenchPressOnly + RowCrew */}
              <AgentBanner
                name="Fitness Agent"
                description="AI workout generation, progress tracking, and rowing verification across BenchPressOnly and RowCrew"
                color="#4ade80"
                secondaryColor="#22d3ee"
                sources={['benchpressonly', 'rowcrew']}
                links={[
                  { label: 'BenchPressOnly →', url: 'https://benchpressonly.com', external: true },
                  { label: 'RowCrew →', url: 'https://rowcrew.netlify.app', external: true },
                ]}
                statusLabel="Active"
                statusType="live"
                stats={[
                  ...(appStats?.benchpressonly?.users ? [{ value: appStats.benchpressonly.users, label: 'lifters' }] : []),
                  ...(appStats?.rowcrew?.users ? [{ value: appStats.rowcrew.users, label: 'rowers' }] : []),
                ]}
                icon={
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                    <rect x="8" y="14" width="6" height="20" rx="2" fill="#4ade80"/>
                    <rect x="34" y="14" width="6" height="20" rx="2" fill="#4ade80"/>
                    <rect x="14" y="18" width="20" height="4" rx="1" fill="#22d3ee"/>
                    <rect x="14" y="26" width="20" height="4" rx="1" fill="#22d3ee"/>
                    <rect x="22" y="10" width="4" height="28" rx="2" fill="#4ade80" opacity="0.6"/>
                  </svg>
                }
              />

              {/* Gaming Agent - Spell Brigade */}
              <AgentBanner
                name="Gaming Agent"
                description="Multiplayer wizard survival — AI generates unique character classes from player prompts, with procedural dungeons and encounters"
                color="#ffd93d"
                secondaryColor="#f59e0b"
                sources={['spell-brigade']}
                link="/game"
                linkLabel="Play Now"
                externalLink={false}
                statusLabel="Playable"
                statusType="live"
                stats={[
                  ...(appStats?.spellbrigade?.users ? [{ value: appStats.spellbrigade.users, label: 'players' }] : []),
                ]}
                icon={
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 4L28 16H40L30 24L34 36L24 28L14 36L18 24L8 16H20L24 4Z" fill="#ffd93d"/>
                    <circle cx="24" cy="22" r="6" fill="#0f0f1a"/>
                  </svg>
                }
              />

              {/* Social Agent - Moltbook */}
              <AgentBanner
                name="Social Agent"
                description="LangGraph-powered agent that browses, reasons, and posts to Moltbook independently"
                color="#ff6b35"
                secondaryColor="#ff9a5c"
                sources={['moltbook-agent']}
                link="/moltbook"
                linkLabel="View Agent →"
                statusLabel={moltbookStatus?.autonomous_mode ? 'Autonomous' : 'Active'}
                statusType="live"
                stats={[
                  { value: moltbookStatus?.posts_today || 0, label: 'today' },
                  { value: moltbookStatus?.total_actions || '∞', label: 'actions' },
                  ...(appStats?.moltbook?.users ? [{ value: appStats.moltbook.users, label: 'followers' }] : []),
                ]}
                icon={
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                    <path d="M24 4C20 4 17 7 17 11V16C17 18 15 20 13 20H10C8 20 6 22 6 24C6 26 8 28 10 28H13L11 34C10 37 12 40 15 40H17L16 44H20L21 40H27L28 44H32L31 40H33C36 40 38 37 37 34L35 28H38C40 28 42 26 42 24C42 22 40 20 38 20H35C33 20 31 18 31 16V11C31 7 28 4 24 4Z" fill="#ff6b35"/>
                    <circle cx="20" cy="12" r="2" fill="#0f0f1a"/>
                    <circle cx="28" cy="12" r="2" fill="#0f0f1a"/>
                  </svg>
                }
              />

              {/* Old Ways Today */}
              <AgentBanner
                name="Old Ways Today"
                description="AI-powered platform helping families discover non-toxic, traditional product alternatives"
                color="#fb923c"
                secondaryColor="#f59e0b"
                sources={['old-ways-today']}
                externalLink={true}
                link="https://oldwaystoday.com"
                linkLabel="Visit Site →"
                statusLabel="Coming Soon"
                statusType="scheduled"
                stats={[
                  { value: 'RAG', label: 'chat' },
                  { value: 'AI', label: 'blog' },
                ]}
                icon={
                  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                    <path d="M16 4C9.4 4 4 9.4 4 16s5.4 12 12 12 12-5.4 12-12S22.6 4 16 4z" stroke="#fb923c" strokeWidth="2.5" fill="none"/>
                    <path d="M10 14c0-2 1.5-4 3.5-4s3 1.5 3 3c0 2-3 3-3 5" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="13.5" cy="22" r="1.5" fill="#fb923c"/>
                    <path d="M20 11l4-3M20 16h4M20 21l4 3" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                }
              />
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
          subtitle="7+ years building internal tools, testing infrastructure, and AI-powered applications at scale"
          badge="7+ yrs"
          badgeType="count"
          defaultOpen={false}
          rightLink="Resume →"
          rightLinkTo="/resume"
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
                    Built an internal automation platform that consolidated 4–5 separate tools into a single interface, 
                    reducing manual work for network operations teams by over 80%. Migrated the frontend from Django 
                    templates to Angular with reusable components and contributed to the org-wide migration from Jenkins 
                    to GitLab CI/CD. Worked across cross-functional teams in a large enterprise environment.
                  </p>
                  <div className="earlier-card-highlights">
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg> Reduced manual work by 80%</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> Consolidated 4–5 tools into one</span>
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
                      <span className="earlier-stat-value">4–5</span>
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
          rightLink="All projects →"
          rightLinkTo="/projects"
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