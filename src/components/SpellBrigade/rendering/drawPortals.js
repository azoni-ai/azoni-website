// Portal rendering

import { PORTAL_POSITIONS } from '../constants/zones';

export function drawPortals(rc) {
  const { ctx, cx, cy, width, height, time, me, inDungeonRef } = rc;

  // ========== PORTALS ========== (skip in dungeon)
  if (!inDungeonRef.current) {
    for (const [, portal] of Object.entries(PORTAL_POSITIONS)) {
    const px = portal.from.x - cx;
    const py = portal.from.y - cy;
    
    // Skip if off screen
    if (px < -80 || px > width + 80 || py < -80 || py > height + 80) continue;
    
    const size = 45;

    const pulse = Math.sin(time * 3) * 0.2 + 1;
    
    // Outer glow
    const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, size * 1.5 * pulse);
    glowGrad.addColorStop(0, portal.color + '60');
    glowGrad.addColorStop(0.6, portal.color + '20');
    glowGrad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(px, py, size * 1.5 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();
    
    // Portal ring
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.strokeStyle = portal.color;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Inner swirl
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(time * 2);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
      ctx.quadraticCurveTo(
        Math.cos(angle + 0.5) * 30,
        Math.sin(angle + 0.5) * 30,
        Math.cos(angle + 1) * 35,
        Math.sin(angle + 1) * 35
      );
      ctx.strokeStyle = portal.color + '80';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    
    // Center icon
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(portal.icon, px, py);
    
    // Portal name
    ctx.font = '11px Arial';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(portal.name, px, py - size - 8);
    
    // Level requirement
    if (portal.level > 0) {
      ctx.font = '10px Arial';
      ctx.fillStyle = me && me.level >= portal.level ? '#4ade80' : '#ef4444';
      ctx.fillText(`Lv ${portal.level}+`, px, py + size + 15);
    }
    
    // Show interaction prompt when player is nearby
    if (me) {
      const distToPortal = Math.sqrt(Math.pow(me.x - portal.from.x, 2) + Math.pow(me.y - portal.from.y, 2));
      if (distToPortal < 80) {
        const canUse = !portal.level || me.level >= portal.level;
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = canUse ? '#4ade80' : '#ef4444';
        ctx.fillText(canUse ? '[E] Enter' : `Need Lv ${portal.level}`, px, py + size + 30);
      }
    }
  }
  } // End of if (!inDungeon) for PORTALS

}
