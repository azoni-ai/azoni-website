import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import '../styles/about.css';

const About = () => {
  return (
    <Layout>
      <section className="about-page">
        <div className="container about-container">

          {/* Hero: Photo + Intro */}
          <div className="about-hero">
            <div className="about-photo-wrap">
              <img 
                src="/images/charlton.jpg" 
                alt="Charlton Smith" 
                className="about-photo"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="about-intro">
              <h1>Charlton Smith</h1>
              <p className="about-role">Software Engineer · Seattle, WA</p>
              <p className="about-summary">
                I build apps that people actually use, ship updates constantly, and 
                let AI handle the parts that should be automated. Currently building an 
                ecosystem of AI agents that write blog posts, generate game characters, 
                coach workouts, and keep this entire portfolio running.
              </p>
              <div className="about-links">
                <a href="mailto:charltonuw@gmail.com" className="about-link-btn about-link-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>
                  charltonuw@gmail.com
                </a>
                <a href="https://linkedin.com/in/charltonsmith" target="_blank" rel="noopener noreferrer" className="about-link-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  LinkedIn
                </a>
                <a href="https://github.com/azoni" target="_blank" rel="noopener noreferrer" className="about-link-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>
                  GitHub
                </a>
              </div>
            </div>
          </div>

          {/* Background */}
          <div className="about-section">
            <h2>Background</h2>
            <div className="about-text">
              <p>
                I started programming in college at the University of Washington, where I co-founded a 
                computer vision startup called OLI Fitness that used Microsoft Kinect to analyze 
                weightlifting form in real-time. We published at ACM CHI, competed at Princeton's Tiger 
                Launch, and ran the company until funding ran out.
              </p>
              <p>
                After graduating I spent four years at T-Mobile building an internal automation platform 
                that consolidated 4-5 separate tools into one interface, cutting manual work for network 
                ops teams by over 80%. I moved to Capital One as a Senior Software Engineer, where I 
                designed a JSON schema system for automated testing that let teams add test cases without 
                writing code.
              </p>
              <p>
                On the side, I built Dustbunny, a fully autonomous NFT bidding system that tracked every 
                collection on OpenSea across 50 machines at 2,500+ requests per minute. It was a constant 
                arms race against API changes and competing bots, and it ran profitably for six months.
              </p>
              <p>
                Now I'm focused on AI-powered applications. I've built a fitness app with AI workout 
                generation, a multiplayer wizard game with AI character creation, a unified embedding 
                API, and the agent system that runs this portfolio. The common thread is shipping things 
                that real people use and iterating on feedback.
              </p>
            </div>
          </div>

          {/* What I'm Building */}
          <div className="about-section">
            <h2>What I'm Building Now</h2>
            <div className="about-cards">
              <div className="about-card">
                <div className="about-card-accent" style={{ background: '#4ade80' }} />
                <div className="about-card-body">
                  <h3>BenchPressOnly</h3>
                  <p>Fitness tracking app with AI-powered workout generation, progress analysis, and coaching. Real users logging real workouts daily.</p>
                </div>
              </div>
              <div className="about-card">
                <div className="about-card-accent" style={{ background: '#ffd93d' }} />
                <div className="about-card-body">
                  <h3>Spell Brigade</h3>
                  <p>Multiplayer wizard survival game. AI generates unique character classes from player descriptions with custom abilities and lore.</p>
                </div>
              </div>
              <div className="about-card">
                <div className="about-card-accent" style={{ background: '#3b82f6' }} />
                <div className="about-card-body">
                  <h3>Azoni AI</h3>
                  <p>Multi-agent system that orchestrates this portfolio. Blog writer, social agent, fitness agent, gaming agent, and a RAG chatbot that improves itself over time.</p>
                </div>
              </div>
              <div className="about-card">
                <div className="about-card-accent" style={{ background: '#22d3ee' }} />
                <div className="about-card-body">
                  <h3>EmbedRoute</h3>
                  <p>Unified embedding API. One endpoint routes to OpenAI, Cohere, Voyage, and more. Powers RAG and semantic search across all my apps.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="about-section">
            <h2>Skills</h2>
            <div className="about-skill-groups">
              <div className="about-skill-group">
                <h3>Languages</h3>
                <div className="about-skills">
                  <span className="about-skill">JavaScript</span>
                  <span className="about-skill">Python</span>
                  <span className="about-skill">TypeScript</span>
                  <span className="about-skill">C#</span>
                  <span className="about-skill">SQL</span>
                </div>
              </div>
              <div className="about-skill-group">
                <h3>Frontend</h3>
                <div className="about-skills">
                  <span className="about-skill">React</span>
                  <span className="about-skill">Angular</span>
                  <span className="about-skill">Three.js</span>
                  <span className="about-skill">CSS / Tailwind</span>
                </div>
              </div>
              <div className="about-skill-group">
                <h3>Backend & Infra</h3>
                <div className="about-skills">
                  <span className="about-skill">Node.js</span>
                  <span className="about-skill">Django</span>
                  <span className="about-skill">Firebase</span>
                  <span className="about-skill">AWS Lambda</span>
                  <span className="about-skill">PostgreSQL</span>
                  <span className="about-skill">Redis</span>
                  <span className="about-skill">Docker</span>
                  <span className="about-skill">Netlify</span>
                </div>
              </div>
              <div className="about-skill-group">
                <h3>AI & ML</h3>
                <div className="about-skills">
                  <span className="about-skill">OpenAI / GPT-4o</span>
                  <span className="about-skill">Claude / Anthropic</span>
                  <span className="about-skill">RAG</span>
                  <span className="about-skill">Embeddings</span>
                  <span className="about-skill">LangGraph</span>
                  <span className="about-skill">MCP</span>
                  <span className="about-skill">Computer Vision</span>
                </div>
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="about-section">
            <h2>Education</h2>
            <div className="about-timeline">
              <div className="about-timeline-item">
                <div className="about-timeline-dot" />
                <div className="about-timeline-content">
                  <h3>M.S. Software Engineering</h3>
                  <p className="about-timeline-meta">Colorado Technical University · 2021</p>
                  <p>Completed while working full-time at T-Mobile.</p>
                </div>
              </div>
              <div className="about-timeline-item">
                <div className="about-timeline-dot" />
                <div className="about-timeline-content">
                  <h3>B.S. Computer Science</h3>
                  <p className="about-timeline-meta">University of Washington Tacoma · 2017</p>
                  <p>Graduated with honors. Co-founded OLI Fitness during senior year. Published at ACM CHI 2017.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chat CTA */}
          <div className="about-cta">
            <div className="about-cta-inner">
              <div className="about-cta-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <div className="about-cta-text">
                <h3>Want to know more?</h3>
                <p>Ask Azoni AI anything about my background, skills, or projects. Paste a job description and it will analyze how my experience fits the role.</p>
              </div>
              <Link to="/chat" className="about-cta-btn">
                Talk to Azoni AI
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>

        </div>
      </section>
    </Layout>
  );
};

export default About;