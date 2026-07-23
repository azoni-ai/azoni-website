import React from 'react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import ContactBand from '../components/home/ContactBand';
import { profile, skills } from '../data/profile';
import '../styles/about-warm.css';

// Grouped skills, labeled for humans. Each strong claim is something a project
// on the site actually demonstrates — no flat buzzword list.
const SKILL_GROUPS = [
  { label: 'Languages', items: skills.languages },
  { label: 'Frontend', items: skills.frontend.concat(['Next.js', 'React Native']) },
  { label: 'Backend', items: skills.backend },
  { label: 'AI & agents', items: ['Claude API', 'OpenAI APIs', 'RAG', 'LLM agents', 'MCP', 'Embeddings'] },
  { label: 'Cloud & infra', items: ['AWS Lambda', 'Firebase', 'Netlify', 'Render', 'Docker', 'CI/CD'] },
  { label: 'Data', items: skills.databases },
];

// The method blocks — the differentiator stated as a method with guardrails,
// not a manifesto. Headers are written to read on their own.
const METHOD = [
  {
    title: 'I write the spec; agents draft; I review every diff',
    body:
      'The loop is deliberate. I define the problem, the data model, and the acceptance criteria, then hand a tightly-scoped task to an agent to draft. Nothing merges that I have not read and cannot explain. The agent is a fast pair, not an author of record.',
  },
  {
    title: 'I delegate the mechanical and drive the consequential',
    body:
      'Boilerplate, migrations, first drafts, and research fan-out go to agents. Architecture, data models, security boundaries, product decisions, and anything irreversible stay with me. Knowing which is which is most of the skill.',
  },
  {
    title: 'Guardrails are code, not vibes',
    body:
      'Destructive actions require a human step. Operations are idempotent and reversible where they can be. Every agent run logs its cost, tools, and errors, so a bad trajectory is visible and auditable instead of silent.',
  },
  {
    title: 'When an agent keeps failing, I fix the system — not the model',
    body:
      'A recurring class of mistake is a design signal. The fix is a sharper spec, a tighter tool, or better context — so the model stops being able to make that mistake — rather than a new prompt and a hope. That is the same instinct I bring to any production system.',
  },
];

const About = () => {
  return (
    <Layout>
      <Seo
        title="About"
        description="Charlton Smith — a Seattle software engineer who builds AI products end to end and instruments them so he can prove they work. The story, the method, and the stack."
        path="/about"
      />
      <div className="about-page">
        <div className="about-inner">
          <header className="about-hero">
            <p className="about-eyebrow">
              <span className="about-mark" aria-hidden="true" />
              About &middot; {profile.location}
            </p>
            <h1 className="about-title">I build AI products &mdash; and prove they work.</h1>
            <p className="about-lede">
              I&rsquo;m a full-stack engineer with seven years shipping production software, now
              working independently on a portfolio of live products and the agent stack that keeps
              them running. I care about the boring parts &mdash; correctness, instrumentation, and
              being able to explain every line &mdash; because that&rsquo;s what makes the fast parts safe.
            </p>
          </header>

          <section className="about-section">
            <h2 className="about-h2">How I got here</h2>
            <div className="about-prose">
              <p>
                I started by co-founding <strong>OLI Fitness</strong>, where we built computer-vision
                fitness tracking on the Kinect and published an extended abstract at <strong>ACM CHI 2017</strong>.
                Turning a research idea into something people could actually use taught me that the
                interesting engineering usually lives in the gap between &ldquo;it works in the demo&rdquo;
                and &ldquo;it works for a stranger.&rdquo;
              </p>
              <p>
                At <strong>T-Mobile</strong> I built internal automation that cut a team&rsquo;s manual
                workload by around 80%, moved a frontend off Django templates onto Angular, and won the
                company&rsquo;s Big Data Hackathon. On the side I ran <strong>Dustbunny</strong>, an NFT
                bidding system spread across 50 machines that sustained roughly 2,500 requests a minute
                for six months &mdash; my first real lesson in operating something that can&rsquo;t go down.
              </p>
              <p>
                As a <strong>Senior Software Engineer at Capital One</strong>, I built Python
                microservices and automated-testing infrastructure on AWS, and mentored an intern who
                shipped a tool the team kept using. Since late 2023 I&rsquo;ve been independent: designing,
                shipping, and operating <strong>15+ live products</strong> on a shared agent and RAG stack &mdash;
                including <strong>FaB Stats</strong>, a competitive-TCG analytics platform with 2,900+ players
                and 1.2M+ matches tracked.
              </p>
              <p>
                What pulls me now is the same thing that pulled me at the start: building real products,
                end to end, and instrumenting them well enough to know they&rsquo;re working. The AI stack
                just lets me do it across a lot more surface area &mdash; which only holds together if the
                engineering discipline underneath is real.
              </p>
            </div>
          </section>

          <section className="about-section about-method-section">
            <p className="about-eyebrow about-eyebrow--section">How I build with AI</p>
            <h2 className="about-h2">Fast, but accountable</h2>
            <p className="about-section-lede">
              AI-assisted development is how I ship at this volume, but it&rsquo;s a method with
              guardrails, not a shortcut. The live commit split and agent-activity feed on this site
              are the same instrumentation I&rsquo;d put on any production system &mdash; pointed at my own
              workflow.
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
            <h2 className="about-h2">Tools I reach for</h2>
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
