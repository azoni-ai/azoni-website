import React, { useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import WorkPreview from '../components/WorkPreview';
import { useProjects } from '../hooks/useProjects';
import useVisitTracker from '../hooks/useVisitTracker';
import { selectedWorkIds, workStories } from '../data/workStories';
import '../styles/project-detail-warm.css';

const toParagraphs = (body) => {
  const parts = Array.isArray(body) ? body : String(body || '').split(/\n\n+/);
  return parts.map((paragraph) => String(paragraph || '').trim()).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>);
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
  const { state } = useLocation();
  useVisitTracker(id);
  const { getProject, allProjects = [] } = useProjects();
  const project = getProject(id);
  const orderedProjects = [...selectedWorkIds.map((workId) => allProjects.find((item) => item.id === workId)).filter(Boolean), ...allProjects.filter((item) => !selectedWorkIds.includes(item.id))];
  const currentIndex = orderedProjects.findIndex((item) => item.id === id);
  const prevProject = currentIndex > 0 ? orderedProjects[currentIndex - 1] : null;
  const nextProject = currentIndex >= 0 ? orderedProjects[currentIndex + 1] : null;
  const workReturn = typeof state?.workReturn === 'string' && /^\/projects(?:[?#]|$)/.test(state.workReturn) ? state.workReturn : null;
  const collectionPath = workReturn || (selectedWorkIds.includes(id) ? '/projects' : '/projects#project-collection');
  const navigationState = workReturn ? { workReturn } : undefined;

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (!project) {
    return <Layout><Seo title="Work not found" description="Explore selected engineering work by Charlton Smith." path={'/projects/' + id} /><div className="project-detail-page"><div className="project-detail-inner"><h1 className="project-detail-title">Project not found.</h1><p className="project-detail-status">This project may have moved. Explore the current collection below.</p><Link to="/projects" className="project-detail-cta">Back to projects <span aria-hidden="true">&rarr;</span></Link></div></div></Layout>;
  }

  const story = workStories[id];
  const cs = project.caseStudy;
  const introduction = story?.summary || project.tagline || project.description;
  const features = story?.features?.length ? story.features : project.highlights || [];
  const technology = project.tech || [];
  const role = story?.role || cs?.role;
  const liveUrl = project.links?.live;
  const engineeringSections = cs?.sections?.length ? cs.sections : story && project.longDescription ? [{ heading: 'Engineering approach', body: project.longDescription }] : [];
  const hasImplementation = engineeringSections.length > 0 || (story && project.highlights?.length > 0);

  return (
    <Layout>
      <Seo title={project.title} description={story?.summary || project.description || project.tagline} path={'/projects/' + id} />
      <article className="project-detail-page">
        <div className="project-detail-inner">
          <nav className="project-detail-nav" aria-label="Work breadcrumb">
            <Link to={collectionPath} className="project-detail-back"><span aria-hidden="true">&larr;</span> All work</Link>
            <span>{project.archived ? 'Earlier work' : story ? 'Independent product' : 'Project'}</span>
          </nav>
          <header className="project-detail-header">
            {story?.label && <p className="project-detail-eyebrow">{story.label}</p>}
            <h1 className="project-detail-title">{project.title}</h1>
            {introduction && <p className="project-detail-lede">{introduction}</p>}
            {(liveUrl || project.links?.github || project.links?.paper) && <div className="project-detail-actions">
              {liveUrl && <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="project-detail-cta">Visit website <ArrowUpRight size={16} aria-hidden="true" /></a>}
              {project.links?.github && <a href={project.links.github} target="_blank" rel="noopener noreferrer" className="project-detail-resource">View code <ArrowUpRight size={16} aria-hidden="true" /></a>}
              {project.links?.paper && <a href={project.links.paper} target="_blank" rel="noopener noreferrer" className="project-detail-resource">Read the paper <ArrowUpRight size={16} aria-hidden="true" /></a>}
            </div>}
          </header>

          {story?.preview && <WorkPreview story={story} className="project-detail-preview" priority />}

          {story ? (
            <div className="project-detail-overview">
              {features.length > 0 && <section className="project-detail-features">
                <h2>What it does</h2>
                <ul>{features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              </section>}
              {(role || story.approach) && <section className="project-detail-contribution">
                <h2>My part</h2>
                {role && <p className="project-detail-role">{role}</p>}
                <div className="project-detail-prose">{toParagraphs(story.approach)}</div>
              </section>}
            </div>
          ) : (
            <div className="project-detail-standard">
              {role && <p className="project-detail-role"><span>My role</span>{role}</p>}
              {(project.longDescription || project.description) && <DetailSection section={{ heading: 'Overview', body: project.longDescription || project.description }} />}
              {features.length > 0 && <section className="project-detail-block"><h2 className="project-detail-block-heading">Features</h2><ul className="project-detail-highlights">{features.map((item) => <li key={item}>{item}</li>)}</ul></section>}
            </div>
          )}

          {technology.length > 0 && <section className="project-detail-stack"><h2>Built with</h2><ul className="project-detail-tech">{technology.map((tech) => <li key={tech}>{tech}</li>)}</ul></section>}

          {hasImplementation && <details className="project-implementation" key={id}>
            <summary>Engineering notes <span aria-hidden="true">+</span></summary>
            <div className="project-implementation-content">
              {engineeringSections.map((section) => <DetailSection key={section.heading} section={section} />)}
              {story && project.highlights?.length > 0 && <section className="project-detail-block"><h2 className="project-detail-block-heading">Implementation details</h2><ul className="project-detail-highlights">{project.highlights.map((item) => <li key={item}>{item}</li>)}</ul></section>}
            </div>
          </details>}

          <nav className="project-detail-footer-nav" aria-label="More work">
            {prevProject ? <Link to={'/projects/' + prevProject.id} state={navigationState} className="project-detail-foot-link"><span>Previous project</span><strong><span aria-hidden="true">&larr; </span>{prevProject.title}</strong></Link> : <div />}
            <Link to={collectionPath} className="project-detail-all-work">All work</Link>
            {nextProject ? <Link to={'/projects/' + nextProject.id} state={navigationState} className="project-detail-foot-link project-detail-foot-link--next"><span>Next project</span><strong>{nextProject.title}<span aria-hidden="true"> &rarr;</span></strong></Link> : <div />}
          </nav>
        </div>
      </article>
    </Layout>
  );
};

export default ProjectDetail;
