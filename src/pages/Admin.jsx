import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { db } from '../config/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';

// Billing is its own lazy chunk so the (large) admin bundle doesn't grow for
// the tabs this file implements inline.
const BillingTab = lazy(() => import('../components/billing/BillingTab'));

// Shared helper for the token-gated admin-data function (server-side reads/writes
// that Firestore rules no longer allow from the client).
export const adminData = async (action, params = {}) => {
  const res = await fetch('/.netlify/functions/admin-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('rag_admin_token') || ''}`,
    },
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `admin-data ${action} failed (${res.status})`);
  return data;
};

// Deploy/verification probes use these sessionId prefixes so real traffic views
// can drop them — without this the logs fill with repeated test questions.
const TEST_SESSION_RE = /^(probe_|deploy_|verify_|diag_|fix_|nft_probe|final_)/;
const isTestLog = (log) => TEST_SESSION_RE.test(log.sessionId || '');

// admin-data serializes Firestore Timestamps to ISO strings; the rendering code
// throughout this file expects Timestamp-like objects (`ts?.toDate?.()`). Wrap the
// strings back into that shape so nothing downstream changes.
const reviveTimestamps = (row) => {
  const out = { ...row };
  ['timestamp', 'createdAt', 'scoredAt', 'receivedAt'].forEach((k) => {
    if (typeof out[k] === 'string') {
      const d = new Date(out[k]);
      if (!Number.isNaN(d.getTime())) out[k] = { toDate: () => d };
    }
  });
  return out;
};

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('usage');
  const navigate = useNavigate();

  useEffect(() => {
    const session = sessionStorage.getItem('admin_authenticated');
    if (session === 'true') setAuthenticated(true);
  }, []);

  // Password is verified server-side (admin-data 'auth' vs RAG_ADMIN_KEY) — the
  // old client-side compare shipped the admin password inside the JS bundle.
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/.netlify/functions/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth', password }),
      });
      if (res.ok) {
        setAuthenticated(true);
        sessionStorage.setItem('admin_authenticated', 'true');
        // The verified password doubles as the bearer token for the gated
        // backend endpoints (admin-data, rag-admin, chat-eval).
        sessionStorage.setItem('rag_admin_token', password);
      } else {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || 'Invalid password');
      }
    } catch {
      setLoginError('Login service unavailable. Try again.');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('rag_admin_token');
    navigate('/');
  };

  if (!authenticated) {
    return (
      <Layout>
        <section className="section" style={{ paddingTop: '120px' }}>
          <div className="container" style={{ maxWidth: '400px' }}>
            <h1 style={{ marginBottom: 'var(--space-xl)', textAlign: 'center' }}>Admin</h1>
            <form onSubmit={handleLogin} className="admin-login-form">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="comment-input"
                required
              />
              {loginError && <p className="error-text">{loginError}</p>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Login
              </button>
            </form>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container">
          <div className="admin-header">
            <h1>Admin Panel</h1>
            <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
          </div>

          <div className="admin-main-tabs">
            <button
              className={`admin-main-tab ${activeTab === 'agents' ? 'active' : ''}`}
              onClick={() => setActiveTab('agents')}
            >
              Agents
            </button>
            <button
              className={`admin-main-tab ${activeTab === 'usage' ? 'active' : ''}`}
              onClick={() => setActiveTab('usage')}
            >
              Chat usage
            </button>
            <button
              className={`admin-main-tab ${activeTab === 'monitor' ? 'active' : ''}`}
              onClick={() => setActiveTab('monitor')}
            >
              Chat monitor
            </button>
            <button
              className={`admin-main-tab ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              Comments
            </button>
            <button
              className={`admin-main-tab ${activeTab === 'blog' ? 'active' : ''}`}
              onClick={() => setActiveTab('blog')}
            >
              Blog
            </button>
            <button
              className={`admin-main-tab ${activeTab === 'rag' ? 'active' : ''}`}
              onClick={() => setActiveTab('rag')}
            >
              RAG
            </button>
            <button
              className={`admin-main-tab ${activeTab === 'moltbook' ? 'active' : ''}`}
              onClick={() => setActiveTab('moltbook')}
            >
              Moltbook
            </button>
            <button
              className={`admin-main-tab ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              Billing
            </button>
            <button
              className={`admin-main-tab ${activeTab === 'customize' ? 'active' : ''}`}
              onClick={() => setActiveTab('customize')}
            >
              Profile
            </button>
          </div>

          {activeTab === 'agents' && <AgentsTab />}
          {activeTab === 'usage' && <UsageTab />}
          {activeTab === 'monitor' && <MonitorTab />}
          {activeTab === 'comments' && <CommentsTab />}
          {activeTab === 'blog' && <BlogTab />}
          {activeTab === 'rag' && <RAGTab />}
          {activeTab === 'moltbook' && <MoltbookTab />}
          {activeTab === 'billing' && (
            <Suspense
              fallback={
                <div style={{ padding: '40px 0', color: 'var(--text-warm-muted)' }}>
                  Loading billing...
                </div>
              }
            >
              <BillingTab />
            </Suspense>
          )}
          {activeTab === 'customize' && <CustomizeTab />}
        </div>
      </section>
    </Layout>
  );
};

// ============ AGENTS TAB ============
const AGENT_COLORS = {
  orchestrator: '#a78bfa',
  chat: '#60a5fa',
  blog: '#fbbf24',
  fitness: '#4ade80',
  gaming: '#c084fc',
  social: '#fb923c',
  oldways: '#d97706',
};

const AGENT_NAMES = {
  orchestrator: 'Conductor',
  chat: 'Azoni AI',
  blog: 'Scribe',
  fitness: 'Fitness',
  gaming: 'Spell Brigade',
  social: 'Moltbook agent',
  oldways: 'Old Ways Today',
};

const AgentsTab = () => {
  const [agentChats, setAgentChats] = useState([]);
  const [activities, setActivities] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('overview');
  const [filterAgent, setFilterAgent] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const unsubscribes = [];

    // Agent chat logs + error logs live behind the admin-data function (their
    // collections have no client read access), so they load as one-shot fetches.
    adminData('list-agent-chat-logs', { limit: 200 })
      .then(({ logs }) => setAgentChats((logs || []).map(reviveTimestamps)))
      .catch((err) => console.error('agentChatLogs error:', err));
    adminData('list-errors', { limit: 200 })
      .then(({ errors }) => setErrorLogs((errors || []).map(reviveTimestamps)))
      .catch((err) => console.error('error_logs error:', err))
      .finally(() => setLoading(false));

    // Agent activity stays real-time — it is a public-read collection.
    const q2 = query(
      collection(db, 'agent_activity'),
      orderBy('timestamp', 'desc'),
      limit(500)
    );
    unsubscribes.push(onSnapshot(q2, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('agent_activity error:', err)));

    return () => unsubscribes.forEach(u => u());
  }, []);

  // ─── Stats ───
  const chatStats = useMemo(() => {
    const byAgent = {};
    let totalTokens = 0;
    let totalCost = 0;
    const today = new Date(); today.setHours(0,0,0,0);
    let todayChats = 0;
    let todayCost = 0;

    agentChats.forEach(log => {
      const agent = log.agent || 'unknown';
      if (!byAgent[agent]) byAgent[agent] = { count: 0, tokens: 0, cost: 0 };
      byAgent[agent].count++;
      const tok = log.usage?.total_tokens || 0;
      const cost = parseFloat(log.usage?.totalCost || 0);
      byAgent[agent].tokens += tok;
      byAgent[agent].cost += cost;
      totalTokens += tok;
      totalCost += cost;

      if (log.timestamp?.toDate && log.timestamp.toDate() >= today) {
        todayChats++;
        todayCost += cost;
      }
    });

    return { byAgent, totalTokens, totalCost, todayChats, todayCost, total: agentChats.length };
  }, [agentChats]);

  const activityStats = useMemo(() => {
    const byType = {};
    activities.forEach(a => {
      const type = a.type || a.action || 'unknown';
      if (!byType[type]) byType[type] = 0;
      byType[type]++;
    });
    return { byType, total: activities.length };
  }, [activities]);

  const errorStats = useMemo(() => {
    const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
    const bySource = {};
    const unresolved = errorLogs.filter(e => !e.resolved).length;
    errorLogs.forEach(e => {
      if (bySeverity[e.severity] !== undefined) bySeverity[e.severity]++;
      const src = e.source || 'unknown';
      if (!bySource[src]) bySource[src] = 0;
      bySource[src]++;
    });
    return { bySeverity, bySource, unresolved, total: errorLogs.length };
  }, [errorLogs]);

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredChats = filterAgent === 'all' ? agentChats : agentChats.filter(c => c.agent === filterAgent);
  const filteredActivities = filterAgent === 'all' ? activities : activities.filter(a => {
    const type = (a.type || a.action || '').toLowerCase();
    return type.includes(filterAgent);
  });
  const filteredErrors = filterAgent === 'all' ? errorLogs : errorLogs.filter(e => (e.source || '').toLowerCase().includes(filterAgent));

  if (loading) return <p>Loading agent data...</p>;

  return (
    <div className="agents-tab">
      <div className="admin-tabs" style={{ marginBottom: 'var(--space-md)' }}>
        <button className={`admin-tab ${subTab === 'overview' ? 'active' : ''}`} onClick={() => setSubTab('overview')}>
          Overview
        </button>
        <button className={`admin-tab ${subTab === 'chats' ? 'active' : ''}`} onClick={() => setSubTab('chats')}>
          Agent chats ({agentChats.length})
        </button>
        <button className={`admin-tab ${subTab === 'activity' ? 'active' : ''}`} onClick={() => setSubTab('activity')}>
          Activity ({activities.length})
        </button>
        <button className={`admin-tab ${subTab === 'errors' ? 'active' : ''}`} onClick={() => setSubTab('errors')}>
          Errors ({errorLogs.length})
        </button>
      </div>

      {/* Agent filter */}
      {subTab !== 'overview' && (
        <div style={{ marginBottom: 'var(--space-md)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className={`admin-tab ${filterAgent === 'all' ? 'active' : ''}`}
            onClick={() => setFilterAgent('all')}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >All</button>
          {Object.entries(AGENT_NAMES).map(([key, name]) => (
            <button
              key={key}
              className={`admin-tab ${filterAgent === key ? 'active' : ''}`}
              onClick={() => setFilterAgent(key)}
              style={{ fontSize: '0.75rem', padding: '4px 10px', borderColor: filterAgent === key ? AGENT_COLORS[key] : undefined, color: filterAgent === key ? AGENT_COLORS[key] : undefined }}
            >{name}</button>
          ))}
        </div>
      )}

      {/* OVERVIEW */}
      {subTab === 'overview' && (
        <>
          {/* Top-level stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{chatStats.total}</div>
              <div className="stat-label">Agent chats</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{chatStats.totalTokens.toLocaleString()}</div>
              <div className="stat-label">Chat tokens</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${chatStats.totalCost.toFixed(6)}</div>
              <div className="stat-label">Chat cost</div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-value">{chatStats.todayChats}</div>
              <div className="stat-label">Today&rsquo;s chats</div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-value">{activityStats.total}</div>
              <div className="stat-label">Agent events</div>
            </div>
            <div className="stat-card" style={errorStats.unresolved > 0 ? { borderColor: '#f87171' } : {}}>
              <div className="stat-value">{errorStats.unresolved}</div>
              <div className="stat-label">Unresolved errors</div>
            </div>
          </div>

          {/* Per-agent chat breakdown */}
          <h3 style={{ margin: 'var(--space-xl) 0 var(--space-md)' }}>Usage by agent</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: 'var(--space-xl)' }}>
            {Object.entries(chatStats.byAgent).sort((a,b) => b[1].count - a[1].count).map(([agent, data]) => (
              <div key={agent} style={{
                background: 'var(--bg-card)', border: `1px solid ${AGENT_COLORS[agent] || '#333'}30`, borderRadius: 'var(--radius-md)',
                padding: '14px', borderLeft: `3px solid ${AGENT_COLORS[agent] || '#666'}`,
              }}>
                <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase', color: AGENT_COLORS[agent] || '#888', marginBottom: '8px' }}>
                  {AGENT_NAMES[agent] || agent}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Chats</span>
                  <span style={{ textAlign: 'right', fontWeight: 600 }}>{data.count}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Tokens</span>
                  <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{data.tokens.toLocaleString()}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Cost</span>
                  <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>${data.cost.toFixed(6)}</span>
                </div>
              </div>
            ))}
            {Object.keys(chatStats.byAgent).length === 0 && (
              <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>No agent chats logged yet. Visit the Chat page and talk to Azoni AI.</p>
            )}
          </div>

          {/* Activity type breakdown */}
          <h3 style={{ margin: '0 0 var(--space-md)' }}>Activity by type</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--space-xl)' }}>
            {Object.entries(activityStats.byType).sort((a,b) => b[1] - a[1]).map(([type, count]) => (
              <span key={type} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                padding: '6px 12px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
              }}>
                {type} <strong>{count}</strong>
              </span>
            ))}
          </div>

          {/* Error breakdown */}
          <h3 style={{ margin: '0 0 var(--space-md)' }}>Errors by severity</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
            {Object.entries(errorStats.bySeverity).map(([sev, count]) => {
              const sevColors = { low: '#6b7280', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
              return (
                <div key={sev} style={{
                  background: 'var(--bg-card)', border: `1px solid ${sevColors[sev]}40`, borderRadius: 'var(--radius-md)',
                  padding: '10px 16px', textAlign: 'center', minWidth: '90px',
                }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: sevColors[sev] }}>{count}</div>
                  <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>{sev}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(errorStats.bySource).sort((a,b) => b[1] - a[1]).map(([src, count]) => (
              <span key={src} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                padding: '4px 10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
              }}>
                {src} <strong>{count}</strong>
              </span>
            ))}
          </div>
        </>
      )}

      {/* AGENT CHATS */}
      {subTab === 'chats' && (
        <div className="sessions-list">
          {filteredChats.length === 0 ? (
            <p className="comments-empty">No agent chats logged yet.</p>
          ) : filteredChats.map(log => (
            <div key={log.id} className="session-card">
              <div
                className="session-header"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              >
                <div className="session-info">
                  <span style={{ color: AGENT_COLORS[log.agent], fontWeight: 600, minWidth: '100px' }}>
                    {AGENT_NAMES[log.agent] || log.agent}
                  </span>
                  <span className="session-date">{formatDate(log.timestamp)}</span>
                  <span className="session-model">{log.model || 'gpt-4o-mini'}</span>
                </div>
                <div className="session-stats">
                  <span>{(log.usage?.total_tokens || 0).toLocaleString()} tok</span>
                  <span>${log.usage?.totalCost || '0'}</span>
                  <span className="expand-icon">{expandedId === log.id ? '▼' : '▶'}</span>
                </div>
              </div>
              {expandedId === log.id && (
                <div className="session-messages-list">
                  <div className="chat-log-item">
                    <div className="chat-log-user"><strong>User:</strong> {log.userMessage}</div>
                    <div className="chat-log-assistant">
                      <strong>{AGENT_NAMES[log.agent] || log.agent}:</strong> {log.reply}
                    </div>
                    {log.usage && (
                      <div className="chat-log-meta">
                        <span>In: {log.usage.prompt_tokens}</span>
                        <span>Out: {log.usage.completion_tokens}</span>
                        <span>Total: {log.usage.total_tokens}</span>
                        <span>${log.usage.totalCost}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ACTIVITY LOGS */}
      {subTab === 'activity' && (
        <div className="sessions-list">
          {filteredActivities.length === 0 ? (
            <p className="comments-empty">No activity logged yet.</p>
          ) : filteredActivities.slice(0, 100).map(act => (
            <div key={act.id} className="session-card">
              <div
                className="session-header"
                onClick={() => setExpandedId(expandedId === act.id ? null : act.id)}
              >
                <div className="session-info">
                  <span style={{ fontWeight: 600, minWidth: '140px', textTransform: 'capitalize', fontSize: '0.85rem' }}>
                    {act.type || act.action || 'event'}
                  </span>
                  <span className="session-date">{formatDate(act.timestamp)}</span>
                  {act.agent && <span className="session-model">{act.agent}</span>}
                </div>
                <div className="session-stats">
                  {act.cost != null && <span>${parseFloat(act.cost).toFixed(6)}</span>}
                  {act.tokens && <span>{(act.tokens.prompt || 0) + (act.tokens.completion || 0)} tok</span>}
                  <span className="expand-icon">{expandedId === act.id ? '▼' : '▶'}</span>
                </div>
              </div>
              {expandedId === act.id && (
                <div className="session-messages-list">
                  <div className="chat-log-item">
                    {act.description && (
                      <div style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        {act.description}
                      </div>
                    )}
                    {act.details && (
                      <pre style={{
                        background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                        padding: '10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', overflow: 'auto',
                        maxHeight: '300px', whiteSpace: 'pre-wrap', color: 'var(--text-muted)',
                      }}>
                        {typeof act.details === 'string' ? act.details : JSON.stringify(act.details, null, 2)}
                      </pre>
                    )}
                    {act.reasoning && (
                      <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Reasoning: {act.reasoning}
                      </div>
                    )}
                    {(act.tokens || act.cost != null) && (
                      <div className="chat-log-meta" style={{ marginTop: '8px' }}>
                        {act.tokens?.prompt && <span>In: {act.tokens.prompt}</span>}
                        {act.tokens?.completion && <span>Out: {act.tokens.completion}</span>}
                        {act.cost != null && <span>Cost: ${parseFloat(act.cost).toFixed(6)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ERROR LOGS */}
      {subTab === 'errors' && (
        <div className="sessions-list">
          {filteredErrors.length === 0 ? (
            <p className="comments-empty">No errors logged.</p>
          ) : filteredErrors.slice(0, 100).map(err => {
            const sevColors = { low: '#6b7280', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
            return (
              <div key={err.id} className="session-card" style={{ borderLeft: `3px solid ${sevColors[err.severity] || '#666'}` }}>
                <div
                  className="session-header"
                  onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}
                >
                  <div className="session-info">
                    <span style={{
                      fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 8px',
                      background: `${sevColors[err.severity]}20`, color: sevColors[err.severity],
                      borderRadius: '3px', textTransform: 'uppercase', fontWeight: 600,
                    }}>
                      {err.severity}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{err.source || 'unknown'}</span>
                    <span className="session-date">{formatDate(err.timestamp)}</span>
                    <span style={{
                      fontSize: '0.7rem', padding: '2px 6px', borderRadius: '3px',
                      background: err.resolved ? '#10b98120' : '#ef444420',
                      color: err.resolved ? '#10b981' : '#ef4444',
                    }}>
                      {err.resolved ? 'resolved' : 'open'}
                    </span>
                  </div>
                  <div className="session-stats">
                    <span className="expand-icon">{expandedId === err.id ? '▼' : '▶'}</span>
                  </div>
                </div>
                {expandedId === err.id && (
                  <div className="session-messages-list">
                    <div className="chat-log-item">
                      <div style={{ marginBottom: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: sevColors[err.severity] }}>
                        {err.error}
                      </div>
                      {err.context && (
                        <pre style={{
                          background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                          padding: '10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', overflow: 'auto',
                          maxHeight: '200px', whiteSpace: 'pre-wrap', color: 'var(--text-muted)',
                        }}>
                          {typeof err.context === 'string' ? err.context : JSON.stringify(err.context, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============ BLOG TAB ============
const BlogTab = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const emptyPost = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    tags: [],
    relatedProject: '',
    published: false
  };

  const [formData, setFormData] = useState(emptyPost);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'blogPosts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const blogPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(blogPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: editingPost ? prev.slug : generateSlug(title)
    }));
  };

  const insertImageMarkdown = () => {
    const url = prompt('Paste image URL:');
    if (url) {
      const alt = prompt('Image description (optional):') || 'image';
      const imageMarkdown = `\n\n![${alt}](${url})\n\n`;
      setFormData(prev => ({ ...prev, content: prev.content + imageMarkdown }));
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const savePost = async () => {
    if (!formData.title || !formData.slug) {
      alert('Title and slug are required');
      return;
    }

    setSaving(true);
    try {
      // Writes go through admin-data (blogPosts is no longer client-writable);
      // timestamps are stamped server-side.
      await adminData('save-blog-post', {
        id: editingPost?.id || null,
        post: formData,
        setPublishedAt: !!(formData.published && !editingPost?.publishedAt),
      });

      setShowEditor(false);
      setEditingPost(null);
      setFormData(emptyPost);
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to save post');
    }
    setSaving(false);
  };

  const editPost = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      coverImage: post.coverImage || '',
      tags: post.tags || [],
      relatedProject: post.relatedProject || '',
      published: post.published || false
    });
    setShowEditor(true);
  };

  const deletePost = async (post) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    await adminData('delete-blog-post', { id: post.id });
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (showEditor) {
    return (
      <div className="blog-editor">
        <div className="blog-editor-header">
          <h2>{editingPost ? 'Edit post' : 'New post'}</h2>
          <button className="btn btn-secondary" onClick={() => { setShowEditor(false); setEditingPost(null); setFormData(emptyPost); }}>
            Cancel
          </button>
        </div>

        <div className="blog-form">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="Post title"
              className="comment-input"
            />
          </div>

          <div className="form-group">
            <label>Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="url-friendly-slug"
              className="comment-input"
            />
            <small>URL: /blog/{formData.slug || 'your-slug'}</small>
          </div>

          <div className="form-group">
            <label>Excerpt</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Brief description for cards and SEO..."
              className="comment-textarea"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Cover image URL</label>
            <input
              type="text"
              value={formData.coverImage}
              onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              className="comment-input"
            />
            {formData.coverImage && (
              <div className="cover-preview">
                <img src={formData.coverImage} alt="Cover preview" />
              </div>
            )}
            <small>Tip: Upload to GitHub issue, Cloudinary, or imgbb and paste URL</small>
          </div>

          <div className="form-group">
            <label>Content (Markdown)</label>
            <div className="content-toolbar">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={insertImageMarkdown}
              >
                Insert image
              </button>
            </div>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Write your post in markdown...

# Heading 1
## Heading 2

**bold** and *italic*

- bullet list
- item 2

`inline code`

```javascript
code block
```

[link text](url)

![image alt](image-url)"
              className="comment-textarea content-editor"
              rows={20}
            />
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div className="tags-input-area">
              <div className="tags-list">
                {formData.tags.map(tag => (
                  <span key={tag} className="blog-tag editable" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </span>
                ))}
              </div>
              <div className="tag-input-row">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                  className="comment-input"
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addTag}>Add</button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Related project (optional)</label>
            <input
              type="text"
              value={formData.relatedProject}
              onChange={(e) => setFormData(prev => ({ ...prev, relatedProject: e.target.value }))}
              placeholder="project-id (e.g., row-crew)"
              className="comment-input"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
              />
              Published
            </label>
          </div>

          <div className="form-actions">
            <button 
              className="btn btn-primary" 
              onClick={savePost}
              disabled={saving}
            >
              {saving ? 'Saving…' : (editingPost ? 'Update post' : 'Create post')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-tab">
      <div className="blog-tab-header">
        <h3>Blog posts ({posts.length})</h3>
        <button className="btn btn-primary" onClick={() => setShowEditor(true)}>
          + New post
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : posts.length === 0 ? (
        <p className="comments-empty">No blog posts yet.</p>
      ) : (
        <div className="blog-posts-list">
          {posts.map(post => (
            <div key={post.id} className={`blog-post-item ${post.published ? 'published' : 'draft'}`}>
              <div className="blog-post-info">
                <h4>{post.title}</h4>
                <div className="blog-post-meta-admin">
                  <span className={`status-badge ${post.published ? 'published' : 'draft'}`}>
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                  <span>/blog/{post.slug}</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>
              <div className="blog-post-actions">
                {post.published && (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    View
                  </a>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => editPost(post)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => deletePost(post)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ USAGE TAB ============
const AVAILABLE_MODELS = [
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI', cost: '~$0.0006' },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI', cost: '~$0.0002' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', cost: '~$0.0003' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', cost: '~$0.003' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', cost: '~$0.0009' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'Google', cost: '~$0.0002' },
  { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta', cost: '~$0.0002' },
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek', cost: '~$0.0002' },
  { id: 'mistralai/mistral-small-3.2-24b-instruct', name: 'Mistral Small 3.2', provider: 'Mistral', cost: '~$0.0001' },
];

const UsageTab = () => {
  const [chatLogs, setChatLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState(null);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-5-mini');
  const [savingModel, setSavingModel] = useState(false);
  const [stats, setStats] = useState({
    totalChats: 0,
    totalTokens: 0,
    totalCost: 0,
    todayChats: 0,
    todayCost: 0
  });

  useEffect(() => {
    const fetchModel = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'chat'));
        if (settingsDoc.exists() && settingsDoc.data().model) {
          setSelectedModel(settingsDoc.data().model);
        }
      } catch (err) {
        console.error('Error fetching model:', err);
      }
    };
    fetchModel();
  }, []);

  const saveModel = async (model) => {
    setSavingModel(true);
    try {
      // settings writes go through admin-data (no longer client-writable).
      await adminData('set-chat-model', { model });
      setSelectedModel(model);
    } catch (err) {
      console.error('Error saving model:', err);
      alert('Failed to save model setting');
    }
    setSavingModel(false);
  };

  // chatLogs is no longer publicly readable (visitor privacy) — load a bounded
  // window through admin-data instead of an unbounded real-time listener. This
  // also fixes the old quota hazard of onSnapshot over the whole collection.
  useEffect(() => {
    adminData('list-chat-logs', { limit: 500 })
      .then(({ logs }) => {
        // Dedupe the dual client+server rows per turn (same as MonitorTab) so the
        // usage numbers count each turn once, and drop test-probe traffic.
        const revived = mergeChatLogs((logs || []).map(reviveTimestamps)).filter((l) => !isTestLog(l));
        setChatLogs(revived);
        calculateStats(revived);
      })
      .catch((error) => console.error('Error loading chat logs:', error))
      .finally(() => setLoading(false));
  }, []);

  const calculateStats = (logs) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalTokens = 0;
    let totalCost = 0;
    let todayChats = 0;
    let todayCost = 0;

    logs.forEach(log => {
      const tokens = log.usage?.total_tokens || 0;
      const cost = parseFloat(log.usage?.totalCost || 0);
      totalTokens += tokens;
      totalCost += cost;

      if (log.timestamp?.toDate) {
        const logDate = log.timestamp.toDate();
        if (logDate >= today) {
          todayChats++;
          todayCost += cost;
        }
      }
    });

    setStats({
      totalChats: logs.length,
      totalTokens,
      totalCost: totalCost.toFixed(6),
      todayChats,
      todayCost: todayCost.toFixed(6)
    });
  };

  // One card per PERSON's visit, not per page-load: the journeyId (per-tab) joins
  // hero-widget turns with a later full-chat session; linkedSessionId covers older
  // handoff rows; plain sessionId is the fallback for everything else.
  const groupedSessions = chatLogs.reduce((acc, log) => {
    const groupKey = log.journeyId || log.linkedSessionId || log.sessionId || 'unknown';
    if (!acc[groupKey]) {
      acc[groupKey] = {
        logs: [],
        totalTokens: 0,
        totalCost: 0,
        mode: log.mode,
        model: log.model,
        context: log.context || 'azoni-ai'
      };
    }
    acc[groupKey].logs.push(log);
    acc[groupKey].totalTokens += log.usage?.total_tokens || 0;
    acc[groupKey].totalCost += parseFloat(log.usage?.totalCost || 0);
    return acc;
  }, {});

  const sessions = Object.entries(groupedSessions)
    .map(([id, data]) => {
      // Conversation order inside the card; newest-activity order across cards.
      const logs = [...data.logs].sort((a, b) => {
        const aT = a.timestamp?.toDate?.() || new Date(0);
        const bT = b.timestamp?.toDate?.() || new Date(0);
        return aT - bT;
      });
      return {
        id,
        ...data,
        logs,
        firstTimestamp: logs[0]?.timestamp,
        lastTimestamp: logs[logs.length - 1]?.timestamp,
        preview: logs[0]?.userMessage || ''
      };
    })
    .sort((a, b) => {
      const aTime = a.lastTimestamp?.toDate?.() || new Date(0);
      const bTime = b.lastTimestamp?.toDate?.() || new Date(0);
      return bTime - aTime;
    });

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return <p>Loading chat logs...</p>;

  return (
    <div className="usage-tab">
      <div className="model-selector">
        <h3>Active model</h3>
        <div className="model-grid">
          {AVAILABLE_MODELS.map((m) => (
            <button
              key={m.id}
              className={`model-card ${selectedModel === m.id ? 'active' : ''}`}
              onClick={() => saveModel(m.id)}
              disabled={savingModel}
            >
              <span className="model-provider">{m.provider}</span>
              <span className="model-name">{m.name}</span>
              <span className="model-cost">{m.cost}/chat</span>
            </button>
          ))}
        </div>
        {savingModel && <p className="saving-text">Saving...</p>}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalChats}</div>
          <div className="stat-label">Total chats</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalTokens.toLocaleString()}</div>
          <div className="stat-label">Total tokens</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${stats.totalCost}</div>
          <div className="stat-label">Total cost</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">{stats.todayChats}</div>
          <div className="stat-label">Today&rsquo;s chats</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">${stats.todayCost}</div>
          <div className="stat-label">Today&rsquo;s cost</div>
        </div>
      </div>

      <h3 style={{ marginTop: 'var(--space-xl)', marginBottom: 'var(--space-md)' }}>
        Chat Sessions ({sessions.length})
      </h3>
      
      {sessions.length === 0 ? (
        <p className="comments-empty">No chat logs yet.</p>
      ) : (
        <div className="sessions-list">
          {sessions.map((session) => (
            <div key={session.id} className="session-card">
              <div 
                className="session-header"
                onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
              >
                <div className="session-info">
                  <span className="session-date">{formatDate(session.firstTimestamp)}</span>
                  <span className={`session-source ${session.context === 'autoenhance-interview' ? 'source-autoenhance' : 'source-portfolio'}`}>
                    {session.context === 'autoenhance-interview' ? 'Autoenhance' : 'Portfolio'}
                  </span>
                  <span className="session-model">{session.model || 'gpt-4'}</span>
                  <span className="session-messages">{session.logs.length} msg</span>
                  <span
                    className="session-preview"
                    style={{
                      color: 'var(--text-warm-soft, #9ca3af)',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                      flex: 1
                    }}
                  >
                    {session.preview.slice(0, 110)}
                  </span>
                </div>
                <div className="session-stats">
                  <span>{session.totalTokens.toLocaleString()} tok</span>
                  <span>${session.totalCost.toFixed(6)}</span>
                  <span className="expand-icon">{expandedSession === session.id ? '▼' : '▶'}</span>
                </div>
              </div>
              
              {expandedSession === session.id && (
                <div className="session-messages-list">
                  {session.logs.map((log) => (
                    <div key={log.id} className="chat-log-item">
                      <div className="chat-log-user">
                        <strong>User:</strong> {log.userMessage}
                      </div>
                      <div className="chat-log-assistant" style={{ whiteSpace: 'pre-wrap' }}>
                        <strong>Assistant:</strong> {log.assistantMessage}
                      </div>
                      {log.usage && (
                        <div className="chat-log-meta">
                          <span>{formatDate(log.timestamp)}</span>
                          <span>{log.model || 'gpt-4'}</span>
                          <span>In: {log.usage.prompt_tokens}</span>
                          <span>Out: {log.usage.completion_tokens}</span>
                          <span>${log.usage.totalCost}</span>
                          {log.streamed != null && <span>{log.streamed ? 'streamed' : 'non-stream'}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ CHAT MONITOR TAB (audit trail + eval) ============
const monitorTokenHeaders = () => {
  const token = sessionStorage.getItem('rag_admin_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const scoreColor = (n) => (n == null ? '#64748b' : n >= 0.7 ? '#10b981' : n >= 0.4 ? '#f59e0b' : '#ef4444');
const verdictColor = (v) => (v === 'pass' ? '#10b981' : v === 'warn' ? '#f59e0b' : '#ef4444');

// Both the chat function and useChat log a turn, so collapse duplicates. New rows
// carry a per-turn turnId (exact dedupe — a genuinely repeated question stays two
// turns); legacy rows fall back to (session + question).
const mergeChatLogs = (logs) => {
  const groups = new Map();
  for (const log of logs) {
    const key = log.turnId
      ? `t::${log.turnId}`
      : `${log.sessionId || '?'}::${(log.userMessage || '').slice(0, 200)}`;
    if (!groups.has(key)) {
      groups.set(key, { ...log, _scoreId: log.id });
      continue;
    }
    const cur = groups.get(key);
    const curTop = Array.isArray(cur.rag?.topChunks) && cur.rag.topChunks.length;
    const newTop = Array.isArray(log.rag?.topChunks) && log.rag.topChunks.length;
    if (!curTop && newTop) { cur.rag = log.rag; cur._scoreId = log.id; }
    if (!cur.usage?.totalCost && log.usage?.totalCost) cur.usage = log.usage;
    if (cur.latencyMs == null && log.latencyMs != null) cur.latencyMs = log.latencyMs;
    if (cur.streamed == null && log.streamed != null) cur.streamed = log.streamed;
    // Backfill the grouping keys from whichever duplicate carries them, so the
    // UsageTab conversation key doesn't depend on which copy was seen first.
    if (!cur.journeyId && log.journeyId) cur.journeyId = log.journeyId;
    if (!cur.linkedSessionId && log.linkedSessionId) cur.linkedSessionId = log.linkedSessionId;
    if (!cur.context && log.context) cur.context = log.context;
    if (!cur.eval && log.eval) cur.eval = log.eval;
    if (!cur.modelName && log.modelName) cur.modelName = log.modelName;
    if ((!cur.assistantMessage || cur.assistantMessage.length < (log.assistantMessage || '').length)) {
      cur.assistantMessage = log.assistantMessage;
    }
  }
  return [...groups.values()];
};

const ragBestScore = (rag) => {
  if (!rag) return null;
  if (Array.isArray(rag.topChunks) && rag.topChunks.length) return Number(rag.topChunks[0].similarity);
  if (rag.bestRetrievalScore != null) return Number(rag.bestRetrievalScore);
  return null;
};

const MonitorTab = () => {
  const [view, setView] = useState('audit');
  const [logs, setLogs] = useState([]);
  const [evalRuns, setEvalRuns] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [intentFilter, setIntentFilter] = useState('all');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const [evalModel, setEvalModel] = useState('openai/gpt-5-mini');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [scoring, setScoring] = useState({});

  // All four feeds load through admin-data: chatLogs is privacy-locked, and the
  // gaps/evals/errors collections never had client read rules (those views were
  // silently empty before this). refreshTick re-pulls everything on demand.
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    adminData('list-chat-logs', { limit: 300 })
      .then(({ logs: rows }) => setLogs((rows || []).map(reviveTimestamps).filter((l) => !isTestLog(l))))
      .catch((err) => console.error('monitor chatLogs error:', err))
      .finally(() => setLoading(false));
    adminData('list-evals', { limit: 20 })
      .then(({ evals }) => setEvalRuns((evals || []).map(reviveTimestamps)))
      .catch(() => {});
    adminData('list-gaps', { limit: 50 })
      .then(({ gaps: rows }) => setGaps((rows || []).map(reviveTimestamps)))
      .catch(() => {});
    adminData('list-errors', { limit: 80 })
      .then(({ errors: all }) => setErrors((all || []).map(reviveTimestamps).filter((e) => /chat/i.test(e.source || ''))))
      .catch(() => {});
  }, [refreshTick]);

  const merged = useMemo(() => mergeChatLogs(logs), [logs]);
  const latestRun = evalRuns[0];

  const stats = useMemo(() => {
    const n = merged.length || 1;
    let cost = 0, lat = 0, latCount = 0, streamed = 0, gapCount = 0;
    merged.forEach((l) => {
      cost += parseFloat(l.usage?.totalCost || 0);
      if (l.latencyMs != null) { lat += l.latencyMs; latCount++; }
      if (l.streamed) streamed++;
      const best = ragBestScore(l.rag);
      const indicatesGap = (Array.isArray(l.rag?.topChunks) && l.rag.topChunks.length === 0) || (best != null && best < 0.25);
      if (indicatesGap) gapCount++;
    });
    return {
      total: merged.length,
      cost: cost.toFixed(5),
      avgLatency: latCount ? Math.round(lat / latCount) : null,
      streamedPct: Math.round((streamed / n) * 100),
      gapRate: Math.round((gapCount / n) * 100),
    };
  }, [merged]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return merged.filter((l) => {
      if (intentFilter !== 'all' && l.rag?.intent !== intentFilter) return false;
      if (onlyFlagged) {
        const flagged = (l.eval && l.eval.verdict !== 'pass') || (Array.isArray(l.rag?.topChunks) && l.rag.topChunks.length === 0);
        if (!flagged) return false;
      }
      if (s && !(`${l.userMessage} ${l.assistantMessage}`.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [merged, search, intentFilter, onlyFlagged]);

  const runSuite = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch('/.netlify/functions/chat-eval/run-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...monitorTokenHeaders() },
        body: JSON.stringify({ model: evalModel }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.details || e.error || `HTTP ${res.status}`);
      }
      await res.json();
      setView('eval');
      setRefreshTick((t) => t + 1); // pull the new eval run into the feeds
    } catch (err) {
      setRunError(err.message);
    }
    setRunning(false);
  };

  const scoreTurn = async (log) => {
    const id = log._scoreId || log.id;
    setScoring((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch('/.netlify/functions/chat-eval/score-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...monitorTokenHeaders() },
        body: JSON.stringify({
          question: log.userMessage,
          answer: log.assistantMessage,
          chunkIds: (log.rag?.topChunks || []).map((c) => c.id),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.details || e.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      // chatLogs updates are rules-denied from the client (this call silently
      // failed for months) — persist the score through admin-data instead.
      await adminData('save-eval', { logId: id, evalData: { ...result, scoredAt: new Date().toISOString() } });
      setRefreshTick((t) => t + 1);
    } catch (err) {
      alert(`Scoring failed: ${err.message}`);
    }
    setScoring((p) => ({ ...p, [id]: false }));
  };

  const fmt = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A');
  const intents = ['all', 'general', 'experience', 'projects', 'skills', 'fitness', 'activity', 'agents', 'fabstats', 'rowcrew', 'spellbrigade', 'moltbook', 'oldways', 'education', 'contact', 'negotiation', 'services'];

  const card = { background: 'var(--surface, #111827)', border: '1px solid var(--border, #1f2937)', borderRadius: 10, padding: '12px 14px' };
  const badge = (text, color) => (<span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 999, background: `${color}22`, color, border: `1px solid ${color}55`, whiteSpace: 'nowrap' }}>{text}</span>);

  if (loading) return <p>Loading chat monitor…</p>;

  return (
    <div className="monitor-tab">
      {/* Aggregate cards */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">Turns (deduped)</div></div>
        <div className="stat-card"><div className="stat-value">{stats.avgLatency != null ? `${stats.avgLatency}ms` : '—'}</div><div className="stat-label">Avg latency</div></div>
        <div className="stat-card"><div className="stat-value">${stats.cost}</div><div className="stat-label">Logged cost</div></div>
        <div className="stat-card"><div className="stat-value">{stats.streamedPct}%</div><div className="stat-label">Streamed</div></div>
        <div className="stat-card highlight"><div className="stat-value" style={{ color: stats.gapRate > 20 ? '#f59e0b' : undefined }}>{stats.gapRate}%</div><div className="stat-label">Weak retrieval</div></div>
        {latestRun && (
          <div className="stat-card highlight"><div className="stat-value" style={{ color: scoreColor(latestRun.aggregate?.passRate) }}>{Math.round((latestRun.aggregate?.passRate || 0) * 100)}%</div><div className="stat-label">Eval pass rate</div></div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="admin-tabs" style={{ marginTop: 'var(--space-lg)' }}>
        {[['audit', `Audit trail (${merged.length})`], ['eval', 'Eval'], ['gaps', `Gaps & errors (${gaps.length + errors.length})`]].map(([v, label]) => (
          <button key={v} className={`admin-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>{label}</button>
        ))}
      </div>

      {/* ===== AUDIT TRAIL ===== */}
      {view === 'audit' && (
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '12px 0' }}>
            <input className="comment-input" style={{ flex: '1 1 220px', minWidth: 180 }} placeholder="Search question or answer…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="comment-input" style={{ flex: '0 0 auto', width: 160 }} value={intentFilter} onChange={(e) => setIntentFilter(e.target.value)}>
              {intents.map((i) => <option key={i} value={i}>{i === 'all' ? 'All intents' : i}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} /> Flagged only
            </label>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{filtered.length} shown</span>
          </div>

          {filtered.length === 0 ? <p className="comments-empty">No turns match.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.slice(0, 150).map((l) => {
                const best = ragBestScore(l.rag);
                const tools = l.rag?.toolsCalled || [];
                const isOpen = expanded === l.id;
                const flagged = (l.eval && l.eval.verdict !== 'pass') || (Array.isArray(l.rag?.topChunks) && l.rag.topChunks.length === 0);
                return (
                  <div key={l.id} style={{ ...card, borderColor: flagged ? '#f59e0b55' : card.border }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : l.id)}>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', width: 96 }}>{fmt(l.timestamp)}</span>
                      {l.rag?.intent && badge(l.rag.intent, '#6366f1')}
                      {l.rag?.intentConfidence && badge(l.rag.intentConfidence, l.rag.intentConfidence === 'HIGH' ? '#10b981' : l.rag.intentConfidence === 'LOW' ? '#ef4444' : '#f59e0b')}
                      {l.rag?.retrievalMethod && badge(l.rag.retrievalMethod, '#0ea5e9')}
                      {l.streamed && badge('stream', '#a855f7')}
                      {tools.length > 0 && badge(`🔧 ${tools.length}`, '#14b8a6')}
                      {l.eval && badge(l.eval.verdict, verdictColor(l.eval.verdict))}
                      <span style={{ flex: 1, minWidth: 120, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.userMessage}</span>
                      {best != null && <span style={{ fontSize: '0.78rem', color: scoreColor(best) }}>sim {best.toFixed(2)}</span>}
                      {l.latencyMs != null && <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{l.latencyMs}ms</span>}
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>${parseFloat(l.usage?.totalCost || 0).toFixed(5)}</span>
                      <span style={{ color: '#64748b' }}>{isOpen ? '▼' : '▶'}</span>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 10, fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div><strong style={{ color: '#94a3b8' }}>Q:</strong> {l.userMessage}</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}><strong style={{ color: '#94a3b8' }}>A:</strong> {l.assistantMessage}</div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#94a3b8', fontSize: '0.8rem' }}>
                          <span>model: {l.modelName || l.model}</span>
                          <span>mode: {l.mode}</span>
                          {l.usage && <span>in {l.usage.prompt_tokens} / out {l.usage.completion_tokens} tok</span>}
                          {l.rag?.reason && <span>reason: {l.rag.reason}</span>}
                          {l.context && <span>ctx: {l.context}</span>}
                        </div>
                        {Array.isArray(l.rag?.topChunks) && l.rag.topChunks.length > 0 && (
                          <div>
                            <strong style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Retrieved chunks</strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                              {l.rag.topChunks.map((c, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem' }}>
                                  <span style={{ color: scoreColor(Number(c.similarity)), width: 44 }}>{Number(c.similarity).toFixed(2)}</span>
                                  {badge(c.method, '#0ea5e9')}
                                  <span style={{ color: '#64748b' }}>{c.category}</span>
                                  <span>{c.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {tools.length > 0 && <div style={{ fontSize: '0.8rem', color: '#14b8a6' }}>Tools called: {tools.join(', ')}</div>}
                        {l.eval && (
                          <div style={{ ...card, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                            {badge(`verdict: ${l.eval.verdict}`, verdictColor(l.eval.verdict))}
                            <span style={{ color: scoreColor(l.eval.groundedness) }}>grounded {l.eval.groundedness?.toFixed(2)}</span>
                            <span style={{ color: scoreColor(l.eval.relevance) }}>relevant {l.eval.relevance?.toFixed(2)}</span>
                            <span style={{ color: scoreColor(l.eval.helpfulness) }}>helpful {l.eval.helpfulness?.toFixed(2)}</span>
                            {l.eval.notes && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{l.eval.notes}</span>}
                          </div>
                        )}
                        <div>
                          <button className="btn btn-secondary btn-sm" disabled={scoring[l._scoreId || l.id]} onClick={() => scoreTurn(l)}>
                            {scoring[l._scoreId || l.id] ? 'Scoring…' : l.eval ? 'Re-score' : 'Score this turn'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== EVAL ===== */}
      {view === 'eval' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>Run eval suite</strong>
            <select className="comment-input" style={{ width: 200 }} value={evalModel} onChange={(e) => setEvalModel(e.target.value)}>
              {AVAILABLE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" disabled={running} onClick={runSuite}>{running ? 'Running…' : '▶ Run suite'}</button>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>End-to-end against /chat, judged for groundedness + relevance.</span>
          </div>
          {runError && <p className="error-text" style={{ marginTop: 8 }}>{runError}</p>}

          {!latestRun ? <p className="comments-empty" style={{ marginTop: 12 }}>No eval runs yet. Run the suite to get a baseline.</p> : (
            <div style={{ marginTop: 12 }}>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-value" style={{ color: scoreColor(latestRun.aggregate.passRate) }}>{Math.round(latestRun.aggregate.passRate * 100)}%</div><div className="stat-label">Pass rate</div></div>
                <div className="stat-card"><div className="stat-value" style={{ color: scoreColor(latestRun.aggregate.intentAccuracy) }}>{Math.round(latestRun.aggregate.intentAccuracy * 100)}%</div><div className="stat-label">Intent accuracy</div></div>
                <div className="stat-card"><div className="stat-value" style={{ color: scoreColor(latestRun.aggregate.avgGroundedness) }}>{latestRun.aggregate.avgGroundedness.toFixed(2)}</div><div className="stat-label">Groundedness</div></div>
                <div className="stat-card"><div className="stat-value" style={{ color: scoreColor(latestRun.aggregate.avgRelevance) }}>{latestRun.aggregate.avgRelevance.toFixed(2)}</div><div className="stat-label">Relevance</div></div>
                <div className="stat-card"><div className="stat-value">{latestRun.aggregate.avgLatencyMs}ms</div><div className="stat-label">Avg latency</div></div>
                <div className="stat-card"><div className="stat-value">${(latestRun.aggregate.totalCost || 0).toFixed(4)}</div><div className="stat-label">Run cost</div></div>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '8px 0' }}>
                Latest: {fmt(latestRun.createdAt)} · {latestRun.model} · {latestRun.aggregate.passed}/{latestRun.aggregate.total} passed
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {(latestRun.cases || []).map((c) => (
                  <div key={c.id} style={{ ...card, borderColor: c.pass ? '#10b98144' : '#ef444444' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {badge(c.pass ? 'PASS' : 'FAIL', c.pass ? '#10b981' : '#ef4444')}
                      <span style={{ flex: 1, minWidth: 160 }}>{c.question}</span>
                      {badge(c.intentMatch ? `intent ✓ ${c.detectedIntent}` : `intent ✗ ${c.detectedIntent}≠${c.expectIntent}`, c.intentMatch ? '#10b981' : '#ef4444')}
                      <span style={{ color: scoreColor(c.groundedness) }}>G {c.groundedness?.toFixed(2) ?? '—'}</span>
                      <span style={{ color: scoreColor(c.relevance) }}>R {c.relevance?.toFixed(2) ?? '—'}</span>
                      {!c.factsPassed && badge('facts ✗', '#ef4444')}
                    </div>
                    {(c.notes || c.error) && <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: c.error ? '#ef4444' : '#94a3b8' }}>{c.error || c.notes}</p>}
                  </div>
                ))}
              </div>

              {evalRuns.length > 1 && (
                <div style={{ marginTop: 16 }}>
                  <strong style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Run history</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                    {evalRuns.map((r) => (
                      <div key={r.id} style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: '#94a3b8', padding: '4px 0', borderBottom: '1px solid #1f2937' }}>
                        <span style={{ width: 110 }}>{fmt(r.createdAt)}</span>
                        <span style={{ color: scoreColor(r.aggregate?.passRate) }}>pass {Math.round((r.aggregate?.passRate || 0) * 100)}%</span>
                        <span>intent {Math.round((r.aggregate?.intentAccuracy || 0) * 100)}%</span>
                        <span>G {r.aggregate?.avgGroundedness?.toFixed(2)}</span>
                        <span>{r.model}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== GAPS & ERRORS ===== */}
      {view === 'gaps' && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <strong>Knowledge gaps ({gaps.length})</strong>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '2px 0 8px' }}>Questions where retrieval was weak or the bot admitted it didn&rsquo;t know — candidates for new KB chunks.</p>
            {gaps.length === 0 ? <p className="comments-empty">No gaps logged.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {gaps.map((g) => (
                  <div key={g.id} style={{ ...card, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.78rem', width: 96 }}>{fmt(g.timestamp)}</span>
                    {g.intent && badge(g.intent, '#6366f1')}
                    {g.bestRetrievalScore != null && <span style={{ fontSize: '0.78rem', color: scoreColor(Number(g.bestRetrievalScore) > 1 ? Number(g.bestRetrievalScore) / 100 : Number(g.bestRetrievalScore)) }}>score {Number(g.bestRetrievalScore).toFixed(1)}</span>}
                    <span style={{ flex: 1, minWidth: 160 }}>{g.query}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <strong>Chat errors ({errors.length})</strong>
            {errors.length === 0 ? <p className="comments-empty">No chat errors logged.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {errors.map((e) => (
                  <div key={e.id} style={{ ...card, borderColor: '#ef444444' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', width: 96 }}>{fmt(e.timestamp)}</span>
                      {badge(e.source, '#ef4444')}
                      {e.severity && badge(e.severity, e.severity === 'high' ? '#ef4444' : '#f59e0b')}
                      <span style={{ flex: 1, minWidth: 160, fontSize: '0.85rem' }}>{e.error}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ COMMENTS TAB ============
const CommentsTab = () => {
  const [comments, setComments] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  // Comment moderation goes through admin-data — client update/delete on
  // comments is denied by the Firestore rules.
  const approveComment = async (id) => {
    await adminData('moderate-comment', { id, op: 'approve' });
  };

  const rejectComment = async (id) => {
    await adminData('moderate-comment', { id, op: 'reject' });
  };

  const deleteComment = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    await adminData('moderate-comment', { id, op: 'delete' });
  };

  const submitReply = async (id) => {
    if (!replyText.trim()) return;
    await adminData('moderate-comment', { id, op: 'reply', reply: replyText.trim() });
    setReplyText('');
    setReplyingTo(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredComments = comments.filter(c => {
    if (filter === 'pending') return !c.approved;
    if (filter === 'approved') return c.approved;
    return true;
  });

  return (
    <div className="comments-tab">
      <div className="admin-tabs">
        {['pending', 'approved', 'all'].map(f => (
          <button 
            key={f}
            className={`admin-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({
              f === 'pending' ? comments.filter(c => !c.approved).length :
              f === 'approved' ? comments.filter(c => c.approved).length :
              comments.length
            })
          </button>
        ))}
      </div>

      <div className="admin-comments">
        {filteredComments.length === 0 ? (
          <p className="comments-empty">No comments to show.</p>
        ) : (
          filteredComments.map((c) => (
            <div key={c.id} className={`admin-comment-card ${c.approved ? 'approved' : 'pending'}`}>
              <div className="admin-comment-header">
                <div>
                  <span className="comment-author">{c.name}</span>
                  <span className="admin-comment-project">on {c.projectId}</span>
                </div>
                <span className={`admin-status ${c.approved ? 'approved' : 'pending'}`}>
                  {c.approved ? 'Approved' : 'Pending'}
                </span>
              </div>
              
              <p className="comment-text">{c.comment}</p>
              <p className="comment-date">{formatDate(c.createdAt)}</p>

              {c.replies?.length > 0 && (
                <div className="admin-replies">
                  <strong>Your replies</strong>
                  {c.replies.map((reply, i) => (
                    <div key={i} className="admin-reply">
                      <p>{reply.text}</p>
                      <small>{formatDate(reply.createdAt)}</small>
                    </div>
                  ))}
                </div>
              )}

              {replyingTo === c.id ? (
                <div className="admin-reply-form">
                  <textarea
                    placeholder="Write your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="comment-textarea"
                    rows={3}
                  />
                  <div className="admin-reply-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => submitReply(c.id)}>Send</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setReplyingTo(null); setReplyText(''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="admin-actions">
                  {!c.approved && <button className="btn btn-success btn-sm" onClick={() => approveComment(c.id)}>Approve</button>}
                  {c.approved && <button className="btn btn-warning btn-sm" onClick={() => rejectComment(c.id)}>Unapprove</button>}
                  <button className="btn btn-secondary btn-sm" onClick={() => setReplyingTo(c.id)}>Reply</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteComment(c.id)}>Delete</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============ RAG TAB ============
const RAG_CATEGORIES = ['bio', 'skill', 'project', 'experience', 'faq', 'blog', 'agents', 'services', 'fitness', 'general'];

const EXAMPLE_QUERIES = [
  { label: 'Overview', query: 'Tell me about Charlton Smith' },
  { label: 'Projects', query: 'What projects has Charlton built?' },
  { label: 'AI Skills', query: 'What AI and machine learning experience does he have?' },
  { label: 'Contact', query: 'How can I reach Charlton?' },
  { label: 'T-Mobile', query: 'Tell me about his work at T-Mobile' },
  { label: 'Row Crew', query: 'What is Row Crew?' },
  { label: 'Strengths', query: 'Why should we hire him?' },
];

const RAGTab = () => {
  const [subTab, setSubTab] = useState('chunks');
  const [chunks, setChunks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiCall = useCallback(async (endpoint, options = {}) => {
    const token = sessionStorage.getItem('rag_admin_token') || '';
    const response = await fetch(`/.netlify/functions/rag-admin${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 503) {
        throw new Error(err.details || err.error || 'Write access denied — set RAG_ADMIN_KEY in Netlify to match your admin password.');
      }
      throw new Error(err.error || err.details || 'API error');
    }

    return response.json();
  }, []);

  const loadChunks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCall('/chunks');
      setChunks(data.chunks);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiCall('/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [apiCall]);

  useEffect(() => {
    loadChunks();
    loadStats();
  }, [loadChunks, loadStats]);

  const handleEmbedAll = async () => {
    if (!window.confirm('Re-embed all chunks? This will cost ~$0.001.')) return;
    try {
      setLoading(true);
      const result = await apiCall('/embed-all', { method: 'POST' });
      alert(`Embedded ${result.success} chunks. Failed: ${result.failed}`);
      loadChunks();
      loadStats();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm('Seed default knowledge chunks?')) return;
    try {
      setLoading(true);
      const result = await apiCall('/seed-defaults', { method: 'POST' });
      alert(`Created ${result.created} chunks. Skipped ${result.skipped}. Errors: ${result.errors}`);
      loadChunks();
      loadStats();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackfillBlogs = async () => {
    try {
      setLoading(true);
      // Dry run first so we know how many to expect
      const probe = await fetch('/.netlify/functions/backfill-blog-rag').then(r => r.json());
      if (!probe.missing) {
        alert(`All ${probe.blogPostsTotal} blog posts already in RAG. Nothing to backfill.`);
        return;
      }
      const ok = window.confirm(
        `Found ${probe.missing} blog posts missing from RAG (out of ${probe.blogPostsTotal}). Create + embed chunks now?`
      );
      if (!ok) return;
      const result = await fetch('/.netlify/functions/backfill-blog-rag', { method: 'POST' }).then(r => r.json());
      alert(`Created ${result.created} chunks. Embedded ${result.embedded}. Errors: ${result.errors?.length || 0}`);
      loadChunks();
      loadStats();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rag-tab">
      <div className="rag-header">
        <div className="rag-header-info">
          <h3>Knowledge base</h3>
        </div>
        <div className="rag-header-actions">
          <button onClick={handleBackfillBlogs} className="btn btn-secondary btn-sm" disabled={loading}>
            Backfill blogs
          </button>
          <button onClick={handleEmbedAll} className="btn btn-secondary btn-sm" disabled={loading}>
            Re-embed all
          </button>
          <button onClick={handleSeedDefaults} className="btn btn-secondary btn-sm" disabled={loading}>
            Seed defaults
          </button>
        </div>
      </div>

      {error && (
        <div className="rag-error">
          <strong>RAG error:</strong> {error}
          <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
            Add Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) to Netlify env.
          </p>
        </div>
      )}

      <div className="admin-tabs" style={{ marginTop: 'var(--space-md)' }}>
        <button className={`admin-tab ${subTab === 'chunks' ? 'active' : ''}`} onClick={() => setSubTab('chunks')}>
          Chunks ({chunks.length})
        </button>
        <button className={`admin-tab ${subTab === 'auto' ? 'active' : ''}`} onClick={() => setSubTab('auto')}>
          Auto-generated
        </button>
        <button className={`admin-tab ${subTab === 'test' ? 'active' : ''}`} onClick={() => setSubTab('test')}>
          Test
        </button>
        <button className={`admin-tab ${subTab === 'stats' ? 'active' : ''}`} onClick={() => setSubTab('stats')}>
          Stats
        </button>
      </div>

      {subTab === 'chunks' && (
        <RAGChunksPanel
          chunks={chunks}
          loading={loading}
          apiCall={apiCall}
          onRefresh={() => { loadChunks(); loadStats(); }}
        />
      )}
      {subTab === 'auto' && <RAGAutoGeneratedPanel apiCall={apiCall} onRefresh={() => { loadChunks(); loadStats(); }} />}
      {subTab === 'test' && <RAGTestPanel apiCall={apiCall} />}
      {subTab === 'stats' && <RAGStatsPanel stats={stats} chunks={chunks} />}
    </div>
  );
};

// ============ RAG CHUNKS PANEL ============
const RAGChunksPanel = ({ chunks, loading, apiCall, onRefresh }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editingChunk, setEditingChunk] = useState(null);
  const [reembedding, setReembedding] = useState(null);

  const filteredChunks = useMemo(() => {
    let result = [...chunks];
    if (filter === 'auto') {
      result = result.filter(c => c.metadata?.autoGenerated);
    } else if (filter === 'manual') {
      result = result.filter(c => !c.metadata?.autoGenerated);
    } else if (filter !== 'all') {
      result = result.filter(c => c.category === filter);
    }
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(lower) ||
        c.content?.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [chunks, filter, search]);

  const handleReembed = async (chunkId) => {
    setReembedding(chunkId);
    try {
      const result = await apiCall(`/chunks/${chunkId}/embed`, { method: 'POST' });
      if (result.success) {
        alert(`Embedded! Tokens: ${result.tokens}, Cost: $${result.cost}`);
        onRefresh();
      } else {
        alert(`Failed: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setReembedding(null);
    }
  };

  const handleDelete = async (chunkId) => {
    if (!window.confirm('Delete this chunk?')) return;
    try {
      await apiCall(`/chunks/${chunkId}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      bio: '#3b82f6',
      skill: '#10b981',
      project: '#8b5cf6',
      experience: '#f59e0b',
      faq: '#ec4899'
    };
    return colors[category] || '#6b7280';
  };

  if (loading && chunks.length === 0) {
    return <p>Loading chunks...</p>;
  }

  return (
    <div className="rag-chunks-panel">
      <div className="rag-filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="manual">Manual Only</option>
          <option value="auto">Auto-Generated Only</option>
          {RAG_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search chunks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={() => setEditingChunk({})} className="btn btn-primary btn-sm">
          + Add Chunk
        </button>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 'var(--space-sm) 0' }}>
        Showing {filteredChunks.length} of {chunks.length} chunks • 
        {chunks.filter(c => c.embedding?.exists).length} embedded • 
        ~{chunks.reduce((sum, c) => sum + (c.tokenEstimate || 0), 0).toLocaleString()} tokens
      </p>

      <div className="rag-chunks-list">
        {filteredChunks.map(chunk => (
          <div key={chunk.id} className="rag-chunk-card">
            <div 
              className="rag-chunk-header"
              onClick={() => setExpandedId(expandedId === chunk.id ? null : chunk.id)}
            >
              <div className="rag-chunk-title">
                <span
                  className="rag-category-badge"
                  style={{ backgroundColor: getCategoryColor(chunk.category) }}
                >
                  {chunk.category}
                </span>
                {chunk.metadata?.autoGenerated && (
                  <span
                    className="rag-category-badge"
                    style={{ backgroundColor: '#6b7280', fontSize: '0.65rem' }}
                  >
                    {chunk.metadata.generatedBy || 'auto'}
                  </span>
                )}
                <strong>{chunk.title}</strong>
              </div>
              <div className="rag-chunk-meta">
                <span>~{chunk.tokenEstimate || 0} tok</span>
                <span className={chunk.embedding?.exists ? 'rag-embedded' : 'rag-not-embedded'}>
                  {chunk.embedding?.exists ? '✓' : '⚠'}
                </span>
                <span>{expandedId === chunk.id ? '▼' : '▶'}</span>
              </div>
            </div>

            {expandedId === chunk.id && (
              <div className="rag-chunk-details">
                <pre className="rag-chunk-content">{chunk.content}</pre>
                <div className="rag-chunk-actions">
                  <button onClick={() => setEditingChunk(chunk)} className="btn btn-secondary btn-sm">
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => handleReembed(chunk.id)} 
                    className="btn btn-secondary btn-sm"
                    disabled={reembedding === chunk.id}
                  >
                    {reembedding === chunk.id ? 'Embedding…' : 'Re-embed'}
                  </button>
                  <button onClick={() => handleDelete(chunk.id)} className="btn btn-danger btn-sm">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredChunks.length === 0 && (
          <p className="comments-empty">
            {chunks.length === 0 
              ? 'No chunks yet. Click "Seed Defaults" to get started.' 
              : 'No chunks match your filters.'}
          </p>
        )}
      </div>

      {editingChunk && (
        <RAGChunkEditor 
          chunk={editingChunk.id ? editingChunk : null}
          apiCall={apiCall}
          onClose={() => setEditingChunk(null)}
          onSave={() => { setEditingChunk(null); onRefresh(); }}
        />
      )}
    </div>
  );
};

// ============ RAG CHUNK EDITOR MODAL ============
const RAGChunkEditor = ({ chunk, apiCall, onClose, onSave }) => {
  const [form, setForm] = useState({
    category: chunk?.category || 'bio',
    title: chunk?.title || '',
    content: chunk?.content || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (chunk?.id) {
        await apiCall(`/chunks/${chunk.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiCall('/chunks', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      onSave();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="rag-modal-overlay" onClick={onClose}>
      <div className="rag-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rag-modal-header">
          <h3>{chunk?.id ? 'Edit chunk' : 'New chunk'}</h3>
          <button onClick={onClose} className="rag-modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="rag-error">{error}</div>}

          <div className="rag-form-row">
            <label>Category</label>
            <select 
              value={form.category} 
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {RAG_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="rag-form-row">
            <label>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., 'Row Crew' or 'AI Experience'"
            />
          </div>

          <div className="rag-form-row">
            <label>
              Content
              <span style={{ float: 'right', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                ~{Math.ceil(form.content.length / 4)} tokens
              </span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="The content that will be embedded and retrieved..."
              rows={12}
            />
          </div>

          <div className="rag-modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : chunk?.id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============ RAG AUTO-GENERATED PANEL ============
const RAGAutoGeneratedPanel = ({ apiCall, onRefresh }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await apiCall('/auto-generated');
        setData(result);
      } catch (err) {
        console.error('Failed to load auto-generated chunks:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apiCall]);

  const handleDelete = async (chunkId) => {
    if (!window.confirm('Delete this auto-generated chunk?')) return;
    try {
      await apiCall(`/chunks/${chunkId}`, { method: 'DELETE' });
      setData(prev => ({
        ...prev,
        chunks: prev.chunks.filter(c => c.id !== chunkId),
        count: prev.count - 1,
      }));
      onRefresh();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  };

  if (loading) return <p>Loading auto-generated chunks...</p>;
  if (!data) return <p>Failed to load data.</p>;

  const sourceColors = {
    orchestrator: '#a78bfa',
    'daily-blog': '#fbbf24',
    chat: '#60a5fa',
    'portfolio-sync': '#4ade80',
    unknown: '#6b7280',
  };

  const filteredChunks = filterSource === 'all'
    ? data.chunks
    : data.chunks.filter(c => c.generatedBy === filterSource);

  return (
    <div style={{ marginTop: 'var(--space-md)' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {data.count} auto-generated chunks
          ({data.withEmbedding} embedded, {data.withoutEmbedding} missing)
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className={`admin-tab ${filterSource === 'all' ? 'active' : ''}`}
            onClick={() => setFilterSource('all')}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            All
          </button>
          {Object.entries(data.bySource || {}).map(([src, count]) => (
            <button
              key={src}
              className={`admin-tab ${filterSource === src ? 'active' : ''}`}
              onClick={() => setFilterSource(src)}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderColor: filterSource === src ? (sourceColors[src] || '#6b7280') : undefined,
                color: filterSource === src ? (sourceColors[src] || '#6b7280') : undefined,
              }}
            >
              {src} ({count})
            </button>
          ))}
        </div>
      </div>

      <div className="rag-chunks-list">
        {filteredChunks.map(chunk => (
          <div key={chunk.id} className="rag-chunk-card">
            <div className="rag-chunk-header">
              <div className="rag-chunk-title" style={{ flex: 1 }}>
                <span
                  className="rag-category-badge"
                  style={{ backgroundColor: sourceColors[chunk.generatedBy] || '#6b7280' }}
                >
                  {chunk.generatedBy}
                </span>
                <span
                  className="rag-category-badge"
                  style={{ backgroundColor: '#374151', marginLeft: 4 }}
                >
                  {chunk.category}
                </span>
                <strong style={{ marginLeft: 8 }}>{chunk.title}</strong>
              </div>
              <div className="rag-chunk-meta">
                <span>~{chunk.tokenEstimate} tok</span>
                <span className={chunk.hasEmbedding ? 'rag-embedded' : 'rag-not-embedded'}>
                  {chunk.hasEmbedding ? '✓ embedded' : '⚠ no embedding'}
                </span>
              </div>
            </div>

            <div style={{ padding: '8px 12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <p style={{ margin: '0 0 4px', whiteSpace: 'pre-wrap' }}>
                {chunk.contentPreview}...
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', marginTop: 8, opacity: 0.7, flexWrap: 'wrap' }}>
                {chunk.createdAt && (
                  <span>Created: {new Date(chunk.createdAt).toLocaleDateString()} {new Date(chunk.createdAt).toLocaleTimeString()}</span>
                )}
                {chunk.sourceQuery && (
                  <span>Query: "{chunk.sourceQuery.slice(0, 80)}"</span>
                )}
                {chunk.blogId && (
                  <span>Blog: {chunk.blogId}</span>
                )}
                {chunk.keywords?.length > 0 && (
                  <span>Keywords: {chunk.keywords.join(', ')}</span>
                )}
              </div>
            </div>

            <div style={{ padding: '4px 12px 8px', display: 'flex', gap: '8px' }}>
              <button onClick={() => handleDelete(chunk.id)} className="btn btn-danger btn-sm" style={{ fontSize: '0.75rem' }}>
                Delete
              </button>
            </div>
          </div>
        ))}

        {filteredChunks.length === 0 && (
          <p className="comments-empty">
            No auto-generated chunks {filterSource !== 'all' ? `from ${filterSource}` : 'yet'}.
          </p>
        )}
      </div>
    </div>
  );
};

// ============ RAG TEST PANEL ============
const RAGTestPanel = ({ apiCall }) => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState(null);
  const [intentResult, setIntentResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testRetrieval = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await apiCall('/test-retrieval', {
        method: 'POST',
        body: JSON.stringify({ query, topK: parseInt(topK) }),
      });
      setResults(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testIntent = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await apiCall('/test-intent', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      setIntentResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (sim) => {
    if (sim >= 0.8) return '#10b981';
    if (sim >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="rag-test-panel">
      <div className="rag-test-input">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a query to test retrieval..."
          rows={3}
        />
        
        <div className="rag-test-examples">
          {EXAMPLE_QUERIES.map((ex, i) => (
            <button key={i} onClick={() => setQuery(ex.query)} className="rag-example-btn">
              {ex.label}
            </button>
          ))}
        </div>

        <div className="rag-test-options">
          <label>
            Top K:
            <input 
              type="number" 
              value={topK} 
              onChange={(e) => setTopK(e.target.value)}
              min={1}
              max={20}
              style={{ width: '60px', marginLeft: '8px' }}
            />
          </label>
          <button onClick={testRetrieval} className="btn btn-primary btn-sm" disabled={loading || !query.trim()}>
            🔍 Test Retrieval
          </button>
          <button onClick={testIntent} className="btn btn-secondary btn-sm" disabled={loading || !query.trim()}>
            🎯 Test Intent
          </button>
        </div>
      </div>

      {intentResult && (
        <div className="rag-intent-result">
          <h4>Intent detection</h4>
          <p>
            <strong>Intent:</strong> <span className="rag-intent-badge">{intentResult.intent}</span>
            <span className={`rag-confidence rag-confidence-${intentResult.confidence}`}>
              {intentResult.confidence}
            </span>
          </p>
          {intentResult.matchedKeywords?.length > 0 && (
            <p><strong>Keywords:</strong> {intentResult.matchedKeywords.join(', ')}</p>
          )}
          <p><strong>Recommended:</strong> Top {intentResult.settings?.topK || 5}, 
            Categories: {intentResult.settings?.categories?.join(', ') || 'All'}</p>
        </div>
      )}

      {results && (
        <div className="rag-retrieval-results">
          <h4>Retrieval results</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Searched {results.chunksSearched} chunks • 
            Embedding tokens: {results.embeddingTokens}
          </p>

          {results.results.map((r, i) => (
            <div key={r.id} className="rag-result-card">
              <div className="rag-result-header">
                <span className="rag-result-rank">#{i + 1}</span>
                <span className="rag-category-badge" style={{ backgroundColor: '#6b7280' }}>{r.category}</span>
                <strong>{r.title}</strong>
                <span 
                  className="rag-similarity"
                  style={{ color: getSimilarityColor(r.similarity) }}
                >
                  {(r.similarity * 100).toFixed(1)}%
                </span>
              </div>
              <div className="rag-similarity-bar">
                <div 
                  style={{ 
                    width: `${r.similarity * 100}%`, 
                    backgroundColor: getSimilarityColor(r.similarity),
                    height: '4px',
                    borderRadius: '2px'
                  }} 
                />
              </div>
              <p className="rag-result-preview">{r.preview}</p>
            </div>
          ))}

          {results.results.length === 0 && (
            <p className="comments-empty">No results matched.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ============ RAG STATS PANEL ============
const RAGStatsPanel = ({ stats, chunks }) => {
  if (!stats) return <p>Loading stats...</p>;

  const avgTokens = chunks.length > 0 
    ? Math.round(stats.totalTokens / chunks.length) 
    : 0;

  const categoryColors = {
    bio: '#3b82f6',
    skill: '#10b981',
    project: '#8b5cf6',
    experience: '#f59e0b',
    faq: '#ec4899'
  };

  return (
    <div className="rag-stats-panel">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalChunks}</div>
          <div className="stat-label">Total chunks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.embeddedChunks}</div>
          <div className="stat-label">Embedded</div>
        </div>
        <div className="stat-card" style={stats.missingEmbeddings > 0 ? { borderColor: '#f59e0b' } : {}}>
          <div className="stat-value">{stats.missingEmbeddings}</div>
          <div className="stat-label">Missing</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalTokens?.toLocaleString() || 0}</div>
          <div className="stat-label">Total tokens</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgTokens}</div>
          <div className="stat-label">Avg per chunk</div>
        </div>
      </div>

      <h4 style={{ marginTop: 'var(--space-lg)' }}>By Category</h4>
      <div className="rag-category-breakdown">
        {Object.entries(stats.byCategory || {}).map(([cat, data]) => (
          <div key={cat} className="rag-category-row">
            <span 
              className="rag-category-badge" 
              style={{ backgroundColor: categoryColors[cat] }}
            >
              {cat}
            </span>
            <span>{data.count} chunks</span>
            <span style={{ color: 'var(--text-secondary)' }}>~{data.tokens} tokens</span>
            <div className="rag-category-bar">
              <div 
                style={{ 
                  width: `${(data.count / stats.totalChunks) * 100}%`,
                  backgroundColor: categoryColors[cat],
                  height: '6px',
                  borderRadius: '3px'
                }} 
              />
            </div>
          </div>
        ))}
      </div>

      <h4 style={{ marginTop: 'var(--space-lg)' }}>Cost Estimates</h4>
      <table className="rag-cost-table">
        <tbody>
          <tr>
            <td>Embed all chunks (one-time)</td>
            <td>${stats.costs?.embedding || '0.0001'}</td>
          </tr>
          <tr>
            <td>Per query embedding</td>
            <td>~$0.000001</td>
          </tr>
          <tr>
            <td>Per LLM call (GPT-4o-mini)</td>
            <td>~$0.0004</td>
          </tr>
          <tr style={{ fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
            <td>Total per chat message</td>
            <td>~${stats.costs?.queryEstimate || '0.0005'}</td>
          </tr>
        </tbody>
      </table>

      {stats.missingEmbeddings > 0 && (
        <div className="rag-warning">
          {stats.missingEmbeddings} chunks missing embeddings. Click &ldquo;Re-embed all&rdquo; to fix.
        </div>
      )}
    </div>
  );
};

// ============ CUSTOMIZE TAB (Profile only — projects edit lives in src/data/project-stories.js) ============
const CustomizeTab = () => {
  return (
    <div className="customize-tab">
      <ProfileEditor />
    </div>
  );
};

// ============ PROFILE EDITOR (Current Work renamed to Summary) ============
const ProfileEditor = () => {
  const [profile, setProfile] = useState({
    aboutMe: '',
    currentWork: '',
    tagline: '',
    skills: [],
    contact: { email: '', linkedin: '', github: '' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'profile', 'main');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setProfile(prev => ({ ...prev, ...snapshot.data() }));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // profile writes go through admin-data (no longer client-writable);
      // lastUpdated is stamped server-side.
      await adminData('save-profile', { profile: { ...profile, lastUpdated: new Date().toISOString() } });
      alert('Profile saved!');
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      setProfile(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setProfile(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  if (loading) return <div className="customize-loading">Loading profile...</div>;

  return (
    <div className="profile-editor">
      <div className="editor-section">
        <label className="editor-label">Tagline</label>
        <input 
          type="text" 
          className="editor-input" 
          placeholder="Software Engineer | AI Enthusiast | Builder"
          value={profile.tagline || ''} 
          onChange={(e) => setProfile(prev => ({ ...prev, tagline: e.target.value }))} 
        />
        <span className="editor-hint">Shown below your name on the homepage</span>
      </div>

      <div className="editor-section">
        <label className="editor-label">Summary</label>
        <textarea 
          className="editor-textarea" 
          placeholder="Brief professional summary..." 
          rows={3}
          value={profile.currentWork || ''} 
          onChange={(e) => setProfile(prev => ({ ...prev, currentWork: e.target.value }))} 
        />
        <span className="editor-hint">Brief summary shown on the homepage</span>
      </div>

      <div className="editor-section">
        <label className="editor-label">About Me</label>
        <textarea 
          className="editor-textarea" 
          placeholder="Your detailed bio for the About page..." 
          rows={6}
          value={profile.aboutMe || ''} 
          onChange={(e) => setProfile(prev => ({ ...prev, aboutMe: e.target.value }))} 
        />
        <span className="editor-hint">Shown on the About page and used in RAG responses</span>
      </div>

      <div className="editor-section">
        <label className="editor-label">Skills</label>
        <div className="skills-input-row">
          <input 
            type="text" 
            className="editor-input" 
            placeholder="Add a skill..." 
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} 
          />
          <button className="btn btn-secondary btn-sm" onClick={addSkill}>Add</button>
        </div>
        <div className="skills-tags">
          {profile.skills?.map(skill => (
            <span key={skill} className="skill-tag">
              {skill}
              <button className="skill-remove" onClick={() => removeSkill(skill)}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <label className="editor-label">Contact</label>
        <div className="contact-fields">
          <input 
            type="email" 
            className="editor-input" 
            placeholder="Email" 
            value={profile.contact?.email || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))} 
          />
          <input 
            type="text" 
            className="editor-input" 
            placeholder="LinkedIn URL" 
            value={profile.contact?.linkedin || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, contact: { ...prev.contact, linkedin: e.target.value } }))} 
          />
          <input 
            type="text" 
            className="editor-input" 
            placeholder="GitHub URL" 
            value={profile.contact?.github || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, contact: { ...prev.contact, github: e.target.value } }))} 
          />
        </div>
      </div>

      <div className="editor-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
};


// ============ MOLTBOOK TAB ============
const AGENT_API_URL = process.env.REACT_APP_MOLTBOOK_AGENT_URL || 'https://azoni-moltbook-agent.onrender.com';
// Writes authenticate server-side via the admin-data moltbook proxy — the admin
// key must never appear in a REACT_APP_ var (CRA inlines those into the bundle).

// Helper to safely render any value (handles objects)
const safeRender = (value, fallback = 'Unknown') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (value.name) return value.name;
    if (value.display_name) return value.display_name;
    if (value.id) return value.id;
    return JSON.stringify(value);
  }
  return String(value);
};

const MoltbookTab = () => {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [activity, setActivity] = useState([]);
  const [feed, setFeed] = useState([]);
  const [jobHistory, setJobHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Job intervals
  const [intervals, setIntervals] = useState({ post: 45, comment: 10, reply: 8, upvote: 15, watcher: 5 });
  const [savingIntervals, setSavingIntervals] = useState(false);

  // Manual run form
  const [runContext, setRunContext] = useState('');

  // Direct post form
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postSubmolt, setPostSubmolt] = useState('general');

  // Direct comment form
  const [commentPostId, setCommentPostId] = useState('');
  const [commentContent, setCommentContent] = useState('');

  // Post topics queue
  const [newTopic, setNewTopic] = useState('');

  // Writes are proxied through admin-data so the Moltbook admin key stays
  // server-side (it used to ship inside the JS bundle). Returns the fetch
  // Response with the upstream status passed through.
  const agentWrite = (path, body, method = 'POST') =>
    fetch('/.netlify/functions/admin-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('rag_admin_token') || ''}`,
      },
      body: JSON.stringify({ action: 'moltbook-proxy', path, method, body }),
    });

  const handleAuthError = (res) => {
    if (res.status === 401) {
      setError('401 Unauthorized — sign in to the admin panel again (or set MOLTBOOK_ADMIN_KEY in the Netlify env)');
      return true;
    }
    return false;
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statusRes, configRes, activityRes, feedRes, jobsRes] = await Promise.all([
        fetch(`${AGENT_API_URL}/status`).catch(() => null),
        fetch(`${AGENT_API_URL}/config`).catch(() => null),
        fetch(`${AGENT_API_URL}/activity?limit=50`).catch(() => null),
        fetch(`${AGENT_API_URL}/feed?limit=15`).catch(() => null),
        fetch(`${AGENT_API_URL}/jobs`).catch(() => null),
      ]);

      if (statusRes?.ok) setStatus(await statusRes.json());
      if (configRes?.ok) {
        const c = await configRes.json();
        setConfig(c);
        if (c.intervals) setIntervals(prev => ({ ...prev, ...c.intervals }));
      }
      if (activityRes?.ok) {
        const data = await activityRes.json();
        setActivity(data.activity || []);
      }
      if (feedRes?.ok) {
        const data = await feedRes.json();
        setFeed(data.posts || []);
      }
      if (jobsRes?.ok) {
        const data = await jobsRes.json();
        setJobHistory(data.jobs || []);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Unable to connect to agent API');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const toggleAutonomousMode = async () => {
    setActionLoading(true);
    try {
      const newMode = !config?.autonomous_mode;
      const res = await agentWrite('/config', { autonomous_mode: newMode }, 'PATCH');

      if (handleAuthError(res)) { setActionLoading(false); return; }
      if (res.ok) {
        setConfig({ ...config, autonomous_mode: newMode });
        showSuccess(`Autonomous mode ${newMode ? 'enabled' : 'disabled'}`);
      }
    } catch (err) {
      setError('Failed to update config');
    } finally {
      setActionLoading(false);
    }
  };

  const saveIntervals = async () => {
    setSavingIntervals(true);
    try {
      const res = await agentWrite('/config', { intervals }, 'PATCH');
      if (handleAuthError(res)) { setSavingIntervals(false); return; }
      if (res.ok) showSuccess('Intervals saved & jobs rescheduled');
      else setError('Failed to save intervals');
    } catch (err) {
      setError('Failed to save intervals');
    } finally {
      setSavingIntervals(false);
    }
  };

  const triggerManualRun = async () => {
    setActionLoading(true);
    try {
      const res = await agentWrite('/run/sync', { context: runContext || null });

      if (handleAuthError(res)) { setActionLoading(false); return; }
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Run completed: ${data.decision?.action || 'unknown'}`);
        setRunContext('');
        fetchAllData();
      } else {
        setError(data.detail || 'Run failed');
      }
    } catch (err) {
      setError('Failed to trigger run');
    } finally {
      setActionLoading(false);
    }
  };

  const directPost = async () => {
    if (!postTitle || !postContent) {
      setError('Title and content required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await agentWrite('/post', {
        title: postTitle,
        content: postContent,
        submolt: postSubmolt
      });

      if (handleAuthError(res)) { setActionLoading(false); return; }
      if (res.ok) {
        showSuccess('Posted successfully!');
        setPostTitle('');
        setPostContent('');
        fetchAllData();
      } else {
        const data = await res.json();
        setError(data.detail || 'Post failed');
      }
    } catch (err) {
      setError('Failed to post');
    } finally {
      setActionLoading(false);
    }
  };

  const directComment = async () => {
    if (!commentPostId || !commentContent) {
      setError('Post ID and content required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await agentWrite('/comment', {
        post_id: commentPostId,
        content: commentContent
      });

      if (handleAuthError(res)) { setActionLoading(false); return; }
      if (res.ok) {
        showSuccess('Commented successfully!');
        setCommentPostId('');
        setCommentContent('');
        fetchAllData();
      } else {
        const data = await res.json();
        setError(data.detail || 'Comment failed');
      }
    } catch (err) {
      setError('Failed to comment');
    } finally {
      setActionLoading(false);
    }
  };

  const addTopic = async () => {
    if (!newTopic.trim()) {
      setError('Topic cannot be empty');
      return;
    }

    setActionLoading(true);
    try {
      const currentTopics = config?.post_topics || [];
      const res = await agentWrite('/config', { post_topics: [...currentTopics, newTopic.trim()] }, 'PATCH');

      if (handleAuthError(res)) { setActionLoading(false); return; }
      if (res.ok) {
        showSuccess('Topic added!');
        setNewTopic('');
        setConfig({ ...config, post_topics: [...currentTopics, newTopic.trim()] });
      } else {
        setError('Failed to add topic');
      }
    } catch (err) {
      setError('Failed to add topic');
    } finally {
      setActionLoading(false);
    }
  };

  const removeTopic = async (index) => {
    setActionLoading(true);
    try {
      const currentTopics = [...(config?.post_topics || [])];
      currentTopics.splice(index, 1);

      const res = await agentWrite('/config', { post_topics: currentTopics }, 'PATCH');

      if (handleAuthError(res)) { setActionLoading(false); return; }
      if (res.ok) {
        showSuccess('Topic removed');
        setConfig({ ...config, post_topics: currentTopics });
      }
    } catch (err) {
      setError('Failed to remove topic');
    } finally {
      setActionLoading(false);
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

  if (loading) {
    return <div className="admin-loading">Loading Moltbook data...</div>;
  }

  const circuitBreaker = status?.circuit_breaker;

  return (
    <div className="moltbook-tab">
      {/* Messages */}
      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {successMessage && (
        <div className="admin-alert admin-alert-success">
          {successMessage}
        </div>
      )}

      {/* Header with refresh */}
      <div className="moltbook-header">
        <h2>Moltbook agent</h2>
        <div className="moltbook-header-actions">
          <span style={{ fontSize: '0.8rem', color: '#10b981' }}>
            Server-side auth
          </span>
          <a 
            href="https://www.moltbook.com/u/Azoni-AI" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View profile ↗
          </a>
          <button onClick={fetchAllData} className="btn btn-secondary" disabled={actionLoading}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Status & Controls Grid */}
      <div className="moltbook-grid">
        <div className="moltbook-card">
          <h3>Status</h3>
          <div className="moltbook-status-list">
            <div className="moltbook-status-row">
              <span>Moltbook</span>
              <span className={status?.moltbook_status === 'claimed' ? 'status-online' : ''}>
                {status?.moltbook_status === 'claimed' ? '🟢 Connected' : '⚪ ' + (typeof status?.moltbook_status === 'string' ? status.moltbook_status : 'Unknown')}
              </span>
            </div>
            <div className="moltbook-status-row">
              <span>Posts Today</span>
              <span>{status?.posts_today || 0}</span>
            </div>
            <div className="moltbook-status-row">
              <span>Last Run</span>
              <span>{status?.last_run_at ? formatTimeAgo(status.last_run_at) : 'Never'}</span>
            </div>
            {circuitBreaker && (
              <div className="moltbook-status-row">
                <span>API Health</span>
                <span style={{ color: circuitBreaker.is_open ? '#ef4444' : circuitBreaker.consecutive_failures > 0 ? '#f59e0b' : '#10b981' }}>
                  {circuitBreaker.is_open
                    ? `🔴 Down (${circuitBreaker.consecutive_failures} fails)`
                    : circuitBreaker.consecutive_failures > 0
                      ? `🟡 ${circuitBreaker.consecutive_failures} fail(s)`
                      : '🟢 Healthy'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="moltbook-card">
          <h3>Autonomous mode</h3>
          <p className="moltbook-card-desc">When enabled, agent runs automatically on schedule</p>
          <button
            onClick={toggleAutonomousMode}
            className={`moltbook-toggle ${config?.autonomous_mode ? 'active' : ''}`}
            disabled={actionLoading}
          >
            {config?.autonomous_mode ? 'ON — running autonomously' : 'OFF — manual only'}
          </button>
        </div>
      </div>

      {/* Job Intervals */}
      <div className="moltbook-card">
        <h3>Job intervals (minutes)</h3>
        <p className="moltbook-card-desc">Set to 0 to disable a job. Changes take effect immediately.</p>
        <div className="moltbook-intervals-grid">
          {Object.entries(intervals).map(([key, val]) => (
            <div key={key} className="moltbook-interval-item">
              <label>{key}</label>
              <input
                type="number" min="0" max="1440" value={val}
                onChange={(e) => setIntervals(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                className="moltbook-input"
                style={{ width: '80px', textAlign: 'center' }}
              />
              <span className="moltbook-interval-hint">
                {val === 0 ? '⏸ off' : `every ${val}m`}
              </span>
            </div>
          ))}
        </div>
        <button onClick={saveIntervals} className="btn btn-primary" disabled={savingIntervals} style={{ marginTop: '0.75rem' }}>
          {savingIntervals ? 'Saving...' : 'Save Intervals'}
        </button>
      </div>

      {/* Manual Run */}
      <div className="moltbook-card">
        <h3>Manual run</h3>
        <p className="moltbook-card-desc">Trigger the agent to observe, decide, and engage</p>
        <div className="moltbook-form-row">
          <input
            type="text"
            placeholder="Force: 'Create a new post about...' or 'Comment on...' (leave empty for auto)"
            value={runContext}
            onChange={(e) => setRunContext(e.target.value)}
            className="moltbook-input"
          />
          <button
            onClick={triggerManualRun}
            className="btn btn-primary"
            disabled={actionLoading}
          >
            {actionLoading ? 'Running...' : '▶ Run Agent'}
          </button>
        </div>
      </div>

      {/* Direct Post */}
      <div className="moltbook-card">
        <h3>Direct post</h3>
        <p className="moltbook-card-desc">Post directly (bypasses agent decision-making)</p>
        <div className="moltbook-form-stack">
          <input
            type="text"
            placeholder="Post title"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            className="moltbook-input"
          />
          <textarea
            placeholder="Post content"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className="moltbook-input moltbook-textarea"
            rows={3}
          />
          <div className="moltbook-form-row">
            <select
              value={postSubmolt}
              onChange={(e) => setPostSubmolt(e.target.value)}
              className="moltbook-input moltbook-select"
            >
              <option value="general">m/general</option>
              <option value="ai">m/ai</option>
              <option value="coding">m/coding</option>
              <option value="introductions">m/introductions</option>
            </select>
            <button onClick={directPost} className="btn btn-primary" disabled={actionLoading}>
              Post
            </button>
          </div>
        </div>
      </div>

      {/* Direct Comment */}
      <div className="moltbook-card">
        <h3>Direct comment</h3>
        <p className="moltbook-card-desc">Click a post ID from the feed below to comment on it</p>
        <div className="moltbook-form-stack">
          <input
            type="text"
            placeholder="Post ID"
            value={commentPostId}
            onChange={(e) => setCommentPostId(e.target.value)}
            className="moltbook-input"
          />
          <textarea
            placeholder="Comment content"
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            className="moltbook-input moltbook-textarea"
            rows={2}
          />
          <button onClick={directComment} className="btn btn-primary" disabled={actionLoading}>
            Comment
          </button>
        </div>
      </div>

      {/* Post Topics Queue */}
      <div className="moltbook-card">
        <h3>Post topics queue</h3>
        <p className="moltbook-card-desc">
          Topics the agent will post about (in order). When empty, uses random defaults.
        </p>
        <div className="moltbook-form-row" style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Add a topic (e.g., 'Share thoughts on RAG architecture')"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            className="moltbook-input"
            onKeyDown={(e) => e.key === 'Enter' && addTopic()}
          />
          <button onClick={addTopic} className="btn btn-primary" disabled={actionLoading}>
            Add
          </button>
        </div>
        <div className="moltbook-topics-list">
          {(!config?.post_topics || config.post_topics.length === 0) ? (
            <div className="moltbook-empty" style={{ padding: '1rem' }}>
              No topics queued. Agent will use random defaults.
            </div>
          ) : (
            config.post_topics.map((topic, i) => (
              <div key={i} className="moltbook-topic-item">
                <span className="moltbook-topic-number">{i + 1}</span>
                <span className="moltbook-topic-text">{safeRender(topic, '')}</span>
                <button 
                  className="moltbook-topic-remove"
                  onClick={() => removeTopic(i)}
                  disabled={actionLoading}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Job History */}
      {jobHistory.length > 0 && (
        <div className="moltbook-card">
          <h3>Job history</h3>
          <div className="moltbook-job-history">
            {jobHistory.slice(0, 15).map((job, i) => {
              const statusColor = job.status === 'success' ? '#10b981'
                : job.status === 'failed' ? '#ef4444'
                : job.status === 'skipped' ? '#f59e0b'
                : job.status === 'fallback_success' ? '#3b82f6' : '#6b7280';
              return (
                <div key={i} className="moltbook-job-item">
                  <span className="moltbook-job-name">{job.job}</span>
                  <span className="moltbook-job-status" style={{ color: statusColor }}>
                    {job.status === 'fallback_success' ? '⚡ fallback' : job.status}
                  </span>
                  <span className="moltbook-job-detail">
                    {job.details?.reason || job.details?.target || job.details?.title || job.details?.method || ''}
                  </span>
                  <span className="moltbook-job-time">{formatTimeAgo(job.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="moltbook-card">
        <h3>Moltbook feed</h3>
        <div className="moltbook-feed">
          {feed.length === 0 ? (
            <div className="moltbook-empty">No posts found</div>
          ) : (
            feed.map((post, i) => (
              <div key={post.id || i} className="moltbook-feed-item">
                <div className="moltbook-feed-meta">
                  <span
                    className="moltbook-feed-id"
                    onClick={() => {
                      setCommentPostId(safeRender(post.id, ''));
                      showSuccess('Post ID copied to comment form');
                    }}
                    title="Click to copy to comment form"
                  >
                    {safeRender(post.id, '').substring(0, 8)}...
                  </span>
                  <span className="moltbook-feed-submolt">m/{safeRender(post.submolt, 'general')}</span>
                  <span className="moltbook-feed-author">by {safeRender(post.author, 'unknown')}</span>
                </div>
                <div className="moltbook-feed-title">{safeRender(post.title, 'Untitled')}</div>
                <div className="moltbook-feed-stats">👍 {post.upvotes || 0} · 💬 {post.comment_count || 0}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="moltbook-card">
        <h3>Activity log</h3>
        <div className="moltbook-activity">
          {activity.length === 0 ? (
            <div className="moltbook-empty">No activity yet</div>
          ) : (
            activity.slice(0, 20).map((item, i) => {
              const postId = item.result?.post?.id 
                || item.result?.comment?.post_id 
                || item.result?.post_id
                || item.decision?.target_post_id;
              const moltbookLink = postId ? `https://www.moltbook.com/post/${postId}` : null;
              
              return (
                <div key={item.id || i} className={`moltbook-log-item ${item.error ? 'error' : ''}`}>
                  <div className="moltbook-log-header">
                    <span className="moltbook-log-action">{safeRender(item.action, 'unknown')}</span>
                    <span className="moltbook-log-trigger">{safeRender(item.trigger, '')}</span>
                    <span className="moltbook-log-time">{formatTimeAgo(item.timestamp)}</span>
                  </div>
                  {item.draft?.title && <div className="moltbook-log-title">{safeRender(item.draft.title, '')}</div>}
                  {item.draft?.content && (
                    <div className="moltbook-log-content">
                      {safeRender(item.draft.content, '').substring(0, 150)}...
                    </div>
                  )}
                  {item.error && <div className="moltbook-log-error">{safeRender(item.error, '')}</div>}
                  {moltbookLink && (
                    <a href={moltbookLink} target="_blank" rel="noopener noreferrer" className="moltbook-log-link">
                      View on Moltbook ↗
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        .moltbook-tab {
          margin-top: 1rem;
        }
        .moltbook-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .moltbook-header h2 {
          margin: 0;
        }
        .moltbook-header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .moltbook-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .moltbook-card {
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1rem;
        }
        .moltbook-card h3 {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
        }
        .moltbook-card-desc {
          color: var(--text-secondary, #888);
          font-size: 0.85rem;
          margin: 0 0 1rem;
        }
        .moltbook-status-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .moltbook-status-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
        }
        .status-online {
          color: #10b981;
        }
        .moltbook-toggle {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border: 2px solid var(--border-color, #333);
          background: transparent;
          color: var(--text-primary, #fff);
          cursor: pointer;
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .moltbook-toggle.active {
          background: #10b981;
          border-color: #10b981;
        }
        .moltbook-intervals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 0.75rem;
        }
        .moltbook-interval-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .moltbook-interval-item label {
          font-size: 0.8rem;
          text-transform: capitalize;
          color: var(--text-secondary, #888);
        }
        .moltbook-interval-hint {
          font-size: 0.7rem;
          color: var(--text-secondary, #888);
        }
        .moltbook-form-row {
          display: flex;
          gap: 0.75rem;
        }
        .moltbook-form-stack {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .moltbook-input {
          flex: 1;
          padding: 0.65rem 0.9rem;
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          background: var(--bg-primary, #0f0f1a);
          color: var(--text-primary, #fff);
          font-size: 0.95rem;
        }
        .moltbook-textarea {
          resize: vertical;
          font-family: inherit;
        }
        .moltbook-select {
          max-width: 180px;
        }
        .moltbook-job-history {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 350px;
          overflow-y: auto;
        }
        .moltbook-job-item {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: var(--bg-primary, #0f0f1a);
          border-radius: 6px;
          font-size: 0.82rem;
        }
        .moltbook-job-name {
          font-weight: 600;
          min-width: 65px;
          text-transform: capitalize;
        }
        .moltbook-job-status {
          min-width: 80px;
          font-weight: 500;
        }
        .moltbook-job-detail {
          flex: 1;
          color: var(--text-secondary, #888);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .moltbook-job-time {
          color: var(--text-secondary, #888);
          font-size: 0.75rem;
          white-space: nowrap;
        }
        .moltbook-feed {
          max-height: 350px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .moltbook-feed-item {
          padding: 0.75rem;
          background: var(--bg-primary, #0f0f1a);
          border-radius: 8px;
        }
        .moltbook-feed-meta {
          display: flex;
          gap: 0.75rem;
          font-size: 0.8rem;
          color: var(--text-secondary, #888);
          margin-bottom: 0.35rem;
        }
        .moltbook-feed-id {
          font-family: monospace;
          color: var(--accent-primary, #6366f1);
          cursor: pointer;
        }
        .moltbook-feed-id:hover {
          text-decoration: underline;
        }
        .moltbook-feed-title {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        .moltbook-feed-stats {
          font-size: 0.8rem;
          color: var(--text-secondary, #888);
        }
        .moltbook-activity {
          max-height: 400px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .moltbook-log-item {
          padding: 0.75rem;
          background: var(--bg-primary, #0f0f1a);
          border-radius: 8px;
          border-left: 3px solid var(--accent-primary, #6366f1);
        }
        .moltbook-log-item.error {
          border-left-color: #ef4444;
        }
        .moltbook-log-header {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 0.35rem;
        }
        .moltbook-log-action {
          font-weight: 600;
          text-transform: capitalize;
        }
        .moltbook-log-trigger {
          font-size: 0.75rem;
          background: var(--bg-secondary, #1a1a2e);
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .moltbook-log-time {
          font-size: 0.8rem;
          color: var(--text-secondary, #888);
          margin-left: auto;
        }
        .moltbook-log-title {
          font-weight: 500;
        }
        .moltbook-log-content {
          font-size: 0.85rem;
          color: var(--text-secondary, #888);
          margin-top: 0.25rem;
        }
        .moltbook-log-error {
          color: #ef4444;
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }
        .moltbook-log-link {
          display: inline-block;
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: var(--accent-primary, #6366f1);
          text-decoration: none;
        }
        .moltbook-log-link:hover {
          text-decoration: underline;
        }
        .moltbook-empty {
          padding: 1.5rem;
          text-align: center;
          color: var(--text-secondary, #888);
        }
        .admin-alert {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .admin-alert-error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .admin-alert-success {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }
        .admin-alert button {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: inherit;
        }
        .admin-loading {
          padding: 2rem;
          text-align: center;
          color: var(--text-secondary, #888);
        }
        .moltbook-topics-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 250px;
          overflow-y: auto;
        }
        .moltbook-topic-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 0.75rem;
          background: var(--bg-primary, #0f0f1a);
          border-radius: 8px;
          border-left: 3px solid var(--accent-primary, #6366f1);
        }
        .moltbook-topic-number {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent-primary, #6366f1);
          background: rgba(99, 102, 241, 0.1);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          min-width: 24px;
          text-align: center;
        }
        .moltbook-topic-text {
          flex: 1;
          font-size: 0.9rem;
        }
        .moltbook-topic-remove {
          background: none;
          border: none;
          color: var(--text-secondary, #888);
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0 0.25rem;
          line-height: 1;
        }
        .moltbook-topic-remove:hover {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
};

export default Admin;