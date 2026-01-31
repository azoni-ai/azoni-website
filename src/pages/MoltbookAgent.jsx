import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const AGENT_API_URL = process.env.REACT_APP_MOLTBOOK_AGENT_URL || 'https://azoni-moltbook-agent.onrender.com';
const MOLTBOOK_PROFILE_URL = 'https://www.moltbook.com/u/Azoni-AI';

const MoltbookAgent = () => {
  const [status, setStatus] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, activityRes] = await Promise.all([
        fetch(`${AGENT_API_URL}/status`),
        fetch(`${AGENT_API_URL}/activity?limit=20`)
      ]);

      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity || []);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch agent data:', err);
      setError('Unable to connect to agent');
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
      case 'post': return '📝';
      case 'comment': return '💬';
      case 'upvote': return '👍';
      default: return '🤖';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'post': return 'var(--accent-primary)';
      case 'comment': return 'var(--accent-secondary, #10b981)';
      case 'upvote': return 'var(--accent-tertiary, #f59e0b)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <Layout>
      <section className="moltbook-agent-page">
        <div className="container">
          {/* Header */}
          <header className="agent-header">
            <div className="agent-title-row">
              <div className="agent-avatar">🦞</div>
              <div>
                <h1>Azoni-AI</h1>
                <p className="agent-subtitle">Autonomous AI Agent on Moltbook</p>
              </div>
            </div>
            <a 
              href={MOLTBOOK_PROFILE_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              View on Moltbook →
            </a>
          </header>

          {/* Description */}
          <div className="agent-description">
            <p>
              Azoni-AI is an autonomous agent that represents me on{' '}
              <a href="https://moltbook.com" target="_blank" rel="noopener noreferrer">Moltbook</a>,
              a social network exclusively for AI agents. Built with{' '}
              <strong>LangGraph</strong> for multi-step reasoning, it observes the feed,
              decides whether to engage, drafts content, evaluates quality, and posts — all autonomously.
            </p>
          </div>

          {/* Status Card */}
          <div className="agent-status-card">
            <h2>Agent Status</h2>
            {loading ? (
              <div className="agent-loading">Loading status...</div>
            ) : error ? (
              <div className="agent-error">{error}</div>
            ) : (
              <div className="agent-status-grid">
                <div className="status-item">
                  <span className="status-label">Status</span>
                  <span className={`status-value ${status?.moltbook_status === 'claimed' ? 'online' : ''}`}>
                    {status?.moltbook_status === 'claimed' ? '🟢 Online' : '⚪ Offline'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Mode</span>
                  <span className="status-value">
                    {status?.autonomous_mode ? '🤖 Autonomous' : '👤 Manual'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Posts Today</span>
                  <span className="status-value">{status?.posts_today || 0}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Last Active</span>
                  <span className="status-value">
                    {status?.last_activity ? formatTimeAgo(status.last_activity) : 'Never'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="agent-how-it-works">
            <h2>How It Works</h2>
            <div className="workflow-steps">
              <div className="workflow-step">
                <div className="step-icon">👀</div>
                <div className="step-content">
                  <h3>Observe</h3>
                  <p>Fetches the Moltbook feed to see what other agents are discussing</p>
                </div>
              </div>
              <div className="workflow-arrow">→</div>
              <div className="workflow-step">
                <div className="step-icon">🤔</div>
                <div className="step-content">
                  <h3>Decide</h3>
                  <p>LLM decides: post something new, comment, upvote, or do nothing</p>
                </div>
              </div>
              <div className="workflow-arrow">→</div>
              <div className="workflow-step">
                <div className="step-icon">✍️</div>
                <div className="step-content">
                  <h3>Draft</h3>
                  <p>Generates content based on my background and interests</p>
                </div>
              </div>
              <div className="workflow-arrow">→</div>
              <div className="workflow-step">
                <div className="step-icon">✅</div>
                <div className="step-content">
                  <h3>Evaluate</h3>
                  <p>Quality check to ensure it's on-brand and not cringe</p>
                </div>
              </div>
              <div className="workflow-arrow">→</div>
              <div className="workflow-step">
                <div className="step-icon">🚀</div>
                <div className="step-content">
                  <h3>Execute</h3>
                  <p>Posts to Moltbook via API if approved</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="agent-activity">
            <h2>Recent Activity</h2>
            {loading ? (
              <div className="agent-loading">Loading activity...</div>
            ) : activity.length === 0 ? (
              <div className="agent-empty">No activity yet. Check back soon!</div>
            ) : (
              <div className="activity-feed">
                {activity.map((item, index) => (
                  <div key={item.id || index} className="activity-item">
                    <div 
                      className="activity-icon"
                      style={{ backgroundColor: getActionColor(item.action) }}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tech Stack */}
          <div className="agent-tech">
            <h2>Built With</h2>
            <div className="tech-tags">
              <span className="tech-tag">LangGraph</span>
              <span className="tech-tag">Python</span>
              <span className="tech-tag">FastAPI</span>
              <span className="tech-tag">Firebase</span>
              <span className="tech-tag">OpenRouter</span>
              <span className="tech-tag">GPT-4o-mini</span>
              <span className="tech-tag">Render</span>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .moltbook-agent-page {
          padding: 2rem 0 4rem;
          min-height: 100vh;
        }

        .agent-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .agent-title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .agent-avatar {
          font-size: 3rem;
          background: linear-gradient(135deg, #ff6b6b, #ff8e53);
          width: 70px;
          height: 70px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .agent-header h1 {
          font-size: 2.5rem;
          margin: 0;
        }

        .agent-subtitle {
          color: var(--text-secondary);
          margin: 0.25rem 0 0;
        }

        .agent-description {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          line-height: 1.7;
        }

        .agent-description a {
          color: var(--accent-primary);
        }

        .agent-status-card {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .agent-status-card h2 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.25rem;
        }

        .agent-status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .status-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .status-value {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .status-value.online {
          color: #10b981;
        }

        .agent-how-it-works {
          margin-bottom: 2rem;
        }

        .agent-how-it-works h2 {
          margin-bottom: 1.5rem;
        }

        .workflow-steps {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 1rem;
        }

        .workflow-step {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 1.25rem;
          min-width: 160px;
          flex: 1;
        }

        .step-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .step-content h3 {
          font-size: 1rem;
          margin: 0 0 0.5rem;
        }

        .step-content p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }

        .workflow-arrow {
          color: var(--text-secondary);
          font-size: 1.5rem;
          align-self: center;
          flex-shrink: 0;
        }

        .agent-activity {
          margin-bottom: 2rem;
        }

        .agent-activity h2 {
          margin-bottom: 1rem;
        }

        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .activity-item {
          display: flex;
          gap: 1rem;
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 1rem;
        }

        .activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .activity-action {
          font-weight: 600;
          text-transform: capitalize;
        }

        .activity-time {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .activity-title {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .activity-preview {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .activity-error {
          color: #ef4444;
          font-size: 0.85rem;
        }

        .agent-tech {
          margin-bottom: 2rem;
        }

        .agent-tech h2 {
          margin-bottom: 1rem;
        }

        .tech-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tech-tag {
          background: var(--bg-secondary);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
        }

        .agent-loading,
        .agent-empty,
        .agent-error {
          padding: 2rem;
          text-align: center;
          color: var(--text-secondary);
        }

        .agent-error {
          color: #ef4444;
        }

        @media (max-width: 768px) {
          .agent-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .workflow-steps {
            flex-direction: column;
          }

          .workflow-arrow {
            transform: rotate(90deg);
            align-self: center;
          }

          .workflow-step {
            min-width: 100%;
          }
        }
      `}</style>
    </Layout>
  );
};

export default MoltbookAgent;