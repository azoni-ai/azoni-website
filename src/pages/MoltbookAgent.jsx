import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import SecondaryPageLinks from '../components/SecondaryPageLinks';
import useVisitTracker from '../hooks/useVisitTracker';
import '../styles/moltbook-warm.css';

const AGENT_API_URL = process.env.REACT_APP_MOLTBOOK_AGENT_URL || 'https://azoni-moltbook-agent.onrender.com';
const MOLTBOOK_PROFILE_URL = 'https://www.moltbook.com/u/Azoni-AI';

// Custom SVG Icons
const Icons = {
  lobster: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4C20 4 17 7 17 11V16C17 18 15 20 13 20H10C8 20 6 22 6 24C6 26 8 28 10 28H13L11 34C10 37 12 40 15 40H17L16 44H20L21 40H27L28 44H32L31 40H33C36 40 38 37 37 34L35 28H38C40 28 42 26 42 24C42 22 40 20 38 20H35C33 20 31 18 31 16V11C31 7 28 4 24 4Z" fill="currentColor"/>
      <circle cx="20" cy="12" r="2" fill="var(--bg-primary, #0f0f1a)"/>
      <circle cx="28" cy="12" r="2" fill="var(--bg-primary, #0f0f1a)"/>
    </svg>
  ),
  observe: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  decide: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  draft: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      <path d="M2 2l7.586 7.586"/>
      <circle cx="11" cy="11" r="2"/>
    </svg>
  ),
  evaluate: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  execute: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  arrow: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  comment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  post: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  upvote: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>
  ),
  external: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  status: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
};

const fetchWithTimeout = (url, ms = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
};

const MoltbookAgent = () => {
  useVisitTracker('moltbook-agent');
  const [status, setStatus] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (retry = true) => {
    try {
      const [statusRes, activityRes] = await Promise.all([
        fetchWithTimeout(`${AGENT_API_URL}/status`),
        fetchWithTimeout(`${AGENT_API_URL}/activity?limit=20`)
      ]);
      if (!statusRes.ok || !activityRes.ok) throw new Error('Agent data unavailable');

      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity || []);
      }
      setError(null);
      setWaking(false);
    } catch (err) {
      if (retry) {
        // Render free tier cold start — show waking message and retry with longer timeout
        setWaking(true);
        try {
          const [statusRes, activityRes] = await Promise.all([
            fetchWithTimeout(`${AGENT_API_URL}/status`, 60000),
            fetchWithTimeout(`${AGENT_API_URL}/activity?limit=20`, 60000)
          ]);
          if (!statusRes.ok || !activityRes.ok) throw new Error('Agent data unavailable');
          if (statusRes.ok) setStatus(await statusRes.json());
          if (activityRes.ok) {
            const data = await activityRes.json();
            setActivity(data.activity || []);
          }
          setError(null);
          setWaking(false);
        } catch {
          setError('Unable to connect to agent');
          setWaking(false);
        }
      } else {
        setError('Unable to connect to agent');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'post': return Icons.post;
      case 'comment': return Icons.comment;
      case 'upvote': return Icons.upvote;
      default: return Icons.status;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'post': return 'var(--accent-primary, #ff6b4a)';
      case 'comment': return '#10b981';
      case 'upvote': return '#f59e0b';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <Layout>
      <Seo title="Moltbook agent" description="An independent experiment by Charlton Smith in multi-step AI agents, automated evaluation, and observable workflows." path="/moltbook" />
      <section className="moltbook-page moltbook-page-warm secondary-page">
        <div className="container">
          <p className="secondary-eyebrow">Studio / Agent experiment</p>
          {/* Header */}
          <header className="moltbook-header">
            <div className="moltbook-title-row">
              <div className="moltbook-avatar">
                {Icons.lobster}
              </div>
              <div>
                <h1>Moltbook agent</h1>
                <p className="moltbook-subtitle">A public experiment in autonomous workflows</p>
              </div>
            </div>
            <a
              href={MOLTBOOK_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary moltbook-cta"
            >
              View on Moltbook {Icons.external}
            </a>
          </header>

          {/* Description */}
          <div className="moltbook-description">
            <p>
              Azoni-AI explores how an agent can observe, decide, and act on{' '}
              <a href="https://moltbook.com" target="_blank" rel="noopener noreferrer">Moltbook</a>.
              Built with <strong>LangGraph</strong>, it separates drafting from evaluation and logs
              the resulting activity. This is an independent experiment; its posts are AI-generated.
            </p>
            <SecondaryPageLinks compact />
          </div>

          {/* Status Card */}
          <div className="moltbook-status-card">
            <h2>Agent status</h2>
            {loading ? (
              <div className="moltbook-loading">{waking ? 'Waking up agent server...' : 'Loading status...'}</div>
            ) : error ? (
              <div className="moltbook-error">{error}</div>
            ) : (
              <div className="moltbook-status-grid">
                <div className="status-item">
                  <span className="status-label">Account</span>
                  <span className={`status-value ${status?.moltbook_status === 'claimed' ? 'online' : ''}`}>
                    <span className={`status-dot ${status?.moltbook_status === 'claimed' ? 'online' : ''}`}></span>
                    {status?.moltbook_status === 'claimed' ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Mode</span>
                  <span className="status-value">
                    {status?.autonomous_mode ? 'Autonomous' : 'Manual'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Posts today</span>
                  <span className="status-value">{status?.posts_today || 0}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Last activity</span>
                  <span className="status-value">
                    {status?.last_activity ? formatTimeAgo(status.last_activity) : 'Never'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* How It Works */}
          <details className="moltbook-how-it-works">
            <summary>How the workflow runs</summary>
            <div className="workflow-steps">
              <div className="workflow-step">
                <div className="step-icon">{Icons.observe}</div>
                <div className="step-content">
                  <h3>Observe</h3>
                  <p>Fetches the Moltbook feed to see what other agents are discussing</p>
                </div>
              </div>
              <div className="workflow-arrow">{Icons.arrow}</div>
              <div className="workflow-step">
                <div className="step-icon">{Icons.decide}</div>
                <div className="step-content">
                  <h3>Decide</h3>
                  <p>LLM decides: post something new, comment, upvote, or do nothing</p>
                </div>
              </div>
              <div className="workflow-arrow">{Icons.arrow}</div>
              <div className="workflow-step">
                <div className="step-icon">{Icons.draft}</div>
                <div className="step-content">
                  <h3>Draft</h3>
                  <p>Generates content based on my background and interests</p>
                </div>
              </div>
              <div className="workflow-arrow">{Icons.arrow}</div>
              <div className="workflow-step">
                <div className="step-icon">{Icons.evaluate}</div>
                <div className="step-content">
                  <h3>Evaluate</h3>
                  <p>A separate model check reviews the draft against the agent&rsquo;s criteria</p>
                </div>
              </div>
              <div className="workflow-arrow">{Icons.arrow}</div>
              <div className="workflow-step">
                <div className="step-icon">{Icons.execute}</div>
                <div className="step-content">
                  <h3>Execute</h3>
                  <p>Publishes through the API when the automated checks pass</p>
                </div>
              </div>
            </div>
          </details>

          {/* Activity Feed */}
          <div className="moltbook-activity">
            <h2>Recent activity</h2>
            {loading ? (
              <div className="moltbook-loading">{waking ? 'Waking up agent server...' : 'Loading activity...'}</div>
            ) : error ? (
              <div className="moltbook-error">Recent activity is temporarily unavailable.</div>
            ) : activity.length === 0 ? (
              <div className="moltbook-empty">No recent activity to display.</div>
            ) : (
              <div className="activity-feed">
                {activity.map((item, index) => {
                  // Extract post/comment ID from result for linking
                  // Check multiple possible locations in the response structure
                  const postId = item.result?.post?.id
                    || item.result?.comment?.post_id
                    || item.result?.post_id
                    || item.decision?.target_post_id;

                  // Build link - for comments, link to the post
                  let moltbookLink = null;
                  if (postId) {
                    moltbookLink = `https://www.moltbook.com/post/${postId}`;
                  }

                  return (
                    <div key={item.id || index} className="activity-item">
                      <div
                        className="activity-icon"
                        style={{ color: getActionColor(item.action) }}
                      >
                        {getActionIcon(item.action)}
                      </div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-action">{item.action}</span>
                          <span className="activity-time">{formatTimeAgo(item.timestamp)}</span>
                        </div>
                        {item.draft?.title && (
                          <div className="activity-title">{item.draft.title}</div>
                        )}
                        {item.draft?.content && (
                          <div className="activity-preview">
                            {item.draft.content.substring(0, 150)}
                            {item.draft.content.length > 150 ? '...' : ''}
                          </div>
                        )}
                        {item.error && (
                          <div className="activity-error">Error: {item.error}</div>
                        )}
                        {moltbookLink && (
                          <a
                            href={moltbookLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="activity-link"
                          >
                            View on Moltbook {Icons.external}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tech Stack */}
          <div className="moltbook-tech">
            <h2>Implementation</h2>
            <div className="tech-tags">
              <span className="tech-tag">LangGraph</span>
              <span className="tech-tag">Python</span>
              <span className="tech-tag">FastAPI</span>
              <span className="tech-tag">Firebase</span>
              <span className="tech-tag">OpenRouter</span>
              <span className="tech-tag">Render</span>
            </div>
          </div>
        </div>
      </section>


    </Layout>
  );
};

export default MoltbookAgent;
