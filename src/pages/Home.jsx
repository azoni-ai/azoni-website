import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import InteractiveBackground from '../components/InteractiveBackground';
import AgentActivityFeed from '../components/AgentActivityFeed';
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showAllCommits, setShowAllCommits] = useState(false);
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
        // Try to get featured projects, sorted by order
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
        // Fallback: try without the compound query (in case index doesn't exist)
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

  // Mouse tracking for hero glow effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
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
          <div className="hero-glow" style={{
            '--mouse-x': `${mousePos.x * 100}%`,
            '--mouse-y': `${mousePos.y * 100}%`,
          }} />
          
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

        {/* GitHub Activity */}
        {githubStats && (
          <section className="activity-section">
            <div className="container">
              <div className="activity-card">
                <div className="activity-header">
                  <div className="activity-stats">
                    <div className="stat">
                      <span className="stat-num">{githubStats.today}</span>
                      <span className="stat-label">today</span>
                    </div>
                    <div className="stat">
                      <span className="stat-num">{githubStats.last7Days}</span>
                      <span className="stat-label">this week</span>
                    </div>
                    <div className="stat">
                      <span className="stat-num">{githubStats.last30Days}</span>
                      <span className="stat-label">this month</span>
                    </div>
                  </div>
                  <span className="activity-label">commits</span>
                </div>
                
                <div className="commits-list">
                  {githubStats.recentCommits?.slice(0, showAllCommits ? 20 : 6).map((commit, i) => (
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
                {githubStats.recentCommits?.length > 6 && (
                  <button 
                    className="commits-toggle"
                    onClick={() => setShowAllCommits(!showAllCommits)}
                  >
                    {showAllCommits ? 'Show less' : `View more (${Math.min(githubStats.recentCommits.length, 20) - 6})`}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* AI Ecosystem Section */}
        {/* Moltbook Agent Banner */}
        <section className="moltbook-banner-section">
          <div className="container">
            <Link to="/moltbook" className="moltbook-banner">
              <div className="moltbook-banner-bg"></div>
              <div className="moltbook-banner-content">
                <div className="moltbook-banner-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 4C20 4 17 7 17 11V16C17 18 15 20 13 20H10C8 20 6 22 6 24C6 26 8 28 10 28H13L11 34C10 37 12 40 15 40H17L16 44H20L21 40H27L28 44H32L31 40H33C36 40 38 37 37 34L35 28H38C40 28 42 26 42 24C42 22 40 20 38 20H35C33 20 31 18 31 16V11C31 7 28 4 24 4Z" fill="#ff6b35"/>
                    <circle cx="20" cy="12" r="2" fill="#0f0f1a"/>
                    <circle cx="28" cy="12" r="2" fill="#0f0f1a"/>
                  </svg>
                </div>
                <div className="moltbook-banner-text">
                  <div className="moltbook-banner-header">
                    <h3>AI Social Agent</h3>
                    {moltbookStatus?.autonomous_mode && (
                      <span className="moltbook-status-badge">
                        <span className="status-dot-live"></span>
                        Autonomous
                      </span>
                    )}
                  </div>
                  <p>LangGraph-powered agent that browses, reasons, and posts to Moltbook independently</p>
                </div>
                <div className="moltbook-banner-stats">
                  <div className="moltbook-stat">
                    <span className="moltbook-stat-value">{moltbookStatus?.posts_today || 0}</span>
                    <span className="moltbook-stat-label">today</span>
                  </div>
                  <div className="moltbook-stat">
                    <span className="moltbook-stat-value">{moltbookStatus?.total_actions || '∞'}</span>
                    <span className="moltbook-stat-label">actions</span>
                  </div>
                </div>
                <span className="moltbook-banner-btn">View Agent →</span>
              </div>
            </Link>
          </div>
        </section>

        <section className="ai-ecosystem-section">
          <div className="container">
            <div className="ecosystem-grid">
              {/* MCP Server */}
              <Link to="/projects/azoni-mcp" className="ecosystem-card mcp-card">
                <div className="card-glow mcp-glow"></div>
                <div className="ecosystem-card-header">
                  <div className="ecosystem-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="16" cy="16" r="4" fill="currentColor"/>
                      <path d="M16 4V8M16 24V28M4 16H8M24 16H28" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className="ecosystem-status">
                    <span className="status-live"><span className="pulse-dot"></span>Live</span>
                  </div>
                </div>
                <h3>MCP Data Server</h3>
                <p>Exposes live fitness data, project stats, and more to AI agents via Model Context Protocol</p>
                <div className="ecosystem-stats">
                  <div className="eco-stat">
                    <span className="eco-stat-value">REST</span>
                    <span className="eco-stat-label">API</span>
                  </div>
                  <div className="eco-stat">
                    <span className="eco-stat-value">Real-time</span>
                    <span className="eco-stat-label">data</span>
                  </div>
                </div>
                <span className="ecosystem-arrow">→</span>
              </Link>

              {/* AI Blog Writer */}
              <Link to="/blog" className="ecosystem-card blog-card">
                <div className="card-glow blog-glow"></div>
                <div className="ecosystem-card-header">
                  <div className="ecosystem-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M8 4H24C25.1 4 26 4.9 26 6V26C26 27.1 25.1 28 24 28H8C6.9 28 6 27.1 6 26V6C6 4.9 6.9 4 8 4Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M10 10H22M10 15H22M10 20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="22" cy="22" r="4" fill="currentColor"/>
                      <path d="M21 22L22.5 23.5M22.5 20.5L21 22" stroke="var(--bg-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="ecosystem-status">
                    <span className="status-scheduled">⏰ Daily 9am</span>
                  </div>
                </div>
                <h3>AI Blog Writer</h3>
                <p>Reads my GitHub commits every morning and writes a dev log post automatically</p>
                <div className="ecosystem-stats">
                  <div className="eco-stat">
                    <span className="eco-stat-value">{githubStats?.today || 0}</span>
                    <span className="eco-stat-label">commits today</span>
                  </div>
                  <div className="eco-stat">
                    <span className="eco-stat-value">Auto</span>
                    <span className="eco-stat-label">generated</span>
                  </div>
                </div>
                <span className="ecosystem-arrow">→</span>
              </Link>

              {/* RAG Chatbot */}
              <Link to="/chat" className="ecosystem-card chat-card">
                <div className="card-glow chat-glow"></div>
                <div className="ecosystem-card-header">
                  <div className="ecosystem-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M4 8C4 6.9 4.9 6 6 6H26C27.1 6 28 6.9 28 8V20C28 21.1 27.1 22 26 22H20L16 26L12 22H6C4.9 22 4 21.1 4 20V8Z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="10" cy="14" r="1.5" fill="currentColor"/>
                      <circle cx="16" cy="14" r="1.5" fill="currentColor"/>
                      <circle cx="22" cy="14" r="1.5" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="ecosystem-status">
                    <span className="status-live"><span className="pulse-dot"></span>Ready</span>
                  </div>
                </div>
                <h3>RAG Chatbot</h3>
                <p>Ask about my work, skills, or paste a job description for AI-powered fit analysis</p>
                <div className="ecosystem-stats">
                  <div className="eco-stat">
                    <span className="eco-stat-value">RAG</span>
                    <span className="eco-stat-label">powered</span>
                  </div>
                  <div className="eco-stat">
                    <span className="eco-stat-value">MCP</span>
                    <span className="eco-stat-label">connected</span>
                  </div>
                </div>
                <span className="ecosystem-arrow">→</span>
              </Link>
            </div>

            {/* Live Agent Activity Feed */}
            <AgentActivityFeed maxItems={6} showReasoning={true} />
          </div>
        </section>

        {/* Latest Blog Post Banner */}
        {latestBlog && (
          <section className="latest-blog-section">
            <div className="container">
              <Link to={`/blog/${latestBlog.slug || latestBlog.id}`} className="latest-blog-banner">
                <div className="blog-banner-bg"></div>
                <div className="blog-banner-content">
                  <div className="blog-banner-meta">
                    {latestBlog.autoGenerated && (
                      <span className="ai-generated-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
                        </svg>
                        AI Generated
                      </span>
                    )}
                    <span className="blog-date">
                      {latestBlog.publishedAt?.toDate ? 
                        latestBlog.publishedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                        new Date(latestBlog.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                    </span>
                  </div>
                  <h3 className="blog-banner-title">{latestBlog.title}</h3>
                  <p className="blog-banner-excerpt">{latestBlog.excerpt || latestBlog.description}</p>
                  <div className="blog-banner-footer">
                    <div className="blog-tags">
                      {latestBlog.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="blog-tag">{tag}</span>
                      ))}
                    </div>
                    <span className="read-post-btn">Read Post →</span>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Spell Brigade Game Banner */}
        <section className="cta-section">
          <div className="container">
            <a href="/game" target="_blank" rel="noopener noreferrer" className="game-banner">
              <div className="game-banner-bg"></div>
              <div className="game-banner-content">
                <div className="game-banner-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 4L28 16H40L30 24L34 36L24 28L14 36L18 24L8 16H20L24 4Z" fill="#ffd93d"/>
                    <circle cx="24" cy="22" r="6" fill="#ff6b35"/>
                  </svg>
                </div>
                <div className="game-banner-text">
                  <div className="game-banner-header">
                    <h3>Spell Brigade</h3>
                    <span className="game-status-badge">
                      <span className="status-dot-live"></span>
                      Playable
                    </span>
                  </div>
                  <p>Multiplayer wizard survival — choose your class, explore dangerous zones, defeat enemies</p>
                </div>
                <div className="game-banner-classes">
                  <span className="class-dot pyro" title="Pyromancer"></span>
                  <span className="class-dot cryo" title="Cryomancer"></span>
                  <span className="class-dot arcane" title="Arcanist"></span>
                </div>
                <span className="game-banner-btn">Play Now</span>
              </div>
            </a>
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
            ) : featuredProjects.length > 0 ? (
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
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No featured projects yet. Mark projects as featured in the admin panel.</p>
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