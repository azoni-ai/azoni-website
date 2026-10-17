import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Loading from "./components/Loading";
import ScrollToTop from "./components/ScrollToTop";
import Layout from "./components/Layout";
import Seo from "./components/Seo";
import FloatingAssistant from "./components/FloatingAssistant";
import { Link } from "react-router-dom";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
// SpellBrigade is a ~15k-line game engine; keep it out of the main bundle so the
// consulting pages don't pay to parse it. Only /game pulls the chunk.
const SpellBrigade = lazy(() => import("./components/SpellBrigade"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Chat = lazy(() => import("./pages/Chat"));
const Resume = lazy(() => import("./pages/Resume"));
const Admin = lazy(() => import("./pages/Admin"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const AiTools = lazy(() => import("./pages/AiTools"));
const AiToolDetail = lazy(() => import("./pages/AiToolDetail"));
const MoltbookAgent = lazy(() => import("./pages/MoltbookAgent"));
const Board = lazy(() => import("./pages/Board"));
const Live = lazy(() => import("./pages/Live"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));

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
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/aboutme" element={<Navigate to="/about" replace />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/ai-tools" element={<AiTools />} />
              <Route path="/ai-tools/:slug" element={<AiToolDetail />} />
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
          <FloatingAssistant />
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
};

const NotFound = () => (
  <Layout><Seo title="Page not found" noIndex />
    <div className="consult-page consult-container" style={{ minHeight: '70vh', paddingBottom: 80 }}>
      <p className="consult-eyebrow">404</p><h1>Page not found.</h1>
      <p style={{ margin: '24px 0', color: 'var(--text-warm-soft)' }}>This page may have moved. Explore my services or return home.</p>
      <div className="consult-actions"><Link className="consult-button" to="/">Back to home</Link><Link className="consult-text-link" to="/services">Explore services</Link></div>
    </div>
  </Layout>
);
export default App;
