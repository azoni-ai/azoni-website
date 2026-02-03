import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link } from 'react-router-dom';
import '../styles/agent-feed.css';

const ACTIVITY_ICONS = {
  blog_generated: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
    </svg>
  ),
  moltbook_post: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  moltbook_comment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  moltbook_upvote: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  ),
  project_updated: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  rag_chunk_created: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
  ),
  fitness_synced: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  ),
  chat_answered: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
    </svg>
  )
};

const ACTIVITY_COLORS = {
  blog_generated: '#9b5de5',
  moltbook_post: '#ff7a5c',
  moltbook_comment: '#ff7a5c',
  moltbook_upvote: '#ff7a5c',
  project_updated: '#20d9d2',
  rag_chunk_created: '#3b82f6',
  fitness_synced: '#4ade80',
  chat_answered: '#3b82f6'
};

const AgentActivityFeed = ({ maxItems = 8, showReasoning = true }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    // Real-time listener for agent activity
    const activityRef = collection(db, 'agent_activity');
    const q = query(activityRef, orderBy('timestamp', 'desc'), limit(maxItems));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(items);
      setLoading(false);
    }, (error) => {
      console.error('Failed to fetch agent activity:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [maxItems]);

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActivityLink = (activity) => {
    switch (activity.type) {
      case 'blog_generated':
        return `/blog/${activity.metadata?.slug || activity.metadata?.id}`;
      case 'moltbook_post':
      case 'moltbook_comment':
      case 'moltbook_upvote':
        return '/moltbook';
      case 'project_updated':
        return `/projects/${activity.metadata?.projectId}`;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="agent-feed">
        <div className="agent-feed-header">
          <div className="feed-title">
            <span className="feed-pulse"></span>
            Agent Activity
          </div>
        </div>
        <div className="feed-loading">Loading activity...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="agent-feed">
        <div className="agent-feed-header">
          <div className="feed-title">
            <span className="feed-pulse"></span>
            Agent Activity
          </div>
        </div>
        <div className="feed-empty">No recent activity</div>
      </div>
    );
  }

  return (
    <div className="agent-feed">
      <div className="agent-feed-header">
        <div className="feed-title">
          <span className="feed-pulse"></span>
          Agent Activity
        </div>
        <span className="feed-live-badge">Live</span>
      </div>

      <div className="feed-list">
        {activities.map((activity) => {
          const link = getActivityLink(activity);
          const isExpanded = expandedId === activity.id;
          const color = ACTIVITY_COLORS[activity.type] || '#888';

          return (
            <div 
              key={activity.id} 
              className={`feed-item ${isExpanded ? 'expanded' : ''}`}
              style={{ '--activity-color': color }}
            >
              <div className="feed-item-main">
                <div className="feed-icon" style={{ color }}>
                  {ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.project_updated}
                </div>
                
                <div className="feed-content">
                  <div className="feed-text">
                    {link ? (
                      <Link to={link} className="feed-title-link">
                        {activity.title}
                      </Link>
                    ) : (
                      <span className="feed-title-text">{activity.title}</span>
                    )}
                    {activity.description && (
                      <span className="feed-desc"> — {activity.description}</span>
                    )}
                  </div>
                  <div className="feed-meta">
                    <span className="feed-time">{formatTimeAgo(activity.timestamp)}</span>
                    {activity.source && (
                      <span className="feed-source">{activity.source}</span>
                    )}
                  </div>
                </div>

                {showReasoning && activity.reasoning && (
                  <button 
                    className="feed-expand-btn"
                    onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                    aria-label={isExpanded ? 'Hide reasoning' : 'Show reasoning'}
                  >
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                )}
              </div>

              {showReasoning && activity.reasoning && isExpanded && (
                <div className="feed-reasoning">
                  <div className="reasoning-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                    Agent's reasoning
                  </div>
                  <p>{activity.reasoning}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Link to="/agent-log" className="feed-view-all">
        View full activity log →
      </Link>
    </div>
  );
};

export default AgentActivityFeed;