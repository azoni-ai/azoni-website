import React from 'react';
import { CATEGORY_STYLES } from '../../utils/station-mapping';

const ArchiveRoom = ({ station, roomNumber, onClick }) => {
  const catStyle = CATEGORY_STYLES[station.category] || {};

  return (
    <div
      className="aw-station aw-station-archive"
      onClick={() => onClick?.(station)}
      style={{ '--station-color': station.color, cursor: 'pointer' }}
    >
      {/* Room number badge */}
      <div className="aw-room-badge aw-room-badge-archive">{roomNumber}</div>

      {/* Scene area — company logo */}
      <div className="aw-station-scene aw-archive-scene">
        {station.logo ? (
          <img src={station.logo} alt={station.label} className="aw-archive-logo" />
        ) : (
          <div className="aw-archive-placeholder" style={{ background: station.color }} />
        )}
      </div>

      {/* Info area */}
      <div className="aw-station-info">
        <div className="aw-station-name-row">
          <span className="aw-station-name">{station.label}</span>
          <span className="aw-cat-badge" style={{ '--cat-color': catStyle.color }}>
            {catStyle.label}
          </span>
        </div>
        <div className="aw-archive-role">{station.tagline}</div>
        {station.tech && (
          <div className="aw-archive-tech">
            {station.tech.map(t => <span key={t}>{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveRoom;
