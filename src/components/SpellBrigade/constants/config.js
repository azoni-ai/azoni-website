// Zone tile colors [light, dark]
export const COLORS = {
  sanctuary: ['#3d7a3d', '#2d6a2d'],
  meadow: ['#4a8b3d', '#3a7b2d'],
  forest: ['#2d5a27', '#234d1f'],
  volcanic: ['#4a3232', '#3d2828'],
  frozen: ['#4a5a6a', '#3a4a5a'],
  abyss: ['#1a1a2e', '#12121f'],
  crystal_caves: ['#5a3a5a', '#4a2a4a'],
  
  enemy: {
    slime: '#4ade80',
    bat: '#a855f7',
    skeleton: '#e5e5e5',
    ghost: '#94a3b8',
    golem: '#78716c',
    spider: '#1a1a1a',
    necromancer: '#581c87',
    fireElemental: '#f97316',
    iceElemental: '#06b6d4',
    boss_slime: '#22c55e',
    boss_dragon: '#dc2626',
  },
};

export const DEFAULT_CLASSES = {
  pyromancer: {
    id: 'pyromancer',
    name: 'Pyromancer',
    color: '#ff6b35',
    description: 'Fire master. High burst damage.',
    dash: 'Fire Dash',
    ultimate: 'Meteor Strike',
  },
  cryomancer: {
    id: 'cryomancer',
    name: 'Cryomancer',
    color: '#4ecdc4',
    description: 'Ice wizard. Crowd control specialist.',
    dash: 'Frost Step',
    ultimate: 'Ice Nova',
  },
  arcanist: {
    id: 'arcanist',
    name: 'Arcanist',
    color: '#9b5de5',
    description: 'Arcane power. Balanced with AOE.',
    dash: 'Blink',
    ultimate: 'Arcane Barrage',
  },
  voidlord: {
    id: 'voidlord',
    name: 'Void Lord',
    color: '#1a0a2e',
    secondaryColor: '#ff00ff',
    description: 'Master of the void. Admin only.',
    dash: 'Void Shift',
    ultimate: 'Void Rift',
    isAdmin: true,
    hidden: true, // Don't show in normal class selection
  },
};

export const DEFAULT_SKINS = [
  // Pyromancer
  { id: 'pyromancer_default', class: 'pyromancer', name: 'Apprentice', color: '#ff6b35', requiredXp: 0 },
  { id: 'pyromancer_ember', class: 'pyromancer', name: 'Ember Mage', color: '#f97316', requiredXp: 500 },
  { id: 'pyromancer_inferno', class: 'pyromancer', name: 'Inferno Master', color: '#dc2626', requiredXp: 2000 },
  { id: 'pyromancer_phoenix', class: 'pyromancer', name: 'Phoenix Lord', color: '#fbbf24', requiredXp: 5000 },
  { id: 'pyromancer_shadow', class: 'pyromancer', name: 'Shadow Flame', color: '#7c3aed', requiredXp: 10000 },
  // Cryomancer
  { id: 'cryomancer_default', class: 'cryomancer', name: 'Apprentice', color: '#4ecdc4', requiredXp: 0 },
  { id: 'cryomancer_frost', class: 'cryomancer', name: 'Frost Weaver', color: '#06b6d4', requiredXp: 500 },
  { id: 'cryomancer_glacier', class: 'cryomancer', name: 'Glacier Knight', color: '#0284c7', requiredXp: 2000 },
  { id: 'cryomancer_blizzard', class: 'cryomancer', name: 'Blizzard King', color: '#e0f2fe', requiredXp: 5000 },
  { id: 'cryomancer_void', class: 'cryomancer', name: 'Void Ice', color: '#1e1b4b', requiredXp: 10000 },
  // Arcanist
  { id: 'arcanist_default', class: 'arcanist', name: 'Apprentice', color: '#9b5de5', requiredXp: 0 },
  { id: 'arcanist_mystic', class: 'arcanist', name: 'Mystic Sage', color: '#a855f7', requiredXp: 500 },
  { id: 'arcanist_archmage', class: 'arcanist', name: 'Archmage', color: '#7c3aed', requiredXp: 2000 },
  { id: 'arcanist_celestial', class: 'arcanist', name: 'Celestial', color: '#fcd34d', requiredXp: 5000 },
  { id: 'arcanist_cosmic', class: 'arcanist', name: 'Cosmic Entity', color: '#1e1b4b', requiredXp: 10000 },
  // Voidlord (Admin)
  { id: 'voidlord_default', class: 'voidlord', name: 'Void Lord', color: '#1a0a2e', requiredXp: 0 },
  { id: 'voidlord_ascended', class: 'voidlord', name: 'Ascended', color: '#ff00ff', requiredXp: 0 },
];

// Server URL - set REACT_APP_GAME_SERVER in your .env file
export const SERVER_URL = process.env.REACT_APP_GAME_SERVER || 'http://localhost:3001';