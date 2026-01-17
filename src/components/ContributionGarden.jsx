import React, { useEffect, useRef } from 'react';

const ContributionGarden = ({ commits = [], stats = {} }) => {
  const canvasRef = useRef(null);
  const plantsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationId;
    
    const width = canvas.offsetWidth * 2;
    const height = canvas.offsetHeight * 2;
    canvas.width = width;
    canvas.height = height;
    ctx.scale(2, 2);

    // Create plants based on commit activity
    const numPlants = Math.min(stats.last30Days || 20, 50);
    plantsRef.current = [];

    for (let i = 0; i < numPlants; i++) {
      const x = (width / 2 / numPlants) * i + 20;
      plantsRef.current.push({
        x,
        height: Math.random() * 30 + 20,
        maxHeight: Math.random() * 40 + 30,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.02,
        hue: 140 + Math.random() * 40, // Green variations
        thickness: 1 + Math.random() * 2,
        hasFlower: Math.random() > 0.6,
        flowerHue: Math.random() > 0.5 ? 25 : 340, // Orange or pink
      });
    }

    const drawPlant = (plant, time) => {
      const sway = Math.sin(time * plant.swaySpeed + plant.swayOffset) * 3;
      const baseY = height / 2 - 10;
      
      // Stem
      ctx.beginPath();
      ctx.moveTo(plant.x, baseY);
      
      const cp1x = plant.x + sway * 0.3;
      const cp1y = baseY - plant.height * 0.5;
      const cp2x = plant.x + sway * 0.7;
      const cp2y = baseY - plant.height * 0.8;
      const endX = plant.x + sway;
      const endY = baseY - plant.height;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.strokeStyle = `hsl(${plant.hue}, 60%, 35%)`;
      ctx.lineWidth = plant.thickness;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Leaves
      const leafY = baseY - plant.height * 0.6;
      const leafX = plant.x + sway * 0.5;
      
      ctx.beginPath();
      ctx.ellipse(leafX - 5, leafY, 8, 3, -0.5 + sway * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${plant.hue}, 50%, 40%)`;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(leafX + 5, leafY - 5, 7, 3, 0.5 + sway * 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Flower
      if (plant.hasFlower) {
        const flowerX = endX;
        const flowerY = endY;
        
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 + time * 0.01;
          const petalX = flowerX + Math.cos(angle) * 4;
          const petalY = flowerY + Math.sin(angle) * 4;
          
          ctx.beginPath();
          ctx.ellipse(petalX, petalY, 4, 2.5, angle, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${plant.flowerHue}, 80%, 65%)`;
          ctx.fill();
        }
        
        // Center
        ctx.beginPath();
        ctx.arc(flowerX, flowerY, 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(45, 90%, 60%)`;
        ctx.fill();
      }
    };

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width / 2, height / 2);
      
      // Ground
      ctx.fillStyle = 'rgba(30, 25, 20, 0.3)';
      ctx.fillRect(0, height / 2 - 15, width / 2, 20);
      
      plantsRef.current.forEach(plant => drawPlant(plant, time));
      
      time++;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [stats.last30Days]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
};

export default ContributionGarden;