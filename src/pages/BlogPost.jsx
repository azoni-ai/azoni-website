import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import SecondaryPageLinks from '../components/SecondaryPageLinks';
import '../styles/blog-post-warm.css';
import { fetchBuildNote, formatNoteDate, isRetiredPostSlug, noteLabel, repositoryProject } from '../utils/publicWriting';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPost(null);
    setNotFound(false);
    setLoadError(false);
    if (isRetiredPostSlug(slug)) return undefined;
    fetchBuildNote(slug)
      .then((note) => {
        if (cancelled) return;
        if (note) setPost(note);
        else setNotFound(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching build note:', error);
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  // Simple markdown-like rendering
  const renderContent = (content) => {
    if (!content) return null;
    
    // Split by double newlines for paragraphs
    const blocks = content.split(/\n\n+/);
    
    return blocks.map((block, index) => {
      // Headers
      if (block.startsWith('### ')) {
        return <h3 key={index}>{block.slice(4)}</h3>;
      }
      if (block.startsWith('## ')) {
        return <h2 key={index}>{block.slice(3)}</h2>;
      }
      if (block.startsWith('# ')) {
        return <h2 key={index}>{block.slice(2)}</h2>;
      }
      
      // Code blocks
      if (block.startsWith('```')) {
        const lines = block.split('\n');
        const lang = lines[0].slice(3);
        const code = lines.slice(1, -1).join('\n');
        return (
          <pre key={index} className="code-block">
            <code className={lang ? `language-${lang}` : ''}>{code}</code>
          </pre>
        );
      }
      
      // Images: ![alt](url)
      const imgMatch = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        return (
          <figure key={index} className="blog-figure">
            <img src={imgMatch[2]} alt={imgMatch[1]} />
            {imgMatch[1] && <figcaption>{imgMatch[1]}</figcaption>}
          </figure>
        );
      }
      
      // Bullet lists
      if (block.match(/^[-*] /m)) {
        const items = block.split(/\n/).filter(line => line.match(/^[-*] /));
        return (
          <ul key={index}>
            {items.map((item, i) => (
              <li key={i}>{renderInline(item.slice(2))}</li>
            ))}
          </ul>
        );
      }
      
      // Regular paragraph
      return <p key={index}>{renderInline(block)}</p>;
    });
  };

  // Inline formatting (bold, italic, code, links)
  const renderInline = (text) => {
    // This is a simple implementation - could be enhanced
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      // Italic: *text*
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
      // Inline code: `code`
      const codeMatch = remaining.match(/`([^`]+)`/);
      // Links: [text](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

      const matches = [
        boldMatch && { type: 'bold', match: boldMatch, index: boldMatch.index },
        italicMatch && { type: 'italic', match: italicMatch, index: italicMatch.index },
        codeMatch && { type: 'code', match: codeMatch, index: codeMatch.index },
        linkMatch && { type: 'link', match: linkMatch, index: linkMatch.index },
      ].filter(Boolean);

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      // Find earliest match
      const earliest = matches.reduce((a, b) => a.index < b.index ? a : b);
      
      // Add text before match
      if (earliest.index > 0) {
        parts.push(remaining.slice(0, earliest.index));
      }

      // Add formatted element
      if (earliest.type === 'bold') {
        parts.push(<strong key={key++}>{earliest.match[1]}</strong>);
      } else if (earliest.type === 'italic') {
        parts.push(<em key={key++}>{earliest.match[1]}</em>);
      } else if (earliest.type === 'code') {
        parts.push(<code key={key++}>{earliest.match[1]}</code>);
      } else if (earliest.type === 'link' && /^(https?:\/\/|\/(?![/\\]))/i.test(earliest.match[2])) {
        parts.push(
          <a key={key++} href={earliest.match[2]} target="_blank" rel="noopener noreferrer">
            {earliest.match[1]}
          </a>
        );
      } else if (earliest.type === 'link') {
        parts.push(earliest.match[1]);
      }

      remaining = remaining.slice(earliest.index + earliest.match[0].length);
    }

    return parts;
  };

  // The two retired persona posts: their URLs redirect to /blog at the edge
  // too (public/_redirects); this covers in-app navigation.
  if (isRetiredPostSlug(slug)) return <Navigate to="/blog" replace />;

  if (loading) {
    return (
      <Layout>
        <Seo title="Build notes" path={`/blog/${slug}`} noIndex />
        <section className="section blog-post-page blog-post-page-warm secondary-page">
          <div className="container">
            <div className="blog-loading">Loading...</div>
          </div>
        </section>
      </Layout>
    );
  }

  if (notFound || loadError) {
    return (
      <Layout>
        <Seo title="Build note unavailable" path="/blog" noIndex />
        <section className="section blog-post-page blog-post-page-warm secondary-page">
          <div className="container">
            <div className="blog-not-found">
              <h1>{loadError ? 'This note could not load' : 'This note is not published'}</h1>
              <p>{loadError ? 'Please try again later, or browse the other build notes.' : 'It may have been held back by the publishing check, or the link is out of date.'}</p>
              <Link to="/blog" className="btn btn-primary">All build notes</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Automated notes stay out of search results; /blog itself is indexed. */}
      <Seo
        title={post.title}
        description={post.excerpt || undefined}
        path={`/blog/${slug}`}
        noIndex
      />
      <article className="section blog-post-page blog-post-page-warm secondary-page">
        <div className="container">
          <Link to="/blog" className="blog-back-link">← All build notes</Link>

          <header className="blog-post-header">
            <div className="blog-post-meta">
              <span className="blog-post-date">Commits from {formatNoteDate(post)}</span>
              <span className="blog-ai-label">{noteLabel(post)}</span>
              {post.tags?.length > 0 && (
                <div className="blog-post-tags">
                  {post.tags.map(tag => (
                    <span key={tag} className="blog-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <h1 className="blog-post-title">{post.title}</h1>
            {post.excerpt && (
              <p className="blog-post-excerpt">{post.excerpt}</p>
            )}
            <p className="secondary-notice">
              {post.generator === 'model'
                ? 'A language model wrote this note’s title and summaries from the day’s public commits.'
                : post.generator === 'template'
                  ? 'This note lists the day’s public commits as they were written.'
                  : 'This note was generated automatically from the day’s public commits.'}
              {' '}It passed an automated check before it was published.
              {' '}I don&rsquo;t write or edit these notes. The commit links are the record.
            </p>
          </header>

          {post.coverImage && (
            <div className="blog-post-cover">
              <img src={post.coverImage} alt="" />
            </div>
          )}

          <div className="blog-post-content">
            {renderContent(post.content)}
          </div>

          {post.sourceRepos?.length > 0 && (
            <div className="blog-post-related">
              <h3>Sources</h3>
              <ul className="blog-post-sources">
                {post.sourceRepos.map((repo) => {
                  const project = repositoryProject(repo);
                  return (
                    <li key={repo}>
                      <a href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer">{repo}</a>
                      {project && <Link to={project.path}>{project.title}</Link>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <SecondaryPageLinks />
        </div>
      </article>
    </Layout>
  );
};

export default BlogPost;
