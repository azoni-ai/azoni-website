import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PROJECT_STORIES } from '../data/project-stories';
import '../styles/project-showcase.css';

const isExternal = (href) => href && /^https?:\/\//i.test(href);
const formatIndex = (i) => String(i + 1).padStart(2, '0');

const TOTAL = PROJECT_STORIES.length;

const formatCount = (n) => {
  if (!Number.isFinite(n)) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString();
};

// Map project id → (appStats) → { value, label, live: true }
const LIVE_METRIC_RESOLVERS = {
  fabstats: (s) => {
    const n = s?.fabstats?.matches;
    return Number.isFinite(n) && n > 0
      ? { value: formatCount(n), label: 'matches tracked', live: true }
      : null;
  },
  rowcrew: (s) => {
    const km = s?.rowcrew?.kilometers;
    return Number.isFinite(km) && km > 0
      ? { value: `${km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`, label: 'rowed collectively', live: true }
      : null;
  },
  benchpress: (s) => {
    const n = s?.benchpressonly?.workoutsLogged;
    return Number.isFinite(n) && n > 0
      ? { value: formatCount(n), label: 'workouts logged', live: true }
      : null;
  },
  oldwaystoday: (s) => {
    const n = s?.oldwaystoday?.requests;
    return Number.isFinite(n) && n > 0
      ? { value: formatCount(n), label: 'chatbot requests', live: true }
      : null;
  },
};

const resolveMetric = (project, appStats) => {
  const resolver = LIVE_METRIC_RESOLVERS[project.id];
  if (resolver) {
    const live = resolver(appStats);
    if (live) return live;
  }
  return project.metric ? { ...project.metric, live: false } : null;
};

// Extend the list with a copy at each end so peeks always show something,
// and so we can seamlessly wrap (classic cloned-edges infinite carousel).
const EXTENDED_PROJECTS = [
  ...PROJECT_STORIES,
  ...PROJECT_STORIES,
  ...PROJECT_STORIES,
];

const ProjectSlide = ({ project, realIndex, isActive, onClick, metric }) => {
  const href = project.url;
  const external = isExternal(href);
  const LinkComponent = href ? (external ? 'a' : Link) : null;
  const linkProps = href
    ? external
      ? { href, target: '_blank', rel: 'noopener noreferrer' }
      : { to: href }
    : null;

  return (
    <article
      className={`project-carousel-slide${isActive ? ' is-active' : ''}`}
      style={{ '--project-accent': project.accent }}
      aria-hidden={!isActive}
      onClick={isActive ? undefined : onClick}
    >
      <div className="project-entry-grid">
        <div className="project-entry-head">
          <div className="project-entry-index">{formatIndex(realIndex)}</div>
          <div className="project-entry-icon-wrap" aria-hidden="true">
            {project.icon ? (
              <img src={project.icon} alt="" className="project-entry-icon" />
            ) : (
              <div className="project-entry-icon project-entry-icon--placeholder">
                <span>{project.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="project-entry-title-block">
            <h3 className="project-entry-title">{project.name}</h3>
            <p className="project-entry-tagline">{project.tagline}</p>
            <p className="project-entry-role">{project.role}</p>
          </div>
          {LinkComponent && (
            <LinkComponent
              className="project-entry-link"
              tabIndex={isActive ? 0 : -1}
              {...linkProps}
            >
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
          {project.story.map((paragraph, idx) => (
            <p key={idx} className="project-entry-story">{paragraph}</p>
          ))}

          {project.built?.length > 0 && (
            <div className="project-entry-built">
              <p className="project-entry-built-label">What I built</p>
              <ul className="project-entry-built-list">
                {project.built.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="project-entry-footer">
            {project.tech?.length > 0 && (
              <ul className="project-entry-tech" aria-label={`${project.name} technologies`}>
                {project.tech.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
            {metric && (
              <div className={`project-entry-metric${metric.live ? ' project-entry-metric--live' : ''}`}>
                <div className="project-entry-metric-value">{metric.value}</div>
                <div className="project-entry-metric-label">
                  {metric.live && (
                    <span className="project-entry-metric-dot" aria-label="Live" />
                  )}
                  {metric.label}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const ProjectShowcase = ({ appStats }) => {
  // Start in the middle copy so peeks work on both sides immediately.
  const [trackIdx, setTrackIdx] = useState(TOTAL);
  const [animate, setAnimate] = useState(true);
  const trackRef = useRef(null);
  const viewportRef = useRef(null);
  const prevActiveRef = useRef(null);

  const activeIdx = ((trackIdx % TOTAL) + TOTAL) % TOTAL;

  // When the active project changes (via prev/next/tab/keyboard), scroll the
  // carousel viewport so the top of the active card is visible. Without this,
  // visitors who scroll to the bottom of one card and click 'Next' end up
  // looking at the bottom of the next one.
  useEffect(() => {
    if (prevActiveRef.current === null) {
      prevActiveRef.current = activeIdx;
      return;
    }
    if (prevActiveRef.current === activeIdx) return;
    prevActiveRef.current = activeIdx;

    const node = viewportRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    // Only scroll if the active card top is currently above the navbar or
    // the user has scrolled past the viewport entirely. This avoids jumping
    // when the card is already visible at the top.
    const navbarHeight = 96;
    if (rect.top < navbarHeight - 4 || rect.top > window.innerHeight) {
      const targetY = window.scrollY + rect.top - navbarHeight - 16;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  }, [activeIdx]);

  const step = useCallback((dir) => {
    setAnimate(true);
    setTrackIdx((prev) => prev + dir);
  }, []);

  const goPrev = useCallback(() => step(-1), [step]);
  const goNext = useCallback(() => step(1), [step]);

  const goToReal = useCallback((real) => {
    setAnimate(true);
    setTrackIdx((prev) => {
      const currentReal = ((prev % TOTAL) + TOTAL) % TOTAL;
      // Shortest-path choice: move just enough to land on the target real idx.
      let delta = real - currentReal;
      if (delta > TOTAL / 2) delta -= TOTAL;
      if (delta < -TOTAL / 2) delta += TOTAL;
      return prev + delta;
    });
  }, []);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  // When we drift into the outer copies (copy 0 or copy 2), silently snap
  // back to the equivalent position in the middle copy after the slide
  // transition finishes. This is what makes the loop seamless.
  const handleTransitionEnd = (e) => {
    if (e.target !== trackRef.current) return;
    if (trackIdx < TOTAL || trackIdx >= 2 * TOTAL) {
      setAnimate(false);
      setTrackIdx(TOTAL + activeIdx);
    }
  };

  // Re-enable animation after the instant snap.
  useEffect(() => {
    if (animate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  return (
    <section className="project-showcase" aria-labelledby="project-showcase-heading">
      <div className="project-showcase-container">
        <header className="project-showcase-intro">
          <h2 id="project-showcase-heading" className="project-showcase-heading">
            Projects
          </h2>
          <p className="project-showcase-lede">
            Live products, internal tools, and a few experiments. Click through for the story
            behind each one.
          </p>
        </header>

        <nav className="project-carousel-nav" aria-label="Projects">
          <ol className="project-carousel-tabs">
            {PROJECT_STORIES.map((proj, i) => (
              <li key={proj.id}>
                <button
                  type="button"
                  className={`project-carousel-tab${i === activeIdx ? ' is-active' : ''}`}
                  style={{ '--tab-accent': proj.accent }}
                  onClick={() => goToReal(i)}
                  aria-current={i === activeIdx ? 'true' : undefined}
                  aria-label={`${proj.name}: project ${i + 1} of ${TOTAL}`}
                >
                  <span className="project-carousel-tab-num">{formatIndex(i)}</span>
                  <span className="project-carousel-tab-name">{proj.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="project-carousel-viewport" aria-roledescription="carousel" ref={viewportRef}>
        <button
          type="button"
          className="project-carousel-edge project-carousel-edge--prev"
          onClick={goPrev}
          aria-label="Previous project"
        >
          <span aria-hidden="true">←</span>
        </button>

        <div
          ref={trackRef}
          className={`project-carousel-track${animate ? '' : ' is-instant'}`}
          style={{ '--track-idx': trackIdx }}
          onTransitionEnd={handleTransitionEnd}
        >
          {EXTENDED_PROJECTS.map((proj, extIdx) => {
            const realIdx = extIdx % TOTAL;
            return (
              <ProjectSlide
                key={extIdx}
                project={proj}
                realIndex={realIdx}
                isActive={extIdx === trackIdx}
                onClick={() => setTrackIdx(extIdx)}
                metric={resolveMetric(proj, appStats)}
              />
            );
          })}
        </div>

        <button
          type="button"
          className="project-carousel-edge project-carousel-edge--next"
          onClick={goNext}
          aria-label="Next project"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="project-showcase-container">
        <div className="project-carousel-controls">
          <button
            type="button"
            className="project-carousel-btn"
            onClick={goPrev}
            aria-label="Previous project"
          >
            <span aria-hidden="true">←</span>
            <span>Previous</span>
          </button>

          <div className="project-carousel-counter" aria-live="polite">
            <span className="project-carousel-counter-current">{formatIndex(activeIdx)}</span>
            <span className="project-carousel-counter-sep">/</span>
            <span className="project-carousel-counter-total">{String(TOTAL).padStart(2, '0')}</span>
            <span className="project-carousel-counter-hint">Use ← → keys</span>
          </div>

          <button
            type="button"
            className="project-carousel-btn"
            onClick={goNext}
            aria-label="Next project"
          >
            <span>Next</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProjectShowcase;
