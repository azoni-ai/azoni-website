import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { useProjects } from '../hooks/useProjects';
import useVisitTracker from '../hooks/useVisitTracker';
import { selectedWorkIds, workStories } from '../data/workStories';
import '../styles/project-detail-warm.css';

const toParagraphs = (body) => {
  const parts = Array.isArray(body) ? body : String(body || '').split(/\n\n+/);
  return parts.map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>);
};

const DetailSection = ({ section }) => (
  <section className="project-detail-block">
    <h2 className="project-detail-block-heading">{section.heading}</h2>
    <div className="project-detail-prose">
      {toParagraphs(section.body)}
      {section.decisions?.length > 0 && <ul className="cs-decisions">{section.decisions.map((decision) => <li key={decision}>{decision}</li>)}</ul>}
    </div>
  </section>
);

const ProjectDetail = () => {
  const { id } = useParams();
  useVisitTracker(id);
  const { getProject, allProjects } = useProjects();
  const project = getProject(id);
  const orderedProjects = [...selectedWorkIds.map((workId) => allProjects.find((item) => item.id === workId)).filter(Boolean), ...allProjects.filter((item) => !selectedWorkIds.includes(item.id))];
  const currentIndex = orderedProjects.findIndex((item) => item.id === id);
  const prevProject = currentIndex > 0 ? orderedProjects[currentIndex - 1] : null;
  const nextProject = currentIndex >= 0 ? orderedProjects[currentIndex + 1] : null;

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (!project) {
    return <Layout><Seo title="Work not found" description="Explore selected engineering work by Charlton Smith." path={'/projects/' + id} /><div className="project-detail-page"><div className="project-detail-inner"><h1 className="project-detail-title">Project not found.</h1><p className="project-detail-status">This project may have moved. Explore the current collection below.</p><Link to="/projects" className="project-detail-cta">Back to projects <span aria-hidden="true">&rarr;</span></Link></div></div></Layout>;
  }

  const story = workStories[id];
  const cs = project.caseStudy;
  const title = story?.headline || project.tagline;
  const businessSections = story ? [
    { heading: 'The problem', body: story.problem },
    { heading: 'What I built', body: story.approach },
    { heading: 'The result', body: story.outcome },
  ] : null;

  return (
    <Layout>
      <Seo title={project.title} description={story ? story.headline + ' ' + story.outcome : project.description || project.tagline} path={'/projects/' + id} />
      <div className="project-detail-page">
        <div className="project-detail-inner">
          <nav className="project-detail-nav" aria-label="Work breadcrumb"><Link to="/projects" className="project-detail-back"><span aria-hidden="true">&larr;</span> All work</Link><span>{project.archived ? 'Earlier work' : 'Independent product'}</span></nav>
          <header className="project-detail-header">
            <p className="project-detail-eyebrow">{story?.label || 'Product & engineering'}</p>
            <h1 className="project-detail-title">{project.title}</h1>
            <p className="project-detail-lede">{title}</p>
            <div className="project-detail-actions">
              {project.links?.live && <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="project-detail-cta">Explore the product <span aria-hidden="true">&nearr;</span></a>}
              {project.links?.github && <a href={project.links.github} target="_blank" rel="noopener noreferrer" className="project-detail-cta">View code <span aria-hidden="true">&nearr;</span></a>}
              {project.links?.paper && <a href={project.links.paper} target="_blank" rel="noopener noreferrer" className="project-detail-cta">Read the paper <span aria-hidden="true">&nearr;</span></a>}
            </div>
          </header>

          {(story || cs) && <dl className="cs-facts">
            <div><dt>My role</dt><dd>{story?.role || cs?.role}</dd></div>
            <div><dt>{story ? 'Relevant capabilities' : 'Technology'}</dt><dd>{story?.relevance || project.tech.slice(0, 4).join(' / ')}</dd></div>
          </dl>}

          {businessSections ? businessSections.map((section) => <DetailSection key={section.heading} section={section} />) : cs?.sections ? cs.sections.map((section) => <DetailSection key={section.heading} section={section} />) : <DetailSection section={{ heading: 'Overview', body: project.longDescription || project.description }} />}

          {story ? (
            <details className="project-implementation">
              <summary>Inside the implementation <span aria-hidden="true">+</span></summary>
              <div className="project-implementation-content">
                {cs?.sections ? cs.sections.map((section) => <DetailSection key={section.heading} section={section} />) : <DetailSection section={{ heading: 'Engineering approach', body: project.longDescription }} />}
                {project.highlights?.length > 0 && <section className="project-detail-block"><h2 className="project-detail-block-heading">Implementation details</h2><ul className="project-detail-highlights">{project.highlights.map((item) => <li key={item}>{item}</li>)}</ul></section>}
              </div>
            </details>
          ) : project.highlights?.length > 0 && <section className="project-detail-block"><h2 className="project-detail-block-heading">Implementation details</h2><ul className="project-detail-highlights">{project.highlights.map((item) => <li key={item}>{item}</li>)}</ul></section>}

          <section className="project-detail-stack"><h2>Technology</h2><ul className="project-detail-tech">{project.tech.map((tech) => <li key={tech}>{tech}</li>)}</ul></section>
          <section className="project-detail-contact">
            <h2>Have a related challenge?</h2>
            <p>Tell me about your product, team, and what you need to move forward.</p>
            <Link to="/contact" className="project-detail-cta project-detail-cta--primary">Email me <span aria-hidden="true">&rarr;</span></Link>
          </section>
          <nav className="project-detail-footer-nav" aria-label="More work">
            {prevProject ? <Link to={'/projects/' + prevProject.id} className="project-detail-foot-link"><span>Previous project</span><strong><span aria-hidden="true">&larr; </span>{prevProject.title}</strong></Link> : <div />}
            {nextProject ? <Link to={'/projects/' + nextProject.id} className="project-detail-foot-link project-detail-foot-link--next"><span>Next project</span><strong>{nextProject.title}<span aria-hidden="true"> &rarr;</span></strong></Link> : <div />}
          </nav>
        </div>
      </div>
    </Layout>
  );
};

export default ProjectDetail;
