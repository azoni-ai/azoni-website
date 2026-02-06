// Environment rendering: sanctuary healing zone + fountain

export function drawEnvironment(rc) {
  const { ctx, cx, cy, width, height, now, time, me, inDungeonRef } = rc;

  if (!inDungeonRef.current) {
    const sanctuaryCenter = { x: 3500, y: 3000 }; // Updated for new layout
    const scx = sanctuaryCenter.x - cx;
    const scy = sanctuaryCenter.y - cy;
    const healRadius = 380; // Match new sanctuary size

    
    // Only render if on screen
    if (scx > -healRadius - 100 && scx < width + healRadius + 100 && 
        scy > -healRadius - 100 && scy < height + healRadius + 100) {
      
      // ========== HEALING FOUNTAIN (center) ==========
      const fountainRadius = 80;
      const fountainGlow = ctx.createRadialGradient(scx, scy, 0, scx, scy, fountainRadius * 1.5);
      fountainGlow.addColorStop(0, `rgba(74, 222, 128, ${0.4 + Math.sin(time * 4) * 0.1})`);
      fountainGlow.addColorStop(0.5, `rgba(34, 197, 94, ${0.2 + Math.sin(time * 3) * 0.05})`);
      fountainGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = fountainGlow;
      ctx.beginPath();
      ctx.arc(scx, scy, fountainRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Fountain base (stone)
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.ellipse(scx, scy + 20, 70, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#57534e';
      ctx.beginPath();
      ctx.ellipse(scx, scy + 10, 55, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Water pool
      ctx.fillStyle = `rgba(74, 222, 128, ${0.6 + Math.sin(time * 2) * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(scx, scy + 5, 45, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Water spout (center)
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.ellipse(scx, scy - 10, 12, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Water jet shooting up
      for (let i = 0; i < 5; i++) {
        const jetHeight = 40 + i * 8;
        const jetX = scx + Math.sin(time * 6 + i * 0.5) * 3;
        const jetY = scy - 30 - jetHeight * (0.8 + Math.sin(time * 4 + i) * 0.2);
        const jetAlpha = 0.7 - i * 0.1;
        ctx.fillStyle = `rgba(134, 239, 172, ${jetAlpha})`;
        ctx.beginPath();
        ctx.arc(jetX, jetY, 6 - i, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Water droplets falling
      for (let i = 0; i < 8; i++) {
        const angle = (time * 2 + i * Math.PI / 4) % (Math.PI * 2);
        const dropTime = (time * 3 + i) % 1;
        const dropX = scx + Math.cos(angle) * 20 + Math.sin(time * 5 + i) * 5;
        const dropY = scy - 60 + dropTime * 80;
        const dropAlpha = 1 - dropTime;
        ctx.fillStyle = `rgba(134, 239, 172, ${dropAlpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(dropX, dropY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Fountain label
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = `rgba(74, 222, 128, ${0.8 + Math.sin(time * 3) * 0.2})`;
      ctx.textAlign = 'center';
      ctx.fillText('💧 HEALING FOUNTAIN 💧', scx, scy + 55);
      ctx.font = '9px Arial';
      ctx.fillStyle = 'rgba(134, 239, 172, 0.7)';
      ctx.fillText('Stand here for bonus healing', scx, scy + 68);
      
      // Floating healing particles around sanctuary
      for (let i = 0; i < 12; i++) {
        const angle = (time * 0.3 + i * Math.PI / 6) % (Math.PI * 2);
        const dist = healRadius * 0.6 + Math.sin(time * 2 + i) * 30;
        const px = scx + Math.cos(angle) * dist;
        const py = scy + Math.sin(angle) * dist;
        const floatY = Math.sin(time * 3 + i * 2) * 10;
        
        // Plus sign healing particle
        ctx.fillStyle = `rgba(74, 222, 128, ${0.5 + Math.sin(time * 4 + i) * 0.3})`;
        ctx.fillRect(px - 4, py + floatY - 1, 8, 2);
        ctx.fillRect(px - 1, py + floatY - 4, 2, 8);
      }
      
      // Inner healing aura when player is healing
      if (me?.isHealing) {
        // Rising heal particles around player
        if (me) {
          const mx = me.x - cx;
          const my = me.y - cy;
          for (let i = 0; i < 6; i++) {
            const riseOffset = (time * 50 + i * 40) % 60;
            const spreadX = Math.sin(time * 3 + i * 1.5) * 15;
            ctx.fillStyle = `rgba(74, 222, 128, ${0.8 - riseOffset / 60})`;
            ctx.beginPath();
            ctx.arc(mx + spreadX, my - riseOffset, 3 - riseOffset / 30, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      // "Safe Zone" text at top
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = `rgba(34, 197, 94, ${0.6 + Math.sin(time * 2) * 0.2})`;
      ctx.textAlign = 'center';
      ctx.fillText('✨ SANCTUARY ✨', scx, scy - healRadius + 25);
      ctx.font = '10px Arial';
      ctx.fillStyle = 'rgba(74, 222, 128, 0.7)';
      ctx.fillText('Portal Hub • Safe Zone', scx, scy - healRadius + 40);
    }
  }

}
