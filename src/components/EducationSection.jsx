import React from 'react';
import { education, awards } from '../data/profile';
import '../styles/education-section.css';

const formatIndex = (i) => String(i + 1).padStart(2, '0');

const EducationSection = () => {
  if (!education?.length) return null;

  return (
    <section className="education-section" aria-labelledby="education-heading">
      <header className="education-section-intro">
        <p className="education-section-eyebrow">School &amp; honors</p>
        <h2 id="education-heading" className="education-section-heading">
          Where I learned, and what stuck.
        </h2>
      </header>

      <div className="education-grid">
        <ol className="education-list">
          {education.map((item, i) => (
            <li key={`${item.school}-${i}`} className="education-entry">
              <div className="education-entry-index">{formatIndex(i)}</div>
              <div className="education-entry-body">
                <h3 className="education-entry-degree">{item.degree}</h3>
                <p className="education-entry-school">
                  {item.school} <span className="education-entry-year">&middot; {item.year}</span>
                </p>
                {item.note && <p className="education-entry-note">{item.note}</p>}
              </div>
            </li>
          ))}
        </ol>

        {awards?.length > 0 && (
          <aside className="education-awards" aria-labelledby="awards-heading">
            <h3 id="awards-heading" className="education-awards-heading">Recognition</h3>
            <ul className="education-awards-list">
              {awards.map((a, i) => (
                <li key={`${a.event}-${i}`} className="education-awards-item">
                  <div className="education-awards-title">
                    <span className="education-awards-label">{a.title}</span>
                    <span className="education-awards-sep" aria-hidden="true">·</span>
                    <span className="education-awards-event">{a.event}</span>
                  </div>
                  {a.description && (
                    <p className="education-awards-desc">{a.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </section>
  );
};

export default EducationSection;
