import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import SecondaryPageLinks from '../components/SecondaryPageLinks';
import useVisitTracker from '../hooks/useVisitTracker';
import { fetchBuildNotes, formatNoteDate, noteLabel, noteProducts, WRITING_PAGE_SIZE } from '../utils/publicWriting';
import '../styles/blog-warm.css';

const Blog = () => {
  useVisitTracker('daily-blog');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(WRITING_PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    fetchBuildNotes()
      .then((list) => {
        if (cancelled) return;
        setPosts(list);
        setLoadError(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error loading build notes:', error);
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout>
      <Seo
        title="Build notes"
        description="Automated build notes, generated each day from public commits in Charlton Smith's own software projects. A language model writes the summaries, and every note links to its commits."
        path="/blog"
      />
      <div className="blog-page-warm secondary-page">
        <div className="blog-page-inner">
          <header className="blog-page-header">
            <p className="secondary-eyebrow">Automated</p>
            <h1 className="blog-page-heading">Build notes</h1>
            <p className="blog-page-tagline">
              These notes are generated each day from public commits in my own projects. A script collects the
              day&rsquo;s commits from my public repositories, and a language model writes the title and a short summary
              for each project. An automated check runs before anything is published, every note links to the commits it
              describes, and I don&rsquo;t write or edit them.
            </p>
            <SecondaryPageLinks compact />
          </header>

          {loading ? (
            <p className="blog-page-status">Loading build notes&hellip;</p>
          ) : loadError ? (
            <p className="blog-page-status" role="status">The build notes could not load. Please try again later.</p>
          ) : posts.length === 0 ? (
            <p className="blog-page-status">No build notes have been published yet.</p>
          ) : (
            <div className="blog-page-grid">
              {posts.slice(0, visibleCount).map((post) => (
                <Link to={`/blog/${post.slug}`} key={post.slug} className="blog-page-card">
                  <div className="blog-page-card-body">
                    <div className="blog-page-card-meta">
                      <span className="blog-page-card-date">{formatNoteDate(post)}</span>
                      <span className="blog-ai-label">{noteLabel(post)}</span>
                      {noteProducts(post).length > 0 && (
                        <span className="blog-page-card-products">{noteProducts(post).join(', ')}</span>
                      )}
                    </div>
                    <h2 className="blog-page-card-title">{post.title}</h2>
                    {post.excerpt && <p className="blog-page-card-excerpt">{post.excerpt}</p>}
                    <span className="blog-page-card-cta">
                      Read note <span aria-hidden="true">→</span>
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
