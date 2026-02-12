import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link } from 'react-router-dom';
import '../styles/agent-banner.css';

// Shared icon/color maps (matching AgentActivityFeed)
const ACTIVITY_ICONS = {
  blog_generated: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
    </svg>
  ),
  moltbook_post: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  moltbook_comment: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  moltbook_upvote: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  ),
  project_updated: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  workout_generated: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6.5 6.5h11M6.5 17.5h11M4 10h2.5v4H4zM17.5 10H20v4h-2.5zM6.5 11h11v2h-11z"/>
    </svg>
  ),
  group_workout_generated: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  progress_analyzed: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/><path d="M22 2L12 12"/>
    </svg>
  ),
  assistant_chat: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <path d="M8 10h.01M12 10h.01M16 10h.01"/>
    </svg>
  ),
  workout_autofilled: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  wizard_created: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  dungeon_created: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
    </svg>
  ),
  row_verified: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h4l3-9 6 18 3-9h4"/>
    </svg>
  ),
  fitness_synced: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  ),
  agent_observing: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  agent_deciding: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
  agent_drafting: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  ),
  knowledge_generated: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  self_assessment: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ),
  error_logged: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  error_reviewed: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  ),
};

const ACTIVITY_COLORS = {
  blog_generated: '#9b5de5',
  moltbook_post: '#ff7a5c',
  moltbook_comment: '#ff7a5c',
  moltbook_upvote: '#ff7a5c',
  project_updated: '#20d9d2',
  workout_generated: '#4ade80',
  group_workout_generated: '#4ade80',
  progress_analyzed: '#22d3ee',
  assistant_chat: '#60a5fa',
  workout_autofilled: '#a78bfa',
  wizard_created: '#c084fc',
  dungeon_created: '#fb923c',
  row_verified: '#06b6d4',
  fitness_synced: '#4ade80',
  agent_observing: '#f59e0b',
  agent_deciding: '#ec4899',
  agent_drafting: '#8b5cf6',
  knowledge_generated: '#10b981',
  self_assessment: '#f59e0b',
  error_logged: '#ef4444',
  error_reviewed: '#f97316',
};

const AgentBanner = ({ 
  name, 
  description, 
  icon, 
  color, 
  secondaryColor,
  sources = [],      // filter by source field (array for multi-source like fitness)
  types = [],        // alternatively filter by type field
  link,              // single link (backward compat)
  linkLabel = 'View →',
  links = [],        // [{label, url, external}] for multiple buttons
  statusLabel,       // e.g. "Autonomous", "Playable", "Daily 9am"
  statusType = 'live', // 'live' | 'scheduled' | 'active'
  stats = [],        // [{value, label}]
  maxItems = 5,
  externalLink = false,
  children,          // custom content (e.g. blog preview)
}) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const feedRef = useRef(null);

  // Stabilize array props to prevent infinite re-renders
  const sourcesKey = useMemo(() => JSON.stringify(sources), [sources]);
  const typesKey = useMemo(() => JSON.stringify(types), [types]);

  useEffect(() => {
    const stableSources = JSON.parse(sourcesKey);
    const stableTypes = JSON.parse(typesKey);

    // If no sources or types provided, skip the query entirely
    if (stableSources.length === 0 && stableTypes.length === 0) {
      setLoading(false);
      return;
    }

    const fetchActivity = async () => {
      try {
        const activityRef = collection(db, 'agent_activity');
        let constraints = [orderBy('timestamp', 'desc'), limit(maxItems)];

        // Build filter — use 'in' for multiple sources, '==' for single
        if (stableSources.length === 1) {
          constraints = [where('source', '==', stableSources[0]), ...constraints];
        } else if (stableSources.length > 1) {
          constraints = [where('source', 'in', stableSources), ...constraints];
        } else if (stableTypes.length === 1) {
          constraints = [where('type', '==', stableTypes[0]), ...constraints];
        } else if (stableTypes.length > 1) {
          constraints = [where('type', 'in', stableTypes), ...constraints];
        }

        const q = query(activityRef, ...constraints);
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActivities(items);
        setLoading(false);
        setError(false);
      } catch (err) {
        console.error(`Failed to fetch activity for ${name}:`, err);
        setLoading(false);
        setError(true);
      }
    };

    fetchActivity();
  }, [sourcesKey, typesKey, maxItems, name]);

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Normalize links: if old single-link API used, convert
  const allLinks = links.length > 0 ? links : (link ? [{ label: linkLabel, url: link, external: externalLink }] : []);

  return (
    <div
      className="agent-banner"
      style={{ '--banner-color': color, '--banner-color-secondary': secondaryColor || color }}
    >
      <div className="agent-banner-bg"></div>
      <div className="agent-banner-content">
        {/* Left: Icon + Info */}
        <div className="agent-banner-info">
          <div className="agent-banner-icon">
            {icon}
          </div>
          <div className="agent-banner-text">
            <div className="agent-banner-header">
              <h3>{name}</h3>
              {statusLabel && (
                <span className={`agent-status-badge status-${statusType}`}>
                  <span className={`status-dot-${statusType}`}></span>
                  {statusLabel}
                </span>
              )}
            </div>
            <p>{description}</p>
          </div>
        </div>

        {/* Middle: Live Activity Feed */}
        <div className="agent-banner-feed" ref={feedRef}>
          <div className="agent-banner-feed-header">
            <span className="mini-feed-pulse"></span>
            <span className="mini-feed-label">Live Activity</span>
          </div>
          {loading ? (
            <div className="mini-feed-empty">Loading...</div>
          ) : error ? (
            <div className="mini-feed-empty">Feed connecting...</div>
          ) : sources.length === 0 && types.length === 0 ? (
            <div className="mini-feed-empty" style={{ opacity: 0.6 }}>Activity feed coming soon</div>
          ) : activities.length === 0 ? (
            <div className="mini-feed-empty">No recent activity</div>
          ) : (
            <div className="mini-feed-list">
              {activities.map((activity) => {
                const actColor = ACTIVITY_COLORS[activity.type] || '#888';
                return (
                  <div key={activity.id} className="mini-feed-item" style={{ '--item-color': actColor }}>
                    <div className="mini-feed-icon" style={{ color: actColor }}>
                      {ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.project_updated}
                    </div>
                    <div className="mini-feed-text">
                      <span className="mini-feed-title">{activity.title}</span>
                      {activity.description && (
                        <span className="mini-feed-desc">{activity.description}</span>
                      )}
                    </div>
                    <span className="mini-feed-time">{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom content (e.g. blog preview) */}
        {children && (
          <div className="agent-banner-extra">
            {children}
          </div>
        )}

        {/* Right: Stats + CTA(s) */}
        <div className="agent-banner-right">
          {stats.length > 0 && (
            <div className="agent-banner-stats">
              {stats.map((stat, i) => (
                <div key={i} className="agent-stat">
                  <span className="agent-stat-value">{stat.value}</span>
                  <span className="agent-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
          {allLinks.length > 0 && (
            <div className={allLinks.length > 1 ? 'agent-banner-ctas' : ''}>
              {allLinks.map((lnk, i) => (
                lnk.external ? (
                  <a key={i} href={lnk.url} target="_blank" rel="noopener noreferrer" className="agent-banner-cta">
                    {lnk.label}
                  </a>
                ) : (
                  <Link key={i} to={lnk.url} className="agent-banner-cta">
                    {lnk.label}
                  </Link>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentBanner;
