import React, { useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import WorkPreview from '../components/WorkPreview';
import { useProjects } from '../hooks/useProjects';
import useVisitTracker from '../hooks/useVisitTracker';
import { useBotReach } from '../hooks/useProductMetrics';
import { LISTED_VISIBILITIES, getMergedInto, getWorkGroups } from '../data/projects';
import { selectedWorkIds, workStories } from '../data/workStories';
import { bookingCta } from '../data/consulting';
import '../styles/project-detail-warm.css';

// Links back to this site become internal links (links.internal) instead.
const SELF_LINK = /^https:\/\/azoni\.ai(\/|$)/;
const BREADCRUMB = { featured: 'Case study', other: 'Project', earlier: 'Earlier work' };
const SECTION_PATH = { featured: '/projects', other: '/projects#other-work', earlier: '/projects#earlier-work' };

const toParagraphs = (body) => {
  const parts = Array.isArray(body) ? body : String(body || '').split(/\n\n+/);
  return parts.map((paragraph) => String(paragraph || '').trim()).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>);
};

const monthYear = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

// Live numbers win when the bot has reported; otherwise the dated figures in projects.js.
export const botReachLine = (bot, live) => {
  if (!bot) return null;
  const servers = live ? live.servers : bot.servers;
  const members = live ? live.members : bot.members;
  const asOf = live ? monthYear(live.reportedAt) || monthYear(Date.now()) : bot.asOf;
  const memberText = Number.isFinite(members) ? ` with ${members.toLocaleString('en-US')} members` : '';
  return `As of ${asOf}, the bot is in ${servers.toLocaleString('en-US')} ${servers === 1 ? 'server' : 'servers'}${memberText}.`;
};

const DetailSection = ({ section, reach }) => (
  <section className="project-detail-block">
    <h2 className="project-detail-block-heading">
      {section.icon && <img className="project-detail-block-icon" src={section.icon} alt="" width="28" height="28" loading="lazy" />}
      {section.heading}
    </h2>
    <div className="project-detail-prose">
      {toParagraphs(section.body)}
      {section.botReach && reach && <p>{reach}</p>}
      {section.decisions?.length > 0 && <ul className="cs-decisions">{section.decisions.map((decision) => <li key={decision}>{decision}</li>)}</ul>}
    </div>
  </section>
);

const ProjectDetail = () => {
  const { id } = useParams();
  useVisitTracker(id);
  const { getProject, allProjects = [] } = useProjects();
  const project = getProject(id);
  const liveReach = useBotReach(project?.discordBot?.key || null);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (!project) {
    return <Layout><Seo title="Work not found" description="Explore selected engineering work by Charlton Smith." path={'/projects/' + id} noIndex /><div className="project-detail-page"><div className="project-detail-inner"><h1 className="project-detail-title">Project not found.</h1><p className="project-detail-status">This project may have moved. The current work is on the Work page.</p><Link to="/projects" className="project-detail-cta">Back to work <span aria-hidden="true">&rarr;</span></Link></div></div></Layout>;
  }

  // Merged projects live on another page now (public/_redirects covers direct loads).
  if (project.redirectTo) return <Navigate to={project.redirectTo} replace />;

  const visibility = project.visibility;
  const listed = LISTED_VISIBILITIES.includes(visibility);
  const isFeatured = visibility === 'featured';
  const story = workStories[id];
  const cs = project.caseStudy;
  const links = project.links || {};
  const liveUrl = links.live && !project.liveLinkHidden && !SELF_LINK.test(links.live) ? links.live : null;
  const linkItems = [
    ...(links.internal || []).map((item) => ({ key: item.to, to: item.to, label: item.label })),
    liveUrl && { key: 'live', href: liveUrl, label: 'Visit website' },
    links.github && { key: 'github', href: links.github, label: 'View code' },
    links.paper && { key: 'paper', href: links.paper, label: 'Read the paper' },
  ].filter(Boolean);
  const facts = [
    ['Dates', project.facts?.years || cs?.timeline],
    ['Role', project.facts?.role || cs?.role],
    ['Status', project.facts?.status],
    // One item per chip, so a line never breaks inside a name.
    ['Stack', project.tech?.length > 0 && <ul className="project-facts-stack">{project.tech.map((item) => <li key={item}>{item}</li>)}</ul>],
  ].filter(([, value]) => value);
  const sections = cs?.sections?.length ? cs.sections : [{ heading: 'Overview', body: project.longDescription || project.description }];
  const features = cs?.sections?.length ? [] : project.highlights || [];
  const preview = story?.preview ? story : project.photo ? { preview: project.photo } : null;
  const gallery = getMergedInto(id, allProjects).filter((item) => item.galleryLine);
  const reach = botReachLine(project.discordBot, liveReach);

  const group = !listed ? [] : isFeatured
    ? selectedWorkIds.map((workId) => allProjects.find((item) => item.id === workId && item.visibility === 'featured')).filter(Boolean)
    : getWorkGroups(allProjects)[visibility].filter((item) => !item.redirectTo);
  const currentIndex = group.findIndex((item) => item.id === id);
  const prevProject = currentIndex > 0 ? group[currentIndex - 1] : null;
  const nextProject = currentIndex >= 0 ? group[currentIndex + 1] : null;
  const collectionPath = SECTION_PATH[visibility] || '/projects';

  return (
    <Layout>
      <Seo title={project.title} description={story?.summary || project.description || project.tagline} path={'/projects/' + id} noIndex={!listed} />
      <article className="project-detail-page">
        <div className="project-detail-inner">
          <nav className="project-detail-nav" aria-label="Work breadcrumb">
            <Link to={collectionPath} className="project-detail-back"><span aria-hidden="true">&larr;</span> All work</Link>
            <span>{BREADCRUMB[visibility] || 'Project'}</span>
          </nav>
          <header className="project-detail-header">
            {story?.label && <p className="project-detail-eyebrow">{story.label}</p>}
            <h1 className="project-detail-title">{project.title}</h1>
            <p className="project-detail-lede">{story?.summary || project.tagline || project.description}</p>
          </header>

          {(facts.length > 0 || linkItems.length > 0) && <dl className="project-facts">
            {facts.map(([label, value]) => <div key={label} className={`project-facts-item${label === 'Stack' ? ' project-facts-item--stack' : ''}`}><dt>{label}</dt><dd>{value}</dd></div>)}
            {linkItems.length > 0 && <div className="project-facts-item project-facts-links"><dt>Links</dt><dd>{linkItems.map((item) => item.to
              ? <Link key={item.key} to={item.to} className="project-detail-resource">{item.label} <ArrowRight size={15} aria-hidden="true" /></Link>
              : <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer" className="project-detail-resource">{item.label} <ArrowUpRight size={15} aria-hidden="true" /></a>)}</dd></div>}
          </dl>}

          {project.proof?.items?.length > 0 && <section className="project-proof" aria-label={`Numbers as of ${project.proof.asOf}`}>
            <ul>{project.proof.items.map((item) => <li key={item.label}><strong>{item.value}</strong><span>{item.label}</span></li>)}</ul>
            <p>As of {project.proof.asOf}.</p>
          </section>}

          {preview && <WorkPreview story={preview} className="project-detail-preview" priority />}

          <div className="project-detail-story">
            {sections.map((section) => <DetailSection key={section.heading} section={section} reach={reach} />)}
            {features.length > 0 && <section className="project-detail-block"><h2 className="project-detail-block-heading">Features</h2><ul className="project-detail-highlights">{features.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          </div>

          {gallery.length > 0 && <section className="project-gallery" aria-labelledby="project-gallery-heading">
            <h2 id="project-gallery-heading" className="project-detail-block-heading">{project.galleryTitle || 'Gallery'}</h2>
            <ul className="project-gallery-grid">{gallery.map((item) => <li key={item.id} className="project-gallery-item">
              {item.image && <img className="project-gallery-image" src={item.image} alt={`${item.title} icon`} width="48" height="48" loading="lazy" />}
              <div>
                <h3>{item.title}</h3>
                <p>{item.galleryLine}</p>
                {item.links?.live && <a href={item.links.live} target="_blank" rel="noopener noreferrer" className="project-detail-resource">Visit {item.title} <ArrowUpRight size={15} aria-hidden="true" /></a>}
              </div>
            </li>)}</ul>
            {project.galleryNote && <p className="project-gallery-note">{project.galleryNote.text} <Link to={project.galleryNote.to}>{project.galleryNote.label}</Link></p>}
          </section>}

          {(isFeatured || visibility === 'other') && project.closing !== false && <section className="project-detail-closing" aria-labelledby="project-closing-heading">
            <div>
              <h2 id="project-closing-heading">Need something like this?</h2>
              <p>If you&rsquo;re working on something similar, I&rsquo;d like to hear about it.</p>
            </div>
            <div className="project-detail-closing-actions">
              <Link to={bookingCta.to} className="project-detail-cta">{bookingCta.label} <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link to="/services" className="project-detail-resource">About consulting</Link>
            </div>
          </section>}

          <nav className="project-detail-footer-nav" aria-label="More work">
            {prevProject ? <Link to={'/projects/' + prevProject.id} className="project-detail-foot-link"><span>Previous{isFeatured ? ' case study' : ''}</span><strong><span aria-hidden="true">&larr; </span>{prevProject.title}</strong></Link> : <div />}
            <Link to={collectionPath} className="project-detail-all-work">All work</Link>
            {nextProject ? <Link to={'/projects/' + nextProject.id} className="project-detail-foot-link project-detail-foot-link--next"><span>Next{isFeatured ? ' case study' : ''}</span><strong>{nextProject.title}<span aria-hidden="true"> &rarr;</span></strong></Link> : <div />}
          </nav>
        </div>
      </article>
    </Layout>
  );
};

export default ProjectDetail;
