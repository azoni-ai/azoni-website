import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import Documentation from "./pages/Documentation";
import AboutMe from "./pages/AboutMe";
import ChatWithGPT from "./pages/ChatWithGPT";
import ResumeViewer from "./components/ResumeViewer";
import GameCanvas from "./components/GameCanvas";
import ProjectDetail from "./pages/ProjectDetail";
import Blog from "./components/Blog";
import BlogPost from './components/BlogPost';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/aboutme" element={<AboutMe />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/chat" element={<ChatWithGPT />} />
        <Route path="/play" element={<GameCanvas />} />
        <Route path="/resume" element={<ResumeViewer />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/projects/:slug" element={<ProjectDetail />} />
      </Routes>
    </Router>
  );
};

export default App;
