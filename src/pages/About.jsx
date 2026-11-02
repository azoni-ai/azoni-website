import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Linkedin } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { profile, experience, education, awards } from '../data/profile';
import { bookingCta, resumePath } from '../data/consulting';
import '../styles/about-warm.css';

const CHI_PAPER = 'https://dl.acm.org/doi/abs/10.1145/3027063.3048429';

// Internal links get an arrow; external ones get the up-right arrow and a new tab.
function EntryLink({ link }) {
  if (link.to) return <Link to={link.to} className="consult-text-link">{link.label} <ArrowRight size={15} aria-hidden="true" /></Link>;
  return <a href={link.href} className="consult-text-link" target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`}>{link.label} <ArrowUpRight size={15} aria-hidden="true" /></a>;
}

export default function About() {
  return (
    <Layout>
      <Seo title="About" description="From college hackathons and co-founding OLI Fitness to T-Mobile, Capital One and the AI products I build and run now." path="/about" />
      <div className="about-page">
        <div className="about-inner">
          <header className="about-hero">
            <div>
              <p className="consult-eyebrow">About me</p>
              <h1>I’m Charlton Smith, a principal software engineer in the Seattle area.</h1>
              <p className="about-lede">I build and run AI products and the infrastructure behind them, both for a client and through Azoni.</p>
              <div className="consult-actions about-actions">
                <Link to={bookingCta.to} className="consult-button">{bookingCta.label} <ArrowRight size={17} aria-hidden="true" /></Link>
                <Link to={resumePath} className="consult-button about-button-quiet">Résumé</Link>
              </div>
            </div>
            <aside className="about-at-a-glance" aria-label="At a glance">
              <div className="about-profile">
                <img className="about-portrait" src={profile.photo} alt="Charlton Smith" width="200" height="200" decoding="async" />
                <div className="about-profile-details">
                  <p>{profile.name}</p>
                  <span>{profile.title}</span>
                </div>
              </div>
              <dl>
                <div><dt>Based in</dt><dd>Seattle area</dd></div>
                <div><dt>Previously</dt><dd>Capital One · <span className="about-nowrap">T-Mobile</span></dd></div>
                <div><dt>Education</dt><dd>M.S. Software Engineering</dd></div>
              </dl>
              <a href={profile.links.linkedin} className="about-linkedin consult-text-link" target="_blank" rel="noopener noreferrer" aria-label="Connect with Charlton on LinkedIn (opens in a new tab)"><Linkedin size={17} aria-hidden="true" /> Connect on LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a>
            </aside>
          </header>

          <section className="about-editorial" aria-labelledby="about-story">
            <div className="about-section-label"><p className="consult-eyebrow">How I got here</p><h2 id="about-story">It started with<br /> weekend hackathons.</h2></div>
            <div className="about-prose">
              <p>In college, I was at hackathons every weekend. I loved taking an idea, building it with a team, and getting it in front of people. <Link to="/projects/hashmaps">HashMaps</Link>, an auto-hashtag tool, took first place at the T-Mobile Big Data Hackathon. Those weekends led to co-founding OLI Fitness, where we built computer vision software to help people exercise and published <a href={CHI_PAPER} target="_blank" rel="noopener noreferrer" aria-label="an extended abstract at ACM CHI 2017 (opens in a new tab)">an extended abstract at ACM CHI 2017</a>.</p>
              <p>I went on to build internal tools at T-Mobile, complete my <strong>master’s in software engineering while working there</strong>, and develop test automation at Capital One. Over the last few years, I’ve spent much of my time deep in AI: retrieval, agents, and the software that makes them useful.</p>
              <p>I’ve been building and running independent products since late 2023 and formed <strong>Azoni LLC in 2026</strong>. Some start with my own interests: <Link to="/projects/fab-stats">FaB Stats</Link> came from a card game I play; <Link to="/projects/row-crew">Row Crew</Link> makes rowing with friends more interesting. Running them keeps me close to the people using what I build.</p>
            </div>
          </section>

          <section id="experience" className="about-editorial" aria-labelledby="about-experience">
            <div className="about-section-label"><p className="consult-eyebrow">Experience</p><h2 id="about-experience">What I’ve worked on since 2016.</h2><Link to={resumePath} className="consult-text-link">Full résumé <ArrowRight size={16} aria-hidden="true" /></Link></div>
            <ol className="about-experience-list">
              {experience.map(job => (
                <li key={job.id}>
                  <div className="about-experience-heading"><h3>{job.company}</h3><span>{job.period}</span></div>
                  <p className="about-role">{job.title}</p>
                  <p>{job.summary}</p>
                  {job.links?.length > 0 && <div className="about-entry-links">{job.links.map(link => <EntryLink key={link.label} link={link} />)}</div>}
                </li>
              ))}
            </ol>
          </section>

          <section className="about-editorial about-education-section" aria-labelledby="about-education">
            <div className="about-section-label"><p className="consult-eyebrow">Education</p><h2 id="about-education">Education and awards</h2></div>
            <div>
              <div className="about-education">
                {education.map(item => <div key={item.degree}><h3>{item.degree}</h3><p>{item.school} <span>· {item.year}</span></p>{item.note && <small>{item.note}</small>}</div>)}
              </div>
              <h3 className="about-awards-heading">Awards</h3>
              <ul className="about-awards">
                {awards.map(award => (
                  <li key={award.event}>
                    <p><strong>{award.title}</strong> · {award.event}</p>
                    {award.description && <small>{award.description}</small>}
                    {award.link && <EntryLink link={award.link} />}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="about-closing" aria-labelledby="about-contact-title">
            <div>
              <p className="consult-eyebrow">Next steps</p>
              <h2 id="about-contact-title">See the work, or get in touch.</h2>
              <p>The products I build and run are on the Work page, with notes on how I built them. If you have something in mind, email me.</p>
              <p className="about-closing-more">The <Link to={resumePath}>résumé</Link> has the full history, and the <Link to="/services">consulting page</Link> explains how I work with clients.</p>
            </div>
            <div className="about-closing-actions">
              <Link to="/projects" className="consult-button about-button-quiet">See my work <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link to={bookingCta.to} className="consult-button">{bookingCta.label} <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
