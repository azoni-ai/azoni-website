// World terrain rendering

import { COLORS } from '../constants/config';
import { ZONE_POLYGONS } from '../constants/zones';

export function drawWorld(rc) {
  const { ctx, cx, cy, width, height, now, time, getZone, inDungeonRef } = rc;

  // Grid tiles with zone-specific colors
  const tileSize = 64;
  const startX = Math.floor(cx / tileSize) * tileSize;
  const startY = Math.floor(cy / tileSize) * tileSize;
  
  for (let x = startX; x < cx + width + tileSize; x += tileSize) {
    for (let y = startY; y < cy + height + tileSize; y += tileSize) {
      const zone = getZone(x + tileSize/2, y + tileSize/2);
      const colors = COLORS[zone] || COLORS.forest;
      const isLight = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      ctx.fillStyle = isLight ? colors[0] : colors[1];
      ctx.fillRect(x - cx, y - cy, tileSize, tileSize);
    }
  }

  // Zone decorations (seeded random based on position for consistency) - SKIP IN DUNGEON
  if (!inDungeonRef.current) {
  const tileSize = 64;
  const startX = Math.floor(cx / tileSize) * tileSize;
  const startY = Math.floor(cy / tileSize) * tileSize;
  
  const seededRandom = (x, y, seed = 0) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  };

  // Draw decorations for visible area
  for (let x = startX; x < cx + width + tileSize; x += tileSize) {
    for (let y = startY; y < cy + height + tileSize; y += tileSize) {
      const zone = getZone(x + tileSize/2, y + tileSize/2);
      const rand = seededRandom(x, y);
      const screenX = x - cx + tileSize/2;
      const screenY = y - cy + tileSize/2;
      
      // Only draw some tiles have decorations (25% chance for more variety)
      if (rand > 0.25) continue;
      
      const decorRand = seededRandom(x, y, 1);
      
      if (zone === 'sanctuary') {
        // Flowers
        ctx.fillStyle = decorRand > 0.5 ? '#fcd34d' : '#f472b6';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (zone === 'meadow') {
        // Bushes and small flowers
        if (decorRand > 0.6) {
          // Bush
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.arc(screenX - 3, screenY - 2, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Grass tuft
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(screenX - 4, screenY + 5);
          ctx.lineTo(screenX - 2, screenY - 5);
          ctx.moveTo(screenX, screenY + 5);
          ctx.lineTo(screenX, screenY - 7);
          ctx.moveTo(screenX + 4, screenY + 5);
          ctx.lineTo(screenX + 2, screenY - 5);
          ctx.stroke();
        }
      } else if (zone === 'forest') {
        // Trees and mushrooms
        if (decorRand > 0.5) {
          // Tree
          ctx.fillStyle = '#4a2c17';
          ctx.fillRect(screenX - 4, screenY - 5, 8, 20);
          ctx.fillStyle = '#166534';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - 25);
          ctx.lineTo(screenX - 15, screenY - 5);
          ctx.lineTo(screenX + 15, screenY - 5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#14532d';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - 35);
          ctx.lineTo(screenX - 12, screenY - 18);
          ctx.lineTo(screenX + 12, screenY - 18);
          ctx.closePath();
          ctx.fill();
        } else {
          // Mushroom
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(screenX - 2, screenY, 4, 8);
          ctx.fillStyle = decorRand > 0.25 ? '#ef4444' : '#a855f7';
          ctx.beginPath();
          ctx.arc(screenX, screenY, 7, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(screenX - 3, screenY - 2, 2, 0, Math.PI * 2);
          ctx.arc(screenX + 2, screenY - 3, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (zone === 'volcanic') {
        // Lava pools, rocks, embers
        if (decorRand > 0.6) {
          // Lava pool
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.ellipse(screenX, screenY, 12, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.ellipse(screenX, screenY, 8, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.ellipse(screenX, screenY, 4, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (decorRand > 0.3) {
          // Rock
          ctx.fillStyle = '#44403c';
          ctx.beginPath();
          ctx.moveTo(screenX - 8, screenY + 5);
          ctx.lineTo(screenX - 5, screenY - 8);
          ctx.lineTo(screenX + 3, screenY - 6);
          ctx.lineTo(screenX + 8, screenY + 5);
          ctx.closePath();
          ctx.fill();
        } else {
          // Ember particles
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(screenX + Math.sin(now/500 + x) * 3, screenY - 5, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (zone === 'frozen') {
        // Ice crystals, snow piles
        if (decorRand > 0.5) {
          // Ice crystal
          ctx.fillStyle = '#bfdbfe';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - 15);
          ctx.lineTo(screenX - 6, screenY + 5);
          ctx.lineTo(screenX + 6, screenY + 5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#93c5fd';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - 15);
          ctx.lineTo(screenX, screenY + 5);
          ctx.lineTo(screenX + 6, screenY + 5);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#dbeafe';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Snow pile
          ctx.fillStyle = '#f1f5f9';
          ctx.beginPath();
          ctx.ellipse(screenX, screenY, 10, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.ellipse(screenX - 5, screenY - 2, 6, 4, -0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (zone === 'abyss') {
        // Void crystals, floating runes
        if (decorRand > 0.6) {
          // Void crystal
          ctx.fillStyle = '#581c87';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - 18);
          ctx.lineTo(screenX - 8, screenY + 6);
          ctx.lineTo(screenX + 8, screenY + 6);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#7c3aed';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - 18);
          ctx.lineTo(screenX, screenY + 6);
          ctx.lineTo(screenX + 8, screenY + 6);
          ctx.closePath();
          ctx.fill();
          // Glow
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#c084fc';
          ctx.beginPath();
          ctx.arc(screenX, screenY - 5, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Floating rune
          const floatY = Math.sin(now/800 + x + y) * 3;
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(screenX, screenY + floatY, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(screenX - 4, screenY + floatY);
          ctx.lineTo(screenX + 4, screenY + floatY);
          ctx.moveTo(screenX, screenY - 4 + floatY);
          ctx.lineTo(screenX, screenY + 4 + floatY);
          ctx.stroke();
        }
      } else if (zone === 'crystal_caves') {
        // Crystal formations and gem clusters
        if (decorRand > 0.5) {
          // Large crystal cluster
          const colors = ['#ec4899', '#f472b6', '#a855f7', '#c084fc'];
          const crystalColor = colors[Math.floor(decorRand * 4)];
          // Main crystal
          ctx.fillStyle = crystalColor;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - 20);
          ctx.lineTo(screenX - 6, screenY + 5);
          ctx.lineTo(screenX + 6, screenY + 5);
          ctx.closePath();
          ctx.fill();
          // Highlight
          ctx.fillStyle = '#fdf4ff';
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - 20);
          ctx.lineTo(screenX - 2, screenY);
          ctx.lineTo(screenX + 3, screenY + 5);
          ctx.lineTo(screenX + 6, screenY + 5);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          // Side crystal
          ctx.fillStyle = '#d946ef';
          ctx.beginPath();
          ctx.moveTo(screenX + 8, screenY - 10);
          ctx.lineTo(screenX + 4, screenY + 5);
          ctx.lineTo(screenX + 12, screenY + 5);
          ctx.closePath();
          ctx.fill();
          // Sparkle
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = 0.8 + Math.sin(now/300 + x) * 0.2;
          ctx.beginPath();
          ctx.arc(screenX - 1, screenY - 12, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          // Small gem
          ctx.fillStyle = decorRand > 0.25 ? '#ec4899' : '#a855f7';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - 8);
          ctx.lineTo(screenX - 5, screenY);
          ctx.lineTo(screenX, screenY + 5);
          ctx.lineTo(screenX + 5, screenY);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fdf4ff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }
} // End of if (!inDungeon) for decorations

// Skip zone-specific visuals when in dungeon
if (!inDungeonRef.current) {
  // Zone transition rings (subtle gradient borders)
  const worldCenterX = 2500;
  const worldCenterY = 2500;
  const centerX = worldCenterX - cx;
  const centerY = worldCenterY - cy;
const zoneRings = [
  { r: 2600, c: '#581c87' },
  { r: 2100, c: '#0ea5e9' },
  { r: 1600, c: '#dc2626' },
  { r: 900, c: '#166534' },
];
for (const z of zoneRings) {
  ctx.beginPath();
  ctx.arc(centerX, centerY, z.r, 0, Math.PI * 2);
  ctx.strokeStyle = z.c + '40';
  ctx.lineWidth = 8;
  ctx.stroke();
}

// Sanctuary (glowing safe zone with decorations)
const sanctuaryPoly = ZONE_POLYGONS.sanctuary;
if (sanctuaryPoly) {

  
  // Draw polygon fill
  ctx.beginPath();
  ctx.moveTo(sanctuaryPoly[0].x - cx, sanctuaryPoly[0].y - cy);
  for (let i = 1; i < sanctuaryPoly.length; i++) {
    ctx.lineTo(sanctuaryPoly[i].x - cx, sanctuaryPoly[i].y - cy);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(34,197,94,0.15)';
  ctx.fill();
  
  // Animated border
  ctx.strokeStyle = `rgba(34,197,94,${0.5 + Math.sin(time * 2) * 0.2})`;
  ctx.lineWidth = 4;
  ctx.setLineDash([15, 8]);
  ctx.lineDashOffset = -time * 20;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}
}
}

export function drawWorldOverlay(rc) {
  const { ctx, cx, cy, now, world, inDungeonRef, touchTargetRef, isMobileView } = rc;

  // World border (or dungeon walls in dungeon)
  if (!inDungeonRef.current) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.setLineDash([20, 10]);
    ctx.strokeRect(-cx, -cy, world.width, world.height);
    ctx.setLineDash([]);
  }
  
  // Touch target indicator (mobile)
  if (touchTargetRef.current.active && isMobileView) {
    const tx = touchTargetRef.current.x - cx;
    const ty = touchTargetRef.current.y - cy;
    const pulse = Math.sin(now / 200) * 0.3 + 0.7;
    
    ctx.beginPath();
    ctx.arc(tx, ty, 18 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

}
