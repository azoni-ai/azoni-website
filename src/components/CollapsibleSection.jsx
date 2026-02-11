import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/collapsible.css';

const ChevronIcon = ({ open }) => (
  <svg
    className={`collapsible-chevron ${open ? 'open' : ''}`}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CollapsibleSection = ({ title, subtitle, badge, badgeType = 'default', stats, defaultOpen = false, rightLink, rightLinkTo, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(defaultOpen ? 'auto' : '0px');

  useEffect(() => {
    if (open) {
      const el = contentRef.current;
      if (el) {
        el.style.height = 'auto';
        const fullHeight = el.scrollHeight;
        el.style.height = '0px';
        el.offsetHeight; // eslint-disable-line no-unused-expressions
        setHeight(`${fullHeight}px`);
        const timer = setTimeout(() => {
          if (contentRef.current) {
            setHeight('auto');
          }
        }, 350);
        return () => clearTimeout(timer);
      }
    } else {
      const el = contentRef.current;
      if (el) {
        const fullHeight = el.scrollHeight;
        setHeight(`${fullHeight}px`);
        el.offsetHeight; // eslint-disable-line no-unused-expressions
        requestAnimationFrame(() => {
          setHeight('0px');
        });
      }
    }
  }, [open]);

  return (
    <div className={`collapsible-section ${open ? 'is-open' : ''}`}>
      <button
        className="collapsible-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div className="collapsible-header-left">
          <div className="collapsible-header-top">
            <h2 className="collapsible-title">{title}</h2>
            {badge && (
              <span className={`collapsible-badge badge-${badgeType}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <span className="collapsible-subtitle">{subtitle}</span>
          )}
        </div>
        <div className="collapsible-header-right">
          {stats && stats.length > 0 && (
            <div className="collapsible-stats">
              {stats.map((stat, i) => (
                <div key={i} className="collapsible-stat">
                  <span className="collapsible-stat-value">{stat.value}</span>
                  <span className="collapsible-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
          {rightLink && rightLinkTo && (
            <Link
              className="collapsible-right-link"
              to={rightLinkTo}
              onClick={(e) => e.stopPropagation()}
            >
              {rightLink}
            </Link>
          )}
          <ChevronIcon open={open} />
        </div>
      </button>
      <div
        ref={contentRef}
        className="collapsible-body"
        style={{ height }}
      >
        <div className="collapsible-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;