// Entity rendering: XP orbs, players, particles, damage numbers

import { DEFAULT_SKINS, DEFAULT_CLASSES } from '../constants/config';

const SKIN_MAP = new Map(DEFAULT_SKINS.map(s => [s.id, s]));

export function drawEntities(rc) {
  const { ctx, cx, cy, width, height, now, time, players, xpOrbs, particles, damageNumbers, playerIdRef, effectsRef, classes } = rc;

  for (const orb of xpOrbs || []) {
    const ox = orb.x - cx;
    const oy = orb.y - cy;
    if (ox < -20 || ox > width + 20 || oy < -20 || oy > height + 20) continue;

    const pulse = Math.sin(now / 150 + orb.x) * 0.3 + 0.7;
    const r = 6 + pulse * 2;

    // Glow
    ctx.beginPath();
    ctx.arc(ox, oy, r + 6, 0, Math.PI * 2);
    const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, r + 6);
    glow.addColorStop(0, `rgba(59,130,246,${0.6 * pulse})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
  }

  // Players

  for (const player of players || []) {
    if (player.health <= 0) continue;
    const px = player.x - cx;
    const py = player.y - cy;
    if (px < -50 || px > width + 50 || py < -50 || py > height + 50) continue;

    const isMe = player.id === playerIdRef.current;
    // Use skin color if available, otherwise class color, or custom wizard color
    const skin = SKIN_MAP.get(player.selectedSkin);
    const classColor = player.customColor || skin?.color || (classes[player.class] || DEFAULT_CLASSES[player.class])?.color || '#fff';
    const secondaryColor = player.customSecondaryColor || skin?.secondaryColor || classColor;
    const isVoidlord = player.class === 'voidlord';
    const isShadowArcher = player.class === 'shadowarcher';
    const isCustomWizard = player.isCustomWizard || false;
    const isSpecialClass = isVoidlord || isShadowArcher || isCustomWizard;
    const bob = player.state === 'walk' ? Math.sin((player.animFrame || 0) * Math.PI / 2) * 2 : 0;

    
    // ========== SKIN EFFECTS ==========
    
    // AURA EFFECT (glowing ring around player)
    if (skin?.aura) {
      const auraRadius = skin.aura.radius || 30;
      const auraColor = skin.aura.color || classColor;
      const pulse = skin.aura.pulse ? Math.sin(time * 3) * 5 : 0;
      
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, auraRadius + pulse);
      gradient.addColorStop(0, `${auraColor}40`);
      gradient.addColorStop(0.5, `${auraColor}20`);
      gradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(px, py, auraRadius + pulse, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    
    // WINGS EFFECT (feathered/energy wings)
    if (skin?.wings) {
      const wingSpread = 12 + Math.sin(time * 4) * 3;
      const wingColor = secondaryColor;
      
      // Left wing
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.moveTo(px - 10, py - 5);
      ctx.quadraticCurveTo(px - 35 - wingSpread, py - 25, px - 40 - wingSpread, py - 5);
      ctx.quadraticCurveTo(px - 35 - wingSpread, py + 10, px - 10, py + 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = classColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Right wing
      ctx.beginPath();
      ctx.moveTo(px + 10, py - 5);
      ctx.quadraticCurveTo(px + 35 + wingSpread, py - 25, px + 40 + wingSpread, py - 5);
      ctx.quadraticCurveTo(px + 35 + wingSpread, py + 10, px + 10, py + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    
    // HALO EFFECT (floating ring above head)
    if (skin?.halo) {
      const haloY = py - 50 - bob + Math.sin(time * 2) * 2;
      ctx.save();
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(px, haloY, 12, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    // CROWN EFFECT
    if (skin?.crown) {
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      
      // Crown base
      const crownY = py - 42 - bob;
      ctx.beginPath();
      ctx.moveTo(px - 8, crownY);
      ctx.lineTo(px - 10, crownY - 8);
      ctx.lineTo(px - 5, crownY - 4);
      ctx.lineTo(px, crownY - 12);
      ctx.lineTo(px + 5, crownY - 4);
      ctx.lineTo(px + 10, crownY - 8);
      ctx.lineTo(px + 8, crownY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Gems
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px, crownY - 9, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // HORNS EFFECT
    if (skin?.horns) {
      ctx.save();
      ctx.fillStyle = '#1f1f1f';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1;
      
      // Left horn
      ctx.beginPath();
      ctx.moveTo(px - 12, py - 22 - bob);
      ctx.quadraticCurveTo(px - 18, py - 35 - bob, px - 22, py - 45 - bob);
      ctx.lineTo(px - 14, py - 22 - bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Right horn
      ctx.beginPath();
      ctx.moveTo(px + 12, py - 22 - bob);
      ctx.quadraticCurveTo(px + 18, py - 35 - bob, px + 22, py - 45 - bob);
      ctx.lineTo(px + 14, py - 22 - bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    
    // ICE ARMOR EFFECT
    if (skin?.iceArmor) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 3;
      
      // Draw crystalline armor overlay
      ctx.beginPath();
      ctx.moveTo(px - 16, py + 14);
      ctx.lineTo(px - 20, py - 5);
      ctx.lineTo(px - 12, py - 15 - bob);
      ctx.lineTo(px, py - 20 - bob);
      ctx.lineTo(px + 12, py - 15 - bob);
      ctx.lineTo(px + 20, py - 5);
      ctx.lineTo(px + 16, py + 14);
      ctx.stroke();
      ctx.restore();
    }
    
    // FLOATING RUNES EFFECT
    if (skin?.floatingRunes) {
      ctx.save();
      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = secondaryColor;
      ctx.globalAlpha = 0.6 + Math.sin(time * 2) * 0.3;
      
      const runes = ['✧', '⚝', '✦', '⟡'];
      for (let i = 0; i < 4; i++) {
        const angle = time + (i * Math.PI / 2);
        const runeX = px + Math.cos(angle) * 28;
        const runeY = py - 5 + Math.sin(angle) * 18 + Math.sin(time * 3 + i) * 3;
        ctx.fillText(runes[i], runeX, runeY);
      }
      ctx.restore();
    }
    
    // CLOCKWORK EFFECT (for Chronomancer skin)
    if (skin?.clockwork) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      
      // Rotating gear
      const gearX = px + 20;
      const gearY = py - 10;
      ctx.translate(gearX, gearY);
      ctx.rotate(time * 2);
      
      // Draw gear teeth
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const innerR = 6;
        const outerR = 10;
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        ctx.lineTo(Math.cos(angle + 0.2) * innerR, Math.sin(angle + 0.2) * innerR);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    
    // PARTICLE TRAIL (spawn when moving)
    if (skin?.trail && player.state === 'walk') {
      const trailColor = skin.trail.color || classColor;
      const particleCount = skin.trail.particles || 2;
      const particleSize = skin.trail.size || 3;
      
      // Add trail particles to effects
      if (Math.random() < 0.4) {
        for (let i = 0; i < particleCount; i++) {
          effectsRef.current.push({
            type: 'skinTrail',
            x: player.x + (Math.random() - 0.5) * 10,
            y: player.y + (Math.random() - 0.5) * 10 + 5,
            color: trailColor,
            size: particleSize + Math.random() * 2,
            startTime: now,
            duration: 500,
            snowflake: skin.trail.snowflakes,
            star: skin.trail.stars,
          });
        }
      }
    }

    // Voidlord special aura (legacy - now handled by skin system too)
    if (isVoidlord && !skin?.aura) {
      const pulseSize = 35 + Math.sin(time * 3) * 8;
      
      // Void aura
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, pulseSize);
      gradient.addColorStop(0, 'rgba(255,0,255,0.3)');
      gradient.addColorStop(0.5, 'rgba(26,10,46,0.2)');
      gradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Orbiting void particles
      for (let i = 0; i < 4; i++) {
        const angle = time * 2 + (i * Math.PI / 2);
        const orbitX = px + Math.cos(angle) * 25;
        const orbitY = py + Math.sin(angle) * 15 - 10;
        ctx.beginPath();
        ctx.arc(orbitX, orbitY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ff00ff';
        ctx.fill();
      }
    }

    // Shadow Archer special aura
    if (isShadowArcher && !skin?.aura) {
      const pulseSize = 30 + Math.sin(time * 4) * 5;
      
      // Dark crimson aura
      const saGrad = ctx.createRadialGradient(px, py, 0, px, py, pulseSize);
      saGrad.addColorStop(0, 'rgba(220,38,38,0.2)');
      saGrad.addColorStop(0.5, 'rgba(15,23,42,0.15)');
      saGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = saGrad;
      ctx.fill();
      
      // Orbiting shadow wisps
      for (let i = 0; i < 3; i++) {
        const angle = time * 3 + (i * Math.PI * 2 / 3);
        const orbitX = px + Math.cos(angle) * 22;
        const orbitY = py + Math.sin(angle) * 12 - 8;
        ctx.beginPath();
        ctx.arc(orbitX, orbitY, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,38,38,${0.4 + Math.sin(time * 5 + i) * 0.2})`;
        ctx.fill();
      }
    }

    // Shadow
    ctx.beginPath();
    ctx.ellipse(px, py + 12, isSpecialClass ? 20 : 16, isSpecialClass ? 10 : 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = isVoidlord ? 'rgba(255,0,255,0.4)' : isShadowArcher ? 'rgba(220,38,38,0.35)' : 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Body (Robe for wizards, cloak for archer)
    ctx.fillStyle = isVoidlord ? '#1a0a2e' : isShadowArcher ? '#0f172a' : classColor;
    ctx.beginPath();
    if (isShadowArcher) {
      // Sleeker cloak shape
      ctx.moveTo(px, py - 14 - bob);
      ctx.lineTo(px - 12, py + 12);
      ctx.lineTo(px + 12, py + 12);
    } else {
      ctx.moveTo(px, py - 12 - bob);
      ctx.lineTo(px - 14, py + 14);
      ctx.lineTo(px + 14, py + 14);
    }
    ctx.closePath();
    ctx.fill();
    
    // Special class glow edges
    if (isVoidlord) {
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (isShadowArcher) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Head
    ctx.beginPath();
    ctx.arc(px, py - 18 - bob, 11, 0, Math.PI * 2);
    ctx.fillStyle = isVoidlord ? '#2d1b4e' : isShadowArcher ? '#1e293b' : '#fcd5ce';
    ctx.fill();

    // Hat/Hood
    if (isShadowArcher) {
      // Hood
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(px, py - 20 - bob, 14, Math.PI, 0, false);
      ctx.lineTo(px + 16, py - 14 - bob);
      ctx.lineTo(px - 16, py - 14 - bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Bow on back (diagonal)
      ctx.save();
      ctx.translate(px + 10, py - 10 - bob);
      ctx.rotate(0.3);
      ctx.beginPath();
      ctx.arc(0, 0, 14, -1.2, 1.2, false);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Bowstring
      ctx.beginPath();
      ctx.moveTo(Math.cos(-1.2) * 14, Math.sin(-1.2) * 14);
      ctx.lineTo(Math.cos(1.2) * 14, Math.sin(1.2) * 14);
      ctx.strokeStyle = '#d4d4d8';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    } else {
      // Wizard hat
      ctx.fillStyle = isVoidlord ? '#1a0a2e' : classColor;
      ctx.beginPath();
      ctx.moveTo(px, py - 42 - bob);
      ctx.lineTo(px - 16, py - 16 - bob);
      ctx.lineTo(px + 16, py - 16 - bob);
      ctx.closePath();
      ctx.fill();
      
      // Voidlord hat glow
      if (isVoidlord) {
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Eyes
    ctx.fillStyle = isVoidlord ? '#ff00ff' : isShadowArcher ? '#dc2626' : '#333';
    ctx.beginPath();
    ctx.arc(px - 3, py - 19 - bob, isSpecialClass ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 3, py - 19 - bob, isSpecialClass ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();

    // Name & level
    if (isVoidlord) {
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑 ' + player.name, px, py + 28);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff00ff';
      ctx.font = '10px sans-serif';
      ctx.fillText('VOID LORD', px, py + 40);
    } else if (isShadowArcher) {
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑 ' + player.name, px, py + 28);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#dc2626';
      ctx.font = '10px sans-serif';
      ctx.fillText('SHADOW ARCHER', px, py + 40);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(player.name, px, py + 28);
      ctx.fillStyle = '#ffd93d';
      ctx.font = '10px sans-serif';
      ctx.fillText('Lv.' + player.level, px, py + 40);
    }

    // Health bar
    if (!isMe || player.health < player.maxHealth) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px - 19, py - 51 - bob, 38, 7);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(px - 18, py - 50 - bob, 36, 5);
      ctx.fillStyle = isVoidlord ? '#ff00ff' : '#ef4444';
      ctx.fillRect(px - 18, py - 50 - bob, 36 * player.health / player.maxHealth, 5);
    }

    // Selection ring for self
    if (isMe) {
      ctx.beginPath();
      ctx.arc(px, py, 28, 0, Math.PI * 2);
      ctx.strokeStyle = (isVoidlord ? '#ff00ff' : classColor) + '50';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Healing effect when in sanctuary
    if (player.isHealing) {
      const healTime = now / 300;
      
      // Rising heal particles
      for (let i = 0; i < 4; i++) {
        const offset = (healTime + i * 0.5) % 2;
        const hx = px + Math.sin(healTime * 2 + i * 1.5) * 12;
        const hy = py - 10 - offset * 35;
        const alpha = 1 - offset / 2;
        
        ctx.beginPath();
        ctx.arc(hx, hy, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        ctx.fill();
      }
      
      // Plus sign above head
      const plusY = py - 55 - bob + Math.sin(healTime * 3) * 3;
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(px - 5, plusY - 2, 10, 4);
      ctx.fillRect(px - 2, plusY - 5, 4, 10);
      
      // Glow effect
      ctx.beginPath();
      ctx.arc(px, py, 35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 197, 94, ${0.1 + Math.sin(healTime * 2) * 0.05})`;
      ctx.fill();
    }

    // Emote animation
    if (player.emote && player.emoteStart) {
      const emoteTime = (now - player.emoteStart) / 1000;
      const emoteY = py - 60 - bob - Math.sin(emoteTime * 5) * 3;
      
      const emoteEmojis = {
        wave: '👋',
        dance: '💃',
        cheer: '🎉',
        spin: '🌀',
        sit: '🧘',
        laugh: '😂',
      };
      
      const emoji = emoteEmojis[player.emote] || '❓';
      
      // Emote bubble
      ctx.beginPath();
      ctx.arc(px, emoteY, 18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fill();
      ctx.strokeStyle = '#ffd93d';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Emoji
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, px, emoteY);
      ctx.textBaseline = 'alphabetic';
      
      // Spin animation for spin emote
      if (player.emote === 'spin') {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(emoteTime * 8);
        ctx.translate(-px, -py);
      }
      
      // Dance animation for dance emote (sparkles)
      if (player.emote === 'dance') {
        // Add sparkles around dancing player
        for (let i = 0; i < 3; i++) {
          const sparkleAngle = emoteTime * 4 + i * 2;
          const sparkleX = px + Math.cos(sparkleAngle) * 25;
          const sparkleY = py + Math.sin(sparkleAngle) * 15 - 10;
          ctx.beginPath();
          ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffd93d';
          ctx.fill();
        }
      }
      
      if (player.emote === 'spin') {
        ctx.restore();
      }
    }
  }

  for (const p of particles || []) {
    const ppx = p.x - cx;
    const ppy = p.y - cy;
    if (ppx < -20 || ppx > width + 20 || ppy < -20 || ppy > height + 20) continue;

    ctx.beginPath();
    ctx.arc(ppx, ppy, (p.radius || 3) * (p.alpha || 1), 0, Math.PI * 2);
    ctx.fillStyle = p.color + Math.floor((p.alpha || 1) * 255).toString(16).padStart(2, '0');
    ctx.fill();
  }

  // Damage numbers

  for (const dmg of damageNumbers || []) {
    const dx = dmg.x - cx;
    const dy = dmg.y - cy;
    if (dx < -50 || dx > width + 50 || dy < -50 || dy > height + 50) continue;

    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(0,0,0,${(dmg.alpha || 1) * 0.5})`;
    ctx.fillText(dmg.amount, dx + 1, dy + 1);
    ctx.fillStyle = dmg.isCrit
      ? `rgba(255,215,0,${dmg.alpha || 1})`
      : `rgba(255,255,255,${dmg.alpha || 1})`;
    ctx.fillText(dmg.amount, dx, dy);
  }
}
