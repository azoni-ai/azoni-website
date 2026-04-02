import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { STATION_DEFS, DOMAIN_TO_STATION, CATEGORY_STYLES } from '../../utils/station-mapping';
import { useAgentActivity } from '../../hooks/useAgentActivity';
import { useMCPHealth } from '../../hooks/useMCPHealth';
import usePlayerMovement from './usePlayerMovement';
import {
  TILE_SIZE, WORLD_W, WORLD_H, BUILDINGS, PATHS, DECORATIONS,
  ZONE_LABELS, WELCOME_SIGN, PLAYER_START,
} from './townLayout';
import './pixel-town.css';

const stationById = Object.fromEntries(STATION_DEFS.map(s => [s.id, s]));

const BUILDING_SVG = {
  'town-hall': '/town/buildings/town-hall.svg',
  'library': '/town/buildings/library.svg',
  'info-booth': '/town/buildings/info-booth.svg',
  'cafe': '/town/buildings/cafe.svg',
  'gym': '/town/buildings/gym.svg',
  'apothecary': '/town/buildings/apothecary.svg',
  'card-shop': '/town/buildings/card-shop.svg',
  'boathouse': '/town/buildings/boathouse.svg',
  'wizard-tower': '/town/buildings/wizard-tower.svg',
  'post-office': '/town/buildings/post-office.svg',
  'power-station': '/town/buildings/power-station.svg',
  'clinic': '/town/buildings/clinic.svg',
  'rocket-pad': '/town/buildings/rocket-pad.svg',
  'office-tower': '/town/buildings/office-tower.svg',
  'bank': '/town/buildings/bank.svg',
  'trading-post': '/town/buildings/trading-post.svg',
  'university': '/town/buildings/university.svg',
  'notice-board': '/town/buildings/clinic.svg',
};

const PLAYER_SPRITES = {
  down: '/town/characters/player-down.svg',
  up: '/town/characters/player-up.svg',
  left: '/town/characters/player-left.svg',
  right: '/town/characters/player-right.svg',
};

const DECORATION_SVG = {
  'tree-1': '/town/decorations/tree-1.svg',
  'tree-2': '/town/decorations/tree-2.svg',
  'flower-1': '/town/decorations/flower-1.svg',
  'flower-2': '/town/decorations/flower-2.svg',
  'lamp-post': '/town/decorations/lamp-post.svg',
  'bench': '/town/decorations/bench.svg',
  'fountain': '/town/decorations/fountain.svg',
};

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// ─── In-game detail panel (right side) ───
function InGameDetailPanel({ station, activityCounts, onClose }) {
  const cat = CATEGORY_STYLES[station.category];
  const isArchive = station.isArchive;
  const counts = activityCounts || {};

  return (
    <div className="town-detail-panel" onClick={(e) => e.stopPropagation()}>
      <button className="town-detail-close" onClick={onClose}>×</button>
      <div className="town-detail-header">
        {station.logo && <img src={station.logo} alt="" className="town-detail-logo" />}
        <div>
          <h3 className="town-detail-name">{station.label}</h3>
          {cat && <span className="town-detail-cat" style={{ color: cat.color }}>{cat.label}</span>}
        </div>
      </div>
      <div className="town-detail-tagline">{station.tagline}</div>
      <p className="town-detail-desc">{station.desc}</p>
      {!isArchive && (counts.h1 > 0 || counts.h24 > 0) && (
        <div className="town-detail-stats">
          {counts.h1 > 0 && <span>{counts.h1} /1h</span>}
          {counts.h24 > 0 && <span>{counts.h24} /24h</span>}
        </div>
      )}
      {(station.tech || []).length > 0 && (
        <div className="town-detail-tech">
          {station.tech.map(t => <span key={t} style={{ borderColor: `${station.color}40` }}>{t}</span>)}
        </div>
      )}
      <div className="town-detail-actions">
        {station.url && (
          station.url.startsWith('http') ? (
            <a href={station.url} target="_blank" rel="noopener noreferrer" className="town-detail-btn" style={{ background: station.color }}>Visit ↗</a>
          ) : (
            <Link to={station.url} className="town-detail-btn" style={{ background: station.color }}>Visit</Link>
          )
        )}
        {isArchive && (
          <Link to="/resume" className="town-detail-btn town-detail-btn-secondary">Resume</Link>
        )}
      </div>
    </div>
  );
}

// ─── In-game chat box (bottom-left, MMO style) ───
function GameChatBox({ githubStats }) {
  const [collapsed, setCollapsed] = useState(false);
  const commits = githubStats?.recentCommits?.slice(0, 8) || [];

  return (
    <div className={`town-chatbox${collapsed ? ' town-chatbox--collapsed' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="town-chatbox-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="town-chatbox-title">Activity</span>
        <div className="town-chatbox-stats">
          <span><strong>{githubStats?.today || 0}</strong> today</span>
          <span><strong>{githubStats?.last7Days || 0}</strong> wk</span>
          <span><strong>{githubStats?.last30Days || 0}</strong> mo</span>
        </div>
        <button className="town-chatbox-toggle">{collapsed ? '▲' : '▼'}</button>
      </div>
      {!collapsed && (
        <div className="town-chatbox-messages">
          {commits.map((c, i) => (
            <div key={`${c.sha}-${i}`} className="town-chat-msg">
              <span className="town-chat-time">{formatTimeAgo(c.timestamp)}</span>
              <span className="town-chat-text">{c.message}</span>
              <span className="town-chat-repo">{c.repo}</span>
              {c.claudeCode && <span className="town-chat-badge">Claude</span>}
            </div>
          ))}
          {commits.length === 0 && (
            <div className="town-chat-msg town-chat-empty">No recent activity</div>
          )}
          <div className="town-chatbox-links">
            <Link to="/commits">all commits →</Link>
            <Link to="/activity">activity log →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PixelTown({ appStats, githubStats, profile }) {
  const viewportRef = useRef(null);
  const [viewportSize, setViewportSize] = useState({ w: 1200, h: 700 });
  const [selectedStation, setSelectedStation] = useState(null);

  const { activityCounts } = useAgentActivity();
  const { health } = useMCPHealth();
  const { dir, isMoving, reachedBuilding, clearReachedBuilding, moveTo, pixelPos } = usePlayerMovement(PLAYER_START.x, PLAYER_START.y);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setViewportSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cameraX = Math.min(0, Math.max(-(WORLD_W - viewportSize.w), -(pixelPos.x - viewportSize.w / 2 + TILE_SIZE / 2)));
  const cameraY = Math.min(0, Math.max(-(WORLD_H - viewportSize.h), -(pixelPos.y - viewportSize.h / 2 + TILE_SIZE / 2)));

  useEffect(() => {
    if (reachedBuilding) {
      const station = stationById[reachedBuilding];
      if (station) setSelectedStation(station);
      clearReachedBuilding();
    }
  }, [reachedBuilding, clearReachedBuilding]);

  const handleWorldClick = useCallback((e) => {
    if (e.target.closest('.town-detail-panel') || e.target.closest('.town-chatbox')) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = e.clientX - rect.left - cameraX;
    const worldY = e.clientY - rect.top - cameraY;
    moveTo(Math.floor(worldX / TILE_SIZE), Math.floor(worldY / TILE_SIZE));
  }, [cameraX, cameraY, moveTo]);

  const handleBuildingClick = useCallback((building, e) => {
    e.stopPropagation();
    moveTo(building.entrance.x, building.entrance.y);
  }, [moveTo]);

  const getStatusColor = (stationId) => {
    const ds = Object.entries(DOMAIN_TO_STATION).filter(([, v]) => v === stationId).map(([d]) => d);
    if (!ds.length || !health) return '#6b6b65';
    if (ds.some(d => health[d] === false)) return '#f87171';
    if (ds.every(d => health[d] === true)) return '#4ade80';
    return '#6b6b65';
  };

  return (
    <div
      ref={viewportRef}
      className="pixel-town-viewport"
      tabIndex={0}
      onClick={handleWorldClick}
    >
      {/* World */}
      <div
        className="pixel-town-world"
        style={{ width: WORLD_W, height: WORLD_H, transform: `translate(${cameraX}px, ${cameraY}px)` }}
      >
        <div className="pixel-town-ground" />

        {PATHS.map((p, i) => (
          <div key={`path-${i}`} className="pixel-town-path" style={{ left: p.x * TILE_SIZE, top: p.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }} />
        ))}

        <div className="pixel-town-welcome" style={{ left: WELCOME_SIGN.x * TILE_SIZE, top: WELCOME_SIGN.y * TILE_SIZE, width: WELCOME_SIGN.w * TILE_SIZE, height: WELCOME_SIGN.h * TILE_SIZE }}>
          <div className="pixel-town-welcome-name">{profile?.name || 'Charlton Smith'}</div>
          <div className="pixel-town-welcome-title">Senior Software Engineer · AI Systems</div>
        </div>

        {ZONE_LABELS.map((z, i) => (
          <div key={`zone-${i}`} className="pixel-town-zone-label" style={{ left: z.x * TILE_SIZE, top: z.y * TILE_SIZE, color: z.color }}>{z.text}</div>
        ))}

        {DECORATIONS.map((d, i) => {
          const src = DECORATION_SVG[d.type];
          if (!src) return null;
          const isTree = d.type.startsWith('tree');
          const isFountain = d.type === 'fountain';
          const isFlower = d.type.startsWith('flower');
          const size = isFountain ? TILE_SIZE * 2 : isTree ? TILE_SIZE * 1.5 : isFlower ? TILE_SIZE * 0.5 : TILE_SIZE;
          return (
            <div key={`deco-${i}`} className="pixel-town-decoration" style={{ left: d.x * TILE_SIZE, top: d.y * TILE_SIZE - (isTree ? TILE_SIZE : 0), width: size, height: size * 1.2 }}>
              <img src={src} alt="" width={size} height={size * 1.2} />
            </div>
          );
        })}

        {BUILDINGS.map((b) => {
          const station = stationById[b.id];
          if (!station) return null;
          return (
            <div key={b.id} className="pixel-town-building" style={{ left: b.x * TILE_SIZE, top: b.y * TILE_SIZE, width: b.w * TILE_SIZE, height: b.h * TILE_SIZE }} onClick={(e) => handleBuildingClick(b, e)}>
              <img src={BUILDING_SVG[b.type] || ''} alt={station.label} />
              <span className="pixel-town-building-label">{station.label}</span>
              <span className="pixel-town-building-status" style={{ background: getStatusColor(b.id) }} />
            </div>
          );
        })}

        <div className={`pixel-town-player${isMoving ? ' pixel-town-player--walking' : ''}`} style={{ left: pixelPos.x, top: pixelPos.y, width: TILE_SIZE, height: TILE_SIZE * 1.25 }}>
          <img src={PLAYER_SPRITES[dir]} alt="player" />
        </div>
      </div>

      {/* HUD: Chat box (bottom-left) */}
      <GameChatBox githubStats={githubStats} />

      {/* HUD: Detail panel (right side) */}
      {selectedStation && (
        <InGameDetailPanel
          station={selectedStation}
          activityCounts={activityCounts[selectedStation.id]}
          onClose={() => setSelectedStation(null)}
        />
      )}

      <div className="pixel-town-hint">WASD or click to explore</div>
    </div>
  );
}

export default PixelTown;
