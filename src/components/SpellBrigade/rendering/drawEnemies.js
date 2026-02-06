// Enemy rendering

import { COLORS } from '../constants/config';

export function drawEnemies(rc) {
  const { ctx, cx, cy, width, height, time, enemies } = rc;

  for (const enemy of enemies || []) {
    const sx = enemy.x - cx;
    const sy = enemy.y - cy;
    if (sx < -60 || sx > width + 60 || sy < -60 || sy > height + 60) continue;

    const isBoss = enemy.isBoss;
    const bounce = enemy.isFrozen ? 0 : Math.sin((enemy.animFrame || 0) * Math.PI / 2) * 0.8;
    const color = COLORS.enemy[enemy.type] || '#ff0000';
    const size = isBoss ? 2 : 1;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(sx, sy + 8, 12 * size, 6 * size, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // ========== BOSS UNIQUE DESIGNS ==========
    if (isBoss) {
      const bossType = enemy.type;

      
      if (bossType === 'boss_meadow' || bossType === 'blossom_behemoth') {
        // Blossom Behemoth - Flower monster
        const petalCount = 8;
        const petalRadius = 35;
        // Petals
        for (let i = 0; i < petalCount; i++) {
          const angle = (i / petalCount) * Math.PI * 2 + time * 0.5;
          const px = sx + Math.cos(angle) * petalRadius;
          const py = sy - bounce + Math.sin(angle) * petalRadius * 0.6;
          ctx.beginPath();
          ctx.ellipse(px, py, 18, 12, angle, 0, Math.PI * 2);
          ctx.fillStyle = '#f472b6';
          ctx.fill();
          ctx.strokeStyle = '#db2777';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        // Center body
        ctx.beginPath();
        ctx.arc(sx, sy - bounce, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#84cc16';
        ctx.fill();
        ctx.strokeStyle = '#65a30d';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Face
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sx - 8, sy - 5 - bounce, 4, 0, Math.PI * 2);
        ctx.arc(sx + 8, sy - 5 - bounce, 4, 0, Math.PI * 2);
        ctx.fill();
        // Smile
        ctx.beginPath();
        ctx.arc(sx, sy + 5 - bounce, 10, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      else if (bossType === 'boss_forest' || bossType === 'ancient_treant') {
        // Ancient Treant - Tree creature
        // Trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx - 15, sy - 20 - bounce, 30, 50);
        // Bark texture
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(sx - 10 + i * 7, sy - 15 - bounce);
          ctx.lineTo(sx - 10 + i * 7, sy + 25 - bounce);
          ctx.stroke();
        }
        // Canopy
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(sx, sy - 35 - bounce, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx - 25, sy - 20 - bounce, 25, 0, Math.PI * 2);
        ctx.arc(sx + 25, sy - 20 - bounce, 25, 0, Math.PI * 2);
        ctx.fill();
        // Eyes (glowing)
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx - 12, sy - 5 - bounce, 5, 0, Math.PI * 2);
        ctx.arc(sx + 12, sy - 5 - bounce, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      else if (bossType === 'boss_volcanic' || bossType === 'magma_titan') {
        // Magma Titan - Lava golem
        // Body chunks
        ctx.fillStyle = '#44403c';
        ctx.beginPath();
        ctx.moveTo(sx - 35, sy + 20 - bounce);
        ctx.lineTo(sx - 25, sy - 40 - bounce);
        ctx.lineTo(sx + 25, sy - 40 - bounce);
        ctx.lineTo(sx + 35, sy + 20 - bounce);
        ctx.closePath();
        ctx.fill();
        // Lava cracks
        ctx.strokeStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx - 20, sy + 15 - bounce);
        ctx.lineTo(sx - 10, sy - 20 - bounce);
        ctx.lineTo(sx + 5, sy - bounce);
        ctx.lineTo(sx + 15, sy - 30 - bounce);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx + 20, sy + 10 - bounce);
        ctx.lineTo(sx + 5, sy - 15 - bounce);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Eyes (molten)
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sx - 12, sy - 20 - bounce, 6, 0, Math.PI * 2);
        ctx.arc(sx + 12, sy - 20 - bounce, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Horns
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(sx - 20, sy - 35 - bounce);
        ctx.lineTo(sx - 30, sy - 55 - bounce);
        ctx.lineTo(sx - 15, sy - 40 - bounce);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx + 20, sy - 35 - bounce);
        ctx.lineTo(sx + 30, sy - 55 - bounce);
        ctx.lineTo(sx + 15, sy - 40 - bounce);
        ctx.closePath();
        ctx.fill();
      }
      else if (bossType === 'boss_frozen' || bossType === 'frost_wyrm') {
        // Frost Wyrm - Ice dragon/serpent
        // Body segments
        for (let i = 3; i >= 0; i--) {
          const segX = sx - Math.sin(time * 2 + i) * 8;
          const segY = sy + i * 15 - bounce;
          ctx.beginPath();
          ctx.arc(segX, segY, 18 - i * 2, 0, Math.PI * 2);
          ctx.fillStyle = i === 0 ? '#bfdbfe' : '#93c5fd';
          ctx.fill();
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        // Head
        ctx.fillStyle = '#bfdbfe';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 25 - bounce, 25, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Ice crown/spikes
        ctx.fillStyle = '#dbeafe';
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI * 0.8 + (i / 4) * Math.PI * 0.6;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(angle) * 20, sy - 25 - bounce + Math.sin(angle) * 15);
          ctx.lineTo(sx + Math.cos(angle) * 35, sy - 25 - bounce + Math.sin(angle) * 25 - 15);
          ctx.lineTo(sx + Math.cos(angle + 0.15) * 20, sy - 25 - bounce + Math.sin(angle + 0.15) * 15);
          ctx.closePath();
          ctx.fill();
        }
        // Eyes
        ctx.fillStyle = '#0ea5e9';
        ctx.shadowColor = '#0ea5e9';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx - 8, sy - 28 - bounce, 5, 0, Math.PI * 2);
        ctx.arc(sx + 8, sy - 28 - bounce, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      else if (bossType === 'boss_abyss' || bossType === 'void_overlord') {
        // Void Overlord - Cosmic horror
        // Tentacles
        ctx.strokeStyle = '#581c87';
        ctx.lineWidth = 8;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + time * 0.3;
          const len = 45 + Math.sin(time * 2 + i) * 10;
          ctx.beginPath();
          ctx.moveTo(sx, sy - bounce);
          const midX = sx + Math.cos(angle) * len * 0.5;
          const midY = sy - bounce + Math.sin(angle) * len * 0.5 + Math.sin(time * 3 + i) * 10;
          const endX = sx + Math.cos(angle) * len;
          const endY = sy - bounce + Math.sin(angle) * len * 0.7;
          ctx.quadraticCurveTo(midX, midY, endX, endY);
          ctx.stroke();
        }
        // Main body
        ctx.beginPath();
        ctx.arc(sx, sy - bounce, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#1e1b4b';
        ctx.fill();
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Eye (singular, cosmic)
        const eyeGlow = 0.5 + Math.sin(time * 4) * 0.3;
        ctx.fillStyle = `rgba(168, 85, 247, ${eyeGlow})`;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(sx, sy - 5 - bounce, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(sx, sy - 5 - bounce, 5, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Floating runes
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const runeAngle = time + (i / 3) * Math.PI * 2;
          const runeX = sx + Math.cos(runeAngle) * 50;
          const runeY = sy - bounce + Math.sin(runeAngle) * 30;
          ctx.beginPath();
          ctx.arc(runeX, runeY, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      else if (bossType === 'crystal_golem' || bossType === 'boss_crystal') {
        // Crystal Golem - Crystalline construct

        
        // Crystal body - geometric shape
        ctx.beginPath();
        ctx.moveTo(sx, sy - 45 - bounce); // Top
        ctx.lineTo(sx + 30, sy - 15 - bounce); // Right upper
        ctx.lineTo(sx + 25, sy + 25 - bounce); // Right lower
        ctx.lineTo(sx, sy + 35 - bounce); // Bottom
        ctx.lineTo(sx - 25, sy + 25 - bounce); // Left lower  
        ctx.lineTo(sx - 30, sy - 15 - bounce); // Left upper
        ctx.closePath();
        
        // Crystal gradient fill
        const crystalGrad = ctx.createLinearGradient(sx - 30, sy - 45, sx + 30, sy + 35);
        crystalGrad.addColorStop(0, '#f0abfc');
        crystalGrad.addColorStop(0.5, '#ec4899');
        crystalGrad.addColorStop(1, '#be185d');
        ctx.fillStyle = crystalGrad;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner crystal facets
        ctx.beginPath();
        ctx.moveTo(sx, sy - 30 - bounce);
        ctx.lineTo(sx + 15, sy - bounce);
        ctx.lineTo(sx, sy + 20 - bounce);
        ctx.lineTo(sx - 15, sy - bounce);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
        
        // Floating crystal shards
        for (let i = 0; i < 6; i++) {
          const angle = time * 1.5 + (i / 6) * Math.PI * 2;
          const dist = 45 + Math.sin(time * 2 + i) * 8;
          const shardX = sx + Math.cos(angle) * dist;
          const shardY = sy - bounce + Math.sin(angle) * dist * 0.5;
          
          ctx.save();
          ctx.translate(shardX, shardY);
          ctx.rotate(angle + time);
          ctx.beginPath();
          ctx.moveTo(0, -8);
          ctx.lineTo(4, 0);
          ctx.lineTo(0, 8);
          ctx.lineTo(-4, 0);
          ctx.closePath();
          ctx.fillStyle = '#f472b6';
          ctx.fill();
          ctx.restore();
        }
        
        // Glowing core
        const pulseAlpha = 0.5 + Math.sin(time * 3) * 0.3;
        ctx.beginPath();
        ctx.arc(sx, sy - 5 - bounce, 12, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
        ctx.fill();
        
        // Eye
        ctx.beginPath();
        ctx.arc(sx, sy - 5 - bounce, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ec4899';
        ctx.fill();
      }
      else if (bossType === 'boss_dragon') {
        // ========== MASSIVE INFERNAL DRAGON BOSS (4x size) ==========
        const dragonRadius = enemy.radius || 160;
        const scale = dragonRadius / 40; // Scale factor (was 40, now 160 = 4x)
        const wingFlap = Math.sin(time * 2.5) * 0.4;
        const breathe = Math.sin(time * 1.5) * 5 * scale;
        const bodyBob = Math.sin(time * 2) * 3 * scale;
        
        // Massive fire aura glow
        const auraGrad = ctx.createRadialGradient(sx, sy - bodyBob, dragonRadius * 0.2, sx, sy - bodyBob, dragonRadius * 2);
        auraGrad.addColorStop(0, 'rgba(255, 100, 0, 0.5)');
        auraGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.3)');
        auraGrad.addColorStop(0.6, 'rgba(220, 38, 38, 0.15)');
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(sx, sy - bodyBob, dragonRadius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulsing ground fire effect
        ctx.fillStyle = `rgba(255, 100, 0, ${0.1 + Math.sin(time * 4) * 0.05})`;
        ctx.beginPath();
        ctx.ellipse(sx, sy + 60 * scale, dragonRadius * 1.5, 30 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // === MASSIVE WINGS (behind body) ===
        // Left wing
        ctx.save();
        ctx.translate(sx - 60 * scale, sy - 30 * scale - bodyBob);
        ctx.rotate(-0.6 + wingFlap);
        ctx.fillStyle = '#5c0a0a';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-50 * scale, -80 * scale, -120 * scale, -40 * scale);
        ctx.quadraticCurveTo(-100 * scale, 0, -80 * scale, 40 * scale);
        ctx.quadraticCurveTo(-40 * scale, 30 * scale, 0, 10 * scale);
        ctx.closePath();
        ctx.fill();
        // Wing membrane with gradient
        const wingGrad1 = ctx.createLinearGradient(-120 * scale, -40 * scale, 0, 0);
        wingGrad1.addColorStop(0, '#7f1d1d');
        wingGrad1.addColorStop(0.5, '#991b1b');
        wingGrad1.addColorStop(1, '#b91c1c');
        ctx.fillStyle = wingGrad1;
        ctx.beginPath();
        ctx.moveTo(-15 * scale, 5 * scale);
        ctx.quadraticCurveTo(-60 * scale, -50 * scale, -100 * scale, -20 * scale);
        ctx.quadraticCurveTo(-70 * scale, 10 * scale, -15 * scale, 20 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Right wing
        ctx.save();
        ctx.translate(sx + 60 * scale, sy - 30 * scale - bodyBob);
        ctx.rotate(0.6 - wingFlap);
        ctx.fillStyle = '#5c0a0a';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(50 * scale, -80 * scale, 120 * scale, -40 * scale);
        ctx.quadraticCurveTo(100 * scale, 0, 80 * scale, 40 * scale);
        ctx.quadraticCurveTo(40 * scale, 30 * scale, 0, 10 * scale);
        ctx.closePath();
        ctx.fill();
        const wingGrad2 = ctx.createLinearGradient(120 * scale, -40 * scale, 0, 0);
        wingGrad2.addColorStop(0, '#7f1d1d');
        wingGrad2.addColorStop(0.5, '#991b1b');
        wingGrad2.addColorStop(1, '#b91c1c');
        ctx.fillStyle = wingGrad2;
        ctx.beginPath();
        ctx.moveTo(15 * scale, 5 * scale);
        ctx.quadraticCurveTo(60 * scale, -50 * scale, 100 * scale, -20 * scale);
        ctx.quadraticCurveTo(70 * scale, 10 * scale, 15 * scale, 20 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // === MASSIVE TAIL ===
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 20 * scale;
        ctx.lineCap = 'round';
        const tailWave = Math.sin(time * 3);
        ctx.beginPath();
        ctx.moveTo(sx, sy + 50 * scale - bodyBob);
        ctx.bezierCurveTo(
          sx - 40 * scale, sy + 100 * scale - bodyBob + tailWave * 20,
          sx - 100 * scale, sy + 80 * scale - bodyBob - tailWave * 30,
          sx - 150 * scale, sy + 40 * scale - bodyBob + tailWave * 25
        );
        ctx.stroke();
        // Tail tip with spikes
        ctx.fillStyle = '#1c1917';
        const tailEndX = sx - 150 * scale;
        const tailEndY = sy + 40 * scale - bodyBob + tailWave * 25;
        for (let i = 0; i < 4; i++) {
          const spikeAngle = -0.8 + i * 0.2 + tailWave * 0.1;
          ctx.save();
          ctx.translate(tailEndX + i * 15 * scale, tailEndY - i * 5 * scale);
          ctx.rotate(spikeAngle);
          ctx.beginPath();
          ctx.moveTo(0, -15 * scale);
          ctx.lineTo(-8 * scale, 10 * scale);
          ctx.lineTo(8 * scale, 10 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        
        // === BACK LEGS ===
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.ellipse(sx - 35 * scale, sy + 30 * scale - bodyBob, 20 * scale, 35 * scale, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sx + 35 * scale, sy + 30 * scale - bodyBob, 20 * scale, 35 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // === MASSIVE BODY ===
        const bodyGrad = ctx.createRadialGradient(sx, sy - bodyBob, 0, sx, sy - bodyBob, 80 * scale);
        bodyGrad.addColorStop(0, '#dc2626');
        bodyGrad.addColorStop(0.5, '#b91c1c');
        bodyGrad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(sx, sy - bodyBob + breathe, 70 * scale, 55 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Belly scales
        ctx.fillStyle = '#fbbf24';
        for (let row = 0; row < 4; row++) {
          for (let i = 0; i < 6; i++) {
            const scaleX = sx - 35 * scale + i * 14 * scale;
            const scaleY = sy - 10 * scale + row * 18 * scale - bodyBob + breathe;
            ctx.beginPath();
            ctx.ellipse(scaleX, scaleY, 8 * scale, 6 * scale, 0, Math.PI, 0);
            ctx.fill();
          }
        }
        
        // Back ridge spines
        ctx.fillStyle = '#1c1917';
        for (let i = 0; i < 8; i++) {
          const spineX = sx - 20 * scale + i * 8 * scale;
          const spineY = sy - 55 * scale - bodyBob + breathe + Math.sin(time * 6 + i) * 2;
          ctx.beginPath();
          ctx.moveTo(spineX, spineY);
          ctx.lineTo(spineX - 5 * scale, spineY + 20 * scale);
          ctx.lineTo(spineX + 5 * scale, spineY + 20 * scale);
          ctx.closePath();
          ctx.fill();
        }
        
        // === FRONT LEGS ===
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(sx - 45 * scale, sy + 10 * scale - bodyBob);
        ctx.quadraticCurveTo(sx - 55 * scale, sy + 40 * scale - bodyBob, sx - 50 * scale, sy + 70 * scale - bodyBob);
        ctx.lineTo(sx - 35 * scale, sy + 70 * scale - bodyBob);
        ctx.quadraticCurveTo(sx - 35 * scale, sy + 40 * scale - bodyBob, sx - 30 * scale, sy + 10 * scale - bodyBob);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx + 45 * scale, sy + 10 * scale - bodyBob);
        ctx.quadraticCurveTo(sx + 55 * scale, sy + 40 * scale - bodyBob, sx + 50 * scale, sy + 70 * scale - bodyBob);
        ctx.lineTo(sx + 35 * scale, sy + 70 * scale - bodyBob);
        ctx.quadraticCurveTo(sx + 35 * scale, sy + 40 * scale - bodyBob, sx + 30 * scale, sy + 10 * scale - bodyBob);
        ctx.closePath();
        ctx.fill();
        // Claws
        ctx.fillStyle = '#1c1917';
        for (let leg = 0; leg < 2; leg++) {
          const legBaseX = leg === 0 ? sx - 50 * scale : sx + 35 * scale;
          const legDir = leg === 0 ? -1 : 1;
          for (let c = 0; c < 4; c++) {
            ctx.beginPath();
            ctx.moveTo(legBaseX + c * 5 * scale * legDir, sy + 70 * scale - bodyBob);
            ctx.lineTo(legBaseX + c * 5 * scale * legDir + 2 * scale * legDir, sy + 85 * scale - bodyBob);
            ctx.lineTo(legBaseX + c * 5 * scale * legDir + 5 * scale * legDir, sy + 70 * scale - bodyBob);
            ctx.closePath();
            ctx.fill();
          }
        }
        
        // === LONG NECK ===
        const neckGrad = ctx.createLinearGradient(sx, sy - 50 * scale - bodyBob, sx + 30 * scale, sy - 120 * scale - bodyBob);
        neckGrad.addColorStop(0, '#b91c1c');
        neckGrad.addColorStop(1, '#991b1b');
        ctx.fillStyle = neckGrad;
        ctx.beginPath();
        ctx.moveTo(sx - 20 * scale, sy - 40 * scale - bodyBob + breathe);
        ctx.quadraticCurveTo(sx, sy - 80 * scale - bodyBob, sx + 20 * scale, sy - 110 * scale - bodyBob);
        ctx.lineTo(sx + 40 * scale, sy - 105 * scale - bodyBob);
        ctx.quadraticCurveTo(sx + 25 * scale, sy - 70 * scale - bodyBob, sx + 20 * scale, sy - 40 * scale - bodyBob + breathe);
        ctx.closePath();
        ctx.fill();
        // Neck spines
        ctx.fillStyle = '#1c1917';
        for (let i = 0; i < 5; i++) {
          const neckProgress = i / 5;
          const neckX = sx - 5 * scale + neckProgress * 25 * scale;
          const neckY = sy - 50 * scale - neckProgress * 55 * scale - bodyBob;
          ctx.beginPath();
          ctx.moveTo(neckX, neckY - 12 * scale);
          ctx.lineTo(neckX - 4 * scale, neckY + 5 * scale);
          ctx.lineTo(neckX + 4 * scale, neckY + 5 * scale);
          ctx.closePath();
          ctx.fill();
        }
        
        // === MASSIVE HEAD ===
        const headX = sx + 30 * scale;
        const headY = sy - 120 * scale - bodyBob;
        const headGrad = ctx.createRadialGradient(headX, headY, 0, headX, headY, 35 * scale);
        headGrad.addColorStop(0, '#dc2626');
        headGrad.addColorStop(0.7, '#b91c1c');
        headGrad.addColorStop(1, '#991b1b');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.ellipse(headX, headY, 35 * scale, 28 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Snout
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.ellipse(headX + 40 * scale, headY + 5 * scale, 25 * scale, 18 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Jaw
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.ellipse(headX + 30 * scale, headY + 20 * scale, 28 * scale, 12 * scale, 0.2, 0, Math.PI);
        ctx.fill();
        
        // Teeth
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 6; i++) {
          const toothX = headX + 15 * scale + i * 10 * scale;
          const toothY = headY + 12 * scale;
          ctx.beginPath();
          ctx.moveTo(toothX, toothY);
          ctx.lineTo(toothX - 3 * scale, toothY + 10 * scale);
          ctx.lineTo(toothX + 3 * scale, toothY + 10 * scale);
          ctx.closePath();
          ctx.fill();
        }
        
        // MASSIVE HORNS
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(headX - 15 * scale, headY - 20 * scale);
        ctx.quadraticCurveTo(headX - 30 * scale, headY - 50 * scale, headX - 25 * scale, headY - 70 * scale);
        ctx.lineTo(headX - 15 * scale, headY - 65 * scale);
        ctx.quadraticCurveTo(headX - 20 * scale, headY - 45 * scale, headX - 5 * scale, headY - 18 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(headX + 10 * scale, headY - 22 * scale);
        ctx.quadraticCurveTo(headX + 5 * scale, headY - 55 * scale, headX + 15 * scale, headY - 80 * scale);
        ctx.lineTo(headX + 25 * scale, headY - 75 * scale);
        ctx.quadraticCurveTo(headX + 20 * scale, headY - 50 * scale, headX + 20 * scale, headY - 20 * scale);
        ctx.closePath();
        ctx.fill();
        
        // Glowing eyes
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(headX + 20 * scale, headY - 8 * scale, 10 * scale, 8 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(headX - 5 * scale, headY - 5 * scale, 10 * scale, 8 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(headX + 22 * scale, headY - 8 * scale, 3 * scale, 6 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(headX - 3 * scale, headY - 5 * scale, 3 * scale, 6 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Fire breath from nostrils
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(headX + 55 * scale, headY + 2 * scale, 4 * scale, 3 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(headX + 55 * scale, headY + 12 * scale, 4 * scale, 3 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();
        for (let n = 0; n < 2; n++) {
          const nostrilY = headY + (n === 0 ? 2 : 12) * scale;
          for (let i = 0; i < 4; i++) {
            const fireX = headX + 60 * scale + i * 8 * scale + Math.sin(time * 8 + i + n) * 5;
            const fireY = nostrilY + Math.sin(time * 10 + i) * 3;
            const fireSize = (4 - i) * scale;
            ctx.globalAlpha = 0.6 - i * 0.15;
            ctx.fillStyle = i < 2 ? '#fbbf24' : '#f97316';
            ctx.beginPath();
            ctx.arc(fireX, fireY, fireSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        
        // === DRAGON HEALTH BAR (custom, larger) ===
        const dhbW = 200;
        const dhbY = sy - 200 * scale - bodyBob;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(sx - dhbW / 2 - 4, dhbY - 4, dhbW + 8, 24);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(sx - dhbW / 2, dhbY, dhbW, 16);
        
        const healthPct = enemy.health / enemy.maxHealth;
        const hpGrad = ctx.createLinearGradient(sx - dhbW / 2, dhbY, sx - dhbW / 2 + dhbW * healthPct, dhbY);
        hpGrad.addColorStop(0, '#dc2626');
        hpGrad.addColorStop(0.5, '#f97316');
        hpGrad.addColorStop(1, '#fbbf24');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(sx - dhbW / 2, dhbY, dhbW * healthPct, 16);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(enemy.health)} / ${enemy.maxHealth}`, sx, dhbY + 13);
        
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 18px Arial';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.fillText('🐉 INFERNAL DRAGON 🐉', sx, dhbY - 15);
        ctx.shadowBlur = 0;
        
        const phase = enemy.health < enemy.maxHealth * 0.25 ? 3 : 
                      enemy.health < enemy.maxHealth * 0.5 ? 2 : 1;
        if (phase > 1) {
          ctx.fillStyle = phase === 3 ? '#dc2626' : '#f97316';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(`⚠️ PHASE ${phase} ${phase === 3 ? '- ENRAGED!' : ''} ⚠️`, sx, dhbY - 35);
        }
        
        // Skip default health bar for dragon (we drew our own)
        continue;
      }
      else if (bossType === 'custom_boss') {
        // ========== CUSTOM DUNGEON BOSS - Themed creature ==========
        const bossColor = enemy.color || color;
        const bossRadius = Math.min(enemy.radius || 80, 100); // Cap visual size
        const sc = bossRadius / 50;
        const breathe = Math.sin(time * 1.8) * 3 * sc;
        const bodyBob = Math.sin(time * 2.2) * 2 * sc;
        
        // Aura glow
        const auraGrad = ctx.createRadialGradient(sx, sy - bodyBob, bossRadius * 0.3, sx, sy - bodyBob, bossRadius * 1.8);
        auraGrad.addColorStop(0, bossColor + '60');
        auraGrad.addColorStop(0.5, bossColor + '20');
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(sx, sy - bodyBob, bossRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Orbiting rune particles
        for (let i = 0; i < 6; i++) {
          const oAngle = time * 1.5 + (i * Math.PI * 2 / 6);
          const oDist = bossRadius * 1.2 + Math.sin(time * 3 + i) * 8;
          const ox = sx + Math.cos(oAngle) * oDist;
          const oy = sy - bodyBob + Math.sin(oAngle) * oDist * 0.4;
          ctx.beginPath();
          ctx.arc(ox, oy, 3 * sc, 0, Math.PI * 2);
          ctx.fillStyle = bossColor + 'aa';
          ctx.fill();
        }
        
        // Shadow
        ctx.beginPath();
        ctx.ellipse(sx, sy + 30 * sc, 40 * sc, 12 * sc, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();

        // Wings (behind body)
        for (let wing = -1; wing <= 1; wing += 2) {
          ctx.save();
          ctx.translate(sx + wing * 30 * sc, sy - 15 * sc - bodyBob);
          ctx.rotate(wing * (0.4 + Math.sin(time * 2.5) * 0.2));
          ctx.fillStyle = bossColor + '66';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(wing * 40 * sc, -50 * sc, wing * 70 * sc, -20 * sc);
          ctx.quadraticCurveTo(wing * 50 * sc, 10 * sc, 0, 5 * sc);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = bossColor + '88';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
        
        // Body
        const bodyGrad = ctx.createRadialGradient(sx, sy - bodyBob, 0, sx, sy - bodyBob, 40 * sc);
        bodyGrad.addColorStop(0, bossColor);
        bodyGrad.addColorStop(0.7, bossColor + 'cc');
        bodyGrad.addColorStop(1, bossColor + '88');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(sx, sy - bodyBob + breathe, 38 * sc, 32 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2 * sc;
        ctx.stroke();
        
        // Belly lighter area
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 8 * sc - bodyBob + breathe, 22 * sc, 16 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Horns/Crown
        for (let h = -1; h <= 1; h += 2) {
          ctx.fillStyle = bossColor + 'dd';
          ctx.beginPath();
          ctx.moveTo(sx + h * 14 * sc, sy - 28 * sc - bodyBob);
          ctx.lineTo(sx + h * 22 * sc, sy - 55 * sc - bodyBob + Math.sin(time * 4 + h) * 3);
          ctx.lineTo(sx + h * 8 * sc, sy - 32 * sc - bodyBob);
          ctx.closePath();
          ctx.fill();
        }
        // Center horn
        ctx.fillStyle = bossColor;
        ctx.beginPath();
        ctx.moveTo(sx - 5 * sc, sy - 30 * sc - bodyBob);
        ctx.lineTo(sx, sy - 60 * sc - bodyBob + Math.sin(time * 3) * 2);
        ctx.lineTo(sx + 5 * sc, sy - 30 * sc - bodyBob);
        ctx.closePath();
        ctx.fill();
        
        // Eyes - menacing
        const eyeGlow = 0.6 + Math.sin(time * 4) * 0.4;
        for (let e = -1; e <= 1; e += 2) {
          // Eye socket
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.beginPath();
          ctx.ellipse(sx + e * 12 * sc, sy - 12 * sc - bodyBob, 8 * sc, 7 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
          // Glowing eye
          ctx.fillStyle = `rgba(255,255,255,${eyeGlow})`;
          ctx.beginPath();
          ctx.ellipse(sx + e * 12 * sc, sy - 12 * sc - bodyBob, 5 * sc, 4 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
          // Pupil slit
          ctx.fillStyle = bossColor;
          ctx.beginPath();
          ctx.ellipse(sx + e * 12 * sc, sy - 12 * sc - bodyBob, 2 * sc, 5 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Mouth - jagged grin
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5 * sc;
        ctx.beginPath();
        ctx.moveTo(sx - 15 * sc, sy + 2 * sc - bodyBob);
        for (let t = 0; t < 6; t++) {
          const tx = sx - 15 * sc + t * 6 * sc;
          ctx.lineTo(tx + 3 * sc, sy + (t % 2 === 0 ? 6 : -1) * sc - bodyBob);
        }
        ctx.stroke();
        
        // Phase indicator particles
        const phase = enemy.phase || 1;
        if (phase >= 2) {
          for (let i = 0; i < 4 * phase; i++) {
            const pAngle = time * 2 + i * 0.7;
            const pDist = bossRadius * 0.8 + Math.sin(time * 5 + i * 2) * 15;
            ctx.beginPath();
            ctx.arc(
              sx + Math.cos(pAngle) * pDist,
              sy - bodyBob + Math.sin(pAngle) * pDist * 0.5,
              2 * sc, 0, Math.PI * 2
            );
            ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(time * 8 + i) * 0.2})`;
            ctx.fill();
          }
        }
        
        // Custom boss health bar (larger than default)
        const cbhW = 80;
        const cbhY = sy - 75 * sc;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(sx - cbhW / 2 - 2, cbhY - 2, cbhW + 4, 12);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(sx - cbhW / 2, cbhY, cbhW, 8);
        const hpRatio = enemy.health / enemy.maxHealth;
        const hpColor = hpRatio > 0.5 ? bossColor : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillStyle = hpColor;
        ctx.fillRect(sx - cbhW / 2, cbhY, cbhW * hpRatio, 8);
        
        // Boss name
        ctx.fillStyle = bossColor;
        ctx.font = `bold ${12 * sc}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(enemy.name || 'BOSS', sx, cbhY - 6);
      }
      else {
        // Default boss (fallback)
        ctx.beginPath();
        ctx.arc(sx, sy - bounce, 34, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx - 8, sy - 8 - bounce, 6, 0, Math.PI * 2);
        ctx.arc(sx + 8, sy - 8 - bounce, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sx - 8, sy - 8 - bounce, 3, 0, Math.PI * 2);
        ctx.arc(sx + 8, sy - 8 - bounce, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Boss health bar (all bosses)
      const hbW = 60;
      const hbY = sy - 70;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(sx - hbW / 2 - 2, hbY - 2, hbW + 4, 10);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(sx - hbW / 2, hbY, hbW, 6);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(sx - hbW / 2, hbY, hbW * enemy.health / enemy.maxHealth, 6);
      
      // Boss name
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.name || 'BOSS', sx, hbY - 5);
    }
    // ========== REGULAR ENEMIES (Zone-themed) ==========
    else {

      const enemyType = enemy.type;
      
      if (enemyType === 'slime') {
        // Bouncy slime blob
        const squish = 1 + Math.sin(time * 5) * 0.15;
        ctx.beginPath();
        ctx.ellipse(sx, sy - bounce + 4, 16 * squish, 12 / squish, 0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // Shine
        ctx.beginPath();
        ctx.ellipse(sx - 4, sy - 4 - bounce, 4, 3, -0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sx - 4, sy - 2 - bounce, 2.5, 0, Math.PI * 2);
        ctx.arc(sx + 4, sy - 2 - bounce, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (enemyType === 'bat') {
        // Flying bat with wings
        const wingFlap = Math.sin(time * 15) * 0.6;
        // Wings
        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(sx - 8, sy - bounce);
        ctx.rotate(-0.3 + wingFlap);
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(sx + 8, sy - bounce);
        ctx.rotate(0.3 - wingFlap);
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Body
        ctx.beginPath();
        ctx.ellipse(sx, sy - bounce, 8, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(sx - 3, sy - 3 - bounce, 2, 0, Math.PI * 2);
        ctx.arc(sx + 3, sy - 3 - bounce, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (enemyType === 'skeleton') {
        // Skeletal warrior
        ctx.fillStyle = color;
        // Skull
        ctx.beginPath();
        ctx.arc(sx, sy - 10 - bounce, 9, 0, Math.PI * 2);
        ctx.fill();
        // Ribcage body
        ctx.fillRect(sx - 6, sy - 2 - bounce, 12, 16);
        // Eye sockets
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sx - 3, sy - 12 - bounce, 2.5, 0, Math.PI * 2);
        ctx.arc(sx + 3, sy - 12 - bounce, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Jaw
        ctx.fillStyle = '#999';
        ctx.fillRect(sx - 4, sy - 4 - bounce, 8, 3);
      }
      else if (enemyType === 'ghost') {
        // Transparent floating ghost
        const wobble = Math.sin(time * 3) * 3;
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy - 8 - bounce + wobble, 12, Math.PI, 0);
        ctx.lineTo(sx + 12, sy + 10 - bounce + wobble);
        ctx.quadraticCurveTo(sx + 8, sy + 5, sx + 4, sy + 12);
        ctx.quadraticCurveTo(sx, sy + 7, sx - 4, sy + 12);
        ctx.quadraticCurveTo(sx - 8, sy + 5, sx - 12, sy + 10);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        // Spooky eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(sx - 4, sy - 8 - bounce + wobble, 3, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(sx + 4, sy - 8 - bounce + wobble, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (enemyType === 'spider') {
        // Creepy spider with legs
        // Legs
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const legAngle = -0.8 + i * 0.5 + Math.sin(time * 8 + i) * 0.2;
          ctx.beginPath();
          ctx.moveTo(sx - 4, sy - bounce);
          ctx.lineTo(sx - 4 - Math.cos(legAngle) * 12, sy - bounce + Math.sin(legAngle) * 10);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx + 4, sy - bounce);
          ctx.lineTo(sx + 4 + Math.cos(legAngle) * 12, sy - bounce + Math.sin(legAngle) * 10);
          ctx.stroke();
        }
        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(sx, sy - bounce, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes (multiple)
        ctx.fillStyle = '#f00';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(sx - 3 + i * 2, sy - 2 - bounce, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      else if (enemyType === 'golem') {
        // Rocky golem
        ctx.fillStyle = color;
        // Main body - blocky
        ctx.fillRect(sx - 14, sy - 12 - bounce, 28, 28);
        // Head
        ctx.fillRect(sx - 10, sy - 22 - bounce, 20, 14);
        // Cracks
        ctx.strokeStyle = '#57534e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy - bounce);
        ctx.lineTo(sx - 2, sy + 12 - bounce);
        ctx.moveTo(sx + 5, sy - 8 - bounce);
        ctx.lineTo(sx + 10, sy + 5 - bounce);
        ctx.stroke();
        // Glowing eyes
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 5;
        ctx.fillRect(sx - 7, sy - 18 - bounce, 5, 4);
        ctx.fillRect(sx + 2, sy - 18 - bounce, 5, 4);
        ctx.shadowBlur = 0;
      }
      else if (enemyType === 'fireElemental') {
        // Flaming elemental
        const flicker = Math.sin(time * 10) * 3;
        // Flames
        for (let i = 0; i < 5; i++) {
          const flameX = sx + (i - 2) * 5;
          const flameH = 15 + Math.sin(time * 8 + i * 2) * 5;
          ctx.fillStyle = i % 2 ? '#ff6b35' : '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(flameX - 4, sy + 5 - bounce);
          ctx.quadraticCurveTo(flameX, sy - flameH - bounce + flicker, flameX + 4, sy + 5 - bounce);
          ctx.fill();
        }
        // Core
        ctx.beginPath();
        ctx.arc(sx, sy - bounce, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(sx - 3, sy - 2 - bounce, 2, 0, Math.PI * 2);
        ctx.arc(sx + 3, sy - 2 - bounce, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (enemyType === 'iceElemental') {
        // Frozen elemental
        const shimmer = 0.7 + Math.sin(time * 4) * 0.2;
        // Crystal body
        ctx.globalAlpha = shimmer;
        ctx.fillStyle = '#67e8f9';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 18 - bounce);
        ctx.lineTo(sx + 12, sy - bounce);
        ctx.lineTo(sx + 8, sy + 12 - bounce);
        ctx.lineTo(sx - 8, sy + 12 - bounce);
        ctx.lineTo(sx - 12, sy - bounce);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Cold aura
        ctx.beginPath();
        ctx.arc(sx, sy - bounce, 18, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      else if (enemyType === 'necromancer') {
        // Dark hooded figure
        ctx.fillStyle = color;
        // Robe
        ctx.beginPath();
        ctx.moveTo(sx, sy - 16 - bounce);
        ctx.lineTo(sx - 10, sy + 12 - bounce);
        ctx.lineTo(sx + 10, sy + 12 - bounce);
        ctx.closePath();
        ctx.fill();
        // Hood
        ctx.beginPath();
        ctx.arc(sx, sy - 12 - bounce, 8, Math.PI, 0);
        ctx.lineTo(sx + 10, sy - 4 - bounce);
        ctx.lineTo(sx - 10, sy - 4 - bounce);
        ctx.closePath();
        ctx.fill();
        // Glowing eyes
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(sx - 3, sy - 10 - bounce, 2, 0, Math.PI * 2);
        ctx.arc(sx + 3, sy - 10 - bounce, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Staff
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy - 8 - bounce);
        ctx.lineTo(sx + 12, sy + 12 - bounce);
        ctx.stroke();
      }
      // ========== DUNGEON ENEMIES ==========
      else if (enemyType === 'dungeon_skeleton') {
        // Cursed Knight - armored undead
        ctx.fillStyle = '#44403c';
        // Helmet
        ctx.beginPath();
        ctx.arc(sx, sy - 14 - bounce, 10, Math.PI, 0);
        ctx.lineTo(sx + 10, sy - 8 - bounce);
        ctx.lineTo(sx - 10, sy - 8 - bounce);
        ctx.closePath();
        ctx.fill();
        // Armor body
        ctx.fillRect(sx - 8, sy - 8 - bounce, 16, 20);
        // Pauldrons (shoulder armor)
        ctx.beginPath();
        ctx.arc(sx - 10, sy - 6 - bounce, 6, 0, Math.PI * 2);
        ctx.arc(sx + 10, sy - 6 - bounce, 6, 0, Math.PI * 2);
        ctx.fill();
        // Red glowing eyes
        ctx.fillStyle = '#dc2626';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sx - 3, sy - 16 - bounce, 2, 0, Math.PI * 2);
        ctx.arc(sx + 3, sy - 16 - bounce, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Sword
        ctx.strokeStyle = '#a8a29e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx + 12, sy - 10 - bounce);
        ctx.lineTo(sx + 20, sy - 25 - bounce);
        ctx.stroke();
      }
      else if (enemyType === 'dungeon_wraith') {
        // Soul Wraith - ethereal spirit

        const wobble = Math.sin(time * 4) * 4;
        ctx.globalAlpha = 0.6;
        // Ghostly body
        const gradient = ctx.createRadialGradient(sx, sy - bounce + wobble, 0, sx, sy - bounce + wobble, 25);
        gradient.addColorStop(0, '#3730a3');
        gradient.addColorStop(0.5, '#1e1b4b');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy - bounce + wobble, 20, 0, Math.PI * 2);
        ctx.fill();
        // Inner form
        ctx.fillStyle = '#4338ca';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 5 - bounce + wobble, 10, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hollow eyes
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx - 4, sy - 8 - bounce + wobble, 3, 0, Math.PI * 2);
        ctx.arc(sx + 4, sy - 8 - bounce + wobble, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        // Trailing wisps
        for (let i = 0; i < 3; i++) {
          const wispY = sy + 10 + i * 8 - bounce + wobble;
          ctx.globalAlpha = 0.3 - i * 0.1;
          ctx.fillStyle = '#3730a3';
          ctx.beginPath();
          ctx.ellipse(sx + Math.sin(time * 3 + i) * 5, wispY, 6 - i * 2, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      else if (enemyType === 'dungeon_golem') {
        // Obsidian Guardian - massive stone construct
        ctx.fillStyle = '#1c1917';
        // Massive body
        ctx.fillRect(sx - 16, sy - 10 - bounce, 32, 28);
        // Head
        ctx.beginPath();
        ctx.arc(sx, sy - 18 - bounce, 14, 0, Math.PI * 2);
        ctx.fill();
        // Glowing runes
        ctx.strokeStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        // Rune on chest
        ctx.beginPath();
        ctx.moveTo(sx, sy - 8 - bounce);
        ctx.lineTo(sx - 6, sy + 4 - bounce);
        ctx.lineTo(sx + 6, sy + 4 - bounce);
        ctx.closePath();
        ctx.stroke();
        // Glowing eyes
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(sx - 5, sy - 20 - bounce, 3, 0, Math.PI * 2);
        ctx.arc(sx + 5, sy - 20 - bounce, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Arms
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(sx - 24, sy - 8 - bounce, 8, 20);
        ctx.fillRect(sx + 16, sy - 8 - bounce, 8, 20);
      }
      else if (enemyType === 'dungeon_demon') {
        // Infernal Demon - fiery hellspawn
        // Fire aura
        ctx.fillStyle = 'rgba(249, 115, 22, 0.3)';
        ctx.beginPath();
        ctx.arc(sx, sy - bounce, 25, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.ellipse(sx, sy - bounce, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Horns
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy - 16 - bounce);
        ctx.lineTo(sx - 14, sy - 30 - bounce);
        ctx.lineTo(sx - 4, sy - 18 - bounce);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy - 16 - bounce);
        ctx.lineTo(sx + 14, sy - 30 - bounce);
        ctx.lineTo(sx + 4, sy - 18 - bounce);
        ctx.closePath();
        ctx.fill();
        // Flaming eyes
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx - 4, sy - 8 - bounce, 3, 0, Math.PI * 2);
        ctx.arc(sx + 4, sy - 8 - bounce, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Fire on top
        for (let i = 0; i < 4; i++) {
          const fx = sx - 6 + i * 4;
          const fh = 8 + Math.sin(time * 12 + i * 2) * 4;
          ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(fx - 3, sy - 18 - bounce);
          ctx.lineTo(fx, sy - 18 - fh - bounce);
          ctx.lineTo(fx + 3, sy - 18 - bounce);
          ctx.closePath();
          ctx.fill();
        }
      }
      // ========== MINI-BOSSES ==========
      else if (enemyType === 'dungeon_minotaur') {
        // Ironhide Minotaur - massive bull-headed warrior

        const breathe = Math.sin(time * 2) * 2;
        const isCharging = enemy.isCharging;
        const chargeIntensity = isCharging ? Math.sin(time * 20) * 5 : 0;
        
        // Dust cloud when charging
        if (isCharging) {
          ctx.globalAlpha = 0.4;
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(sx - 20 - i * 15 + Math.random() * 10, sy + 30 + Math.random() * 10, 8 + Math.random() * 8, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        
        // Massive body
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(sx, sy - bounce + breathe + chargeIntensity, 35, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Muscular arms
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(sx - 35, sy - 10 - bounce, 15, 25, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sx + 35, sy - 10 - bounce, 15, 25, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Fists
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(sx - 45, sy + 15 - bounce, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + 45, sy + 15 - bounce, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Legs
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx - 20, sy + 25 - bounce, 15, 30);
        ctx.fillRect(sx + 5, sy + 25 - bounce, 15, 30);
        // Hooves
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(sx - 22, sy + 52 - bounce, 19, 8);
        ctx.fillRect(sx + 3, sy + 52 - bounce, 19, 8);
        
        // Bull head
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 50 - bounce + chargeIntensity, 28, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        // Snout
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 40 - bounce + chargeIntensity, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Nostrils with steam
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(sx - 6, sy - 38 - bounce + chargeIntensity, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sx + 6, sy - 38 - bounce + chargeIntensity, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Steam from nostrils
        if (isCharging || Math.random() > 0.7) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#d4d4d4';
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(sx - 6 + Math.sin(time * 10 + i) * 5, sy - 45 - i * 6 - bounce, 4 - i, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx + 6 + Math.sin(time * 10 + i + 1) * 5, sy - 45 - i * 6 - bounce, 4 - i, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        
        // Angry eyes
        ctx.fillStyle = '#dc2626';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = isCharging ? 15 : 8;
        ctx.beginPath();
        ctx.ellipse(sx - 10, sy - 55 - bounce + chargeIntensity, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sx + 10, sy - 55 - bounce + chargeIntensity, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sx - 10, sy - 55 - bounce + chargeIntensity, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + 10, sy - 55 - bounce + chargeIntensity, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // MASSIVE HORNS
        ctx.fillStyle = '#1c1917';
        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 2;
        // Left horn
        ctx.beginPath();
        ctx.moveTo(sx - 20, sy - 60 - bounce + chargeIntensity);
        ctx.quadraticCurveTo(sx - 45, sy - 75 - bounce, sx - 55, sy - 50 - bounce + chargeIntensity);
        ctx.quadraticCurveTo(sx - 50, sy - 60 - bounce, sx - 25, sy - 58 - bounce + chargeIntensity);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Right horn
        ctx.beginPath();
        ctx.moveTo(sx + 20, sy - 60 - bounce + chargeIntensity);
        ctx.quadraticCurveTo(sx + 45, sy - 75 - bounce, sx + 55, sy - 50 - bounce + chargeIntensity);
        ctx.quadraticCurveTo(sx + 50, sy - 60 - bounce, sx + 25, sy - 58 - bounce + chargeIntensity);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Battle axe on back
        ctx.fillStyle = '#57534e';
        ctx.fillRect(sx + 25, sy - 60 - bounce, 8, 70);
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.moveTo(sx + 20, sy - 65 - bounce);
        ctx.lineTo(sx + 15, sy - 45 - bounce);
        ctx.lineTo(sx + 20, sy - 25 - bounce);
        ctx.lineTo(sx + 28, sy - 25 - bounce);
        ctx.lineTo(sx + 28, sy - 65 - bounce);
        ctx.closePath();
        ctx.fill();
        
        // Mini-boss health bar
        const mhbW = 60;
        const mhbY = sy - 90 - bounce;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(sx - mhbW / 2 - 2, mhbY - 2, mhbW + 4, 10);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(sx - mhbW / 2, mhbY, mhbW, 6);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(sx - mhbW / 2, mhbY, mhbW * enemy.health / enemy.maxHealth, 6);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️ MINOTAUR', sx, mhbY - 5);
      }
      else if (enemyType === 'dungeon_lich') {
        // Lich King - undead sorcerer

        const hover = Math.sin(time * 2) * 5;
        const cloakWave = Math.sin(time * 3) * 0.1;
        
        // Dark aura
        const auraGrad = ctx.createRadialGradient(sx, sy + hover, 10, sx, sy + hover, 50);
        auraGrad.addColorStop(0, 'rgba(30, 27, 75, 0.5)');
        auraGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.2)');
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(sx, sy + hover, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Floating robe/cloak
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.moveTo(sx - 25, sy - 20 + hover);
        ctx.quadraticCurveTo(sx - 30 + cloakWave * 20, sy + 30 + hover, sx - 20, sy + 50 + hover);
        ctx.lineTo(sx + 20, sy + 50 + hover);
        ctx.quadraticCurveTo(sx + 30 - cloakWave * 20, sy + 30 + hover, sx + 25, sy - 20 + hover);
        ctx.closePath();
        ctx.fill();
        
        // Inner robe detail
        ctx.fillStyle = '#312e81';
        ctx.beginPath();
        ctx.moveTo(sx - 15, sy - 10 + hover);
        ctx.quadraticCurveTo(sx, sy + 40 + hover, sx + 15, sy - 10 + hover);
        ctx.closePath();
        ctx.fill();
        
        // Skeletal hands
        ctx.strokeStyle = '#d4d4d4';
        ctx.lineWidth = 3;
        // Left hand
        ctx.beginPath();
        ctx.moveTo(sx - 25, sy - 10 + hover);
        ctx.lineTo(sx - 35, sy + 5 + hover);
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(sx - 35, sy + 5 + hover);
          ctx.lineTo(sx - 40 - i * 3, sy + 15 + hover + Math.sin(time * 5 + i) * 2);
          ctx.stroke();
        }
        // Right hand holding staff
        ctx.beginPath();
        ctx.moveTo(sx + 25, sy - 10 + hover);
        ctx.lineTo(sx + 30, sy + 10 + hover);
        ctx.stroke();
        
        // Necromancer staff
        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx + 30, sy + 10 + hover);
        ctx.lineTo(sx + 35, sy + 60 + hover);
        ctx.stroke();
        // Staff orb
        ctx.fillStyle = '#6366f1';
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(sx + 30, sy + hover, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a5b4fc';
        ctx.beginPath();
        ctx.arc(sx + 28, sy - 3 + hover, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Skull head
        ctx.fillStyle = '#d4d4d4';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 35 + hover, 18, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eye sockets with soul fire
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.ellipse(sx - 7, sy - 38 + hover, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sx + 7, sy - 38 + hover, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Soul fire in eyes
        ctx.fillStyle = '#6366f1';
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx - 7, sy - 38 + hover + Math.sin(time * 8) * 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + 7, sy - 38 + hover + Math.sin(time * 8 + 1) * 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Nose hole
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 32 + hover);
        ctx.lineTo(sx - 3, sy - 28 + hover);
        ctx.lineTo(sx + 3, sy - 28 + hover);
        ctx.closePath();
        ctx.fill();
        // Jaw
        ctx.fillStyle = '#a8a29e';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 22 + hover, 12, 6, 0, 0, Math.PI);
        ctx.fill();
        
        // Crown
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(sx - 15, sy - 52 + hover);
        ctx.lineTo(sx - 12, sy - 65 + hover);
        ctx.lineTo(sx - 5, sy - 55 + hover);
        ctx.lineTo(sx, sy - 70 + hover);
        ctx.lineTo(sx + 5, sy - 55 + hover);
        ctx.lineTo(sx + 12, sy - 65 + hover);
        ctx.lineTo(sx + 15, sy - 52 + hover);
        ctx.closePath();
        ctx.fill();
        // Crown gems
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(sx, sy - 60 + hover, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Mini-boss health bar
        const lhbW = 60;
        const lhbY = sy - 85 + hover;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(sx - lhbW / 2 - 2, lhbY - 2, lhbW + 4, 10);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(sx - lhbW / 2, lhbY, lhbW, 6);
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(sx - lhbW / 2, lhbY, lhbW * enemy.health / enemy.maxHealth, 6);
        ctx.fillStyle = '#a5b4fc';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💀 LICH KING', sx, lhbY - 5);
      }
      else {
        // Default circle enemy (fallback)
        ctx.beginPath();
        ctx.arc(sx, sy - bounce, 14, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx - 4, sy - 4 - bounce, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + 4, sy - 4 - bounce, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sx - 4, sy - 4 - bounce, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + 4, sy - 4 - bounce, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Health bar (only if damaged)
      if (enemy.health < enemy.maxHealth) {
        const hbW = 28;
        const hbY = sy - 30;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx - hbW / 2 - 1, hbY - 1, hbW + 2, 6);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(sx - hbW / 2, hbY, hbW, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(sx - hbW / 2, hbY, hbW * enemy.health / enemy.maxHealth, 4);
      }
    }

    // Frozen indicator - Enhanced ice encasement
    if (enemy.isFrozen) {

      const radius = isBoss ? 50 : 22;
      
      // Ice shell
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(103, 232, 249, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Ice crystals around enemy
      const crystalCount = isBoss ? 8 : 5;
      for (let i = 0; i < crystalCount; i++) {
        const angle = (i / crystalCount) * Math.PI * 2 + time * 0.5;
        const cx = sx + Math.cos(angle) * (radius + 8);
        const cy = sy + Math.sin(angle) * (radius + 8);
        
        // Crystal shape
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(3, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fillStyle = '#67e8f9';
        ctx.fill();
        ctx.restore();
      }
      
      // Frost particles
      for (let i = 0; i < 4; i++) {
        const pAngle = time * 2 + i * Math.PI / 2;
        const pDist = radius + 12 + Math.sin(time * 3 + i) * 3;
        const px = sx + Math.cos(pAngle) * pDist;
        const py = sy + Math.sin(pAngle) * pDist;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
    }
  }
}
