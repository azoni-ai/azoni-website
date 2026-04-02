import React, { useState, useEffect, useCallback, useRef } from 'react';
import { STATION_DEFS, DOMAIN_TO_STATION } from '../../utils/station-mapping';
import { useAgentActivity } from '../../hooks/useAgentActivity';
import { useMCPHealth } from '../../hooks/useMCPHealth';
import StationDetailPanel from '../AgentWorkspace/StationDetailPanel';
import usePlayerMovement from './usePlayerMovement';
import {
  TILE_SIZE, WORLD_W, WORLD_H, BUILDINGS, PATHS, DECORATIONS,
  ZONE_LABELS, WELCOME_SIGN, PLAYER_START,
} from './townLayout';
import './pixel-town.css';

const stationById = Object.fromEntries(STATION_DEFS.map(s => [s.id, s]));

// Map building type to SVG filename
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
  'notice-board': '/town/buildings/clinic.svg', // reuse for now
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

function PixelTown({ appStats, githubStats, profile }) {
  const viewportRef = useRef(null);
  const [viewportSize, setViewportSize] = useState({ w: 1200, h: 700 });
  const [selectedStation, setSelectedStation] = useState(null);

  // Live data hooks
  const { stationHistory, activityCounts } = useAgentActivity();
  const { health } = useMCPHealth();

  // Player movement
  const { pos, dir, isMoving, reachedBuilding, clearReachedBuilding, moveTo, pixelPos } = usePlayerMovement(PLAYER_START.x, PLAYER_START.y);

  // Update viewport size
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setViewportSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Camera: center on player
  const cameraX = Math.min(0, Math.max(-(WORLD_W - viewportSize.w), -(pixelPos.x - viewportSize.w / 2 + TILE_SIZE / 2)));
  const cameraY = Math.min(0, Math.max(-(WORLD_H - viewportSize.h), -(pixelPos.y - viewportSize.h / 2 + TILE_SIZE / 2)));

  // When player reaches a building, open its detail panel
  useEffect(() => {
    if (reachedBuilding) {
      const station = stationById[reachedBuilding];
      if (station) setSelectedStation(station);
      clearReachedBuilding();
    }
  }, [reachedBuilding, clearReachedBuilding]);

  // Click on world: move player there
  const handleWorldClick = useCallback((e) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = e.clientX - rect.left - cameraX;
    const worldY = e.clientY - rect.top - cameraY;
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    moveTo(tileX, tileY);
  }, [cameraX, cameraY, moveTo]);

  // Click on building: move to entrance
  const handleBuildingClick = useCallback((building, e) => {
    e.stopPropagation();
    moveTo(building.entrance.x, building.entrance.y);
  }, [moveTo]);

  // Get station status color
  const getStatusColor = (stationId) => {
    const ds = Object.entries(DOMAIN_TO_STATION).filter(([, v]) => v === stationId).map(([d]) => d);
    if (!ds.length || !health) return '#6b6b65'; // gray
    if (ds.some(d => health[d] === false)) return '#f87171'; // red
    if (ds.every(d => health[d] === true)) return '#4ade80'; // green
    return '#6b6b65';
  };

  return (
    <>
      <div
        ref={viewportRef}
        className="pixel-town-viewport"
        tabIndex={0}
        onClick={handleWorldClick}
      >
        <div
          className="pixel-town-world"
          style={{
            width: WORLD_W,
            height: WORLD_H,
            transform: `translate(${cameraX}px, ${cameraY}px)`,
          }}
        >
          {/* Ground */}
          <div className="pixel-town-ground" />

          {/* Path tiles */}
          {PATHS.map((p, i) => (
            <div
              key={`path-${i}`}
              className="pixel-town-path"
              style={{
                left: p.x * TILE_SIZE,
                top: p.y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
            />
          ))}

          {/* Welcome sign */}
          <div
            className="pixel-town-welcome"
            style={{
              left: WELCOME_SIGN.x * TILE_SIZE,
              top: WELCOME_SIGN.y * TILE_SIZE,
              width: WELCOME_SIGN.w * TILE_SIZE,
              height: WELCOME_SIGN.h * TILE_SIZE,
            }}
          >
            <div className="pixel-town-welcome-name">{profile?.name || 'Charlton Smith'}</div>
            <div className="pixel-town-welcome-title">Senior Software Engineer · AI Systems</div>
          </div>

          {/* Zone labels */}
          {ZONE_LABELS.map((z, i) => (
            <div
              key={`zone-${i}`}
              className="pixel-town-zone-label"
              style={{
                left: z.x * TILE_SIZE,
                top: z.y * TILE_SIZE,
                color: z.color,
              }}
            >
              {z.text}
            </div>
          ))}

          {/* Decorations */}
          {DECORATIONS.map((d, i) => {
            const src = DECORATION_SVG[d.type];
            if (!src) return null;
            const isTree = d.type.startsWith('tree');
            const isFlower = d.type.startsWith('flower');
            const isFountain = d.type === 'fountain';
            const size = isFountain ? TILE_SIZE * 2 : isTree ? TILE_SIZE * 1.5 : isFlower ? TILE_SIZE * 0.5 : TILE_SIZE;
            return (
              <div
                key={`deco-${i}`}
                className="pixel-town-decoration"
                style={{
                  left: d.x * TILE_SIZE,
                  top: d.y * TILE_SIZE - (isTree ? TILE_SIZE : 0),
                  width: size,
                  height: size * 1.2,
                }}
              >
                <img src={src} alt="" width={size} height={size * 1.2} />
              </div>
            );
          })}

          {/* Buildings */}
          {BUILDINGS.map((b) => {
            const station = stationById[b.id];
            if (!station) return null;
            return (
              <div
                key={b.id}
                className="pixel-town-building"
                style={{
                  left: b.x * TILE_SIZE,
                  top: b.y * TILE_SIZE,
                  width: b.w * TILE_SIZE,
                  height: b.h * TILE_SIZE,
                }}
                onClick={(e) => handleBuildingClick(b, e)}
              >
                <img src={BUILDING_SVG[b.type] || ''} alt={station.label} />
                <span className="pixel-town-building-label">{station.label}</span>
                <span
                  className="pixel-town-building-status"
                  style={{ background: getStatusColor(b.id) }}
                />
              </div>
            );
          })}

          {/* Player character */}
          <div
            className={`pixel-town-player${isMoving ? ' pixel-town-player--walking' : ''}`}
            style={{
              left: pixelPos.x,
              top: pixelPos.y,
              width: TILE_SIZE,
              height: TILE_SIZE * 1.25,
            }}
          >
            <img src={PLAYER_SPRITES[dir]} alt="player" />
          </div>
        </div>

        <div className="pixel-town-hint">WASD or click to explore</div>
      </div>

      {/* Station detail panel — reused from AgentWorkspace */}
      {selectedStation && (
        <StationDetailPanel
          station={selectedStation}
          stationHistory={stationHistory[selectedStation.id]}
          activityCounts={activityCounts[selectedStation.id]}
          health={health}
          appStats={appStats}
          githubStats={githubStats}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </>
  );
}

export default PixelTown;
