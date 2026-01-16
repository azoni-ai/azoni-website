import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  arrayUnion,
  Timestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';

const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD;

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

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
    } else {
      setLoginError('Invalid password');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
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
              className={`admin-main-tab ${activeTab === 'usage' ? 'active' : ''}`}
              onClick={() => setActiveTab('usage')}
            >
              📊 Chat Usage
            </button>
            <button 
              className={`admin-main-tab ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              💬 Comments
            </button>
          </div>

          {activeTab === 'usage' && <UsageTab />}
          {activeTab === 'comments' && <CommentsTab />}
        </div>
      </section>
    </Layout>
  );
};

// ============ USAGE TAB ============
const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', cost: '~$0.0003' },
  { id: 'anthropic/claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', provider: 'Anthropic', cost: '~$0.002' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google', cost: '~$0.0002' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', cost: '~$0.0003' },
  { id: 'mistralai/mistral-small-24b-instruct-2501', name: 'Mistral Small', provider: 'Mistral', cost: '~$0.0001' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', cost: '~$0.0002' },
];

const UsageTab = () => {
  const [chatLogs, setChatLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState(null);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
  const [savingModel, setSavingModel] = useState(false);
  const [stats, setStats] = useState({
    totalChats: 0,
    totalTokens: 0,
    totalCost: 0,
    todayChats: 0,
    todayCost: 0
  });

  // Load current model setting
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

  // Save model setting
  const saveModel = async (model) => {
    setSavingModel(true);
    try {
      await setDoc(doc(db, 'settings', 'chat'), { model }, { merge: true });
      setSelectedModel(model);
    } catch (err) {
      console.error('Error saving model:', err);
      alert('Failed to save model setting');
    }
    setSavingModel(false);
  };

  useEffect(() => {
    const q = query(
      collection(db, 'chatLogs'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChatLogs(logs);
      calculateStats(logs);
      setLoading(false);
    }, (error) => {
      console.error('Error loading chat logs:', error);
      setLoading(false);
    });

    return () => unsubscribe();
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

  // Group logs by session
  const groupedSessions = chatLogs.reduce((acc, log) => {
    const sessionId = log.sessionId || 'unknown';
    if (!acc[sessionId]) {
      acc[sessionId] = {
        logs: [],
        totalTokens: 0,
        totalCost: 0,
        firstTimestamp: log.timestamp,
        mode: log.mode,
        model: log.model
      };
    }
    acc[sessionId].logs.push(log);
    acc[sessionId].totalTokens += log.usage?.total_tokens || 0;
    acc[sessionId].totalCost += parseFloat(log.usage?.totalCost || 0);
    // Use the most recent model for the session
    if (log.model) acc[sessionId].model = log.model;
    return acc;
  }, {});

  const sessions = Object.entries(groupedSessions)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => {
      const aTime = a.firstTimestamp?.toDate?.() || new Date(0);
      const bTime = b.firstTimestamp?.toDate?.() || new Date(0);
      return bTime - aTime;
    });

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return <p>Loading usage data...</p>;

  return (
    <div className="usage-tab">
      {/* Model Selector */}
      <div className="model-selector-card">
        <h3>Chat Model</h3>
        <div className="model-options">
          {AVAILABLE_MODELS.map(m => (
            <button
              key={m.id}
              className={`model-option ${selectedModel === m.id ? 'active' : ''}`}
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
          <div className="stat-label">Total Chats</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalTokens.toLocaleString()}</div>
          <div className="stat-label">Total Tokens</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${stats.totalCost}</div>
          <div className="stat-label">Total Cost</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">{stats.todayChats}</div>
          <div className="stat-label">Today's Chats</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">${stats.todayCost}</div>
          <div className="stat-label">Today's Cost</div>
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
                  <span className="session-model">{session.model || 'gpt-4'}</span>
                  <span className="session-mode">{session.mode || 'professional'}</span>
                  <span className="session-messages">{session.logs.length} msg</span>
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
                      <div className="chat-log-assistant">
                        <strong>Assistant:</strong> {log.assistantMessage?.substring(0, 500)}
                        {log.assistantMessage?.length > 500 && '...'}
                      </div>
                      {log.usage && (
                        <div className="chat-log-meta">
                          <span>{log.model || 'gpt-4'}</span>
                          <span>In: {log.usage.prompt_tokens}</span>
                          <span>Out: {log.usage.completion_tokens}</span>
                          <span>${log.usage.totalCost}</span>
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

  const approveComment = async (id) => {
    await updateDoc(doc(db, 'comments', id), { approved: true });
  };

  const rejectComment = async (id) => {
    await updateDoc(doc(db, 'comments', id), { approved: false });
  };

  const deleteComment = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    await deleteDoc(doc(db, 'comments', id));
  };

  const submitReply = async (id) => {
    if (!replyText.trim()) return;
    await updateDoc(doc(db, 'comments', id), {
      replies: arrayUnion({ text: replyText.trim(), createdAt: Timestamp.now() })
    });
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
                  <strong>Your Replies:</strong>
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

export default Admin;