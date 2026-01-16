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
  Timestamp
} from 'firebase/firestore';

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [comments, setComments] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const navigate = useNavigate();

  // Check session storage for existing auth
  useEffect(() => {
    const isAuth = sessionStorage.getItem('admin_auth');
    if (isAuth === 'true') {
      setAuthenticated(true);
    }
  }, []);

  // Load comments when authenticated
  useEffect(() => {
    if (!authenticated) return;

    const q = query(
      collection(db, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [authenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    
    const adminPassword = process.env.REACT_APP_ADMIN_PASSWORD;
    
    if (password === adminPassword) {
      setAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      setLoginError('Invalid password');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    sessionStorage.removeItem('admin_auth');
    navigate('/');
  };

  const approveComment = async (commentId) => {
    try {
      await updateDoc(doc(db, 'comments', commentId), { approved: true });
    } catch (error) {
      console.error('Error approving comment:', error);
    }
  };

  const rejectComment = async (commentId) => {
    try {
      await updateDoc(doc(db, 'comments', commentId), { approved: false });
    } catch (error) {
      console.error('Error rejecting comment:', error);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const submitReply = async (commentId) => {
    if (!replyText.trim()) return;
    try {
      await updateDoc(doc(db, 'comments', commentId), {
        replies: arrayUnion({
          text: replyText.trim(),
          createdAt: Timestamp.now()
        })
      });
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error submitting reply:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredComments = comments.filter(c => {
    if (filter === 'pending') return !c.approved;
    if (filter === 'approved') return c.approved;
    return true;
  });

  // Login Screen
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

  // Admin Dashboard
  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container">
          <div className="admin-header">
            <h1>Comment Moderation</h1>
            <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
          </div>

          <div className="admin-tabs">
            <button 
              className={`admin-tab ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending ({comments.filter(c => !c.approved).length})
            </button>
            <button 
              className={`admin-tab ${filter === 'approved' ? 'active' : ''}`}
              onClick={() => setFilter('approved')}
            >
              Approved ({comments.filter(c => c.approved).length})
            </button>
            <button 
              className={`admin-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({comments.length})
            </button>
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

                  {c.replies && c.replies.length > 0 && (
                    <div className="admin-replies">
                      <strong>Your Replies:</strong>
                      {c.replies.map((reply, index) => (
                        <div key={index} className="admin-reply">
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
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => submitReply(c.id)}
                          disabled={!replyText.trim()}
                        >
                          Send
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="admin-actions">
                      {!c.approved && (
                        <button className="btn btn-success btn-sm" onClick={() => approveComment(c.id)}>
                          Approve
                        </button>
                      )}
                      {c.approved && (
                        <button className="btn btn-warning btn-sm" onClick={() => rejectComment(c.id)}>
                          Unapprove
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => setReplyingTo(c.id)}>
                        Reply
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteComment(c.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Admin;