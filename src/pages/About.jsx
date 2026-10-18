import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Linkedin } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { profile, education } from '../data/profile';
import '../styles/about-warm.css';

const CAREER = [
  {
    period: 'Current engagement', company: 'Azoni', role: 'Principal software engineer & AI consultant',
    description: 'Working with a client as a principal software engineer with a strong AI focus. Alongside consulting, I build and operate my own products, including AI agents, retrieval systems, and web applications.',
  },
  {
    period: 'Nov 2022–Nov 2023', company: 'Capital One', role: 'Senior software engineer',
    description: 'Built Python microservices and automated testing infrastructure with AWS Lambda and S3. Mentored an intern who shipped a test automation tool for the team.',
  },
  {
    period: 'Sep 2021–Jun 2022', company: 'Dustbunny', role: 'Web3 automation engineer',
    description: 'Built a distributed bidding system across 50 machines, with Redis caching and automation handling 2,500 requests per minute.',
  },
  {
    period: 'Jun 2018–Apr 2022', company: 'T-Mobile', role: 'Software Engineer II',
    description: 'Built an internal automation application that reduced a team’s manual workload by about 80%. Developed Python/Django services and migrated a frontend to Angular.',
  },
  {
    period: 'Jan 2016–Mar 2018', company: 'OLI Fitness', role: 'Co-founder & technical lead',
    description: 'Used computer vision and the Kinect SDK to give people real-time exercise feedback. Published an extended abstract at ACM CHI 2017 and reached the Princeton Tiger Launch finals.',
  },
];

export default function About() {
  return (
    <Layout>
      <Seo title="About Charlton Smith" description="Meet Charlton Smith, the engineer behind Azoni. Principal software engineering, practical AI, and a career spent building useful software." path="/about" />
      <div className="about-page">
        <div className="about-inner">
          <header className="about-hero">
            <div>
              <p className="consult-eyebrow">About Azoni</p>
              <h1>I’m Charlton.<br /><span>A builder at heart.</span></h1>
              <p className="about-lede">I’m the engineer behind Azoni. I help businesses of any size improve how they work through software, AI, and automation.</p>
            </div>
            <aside className="about-at-a-glance" aria-label="At a glance">
              <div className="about-profile">
                <img className="about-portrait" src={profile.photo} alt="Charlton Smith" width="200" height="200" decoding="async" />
                <div className="about-profile-details">
                  <p>Charlton Smith</p>
                  <span>Principal software engineer<br />&amp; AI consultant</span>
                </div>
              </div>
              <dl>
                <div><dt>Based in</dt><dd>Seattle area</dd></div>
                <div><dt>Previously</dt><dd>Capital One · T-Mobile</dd></div>
                <div><dt>These days</dt><dd>Applied AI &amp; useful software</dd></div>
              </dl>
              <a href={profile.links.linkedin} className="about-linkedin consult-text-link" target="_blank" rel="noopener noreferrer" aria-label="Connect with Charlton on LinkedIn (opens in a new tab)"><Linkedin size={17} aria-hidden="true" /> Connect on LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a>
            </aside>
          </header>

          <section className="about-editorial" aria-labelledby="about-story">
            <div className="about-section-label"><p className="consult-eyebrow">The person behind the work</p><h2 id="about-story">It started with<br /> weekend hackathons.</h2></div>
            <div className="about-prose">
              <p>In college, I was at hackathons every weekend. I loved taking an idea, building it with a team, and getting it in front of people. That led to co-founding OLI Fitness, where we built computer vision software to help people exercise.</p>
              <p>I went on to build internal tools at T-Mobile, complete my <strong>master’s in software engineering while working there</strong>, and work on automation at Capital One. Over the last few years, I’ve spent much of my time deep in AI: retrieval, agents, and the software that makes them useful.</p>
              <p>I’ve been building and running independent products since late 2023 and formed <strong>Azoni LLC in 2026</strong>. Some start with my own interests: <Link to="/projects/fab-stats">FaB Stats</Link> came from a card game I play; <Link to="/projects/row-crew">RowCrew</Link> makes rowing with friends more interesting. Running them keeps me close to the people using what I build.</p>
            </div>
          </section>

          <section id="experience" className="about-editorial" aria-labelledby="about-experience">
            <div className="about-section-label"><p className="consult-eyebrow">Experience</p><h2 id="about-experience">From enterprise teams<br /> to my own products.</h2><Link to="/resume" className="consult-text-link">Full résumé <ArrowRight size={16} aria-hidden="true" /></Link></div>
            <ol className="about-experience-list">
              {CAREER.map(job => (
                <li key={job.company}>
                  <div className="about-experience-heading"><h3>{job.company}</h3><span>{job.period}</span></div>
                  <p className="about-role">{job.role}</p>
                  <p>{job.description}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="about-editorial about-education-section" aria-labelledby="about-education">
            <div className="about-section-label"><p className="consult-eyebrow">Education</p><h2 id="about-education">Always learning.</h2></div>
            <div className="about-education">
              {education.map(item => <div key={item.degree}><h3>{item.degree}</h3><p>{item.school} <span>· {item.year}</span></p><small>{item.year === '2021' ? 'Completed while working full-time at T-Mobile' : 'Graduated with honors · Teaching assistant · Huscii Coding Club president'}</small></div>)}
            </div>
          </section>

          <section className="about-closing" aria-labelledby="about-contact-title">
            <div><p className="consult-eyebrow">Working together</p><h2 id="about-contact-title">You’ll work directly with me.</h2><p>I like getting into the details of how a business works, figuring out what would make a difference, and building it. A small automation or a complex system — I’d like to hear what you have in mind.</p></div>
            <div className="about-closing-actions"><Link to="/services" className="consult-text-link">How I can help <ArrowRight size={16} aria-hidden="true" /></Link></div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
