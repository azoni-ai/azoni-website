import React from 'react';

const BuildingFacade = ({ profile }) => (
  <div className="aw-facade" style={{ gridColumn: '1 / -1', gridRow: 1 }}>
    <div className="aw-facade-content">
      <h1 className="aw-facade-name">{profile?.name || 'Charlton Smith'}</h1>
      <p className="aw-facade-title">{profile?.tagline || 'Senior Software Engineer · AI Systems in Production'}</p>
      <div className="aw-facade-meta">
        <span>M.S. Software Engineering</span>
        <span className="aw-facade-dot">·</span>
        <span>Previously Capital One, T-Mobile</span>
        <span className="aw-facade-dot">·</span>
        <span>Co-founded OLI Fitness</span>
      </div>
    </div>
  </div>
);

export default BuildingFacade;
