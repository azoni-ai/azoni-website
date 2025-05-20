// src/pages/Blog.js
import React from 'react';
import { Link } from 'react-router-dom';
import { blogPosts } from '../data/BlogData';
import "../styles/Blog.css";
import Header from "../components/Header";

const Blog = () => {
  return (
    <div className="container">
        <Header />
    <div className="blog-container">
      <h1 className="blog-title">Blog</h1>
      <div className="blog-list">
        {blogPosts.map(post => (
          <Link to={`/blog/${post.id}`} key={post.id} className="blog-card">
            <h2>{post.title}</h2>
            <p className="blog-date">{post.date}</p>
            <p>{post.summary}</p>
          </Link>
        ))}
      </div>
    </div>
    </div>
  );
};

export default Blog;


