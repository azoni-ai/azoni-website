import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/Layout';
import InteractiveBackground from '../components/InteractiveBackground';
import AgentActivityFeed from '../components/AgentActivityFeed';
import CollapsibleSection from '../components/CollapsibleSection';
import { avatars, AGENTS, AGENT_ORDER, SITE_AGENTS, PRODUCT_AGENTS, AGENT_HOME_DATA } from '../data/agents';
import '../styles/bento.css';
import '../styles/team.css';

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

/* ─── Home Team Section (merged with live data) ─── */
function HomeTeamSection({ appStats, moltbookStatus, latestBlog, githubStats }) {
  const [selected, setSelected] = useState(null);
  const sel = selected ? AGENTS[selected] : null;
  const homeData = selected ? AGENT_HOME_DATA[selected] : null;

  const getAgentStats = (key) => {
    const stats = [];
    if (key === 'fitness') {
      if (appStats?.benchpressonly?.users) stats.push({ value: appStats.benchpressonly.users, label: 'lifters' });
      if (appStats?.rowcrew?.users) stats.push({ value: appStats.rowcrew.users, label: 'rowers' });
    }
    if (key === 'gaming' && appStats?.spellbrigade?.users) stats.push({ value: appStats.spellbrigade.users, label: 'players' });
    if (key === 'social' && moltbookStatus?.posts_today) stats.push({ value: moltbookStatus.posts_today, label: 'posts today' });
    if (key === 'blog' && githubStats?.today) stats.push({ value: githubStats.today, label: 'commits today' });
    return stats;
  };

  const renderCard = (key) => {
    const a = AGENTS[key];
    const tryable = key === 'fitness' || key === 'gaming' || key === 'chat' || key === 'oldways';
    return (
      <div key={key} className={`home-team-card ${selected === key ? 'active' : ''}`}
        onClick={() => setSelected(selected === key ? null : key)}
        style={selected === key ? { borderColor: `${a.color}50` } : {}}>
        <div className="ht-dot" style={{ background: a.color }}/>
        {tryable && <span className="ht-try-badge" style={{ color: a.color, borderColor: `${a.color}50` }}>{key === 'gaming' ? 'Play' : 'Try it'}</span>}
        <div className="ht-avatar">{avatars[key](48)}</div>
        <div className="ht-name">{a.name}</div>
        <div className="ht-role" style={{ color: a.color }}>{a.role}</div>
      </div>
    );
  };

  return (
    <div>
      <div className="home-team-group-label">Running this site</div>
      <div className="home-team-grid">
        {SITE_AGENTS.map(renderCard)}
      </div>
      <div className="home-team-group-label home-team-group-label-products">AI in my products</div>
      <div className="home-team-grid">
        {PRODUCT_AGENTS.map(renderCard)}
      </div>

      {sel && homeData && (
        <div className="home-team-expanded" style={{ borderColor: `${sel.color}40` }}>
          <div className="home-team-expanded-header">
            <div style={{ flexShrink: 0 }}>{avatars[selected](72)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="home-team-name-row">
                <h3>{sel.name}</h3>
                <span className="home-team-expanded-role" style={{ color: sel.color, background: sel.bg, border: `1px solid ${sel.borderColor}` }}>{sel.role}</span>
                <span className={`home-team-status home-team-status-${homeData.statusType}`}>{homeData.status}</span>
              </div>
              <p className="home-team-expanded-desc">{homeData.shortDesc}</p>
              <p className="home-team-expanded-why">{sel.whyUnique}</p>
            </div>
          </div>

          <div className="home-team-expanded-meta">
            <div className="home-team-expanded-tags">
              {sel.tech.map((t, i) => (
                <span key={i} className="team-tag" style={{ color: sel.color, borderColor: sel.borderColor }}>{t}</span>
              ))}
            </div>
            {getAgentStats(selected).length > 0 && (
              <div className="home-team-live-stats">
                {getAgentStats(selected).map((s, i) => (
                  <span key={i} className="home-team-live-stat">
                    <strong style={{ color: sel.color }}>{s.value}</strong> {s.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Data it touches */}
          <div className="home-team-data-row">
            {sel.data.slice(0, 3).map((d, i) => (
              <span key={i} className="home-team-data-item">
                <span style={{ color: sel.color, opacity: 0.6 }}>{'// '}</span>{d.split(' — ')[0]}
              </span>
            ))}
          </div>

          <div className="home-team-expanded-footer">
            <div className="home-team-links">
              {homeData.links.map((link, i) => (
                link.external ? (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="home-team-action-link" style={{ color: sel.color, borderColor: `${sel.color}40` }}>{link.label}</a>
                ) : (
                  <Link key={i} to={link.url} className="home-team-action-link" style={{ color: sel.color, borderColor: `${sel.color}40` }}>{link.label}</Link>
                )
              ))}
              <Link to={`/team?agent=${selected}`} className="home-team-full-link">Full profile + chat →</Link>
            </div>
          </div>

          {selected === 'blog' && latestBlog && (
            <Link to={`/blog/${latestBlog.slug || latestBlog.id}`} className="home-team-blog-preview">
              <span className="home-team-blog-label">Latest post</span>
              <span className="home-team-blog-title">{latestBlog.title}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const Home = () => {
  const [githubStats, setGithubStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [moltbookStatus, setMoltbookStatus] = useState(null);
  const [latestBlog, setLatestBlog] = useState(null);
  const [agentActivityCount, setAgentActivityCount] = useState(0);
  const [appStats, setAppStats] = useState(null);
  const [allExpanded, setAllExpanded] = useState(null);
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

        {/* ===== FEATURED: BLOG AGENT + CHAT AGENT ===== */}
        <section className="showcase-section">
          <div className="container">
            <div className="showcase-grid">

              <Link to="/blog" className="showcase-card">
                <div className="showcase-card-accent" style={{ background: '#9b5de5' }} />
                <div className="showcase-card-body">
                  <div className="showcase-card-header">
                    <div className="showcase-icon" style={{ background: 'rgba(155,93,229,0.12)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9b5de5" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </div>
                    <div>
                      <div className="showcase-title-row">
                        <h3>Blog Agent</h3>
                        <span className="showcase-status showcase-status-purple">Autonomous</span>
                      </div>
                      <span className="showcase-tagline">Writes and publishes without human input</span>
                    </div>
                  </div>
                  <p className="showcase-desc">
                    Every day the orchestrator reviews my GitHub commits, decides if there's something worth 
                    writing about, generates a full blog post with code analysis, and publishes it. 
                    No prompts, no approval step, no drafts to review.
                  </p>
                  <div className="showcase-flow">
                    <span className="showcase-flow-step">GitHub Commits</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Orchestrator</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">GPT-4o Blog</span>
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
                    <span>GPT-4o</span>
                    <span>GitHub API</span>
                    <span>Firestore</span>
                    <span>Cron</span>
                  </div>
                </div>
              </Link>

              <Link to="/chat" className="showcase-card">
                <div className="showcase-card-accent" style={{ background: '#3b82f6' }} />
                <div className="showcase-card-body">
                  <div className="showcase-card-header">
                    <div className="showcase-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    </div>
                    <div>
                      <div className="showcase-title-row">
                        <h3>Azoni AI</h3>
                        <span className="showcase-status">Try it</span>
                      </div>
                      <span className="showcase-tagline">Vector search RAG with live MCP data access</span>
                    </div>
                  </div>
                  <p className="showcase-desc">
                    Intent detection classifies your question, then OpenAI embeddings + cosine similarity
                    find the most relevant knowledge chunks. Live data from the MCP server augments every
                    response. Paste a job description and it analyzes how my skills match the role.
                  </p>
                  <div className="showcase-flow">
                    <span className="showcase-flow-step">Your Question</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Intent Detection</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Vector Search + MCP</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="showcase-flow-step">Response</span>
                  </div>
                  <div className="showcase-tech">
                    <span>OpenRouter</span>
                    <span>EmbedRoute</span>
                    <span>MCP</span>
                    <span>Firestore RAG</span>
                  </div>
                </div>
              </Link>

            </div>
          </div>
        </section>

        {/* ===== CTA ROW ===== */}
        <div className="cta-row">
          <Link to="/resume" className="cta-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            Resume
          </Link>
          <Link to="/projects" className="cta-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Projects
          </Link>
          <Link to="/chat" className="cta-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Chat with my AI
          </Link>
        </div>

        {/* ===== COLLAPSIBLE SECTIONS ===== */}
        <div className="collapsible-wrapper">

        <div className="expand-all-row">
          <button className="expand-all-btn" onClick={() => {
            const next = allExpanded === true ? false : true;
            setAllExpanded(next);
            // Reset after sections animate so individual toggles work again
            setTimeout(() => setAllExpanded(null), 400);
          }}>
            {allExpanded === true ? 'Collapse all' : 'Expand all'}
          </button>
        </div>

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
          forceOpen={allExpanded !== null ? allExpanded : undefined}
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
          title="The Agents"
          subtitle="3 autonomous agents run this site, plus AI-powered features across every product — click any to see how it works"
          badge="3 agents"
          badgeType="count"
          defaultOpen={true}
          forceOpen={allExpanded !== null ? allExpanded : undefined}
        >
        <section style={{ padding: '0 0 var(--space-lg)' }}>
          <div className="container">
            <HomeTeamSection appStats={appStats} moltbookStatus={moltbookStatus} latestBlog={latestBlog} githubStats={githubStats} />
          </div>
        </section>
        </CollapsibleSection>

        <CollapsibleSection
          title="Tools & Services"
          subtitle="Live APIs and tools powering the agent ecosystem — MCP data server, RAG chatbot, and unified embeddings"
          badge="3 Live"
          badgeType="live"
          defaultOpen={false}
          forceOpen={allExpanded !== null ? allExpanded : undefined}
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
          subtitle="Enterprise platforms, autonomous trading systems, and AI-powered applications — 7+ years shipping production software"
          badge="7+ yrs"
          badgeType="count"
          defaultOpen={true}
          forceOpen={allExpanded !== null ? allExpanded : undefined}
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
          forceOpen={allExpanded !== null ? allExpanded : undefined}
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