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
  ),
  agent_observing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  agent_deciding: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  ),
  agent_drafting: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  ),
  // BenchPressOnly
  workout_generated: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6.5 6.5h11M6.5 17.5h11M4 10h2.5v4H4zM17.5 10H20v4h-2.5zM6.5 11h11v2h-11z"/>
    </svg>
  ),
  group_workout_generated: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  progress_analyzed: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      <path d="M22 2L12 12"/>
    </svg>
  ),
  assistant_chat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <path d="M8 10h.01M12 10h.01M16 10h.01"/>
    </svg>
  ),
  workout_autofilled: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  // Spell Brigade
  wizard_created: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  dungeon_created: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
    </svg>
  ),
  // RowCrew
  row_verified: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h4l3-9 6 18 3-9h4"/>
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
  chat_answered: '#3b82f6',
  agent_observing: '#f59e0b',
  agent_deciding: '#ec4899',
  agent_drafting: '#8b5cf6',
  // BenchPressOnly
  workout_generated: '#4ade80',
  group_workout_generated: '#4ade80',
  progress_analyzed: '#22d3ee',
  assistant_chat: '#60a5fa',
  workout_autofilled: '#a78bfa',
  // Spell Brigade
  wizard_created: '#c084fc',
  dungeon_created: '#fb923c',
  // RowCrew
  row_verified: '#06b6d4'
};

const AgentActivityFeed = ({ maxItems = 8, showReasoning = true, compact = false }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [firstLoad, setFirstLoad] = useState(true);

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
      
      // Auto-expand first item with reasoning on first load
      if (firstLoad && items.length > 0) {
        const firstWithReasoning = items.find(item => item.reasoning);
        if (firstWithReasoning) {
          setExpandedId(firstWithReasoning.id);
        }
        setFirstLoad(false);
      }
    }, (error) => {
      console.error('Failed to fetch agent activity:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [maxItems, firstLoad]);

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

      <div className={`feed-list agent-feed-list ${compact ? 'compact' : ''}`}>
        {activities.map((activity) => {
          const link = getActivityLink(activity);
          const isExpanded = expandedId === activity.id;
          const color = ACTIVITY_COLORS[activity.type] || '#888';
          const hasReasoning = showReasoning && activity.reasoning;

          const handleItemClick = (e) => {
            // Don't toggle if clicking a link
            if (e.target.tagName === 'A') return;
            if (hasReasoning) {
              setExpandedId(isExpanded ? null : activity.id);
            }
          };

          return (
            <div 
              key={activity.id} 
              className={`feed-item ${isExpanded ? 'expanded' : ''} ${hasReasoning ? 'clickable' : ''}`}
              style={{ '--activity-color': color }}
              onClick={handleItemClick}
            >
              <div className="feed-item-main">
                <div className="feed-icon" style={{ color }}>
                  {ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.project_updated}
                </div>
                
                <div className="feed-content">
                  <div className="feed-text">
                    {link ? (
                      <Link to={link} className="feed-title-link" onClick={(e) => e.stopPropagation()}>
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
                    {activity.model && (
                      <span className="feed-model">{activity.model}</span>
                    )}
                    {activity.cost != null && activity.cost > 0 && (
                      <span className="feed-cost">${activity.cost < 0.01 ? activity.cost.toFixed(6) : activity.cost.toFixed(4)}</span>
                    )}
                    {activity.tokens?.total && (
                      <span className="feed-tokens">
                        {activity.tokens.total >= 1000 
                          ? `${(activity.tokens.total / 1000).toFixed(1)}k` 
                          : activity.tokens.total} tokens
                      </span>
                    )}
                    {activity.source && (
                      <span className="feed-source">{activity.source}</span>
                    )}
                  </div>
                </div>

                {hasReasoning && (
                  <div className="feed-expand-btn" aria-label={isExpanded ? 'Hide reasoning' : 'Show reasoning'}>
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
                  </div>
                )}
              </div>

              {hasReasoning && isExpanded && (
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

      <Link to="/activity" className="feed-view-all">
        View full activity log →
      </Link>
    </div>
  );
};

export default AgentActivityFeed;