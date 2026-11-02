import React from 'react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import SecondaryPageLinks from '../components/SecondaryPageLinks';
import { profile } from '../data/profile';

// Each section describes what the code does today (netlify/functions/meet.js,
// chat-core.js, client-error.js, log-visit.js and the Spell Brigade client).
// Update this page and LAST_UPDATED when one of those flows changes.
const LAST_UPDATED = '2026-11-02';

const Privacy = () => (
  <Layout>
    <Seo
      title="Privacy"
      description="How Charlton Smith's website handles call bookings, assistant conversations, error reports, game accounts and visit counts."
      path="/privacy"
    />
    <div className="privacy-page secondary-page">
      <div className="privacy-inner">
        <header className="privacy-header">
          <p className="secondary-eyebrow">Site information</p>
          <h1>Privacy</h1>
          <p>This page explains what this site records when you book a call, talk to the assistant, play Spell Brigade or just visit, and who else handles that information. Last updated <time dateTime={LAST_UPDATED}>{LAST_UPDATED}</time>.</p>
        </header>

        <section className="privacy-section">
          <h2>Booking a call</h2>
          <p>The booking form asks for your name and email address, and optionally your company, a meeting link or phone number, and notes. When you book, the site creates a 30-minute event on my Google Calendar with your name and company in the title and your notes in the description, and invites you by email. If you don&rsquo;t give a meeting link or phone number, Google Calendar adds a Google Meet link. The booking details are kept in that calendar event, not in a separate database.</p>
        </section>

        <section className="privacy-section">
          <h2>How open times are found</h2>
          <p>To show open times, the booking page reads only busy times: free and busy information from my Google calendars, and a busy-only feed from my Outlook calendar. It also looks at calls already booked through this page, so it can keep to three calls a day and one upcoming call per person. While a booking is being made, the site saves a short claim on that time slot, with no name or email, so two people can&rsquo;t take the same slot; it stops counting after two minutes. Your IP address is used only in server memory to limit booking attempts to five an hour, and it isn&rsquo;t saved.</p>
        </section>

        <section className="privacy-section">
          <h2>Assistant conversations</h2>
          <p>Your messages and the assistant&rsquo;s replies are saved in a private Firebase database, with technical details such as the model used, token counts and cost. Only I can read them. I use these records to review answer quality, troubleshoot problems and understand costs. Questions the assistant couldn&rsquo;t answer may also be saved separately so I can add the missing information. The site&rsquo;s activity log records that a chat happened and its general topic, not what was said. The chat uses a temporary browser-tab identifier to group a conversation; it does not require an account.</p>
        </section>

        <section className="privacy-section">
          <h2>AI and hosting services</h2>
          <p>To answer you, the assistant sends your message to OpenRouter, which passes it to the model provider that writes the reply. Your message may also be sent to OpenAI to create an embedding, a numeric summary used to find the relevant parts of my notes. Netlify hosts the site and its server functions. Avoid sharing confidential client information, credentials, or sensitive personal information in the assistant. Email is the better starting point for discussing a project.</p>
        </section>

        <section className="privacy-section">
          <h2>Error reports</h2>
          <p>If the assistant can&rsquo;t answer because both of its connections failed, your browser sends a short error report with the error message and where it happened. The server adds your browser&rsquo;s user agent (its name, version and operating system) and the time, and saves the report privately. It doesn&rsquo;t include your chat messages. Your IP address is used only in server memory to limit how many reports one visitor can send.</p>
        </section>

        <section className="privacy-section">
          <h2>Spell Brigade accounts</h2>
          <p>Spell Brigade, the game at /game, runs on its own game server. You can play as a guest or create an account with a username and password. The game server keeps your account, characters, settings and progress, and your browser keeps a sign-in token and your last character so you stay signed in. If you use the AI character creator, your description is sent to an AI model provider to create the character.</p>
        </section>

        <section className="privacy-section">
          <h2>Visit counts and browser storage</h2>
          <p>When you open the site in a new browser tab, it records one visit: the site name and the time. It doesn&rsquo;t record your name, email address or IP address. Each visit record carries a 40-day expiry date, but automatic deletion isn&rsquo;t switched on yet. Browser-tab storage helps avoid counting every page navigation as a new visit and keeps assistant turns together. Site preferences may also be saved in your browser. Hosting and service providers may process standard request information to operate their services.</p>
        </section>

        <section className="privacy-section">
          <h2>How long records are kept</h2>
          <p>Visit records carry a 40-day expiry date, but automatic deletion isn&rsquo;t switched on yet, so older records are still stored. Visit records written before July 2026 were kept with the site&rsquo;s activity log and have no expiry date. A slot claim stops counting after two minutes. Calendar events, assistant conversations, error reports and game accounts don&rsquo;t have an automatic deletion date yet. To ask about any of them, use the email address below.</p>
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
