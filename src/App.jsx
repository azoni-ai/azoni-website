import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Loading from "./components/Loading";
import ScrollToTop from "./components/ScrollToTop";
import SpellBrigade from "./components/SpellBrigade";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Chat = lazy(() => import("./pages/Chat"));
const Resume = lazy(() => import("./pages/Resume"));
const Admin = lazy(() => import("./pages/Admin"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const MoltbookAgent = lazy(() => import("./pages/MoltbookAgent"));
const Board = lazy(() => import("./pages/Board"));
const Live = lazy(() => import("./pages/Live"));

const App = () => {
  useEffect(() => {
    if (!sessionStorage.getItem('_av')) {
      sessionStorage.setItem('_av', '1');
      fetch('/.netlify/functions/log-visit', { method: 'POST' }).catch(() => {});
    }
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <ScrollToTop />
          <Suspense fallback={<Loading fullScreen message="Loading..." />}>
            <Routes>
              <Route path="/" element={<Home />} />
              {/* Old /about page was folded into the home; keep redirect for old SEO links */}
              <Route path="/about" element={<Navigate to="/" replace />} />
              <Route path="/aboutme" element={<Navigate to="/" replace />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/moltbook" element={<MoltbookAgent />} />
              <Route path="/game" element={<SpellBrigade />} />
              <Route path="/live" element={<Live />} />
              {/* Consolidated into /live; keep redirects for old links + SEO */}
              <Route path="/activity" element={<Navigate to="/live?view=activity" replace />} />
              <Route path="/commits" element={<Navigate to="/live?view=commits" replace />} />
              <Route path="/leaderboard" element={<Navigate to="/live?view=traffic" replace />} />
              {/* Board kanban stays; Hub retired into the live project cards */}
              <Route path="/board" element={<Board />} />
              <Route path="/hub" element={<Navigate to="/projects" replace />} />
              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
};

// Simple 404 component
const NotFound = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center',
    background: 'var(--bg-warm, var(--bg-primary))',
    color: 'var(--text-warm, var(--text-primary))',
  }}>
    <p style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.72rem',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'var(--accent-coral)',
      margin: '0 0 1rem',
    }}>
      404
    </p>
    <h1 style={{
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 'clamp(2.5rem, 6vw, 4rem)',
      letterSpacing: '-0.02em',
      lineHeight: 1.05,
      margin: '0 0 1rem',
    }}>
      Page not found.
    </h1>
    <p style={{
      fontSize: '1.05rem',
      color: 'var(--text-warm-soft, var(--text-secondary))',
      marginBottom: '2rem',
      maxWidth: '40ch',
    }}>
      The link you followed has moved or never existed.
    </p>
    <a
      href="/"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 18px',
        background: 'var(--accent-coral)',
        border: '1px solid var(--accent-coral)',
        borderRadius: '999px',
        color: '#18110e',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        textDecoration: 'none',
      }}
    >
      Back to home
    </a>
  </div>
);

export default App;