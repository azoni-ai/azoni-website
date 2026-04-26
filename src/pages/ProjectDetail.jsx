import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Comments from '../components/Comments';
import { useProjects } from '../hooks/useProjects';
import useVisitTracker from '../hooks/useVisitTracker';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot, increment } from 'firebase/firestore';
import '../styles/project-detail-warm.css';

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
        <div className="project-detail-page">
          <div className="project-detail-inner">
            <p className="project-detail-status">Loading project&hellip;</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="project-detail-page">
          <div className="project-detail-inner project-detail-inner--centered">
            <h1 className="project-detail-title">Project not found.</h1>
            <p className="project-detail-status">
              The project you&rsquo;re looking for doesn&rsquo;t exist.
            </p>
            <Link to="/projects" className="project-detail-cta">
              <span aria-hidden="true">←</span> Back to projects
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="project-detail-page">
        <div className="project-detail-inner">
          <div className="project-detail-nav">
            <Link to="/projects" className="project-detail-back">
              <span aria-hidden="true">←</span> All projects
            </Link>
            {allProjects.length > 0 && (
              <span className="project-detail-counter">
                {String(currentIndex + 1).padStart(2, '0')} / {String(allProjects.length).padStart(2, '0')}
              </span>
            )}
          </div>

          <header className="project-detail-header">
            <p className="project-detail-eyebrow">{project.tagline}</p>
            <div className="project-detail-titlerow">
              <h1 className="project-detail-title">{project.title}</h1>
              <StarButton projectId={id} />
            </div>

            <ul className="project-detail-tech" aria-label="Tech stack">
              {project.tech.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>

            <div className="project-detail-actions">
              {project.links.live && (
                <a
                  href={project.links.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-detail-cta project-detail-cta--primary"
                >
                  View live <span aria-hidden="true">↗</span>
                </a>
              )}
              {project.links.github && (
                <a
                  href={project.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-detail-cta"
                >
                  View code <span aria-hidden="true">↗</span>
                </a>
              )}
              {project.links.paper && (
                <a
                  href={project.links.paper}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-detail-cta"
                >
                  Read paper <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </header>

          <section className="project-detail-block">
            <h2 className="project-detail-block-heading">Overview</h2>
            <div className="project-detail-prose">
              {project.longDescription}
            </div>
          </section>

          {project.highlights?.length > 0 && (
            <section className="project-detail-block">
              <h2 className="project-detail-block-heading">Key features</h2>
              <ul className="project-detail-highlights">
                {project.highlights.map((highlight, index) => (
                  <li key={index}>{highlight}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="project-detail-block project-detail-comments">
            <Comments projectId={id} />
          </section>

          <nav className="project-detail-footer-nav" aria-label="Project navigation">
            {prevProject ? (
              <Link to={`/projects/${prevProject.id}`} className="project-detail-foot-link project-detail-foot-link--prev">
                <span className="project-detail-foot-dir">← Previous</span>
                <span className="project-detail-foot-name">{prevProject.title}</span>
              </Link>
            ) : <div />}
            {nextProject ? (
              <Link to={`/projects/${nextProject.id}`} className="project-detail-foot-link project-detail-foot-link--next">
                <span className="project-detail-foot-dir">Next →</span>
                <span className="project-detail-foot-name">{nextProject.title}</span>
              </Link>
            ) : <div />}
          </nav>
        </div>
      </div>
    </Layout>
  );
};

export default ProjectDetail;
