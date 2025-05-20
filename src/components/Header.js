// src/components/Header.jsx

import React from "react";
import { NavLink } from "react-router-dom";
import SocialLinks from "./SocialLinks";
import "../styles/Header.css";

const Header = () => {
  return (
    <header className="site-header">
      <nav className="navbar">
        <div className="nav-left">
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Home</NavLink>
          <NavLink to="/aboutme" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>About</NavLink>
          <NavLink to="/projects" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Projects</NavLink>
          <NavLink to="/chat" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Chat</NavLink>
          <NavLink to="/play" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Play</NavLink>
          <NavLink to="/resume" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Resume</NavLink>
          <NavLink to="/blog" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Blog</NavLink>
        </div>
        <div className="nav-right">
          <SocialLinks />
        </div>
      </nav>
    </header>
  );
};

export default Header;
