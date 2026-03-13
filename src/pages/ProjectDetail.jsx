import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  useVisitTracker(id);
  const { getProject, allProjects, loading } = useProjects();
  const project = getProject(id);

  // Prev/next navigation
  const currentIndex = allProjects.findIndex(p => p.id === id);
  const prevProject = currentIndex > 0 ? allProjects[currentIndex - 1] : null;
  const nextProject = currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : null;

  // Scroll to top on project change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Keyboard navigation (left/right arrows)
  const prevRef = useRef(prevProject);
  const nextRef = useRef(nextProject);
  prevRef.current = prevProject;
  nextRef.current = nextProject;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft' && prevRef.current) {
        navigate(`/projects/${prevRef.current.id}`);
      } else if (e.key === 'ArrowRight' && nextRef.current) {
        navigate(`/projects/${nextRef.current.id}`);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);

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
          {/* Top navigation */}
          <div className="project-nav">
            <Link to="/projects" className="project-nav-back">← All Projects</Link>
            {allProjects.length > 0 && (
              <span className="project-nav-counter">{currentIndex + 1} / {allProjects.length}</span>
            )}
          </div>

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

          {/* Prev/Next Navigation */}
          <div className="project-nav-footer">
            {prevProject ? (
              <Link to={`/projects/${prevProject.id}`} className="project-nav-link project-nav-prev">
                <span className="project-nav-dir">← Previous</span>
                <span className="project-nav-name">{prevProject.title}</span>
              </Link>
            ) : <div />}
            {nextProject ? (
              <Link to={`/projects/${nextProject.id}`} className="project-nav-link project-nav-next">
                <span className="project-nav-dir">Next →</span>
                <span className="project-nav-name">{nextProject.title}</span>
              </Link>
            ) : <div />}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProjectDetail;
