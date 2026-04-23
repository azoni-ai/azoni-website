import React from 'react';
import { Link } from 'react-router-dom';
import { PROJECT_STORIES } from '../data/project-stories';
import '../styles/project-showcase.css';

const isExternal = (href) => href && /^https?:\/\//i.test(href);

const formatIndex = (i) => String(i + 1).padStart(2, '0');

const ProjectShowcase = () => (
  <section className="project-showcase" aria-labelledby="project-showcase-heading">
    <header className="project-showcase-intro">
      <p className="project-showcase-eyebrow">Selected work</p>
      <h2 id="project-showcase-heading" className="project-showcase-heading">
        Things I&rsquo;ve built, and why.
      </h2>
      <p className="project-showcase-lede">
        A mix of products with real users, internal tooling I got tired of re-writing, and experiments
        that turned into something. Each one has a short story &mdash; the itch that started it and the
        interesting thing I learned building it.
      </p>
    </header>

    <ol className="project-showcase-list">
      {PROJECT_STORIES.map((p, i) => {
        const href = p.url;
        const external = isExternal(href);
        const LinkComponent = href ? (external ? 'a' : Link) : null;
        const linkProps = href
          ? external
            ? { href, target: '_blank', rel: 'noopener noreferrer' }
            : { to: href }
          : null;

        return (
          <li
            key={p.id}
            className="project-entry"
            style={{ '--project-accent': p.accent }}
          >
            <div className="project-entry-grid">
              <div className="project-entry-head">
                <div className="project-entry-index">{formatIndex(i)}</div>
                <div className="project-entry-icon-wrap" aria-hidden="true">
                  {p.icon ? (
                    <img src={p.icon} alt="" className="project-entry-icon" />
                  ) : (
                    <div className="project-entry-icon project-entry-icon--placeholder">
                      <span>{p.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="project-entry-title-block">
                  <h3 className="project-entry-title">{p.name}</h3>
                  <p className="project-entry-tagline">{p.tagline}</p>
                  <p className="project-entry-role">{p.role}</p>
                </div>
                {LinkComponent && (
                  <LinkComponent className="project-entry-link" {...linkProps}>
                    <span className="project-entry-link-label">
                      {external ? 'Visit site' : 'Open'}
                    </span>
                    <span className="project-entry-link-arrow" aria-hidden="true">
                      {external ? '↗' : '→'}
                    </span>
                  </LinkComponent>
                )}
              </div>

              <div className="project-entry-body">
                {p.story.map((paragraph, idx) => (
                  <p key={idx} className="project-entry-story">{paragraph}</p>
                ))}

                {p.built?.length > 0 && (
                  <div className="project-entry-built">
                    <p className="project-entry-built-label">What I built</p>
                    <ul className="project-entry-built-list">
                      {p.built.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="project-entry-footer">
                  {p.tech?.length > 0 && (
                    <ul className="project-entry-tech" aria-label={`${p.name} technologies`}>
                      {p.tech.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                  {p.metric && (
                    <div className="project-entry-metric">
                      <div className="project-entry-metric-value">{p.metric.value}</div>
                      <div className="project-entry-metric-label">{p.metric.label}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  </section>
);

export default ProjectShowcase;
