import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import WorkPreview from '../components/WorkPreview';
import { useProjects } from '../hooks/useProjects';
import { getWorkGroups, proofLine } from '../data/projects';
import { selectedWorkIds, workStories } from '../data/workStories';
import { resumePath } from '../data/consulting';
import '../styles/products-warm.css';
import '../styles/projects-warm.css';

export default function Projects() {
  const { allProjects } = useProjects('all');
  const groups = getWorkGroups(allProjects);
  const featured = selectedWorkIds.map((id) => groups.featured.find((project) => project.id === id)).filter(Boolean);

  return (
    <Layout>
      <Seo title="Work" description="Products Charlton Smith builds and runs: FaB Stats, the agent platform behind azoni.ai, Old Ways Today and Row Crew, plus other projects and earlier work." path="/projects" />
      <div className="projects-page">
        <div className="projects-page-inner">
          <header className="projects-page-header">
            <p className="projects-eyebrow">Work</p>
            <h1 className="projects-heading">Products I build and <span>run.</span></h1>
            <p className="projects-tagline">I design, build and run the case-study products myself. Each case study covers what I built and the decisions behind it. The earlier work includes OLI Fitness, which I co-founded and led with a team of five.</p>
          </header>

          <section className="projects-selected" aria-labelledby="projects-selected-heading">
            <h2 id="projects-selected-heading" className="projects-section-title">Case studies</h2>
            <div className="projects-selected-grid">{featured.map((project, index) => {
              const story = workStories[project.id];
              const proof = proofLine(project.proof);
              return <article key={project.id} className="projects-story">
                <Link to={`/projects/${project.id}`} className="projects-story-main">
                  <WorkPreview story={story} showCaption={false} priority={index < 2} />
                  {story?.label && <p className="projects-story-label">{story.label}</p>}
                  <div className="projects-story-heading"><h3>{project.title}</h3><ArrowRight size={20} aria-hidden="true" /></div>
                  <p className="projects-story-description">{story?.summary || project.description}</p>
                  {proof && <p className="projects-story-proof">{proof}</p>}
                </Link>
                <div className="projects-story-links"><span>{project.facts?.role || 'Solo'}{project.facts?.years ? ` · ${project.facts.years}` : ''}</span>{project.links?.live && !/^https:\/\/azoni\.ai(\/|$)/.test(project.links.live) && <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="projects-live-link" aria-label={`Visit ${project.title} website (opens in a new tab)`}>Visit website <ArrowUpRight size={15} aria-hidden="true" /></a>}</div>
              </article>;
            })}</div>
          </section>

          {groups.other.length > 0 && <section className="projects-list" id="other-work" aria-labelledby="projects-other-heading">
            <h2 id="projects-other-heading" className="projects-section-title">Other things I&rsquo;ve built</h2>
            <div className="product-grid">{groups.other.map((project) => <ProductCard key={project.id} project={project} />)}</div>
          </section>}

          {groups.earlier.length > 0 && <section className="projects-list" id="earlier-work" aria-labelledby="projects-earlier-heading">
            <h2 id="projects-earlier-heading" className="projects-section-title">Earlier work</h2>
            <div className="product-grid">{groups.earlier.map((project) => <ProductCard key={project.id} project={project} />)}</div>
          </section>}

          <section className="projects-atwork" aria-labelledby="projects-atwork-heading">
            <div>
              <h2 id="projects-atwork-heading">At work</h2>
              <p>This page covers my own products and earlier projects. My professional experience, at <span className="projects-nowrap">T-Mobile</span>, Capital One and in my current principal engineering role, is on my About page and resume.</p>
            </div>
            <div className="projects-atwork-links">
              <Link to="/about#experience" className="projects-atwork-link">Experience <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link to={resumePath} className="projects-atwork-link">Resume <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
