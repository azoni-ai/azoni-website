import React from 'react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import SecondaryPageLinks from '../components/SecondaryPageLinks';
import { profile } from '../data/profile';

const Privacy = () => (
  <Layout>
    <Seo
      title="Privacy"
      description="How Charlton Smith's website handles assistant conversations, visit counts, and project inquiries."
      path="/privacy"
    />
    <div className="privacy-page secondary-page">
      <div className="privacy-inner">
        <header className="privacy-header">
          <p className="secondary-eyebrow">Site information</p>
          <h1>Privacy</h1>
          <p>This site counts visits and saves assistant conversations to improve the service. Here is what that means when you use it.</p>
        </header>

        <section className="privacy-section">
          <h2>Assistant conversations</h2>
          <p>Your messages, the assistant&rsquo;s replies, and technical details such as model usage and response times are stored in Firebase. I use these records to review answer quality, troubleshoot problems, and understand costs. The chat uses a temporary browser-tab identifier to group a conversation; it does not require an account.</p>
        </section>

        <section className="privacy-section">
          <h2>AI and hosting services</h2>
          <p>Messages are processed by the services that power the assistant, including OpenRouter and the selected model provider. Netlify hosts the site and its server functions. Avoid sharing confidential client information, credentials, or sensitive personal information in the assistant. Email is the better starting point for discussing a project.</p>
        </section>

        <section className="privacy-section">
          <h2>Visit counts and browser storage</h2>
          <p>The visit counter records a site name and timestamp, not your name or email address. Browser-tab storage helps avoid counting every page navigation as a new visit and keeps assistant turns together. Site preferences may also be saved in your browser. Hosting and service providers may process standard request information to operate their services.</p>
        </section>

        <section className="privacy-section">
          <h2>Project inquiries and requests</h2>
          <p>This site is operated by Charlton Smith through Azoni LLC. Email links open your own email app; your inquiry is then handled through email. To ask about data recorded by this site or request removal of an assistant conversation, contact <a href={'mailto:' + profile.email}>{profile.email}</a>. The approximate date and conversation topic can help locate it.</p>
        </section>

        <SecondaryPageLinks />
      </div>
    </div>
  </Layout>
);

export default Privacy;
