import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { db } from '../config/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';

// Billing is its own lazy chunk so the admin bundle doesn't carry it.
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
  if (!res.ok) {
    const err = new Error(data.error || `admin-data ${action} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
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

  // The token is the session: it was only ever stored after a server-side
  // verify, and every gated endpoint re-checks it on each call.
  useEffect(() => {
    if (sessionStorage.getItem('rag_admin_token')) setAuthenticated(true);
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
        // The verified password doubles as the bearer token for the gated
        // backend endpoints (admin-data, billing-admin).
        sessionStorage.setItem('rag_admin_token', password);
      } else {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || 'Invalid password');
      }
    } catch {
      setLoginError('Login service unavailable. Try again.');
    }
  };

  // Memoized: UsageTab takes this as an effect dependency (401 -> sign out).
  const handleLogout = useCallback(() => {
    setAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated'); // legacy flag cleanup
    sessionStorage.removeItem('rag_admin_token');
    navigate('/');
  }, [navigate]);

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
              className={`admin-main-tab ${activeTab === 'usage' ? 'active' : ''}`}
              onClick={() => setActiveTab('usage')}
            >
              Chat usage
            </button>
            <button
              className={`admin-main-tab ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              Comments
            </button>
            <button
              className={`admin-main-tab ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              Billing
            </button>
          </div>

          {activeTab === 'usage' && <UsageTab onAuthFailure={handleLogout} />}
          {activeTab === 'comments' && <CommentsTab />}
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
        </div>
      </section>
    </Layout>
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
    // conversation key doesn't depend on which copy was seen first.
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

const UsageTab = ({ onAuthFailure }) => {
  const [chatLogs, setChatLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
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
        // Dedupe the dual client+server rows per turn so the usage numbers
        // count each turn once, and drop test-probe traffic.
        const revived = mergeChatLogs((logs || []).map(reviveTimestamps)).filter((l) => !isTestLog(l));
        setChatLogs(revived);
        calculateStats(revived);
        setLoadError('');
      })
      .catch((error) => {
        // A stale/rotated token used to render as a convincing "No chat logs
        // yet." — surface the failure instead.
        console.error('Error loading chat logs:', error);
        if (error.status === 401 && onAuthFailure) {
          onAuthFailure();
          return;
        }
        setLoadError(error.message || 'Failed to load chat logs.');
      })
      .finally(() => setLoading(false));
  }, [onAuthFailure]);

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

  if (loadError) {
    return (
      <div className="usage-tab">
        <p className="error-text">Could not load chat logs: {loadError}</p>
      </div>
    );
  }

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

// ============ COMMENTS TAB ============
const CommentsTab = () => {
  const [comments, setComments] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  // One-shot bounded read instead of the old unbounded real-time listener —
  // moderation is rare, and this keeps Firestore reads predictable.
  const loadComments = async () => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'comments'), orderBy('createdAt', 'desc'), limit(200))
      );
      setComments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  useEffect(() => {
    loadComments();
  }, []);

  // Comment moderation goes through admin-data — client update/delete on
  // comments is denied by the Firestore rules. Re-fetch after each change.
  // Returns whether the op succeeded so callers can keep form state on failure.
  const moderate = async (id, op, extra = {}) => {
    try {
      await adminData('moderate-comment', { id, op, ...extra });
      await loadComments();
      return true;
    } catch (err) {
      console.error('Moderation failed:', err);
      alert(`Failed to ${op} comment: ${err.message}`);
      return false;
    }
  };

  const deleteComment = (id) => {
    if (!window.confirm('Delete this comment?')) return;
    moderate(id, 'delete');
  };

  const submitReply = async (id) => {
    if (!replyText.trim()) return;
    const ok = await moderate(id, 'reply', { reply: replyText.trim() });
    if (!ok) return; // keep the typed reply so it can be retried
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
        <button className="admin-tab" onClick={loadComments}>Refresh</button>
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
                  {!c.approved && <button className="btn btn-success btn-sm" onClick={() => moderate(c.id, 'approve')}>Approve</button>}
                  {c.approved && <button className="btn btn-warning btn-sm" onClick={() => moderate(c.id, 'reject')}>Unapprove</button>}
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

export default Admin;
