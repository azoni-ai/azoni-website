import React from 'react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import ContactBand from '../components/home/ContactBand';
import { profile, skills } from '../data/profile';
import '../styles/about-warm.css';

const SKILL_GROUPS = [
  { label: 'Languages', items: skills.languages },
  { label: 'Frontend', items: skills.frontend.concat(['Next.js', 'React Native']) },
  { label: 'Backend', items: skills.backend },
  { label: 'AI & agents', items: ['Claude API', 'OpenAI APIs', 'RAG', 'LLM agents', 'MCP', 'Embeddings'] },
  { label: 'Cloud & infra', items: ['AWS Lambda', 'Firebase', 'Netlify', 'Render', 'Docker', 'CI/CD'] },
  { label: 'Data', items: skills.databases },
];

const METHOD = [
  {
    title: 'I review every change before it merges',
    body:
      'I define the problem, the data model, and what "done" means, then hand a scoped task to an agent to draft. I read the result before it merges.',
  },
  {
    title: 'I hand off routine work and keep the decisions',
    body:
      'Agents handle boilerplate, migrations, first drafts, and research. Architecture, data models, security, and anything hard to undo stay with me.',
  },
  {
    title: 'Guardrails are enforced in code',
    body:
      'Destructive actions need a human step, and operations are idempotent and reversible where possible. Every agent run logs its cost, tools, and errors, so I can see what happened when something goes wrong.',
  },
  {
    title: 'When an agent keeps failing, I fix the setup',
    body:
      'A repeated mistake usually means the spec, the tool, or the context is wrong rather than the model. I fix that instead of rewriting the prompt.',
  },
];

const About = () => {
  return (
    <Layout>
      <Seo
        title="About"
        description="Charlton Smith is a software engineer in Seattle. Background, how I work with AI, and the tools I use."
        path="/about"
      />
      <div className="about-page">
        <div className="about-inner">
          <header className="about-hero">
            <p className="about-eyebrow">
              <span className="about-mark" aria-hidden="true" />
              About &middot; {profile.location}
            </p>
            <h1 className="about-title">I build and run AI products.</h1>
            <p className="about-lede">
              I&rsquo;m a full-stack engineer with seven years of experience, currently working on my
              own. I run a set of live products and the shared agent stack behind them, and I spend
              most of my time on correctness, testing, and instrumentation.
            </p>
          </header>

          <section className="about-section">
            <h2 className="about-h2">How I got here</h2>
            <div className="about-prose">
              <p>
                I co-founded <strong>OLI Fitness</strong>, where we built computer-vision fitness
                tracking on the Kinect and published an extended abstract at <strong>ACM CHI 2017</strong>.
                It was the first product I took from a prototype to something other people used.
              </p>
              <p>
                At <strong>T-Mobile</strong> I built internal automation that cut a team&rsquo;s manual
                work by about 80%, moved a frontend from Django templates to Angular, and won the
                company&rsquo;s Big Data Hackathon. Outside of work I ran <strong>Dustbunny</strong>, an
                NFT bidding system spread across 50 machines that held about 2,500 requests a minute
                for six months.
              </p>
              <p>
                As a <strong>Senior Software Engineer at Capital One</strong>, I built Python
                microservices and automated-testing infrastructure on AWS, and mentored an intern who
                shipped a tool the team kept using. Since late 2023 I&rsquo;ve worked independently,
                building and running more than 15 live products on a shared agent and RAG stack. The
                largest is <strong>FaB Stats</strong>, a stats platform for the Flesh and Blood card
                game with 2,900+ players and 1.2M+ matches tracked.
              </p>
              <p>
                I like building whole products and keeping them running, so I can see how they hold up.
                The agent stack lets me do that across more projects than I could by hand.
              </p>
            </div>
          </section>

          <section className="about-section about-method-section">
            <p className="about-eyebrow about-eyebrow--section">Method</p>
            <h2 className="about-h2">How I work with AI</h2>
            <p className="about-section-lede">
              AI tools are how I ship this much, and I put guardrails around them. The commit split and
              agent-activity feed on this site come from the same instrumentation I&rsquo;d add to any
              production system, here pointed at my own workflow.
            </p>
            <div className="about-method-grid">
              {METHOD.map((m) => (
                <div key={m.title} className="about-method-card">
                  <h3 className="about-method-title">{m.title}</h3>
                  <p className="about-method-body">{m.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="about-section">
            <h2 className="about-h2">Tools I use</h2>
            <div className="about-skills">
              {SKILL_GROUPS.map((group) => (
                <div key={group.label} className="about-skill-group">
                  <p className="about-skill-label">{group.label}</p>
                  <ul className="about-skill-list">
                    {group.items.map((item) => (
                      <li key={item} className="about-skill-chip">{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="about-now">
              <span className="about-now-dot" aria-hidden="true" />
              Currently: {profile.currentlyBuilding}
            </p>
          </section>
        </div>

        <ContactBand profile={profile} />
      </div>
    </Layout>
  );
};

export default About;
