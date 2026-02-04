import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import '../styles/activity.css';

const ACTIVITY_ICONS = {
  blog_generated: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
    </svg>
  ),
  moltbook_post: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  moltbook_comment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  moltbook_upvote: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  ),
  rag_chunk_created: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  ),
  project_updated: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  agent_observing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  agent_deciding: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  ),
  agent_drafting: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  ),
  agent_thinking: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  )
};

const ACTIVITY_COLORS = {
  blog_generated: '#f59e0b',
  moltbook_post: '#ff6b35',
  moltbook_comment: '#10b981',
  moltbook_upvote: '#8b5cf6',
  rag_chunk_created: '#3b82f6',
  project_updated: '#6366f1',
  agent_observing: '#f59e0b',
  agent_deciding: '#ec4899',
  agent_drafting: '#8b5cf6',
  agent_thinking: '#ec4899'
};

const ACTIVITY_LABELS = {
  blog_generated: 'Blog Generated',
  moltbook_post: 'Moltbook Post',
  moltbook_comment: 'Moltbook Comment',
  moltbook_upvote: 'Moltbook Upvote',
  rag_chunk_created: 'Knowledge Added',
  project_updated: 'Project Updated',
  agent_observing: 'Observing',
  agent_deciding: 'Deciding',
  agent_drafting: 'Drafting',
  agent_thinking: 'Thinking'
};

const Activity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isLive, ] = useState(true);
  const feedRef = useRef(null);
  const [newActivityCount, setNewActivityCount] = useState(0);
  const lastCountRef = useRef(0);

  useEffect(() => {
    const activityRef = collection(db, 'agent_activity');
    let q = query(activityRef, orderBy('timestamp', 'desc'), limit(100));
    
    // For specific filters (except 'thinking' which needs client-side filtering)
    if (filter !== 'all' && filter !== 'thinking') {
      q = query(activityRef, where('type', '==', filter), orderBy('timestamp', 'desc'), limit(100));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Client-side filter for "thinking" types
      if (filter === 'thinking') {
        const thinkingTypes = ['agent_observing', 'agent_deciding', 'agent_drafting'];
        items = items.filter(item => thinkingTypes.includes(item.type));
      }
      
      // Check for new items
      if (lastCountRef.current > 0 && items.length > lastCountRef.current) {
        const newCount = items.length - lastCountRef.current;
        setNewActivityCount(prev => prev + newCount);
      }
      lastCountRef.current = items.length;
      
      setActivities(items);
      setLoading(false);
    }, (error) => {
      console.error('Failed to fetch activity:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

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
    return `${days}d ago`;
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

  const scrollToTop = () => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setNewActivityCount(0);
  };

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'moltbook_post', label: 'Posts' },
    { value: 'moltbook_comment', label: 'Comments' },
    { value: 'blog_generated', label: 'Blog' },
    { value: 'rag_chunk_created', label: 'Knowledge' },
    { value: 'thinking', label: 'Thinking' }
  ];

  return (
    <Layout>
      <div className="activity-page">
        <div className="activity-container">
          {/* Header */}
          <div className="activity-page-header">
            <div className="activity-title-section">
              <h1>
                <span className="activity-pulse"></span>
                Agent Activity
              </h1>
              <p>Real-time feed of AI agent actions and reasoning</p>
            </div>
            
            <div className="activity-controls">
              <div className="activity-filters">
                {filterOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`filter-btn ${filter === opt.value ? 'active' : ''}`}
                    onClick={() => setFilter(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              
              <div className={`live-indicator ${isLive ? 'active' : ''}`}>
                <span className="live-dot"></span>
                Live
              </div>
            </div>
          </div>

          {/* New activity notification */}
          {newActivityCount > 0 && (
            <button className="new-activity-btn" onClick={scrollToTop}>
              ↑ {newActivityCount} new {newActivityCount === 1 ? 'activity' : 'activities'}
            </button>
          )}

          {/* Activity Feed */}
          <div className="activity-feed-container" ref={feedRef}>
            {loading ? (
              <div className="activity-loading">
                <div className="loading-spinner"></div>
                <p>Loading activity...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="activity-empty">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <h3>No activity yet</h3>
                <p>Agent actions will appear here in real-time</p>
              </div>
            ) : (
              <div className="activity-timeline">
                {activities.map((activity, index) => {
                  const color = ACTIVITY_COLORS[activity.type] || '#888';
                  const icon = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.project_updated;
                  const label = ACTIVITY_LABELS[activity.type] || activity.type;
                  const link = getActivityLink(activity);
                  
                  return (
                    <div 
                      key={activity.id} 
                      className="activity-item"
                      style={{ '--activity-color': color }}
                    >
                      {/* Timeline connector */}
                      <div className="timeline-connector">
                        <div className="timeline-icon" style={{ background: color }}>
                          {icon}
                        </div>
                        {index < activities.length - 1 && <div className="timeline-line"></div>}
                      </div>
                      
                      {/* Activity content */}
                      <div className="activity-card">
                        <div className="activity-card-header">
                          <div className="activity-type-badge" style={{ background: `${color}20`, color }}>
                            {label}
                          </div>
                          <div className="activity-time">
                            <span className="time-ago">{formatTimeAgo(activity.timestamp)}</span>
                            <span className="time-full">{formatTime(activity.timestamp)}</span>
                          </div>
                        </div>
                        
                        <div className="activity-card-body">
                          <h3 className="activity-title">
                            {link ? (
                              <Link to={link}>{activity.title}</Link>
                            ) : (
                              activity.title
                            )}
                          </h3>
                          
                          {activity.description && (
                            <p className="activity-description">{activity.description}</p>
                          )}
                          
                          {/* Reasoning / Thought Process */}
                          {activity.reasoning && (
                            <div className="activity-reasoning">
                              <div className="reasoning-header">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                </svg>
                                Agent Reasoning
                              </div>
                              <p className="reasoning-text">{activity.reasoning}</p>
                            </div>
                          )}
                          
                          {/* Metadata */}
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="activity-metadata">
                              {activity.metadata.submolt && (
                                <span className="meta-tag">s/{activity.metadata.submolt}</span>
                              )}
                              {activity.metadata.post_id && (
                                <span className="meta-tag">Post: {activity.metadata.post_id.slice(0, 8)}...</span>
                              )}
                              {activity.metadata.projectId && (
                                <span className="meta-tag">Project: {activity.metadata.projectId}</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {activity.source && (
                          <div className="activity-card-footer">
                            <span className="activity-source">via {activity.source}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Activity;