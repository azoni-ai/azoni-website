// Expanded world - 3x scale
export const WORLD_WIDTH = 21000;
export const WORLD_HEIGHT = 18000;

const SANCTUARY_CENTER = { x: 10500, y: 9000 };
const SANCTUARY_RADIUS = 1500;

export const ZONE_POLYGONS = {
  sanctuary: [
    { x: 10500, y: 7200 }, { x: 11900, y: 8100 }, { x: 11900, y: 9900 },
    { x: 10500, y: 10800 }, { x: 9100, y: 9900 }, { x: 9100, y: 8100 },
  ],
  dungeon: [
    { x: 0, y: 0 }, { x: 1800, y: 0 }, { x: 1800, y: 6500 }, { x: 0, y: 6500 },
  ],
  meadow: [
    { x: 7500, y: 5500 }, { x: 13500, y: 5500 }, { x: 15000, y: 7000 },
    { x: 15000, y: 11000 }, { x: 13500, y: 12500 }, { x: 7500, y: 12500 },
    { x: 6000, y: 11000 }, { x: 6000, y: 7000 },
  ],
  forest: [
    { x: 500, y: 500 }, { x: 7000, y: 500 }, { x: 7500, y: 5500 },
    { x: 6000, y: 7000 }, { x: 4500, y: 8500 }, { x: 1800, y: 7500 },
    { x: 500, y: 5500 }, { x: 500, y: 2500 },
  ],
  volcanic: [
    { x: 14000, y: 500 }, { x: 20500, y: 500 }, { x: 20500, y: 5500 },
    { x: 20000, y: 7500 }, { x: 17000, y: 8500 }, { x: 15000, y: 7000 },
    { x: 13500, y: 5500 }, { x: 13500, y: 2000 },
  ],
  frozen: [
    { x: 5500, y: 12500 }, { x: 15500, y: 12500 }, { x: 16500, y: 14000 },
    { x: 15500, y: 17500 }, { x: 5500, y: 17500 }, { x: 4500, y: 14000 },
  ],
  abyss: [
    { x: 200, y: 200 }, { x: 3500, y: 200 }, { x: 4000, y: 1500 },
    { x: 3000, y: 4500 }, { x: 1000, y: 5000 }, { x: 200, y: 3500 },
  ],
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

// Two-way portals: 'from' in sanctuary, 'returnFrom' at destination
export const PORTAL_POSITIONS = {
  portal_meadow: { 
    from: { x: 10500, y: 7500 }, to: { x: 10500, y: 6000 },
    returnFrom: { x: 10500, y: 6000 }, returnTo: { x: 10500, y: 7700 },
    color: '#84cc16', name: 'Meadow Portal', icon: '🌸', level: 0,
    description: 'Peaceful fields for beginners', zoneName: 'Peaceful Meadow',
  },
  portal_forest: { 
    from: { x: 9300, y: 8400 }, to: { x: 4000, y: 4000 },
    returnFrom: { x: 4000, y: 4000 }, returnTo: { x: 9500, y: 8500 },
    color: '#166534', name: 'Forest Portal', icon: '🌲', level: 5,
    description: 'Dark woods with lurking dangers', zoneName: 'Dark Forest',
  },
  portal_volcanic: { 
    from: { x: 11700, y: 8400 }, to: { x: 17000, y: 4000 },
    returnFrom: { x: 17000, y: 4000 }, returnTo: { x: 11500, y: 8500 },
    color: '#dc2626', name: 'Volcanic Portal', icon: '🔥', level: 10,
    description: 'Scorching lands of fire', zoneName: 'Volcanic Wastes',
  },
  portal_frozen: { 
    from: { x: 10500, y: 10500 }, to: { x: 10500, y: 15000 },
    returnFrom: { x: 10500, y: 15000 }, returnTo: { x: 10500, y: 10300 },
    color: '#0ea5e9', name: 'Frozen Portal', icon: '❄️', level: 15,
    description: 'Icy wastes of the south', zoneName: 'Frozen Expanse',
  },
  portal_crystal: { 
    from: { x: 11700, y: 9600 }, to: { x: 19000, y: 11500 },
    returnFrom: { x: 19000, y: 11500 }, returnTo: { x: 11500, y: 9500 },
    color: '#ec4899', name: 'Crystal Portal', icon: '💎', level: 8,
    description: 'Glittering underground caves', zoneName: 'Crystal Caves',
  },
  portal_abyss: { 
    from: { x: 9300, y: 9600 }, to: { x: 1800, y: 2500 },
    returnFrom: { x: 1800, y: 2500 }, returnTo: { x: 9500, y: 9500 },
    color: '#7c3aed', name: 'Abyss Portal', icon: '🌀', level: 20,
    description: 'The darkest depths - extreme danger', zoneName: 'The Abyss',
  },
};

export const SANCTUARY_FEATURES = {
  healingFountain: {
    x: 10500, y: 9000,
    radius: 250,
    healRate: 15,
    name: 'Healing Fountain',
  },
  portalHub: {
    x: 10500, y: 9000,
    radius: 1500,
    name: 'Portal Hub',
  },
  dungeonKnight: {
    x: 11200, y: 9400,
    name: 'Sir Aldric',
  },
};

// Building data - larger, themed per zone
export const BUILDING_DATA = {
  wizard_tower:     { x: 9500,  y: 9200,  width: 120, height: 180, name: "Archmage's Tower",  color: '#ffd93d', type: 'tower',    zone: 'sanctuary' },
  forest_ruins:     { x: 3500,  y: 4500,  width: 220, height: 160, name: 'Ancient Ruins',     color: '#78716c', type: 'ruins',    zone: 'forest' },
  volcano_fortress: { x: 17500, y: 4500,  width: 280, height: 220, name: 'Obsidian Fortress', color: '#7f1d1d', type: 'fortress', zone: 'volcanic' },
  ice_citadel:      { x: 10500, y: 15500, width: 260, height: 200, name: 'Ice Citadel',       color: '#0284c7', type: 'citadel',  zone: 'frozen' },
  void_shrine:      { x: 1800,  y: 2000,  width: 180, height: 150, name: 'Void Shrine',       color: '#7c3aed', type: 'shrine',   zone: 'abyss' },
  crystal_sanctum:  { x: 19200, y: 12000, width: 200, height: 170, name: 'Crystal Sanctum',   color: '#ec4899', type: 'sanctum',  zone: 'crystal_caves' },
};

// Quest NPCs - one per zone portal, with lore
export const QUEST_NPCS = {
  meadow_questgiver: {
    id: 'meadow_questgiver',
    name: 'Flora the Herbalist',
    x: 10500, y: 7300, // Just above meadow portal
    color: '#84cc16',
    icon: '🌿',
    zone: 'sanctuary',
    targetZone: 'meadow',
    targetBoss: 'Blossom Behemoth',
    recommendedLevel: 1,
    lore: [
      "The meadows were once peaceful, traveler.",
      "But a great beast — the Blossom Behemoth — has corrupted the flowers.",
      "Its spore clouds poison everything they touch.",
      "Even Level 1 wizards can venture there, but beware its thorny grasp.",
    ],
    questPrompt: "Will you cleanse the meadow of the Behemoth's corruption?",
  },
  forest_questgiver: {
    id: 'forest_questgiver',
    name: 'Thorn the Ranger',
    x: 9100, y: 8200, // Near forest portal
    color: '#166534',
    icon: '🏹',
    zone: 'sanctuary',
    targetZone: 'forest',
    targetBoss: 'Ancient Treant',
    recommendedLevel: 5,
    lore: [
      "I have tracked the Ancient Treant for years.",
      "Once a guardian of the forest, dark magic twisted it into a destroyer.",
      "Its roots burrow deep — trapping any who come close.",
      "You'll need at least Level 5 and quick reflexes to survive its root traps.",
    ],
    questPrompt: "Will you venture into the Dark Forest and fell the Treant?",
  },
  volcanic_questgiver: {
    id: 'volcanic_questgiver',
    name: 'Ember the Forgekeeper',
    x: 11900, y: 8200, // Near volcanic portal
    color: '#dc2626',
    icon: '⚒️',
    zone: 'sanctuary',
    targetZone: 'volcanic',
    targetBoss: 'Magma Titan',
    recommendedLevel: 10,
    lore: [
      "The Volcanic Wastes burn hotter every day.",
      "The Magma Titan — an ancient colossus of living rock and fire — has awakened.",
      "It calls down meteors from the sky itself!",
      "Only wizards of Level 10 or higher stand a chance against its fury.",
    ],
    questPrompt: "Dare you face the Magma Titan in the heart of the volcano?",
  },
  frozen_questgiver: {
    id: 'frozen_questgiver',
    name: 'Glacius the Exile',
    x: 10500, y: 10700, // Near frozen portal
    color: '#0ea5e9',
    icon: '🧊',
    zone: 'sanctuary',
    targetZone: 'frozen',
    targetBoss: 'Frost Wyrm',
    recommendedLevel: 15,
    lore: [
      "I was once a scholar of the Frozen Expanse...",
      "Until the Frost Wyrm descended and turned everything to ice.",
      "Its breath freezes you solid — body and soul.",
      "Level 15 at minimum, and bring fire spells if you have them.",
    ],
    questPrompt: "Will you slay the Frost Wyrm and thaw the south?",
  },
  crystal_questgiver: {
    id: 'crystal_questgiver',
    name: 'Prismara the Jeweler',
    x: 11900, y: 9800, // Near crystal portal
    color: '#ec4899',
    icon: '💠',
    zone: 'sanctuary',
    targetZone: 'crystal_caves',
    targetBoss: 'Crystal Golem',
    recommendedLevel: 8,
    lore: [
      "The Crystal Caves hold treasures beyond imagining.",
      "But the Crystal Golem guards them jealously.",
      "It fires razor-sharp crystal shards in every direction.",
      "Level 8 should be enough, but don't underestimate its barrage.",
    ],
    questPrompt: "Will you shatter the Crystal Golem and claim the caves?",
  },
  abyss_questgiver: {
    id: 'abyss_questgiver',
    name: 'Nyx the Voidwalker',
    x: 9100, y: 9800, // Near abyss portal
    color: '#7c3aed',
    icon: '🔮',
    zone: 'sanctuary',
    targetZone: 'abyss',
    targetBoss: 'Void Overlord',
    recommendedLevel: 20,
    lore: [
      "You dare ask about the Abyss? Few return to speak of it.",
      "The Void Overlord dwells in the deepest darkness.",
      "It pulls you in with gravitational force, then unleashes a devastating pulse.",
      "Only the strongest — Level 20 and above — have any hope of survival.",
    ],
    questPrompt: "Are you truly prepared to face the Void Overlord?",
  },
};

export const SANCTUARY_BUFFER = 500;

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
  for (const point of polygon) { sumX += point.x; sumY += point.y; }
  return { x: sumX / polygon.length, y: sumY / polygon.length };
};
