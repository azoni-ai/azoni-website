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
  addDoc,
  arrayUnion,
  Timestamp,
  getDoc,
  setDoc,
  getDocs,
  serverTimestamp
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
              className={`admin-main-tab ${activeTab === 'blog' ? 'active' : ''}`}
              onClick={() => setActiveTab('blog')}
            >
              ✍️ Blog
            </button>
            <button 
              className={`admin-main-tab ${activeTab === 'rag' ? 'active' : ''}`}
              onClick={() => setActiveTab('rag')}
            >
              🧠 RAG
            </button>
            <button 
              className={`admin-main-tab ${activeTab === 'moltbook' ? 'active' : ''}`}
              onClick={() => setActiveTab('moltbook')}
            >
              🦞 Moltbook
            </button>
            <button 
              className={`admin-main-tab ${activeTab === 'customize' ? 'active' : ''}`}
              onClick={() => setActiveTab('customize')}
            >
              🎨 Customize
            </button>
          </div>

          {activeTab === 'usage' && <UsageTab />}
          {activeTab === 'comments' && <CommentsTab />}
          {activeTab === 'blog' && <BlogTab />}
          {activeTab === 'rag' && <RAGTab />}
          {activeTab === 'moltbook' && <MoltbookTab />}
          {activeTab === 'customize' && <CustomizeTab />}
        </div>
      </section>
    </Layout>
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
      const postData = {
        ...formData,
        updatedAt: Timestamp.now()
      };

      if (formData.published && !editingPost?.publishedAt) {
        postData.publishedAt = Timestamp.now();
      }

      if (editingPost) {
        await updateDoc(doc(db, 'blogPosts', editingPost.id), postData);
      } else {
        postData.createdAt = Timestamp.now();
        await addDoc(collection(db, 'blogPosts'), postData);
      }

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
    await deleteDoc(doc(db, 'blogPosts', post.id));
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
          <h2>{editingPost ? 'Edit Post' : 'New Post'}</h2>
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
            <label>Cover Image URL</label>
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
                📷 Insert Image
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
            <label>Related Project (optional)</label>
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
              {saving ? 'Saving...' : (editingPost ? 'Update Post' : 'Create Post')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-tab">
      <div className="blog-tab-header">
        <h3>Blog Posts ({posts.length})</h3>
        <button className="btn btn-primary" onClick={() => setShowEditor(true)}>
          + New Post
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

  if (loading) return <p>Loading chat logs...</p>;

  return (
    <div className="usage-tab">
      <div className="model-selector">
        <h3>Active Model</h3>
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
    const response = await fetch(`/.netlify/functions/rag-admin${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const err = await response.json();
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
          <strong>RAG System Error:</strong> {error}
          <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
            To enable RAG, add Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) to Netlify environment variables.
          </p>
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
          <p><strong>Recommended:</strong> Top {intentResult.settings?.topK || 5}, 
            Categories: {intentResult.settings?.categories?.join(', ') || 'All'}</p>
        </div>
      )}

      {results && (
        <div className="rag-retrieval-results">
          <h4>Retrieval Results</h4>
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
          <div className="stat-label">Total Chunks</div>
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
          ⚠️ {stats.missingEmbeddings} chunks missing embeddings. Click "Re-embed All" to fix.
        </div>
      )}
    </div>
  );
};

// ============ CUSTOMIZE TAB (CLEANED UP - Sync/Migrate removed) ============
const CustomizeTab = () => {
  const [subTab, setSubTab] = useState('profile');
  
  return (
    <div className="customize-tab">
      <div className="customize-subtabs">
        <button 
          className={`customize-subtab ${subTab === 'profile' ? 'active' : ''}`}
          onClick={() => setSubTab('profile')}
        >
          Profile
        </button>
        <button 
          className={`customize-subtab ${subTab === 'projects' ? 'active' : ''}`}
          onClick={() => setSubTab('projects')}
        >
          Projects
        </button>
      </div>

      {subTab === 'profile' && <ProfileEditor />}
      {subTab === 'projects' && <ProjectsManager />}
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
      await setDoc(doc(db, 'profile', 'main'), {
        ...profile,
        lastUpdated: serverTimestamp()
      }, { merge: true });
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

// ============ PROJECTS MANAGER ============
const ProjectsManager = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const emptyProject = {
    id: '', title: '', tagline: '', description: '', longDescription: '',
    tech: [], highlights: [], links: { live: '', github: '' },
    image: '', featured: false, category: 'ai', order: 99
  };

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'projects'));
      const projectsData = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      projectsData.sort((a, b) => {
        const orderA = a.order ?? 99;
        const orderB = b.order ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        if (a.featured !== b.featured) return b.featured ? 1 : -1;
        return (a.title || '').localeCompare(b.title || '');
      });
      setProjects(projectsData);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete "${project.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'projects', project.docId));
      await loadProjects();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  const handleSave = async (projectData) => {
    try {
      const { docId, ...data } = projectData;
      const projectDocId = docId || data.id;
      if (!projectDocId) { alert('Project ID is required'); return; }
      await setDoc(doc(db, 'projects', projectDocId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
      setShowEditor(false);
      setEditingProject(null);
      await loadProjects();
    } catch (err) {
      alert('Error saving: ' + err.message);
    }
  };

  if (loading) return <div className="customize-loading">Loading projects...</div>;

  if (showEditor) {
    return <ProjectEditor project={editingProject} onSave={handleSave} onCancel={() => { setShowEditor(false); setEditingProject(null); }} />;
  }

  return (
    <div className="projects-manager">
      <div className="projects-header">
        <span>{projects.length} projects</span>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingProject({ ...emptyProject }); setShowEditor(true); }}>+ Add Project</button>
      </div>
      <div className="projects-list">
        {projects.map((project, index) => (
          <div key={project.docId} className="project-card-admin">
            <div className="project-card-info">
              <div className="project-card-title">
                <span className="project-order">#{project.order ?? index + 1}</span>
                {project.featured && <span className="featured-badge">⭐</span>}
                {project.title}
              </div>
              <div className="project-card-tagline">{project.tagline}</div>
            </div>
            <div className="project-card-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditingProject(project); setShowEditor(true); }}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(project)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ PROJECT EDITOR ============
const ProjectEditor = ({ project, onSave, onCancel }) => {
  const [form, setForm] = useState(project);
  const [techInput, setTechInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    setSaving(true); 
    await onSave(form); 
    setSaving(false); 
  };

  const addTech = () => { 
    if (techInput.trim() && !form.tech?.includes(techInput.trim())) { 
      setForm(prev => ({ ...prev, tech: [...(prev.tech || []), techInput.trim()] })); 
      setTechInput(''); 
    } 
  };

  const removeTech = (tech) => { 
    setForm(prev => ({ ...prev, tech: prev.tech.filter(t => t !== tech) })); 
  };

  const addHighlight = () => { 
    if (highlightInput.trim()) { 
      setForm(prev => ({ ...prev, highlights: [...(prev.highlights || []), highlightInput.trim()] })); 
      setHighlightInput(''); 
    } 
  };

  const removeHighlight = (index) => { 
    setForm(prev => ({ ...prev, highlights: prev.highlights.filter((_, i) => i !== index) })); 
  };

  return (
    <div className="project-editor">
      <div className="editor-header">
        <h4>{project.docId ? 'Edit Project' : 'New Project'}</h4>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>← Back</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="editor-grid">
          <div className="editor-section">
            <label className="editor-label">Project ID *</label>
            <input type="text" className="editor-input" placeholder="my-project" value={form.id || ''}
              onChange={(e) => setForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} disabled={!!project.docId} required />
          </div>
          <div className="editor-section">
            <label className="editor-label">Title *</label>
            <input type="text" className="editor-input" placeholder="My Awesome Project" value={form.title || ''}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} required />
          </div>
        </div>

        <div className="editor-section">
          <label className="editor-label">Tagline</label>
          <input type="text" className="editor-input" placeholder="One-line description" value={form.tagline || ''}
            onChange={(e) => setForm(prev => ({ ...prev, tagline: e.target.value }))} />
        </div>

        <div className="editor-section">
          <label className="editor-label">Card Description</label>
          <textarea className="editor-textarea" placeholder="Short description for homepage cards..." rows={3} value={form.description || ''}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} />
        </div>

        <div className="editor-section">
          <label className="editor-label">Full Description</label>
          <textarea className="editor-textarea" placeholder="Detailed project description..." rows={8} value={form.longDescription || ''}
            onChange={(e) => setForm(prev => ({ ...prev, longDescription: e.target.value }))} />
        </div>

        <div className="editor-grid">
          <div className="editor-section">
            <label className="editor-label">Live URL</label>
            <input type="url" className="editor-input" placeholder="https://..." value={form.links?.live || ''}
              onChange={(e) => setForm(prev => ({ ...prev, links: { ...prev.links, live: e.target.value } }))} />
          </div>
          <div className="editor-section">
            <label className="editor-label">GitHub URL</label>
            <input type="url" className="editor-input" placeholder="https://github.com/..." value={form.links?.github || ''}
              onChange={(e) => setForm(prev => ({ ...prev, links: { ...prev.links, github: e.target.value } }))} />
          </div>
        </div>

        <div className="editor-section">
          <label className="editor-label">Tech Stack</label>
          <div className="skills-input-row">
            <input type="text" className="editor-input" placeholder="Add technology..." value={techInput}
              onChange={(e) => setTechInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addTech}>Add</button>
          </div>
          <div className="skills-tags">
            {form.tech?.map(tech => (
              <span key={tech} className="skill-tag">
                {tech}
                <button type="button" className="skill-remove" onClick={() => removeTech(tech)}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="editor-section">
          <label className="editor-label">Highlights</label>
          <div className="skills-input-row">
            <input type="text" className="editor-input" placeholder="Add highlight..." value={highlightInput}
              onChange={(e) => setHighlightInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addHighlight}>Add</button>
          </div>
          <div className="highlights-list">
            {form.highlights?.map((h, i) => (
              <div key={i} className="highlight-item">
                <span>• {h}</span>
                <button type="button" className="skill-remove" onClick={() => removeHighlight(i)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-grid">
          <div className="editor-section">
            <label className="editor-label">Image Path</label>
            <input type="text" className="editor-input" placeholder="/images/project.svg" value={form.image || ''}
              onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))} />
          </div>
          <div className="editor-section">
            <label className="editor-label">Category</label>
            <select className="editor-select" value={form.category || 'ai'} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}>
              <option value="ai">AI / ML</option>
              <option value="web">Web App</option>
              <option value="fintech">Fintech</option>
              <option value="web3">Web3</option>
              <option value="games">Games</option>
            </select>
          </div>
        </div>

        <div className="editor-grid">
          <div className="editor-section">
            <label className="editor-label">Display Order</label>
            <input type="number" className="editor-input" placeholder="1" min="1" max="99" value={form.order || ''}
              onChange={(e) => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 99 }))} />
            <span className="editor-hint">Lower numbers appear first</span>
          </div>
          <div className="editor-section">
            <label className="editor-checkbox-label" style={{ marginTop: '28px' }}>
              <input type="checkbox" checked={form.featured || false} onChange={(e) => setForm(prev => ({ ...prev, featured: e.target.checked }))} />
              Featured on homepage
            </label>
          </div>
        </div>

        <div className="editor-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Project'}</button>
        </div>
      </form>
    </div>
  );
};

// ============ MOLTBOOK TAB ============
const AGENT_API_URL = process.env.REACT_APP_MOLTBOOK_AGENT_URL || 'https://azoni-moltbook-agent.onrender.com';

// Helper to safely render any value (handles objects)
const safeRender = (value, fallback = 'Unknown') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // Handle author objects specifically
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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Manual run form
  const [runContext, setRunContext] = useState('');

  // Direct post form
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postSubmolt, setPostSubmolt] = useState('general');

  // Direct comment form
  const [commentPostId, setCommentPostId] = useState('');
  const [commentContent, setCommentContent] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statusRes, configRes, activityRes, feedRes] = await Promise.all([
        fetch(`${AGENT_API_URL}/status`),
        fetch(`${AGENT_API_URL}/config`),
        fetch(`${AGENT_API_URL}/activity?limit=50`),
        fetch(`${AGENT_API_URL}/feed?limit=15`)
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (configRes.ok) setConfig(await configRes.json());
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity || []);
      }
      if (feedRes.ok) {
        const data = await feedRes.json();
        setFeed(data.posts || []);
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
      const res = await fetch(`${AGENT_API_URL}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autonomous_mode: newMode })
      });

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

  const triggerManualRun = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${AGENT_API_URL}/run/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: runContext || null })
      });

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
      const res = await fetch(`${AGENT_API_URL}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postTitle,
          content: postContent,
          submolt: postSubmolt
        })
      });

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
      const res = await fetch(`${AGENT_API_URL}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: commentPostId,
          content: commentContent
        })
      });

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
        <h2>🦞 Moltbook Agent Control</h2>
        <div className="moltbook-header-actions">
          <a 
            href="https://www.moltbook.com/u/Azoni-AI" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View Profile ↗
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
            <div className="moltbook-status-row">
              <span>Heartbeat</span>
              <span>Every {config?.heartbeat_interval_hours || 4}h</span>
            </div>
          </div>
        </div>

        <div className="moltbook-card">
          <h3>Autonomous Mode</h3>
          <p className="moltbook-card-desc">When enabled, agent runs automatically on schedule</p>
          <button
            onClick={toggleAutonomousMode}
            className={`moltbook-toggle ${config?.autonomous_mode ? 'active' : ''}`}
            disabled={actionLoading}
          >
            {config?.autonomous_mode ? '🤖 ON — Running Autonomously' : '👤 OFF — Manual Only'}
          </button>
        </div>
      </div>

      {/* Manual Run */}
      <div className="moltbook-card">
        <h3>Manual Run</h3>
        <p className="moltbook-card-desc">Trigger the agent to observe, decide, and engage</p>
        <div className="moltbook-form-row">
          <input
            type="text"
            placeholder="Optional context (e.g., 'Comment on something about AI')"
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
        <h3>Direct Post</h3>
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
        <h3>Direct Comment</h3>
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

      {/* Feed */}
      <div className="moltbook-card">
        <h3>Moltbook Feed</h3>
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
                      setCommentPostId(post.id);
                      showSuccess('Post ID copied');
                    }}
                    title="Click to copy"
                  >
                    {post.id?.substring(0, 8)}...
                  </span>
                  <span className="moltbook-feed-submolt">m/{post.submolt || 'general'}</span>
                  <span className="moltbook-feed-author">by {safeRender(post.author, 'unknown')}</span>
                </div>
                <div className="moltbook-feed-title">{post.title}</div>
                <div className="moltbook-feed-stats">👍 {post.upvotes || 0} · 💬 {post.comment_count || 0}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="moltbook-card">
        <h3>Activity Log</h3>
        <div className="moltbook-activity">
          {activity.length === 0 ? (
            <div className="moltbook-empty">No activity yet</div>
          ) : (
            activity.slice(0, 20).map((item, i) => {
              // Extract post ID from multiple possible locations
              const postId = item.result?.post?.id 
                || item.result?.comment?.post_id 
                || item.result?.post_id
                || item.decision?.target_post_id;
              const moltbookLink = postId ? `https://www.moltbook.com/post/${postId}` : null;
              
              return (
                <div key={item.id || i} className={`moltbook-log-item ${item.error ? 'error' : ''}`}>
                  <div className="moltbook-log-header">
                    <span className="moltbook-log-action">{item.action}</span>
                    <span className="moltbook-log-trigger">{item.trigger}</span>
                    <span className="moltbook-log-time">{formatTimeAgo(item.timestamp)}</span>
                  </div>
                  {item.draft?.title && <div className="moltbook-log-title">{item.draft.title}</div>}
                  {item.draft?.content && (
                    <div className="moltbook-log-content">{item.draft.content.substring(0, 150)}...</div>
                  )}
                  {item.error && <div className="moltbook-log-error">{item.error}</div>}
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
      `}</style>
    </div>
  );
};

export default Admin;