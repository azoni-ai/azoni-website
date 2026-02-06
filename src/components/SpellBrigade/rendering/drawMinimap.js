// Minimap rendering

import { COLORS } from '../constants/config';
import { ZONE_POLYGONS, WORLD_WIDTH, WORLD_HEIGHT, PORTAL_POSITIONS, getZoneAtPosition } from '../constants/zones';

export function drawMinimap(rc) {
  const { ctx, cx, cy, width, height, now, me, players, enemies, 
          minimapRef, settingsRef, inDungeonRef, playerIdRef, dungeonVictoryPortalRef } = rc;

  if (settingsRef.current.showMinimap && minimapRef.current) {
    const mm = minimapRef.current;
    const mmCtx = mm.getContext('2d');
    const mmW = mm.width;
    const mmH = mm.height;
    
    // Clear minimap with dark background
    mmCtx.fillStyle = '#0a0a15';
    mmCtx.fillRect(0, 0, mmW, mmH);
    
    if (inDungeonRef.current) {
      // ========== DUNGEON MINIMAP ==========
      const dungeonHeight = 5000;
      const dungeonWidth = 1200;
      const scale = Math.min(mmW / dungeonWidth, mmH / dungeonHeight);
      const offsetX = (mmW - dungeonWidth * scale) / 2;
      const offsetY = 0;
      
      // Room colors
      const roomColors = {
        stone: '#2a2520',
        bones: '#252218',
        haunted: '#1a1a25',
        rocky: '#252520',
        infernal: '#2a1515',
        dragon: '#2a1a0a',
        corridor: '#1a1515',
      };
      
      // Draw dungeon rooms (matching expanded 1800x6000 dungeon)
      const rooms = [
        { yStart: 0, yEnd: 500, minX: 400, maxX: 1400, theme: 'stone' },
        { yStart: 500, yEnd: 700, minX: 550, maxX: 1250, theme: 'corridor' },
        { yStart: 700, yEnd: 1500, minX: 200, maxX: 1600, theme: 'bones' },
        { yStart: 1500, yEnd: 1700, minX: 550, maxX: 1250, theme: 'corridor' },
        { yStart: 1700, yEnd: 2500, minX: 200, maxX: 1600, theme: 'haunted' },
        { yStart: 2500, yEnd: 2700, minX: 550, maxX: 1250, theme: 'corridor' },
        { yStart: 2700, yEnd: 3500, minX: 200, maxX: 1600, theme: 'rocky' },
        { yStart: 3500, yEnd: 3700, minX: 550, maxX: 1250, theme: 'corridor' },
        { yStart: 3700, yEnd: 4500, minX: 200, maxX: 1600, theme: 'infernal' },
        { yStart: 4500, yEnd: 4700, minX: 550, maxX: 1250, theme: 'corridor' },
        { yStart: 4700, yEnd: 5000, minX: 200, maxX: 1600, theme: 'haunted' },
        { yStart: 5000, yEnd: 6000, minX: 50, maxX: 1750, theme: 'dragon' },
      ];
      
      for (const room of rooms) {
        mmCtx.fillStyle = roomColors[room.theme] || '#1a1515';
        mmCtx.fillRect(
          offsetX + room.minX * scale,
          offsetY + room.yStart * scale,
          (room.maxX - room.minX) * scale,
          (room.yEnd - room.yStart) * scale
        );
        
        // Room border
        mmCtx.strokeStyle = 'rgba(255,255,255,0.2)';
        mmCtx.lineWidth = 1;
        mmCtx.strokeRect(
          offsetX + room.minX * scale,
          offsetY + room.yStart * scale,
          (room.maxX - room.minX) * scale,
          (room.yEnd - room.yStart) * scale
        );
      }
      
      // Draw exit portal at entrance
      mmCtx.beginPath();
      mmCtx.arc(offsetX + 900 * scale, offsetY + 200 * scale, 4, 0, Math.PI * 2);
      mmCtx.fillStyle = '#22c55e';
      mmCtx.fill();
      
      // Draw dragon lair marker
      mmCtx.beginPath();
      mmCtx.arc(offsetX + 900 * scale, offsetY + 5500 * scale, 6, 0, Math.PI * 2);
      mmCtx.fillStyle = '#f97316';
      mmCtx.fill();
      mmCtx.strokeStyle = '#fbbf24';
      mmCtx.lineWidth = 2;
      mmCtx.stroke();
      
      // Enemies on minimap
      for (const e of enemies || []) {
        mmCtx.beginPath();
        mmCtx.arc(offsetX + e.x * scale, offsetY + e.y * scale, e.isBoss ? 5 : e.isMiniBoss ? 3 : 2, 0, Math.PI * 2);
        mmCtx.fillStyle = e.isBoss ? '#fbbf24' : e.isMiniBoss ? '#f97316' : '#ef4444';
        mmCtx.fill();
      }
      
      // Players on minimap
      for (const p of players || []) {
        if (p.health <= 0) continue;
        const isMe = p.id === playerIdRef.current;
        mmCtx.beginPath();
        mmCtx.arc(offsetX + p.x * scale, offsetY + p.y * scale, isMe ? 4 : 3, 0, Math.PI * 2);
        mmCtx.fillStyle = isMe ? '#00ffff' : '#60a5fa';
        mmCtx.fill();
        if (isMe) {
          mmCtx.strokeStyle = '#ffffff';
          mmCtx.lineWidth = 1.5;
          mmCtx.stroke();
        }
      }
      
      // Victory portal if active
      if (dungeonVictoryPortalRef.current && dungeonVictoryPortalRef.current.active) {
        mmCtx.beginPath();
        mmCtx.arc(offsetX + dungeonVictoryPortalRef.current.x * scale, offsetY + dungeonVictoryPortalRef.current.y * scale, 5, 0, Math.PI * 2);
        mmCtx.fillStyle = '#fbbf24';
        mmCtx.fill();
        mmCtx.strokeStyle = '#fff';
        mmCtx.lineWidth = 2;
        mmCtx.stroke();
      }
      
      // Dungeon label
      mmCtx.fillStyle = '#f97316';
      mmCtx.font = 'bold 10px Arial';
      mmCtx.textAlign = 'center';
      mmCtx.fillText('DUNGEON', mmW / 2, mmH - 5);
      
    } else {
      // ========== NORMAL WORLD MINIMAP ==========
      // Scale to fit world in minimap
      const scale = mmW / WORLD_WIDTH;

      // Use the same COLORS as the main game for consistency
      const mmZoneColors = {
        sanctuary: COLORS.sanctuary[1],
        meadow: COLORS.meadow[1],
        forest: COLORS.forest[1],
        volcanic: COLORS.volcanic[1],
        frozen: COLORS.frozen[1],
        abyss: COLORS.abyss[1],
        crystal_caves: COLORS.crystal_caves[1],
      };
      
      // Draw tile-based minimap matching main game exactly
      const tileSize = 100; // Smaller tiles for better accuracy
      for (let wx = 0; wx < WORLD_WIDTH; wx += tileSize) {
        for (let wy = 0; wy < WORLD_HEIGHT; wy += tileSize) {
          // Get zone using imported getZoneAtPosition function
          const zone = getZoneAtPosition(wx + tileSize / 2, wy + tileSize / 2);
          
          // Draw tile on minimap
          mmCtx.fillStyle = mmZoneColors[zone] || mmZoneColors.meadow;
          mmCtx.fillRect(
            Math.floor(wx * scale),
            Math.floor(wy * scale),
            Math.ceil(tileSize * scale) + 1,
            Math.ceil(tileSize * scale) + 1
          );
        }
      }
      
      // Draw zone borders for better visibility
      const zoneBorderOrder = ['forest', 'volcanic', 'frozen', 'abyss', 'crystal_caves', 'sanctuary'];
      for (const zoneId of zoneBorderOrder) {
        const polygon = ZONE_POLYGONS[zoneId];
        if (!polygon || polygon.length < 3) continue;
        mmCtx.beginPath();
        mmCtx.moveTo(polygon[0].x * scale, polygon[0].y * scale);
        for (let i = 1; i < polygon.length; i++) {
          mmCtx.lineTo(polygon[i].x * scale, polygon[i].y * scale);
        }
        mmCtx.closePath();
        mmCtx.strokeStyle = 'rgba(255,255,255,0.25)';
        mmCtx.lineWidth = 0.5;
        mmCtx.stroke();
      }
      
      // Draw portals on minimap
      for (const portal of Object.values(PORTAL_POSITIONS)) {
        mmCtx.beginPath();
        mmCtx.arc(portal.from.x * scale, portal.from.y * scale, 2, 0, Math.PI * 2);
        mmCtx.fillStyle = portal.color;
        mmCtx.fill();
      }

      // Enemies on minimap - red dots, bosses are yellow/gold and larger
      for (const e of enemies || []) {
        mmCtx.beginPath();
        mmCtx.arc(e.x * scale, e.y * scale, e.isBoss ? 4 : 1.5, 0, Math.PI * 2);
        mmCtx.fillStyle = e.isBoss ? '#fbbf24' : '#ef4444';
        mmCtx.fill();
      }

      // Players on minimap - CYAN for self (distinct from yellow bosses), blue for others
      for (const p of players || []) {
        if (p.health <= 0) continue;
        const isMe = p.id === playerIdRef.current;
        mmCtx.beginPath();
        mmCtx.arc(p.x * scale, p.y * scale, isMe ? 4 : 3, 0, Math.PI * 2);
        mmCtx.fillStyle = isMe ? '#00ffff' : '#60a5fa';  // Cyan for self, lighter blue for others
        mmCtx.fill();
        // White border for self to make it stand out
        if (isMe) {
          mmCtx.strokeStyle = '#ffffff';
          mmCtx.lineWidth = 1.5;
          mmCtx.stroke();
        }
      }
    }
  }
}