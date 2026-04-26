import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import '../styles/activity.css';
import '../styles/activity-warm.css';

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
  ),
  // BenchPressOnly
  workout_generated: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6.5 6.5h11M6.5 17.5h11M4 10h2.5v4H4zM17.5 10H20v4h-2.5zM6.5 11h11v2h-11z"/>
    </svg>
  ),
  group_workout_generated: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  progress_analyzed: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      <path d="M22 2L12 12"/>
    </svg>
  ),
  assistant_chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <path d="M8 10h.01M12 10h.01M16 10h.01"/>
    </svg>
  ),
  workout_autofilled: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  // Spell Brigade
  wizard_created: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  dungeon_created: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
    </svg>
  ),
  // RowCrew
  row_verified: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h4l3-9 6 18 3-9h4"/>
    </svg>
  ),
  // Self-improvement
  knowledge_generated: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  self_assessment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ),
  error_logged: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  error_reviewed: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  ),
  orchestrator_summary: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  blog_published: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M9 10l2 2 4-4"/>
    </svg>
  ),
  health_alert: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>
    </svg>
  ),
  owt_chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <path d="M8 10h.01M12 10h.01M16 10h.01"/>
    </svg>
  ),
  owt_blog: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
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
  agent_thinking: '#ec4899',
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
  row_verified: '#06b6d4',
  // Self-improvement
  knowledge_generated: '#10b981',
  self_assessment: '#f59e0b',
  error_logged: '#ef4444',
  error_reviewed: '#f97316',
  orchestrator_summary: '#ff7a5c',
  blog_published: '#fbbf24',
  health_alert: '#ef4444',
  owt_chat: '#d97706',
  owt_blog: '#d97706'
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
  agent_thinking: 'Thinking',
  // BenchPressOnly
  workout_generated: 'Workout Generated',
  group_workout_generated: 'Group Workout',
  progress_analyzed: 'Progress Analyzed',
  assistant_chat: 'AI Chat',
  workout_autofilled: 'Auto-filled',
  // Spell Brigade
  wizard_created: 'Wizard Created',
  dungeon_created: 'Dungeon Created',
  // RowCrew
  row_verified: 'Row Verified',
  // Self-improvement
  knowledge_generated: 'Knowledge Learned',
  self_assessment: 'Self-Assessment',
  error_logged: 'Error Detected',
  error_reviewed: 'Errors Reviewed',
  orchestrator_summary: 'Cycle Summary',
  blog_published: 'Blog Published',
  health_alert: 'Health Alert',
  owt_chat: 'OWT Chat',
  owt_blog: 'OWT Blog'
};

// Source filter config with brand colors
const SOURCE_FILTERS = [
  { value: 'all', label: 'All Agents', color: '#888', sources: null },
  { value: 'orchestrator', label: 'Orchestrator', color: '#a78bfa', sources: ['orchestrator'] },
  { value: 'azoni-ai', label: 'Chatbot', color: '#60a5fa', sources: ['azoni-ai'] },
  { value: 'daily-blog', label: 'Blog Writer', color: '#f59e0b', sources: ['daily-blog'] },
  { value: 'moltbook-agent', label: 'Social Agent', color: '#fb923c', sources: ['moltbook-agent'] },
  { value: 'fitness', label: 'Fitness', color: '#4ade80', sources: ['benchpressonly', 'rowcrew'] },
  { value: 'spell-brigade', label: 'Spell Brigade', color: '#c084fc', sources: ['spell-brigade'] },
  { value: 'old-ways-today', label: 'Old Ways Today', color: '#d97706', sources: ['old-ways-today', 'oldwaystoday'] },
];

const Activity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const feedRef = useRef(null);
  const [newActivityCount, setNewActivityCount] = useState(0);
  const lastCountRef = useRef(0);

  useEffect(() => {
    const activityRef = collection(db, 'agent_activity');
    
    let constraints = [orderBy('timestamp', 'desc'), limit(100)];
    
    // Source filter
    const filterDef = SOURCE_FILTERS.find(f => f.value === sourceFilter);
    if (filterDef && filterDef.sources) {
      if (filterDef.sources.length === 1) {
        constraints = [where('source', '==', filterDef.sources[0]), ...constraints];
      } else {
        constraints = [where('source', 'in', filterDef.sources), ...constraints];
      }
    }
    
    let unsubscribe;
    try {
      const q = query(activityRef, ...constraints);

      unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
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
    } catch (err) {
      console.error('Error setting up activity listener:', err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [sourceFilter]);

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

  const formatCost = (cost) => {
    if (cost == null || cost === 0) return null;
    const numCost = Number(cost);
    if (isNaN(numCost) || numCost === 0) return null;
    return numCost < 0.01 ? `$${numCost.toFixed(6)}` : `$${numCost.toFixed(4)}`;
  };

  const formatTokens = (tokens) => {
    if (!tokens?.total) return null;
    const total = Number(tokens.total);
    if (isNaN(total)) return null;
    return total >= 1000
      ? `${(total / 1000).toFixed(1)}k tokens`
      : `${total} tokens`;
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

  return (
    <Layout>
      <div className="activity-page activity-page-warm">
        <div className="activity-container">
          {/* Header */}
          <div className="activity-page-header">
            <div className="activity-title-section">
              <h1>
                <span className="activity-pulse"></span>
                Agent activity
              </h1>
              <p>Every action my agents take, logged in real time.</p>
            </div>
            
            <div className="activity-controls">
              <div className="source-filters">
                {SOURCE_FILTERS.map(opt => (
                  <button
                    key={opt.value}
                    className={`source-btn ${sourceFilter === opt.value ? 'active' : ''}`}
                    style={{ '--source-color': opt.color }}
                    onClick={() => setSourceFilter(opt.value)}
                  >
                    <span className="source-dot" style={{ background: opt.color }}></span>
                    {opt.label}
                  </button>
                ))}
              </div>
              
              <div className="live-indicator active">
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
                <p>
                  {sourceFilter !== 'all' 
                    ? `No activity from ${SOURCE_FILTERS.find(s => s.value === sourceFilter)?.label || sourceFilter}`
                    : 'Agent actions will appear here in real-time'}
                </p>
              </div>
            ) : (
              <div className="activity-timeline">
                {activities.map((activity, index) => {
                  const color = ACTIVITY_COLORS[activity.type] || '#888';
                  const icon = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.project_updated;
                  const label = ACTIVITY_LABELS[activity.type] || activity.type;
                  const link = getActivityLink(activity);
                  const costStr = formatCost(activity.cost);
                  const tokenStr = formatTokens(activity.tokens);
                  const title = activity.title || 'Untitled activity';
                  
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
                              <Link to={link}>{title}</Link>
                            ) : (
                              title
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
                          
                          {/* Cost / Model / Tokens badges */}
                          {(activity.model || costStr || tokenStr) && (
                            <div className="activity-metadata">
                              {activity.model && (
                                <span className="meta-tag meta-model">{activity.model}</span>
                              )}
                              {costStr && (
                                <span className="meta-tag meta-cost">{costStr}</span>
                              )}
                              {tokenStr && (
                                <span className="meta-tag meta-tokens">{tokenStr}</span>
                              )}
                            </div>
                          )}

                          {/* Other metadata */}
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="activity-metadata">
                              {activity.metadata.submolt && (
                                <span className="meta-tag">s/{activity.metadata.submolt}</span>
                              )}
                              {activity.metadata.post_id && (
                                <span className="meta-tag">Post: {String(activity.metadata.post_id).slice(0, 8)}...</span>
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