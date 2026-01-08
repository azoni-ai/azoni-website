import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Loading from "./components/Loading";

// Lazy load pages for code splitting
// This creates separate bundles for each page, improving initial load time
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Chat = lazy(() => import("./pages/Chat"));
const Resume = lazy(() => import("./pages/Resume"));

/**
 * Main App component demonstrating:
 * - React.lazy() for code splitting
 * - Suspense for loading states
 * - Error Boundaries for error handling
 * - Context Provider for global state
 */
const App = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <Suspense fallback={<Loading fullScreen message="Loading..." />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/resume" element={<Resume />} />
              
              {/* Redirects for old routes */}
              <Route path="/aboutme" element={<About />} />
              
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
