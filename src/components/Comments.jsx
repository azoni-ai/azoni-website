import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  increment
} from 'firebase/firestore';

const RATE_LIMIT_MINUTES = 5; // One comment per 5 minutes

const Comments = ({ projectId }) => {
  const [comments, setComments] = useState([]);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(0);
  const [stars, setStars] = useState(0);
  const [userStarred, setUserStarred] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Check rate limit on mount
  useEffect(() => {
    checkRateLimit();
    const interval = setInterval(checkRateLimit, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const checkRateLimit = () => {
    const lastComment = localStorage.getItem('last_comment_time');
    if (lastComment) {
      const elapsed = Date.now() - parseInt(lastComment);
      const limitMs = RATE_LIMIT_MINUTES * 60 * 1000;
      if (elapsed < limitMs) {
        setRateLimited(true);
        setRateLimitRemaining(Math.ceil((limitMs - elapsed) / 1000 / 60));
      } else {
        setRateLimited(false);
        setRateLimitRemaining(0);
      }
    }
  };

  // Load approved comments
  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('projectId', '==', projectId),
      where('approved', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(commentsData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading comments:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  // Load stars count
  useEffect(() => {
    const starDocRef = doc(db, 'stars', projectId);
    
    const unsubscribe = onSnapshot(starDocRef, (doc) => {
      if (doc.exists()) {
        setStars(doc.data().count || 0);
      }
    });

    const starred = localStorage.getItem(`starred_${projectId}`);
    if (starred) {
      setUserStarred(true);
    }

    return () => unsubscribe();
  }, [projectId]);

  const handleStar = async () => {
    if (userStarred) return;

    try {
      const starDocRef = doc(db, 'stars', projectId);
      const starDoc = await getDoc(starDocRef);
      
      if (starDoc.exists()) {
        await setDoc(starDocRef, { count: increment(1) }, { merge: true });
      } else {
        await setDoc(starDocRef, { count: 1, projectId });
      }
      
      localStorage.setItem(`starred_${projectId}`, 'true');
      setUserStarred(true);
    } catch (error) {
      console.error('Error starring:', error);
    }
  };

  const sanitizeInput = (str) => {
    return str
      .trim()
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove any remaining angle brackets
      .substring(0, 1000); // Enforce max length
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check rate limit
    if (rateLimited) {
      alert(`Please wait ${rateLimitRemaining} more minute(s) before commenting again.`);
      return;
    }

    const sanitizedComment = sanitizeInput(comment);
    const sanitizedName = sanitizeInput(name).substring(0, 50) || 'Anonymous';

    if (!sanitizedComment || sanitizedComment.length < 2) {
      alert('Please enter a valid comment.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        projectId,
        name: sanitizedName,
        comment: sanitizedComment,
        approved: false,
        createdAt: serverTimestamp(),
        replies: []
      });
      
      // Set rate limit
      localStorage.setItem('last_comment_time', Date.now().toString());
      setRateLimited(true);
      setRateLimitRemaining(RATE_LIMIT_MINUTES);
      
      setName('');
      setComment('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Error submitting comment. Please try again.');
    }
    setSubmitting(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="comments-section">
      {/* Stars */}
      <div className="stars-container">
        <button 
          className={`star-button ${userStarred ? 'starred' : ''}`}
          onClick={handleStar}
          onMouseEnter={() => setHoveredStar(1)}
          onMouseLeave={() => setHoveredStar(0)}
          disabled={userStarred}
        >
          <span className="star-icon">{userStarred || hoveredStar ? '★' : '☆'}</span>
          <span className="star-count">{stars}</span>
          <span className="star-label">{stars === 1 ? 'star' : 'stars'}</span>
        </button>
      </div>

      {/* Comment Form */}
      <div className="comment-form-container">
        <h3>Leave a Comment</h3>
        {submitted ? (
          <div className="comment-success">
            Thanks for your comment! It will appear after approval.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="comment-form">
            <input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="comment-input"
              maxLength={50}
            />
            <textarea
              placeholder="Your comment or question..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="comment-textarea"
              required
              maxLength={1000}
              rows={4}
            />
            {rateLimited && (
              <p className="rate-limit-warning">
                Please wait {rateLimitRemaining} minute(s) before commenting again.
              </p>
            )}
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting || !comment.trim() || rateLimited}
            >
              {submitting ? 'Submitting...' : rateLimited ? `Wait ${rateLimitRemaining}m` : 'Submit Comment'}
            </button>
          </form>
        )}
      </div>

      {/* Comments List */}
      <div className="comments-list">
        <h3>Comments {comments.length > 0 && `(${comments.length})`}</h3>
        {loading ? (
          <p className="comments-loading">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="comments-empty">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-author">{c.name}</span>
                <span className="comment-date">{formatDate(c.createdAt)}</span>
              </div>
              <p className="comment-text">{c.comment}</p>
              
              {/* Replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="comment-replies">
                  {c.replies.map((reply, index) => (
                    <div key={index} className="reply-item">
                      <div className="reply-header">
                        <span className="reply-author">Charlton (Author)</span>
                        <span className="reply-date">{formatDate(reply.createdAt)}</span>
                      </div>
                      <p className="reply-text">{reply.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;