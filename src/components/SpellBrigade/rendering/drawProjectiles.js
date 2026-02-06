// Projectile rendering

export function drawProjectiles(rc) {
  const { ctx, cx, cy, width, height, time, projectiles } = rc;

  for (const proj of projectiles || []) {
    const px = proj.x - cx;
    const py = proj.y - cy;
    if (px < -50 || px > width + 50 || py < -50 || py > height + 50) continue;

    const level = proj.level || 1;
    const spellId = proj.spellId || '';
    const ownerClass = proj.ownerClass || '';

    
    // Level-based enhancements
    const sizeBonus = Math.min(level * 0.05, 0.5); // Up to 50% bigger at high levels
    const glowBonus = Math.min(level * 0.1, 1); // More glow at higher levels
    const baseRadius = proj.radius * (1 + sizeBonus);
    
    ctx.save();
    
    // ========== PYROMANCER SPELLS ==========
    if (ownerClass === 'pyromancer') {
      if (spellId === 'fireball') {
        // Fireball - flaming sphere with trail
        const flicker = Math.sin(time * 20 + px) * 0.2 + 1;
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(px, py, baseRadius + 15 + glowBonus * 5, 0, Math.PI * 2);
        const outerGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 15);
        outerGlow.addColorStop(0, `rgba(255,150,0,${0.3 + glowBonus * 0.2})`);
        outerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = outerGlow;
        ctx.fill();
        
        // Fire particles around it
        if (level >= 5) {
          for (let i = 0; i < 3; i++) {
            const angle = time * 5 + (i * Math.PI * 2 / 3);
            const dist = baseRadius + 5;
            const fx = px + Math.cos(angle) * dist;
            const fy = py + Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(fx, fy, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ff6600';
            ctx.fill();
          }
        }
        
        // Core flame
        ctx.beginPath();
        ctx.arc(px, py, baseRadius * flicker, 0, Math.PI * 2);
        const fireGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius);
        fireGrad.addColorStop(0, '#fff');
        fireGrad.addColorStop(0.3, '#ffff00');
        fireGrad.addColorStop(0.7, '#ff6600');
        fireGrad.addColorStop(1, '#cc0000');
        ctx.fillStyle = fireGrad;
        ctx.fill();
      } else if (spellId === 'flamewave') {
        // Flame wave - larger, more dramatic
        const wave = Math.sin(time * 10) * 0.3 + 1;
        ctx.beginPath();
        ctx.arc(px, py, baseRadius * wave, 0, Math.PI * 2);
        const waveGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius * wave);
        waveGrad.addColorStop(0, '#ffff00');
        waveGrad.addColorStop(0.5, '#ff6600');
        waveGrad.addColorStop(1, 'rgba(255,0,0,0.5)');
        ctx.fillStyle = waveGrad;
        ctx.fill();
      } else {
        // Default pyro spell
        ctx.beginPath();
        ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = proj.color || '#f97316';
        ctx.fill();
      }
    }
    // ========== CRYOMANCER SPELLS ==========
    else if (ownerClass === 'cryomancer') {
      if (spellId === 'frostbolt') {
        // Frostbolt - icy crystal
        const spin = time * 3;
        
        // Ice trail effect
        ctx.beginPath();
        ctx.arc(px, py, baseRadius + 12, 0, Math.PI * 2);
        const iceGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 12);
        iceGlow.addColorStop(0, `rgba(150,220,255,${0.4 + glowBonus * 0.2})`);
        iceGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = iceGlow;
        ctx.fill();
        
        // Crystal shape (hexagon)
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = spin + (i * Math.PI / 3);
          const x = px + Math.cos(angle) * baseRadius;
          const y = py + Math.sin(angle) * baseRadius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const crystalGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius);
        crystalGrad.addColorStop(0, '#fff');
        crystalGrad.addColorStop(0.5, '#a5f3fc');
        crystalGrad.addColorStop(1, '#0891b2');
        ctx.fillStyle = crystalGrad;
        ctx.fill();
        
        // Sparkles at higher levels
        if (level >= 5) {
          ctx.fillStyle = '#fff';
          for (let i = 0; i < 4; i++) {
            const sparkAngle = time * 8 + i * Math.PI / 2;
            const sparkDist = baseRadius + 8;
            ctx.beginPath();
            ctx.arc(px + Math.cos(sparkAngle) * sparkDist, py + Math.sin(sparkAngle) * sparkDist, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (spellId === 'blizzard') {
        // Blizzard - swirling ice
        ctx.beginPath();
        ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#67e8f9';
        ctx.fill();
        // Snowflakes
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const angle = time * 2 + i * Math.PI / 3;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(angle) * baseRadius * 0.8, py + Math.sin(angle) * baseRadius * 0.8);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = proj.color || '#22d3ee';
        ctx.fill();
      }
    }
    // ========== ARCANIST SPELLS ==========
    else if (ownerClass === 'arcanist') {
      if (spellId === 'arcanemissile') {
        // Arcane missile - magical energy with runes
        const pulse = Math.sin(time * 15) * 0.2 + 1;
        
        // Outer magic glow
        ctx.beginPath();
        ctx.arc(px, py, baseRadius + 15, 0, Math.PI * 2);
        const arcaneGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 15);
        arcaneGlow.addColorStop(0, `rgba(168,85,247,${0.5 + glowBonus * 0.3})`);
        arcaneGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = arcaneGlow;
        ctx.fill();
        
        // Core energy
        ctx.beginPath();
        ctx.arc(px, py, baseRadius * pulse, 0, Math.PI * 2);
        const coreGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius);
        coreGrad.addColorStop(0, '#fff');
        coreGrad.addColorStop(0.4, '#e879f9');
        coreGrad.addColorStop(1, '#7c3aed');
        ctx.fillStyle = coreGrad;
        ctx.fill();
        
        // Orbiting runes at higher levels
        if (level >= 3) {
          const numRunes = Math.min(3, Math.floor(level / 3));
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < numRunes; i++) {
            const angle = time * 4 + (i * Math.PI * 2 / numRunes);
            const rx = px + Math.cos(angle) * (baseRadius + 10);
            const ry = py + Math.sin(angle) * (baseRadius + 10);
            ctx.beginPath();
            ctx.arc(rx, ry, 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      } else {
        ctx.beginPath();
        ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = proj.color || '#a855f7';
        ctx.fill();
      }
    }
    // ========== VOIDLORD SPELLS ==========
    else if (ownerClass === 'voidlord') {
      if (spellId === 'voidBolt') {
        // Void Bolt - dark energy with swirling void particles
        const pulse = Math.sin(time * 15) * 0.15 + 1;
        
        // Outer void distortion field
        ctx.beginPath();
        ctx.arc(px, py, baseRadius + 25, 0, Math.PI * 2);
        const voidField = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 25);
        voidField.addColorStop(0, 'rgba(255,0,255,0.3)');
        voidField.addColorStop(0.5, 'rgba(26,10,46,0.2)');
        voidField.addColorStop(1, 'transparent');
        ctx.fillStyle = voidField;
        ctx.fill();
        
        // Swirling void particles
        for (let i = 0; i < 6; i++) {
          const angle = time * 8 + (i * Math.PI * 2 / 6);
          const dist = baseRadius + 8 + Math.sin(time * 12 + i) * 4;
          const vx = px + Math.cos(angle) * dist;
          const vy = py + Math.sin(angle) * dist;
          const pSize = 2.5 + Math.sin(time * 10 + i * 2) * 1;
          ctx.beginPath();
          ctx.arc(vx, vy, pSize, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? '#ff00ff' : '#bf00ff';
          ctx.fill();
        }
        
        // Inner void ring
        ctx.beginPath();
        ctx.arc(px, py, baseRadius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,0,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Core - dark void center with magenta edge
        ctx.beginPath();
        ctx.arc(px, py, baseRadius * pulse, 0, Math.PI * 2);
        const voidCore = ctx.createRadialGradient(px, py, 0, px, py, baseRadius);
        voidCore.addColorStop(0, '#000');
        voidCore.addColorStop(0.5, '#1a0a2e');
        voidCore.addColorStop(0.8, '#8b00ff');
        voidCore.addColorStop(1, '#ff00ff');
        ctx.fillStyle = voidCore;
        ctx.fill();
        
        // Eye of void center
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      } else if (spellId === 'annihilate') {
        // Annihilate AOE - massive void explosion
        const expand = Math.sin(time * 6) * 0.2 + 1;
        ctx.beginPath();
        ctx.arc(px, py, baseRadius * expand, 0, Math.PI * 2);
        const aniGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius * expand);
        aniGrad.addColorStop(0, 'rgba(0,0,0,0.8)');
        aniGrad.addColorStop(0.4, 'rgba(139,0,255,0.6)');
        aniGrad.addColorStop(0.7, 'rgba(255,0,255,0.3)');
        aniGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = aniGrad;
        ctx.fill();
        
        // Lightning tendrils
        for (let i = 0; i < 8; i++) {
          const angle = time * 3 + (i * Math.PI / 4);
          const len = baseRadius * 0.7;
          ctx.beginPath();
          ctx.moveTo(px, py);
          const mx = px + Math.cos(angle + Math.sin(time * 20 + i) * 0.3) * len * 0.5;
          const my = py + Math.sin(angle + Math.sin(time * 20 + i) * 0.3) * len * 0.5;
          ctx.quadraticCurveTo(mx, my, px + Math.cos(angle) * len, py + Math.sin(angle) * len);
          ctx.strokeStyle = `rgba(255,0,255,${0.3 + Math.sin(time * 15 + i) * 0.2})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else {
        // Other voidlord spells (soul drain etc)
        ctx.beginPath();
        ctx.arc(px, py, baseRadius + 10, 0, Math.PI * 2);
        const vGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 10);
        vGrad.addColorStop(0, '#ff00ff');
        vGrad.addColorStop(0.5, '#8b00ff');
        vGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = vGrad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a0a2e';
        ctx.fill();
      }
    }
    // ========== SHADOW ARCHER SPELLS ==========
    else if (ownerClass === 'shadowarcher') {
      if (spellId === 'shadowArrow' || spellId === 'huntersMark' || spellId === 'deathArrow') {
        // Arrow projectile - elongated with trail
        const angle = Math.atan2(proj.vy || 0, proj.vx || 0);
        const isDeathArrow = spellId === 'deathArrow';
        const isHuntersMark = spellId === 'huntersMark';
        const arrowLen = isDeathArrow ? 28 : 18;
        const pulse = Math.sin(time * 12) * 0.15 + 1;
        
        // Trailing shadow particles
        for (let i = 1; i <= 4; i++) {
          const trailX = px - Math.cos(angle) * i * 8;
          const trailY = py - Math.sin(angle) * i * 8;
          const trailAlpha = 0.4 - i * 0.08;
          ctx.beginPath();
          ctx.arc(trailX, trailY, 3 - i * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = isDeathArrow 
            ? `rgba(220,38,38,${trailAlpha})` 
            : isHuntersMark 
              ? `rgba(220,38,38,${trailAlpha})`
              : `rgba(15,23,42,${trailAlpha + 0.1})`;
          ctx.fill();
        }
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(px, py, baseRadius + (isDeathArrow ? 18 : 10), 0, Math.PI * 2);
        const arrowGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + (isDeathArrow ? 18 : 10));
        arrowGlow.addColorStop(0, isDeathArrow ? 'rgba(220,38,38,0.5)' : 'rgba(220,38,38,0.25)');
        arrowGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = arrowGlow;
        ctx.fill();
        
        // Arrow shaft
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        
        // Shaft body
        ctx.beginPath();
        ctx.moveTo(-arrowLen, 0);
        ctx.lineTo(arrowLen * 0.5, 0);
        ctx.strokeStyle = isDeathArrow ? '#000' : '#0f172a';
        ctx.lineWidth = isDeathArrow ? 3 : 2;
        ctx.stroke();
        
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(arrowLen * 0.5 + 6, 0);
        ctx.lineTo(arrowLen * 0.5 - 2, -4);
        ctx.lineTo(arrowLen * 0.5 - 2, 4);
        ctx.closePath();
        ctx.fillStyle = isDeathArrow ? '#dc2626' : '#991b1b';
        ctx.fill();
        
        // Fletching
        ctx.beginPath();
        ctx.moveTo(-arrowLen, -3);
        ctx.lineTo(-arrowLen + 6, 0);
        ctx.lineTo(-arrowLen, 3);
        ctx.fillStyle = isDeathArrow ? '#dc2626' : '#64748b';
        ctx.fill();
        
        ctx.restore();
        
        // Death Arrow: spinning dark runes around it
        if (isDeathArrow) {
          for (let i = 0; i < 4; i++) {
            const runeAngle = time * 6 + (i * Math.PI / 2);
            const dist = baseRadius + 10;
            const rx = px + Math.cos(runeAngle) * dist;
            const ry = py + Math.sin(runeAngle) * dist;
            ctx.beginPath();
            ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220,38,38,${0.5 + Math.sin(time * 10 + i) * 0.3})`;
            ctx.fill();
          }
        }
        
        // Hunter's Mark: pulsing red crosshair effect
        if (isHuntersMark) {
          ctx.strokeStyle = `rgba(220,38,38,${0.3 + Math.sin(time * 8) * 0.2})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, baseRadius + 8 * pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (spellId === 'piercingVolley') {
        // Volley AOE - rain of arrows effect
        const expand = Math.sin(time * 5) * 0.15 + 1;
        ctx.beginPath();
        ctx.arc(px, py, baseRadius * expand, 0, Math.PI * 2);
        const volGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius * expand);
        volGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
        volGrad.addColorStop(0.5, 'rgba(220,38,38,0.3)');
        volGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = volGrad;
        ctx.fill();
        
        // Arrow rain particles
        for (let i = 0; i < 8; i++) {
          const aAngle = time * 2 + (i * Math.PI / 4);
          const dist = baseRadius * 0.3 + Math.sin(time * 8 + i * 3) * baseRadius * 0.4;
          const ax = px + Math.cos(aAngle) * dist;
          const ay = py + Math.sin(aAngle) * dist;
          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(-Math.PI / 4 + Math.sin(time * 5 + i) * 0.3);
          ctx.beginPath();
          ctx.moveTo(-5, 0);
          ctx.lineTo(5, 0);
          ctx.strokeStyle = `rgba(220,38,38,${0.5 + Math.sin(time * 10 + i) * 0.3})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Tiny arrowhead
          ctx.beginPath();
          ctx.moveTo(5, 0);
          ctx.lineTo(3, -2);
          ctx.lineTo(3, 2);
          ctx.closePath();
          ctx.fillStyle = '#dc2626';
          ctx.fill();
          ctx.restore();
        }
      } else {
        // Default shadow archer spell
        ctx.beginPath();
        ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = proj.color || '#0f172a';
        ctx.fill();
      }
    }
    // ========== DEFAULT/OTHER SPELLS ==========
    else {
      // Default glow
      ctx.beginPath();
      ctx.arc(px, py, baseRadius + 10, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 10);
      grad.addColorStop(0, proj.color || '#fff');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    
    ctx.restore();
  }
}
