import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// ===========================================
// CONFIG
// ===========================================
const SERVER_URL = process.env.REACT_APP_GAME_SERVER || 'http://localhost:3001';

// ===========================================
// SVG ICONS
// ===========================================
const SVG = {
  fire: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8 6 4 10 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8c0-4-4-8-8-12zm0 18c-3.31 0-6-2.69-6-6 0-2 2-4 3-5 0 2 1 3 2 3s2-1 2-3c1 1 3 3 3 5 0 3.31-2.69 6-6 6z"/>
    </svg>
  ),
  ice: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z"/>
    </svg>
  ),
  arcane: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
    </svg>
  ),
  dash: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  ),
  sword: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.92 5H5L14 14l-1.5 1.5L5 8v1.92l8 8L22 9l-3-3-7.08 7.08L6.92 5z"/>
    </svg>
  ),
  skull: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  ),
  volume: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    </svg>
  ),
  volumeMute: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  ),
  controls: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z"/>
    </svg>
  ),
};

const CLASS_SVG = {
  pyromancer: SVG.fire,
  cryomancer: SVG.ice,
  arcanist: SVG.arcane,
};

// ===========================================
// CONSTANTS
// ===========================================
const COLORS = {
  // Zone tile colors [light, dark]
  sanctuary: ['#3d7a3d', '#2d6a2d'],      // Bright green
  meadow: ['#4a8b3d', '#3a7b2d'],         // Light green  
  forest: ['#2d5a27', '#234d1f'],         // Dark green (original)
  volcanic: ['#4a3232', '#3d2828'],       // Dark red/brown
  frozen: ['#4a5a6a', '#3a4a5a'],         // Blue-gray
  abyss: ['#1a1a2e', '#12121f'],          // Deep purple/black
  
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

const DEFAULT_CLASSES = {
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
};

const DEFAULT_SKINS = [
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
];

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function SpellBrigade() {
  // Refs
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const socketRef = useRef(null);
  const audioCtxRef = useRef(null);
  const playerIdRef = useRef(null);
  const playerDataRef = useRef(null);
  const gameStateRef = useRef({
    players: [],
    enemies: [],
    projectiles: [],
    xpOrbs: [],
    particles: [],
    damageNumbers: [],
    world: { width: 5000, height: 5000 },
  });
  const cameraRef = useRef({ x: 0, y: 0 });
  const screenShakeRef = useRef({ x: 0, y: 0, intensity: 0 });
  const inputRef = useRef({ up: false, down: false, left: false, right: false });
  const mouseRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const effectsRef = useRef([]);
  const meteorWarningsRef = useRef([]);
  const settingsRef = useRef({ volume: 0.5, sfxEnabled: true, showZoneNames: true, showMinimap: true });

  // State
  const [screen, setScreen] = useState('loading'); // loading, returning, title, game, dead
  const [tab, setTab] = useState('play');
  const [connected, setConnected] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedClass, setSelectedClass] = useState('pyromancer');
  const [selectedSkin, setSelectedSkin] = useState('pyromancer_default');
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [savedPlayer, setSavedPlayer] = useState(null);
  const [deathInfo, setDeathInfo] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [showSkinSelect, setShowSkinSelect] = useState(false);
  const [settings, setSettings] = useState({
    volume: 0.5,
    sfxEnabled: true,
    showZoneNames: true,
    showMinimap: true,
  });
  const [currentZone, setCurrentZone] = useState({
    name: 'Sanctuary',
    color: '#22c55e',
    rec: 0,
  });

  // Mobile detection and touch state
  const [isMobile, setIsMobile] = useState(false);
  const joystickRef = useRef({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const joystickBaseRef = useRef(null);
  const joystickKnobRef = useRef(null);

  // Keep settings ref in sync
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth < 768
        || ('ontouchstart' in window);
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ===========================================
  // AUDIO SYSTEM
  // ===========================================
  const initAudio = () => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.log('Audio not supported');
      }
    }
    // Mobile browsers require resuming AudioContext after user interaction
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  };

  const playSound = (type) => {
    const s = settingsRef.current;
    if (!s.sfxEnabled || s.volume === 0) return;
    
    // Initialize audio if needed
    if (!audioCtxRef.current) {
      initAudio();
    }
    
    // Resume if suspended (mobile fix)
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
      return; // Skip this sound, next one will work
    }
    
    if (!audioCtxRef.current) return;

    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      const vol = s.volume * 0.12;

      const sounds = {
        spell: () => {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        },
        enemyDeath: () => {
          osc.type = 'square';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
        },
        xpPickup: () => {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.setValueAtTime(1000, now + 0.05);
          gain.gain.setValueAtTime(vol * 0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
        },
        levelUp: () => {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.setValueAtTime(659, now + 0.1);
          osc.frequency.setValueAtTime(784, now + 0.2);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
        },
        playerHit: () => {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        },
        dash: () => {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
          gain.gain.setValueAtTime(vol * 0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        },
        meteor: () => {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
          gain.gain.setValueAtTime(vol * 1.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
        },
        iceNova: () => {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        },
        bossSpawn: () => {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(80, now);
          osc.frequency.setValueAtTime(100, now + 0.3);
          gain.gain.setValueAtTime(vol * 1.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
          osc.start(now);
          osc.stop(now + 0.6);
        },
        bossAttack: () => {
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
          gain.gain.setValueAtTime(vol * 1.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        },
      };

      if (sounds[type]) sounds[type]();
    } catch (e) {
      // Ignore audio errors
    }
  };

  // ===========================================
  // ZONE DETECTION
  // ===========================================
  const getZoneAtPosition = (x, y) => {
    const centerX = 2500, centerY = 2500;
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    
    if (dist <= 300) return 'sanctuary';
    if (dist <= 900) return 'meadow';
    if (dist <= 1600) return 'forest';
    if (dist <= 2100) return 'volcanic';
    if (dist <= 2600) return 'frozen';
    return 'abyss';
  };

  const updateZone = (me) => {
    if (!me) return;
    const zoneName = getZoneAtPosition(me.x, me.y);
    
    const zones = {
      sanctuary: { name: 'Sanctuary', color: '#22c55e', rec: 0 },
      meadow: { name: 'Peaceful Meadow', color: '#84cc16', rec: 1 },
      forest: { name: 'Dark Forest', color: '#166534', rec: 5 },
      volcanic: { name: 'Volcanic Wastes', color: '#dc2626', rec: 10 },
      frozen: { name: 'Frozen Expanse', color: '#0ea5e9', rec: 15 },
      abyss: { name: 'The Abyss', color: '#581c87', rec: 20 },
    };
    
    setCurrentZone(zones[zoneName] || zones.sanctuary);
  };

  // ===========================================
  // SOCKET CONNECTION
  // ===========================================
  useEffect(() => {
    const socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Check for returning player
      const savedId = localStorage.getItem('spellBrigadePlayerId');
      if (savedId) {
        socket.emit('getPlayerData', { playerId: savedId });
      } else {
        setScreen('title');
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Returning player data
    socket.on('playerData', (data) => {
      if (data.player) {
        setSavedPlayer(data.player);
        setScreen('returning');
      } else {
        // No saved player found
        localStorage.removeItem('spellBrigadePlayerId');
        setScreen('title');
      }
    });

    socket.on('joined', (data) => {
      playerIdRef.current = data.playerId;
      playerDataRef.current = data.player;
      localStorage.setItem('spellBrigadePlayerId', data.playerId);
      setPlayerInfo(data.player);
      setScreen('game');
      if (data.classes) setClasses(data.classes);
      if (data.world) gameStateRef.current.world = data.world;
    });

    socket.on('gameState', (state) => {
      gameStateRef.current = { ...gameStateRef.current, ...state };
      const me = state.players?.find(p => p.id === playerIdRef.current);
      if (me) {
        playerDataRef.current = me;
        setPlayerInfo(prev => ({ ...prev, ...me }));
        updateZone(me);
      }
    });

    socket.on('levelUp', (data) => {
      setLevelUp(data.level);
      playSound('levelUp');
      setTimeout(() => setLevelUp(null), 2000);
    });

    socket.on('died', (data) => {
      setDeathInfo(data);
      setScreen('dead');
    });

    socket.on('damaged', (data) => {
      screenShakeRef.current.intensity = Math.min(15, data.amount / 2);
      playSound('playerHit');
    });

    socket.on('sound', (data) => {
      playSound(data.type);
    });

    socket.on('explosion', (data) => {
      effectsRef.current.push({
        type: 'explosion',
        x: data.x,
        y: data.y,
        radius: data.radius,
        color: data.color || '#f97316',
        startTime: Date.now(),
        duration: 500,
      });
      playSound('meteor');
      screenShakeRef.current.intensity = 12;
    });

    socket.on('meteorWarning', (data) => {
      meteorWarningsRef.current.push({
        x: data.x,
        y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        delay: data.delay,
      });
    });

    socket.on('iceNova', (data) => {
      effectsRef.current.push({
        type: 'iceNova',
        x: data.x,
        y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: 400,
      });
      playSound('iceNova');
    });

    socket.on('dashTrail', (data) => {
      effectsRef.current.push({
        type: 'trail',
        startX: data.startX,
        startY: data.startY,
        endX: data.endX,
        endY: data.endY,
        color: data.color,
        startTime: Date.now(),
        duration: 300,
      });
    });

    socket.on('bossSpawn', (data) => {
      playSound('bossSpawn');
      // Could show a notification here
      console.log(`👑 Boss spawned: ${data?.name} in ${data?.zone}`);
    });

    socket.on('bossDefeated', (data) => {
      // Could show celebration notification
      console.log(`💀 Boss defeated: ${data?.name}! Respawns in 5 minutes.`);
    });

    socket.on('respawned', () => {
      setScreen('game');
    });

    socket.on('skinChanged', (data) => {
      if (playerInfo) {
        setPlayerInfo(prev => ({ ...prev, selectedSkin: data.skinId }));
      }
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===========================================
  // INPUT HANDLING
  // ===========================================
  useEffect(() => {
    const keyMap = {
      KeyW: 'up',
      ArrowUp: 'up',
      KeyS: 'down',
      ArrowDown: 'down',
      KeyA: 'left',
      ArrowLeft: 'left',
      KeyD: 'right',
      ArrowRight: 'right',
    };

    // Click-to-move state
    let clickMoveActive = false;
    let clickMoveInterval = null;

    const updateClickMove = () => {
      if (!clickMoveActive || !playerDataRef.current) return;
      
      const zoom = zoomRef.current || 1;
      const targetX = (mouseRef.current.x / zoom) + cameraRef.current.x;
      const targetY = (mouseRef.current.y / zoom) + cameraRef.current.y;
      const me = playerDataRef.current;
      
      const dx = targetX - me.x;
      const dy = targetY - me.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Stop if close enough to target
      if (dist < 20) {
        inputRef.current = { up: false, down: false, left: false, right: false };
        socketRef.current?.emit('input', inputRef.current);
        return;
      }
      
      // Calculate 8-directional movement
      const angle = Math.atan2(dy, dx);
      const threshold = Math.PI / 8; // 22.5 degrees
      
      const newInput = { up: false, down: false, left: false, right: false };
      
      // Right: -22.5 to 22.5
      if (angle > -threshold && angle < threshold) {
        newInput.right = true;
      }
      // Down-right: 22.5 to 67.5
      else if (angle >= threshold && angle < 3 * threshold) {
        newInput.right = true;
        newInput.down = true;
      }
      // Down: 67.5 to 112.5
      else if (angle >= 3 * threshold && angle < 5 * threshold) {
        newInput.down = true;
      }
      // Down-left: 112.5 to 157.5
      else if (angle >= 5 * threshold && angle < 7 * threshold) {
        newInput.left = true;
        newInput.down = true;
      }
      // Left: 157.5 to 180 or -180 to -157.5
      else if (angle >= 7 * threshold || angle < -7 * threshold) {
        newInput.left = true;
      }
      // Up-left: -157.5 to -112.5
      else if (angle >= -7 * threshold && angle < -5 * threshold) {
        newInput.left = true;
        newInput.up = true;
      }
      // Up: -112.5 to -67.5
      else if (angle >= -5 * threshold && angle < -3 * threshold) {
        newInput.up = true;
      }
      // Up-right: -67.5 to -22.5
      else if (angle >= -3 * threshold && angle < -threshold) {
        newInput.right = true;
        newInput.up = true;
      }
      
      // Only emit if changed
      if (JSON.stringify(newInput) !== JSON.stringify(inputRef.current)) {
        inputRef.current = newInput;
        socketRef.current?.emit('input', inputRef.current);
      }
    };

    const handleMouseDown = (e) => {
      // Only left click, and not on UI elements
      if (e.button !== 0) return;
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      if (!playerDataRef.current) return; // Only in game
      
      initAudio();
      clickMoveActive = true;
      
      // Start updating movement
      if (clickMoveInterval) clearInterval(clickMoveInterval);
      clickMoveInterval = setInterval(updateClickMove, 50); // 20 times per second
      updateClickMove(); // Immediate first update
    };

    const handleMouseUp = (e) => {
      if (e.button !== 0) return;
      clickMoveActive = false;
      
      if (clickMoveInterval) {
        clearInterval(clickMoveInterval);
        clickMoveInterval = null;
      }
      
      // Stop movement
      inputRef.current = { up: false, down: false, left: false, right: false };
      socketRef.current?.emit('input', inputRef.current);
    };

    const handleKeyDown = (e) => {
      initAudio();
      
      // Keyboard input stops click-to-move
      clickMoveActive = false;
      if (clickMoveInterval) {
        clearInterval(clickMoveInterval);
        clickMoveInterval = null;
      }

      const dir = keyMap[e.code];
      if (dir && !inputRef.current[dir]) {
        inputRef.current[dir] = true;
        socketRef.current?.emit('input', inputRef.current);
      }

      // Dash
      if (e.code === 'Space' && socketRef.current && playerIdRef.current) {
        e.preventDefault();
        const zoom = zoomRef.current || 1;
        socketRef.current.emit('dash', {
          targetX: (mouseRef.current.x / zoom) + cameraRef.current.x,
          targetY: (mouseRef.current.y / zoom) + cameraRef.current.y,
        });
        playSound('dash');
      }

      // Ultimate
      if (e.code === 'KeyQ' && socketRef.current && playerIdRef.current) {
        const zoom = zoomRef.current || 1;
        socketRef.current.emit('ultimate', {
          targetX: (mouseRef.current.x / zoom) + cameraRef.current.x,
          targetY: (mouseRef.current.y / zoom) + cameraRef.current.y,
        });
      }
    };

    const handleKeyUp = (e) => {
      const dir = keyMap[e.code];
      if (dir && inputRef.current[dir]) {
        inputRef.current[dir] = false;
        socketRef.current?.emit('input', inputRef.current);
      }
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (clickMoveInterval) clearInterval(clickMoveInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===========================================
  // TOUCH CONTROLS (Mobile)
  // ===========================================
  const handleJoystickStart = (e) => {
    e.preventDefault();
    initAudio(); // Initialize audio on first touch
    const touch = e.touches[0];
    const rect = joystickBaseRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    joystickRef.current = {
      active: true,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      currentX: touch.clientX,
      currentY: touch.clientY,
    };
    updateJoystickInput();
  };

  const handleJoystickMove = (e) => {
    if (!joystickRef.current.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    joystickRef.current.currentX = touch.clientX;
    joystickRef.current.currentY = touch.clientY;
    updateJoystickInput();
    updateJoystickVisual();
  };

  const handleJoystickEnd = () => {
    joystickRef.current.active = false;
    inputRef.current = { up: false, down: false, left: false, right: false };
    socketRef.current?.emit('input', inputRef.current);
    updateJoystickVisual();
  };

  const updateJoystickInput = () => {
    const js = joystickRef.current;
    const dx = js.currentX - js.startX;
    const dy = js.currentY - js.startY;
    const deadzone = 15;
    
    const newInput = {
      up: dy < -deadzone,
      down: dy > deadzone,
      left: dx < -deadzone,
      right: dx > deadzone,
    };
    
    if (JSON.stringify(newInput) !== JSON.stringify(inputRef.current)) {
      inputRef.current = newInput;
      socketRef.current?.emit('input', inputRef.current);
    }
  };

  const updateJoystickVisual = () => {
    if (!joystickKnobRef.current) return;
    const js = joystickRef.current;
    
    if (!js.active) {
      joystickKnobRef.current.style.transform = 'translate(-50%, -50%)';
      return;
    }
    
    let dx = js.currentX - js.startX;
    let dy = js.currentY - js.startY;
    const maxDist = 40;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    
    joystickKnobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };

  const handleDashButton = () => {
    initAudio();
    if (!socketRef.current || !playerIdRef.current) return;
    
    // Dash toward center of screen (forward direction based on movement)
    const me = playerDataRef.current;
    if (!me) return;
    
    const input = inputRef.current;
    let dx = 0, dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    
    // If not moving, dash forward (up)
    if (dx === 0 && dy === 0) dy = -1;
    
    const dist = 200;
    socketRef.current.emit('dash', {
      targetX: me.x + dx * dist,
      targetY: me.y + dy * dist,
    });
    playSound('dash');
  };

  const handleUltimateButton = () => {
    initAudio();
    if (!socketRef.current || !playerIdRef.current) return;
    
    const me = playerDataRef.current;
    if (!me) return;
    
    // Cast ultimate in movement direction or forward
    const input = inputRef.current;
    let dx = 0, dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    
    if (dx === 0 && dy === 0) dy = -1;
    
    const dist = 150;
    socketRef.current.emit('ultimate', {
      targetX: me.x + dx * dist,
      targetY: me.y + dy * dist,
    });
  };

  // ===========================================
  // TOUCH-TO-MOVE (Mobile - tap/drag on screen)
  // ===========================================
  const touchMoveRef = useRef({ active: false, identifier: null });

  const updateTouchMove = (touchX, touchY) => {
    if (!playerDataRef.current) return;
    
    const zoom = zoomRef.current || 1;
    const targetX = (touchX / zoom) + cameraRef.current.x;
    const targetY = (touchY / zoom) + cameraRef.current.y;
    const me = playerDataRef.current;
    
    const dx = targetX - me.x;
    const dy = targetY - me.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 30) {
      inputRef.current = { up: false, down: false, left: false, right: false };
      socketRef.current?.emit('input', inputRef.current);
      return;
    }
    
    const angle = Math.atan2(dy, dx);
    const threshold = Math.PI / 8;
    
    const newInput = { up: false, down: false, left: false, right: false };
    
    if (angle > -threshold && angle < threshold) {
      newInput.right = true;
    } else if (angle >= threshold && angle < 3 * threshold) {
      newInput.right = true;
      newInput.down = true;
    } else if (angle >= 3 * threshold && angle < 5 * threshold) {
      newInput.down = true;
    } else if (angle >= 5 * threshold && angle < 7 * threshold) {
      newInput.left = true;
      newInput.down = true;
    } else if (angle >= 7 * threshold || angle < -7 * threshold) {
      newInput.left = true;
    } else if (angle >= -7 * threshold && angle < -5 * threshold) {
      newInput.left = true;
      newInput.up = true;
    } else if (angle >= -5 * threshold && angle < -3 * threshold) {
      newInput.up = true;
    } else if (angle >= -3 * threshold && angle < -threshold) {
      newInput.right = true;
      newInput.up = true;
    }
    
    if (JSON.stringify(newInput) !== JSON.stringify(inputRef.current)) {
      inputRef.current = newInput;
      socketRef.current?.emit('input', inputRef.current);
    }
  };

  const isInControlArea = (x, y) => {
    // Check if touch is in joystick area (bottom-left)
    const joystickBounds = { left: 0, right: 180, top: window.innerHeight - 230, bottom: window.innerHeight };
    if (x >= joystickBounds.left && x <= joystickBounds.right && 
        y >= joystickBounds.top && y <= joystickBounds.bottom) {
      return true;
    }
    // Check if touch is in action buttons area (bottom-right)
    const buttonBounds = { left: window.innerWidth - 120, right: window.innerWidth, top: window.innerHeight - 230, bottom: window.innerHeight };
    if (x >= buttonBounds.left && x <= buttonBounds.right && 
        y >= buttonBounds.top && y <= buttonBounds.bottom) {
      return true;
    }
    return false;
  };

  const handleScreenTouchStart = (e) => {
    if (!playerDataRef.current) return;
    
    // Initialize audio on first touch (required for mobile)
    initAudio();
    
    // Find a touch that's not in control areas
    for (const touch of e.changedTouches) {
      if (!isInControlArea(touch.clientX, touch.clientY)) {
        touchMoveRef.current = { active: true, identifier: touch.identifier };
        
        // Start moving immediately
        updateTouchMove(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleScreenTouchMove = (e) => {
    if (!touchMoveRef.current.active) return;
    
    for (const touch of e.changedTouches) {
      if (touch.identifier === touchMoveRef.current.identifier) {
        updateTouchMove(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleScreenTouchEnd = (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === touchMoveRef.current.identifier) {
        touchMoveRef.current = { active: false, identifier: null };
        
        // Stop movement
        inputRef.current = { up: false, down: false, left: false, right: false };
        socketRef.current?.emit('input', inputRef.current);
        break;
      }
    }
  };

  // ===========================================
  // GAME RENDER LOOP
  // ===========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const lerp = (a, b, t) => a + (b - a) * t;

    const render = () => {
      const { world, players, enemies, projectiles, xpOrbs, particles, damageNumbers } = gameStateRef.current;
      const me = players?.find(p => p.id === playerIdRef.current);
      const cam = cameraRef.current;
      const shake = screenShakeRef.current;

      // Mobile zoom - zoom out to see more of the world
      const isMobileView = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const zoom = isMobileView ? 0.6 : 1; // 60% zoom on mobile = see ~67% more
      zoomRef.current = zoom;
      
      // Virtual dimensions (what we "see" in world space)
      const width = canvas.width / zoom;
      const height = canvas.height / zoom;

      // Camera follow player
      if (me) {
        cam.x = lerp(cam.x, me.x - width / 2, 0.1);
        cam.y = lerp(cam.y, me.y - height / 2, 0.1);
        cam.x = Math.max(0, Math.min(world.width - width, cam.x));
        cam.y = Math.max(0, Math.min(world.height - height, cam.y));
      }

      // Screen shake
      if (shake.intensity > 0) {
        shake.x = (Math.random() - 0.5) * shake.intensity * 2;
        shake.y = (Math.random() - 0.5) * shake.intensity * 2;
        shake.intensity *= 0.9;
        if (shake.intensity < 0.5) shake.intensity = 0;
      } else {
        shake.x = 0;
        shake.y = 0;
      }

      const cx = cam.x + shake.x;
      const cy = cam.y + shake.y;

      // Apply zoom transform
      ctx.setTransform(zoom, 0, 0, zoom, 0, 0);

      // World center (for zone calculations)
      const worldCenterX = 2500;
      const worldCenterY = 2500;

      // Clear background
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, width, height);

      // Helper: get zone at world position
      const getZone = (wx, wy) => {
        const dist = Math.sqrt((wx - worldCenterX) ** 2 + (wy - worldCenterY) ** 2);
        if (dist <= 300) return 'sanctuary';
        if (dist <= 900) return 'meadow';
        if (dist <= 1600) return 'forest';
        if (dist <= 2100) return 'volcanic';
        if (dist <= 2600) return 'frozen';
        return 'abyss';
      };

      // Grid tiles with zone-specific colors
      const tileSize = 64;
      const startX = Math.floor(cx / tileSize) * tileSize;
      const startY = Math.floor(cy / tileSize) * tileSize;
      
      for (let x = startX; x < cx + width + tileSize; x += tileSize) {
        for (let y = startY; y < cy + height + tileSize; y += tileSize) {
          const zone = getZone(x + tileSize/2, y + tileSize/2);
          const colors = COLORS[zone] || COLORS.forest;
          const isLight = ((x / tileSize) + (y / tileSize)) % 2 === 0;
          ctx.fillStyle = isLight ? colors[0] : colors[1];
          ctx.fillRect(x - cx, y - cy, tileSize, tileSize);
        }
      }

      // Zone decorations (seeded random based on position for consistency)
      const seededRandom = (x, y, seed = 0) => {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
      };

      // Draw decorations for visible area
      for (let x = startX; x < cx + width + tileSize; x += tileSize) {
        for (let y = startY; y < cy + height + tileSize; y += tileSize) {
          const zone = getZone(x + tileSize/2, y + tileSize/2);
          const rand = seededRandom(x, y);
          const screenX = x - cx + tileSize/2;
          const screenY = y - cy + tileSize/2;
          
          // Only draw some tiles have decorations (20% chance)
          if (rand > 0.2) continue;
          
          const decorRand = seededRandom(x, y, 1);
          
          if (zone === 'sanctuary') {
            // Flowers
            ctx.fillStyle = decorRand > 0.5 ? '#fcd34d' : '#f472b6';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (zone === 'meadow') {
            // Bushes and small flowers
            if (decorRand > 0.6) {
              // Bush
              ctx.fillStyle = '#22c55e';
              ctx.beginPath();
              ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#16a34a';
              ctx.beginPath();
              ctx.arc(screenX - 3, screenY - 2, 5, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Grass tuft
              ctx.strokeStyle = '#4ade80';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(screenX - 4, screenY + 5);
              ctx.lineTo(screenX - 2, screenY - 5);
              ctx.moveTo(screenX, screenY + 5);
              ctx.lineTo(screenX, screenY - 7);
              ctx.moveTo(screenX + 4, screenY + 5);
              ctx.lineTo(screenX + 2, screenY - 5);
              ctx.stroke();
            }
          } else if (zone === 'forest') {
            // Trees and mushrooms
            if (decorRand > 0.5) {
              // Tree
              ctx.fillStyle = '#4a2c17';
              ctx.fillRect(screenX - 4, screenY - 5, 8, 20);
              ctx.fillStyle = '#166534';
              ctx.beginPath();
              ctx.moveTo(screenX, screenY - 25);
              ctx.lineTo(screenX - 15, screenY - 5);
              ctx.lineTo(screenX + 15, screenY - 5);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = '#14532d';
              ctx.beginPath();
              ctx.moveTo(screenX, screenY - 35);
              ctx.lineTo(screenX - 12, screenY - 18);
              ctx.lineTo(screenX + 12, screenY - 18);
              ctx.closePath();
              ctx.fill();
            } else {
              // Mushroom
              ctx.fillStyle = '#fef3c7';
              ctx.fillRect(screenX - 2, screenY, 4, 8);
              ctx.fillStyle = decorRand > 0.25 ? '#ef4444' : '#a855f7';
              ctx.beginPath();
              ctx.arc(screenX, screenY, 7, Math.PI, 0);
              ctx.fill();
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.arc(screenX - 3, screenY - 2, 2, 0, Math.PI * 2);
              ctx.arc(screenX + 2, screenY - 3, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (zone === 'volcanic') {
            // Lava pools, rocks, embers
            if (decorRand > 0.6) {
              // Lava pool
              ctx.fillStyle = '#dc2626';
              ctx.beginPath();
              ctx.ellipse(screenX, screenY, 12, 8, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#f97316';
              ctx.beginPath();
              ctx.ellipse(screenX, screenY, 8, 5, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#fbbf24';
              ctx.beginPath();
              ctx.ellipse(screenX, screenY, 4, 2, 0, 0, Math.PI * 2);
              ctx.fill();
            } else if (decorRand > 0.3) {
              // Rock
              ctx.fillStyle = '#44403c';
              ctx.beginPath();
              ctx.moveTo(screenX - 8, screenY + 5);
              ctx.lineTo(screenX - 5, screenY - 8);
              ctx.lineTo(screenX + 3, screenY - 6);
              ctx.lineTo(screenX + 8, screenY + 5);
              ctx.closePath();
              ctx.fill();
            } else {
              // Ember particles
              ctx.fillStyle = '#f97316';
              ctx.beginPath();
              ctx.arc(screenX + Math.sin(Date.now()/500 + x) * 3, screenY - 5, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (zone === 'frozen') {
            // Ice crystals, snow piles
            if (decorRand > 0.5) {
              // Ice crystal
              ctx.fillStyle = '#bfdbfe';
              ctx.beginPath();
              ctx.moveTo(screenX, screenY - 15);
              ctx.lineTo(screenX - 6, screenY + 5);
              ctx.lineTo(screenX + 6, screenY + 5);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = '#93c5fd';
              ctx.beginPath();
              ctx.moveTo(screenX, screenY - 15);
              ctx.lineTo(screenX, screenY + 5);
              ctx.lineTo(screenX + 6, screenY + 5);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#dbeafe';
              ctx.lineWidth = 1;
              ctx.stroke();
            } else {
              // Snow pile
              ctx.fillStyle = '#f1f5f9';
              ctx.beginPath();
              ctx.ellipse(screenX, screenY, 10, 5, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#e2e8f0';
              ctx.beginPath();
              ctx.ellipse(screenX - 5, screenY - 2, 6, 4, -0.3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (zone === 'abyss') {
            // Void crystals, floating runes
            if (decorRand > 0.6) {
              // Void crystal
              ctx.fillStyle = '#581c87';
              ctx.beginPath();
              ctx.moveTo(screenX, screenY - 18);
              ctx.lineTo(screenX - 8, screenY + 6);
              ctx.lineTo(screenX + 8, screenY + 6);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = '#7c3aed';
              ctx.beginPath();
              ctx.moveTo(screenX, screenY - 18);
              ctx.lineTo(screenX, screenY + 6);
              ctx.lineTo(screenX + 8, screenY + 6);
              ctx.closePath();
              ctx.fill();
              // Glow
              ctx.shadowColor = '#a855f7';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#c084fc';
              ctx.beginPath();
              ctx.arc(screenX, screenY - 5, 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            } else {
              // Floating rune
              const floatY = Math.sin(Date.now()/800 + x + y) * 3;
              ctx.strokeStyle = '#a855f7';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(screenX, screenY + floatY, 8, 0, Math.PI * 2);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(screenX - 4, screenY + floatY);
              ctx.lineTo(screenX + 4, screenY + floatY);
              ctx.moveTo(screenX, screenY - 4 + floatY);
              ctx.lineTo(screenX, screenY + 4 + floatY);
              ctx.stroke();
            }
          }
        }
      }

      // Zone transition rings (subtle gradient borders)
      const centerX = worldCenterX - cx;
      const centerY = worldCenterY - cy;
      const zoneRings = [
        { r: 2600, c: '#581c87' },
        { r: 2100, c: '#0ea5e9' },
        { r: 1600, c: '#dc2626' },
        { r: 900, c: '#166534' },
        { r: 300, c: '#84cc16' },
      ];
      for (const z of zoneRings) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, z.r, 0, Math.PI * 2);
        ctx.strokeStyle = z.c + '40';
        ctx.lineWidth = 8;
        ctx.stroke();
      }

      // Sanctuary (glowing safe zone)
      ctx.beginPath();
      ctx.arc(centerX, centerY, 300, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34,197,94,0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(34,197,94,0.6)';
      ctx.lineWidth = 4;
      ctx.setLineDash([15, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Sanctuary center marker
      ctx.fillStyle = 'rgba(34,197,94,0.3)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⛨ SANCTUARY', centerX, centerY + 5);

      // World border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6;
      ctx.setLineDash([20, 10]);
      ctx.strokeRect(-cx, -cy, world.width, world.height);
      ctx.setLineDash([]);

      // Enemies
      for (const enemy of enemies || []) {
        const sx = enemy.x - cx;
        const sy = enemy.y - cy;
        if (sx < -60 || sx > width + 60 || sy < -60 || sy > height + 60) continue;

        const isBoss = enemy.isBoss;
        const bounce = enemy.isFrozen ? 0 : Math.sin((enemy.animFrame || 0) * Math.PI / 2) * 0.8;
        const color = COLORS.enemy[enemy.type] || '#ff0000';
        const size = isBoss ? 2 : 1;

        // Shadow
        ctx.beginPath();
        ctx.ellipse(sx, sy + 8, 12 * size, 6 * size, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        // ========== BOSS UNIQUE DESIGNS ==========
        if (isBoss) {
          const bossType = enemy.type;
          const time = Date.now() / 1000;
          
          if (bossType === 'boss_meadow') {
            // Blossom Behemoth - Flower monster
            const petalCount = 8;
            const petalRadius = 35;
            // Petals
            for (let i = 0; i < petalCount; i++) {
              const angle = (i / petalCount) * Math.PI * 2 + time * 0.5;
              const px = sx + Math.cos(angle) * petalRadius;
              const py = sy - bounce + Math.sin(angle) * petalRadius * 0.6;
              ctx.beginPath();
              ctx.ellipse(px, py, 18, 12, angle, 0, Math.PI * 2);
              ctx.fillStyle = '#f472b6';
              ctx.fill();
              ctx.strokeStyle = '#db2777';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            // Center body
            ctx.beginPath();
            ctx.arc(sx, sy - bounce, 28, 0, Math.PI * 2);
            ctx.fillStyle = '#84cc16';
            ctx.fill();
            ctx.strokeStyle = '#65a30d';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Face
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(sx - 8, sy - 5 - bounce, 4, 0, Math.PI * 2);
            ctx.arc(sx + 8, sy - 5 - bounce, 4, 0, Math.PI * 2);
            ctx.fill();
            // Smile
            ctx.beginPath();
            ctx.arc(sx, sy + 5 - bounce, 10, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          else if (bossType === 'boss_forest') {
            // Ancient Treant - Tree creature
            // Trunk
            ctx.fillStyle = '#78350f';
            ctx.fillRect(sx - 15, sy - 20 - bounce, 30, 50);
            // Bark texture
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
              ctx.beginPath();
              ctx.moveTo(sx - 10 + i * 7, sy - 15 - bounce);
              ctx.lineTo(sx - 10 + i * 7, sy + 25 - bounce);
              ctx.stroke();
            }
            // Canopy
            ctx.fillStyle = '#166534';
            ctx.beginPath();
            ctx.arc(sx, sy - 35 - bounce, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx - 25, sy - 20 - bounce, 25, 0, Math.PI * 2);
            ctx.arc(sx + 25, sy - 20 - bounce, 25, 0, Math.PI * 2);
            ctx.fill();
            // Eyes (glowing)
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(sx - 12, sy - 5 - bounce, 5, 0, Math.PI * 2);
            ctx.arc(sx + 12, sy - 5 - bounce, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
          else if (bossType === 'boss_volcanic') {
            // Magma Titan - Lava golem
            // Body chunks
            ctx.fillStyle = '#44403c';
            ctx.beginPath();
            ctx.moveTo(sx - 35, sy + 20 - bounce);
            ctx.lineTo(sx - 25, sy - 40 - bounce);
            ctx.lineTo(sx + 25, sy - 40 - bounce);
            ctx.lineTo(sx + 35, sy + 20 - bounce);
            ctx.closePath();
            ctx.fill();
            // Lava cracks
            ctx.strokeStyle = '#f97316';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(sx - 20, sy + 15 - bounce);
            ctx.lineTo(sx - 10, sy - 20 - bounce);
            ctx.lineTo(sx + 5, sy - bounce);
            ctx.lineTo(sx + 15, sy - 30 - bounce);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sx + 20, sy + 10 - bounce);
            ctx.lineTo(sx + 5, sy - 15 - bounce);
            ctx.stroke();
            ctx.shadowBlur = 0;
            // Eyes (molten)
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(sx - 12, sy - 20 - bounce, 6, 0, Math.PI * 2);
            ctx.arc(sx + 12, sy - 20 - bounce, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Horns
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.moveTo(sx - 20, sy - 35 - bounce);
            ctx.lineTo(sx - 30, sy - 55 - bounce);
            ctx.lineTo(sx - 15, sy - 40 - bounce);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(sx + 20, sy - 35 - bounce);
            ctx.lineTo(sx + 30, sy - 55 - bounce);
            ctx.lineTo(sx + 15, sy - 40 - bounce);
            ctx.closePath();
            ctx.fill();
          }
          else if (bossType === 'boss_frozen') {
            // Frost Wyrm - Ice dragon/serpent
            // Body segments
            for (let i = 3; i >= 0; i--) {
              const segX = sx - Math.sin(time * 2 + i) * 8;
              const segY = sy + i * 15 - bounce;
              ctx.beginPath();
              ctx.arc(segX, segY, 18 - i * 2, 0, Math.PI * 2);
              ctx.fillStyle = i === 0 ? '#bfdbfe' : '#93c5fd';
              ctx.fill();
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            // Head
            ctx.fillStyle = '#bfdbfe';
            ctx.beginPath();
            ctx.ellipse(sx, sy - 25 - bounce, 25, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Ice crown/spikes
            ctx.fillStyle = '#dbeafe';
            for (let i = 0; i < 5; i++) {
              const angle = -Math.PI * 0.8 + (i / 4) * Math.PI * 0.6;
              ctx.beginPath();
              ctx.moveTo(sx + Math.cos(angle) * 20, sy - 25 - bounce + Math.sin(angle) * 15);
              ctx.lineTo(sx + Math.cos(angle) * 35, sy - 25 - bounce + Math.sin(angle) * 25 - 15);
              ctx.lineTo(sx + Math.cos(angle + 0.15) * 20, sy - 25 - bounce + Math.sin(angle + 0.15) * 15);
              ctx.closePath();
              ctx.fill();
            }
            // Eyes
            ctx.fillStyle = '#0ea5e9';
            ctx.shadowColor = '#0ea5e9';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(sx - 8, sy - 28 - bounce, 5, 0, Math.PI * 2);
            ctx.arc(sx + 8, sy - 28 - bounce, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
          else if (bossType === 'boss_abyss') {
            // Void Overlord - Cosmic horror
            // Tentacles
            ctx.strokeStyle = '#581c87';
            ctx.lineWidth = 8;
            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2 + time * 0.3;
              const len = 45 + Math.sin(time * 2 + i) * 10;
              ctx.beginPath();
              ctx.moveTo(sx, sy - bounce);
              const midX = sx + Math.cos(angle) * len * 0.5;
              const midY = sy - bounce + Math.sin(angle) * len * 0.5 + Math.sin(time * 3 + i) * 10;
              const endX = sx + Math.cos(angle) * len;
              const endY = sy - bounce + Math.sin(angle) * len * 0.7;
              ctx.quadraticCurveTo(midX, midY, endX, endY);
              ctx.stroke();
            }
            // Main body
            ctx.beginPath();
            ctx.arc(sx, sy - bounce, 30, 0, Math.PI * 2);
            ctx.fillStyle = '#1e1b4b';
            ctx.fill();
            ctx.strokeStyle = '#7c3aed';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Eye (singular, cosmic)
            const eyeGlow = 0.5 + Math.sin(time * 4) * 0.3;
            ctx.fillStyle = `rgba(168, 85, 247, ${eyeGlow})`;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(sx, sy - 5 - bounce, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.ellipse(sx, sy - 5 - bounce, 5, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            // Floating runes
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
              const runeAngle = time + (i / 3) * Math.PI * 2;
              const runeX = sx + Math.cos(runeAngle) * 50;
              const runeY = sy - bounce + Math.sin(runeAngle) * 30;
              ctx.beginPath();
              ctx.arc(runeX, runeY, 6, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          else {
            // Default boss (fallback)
            ctx.beginPath();
            ctx.arc(sx, sy - bounce, 34, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(sx - 8, sy - 8 - bounce, 6, 0, Math.PI * 2);
            ctx.arc(sx + 8, sy - 8 - bounce, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(sx - 8, sy - 8 - bounce, 3, 0, Math.PI * 2);
            ctx.arc(sx + 8, sy - 8 - bounce, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Boss health bar (all bosses)
          const hbW = 60;
          const hbY = sy - 70;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(sx - hbW / 2 - 2, hbY - 2, hbW + 4, 10);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(sx - hbW / 2, hbY, hbW, 6);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(sx - hbW / 2, hbY, hbW * enemy.health / enemy.maxHealth, 6);
          
          // Boss name
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(enemy.name || 'BOSS', sx, hbY - 5);
        }
        // ========== REGULAR ENEMIES ==========
        else {
          // Body
          ctx.beginPath();
          ctx.arc(sx, sy - bounce, 14, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Eyes
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(sx - 4, sy - 4 - bounce, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx + 4, sy - 4 - bounce, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(sx - 4, sy - 4 - bounce, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx + 4, sy - 4 - bounce, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Health bar (only if damaged)
          if (enemy.health < enemy.maxHealth) {
            const hbW = 28;
            const hbY = sy - 30;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx - hbW / 2 - 1, hbY - 1, hbW + 2, 6);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(sx - hbW / 2, hbY, hbW, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(sx - hbW / 2, hbY, hbW * enemy.health / enemy.maxHealth, 4);
          }
        }

        // Frozen indicator
        if (enemy.isFrozen) {
          ctx.beginPath();
          ctx.arc(sx, sy, 22, 0, Math.PI * 2);
          ctx.strokeStyle = '#87ceeb';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // Projectiles
      for (const proj of projectiles || []) {
        const px = proj.x - cx;
        const py = proj.y - cy;
        if (px < -50 || px > width + 50 || py < -50 || py > height + 50) continue;

        // Glow
        ctx.beginPath();
        ctx.arc(px, py, proj.radius + 10, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, proj.radius + 10);
        grad.addColorStop(0, proj.color || '#fff');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(px, py, proj.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }

      // XP Orbs
      for (const orb of xpOrbs || []) {
        const ox = orb.x - cx;
        const oy = orb.y - cy;
        if (ox < -20 || ox > width + 20 || oy < -20 || oy > height + 20) continue;

        const pulse = Math.sin(Date.now() / 150 + orb.x) * 0.3 + 0.7;
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
        const classColor = (classes[player.class] || DEFAULT_CLASSES[player.class])?.color || '#fff';
        const bob = player.state === 'walk' ? Math.sin((player.animFrame || 0) * Math.PI / 2) * 2 : 0;

        // Shadow
        ctx.beginPath();
        ctx.ellipse(px, py + 12, 16, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        // Robe
        ctx.fillStyle = classColor;
        ctx.beginPath();
        ctx.moveTo(px, py - 12 - bob);
        ctx.lineTo(px - 14, py + 14);
        ctx.lineTo(px + 14, py + 14);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(px, py - 18 - bob, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#fcd5ce';
        ctx.fill();

        // Hat
        ctx.fillStyle = classColor;
        ctx.beginPath();
        ctx.moveTo(px, py - 42 - bob);
        ctx.lineTo(px - 16, py - 16 - bob);
        ctx.lineTo(px + 16, py - 16 - bob);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(px - 3, py - 19 - bob, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + 3, py - 19 - bob, 2, 0, Math.PI * 2);
        ctx.fill();

        // Name & level
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, px, py + 28);
        ctx.fillStyle = '#ffd93d';
        ctx.font = '10px sans-serif';
        ctx.fillText('Lv.' + player.level, px, py + 40);

        // Health bar
        if (!isMe || player.health < player.maxHealth) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(px - 19, py - 51 - bob, 38, 7);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(px - 18, py - 50 - bob, 36, 5);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(px - 18, py - 50 - bob, 36 * player.health / player.maxHealth, 5);
        }

        // Selection ring for self
        if (isMe) {
          ctx.beginPath();
          ctx.arc(px, py, 28, 0, Math.PI * 2);
          ctx.strokeStyle = classColor + '50';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // Particles
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

      // Meteor warnings
      const now = Date.now();
      meteorWarningsRef.current = meteorWarningsRef.current.filter(m => {
        const elapsed = now - m.startTime;
        if (elapsed > m.delay) return false;

        const mx = m.x - cx;
        const my = m.y - cy;
        const progress = elapsed / m.delay;

        ctx.beginPath();
        ctx.arc(mx, my, m.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,100,0,${0.5 + Math.sin(elapsed * 0.02) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(mx, my, m.radius * (1 - progress), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,100,0,${0.2 * (1 - progress)})`;
        ctx.fill();

        return true;
      });

      // Effects (explosions, ice nova, dash trails)
      effectsRef.current = effectsRef.current.filter(ef => {
        const elapsed = now - ef.startTime;
        if (elapsed > ef.duration) return false;

        const progress = elapsed / ef.duration;
        const alpha = 1 - progress;

        if (ef.type === 'explosion') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const cr = ef.radius * (0.5 + progress * 0.5);
          ctx.beginPath();
          ctx.arc(ex, ey, cr, 0, Math.PI * 2);
          const gr = ctx.createRadialGradient(ex, ey, 0, ex, ey, cr);
          gr.addColorStop(0, ef.color + Math.floor(alpha * 200).toString(16).padStart(2, '0'));
          gr.addColorStop(0.5, ef.color + Math.floor(alpha * 100).toString(16).padStart(2, '0'));
          gr.addColorStop(1, 'transparent');
          ctx.fillStyle = gr;
          ctx.fill();
        } else if (ef.type === 'iceNova') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const cr = ef.radius * progress;
          ctx.beginPath();
          ctx.arc(ex, ey, cr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(78,205,196,${alpha})`;
          ctx.lineWidth = 8 * alpha;
          ctx.stroke();
        } else if (ef.type === 'trail') {
          ctx.beginPath();
          ctx.moveTo(ef.startX - cx, ef.startY - cy);
          ctx.lineTo(ef.endX - cx, ef.endY - cy);
          ctx.strokeStyle = ef.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
          ctx.lineWidth = 20 * alpha;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        return true;
      });

      // Minimap
      if (settingsRef.current.showMinimap && minimapRef.current) {
        const mm = minimapRef.current;
        const mmCtx = mm.getContext('2d');
        const mmW = mm.width;
        const mmH = mm.height;
        const scale = mmW / world.width;

        mmCtx.fillStyle = '#1a1a2e';
        mmCtx.fillRect(0, 0, mmW, mmH);

        const mcx = 2500 * scale;
        const mcy = 2500 * scale;

        // Zone rings (updated for new sizes)
        const rings = [
          { r: 300, c: '#22c55e' },
          { r: 900, c: '#84cc16' },
          { r: 1600, c: '#166534' },
          { r: 2100, c: '#dc2626' },
          { r: 2600, c: '#0ea5e9' },
        ];
        for (const ring of rings) {
          mmCtx.beginPath();
          mmCtx.arc(mcx, mcy, ring.r * scale, 0, Math.PI * 2);
          mmCtx.strokeStyle = ring.c + '60';
          mmCtx.lineWidth = 1;
          mmCtx.stroke();
        }

        // Enemies on minimap
        for (const e of enemies || []) {
          mmCtx.beginPath();
          mmCtx.arc(e.x * scale, e.y * scale, e.isBoss ? 4 : 2, 0, Math.PI * 2);
          mmCtx.fillStyle = e.isBoss ? '#fbbf24' : '#ef4444';
          mmCtx.fill();
        }

        // Players on minimap
        for (const p of players || []) {
          if (p.health <= 0) continue;
          mmCtx.beginPath();
          mmCtx.arc(p.x * scale, p.y * scale, p.id === playerIdRef.current ? 4 : 3, 0, Math.PI * 2);
          mmCtx.fillStyle = p.id === playerIdRef.current ? '#ffd93d' : '#3b82f6';
          mmCtx.fill();
        }
      }

      // Reset transform for next frame
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      animationId = requestAnimationFrame(render);
    };

    if (screen === 'game') {
      render();
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animationId) cancelAnimationFrame(animationId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, classes]);

  // ===========================================
  // WIZARD NAME GENERATOR
  // ===========================================
  const generateWizardName = () => {
    const prefixes = ['Shadow', 'Frost', 'Ember', 'Storm', 'Moon', 'Star', 'Crystal', 'Thunder', 'Mystic', 'Arcane', 'Void', 'Solar', 'Lunar', 'Crimson', 'Azure', 'Golden', 'Silver', 'Dark', 'Light', 'Wild'];
    const suffixes = ['weaver', 'caller', 'binder', 'walker', 'seeker', 'keeper', 'warden', 'mage', 'sage', 'seer', 'caster', 'shaper', 'dancer', 'whisper', 'flame', 'frost', 'spark', 'bolt', 'wind', 'heart'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${prefix}${suffix}${num}`;
  };

  // ===========================================
  // ACTIONS
  // ===========================================
  const handleContinue = () => {
    initAudio();
    if (!savedPlayer) return;
    const savedId = localStorage.getItem('spellBrigadePlayerId');
    socketRef.current?.emit('join', {
      playerId: savedId,
      playerName: savedPlayer.name,
      playerClass: savedPlayer.class,
      selectedSkin: savedPlayer.selectedSkin,
    });
  };

  const handleNewCharacter = () => {
    localStorage.removeItem('spellBrigadePlayerId');
    setSavedPlayer(null);
    setPlayerName('');
    setSelectedClass('pyromancer');
    setSelectedSkin('pyromancer_default');
    setScreen('title');
  };

  const handleJoin = () => {
    initAudio();
    const name = playerName.trim() || generateWizardName();
    socketRef.current?.emit('join', {
      playerId: null, // New character
      playerName: name,
      playerClass: selectedClass,
      selectedSkin: selectedSkin,
    });
  };

  const handleRespawn = () => {
    socketRef.current?.emit('respawn');
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setSelectedSkin(classId + '_default');
  };

  const handleChangeSkin = (skinId) => {
    if (screen === 'game' && playerInfo) {
      // In-game skin change
      socketRef.current?.emit('changeSkin', { skinId });
    }
    setSelectedSkin(skinId);
  };

  // ===========================================
  // STYLES
  // ===========================================
  const styles = {
    container: {
      position: 'relative',
      width: '100%',
      height: '100vh',
      background: '#0f0f1a',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#fff',
      touchAction: 'none', // Prevent mobile browser gestures
      userSelect: 'none',
    },
    canvas: {
      display: 'block',
      position: 'absolute',
      top: 0,
      left: 0,
    },
    minimap: {
      position: 'absolute',
      bottom: isMobile ? 220 : 20,
      right: isMobile ? 10 : 20,
      border: '2px solid rgba(255,255,255,0.15)',
      borderRadius: 12,
      display: settings.showMinimap && screen === 'game' ? 'block' : 'none',
    },
    overlay: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0f0f1a, #1a1a2e)',
      zIndex: 100,
      transition: 'opacity 0.3s',
    },
    hidden: {
      opacity: 0,
      pointerEvents: 'none',
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? 10 : 15,
      marginBottom: 8,
    },
    titleText: {
      fontSize: isMobile ? '2rem' : '3rem',
      background: 'linear-gradient(135deg, #ffd93d, #ff6b35)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    subtitle: {
      color: '#666',
      marginBottom: isMobile ? '1rem' : '2rem',
      letterSpacing: 2,
      textTransform: 'uppercase',
      fontSize: isMobile ? '.8rem' : '1rem',
    },
    tabs: {
      display: 'flex',
      gap: isMobile ? 4 : 8,
      marginBottom: isMobile ? 15 : 25,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    tab: (active) => ({
      padding: isMobile ? '8px 16px' : '12px 28px',
      background: active ? 'linear-gradient(135deg, #ffd93d, #ff6b35)' : 'transparent',
      border: active ? 'none' : '2px solid #2a2a3e',
      color: active ? '#000' : '#888',
      fontSize: isMobile ? '.8rem' : '.95rem',
      cursor: 'pointer',
      borderRadius: 25,
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? 4 : 8,
      fontWeight: active ? 600 : 400,
    }),
    tabIcon: {
      width: isMobile ? 14 : 18,
      height: isMobile ? 14 : 18,
    },
    content: {
      width: '100%',
      maxWidth: 900,
      padding: isMobile ? 10 : 20,
      overflowY: 'auto',
      maxHeight: isMobile ? '60vh' : 'auto',
    },
    input: {
      padding: isMobile ? '10px 16px' : '14px 20px',
      fontSize: isMobile ? '.9rem' : '1rem',
      background: 'rgba(255,255,255,0.05)',
      border: '2px solid #2a2a3e',
      borderRadius: 12,
      color: '#fff',
      width: isMobile ? 220 : 280,
      textAlign: 'center',
      outline: 'none',
    },
    classSelect: {
      display: 'flex',
      gap: isMobile ? 10 : 20,
      flexWrap: 'wrap',
      justifyContent: 'center',
      margin: isMobile ? '15px 0' : '25px 0',
    },
    classCard: (selected, color) => ({
      width: isMobile ? 150 : 200,
      padding: isMobile ? '15px 12px' : '25px 20px',
      background: 'rgba(255,255,255,0.03)',
      border: `2px solid ${selected ? color : '#2a2a3e'}`,
      borderRadius: 16,
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.25s',
      boxShadow: selected ? `0 0 30px ${color}30` : 'none',
    }),
    classIcon: (color) => ({
      width: isMobile ? 50 : 70,
      height: isMobile ? 50 : 70,
      margin: '0 auto 10px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color,
      background: color + '20',
    }),
    classIconSvg: {
      width: isMobile ? 26 : 36,
      height: isMobile ? 26 : 36,
    },
    btn: {
      padding: isMobile ? '12px 30px' : '16px 45px',
      fontSize: isMobile ? '1rem' : '1.1rem',
      fontWeight: 600,
      border: 0,
      borderRadius: 12,
      cursor: 'pointer',
      marginTop: isMobile ? 15 : 25,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'linear-gradient(135deg, #ffd93d, #ff6b35)',
      color: '#000',
    },
    btnIcon: {
      width: isMobile ? 18 : 22,
      height: isMobile ? 18 : 22,
    },
    // HUD styles
    hud: {
      position: 'absolute',
      top: 20,
      left: 20,
      zIndex: 50,
    },
    hudPanel: {
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      padding: 18,
      borderRadius: 16,
      minWidth: 200,
      border: '1px solid rgba(255,255,255,0.1)',
    },
    playerHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
      paddingBottom: 14,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    avatar: (color) => ({
      width: 46,
      height: 46,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: color + '25',
      color: color,
    }),
    avatarIcon: {
      width: 26,
      height: 26,
    },
    statBar: {
      marginBottom: 10,
    },
    statLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '.75rem',
      marginBottom: 4,
      color: '#999',
    },
    statIcon: {
      width: 14,
      height: 14,
      marginRight: 5,
    },
    barBg: {
      height: 8,
      background: 'rgba(255,255,255,0.1)',
      borderRadius: 4,
      overflow: 'hidden',
    },
    barFill: (pct, color) => ({
      height: '100%',
      width: `${pct}%`,
      background: color,
      borderRadius: 4,
      transition: 'width 0.3s',
    }),
    statsRow: {
      display: 'flex',
      gap: 16,
      fontSize: '.8rem',
      color: '#888',
      marginTop: 12,
    },
    statItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
    },
    // Zone indicator
    zoneIndicator: {
      position: 'absolute',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      padding: '10px 22px',
      borderRadius: 25,
      fontSize: '.9rem',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      border: '1px solid rgba(255,255,255,0.1)',
    },
    zoneIcon: (color) => ({
      width: 20,
      height: 20,
      color: color,
    }),
    zoneWarning: {
      color: '#f97316',
      fontSize: '.75rem',
      display: 'flex',
      alignItems: 'center',
      gap: 5,
    },
    // Volume control
    volumeControl: {
      position: 'absolute',
      top: 20,
      right: 20,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      padding: '8px 14px',
      borderRadius: 25,
      border: '1px solid rgba(255,255,255,0.1)',
    },
    volumeBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 4,
      display: 'flex',
      color: '#888',
    },
    volumeIcon: {
      width: 20,
      height: 20,
    },
    volumeSlider: {
      width: 70,
    },
    // Level up popup
    levelUpPopup: {
      position: 'absolute',
      top: isMobile ? 60 : 80,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(5px)',
      padding: isMobile ? '12px 25px' : '15px 35px',
      borderRadius: 15,
      border: '2px solid rgba(255,215,61,0.5)',
      textAlign: 'center',
      zIndex: 55,
      pointerEvents: 'none', // Don't block clicks/touches
    },
    levelUpTitle: {
      color: '#ffd93d',
      fontSize: '1.6rem',
      marginBottom: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    // Controls hint
    controlsHint: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      background: 'rgba(0,0,0,0.7)',
      padding: '8px 14px',
      borderRadius: 8,
      fontSize: '.75rem',
      color: '#666',
      zIndex: 50,
    },
    // Connection status
    connection: (connected) => ({
      position: 'absolute',
      top: 10,
      left: 10,
      padding: '5px 10px',
      borderRadius: 6,
      fontSize: '.7rem',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: connected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
      color: connected ? '#4ade80' : '#f87171',
    }),
    connDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'currentColor',
    },
    // Tutorial styles
    tutorial: {
      maxWidth: 700,
      textAlign: 'left',
      padding: isMobile ? '0 10px' : 0,
    },
    tutorialSection: {
      marginBottom: isMobile ? 20 : 28,
    },
    tutorialTitle: {
      color: '#ffd93d',
      marginBottom: isMobile ? 8 : 12,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: isMobile ? '.95rem' : '1.1rem',
    },
    tutorialIcon: {
      width: isMobile ? 18 : 22,
      height: isMobile ? 18 : 22,
    },
    tutorialText: {
      color: '#999',
      lineHeight: 1.7,
      fontSize: isMobile ? '.85rem' : '1rem',
    },
    key: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: isMobile ? 28 : 32,
      padding: isMobile ? '3px 8px' : '4px 10px',
      background: '#2a2a3e',
      borderRadius: 6,
      fontFamily: 'monospace',
      fontSize: isMobile ? '.75rem' : '.85rem',
      color: '#fff',
      marginRight: 8,
    },
    zoneList: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: isMobile ? 8 : 12,
      marginTop: 15,
    },
    zoneItem: (color) => ({
      padding: isMobile ? 10 : 14,
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 10,
      borderLeft: `4px solid ${color}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: isMobile ? 8 : 12,
    }),
    zoneItemIcon: {
      width: isMobile ? 20 : 24,
      height: isMobile ? 20 : 24,
      flexShrink: 0,
    },
    // Settings styles
    settingsContent: {
      maxWidth: 380,
      padding: isMobile ? '0 10px' : 0,
    },
    settingRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? 12 : 16,
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 12,
      marginBottom: isMobile ? 8 : 12,
    },
    settingLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: isMobile ? '.85rem' : '.95rem',
    },
    settingIcon: {
      width: 20,
      height: 20,
      opacity: 0.7,
    },
    toggle: (on) => ({
      width: 48,
      height: 26,
      background: on ? '#4ade80' : '#2a2a3e',
      borderRadius: 13,
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.2s',
    }),
    toggleKnob: (on) => ({
      position: 'absolute',
      width: 20,
      height: 20,
      background: '#fff',
      borderRadius: '50%',
      top: 3,
      left: on ? 25 : 3,
      transition: 'left 0.2s',
    }),
    // Death screen styles
    deathStats: {
      display: 'flex',
      gap: 30,
      margin: '25px 0',
    },
    deathStat: {
      textAlign: 'center',
    },
    deathValue: {
      fontSize: '2rem',
      fontWeight: 700,
      color: '#ffd93d',
    },
    deathLabel: {
      fontSize: '.8rem',
      color: '#888',
      marginTop: 5,
    },
    // Mobile touch controls
    touchControls: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 200,
      pointerEvents: 'none',
      zIndex: 60,
    },
    joystickArea: {
      position: 'absolute',
      bottom: 30,
      left: 30,
      width: 120,
      height: 120,
      pointerEvents: 'auto',
      touchAction: 'none',
    },
    joystickBase: {
      width: 120,
      height: 120,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.1)',
      border: '3px solid rgba(255,255,255,0.3)',
      position: 'relative',
    },
    joystickKnob: {
      width: 50,
      height: 50,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.5)',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      transition: 'none',
    },
    actionButtons: {
      position: 'absolute',
      bottom: 30,
      right: 30,
      display: 'flex',
      flexDirection: 'column',
      gap: 15,
      pointerEvents: 'auto',
    },
    actionButton: (color) => ({
      width: 70,
      height: 70,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${color}aa)`,
      border: '3px solid rgba(255,255,255,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      cursor: 'pointer',
      touchAction: 'manipulation',
      userSelect: 'none',
    }),
    actionButtonIcon: {
      width: 28,
      height: 28,
    },
    // Mobile-specific style overrides
    mobileHud: {
      position: 'absolute',
      top: 10,
      left: 10,
      zIndex: 50,
    },
    mobileHudPanel: {
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      padding: 10,
      borderRadius: 12,
      minWidth: 140,
      border: '1px solid rgba(255,255,255,0.1)',
    },
    mobilePlayerHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
      paddingBottom: 8,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    mobileAvatar: (color) => ({
      width: 32,
      height: 32,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: color + '25',
      color: color,
    }),
    mobileAvatarIcon: {
      width: 18,
      height: 18,
    },
    mobileZoneIndicator: {
      position: 'absolute',
      top: 10,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      padding: '6px 14px',
      borderRadius: 20,
      fontSize: '.75rem',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      border: '1px solid rgba(255,255,255,0.1)',
    },
    // Returning player screen
    returningCard: {
      background: 'rgba(255,255,255,0.03)',
      border: '2px solid #2a2a3e',
      borderRadius: 20,
      padding: isMobile ? 20 : 30,
      maxWidth: 400,
      width: '90%',
      textAlign: 'center',
    },
    returningAvatar: (color) => ({
      width: isMobile ? 80 : 100,
      height: isMobile ? 80 : 100,
      borderRadius: '50%',
      margin: '0 auto 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: color + '25',
      color: color,
      border: `3px solid ${color}`,
    }),
    returningAvatarIcon: {
      width: isMobile ? 45 : 55,
      height: isMobile ? 45 : 55,
    },
    returningName: {
      fontSize: isMobile ? '1.5rem' : '1.8rem',
      fontWeight: 700,
      marginBottom: 5,
    },
    returningStats: {
      display: 'flex',
      justifyContent: 'center',
      gap: isMobile ? 20 : 30,
      margin: '20px 0',
      flexWrap: 'wrap',
    },
    returningStat: {
      textAlign: 'center',
    },
    returningStatValue: {
      fontSize: isMobile ? '1.3rem' : '1.5rem',
      fontWeight: 700,
      color: '#ffd93d',
    },
    returningStatLabel: {
      fontSize: '.75rem',
      color: '#888',
      marginTop: 4,
    },
    returningButtons: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      marginTop: 25,
    },
    secondaryBtn: {
      padding: isMobile ? '10px 20px' : '12px 30px',
      fontSize: isMobile ? '.9rem' : '1rem',
      fontWeight: 500,
      border: '2px solid #2a2a3e',
      borderRadius: 12,
      cursor: 'pointer',
      background: 'transparent',
      color: '#888',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    // Skin selector
    skinSelector: {
      marginTop: 20,
      padding: 15,
      background: 'rgba(0,0,0,0.3)',
      borderRadius: 12,
    },
    skinSelectorTitle: {
      fontSize: '.85rem',
      color: '#888',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    skinGrid: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    skinOption: (selected, color, locked) => ({
      width: isMobile ? 50 : 60,
      height: isMobile ? 50 : 60,
      borderRadius: 12,
      background: locked ? 'rgba(255,255,255,0.02)' : color + '20',
      border: `2px solid ${selected ? color : locked ? '#1a1a2e' : '#2a2a3e'}`,
      cursor: locked ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: locked ? 0.4 : 1,
      position: 'relative',
      transition: 'all 0.2s',
    }),
    skinOptionInner: (color) => ({
      width: isMobile ? 30 : 36,
      height: isMobile ? 30 : 36,
      borderRadius: '50%',
      background: color,
    }),
    skinLock: {
      position: 'absolute',
      bottom: -5,
      right: -5,
      background: '#1a1a2e',
      borderRadius: '50%',
      width: 18,
      height: 18,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
    },
    skinTooltip: {
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.95)',
      padding: '6px 10px',
      borderRadius: 6,
      fontSize: '.7rem',
      whiteSpace: 'nowrap',
      marginBottom: 5,
      pointerEvents: 'none',
    },
    // In-game skin modal
    modal: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(15,15,26,0.98)',
      border: '2px solid #2a2a3e',
      borderRadius: 20,
      padding: isMobile ? 20 : 30,
      zIndex: 200,
      maxWidth: 400,
      width: '90%',
    },
    modalBackdrop: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 199,
    },
    modalTitle: {
      fontSize: '1.3rem',
      fontWeight: 600,
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    modalClose: {
      position: 'absolute',
      top: 15,
      right: 15,
      background: 'none',
      border: 'none',
      color: '#888',
      cursor: 'pointer',
      fontSize: '1.5rem',
    },
    // Loading screen
    loadingText: {
      color: '#888',
      fontSize: '1.1rem',
    },
    spinner: {
      width: 40,
      height: 40,
      border: '3px solid #2a2a3e',
      borderTopColor: '#ffd93d',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: 20,
    },
  };

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <div style={styles.container} onClick={initAudio} onTouchStart={initAudio}>
      {/* Game Canvas */}
      <canvas 
        ref={canvasRef} 
        style={styles.canvas} 
        onTouchStart={isMobile ? handleScreenTouchStart : undefined}
        onTouchMove={isMobile ? handleScreenTouchMove : undefined}
        onTouchEnd={isMobile ? handleScreenTouchEnd : undefined}
      />
      <canvas 
        ref={minimapRef} 
        width={isMobile ? 100 : 160} 
        height={isMobile ? 100 : 160} 
        style={styles.minimap} 
      />

      {/* Loading Screen */}
      <div style={{ ...styles.overlay, ...(screen !== 'loading' ? styles.hidden : {}) }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Connecting to server...</p>
      </div>

      {/* Returning Player Screen */}
      <div style={{ ...styles.overlay, ...(screen !== 'returning' ? styles.hidden : {}) }}>
        <div style={styles.title}>
          <svg width={isMobile ? 36 : 48} height={isMobile ? 36 : 48} viewBox="0 0 48 48">
            <path d="M24 4L28 16H40L30 24L34 36L24 28L14 36L18 24L8 16H20L24 4Z" fill="#ffd93d"/>
            <circle cx="24" cy="24" r="6" fill="#ff6b35"/>
          </svg>
          <h1 style={styles.titleText}>Spell Brigade</h1>
        </div>
        <p style={{ ...styles.subtitle, marginBottom: isMobile ? 20 : 30 }}>Welcome back!</p>

        {savedPlayer && (
          <div style={styles.returningCard}>
            <div style={styles.returningAvatar(classes[savedPlayer.class]?.color || '#fff')}>
              <span style={styles.returningAvatarIcon}>
                {CLASS_SVG[savedPlayer.class] || SVG.arcane}
              </span>
            </div>
            <div style={styles.returningName}>{savedPlayer.name}</div>
            <div style={{ color: '#888', fontSize: '.9rem' }}>
              {classes[savedPlayer.class]?.name || savedPlayer.class} • {savedPlayer.rank?.title || 'Novice'}
            </div>

            <div style={styles.returningStats}>
              <div style={styles.returningStat}>
                <div style={styles.returningStatValue}>{savedPlayer.level || 1}</div>
                <div style={styles.returningStatLabel}>Level</div>
              </div>
              <div style={styles.returningStat}>
                <div style={styles.returningStatValue}>{savedPlayer.totalXp || 0}</div>
                <div style={styles.returningStatLabel}>Total XP</div>
              </div>
              <div style={styles.returningStat}>
                <div style={styles.returningStatValue}>{savedPlayer.kills || 0}</div>
                <div style={styles.returningStatLabel}>Kills</div>
              </div>
            </div>

            <div style={styles.returningButtons}>
              <button style={styles.btn} onClick={handleContinue}>
                <span style={styles.btnIcon}>{SVG.play}</span>
                Continue Playing
              </button>
              <button style={styles.secondaryBtn} onClick={handleNewCharacter}>
                <span style={{ width: 18, height: 18 }}>{SVG.refresh}</span>
                New Character
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Title Screen */}
      <div style={{ ...styles.overlay, ...(screen !== 'title' ? styles.hidden : {}) }}>
        {/* Logo & Title */}
        <div style={styles.title}>
          <svg width={isMobile ? 36 : 48} height={isMobile ? 36 : 48} viewBox="0 0 48 48">
            <path d="M24 4L28 16H40L30 24L34 36L24 28L14 36L18 24L8 16H20L24 4Z" fill="#ffd93d"/>
            <circle cx="24" cy="24" r="6" fill="#ff6b35"/>
          </svg>
          <h1 style={styles.titleText}>Spell Brigade</h1>
        </div>
        <p style={styles.subtitle}>Survive the magical wilderness</p>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button style={styles.tab(tab === 'play')} onClick={() => setTab('play')}>
            <span style={styles.tabIcon}>{SVG.play}</span> Play
          </button>
          <button style={styles.tab(tab === 'tutorial')} onClick={() => setTab('tutorial')}>
            <span style={styles.tabIcon}>{SVG.help}</span> How to Play
          </button>
          <button style={styles.tab(tab === 'settings')} onClick={() => setTab('settings')}>
            <span style={styles.tabIcon}>{SVG.settings}</span> Settings
          </button>
        </div>

        {/* Play Tab */}
        {tab === 'play' && (
          <div style={{ ...styles.content, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter wizard name (or leave blank)"
              maxLength={20}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />

            <div style={styles.classSelect}>
              {Object.entries(classes).map(([id, c]) => (
                <div
                  key={id}
                  style={styles.classCard(selectedClass === id, c.color)}
                  onClick={() => handleClassChange(id)}
                >
                  <div style={styles.classIcon(c.color)}>
                    <span style={styles.classIconSvg}>{CLASS_SVG[id] || SVG.arcane}</span>
                  </div>
                  <h3 style={{ color: c.color, marginBottom: 8, fontSize: isMobile ? '.95rem' : '1.1rem' }}>{c.name}</h3>
                  <p style={{ fontSize: isMobile ? '.7rem' : '.8rem', color: '#888', lineHeight: 1.5 }}>{c.description}</p>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a3e' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.7rem', color: '#666', marginBottom: 4 }}>
                      <span style={{ color: c.color, width: 12, height: 12 }}>{SVG.dash}</span>
                      {c.dash || 'Dash'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.7rem', color: '#666' }}>
                      <span style={{ color: c.color, width: 12, height: 12 }}>{SVG.warning}</span>
                      {c.ultimate || 'Ultimate'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Skin Preview */}
            <div style={styles.skinSelector}>
              <div style={styles.skinSelectorTitle}>
                <span style={{ width: 16, height: 16 }}>{SVG.star}</span>
                Choose Your Style
              </div>
              <div style={styles.skinGrid}>
                {/* Show default skin + any unlocked ones for new character */}
                {DEFAULT_SKINS.filter(s => s.class === selectedClass).map(skin => {
                  const isSelected = selectedSkin === skin.id;
                  const isLocked = skin.requiredXp > 0; // For new characters, only default is unlocked
                  return (
                    <div
                      key={skin.id}
                      style={styles.skinOption(isSelected, skin.color, isLocked)}
                      onClick={() => !isLocked && setSelectedSkin(skin.id)}
                      title={skin.name}
                    >
                      <div style={styles.skinOptionInner(skin.color)} />
                      {isLocked && (
                        <div style={styles.skinLock}>🔒</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: '.7rem', color: '#666', marginTop: 10, textAlign: 'center' }}>
                Earn XP to unlock more skins!
              </p>
            </div>

            <button style={styles.btn} onClick={handleJoin}>
              <span style={styles.btnIcon}>{SVG.dash}</span> Enter Arena
            </button>
          </div>
        )}

        {/* Tutorial Tab */}
        {tab === 'tutorial' && (
          <div style={{ ...styles.content, ...styles.tutorial }}>
            <div style={styles.tutorialSection}>
              <h3 style={styles.tutorialTitle}>
                <span style={styles.tutorialIcon}>{SVG.controls}</span> Controls
              </h3>
              <p style={styles.tutorialText}>
                <span style={styles.key}>WASD</span> Move wizard<br/>
                <span style={styles.key}>SPACE</span> Dash ability<br/>
                <span style={styles.key}>Q</span> Ultimate ability<br/>
                Spells auto-cast at nearby enemies
              </p>
            </div>

            <div style={styles.tutorialSection}>
              <h3 style={styles.tutorialTitle}>
                <span style={styles.tutorialIcon}>{SVG.star}</span> Progression
              </h3>
              <p style={styles.tutorialText}>
                Kill enemies, collect XP orbs, level up, unlock skins!
              </p>
            </div>

            <div style={styles.tutorialSection}>
              <h3 style={styles.tutorialTitle}>
                <span style={styles.tutorialIcon}>{SVG.home}</span> Zones
              </h3>
              <div style={styles.zoneList}>
                <div style={styles.zoneItem('#22c55e')}>
                  <span style={{ ...styles.zoneItemIcon, color: '#22c55e' }}>{SVG.home}</span>
                  <div>
                    <h4 style={{ fontSize: '.9rem', marginBottom: 4 }}>Sanctuary</h4>
                    <p style={{ fontSize: '.75rem', color: '#888' }}>Safe zone</p>
                  </div>
                </div>
                <div style={styles.zoneItem('#84cc16')}>
                  <span style={{ ...styles.zoneItemIcon, color: '#84cc16' }}>{SVG.star}</span>
                  <div>
                    <h4 style={{ fontSize: '.9rem', marginBottom: 4 }}>Meadow (Lv1)</h4>
                    <p style={{ fontSize: '.75rem', color: '#888' }}>Easy</p>
                  </div>
                </div>
                <div style={styles.zoneItem('#166534')}>
                  <span style={{ ...styles.zoneItemIcon, color: '#166534' }}>{SVG.arcane}</span>
                  <div>
                    <h4 style={{ fontSize: '.9rem', marginBottom: 4 }}>Forest (Lv5)</h4>
                    <p style={{ fontSize: '.75rem', color: '#888' }}>Medium</p>
                  </div>
                </div>
                <div style={styles.zoneItem('#dc2626')}>
                  <span style={{ ...styles.zoneItemIcon, color: '#dc2626' }}>{SVG.fire}</span>
                  <div>
                    <h4 style={{ fontSize: '.9rem', marginBottom: 4 }}>Volcanic (Lv10)</h4>
                    <p style={{ fontSize: '.75rem', color: '#888' }}>Hard</p>
                  </div>
                </div>
                <div style={styles.zoneItem('#0ea5e9')}>
                  <span style={{ ...styles.zoneItemIcon, color: '#0ea5e9' }}>{SVG.ice}</span>
                  <div>
                    <h4 style={{ fontSize: '.9rem', marginBottom: 4 }}>Frozen (Lv15)</h4>
                    <p style={{ fontSize: '.75rem', color: '#888' }}>Harder</p>
                  </div>
                </div>
                <div style={styles.zoneItem('#581c87')}>
                  <span style={{ ...styles.zoneItemIcon, color: '#581c87' }}>{SVG.skull}</span>
                  <div>
                    <h4 style={{ fontSize: '.9rem', marginBottom: 4 }}>Abyss (Lv20)</h4>
                    <p style={{ fontSize: '.75rem', color: '#888' }}>Bosses!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div style={{ ...styles.content, ...styles.settingsContent }}>
            <div style={styles.settingRow}>
              <label style={styles.settingLabel}>
                <span style={styles.settingIcon}>{SVG.volume}</span> Volume
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume * 100}
                onChange={(e) => setSettings(s => ({ ...s, volume: e.target.value / 100 }))}
                style={{ width: 110 }}
              />
            </div>

            <div style={styles.settingRow}>
              <label style={styles.settingLabel}>
                <span style={styles.settingIcon}>{SVG.volume}</span> Sound Effects
              </label>
              <div
                style={styles.toggle(settings.sfxEnabled)}
                onClick={() => setSettings(s => ({ ...s, sfxEnabled: !s.sfxEnabled }))}
              >
                <div style={styles.toggleKnob(settings.sfxEnabled)} />
              </div>
            </div>

            <div style={styles.settingRow}>
              <label style={styles.settingLabel}>
                <span style={styles.settingIcon}>{SVG.home}</span> Zone Names
              </label>
              <div
                style={styles.toggle(settings.showZoneNames)}
                onClick={() => setSettings(s => ({ ...s, showZoneNames: !s.showZoneNames }))}
              >
                <div style={styles.toggleKnob(settings.showZoneNames)} />
              </div>
            </div>

            <div style={styles.settingRow}>
              <label style={styles.settingLabel}>
                <span style={styles.settingIcon}>{SVG.star}</span> Minimap
              </label>
              <div
                style={styles.toggle(settings.showMinimap)}
                onClick={() => setSettings(s => ({ ...s, showMinimap: !s.showMinimap }))}
              >
                <div style={styles.toggleKnob(settings.showMinimap)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Death Screen */}
      <div style={{ ...styles.overlay, ...(screen !== 'dead' ? styles.hidden : {}) }}>
        <span style={{ color: '#ef4444', width: 64, height: 64 }}>{SVG.skull}</span>
        <h1 style={{ color: '#ef4444', fontSize: '2.2rem', margin: '15px 0' }}>You Died!</h1>
        <p style={{ color: '#888' }}>
          Killed by <span style={{ color: '#fff' }}>{deathInfo?.killedBy || 'enemy'}</span>
        </p>

        <div style={styles.deathStats}>
          <div style={styles.deathStat}>
            <div style={styles.deathValue}>{deathInfo?.level || 1}</div>
            <div style={styles.deathLabel}>Level</div>
          </div>
          <div style={styles.deathStat}>
            <div style={styles.deathValue}>{playerInfo?.kills || 0}</div>
            <div style={styles.deathLabel}>Kills</div>
          </div>
          <div style={styles.deathStat}>
            <div style={styles.deathValue}>{playerInfo?.totalXp || 0}</div>
            <div style={styles.deathLabel}>XP</div>
          </div>
        </div>

        <button style={styles.btn} onClick={handleRespawn}>
          <span style={styles.btnIcon}>{SVG.refresh}</span> Respawn
        </button>
      </div>

      {/* Game HUD */}
      {screen === 'game' && playerInfo && (
        <>
          {/* Stats Panel - Desktop */}
          {!isMobile && (
            <div style={styles.hud}>
              <div style={styles.hudPanel}>
                <div style={styles.playerHeader}>
                  <div style={styles.avatar(classes[playerInfo.class]?.color || '#fff')}>
                    <span style={styles.avatarIcon}>{CLASS_SVG[playerInfo.class] || SVG.arcane}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{playerInfo.name}</div>
                    <div style={{ fontSize: '.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <span style={{ width: 14, height: 14, color: '#ffd93d' }}>{SVG.star}</span>
                      {playerInfo.rank?.title || 'Novice'} • Lv {playerInfo.level}
                    </div>
                  </div>
                </div>

                {/* HP Bar */}
                <div style={styles.statBar}>
                  <div style={styles.statLabel}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ ...styles.statIcon, color: '#ef4444' }}>{SVG.heart}</span> HP
                    </span>
                    <span>{Math.floor(playerInfo.health)}/{playerInfo.maxHealth}</span>
                  </div>
                  <div style={styles.barBg}>
                    <div style={styles.barFill(
                      playerInfo.health / playerInfo.maxHealth * 100,
                      'linear-gradient(90deg, #ef4444, #f87171)'
                    )} />
                  </div>
                </div>

                {/* XP Bar */}
                <div style={styles.statBar}>
                  <div style={styles.statLabel}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ ...styles.statIcon, color: '#3b82f6' }}>{SVG.star}</span> XP
                    </span>
                    <span>{playerInfo.xp}/{playerInfo.xpToLevel || 100}</span>
                  </div>
                  <div style={styles.barBg}>
                    <div style={styles.barFill(
                      playerInfo.xp / (playerInfo.xpToLevel || 100) * 100,
                      'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                    )} />
                  </div>
                </div>

                {/* Stats Row */}
                <div style={styles.statsRow}>
                  <span style={styles.statItem}>
                    <span style={{ ...styles.statIcon, color: '#fbbf24' }}>{SVG.sword}</span>
                    {playerInfo.kills || 0}
                  </span>
                  <span style={styles.statItem}>
                    <span style={{ ...styles.statIcon, color: '#888' }}>{SVG.skull}</span>
                    {playerInfo.deaths || 0}
                  </span>
                  <span style={styles.statItem}>
                    <span style={{ ...styles.statIcon, color: '#a855f7' }}>{SVG.star}</span>
                    {playerInfo.totalXp || 0}
                  </span>
                </div>

                {/* Skin Change Button */}
                <button
                  style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid #2a2a3e',
                    borderRadius: 8,
                    color: '#888',
                    fontSize: '.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    width: '100%',
                    justifyContent: 'center',
                  }}
                  onClick={() => setShowSkinSelect(true)}
                >
                  <span style={{ width: 14, height: 14 }}>{SVG.star}</span>
                  Change Skin
                </button>
              </div>
            </div>
          )}

          {/* Stats Panel - Mobile (Compact) */}
          {isMobile && (
            <div style={styles.mobileHud}>
              <div style={styles.mobileHudPanel}>
                <div style={styles.mobilePlayerHeader}>
                  <div style={styles.mobileAvatar(classes[playerInfo.class]?.color || '#fff')}>
                    <span style={styles.mobileAvatarIcon}>{CLASS_SVG[playerInfo.class] || SVG.arcane}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{playerInfo.name}</div>
                    <div style={{ fontSize: '.65rem', color: '#888' }}>Lv {playerInfo.level}</div>
                  </div>
                </div>

                {/* Compact HP Bar */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ ...styles.barBg, height: 6 }}>
                    <div style={styles.barFill(
                      playerInfo.health / playerInfo.maxHealth * 100,
                      'linear-gradient(90deg, #ef4444, #f87171)'
                    )} />
                  </div>
                </div>

                {/* Compact XP Bar */}
                <div>
                  <div style={{ ...styles.barBg, height: 6 }}>
                    <div style={styles.barFill(
                      playerInfo.xp / (playerInfo.xpToLevel || 100) * 100,
                      'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                    )} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Zone Indicator - Desktop */}
          {settings.showZoneNames && !isMobile && (
            <div style={styles.zoneIndicator}>
              <span style={styles.zoneIcon(currentZone.color)}>{SVG.home}</span>
              <span>{currentZone.name}</span>
              {playerInfo.level < currentZone.rec && (
                <span style={styles.zoneWarning}>
                  <span style={{ width: 14, height: 14 }}>{SVG.warning}</span>
                  Lv {currentZone.rec}+
                </span>
              )}
            </div>
          )}

          {/* Zone Indicator - Mobile (Compact) */}
          {settings.showZoneNames && isMobile && (
            <div style={styles.mobileZoneIndicator}>
              <span style={{ ...styles.zoneIcon(currentZone.color), width: 14, height: 14 }}>{SVG.home}</span>
              <span>{currentZone.name}</span>
            </div>
          )}

          {/* Volume Control - Desktop only */}
          {!isMobile && (
            <div style={styles.volumeControl}>
              <button
                style={styles.volumeBtn}
                onClick={() => setSettings(s => ({ ...s, sfxEnabled: !s.sfxEnabled }))}
              >
                <span style={styles.volumeIcon}>
                  {settings.sfxEnabled ? SVG.volume : SVG.volumeMute}
                </span>
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume * 100}
                onChange={(e) => setSettings(s => ({ ...s, volume: e.target.value / 100 }))}
                style={styles.volumeSlider}
              />
            </div>
          )}

          {/* Controls Hint - Desktop only */}
          {!isMobile && (
            <div style={styles.controlsHint}>
              WASD move • SPACE dash • Q ultimate
            </div>
          )}

          {/* Mobile Touch Controls */}
          {isMobile && (
            <div style={styles.touchControls}>
              {/* Virtual Joystick */}
              <div
                style={styles.joystickArea}
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
                onTouchCancel={handleJoystickEnd}
              >
                <div style={styles.joystickBase} ref={joystickBaseRef}>
                  <div style={styles.joystickKnob} ref={joystickKnobRef} />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionButtons}>
                <button
                  style={styles.actionButton('#ff6b35')}
                  onTouchStart={(e) => { e.preventDefault(); handleUltimateButton(); }}
                >
                  <span style={styles.actionButtonIcon}>{SVG.warning}</span>
                </button>
                <button
                  style={styles.actionButton('#4ecdc4')}
                  onTouchStart={(e) => { e.preventDefault(); handleDashButton(); }}
                >
                  <span style={styles.actionButtonIcon}>{SVG.dash}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* In-Game Skin Selector Modal */}
      {showSkinSelect && screen === 'game' && (
        <>
          <div style={styles.modalBackdrop} onClick={() => setShowSkinSelect(false)} />
          <div style={styles.modal}>
            <button style={styles.modalClose} onClick={() => setShowSkinSelect(false)}>×</button>
            <h3 style={styles.modalTitle}>
              <span style={{ width: 24, height: 24, color: '#ffd93d' }}>{SVG.star}</span>
              Select Skin
            </h3>
            <div style={styles.skinGrid}>
              {DEFAULT_SKINS.filter(s => s.class === playerInfo?.class).map(skin => {
                const isSelected = playerInfo?.selectedSkin === skin.id;
                const isUnlocked = (playerInfo?.totalXp || 0) >= skin.requiredXp;
                return (
                  <div
                    key={skin.id}
                    style={{
                      ...styles.skinOption(isSelected, skin.color, !isUnlocked),
                      width: 70,
                      height: 70,
                      flexDirection: 'column',
                      padding: 5,
                    }}
                    onClick={() => isUnlocked && handleChangeSkin(skin.id)}
                  >
                    <div style={{ ...styles.skinOptionInner(skin.color), width: 36, height: 36 }} />
                    <span style={{ fontSize: '.6rem', color: '#888', marginTop: 4 }}>{skin.name}</span>
                    {!isUnlocked && (
                      <div style={styles.skinLock}>🔒</div>
                    )}
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: '.75rem', color: '#666', marginTop: 15, textAlign: 'center' }}>
              {playerInfo?.totalXp || 0} XP earned • Unlock more by playing!
            </p>
          </div>
        </>
      )}

      {/* Level Up Popup - Non-blocking notification */}
      {levelUp && (
        <div style={styles.levelUpPopup}>
          <span style={{ color: '#ffd93d', display: 'flex', alignItems: 'center', gap: 8, fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 600 }}>
            <span style={{ width: 20, height: 20 }}>{SVG.star}</span>
            Level {levelUp}!
          </span>
        </div>
      )}

      {/* Connection Status */}
      <div style={styles.connection(connected)}>
        <span style={styles.connDot} />
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  );
}