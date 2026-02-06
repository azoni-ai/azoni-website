// Dungeon terrain rendering

export function drawDungeon(rc) {
  const { ctx, cx, cy, width, height, time, me, dungeonVictoryPortalRef, isMobileView } = rc;

  const CORRIDOR_MIN_X = 450;
  const CORRIDOR_MAX_X = 750;
  
  // Room definitions (expanded with more rooms - wider dungeon)
  const ROOMS = [
    { name: 'Entrance Chamber', yStart: 0, yEnd: 500, theme: 'stone', minX: 400, maxX: 1400 },
    { name: 'Skeleton Crypt', yStart: 700, yEnd: 1500, theme: 'bones', minX: 200, maxX: 1600 },
    { name: 'Wraith Sanctum', yStart: 1700, yEnd: 2500, theme: 'haunted', minX: 200, maxX: 1600 },
    { name: 'Golem Forge', yStart: 2700, yEnd: 3500, theme: 'rocky', minX: 200, maxX: 1600 },
    { name: 'Demon Pit', yStart: 3700, yEnd: 4500, theme: 'infernal', minX: 200, maxX: 1600 },
    { name: 'Shadow Hall', yStart: 4700, yEnd: 5000, theme: 'haunted', minX: 200, maxX: 1600 },
    { name: 'Dragon Lair', yStart: 5000, yEnd: 6000, theme: 'dragon', minX: 50, maxX: 1750 },
  ];
  
  // Dark background
  ctx.fillStyle = '#0a0808';
  ctx.fillRect(0, 0, width, height);
  
  // Determine current area type
  const playerY = me?.y || 0;
  let currentTheme = 'corridor';
  let currentRoom = null;
  for (const room of ROOMS) {
    if (playerY >= room.yStart && playerY < room.yEnd) {
      currentTheme = room.theme;
      currentRoom = room;
      break;
    }
  }
  
  // Theme-specific colors
  const themeColors = {
    stone: { floor1: '#2a2520', floor2: '#1f1b18', wall: '#1a1515', accent: '#44403c' },
    bones: { floor1: '#252218', floor2: '#1a1815', wall: '#15120f', accent: '#a8a29e' },
    haunted: { floor1: '#1a1a25', floor2: '#121218', wall: '#0f0f18', accent: '#6366f1' },
    rocky: { floor1: '#252520', floor2: '#1a1a18', wall: '#1a1815', accent: '#78716c' },
    infernal: { floor1: '#2a1515', floor2: '#1f1010', wall: '#1a0a0a', accent: '#dc2626' },
    dragon: { floor1: '#2a1a0a', floor2: '#1f1505', wall: '#150a05', accent: '#f97316' },
    corridor: { floor1: '#1f1b18', floor2: '#181512', wall: '#121010', accent: '#3f3f46' },
  };
  
  const colors = themeColors[currentTheme] || themeColors.corridor;
  
  // Floor tiles
  const floorTileSize = 48;
  const floorStartX = Math.floor((cx - 200) / floorTileSize) * floorTileSize;
  const floorStartY = Math.floor(cy / floorTileSize) * floorTileSize;
  
  for (let x = floorStartX; x < cx + width + floorTileSize; x += floorTileSize) {
    for (let y = floorStartY; y < cy + height + floorTileSize; y += floorTileSize) {
      // Determine bounds at this y position
      let minX = CORRIDOR_MIN_X, maxX = CORRIDOR_MAX_X;
      for (const room of ROOMS) {
        if (y >= room.yStart && y < room.yEnd) {
          minX = room.minX;
          maxX = room.maxX;
          break;
        }
      }
      
      if (x < minX || x > maxX) continue;
      
      const screenX = x - cx;
      const screenY = y - cy;
      const isLight = ((x / floorTileSize) + (y / floorTileSize)) % 2 === 0;
      
      ctx.fillStyle = isLight ? colors.floor1 : colors.floor2;
      ctx.fillRect(screenX, screenY, floorTileSize, floorTileSize);
      
      // Tile cracks
      const crackSeed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      if ((crackSeed - Math.floor(crackSeed)) > 0.8) {
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenX + 8, screenY + 8);
        ctx.lineTo(screenX + 35, screenY + 38);
        ctx.stroke();
      }
    }
  }
  
  // Draw walls based on current area bounds
  for (let wy = Math.floor(cy / 60) * 60; wy < cy + height + 60; wy += 60) {
    let minX = CORRIDOR_MIN_X, maxX = CORRIDOR_MAX_X;
    for (const room of ROOMS) {
      if (wy >= room.yStart && wy < room.yEnd) {
        minX = room.minX;
        maxX = room.maxX;
        break;
      }
    }
    
    const blockY = wy - cy;
    
    // Left wall
    const leftWallX = minX - cx;
    ctx.fillStyle = colors.wall;
    ctx.fillRect(leftWallX - 100, blockY, 100, 60);
    ctx.strokeStyle = '#0a0808';
    ctx.lineWidth = 2;
    ctx.strokeRect(leftWallX - 100, blockY, 100, 60);
    
    // Right wall  
    const rightWallX = maxX - cx;
    ctx.fillStyle = colors.wall;
    ctx.fillRect(rightWallX, blockY, 100, 60);
    ctx.strokeStyle = '#0a0808';
    ctx.lineWidth = 2;
    ctx.strokeRect(rightWallX, blockY, 100, 60);
  }
  
  // Torches (less frequent in corridors, more in rooms)
  const torchSpacing = currentRoom ? 200 : 350;
  for (let ty = Math.floor(cy / torchSpacing) * torchSpacing; ty < cy + height + torchSpacing; ty += torchSpacing) {
    let minX = CORRIDOR_MIN_X, maxX = CORRIDOR_MAX_X;
    for (const room of ROOMS) {
      if (ty >= room.yStart && ty < room.yEnd) {
        minX = room.minX;
        maxX = room.maxX;
        break;
      }
    }
    
    const torchScreenY = ty - cy;
    if (torchScreenY < -50 || torchScreenY > height + 50) continue;
    
    // Left torch
    const leftTorchX = minX + 20 - cx;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(leftTorchX - 5, torchScreenY - 5, 15, 25);
    
    const glowSize = 40 + Math.sin(time * 8 + ty) * 8;
    const fireGlow = ctx.createRadialGradient(leftTorchX + 5, torchScreenY - 15, 0, leftTorchX + 5, torchScreenY - 15, glowSize);
    fireGlow.addColorStop(0, `rgba(255, 150, 50, 0.4)`);
    fireGlow.addColorStop(0.5, `rgba(255, 100, 0, 0.15)`);
    fireGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = fireGlow;
    ctx.beginPath();
    ctx.arc(leftTorchX + 5, torchScreenY - 15, glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    for (let f = 0; f < 3; f++) {
      const flameH = 12 + Math.sin(time * 12 + ty + f * 2) * 4;
      ctx.fillStyle = f === 1 ? '#fbbf24' : '#f97316';
      ctx.beginPath();
      ctx.moveTo(leftTorchX + 2 + f * 3, torchScreenY - 5);
      ctx.quadraticCurveTo(leftTorchX + 3 + f * 3, torchScreenY - 5 - flameH, leftTorchX + 5 + f * 3, torchScreenY - 5);
      ctx.fill();
    }
    
    // Right torch
    const rightTorchX = maxX - 20 - cx;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(rightTorchX - 10, torchScreenY - 5, 15, 25);
    
    const fireGlow2 = ctx.createRadialGradient(rightTorchX - 5, torchScreenY - 15, 0, rightTorchX - 5, torchScreenY - 15, glowSize);
    fireGlow2.addColorStop(0, `rgba(255, 150, 50, 0.4)`);
    fireGlow2.addColorStop(0.5, `rgba(255, 100, 0, 0.15)`);
    fireGlow2.addColorStop(1, 'transparent');
    ctx.fillStyle = fireGlow2;
    ctx.beginPath();
    ctx.arc(rightTorchX - 5, torchScreenY - 15, glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    for (let f = 0; f < 3; f++) {
      const flameH = 12 + Math.sin(time * 12 + ty + f * 2 + 1) * 4;
      ctx.fillStyle = f === 1 ? '#fbbf24' : '#f97316';
      ctx.beginPath();
      ctx.moveTo(rightTorchX - 8 + f * 3, torchScreenY - 5);
      ctx.quadraticCurveTo(rightTorchX - 7 + f * 3, torchScreenY - 5 - flameH, rightTorchX - 5 + f * 3, torchScreenY - 5);
      ctx.fill();
    }
  }
  
  // Theme-specific decorations
  const dungeonDecorSeeded = (x, y, seed = 0) => {
    const n = Math.sin(x * 45.233 + y * 91.117 + seed) * 12345.6789;
    return n - Math.floor(n);
  };
  
  // Draw room-specific decorations
  for (const room of ROOMS) {
    if (cy > room.yEnd + 100 || cy + height < room.yStart - 100) continue;
    
    const decorSpacing = room.theme === 'dragon' ? 150 : 80;
    
    for (let dx = room.minX + 50; dx < room.maxX - 50; dx += decorSpacing) {
      for (let dy = room.yStart + 50; dy < room.yEnd - 50; dy += decorSpacing) {
        const decorScreenX = dx - cx;
        const decorScreenY = dy - cy;
        if (decorScreenX < -50 || decorScreenX > width + 50) continue;
        if (decorScreenY < -50 || decorScreenY > height + 50) continue;
        
        const decorRand = dungeonDecorSeeded(dx, dy);
        
        if (room.theme === 'bones' && decorRand > 0.6) {
          // Skulls and bones
          if (decorRand > 0.8) {
            ctx.fillStyle = '#d4d4d4';
            ctx.beginPath();
            ctx.arc(decorScreenX, decorScreenY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(decorScreenX - 3, decorScreenY - 2, 2, 0, Math.PI * 2);
            ctx.arc(decorScreenX + 3, decorScreenY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = '#a8a29e';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(decorScreenX - 12, decorScreenY - 5);
            ctx.lineTo(decorScreenX + 12, decorScreenY + 5);
            ctx.stroke();
          }
        } else if (room.theme === 'haunted' && decorRand > 0.7) {
          // Ghostly wisps
          const wispFloat = Math.sin(time * 2 + dx + dy) * 10;
          ctx.fillStyle = `rgba(99, 102, 241, ${0.3 + Math.sin(time * 3 + dx) * 0.2})`;
          ctx.beginPath();
          ctx.arc(decorScreenX, decorScreenY + wispFloat, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(165, 180, 252, ${0.5 + Math.sin(time * 4 + dy) * 0.3})`;
          ctx.beginPath();
          ctx.arc(decorScreenX, decorScreenY + wispFloat, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (room.theme === 'rocky' && decorRand > 0.6) {
          // Boulders and rocks
          ctx.fillStyle = '#57534e';
          ctx.beginPath();
          ctx.moveTo(decorScreenX - 15, decorScreenY + 10);
          ctx.lineTo(decorScreenX - 8, decorScreenY - 12);
          ctx.lineTo(decorScreenX + 10, decorScreenY - 8);
          ctx.lineTo(decorScreenX + 15, decorScreenY + 10);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#78716c';
          ctx.beginPath();
          ctx.moveTo(decorScreenX - 8, decorScreenY - 12);
          ctx.lineTo(decorScreenX + 10, decorScreenY - 8);
          ctx.lineTo(decorScreenX + 5, decorScreenY);
          ctx.closePath();
          ctx.fill();
        } else if (room.theme === 'infernal' && decorRand > 0.5) {
          // Lava cracks and embers
          if (decorRand > 0.75) {
            // Lava crack
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(decorScreenX - 15, decorScreenY);
            ctx.lineTo(decorScreenX - 5, decorScreenY + 10);
            ctx.lineTo(decorScreenX + 8, decorScreenY - 5);
            ctx.lineTo(decorScreenX + 15, decorScreenY + 8);
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            // Ember
            const emberFloat = Math.sin(time * 4 + dx) * 5;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(decorScreenX, decorScreenY - 10 + emberFloat, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (room.theme === 'dragon' && decorRand > 0.6) {
          // Lava pools
          const lavaGlow = ctx.createRadialGradient(decorScreenX, decorScreenY, 0, decorScreenX, decorScreenY, 40);
          lavaGlow.addColorStop(0, '#fbbf24');
          lavaGlow.addColorStop(0.3, '#f97316');
          lavaGlow.addColorStop(0.7, '#dc2626');
          lavaGlow.addColorStop(1, '#7f1d1d');
          ctx.fillStyle = lavaGlow;
          ctx.beginPath();
          ctx.ellipse(decorScreenX, decorScreenY, 30 + Math.sin(time * 2 + dx) * 5, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Bubbles
          for (let b = 0; b < 2; b++) {
            const bubbleX = decorScreenX + Math.sin(time * 3 + b * 2) * 15;
            const bubbleY = decorScreenY - Math.abs(Math.sin(time * 4 + b)) * 12;
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
          }
        }
      }
    }
  }
  
  // Room name banner
  if (currentRoom) {
    const bannerY = 60;
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = colors.accent;
    ctx.textAlign = 'center';
    ctx.fillText(currentRoom.name, width / 2, bannerY);
    
    // Underline
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, bannerY + 8);
    ctx.lineTo(width / 2 + 80, bannerY + 8);
    ctx.stroke();
  }
  
  // Exit portal in entrance chamber
  const exitPortalY = 200;
  const exitScreenY = exitPortalY - cy;
  if (exitScreenY > -100 && exitScreenY < height + 100 && playerY < 500) {
    const exitScreenX = 900 - cx; // Center of wider dungeon
    const portalPulse = 0.8 + Math.sin(time * 3) * 0.2;
    
    // Portal glow
    const exitGlow = ctx.createRadialGradient(exitScreenX, exitScreenY, 0, exitScreenX, exitScreenY, 60);
    exitGlow.addColorStop(0, `rgba(34, 197, 94, ${0.6 * portalPulse})`);
    exitGlow.addColorStop(0.5, `rgba(34, 197, 94, ${0.3 * portalPulse})`);
    exitGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = exitGlow;
    ctx.beginPath();
    ctx.arc(exitScreenX, exitScreenY, 60, 0, Math.PI * 2);
    ctx.fill();
    
    // Portal ring
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(exitScreenX, exitScreenY, 30 * portalPulse, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner swirl
    ctx.save();
    ctx.translate(exitScreenX, exitScreenY);
    ctx.rotate(time * 2);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
      ctx.lineTo(Math.cos(angle + 0.5) * 25, Math.sin(angle + 0.5) * 25);
      ctx.strokeStyle = `rgba(134, 239, 172, ${0.5 + Math.sin(time * 4 + i) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    
    // Exit text
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', exitScreenX, exitScreenY + 50);
    ctx.font = '10px Arial';
    ctx.fillStyle = '#86efac';
    ctx.fillText(isMobileView ? 'Tap' : 'Press E', exitScreenX, exitScreenY + 62);
  }
  
  // Dragon lair ambient effect
  if (playerY >= 3500) {
    const lairGlow = ctx.createLinearGradient(0, 0, 0, height);
    lairGlow.addColorStop(0, 'rgba(249, 115, 22, 0.05)');
    lairGlow.addColorStop(1, 'rgba(220, 38, 38, 0.1)');
    ctx.fillStyle = lairGlow;
    ctx.fillRect(0, 0, width, height);
    
    // Heat distortion effect
    if (Math.random() > 0.95) {
      ctx.fillStyle = 'rgba(255, 100, 0, 0.03)';
      ctx.fillRect(0, 0, width, height);
    }
  }
  
  // Victory portal (after dragon defeat)
  if (dungeonVictoryPortalRef.current && dungeonVictoryPortalRef.current.active) {
    const vpX = dungeonVictoryPortalRef.current.x - cx;
    const vpY = dungeonVictoryPortalRef.current.y - cy;
    
    if (vpY > -150 && vpY < height + 150) {
      const portalPulse = 0.8 + Math.sin(time * 4) * 0.2;
      const portalSize = 80;
      
      // Epic golden glow
      const victoryGlow = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, portalSize * 2);
      victoryGlow.addColorStop(0, 'rgba(251, 191, 36, 0.8)');
      victoryGlow.addColorStop(0.3, 'rgba(245, 158, 11, 0.5)');
      victoryGlow.addColorStop(0.6, 'rgba(217, 119, 6, 0.2)');
      victoryGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = victoryGlow;
      ctx.beginPath();
      ctx.arc(vpX, vpY, portalSize * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Outer ring - golden
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(vpX, vpY, portalSize * portalPulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Inner ring
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(vpX, vpY, portalSize * 0.6 * portalPulse, 0, Math.PI * 2);
      ctx.stroke();
      
      // Swirling particles
      ctx.save();
      ctx.translate(vpX, vpY);
      ctx.rotate(time * 3);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 30 + Math.sin(time * 5 + i) * 15;
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;
        ctx.fillStyle = `rgba(251, 191, 36, ${0.8 - i * 0.08})`;
        ctx.beginPath();
        ctx.arc(px, py, 6 - i * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      
      // Inner swirl
      ctx.save();
      ctx.translate(vpX, vpY);
      ctx.rotate(-time * 2);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
        ctx.lineTo(Math.cos(angle + 0.6) * 40, Math.sin(angle + 0.6) * 40);
        ctx.strokeStyle = `rgba(253, 224, 71, ${0.6 + Math.sin(time * 6 + i) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
      
      // Victory text
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.fillText('🏆 VICTORY PORTAL 🏆', vpX, vpY + portalSize + 25);
      ctx.font = '12px Arial';
      ctx.fillStyle = '#fde68a';
      ctx.fillText('Press E to return to Sanctuary', vpX, vpY + portalSize + 42);
      ctx.shadowBlur = 0;
    }
  }
  
  // Depth progress indicator
  const progress = Math.min(1, playerY / 3000);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(20, height - 30, 150, 15);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(22, height - 28, 146 * progress, 11);
  ctx.font = '10px Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(`Depth: ${Math.floor(progress * 100)}%`, 25, height - 20);
}
