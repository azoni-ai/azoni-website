// ─── Pixel Town World Layout ───
// Grid: 40 cols × 50 rows, each tile = 32px → 1280×1600px world

export const TILE_SIZE = 32;
export const WORLD_COLS = 40;
export const WORLD_ROWS = 50;
export const WORLD_W = WORLD_COLS * TILE_SIZE;
export const WORLD_H = WORLD_ROWS * TILE_SIZE;

// Building placement: { stationId, x, y, w, h } in tile coordinates
// x,y = top-left corner of building footprint
export const BUILDINGS = [
  // ─── Town Square (agents) ───
  { id: 'conductor',    x: 4,  y: 10, w: 5, h: 5, type: 'town-hall',     entrance: { x: 6, y: 15 } },
  { id: 'scribe',       x: 11, y: 10, w: 5, h: 5, type: 'library',       entrance: { x: 13, y: 15 } },
  { id: 'chatbot',      x: 24, y: 10, w: 5, h: 5, type: 'info-booth',    entrance: { x: 26, y: 15 } },
  { id: 'moltbook',     x: 31, y: 10, w: 5, h: 5, type: 'cafe',          entrance: { x: 33, y: 15 } },

  // ─── Shops Row (apps) ───
  { id: 'benchpress',   x: 4,  y: 19, w: 5, h: 5, type: 'gym',           entrance: { x: 6, y: 24 } },
  { id: 'oldwaystoday', x: 11, y: 19, w: 5, h: 5, type: 'apothecary',    entrance: { x: 13, y: 24 } },
  { id: 'fab',          x: 24, y: 19, w: 7, h: 5, type: 'card-shop',     entrance: { x: 27, y: 24 } },
  { id: 'rowcrew',      x: 33, y: 19, w: 4, h: 5, type: 'boathouse',     entrance: { x: 35, y: 24 } },

  // ─── Services Row ───
  { id: 'mcp',          x: 15, y: 28, w: 7, h: 5, type: 'post-office',   entrance: { x: 18, y: 33 } },
  { id: 'spellbrigade', x: 4,  y: 28, w: 4, h: 6, type: 'wizard-tower',  entrance: { x: 6, y: 34 } },
  { id: 'embedroute',   x: 24, y: 28, w: 5, h: 5, type: 'power-station', entrance: { x: 26, y: 33 } },
  { id: 'medic',        x: 31, y: 28, w: 4, h: 4, type: 'clinic',        entrance: { x: 33, y: 32 } },
  { id: 'launchpad',    x: 10, y: 28, w: 4, h: 4, type: 'rocket-pad',    entrance: { x: 12, y: 32 } },
  { id: 'activity',     x: 36, y: 28, w: 3, h: 3, type: 'notice-board',  entrance: { x: 37, y: 31 } },

  // ─── Career District ───
  { id: 'tmobile',      x: 4,  y: 38, w: 6, h: 5, type: 'office-tower',  entrance: { x: 7, y: 43 } },
  { id: 'capitalone',   x: 12, y: 38, w: 6, h: 5, type: 'bank',          entrance: { x: 15, y: 43 } },
  { id: 'dustbunny',    x: 24, y: 38, w: 5, h: 5, type: 'trading-post',  entrance: { x: 26, y: 43 } },
  { id: 'oli',          x: 31, y: 38, w: 5, h: 5, type: 'university',    entrance: { x: 33, y: 43 } },
];

// Path tiles — walkable roads connecting buildings
export const PATHS = [
  // Main horizontal road
  ...Array.from({ length: 36 }, (_, i) => ({ x: 2 + i, y: 16 })),
  ...Array.from({ length: 36 }, (_, i) => ({ x: 2 + i, y: 17 })),
  // Second horizontal road
  ...Array.from({ length: 36 }, (_, i) => ({ x: 2 + i, y: 25 })),
  ...Array.from({ length: 36 }, (_, i) => ({ x: 2 + i, y: 26 })),
  // Third horizontal road
  ...Array.from({ length: 36 }, (_, i) => ({ x: 2 + i, y: 35 })),
  ...Array.from({ length: 36 }, (_, i) => ({ x: 2 + i, y: 36 })),
  // Fourth horizontal road (career)
  ...Array.from({ length: 36 }, (_, i) => ({ x: 2 + i, y: 44 })),
  ...Array.from({ length: 36 }, (_, i) => ({ x: 2 + i, y: 45 })),
  // Vertical connectors (left)
  ...Array.from({ length: 30 }, (_, i) => ({ x: 8, y: 15 + i })),
  ...Array.from({ length: 30 }, (_, i) => ({ x: 9, y: 15 + i })),
  // Vertical connectors (center)
  ...Array.from({ length: 30 }, (_, i) => ({ x: 19, y: 15 + i })),
  ...Array.from({ length: 30 }, (_, i) => ({ x: 20, y: 15 + i })),
  // Vertical connectors (right)
  ...Array.from({ length: 30 }, (_, i) => ({ x: 30, y: 15 + i })),
  ...Array.from({ length: 30 }, (_, i) => ({ x: 31, y: 15 + i })),
];

// Decoration placement
export const DECORATIONS = [
  // Trees along top
  { type: 'tree-1', x: 2, y: 6 }, { type: 'tree-2', x: 10, y: 7 },
  { type: 'tree-1', x: 18, y: 6 }, { type: 'tree-2', x: 28, y: 7 },
  { type: 'tree-1', x: 36, y: 6 },
  // Flowers scattered
  { type: 'flower-1', x: 5, y: 17 }, { type: 'flower-2', x: 15, y: 17 },
  { type: 'flower-1', x: 25, y: 26 }, { type: 'flower-2', x: 35, y: 26 },
  { type: 'flower-1', x: 10, y: 35 }, { type: 'flower-2', x: 22, y: 36 },
  // Lamp posts along roads
  { type: 'lamp-post', x: 3, y: 16 }, { type: 'lamp-post', x: 14, y: 16 },
  { type: 'lamp-post', x: 25, y: 16 }, { type: 'lamp-post', x: 36, y: 16 },
  { type: 'lamp-post', x: 3, y: 25 }, { type: 'lamp-post', x: 14, y: 25 },
  { type: 'lamp-post', x: 25, y: 25 }, { type: 'lamp-post', x: 36, y: 25 },
  // Benches
  { type: 'bench', x: 20, y: 17 }, { type: 'bench', x: 20, y: 26 },
  // Fountain in town square
  { type: 'fountain', x: 19, y: 12 },
];

// Zone labels (drawn on the map)
export const ZONE_LABELS = [
  { text: 'TOWN SQUARE', x: 17, y: 9, color: '#a78bfa' },
  { text: 'SHOPS', x: 18, y: 18, color: '#4ade80' },
  { text: 'SERVICES', x: 17, y: 27, color: '#6b6b65' },
  { text: 'CAREER DISTRICT', x: 15, y: 37, color: '#60a5fa' },
];

// Welcome sign position
export const WELCOME_SIGN = { x: 16, y: 4, w: 8, h: 3 };

// Player start position (in front of welcome sign)
export const PLAYER_START = { x: 19, y: 8 };

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
