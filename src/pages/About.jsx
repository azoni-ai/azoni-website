import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { profile, skills, awards } from '../data/profile';
import '../styles/about-warm.css';

const METHOD = [
  { title: 'I define the problem before handing it to an agent', body: 'I work out the data model, the boundaries, and what done means. An agent can draft the implementation; I still own the decisions and review the code.' },
  { title: 'I automate the repetitive parts', body: 'Boilerplate, first drafts, research, and routine changes are good places to use AI. Architecture, security, and decisions that are hard to undo need closer attention.' },
  { title: 'I want to know what the system actually did', body: 'My agent stack logs tool calls, costs, and errors. I put validation and controls in code so I can investigate a bad result and fix the underlying problem.' },
  { title: 'I keep using what I build', body: 'Running my own products means I see the bugs, the awkward workflows, and the maintenance after launch. That feedback is a big part of how I get better at this.' },
];
const SKILL_GROUPS = [
  { label: 'Languages', items: skills.languages },
  { label: 'Frontend', items: skills.frontend },
  { label: 'Backend', items: skills.backend },
  { label: 'AI & agents', items: ['Claude API', 'OpenAI APIs', 'RAG', 'LLM agents', 'MCP', 'Embeddings'] },
  { label: 'Cloud & infrastructure', items: skills.cloud.concat(['Netlify', 'Render']) },
  { label: 'Data', items: skills.databases },
];

export default function About() {
  return (
    <Layout>
      <Seo title="About" description="Meet Charlton Smith, the engineer behind Azoni. From college hackathons and enterprise engineering to AI products, software consulting, and automation." path="/about" />
      <div className="about-page">
        <div className="about-inner">
          <header className="about-hero">
            <p className="about-eyebrow"><span className="about-mark" aria-hidden="true" /> About &middot; {profile.location}</p>
            <h1 className="about-title">I&rsquo;m Charlton.<br />I build and run software.</h1>
            <p className="about-lede">I&rsquo;m the engineer behind <strong>Azoni</strong>. I build my own products and help businesses with software, AI, and automation. The last few years have taken me deep into AI, but the part I enjoy has stayed the same: making something useful and seeing people use it.</p>
            <div className="about-hero-actions"><Link to="/contact" className="about-contact-button">Email me <span aria-hidden="true">&rarr;</span></Link><Link to="/projects" className="about-text-link">See what I&rsquo;ve built <span aria-hidden="true">&rarr;</span></Link></div>
          </header>

          <section className="about-career" aria-label="Engineering experience">
            <div><span className="about-career-period">Now</span><h2>Azoni</h2><p>Principal software engineer<br />AI consulting</p></div>
            <div><span className="about-career-period">2022&ndash;2023</span><h2>Capital One</h2><p>Senior software engineer<br />Python &amp; AWS</p></div>
            <div><span className="about-career-period">2018&ndash;2022</span><h2>T-Mobile</h2><p>Software Engineer II<br />Automation &amp; web applications</p></div>
          </section>

          <section className="about-section">
            <h2 className="about-h2">How I got here</h2>
            <div className="about-prose">
              <p>In college, I was at hackathons every weekend. I liked the challenge of taking an idea, building something with a team, and getting it in front of people. I co-founded <strong>OLI Fitness</strong>, where we used the Kinect for real-time exercise feedback, published an extended abstract at <strong>ACM CHI 2017</strong>, and made the Princeton Tiger Launch finals.</p>
              <p>At <strong>T-Mobile</strong>, I built internal automation that cut a team&rsquo;s manual workload by about 80%, developed Python/Django services, and moved a frontend from Django templates to Angular. I also completed my <strong>master&rsquo;s in software engineering while working there</strong>. Later, as a senior engineer at <strong>Capital One</strong>, I built Python microservices and automated testing infrastructure on AWS, and mentored an intern who shipped a tool for the team.</p>
              <p>Since late 2023, I&rsquo;ve been building and running my own products. <Link to="/projects/fab-stats">FaB Stats</Link> grew out of a card game I play. <Link to="/projects/row-crew">RowCrew</Link> makes rowing with friends more interesting. <Link to="/projects/embedroute">EmbedRoute</Link> came from repeatedly needing the same embedding infrastructure. I like having real reasons to build things, then living with the results.</p>
              <p>Over the last few years, I&rsquo;ve spent much of my time working with AI: retrieval, agents, tools, and the software around them. I formed <strong>Azoni LLC</strong> in 2026, and I&rsquo;m currently working with a client as a <strong>principal software engineer with a strong AI focus</strong>. I still build and operate my independent projects alongside that work.</p>
            </div>
            <Link to="/resume" className="about-text-link">My full experience and education <span aria-hidden="true">&rarr;</span></Link>
          </section>

          <section className="about-section about-business">
            <p className="about-eyebrow">Working with Azoni</p>
            <h2 className="about-h2">Useful software for businesses of any size.</h2>
            <div className="about-prose"><p>I can help a small business automate work that lives in spreadsheets, connect tools that don&rsquo;t talk to each other, or build a customer-facing app. I can also join an enterprise team to work through architecture, improve an existing system, or bring AI into a workflow.</p><p>I like getting into the details of how a business works. That&rsquo;s how we figure out what will save time, make a process easier, or give customers a better experience &mdash; and what we should build first.</p></div>
            <Link to="/services" className="about-text-link">How I can help <span aria-hidden="true">&rarr;</span></Link>
          </section>

          <section className="about-section about-method-section">
            <h2 className="about-h2">How I work with AI</h2>
            <p className="about-section-lede">AI is part of my daily workflow. Building and running the agent stack behind my own products has taught me where it helps, where it needs checks, and where I need to stay involved.</p>
            <div className="about-method-grid">{METHOD.map((item) => <article className="about-method-card" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
          </section>

          <section className="about-section">
            <h2 className="about-h2">A few things from along the way</h2>
            <div className="about-awards">{awards.map((award) => <article key={award.event}><span>{award.title}</span><h3>{award.event}</h3><p>{award.description}</p></article>)}</div>
          </section>

          <section className="about-section">
            <h2 className="about-h2">Tools I use</h2>
            <div className="about-skills">{SKILL_GROUPS.map((group) => <div className="about-skill-group" key={group.label}><h3>{group.label}</h3><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div>
          </section>

          <section className="about-contact">
            <h2>Tell me what you&rsquo;re working on.</h2><p>A new idea, a repetitive process, or a system that could work better &mdash; I&rsquo;d like to hear about it.</p>
            <Link to="/contact" className="about-contact-button">Email me <span aria-hidden="true">&rarr;</span></Link>
            <a className="about-email" href={'mailto:' + profile.email}>{profile.email}</a>
          </section>
        </div>
      </div>
    </Layout>
  );
}
