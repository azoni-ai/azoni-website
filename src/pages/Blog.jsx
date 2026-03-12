import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import useVisitTracker from '../hooks/useVisitTracker';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

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
      <section className="section blog-page">
        <div className="container">
          <div className="blog-header">
            <h1>Blog</h1>
            <p className="blog-subtitle">
              Building in public — breaking down projects, technical decisions, and lessons learned.
            </p>
          </div>

          {loading ? (
            <div className="blog-loading">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="blog-empty">
              <p>No posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="blog-grid">
              {posts.map((post) => (
                <Link to={`/blog/${post.slug}`} key={post.id} className="blog-card">
                  {post.coverImage && (
                    <div className="blog-card-image">
                      <img src={post.coverImage} alt={post.title} />
                    </div>
                  )}
                  <div className="blog-card-content">
                    <div className="blog-card-meta">
                      <span className="blog-card-date">{formatDate(post.publishedAt)}</span>
                      {post.tags?.length > 0 && (
                        <div className="blog-card-tags">
                          {post.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="blog-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <h2 className="blog-card-title">{post.title}</h2>
                    <p className="blog-card-excerpt">{post.excerpt}</p>
                    <span className="blog-card-link">Read more →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
