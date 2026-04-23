import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
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
const Activity = lazy(() => import("./pages/Activity"));
const Commits = lazy(() => import("./pages/Commits"));

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
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/moltbook" element={<MoltbookAgent />} />
              <Route path="/game" element={<SpellBrigade />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/commits" element={<Commits />} />
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
    textAlign: 'center'
  }}>
    <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
    <p style={{ fontSize: '1.25rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
      Page not found
    </p>
    <a href="/" className="btn btn-primary">Go Home</a>
  </div>
);

export default App;