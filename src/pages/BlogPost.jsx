import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import '../styles/blog-post-warm.css';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const q = query(
          collection(db, 'blogPosts'),
          where('slug', '==', slug),
          where('published', '==', true)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setNotFound(true);
        } else {
          setPost({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setNotFound(true);
      }
      setLoading(false);
    };

    fetchPost();
  }, [slug]);

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

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
        return <h1 key={index}>{block.slice(2)}</h1>;
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
      } else if (earliest.type === 'link') {
        parts.push(
          <a key={key++} href={earliest.match[2]} target="_blank" rel="noopener noreferrer">
            {earliest.match[1]}
          </a>
        );
      }

      remaining = remaining.slice(earliest.index + earliest.match[0].length);
    }

    return parts;
  };

  if (loading) {
    return (
      <Layout>
        <section className="section blog-post-page blog-post-page-warm">
          <div className="container">
            <div className="blog-loading">Loading...</div>
          </div>
        </section>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <section className="section blog-post-page blog-post-page-warm">
          <div className="container">
            <div className="blog-not-found">
              <h1>Post not found</h1>
              <p>The post you're looking for doesn't exist or has been removed.</p>
              <Link to="/blog" className="btn btn-primary">Back to Blog</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Seo
        title={post.title}
        description={post.excerpt || undefined}
        path={`/blog/${slug}`}
      />
      <article className="section blog-post-page blog-post-page-warm">
        <div className="container">
          <Link to="/blog" className="blog-back-link">← Back to Blog</Link>
          
          <header className="blog-post-header">
            <div className="blog-post-meta">
              <span className="blog-post-date">{formatDate(post.publishedAt)}</span>
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
          </header>

          {post.coverImage && (
            <div className="blog-post-cover">
              <img src={post.coverImage} alt={post.title} />
            </div>
          )}

          <div className="blog-post-content">
            {renderContent(post.content)}
          </div>

          {post.relatedProject && (
            <div className="blog-post-related">
              <h3>Related Project</h3>
              <Link to={`/projects/${post.relatedProject}`} className="btn btn-secondary">
                View Project →
              </Link>
            </div>
          )}
        </div>
      </article>
    </Layout>
  );
};

export default BlogPost;
