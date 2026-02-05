// Larger world for bigger zones
export const WORLD_WIDTH = 7000;
export const WORLD_HEIGHT = 6000;

// Sanctuary center - all portals here
const SANCTUARY_CENTER = { x: 3500, y: 3000 };
const SANCTUARY_RADIUS = 600;

export const ZONE_POLYGONS = {
  // Hexagonal sanctuary in the center - safe zone with portal hub
  sanctuary: [
    { x: 3500, y: 2325 },  // Top
    { x: 4025, y: 2663 },  // Top-right
    { x: 4025, y: 3338 },  // Bottom-right
    { x: 3500, y: 3675 },  // Bottom
    { x: 2975, y: 3338 },  // Bottom-left
    { x: 2975, y: 2663 },  // Top-left
  ],
  
  // Dungeon area (separate instance)
  dungeon: [
    { x: 0, y: 0 }, { x: 800, y: 0 }, { x: 800, y: 3200 }, { x: 0, y: 3200 },
  ],
  
  // Meadow - surrounds sanctuary, beginner zone
  meadow: [
    { x: 2500, y: 2000 }, { x: 4500, y: 2000 }, { x: 5000, y: 2500 },
    { x: 5000, y: 3500 }, { x: 4500, y: 4000 }, { x: 2500, y: 4000 },
    { x: 2000, y: 3500 }, { x: 2000, y: 2500 },
  ],
  
  // Forest - Northwest, level 5-10
  forest: [
    { x: 300, y: 300 }, { x: 2200, y: 300 }, { x: 2500, y: 2000 },
    { x: 2000, y: 2500 }, { x: 1500, y: 2800 }, { x: 600, y: 2500 },
    { x: 200, y: 1800 }, { x: 200, y: 800 },
  ],
  
  // Volcanic - Northeast, level 10-15
  volcanic: [
    { x: 4800, y: 300 }, { x: 6700, y: 300 }, { x: 6800, y: 1800 },
    { x: 6500, y: 2500 }, { x: 5500, y: 2800 }, { x: 5000, y: 2500 },
    { x: 4500, y: 2000 }, { x: 4500, y: 800 },
  ],
  
  // Frozen - South, level 15-20
  frozen: [
    { x: 1800, y: 4000 }, { x: 5200, y: 4000 }, { x: 5500, y: 4500 },
    { x: 5200, y: 5700 }, { x: 1800, y: 5700 }, { x: 1500, y: 4500 },
  ],
  
  // Abyss - Far Northwest corner, level 20-25
  abyss: [
    { x: 100, y: 100 }, { x: 1000, y: 100 }, { x: 1200, y: 300 },
    { x: 800, y: 1200 }, { x: 200, y: 1500 }, { x: 100, y: 800 },
  ],
  
  // Crystal Caves - Far East, level 8-12
  crystal_caves: [
    { x: 6000, y: 3000 }, { x: 6800, y: 2800 }, { x: 6900, y: 3500 },
    { x: 6800, y: 4500 }, { x: 6200, y: 5000 }, { x: 5800, y: 4200 },
    { x: 5800, y: 3400 },
  ],
};

export const ZONE_INFO = {
  sanctuary: { name: 'Sanctuary', color: '#22c55e', rec: 0, description: 'A safe haven. Heal up and travel to other zones.' },
  dungeon: { name: "Dragon's Gauntlet", color: '#991b1b', rec: 30, description: 'A deadly dungeon with the Infernal Dragon at its heart.' },
  meadow: { name: 'Peaceful Meadow', color: '#84cc16', rec: 1, description: 'Rolling hills with gentle creatures. Perfect for beginners.' },
  forest: { name: 'Dark Forest', color: '#166534', rec: 5, description: 'Ancient trees hide dangerous beasts.' },
  volcanic: { name: 'Volcanic Wastes', color: '#dc2626', rec: 10, description: 'Rivers of lava and fire elementals await.' },
  frozen: { name: 'Frozen Expanse', color: '#0ea5e9', rec: 15, description: 'Bitter cold and ice creatures dominate.' },
  abyss: { name: 'The Abyss', color: '#7c3aed', rec: 20, description: 'The darkest depths. Only the strongest survive.' },
  crystal_caves: { name: 'Crystal Caves', color: '#ec4899', rec: 8, description: 'Glittering caverns filled with crystalline foes.' },
};

// Portal Hub - All portals in sanctuary, teleport to zone centers
export const PORTAL_POSITIONS = {
  // From sanctuary to each zone
  portal_meadow: { 
    from: { x: 3500, y: 2425 },  // North position in sanctuary
    to: { x: 3500, y: 2100 },    // Center of meadow (north side)
    color: '#84cc16', 
    name: 'Meadow Portal', 
    icon: '🌸', 
    level: 0,
    description: 'Peaceful fields for beginners'
  },
  portal_forest: { 
    from: { x: 3050, y: 2750 },  // Northwest position
    to: { x: 1400, y: 1400 },    // Center of forest
    color: '#166534', 
    name: 'Forest Portal', 
    icon: '🌲', 
    level: 5,
    description: 'Dark woods with lurking dangers'
  },
  portal_volcanic: { 
    from: { x: 3950, y: 2750 },  // Northeast position
    to: { x: 5800, y: 1400 },    // Center of volcanic
    color: '#dc2626', 
    name: 'Volcanic Portal', 
    icon: '🔥', 
    level: 10,
    description: 'Scorching lands of fire'
  },
  portal_frozen: { 
    from: { x: 3500, y: 3575 },  // South position
    to: { x: 3500, y: 4800 },    // Center of frozen
    color: '#0ea5e9', 
    name: 'Frozen Portal', 
    icon: '❄️', 
    level: 15,
    description: 'Icy wastes of the south'
  },
  portal_crystal: { 
    from: { x: 3950, y: 3250 },  // Southeast position
    to: { x: 6300, y: 3800 },    // Center of crystal caves
    color: '#ec4899', 
    name: 'Crystal Portal', 
    icon: '💎', 
    level: 8,
    description: 'Glittering underground caves'
  },
  portal_abyss: { 
    from: { x: 3050, y: 3250 },  // Southwest position
    to: { x: 500, y: 700 },      // Center of abyss
    color: '#7c3aed', 
    name: 'Abyss Portal', 
    icon: '🌀', 
    level: 20,
    description: 'The darkest depths - extreme danger'
  },
};

// Sanctuary features
export const SANCTUARY_FEATURES = {
  healingFountain: {
    x: 3500,
    y: 3000,
    radius: 80,
    healRate: 10, // HP per second
    name: 'Healing Fountain',
  },
  portalHub: {
    x: 3500,
    y: 3000,
    radius: 550,
    name: 'Portal Hub',
  },
  dungeonKnight: {
    x: 3750,
    y: 3200,
    name: 'Sir Aldric',
  },
};

// Building data
export const BUILDING_DATA = {
  wizard_tower: { x: 2900, y: 3100, width: 60, height: 100, name: "Archmage's Tower", color: '#ffd93d', type: 'tower' },
  forest_ruins: { x: 1200, y: 1600, width: 150, height: 100, name: 'Ancient Ruins', color: '#78716c', type: 'ruins' },
  volcano_fortress: { x: 5900, y: 1600, width: 180, height: 140, name: 'Obsidian Fortress', color: '#7f1d1d', type: 'fortress' },
  ice_citadel: { x: 3500, y: 5000, width: 160, height: 130, name: 'Ice Citadel', color: '#0284c7', type: 'citadel' },
  void_shrine: { x: 500, y: 500, width: 100, height: 100, name: 'Void Shrine', color: '#7c3aed', type: 'shrine' },
  crystal_sanctum: { x: 6400, y: 4000, width: 120, height: 110, name: 'Crystal Sanctum', color: '#ec4899', type: 'sanctum' },
};

// Buffer zone around sanctuary where enemies won't go
export const SANCTUARY_BUFFER = 200; // Extra distance from sanctuary edge

// Zone detection helpers
export const pointInPolygon = (x, y, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Get distance from sanctuary center
export const distanceFromSanctuary = (x, y) => {
  const dx = x - SANCTUARY_CENTER.x;
  const dy = y - SANCTUARY_CENTER.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Check if point is too close to sanctuary (including buffer)
export const isTooCloseToSanctuary = (x, y) => {
  return distanceFromSanctuary(x, y) < (SANCTUARY_RADIUS + SANCTUARY_BUFFER);
};

export const getZoneAtPosition = (x, y) => {
  const priorityOrder = ['sanctuary', 'abyss', 'crystal_caves', 'forest', 'volcanic', 'frozen', 'meadow'];
  for (const zoneId of priorityOrder) {
    const polygon = ZONE_POLYGONS[zoneId];
    if (polygon && pointInPolygon(x, y, polygon)) {
      if (zoneId === 'meadow' && pointInPolygon(x, y, ZONE_POLYGONS.sanctuary)) continue;
      return zoneId;
    }
  }
  return 'meadow';
};

// Get center of a zone
export const getZoneCenter = (zoneId) => {
  const polygon = ZONE_POLYGONS[zoneId];
  if (!polygon || polygon.length === 0) return { x: 3500, y: 3000 };
  
  let sumX = 0, sumY = 0;
  for (const point of polygon) {
    sumX += point.x;
    sumY += point.y;
  }
  return { x: sumX / polygon.length, y: sumY / polygon.length };
};
