// Buildings, campfire, and NPC rendering

import { BUILDING_DATA } from '../constants/zones';

export function drawNpcs(rc) {
  const { ctx, cx, cy, width, height, now, time, me, inDungeonRef, gameStateRef, playerIdRef } = rc;

  if (!inDungeonRef.current) {

    for (const [id, building] of Object.entries(BUILDING_DATA)) {
    const bx = building.x - cx;
    const by = building.y - cy;
    const w = building.width;
    const h = building.height;
    
    // Skip if off screen
    if (bx < -w || bx > width + w || by < -h || by > height + h) continue;
    
    // Building shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(bx - w/2 + 5, by - h + 5, w, h);
    
    // Building body
    ctx.fillStyle = building.color;
    ctx.fillRect(bx - w/2, by - h, w, h);
    
    // Building outline
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - w/2, by - h, w, h);
    
    // Roof/top decoration
    if (id === 'wizard_tower') {
      // Spire
      ctx.beginPath();
      ctx.moveTo(bx, by - h - 40);
      ctx.lineTo(bx - w/2, by - h);
      ctx.lineTo(bx + w/2, by - h);
      ctx.closePath();
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
      // Windows
      for (let i = 0; i < 3; i++) {
        const wy = by - h + 25 + i * 35;
        ctx.fillStyle = (Math.sin(time * 2 + i) > 0) ? '#ffd93d' : '#aa9920';
        ctx.fillRect(bx - 8, wy, 16, 20);
      }
    } else if (id === 'volcano_fortress') {
      // Lava glow
      const glowAlpha = 0.3 + Math.sin(time * 2) * 0.1;
      ctx.fillStyle = `rgba(249, 115, 22, ${glowAlpha})`;
      ctx.beginPath();
      ctx.arc(bx, by - h/2, w * 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'ice_citadel') {
      // Ice glow
      ctx.fillStyle = 'rgba(103, 232, 249, 0.2)';
      ctx.beginPath();
      ctx.arc(bx, by - h/2, w * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Spires
      for (let i = 0; i < 3; i++) {
        const sx = bx - w/3 + i * (w/3);
        ctx.beginPath();
        ctx.moveTo(sx, by - h - 25);
        ctx.lineTo(sx - 12, by - h);
        ctx.lineTo(sx + 12, by - h);
        ctx.closePath();
        ctx.fillStyle = '#67e8f9';
        ctx.fill();
      }
    } else if (id === 'void_shrine') {
      // Floating particles
      for (let i = 0; i < 5; i++) {
        const px = bx + Math.sin(time + i) * 30;
        const py = by - h/2 + Math.cos(time * 2 + i) * 20;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#a855f7';
        ctx.fill();
      }
    }
    
    // Building name
    ctx.font = '12px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(building.name, bx, by + 15);
  }

  // ========== CAMPFIRE ==========
  {
    const campX = 2850 - cx;
    const campY = 2600 - cy;
    
    // Only render if on screen
    if (campX > -100 && campX < width + 100 && campY > -100 && campY < height + 100) {
      // Fire glow
      const glowSize = 35 + Math.sin(time * 8) * 5;
      const gradient = ctx.createRadialGradient(campX, campY - 10, 0, campX, campY - 10, glowSize);
      gradient.addColorStop(0, 'rgba(255, 150, 50, 0.6)');
      gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.3)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(campX, campY - 10, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Logs
      ctx.fillStyle = '#5c4033';
      ctx.beginPath();
      ctx.ellipse(campX, campY + 5, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Flames
      for (let i = 0; i < 5; i++) {
        const fx = campX + (i - 2) * 6;
        const flameHeight = 15 + Math.sin(time * 10 + i * 2) * 5;
        const flameWidth = 4 + Math.sin(time * 8 + i) * 2;
        
        ctx.beginPath();
        ctx.moveTo(fx - flameWidth, campY);
        ctx.quadraticCurveTo(fx, campY - flameHeight * 1.5, fx + flameWidth, campY);
        ctx.fillStyle = i % 2 === 0 ? '#ff6b35' : '#ffd93d';
        ctx.fill();
      }
      
      // Sparks
      for (let i = 0; i < 3; i++) {
        const sparkX = campX + Math.sin(time * 5 + i * 3) * 10;
        const sparkY = campY - 20 - (time * 20 + i * 30) % 40;
        const sparkAlpha = 1 - ((time * 20 + i * 30) % 40) / 40;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 100, ${sparkAlpha})`;
        ctx.fill();
      }
    }
  }

  // ========== NPCs ==========
  const npcs = gameStateRef.current.npcs || [];
  for (const npc of npcs) {
    const nx = npc.x - cx;
    const ny = npc.y - cy;
    
    // Skip if off screen
    if (nx < -50 || nx > width + 50 || ny < -50 || ny > height + 50) continue;
    
    if (npc.type === 'guide') {
      // Ethereal Guide - floating mystical entity
      const float = Math.sin(time * 2) * 5;
      const pulseAlpha = 0.5 + Math.sin(time * 3) * 0.2;
      
      // Outer glow
      const glow = ctx.createRadialGradient(nx, ny + float - 10, 0, nx, ny + float - 10, 40);
      glow.addColorStop(0, `rgba(103, 232, 249, ${pulseAlpha * 0.5})`);
      glow.addColorStop(0.5, `rgba(103, 232, 249, ${pulseAlpha * 0.2})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(nx, ny + float - 10, 40, 0, Math.PI * 2);
      ctx.fill();
      
      // Body - ethereal robed figure
      ctx.beginPath();
      ctx.moveTo(nx, ny + float - 35);
      ctx.quadraticCurveTo(nx - 20, ny + float, nx - 15, ny + float + 10);
      ctx.lineTo(nx + 15, ny + float + 10);
      ctx.quadraticCurveTo(nx + 20, ny + float, nx, ny + float - 35);
      ctx.fillStyle = `rgba(103, 232, 249, ${pulseAlpha})`;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Face - glowing eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(nx - 5, ny + float - 25, 3, 0, Math.PI * 2);
      ctx.arc(nx + 5, ny + float - 25, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Floating particles around
      for (let i = 0; i < 6; i++) {
        const angle = (time + i * Math.PI / 3) * 0.5;
        const dist = 25 + Math.sin(time * 2 + i) * 5;
        const px = nx + Math.cos(angle) * dist;
        const py = ny + float - 15 + Math.sin(angle) * dist * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(time * 3 + i) * 0.3})`;
        ctx.fill();
      }
      
      // Name
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#67e8f9';
      ctx.textAlign = 'center';
      ctx.fillText('Ethereal Guide', nx, ny + float + 25);
      
      // Interaction hint
      if (nearbyNpc?.id === npc.id) {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#ffd93d';
        ctx.fillText('[E] Talk', nx, ny + float + 38);
      }
      
    } else if (npc.type === 'knight') {
      // Knight Commander - armored warrior
      const bobY = Math.sin(time * 3) * 2;
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(nx, ny + 15, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Body - armor
      ctx.fillStyle = '#57534e';
      ctx.beginPath();
      ctx.ellipse(nx, ny + bobY, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Armor highlight
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.ellipse(nx, ny + bobY - 5, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Helmet
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.arc(nx, ny + bobY - 22, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Visor
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(nx - 8, ny + bobY - 24, 16, 6);
      
      // Helmet plume
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(nx, ny + bobY - 32);
      ctx.lineTo(nx - 3, ny + bobY - 40);
      ctx.lineTo(nx + 8, ny + bobY - 38);
      ctx.closePath();
      ctx.fill();
      
      // Shield (left side)
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.ellipse(nx - 18, ny + bobY, 8, 14, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd93d';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Sword (right side)
      ctx.strokeStyle = '#a8a29e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(nx + 15, ny + bobY - 10);
      ctx.lineTo(nx + 25, ny + bobY - 30);
      ctx.stroke();
      // Hilt
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(nx + 12, ny + bobY - 5);
      ctx.lineTo(nx + 18, ny + bobY - 15);
      ctx.stroke();
      
      // Name
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#a8a29e';
      ctx.textAlign = 'center';
      ctx.fillText('Knight Commander', nx, ny + 30);
      ctx.font = '10px Arial';
      ctx.fillStyle = '#78716c';
      ctx.fillText('Aldric', nx, ny + 42);
      
      // Interaction hint
      if (nearbyNpc?.id === npc.id) {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#ffd93d';
        ctx.fillText('[E] Talk', nx, ny + 55);
      }
    } else if (npc.type === 'quest_master') {
      // Quest Master Seraphina - elegant wizard with quest scroll
      const bobY = Math.sin(time * 2 + npc.x) * 2;
      
      // Glow effect
      ctx.shadowColor = '#ffd93d';
      ctx.shadowBlur = 15;
      
      // Robe (elegant dress)
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.moveTo(nx - 14, ny + bobY - 5);
      ctx.lineTo(nx - 16, ny + bobY + 20);
      ctx.lineTo(nx + 16, ny + bobY + 20);
      ctx.lineTo(nx + 14, ny + bobY - 5);
      ctx.closePath();
      ctx.fill();
      
      // Robe details (gold trim)
      ctx.strokeStyle = '#ffd93d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nx - 14, ny + bobY - 5);
      ctx.lineTo(nx - 16, ny + bobY + 20);
      ctx.moveTo(nx + 14, ny + bobY - 5);
      ctx.lineTo(nx + 16, ny + bobY + 20);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      
      // Body
      ctx.fillStyle = '#f5d0fe';
      ctx.beginPath();
      ctx.ellipse(nx, ny + bobY - 10, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Head
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(nx, ny + bobY - 22, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Hair (flowing golden)
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.ellipse(nx, ny + bobY - 28, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(nx - 8, ny + bobY - 18, 4, 12, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(nx + 8, ny + bobY - 18, 4, 12, -0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(nx - 4, ny + bobY - 24, 2, 0, Math.PI * 2);
      ctx.arc(nx + 4, ny + bobY - 24, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Crown/tiara
      ctx.fillStyle = '#ffd93d';
      ctx.beginPath();
      ctx.moveTo(nx - 8, ny + bobY - 32);
      ctx.lineTo(nx - 6, ny + bobY - 38);
      ctx.lineTo(nx - 2, ny + bobY - 34);
      ctx.lineTo(nx, ny + bobY - 40);
      ctx.lineTo(nx + 2, ny + bobY - 34);
      ctx.lineTo(nx + 6, ny + bobY - 38);
      ctx.lineTo(nx + 8, ny + bobY - 32);
      ctx.closePath();
      ctx.fill();
      
      // Quest scroll (held in hand)
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(nx + 12, ny + bobY - 15, 8, 18);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1;
      ctx.strokeRect(nx + 12, ny + bobY - 15, 8, 18);
      // Scroll lines
      ctx.strokeStyle = '#78716c';
      ctx.beginPath();
      ctx.moveTo(nx + 14, ny + bobY - 10);
      ctx.lineTo(nx + 18, ny + bobY - 10);
      ctx.moveTo(nx + 14, ny + bobY - 5);
      ctx.lineTo(nx + 18, ny + bobY - 5);
      ctx.moveTo(nx + 14, ny + bobY);
      ctx.lineTo(nx + 18, ny + bobY);
      ctx.stroke();
      
      // Floating quest marker
      const questFloat = Math.sin(time * 3) * 4;
      ctx.fillStyle = '#ffd93d';
      ctx.shadowColor = '#ffd93d';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('!', nx, ny + bobY - 50 + questFloat);
      ctx.shadowBlur = 0;
      
      // Name
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#ffd93d';
      ctx.textAlign = 'center';
      ctx.fillText('Quest Master', nx, ny + 30);
      ctx.font = '10px Arial';
      ctx.fillStyle = '#c084fc';
      ctx.fillText('Seraphina', nx, ny + 42);
      
      // Interaction hint
      if (nearbyNpc?.id === npc.id) {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#ffd93d';
        ctx.fillText('[E] Accept Quest', nx, ny + 55);
      }
    } else if (npc.type === 'shapeshifter') {
      // Shapeshifter - Mirage - morphing entity with prismatic glow
      const bobY = Math.sin(time * 2.5) * 6;
      const morphPhase = (time * 0.5) % (Math.PI * 2);
      const pulseAlpha = 0.6 + Math.sin(time * 3) * 0.2;
      
      // Outer prismatic glow
      const prismGlow = ctx.createRadialGradient(nx, ny + bobY, 0, nx, ny + bobY, 50);
      prismGlow.addColorStop(0, `rgba(236, 72, 153, ${pulseAlpha * 0.4})`);
      prismGlow.addColorStop(0.3, `rgba(168, 85, 247, ${pulseAlpha * 0.3})`);
      prismGlow.addColorStop(0.6, `rgba(6, 182, 212, ${pulseAlpha * 0.2})`);
      prismGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = prismGlow;
      ctx.beginPath();
      ctx.arc(nx, ny + bobY, 50, 0, Math.PI * 2);
      ctx.fill();
      
      // Morphing body - blob-like shape that shifts
      ctx.fillStyle = npc.color || '#ec4899';
      ctx.beginPath();
      const points = 8;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const morphOffset = Math.sin(morphPhase + angle * 2) * 5;
        const r = 18 + morphOffset;
        const px = nx + Math.cos(angle) * r;
        const py = ny + bobY - 5 + Math.sin(angle) * r * 0.8;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.fill();
      
      // Inner glow
      const innerGlow = ctx.createRadialGradient(nx, ny + bobY - 5, 0, nx, ny + bobY - 5, 15);
      innerGlow.addColorStop(0, 'rgba(255,255,255,0.8)');
      innerGlow.addColorStop(0.5, `${npc.color || '#ec4899'}80`);
      innerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(nx, ny + bobY - 5, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes that shift position
      const eyeOffset = Math.sin(time * 2) * 2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(nx - 5 + eyeOffset, ny + bobY - 8, 4, 0, Math.PI * 2);
      ctx.arc(nx + 5 + eyeOffset, ny + bobY - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(nx - 5 + eyeOffset, ny + bobY - 8, 2, 0, Math.PI * 2);
      ctx.arc(nx + 5 + eyeOffset, ny + bobY - 8, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Floating particles around (prismatic)
      const particleColors = ['#ec4899', '#a855f7', '#06b6d4', '#fbbf24', '#22c55e'];
      for (let i = 0; i < 8; i++) {
        const angle = (time + i * Math.PI / 4) * 0.8;
        const dist = 28 + Math.sin(time * 2 + i) * 6;
        const particleX = nx + Math.cos(angle) * dist;
        const particleY = ny + bobY + Math.sin(angle) * dist * 0.5;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 2 + Math.sin(time * 3 + i) * 1, 0, Math.PI * 2);
        ctx.fillStyle = particleColors[i % particleColors.length] + 'aa';
        ctx.fill();
      }
      
      // Emoji indicator (current form)
      if (npc.emoji) {
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(npc.emoji, nx, ny + bobY - 28);
      }
      
      // Name
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#ec4899';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name || 'Mirage', nx, ny + 30);
      
      // Interaction hint
      if (nearbyNpc?.id === npc.id) {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#ffd93d';
        ctx.fillText('[E] Change Skin', nx, ny + 43);
      }
    } else if (npc.type === 'dungeon_architect') {
      // Dungeon Architect - Arcanus the Dreamweaver
      const bobY = Math.sin(time * 2) * 4;
      const npcColor = npc.color || '#8b5cf6';
      
      // Arcane aura
      const auraGlow = ctx.createRadialGradient(nx, ny + bobY, 0, nx, ny + bobY, 45);
      auraGlow.addColorStop(0, `${npcColor}30`);
      auraGlow.addColorStop(0.6, `${npcColor}15`);
      auraGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGlow;
      ctx.beginPath();
      ctx.arc(nx, ny + bobY, 45, 0, Math.PI * 2);
      ctx.fill();
      
      // Shadow
      ctx.beginPath();
      ctx.ellipse(nx, ny + 14, 18, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(139,92,246,0.3)';
      ctx.fill();
      
      // Body/Robe
      ctx.fillStyle = '#2e1065';
      ctx.beginPath();
      ctx.moveTo(nx, ny - 14 + bobY);
      ctx.lineTo(nx - 15, ny + 14);
      ctx.lineTo(nx + 15, ny + 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = npcColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Rune pattern on robe
      ctx.strokeStyle = `${npcColor}80`;
      ctx.lineWidth = 0.8;
      const runeY = ny + 2 + bobY;
      ctx.beginPath();
      ctx.moveTo(nx - 5, runeY); ctx.lineTo(nx + 5, runeY);
      ctx.moveTo(nx - 3, runeY + 4); ctx.lineTo(nx + 3, runeY + 4);
      ctx.moveTo(nx, runeY - 2); ctx.lineTo(nx, runeY + 6);
      ctx.stroke();
      
      // Head
      ctx.beginPath();
      ctx.arc(nx, ny - 18 + bobY, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#ddd6fe';
      ctx.fill();
      
      // Wizard hat with blueprint/star motif
      ctx.fillStyle = '#2e1065';
      ctx.beginPath();
      ctx.moveTo(nx, ny - 44 + bobY);
      ctx.lineTo(nx - 16, ny - 16 + bobY);
      ctx.lineTo(nx + 16, ny - 16 + bobY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = npcColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Star on hat
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('★', nx, ny - 26 + bobY);
      
      // Floating blueprint/scroll in hand
      const scrollBob = Math.sin(time * 3) * 2;
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(nx + 14, ny - 8 + bobY + scrollBob, 10, 14);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(nx + 14, ny - 8 + bobY + scrollBob, 10, 14);
      // Grid lines on scroll
      ctx.strokeStyle = '#8b5cf680';
      ctx.beginPath();
      ctx.moveTo(nx + 16, ny - 4 + bobY + scrollBob);
      ctx.lineTo(nx + 22, ny - 4 + bobY + scrollBob);
      ctx.moveTo(nx + 16, ny - 1 + bobY + scrollBob);
      ctx.lineTo(nx + 22, ny - 1 + bobY + scrollBob);
      ctx.moveTo(nx + 16, ny + 2 + bobY + scrollBob);
      ctx.lineTo(nx + 22, ny + 2 + bobY + scrollBob);
      ctx.stroke();
      
      // Orbiting dimensional particles
      for (let i = 0; i < 5; i++) {
        const angle = time * 1.5 + (i * Math.PI * 2 / 5);
        const orbitR = 28 + Math.sin(time * 2 + i) * 4;
        const px = nx + Math.cos(angle) * orbitR;
        const py = ny + bobY - 5 + Math.sin(angle) * orbitR * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#fbbf24', '#67e8f9'][i];
        ctx.fill();
      }
      
      // Name
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = npcColor;
      ctx.textAlign = 'center';
      ctx.fillText(npc.name || 'Arcanus', nx, ny + 30);
      
      // Interaction hint
      if (nearbyNpc?.id === npc.id) {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#ffd93d';
        ctx.fillText('[E] Dungeon Workshop', nx, ny + 43);
      }
    }
  }
  } // End of if (!inDungeon) for buildings/campfire/NPCs
}
