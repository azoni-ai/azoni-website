import React from 'react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { profile } from '../data/profile';
import '../styles/about-warm.css';

// Short, factual privacy page. Everything here must stay true to how the site
// actually works (chat logging, visit counts) — update it if that changes.

const Privacy = () => {
  return (
    <Layout>
      <Seo
        title="Privacy"
        description="What this site records and what it does with it."
        path="/privacy"
      />
      <div className="about-page">
        <div className="about-inner">
          <header className="about-hero">
            <p className="about-eyebrow">
              <span className="about-mark" aria-hidden="true" />
              Privacy
            </p>
            <h1 className="about-title">What this site records.</h1>
            <p className="about-lede">
              The short version: chat conversations are logged, page visits are counted
              anonymously, and nothing is sold or shared.
            </p>
          </header>

          <section className="about-section">
            <h2 className="about-h2">Chat</h2>
            <div className="about-prose">
              <p>
                Conversations with the chatbot are logged, including your messages and the answers
                you get. I use them to review answer quality, fix gaps in the knowledge base, and
                track usage costs. Don&rsquo;t paste anything into the chat you wouldn&rsquo;t want
                kept; there&rsquo;s no account, so logs aren&rsquo;t tied to a name unless you type
                one.
              </p>
            </div>
          </section>

          <section className="about-section">
            <h2 className="about-h2">Visits</h2>
            <div className="about-prose">
              <p>
                Pages record anonymous visit counts so the traffic numbers on this site are real.
                There are no ads, no third-party trackers, and no cross-site anything.
              </p>
            </div>
          </section>

          <section className="about-section">
            <h2 className="about-h2">Questions</h2>
            <div className="about-prose">
              <p>
                This site is run by Azoni LLC. If you want a chat conversation removed or have a
                question about any of this, email{' '}
                <a href={`mailto:${profile.email}`}>{profile.email}</a>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;
