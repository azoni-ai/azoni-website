import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  setDoc,
  getDocs,
  limit
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
            <button 
              className={`admin-main-tab ${activeTab === 'rag' ? 'active' : ''}`}
              onClick={() => setActiveTab('rag')}
            >
              🧠 RAG
            </button>
          </div>

          {activeTab === 'usage' && <UsageTab />}
          {activeTab === 'comments' && <CommentsTab />}
          {activeTab === 'rag' && <RAGTab />}
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

// ============ RAG TAB ============
const RAG_CATEGORIES = ['bio', 'skill', 'project', 'experience', 'faq'];

const EXAMPLE_QUERIES = [
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

  // API helper
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const response = await fetch(`/.netlify/functions/rag-admin${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'API error');
    }

    return response.json();
  }, []);

  // Load chunks
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

  // Load stats
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
      alert(`Embedded ${result.success}/${result.total} chunks. Cost: $${result.totalCost}`);
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

  return (
    <div className="rag-tab">
      <div className="rag-header">
        <div className="rag-header-info">
          <h3>RAG Knowledge Base</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Manage embeddings, test retrieval, and monitor performance
          </p>
        </div>
        <div className="rag-header-actions">
          <button onClick={handleEmbedAll} className="btn btn-secondary btn-sm" disabled={loading}>
            🔄 Re-embed All
          </button>
          <button onClick={handleSeedDefaults} className="btn btn-secondary btn-sm" disabled={loading}>
            🌱 Seed Defaults
          </button>
        </div>
      </div>

      {error && (
        <div className="rag-error">
          {error}
        </div>
      )}

      <div className="admin-tabs" style={{ marginTop: 'var(--space-md)' }}>
        <button className={`admin-tab ${subTab === 'chunks' ? 'active' : ''}`} onClick={() => setSubTab('chunks')}>
          📚 Chunks ({chunks.length})
        </button>
        <button className={`admin-tab ${subTab === 'test' ? 'active' : ''}`} onClick={() => setSubTab('test')}>
          🔍 Test
        </button>
        <button className={`admin-tab ${subTab === 'stats' ? 'active' : ''}`} onClick={() => setSubTab('stats')}>
          📊 Stats
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
    if (filter !== 'all') {
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
                    {reembedding === chunk.id ? '⏳...' : '🔄 Re-embed'}
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
          <h3>{chunk?.id ? 'Edit Chunk' : 'New Chunk'}</h3>
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
          <h4>Intent Detection</h4>
          <p>
            <strong>Intent:</strong> <span className="rag-intent-badge">{intentResult.intent}</span>
            <span className={`rag-confidence rag-confidence-${intentResult.confidence}`}>
              {intentResult.confidence}
            </span>
          </p>
          {intentResult.matchedKeywords?.length > 0 && (
            <p><strong>Keywords:</strong> {intentResult.matchedKeywords.join(', ')}</p>
          )}
          <p><strong>Recommended:</strong> Top {intentResult.recommendedRetrieval?.topK}, 
            Categories: {intentResult.recommendedRetrieval?.categories?.join(', ') || 'All'}</p>
        </div>
      )}

      {results && (
        <div className="rag-retrieval-results">
          <h4>Retrieval Results</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Searched {results.stats.chunksSearched} chunks in {results.stats.totalLatencyMs}ms • 
            Query cost: ${results.stats.queryCost}
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
          <div className="stat-label">Total Chunks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.chunksWithEmbeddings}</div>
          <div className="stat-label">Embedded</div>
        </div>
        <div className="stat-card" style={stats.chunksMissingEmbeddings > 0 ? { borderColor: '#f59e0b' } : {}}>
          <div className="stat-value">{stats.chunksMissingEmbeddings}</div>
          <div className="stat-label">Missing</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalTokens.toLocaleString()}</div>
          <div className="stat-label">Total Tokens</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgTokens}</div>
          <div className="stat-label">Avg/Chunk</div>
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
            <td>${stats.estimatedEmbeddingCost}</td>
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
            <td>{stats.estimatedQueryCost}</td>
          </tr>
        </tbody>
      </table>

      {stats.chunksMissingEmbeddings > 0 && (
        <div className="rag-warning">
          ⚠️ {stats.chunksMissingEmbeddings} chunks missing embeddings. Click "Re-embed All" to fix.
        </div>
      )}
    </div>
  );
};

export default Admin;