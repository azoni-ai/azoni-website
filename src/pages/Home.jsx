import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import InteractiveBackground from '../components/InteractiveBackground';
import AgentActivityFeed from '../components/AgentActivityFeed';
import AgentBanner from '../components/AgentBanner';
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
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moltbookStatus, setMoltbookStatus] = useState(null);
  const [latestBlog, setLatestBlog] = useState(null);
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

  // Fetch featured projects from Firestore
  useEffect(() => {
    const fetchFeaturedProjects = async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const q = query(
          projectsRef,
          where('featured', '==', true),
          orderBy('order', 'asc')
        );
        const snapshot = await getDocs(q);
        
        const projects = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setFeaturedProjects(projects);
      } catch (err) {
        console.error('Failed to fetch featured projects:', err);
        try {
          const projectsRef = collection(db, 'projects');
          const snapshot = await getDocs(projectsRef);
          const projects = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.featured)
            .sort((a, b) => (a.order || 99) - (b.order || 99));
          setFeaturedProjects(projects);
        } catch (fallbackErr) {
          console.error('Fallback fetch also failed:', fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedProjects();
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
                stats={[]}
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
                stats={[]}
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
                    <h3>MCP Data Server</h3>
                    <span className="service-status">Live</span>
                  </div>
                  <p>Exposes live fitness data, project stats, and more to AI agents via Model Context Protocol.</p>
                  <div className="service-tech">
                    <span>Node.js</span>
                    <span>REST API</span>
                    <span>Firebase</span>
                  </div>
                </div>
              </Link>

              <Link to="/chat" className="service-card">
                <div className="service-card-accent" style={{ background: '#8b5cf6' }} />
                <div className="service-card-body">
                  <div className="service-card-header">
                    <h3>RAG Chatbot</h3>
                    <span className="service-status">Live</span>
                  </div>
                  <p>Ask about my work, skills, or paste a job description for AI-powered fit analysis.</p>
                  <div className="service-tech">
                    <span>Claude API</span>
                    <span>RAG</span>
                    <span>MCP</span>
                  </div>
                </div>
              </Link>

              <a href="https://www.embedroute.com" target="_blank" rel="noopener noreferrer" className="service-card">
                <div className="service-card-accent" style={{ background: '#22d3ee' }} />
                <div className="service-card-body">
                  <div className="service-card-header">
                    <h3>EmbedRoute</h3>
                    <span className="service-status">Live</span>
                  </div>
                  <p>Unified embedding API — one endpoint for OpenAI, Cohere, Voyage, and more. Powers RAG across all apps.</p>
                  <div className="service-tech">
                    <span>Node.js</span>
                    <span>REST API</span>
                    <span>Multi-provider</span>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section className="projects-section">
          <div className="container">
            <div className="section-header">
              <h2>Featured Projects</h2>
              <Link to="/projects" className="view-all">View all →</Link>
            </div>
            
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading projects...</p>
            ) : (
              <div className="projects-grid">
                {featuredProjects.map((project) => (
                  <Link key={project.id} to={`/projects/${project.id}`} className="project-card">
                    <div className="project-top">
                      {project.image && <img src={project.image} alt="" className="project-icon" />}
                      {project.links?.live && <span className="project-live">Live</span>}
                    </div>
                    <h3>{project.title}</h3>
                    <p className="project-tagline">{project.tagline}</p>
                    <p className="project-desc">{project.description}</p>
                    <div className="project-tech">
                      {project.tech?.map(t => <span key={t}>{t}</span>)}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Earlier Work - Static */}
            <div className="section-header secondary">
              <h2>Earlier Work</h2>
            </div>
            
            <div className="projects-grid">
              <Link to="/projects/dustbunny" className="project-card">
                <div className="project-top">
                  <img src="/images/dustbunny.png" alt="" className="project-icon" />
                </div>
                <h3>Dustbunny</h3>
                <p className="project-tagline">Web3 Automation Platform</p>
                <p className="project-desc">NFT bidding system across 50 machines handling 2,500 requests per minute with Redis caching and intelligent algorithms.</p>
                <div className="project-tech">
                  <span>Python</span>
                  <span>Redis</span>
                  <span>Web3</span>
                </div>
              </Link>

              <Link to="/projects/oli-fitness" className="project-card">
                <div className="project-top">
                  <img src="/images/oli.png" alt="" className="project-icon" />
                </div>
                <h3>OLI Fitness</h3>
                <p className="project-tagline">Computer Vision Fitness Startup</p>
                <p className="project-desc">Co-founded startup using Kinect SDK for real-time exercise form tracking. Published at ACM CHI 2017.</p>
                <div className="project-tech">
                  <span>C#</span>
                  <span>Kinect SDK</span>
                  <span>Computer Vision</span>
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