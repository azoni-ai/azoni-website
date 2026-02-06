// Visual effects rendering: meteor warnings, explosions, abilities, etc.

export function drawEffects(rc) {
  const { ctx, cx, cy, width, height, now, players, effectsRef, meteorWarningsRef } = rc;

  // Meteor warnings

  meteorWarningsRef.current = meteorWarningsRef.current.filter(m => {
    const elapsed = now - m.startTime;
    if (elapsed > m.delay) return false;

    const mx = m.x - cx;
    const my = m.y - cy;
    const progress = elapsed / m.delay;

    ctx.beginPath();
    ctx.arc(mx, my, m.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,100,0,${0.5 + Math.sin(elapsed * 0.02) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(mx, my, m.radius * (1 - progress), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,100,0,${0.2 * (1 - progress)})`;
    ctx.fill();

    return true;
  });


  effectsRef.current = effectsRef.current.filter(ef => {
    const elapsed = now - ef.startTime;
    if (elapsed > ef.duration) return false;

    const progress = elapsed / ef.duration;
    const alpha = 1 - progress;

    if (ef.type === 'explosion') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const cr = ef.radius * (0.5 + progress * 0.5);
      ctx.beginPath();
      ctx.arc(ex, ey, cr, 0, Math.PI * 2);
      const gr = ctx.createRadialGradient(ex, ey, 0, ex, ey, cr);
      gr.addColorStop(0, ef.color + Math.floor(alpha * 200).toString(16).padStart(2, '0'));
      gr.addColorStop(0.5, ef.color + Math.floor(alpha * 100).toString(16).padStart(2, '0'));
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.fill();
    } else if (ef.type === 'iceNova') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const cr = ef.radius * progress;
      ctx.beginPath();
      ctx.arc(ex, ey, cr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(78,205,196,${alpha})`;
      ctx.lineWidth = 8 * alpha;
      ctx.stroke();
    } else if (ef.type === 'voidRift') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const time = elapsed / 1000;
      const baseRadius = ef.radius * Math.min(1, progress * 3);
      
      // Outer swirling void ring
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(time * 2);
      
      // Pulsing gradient background
      const pulseSize = baseRadius * (0.9 + Math.sin(time * 5) * 0.1);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize);
      gradient.addColorStop(0, 'rgba(139,0,139,0.6)');
      gradient.addColorStop(0.4, 'rgba(75,0,130,0.4)');
      gradient.addColorStop(0.7, 'rgba(255,0,255,0.2)');
      gradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Swirling tendrils
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
        const cp1x = Math.cos(angle + 0.5) * baseRadius * 0.6;
        const cp1y = Math.sin(angle + 0.5) * baseRadius * 0.6;
        const cp2x = Math.cos(angle + 1) * baseRadius * 0.8;
        const cp2y = Math.sin(angle + 1) * baseRadius * 0.8;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, Math.cos(angle + 1.5) * baseRadius, Math.sin(angle + 1.5) * baseRadius);
        ctx.strokeStyle = `rgba(255,0,255,${0.4 * alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Inner void eye
      const innerGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, 30);
      innerGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
      innerGrad.addColorStop(0.5, 'rgba(75,0,130,0.6)');
      innerGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(ex, ey, 30, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(ex, ey, baseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,0,255,${0.5 * alpha})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (ef.type === 'arrowStorm') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const time = elapsed / 1000;
      const baseRadius = ef.radius * Math.min(1, progress * 4);
      
      // Dark zone indicator
      ctx.beginPath();
      ctx.arc(ex, ey, baseRadius, 0, Math.PI * 2);
      const stormGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, baseRadius);
      stormGrad.addColorStop(0, `rgba(220,38,38,${0.15 * alpha})`);
      stormGrad.addColorStop(0.7, `rgba(15,23,42,${0.2 * alpha})`);
      stormGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = stormGrad;
      ctx.fill();
      
      // Rain of arrows
      for (let i = 0; i < 12; i++) {
        const seed = i * 1.37;
        const ax = ex + Math.sin(seed * 5 + time * 3) * baseRadius * 0.7;
        const ay = ey + Math.cos(seed * 7 + time * 4) * baseRadius * 0.7;
        const fallOffset = ((time * 200 + seed * 80) % 60) - 30;
        
        ctx.save();
        ctx.translate(ax, ay + fallOffset);
        ctx.rotate(-Math.PI / 4 + Math.sin(time * 2 + i) * 0.2);
        
        // Arrow shaft
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.strokeStyle = `rgba(220,38,38,${0.6 * alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(5, -3);
        ctx.lineTo(5, 3);
        ctx.closePath();
        ctx.fillStyle = `rgba(220,38,38,${0.8 * alpha})`;
        ctx.fill();
        
        ctx.restore();
      }
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(ex, ey, baseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(220,38,38,${0.3 * alpha})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (ef.type === 'multishot') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      // Quick burst ring
      const burstR = 30 + progress * 100;
      ctx.beginPath();
      ctx.arc(ex, ey, burstR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(220,38,38,${0.6 * alpha})`;
      ctx.lineWidth = 3 * alpha;
      ctx.stroke();
    } else if (ef.type === 'trail') {
      ctx.beginPath();
      ctx.moveTo(ef.startX - cx, ef.startY - cy);
      ctx.lineTo(ef.endX - cx, ef.endY - cy);
      ctx.strokeStyle = ef.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 20 * alpha;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (ef.type === 'bossExplosion') {
      // Epic boss death animation
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      
      // Get boss color based on type
      const bossColors = {
        blossom_behemoth: ['#ec4899', '#f472b6', '#22c55e'],
        ancient_treant: ['#166534', '#84cc16', '#a16207'],
        magma_titan: ['#f97316', '#dc2626', '#fbbf24'],
        frost_wyrm: ['#22d3ee', '#67e8f9', '#fff'],
        void_overlord: ['#7c3aed', '#581c87', '#c084fc'],
        crystal_golem: ['#ec4899', '#f0abfc', '#fff'],
        boss_meadow: ['#ec4899', '#f472b6', '#22c55e'],
        boss_forest: ['#166534', '#84cc16', '#a16207'],
        boss_volcanic: ['#f97316', '#dc2626', '#fbbf24'],
        boss_frozen: ['#22d3ee', '#67e8f9', '#fff'],
        boss_abyss: ['#7c3aed', '#581c87', '#c084fc'],
        boss_crystal: ['#ec4899', '#f0abfc', '#fff'],
      };
      const colors = bossColors[ef.bossType] || ['#fbbf24', '#f97316', '#fff'];
      
      // Phase 1: Expanding rings (0-40%)
      if (progress < 0.4) {
        const ringProgress = progress / 0.4;
        for (let i = 0; i < 3; i++) {
          const ringSize = 50 + ringProgress * 200 * (i + 1);
          const ringAlpha = (1 - ringProgress) * 0.8;
          ctx.beginPath();
          ctx.arc(ex, ey, ringSize, 0, Math.PI * 2);
          ctx.strokeStyle = colors[i % colors.length];
          ctx.globalAlpha = ringAlpha;
          ctx.lineWidth = 8 - i * 2;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      
      // Phase 2: Particle explosion (20-80%)
      if (progress > 0.1 && progress < 0.8) {
        const particleProgress = (progress - 0.1) / 0.7;
        const numParticles = 24;
        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2 + progress * 2;
          const dist = 30 + particleProgress * 250;
          const px = ex + Math.cos(angle) * dist;
          const py = ey + Math.sin(angle) * dist;
          const size = (1 - particleProgress) * 12;
          
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fillStyle = colors[i % colors.length];
          ctx.globalAlpha = (1 - particleProgress) * 0.9;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      
      // Phase 3: Central flash (0-30%)
      if (progress < 0.3) {
        const flashProgress = progress / 0.3;
        const flashSize = 80 * (1 - flashProgress * 0.5);
        const flashGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, flashSize);
        flashGrad.addColorStop(0, `rgba(255,255,255,${(1 - flashProgress) * 0.9})`);
        flashGrad.addColorStop(0.3, colors[0] + Math.floor((1 - flashProgress) * 200).toString(16).padStart(2, '0'));
        flashGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(ex, ey, flashSize, 0, Math.PI * 2);
        ctx.fillStyle = flashGrad;
        ctx.fill();
      }
      
      // Phase 4: Skull/icon fade (40-100%)
      if (progress > 0.4) {
        const skullProgress = (progress - 0.4) / 0.6;
        const skullAlpha = Math.sin(skullProgress * Math.PI) * 0.8;
        ctx.font = `${60 - skullProgress * 20}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = skullAlpha;
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('💀', ex, ey - skullProgress * 30);
        ctx.globalAlpha = 1;
      }
    } else if (ef.type === 'teleport') {
      // Portal teleportation effect
      const tx = ef.x - cx;
      const ty = ef.y - cy;
      const color = ef.color || '#a855f7';
      
      // Shrinking/expanding ring based on entering/exiting
      const ringRadius = ef.entering 
        ? 80 * progress 
        : 80 * (1 - progress);
      
      // Multiple rings
      for (let i = 0; i < 3; i++) {
        const radius = ef.entering
          ? ringRadius * (0.5 + i * 0.25)
          : ringRadius * (1 - i * 0.15);
        
        if (radius > 0) {
          ctx.beginPath();
          ctx.arc(tx, ty, radius, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = alpha * (1 - i * 0.2);
          ctx.lineWidth = 4 - i;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      
      // Spiraling particles
      const particleCount = 10;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + progress * Math.PI * 3;
        const dist = ef.entering
          ? ringRadius * (1 - progress * 0.3)
          : ringRadius * progress;
        
        const px = tx + Math.cos(angle) * dist;
        const py = ty + Math.sin(angle) * dist;
        
        ctx.beginPath();
        ctx.arc(px, py, 3 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (ef.type === 'recallDepart') {
      // Recall departure - green spiral shrinking in
      const rx = ef.x - cx;
      const ry = ef.y - cy;
      const radius = 60 * (1 - progress);
      
      // Swirling green particles getting sucked in
      ctx.globalAlpha = alpha;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + progress * Math.PI * 4;
        const dist = radius * (1 - progress * 0.5);
        const px = rx + Math.cos(angle) * dist;
        const py = ry + Math.sin(angle) * dist - progress * 20;
        
        ctx.beginPath();
        ctx.arc(px, py, 4 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${140 + i * 10}, 80%, ${50 + progress * 30}%)`;
        ctx.fill();
      }
      
      // Central glow
      const glow = ctx.createRadialGradient(rx, ry - progress * 20, 0, rx, ry, radius);
      glow.addColorStop(0, `rgba(34, 197, 94, ${0.8 * alpha})`);
      glow.addColorStop(0.5, `rgba(34, 197, 94, ${0.3 * alpha})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(rx, ry - progress * 20, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Home icon rising up
      ctx.font = `${20 + progress * 15}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillText('🏠', rx, ry - progress * 50);
      ctx.globalAlpha = 1;
    } else if (ef.type === 'recallArrive') {
      // Recall arrival - green burst expanding out
      const rx = ef.x - cx;
      const ry = ef.y - cy;
      const radius = 80 * progress;
      
      // Expanding green ring
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#22c55e';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 6 * alpha;
      ctx.stroke();
      
      // Inner rings
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(rx, ry, radius * (1 - i * 0.25), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(134, 239, 172, ${alpha * (1 - i * 0.3)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Sparkles bursting out
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = radius * 0.8;
        const px = rx + Math.cos(angle) * dist;
        const py = ry + Math.sin(angle) * dist;
        
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      
      // Central flash
      if (progress < 0.3) {
        const flashAlpha = (1 - progress / 0.3) * 0.6;
        ctx.beginPath();
        ctx.arc(rx, ry, 30, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (ef.type === 'freezeBurst') {
      // Freeze burst effect from Permafrost upgrade
      const fx = ef.x - cx;
      const fy = ef.y - cy;
      
      // Expanding ice ring
      const ringRadius = 30 * progress + 10;
      ctx.beginPath();
      ctx.arc(fx, fy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#67e8f9';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 4 * alpha;
      ctx.stroke();
      
      // Ice crystals bursting outward
      const crystalCount = 8;
      for (let i = 0; i < crystalCount; i++) {
        const angle = (i / crystalCount) * Math.PI * 2;
        const dist = 20 + progress * 40;
        const crx = fx + Math.cos(angle) * dist;
        const cry = fy + Math.sin(angle) * dist;
        
        ctx.save();
        ctx.translate(crx, cry);
        ctx.rotate(angle + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -6 * alpha);
        ctx.lineTo(3, 0);
        ctx.lineTo(0, 6 * alpha);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fillStyle = '#22d3ee';
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.restore();
      }
      
      // Central flash
      if (progress < 0.3) {
        const flashAlpha = (0.3 - progress) / 0.3;
        ctx.beginPath();
        ctx.arc(fx, fy, 25, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.6})`;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (ef.type === 'empowered') {
      // Empowered hit effect (Mana Surge triple damage)
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      
      // Star burst effect
      const rays = 6;
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + progress * Math.PI;
        const innerR = 10;
        const outerR = 30 + progress * 20;
        
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(angle) * innerR, ey + Math.sin(angle) * innerR);
        ctx.lineTo(ex + Math.cos(angle) * outerR, ey + Math.sin(angle) * outerR);
        ctx.strokeStyle = '#c084fc';
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 3 * alpha;
        ctx.stroke();
      }
      
      // Central glow
      const glowGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, 25);
      glowGrad.addColorStop(0, `rgba(192, 132, 252, ${alpha * 0.8})`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(ex, ey, 25, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
      
      // "3x" text
      if (progress < 0.6) {
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd93d';
        ctx.globalAlpha = alpha;
        ctx.fillText('3x', ex, ey - 20 - progress * 20);
      }
      ctx.globalAlpha = 1;
    } else if (ef.type === 'dragonBreath') {
      // Dragon flame breath - cone of fire
      const dx = ef.x - cx;
      const dy = ef.y - cy;
      const angle = ef.angle;
      const range = ef.range * progress;
      const coneAngle = Math.PI / 3; // 60 degrees
      
      // Draw flame cone
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(angle);
      
      // Multiple flame layers
      for (let layer = 0; layer < 3; layer++) {
        const layerRange = range * (1 - layer * 0.2);
        const layerAngle = coneAngle * (1 - layer * 0.15);
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, layerRange);
        if (layer === 0) {
          gradient.addColorStop(0, `rgba(255, 200, 50, ${0.9 * alpha})`);
          gradient.addColorStop(0.5, `rgba(255, 100, 0, ${0.6 * alpha})`);
          gradient.addColorStop(1, `rgba(255, 50, 0, ${0.1 * alpha})`);
        } else if (layer === 1) {
          gradient.addColorStop(0, `rgba(255, 150, 0, ${0.7 * alpha})`);
          gradient.addColorStop(1, `rgba(200, 50, 0, ${0 * alpha})`);
        } else {
          gradient.addColorStop(0, `rgba(255, 255, 200, ${0.5 * alpha})`);
          gradient.addColorStop(1, 'transparent');
        }
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, layerRange, -layerAngle / 2, layerAngle / 2);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      // Fire particles
      for (let i = 0; i < 15; i++) {
        const pDist = Math.random() * range;
        const pAngle = (Math.random() - 0.5) * coneAngle * 0.8;
        const px = Math.cos(pAngle) * pDist;
        const py = Math.sin(pAngle) * pDist;
        const pSize = 3 + Math.random() * 5;
        
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${150 + Math.random() * 100}, 0, ${alpha * 0.8})`;
        ctx.fill();
      }
      
      ctx.restore();
      
    } else if (ef.type === 'dragonWingGust') {
      // Wing gust - expanding wind wave
      const wx = ef.x - cx;
      const wy = ef.y - cy;
      const radius = ef.radius * progress;
      
      // Wind rings expanding outward
      for (let i = 0; i < 3; i++) {
        const ringRadius = radius * (1 - i * 0.2);
        ctx.beginPath();
        ctx.arc(wx, wy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200, 200, 255, ${alpha * (1 - i * 0.3)})`;
        ctx.lineWidth = 4 - i;
        ctx.stroke();
      }
      
      // Wind particles
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const dist = radius * 0.5 + Math.random() * radius * 0.5;
        const px = wx + Math.cos(angle) * dist;
        const py = wy + Math.sin(angle) * dist;
        
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(angle) * 15, py + Math.sin(angle) * 15);
        ctx.strokeStyle = `rgba(200, 220, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
    } else if (ef.type === 'dragonTailSwipe') {
      // Tail swipe - arc damage indicator
      const tx = ef.x - cx;
      const ty = ef.y - cy;
      const radius = ef.radius;
      
      // Swipe arc
      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139, 69, 19, ${0.4 * alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
      ctx.lineWidth = 6;
      ctx.stroke();
      
      // Impact lines
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + progress * Math.PI;
        ctx.beginPath();
        ctx.moveTo(tx + Math.cos(angle) * 30, ty + Math.sin(angle) * 30);
        ctx.lineTo(tx + Math.cos(angle) * radius, ty + Math.sin(angle) * radius);
        ctx.strokeStyle = `rgba(255, 150, 50, ${alpha * 0.7})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
    } else if (ef.type === 'dragonRage') {
      // Rage mode - screen-filling fire effect
      const rx = ef.x - cx;
      const ry = ef.y - cy;
      
      // Pulsing red overlay
      const pulseAlpha = 0.1 + Math.sin(progress * Math.PI * 6) * 0.05;
      ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha * alpha})`;
      ctx.fillRect(0, 0, width, height);
      
      // Central fire burst
      const burstRadius = 200 + progress * 100;
      const fireGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, burstRadius);
      fireGrad.addColorStop(0, `rgba(255, 200, 0, ${0.8 * alpha})`);
      fireGrad.addColorStop(0.3, `rgba(255, 100, 0, ${0.5 * alpha})`);
      fireGrad.addColorStop(0.6, `rgba(200, 50, 0, ${0.3 * alpha})`);
      fireGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(rx, ry, burstRadius, 0, Math.PI * 2);
      ctx.fillStyle = fireGrad;
      ctx.fill();
      
      // Flying embers everywhere
      for (let i = 0; i < 30; i++) {
        const emberAngle = Math.random() * Math.PI * 2;
        const emberDist = 50 + Math.random() * 300;
        const emberX = rx + Math.cos(emberAngle) * emberDist;
        const emberY = ry + Math.sin(emberAngle) * emberDist - progress * 50;
        
        ctx.beginPath();
        ctx.arc(emberX, emberY, 2 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${100 + Math.random() * 155}, 0, ${alpha})`;
        ctx.fill();
      }
    }
    
    // === DRAGON AWAKENS EFFECT ===
    else if (ef.type === 'dragonAwakens') {
      const dx = ef.x - cx;
      const dy = ef.y - cy;
      
      // Red/orange flash
      const flashAlpha = (1 - progress) * 0.3 * alpha;
      ctx.fillStyle = `rgba(220, 38, 38, ${flashAlpha})`;
      ctx.fillRect(0, 0, width, height);
      
      // Ominous glow from dragon's location
      const glowRadius = 300 + progress * 200;
      const glowGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, glowRadius);
      glowGrad.addColorStop(0, `rgba(255, 100, 0, ${0.5 * alpha})`);
      glowGrad.addColorStop(0.5, `rgba(220, 38, 38, ${0.3 * alpha})`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(dx, dy, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Warning text
      if (progress < 0.7) {
        const textAlpha = Math.min(1, progress * 3) * alpha * (1 - progress / 0.7);
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = `rgba(220, 38, 38, ${textAlpha})`;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        ctx.fillText('🐉 THE DRAGON AWAKENS! 🐉', width / 2, height / 2);
        ctx.shadowBlur = 0;
      }
    }
    
    // === DRAGON DEATH EFFECT ===
    else if (ef.type === 'dragonDeath') {
      const dx = ef.x - cx;
      const dy = ef.y - cy;
      
      // Epic golden flash at start
      if (progress < 0.2) {
        const flashAlpha = (0.2 - progress) * 2.5 * alpha;
        ctx.fillStyle = `rgba(251, 191, 36, ${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }
      
      // Massive expanding rings
      for (let i = 0; i < 5; i++) {
        const ringProgress = Math.max(0, progress - i * 0.1);
        const ringRadius = ringProgress * 500;
        const ringAlpha = Math.max(0, (1 - ringProgress) * alpha);
        
        ctx.strokeStyle = i % 2 === 0 ? `rgba(251, 191, 36, ${ringAlpha})` : `rgba(249, 115, 22, ${ringAlpha})`;
        ctx.lineWidth = 8 - i;
        ctx.beginPath();
        ctx.arc(dx, dy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Explosion particles
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2 + progress * 2;
        const dist = progress * 400 * (0.5 + Math.random() * 0.5);
        const px = dx + Math.cos(angle) * dist;
        const py = dy + Math.sin(angle) * dist - progress * 100;
        const size = 5 + Math.random() * 10;
        
        const colors = ['#fbbf24', '#f97316', '#dc2626', '#7f1d1d'];
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      
      // Victory text
      if (progress > 0.3) {
        const textAlpha = Math.min(1, (progress - 0.3) * 2) * alpha;
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = `rgba(251, 191, 36, ${textAlpha})`;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        ctx.fillText('🐉 DRAGON SLAIN! 🐉', width / 2, height / 2 - 50);
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = `rgba(253, 224, 71, ${textAlpha})`;
        ctx.fillText(`Slain by ${ef.killerName}`, width / 2, height / 2 + 10);
        ctx.shadowBlur = 0;
      }
    }
    
    // === MINI-BOSS EFFECTS ===
    else if (ef.type === 'minotaurCharge') {
      // Charge trail effect
      const sx = ef.x - cx;
      const sy = ef.y - cy;
      const tx = ef.targetX - cx;
      const ty = ef.targetY - cy;
      
      // Dust trail
      ctx.strokeStyle = `rgba(120, 53, 15, ${0.6 * alpha})`;
      ctx.lineWidth = 30;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (tx - sx) * progress, sy + (ty - sy) * progress);
      ctx.stroke();
      
      // Impact warning at target
      ctx.strokeStyle = `rgba(220, 38, 38, ${0.5 + Math.sin(elapsed / 50) * 0.3})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(tx, ty, 40 + Math.sin(elapsed / 100) * 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    else if (ef.type === 'minotaurImpact') {
      const mx = ef.x - cx;
      const my = ef.y - cy;
      const impactRadius = progress * 80;
      
      // Ground crack effect
      ctx.strokeStyle = `rgba(78, 53, 15, ${alpha})`;
      ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(angle) * impactRadius, my + Math.sin(angle) * impactRadius);
        ctx.stroke();
      }
      
      // Dust cloud
      ctx.fillStyle = `rgba(120, 53, 15, ${0.5 * alpha})`;
      ctx.beginPath();
      ctx.arc(mx, my, impactRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    else if (ef.type === 'lichSummon') {
      const lx = ef.x - cx;
      const ly = ef.y - cy;
      
      // Purple summoning circle
      ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
      ctx.lineWidth = 3;
      const circleRadius = 60 * (1 - progress * 0.3);
      ctx.beginPath();
      ctx.arc(lx, ly, circleRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner pentagram
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2 + elapsed / 500;
        const nextAngle = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2 + elapsed / 500;
        ctx.moveTo(lx + Math.cos(angle) * circleRadius * 0.8, ly + Math.sin(angle) * circleRadius * 0.8);
        ctx.lineTo(lx + Math.cos(nextAngle) * circleRadius * 0.8, ly + Math.sin(nextAngle) * circleRadius * 0.8);
      }
      ctx.stroke();
      
      // Rising spirits
      for (let i = 0; i < 5; i++) {
        const spiritY = ly - progress * 80 - i * 15;
        const spiritX = lx + Math.sin(elapsed / 100 + i) * 20;
        ctx.fillStyle = `rgba(165, 180, 252, ${alpha * (1 - i * 0.15)})`;
        ctx.beginPath();
        ctx.arc(spiritX, spiritY, 8 - i, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    else if (ef.type === 'lichDeathWave') {
      const lx = ef.x - cx;
      const ly = ef.y - cy;
      const waveRadius = progress * (ef.radius || 150);
      
      // Expanding death wave
      const waveGrad = ctx.createRadialGradient(lx, ly, waveRadius * 0.5, lx, ly, waveRadius);
      waveGrad.addColorStop(0, 'transparent');
      waveGrad.addColorStop(0.7, `rgba(99, 102, 241, ${0.4 * alpha})`);
      waveGrad.addColorStop(1, `rgba(30, 27, 75, ${0.6 * alpha})`);
      ctx.fillStyle = waveGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, waveRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Skull particles
      ctx.font = '16px Arial';
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + elapsed / 200;
        const dist = waveRadius * 0.7;
        ctx.fillText('💀', lx + Math.cos(angle) * dist - 8, ly + Math.sin(angle) * dist + 8);
      }
    }
    
    // === CLASS ABILITY EFFECTS ===
    else if (ef.type === 'flameShield') {
      // Find the player to draw around
      const player = players?.find(p => p.id === ef.playerId);
      if (player) {
        const px = player.x - cx;
        const py = player.y - cy;
        const pulseSize = 80 + Math.sin(elapsed / 100) * 10;
        
        // Rotating flames
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(elapsed / 500);
        
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const flameX = Math.cos(angle) * pulseSize;
          const flameY = Math.sin(angle) * pulseSize;
          const flameH = 20 + Math.sin(elapsed / 100 + i) * 8;
          
          ctx.beginPath();
          ctx.moveTo(flameX, flameY);
          ctx.quadraticCurveTo(flameX * 1.2, flameY * 1.2 - flameH, flameX * 1.3, flameY * 1.3);
          ctx.strokeStyle = `rgba(255, ${100 + i * 10}, 0, ${0.8 * alpha})`;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        ctx.restore();
        
        // Inner glow
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, pulseSize);
        gradient.addColorStop(0, 'rgba(255, 150, 50, 0.3)');
        gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.1)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    else if (ef.type === 'frostNova') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const cr = ef.radius * progress;
      
      // Expanding ice ring
      ctx.beginPath();
      ctx.arc(ex, ey, cr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
      ctx.lineWidth = 10 * alpha;
      ctx.stroke();
      
      // Ice crystals
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2 + elapsed / 200;
        const crystalX = ex + Math.cos(angle) * cr * 0.8;
        const crystalY = ey + Math.sin(angle) * cr * 0.8;
        
        ctx.beginPath();
        ctx.moveTo(crystalX, crystalY - 8);
        ctx.lineTo(crystalX - 4, crystalY + 4);
        ctx.lineTo(crystalX + 4, crystalY + 4);
        ctx.closePath();
        ctx.fillStyle = `rgba(135, 206, 235, ${alpha})`;
        ctx.fill();
      }
    }
    
    else if (ef.type === 'glacialStorm') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const time = elapsed / 1000;
      
      // Swirling blizzard
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(time * 2);
      
      // Outer storm
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ef.radius);
      gradient.addColorStop(0, 'rgba(135, 206, 250, 0.4)');
      gradient.addColorStop(0.5, 'rgba(100, 180, 255, 0.2)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, ef.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Snow particles
      for (let i = 0; i < 30; i++) {
        const particleAngle = (i / 30) * Math.PI * 2 + time * 3;
        const particleDist = 30 + (i % 3) * (ef.radius / 3);
        const px = Math.cos(particleAngle) * particleDist;
        const py = Math.sin(particleAngle) * particleDist;
        
        ctx.beginPath();
        ctx.arc(px, py, 2 + Math.sin(time * 10 + i) * 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
      }
      ctx.restore();
    }
    
    else if (ef.type === 'blink') {
      // Start position - fading purple cloud
      const fromX = ef.fromX - cx;
      const fromY = ef.fromY - cy;
      const toX = ef.toX - cx;
      const toY = ef.toY - cy;
      
      // Trail between positions
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = `rgba(155, 93, 229, ${alpha * 0.5})`;
      ctx.lineWidth = 20 * alpha;
      ctx.stroke();
      
      // Arrival sparkles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 30 * progress;
        ctx.beginPath();
        ctx.arc(toX + Math.cos(angle) * dist, toY + Math.sin(angle) * dist, 3 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 86, 253, ${alpha})`;
        ctx.fill();
      }
    }
    
    else if (ef.type === 'inferno') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const pulseProgress = Math.min(1, progress * 3);
      const size = ef.radius * pulseProgress;
      
      // Massive fire explosion
      const gradient = ctx.createRadialGradient(ex, ey, 0, ex, ey, size);
      gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
      gradient.addColorStop(0.2, `rgba(255, 150, 50, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 50, 0, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ex, ey, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Fire tongues
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const tongueLen = size * 0.3 + Math.sin(elapsed / 50 + i * 2) * 20;
        const tx = ex + Math.cos(angle) * size;
        const ty = ey + Math.sin(angle) * size;
        
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(angle) * tongueLen, ty + Math.sin(angle) * tongueLen);
        ctx.strokeStyle = `rgba(255, ${100 + i * 5}, 0, ${alpha})`;
        ctx.lineWidth = 6 * alpha;
        ctx.stroke();
      }
    }
    
    else if (ef.type === 'staticField') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const pulseSize = ef.radius * (0.5 + progress * 0.5);
      
      // Electric field
      ctx.beginPath();
      ctx.arc(ex, ey, pulseSize, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Lightning bolts
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + elapsed / 100;
        const startX = ex + Math.cos(angle) * 20;
        const startY = ey + Math.sin(angle) * 20;
        const endX = ex + Math.cos(angle) * pulseSize;
        const endY = ey + Math.sin(angle) * pulseSize;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        // Jagged lightning
        for (let j = 0; j < 5; j++) {
          const nextX = startX + (endX - startX) * ((j + 1) / 5) + (Math.random() - 0.5) * 15;
          const nextY = startY + (endY - startY) * ((j + 1) / 5) + (Math.random() - 0.5) * 15;
          ctx.lineTo(nextX, nextY);
        }
        ctx.strokeStyle = `rgba(255, 255, ${150 + Math.random() * 105}, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    
    else if (ef.type === 'timeWarp') {
      const player = players?.find(p => p.id === ef.playerId);
      if (player) {
        const px = player.x - cx;
        const py = player.y - cy;
        
        // Golden time aura
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, 60);
        gradient.addColorStop(0, 'rgba(212, 175, 55, 0.3)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, 60, 0, Math.PI * 2);
        ctx.fill();
        
        // Clock hands
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(elapsed / 100);
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 * alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -25);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
    
    else if (ef.type === 'thunderGod') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      
      // Massive lightning storm
      const gradient = ctx.createRadialGradient(ex, ey, 0, ex, ey, ef.radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`);
      gradient.addColorStop(0.3, `rgba(255, 255, 100, ${alpha * 0.3})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ex, ey, ef.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Flash effect
      if (Math.random() > 0.7) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
        ctx.fillRect(0, 0, width, height);
      }
    }
    
    else if (ef.type === 'lightningBolt') {
      const fromX = ef.fromX - cx;
      const fromY = ef.fromY - cy;
      const toX = ef.toX - cx;
      const toY = ef.toY - cy;
      
      // Jagged lightning bolt
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      for (let j = 0; j < 6; j++) {
        const nextX = fromX + (toX - fromX) * ((j + 1) / 6) + (Math.random() - 0.5) * 20;
        const nextY = fromY + (toY - fromY) * ((j + 1) / 6) + (Math.random() - 0.5) * 20;
        ctx.lineTo(nextX, nextY);
      }
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    else if (ef.type === 'apocalypse') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const pulseProgress = Math.min(1, progress * 2);
      const size = ef.radius * pulseProgress;
      
      // Dark void explosion
      const gradient = ctx.createRadialGradient(ex, ey, 0, ex, ey, size);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
      gradient.addColorStop(0.2, `rgba(75, 0, 130, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(139, 0, 255, ${alpha * 0.5})`);
      gradient.addColorStop(0.8, `rgba(255, 0, 255, ${alpha * 0.2})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ex, ey, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Void tendrils
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(elapsed / 200);
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const tendrilLen = size * 0.4 + Math.sin(elapsed / 100 + i * 2) * 30;
        const tx = Math.cos(angle) * size * 0.8;
        const ty = Math.sin(angle) * size * 0.8;
        
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(angle) * tendrilLen, ty + Math.sin(angle) * tendrilLen);
        ctx.strokeStyle = `rgba(255, 0, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 4 * alpha;
        ctx.stroke();
      }
      ctx.restore();
      
      // Screen flash at start
      if (progress < 0.1) {
        ctx.fillStyle = `rgba(139, 0, 255, ${(0.1 - progress) * 3})`;
        ctx.fillRect(0, 0, width, height);
      }
    }
    
    // SKIN TRAIL PARTICLES
    else if (ef.type === 'skinTrail') {
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const size = ef.size * alpha;
      
      if (ef.snowflake) {
        // Snowflake particle
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(elapsed / 500);
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -size);
          ctx.stroke();
          ctx.rotate(Math.PI / 3);
        }
        ctx.restore();
      } else if (ef.star) {
        // Star particle
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(elapsed / 300);
        ctx.fillStyle = ef.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * size;
          const y = Math.sin(angle) * size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        // Regular glowing particle
        ctx.beginPath();
        ctx.arc(ex, ey, size, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(ex, ey, 0, ex, ey, size);
        gradient.addColorStop(0, ef.color);
        gradient.addColorStop(0.5, ef.color + '80');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    else if (ef.type === 'customAbility') {
      // Generic custom wizard ability - expanding ring with particles
      const ex = ef.x - cx;
      const ey = ef.y - cy;
      const progress = elapsed / (ef.duration || 3000);
      const ringRadius = ef.radius * Math.min(1, progress * 3);
      const fadeAlpha = Math.max(0, 1 - progress);
      
      // Expanding ring
      ctx.beginPath();
      ctx.arc(ex, ey, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = ef.color + Math.floor(fadeAlpha * 200).toString(16).padStart(2, '0');
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Inner glow
      if (progress < 0.5) {
        const glowGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, ringRadius * 0.8);
        glowGrad.addColorStop(0, ef.color + Math.floor(fadeAlpha * 80).toString(16).padStart(2, '0'));
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(ex, ey, ringRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Orbiting particles
      for (let i = 0; i < 8; i++) {
        const pAngle = (now / 500) + (i * Math.PI * 2 / 8);
        const pDist = ringRadius * 0.7;
        const px2 = ex + Math.cos(pAngle) * pDist;
        const py2 = ey + Math.sin(pAngle) * pDist;
        ctx.beginPath();
        ctx.arc(px2, py2, 3, 0, Math.PI * 2);
        ctx.fillStyle = ef.color + Math.floor(fadeAlpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }
    }

    return true;
  });
}
