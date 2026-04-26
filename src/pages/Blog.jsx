import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import useVisitTracker from '../hooks/useVisitTracker';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import '../styles/blog-warm.css';

const Blog = () => {
  useVisitTracker('daily-blog');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'blogPosts'),
      where('published', '==', true),
      orderBy('publishedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const blogPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(blogPosts);
      setLoading(false);
    }, (error) => {
      console.error('Error loading blog posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="blog-page-warm">
        <div className="blog-page-inner">
          <header className="blog-page-header">
            <h1 className="blog-page-heading">Writing</h1>
            <p className="blog-page-tagline">
              Posts written daily by Scribe. Reads my GitHub commits at 5pm UTC, asks Claude
              Sonnet to write what shipped, publishes.
            </p>
          </header>

          {loading ? (
            <p className="blog-page-status">Loading posts&hellip;</p>
          ) : posts.length === 0 ? (
            <p className="blog-page-status">No posts yet. Check back tomorrow.</p>
          ) : (
            <div className="blog-page-grid">
              {posts.map((post) => (
                <Link
                  to={`/blog/${post.slug}`}
                  key={post.id}
                  className="blog-page-card"
                >
                  {post.coverImage && (
                    <div className="blog-page-card-image">
                      <img src={post.coverImage} alt="" />
                    </div>
                  )}
                  <div className="blog-page-card-body">
                    <div className="blog-page-card-meta">
                      <span className="blog-page-card-date">{formatDate(post.publishedAt)}</span>
                      {post.tags?.length > 0 && (
                        <div className="blog-page-card-tags">
                          {post.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="blog-page-card-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <h2 className="blog-page-card-title">{post.title}</h2>
                    {post.excerpt && (
                      <p className="blog-page-card-excerpt">{post.excerpt}</p>
                    )}
                    <span className="blog-page-card-cta">
                      Read post <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Blog;
