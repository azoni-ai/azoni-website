// ─── Pixel Town World Layout ───
// Grid: 60 cols × 50 rows, each tile = 32px → 1920×1600px world

export const TILE_SIZE = 32;
export const WORLD_COLS = 60;
export const WORLD_ROWS = 50;
export const WORLD_W = WORLD_COLS * TILE_SIZE;
export const WORLD_H = WORLD_ROWS * TILE_SIZE;

// Building placement: { stationId, x, y, w, h } in tile coordinates
// x,y = top-left corner of building footprint
// Offset to center in 60-col grid
const O = 10;
export const BUILDINGS = [
  // ─── Town Square (agents) ───
  { id: 'conductor',    x: O+4,  y: 10, w: 5, h: 5, type: 'town-hall',     entrance: { x: O+6, y: 15 } },
  { id: 'scribe',       x: O+11, y: 10, w: 5, h: 5, type: 'library',       entrance: { x: O+13, y: 15 } },
  { id: 'chatbot',      x: O+24, y: 10, w: 5, h: 5, type: 'info-booth',    entrance: { x: O+26, y: 15 } },
  { id: 'moltbook',     x: O+31, y: 10, w: 5, h: 5, type: 'cafe',          entrance: { x: O+33, y: 15 } },

  // ─── Shops Row (apps) ───
  { id: 'benchpress',   x: O+4,  y: 19, w: 5, h: 5, type: 'gym',           entrance: { x: O+6, y: 24 } },
  { id: 'oldwaystoday', x: O+11, y: 19, w: 5, h: 5, type: 'apothecary',    entrance: { x: O+13, y: 24 } },
  { id: 'fab',          x: O+24, y: 19, w: 7, h: 5, type: 'card-shop',     entrance: { x: O+27, y: 24 } },
  { id: 'rowcrew',      x: O+33, y: 19, w: 4, h: 5, type: 'boathouse',     entrance: { x: O+35, y: 24 } },

  // ─── Services Row ───
  { id: 'mcp',          x: O+15, y: 28, w: 7, h: 5, type: 'post-office',   entrance: { x: O+18, y: 33 } },
  { id: 'spellbrigade', x: O+4,  y: 28, w: 4, h: 6, type: 'wizard-tower',  entrance: { x: O+6, y: 34 } },
  { id: 'embedroute',   x: O+24, y: 28, w: 5, h: 5, type: 'power-station', entrance: { x: O+26, y: 33 } },
  { id: 'medic',        x: O+31, y: 28, w: 4, h: 4, type: 'clinic',        entrance: { x: O+33, y: 32 } },
  { id: 'launchpad',    x: O+10, y: 28, w: 4, h: 4, type: 'rocket-pad',    entrance: { x: O+12, y: 32 } },
  { id: 'activity',     x: O+36, y: 28, w: 3, h: 3, type: 'notice-board',  entrance: { x: O+37, y: 31 } },

  // ─── Career District ───
  { id: 'tmobile',      x: O+4,  y: 38, w: 6, h: 5, type: 'office-tower',  entrance: { x: O+7, y: 43 } },
  { id: 'capitalone',   x: O+12, y: 38, w: 6, h: 5, type: 'bank',          entrance: { x: O+15, y: 43 } },
  { id: 'dustbunny',    x: O+24, y: 38, w: 5, h: 5, type: 'trading-post',  entrance: { x: O+26, y: 43 } },
  { id: 'oli',          x: O+31, y: 38, w: 5, h: 5, type: 'university',    entrance: { x: O+33, y: 43 } },
];

// Path tiles — walkable roads connecting buildings
export const PATHS = [
  // Main horizontal roads (wider to span 60-col world)
  ...Array.from({ length: 56 }, (_, i) => ({ x: 2 + i, y: 16 })),
  ...Array.from({ length: 56 }, (_, i) => ({ x: 2 + i, y: 17 })),
  ...Array.from({ length: 56 }, (_, i) => ({ x: 2 + i, y: 25 })),
  ...Array.from({ length: 56 }, (_, i) => ({ x: 2 + i, y: 26 })),
  ...Array.from({ length: 56 }, (_, i) => ({ x: 2 + i, y: 35 })),
  ...Array.from({ length: 56 }, (_, i) => ({ x: 2 + i, y: 36 })),
  ...Array.from({ length: 56 }, (_, i) => ({ x: 2 + i, y: 44 })),
  ...Array.from({ length: 56 }, (_, i) => ({ x: 2 + i, y: 45 })),
  // Vertical connectors
  ...Array.from({ length: 30 }, (_, i) => ({ x: O+8, y: 15 + i })),
  ...Array.from({ length: 30 }, (_, i) => ({ x: O+9, y: 15 + i })),
  ...Array.from({ length: 30 }, (_, i) => ({ x: O+19, y: 15 + i })),
  ...Array.from({ length: 30 }, (_, i) => ({ x: O+20, y: 15 + i })),
  ...Array.from({ length: 30 }, (_, i) => ({ x: O+30, y: 15 + i })),
  ...Array.from({ length: 30 }, (_, i) => ({ x: O+31, y: 15 + i })),
];

// Decoration placement
export const DECORATIONS = [
  // Trees along top — spread across wider world
  { type: 'tree-1', x: 4, y: 6 }, { type: 'tree-2', x: O+2, y: 7 },
  { type: 'tree-1', x: O+10, y: 6 }, { type: 'tree-2', x: O+20, y: 7 },
  { type: 'tree-1', x: O+28, y: 6 }, { type: 'tree-2', x: O+38, y: 7 },
  { type: 'tree-1', x: 52, y: 6 },
  // Trees along edges
  { type: 'tree-2', x: 3, y: 20 }, { type: 'tree-1', x: 55, y: 20 },
  { type: 'tree-1', x: 3, y: 30 }, { type: 'tree-2', x: 55, y: 30 },
  { type: 'tree-2', x: 3, y: 40 }, { type: 'tree-1', x: 55, y: 40 },
  // Flowers scattered
  { type: 'flower-1', x: O+5, y: 17 }, { type: 'flower-2', x: O+15, y: 17 },
  { type: 'flower-1', x: O+25, y: 26 }, { type: 'flower-2', x: O+35, y: 26 },
  { type: 'flower-1', x: O+10, y: 35 }, { type: 'flower-2', x: O+22, y: 36 },
  // Lamp posts along roads
  { type: 'lamp-post', x: O+3, y: 16 }, { type: 'lamp-post', x: O+14, y: 16 },
  { type: 'lamp-post', x: O+25, y: 16 }, { type: 'lamp-post', x: O+36, y: 16 },
  { type: 'lamp-post', x: O+3, y: 25 }, { type: 'lamp-post', x: O+14, y: 25 },
  { type: 'lamp-post', x: O+25, y: 25 }, { type: 'lamp-post', x: O+36, y: 25 },
  // Benches
  { type: 'bench', x: O+20, y: 17 }, { type: 'bench', x: O+20, y: 26 },
  // Fountain in town square
  { type: 'fountain', x: O+19, y: 12 },

  // ─── CONSTRUCTION ZONE ───
  // Top of town — active construction near entrance
  { type: 'hole', x: O+8, y: 8 }, { type: 'hole', x: O+32, y: 8 },
  { type: 'hole', x: O+2, y: 15 },
  { type: 'cone', x: O+7, y: 8 }, { type: 'cone', x: O+10, y: 8 },
  { type: 'cone', x: O+31, y: 8 }, { type: 'cone', x: O+34, y: 8 },
  { type: 'worker', x: O+9, y: 7 }, { type: 'worker', x: O+33, y: 7 },
  { type: 'barrier', x: O+5, y: 9 }, { type: 'barrier', x: O+35, y: 9 },
  { type: 'wheelbarrow', x: O+3, y: 8 },
  { type: 'toolbox', x: O+11, y: 9 }, { type: 'toolbox', x: O+30, y: 9 },
  { type: 'dirt-pile', x: O+1, y: 9 },
  { type: 'caution-sign', x: O+6, y: 7 },

  // Crane near career district
  { type: 'crane', x: O+20, y: 34 },
  // Bulldozer on the road
  { type: 'bulldozer', x: O+38, y: 35 },
  // Dump truck parked near services
  { type: 'dump-truck', x: 6, y: 35 },
  // Workers scattered around
  { type: 'worker', x: O+17, y: 36 }, { type: 'worker', x: O+22, y: 44 },
  { type: 'worker', x: O+34, y: 36 }, { type: 'worker', x: O+8, y: 44 },
  { type: 'worker', x: O+29, y: 17 },
  // Traffic cones
  { type: 'cone', x: O+15, y: 35 }, { type: 'cone', x: O+16, y: 35 },
  { type: 'cone', x: O+24, y: 44 }, { type: 'cone', x: O+25, y: 44 },
  { type: 'cone', x: O+36, y: 44 }, { type: 'cone', x: O+37, y: 44 },
  { type: 'cone', x: O+6, y: 26 }, { type: 'cone', x: O+7, y: 26 },
  // Barriers
  { type: 'barrier', x: O+12, y: 44 }, { type: 'barrier', x: O+30, y: 35 },
  // Scaffolding on buildings
  { type: 'scaffolding', x: O+36, y: 38 },
  // Dirt piles
  { type: 'dirt-pile', x: O+18, y: 44 }, { type: 'dirt-pile', x: O+40, y: 36 },
  { type: 'dirt-pile', x: 8, y: 44 },
  // Caution signs
  { type: 'caution-sign', x: O+14, y: 36 }, { type: 'caution-sign', x: O+26, y: 36 },
  { type: 'caution-sign', x: O+10, y: 44 },
];

// Zone labels (drawn on the map)
export const ZONE_LABELS = [
  { text: 'TOWN SQUARE', x: O+17, y: 9, color: '#a78bfa' },
  { text: 'SHOPS', x: O+18, y: 18, color: '#4ade80' },
  { text: 'SERVICES', x: O+17, y: 27, color: '#6b6b65' },
  { text: 'CAREER DISTRICT', x: O+15, y: 37, color: '#60a5fa' },
];

// Welcome sign position
export const WELCOME_SIGN = { x: O+13, y: 3, w: 14, h: 5 };

// Player start position (in front of welcome sign)
export const PLAYER_START = { x: O+19, y: 8 };

// Build collision map: 2D array — true = walkable
export function buildCollisionMap() {
  const map = Array.from({ length: WORLD_ROWS }, () =>
    Array.from({ length: WORLD_COLS }, () => true)
  );

  // Block building footprints
  for (const b of BUILDINGS) {
    for (let row = b.y; row < b.y + b.h; row++) {
      for (let col = b.x; col < b.x + b.w; col++) {
        if (row >= 0 && row < WORLD_ROWS && col >= 0 && col < WORLD_COLS) {
          map[row][col] = false;
        }
      }
    }
  }

  // Welcome sign is not walkable
  for (let row = WELCOME_SIGN.y; row < WELCOME_SIGN.y + WELCOME_SIGN.h; row++) {
    for (let col = WELCOME_SIGN.x; col < WELCOME_SIGN.x + WELCOME_SIGN.w; col++) {
      if (row >= 0 && row < WORLD_ROWS && col >= 0 && col < WORLD_COLS) {
        map[row][col] = false;
      }
    }
  }

  return map;
}
