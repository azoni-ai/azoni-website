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
  addDoc,
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
            <button 
              className={`admin-main-tab ${activeTab === 'blog' ? 'active' : ''}`}
              onClick={() => setActiveTab('blog')}
            >
              ✍️ Blog
            </button>
          </div>

          {activeTab === 'usage' && <UsageTab />}
          {activeTab === 'comments' && <CommentsTab />}
          {activeTab === 'blog' && <BlogTab />}
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

export default Admin;
