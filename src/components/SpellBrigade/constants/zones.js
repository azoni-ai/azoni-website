export const WORLD_WIDTH = 6000;
export const WORLD_HEIGHT = 5000;

export const ZONE_POLYGONS = {
  sanctuary: [
    { x: 2650, y: 2150 }, { x: 3350, y: 2150 }, { x: 3550, y: 2500 },
    { x: 3350, y: 2850 }, { x: 2650, y: 2850 }, { x: 2450, y: 2500 },
  ],
  dungeon: [
    { x: 100, y: 100 }, { x: 800, y: 100 }, { x: 800, y: 4900 }, { x: 100, y: 4900 },
  ],
  meadow: [
    { x: 2200, y: 1800 }, { x: 3800, y: 1800 }, { x: 4200, y: 2200 },
    { x: 4000, y: 3000 }, { x: 3500, y: 3200 }, { x: 2500, y: 3200 },
    { x: 2000, y: 3000 }, { x: 1800, y: 2200 },
  ],
  forest: [
    { x: 500, y: 1000 }, { x: 2000, y: 800 }, { x: 2200, y: 1800 },
    { x: 1800, y: 2200 }, { x: 1500, y: 3000 }, { x: 800, y: 3200 },
    { x: 300, y: 2500 }, { x: 200, y: 1500 },
  ],
  volcanic: [
    { x: 4000, y: 800 }, { x: 5500, y: 1000 }, { x: 5800, y: 2000 },
    { x: 5500, y: 3000 }, { x: 4500, y: 3200 }, { x: 4000, y: 3000 },
    { x: 4200, y: 2200 }, { x: 3800, y: 1800 },
  ],
  frozen: [
    { x: 1000, y: 3500 }, { x: 2500, y: 3200 }, { x: 3500, y: 3200 },
    { x: 4000, y: 3500 }, { x: 3800, y: 4500 }, { x: 3000, y: 4800 },
    { x: 2000, y: 4800 }, { x: 1200, y: 4500 },
  ],
  abyss: [
    { x: 200, y: 200 }, { x: 1200, y: 100 }, { x: 600, y: 1000 },
    { x: 200, y: 1500 }, { x: 100, y: 800 },
  ],
  crystal_caves: [
    { x: 4500, y: 3500 }, { x: 5500, y: 3200 }, { x: 5800, y: 4000 },
    { x: 5500, y: 4800 }, { x: 4800, y: 4500 }, { x: 4300, y: 4000 },
  ],
};

export const ZONE_INFO = {
  sanctuary: { name: 'Sanctuary', color: '#22c55e', rec: 0 },
  dungeon: { name: "Dragon's Gauntlet", color: '#991b1b', rec: 30 },
  meadow: { name: 'Peaceful Meadow', color: '#84cc16', rec: 1 },
  forest: { name: 'Dark Forest', color: '#166534', rec: 5 },
  volcanic: { name: 'Volcanic Wastes', color: '#dc2626', rec: 10 },
  frozen: { name: 'Frozen Expanse', color: '#0ea5e9', rec: 15 },
  abyss: { name: 'The Abyss', color: '#581c87', rec: 20 },
  crystal_caves: { name: 'Crystal Caves', color: '#ec4899', rec: 8 },
};

export const PORTAL_POSITIONS = {
  sanctuary_to_meadow: { from: { x: 3200, y: 2200 }, to: { x: 3200, y: 1800 }, color: '#84cc16', name: 'Meadow Path', icon: '🌸', level: 0 },
  meadow_to_forest: { from: { x: 1900, y: 2000 }, to: { x: 1400, y: 1800 }, color: '#166534', name: 'Forest Gateway', icon: '🌲', level: 3 },
  meadow_to_volcanic: { from: { x: 4100, y: 2000 }, to: { x: 4600, y: 1800 }, color: '#dc2626', name: 'Flame Portal', icon: '🔥', level: 8 },
  meadow_to_frozen: { from: { x: 3000, y: 3100 }, to: { x: 3000, y: 3700 }, color: '#0ea5e9', name: 'Frozen Gate', icon: '❄️', level: 12 },
  forest_to_abyss: { from: { x: 600, y: 1200 }, to: { x: 300, y: 600 }, color: '#581c87', name: 'Void Rift', icon: '🌀', level: 18 },
  volcanic_to_crystal: { from: { x: 5000, y: 3100 }, to: { x: 5200, y: 3700 }, color: '#ec4899', name: 'Crystal Passage', icon: '💎', level: 6 },
};

export const BUILDING_DATA = {
  wizard_tower: { x: 3000, y: 2500, width: 80, height: 120, name: "Archmage's Tower", color: '#ffd93d', type: 'tower' },
  forest_ruins: { x: 1200, y: 2000, width: 150, height: 100, name: 'Ancient Ruins', color: '#78716c', type: 'ruins' },
  volcano_fortress: { x: 5200, y: 2000, width: 180, height: 140, name: 'Obsidian Fortress', color: '#7f1d1d', type: 'fortress' },
  ice_citadel: { x: 2500, y: 4200, width: 160, height: 130, name: 'Ice Citadel', color: '#0284c7', type: 'citadel' },
  void_shrine: { x: 400, y: 600, width: 100, height: 100, name: 'Void Shrine', color: '#581c87', type: 'shrine' },
  crystal_sanctum: { x: 5200, y: 4000, width: 120, height: 110, name: 'Crystal Sanctum', color: '#ec4899', type: 'sanctum' },
};

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