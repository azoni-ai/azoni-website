// Expanded world - each zone is roughly the size of the old total map
export const WORLD_WIDTH = 21000;
export const WORLD_HEIGHT = 18000;

// Sanctuary center
const SANCTUARY_CENTER = { x: 10500, y: 9000 };
const SANCTUARY_RADIUS = 1500;

export const ZONE_POLYGONS = {
  // Large hexagonal sanctuary - safe zone with portal hub (2.5x bigger)
  sanctuary: [
    { x: 10500, y: 7200 },   // Top
    { x: 11900, y: 8100 },   // Top-right
    { x: 11900, y: 9900 },   // Bottom-right
    { x: 10500, y: 10800 },  // Bottom
    { x: 9100, y: 9900 },    // Bottom-left
    { x: 9100, y: 8100 },    // Top-left
  ],
  
  // Dungeon area (separate instance, unchanged)
  dungeon: [
    { x: 0, y: 0 }, { x: 800, y: 0 }, { x: 800, y: 3200 }, { x: 0, y: 3200 },
  ],
  
  // Meadow - large ring around sanctuary, beginner zone
  meadow: [
    { x: 7500, y: 5500 }, { x: 13500, y: 5500 }, { x: 15000, y: 7000 },
    { x: 15000, y: 11000 }, { x: 13500, y: 12500 }, { x: 7500, y: 12500 },
    { x: 6000, y: 11000 }, { x: 6000, y: 7000 },
  ],
  
  // Forest - Northwest, level 5-10 (~7000x6000 area)
  forest: [
    { x: 500, y: 500 }, { x: 7000, y: 500 }, { x: 7500, y: 5500 },
    { x: 6000, y: 7000 }, { x: 4500, y: 8500 }, { x: 1800, y: 7500 },
    { x: 500, y: 5500 }, { x: 500, y: 2500 },
  ],
  
  // Volcanic - Northeast, level 10-15 (~7000x6000 area)
  volcanic: [
    { x: 14000, y: 500 }, { x: 20500, y: 500 }, { x: 20500, y: 5500 },
    { x: 20000, y: 7500 }, { x: 17000, y: 8500 }, { x: 15000, y: 7000 },
    { x: 13500, y: 5500 }, { x: 13500, y: 2000 },
  ],
  
  // Frozen - South, level 15-20 (~8000x5500 area)
  frozen: [
    { x: 5500, y: 12500 }, { x: 15500, y: 12500 }, { x: 16500, y: 14000 },
    { x: 15500, y: 17500 }, { x: 5500, y: 17500 }, { x: 4500, y: 14000 },
  ],
  
  // Abyss - Far West, level 20-25 (~4000x5000 area)
  abyss: [
    { x: 200, y: 200 }, { x: 3500, y: 200 }, { x: 4000, y: 1500 },
    { x: 3000, y: 4500 }, { x: 1000, y: 5000 }, { x: 200, y: 3500 },
  ],
  
  // Crystal Caves - Far East, level 8-12 (~4000x6000 area)
  crystal_caves: [
    { x: 18000, y: 8000 }, { x: 20500, y: 7500 }, { x: 20800, y: 9500 },
    { x: 20500, y: 14000 }, { x: 18500, y: 15500 }, { x: 17000, y: 13000 },
    { x: 17500, y: 10000 },
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

// Portal Hub - All portals in expanded sanctuary
export const PORTAL_POSITIONS = {
  portal_meadow: { 
    from: { x: 10500, y: 7500 },   // North in sanctuary
    to: { x: 10500, y: 6000 },     // North meadow
    color: '#84cc16', 
    name: 'Meadow Portal', 
    icon: '🌸', 
    level: 0,
    description: 'Peaceful fields for beginners'
  },
  portal_forest: { 
    from: { x: 9300, y: 8400 },    // Northwest in sanctuary
    to: { x: 4000, y: 4000 },      // Center of forest
    color: '#166534', 
    name: 'Forest Portal', 
    icon: '🌲', 
    level: 5,
    description: 'Dark woods with lurking dangers'
  },
  portal_volcanic: { 
    from: { x: 11700, y: 8400 },   // Northeast in sanctuary
    to: { x: 17000, y: 4000 },     // Center of volcanic
    color: '#dc2626', 
    name: 'Volcanic Portal', 
    icon: '🔥', 
    level: 10,
    description: 'Scorching lands of fire'
  },
  portal_frozen: { 
    from: { x: 10500, y: 10500 },  // South in sanctuary
    to: { x: 10500, y: 15000 },    // Center of frozen
    color: '#0ea5e9', 
    name: 'Frozen Portal', 
    icon: '❄️', 
    level: 15,
    description: 'Icy wastes of the south'
  },
  portal_crystal: { 
    from: { x: 11700, y: 9600 },   // Southeast in sanctuary
    to: { x: 19000, y: 11500 },    // Center of crystal caves
    color: '#ec4899', 
    name: 'Crystal Portal', 
    icon: '💎', 
    level: 8,
    description: 'Glittering underground caves'
  },
  portal_abyss: { 
    from: { x: 9300, y: 9600 },    // Southwest in sanctuary
    to: { x: 1800, y: 2500 },      // Center of abyss
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
    x: 10500,
    y: 9000,
    radius: 200,
    healRate: 10,
    name: 'Healing Fountain',
  },
  portalHub: {
    x: 10500,
    y: 9000,
    radius: 1400,
    name: 'Portal Hub',
  },
  dungeonKnight: {
    x: 11200,
    y: 9400,
    name: 'Sir Aldric',
  },
};

// Building data - repositioned for expanded world
export const BUILDING_DATA = {
  wizard_tower: { x: 9500, y: 9200, width: 80, height: 120, name: "Archmage's Tower", color: '#ffd93d', type: 'tower' },
  forest_ruins: { x: 3500, y: 4500, width: 180, height: 120, name: 'Ancient Ruins', color: '#78716c', type: 'ruins' },
  volcano_fortress: { x: 17500, y: 4500, width: 220, height: 170, name: 'Obsidian Fortress', color: '#7f1d1d', type: 'fortress' },
  ice_citadel: { x: 10500, y: 15500, width: 200, height: 160, name: 'Ice Citadel', color: '#0284c7', type: 'citadel' },
  void_shrine: { x: 1800, y: 2000, width: 130, height: 130, name: 'Void Shrine', color: '#7c3aed', type: 'shrine' },
  crystal_sanctum: { x: 19200, y: 12000, width: 150, height: 140, name: 'Crystal Sanctum', color: '#ec4899', type: 'sanctum' },
};

// Buffer zone around sanctuary where enemies won't go
export const SANCTUARY_BUFFER = 500;

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

export const distanceFromSanctuary = (x, y) => {
  const dx = x - SANCTUARY_CENTER.x;
  const dy = y - SANCTUARY_CENTER.y;
  return Math.sqrt(dx * dx + dy * dy);
};

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

export const getZoneCenter = (zoneId) => {
  const polygon = ZONE_POLYGONS[zoneId];
  if (!polygon || polygon.length === 0) return { x: 10500, y: 9000 };
  
  let sumX = 0, sumY = 0;
  for (const point of polygon) {
    sumX += point.x;
    sumY += point.y;
  }
  return { x: sumX / polygon.length, y: sumY / polygon.length };
};
