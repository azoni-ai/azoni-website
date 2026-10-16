import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import SecondaryPageLinks from '../components/SecondaryPageLinks';
import useVisitTracker from '../hooks/useVisitTracker';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getReviewedWritingEntries, isReviewedPublicPost, WRITING_PAGE_SIZE } from '../utils/publicWriting';
import '../styles/blog-warm.css';

const Blog = () => {
  useVisitTracker('daily-blog');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(WRITING_PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Fetch exact approved documents, never the unrestricted archive.
        const reviewed = await Promise.all(getReviewedWritingEntries().map(async (entry) => {
          const snapshot = await getDoc(doc(db, 'blogPosts', entry.id));
          if (!snapshot.exists()) return null;
          const post = { ...snapshot.data(), id: snapshot.id };
          return await isReviewedPublicPost(post) ? post : null;
        }));
        if (cancelled) return;
        setPosts(reviewed.filter(Boolean).sort((a, b) => b.slug.localeCompare(a.slug)));
        setLoadError(false);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading reviewed writing:', error);
        setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
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
      <Seo
        title="Writing"
        description="AI-generated build notes from Charlton Smith's public software projects, with the source and authorship made clear."
        path="/blog"
      />
      <div className="blog-page-warm secondary-page">
        <div className="blog-page-inner">
          <header className="blog-page-header">
            <p className="secondary-eyebrow">Studio / Writing</p>
            <h1 className="blog-page-heading">Writing</h1>
            <p className="blog-page-tagline">
              Selected build notes from my independent public projects. Scribe, an AI agent, turns repository activity
              into these updates. They are generated summaries, not articles written by me.
            </p>
            <SecondaryPageLinks compact />
          </header>

          {loading ? (
            <p className="blog-page-status">Loading posts&hellip;</p>
          ) : loadError ? (
            <p className="blog-page-status" role="status">The writing archive could not load. Please try again later.</p>
          ) : posts.length === 0 ? (
            <p className="blog-page-status">No reviewed build notes are available right now.</p>
          ) : (
            <div className="blog-page-grid">
              {posts.slice(0, visibleCount).map((post) => (
                <Link
                  to={`/blog/${post.slug}`}
                  key={post.id}
                  className="blog-page-card"
                >
                  {post.coverImage && (
                    <div className="blog-page-card-image">
                      <img src={post.coverImage} alt="" loading="lazy" />
                    </div>
                  )}
                  <div className="blog-page-card-body">
                    <div className="blog-page-card-meta">
                      <span className="blog-page-card-date">{formatDate(post.publishedAt)}</span>
                      <span className="blog-ai-label">AI-generated</span>
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
          {!loading && !loadError && visibleCount < posts.length && (
            <div className="writing-pagination">
              <p>Showing {Math.min(visibleCount, posts.length)} of {posts.length} notes</p>
              <button type="button" onClick={() => setVisibleCount((count) => count + WRITING_PAGE_SIZE)}>Show older notes</button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Blog;
