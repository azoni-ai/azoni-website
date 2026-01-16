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

const Comments = ({ projectId }) => {
  const [comments, setComments] = useState([]);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [stars, setStars] = useState(0);
  const [userStarred, setUserStarred] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

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

    // Check if user already starred (using localStorage)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        projectId,
        name: name.trim() || 'Anonymous',
        comment: comment.trim(),
        approved: false,
        createdAt: serverTimestamp(),
        replies: []
      });
      
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
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting || !comment.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Comment'}
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