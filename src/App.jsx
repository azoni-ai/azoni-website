import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Chat from "./pages/Chat";
import Resume from "./pages/Resume";
import Play from "./pages/Play";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/play" element={<Play />} />
        {/* Redirects for old routes */}
        <Route path="/aboutme" element={<About />} />
      </Routes>
    </Router>
  );
};

export default App;
