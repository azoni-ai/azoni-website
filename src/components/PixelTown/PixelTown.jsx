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

// ─── In-game detail panel (centered modal) ───
function InGameDetailPanel({ station, activityCounts, stationHistory, visitCount, appStats, health, onClose }) {
  const cat = CATEGORY_STYLES[station.category];
  const isArchive = station.isArchive;
  const counts = activityCounts || {};
  const [tab, setTab] = useState('activity');
  const events = (stationHistory || []).filter(e => e.type !== 'site_visit' && e.type !== 'error_logged' && e.type !== 'page_view_summary').slice(0, 10);
  const errors = (stationHistory || []).filter(e => e.type === 'error_logged');

  // Status
  const ds = Object.entries(DOMAIN_TO_STATION).filter(([, v]) => v === station.id).map(([d]) => d);
  const mcpStatus = ds.length && health ? (ds.some(d => health[d] === false) ? false : ds.every(d => health[d] === true) ? true : null) : null;
  const statusText = mcpStatus === true ? 'online' : mcpStatus === false ? 'offline' : 'connected';
  const statusColor = mcpStatus === true ? '#4ade80' : mcpStatus === false ? '#f87171' : '#6b6b65';
  const isExternal = station.url && station.url.startsWith('http');

  // App-specific live stats
  const liveStats = [];
  if (station.id === 'fab' && appStats?.fabstats) {
    if (appStats.fabstats.users > 0) liveStats.push({ val: Number(appStats.fabstats.users).toLocaleString(), label: 'players' });
    if (appStats.fabstats.matches > 0) liveStats.push({ val: Number(appStats.fabstats.matches).toLocaleString(), label: 'matches' });
  }
  if (station.id === 'benchpress' && appStats?.benchpressonly) {
    const bp = appStats.benchpressonly;
    if (Number(bp.users) > 0) liveStats.push({ val: Number(bp.users).toLocaleString(), label: 'users' });
    if (Number(bp.workoutsLogged) > 0) liveStats.push({ val: Number(bp.workoutsLogged).toLocaleString(), label: 'workouts' });
  }
  if (station.id === 'rowcrew' && appStats?.rowcrew) {
    const rc = appStats.rowcrew;
    if (Number(rc.users || rc.totalUsers) > 0) liveStats.push({ val: Number(rc.users || rc.totalUsers).toLocaleString(), label: 'rowers' });
    if (Number(rc.meters) > 0) liveStats.push({ val: Number(rc.meters).toLocaleString(), label: 'meters' });
  }

  return (
    <div className="town-detail-panel" onClick={(e) => e.stopPropagation()}>
      <button className="town-detail-close" onClick={onClose}>×</button>

      {/* Header */}
      <div className="town-detail-header">
        {station.logo ? (
          <img src={station.logo} alt="" className="town-detail-logo" />
        ) : (
          <span className="town-detail-dot" style={{ background: station.color }} />
        )}
        <div>
          <h3 className="town-detail-name">{station.label}</h3>
          {cat && <span className="town-detail-cat" style={{ color: cat.color }}>{cat.label}</span>}
        </div>
      </div>

      <div className="town-detail-tagline">{station.tagline}</div>
      <p className="town-detail-desc">{station.desc}</p>

      {/* Status + visit */}
      <div className="town-detail-status-row">
        {!isArchive && (
          <div className="town-detail-status">
            <span className="town-detail-status-dot" style={{ background: statusColor }} />
            {statusText}
          </div>
        )}
        <div className="town-detail-action-btns">
          {station.url && (
            isExternal ? (
              <a href={station.url} target="_blank" rel="noopener noreferrer" className="town-detail-btn" style={{ background: station.color }}>Visit ↗</a>
            ) : (
              <Link to={station.url} className="town-detail-btn" style={{ background: station.color }}>Visit</Link>
            )
          )}
          {isArchive && <Link to="/resume" className="town-detail-btn town-detail-btn-secondary">Resume</Link>}
        </div>
      </div>

      {/* Tech chips */}
      {(station.tech || []).length > 0 && (
        <div className="town-detail-tech">
          {station.tech.map(t => <span key={t} style={{ borderColor: `${station.color}40` }}>{t}</span>)}
        </div>
      )}

      {/* Tabs (only for non-archive stations) */}
      {!isArchive && (
        <>
          <div className="town-detail-tabs">
            <button className={`town-detail-tab${tab === 'activity' ? ' active' : ''}`} onClick={() => setTab('activity')}>Activity</button>
            <button className={`town-detail-tab${tab === 'about' ? ' active' : ''}`} onClick={() => setTab('about')}>About</button>
          </div>

          <div className="town-detail-tab-content">
            {tab === 'activity' && (
              <>
                {/* Activity stats */}
                <div className="town-detail-stat-grid">
                  <div className="town-detail-stat-card" style={{ borderColor: `${station.color}30` }}>
                    <div className="town-detail-stat-num" style={{ color: station.color }}>{counts.h1 || 0}</div>
                    <div className="town-detail-stat-label">last hour</div>
                  </div>
                  <div className="town-detail-stat-card" style={{ borderColor: `${station.color}30` }}>
                    <div className="town-detail-stat-num" style={{ color: station.color }}>{counts.h24 || 0}</div>
                    <div className="town-detail-stat-label">last 24h</div>
                  </div>
                  {(visitCount || 0) > 0 && (
                    <div className="town-detail-stat-card" style={{ borderColor: `${station.color}30` }}>
                      <div className="town-detail-stat-num" style={{ color: station.color }}>{visitCount}</div>
                      <div className="town-detail-stat-label">visits</div>
                    </div>
                  )}
                </div>

                {/* Live app stats */}
                {liveStats.length > 0 && (
                  <div className="town-detail-section">
                    <div className="town-detail-section-title">Live Stats</div>
                    <div className="town-detail-stat-grid">
                      {liveStats.map((s, i) => (
                        <div key={i} className="town-detail-stat-card" style={{ borderColor: `${station.color}30` }}>
                          <div className="town-detail-stat-num" style={{ color: station.color }}>{s.val}</div>
                          <div className="town-detail-stat-label">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent events */}
                <div className="town-detail-section">
                  <div className="town-detail-section-title">Recent Events</div>
                  {events.length > 0 ? (
                    <div className="town-detail-events">
                      {events.map((evt, i) => (
                        <div key={i} className="town-detail-event">
                          <span className="town-detail-event-text">{evt.title || evt.type}</span>
                          <span className="town-detail-event-time">{formatTimeAgo(evt.ms || evt.receivedAt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="town-detail-empty">No events recorded yet</div>
                  )}
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                  <div className="town-detail-section">
                    <div className="town-detail-section-title" style={{ color: '#f87171' }}>Errors ({errors.length})</div>
                    <div className="town-detail-events">
                      {errors.slice(0, 5).map((err, i) => (
                        <div key={i} className="town-detail-event town-detail-event--error">
                          <span className="town-detail-event-text">{err.title || err.description || err.type}</span>
                          <span className="town-detail-event-time">{formatTimeAgo(err.ms || err.receivedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'about' && (
              <div className="town-detail-about">
                <p>{station.desc}</p>
                {station.actions && (
                  <div className="town-detail-actions-list">
                    {station.actions.map((a, i) => <span key={i}>{a}</span>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
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
        <span className="town-chatbox-title">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          Commits
        </span>
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

  const { stationHistory, activityCounts } = useAgentActivity();
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

  // Scale world to fit viewport width if needed
  const worldScale = Math.min(1, viewportSize.w / WORLD_W);
  const scaledW = WORLD_W * worldScale;
  const scaledH = WORLD_H * worldScale;
  const scaledTile = TILE_SIZE * worldScale;
  const scaledPlayerX = pixelPos.x * worldScale;
  const scaledPlayerY = pixelPos.y * worldScale;

  const cameraX = Math.min(0, Math.max(-(scaledW - viewportSize.w), -(scaledPlayerX - viewportSize.w / 2 + scaledTile / 2)));
  const cameraY = Math.min(0, Math.max(-(scaledH - viewportSize.h), -(scaledPlayerY - viewportSize.h / 2 + scaledTile / 2)));

  useEffect(() => {
    if (reachedBuilding) {
      const station = stationById[reachedBuilding];
      if (station) setSelectedStation(station);
      clearReachedBuilding();
    }
  }, [reachedBuilding, clearReachedBuilding]);

  const handleWorldClick = useCallback((e) => {
    if (e.target.closest('.town-detail-panel') || e.target.closest('.town-chatbox') || e.target.closest('.town-detail-backdrop')) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = (e.clientX - rect.left - cameraX) / worldScale;
    const worldY = (e.clientY - rect.top - cameraY) / worldScale;
    moveTo(Math.floor(worldX / TILE_SIZE), Math.floor(worldY / TILE_SIZE));
  }, [cameraX, cameraY, moveTo, worldScale]);

  const isMobile = viewportSize.w <= 900;

  const handleBuildingClick = useCallback((building, e) => {
    e.stopPropagation();
    if (isMobile) {
      const station = stationById[building.id];
      if (station) setSelectedStation(station);
    } else {
      moveTo(building.entrance.x, building.entrance.y);
    }
  }, [moveTo, isMobile]);

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
        style={{
          width: WORLD_W,
          height: WORLD_H,
          transform: `translate(${cameraX}px, ${cameraY}px) scale(${worldScale})`,
          transformOrigin: '0 0',
        }}
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

      {/* HUD: Detail panel (centered modal) */}
      {selectedStation && (
        <>
          <div className="town-detail-backdrop" onClick={() => setSelectedStation(null)} />
          <InGameDetailPanel
            station={selectedStation}
            activityCounts={activityCounts[selectedStation.id]}
            stationHistory={stationHistory[selectedStation.id]}
            appStats={appStats}
            health={health}
            onClose={() => setSelectedStation(null)}
          />
        </>
      )}

      <div className="pixel-town-hint">WASD or click to explore</div>
    </div>
  );
}

export default PixelTown;
