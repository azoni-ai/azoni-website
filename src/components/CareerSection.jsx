import React from 'react';
import { STATION_DEFS } from '../utils/station-mapping';
import '../styles/career-section.css';

const careerEntries = STATION_DEFS.filter((s) => s.category === 'career');

const formatIndex = (i) => String(i + 1).padStart(2, '0');

const CareerSection = () => {
  if (!careerEntries.length) return null;

  return (
    <section className="career-section" aria-labelledby="career-heading">
      <header className="career-section-intro">
        <p className="career-section-eyebrow">Before the solo run</p>
        <h2 id="career-heading" className="career-section-heading">
          Where I worked, and what I shipped there.
        </h2>
      </header>

      <ol className="career-list">
        {careerEntries.map((role, i) => (
          <li
            key={role.id}
            className="career-entry"
            style={{ '--role-color': role.color }}
          >
            <div className="career-entry-index">{formatIndex(i)}</div>

            <div className="career-entry-body">
              <header className="career-entry-header">
                {role.logo ? (
                  <img
                    src={role.logo}
                    alt={`${role.label} logo`}
                    className="career-entry-logo"
                  />
                ) : (
                  <div
                    className="career-entry-logo career-entry-logo--placeholder"
                    aria-hidden="true"
                  />
                )}
                <div className="career-entry-identity">
                  <h3 className="career-entry-company">{role.label}</h3>
                  <p className="career-entry-role">{role.tagline}</p>
                </div>
              </header>

              {role.desc && <p className="career-entry-desc">{role.desc}</p>}

              {role.tech?.length > 0 && (
                <ul className="career-entry-tech" aria-label={`${role.label} technologies`}>
                  {role.tech.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default CareerSection;
