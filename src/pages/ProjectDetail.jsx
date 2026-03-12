import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Comments from '../components/Comments';
import { useProjects } from '../hooks/useProjects';
import useVisitTracker from '../hooks/useVisitTracker';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot, increment } from 'firebase/firestore';

const StarButton = ({ projectId }) => {
  const [stars, setStars] = useState(0);
  const [userStarred, setUserStarred] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const starDocRef = doc(db, 'stars', projectId);
    const unsubscribe = onSnapshot(starDocRef, (doc) => {
      if (doc.exists()) setStars(doc.data().count || 0);
    });
    const starred = localStorage.getItem(`starred_${projectId}`);
    if (starred) setUserStarred(true);
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

  return (
    <button 
      className={`star-button ${userStarred ? 'starred' : ''}`}
      onClick={handleStar}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={userStarred}
    >
      <span className="star-icon">{userStarred || hovered ? '★' : '☆'}</span>
      <span className="star-count">{stars}</span>
    </button>
  );
};

const ProjectDetail = () => {
  const { id } = useParams();
  useVisitTracker(id);
  const { getProject, loading } = useProjects();
  const project = getProject(id);

  if (loading) {
    return (
      <Layout>
        <section className="section" style={{ paddingTop: '120px', textAlign: 'center' }}>
          <div className="container">
            <p style={{ color: 'var(--text-secondary)' }}>Loading project...</p>
          </div>
        </section>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <section className="section" style={{ paddingTop: '120px', textAlign: 'center' }}>
          <div className="container">
            <h1>Project Not Found</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-md)' }}>
              The project you're looking for doesn't exist.
            </p>
            <Link to="/projects" className="btn btn-secondary" style={{ marginTop: 'var(--space-xl)' }}>
              ← Back to Projects
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container container-narrow">
          {/* Back Link */}
          <Link 
            to="/projects" 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-xl)',
              fontSize: '0.9rem'
            }}
          >
            ← Back to Projects
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <p style={{ 
              color: 'var(--accent-primary)', 
              marginBottom: 'var(--space-sm)',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              {project.tagline}
            </p>
            
            {/* Title with Star */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0 }}>{project.title}</h1>
              <StarButton projectId={id} />
            </div>
            
            <div className="tags" style={{ marginBottom: 'var(--space-xl)' }}>
              {project.tech.map((tech) => (
                <span key={tech} className="tag">{tech}</span>
              ))}
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {project.links.live && (
                <a 
                  href={project.links.live} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  View Live →
                </a>
              )}
              {project.links.github && (
                <a 
                  href={project.links.github} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  View Code
                </a>
              )}
              {project.links.paper && (
                <a 
                  href={project.links.paper} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  Read Paper
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Overview</h2>
            <div style={{ 
              color: 'var(--text-secondary)', 
              lineHeight: 1.8,
              whiteSpace: 'pre-line'
            }}>
              {project.longDescription}
            </div>
          </div>

          {/* Highlights */}
          {project.highlights && project.highlights.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Key Features</h2>
              <ul style={{ 
                color: 'var(--text-secondary)',
                paddingLeft: 'var(--space-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)'
              }}>
                {project.highlights.map((highlight, index) => (
                  <li key={index}>{highlight}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Comments Section */}
          <div className="card">
            <Comments projectId={id} />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProjectDetail;