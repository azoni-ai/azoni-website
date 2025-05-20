// src/pages/BlogPost.js
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogPosts } from '../data/BlogData';
import Header from "../components/Header";
import ReactMarkdown from 'react-markdown';

import "../styles/Blog.css";

const BlogPost = () => {
  const { id } = useParams();
  const post = blogPosts.find(p => p.id === id) || {
    title: "Not a valid blog path!",
    date: "Never",
    content: "Nothing here."
  };

  return (
    <div className="container">
        <Header />
        <div className="blog-container">
        <Link to="/blog">← Back to Blog</Link>
        <h1>{post.title}</h1>
        <p className="blog-date">{post.date}</p>
        <ReactMarkdown>{post.content.trim()}</ReactMarkdown>
        </div>
    </div>
  );
};

export default BlogPost;
