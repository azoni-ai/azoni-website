import React, { useEffect, useRef, useState, useMemo } from 'react';
import { io } from 'socket.io-client';

// Local imports
import { SVG, CLASS_SVG } from './constants/icons';
import { COLORS, DEFAULT_CLASSES, DEFAULT_SKINS, SERVER_URL } from './constants/config';
import { WORLD_WIDTH, WORLD_HEIGHT, ZONE_POLYGONS, ZONE_INFO, PORTAL_POSITIONS, BUILDING_DATA, pointInPolygon, getZoneAtPosition } from './constants/zones';
// Note: hooks/useAudio.js is available for future refactoring
import { createStyles } from './styles';

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
  const settingsRef = useRef({ volume: 0.5, sfxEnabled: true, musicEnabled: true, musicVolume: 0.3, showZoneNames: true, showMinimap: true });

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
  const [spellDrop, setSpellDrop] = useState(null);
  const [bossAlert, setBossAlert] = useState(null);
  const [showSkinSelect, setShowSkinSelect] = useState(false);
  const [nearbyBuilding, setNearbyBuilding] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);
  const [settings, setSettings] = useState({
    volume: 0.5,
    sfxEnabled: true,
    musicEnabled: true,
    musicVolume: 0.3,
    showZoneNames: true,
    showMinimap: true,
  });
  const [currentZone, setCurrentZone] = useState({
    name: 'Sanctuary',
    color: '#22c55e',
    rec: 0,
  });
  const [dashCooldown, setDashCooldown] = useState(0); // timestamp when ready
  const [ultCooldown, setUltCooldown] = useState(0);   // timestamp when ready
  // eslint-disable-next-line no-unused-vars
  const [recallCooldown, setRecallCooldown] = useState(0); // timestamp when ready
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [adminKey, setAdminKey] = useState('');
  const chatContainerRef = useRef(null);
  const dashCooldownRef = useRef(0);
  const ultCooldownRef = useRef(0);
  const recallCooldownRef = useRef(0);
  const lastZoneRef = useRef(null);
  const musicIntervalRef = useRef(null);
  const musicGainRef = useRef(null);
  const ability1CooldownRef = useRef(0);
  const ability2CooldownRef = useRef(0);
  const ability3CooldownRef = useRef(0);
  const [abilityCooldowns, setAbilityCooldowns] = useState({ 1: 0, 2: 0, 3: 0 });

  // Mobile detection and touch state
  const [isMobile, setIsMobile] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [playersOnline, setPlayersOnline] = useState(0);
  const [autoAttack, setAutoAttack] = useState(true);
  const [pvpEnabled, setPvpEnabled] = useState(false); // Voidlord PvP toggle - OFF by default
  // eslint-disable-next-line no-unused-vars
  const [invincible, setInvincible] = useState(false); // Admin invincibility toggle
  const [questComplete, setQuestComplete] = useState(null);
  const [showQuest, setShowQuest] = useState(false);
  const [npcDialogue, setNpcDialogue] = useState(null); // Current NPC dialogue
  const [nearbyNpc, setNearbyNpc] = useState(null); // NPC player can interact with
  const [inDungeon, setInDungeon] = useState(false); // In dungeon mode
  const [dungeonVictoryPortal, setDungeonVictoryPortal] = useState(null); // Portal after dragon death
  // eslint-disable-next-line no-unused-vars
  const [dungeonProgress, setDungeonProgress] = useState(0);
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

  // Configure viewport for mobile (prevent zooming)
  useEffect(() => {
    // Set or update viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    
    // Prevent context menu on long press
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    return () => {
      document.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, []);

  // ===========================================
  // AUDIO SYSTEM (Mobile-compatible)
  // ===========================================
  const audioReadyRef = useRef(false);
  
  const initAudio = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      
      const ctx = audioCtxRef.current;
      
      // Always try to resume - must be called synchronously during user gesture
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          if (!audioReadyRef.current) {
            audioReadyRef.current = true;
            setAudioUnlocked(true);
            console.log('🔊 Audio unlocked (resume promise)');
          }
        }).catch(e => console.log('Resume error:', e));
      }
      
      // Check if already running
      if (ctx.state === 'running' && !audioReadyRef.current) {
        audioReadyRef.current = true;
        setAudioUnlocked(true);
        console.log('🔊 Audio unlocked');
      }
    } catch (e) {
      console.log('Audio init error:', e);
    }
  };
  
  // Also add a statechange listener to detect when audio becomes available
  useEffect(() => {
    const unlock = () => initAudio();
    const events = ['touchstart', 'touchend', 'mousedown', 'click', 'keydown'];
    events.forEach(ev => document.addEventListener(ev, unlock, { passive: true, capture: true }));
    
    // Poll for audio context state changes
    const checkAudio = setInterval(() => {
      if (audioCtxRef.current?.state === 'running' && !audioReadyRef.current) {
        audioReadyRef.current = true;
        setAudioUnlocked(true);
        console.log('🔊 Audio ready (poll)');
      }
    }, 500);
    
    return () => {
      events.forEach(ev => document.removeEventListener(ev, unlock, { capture: true }));
      clearInterval(checkAudio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playSound = (type) => {
    const s = settingsRef.current;
    if (!s.sfxEnabled || s.volume === 0) return;
    
    let ctx = audioCtxRef.current;
    if (!ctx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        ctx = new AudioContext();
        audioCtxRef.current = ctx;
      } catch (e) { return; }
    }
    
    // Try to resume, but don't wait - attempt to play regardless
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // Try to play even if state isn't 'running' yet
    // iOS sometimes allows queued sounds

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      const vol = s.volume * 0.25;

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
        itemDrop: () => {
          // Magical chime for item drops
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.setValueAtTime(800, now + 0.1);
          osc.frequency.setValueAtTime(1000, now + 0.2);
          osc.frequency.setValueAtTime(1200, now + 0.3);
          gain.gain.setValueAtTime(vol * 0.8, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
        },
        portalEnter: () => {
          // Whoosh/warp sound for portal
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
          gain.gain.setValueAtTime(vol * 0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
        },
        ability: () => {
          // Magical ability activation
          osc.type = 'sine';
          osc.frequency.setValueAtTime(500, now);
          osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
          gain.gain.setValueAtTime(vol * 0.8, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
        },
        lightning: () => {
          // Electric zap
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(2000, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
          gain.gain.setValueAtTime(vol * 1.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        },
        meteor: () => {
          // Deep explosion
          osc.type = 'square';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
          gain.gain.setValueAtTime(vol * 1.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
          osc.start(now);
          osc.stop(now + 0.6);
        },
      };

      if (sounds[type]) sounds[type]();
    } catch (e) {
      // Ignore audio errors
    }
  };


  const updateZone = (me) => {
    if (!me) return;
    const zoneName = getZoneAtPosition(me.x, me.y);
    
    setCurrentZone(ZONE_INFO[zoneName] || ZONE_INFO.sanctuary);
    
    // Start zone music if zone changed
    if (zoneName !== lastZoneRef.current) {
      lastZoneRef.current = zoneName;
      startZoneMusic(zoneName);
    }
  };

  // ===========================================
  // ZONE MUSIC SYSTEM - Procedural Ambient
  // ===========================================
  const ZONE_MUSIC_CONFIG = {
    sanctuary: {
      baseFreq: 220,
      scale: [0, 4, 7, 12, 16], // Major pentatonic
      tempo: 0.4,
      waveType: 'sine',
      volume: 0.12,
    },
    meadow: {
      baseFreq: 262,
      scale: [0, 2, 4, 7, 9], // Major pentatonic  
      tempo: 0.6,
      waveType: 'sine',
      volume: 0.1,
    },
    forest: {
      baseFreq: 196,
      scale: [0, 3, 5, 7, 10], // Minor pentatonic
      tempo: 0.5,
      waveType: 'triangle',
      volume: 0.1,
    },
    volcanic: {
      baseFreq: 110,
      scale: [0, 1, 4, 5, 7], // Phrygian-ish
      tempo: 0.8,
      waveType: 'sawtooth',
      volume: 0.08,
    },
    frozen: {
      baseFreq: 330,
      scale: [0, 2, 3, 7, 8], // Minor with flat 6
      tempo: 0.35,
      waveType: 'sine',
      volume: 0.1,
    },
    abyss: {
      baseFreq: 82,
      scale: [0, 1, 3, 6, 7], // Locrian-ish (dark)
      tempo: 0.25,
      waveType: 'sawtooth',
      volume: 0.06,
    },
    crystal_caves: {
      baseFreq: 440,
      scale: [0, 4, 7, 11, 12], // Major 7th arpeggio
      tempo: 0.5,
      waveType: 'sine',
      volume: 0.08,
    },
  };

  const startZoneMusic = (zoneId) => {
    // Stop existing music
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
    
    if (!settingsRef.current?.musicEnabled) return;
    
    const musicConfig = ZONE_MUSIC_CONFIG[zoneId];
    if (!musicConfig) return;
    
    let ctx = audioCtxRef.current;
    if (!ctx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        ctx = new AudioContext();
        audioCtxRef.current = ctx;
      } catch (e) { return; }
    }
    
    if (ctx.state === 'suspended') ctx.resume();
    if (ctx.state !== 'running') return;
    
    // Create master gain for music
    if (!musicGainRef.current) {
      musicGainRef.current = ctx.createGain();
      musicGainRef.current.connect(ctx.destination);
    }
    musicGainRef.current.gain.setValueAtTime(
      musicConfig.volume * (settingsRef.current?.musicVolume || 0.3),
      ctx.currentTime
    );
    
    let noteIndex = 0;
    
    const playNote = () => {
      if (!audioCtxRef.current || audioCtxRef.current.state !== 'running') return;
      if (!settingsRef.current?.musicEnabled) return;
      
      try {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        
        osc.connect(noteGain);
        noteGain.connect(musicGainRef.current);
        
        // Pick a note from the scale with some randomness
        const scaleNote = musicConfig.scale[noteIndex % musicConfig.scale.length];
        const freq = musicConfig.baseFreq * Math.pow(2, scaleNote / 12);
        
        // Occasional octave shifts
        const octaveShift = Math.random() < 0.15 ? (Math.random() < 0.5 ? 2 : 0.5) : 1;
        
        osc.type = musicConfig.waveType;
        osc.frequency.setValueAtTime(freq * octaveShift, ctx.currentTime);
        
        const now = ctx.currentTime;
        const noteDuration = 1 / musicConfig.tempo;
        
        // Gentle envelope
        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.5, now + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration * 0.9);
        
        osc.start(now);
        osc.stop(now + noteDuration);
        
        noteIndex++;
        
        // Skip notes sometimes for rhythm variation
        if (Math.random() < 0.25) noteIndex++;
      } catch (e) {
        // Ignore music errors
      }
    };
    
    // Start playing
    const intervalMs = 1000 / musicConfig.tempo;
    musicIntervalRef.current = setInterval(playNote, intervalMs);
    
    // Play first note after short delay
    setTimeout(playNote, 100);
  };

  // Stop music on unmount
  useEffect(() => {
    return () => {
      if (musicIntervalRef.current) {
        clearInterval(musicIntervalRef.current);
      }
    };
  }, []);

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
    
    // Handle tab visibility changes - reconnect when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!socket.connected && playerIdRef.current) {
          console.log('Tab visible, reconnecting...');
          socket.connect();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Heartbeat to keep connection alive (every 30 seconds)
    const heartbeatInterval = setInterval(() => {
      if (socket.connected && playerIdRef.current) {
        socket.emit('heartbeat');
      }
    }, 30000);

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
      
      // Reset input state on join to prevent stuck movement
      inputRef.current = { up: false, down: false, left: false, right: false };
      socket.emit('input', inputRef.current);
    });

    socket.on('gameState', (state) => {
      // Store state directly - no interpolation (was causing freeze on teleport)
      gameStateRef.current = { ...gameStateRef.current, ...state };
      
      // Update players online count
      if (state.players) {
        setPlayersOnline(state.players.length);
      }
      
      const me = state.players?.find(p => p.id === playerIdRef.current);
      if (me) {
        playerDataRef.current = me;
        setPlayerInfo(prev => ({ ...prev, ...me }));
        updateZone(me);
        
        // Sync dungeon state from server
        if (me.inDungeon !== inDungeon) {
          setInDungeon(me.inDungeon || false);
        }
        
        // Check for nearby buildings (skip in dungeon)
        let foundBuilding = null;
        for (const [id, building] of Object.entries(BUILDING_DATA)) {
          const dx = me.x - building.x;
          const dy = me.y - (building.y - building.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            foundBuilding = { id, ...building };
            break;
          }
        }
        setNearbyBuilding(foundBuilding);
        
        // Check for nearby NPCs
        let foundNpc = null;
        if (state.npcs) {
          for (const npc of state.npcs) {
            const dx = me.x - npc.x;
            const dy = me.y - npc.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (npc.interactRange || 80)) {
              foundNpc = npc;
              break;
            }
          }
        }
        setNearbyNpc(foundNpc);
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
      // Play sounds from server with distance attenuation
      if (data.x !== undefined && data.y !== undefined) {
        const me = playerDataRef.current;
        if (me) {
          const dx = data.x - me.x;
          const dy = data.y - me.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Only play if within hearing range (600 units)
          if (dist < 600) {
            playSound(data.type);
          }
        }
      } else {
        // No position - play regardless
        playSound(data.type);
      }
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
      
      // Only shake screen if explosion is near the player
      const me = playerDataRef.current;
      if (me) {
        const dx = data.x - me.x;
        const dy = data.y - me.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxShakeDist = 400; // Only shake within this range
        
        if (dist < maxShakeDist) {
          // Scale shake intensity by distance (closer = stronger)
          const intensity = Math.max(2, 12 * (1 - dist / maxShakeDist));
          screenShakeRef.current.intensity = intensity;
          playSound('meteor');
        }
      }
    });

    // Freeze effect from spell upgrades
    socket.on('freeze', (data) => {
      effectsRef.current.push({
        type: 'freezeBurst',
        x: data.x,
        y: data.y,
        startTime: Date.now(),
        duration: 600,
      });
      
      const me = playerDataRef.current;
      if (me) {
        const dist = Math.sqrt((data.x - me.x) ** 2 + (data.y - me.y) ** 2);
        if (dist < 400) {
          playSound('iceNova');
        }
      }
    });

    // Empowered hit effect (Mana Surge, etc.)
    socket.on('empoweredHit', (data) => {
      effectsRef.current.push({
        type: 'empowered',
        x: data.x,
        y: data.y,
        upgradeType: data.type,
        startTime: Date.now(),
        duration: 400,
      });
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
      
      // Only play sound if near player
      const me = playerDataRef.current;
      if (me) {
        const dx = data.x - me.x;
        const dy = data.y - me.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 500) {
          playSound('iceNova');
        }
      }
    });

    socket.on('voidRift', (data) => {
      effectsRef.current.push({
        type: 'voidRift',
        x: data.x,
        y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: data.duration,
        playerId: data.playerId,
      });
      
      // Sound effect
      const me = playerDataRef.current;
      if (me) {
        const dx = data.x - me.x;
        const dy = data.y - me.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 600) {
          playSound('portalEnter');
        }
      }
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

    // Dragon attack effects
    socket.on('dragonBreath', (data) => {
      effectsRef.current.push({
        type: 'dragonBreath',
        x: data.x,
        y: data.y,
        angle: data.angle,
        range: data.range,
        color: data.color || '#f97316',
        startTime: Date.now(),
        duration: 800,
      });
      playSound('bossAttack');
    });

    socket.on('dragonWingGust', (data) => {
      effectsRef.current.push({
        type: 'dragonWingGust',
        x: data.x,
        y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: 600,
      });
      playSound('dash');
    });

    socket.on('dragonTailSwipe', (data) => {
      effectsRef.current.push({
        type: 'dragonTailSwipe',
        x: data.x,
        y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: 400,
      });
      playSound('hit');
    });

    socket.on('dragonRage', (data) => {
      effectsRef.current.push({
        type: 'dragonRage',
        x: data.x,
        y: data.y,
        startTime: Date.now(),
        duration: 1500,
      });
      playSound('bossAttack');
      // Screen shake for rage mode
      screenShakeRef.current = { intensity: 15, duration: 1000, startTime: Date.now() };
    });
    
    // Dragon defeated - victory portal spawns
    socket.on('dragonDefeated', (data) => {
      console.log('🐉 DRAGON DEFEATED! Victory portal spawning...');
      effectsRef.current.push({
        type: 'dragonDeath',
        x: data.x,
        y: data.y,
        killerName: data.killerName,
        startTime: Date.now(),
        duration: 5000,
      });
      // Massive screen shake
      screenShakeRef.current = { intensity: 30, duration: 2000, startTime: Date.now() };
      playSound('bossExplosion');
      // Store victory portal location
      setDungeonVictoryPortal({ x: data.x, y: data.y - 100, active: true });
    });
    
    socket.on('dragonSlayerReward', (data) => {
      console.log(`🏆 Dragonslayer reward: ${data.xp} XP, Title: ${data.title}`);
      // Could show a special UI here
    });
    
    // Mini-boss events
    socket.on('minotaurCharge', (data) => {
      effectsRef.current.push({
        type: 'minotaurCharge',
        id: data.id,
        x: data.x,
        y: data.y,
        targetX: data.targetX,
        targetY: data.targetY,
        startTime: Date.now(),
        duration: 2000,
      });
      playSound('charge');
    });
    
    socket.on('minotaurChargeEnd', (data) => {
      effectsRef.current.push({
        type: 'minotaurImpact',
        x: data.x,
        y: data.y,
        startTime: Date.now(),
        duration: 500,
      });
    });
    
    socket.on('lichSummon', (data) => {
      effectsRef.current.push({
        type: 'lichSummon',
        x: data.x,
        y: data.y,
        startTime: Date.now(),
        duration: 1000,
      });
      playSound('summon');
    });
    
    socket.on('lichDeathWave', (data) => {
      effectsRef.current.push({
        type: 'lichDeathWave',
        x: data.x,
        y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: 800,
      });
    });

    socket.on('bossSpawn', (data) => {
      playSound('bossSpawn');
      console.log(`👑 Boss spawned: ${data?.name} in ${data?.zone}`);
      
      // Show boss spawn notification
      const bossNames = {
        blossom_behemoth: { name: 'Blossom Behemoth', emoji: '🌸', color: '#ec4899' },
        ancient_treant: { name: 'Ancient Treant', emoji: '🌳', color: '#166534' },
        magma_titan: { name: 'Magma Titan', emoji: '🌋', color: '#dc2626' },
        frost_wyrm: { name: 'Frost Wyrm', emoji: '❄️', color: '#22d3ee' },
        void_overlord: { name: 'Void Overlord', emoji: '🌀', color: '#7c3aed' },
        crystal_golem: { name: 'Crystal Golem', emoji: '💎', color: '#ec4899' },
      };
      
      const boss = bossNames[data?.bossType] || { name: data?.name || 'Unknown Boss', emoji: '👑', color: '#fbbf24' };
      setBossAlert({
        ...boss,
        zone: data?.zone,
        timestamp: Date.now(),
      });
      
      // Auto-hide after 4 seconds
      setTimeout(() => setBossAlert(null), 4000);
    });

    socket.on('bossDefeated', (data) => {
      console.log(`💀 Boss defeated: ${data?.name}! Respawns in 30 seconds.`);
      
      // Epic boss death animation
      if (data.x !== undefined && data.y !== undefined) {
        // Main explosion
        effectsRef.current.push({
          type: 'bossExplosion',
          x: data.x,
          y: data.y,
          bossType: data.bossType,
          startTime: Date.now(),
          duration: 2000,
        });
        
        // Screen shake if nearby
        const me = playerDataRef.current;
        if (me) {
          const dx = data.x - me.x;
          const dy = data.y - me.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 600) {
            screenShakeRef.current.intensity = Math.max(8, 20 * (1 - dist / 600));
          }
        }
        
        // Play epic sound
        playSound('bossAttack');
        setTimeout(() => playSound('levelUp'), 300);
      }
    });

    socket.on('questComplete', (data) => {
      console.log(`🏆 Quest complete: ${data.quest}! Reward: ${data.reward}`);
      setQuestComplete(data);
      playSound('levelUp');
      setTimeout(() => playSound('levelUp'), 200);
      setTimeout(() => playSound('levelUp'), 400);
      // Auto-hide after 8 seconds
      setTimeout(() => setQuestComplete(null), 8000);
    });

    socket.on('respawned', () => {
      setScreen('game');
      // Reset input state on respawn
      inputRef.current = { up: false, down: false, left: false, right: false };
      socket.emit('input', inputRef.current);
    });

    socket.on('skinChanged', (data) => {
      if (playerInfo) {
        setPlayerInfo(prev => ({ ...prev, selectedSkin: data.skinId }));
      }
    });

    socket.on('autoAttackToggled', (data) => {
      setAutoAttack(data.enabled);
      console.log(`⚔️ Auto-attack ${data.enabled ? 'enabled' : 'disabled'}`);
    });

    socket.on('pvpToggled', (data) => {
      setPvpEnabled(data.enabled);
      console.log(`🎯 PvP ${data.enabled ? 'enabled' : 'disabled'}`);
    });
    
    socket.on('invincibleToggled', (data) => {
      setInvincible(data.enabled);
      console.log(`✨ Invincibility ${data.enabled ? 'ENABLED' : 'disabled'}`);
    });

    // Class Ability events
    socket.on('abilityActivated', (data) => {
      const slot = data.slot;
      const cooldownEnd = Date.now() + data.cooldown;
      if (slot === 1) ability1CooldownRef.current = cooldownEnd;
      if (slot === 2) ability2CooldownRef.current = cooldownEnd;
      if (slot === 3) ability3CooldownRef.current = cooldownEnd;
      setAbilityCooldowns(prev => ({ ...prev, [slot]: cooldownEnd }));
      playSound('ability');
    });
    
    socket.on('abilityError', (data) => {
      console.log('❌ Ability Error:', data.message);
    });
    
    socket.on('abilityCooldown', (data) => {
      console.log(`⏳ Ability ${data.slot} on cooldown: ${Math.ceil(data.remaining / 1000)}s`);
    });
    
    // Ability visual effects
    socket.on('flameShieldStart', (data) => {
      effectsRef.current.push({
        type: 'flameShield',
        x: data.x, y: data.y,
        playerId: data.playerId,
        startTime: Date.now(),
        duration: data.duration,
      });
    });
    
    socket.on('frostNova', (data) => {
      effectsRef.current.push({
        type: 'frostNova',
        x: data.x, y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: 1000,
      });
      playSound('iceNova');
    });
    
    socket.on('glacialStorm', (data) => {
      effectsRef.current.push({
        type: 'glacialStorm',
        x: data.x, y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: data.duration,
      });
      playSound('iceNova');
    });
    
    socket.on('blink', (data) => {
      effectsRef.current.push({
        type: 'blink',
        fromX: data.fromX, fromY: data.fromY,
        toX: data.toX, toY: data.toY,
        startTime: Date.now(),
        duration: 500,
      });
      playSound('dash');
    });
    
    socket.on('inferno', (data) => {
      effectsRef.current.push({
        type: 'inferno',
        x: data.x, y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: 1500,
      });
      screenShakeRef.current = { x: 0, y: 0, intensity: 15 };
      playSound('meteor');
    });
    
    socket.on('staticField', (data) => {
      effectsRef.current.push({
        type: 'staticField',
        x: data.x, y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: 800,
      });
      playSound('lightning');
    });
    
    socket.on('timeWarp', (data) => {
      effectsRef.current.push({
        type: 'timeWarp',
        playerId: data.playerId,
        startTime: Date.now(),
        duration: data.duration,
      });
    });
    
    socket.on('thunderGod', (data) => {
      effectsRef.current.push({
        type: 'thunderGod',
        x: data.x, y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: 2000,
      });
      screenShakeRef.current = { x: 0, y: 0, intensity: 20 };
      playSound('lightning');
    });
    
    socket.on('lightningBolt', (data) => {
      effectsRef.current.push({
        type: 'lightningBolt',
        fromX: data.fromX, fromY: data.fromY,
        toX: data.toX, toY: data.toY,
        startTime: Date.now(),
        duration: 300,
      });
    });

    socket.on('apocalypse', (data) => {
      effectsRef.current.push({
        type: 'apocalypse',
        x: data.x, y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: 2000,
      });
      screenShakeRef.current = { x: 0, y: 0, intensity: 25 };
      playSound('meteor');
    });

    // NPC Dialogue
    socket.on('npcDialogue', (data) => {
      console.log('🗣️ NPC Dialogue:', data);
      setNpcDialogue(data);
    });

    socket.on('npcError', (data) => {
      console.log('❌ NPC Error:', data.message);
    });

    // Dungeon events
    socket.on('enteredDungeon', (data) => {
      console.log('⚔️ Entered dungeon!', data);
      setInDungeon(true);
      setDungeonProgress(0);
      playSound('portalEnter');
    });

    socket.on('exitedDungeon', (data) => {
      console.log('🏠 Exited dungeon');
      setInDungeon(false);
      setDungeonProgress(0);
      playSound('portalEnter');
    });

    socket.on('dungeonWarning', (data) => {
      console.log('⚠️ Dungeon warning:', data.message);
    });

    // Spell drops from boss kills
    socket.on('spellDrops', (data) => {
      console.log('✨ Spell drops received:', data);
      if (data.items && data.items.length > 0) {
        setSpellDrop({
          bossName: data.bossName,
          items: data.items,
          timestamp: Date.now(),
        });
        playSound('itemDrop');
      }
    });

    // Portal teleportation
    socket.on('portalUsed', (data) => {
      console.log('🌀 Portal used:', data);
      playSound('portalEnter');
      
      // Add teleport effect
      effectsRef.current.push({
        type: 'teleport',
        x: data.fromX,
        y: data.fromY,
        color: data.color,
        entering: false,
        startTime: Date.now(),
        duration: 500,
      });
      effectsRef.current.push({
        type: 'teleport',
        x: data.toX,
        y: data.toY,
        color: data.color,
        entering: true,
        startTime: Date.now() + 200,
        duration: 500,
      });
    });

    socket.on('recalled', (data) => {
      console.log('🏠 Recalled to Sanctuary');
      playSound('portalEnter');
      
      // Set recall cooldown
      if (data.cooldown) {
        const endTime = Date.now() + data.cooldown;
        recallCooldownRef.current = endTime;
        setRecallCooldown(endTime);
        setTimeout(() => setRecallCooldown(0), data.cooldown);
      }
      
      // Departure effect (swirl out)
      if (data.fromX !== undefined) {
        effectsRef.current.push({
          type: 'recallDepart',
          x: data.fromX,
          y: data.fromY,
          startTime: Date.now(),
          duration: 600,
        });
      }
      
      // Arrival effect (swirl in)
      effectsRef.current.push({
        type: 'recallArrive',
        x: data.toX || 3000,
        y: data.toY || 2500,
        startTime: Date.now() + 100,
        duration: 800,
      });
    });

    socket.on('recallCooldown', (data) => {
      console.log(`⏳ Recall on cooldown: ${data.remaining}s`);
      // Could show a toast notification
    });

    socket.on('recallEffect', (data) => {
      // Other player recalled - show departure effect
      if (data.playerId !== playerIdRef.current) {
        effectsRef.current.push({
          type: 'recallDepart',
          x: data.x,
          y: data.y,
          startTime: Date.now(),
          duration: 600,
        });
      }
    });

    socket.on('portalError', (data) => {
      console.log('Portal error:', data.message);
      // Could show a toast notification here
    });

    // Ability cooldowns - refs for display, state triggers re-render once
    socket.on('dashUsed', (data) => {
      const endTime = Date.now() + data.cooldown;
      dashCooldownRef.current = endTime;
      setDashCooldown(endTime);
      setTimeout(() => setDashCooldown(0), data.cooldown);
    });

    socket.on('ultimateUsed', (data) => {
      const endTime = Date.now() + data.cooldown;
      ultCooldownRef.current = endTime;
      setUltCooldown(endTime);
      setTimeout(() => setUltCooldown(0), data.cooldown);
    });

    // Shop upgrades
    socket.on('upgradePurchased', (data) => {
      console.log('✨ Upgrade purchased:', data.type);
      setPlayerInfo(prev => ({ ...prev, totalXp: data.totalXp, upgrades: data.upgrades }));
      playSound('levelUp');
    });

    socket.on('shopError', (data) => {
      console.log('Shop error:', data.message);
    });

    // Chat messages
    socket.on('chatMessage', (msg) => {
      setChatMessages(prev => {
        const updated = [...prev, msg];
        if (updated.length > 50) updated.shift();
        return updated;
      });
      // Auto-scroll chat
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 50);
    });

    socket.on('chatHistory', (history) => {
      setChatMessages(history || []);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
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

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      initAudio();
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      // Nothing needed - WASD only movement
    };

    const handleKeyDown = (e) => {
      // Ignore input if typing in chat or any text field
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      // Only process WASD and special keys
      const dir = keyMap[e.code];
      
      if (dir) {
        // Update input immediately
        if (!inputRef.current[dir]) {
          inputRef.current[dir] = true;
          socketRef.current?.emit('input', inputRef.current);
        }
        return;
      }

      // Dash (Space) - dashes in current facing/movement direction
      if (e.code === 'Space' && socketRef.current && playerIdRef.current) {
        e.preventDefault();
        initAudio();
        // Send dash without target - server will use facing direction
        socketRef.current.emit('dash', {});
        playSound('dash');
      }

      // Ultimate (Q) - targets mouse position
      if (e.code === 'KeyQ' && socketRef.current && playerIdRef.current) {
        initAudio();
        const zoom = zoomRef.current || 1;
        socketRef.current.emit('ultimate', {
          targetX: (mouseRef.current.x / zoom) + cameraRef.current.x,
          targetY: (mouseRef.current.y / zoom) + cameraRef.current.y,
        });
      }

      // Interact (E) - NPC dialogue, shop, or dungeon exit
      if (e.code === 'KeyE') {
        // Close dialogue if open
        if (npcDialogue) {
          setNpcDialogue(null);
          return;
        }
        
        // Check for dungeon exit first
        if (inDungeon) {
          const me = playerDataRef.current;
          if (me && me.y < 250) {
            // Near entrance exit portal
            socketRef.current?.emit('exitDungeon');
            return;
          }
          
          // Check for victory portal (after dragon defeat)
          if (me && dungeonVictoryPortal && dungeonVictoryPortal.active) {
            const dx = me.x - dungeonVictoryPortal.x;
            const dy = me.y - dungeonVictoryPortal.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              // Use victory portal
              socketRef.current?.emit('exitDungeon');
              setDungeonVictoryPortal(null); // Clear the portal
              return;
            }
          }
        }
        
        // Check for nearby NPC first
        const npcs = gameStateRef.current.npcs || [];
        const me = playerDataRef.current;
        if (me && npcs.length > 0) {
          for (const npc of npcs) {
            const dx = me.x - npc.x;
            const dy = me.y - npc.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (npc.interactRange || 80)) {
              socketRef.current?.emit('interactNpc', { npcId: npc.id });
              return;
            }
          }
        }
        
        // Otherwise toggle shop
        setShowShop(prev => !prev);
      }

      // Emote wheel (T)
      if (e.code === 'KeyT') {
        setShowEmotes(prev => !prev);
      }

      // Toggle Auto-Attack (X)
      if (e.code === 'KeyX' && socketRef.current && playerIdRef.current) {
        socketRef.current.emit('toggleAutoAttack');
      }

      // Toggle PvP (Z) - Voidlord only
      if (e.code === 'KeyZ' && socketRef.current && playerIdRef.current) {
        socketRef.current.emit('togglePvP');
      }
      
      // Toggle Invincibility (I) - Admin Voidlord only
      if (e.code === 'KeyI' && socketRef.current && playerIdRef.current && adminKey === 'azoni-voidlord-2026') {
        socketRef.current.emit('toggleInvincible');
      }

      // Class Abilities (1, 2, 3)
      if ((e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') && socketRef.current && playerIdRef.current) {
        const slot = parseInt(e.code.replace('Digit', ''));
        const me = playerDataRef.current;
        const levelReqs = { 1: 10, 2: 20, 3: 30 };
        
        if (me && me.level >= levelReqs[slot]) {
          // Get mouse position for targeted abilities
          const canvas = canvasRef.current;
          const cx = (me.x || 0) - (canvas?.width || 800) / 2;
          const cy = (me.y || 0) - (canvas?.height || 600) / 2;
          const targetX = mouseRef.current ? cx + mouseRef.current.x : me.x;
          const targetY = mouseRef.current ? cy + mouseRef.current.y : me.y;
          
          socketRef.current.emit('classAbility', { abilitySlot: slot, targetX, targetY });
        }
      }

      // ESC - prompt for main menu (modals close via backdrop click)
      if (e.code === 'Escape' && playerIdRef.current) {
        // Close any open modals first
        setShowEmotes(false);
        setShowShop(false);
        setShowSkinSelect(false);
        
        // Prompt for main menu
        setTimeout(() => {
          if (window.confirm('Return to main menu? Your progress is saved.')) {
            const player = playerDataRef.current;
            if (player) {
              setSavedPlayer({
                ...player,
                rank: player.rank || { title: 'Novice' },
              });
            }
            setScreen('returning');
          }
        }, 50);
      }
    };

    const handleKeyUp = (e) => {
      // Ignore if typing in chat
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      const dir = keyMap[e.code];
      if (dir && inputRef.current[dir]) {
        inputRef.current[dir] = false;
        socketRef.current?.emit('input', inputRef.current);
      }
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===========================================
  // TOUCH CONTROLS (Mobile)
  // ===========================================
  const handleJoystickStart = (e) => {
    e.preventDefault();
    initAudio();
    
    // Cancel any tap-to-move target when using joystick
    stopTouchMoveToTarget();
    
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
    
    // Dash in facing direction (server handles)
    socketRef.current.emit('dash', {});
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
  // TOUCH-TO-MOVE (Mobile - tap to walk to location)
  // ===========================================
  const touchTargetRef = useRef({ x: null, y: null, active: false });
  const touchMoveIntervalRef = useRef(null);

  const updateTouchMoveToTarget = () => {
    if (!touchTargetRef.current.active || !playerDataRef.current) return;
    
    const me = playerDataRef.current;
    const dx = touchTargetRef.current.x - me.x;
    const dy = touchTargetRef.current.y - me.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Reached target - stop
    if (dist < 25) {
      touchTargetRef.current.active = false;
      inputRef.current = { up: false, down: false, left: false, right: false };
      socketRef.current?.emit('input', inputRef.current);
      return;
    }
    
    // Calculate smooth direction
    const angle = Math.atan2(dy, dx);
    const newInput = { up: false, down: false, left: false, right: false };
    
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const thresh = 0.38;
    
    if (cosA > thresh) newInput.right = true;
    if (cosA < -thresh) newInput.left = true;
    if (sinA > thresh) newInput.down = true;
    if (sinA < -thresh) newInput.up = true;
    
    if (JSON.stringify(newInput) !== JSON.stringify(inputRef.current)) {
      inputRef.current = newInput;
      socketRef.current?.emit('input', inputRef.current);
    }
  };

  const startTouchMoveToTarget = () => {
    if (!touchMoveIntervalRef.current) {
      touchMoveIntervalRef.current = setInterval(updateTouchMoveToTarget, 50);
    }
    updateTouchMoveToTarget();
  };

  const stopTouchMoveToTarget = () => {
    touchTargetRef.current.active = false;
    if (touchMoveIntervalRef.current) {
      clearInterval(touchMoveIntervalRef.current);
      touchMoveIntervalRef.current = null;
    }
    inputRef.current = { up: false, down: false, left: false, right: false };
    socketRef.current?.emit('input', inputRef.current);
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
    
    initAudio();
    
    // Find a touch that's not in control areas
    for (const touch of e.changedTouches) {
      if (!isInControlArea(touch.clientX, touch.clientY)) {
        // Set target to tapped world position
        const zoom = zoomRef.current || 1;
        touchTargetRef.current.x = (touch.clientX / zoom) + cameraRef.current.x;
        touchTargetRef.current.y = (touch.clientY / zoom) + cameraRef.current.y;
        touchTargetRef.current.active = true;
        touchTargetRef.current.identifier = touch.identifier;
        
        startTouchMoveToTarget();
        break;
      }
    }
  };

  const handleScreenTouchMove = (e) => {
    if (!touchTargetRef.current.active) return;
    
    // Update target while dragging
    for (const touch of e.changedTouches) {
      if (touch.identifier === touchTargetRef.current.identifier) {
        const zoom = zoomRef.current || 1;
        touchTargetRef.current.x = (touch.clientX / zoom) + cameraRef.current.x;
        touchTargetRef.current.y = (touch.clientY / zoom) + cameraRef.current.y;
        break;
      }
    }
  };

  const handleScreenTouchEnd = (e) => {
    // Don't stop on touch end - wizard walks to target
    // Just clear the identifier so dragging doesn't update target
    for (const touch of e.changedTouches) {
      if (touch.identifier === touchTargetRef.current.identifier) {
        touchTargetRef.current.identifier = null;
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
        cam.x = lerp(cam.x, me.x - width / 2, 0.15);
        cam.y = lerp(cam.y, me.y - height / 2, 0.15);
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

      // PERFORMANCE: Zone cache for this frame (avoid repeated polygon tests)
      const zoneCache = new Map();
      const getZone = (wx, wy) => {
        // Round to tile grid for cache efficiency
        const cacheKey = `${Math.floor(wx / 64)},${Math.floor(wy / 64)}`;
        if (zoneCache.has(cacheKey)) return zoneCache.get(cacheKey);
        
        const priorityOrder = ['sanctuary', 'abyss', 'crystal_caves', 'forest', 'volcanic', 'frozen', 'meadow'];
        for (const zoneId of priorityOrder) {
          const polygon = ZONE_POLYGONS[zoneId];
          if (polygon && pointInPolygon(wx, wy, polygon)) {
            if (zoneId === 'meadow' && pointInPolygon(wx, wy, ZONE_POLYGONS.sanctuary)) continue;
            zoneCache.set(cacheKey, zoneId);
            return zoneId;
          }
        }
        zoneCache.set(cacheKey, 'meadow');
        return 'meadow';
      };

      // ========== DUNGEON RENDERING ==========
      if (inDungeon) {
        const time = Date.now() / 1000;
        
        // Dungeon layout constants
        const DUNGEON_WIDTH = 800;
        const CORRIDOR_MIN_X = 300;
        const CORRIDOR_MAX_X = 500;
        const ROOM_MIN_X = 150;
        const ROOM_MAX_X = 650;
        
        // Room definitions
        const ROOMS = [
          { name: 'Entrance Chamber', yStart: 0, yEnd: 400, theme: 'stone', minX: 200, maxX: 600 },
          { name: 'Skeleton Crypt', yStart: 600, yEnd: 1000, theme: 'bones', minX: 150, maxX: 650 },
          { name: 'Wraith Sanctum', yStart: 1200, yEnd: 1600, theme: 'haunted', minX: 150, maxX: 650 },
          { name: 'Golem Forge', yStart: 1800, yEnd: 2200, theme: 'rocky', minX: 150, maxX: 650 },
          { name: 'Demon Pit', yStart: 2400, yEnd: 2800, theme: 'infernal', minX: 150, maxX: 650 },
          { name: 'Dragon Lair', yStart: 2800, yEnd: 3200, theme: 'dragon', minX: 100, maxX: 700 },
        ];
        
        // Dark background
        ctx.fillStyle = '#0a0808';
        ctx.fillRect(0, 0, width, height);
        
        // Determine current area type
        const playerY = me?.y || 0;
        let currentTheme = 'corridor';
        let currentRoom = null;
        for (const room of ROOMS) {
          if (playerY >= room.yStart && playerY < room.yEnd) {
            currentTheme = room.theme;
            currentRoom = room;
            break;
          }
        }
        
        // Theme-specific colors
        const themeColors = {
          stone: { floor1: '#2a2520', floor2: '#1f1b18', wall: '#1a1515', accent: '#44403c' },
          bones: { floor1: '#252218', floor2: '#1a1815', wall: '#15120f', accent: '#a8a29e' },
          haunted: { floor1: '#1a1a25', floor2: '#121218', wall: '#0f0f18', accent: '#6366f1' },
          rocky: { floor1: '#252520', floor2: '#1a1a18', wall: '#1a1815', accent: '#78716c' },
          infernal: { floor1: '#2a1515', floor2: '#1f1010', wall: '#1a0a0a', accent: '#dc2626' },
          dragon: { floor1: '#2a1a0a', floor2: '#1f1505', wall: '#150a05', accent: '#f97316' },
          corridor: { floor1: '#1f1b18', floor2: '#181512', wall: '#121010', accent: '#3f3f46' },
        };
        
        const colors = themeColors[currentTheme] || themeColors.corridor;
        
        // Floor tiles
        const floorTileSize = 48;
        const floorStartX = Math.floor((cx - 200) / floorTileSize) * floorTileSize;
        const floorStartY = Math.floor(cy / floorTileSize) * floorTileSize;
        
        for (let x = floorStartX; x < cx + width + floorTileSize; x += floorTileSize) {
          for (let y = floorStartY; y < cy + height + floorTileSize; y += floorTileSize) {
            // Determine bounds at this y position
            let minX = CORRIDOR_MIN_X, maxX = CORRIDOR_MAX_X;
            for (const room of ROOMS) {
              if (y >= room.yStart && y < room.yEnd) {
                minX = room.minX;
                maxX = room.maxX;
                break;
              }
            }
            
            if (x < minX || x > maxX) continue;
            
            const screenX = x - cx;
            const screenY = y - cy;
            const isLight = ((x / floorTileSize) + (y / floorTileSize)) % 2 === 0;
            
            ctx.fillStyle = isLight ? colors.floor1 : colors.floor2;
            ctx.fillRect(screenX, screenY, floorTileSize, floorTileSize);
            
            // Tile cracks
            const crackSeed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            if ((crackSeed - Math.floor(crackSeed)) > 0.8) {
              ctx.strokeStyle = 'rgba(0,0,0,0.4)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(screenX + 8, screenY + 8);
              ctx.lineTo(screenX + 35, screenY + 38);
              ctx.stroke();
            }
          }
        }
        
        // Draw walls based on current area bounds
        for (let wy = Math.floor(cy / 60) * 60; wy < cy + height + 60; wy += 60) {
          let minX = CORRIDOR_MIN_X, maxX = CORRIDOR_MAX_X;
          for (const room of ROOMS) {
            if (wy >= room.yStart && wy < room.yEnd) {
              minX = room.minX;
              maxX = room.maxX;
              break;
            }
          }
          
          const blockY = wy - cy;
          
          // Left wall
          const leftWallX = minX - cx;
          ctx.fillStyle = colors.wall;
          ctx.fillRect(leftWallX - 100, blockY, 100, 60);
          ctx.strokeStyle = '#0a0808';
          ctx.lineWidth = 2;
          ctx.strokeRect(leftWallX - 100, blockY, 100, 60);
          
          // Right wall  
          const rightWallX = maxX - cx;
          ctx.fillStyle = colors.wall;
          ctx.fillRect(rightWallX, blockY, 100, 60);
          ctx.strokeStyle = '#0a0808';
          ctx.lineWidth = 2;
          ctx.strokeRect(rightWallX, blockY, 100, 60);
        }
        
        // Torches (less frequent in corridors, more in rooms)
        const torchSpacing = currentRoom ? 200 : 350;
        for (let ty = Math.floor(cy / torchSpacing) * torchSpacing; ty < cy + height + torchSpacing; ty += torchSpacing) {
          let minX = CORRIDOR_MIN_X, maxX = CORRIDOR_MAX_X;
          for (const room of ROOMS) {
            if (ty >= room.yStart && ty < room.yEnd) {
              minX = room.minX;
              maxX = room.maxX;
              break;
            }
          }
          
          const torchScreenY = ty - cy;
          if (torchScreenY < -50 || torchScreenY > height + 50) continue;
          
          // Left torch
          const leftTorchX = minX + 20 - cx;
          ctx.fillStyle = colors.accent;
          ctx.fillRect(leftTorchX - 5, torchScreenY - 5, 15, 25);
          
          const glowSize = 40 + Math.sin(time * 8 + ty) * 8;
          const fireGlow = ctx.createRadialGradient(leftTorchX + 5, torchScreenY - 15, 0, leftTorchX + 5, torchScreenY - 15, glowSize);
          fireGlow.addColorStop(0, `rgba(255, 150, 50, 0.4)`);
          fireGlow.addColorStop(0.5, `rgba(255, 100, 0, 0.15)`);
          fireGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = fireGlow;
          ctx.beginPath();
          ctx.arc(leftTorchX + 5, torchScreenY - 15, glowSize, 0, Math.PI * 2);
          ctx.fill();
          
          for (let f = 0; f < 3; f++) {
            const flameH = 12 + Math.sin(time * 12 + ty + f * 2) * 4;
            ctx.fillStyle = f === 1 ? '#fbbf24' : '#f97316';
            ctx.beginPath();
            ctx.moveTo(leftTorchX + 2 + f * 3, torchScreenY - 5);
            ctx.quadraticCurveTo(leftTorchX + 3 + f * 3, torchScreenY - 5 - flameH, leftTorchX + 5 + f * 3, torchScreenY - 5);
            ctx.fill();
          }
          
          // Right torch
          const rightTorchX = maxX - 20 - cx;
          ctx.fillStyle = colors.accent;
          ctx.fillRect(rightTorchX - 10, torchScreenY - 5, 15, 25);
          
          const fireGlow2 = ctx.createRadialGradient(rightTorchX - 5, torchScreenY - 15, 0, rightTorchX - 5, torchScreenY - 15, glowSize);
          fireGlow2.addColorStop(0, `rgba(255, 150, 50, 0.4)`);
          fireGlow2.addColorStop(0.5, `rgba(255, 100, 0, 0.15)`);
          fireGlow2.addColorStop(1, 'transparent');
          ctx.fillStyle = fireGlow2;
          ctx.beginPath();
          ctx.arc(rightTorchX - 5, torchScreenY - 15, glowSize, 0, Math.PI * 2);
          ctx.fill();
          
          for (let f = 0; f < 3; f++) {
            const flameH = 12 + Math.sin(time * 12 + ty + f * 2 + 1) * 4;
            ctx.fillStyle = f === 1 ? '#fbbf24' : '#f97316';
            ctx.beginPath();
            ctx.moveTo(rightTorchX - 8 + f * 3, torchScreenY - 5);
            ctx.quadraticCurveTo(rightTorchX - 7 + f * 3, torchScreenY - 5 - flameH, rightTorchX - 5 + f * 3, torchScreenY - 5);
            ctx.fill();
          }
        }
        
        // Theme-specific decorations
        const dungeonDecorSeeded = (x, y, seed = 0) => {
          const n = Math.sin(x * 45.233 + y * 91.117 + seed) * 12345.6789;
          return n - Math.floor(n);
        };
        
        // Draw room-specific decorations
        for (const room of ROOMS) {
          if (cy > room.yEnd + 100 || cy + height < room.yStart - 100) continue;
          
          const decorSpacing = room.theme === 'dragon' ? 150 : 80;
          
          for (let dx = room.minX + 50; dx < room.maxX - 50; dx += decorSpacing) {
            for (let dy = room.yStart + 50; dy < room.yEnd - 50; dy += decorSpacing) {
              const decorScreenX = dx - cx;
              const decorScreenY = dy - cy;
              if (decorScreenX < -50 || decorScreenX > width + 50) continue;
              if (decorScreenY < -50 || decorScreenY > height + 50) continue;
              
              const decorRand = dungeonDecorSeeded(dx, dy);
              
              if (room.theme === 'bones' && decorRand > 0.6) {
                // Skulls and bones
                if (decorRand > 0.8) {
                  ctx.fillStyle = '#d4d4d4';
                  ctx.beginPath();
                  ctx.arc(decorScreenX, decorScreenY, 8, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.fillStyle = '#1a1a1a';
                  ctx.beginPath();
                  ctx.arc(decorScreenX - 3, decorScreenY - 2, 2, 0, Math.PI * 2);
                  ctx.arc(decorScreenX + 3, decorScreenY - 2, 2, 0, Math.PI * 2);
                  ctx.fill();
                } else {
                  ctx.strokeStyle = '#a8a29e';
                  ctx.lineWidth = 3;
                  ctx.lineCap = 'round';
                  ctx.beginPath();
                  ctx.moveTo(decorScreenX - 12, decorScreenY - 5);
                  ctx.lineTo(decorScreenX + 12, decorScreenY + 5);
                  ctx.stroke();
                }
              } else if (room.theme === 'haunted' && decorRand > 0.7) {
                // Ghostly wisps
                const wispFloat = Math.sin(time * 2 + dx + dy) * 10;
                ctx.fillStyle = `rgba(99, 102, 241, ${0.3 + Math.sin(time * 3 + dx) * 0.2})`;
                ctx.beginPath();
                ctx.arc(decorScreenX, decorScreenY + wispFloat, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(165, 180, 252, ${0.5 + Math.sin(time * 4 + dy) * 0.3})`;
                ctx.beginPath();
                ctx.arc(decorScreenX, decorScreenY + wispFloat, 6, 0, Math.PI * 2);
                ctx.fill();
              } else if (room.theme === 'rocky' && decorRand > 0.6) {
                // Boulders and rocks
                ctx.fillStyle = '#57534e';
                ctx.beginPath();
                ctx.moveTo(decorScreenX - 15, decorScreenY + 10);
                ctx.lineTo(decorScreenX - 8, decorScreenY - 12);
                ctx.lineTo(decorScreenX + 10, decorScreenY - 8);
                ctx.lineTo(decorScreenX + 15, decorScreenY + 10);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#78716c';
                ctx.beginPath();
                ctx.moveTo(decorScreenX - 8, decorScreenY - 12);
                ctx.lineTo(decorScreenX + 10, decorScreenY - 8);
                ctx.lineTo(decorScreenX + 5, decorScreenY);
                ctx.closePath();
                ctx.fill();
              } else if (room.theme === 'infernal' && decorRand > 0.5) {
                // Lava cracks and embers
                if (decorRand > 0.75) {
                  // Lava crack
                  ctx.strokeStyle = '#f97316';
                  ctx.lineWidth = 3;
                  ctx.shadowColor = '#f97316';
                  ctx.shadowBlur = 10;
                  ctx.beginPath();
                  ctx.moveTo(decorScreenX - 15, decorScreenY);
                  ctx.lineTo(decorScreenX - 5, decorScreenY + 10);
                  ctx.lineTo(decorScreenX + 8, decorScreenY - 5);
                  ctx.lineTo(decorScreenX + 15, decorScreenY + 8);
                  ctx.stroke();
                  ctx.shadowBlur = 0;
                } else {
                  // Ember
                  const emberFloat = Math.sin(time * 4 + dx) * 5;
                  ctx.fillStyle = '#fbbf24';
                  ctx.beginPath();
                  ctx.arc(decorScreenX, decorScreenY - 10 + emberFloat, 4, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (room.theme === 'dragon' && decorRand > 0.6) {
                // Lava pools
                const lavaGlow = ctx.createRadialGradient(decorScreenX, decorScreenY, 0, decorScreenX, decorScreenY, 40);
                lavaGlow.addColorStop(0, '#fbbf24');
                lavaGlow.addColorStop(0.3, '#f97316');
                lavaGlow.addColorStop(0.7, '#dc2626');
                lavaGlow.addColorStop(1, '#7f1d1d');
                ctx.fillStyle = lavaGlow;
                ctx.beginPath();
                ctx.ellipse(decorScreenX, decorScreenY, 30 + Math.sin(time * 2 + dx) * 5, 18, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Bubbles
                for (let b = 0; b < 2; b++) {
                  const bubbleX = decorScreenX + Math.sin(time * 3 + b * 2) * 15;
                  const bubbleY = decorScreenY - Math.abs(Math.sin(time * 4 + b)) * 12;
                  ctx.beginPath();
                  ctx.arc(bubbleX, bubbleY, 3, 0, Math.PI * 2);
                  ctx.fillStyle = '#fbbf24';
                  ctx.fill();
                }
              }
            }
          }
        }
        
        // Room name banner
        if (currentRoom) {
          const bannerY = 60;
          ctx.font = 'bold 18px Arial';
          ctx.fillStyle = colors.accent;
          ctx.textAlign = 'center';
          ctx.fillText(currentRoom.name, width / 2, bannerY);
          
          // Underline
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(width / 2 - 80, bannerY + 8);
          ctx.lineTo(width / 2 + 80, bannerY + 8);
          ctx.stroke();
        }
        
        // Exit portal in entrance chamber
        const exitPortalY = 200;
        const exitScreenY = exitPortalY - cy;
        if (exitScreenY > -100 && exitScreenY < height + 100 && playerY < 400) {
          const exitScreenX = 400 - cx;
          const portalPulse = 0.8 + Math.sin(time * 3) * 0.2;
          
          // Portal glow
          const exitGlow = ctx.createRadialGradient(exitScreenX, exitScreenY, 0, exitScreenX, exitScreenY, 60);
          exitGlow.addColorStop(0, `rgba(34, 197, 94, ${0.6 * portalPulse})`);
          exitGlow.addColorStop(0.5, `rgba(34, 197, 94, ${0.3 * portalPulse})`);
          exitGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = exitGlow;
          ctx.beginPath();
          ctx.arc(exitScreenX, exitScreenY, 60, 0, Math.PI * 2);
          ctx.fill();
          
          // Portal ring
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(exitScreenX, exitScreenY, 30 * portalPulse, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner swirl
          ctx.save();
          ctx.translate(exitScreenX, exitScreenY);
          ctx.rotate(time * 2);
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
            ctx.lineTo(Math.cos(angle + 0.5) * 25, Math.sin(angle + 0.5) * 25);
            ctx.strokeStyle = `rgba(134, 239, 172, ${0.5 + Math.sin(time * 4 + i) * 0.3})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.restore();
          
          // Exit text
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = '#22c55e';
          ctx.textAlign = 'center';
          ctx.fillText('EXIT', exitScreenX, exitScreenY + 50);
          ctx.font = '10px Arial';
          ctx.fillStyle = '#86efac';
          ctx.fillText('Press E', exitScreenX, exitScreenY + 62);
        }
        
        // Dragon lair ambient effect
        if (playerY >= 2800) {
          const lairGlow = ctx.createLinearGradient(0, 0, 0, height);
          lairGlow.addColorStop(0, 'rgba(249, 115, 22, 0.05)');
          lairGlow.addColorStop(1, 'rgba(220, 38, 38, 0.1)');
          ctx.fillStyle = lairGlow;
          ctx.fillRect(0, 0, width, height);
          
          // Heat distortion effect
          if (Math.random() > 0.95) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.03)';
            ctx.fillRect(0, 0, width, height);
          }
        }
        
        // Victory portal (after dragon defeat)
        if (dungeonVictoryPortal && dungeonVictoryPortal.active) {
          const vpX = dungeonVictoryPortal.x - cx;
          const vpY = dungeonVictoryPortal.y - cy;
          
          if (vpY > -150 && vpY < height + 150) {
            const portalPulse = 0.8 + Math.sin(time * 4) * 0.2;
            const portalSize = 80;
            
            // Epic golden glow
            const victoryGlow = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, portalSize * 2);
            victoryGlow.addColorStop(0, 'rgba(251, 191, 36, 0.8)');
            victoryGlow.addColorStop(0.3, 'rgba(245, 158, 11, 0.5)');
            victoryGlow.addColorStop(0.6, 'rgba(217, 119, 6, 0.2)');
            victoryGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = victoryGlow;
            ctx.beginPath();
            ctx.arc(vpX, vpY, portalSize * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Outer ring - golden
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 6;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(vpX, vpY, portalSize * portalPulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Inner ring
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(vpX, vpY, portalSize * 0.6 * portalPulse, 0, Math.PI * 2);
            ctx.stroke();
            
            // Swirling particles
            ctx.save();
            ctx.translate(vpX, vpY);
            ctx.rotate(time * 3);
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              const dist = 30 + Math.sin(time * 5 + i) * 15;
              const px = Math.cos(angle) * dist;
              const py = Math.sin(angle) * dist;
              ctx.fillStyle = `rgba(251, 191, 36, ${0.8 - i * 0.08})`;
              ctx.beginPath();
              ctx.arc(px, py, 6 - i * 0.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
            
            // Inner swirl
            ctx.save();
            ctx.translate(vpX, vpY);
            ctx.rotate(-time * 2);
            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
              ctx.lineTo(Math.cos(angle + 0.6) * 40, Math.sin(angle + 0.6) * 40);
              ctx.strokeStyle = `rgba(253, 224, 71, ${0.6 + Math.sin(time * 6 + i) * 0.3})`;
              ctx.lineWidth = 3;
              ctx.stroke();
            }
            ctx.restore();
            
            // Victory text
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.textAlign = 'center';
            ctx.fillText('🏆 VICTORY PORTAL 🏆', vpX, vpY + portalSize + 25);
            ctx.font = '12px Arial';
            ctx.fillStyle = '#fde68a';
            ctx.fillText('Press E to return to Sanctuary', vpX, vpY + portalSize + 42);
            ctx.shadowBlur = 0;
          }
        }
        
        // Depth progress indicator
        const progress = Math.min(1, playerY / 3000);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(20, height - 30, 150, 15);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(22, height - 28, 146 * progress, 11);
        ctx.font = '10px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(`Depth: ${Math.floor(progress * 100)}%`, 25, height - 20);
        
      } else {
        // ========== NORMAL WORLD RENDERING ==========
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
      }

      // Zone decorations (seeded random based on position for consistency) - SKIP IN DUNGEON
      if (!inDungeon) {
        const tileSize = 64;
        const startX = Math.floor(cx / tileSize) * tileSize;
        const startY = Math.floor(cy / tileSize) * tileSize;
        
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
      } // End of if (!inDungeon) for decorations

      // Skip zone-specific visuals when in dungeon
      if (!inDungeon) {
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

      // Sanctuary (glowing safe zone with decorations)
      const sanctuaryPoly = ZONE_POLYGONS.sanctuary;
      if (sanctuaryPoly) {
        const sanctTime = Date.now() / 1000;
        
        // Draw polygon fill
        ctx.beginPath();
        ctx.moveTo(sanctuaryPoly[0].x - cx, sanctuaryPoly[0].y - cy);
        for (let i = 1; i < sanctuaryPoly.length; i++) {
          ctx.lineTo(sanctuaryPoly[i].x - cx, sanctuaryPoly[i].y - cy);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(34,197,94,0.15)';
        ctx.fill();
        
        // Animated border
        ctx.strokeStyle = `rgba(34,197,94,${0.5 + Math.sin(sanctTime * 2) * 0.2})`;
        ctx.lineWidth = 4;
        ctx.setLineDash([15, 8]);
        ctx.lineDashOffset = -sanctTime * 20;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        
        // Floating sparkles inside sanctuary
        for (let i = 0; i < 8; i++) {
          const angle = sanctTime * 0.3 + i * (Math.PI * 2 / 8);
          const radius = 100 + Math.sin(sanctTime + i) * 40;
          const sx = centerX + Math.cos(angle) * radius;
          const sy = centerY + Math.sin(angle) * radius + Math.sin(sanctTime * 2 + i) * 10;
          const sparkleSize = 2 + Math.sin(sanctTime * 3 + i * 2) * 1;
          
          ctx.beginPath();
          ctx.arc(sx, sy, sparkleSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(sanctTime * 4 + i) * 0.2})`;
          ctx.fill();
        }
        
        // Sanctuary label with glow
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.fillText('⛨ SANCTUARY', centerX, centerY + 5);
        ctx.shadowBlur = 0;
        
        // "Safe Zone" subtitle
        ctx.fillStyle = 'rgba(34,197,94,0.7)';
        ctx.font = '11px sans-serif';
        ctx.fillText('Safe Zone • Healing', centerX, centerY + 22);
      }
      } // End of if (!inDungeon) for zone visuals

      // World border (or dungeon walls in dungeon)
      if (!inDungeon) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 6;
        ctx.setLineDash([20, 10]);
        ctx.strokeRect(-cx, -cy, world.width, world.height);
        ctx.setLineDash([]);
      }
      
      // Touch target indicator (mobile)
      if (touchTargetRef.current.active && isMobileView) {
        const tx = touchTargetRef.current.x - cx;
        const ty = touchTargetRef.current.y - cy;
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        
        ctx.beginPath();
        ctx.arc(tx, ty, 18 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * pulse})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // ========== SANCTUARY HEALING ZONE VISUAL ========== (skip in dungeon)
      if (!inDungeon) {
        const sanctuaryCenter = { x: 3000, y: 2500 };
        const scx = sanctuaryCenter.x - cx;
        const scy = sanctuaryCenter.y - cy;
        const healRadius = 320; // Slightly smaller than polygon
        const time = Date.now() / 1000;
        
        // Only render if on screen
        if (scx > -healRadius - 100 && scx < width + healRadius + 100 && 
            scy > -healRadius - 100 && scy < height + healRadius + 100) {
          
          // Outer healing circle glow
          const glowPulse = 0.15 + Math.sin(time * 2) * 0.05;
          const gradient = ctx.createRadialGradient(scx, scy, healRadius * 0.5, scx, scy, healRadius);
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(0.7, `rgba(34, 197, 94, ${glowPulse * 0.3})`);
          gradient.addColorStop(1, `rgba(34, 197, 94, ${glowPulse})`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(scx, scy, healRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Healing circle border
          ctx.strokeStyle = `rgba(34, 197, 94, ${0.3 + Math.sin(time * 3) * 0.1})`;
          ctx.lineWidth = 3;
          ctx.setLineDash([15, 10]);
          ctx.beginPath();
          ctx.arc(scx, scy, healRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Floating healing particles
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
          const meData = players?.find(p => p.id === playerIdRef.current);
          if (meData?.isHealing) {
            // Stronger inner glow
            const innerGlow = ctx.createRadialGradient(scx, scy, 0, scx, scy, healRadius * 0.8);
            innerGlow.addColorStop(0, `rgba(74, 222, 128, ${0.15 + Math.sin(time * 5) * 0.05})`);
            innerGlow.addColorStop(0.5, `rgba(34, 197, 94, ${0.1 + Math.sin(time * 4) * 0.03})`);
            innerGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = innerGlow;
            ctx.beginPath();
            ctx.arc(scx, scy, healRadius * 0.8, 0, Math.PI * 2);
            ctx.fill();
            
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
          
          // "Safe Zone" text
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = `rgba(34, 197, 94, ${0.6 + Math.sin(time * 2) * 0.2})`;
          ctx.textAlign = 'center';
          ctx.fillText('✨ SANCTUARY ✨', scx, scy - healRadius + 25);
          ctx.font = '10px Arial';
          ctx.fillStyle = 'rgba(74, 222, 128, 0.7)';
          ctx.fillText('Healing Zone', scx, scy - healRadius + 40);
        }
      }

      // ========== BUILDINGS ========== (skip in dungeon)
      if (!inDungeon) {
        const time = Date.now() / 1000;
        for (const [id, building] of Object.entries(BUILDING_DATA)) {
        const bx = building.x - cx;
        const by = building.y - cy;
        const w = building.width;
        const h = building.height;
        
        // Skip if off screen
        if (bx < -w || bx > width + w || by < -h || by > height + h) continue;
        
        // Building shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(bx - w/2 + 5, by - h + 5, w, h);
        
        // Building body
        ctx.fillStyle = building.color;
        ctx.fillRect(bx - w/2, by - h, w, h);
        
        // Building outline
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - w/2, by - h, w, h);
        
        // Roof/top decoration
        if (id === 'wizard_tower') {
          // Spire
          ctx.beginPath();
          ctx.moveTo(bx, by - h - 40);
          ctx.lineTo(bx - w/2, by - h);
          ctx.lineTo(bx + w/2, by - h);
          ctx.closePath();
          ctx.fillStyle = '#7c3aed';
          ctx.fill();
          // Windows
          for (let i = 0; i < 3; i++) {
            const wy = by - h + 25 + i * 35;
            ctx.fillStyle = (Math.sin(time * 2 + i) > 0) ? '#ffd93d' : '#aa9920';
            ctx.fillRect(bx - 8, wy, 16, 20);
          }
        } else if (id === 'volcano_fortress') {
          // Lava glow
          const glowAlpha = 0.3 + Math.sin(time * 2) * 0.1;
          ctx.fillStyle = `rgba(249, 115, 22, ${glowAlpha})`;
          ctx.beginPath();
          ctx.arc(bx, by - h/2, w * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else if (id === 'ice_citadel') {
          // Ice glow
          ctx.fillStyle = 'rgba(103, 232, 249, 0.2)';
          ctx.beginPath();
          ctx.arc(bx, by - h/2, w * 0.6, 0, Math.PI * 2);
          ctx.fill();
          // Spires
          for (let i = 0; i < 3; i++) {
            const sx = bx - w/3 + i * (w/3);
            ctx.beginPath();
            ctx.moveTo(sx, by - h - 25);
            ctx.lineTo(sx - 12, by - h);
            ctx.lineTo(sx + 12, by - h);
            ctx.closePath();
            ctx.fillStyle = '#67e8f9';
            ctx.fill();
          }
        } else if (id === 'void_shrine') {
          // Floating particles
          for (let i = 0; i < 5; i++) {
            const px = bx + Math.sin(time + i) * 30;
            const py = by - h/2 + Math.cos(time * 2 + i) * 20;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#a855f7';
            ctx.fill();
          }
        }
        
        // Building name
        ctx.font = '12px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(building.name, bx, by + 15);
      }

      // ========== CAMPFIRE ==========
      {
        const campX = 2850 - cx;
        const campY = 2600 - cy;
        
        // Only render if on screen
        if (campX > -100 && campX < width + 100 && campY > -100 && campY < height + 100) {
          // Fire glow
          const glowSize = 35 + Math.sin(time * 8) * 5;
          const gradient = ctx.createRadialGradient(campX, campY - 10, 0, campX, campY - 10, glowSize);
          gradient.addColorStop(0, 'rgba(255, 150, 50, 0.6)');
          gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.3)');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(campX, campY - 10, glowSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Logs
          ctx.fillStyle = '#5c4033';
          ctx.beginPath();
          ctx.ellipse(campX, campY + 5, 20, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Flames
          for (let i = 0; i < 5; i++) {
            const fx = campX + (i - 2) * 6;
            const flameHeight = 15 + Math.sin(time * 10 + i * 2) * 5;
            const flameWidth = 4 + Math.sin(time * 8 + i) * 2;
            
            ctx.beginPath();
            ctx.moveTo(fx - flameWidth, campY);
            ctx.quadraticCurveTo(fx, campY - flameHeight * 1.5, fx + flameWidth, campY);
            ctx.fillStyle = i % 2 === 0 ? '#ff6b35' : '#ffd93d';
            ctx.fill();
          }
          
          // Sparks
          for (let i = 0; i < 3; i++) {
            const sparkX = campX + Math.sin(time * 5 + i * 3) * 10;
            const sparkY = campY - 20 - (time * 20 + i * 30) % 40;
            const sparkAlpha = 1 - ((time * 20 + i * 30) % 40) / 40;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 200, 100, ${sparkAlpha})`;
            ctx.fill();
          }
        }
      }

      // ========== NPCs ==========
      const npcs = gameStateRef.current.npcs || [];
      for (const npc of npcs) {
        const nx = npc.x - cx;
        const ny = npc.y - cy;
        
        // Skip if off screen
        if (nx < -50 || nx > width + 50 || ny < -50 || ny > height + 50) continue;
        
        if (npc.type === 'guide') {
          // Ethereal Guide - floating mystical entity
          const float = Math.sin(time * 2) * 5;
          const pulseAlpha = 0.5 + Math.sin(time * 3) * 0.2;
          
          // Outer glow
          const glow = ctx.createRadialGradient(nx, ny + float - 10, 0, nx, ny + float - 10, 40);
          glow.addColorStop(0, `rgba(103, 232, 249, ${pulseAlpha * 0.5})`);
          glow.addColorStop(0.5, `rgba(103, 232, 249, ${pulseAlpha * 0.2})`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(nx, ny + float - 10, 40, 0, Math.PI * 2);
          ctx.fill();
          
          // Body - ethereal robed figure
          ctx.beginPath();
          ctx.moveTo(nx, ny + float - 35);
          ctx.quadraticCurveTo(nx - 20, ny + float, nx - 15, ny + float + 10);
          ctx.lineTo(nx + 15, ny + float + 10);
          ctx.quadraticCurveTo(nx + 20, ny + float, nx, ny + float - 35);
          ctx.fillStyle = `rgba(103, 232, 249, ${pulseAlpha})`;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Face - glowing eyes
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(nx - 5, ny + float - 25, 3, 0, Math.PI * 2);
          ctx.arc(nx + 5, ny + float - 25, 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Floating particles around
          for (let i = 0; i < 6; i++) {
            const angle = (time + i * Math.PI / 3) * 0.5;
            const dist = 25 + Math.sin(time * 2 + i) * 5;
            const px = nx + Math.cos(angle) * dist;
            const py = ny + float - 15 + Math.sin(angle) * dist * 0.5;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(time * 3 + i) * 0.3})`;
            ctx.fill();
          }
          
          // Name
          ctx.font = 'bold 11px Arial';
          ctx.fillStyle = '#67e8f9';
          ctx.textAlign = 'center';
          ctx.fillText('Ethereal Guide', nx, ny + float + 25);
          
          // Interaction hint
          if (nearbyNpc?.id === npc.id) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#ffd93d';
            ctx.fillText('[E] Talk', nx, ny + float + 38);
          }
          
        } else if (npc.type === 'knight') {
          // Knight Commander - armored warrior
          const bobY = Math.sin(time * 3) * 2;
          
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(nx, ny + 15, 12, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Body - armor
          ctx.fillStyle = '#57534e';
          ctx.beginPath();
          ctx.ellipse(nx, ny + bobY, 14, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Armor highlight
          ctx.fillStyle = '#78716c';
          ctx.beginPath();
          ctx.ellipse(nx, ny + bobY - 5, 10, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Helmet
          ctx.fillStyle = '#44403c';
          ctx.beginPath();
          ctx.arc(nx, ny + bobY - 22, 10, 0, Math.PI * 2);
          ctx.fill();
          
          // Visor
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(nx - 8, ny + bobY - 24, 16, 6);
          
          // Helmet plume
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(nx, ny + bobY - 32);
          ctx.lineTo(nx - 3, ny + bobY - 40);
          ctx.lineTo(nx + 8, ny + bobY - 38);
          ctx.closePath();
          ctx.fill();
          
          // Shield (left side)
          ctx.fillStyle = '#78716c';
          ctx.beginPath();
          ctx.ellipse(nx - 18, ny + bobY, 8, 14, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffd93d';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Sword (right side)
          ctx.strokeStyle = '#a8a29e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(nx + 15, ny + bobY - 10);
          ctx.lineTo(nx + 25, ny + bobY - 30);
          ctx.stroke();
          // Hilt
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(nx + 12, ny + bobY - 5);
          ctx.lineTo(nx + 18, ny + bobY - 15);
          ctx.stroke();
          
          // Name
          ctx.font = 'bold 11px Arial';
          ctx.fillStyle = '#a8a29e';
          ctx.textAlign = 'center';
          ctx.fillText('Knight Commander', nx, ny + 30);
          ctx.font = '10px Arial';
          ctx.fillStyle = '#78716c';
          ctx.fillText('Aldric', nx, ny + 42);
          
          // Interaction hint
          if (nearbyNpc?.id === npc.id) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#ffd93d';
            ctx.fillText('[E] Talk', nx, ny + 55);
          }
        }
      }
      } // End of if (!inDungeon) for buildings/campfire/NPCs

      // ========== PORTALS ========== (skip in dungeon)
      if (!inDungeon) {
        for (const [, portal] of Object.entries(PORTAL_POSITIONS)) {
        const px = portal.from.x - cx;
        const py = portal.from.y - cy;
        
        // Skip if off screen
        if (px < -80 || px > width + 80 || py < -80 || py > height + 80) continue;
        
        const size = 45;
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 3) * 0.2 + 1;
        
        // Outer glow
        const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, size * 1.5 * pulse);
        glowGrad.addColorStop(0, portal.color + '60');
        glowGrad.addColorStop(0.6, portal.color + '20');
        glowGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(px, py, size * 1.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();
        
        // Portal ring
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Inner swirl
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(time * 2);
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
          ctx.quadraticCurveTo(
            Math.cos(angle + 0.5) * 30,
            Math.sin(angle + 0.5) * 30,
            Math.cos(angle + 1) * 35,
            Math.sin(angle + 1) * 35
          );
          ctx.strokeStyle = portal.color + '80';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
        
        // Center icon
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(portal.icon, px, py);
        
        // Portal name
        ctx.font = '11px Arial';
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(portal.name, px, py - size - 8);
        
        // Level requirement
        if (portal.level > 0) {
          ctx.font = '10px Arial';
          ctx.fillStyle = me && me.level >= portal.level ? '#4ade80' : '#ef4444';
          ctx.fillText(`Lv ${portal.level}+`, px, py + size + 15);
        }
      }
      } // End of if (!inDungeon) for PORTALS

      // Enemies (render in both world and dungeon)
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
          
          if (bossType === 'boss_meadow' || bossType === 'blossom_behemoth') {
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
          else if (bossType === 'boss_forest' || bossType === 'ancient_treant') {
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
          else if (bossType === 'boss_volcanic' || bossType === 'magma_titan') {
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
          else if (bossType === 'boss_frozen' || bossType === 'frost_wyrm') {
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
          else if (bossType === 'boss_abyss' || bossType === 'void_overlord') {
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
          else if (bossType === 'crystal_golem' || bossType === 'boss_crystal') {
            // Crystal Golem - Crystalline construct
            const time = Date.now() / 1000;
            
            // Crystal body - geometric shape
            ctx.beginPath();
            ctx.moveTo(sx, sy - 45 - bounce); // Top
            ctx.lineTo(sx + 30, sy - 15 - bounce); // Right upper
            ctx.lineTo(sx + 25, sy + 25 - bounce); // Right lower
            ctx.lineTo(sx, sy + 35 - bounce); // Bottom
            ctx.lineTo(sx - 25, sy + 25 - bounce); // Left lower  
            ctx.lineTo(sx - 30, sy - 15 - bounce); // Left upper
            ctx.closePath();
            
            // Crystal gradient fill
            const crystalGrad = ctx.createLinearGradient(sx - 30, sy - 45, sx + 30, sy + 35);
            crystalGrad.addColorStop(0, '#f0abfc');
            crystalGrad.addColorStop(0.5, '#ec4899');
            crystalGrad.addColorStop(1, '#be185d');
            ctx.fillStyle = crystalGrad;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Inner crystal facets
            ctx.beginPath();
            ctx.moveTo(sx, sy - 30 - bounce);
            ctx.lineTo(sx + 15, sy - bounce);
            ctx.lineTo(sx, sy + 20 - bounce);
            ctx.lineTo(sx - 15, sy - bounce);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fill();
            
            // Floating crystal shards
            for (let i = 0; i < 6; i++) {
              const angle = time * 1.5 + (i / 6) * Math.PI * 2;
              const dist = 45 + Math.sin(time * 2 + i) * 8;
              const shardX = sx + Math.cos(angle) * dist;
              const shardY = sy - bounce + Math.sin(angle) * dist * 0.5;
              
              ctx.save();
              ctx.translate(shardX, shardY);
              ctx.rotate(angle + time);
              ctx.beginPath();
              ctx.moveTo(0, -8);
              ctx.lineTo(4, 0);
              ctx.lineTo(0, 8);
              ctx.lineTo(-4, 0);
              ctx.closePath();
              ctx.fillStyle = '#f472b6';
              ctx.fill();
              ctx.restore();
            }
            
            // Glowing core
            const pulseAlpha = 0.5 + Math.sin(time * 3) * 0.3;
            ctx.beginPath();
            ctx.arc(sx, sy - 5 - bounce, 12, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
            ctx.fill();
            
            // Eye
            ctx.beginPath();
            ctx.arc(sx, sy - 5 - bounce, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ec4899';
            ctx.fill();
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
        // ========== REGULAR ENEMIES (Zone-themed) ==========
        else {
          const time = Date.now() / 1000;
          const enemyType = enemy.type;
          
          if (enemyType === 'slime') {
            // Bouncy slime blob
            const squish = 1 + Math.sin(time * 5) * 0.15;
            ctx.beginPath();
            ctx.ellipse(sx, sy - bounce + 4, 16 * squish, 12 / squish, 0, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            // Shine
            ctx.beginPath();
            ctx.ellipse(sx - 4, sy - 4 - bounce, 4, 3, -0.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(sx - 4, sy - 2 - bounce, 2.5, 0, Math.PI * 2);
            ctx.arc(sx + 4, sy - 2 - bounce, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          else if (enemyType === 'bat') {
            // Flying bat with wings
            const wingFlap = Math.sin(time * 15) * 0.6;
            // Wings
            ctx.fillStyle = color;
            ctx.save();
            ctx.translate(sx - 8, sy - bounce);
            ctx.rotate(-0.3 + wingFlap);
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.translate(sx + 8, sy - bounce);
            ctx.rotate(0.3 - wingFlap);
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // Body
            ctx.beginPath();
            ctx.ellipse(sx, sy - bounce, 8, 10, 0, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(sx - 3, sy - 3 - bounce, 2, 0, Math.PI * 2);
            ctx.arc(sx + 3, sy - 3 - bounce, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          else if (enemyType === 'skeleton') {
            // Skeletal warrior
            ctx.fillStyle = color;
            // Skull
            ctx.beginPath();
            ctx.arc(sx, sy - 10 - bounce, 9, 0, Math.PI * 2);
            ctx.fill();
            // Ribcage body
            ctx.fillRect(sx - 6, sy - 2 - bounce, 12, 16);
            // Eye sockets
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(sx - 3, sy - 12 - bounce, 2.5, 0, Math.PI * 2);
            ctx.arc(sx + 3, sy - 12 - bounce, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Jaw
            ctx.fillStyle = '#999';
            ctx.fillRect(sx - 4, sy - 4 - bounce, 8, 3);
          }
          else if (enemyType === 'ghost') {
            // Transparent floating ghost
            const wobble = Math.sin(time * 3) * 3;
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(sx, sy - 8 - bounce + wobble, 12, Math.PI, 0);
            ctx.lineTo(sx + 12, sy + 10 - bounce + wobble);
            ctx.quadraticCurveTo(sx + 8, sy + 5, sx + 4, sy + 12);
            ctx.quadraticCurveTo(sx, sy + 7, sx - 4, sy + 12);
            ctx.quadraticCurveTo(sx - 8, sy + 5, sx - 12, sy + 10);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
            // Spooky eyes
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(sx - 4, sy - 8 - bounce + wobble, 3, 4, 0, 0, Math.PI * 2);
            ctx.ellipse(sx + 4, sy - 8 - bounce + wobble, 3, 4, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          else if (enemyType === 'spider') {
            // Creepy spider with legs
            // Legs
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
              const legAngle = -0.8 + i * 0.5 + Math.sin(time * 8 + i) * 0.2;
              ctx.beginPath();
              ctx.moveTo(sx - 4, sy - bounce);
              ctx.lineTo(sx - 4 - Math.cos(legAngle) * 12, sy - bounce + Math.sin(legAngle) * 10);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(sx + 4, sy - bounce);
              ctx.lineTo(sx + 4 + Math.cos(legAngle) * 12, sy - bounce + Math.sin(legAngle) * 10);
              ctx.stroke();
            }
            // Body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(sx, sy - bounce, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes (multiple)
            ctx.fillStyle = '#f00';
            for (let i = 0; i < 4; i++) {
              ctx.beginPath();
              ctx.arc(sx - 3 + i * 2, sy - 2 - bounce, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          else if (enemyType === 'golem') {
            // Rocky golem
            ctx.fillStyle = color;
            // Main body - blocky
            ctx.fillRect(sx - 14, sy - 12 - bounce, 28, 28);
            // Head
            ctx.fillRect(sx - 10, sy - 22 - bounce, 20, 14);
            // Cracks
            ctx.strokeStyle = '#57534e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx - 8, sy - bounce);
            ctx.lineTo(sx - 2, sy + 12 - bounce);
            ctx.moveTo(sx + 5, sy - 8 - bounce);
            ctx.lineTo(sx + 10, sy + 5 - bounce);
            ctx.stroke();
            // Glowing eyes
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 5;
            ctx.fillRect(sx - 7, sy - 18 - bounce, 5, 4);
            ctx.fillRect(sx + 2, sy - 18 - bounce, 5, 4);
            ctx.shadowBlur = 0;
          }
          else if (enemyType === 'fireElemental') {
            // Flaming elemental
            const flicker = Math.sin(time * 10) * 3;
            // Flames
            for (let i = 0; i < 5; i++) {
              const flameX = sx + (i - 2) * 5;
              const flameH = 15 + Math.sin(time * 8 + i * 2) * 5;
              ctx.fillStyle = i % 2 ? '#ff6b35' : '#fbbf24';
              ctx.beginPath();
              ctx.moveTo(flameX - 4, sy + 5 - bounce);
              ctx.quadraticCurveTo(flameX, sy - flameH - bounce + flicker, flameX + 4, sy + 5 - bounce);
              ctx.fill();
            }
            // Core
            ctx.beginPath();
            ctx.arc(sx, sy - bounce, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(sx - 3, sy - 2 - bounce, 2, 0, Math.PI * 2);
            ctx.arc(sx + 3, sy - 2 - bounce, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          else if (enemyType === 'iceElemental') {
            // Frozen elemental
            const shimmer = 0.7 + Math.sin(time * 4) * 0.2;
            // Crystal body
            ctx.globalAlpha = shimmer;
            ctx.fillStyle = '#67e8f9';
            ctx.beginPath();
            ctx.moveTo(sx, sy - 18 - bounce);
            ctx.lineTo(sx + 12, sy - bounce);
            ctx.lineTo(sx + 8, sy + 12 - bounce);
            ctx.lineTo(sx - 8, sy + 12 - bounce);
            ctx.lineTo(sx - 12, sy - bounce);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalAlpha = 1;
            // Cold aura
            ctx.beginPath();
            ctx.arc(sx, sy - bounce, 18, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(103, 232, 249, 0.3)';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          else if (enemyType === 'necromancer') {
            // Dark hooded figure
            ctx.fillStyle = color;
            // Robe
            ctx.beginPath();
            ctx.moveTo(sx, sy - 16 - bounce);
            ctx.lineTo(sx - 10, sy + 12 - bounce);
            ctx.lineTo(sx + 10, sy + 12 - bounce);
            ctx.closePath();
            ctx.fill();
            // Hood
            ctx.beginPath();
            ctx.arc(sx, sy - 12 - bounce, 8, Math.PI, 0);
            ctx.lineTo(sx + 10, sy - 4 - bounce);
            ctx.lineTo(sx - 10, sy - 4 - bounce);
            ctx.closePath();
            ctx.fill();
            // Glowing eyes
            ctx.fillStyle = '#a855f7';
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(sx - 3, sy - 10 - bounce, 2, 0, Math.PI * 2);
            ctx.arc(sx + 3, sy - 10 - bounce, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Staff
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sx + 8, sy - 8 - bounce);
            ctx.lineTo(sx + 12, sy + 12 - bounce);
            ctx.stroke();
          }
          // ========== DUNGEON ENEMIES ==========
          else if (enemyType === 'dungeon_skeleton') {
            // Cursed Knight - armored undead
            ctx.fillStyle = '#44403c';
            // Helmet
            ctx.beginPath();
            ctx.arc(sx, sy - 14 - bounce, 10, Math.PI, 0);
            ctx.lineTo(sx + 10, sy - 8 - bounce);
            ctx.lineTo(sx - 10, sy - 8 - bounce);
            ctx.closePath();
            ctx.fill();
            // Armor body
            ctx.fillRect(sx - 8, sy - 8 - bounce, 16, 20);
            // Pauldrons (shoulder armor)
            ctx.beginPath();
            ctx.arc(sx - 10, sy - 6 - bounce, 6, 0, Math.PI * 2);
            ctx.arc(sx + 10, sy - 6 - bounce, 6, 0, Math.PI * 2);
            ctx.fill();
            // Red glowing eyes
            ctx.fillStyle = '#dc2626';
            ctx.shadowColor = '#dc2626';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(sx - 3, sy - 16 - bounce, 2, 0, Math.PI * 2);
            ctx.arc(sx + 3, sy - 16 - bounce, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Sword
            ctx.strokeStyle = '#a8a29e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sx + 12, sy - 10 - bounce);
            ctx.lineTo(sx + 20, sy - 25 - bounce);
            ctx.stroke();
          }
          else if (enemyType === 'dungeon_wraith') {
            // Soul Wraith - ethereal spirit
            const time = Date.now() / 1000;
            const wobble = Math.sin(time * 4) * 4;
            ctx.globalAlpha = 0.6;
            // Ghostly body
            const gradient = ctx.createRadialGradient(sx, sy - bounce + wobble, 0, sx, sy - bounce + wobble, 25);
            gradient.addColorStop(0, '#3730a3');
            gradient.addColorStop(0.5, '#1e1b4b');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, sy - bounce + wobble, 20, 0, Math.PI * 2);
            ctx.fill();
            // Inner form
            ctx.fillStyle = '#4338ca';
            ctx.beginPath();
            ctx.ellipse(sx, sy - 5 - bounce + wobble, 10, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            // Hollow eyes
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(sx - 4, sy - 8 - bounce + wobble, 3, 0, Math.PI * 2);
            ctx.arc(sx + 4, sy - 8 - bounce + wobble, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            // Trailing wisps
            for (let i = 0; i < 3; i++) {
              const wispY = sy + 10 + i * 8 - bounce + wobble;
              ctx.globalAlpha = 0.3 - i * 0.1;
              ctx.fillStyle = '#3730a3';
              ctx.beginPath();
              ctx.ellipse(sx + Math.sin(time * 3 + i) * 5, wispY, 6 - i * 2, 4, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
          else if (enemyType === 'dungeon_golem') {
            // Obsidian Guardian - massive stone construct
            ctx.fillStyle = '#1c1917';
            // Massive body
            ctx.fillRect(sx - 16, sy - 10 - bounce, 32, 28);
            // Head
            ctx.beginPath();
            ctx.arc(sx, sy - 18 - bounce, 14, 0, Math.PI * 2);
            ctx.fill();
            // Glowing runes
            ctx.strokeStyle = '#f97316';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 2;
            // Rune on chest
            ctx.beginPath();
            ctx.moveTo(sx, sy - 8 - bounce);
            ctx.lineTo(sx - 6, sy + 4 - bounce);
            ctx.lineTo(sx + 6, sy + 4 - bounce);
            ctx.closePath();
            ctx.stroke();
            // Glowing eyes
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(sx - 5, sy - 20 - bounce, 3, 0, Math.PI * 2);
            ctx.arc(sx + 5, sy - 20 - bounce, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Arms
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(sx - 24, sy - 8 - bounce, 8, 20);
            ctx.fillRect(sx + 16, sy - 8 - bounce, 8, 20);
          }
          else if (enemyType === 'dungeon_demon') {
            // Infernal Demon - fiery hellspawn
            // Fire aura
            ctx.fillStyle = 'rgba(249, 115, 22, 0.3)';
            ctx.beginPath();
            ctx.arc(sx, sy - bounce, 25, 0, Math.PI * 2);
            ctx.fill();
            // Body
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath();
            ctx.ellipse(sx, sy - bounce, 14, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            // Horns
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.moveTo(sx - 8, sy - 16 - bounce);
            ctx.lineTo(sx - 14, sy - 30 - bounce);
            ctx.lineTo(sx - 4, sy - 18 - bounce);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(sx + 8, sy - 16 - bounce);
            ctx.lineTo(sx + 14, sy - 30 - bounce);
            ctx.lineTo(sx + 4, sy - 18 - bounce);
            ctx.closePath();
            ctx.fill();
            // Flaming eyes
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(sx - 4, sy - 8 - bounce, 3, 0, Math.PI * 2);
            ctx.arc(sx + 4, sy - 8 - bounce, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Fire on top
            for (let i = 0; i < 4; i++) {
              const fx = sx - 6 + i * 4;
              const fh = 8 + Math.sin(time * 12 + i * 2) * 4;
              ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#fbbf24';
              ctx.beginPath();
              ctx.moveTo(fx - 3, sy - 18 - bounce);
              ctx.lineTo(fx, sy - 18 - fh - bounce);
              ctx.lineTo(fx + 3, sy - 18 - bounce);
              ctx.closePath();
              ctx.fill();
            }
          }
          else if (enemyType === 'boss_dragon') {
            // ========== MASSIVE INFERNAL DRAGON BOSS (4x size) ==========
            const time = Date.now() / 1000;
            const dragonRadius = enemy.radius || 160;
            const scale = dragonRadius / 40; // Scale factor (was 40, now 160 = 4x)
            const wingFlap = Math.sin(time * 2.5) * 0.4;
            const breathe = Math.sin(time * 1.5) * 5 * scale;
            const bodyBob = Math.sin(time * 2) * 3 * scale;
            
            // Massive fire aura glow
            const auraGrad = ctx.createRadialGradient(sx, sy - bodyBob, dragonRadius * 0.2, sx, sy - bodyBob, dragonRadius * 2);
            auraGrad.addColorStop(0, 'rgba(255, 100, 0, 0.5)');
            auraGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.3)');
            auraGrad.addColorStop(0.6, 'rgba(220, 38, 38, 0.15)');
            auraGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(sx, sy - bodyBob, dragonRadius * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Pulsing ground fire effect
            ctx.fillStyle = `rgba(255, 100, 0, ${0.1 + Math.sin(time * 4) * 0.05})`;
            ctx.beginPath();
            ctx.ellipse(sx, sy + 60 * scale, dragonRadius * 1.5, 30 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // === MASSIVE WINGS (behind body) ===
            // Left wing
            ctx.save();
            ctx.translate(sx - 60 * scale, sy - 30 * scale - bodyBob);
            ctx.rotate(-0.6 + wingFlap);
            // Wing bone structure
            ctx.fillStyle = '#5c0a0a';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-50 * scale, -80 * scale, -120 * scale, -40 * scale);
            ctx.quadraticCurveTo(-100 * scale, 0, -80 * scale, 40 * scale);
            ctx.quadraticCurveTo(-40 * scale, 30 * scale, 0, 10 * scale);
            ctx.closePath();
            ctx.fill();
            // Wing membrane with gradient
            const wingGrad1 = ctx.createLinearGradient(-120 * scale, -40 * scale, 0, 0);
            wingGrad1.addColorStop(0, '#7f1d1d');
            wingGrad1.addColorStop(0.5, '#991b1b');
            wingGrad1.addColorStop(1, '#b91c1c');
            ctx.fillStyle = wingGrad1;
            ctx.beginPath();
            ctx.moveTo(-15 * scale, 5 * scale);
            ctx.quadraticCurveTo(-60 * scale, -50 * scale, -100 * scale, -20 * scale);
            ctx.quadraticCurveTo(-70 * scale, 10 * scale, -15 * scale, 20 * scale);
            ctx.closePath();
            ctx.fill();
            // Wing veins
            ctx.strokeStyle = '#5c0a0a';
            ctx.lineWidth = 2 * scale;
            for (let i = 0; i < 4; i++) {
              ctx.beginPath();
              ctx.moveTo(-20 * scale, 5 * scale);
              ctx.quadraticCurveTo(-50 * scale - i * 15 * scale, -30 * scale + i * 10 * scale, -90 * scale, -10 * scale + i * 10 * scale);
              ctx.stroke();
            }
            ctx.restore();
            
            // Right wing
            ctx.save();
            ctx.translate(sx + 60 * scale, sy - 30 * scale - bodyBob);
            ctx.rotate(0.6 - wingFlap);
            ctx.fillStyle = '#5c0a0a';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(50 * scale, -80 * scale, 120 * scale, -40 * scale);
            ctx.quadraticCurveTo(100 * scale, 0, 80 * scale, 40 * scale);
            ctx.quadraticCurveTo(40 * scale, 30 * scale, 0, 10 * scale);
            ctx.closePath();
            ctx.fill();
            const wingGrad2 = ctx.createLinearGradient(120 * scale, -40 * scale, 0, 0);
            wingGrad2.addColorStop(0, '#7f1d1d');
            wingGrad2.addColorStop(0.5, '#991b1b');
            wingGrad2.addColorStop(1, '#b91c1c');
            ctx.fillStyle = wingGrad2;
            ctx.beginPath();
            ctx.moveTo(15 * scale, 5 * scale);
            ctx.quadraticCurveTo(60 * scale, -50 * scale, 100 * scale, -20 * scale);
            ctx.quadraticCurveTo(70 * scale, 10 * scale, 15 * scale, 20 * scale);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#5c0a0a';
            ctx.lineWidth = 2 * scale;
            for (let i = 0; i < 4; i++) {
              ctx.beginPath();
              ctx.moveTo(20 * scale, 5 * scale);
              ctx.quadraticCurveTo(50 * scale + i * 15 * scale, -30 * scale + i * 10 * scale, 90 * scale, -10 * scale + i * 10 * scale);
              ctx.stroke();
            }
            ctx.restore();
            
            // === MASSIVE TAIL ===
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 20 * scale;
            ctx.lineCap = 'round';
            const tailWave = Math.sin(time * 3);
            ctx.beginPath();
            ctx.moveTo(sx, sy + 50 * scale - bodyBob);
            ctx.bezierCurveTo(
              sx - 40 * scale, sy + 100 * scale - bodyBob + tailWave * 20,
              sx - 100 * scale, sy + 80 * scale - bodyBob - tailWave * 30,
              sx - 150 * scale, sy + 40 * scale - bodyBob + tailWave * 25
            );
            ctx.stroke();
            // Tail tip with spikes
            ctx.fillStyle = '#1c1917';
            const tailEndX = sx - 150 * scale;
            const tailEndY = sy + 40 * scale - bodyBob + tailWave * 25;
            for (let i = 0; i < 4; i++) {
              const spikeAngle = -0.8 + i * 0.2 + tailWave * 0.1;
              ctx.save();
              ctx.translate(tailEndX + i * 15 * scale, tailEndY - i * 5 * scale);
              ctx.rotate(spikeAngle);
              ctx.beginPath();
              ctx.moveTo(0, -15 * scale);
              ctx.lineTo(-8 * scale, 10 * scale);
              ctx.lineTo(8 * scale, 10 * scale);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
            
            // === BACK LEGS ===
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath();
            ctx.ellipse(sx - 35 * scale, sy + 30 * scale - bodyBob, 20 * scale, 35 * scale, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sx + 35 * scale, sy + 30 * scale - bodyBob, 20 * scale, 35 * scale, 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // === MASSIVE BODY ===
            const bodyGrad = ctx.createRadialGradient(sx, sy - bodyBob, 0, sx, sy - bodyBob, 80 * scale);
            bodyGrad.addColorStop(0, '#dc2626');
            bodyGrad.addColorStop(0.5, '#b91c1c');
            bodyGrad.addColorStop(1, '#7f1d1d');
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.ellipse(sx, sy - bodyBob + breathe, 70 * scale, 55 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Belly scales
            ctx.fillStyle = '#fbbf24';
            for (let row = 0; row < 4; row++) {
              for (let i = 0; i < 6; i++) {
                const scaleX = sx - 35 * scale + i * 14 * scale;
                const scaleY = sy - 10 * scale + row * 18 * scale - bodyBob + breathe;
                ctx.beginPath();
                ctx.ellipse(scaleX, scaleY, 8 * scale, 6 * scale, 0, Math.PI, 0);
                ctx.fill();
              }
            }
            
            // Back ridge spines
            ctx.fillStyle = '#1c1917';
            for (let i = 0; i < 8; i++) {
              const spineX = sx - 20 * scale + i * 8 * scale;
              const spineY = sy - 55 * scale - bodyBob + breathe + Math.sin(time * 6 + i) * 2;
              ctx.beginPath();
              ctx.moveTo(spineX, spineY);
              ctx.lineTo(spineX - 5 * scale, spineY + 20 * scale);
              ctx.lineTo(spineX + 5 * scale, spineY + 20 * scale);
              ctx.closePath();
              ctx.fill();
            }
            
            // === FRONT LEGS ===
            ctx.fillStyle = '#991b1b';
            // Left front leg
            ctx.beginPath();
            ctx.moveTo(sx - 45 * scale, sy + 10 * scale - bodyBob);
            ctx.quadraticCurveTo(sx - 55 * scale, sy + 40 * scale - bodyBob, sx - 50 * scale, sy + 70 * scale - bodyBob);
            ctx.lineTo(sx - 35 * scale, sy + 70 * scale - bodyBob);
            ctx.quadraticCurveTo(sx - 35 * scale, sy + 40 * scale - bodyBob, sx - 30 * scale, sy + 10 * scale - bodyBob);
            ctx.closePath();
            ctx.fill();
            // Right front leg
            ctx.beginPath();
            ctx.moveTo(sx + 45 * scale, sy + 10 * scale - bodyBob);
            ctx.quadraticCurveTo(sx + 55 * scale, sy + 40 * scale - bodyBob, sx + 50 * scale, sy + 70 * scale - bodyBob);
            ctx.lineTo(sx + 35 * scale, sy + 70 * scale - bodyBob);
            ctx.quadraticCurveTo(sx + 35 * scale, sy + 40 * scale - bodyBob, sx + 30 * scale, sy + 10 * scale - bodyBob);
            ctx.closePath();
            ctx.fill();
            // Claws
            ctx.fillStyle = '#1c1917';
            for (let leg = 0; leg < 2; leg++) {
              const legBaseX = leg === 0 ? sx - 50 * scale : sx + 35 * scale;
              const legDir = leg === 0 ? -1 : 1;
              for (let c = 0; c < 4; c++) {
                ctx.beginPath();
                ctx.moveTo(legBaseX + c * 5 * scale * legDir, sy + 70 * scale - bodyBob);
                ctx.lineTo(legBaseX + c * 5 * scale * legDir + 2 * scale * legDir, sy + 85 * scale - bodyBob);
                ctx.lineTo(legBaseX + c * 5 * scale * legDir + 5 * scale * legDir, sy + 70 * scale - bodyBob);
                ctx.closePath();
                ctx.fill();
              }
            }
            
            // === LONG NECK ===
            const neckGrad = ctx.createLinearGradient(sx, sy - 50 * scale - bodyBob, sx + 30 * scale, sy - 120 * scale - bodyBob);
            neckGrad.addColorStop(0, '#b91c1c');
            neckGrad.addColorStop(1, '#991b1b');
            ctx.fillStyle = neckGrad;
            ctx.beginPath();
            ctx.moveTo(sx - 20 * scale, sy - 40 * scale - bodyBob + breathe);
            ctx.quadraticCurveTo(sx, sy - 80 * scale - bodyBob, sx + 20 * scale, sy - 110 * scale - bodyBob);
            ctx.lineTo(sx + 40 * scale, sy - 105 * scale - bodyBob);
            ctx.quadraticCurveTo(sx + 25 * scale, sy - 70 * scale - bodyBob, sx + 20 * scale, sy - 40 * scale - bodyBob + breathe);
            ctx.closePath();
            ctx.fill();
            // Neck spines
            ctx.fillStyle = '#1c1917';
            for (let i = 0; i < 5; i++) {
              const neckProgress = i / 5;
              const neckX = sx - 5 * scale + neckProgress * 25 * scale;
              const neckY = sy - 50 * scale - neckProgress * 55 * scale - bodyBob;
              ctx.beginPath();
              ctx.moveTo(neckX, neckY - 12 * scale);
              ctx.lineTo(neckX - 4 * scale, neckY + 5 * scale);
              ctx.lineTo(neckX + 4 * scale, neckY + 5 * scale);
              ctx.closePath();
              ctx.fill();
            }
            
            // === MASSIVE HEAD ===
            const headX = sx + 30 * scale;
            const headY = sy - 120 * scale - bodyBob;
            // Main head shape
            const headGrad = ctx.createRadialGradient(headX, headY, 0, headX, headY, 35 * scale);
            headGrad.addColorStop(0, '#dc2626');
            headGrad.addColorStop(0.7, '#b91c1c');
            headGrad.addColorStop(1, '#991b1b');
            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.ellipse(headX, headY, 35 * scale, 28 * scale, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Snout
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            ctx.ellipse(headX + 40 * scale, headY + 5 * scale, 25 * scale, 18 * scale, 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Jaw
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.ellipse(headX + 30 * scale, headY + 20 * scale, 28 * scale, 12 * scale, 0.2, 0, Math.PI);
            ctx.fill();
            
            // Teeth
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 6; i++) {
              const toothX = headX + 15 * scale + i * 10 * scale;
              const toothY = headY + 12 * scale;
              ctx.beginPath();
              ctx.moveTo(toothX, toothY);
              ctx.lineTo(toothX - 3 * scale, toothY + 10 * scale);
              ctx.lineTo(toothX + 3 * scale, toothY + 10 * scale);
              ctx.closePath();
              ctx.fill();
            }
            
            // MASSIVE HORNS
            ctx.fillStyle = '#1c1917';
            // Left horn
            ctx.beginPath();
            ctx.moveTo(headX - 15 * scale, headY - 20 * scale);
            ctx.quadraticCurveTo(headX - 30 * scale, headY - 50 * scale, headX - 25 * scale, headY - 70 * scale);
            ctx.lineTo(headX - 15 * scale, headY - 65 * scale);
            ctx.quadraticCurveTo(headX - 20 * scale, headY - 45 * scale, headX - 5 * scale, headY - 18 * scale);
            ctx.closePath();
            ctx.fill();
            // Right horn
            ctx.beginPath();
            ctx.moveTo(headX + 10 * scale, headY - 22 * scale);
            ctx.quadraticCurveTo(headX + 5 * scale, headY - 55 * scale, headX + 15 * scale, headY - 80 * scale);
            ctx.lineTo(headX + 25 * scale, headY - 75 * scale);
            ctx.quadraticCurveTo(headX + 20 * scale, headY - 50 * scale, headX + 20 * scale, headY - 20 * scale);
            ctx.closePath();
            ctx.fill();
            
            // Glowing eyes
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 25;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.ellipse(headX + 20 * scale, headY - 8 * scale, 10 * scale, 8 * scale, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(headX - 5 * scale, headY - 5 * scale, 10 * scale, 8 * scale, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Slit pupils
            ctx.fillStyle = '#000';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.ellipse(headX + 22 * scale, headY - 8 * scale, 3 * scale, 6 * scale, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(headX - 3 * scale, headY - 5 * scale, 3 * scale, 6 * scale, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Nostrils with fire/smoke
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.ellipse(headX + 55 * scale, headY + 2 * scale, 4 * scale, 3 * scale, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(headX + 55 * scale, headY + 12 * scale, 4 * scale, 3 * scale, 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Fire breath from nostrils
            for (let n = 0; n < 2; n++) {
              const nostrilY = headY + (n === 0 ? 2 : 12) * scale;
              for (let i = 0; i < 4; i++) {
                const fireX = headX + 60 * scale + i * 8 * scale + Math.sin(time * 8 + i + n) * 5;
                const fireY = nostrilY + Math.sin(time * 10 + i) * 3;
                const fireSize = (4 - i) * scale;
                ctx.globalAlpha = 0.6 - i * 0.15;
                ctx.fillStyle = i < 2 ? '#fbbf24' : '#f97316';
                ctx.beginPath();
                ctx.arc(fireX, fireY, fireSize, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            ctx.globalAlpha = 1;
            
            // === BOSS HEALTH BAR ===
            const hbW = 200 * scale;
            const hbY = sy - 180 * scale - bodyBob;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(sx - hbW / 2 - 4, hbY - 4, hbW + 8, 24);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(sx - hbW / 2, hbY, hbW, 16);
            
            const healthPct = enemy.health / enemy.maxHealth;
            const hpGrad = ctx.createLinearGradient(sx - hbW / 2, hbY, sx - hbW / 2 + hbW * healthPct, hbY);
            hpGrad.addColorStop(0, '#dc2626');
            hpGrad.addColorStop(0.5, '#f97316');
            hpGrad.addColorStop(1, '#fbbf24');
            ctx.fillStyle = hpGrad;
            ctx.fillRect(sx - hbW / 2, hbY, hbW * healthPct, 16);
            
            // Health text
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${12 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.ceil(enemy.health)} / ${enemy.maxHealth}`, sx, hbY + 13);
            
            // Boss name with fire effect
            ctx.fillStyle = '#fbbf24';
            ctx.font = `bold ${18 * scale}px Arial`;
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 10;
            ctx.fillText('🐉 INFERNAL DRAGON 🐉', sx, hbY - 15);
            ctx.shadowBlur = 0;
            
            // Phase indicator
            const phase = enemy.health < enemy.maxHealth * 0.25 ? 3 : 
                          enemy.health < enemy.maxHealth * 0.5 ? 2 : 1;
            if (phase > 1) {
              ctx.fillStyle = phase === 3 ? '#dc2626' : '#f97316';
              ctx.font = `bold ${14 * scale}px Arial`;
              ctx.fillText(`⚠️ PHASE ${phase} ${phase === 3 ? '- ENRAGED!' : ''} ⚠️`, sx, hbY - 35);
            }
          }
          // ========== MINI-BOSSES ==========
          else if (enemyType === 'dungeon_minotaur') {
            // Ironhide Minotaur - massive bull-headed warrior
            const time = Date.now() / 1000;
            const breathe = Math.sin(time * 2) * 2;
            const isCharging = enemy.isCharging;
            const chargeIntensity = isCharging ? Math.sin(time * 20) * 5 : 0;
            
            // Dust cloud when charging
            if (isCharging) {
              ctx.globalAlpha = 0.4;
              for (let i = 0; i < 5; i++) {
                ctx.fillStyle = '#78350f';
                ctx.beginPath();
                ctx.arc(sx - 20 - i * 15 + Math.random() * 10, sy + 30 + Math.random() * 10, 8 + Math.random() * 8, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.globalAlpha = 1;
            }
            
            // Massive body
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.ellipse(sx, sy - bounce + breathe + chargeIntensity, 35, 40, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Muscular arms
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.ellipse(sx - 35, sy - 10 - bounce, 15, 25, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sx + 35, sy - 10 - bounce, 15, 25, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Fists
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(sx - 45, sy + 15 - bounce, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx + 45, sy + 15 - bounce, 12, 0, Math.PI * 2);
            ctx.fill();
            
            // Legs
            ctx.fillStyle = '#78350f';
            ctx.fillRect(sx - 20, sy + 25 - bounce, 15, 30);
            ctx.fillRect(sx + 5, sy + 25 - bounce, 15, 30);
            // Hooves
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(sx - 22, sy + 52 - bounce, 19, 8);
            ctx.fillRect(sx + 3, sy + 52 - bounce, 19, 8);
            
            // Bull head
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.ellipse(sx, sy - 50 - bounce + chargeIntensity, 28, 24, 0, 0, Math.PI * 2);
            ctx.fill();
            // Snout
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.ellipse(sx, sy - 40 - bounce + chargeIntensity, 18, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            // Nostrils with steam
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.ellipse(sx - 6, sy - 38 - bounce + chargeIntensity, 3, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sx + 6, sy - 38 - bounce + chargeIntensity, 3, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Steam from nostrils
            if (isCharging || Math.random() > 0.7) {
              ctx.globalAlpha = 0.5;
              ctx.fillStyle = '#d4d4d4';
              for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(sx - 6 + Math.sin(time * 10 + i) * 5, sy - 45 - i * 6 - bounce, 4 - i, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(sx + 6 + Math.sin(time * 10 + i + 1) * 5, sy - 45 - i * 6 - bounce, 4 - i, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.globalAlpha = 1;
            }
            
            // Angry eyes
            ctx.fillStyle = '#dc2626';
            ctx.shadowColor = '#dc2626';
            ctx.shadowBlur = isCharging ? 15 : 8;
            ctx.beginPath();
            ctx.ellipse(sx - 10, sy - 55 - bounce + chargeIntensity, 6, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sx + 10, sy - 55 - bounce + chargeIntensity, 6, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Pupils
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(sx - 10, sy - 55 - bounce + chargeIntensity, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx + 10, sy - 55 - bounce + chargeIntensity, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // MASSIVE HORNS
            ctx.fillStyle = '#1c1917';
            ctx.strokeStyle = '#44403c';
            ctx.lineWidth = 2;
            // Left horn
            ctx.beginPath();
            ctx.moveTo(sx - 20, sy - 60 - bounce + chargeIntensity);
            ctx.quadraticCurveTo(sx - 45, sy - 75 - bounce, sx - 55, sy - 50 - bounce + chargeIntensity);
            ctx.quadraticCurveTo(sx - 50, sy - 60 - bounce, sx - 25, sy - 58 - bounce + chargeIntensity);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Right horn
            ctx.beginPath();
            ctx.moveTo(sx + 20, sy - 60 - bounce + chargeIntensity);
            ctx.quadraticCurveTo(sx + 45, sy - 75 - bounce, sx + 55, sy - 50 - bounce + chargeIntensity);
            ctx.quadraticCurveTo(sx + 50, sy - 60 - bounce, sx + 25, sy - 58 - bounce + chargeIntensity);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Battle axe on back
            ctx.fillStyle = '#57534e';
            ctx.fillRect(sx + 25, sy - 60 - bounce, 8, 70);
            ctx.fillStyle = '#78716c';
            ctx.beginPath();
            ctx.moveTo(sx + 20, sy - 65 - bounce);
            ctx.lineTo(sx + 15, sy - 45 - bounce);
            ctx.lineTo(sx + 20, sy - 25 - bounce);
            ctx.lineTo(sx + 28, sy - 25 - bounce);
            ctx.lineTo(sx + 28, sy - 65 - bounce);
            ctx.closePath();
            ctx.fill();
            
            // Mini-boss health bar
            const mhbW = 60;
            const mhbY = sy - 90 - bounce;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(sx - mhbW / 2 - 2, mhbY - 2, mhbW + 4, 10);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(sx - mhbW / 2, mhbY, mhbW, 6);
            ctx.fillStyle = '#f97316';
            ctx.fillRect(sx - mhbW / 2, mhbY, mhbW * enemy.health / enemy.maxHealth, 6);
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚔️ MINOTAUR', sx, mhbY - 5);
          }
          else if (enemyType === 'dungeon_lich') {
            // Lich King - undead sorcerer
            const time = Date.now() / 1000;
            const hover = Math.sin(time * 2) * 5;
            const cloakWave = Math.sin(time * 3) * 0.1;
            
            // Dark aura
            const auraGrad = ctx.createRadialGradient(sx, sy + hover, 10, sx, sy + hover, 50);
            auraGrad.addColorStop(0, 'rgba(30, 27, 75, 0.5)');
            auraGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.2)');
            auraGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(sx, sy + hover, 50, 0, Math.PI * 2);
            ctx.fill();
            
            // Floating robe/cloak
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.moveTo(sx - 25, sy - 20 + hover);
            ctx.quadraticCurveTo(sx - 30 + cloakWave * 20, sy + 30 + hover, sx - 20, sy + 50 + hover);
            ctx.lineTo(sx + 20, sy + 50 + hover);
            ctx.quadraticCurveTo(sx + 30 - cloakWave * 20, sy + 30 + hover, sx + 25, sy - 20 + hover);
            ctx.closePath();
            ctx.fill();
            
            // Inner robe detail
            ctx.fillStyle = '#312e81';
            ctx.beginPath();
            ctx.moveTo(sx - 15, sy - 10 + hover);
            ctx.quadraticCurveTo(sx, sy + 40 + hover, sx + 15, sy - 10 + hover);
            ctx.closePath();
            ctx.fill();
            
            // Skeletal hands
            ctx.strokeStyle = '#d4d4d4';
            ctx.lineWidth = 3;
            // Left hand
            ctx.beginPath();
            ctx.moveTo(sx - 25, sy - 10 + hover);
            ctx.lineTo(sx - 35, sy + 5 + hover);
            ctx.stroke();
            for (let i = 0; i < 4; i++) {
              ctx.beginPath();
              ctx.moveTo(sx - 35, sy + 5 + hover);
              ctx.lineTo(sx - 40 - i * 3, sy + 15 + hover + Math.sin(time * 5 + i) * 2);
              ctx.stroke();
            }
            // Right hand holding staff
            ctx.beginPath();
            ctx.moveTo(sx + 25, sy - 10 + hover);
            ctx.lineTo(sx + 30, sy + 10 + hover);
            ctx.stroke();
            
            // Necromancer staff
            ctx.strokeStyle = '#44403c';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(sx + 30, sy + 10 + hover);
            ctx.lineTo(sx + 35, sy + 60 + hover);
            ctx.stroke();
            // Staff orb
            ctx.fillStyle = '#6366f1';
            ctx.shadowColor = '#6366f1';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(sx + 30, sy + hover, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#a5b4fc';
            ctx.beginPath();
            ctx.arc(sx + 28, sy - 3 + hover, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Skull head
            ctx.fillStyle = '#d4d4d4';
            ctx.beginPath();
            ctx.ellipse(sx, sy - 35 + hover, 18, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eye sockets with soul fire
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.ellipse(sx - 7, sy - 38 + hover, 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sx + 7, sy - 38 + hover, 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            // Soul fire in eyes
            ctx.fillStyle = '#6366f1';
            ctx.shadowColor = '#6366f1';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(sx - 7, sy - 38 + hover + Math.sin(time * 8) * 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx + 7, sy - 38 + hover + Math.sin(time * 8 + 1) * 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Nose hole
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.moveTo(sx, sy - 32 + hover);
            ctx.lineTo(sx - 3, sy - 28 + hover);
            ctx.lineTo(sx + 3, sy - 28 + hover);
            ctx.closePath();
            ctx.fill();
            // Jaw
            ctx.fillStyle = '#a8a29e';
            ctx.beginPath();
            ctx.ellipse(sx, sy - 22 + hover, 12, 6, 0, 0, Math.PI);
            ctx.fill();
            
            // Crown
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(sx - 15, sy - 52 + hover);
            ctx.lineTo(sx - 12, sy - 65 + hover);
            ctx.lineTo(sx - 5, sy - 55 + hover);
            ctx.lineTo(sx, sy - 70 + hover);
            ctx.lineTo(sx + 5, sy - 55 + hover);
            ctx.lineTo(sx + 12, sy - 65 + hover);
            ctx.lineTo(sx + 15, sy - 52 + hover);
            ctx.closePath();
            ctx.fill();
            // Crown gems
            ctx.fillStyle = '#6366f1';
            ctx.beginPath();
            ctx.arc(sx, sy - 60 + hover, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Mini-boss health bar
            const lhbW = 60;
            const lhbY = sy - 85 + hover;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(sx - lhbW / 2 - 2, lhbY - 2, lhbW + 4, 10);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(sx - lhbW / 2, lhbY, lhbW, 6);
            ctx.fillStyle = '#6366f1';
            ctx.fillRect(sx - lhbW / 2, lhbY, lhbW * enemy.health / enemy.maxHealth, 6);
            ctx.fillStyle = '#a5b4fc';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('💀 LICH KING', sx, lhbY - 5);
          }
          else {
            // Default circle enemy (fallback)
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
          }

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

        // Frozen indicator - Enhanced ice encasement
        if (enemy.isFrozen) {
          const time = Date.now() / 1000;
          const radius = isBoss ? 50 : 22;
          
          // Ice shell
          ctx.beginPath();
          ctx.arc(sx, sy, radius + 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(103, 232, 249, 0.3)';
          ctx.fill();
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Ice crystals around enemy
          const crystalCount = isBoss ? 8 : 5;
          for (let i = 0; i < crystalCount; i++) {
            const angle = (i / crystalCount) * Math.PI * 2 + time * 0.5;
            const cx = sx + Math.cos(angle) * (radius + 8);
            const cy = sy + Math.sin(angle) * (radius + 8);
            
            // Crystal shape
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(3, 0);
            ctx.lineTo(0, 6);
            ctx.lineTo(-3, 0);
            ctx.closePath();
            ctx.fillStyle = '#67e8f9';
            ctx.fill();
            ctx.restore();
          }
          
          // Frost particles
          for (let i = 0; i < 4; i++) {
            const pAngle = time * 2 + i * Math.PI / 2;
            const pDist = radius + 12 + Math.sin(time * 3 + i) * 3;
            const px = sx + Math.cos(pAngle) * pDist;
            const py = sy + Math.sin(pAngle) * pDist;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
          }
        }
      }

      // Projectiles - Class-specific and level-enhanced
      for (const proj of projectiles || []) {
        const px = proj.x - cx;
        const py = proj.y - cy;
        if (px < -50 || px > width + 50 || py < -50 || py > height + 50) continue;

        const level = proj.level || 1;
        const spellId = proj.spellId || '';
        const ownerClass = proj.ownerClass || '';
        const time = Date.now() / 1000;
        
        // Level-based enhancements
        const sizeBonus = Math.min(level * 0.05, 0.5); // Up to 50% bigger at high levels
        const glowBonus = Math.min(level * 0.1, 1); // More glow at higher levels
        const baseRadius = proj.radius * (1 + sizeBonus);
        
        ctx.save();
        
        // ========== PYROMANCER SPELLS ==========
        if (ownerClass === 'pyromancer') {
          if (spellId === 'fireball') {
            // Fireball - flaming sphere with trail
            const flicker = Math.sin(time * 20 + px) * 0.2 + 1;
            
            // Outer glow
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 15 + glowBonus * 5, 0, Math.PI * 2);
            const outerGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 15);
            outerGlow.addColorStop(0, `rgba(255,150,0,${0.3 + glowBonus * 0.2})`);
            outerGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = outerGlow;
            ctx.fill();
            
            // Fire particles around it
            if (level >= 5) {
              for (let i = 0; i < 3; i++) {
                const angle = time * 5 + (i * Math.PI * 2 / 3);
                const dist = baseRadius + 5;
                const fx = px + Math.cos(angle) * dist;
                const fy = py + Math.sin(angle) * dist;
                ctx.beginPath();
                ctx.arc(fx, fy, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#ff6600';
                ctx.fill();
              }
            }
            
            // Core flame
            ctx.beginPath();
            ctx.arc(px, py, baseRadius * flicker, 0, Math.PI * 2);
            const fireGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius);
            fireGrad.addColorStop(0, '#fff');
            fireGrad.addColorStop(0.3, '#ffff00');
            fireGrad.addColorStop(0.7, '#ff6600');
            fireGrad.addColorStop(1, '#cc0000');
            ctx.fillStyle = fireGrad;
            ctx.fill();
          } else if (spellId === 'flamewave') {
            // Flame wave - larger, more dramatic
            const wave = Math.sin(time * 10) * 0.3 + 1;
            ctx.beginPath();
            ctx.arc(px, py, baseRadius * wave, 0, Math.PI * 2);
            const waveGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius * wave);
            waveGrad.addColorStop(0, '#ffff00');
            waveGrad.addColorStop(0.5, '#ff6600');
            waveGrad.addColorStop(1, 'rgba(255,0,0,0.5)');
            ctx.fillStyle = waveGrad;
            ctx.fill();
          } else {
            // Default pyro spell
            ctx.beginPath();
            ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = proj.color || '#f97316';
            ctx.fill();
          }
        }
        // ========== CRYOMANCER SPELLS ==========
        else if (ownerClass === 'cryomancer') {
          if (spellId === 'frostbolt') {
            // Frostbolt - icy crystal
            const spin = time * 3;
            
            // Ice trail effect
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 12, 0, Math.PI * 2);
            const iceGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 12);
            iceGlow.addColorStop(0, `rgba(150,220,255,${0.4 + glowBonus * 0.2})`);
            iceGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = iceGlow;
            ctx.fill();
            
            // Crystal shape (hexagon)
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = spin + (i * Math.PI / 3);
              const x = px + Math.cos(angle) * baseRadius;
              const y = py + Math.sin(angle) * baseRadius;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            const crystalGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius);
            crystalGrad.addColorStop(0, '#fff');
            crystalGrad.addColorStop(0.5, '#a5f3fc');
            crystalGrad.addColorStop(1, '#0891b2');
            ctx.fillStyle = crystalGrad;
            ctx.fill();
            
            // Sparkles at higher levels
            if (level >= 5) {
              ctx.fillStyle = '#fff';
              for (let i = 0; i < 4; i++) {
                const sparkAngle = time * 8 + i * Math.PI / 2;
                const sparkDist = baseRadius + 8;
                ctx.beginPath();
                ctx.arc(px + Math.cos(sparkAngle) * sparkDist, py + Math.sin(sparkAngle) * sparkDist, 2, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          } else if (spellId === 'blizzard') {
            // Blizzard - swirling ice
            ctx.beginPath();
            ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#67e8f9';
            ctx.fill();
            // Snowflakes
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
              const angle = time * 2 + i * Math.PI / 3;
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(px + Math.cos(angle) * baseRadius * 0.8, py + Math.sin(angle) * baseRadius * 0.8);
              ctx.stroke();
            }
          } else {
            ctx.beginPath();
            ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = proj.color || '#22d3ee';
            ctx.fill();
          }
        }
        // ========== ARCANIST SPELLS ==========
        else if (ownerClass === 'arcanist') {
          if (spellId === 'arcanemissile') {
            // Arcane missile - magical energy with runes
            const pulse = Math.sin(time * 15) * 0.2 + 1;
            
            // Outer magic glow
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 15, 0, Math.PI * 2);
            const arcaneGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 15);
            arcaneGlow.addColorStop(0, `rgba(168,85,247,${0.5 + glowBonus * 0.3})`);
            arcaneGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = arcaneGlow;
            ctx.fill();
            
            // Core energy
            ctx.beginPath();
            ctx.arc(px, py, baseRadius * pulse, 0, Math.PI * 2);
            const coreGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius);
            coreGrad.addColorStop(0, '#fff');
            coreGrad.addColorStop(0.4, '#e879f9');
            coreGrad.addColorStop(1, '#7c3aed');
            ctx.fillStyle = coreGrad;
            ctx.fill();
            
            // Orbiting runes at higher levels
            if (level >= 3) {
              const numRunes = Math.min(3, Math.floor(level / 3));
              ctx.strokeStyle = '#c084fc';
              ctx.lineWidth = 1.5;
              for (let i = 0; i < numRunes; i++) {
                const angle = time * 4 + (i * Math.PI * 2 / numRunes);
                const rx = px + Math.cos(angle) * (baseRadius + 10);
                const ry = py + Math.sin(angle) * (baseRadius + 10);
                ctx.beginPath();
                ctx.arc(rx, ry, 4, 0, Math.PI * 2);
                ctx.stroke();
              }
            }
          } else {
            ctx.beginPath();
            ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = proj.color || '#a855f7';
            ctx.fill();
          }
        }
        // ========== DEFAULT/OTHER SPELLS ==========
        else {
          // Default glow
          ctx.beginPath();
          ctx.arc(px, py, baseRadius + 10, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 10);
          grad.addColorStop(0, proj.color || '#fff');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fill();

          // Core
          ctx.beginPath();
          ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
        }
        
        ctx.restore();
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
        // Use skin color if available, otherwise class color
        const skin = DEFAULT_SKINS.find(s => s.id === player.selectedSkin);
        const classColor = skin?.color || (classes[player.class] || DEFAULT_CLASSES[player.class])?.color || '#fff';
        const isVoidlord = player.class === 'voidlord';
        const bob = player.state === 'walk' ? Math.sin((player.animFrame || 0) * Math.PI / 2) * 2 : 0;

        // Voidlord special aura
        if (isVoidlord) {
          const time = Date.now() / 1000;
          const pulseSize = 35 + Math.sin(time * 3) * 8;
          
          // Void aura
          const gradient = ctx.createRadialGradient(px, py, 0, px, py, pulseSize);
          gradient.addColorStop(0, 'rgba(255,0,255,0.3)');
          gradient.addColorStop(0.5, 'rgba(26,10,46,0.2)');
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Orbiting void particles
          for (let i = 0; i < 4; i++) {
            const angle = time * 2 + (i * Math.PI / 2);
            const orbitX = px + Math.cos(angle) * 25;
            const orbitY = py + Math.sin(angle) * 15 - 10;
            ctx.beginPath();
            ctx.arc(orbitX, orbitY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ff00ff';
            ctx.fill();
          }
        }

        // Shadow
        ctx.beginPath();
        ctx.ellipse(px, py + 12, isVoidlord ? 20 : 16, isVoidlord ? 10 : 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = isVoidlord ? 'rgba(255,0,255,0.4)' : 'rgba(0,0,0,0.3)';
        ctx.fill();

        // Robe
        ctx.fillStyle = isVoidlord ? '#1a0a2e' : classColor;
        ctx.beginPath();
        ctx.moveTo(px, py - 12 - bob);
        ctx.lineTo(px - 14, py + 14);
        ctx.lineTo(px + 14, py + 14);
        ctx.closePath();
        ctx.fill();
        
        // Voidlord robe glow edge
        if (isVoidlord) {
          ctx.strokeStyle = '#ff00ff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Head
        ctx.beginPath();
        ctx.arc(px, py - 18 - bob, 11, 0, Math.PI * 2);
        ctx.fillStyle = isVoidlord ? '#2d1b4e' : '#fcd5ce';
        ctx.fill();

        // Hat
        ctx.fillStyle = isVoidlord ? '#1a0a2e' : classColor;
        ctx.beginPath();
        ctx.moveTo(px, py - 42 - bob);
        ctx.lineTo(px - 16, py - 16 - bob);
        ctx.lineTo(px + 16, py - 16 - bob);
        ctx.closePath();
        ctx.fill();
        
        // Voidlord hat glow
        if (isVoidlord) {
          ctx.strokeStyle = '#ff00ff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Eyes
        ctx.fillStyle = isVoidlord ? '#ff00ff' : '#333';
        ctx.beginPath();
        ctx.arc(px - 3, py - 19 - bob, isVoidlord ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + 3, py - 19 - bob, isVoidlord ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();

        // Name & level
        if (isVoidlord) {
          // Void lord special name with glow
          ctx.shadowColor = '#ff00ff';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#ff00ff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👑 ' + player.name, px, py + 28);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ff00ff';
          ctx.font = '10px sans-serif';
          ctx.fillText('VOID LORD', px, py + 40);
        } else {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(player.name, px, py + 28);
          ctx.fillStyle = '#ffd93d';
          ctx.font = '10px sans-serif';
          ctx.fillText('Lv.' + player.level, px, py + 40);
        }

        // Health bar
        if (!isMe || player.health < player.maxHealth) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(px - 19, py - 51 - bob, 38, 7);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(px - 18, py - 50 - bob, 36, 5);
          ctx.fillStyle = isVoidlord ? '#ff00ff' : '#ef4444';
          ctx.fillRect(px - 18, py - 50 - bob, 36 * player.health / player.maxHealth, 5);
        }

        // Selection ring for self
        if (isMe) {
          ctx.beginPath();
          ctx.arc(px, py, 28, 0, Math.PI * 2);
          ctx.strokeStyle = (isVoidlord ? '#ff00ff' : classColor) + '50';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Healing effect when in sanctuary
        if (player.isHealing) {
          const healTime = Date.now() / 300;
          
          // Rising heal particles
          for (let i = 0; i < 4; i++) {
            const offset = (healTime + i * 0.5) % 2;
            const hx = px + Math.sin(healTime * 2 + i * 1.5) * 12;
            const hy = py - 10 - offset * 35;
            const alpha = 1 - offset / 2;
            
            ctx.beginPath();
            ctx.arc(hx, hy, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
            ctx.fill();
          }
          
          // Plus sign above head
          const plusY = py - 55 - bob + Math.sin(healTime * 3) * 3;
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(px - 5, plusY - 2, 10, 4);
          ctx.fillRect(px - 2, plusY - 5, 4, 10);
          
          // Glow effect
          ctx.beginPath();
          ctx.arc(px, py, 35, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(34, 197, 94, ${0.1 + Math.sin(healTime * 2) * 0.05})`;
          ctx.fill();
        }

        // Emote animation
        if (player.emote && player.emoteStart) {
          const emoteTime = (Date.now() - player.emoteStart) / 1000;
          const emoteY = py - 60 - bob - Math.sin(emoteTime * 5) * 3;
          
          const emoteEmojis = {
            wave: '👋',
            dance: '💃',
            cheer: '🎉',
            spin: '🌀',
            sit: '🧘',
            laugh: '😂',
          };
          
          const emoji = emoteEmojis[player.emote] || '❓';
          
          // Emote bubble
          ctx.beginPath();
          ctx.arc(px, emoteY, 18, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fill();
          ctx.strokeStyle = '#ffd93d';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Emoji
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(emoji, px, emoteY);
          ctx.textBaseline = 'alphabetic';
          
          // Spin animation for spin emote
          if (player.emote === 'spin') {
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(emoteTime * 8);
            ctx.translate(-px, -py);
          }
          
          // Dance animation for dance emote (side sway)
          if (player.emote === 'dance') {
            // Already drawn player, but add sparkles
            for (let i = 0; i < 3; i++) {
              const sparkleAngle = emoteTime * 4 + i * 2;
              const sparkleX = px + Math.cos(sparkleAngle) * 25;
              const sparkleY = py + Math.sin(sparkleAngle) * 15 - 10;
              ctx.beginPath();
              ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
              ctx.fillStyle = '#ffd93d';
              ctx.fill();
            }
          }
          
          if (player.emote === 'spin') {
            ctx.restore();
          }
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
        } else if (ef.type === 'voidRift') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const time = elapsed / 1000;
          const baseRadius = ef.radius * Math.min(1, progress * 3);
          
          // Outer swirling void ring
          ctx.save();
          ctx.translate(ex, ey);
          ctx.rotate(time * 2);
          
          // Pulsing gradient background
          const pulseSize = baseRadius * (0.9 + Math.sin(time * 5) * 0.1);
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize);
          gradient.addColorStop(0, 'rgba(139,0,139,0.6)');
          gradient.addColorStop(0.4, 'rgba(75,0,130,0.4)');
          gradient.addColorStop(0.7, 'rgba(255,0,255,0.2)');
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Swirling tendrils
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
            const cp1x = Math.cos(angle + 0.5) * baseRadius * 0.6;
            const cp1y = Math.sin(angle + 0.5) * baseRadius * 0.6;
            const cp2x = Math.cos(angle + 1) * baseRadius * 0.8;
            const cp2y = Math.sin(angle + 1) * baseRadius * 0.8;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, Math.cos(angle + 1.5) * baseRadius, Math.sin(angle + 1.5) * baseRadius);
            ctx.strokeStyle = `rgba(255,0,255,${0.4 * alpha})`;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          
          ctx.restore();
          
          // Inner void eye
          const innerGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, 30);
          innerGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
          innerGrad.addColorStop(0.5, 'rgba(75,0,130,0.6)');
          innerGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(ex, ey, 30, 0, Math.PI * 2);
          ctx.fillStyle = innerGrad;
          ctx.fill();
          
          // Outer ring
          ctx.beginPath();
          ctx.arc(ex, ey, baseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,0,255,${0.5 * alpha})`;
          ctx.lineWidth = 4;
          ctx.stroke();
        } else if (ef.type === 'trail') {
          ctx.beginPath();
          ctx.moveTo(ef.startX - cx, ef.startY - cy);
          ctx.lineTo(ef.endX - cx, ef.endY - cy);
          ctx.strokeStyle = ef.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
          ctx.lineWidth = 20 * alpha;
          ctx.lineCap = 'round';
          ctx.stroke();
        } else if (ef.type === 'bossExplosion') {
          // Epic boss death animation
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          
          // Get boss color based on type
          const bossColors = {
            blossom_behemoth: ['#ec4899', '#f472b6', '#22c55e'],
            ancient_treant: ['#166534', '#84cc16', '#a16207'],
            magma_titan: ['#f97316', '#dc2626', '#fbbf24'],
            frost_wyrm: ['#22d3ee', '#67e8f9', '#fff'],
            void_overlord: ['#7c3aed', '#581c87', '#c084fc'],
            crystal_golem: ['#ec4899', '#f0abfc', '#fff'],
            boss_meadow: ['#ec4899', '#f472b6', '#22c55e'],
            boss_forest: ['#166534', '#84cc16', '#a16207'],
            boss_volcanic: ['#f97316', '#dc2626', '#fbbf24'],
            boss_frozen: ['#22d3ee', '#67e8f9', '#fff'],
            boss_abyss: ['#7c3aed', '#581c87', '#c084fc'],
            boss_crystal: ['#ec4899', '#f0abfc', '#fff'],
          };
          const colors = bossColors[ef.bossType] || ['#fbbf24', '#f97316', '#fff'];
          
          // Phase 1: Expanding rings (0-40%)
          if (progress < 0.4) {
            const ringProgress = progress / 0.4;
            for (let i = 0; i < 3; i++) {
              const ringSize = 50 + ringProgress * 200 * (i + 1);
              const ringAlpha = (1 - ringProgress) * 0.8;
              ctx.beginPath();
              ctx.arc(ex, ey, ringSize, 0, Math.PI * 2);
              ctx.strokeStyle = colors[i % colors.length];
              ctx.globalAlpha = ringAlpha;
              ctx.lineWidth = 8 - i * 2;
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
          
          // Phase 2: Particle explosion (20-80%)
          if (progress > 0.1 && progress < 0.8) {
            const particleProgress = (progress - 0.1) / 0.7;
            const numParticles = 24;
            for (let i = 0; i < numParticles; i++) {
              const angle = (i / numParticles) * Math.PI * 2 + progress * 2;
              const dist = 30 + particleProgress * 250;
              const px = ex + Math.cos(angle) * dist;
              const py = ey + Math.sin(angle) * dist;
              const size = (1 - particleProgress) * 12;
              
              ctx.beginPath();
              ctx.arc(px, py, size, 0, Math.PI * 2);
              ctx.fillStyle = colors[i % colors.length];
              ctx.globalAlpha = (1 - particleProgress) * 0.9;
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
          
          // Phase 3: Central flash (0-30%)
          if (progress < 0.3) {
            const flashProgress = progress / 0.3;
            const flashSize = 80 * (1 - flashProgress * 0.5);
            const flashGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, flashSize);
            flashGrad.addColorStop(0, `rgba(255,255,255,${(1 - flashProgress) * 0.9})`);
            flashGrad.addColorStop(0.3, colors[0] + Math.floor((1 - flashProgress) * 200).toString(16).padStart(2, '0'));
            flashGrad.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(ex, ey, flashSize, 0, Math.PI * 2);
            ctx.fillStyle = flashGrad;
            ctx.fill();
          }
          
          // Phase 4: Skull/icon fade (40-100%)
          if (progress > 0.4) {
            const skullProgress = (progress - 0.4) / 0.6;
            const skullAlpha = Math.sin(skullProgress * Math.PI) * 0.8;
            ctx.font = `${60 - skullProgress * 20}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = skullAlpha;
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('💀', ex, ey - skullProgress * 30);
            ctx.globalAlpha = 1;
          }
        } else if (ef.type === 'teleport') {
          // Portal teleportation effect
          const tx = ef.x - cx;
          const ty = ef.y - cy;
          const color = ef.color || '#a855f7';
          
          // Shrinking/expanding ring based on entering/exiting
          const ringRadius = ef.entering 
            ? 80 * progress 
            : 80 * (1 - progress);
          
          // Multiple rings
          for (let i = 0; i < 3; i++) {
            const radius = ef.entering
              ? ringRadius * (0.5 + i * 0.25)
              : ringRadius * (1 - i * 0.15);
            
            if (radius > 0) {
              ctx.beginPath();
              ctx.arc(tx, ty, radius, 0, Math.PI * 2);
              ctx.strokeStyle = color;
              ctx.globalAlpha = alpha * (1 - i * 0.2);
              ctx.lineWidth = 4 - i;
              ctx.stroke();
            }
          }
          ctx.globalAlpha = 1;
          
          // Spiraling particles
          const particleCount = 10;
          for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + progress * Math.PI * 3;
            const dist = ef.entering
              ? ringRadius * (1 - progress * 0.3)
              : ringRadius * progress;
            
            const px = tx + Math.cos(angle) * dist;
            const py = ty + Math.sin(angle) * dist;
            
            ctx.beginPath();
            ctx.arc(px, py, 3 * alpha, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (ef.type === 'recallDepart') {
          // Recall departure - green spiral shrinking in
          const rx = ef.x - cx;
          const ry = ef.y - cy;
          const radius = 60 * (1 - progress);
          
          // Swirling green particles getting sucked in
          ctx.globalAlpha = alpha;
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + progress * Math.PI * 4;
            const dist = radius * (1 - progress * 0.5);
            const px = rx + Math.cos(angle) * dist;
            const py = ry + Math.sin(angle) * dist - progress * 20;
            
            ctx.beginPath();
            ctx.arc(px, py, 4 * alpha, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${140 + i * 10}, 80%, ${50 + progress * 30}%)`;
            ctx.fill();
          }
          
          // Central glow
          const glow = ctx.createRadialGradient(rx, ry - progress * 20, 0, rx, ry, radius);
          glow.addColorStop(0, `rgba(34, 197, 94, ${0.8 * alpha})`);
          glow.addColorStop(0.5, `rgba(34, 197, 94, ${0.3 * alpha})`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(rx, ry - progress * 20, radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Home icon rising up
          ctx.font = `${20 + progress * 15}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillText('🏠', rx, ry - progress * 50);
          ctx.globalAlpha = 1;
        } else if (ef.type === 'recallArrive') {
          // Recall arrival - green burst expanding out
          const rx = ef.x - cx;
          const ry = ef.y - cy;
          const radius = 80 * progress;
          
          // Expanding green ring
          ctx.beginPath();
          ctx.arc(rx, ry, radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#22c55e';
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 6 * alpha;
          ctx.stroke();
          
          // Inner rings
          for (let i = 1; i <= 2; i++) {
            ctx.beginPath();
            ctx.arc(rx, ry, radius * (1 - i * 0.25), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(134, 239, 172, ${alpha * (1 - i * 0.3)})`;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          
          // Sparkles bursting out
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = radius * 0.8;
            const px = rx + Math.cos(angle) * dist;
            const py = ry + Math.sin(angle) * dist;
            
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = alpha;
            ctx.fill();
          }
          
          // Central flash
          if (progress < 0.3) {
            const flashAlpha = (1 - progress / 0.3) * 0.6;
            ctx.beginPath();
            ctx.arc(rx, ry, 30, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (ef.type === 'freezeBurst') {
          // Freeze burst effect from Permafrost upgrade
          const fx = ef.x - cx;
          const fy = ef.y - cy;
          
          // Expanding ice ring
          const ringRadius = 30 * progress + 10;
          ctx.beginPath();
          ctx.arc(fx, fy, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = '#67e8f9';
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 4 * alpha;
          ctx.stroke();
          
          // Ice crystals bursting outward
          const crystalCount = 8;
          for (let i = 0; i < crystalCount; i++) {
            const angle = (i / crystalCount) * Math.PI * 2;
            const dist = 20 + progress * 40;
            const crx = fx + Math.cos(angle) * dist;
            const cry = fy + Math.sin(angle) * dist;
            
            ctx.save();
            ctx.translate(crx, cry);
            ctx.rotate(angle + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -6 * alpha);
            ctx.lineTo(3, 0);
            ctx.lineTo(0, 6 * alpha);
            ctx.lineTo(-3, 0);
            ctx.closePath();
            ctx.fillStyle = '#22d3ee';
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.restore();
          }
          
          // Central flash
          if (progress < 0.3) {
            const flashAlpha = (0.3 - progress) / 0.3;
            ctx.beginPath();
            ctx.arc(fx, fy, 25, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.6})`;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (ef.type === 'empowered') {
          // Empowered hit effect (Mana Surge triple damage)
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          
          // Star burst effect
          const rays = 6;
          for (let i = 0; i < rays; i++) {
            const angle = (i / rays) * Math.PI * 2 + progress * Math.PI;
            const innerR = 10;
            const outerR = 30 + progress * 20;
            
            ctx.beginPath();
            ctx.moveTo(ex + Math.cos(angle) * innerR, ey + Math.sin(angle) * innerR);
            ctx.lineTo(ex + Math.cos(angle) * outerR, ey + Math.sin(angle) * outerR);
            ctx.strokeStyle = '#c084fc';
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 3 * alpha;
            ctx.stroke();
          }
          
          // Central glow
          const glowGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, 25);
          glowGrad.addColorStop(0, `rgba(192, 132, 252, ${alpha * 0.8})`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(ex, ey, 25, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();
          
          // "3x" text
          if (progress < 0.6) {
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffd93d';
            ctx.globalAlpha = alpha;
            ctx.fillText('3x', ex, ey - 20 - progress * 20);
          }
          ctx.globalAlpha = 1;
        } else if (ef.type === 'dragonBreath') {
          // Dragon flame breath - cone of fire
          const dx = ef.x - cx;
          const dy = ef.y - cy;
          const angle = ef.angle;
          const range = ef.range * progress;
          const coneAngle = Math.PI / 3; // 60 degrees
          
          // Draw flame cone
          ctx.save();
          ctx.translate(dx, dy);
          ctx.rotate(angle);
          
          // Multiple flame layers
          for (let layer = 0; layer < 3; layer++) {
            const layerRange = range * (1 - layer * 0.2);
            const layerAngle = coneAngle * (1 - layer * 0.15);
            
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, layerRange);
            if (layer === 0) {
              gradient.addColorStop(0, `rgba(255, 200, 50, ${0.9 * alpha})`);
              gradient.addColorStop(0.5, `rgba(255, 100, 0, ${0.6 * alpha})`);
              gradient.addColorStop(1, `rgba(255, 50, 0, ${0.1 * alpha})`);
            } else if (layer === 1) {
              gradient.addColorStop(0, `rgba(255, 150, 0, ${0.7 * alpha})`);
              gradient.addColorStop(1, `rgba(200, 50, 0, ${0 * alpha})`);
            } else {
              gradient.addColorStop(0, `rgba(255, 255, 200, ${0.5 * alpha})`);
              gradient.addColorStop(1, 'transparent');
            }
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, layerRange, -layerAngle / 2, layerAngle / 2);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
          }
          
          // Fire particles
          for (let i = 0; i < 15; i++) {
            const pDist = Math.random() * range;
            const pAngle = (Math.random() - 0.5) * coneAngle * 0.8;
            const px = Math.cos(pAngle) * pDist;
            const py = Math.sin(pAngle) * pDist;
            const pSize = 3 + Math.random() * 5;
            
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, ${150 + Math.random() * 100}, 0, ${alpha * 0.8})`;
            ctx.fill();
          }
          
          ctx.restore();
          
        } else if (ef.type === 'dragonWingGust') {
          // Wing gust - expanding wind wave
          const wx = ef.x - cx;
          const wy = ef.y - cy;
          const radius = ef.radius * progress;
          
          // Wind rings expanding outward
          for (let i = 0; i < 3; i++) {
            const ringRadius = radius * (1 - i * 0.2);
            ctx.beginPath();
            ctx.arc(wx, wy, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 200, 255, ${alpha * (1 - i * 0.3)})`;
            ctx.lineWidth = 4 - i;
            ctx.stroke();
          }
          
          // Wind particles
          for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const dist = radius * 0.5 + Math.random() * radius * 0.5;
            const px = wx + Math.cos(angle) * dist;
            const py = wy + Math.sin(angle) * dist;
            
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + Math.cos(angle) * 15, py + Math.sin(angle) * 15);
            ctx.strokeStyle = `rgba(200, 220, 255, ${alpha * 0.6})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          
        } else if (ef.type === 'dragonTailSwipe') {
          // Tail swipe - arc damage indicator
          const tx = ef.x - cx;
          const ty = ef.y - cy;
          const radius = ef.radius;
          
          // Swipe arc
          ctx.beginPath();
          ctx.arc(tx, ty, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(139, 69, 19, ${0.4 * alpha})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
          ctx.lineWidth = 6;
          ctx.stroke();
          
          // Impact lines
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + progress * Math.PI;
            ctx.beginPath();
            ctx.moveTo(tx + Math.cos(angle) * 30, ty + Math.sin(angle) * 30);
            ctx.lineTo(tx + Math.cos(angle) * radius, ty + Math.sin(angle) * radius);
            ctx.strokeStyle = `rgba(255, 150, 50, ${alpha * 0.7})`;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          
        } else if (ef.type === 'dragonRage') {
          // Rage mode - screen-filling fire effect
          const rx = ef.x - cx;
          const ry = ef.y - cy;
          
          // Pulsing red overlay
          const pulseAlpha = 0.1 + Math.sin(progress * Math.PI * 6) * 0.05;
          ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha * alpha})`;
          ctx.fillRect(0, 0, width, height);
          
          // Central fire burst
          const burstRadius = 200 + progress * 100;
          const fireGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, burstRadius);
          fireGrad.addColorStop(0, `rgba(255, 200, 0, ${0.8 * alpha})`);
          fireGrad.addColorStop(0.3, `rgba(255, 100, 0, ${0.5 * alpha})`);
          fireGrad.addColorStop(0.6, `rgba(200, 50, 0, ${0.3 * alpha})`);
          fireGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(rx, ry, burstRadius, 0, Math.PI * 2);
          ctx.fillStyle = fireGrad;
          ctx.fill();
          
          // Flying embers everywhere
          for (let i = 0; i < 30; i++) {
            const emberAngle = Math.random() * Math.PI * 2;
            const emberDist = 50 + Math.random() * 300;
            const emberX = rx + Math.cos(emberAngle) * emberDist;
            const emberY = ry + Math.sin(emberAngle) * emberDist - progress * 50;
            
            ctx.beginPath();
            ctx.arc(emberX, emberY, 2 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, ${100 + Math.random() * 155}, 0, ${alpha})`;
            ctx.fill();
          }
        }
        
        // === DRAGON DEATH EFFECT ===
        else if (ef.type === 'dragonDeath') {
          const dx = ef.x - cx;
          const dy = ef.y - cy;
          
          // Epic golden flash at start
          if (progress < 0.2) {
            const flashAlpha = (0.2 - progress) * 2.5 * alpha;
            ctx.fillStyle = `rgba(251, 191, 36, ${flashAlpha})`;
            ctx.fillRect(0, 0, width, height);
          }
          
          // Massive expanding rings
          for (let i = 0; i < 5; i++) {
            const ringProgress = Math.max(0, progress - i * 0.1);
            const ringRadius = ringProgress * 500;
            const ringAlpha = Math.max(0, (1 - ringProgress) * alpha);
            
            ctx.strokeStyle = i % 2 === 0 ? `rgba(251, 191, 36, ${ringAlpha})` : `rgba(249, 115, 22, ${ringAlpha})`;
            ctx.lineWidth = 8 - i;
            ctx.beginPath();
            ctx.arc(dx, dy, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // Explosion particles
          for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2 + progress * 2;
            const dist = progress * 400 * (0.5 + Math.random() * 0.5);
            const px = dx + Math.cos(angle) * dist;
            const py = dy + Math.sin(angle) * dist - progress * 100;
            const size = 5 + Math.random() * 10;
            
            const colors = ['#fbbf24', '#f97316', '#dc2626', '#7f1d1d'];
            ctx.fillStyle = colors[i % colors.length];
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          
          // Victory text
          if (progress > 0.3) {
            const textAlpha = Math.min(1, (progress - 0.3) * 2) * alpha;
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = `rgba(251, 191, 36, ${textAlpha})`;
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.fillText('🐉 DRAGON SLAIN! 🐉', width / 2, height / 2 - 50);
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = `rgba(253, 224, 71, ${textAlpha})`;
            ctx.fillText(`Slain by ${ef.killerName}`, width / 2, height / 2 + 10);
            ctx.shadowBlur = 0;
          }
        }
        
        // === MINI-BOSS EFFECTS ===
        else if (ef.type === 'minotaurCharge') {
          // Charge trail effect
          const sx = ef.x - cx;
          const sy = ef.y - cy;
          const tx = ef.targetX - cx;
          const ty = ef.targetY - cy;
          
          // Dust trail
          ctx.strokeStyle = `rgba(120, 53, 15, ${0.6 * alpha})`;
          ctx.lineWidth = 30;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + (tx - sx) * progress, sy + (ty - sy) * progress);
          ctx.stroke();
          
          // Impact warning at target
          ctx.strokeStyle = `rgba(220, 38, 38, ${0.5 + Math.sin(elapsed / 50) * 0.3})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(tx, ty, 40 + Math.sin(elapsed / 100) * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        else if (ef.type === 'minotaurImpact') {
          const mx = ef.x - cx;
          const my = ef.y - cy;
          const impactRadius = progress * 80;
          
          // Ground crack effect
          ctx.strokeStyle = `rgba(78, 53, 15, ${alpha})`;
          ctx.lineWidth = 4;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(mx + Math.cos(angle) * impactRadius, my + Math.sin(angle) * impactRadius);
            ctx.stroke();
          }
          
          // Dust cloud
          ctx.fillStyle = `rgba(120, 53, 15, ${0.5 * alpha})`;
          ctx.beginPath();
          ctx.arc(mx, my, impactRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        else if (ef.type === 'lichSummon') {
          const lx = ef.x - cx;
          const ly = ef.y - cy;
          
          // Purple summoning circle
          ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
          ctx.lineWidth = 3;
          const circleRadius = 60 * (1 - progress * 0.3);
          ctx.beginPath();
          ctx.arc(lx, ly, circleRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner pentagram
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2 + elapsed / 500;
            const nextAngle = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2 + elapsed / 500;
            ctx.moveTo(lx + Math.cos(angle) * circleRadius * 0.8, ly + Math.sin(angle) * circleRadius * 0.8);
            ctx.lineTo(lx + Math.cos(nextAngle) * circleRadius * 0.8, ly + Math.sin(nextAngle) * circleRadius * 0.8);
          }
          ctx.stroke();
          
          // Rising spirits
          for (let i = 0; i < 5; i++) {
            const spiritY = ly - progress * 80 - i * 15;
            const spiritX = lx + Math.sin(elapsed / 100 + i) * 20;
            ctx.fillStyle = `rgba(165, 180, 252, ${alpha * (1 - i * 0.15)})`;
            ctx.beginPath();
            ctx.arc(spiritX, spiritY, 8 - i, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        else if (ef.type === 'lichDeathWave') {
          const lx = ef.x - cx;
          const ly = ef.y - cy;
          const waveRadius = progress * (ef.radius || 150);
          
          // Expanding death wave
          const waveGrad = ctx.createRadialGradient(lx, ly, waveRadius * 0.5, lx, ly, waveRadius);
          waveGrad.addColorStop(0, 'transparent');
          waveGrad.addColorStop(0.7, `rgba(99, 102, 241, ${0.4 * alpha})`);
          waveGrad.addColorStop(1, `rgba(30, 27, 75, ${0.6 * alpha})`);
          ctx.fillStyle = waveGrad;
          ctx.beginPath();
          ctx.arc(lx, ly, waveRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Skull particles
          ctx.font = '16px Arial';
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + elapsed / 200;
            const dist = waveRadius * 0.7;
            ctx.fillText('💀', lx + Math.cos(angle) * dist - 8, ly + Math.sin(angle) * dist + 8);
          }
        }
        
        // === CLASS ABILITY EFFECTS ===
        else if (ef.type === 'flameShield') {
          // Find the player to draw around
          const player = players?.find(p => p.id === ef.playerId);
          if (player) {
            const px = player.x - cx;
            const py = player.y - cy;
            const pulseSize = 80 + Math.sin(elapsed / 100) * 10;
            
            // Rotating flames
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(elapsed / 500);
            
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2;
              const flameX = Math.cos(angle) * pulseSize;
              const flameY = Math.sin(angle) * pulseSize;
              const flameH = 20 + Math.sin(elapsed / 100 + i) * 8;
              
              ctx.beginPath();
              ctx.moveTo(flameX, flameY);
              ctx.quadraticCurveTo(flameX * 1.2, flameY * 1.2 - flameH, flameX * 1.3, flameY * 1.3);
              ctx.strokeStyle = `rgba(255, ${100 + i * 10}, 0, ${0.8 * alpha})`;
              ctx.lineWidth = 4;
              ctx.stroke();
            }
            ctx.restore();
            
            // Inner glow
            const gradient = ctx.createRadialGradient(px, py, 0, px, py, pulseSize);
            gradient.addColorStop(0, 'rgba(255, 150, 50, 0.3)');
            gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.1)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        else if (ef.type === 'frostNova') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const cr = ef.radius * progress;
          
          // Expanding ice ring
          ctx.beginPath();
          ctx.arc(ex, ey, cr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
          ctx.lineWidth = 10 * alpha;
          ctx.stroke();
          
          // Ice crystals
          for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2 + elapsed / 200;
            const crystalX = ex + Math.cos(angle) * cr * 0.8;
            const crystalY = ey + Math.sin(angle) * cr * 0.8;
            
            ctx.beginPath();
            ctx.moveTo(crystalX, crystalY - 8);
            ctx.lineTo(crystalX - 4, crystalY + 4);
            ctx.lineTo(crystalX + 4, crystalY + 4);
            ctx.closePath();
            ctx.fillStyle = `rgba(135, 206, 235, ${alpha})`;
            ctx.fill();
          }
        }
        
        else if (ef.type === 'glacialStorm') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const time = elapsed / 1000;
          
          // Swirling blizzard
          ctx.save();
          ctx.translate(ex, ey);
          ctx.rotate(time * 2);
          
          // Outer storm
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ef.radius);
          gradient.addColorStop(0, 'rgba(135, 206, 250, 0.4)');
          gradient.addColorStop(0.5, 'rgba(100, 180, 255, 0.2)');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, ef.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Snow particles
          for (let i = 0; i < 30; i++) {
            const particleAngle = (i / 30) * Math.PI * 2 + time * 3;
            const particleDist = 30 + (i % 3) * (ef.radius / 3);
            const px = Math.cos(particleAngle) * particleDist;
            const py = Math.sin(particleAngle) * particleDist;
            
            ctx.beginPath();
            ctx.arc(px, py, 2 + Math.sin(time * 10 + i) * 1, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
          }
          ctx.restore();
        }
        
        else if (ef.type === 'blink') {
          // Start position - fading purple cloud
          const fromX = ef.fromX - cx;
          const fromY = ef.fromY - cy;
          const toX = ef.toX - cx;
          const toY = ef.toY - cy;
          
          // Trail between positions
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.strokeStyle = `rgba(155, 93, 229, ${alpha * 0.5})`;
          ctx.lineWidth = 20 * alpha;
          ctx.stroke();
          
          // Arrival sparkles
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 30 * progress;
            ctx.beginPath();
            ctx.arc(toX + Math.cos(angle) * dist, toY + Math.sin(angle) * dist, 3 * alpha, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(224, 86, 253, ${alpha})`;
            ctx.fill();
          }
        }
        
        else if (ef.type === 'inferno') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const pulseProgress = Math.min(1, progress * 3);
          const size = ef.radius * pulseProgress;
          
          // Massive fire explosion
          const gradient = ctx.createRadialGradient(ex, ey, 0, ex, ey, size);
          gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
          gradient.addColorStop(0.2, `rgba(255, 150, 50, ${alpha * 0.8})`);
          gradient.addColorStop(0.5, `rgba(255, 50, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(ex, ey, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Fire tongues
          for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const tongueLen = size * 0.3 + Math.sin(elapsed / 50 + i * 2) * 20;
            const tx = ex + Math.cos(angle) * size;
            const ty = ey + Math.sin(angle) * size;
            
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(angle) * tongueLen, ty + Math.sin(angle) * tongueLen);
            ctx.strokeStyle = `rgba(255, ${100 + i * 5}, 0, ${alpha})`;
            ctx.lineWidth = 6 * alpha;
            ctx.stroke();
          }
        }
        
        else if (ef.type === 'staticField') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const pulseSize = ef.radius * (0.5 + progress * 0.5);
          
          // Electric field
          ctx.beginPath();
          ctx.arc(ex, ey, pulseSize, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Lightning bolts
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + elapsed / 100;
            const startX = ex + Math.cos(angle) * 20;
            const startY = ey + Math.sin(angle) * 20;
            const endX = ex + Math.cos(angle) * pulseSize;
            const endY = ey + Math.sin(angle) * pulseSize;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            // Jagged lightning
            for (let j = 0; j < 5; j++) {
              const nextX = startX + (endX - startX) * ((j + 1) / 5) + (Math.random() - 0.5) * 15;
              const nextY = startY + (endY - startY) * ((j + 1) / 5) + (Math.random() - 0.5) * 15;
              ctx.lineTo(nextX, nextY);
            }
            ctx.strokeStyle = `rgba(255, 255, ${150 + Math.random() * 105}, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        
        else if (ef.type === 'timeWarp') {
          const player = players?.find(p => p.id === ef.playerId);
          if (player) {
            const px = player.x - cx;
            const py = player.y - cy;
            
            // Golden time aura
            const gradient = ctx.createRadialGradient(px, py, 0, px, py, 60);
            gradient.addColorStop(0, 'rgba(212, 175, 55, 0.3)');
            gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(px, py, 60, 0, Math.PI * 2);
            ctx.fill();
            
            // Clock hands
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(elapsed / 100);
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 * alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -25);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(15, 0);
            ctx.stroke();
            ctx.restore();
          }
        }
        
        else if (ef.type === 'thunderGod') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          
          // Massive lightning storm
          const gradient = ctx.createRadialGradient(ex, ey, 0, ex, ey, ef.radius);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`);
          gradient.addColorStop(0.3, `rgba(255, 255, 100, ${alpha * 0.3})`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(ex, ey, ef.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Flash effect
          if (Math.random() > 0.7) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
            ctx.fillRect(0, 0, width, height);
          }
        }
        
        else if (ef.type === 'lightningBolt') {
          const fromX = ef.fromX - cx;
          const fromY = ef.fromY - cy;
          const toX = ef.toX - cx;
          const toY = ef.toY - cy;
          
          // Jagged lightning bolt
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          for (let j = 0; j < 6; j++) {
            const nextX = fromX + (toX - fromX) * ((j + 1) / 6) + (Math.random() - 0.5) * 20;
            const nextY = fromY + (toY - fromY) * ((j + 1) / 6) + (Math.random() - 0.5) * 20;
            ctx.lineTo(nextX, nextY);
          }
          ctx.lineTo(toX, toY);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        
        else if (ef.type === 'apocalypse') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const pulseProgress = Math.min(1, progress * 2);
          const size = ef.radius * pulseProgress;
          
          // Dark void explosion
          const gradient = ctx.createRadialGradient(ex, ey, 0, ex, ey, size);
          gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
          gradient.addColorStop(0.2, `rgba(75, 0, 130, ${alpha * 0.8})`);
          gradient.addColorStop(0.5, `rgba(139, 0, 255, ${alpha * 0.5})`);
          gradient.addColorStop(0.8, `rgba(255, 0, 255, ${alpha * 0.2})`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(ex, ey, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Void tendrils
          ctx.save();
          ctx.translate(ex, ey);
          ctx.rotate(elapsed / 200);
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const tendrilLen = size * 0.4 + Math.sin(elapsed / 100 + i * 2) * 30;
            const tx = Math.cos(angle) * size * 0.8;
            const ty = Math.sin(angle) * size * 0.8;
            
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(angle) * tendrilLen, ty + Math.sin(angle) * tendrilLen);
            ctx.strokeStyle = `rgba(255, 0, 255, ${alpha * 0.8})`;
            ctx.lineWidth = 4 * alpha;
            ctx.stroke();
          }
          ctx.restore();
          
          // Screen flash at start
          if (progress < 0.1) {
            ctx.fillStyle = `rgba(139, 0, 255, ${(0.1 - progress) * 3})`;
            ctx.fillRect(0, 0, width, height);
          }
        }

        return true;
      });

      // Minimap
      if (settingsRef.current.showMinimap && minimapRef.current) {
        const mm = minimapRef.current;
        const mmCtx = mm.getContext('2d');
        const mmW = mm.width;
        const mmH = mm.height;
        
        // Scale to fit world in minimap
        const scale = mmW / WORLD_WIDTH;

        // Clear minimap with dark background
        mmCtx.fillStyle = '#0a0a15';
        mmCtx.fillRect(0, 0, mmW, mmH);

        // Use the same COLORS as the main game for consistency
        const mmZoneColors = {
          sanctuary: COLORS.sanctuary[1],
          meadow: COLORS.meadow[1],
          forest: COLORS.forest[1],
          volcanic: COLORS.volcanic[1],
          frozen: COLORS.frozen[1],
          abyss: COLORS.abyss[1],
          crystal_caves: COLORS.crystal_caves[1],
        };
        
        // Draw tile-based minimap matching main game exactly
        const tileSize = 100; // Smaller tiles for better accuracy
        for (let wx = 0; wx < WORLD_WIDTH; wx += tileSize) {
          for (let wy = 0; wy < WORLD_HEIGHT; wy += tileSize) {
            // Get zone using imported getZoneAtPosition function
            const zone = getZoneAtPosition(wx + tileSize / 2, wy + tileSize / 2);
            
            // Draw tile on minimap
            mmCtx.fillStyle = mmZoneColors[zone] || mmZoneColors.meadow;
            mmCtx.fillRect(
              Math.floor(wx * scale),
              Math.floor(wy * scale),
              Math.ceil(tileSize * scale) + 1,
              Math.ceil(tileSize * scale) + 1
            );
          }
        }
        
        // Draw zone borders for better visibility
        const zoneBorderOrder = ['forest', 'volcanic', 'frozen', 'abyss', 'crystal_caves', 'sanctuary'];
        for (const zoneId of zoneBorderOrder) {
          const polygon = ZONE_POLYGONS[zoneId];
          if (!polygon || polygon.length < 3) continue;
          mmCtx.beginPath();
          mmCtx.moveTo(polygon[0].x * scale, polygon[0].y * scale);
          for (let i = 1; i < polygon.length; i++) {
            mmCtx.lineTo(polygon[i].x * scale, polygon[i].y * scale);
          }
          mmCtx.closePath();
          mmCtx.strokeStyle = 'rgba(255,255,255,0.25)';
          mmCtx.lineWidth = 0.5;
          mmCtx.stroke();
        }
        
        // Draw portals on minimap
        for (const portal of Object.values(PORTAL_POSITIONS)) {
          mmCtx.beginPath();
          mmCtx.arc(portal.from.x * scale, portal.from.y * scale, 2, 0, Math.PI * 2);
          mmCtx.fillStyle = portal.color;
          mmCtx.fill();
        }

        // Enemies on minimap - red dots, bosses are yellow/gold and larger
        for (const e of enemies || []) {
          mmCtx.beginPath();
          mmCtx.arc(e.x * scale, e.y * scale, e.isBoss ? 4 : 1.5, 0, Math.PI * 2);
          mmCtx.fillStyle = e.isBoss ? '#fbbf24' : '#ef4444';
          mmCtx.fill();
        }

        // Players on minimap - CYAN for self (distinct from yellow bosses), blue for others
        for (const p of players || []) {
          if (p.health <= 0) continue;
          const isMe = p.id === playerIdRef.current;
          mmCtx.beginPath();
          mmCtx.arc(p.x * scale, p.y * scale, isMe ? 4 : 3, 0, Math.PI * 2);
          mmCtx.fillStyle = isMe ? '#00ffff' : '#60a5fa';  // Cyan for self, lighter blue for others
          mmCtx.fill();
          // White border for self to make it stand out
          if (isMe) {
            mmCtx.strokeStyle = '#ffffff';
            mmCtx.lineWidth = 1.5;
            mmCtx.stroke();
          }
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
      adminKey: adminKey,
    });
  };

  const handleNewCharacter = () => {
    initAudio();
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
      adminKey: adminKey, // For voidlord access
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
      setShowSkinSelect(false); // Close the modal
    }
    setSelectedSkin(skinId);
  };

  // Styles (generated from createStyles factory)
  const styles = useMemo(() => createStyles(isMobile, settings, screen), [isMobile, settings, screen]);

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
        width={isMobile ? 120 : 180} 
        height={isMobile ? 100 : 150} 
        style={styles.minimap} 
      />

      {/* Loading Screen */}
      <div style={{ ...styles.overlay, ...(screen !== 'loading' ? styles.hidden : {}) }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes dropIn { 
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateX(-50%) translateY(-30px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
          @keyframes pulse { 
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          /* Mobile-specific styles to prevent zoom and selection */
          * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
          }
          body {
            touch-action: manipulation;
            overscroll-behavior: none;
            -webkit-user-select: none;
            user-select: none;
          }
          canvas {
            touch-action: none;
          }
          input, textarea {
            -webkit-user-select: text;
            user-select: text;
          }
        `}</style>
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
              {Object.entries(classes)
                .filter(([id, c]) => !c.hidden || adminKey === 'azoni-voidlord-2026')
                .map(([id, c]) => (
                <div
                  key={id}
                  style={{
                    ...styles.classCard(selectedClass === id, c.color),
                    ...(c.isAdmin ? {
                      background: `linear-gradient(135deg, ${c.color}40, #ff00ff20)`,
                      border: `2px solid ${c.secondaryColor || c.color}`,
                      boxShadow: `0 0 20px ${c.secondaryColor || c.color}40`,
                    } : {}),
                  }}
                  onClick={() => handleClassChange(id)}
                >
                  <div style={styles.classIcon(c.secondaryColor || c.color)}>
                    <span style={styles.classIconSvg}>{CLASS_SVG[id] || SVG.arcane}</span>
                  </div>
                  {c.isAdmin && (
                    <div style={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8, 
                      fontSize: '.6rem', 
                      background: '#ff00ff',
                      color: '#000',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 'bold',
                    }}>ADMIN</div>
                  )}
                  <h3 style={{ color: c.secondaryColor || c.color, marginBottom: 8, fontSize: isMobile ? '.95rem' : '1.1rem' }}>{c.name}</h3>
                  <p style={{ fontSize: isMobile ? '.7rem' : '.8rem', color: '#888', lineHeight: 1.5 }}>{c.description}</p>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a3e' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.7rem', color: '#666', marginBottom: 4 }}>
                      <span style={{ color: c.secondaryColor || c.color, width: 12, height: 12 }}>{SVG.dash}</span>
                      {c.dash || 'Dash'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.7rem', color: '#666' }}>
                      <span style={{ color: c.secondaryColor || c.color, width: 12, height: 12 }}>{SVG.warning}</span>
                      {c.ultimate || 'Ultimate'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Secret Admin Key Input */}
            <div style={{ marginTop: 15 }}>
              <input
                style={{
                  ...styles.input,
                  fontSize: '0.7rem',
                  padding: '8px 12px',
                  background: adminKey ? 'rgba(255,0,255,0.1)' : 'rgba(255,255,255,0.03)',
                  borderColor: adminKey ? '#ff00ff' : 'rgba(255,255,255,0.1)',
                }}
                type="password"
                placeholder="Admin key (optional)"
                value={adminKey}
                onChange={(e) => {
                  setAdminKey(e.target.value);
                  if (e.target.value === 'azoni-voidlord-2026') {
                    setSelectedClass('voidlord');
                    setSelectedSkin('voidlord_default');
                  }
                }}
              />
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
                <span style={styles.key}>Click</span> Click to walk to location<br/>
                <span style={styles.key}>SPACE</span> Dash ability<br/>
                <span style={styles.key}>Q</span> Ultimate ability<br/>
                <span style={{ fontSize: '0.8em', color: '#888' }}>Spells auto-cast at nearby enemies</span>
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
                <span style={styles.settingIcon}>🎵</span> Zone Music
              </label>
              <div
                style={styles.toggle(settings.musicEnabled)}
                onClick={() => {
                  setSettings(s => {
                    const newEnabled = !s.musicEnabled;
                    if (!newEnabled && musicIntervalRef.current) {
                      clearInterval(musicIntervalRef.current);
                      musicIntervalRef.current = null;
                    } else if (newEnabled && lastZoneRef.current) {
                      setTimeout(() => startZoneMusic(lastZoneRef.current), 100);
                    }
                    return { ...s, musicEnabled: newEnabled };
                  });
                }}
              >
                <div style={styles.toggleKnob(settings.musicEnabled)} />
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

            {/* Main Menu Button */}
            <button
              style={{
                width: '100%',
                marginTop: 20,
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 8,
                color: '#ef4444',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onClick={() => {
                if (window.confirm('Return to main menu? Your progress is saved.')) {
                  // Update savedPlayer with current progress so Continue works
                  if (playerInfo) {
                    setSavedPlayer({
                      ...playerInfo,
                      rank: playerInfo.rank || { title: 'Novice' },
                    });
                  }
                  setScreen('returning');
                }
              }}
            >
              <span style={{ width: 16, height: 16 }}>{SVG.home}</span>
              Main Menu
            </button>
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

      {/* Dungeon HUD Overlay */}
      {screen === 'game' && inDungeon && playerInfo && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(20, 10, 10, 0.95), rgba(40, 15, 15, 0.95))',
          backdropFilter: 'blur(10px)',
          padding: '15px 30px',
          borderRadius: 15,
          zIndex: 900,
          border: '2px solid rgba(220, 38, 38, 0.5)',
          textAlign: 'center',
          minWidth: 250,
        }}>
          <div style={{ 
            color: '#f97316', 
            fontWeight: 'bold', 
            fontSize: '1.1rem',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            🐉 Dragon's Gauntlet
          </div>
          
          {/* Progress bar */}
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 6,
            padding: 3,
            marginBottom: 8,
          }}>
            <div style={{
              height: 8,
              background: 'linear-gradient(90deg, #dc2626, #f97316, #fbbf24)',
              borderRadius: 4,
              width: `${Math.min(100, (playerInfo.y || 200) / 46)}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
          
          <div style={{ color: '#a8a29e', fontSize: '0.8rem' }}>
            Depth: {Math.floor((playerInfo.y || 200) / 500)} / 9
            {playerInfo.y > 4200 && (
              <span style={{ color: '#f97316', marginLeft: 10 }}>⚠️ DRAGON LAIR</span>
            )}
          </div>
          
          {/* Exit button (mobile) */}
          {isMobile && playerInfo.y < 300 && (
            <button
              style={{
                marginTop: 10,
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => socketRef.current?.emit('exitDungeon')}
            >
              🏠 Exit Dungeon
            </button>
          )}
        </div>
      )}

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

                {/* Controls Panel */}
                <div style={{
                  marginTop: 15,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: '.7rem', color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Controls
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem' }}>
                      <span style={{ color: '#888' }}>Move</span>
                      <span style={{ color: '#fff' }}>WASD</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem' }}>
                      <span style={{ color: '#888' }}>Attack</span>
                      <span style={{ color: '#4ade80' }}>Auto</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem' }}>
                      <span style={{ color: classes[playerInfo.class]?.color || '#888' }}>Dash</span>
                      <span style={{ color: dashCooldown > 0 ? '#f87171' : '#fff' }}>
                        {dashCooldown > 0 ? 'CD' : 'Space'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem' }}>
                      <span style={{ color: '#ffd93d' }}>Ultimate</span>
                      <span style={{ color: ultCooldown > 0 ? '#f87171' : '#fff' }}>
                        {ultCooldown > 0 ? 'CD' : 'Q'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem' }}>
                      <span style={{ color: '#a78bfa' }}>Emote</span>
                      <span style={{ color: '#fff' }}>T</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem' }}>
                      <span style={{ color: '#888' }}>Interact</span>
                      <span style={{ color: '#fff' }}>E</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem' }}>
                      <span style={{ color: autoAttack ? '#fbbf24' : '#666' }}>Auto-Atk</span>
                      <span style={{ color: '#fff' }}>X</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem' }}>
                      <span style={{ color: '#ef4444' }}>Menu</span>
                      <span style={{ color: '#fff' }}>Esc</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Class Ability Bar - Desktop */}
          {!isMobile && playerInfo && (
            <div style={{
              position: 'fixed',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 10,
              zIndex: 100,
            }}>
              {[1, 2, 3].map(slot => {
                const levelReqs = { 1: 10, 2: 20, 3: 30 };
                const abilityNames = {
                  pyromancer: { 1: 'Flame Shield', 2: 'Meteor Strike', 3: 'Inferno' },
                  cryomancer: { 1: 'Frost Nova', 2: 'Ice Lance', 3: 'Glacial Storm' },
                  arcanist: { 1: 'Blink', 2: 'Arcane Barrage', 3: 'Time Warp' },
                  stormcaller: { 1: 'Static Field', 2: 'Ball Lightning', 3: 'Thunder God' },
                  voidlord: { 1: 'Void Rift', 2: 'Soul Drain', 3: 'Apocalypse' },
                };
                const abilityColors = {
                  pyromancer: '#ff6b35',
                  cryomancer: '#00ffff',
                  arcanist: '#9b5de5',
                  stormcaller: '#ffff00',
                  voidlord: '#ff00ff',
                };
                
                const unlocked = playerInfo.level >= levelReqs[slot];
                const cooldownEnd = abilityCooldowns[slot] || 0;
                const onCooldown = cooldownEnd > Date.now();
                const cdRemaining = onCooldown ? Math.ceil((cooldownEnd - Date.now()) / 1000) : 0;
                const abilityName = abilityNames[playerInfo.class]?.[slot] || `Ability ${slot}`;
                const color = abilityColors[playerInfo.class] || '#888';
                
                return (
                  <div
                    key={slot}
                    onClick={() => {
                      if (unlocked && !onCooldown && socketRef.current) {
                        const me = playerDataRef.current;
                        const canvas = canvasRef.current;
                        const cx = (me?.x || 0) - (canvas?.width || 800) / 2;
                        const cy = (me?.y || 0) - (canvas?.height || 600) / 2;
                        const targetX = mouseRef.current ? cx + mouseRef.current.x : me?.x;
                        const targetY = mouseRef.current ? cy + mouseRef.current.y : me?.y;
                        socketRef.current.emit('classAbility', { abilitySlot: slot, targetX, targetY });
                      }
                    }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 10,
                      background: unlocked 
                        ? (onCooldown ? 'rgba(50,50,50,0.9)' : `linear-gradient(135deg, ${color}40, ${color}20)`)
                        : 'rgba(30,30,30,0.9)',
                      border: `2px solid ${unlocked ? color : '#333'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: unlocked && !onCooldown ? 'pointer' : 'not-allowed',
                      opacity: unlocked ? 1 : 0.5,
                      position: 'relative',
                      transition: 'transform 0.1s',
                    }}
                  >
                    {/* Hotkey */}
                    <div style={{
                      position: 'absolute',
                      top: 2,
                      left: 4,
                      fontSize: '0.65rem',
                      color: '#fff',
                      fontWeight: 'bold',
                    }}>
                      {slot}
                    </div>
                    
                    {/* Ability name */}
                    <div style={{
                      fontSize: '0.6rem',
                      color: unlocked ? '#fff' : '#666',
                      textAlign: 'center',
                      padding: '0 2px',
                      lineHeight: 1.1,
                    }}>
                      {unlocked ? abilityName : `Lv${levelReqs[slot]}`}
                    </div>
                    
                    {/* Cooldown overlay */}
                    {onCooldown && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: '#f87171',
                      }}>
                        {cdRemaining}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats Panel - Mobile (Compact) */}
          {isMobile && (
            <div style={styles.mobileHud}>
              <div style={styles.mobileHudPanel}>
                {/* Zone indicator integrated at top */}
                {settings.showZoneNames && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 8,
                    paddingBottom: 6,
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <span style={{ ...styles.zoneIcon(currentZone.color), width: 12, height: 12 }}>{SVG.home}</span>
                    <span style={{ fontSize: '.7rem', color: currentZone.color }}>{currentZone.name}</span>
                  </div>
                )}
                <div style={styles.mobilePlayerHeader}>
                  <div style={styles.mobileAvatar(classes[playerInfo.class]?.color || '#fff')}>
                    <span style={styles.mobileAvatarIcon}>{CLASS_SVG[playerInfo.class] || SVG.arcane}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{playerInfo.name}</div>
                    <div style={{ fontSize: '.65rem', color: '#888' }}>Lv {playerInfo.level}</div>
                  </div>
                  {/* Quest button */}
                  <button
                    onClick={() => setShowQuest(true)}
                    style={{
                      marginLeft: 'auto',
                      background: 'rgba(255,215,0,0.2)',
                      border: '1px solid rgba(255,215,0,0.4)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      color: '#ffd93d',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    🏆 {Object.keys(playerInfo.bossKills || {}).length}/5
                  </button>
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

          {/* Volume Control - Desktop only */}
          {!isMobile && (
            <div style={styles.volumeControl}>
              {/* SFX */}
              <button
                style={styles.volumeBtn}
                onClick={() => setSettings(s => ({ ...s, sfxEnabled: !s.sfxEnabled }))}
                title="Sound Effects"
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
                title="SFX Volume"
              />
              {/* Music */}
              <button
                style={{ ...styles.volumeBtn, marginLeft: 10 }}
                onClick={() => {
                  setSettings(s => ({ ...s, musicEnabled: !s.musicEnabled }));
                  if (!settings.musicEnabled) {
                    startZoneMusic(lastZoneRef.current || 'sanctuary');
                  } else if (musicIntervalRef.current) {
                    clearInterval(musicIntervalRef.current);
                    musicIntervalRef.current = null;
                  }
                }}
                title="Music"
              >
                <span style={styles.volumeIcon}>
                  {settings.musicEnabled ? '🎵' : '🔇'}
                </span>
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.musicVolume * 100}
                onChange={(e) => {
                  const vol = e.target.value / 100;
                  setSettings(s => ({ ...s, musicVolume: vol }));
                  if (musicGainRef.current && audioCtxRef.current) {
                    const config = ZONE_MUSIC_CONFIG[lastZoneRef.current] || ZONE_MUSIC_CONFIG.sanctuary;
                    musicGainRef.current.gain.setValueAtTime(config.volume * vol, audioCtxRef.current.currentTime);
                  }
                }}
                style={{ ...styles.volumeSlider, width: 60 }}
                title="Music Volume"
              />
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

              {/* Action Buttons - Right side */}
              <div style={{
                position: 'absolute',
                bottom: 30,
                right: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                pointerEvents: 'auto',
              }}>
                {/* Row 1: Secondary buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Auto-Attack Toggle (for Voidlord) */}
                  {playerInfo?.class === 'voidlord' && (
                    <button
                      style={{
                        ...styles.actionButton(autoAttack ? '#fbbf24' : '#666'),
                        width: 44,
                        height: 44,
                      }}
                      onTouchStart={(e) => { 
                        e.preventDefault(); 
                        socketRef.current?.emit('toggleAutoAttack');
                      }}
                    >
                      <span style={{ fontSize: '0.9rem' }}>{autoAttack ? '⚔️' : '🛡️'}</span>
                    </button>
                  )}
                  {/* PvP Toggle (for Voidlord) */}
                  {playerInfo?.class === 'voidlord' && (
                    <button
                      style={{
                        ...styles.actionButton(pvpEnabled ? '#ef4444' : '#666'),
                        width: 44,
                        height: 44,
                      }}
                      onTouchStart={(e) => { 
                        e.preventDefault(); 
                        socketRef.current?.emit('togglePvP');
                      }}
                    >
                      <span style={{ fontSize: '0.9rem' }}>{pvpEnabled ? '👹' : '👤'}</span>
                    </button>
                  )}
                  {/* Emote Button */}
                  <button
                    style={{
                      ...styles.actionButton('#ffd93d'),
                      width: 44,
                      height: 44,
                    }}
                    onTouchStart={(e) => { e.preventDefault(); setShowEmotes(true); }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>😊</span>
                  </button>
                  {/* Chat Toggle Button */}
                  <button
                    style={{
                      ...styles.actionButton('#3b82f6'),
                      width: 44,
                      height: 44,
                    }}
                    onTouchStart={(e) => { e.preventDefault(); setShowChat(prev => !prev); }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>💬</span>
                  </button>
                  {/* Menu Button */}
                  <button
                    style={{
                      ...styles.actionButton('#ef4444'),
                      width: 44,
                      height: 44,
                    }}
                    onTouchStart={(e) => { 
                      e.preventDefault(); 
                      if (window.confirm('Return to main menu?')) {
                        if (playerInfo) {
                          setSavedPlayer({
                            ...playerInfo,
                            rank: playerInfo.rank || { title: 'Novice' },
                          });
                        }
                        setScreen('returning');
                      }
                    }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>🏠</span>
                  </button>
                </div>

                {/* Row 2: Main action buttons */}
                <div style={{ display: 'flex', gap: 12 }}>
                  {/* Dash Button */}
                  <div style={{ position: 'relative' }}>
                    <button
                      style={{
                        ...styles.actionButton('#4ecdc4'),
                        opacity: dashCooldown > 0 ? 0.5 : 1,
                      }}
                      onTouchStart={(e) => { e.preventDefault(); handleDashButton(); }}
                    >
                      <span style={styles.actionButtonIcon}>{SVG.dash}</span>
                      <span style={{ fontSize: '0.6rem', marginTop: 2 }}>DASH</span>
                    </button>
                    {dashCooldown > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: '50%',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        pointerEvents: 'none',
                      }}>
                        ⏳
                      </div>
                    )}
                  </div>
                  {/* Ultimate Button */}
                  <div style={{ position: 'relative' }}>
                    <button
                      style={{
                        ...styles.actionButton('#ff6b35'),
                        opacity: ultCooldown > 0 ? 0.5 : 1,
                      }}
                      onTouchStart={(e) => { e.preventDefault(); handleUltimateButton(); }}
                    >
                      <span style={styles.actionButtonIcon}>{SVG.warning}</span>
                      <span style={{ fontSize: '0.6rem', marginTop: 2 }}>ULT</span>
                    </button>
                    {ultCooldown > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: '50%',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        pointerEvents: 'none',
                      }}>
                        ⏳
                      </div>
                    )}
                  </div>
                </div>
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

      {/* Building Interaction Prompt */}
      {nearbyBuilding && screen === 'game' && !showShop && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 180 : 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(10px)',
          padding: '12px 25px',
          borderRadius: 15,
          zIndex: 800,
          border: `2px solid ${nearbyBuilding.color}`,
          textAlign: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setShowShop(true)}
        >
          <div style={{ color: nearbyBuilding.color, fontWeight: 'bold', fontSize: '0.9rem' }}>
            {nearbyBuilding.name}
          </div>
          <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
            {isMobile ? 'Tap to interact' : 'Press E or Click to interact'}
          </div>
        </div>
      )}

      {/* NPC Interaction Prompt */}
      {nearbyNpc && screen === 'game' && !npcDialogue && !nearbyBuilding && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 180 : 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(10px)',
          padding: '12px 25px',
          borderRadius: 15,
          zIndex: 800,
          border: `2px solid ${nearbyNpc.type === 'guide' ? '#67e8f9' : '#a8a29e'}`,
          textAlign: 'center',
          cursor: 'pointer',
        }}
        onClick={() => socketRef.current?.emit('interactNpc', { npcId: nearbyNpc.id })}
        >
          <div style={{ 
            color: nearbyNpc.type === 'guide' ? '#67e8f9' : '#a8a29e', 
            fontWeight: 'bold', 
            fontSize: '0.9rem' 
          }}>
            {nearbyNpc.name}
          </div>
          <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
            {isMobile ? 'Tap to talk' : 'Press E to talk'}
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {showShop && nearbyBuilding && (
        <>
          <div style={styles.modalBackdrop} onClick={() => setShowShop(false)} />
          <div style={{
            ...styles.modal,
            maxWidth: 450,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}>
            <button style={styles.modalClose} onClick={() => setShowShop(false)}>×</button>
            <h3 style={{ ...styles.modalTitle, color: nearbyBuilding.color }}>
              {nearbyBuilding.name}
            </h3>
            
            <div style={{ marginBottom: 20, color: '#888', fontSize: '0.85rem' }}>
              {nearbyBuilding.type === 'tower' && "The Archmage offers powerful upgrades."}
              {nearbyBuilding.type === 'ruins' && "Ancient power awaits those who seek it."}
              {nearbyBuilding.type === 'fortress' && "Forge your strength in volcanic fire."}
              {nearbyBuilding.type === 'citadel' && "Master the frozen arts."}
              {nearbyBuilding.type === 'shrine' && "Embrace the void's power."}
              {nearbyBuilding.type === 'sanctum' && "Crystal energy flows through you."}
            </div>

            {/* Shop Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Health Upgrade */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 15,
                border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ color: '#ef4444', fontWeight: 'bold' }}>❤️ Max Health +20</div>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>Permanently increase max health</div>
                </div>
                <button style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 15px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  socketRef.current?.emit('buyUpgrade', { type: 'health' });
                  playSound('levelUp');
                }}
                >
                  500 XP
                </button>
              </div>

              {/* Damage Upgrade */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 15,
                border: '1px solid rgba(249,115,22,0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ color: '#f97316', fontWeight: 'bold' }}>⚔️ Damage +5%</div>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>Increase spell damage</div>
                </div>
                <button style={{
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 15px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  socketRef.current?.emit('buyUpgrade', { type: 'damage' });
                  playSound('levelUp');
                }}
                >
                  750 XP
                </button>
              </div>

              {/* Speed Upgrade */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 15,
                border: '1px solid rgba(34,197,94,0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ color: '#22c55e', fontWeight: 'bold' }}>👟 Speed +5%</div>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>Move faster</div>
                </div>
                <button style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 15px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  socketRef.current?.emit('buyUpgrade', { type: 'speed' });
                  playSound('levelUp');
                }}
                >
                  600 XP
                </button>
              </div>

              {/* Cooldown Reduction */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 15,
                border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>⏱️ Cooldown -5%</div>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>Cast abilities more often</div>
                </div>
                <button style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 15px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  socketRef.current?.emit('buyUpgrade', { type: 'cooldown' });
                  playSound('levelUp');
                }}
                >
                  1000 XP
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>
              Your XP: <span style={{ color: '#ffd93d', fontWeight: 'bold' }}>{playerInfo?.totalXp || 0}</span>
            </div>
          </div>
        </>
      )}

      {/* Emote Wheel */}
      {showEmotes && screen === 'game' && (
        <>
          <div style={styles.modalBackdrop} onClick={() => setShowEmotes(false)} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
          }}>
            {/* Circular emote buttons */}
            {[
              { id: 'wave', emoji: '👋', label: 'Wave', angle: 0 },
              { id: 'dance', emoji: '💃', label: 'Dance', angle: 60 },
              { id: 'cheer', emoji: '🎉', label: 'Cheer', angle: 120 },
              { id: 'spin', emoji: '🌀', label: 'Spin', angle: 180 },
              { id: 'sit', emoji: '🧘', label: 'Sit', angle: 240 },
              { id: 'laugh', emoji: '😂', label: 'Laugh', angle: 300 },
            ].map((emote) => {
              const radius = 100;
              const rad = (emote.angle - 90) * Math.PI / 180;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;
              return (
                <button
                  key={emote.id}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.9)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => {
                    socketRef.current?.emit('emote', { type: emote.id });
                    setShowEmotes(false);
                    playSound('dash');
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1.15)`;
                    e.target.style.borderColor = '#ffd93d';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
                    e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{emote.emoji}</span>
                  <span style={{ fontSize: '0.6rem', color: '#888', marginTop: 2 }}>{emote.label}</span>
                </button>
              );
            })}
            {/* Center instruction */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.95)',
              borderRadius: '50%',
              width: 70,
              height: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255,217,61,0.5)',
            }}>
              <span style={{ color: '#888', fontSize: '0.7rem', textAlign: 'center' }}>Press T<br/>to close</span>
            </div>
          </div>
        </>
      )}

      {/* Chat Box */}
      {screen === 'game' && showChat && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 180 : 20,
          left: isMobile ? 10 : 20,
          width: isMobile ? 180 : 320,
          maxHeight: isMobile ? 120 : 200,
          background: isMobile ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(3px)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}>
          {/* Chat header */}
          <div style={{
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>Chat</span>
            <button 
              onClick={() => setShowChat(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >✕</button>
          </div>
          
          {/* Messages */}
          <div 
            ref={chatContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              maxHeight: 120,
            }}
          >
            {chatMessages.map((msg) => (
              <div key={msg.id} style={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                {msg.type === 'system' ? (
                  <span style={{ color: '#888', fontStyle: 'italic' }}>{msg.text}</span>
                ) : (
                  <>
                    <span style={{ 
                      color: classes[msg.playerClass]?.color || '#fff',
                      fontWeight: 600,
                    }}>
                      {msg.playerName}:
                    </span>
                    <span style={{ color: '#ccc', marginLeft: 6 }}>{msg.text}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          
          {/* Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) {
                socketRef.current?.emit('chat', chatInput.trim());
                setChatInput('');
              }
            }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Press Enter to chat..."
              maxLength={200}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: '#fff',
                fontSize: '0.75rem',
                outline: 'none',
              }}
            />
          </form>
        </div>
      )}
      
      {/* Chat toggle button (when hidden) - Desktop only */}
      {screen === 'game' && !showChat && !isMobile && (
        <button
          onClick={() => setShowChat(true)}
          style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >💬</button>
      )}

      {/* Boss Spawn Alert */}
      {bossAlert && (
        <div style={{
          position: 'fixed',
          top: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: `linear-gradient(135deg, ${bossAlert.color}20, rgba(0,0,0,0.9))`,
          backdropFilter: 'blur(10px)',
          padding: isMobile ? '15px 25px' : '20px 40px',
          borderRadius: 15,
          zIndex: 900,
          border: `2px solid ${bossAlert.color}`,
          textAlign: 'center',
          animation: 'slideDown 0.4s ease-out',
          boxShadow: `0 0 30px ${bossAlert.color}40`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, justifyContent: 'center' }}>
            <span style={{ fontSize: isMobile ? '1.8rem' : '2.5rem' }}>{bossAlert.emoji}</span>
            <div>
              <div style={{ 
                color: bossAlert.color, 
                fontSize: isMobile ? '1.1rem' : '1.4rem', 
                fontWeight: 700,
                textShadow: `0 0 10px ${bossAlert.color}80`,
              }}>
                {bossAlert.name} Awakens!
              </div>
              <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 4 }}>
                A powerful boss has appeared in {bossAlert.zone?.replace('_', ' ')}
              </div>
            </div>
            <span style={{ fontSize: isMobile ? '1.8rem' : '2.5rem' }}>{bossAlert.emoji}</span>
          </div>
        </div>
      )}

      {/* Quest Progress Tracker - Desktop */}
      {screen === 'game' && playerInfo && !isMobile && (
        <div 
          style={{
            position: 'fixed',
            top: 20,
            left: 20,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(255,215,0,0.3)',
            zIndex: 100,
            cursor: 'pointer',
            minWidth: 200,
          }}
          onClick={() => setShowQuest(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>🏆</span>
            <span style={{ color: '#ffd93d', fontWeight: 600, fontSize: '0.85rem' }}>Conquer the Realm</span>
          </div>
          {(() => {
            const bossKills = playerInfo.bossKills || {};
            const zones = [
              { id: 'meadow', name: 'Meadow', emoji: '🌸' },
              { id: 'forest', name: 'Forest', emoji: '🌳' },
              { id: 'volcanic', name: 'Volcanic', emoji: '🌋' },
              { id: 'frozen', name: 'Frozen', emoji: '❄️' },
              { id: 'abyss', name: 'Abyss', emoji: '🌀' },
            ];
            const defeated = zones.filter(z => bossKills[z.id]).length;
            return (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  {zones.map(z => (
                    <span key={z.id} style={{ 
                      fontSize: '1rem',
                      opacity: bossKills[z.id] ? 1 : 0.3,
                      filter: bossKills[z.id] ? 'none' : 'grayscale(1)',
                    }}>{z.emoji}</span>
                  ))}
                </div>
                <div style={{ 
                  height: 4, 
                  background: 'rgba(255,255,255,0.1)', 
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(defeated / 5) * 100}%`,
                    background: defeated === 5 ? '#22c55e' : 'linear-gradient(90deg, #ffd93d, #f97316)',
                    borderRadius: 2,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 4, textAlign: 'right' }}>
                  {defeated}/5 Bosses
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* NPC Dialogue Modal */}
      {npcDialogue && screen === 'game' && (
        <>
          <div style={styles.modalBackdrop} onClick={() => setNpcDialogue(null)} />
          <div style={{
            ...styles.modal,
            maxWidth: 450,
            background: npcDialogue.npcType === 'guide' 
              ? 'linear-gradient(135deg, rgba(20,30,40,0.98), rgba(30,60,80,0.98))'
              : 'linear-gradient(135deg, rgba(30,25,20,0.98), rgba(50,40,30,0.98))',
            border: npcDialogue.npcType === 'guide'
              ? '2px solid rgba(103, 232, 249, 0.5)'
              : '2px solid rgba(168, 162, 158, 0.5)',
          }}>
            <button style={styles.modalClose} onClick={() => setNpcDialogue(null)}>×</button>
            
            {/* NPC Avatar & Name */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: npcDialogue.npcType === 'guide'
                  ? 'linear-gradient(135deg, #67e8f9, #0ea5e9)'
                  : 'linear-gradient(135deg, #78716c, #44403c)',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                boxShadow: npcDialogue.npcType === 'guide'
                  ? '0 0 20px rgba(103, 232, 249, 0.5)'
                  : '0 0 15px rgba(0,0,0,0.5)',
              }}>
                {npcDialogue.npcType === 'guide' ? '✨' : '⚔️'}
              </div>
              <h3 style={{ 
                margin: 0, 
                color: npcDialogue.npcType === 'guide' ? '#67e8f9' : '#a8a29e',
                fontSize: '1.1rem',
              }}>
                {npcDialogue.npcName}
              </h3>
            </div>
            
            {/* Dialogue Text */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 10,
              padding: 15,
              marginBottom: 15,
            }}>
              {npcDialogue.dialogue?.map((line, i) => (
                <p key={i} style={{ 
                  color: '#e5e5e5', 
                  margin: i === npcDialogue.dialogue.length - 1 ? 0 : '0 0 10px 0',
                  lineHeight: 1.5,
                  fontSize: '0.9rem',
                }}>
                  "{line}"
                </p>
              ))}
            </div>
            
            {/* Follow-up dialogue for knight */}
            {npcDialogue.followUp && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 10,
                padding: 15,
                marginBottom: 15,
                borderLeft: '3px solid #f97316',
              }}>
                {npcDialogue.followUp.map((line, i) => (
                  <p key={i} style={{ 
                    color: '#fbbf24', 
                    margin: i === npcDialogue.followUp.length - 1 ? 0 : '0 0 8px 0',
                    lineHeight: 1.4,
                    fontSize: '0.85rem',
                  }}>
                    {line}
                  </p>
                ))}
              </div>
            )}
            
            {/* Prompt and choices for knight */}
            {npcDialogue.hasChoice && npcDialogue.prompt && (
              <div style={{ marginTop: 20 }}>
                <p style={{ 
                  color: '#fff', 
                  textAlign: 'center', 
                  marginBottom: 15,
                  fontWeight: 600,
                }}>
                  {npcDialogue.prompt}
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  gap: 10,
                  justifyContent: 'center',
                }}>
                  <button
                    onClick={() => {
                      socketRef.current?.emit('enterDungeon');
                      setNpcDialogue(null);
                    }}
                    style={{
                      padding: '12px 25px',
                      background: npcDialogue.playerLevel >= npcDialogue.recommendedLevel
                        ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                        : 'linear-gradient(135deg, #78716c, #57534e)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    Enter the Gauntlet
                    {npcDialogue.playerLevel < npcDialogue.recommendedLevel && (
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#fbbf24', marginTop: 4 }}>
                        (Lv {npcDialogue.playerLevel} / Rec: {npcDialogue.recommendedLevel})
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setNpcDialogue(null)}
                    style={{
                      padding: '12px 25px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    Not yet
                  </button>
                </div>
              </div>
            )}
            
            {/* Simple close for guide */}
            {!npcDialogue.hasChoice && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => setNpcDialogue(null)}
                  style={{
                    padding: '10px 30px',
                    background: 'rgba(103, 232, 249, 0.2)',
                    border: '1px solid rgba(103, 232, 249, 0.4)',
                    borderRadius: 8,
                    color: '#67e8f9',
                    cursor: 'pointer',
                  }}
                >
                  Farewell
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quest Detail Modal */}
      {showQuest && screen === 'game' && (
        <>
          <div style={styles.modalBackdrop} onClick={() => setShowQuest(false)} />
          <div style={{
            ...styles.modal,
            maxWidth: 400,
          }}>
            <button style={styles.modalClose} onClick={() => setShowQuest(false)}>×</button>
            <h3 style={{ ...styles.modalTitle, color: '#ffd93d' }}>
              <span style={{ fontSize: '1.5rem', marginRight: 10 }}>🏆</span>
              Conquer the Realm
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.5 }}>
              Defeat all five Zone Bosses to prove your mastery over the realm. Each boss guards a different zone and has unique abilities.
            </p>
            
            {(() => {
              const bossKills = playerInfo?.bossKills || {};
              const zones = [
                { id: 'meadow', name: 'Blossom Behemoth', zone: 'Meadow', emoji: '🌸', color: '#ec4899', level: 5 },
                { id: 'forest', name: 'Ancient Treant', zone: 'Forest', emoji: '🌳', color: '#22c55e', level: 10 },
                { id: 'volcanic', name: 'Magma Titan', zone: 'Volcanic', emoji: '🌋', color: '#f97316', level: 15 },
                { id: 'frozen', name: 'Frost Wyrm', zone: 'Frozen', emoji: '❄️', color: '#22d3ee', level: 20 },
                { id: 'abyss', name: 'Void Overlord', zone: 'Abyss', emoji: '🌀', color: '#7c3aed', level: 25 },
              ];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {zones.map(z => (
                    <div key={z.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      background: bossKills[z.id] ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      border: `1px solid ${bossKills[z.id] ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>{z.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: z.color, fontWeight: 600, fontSize: '0.9rem' }}>{z.name}</div>
                        <div style={{ color: '#666', fontSize: '0.75rem' }}>{z.zone} • Lv {z.level}+</div>
                      </div>
                      {bossKills[z.id] ? (
                        <span style={{ color: '#22c55e', fontSize: '1.2rem' }}>✓</span>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.8rem' }}>⬜</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
            
            <div style={{ 
              marginTop: 20, 
              padding: 12, 
              background: 'rgba(255,215,0,0.1)', 
              borderRadius: 8,
              border: '1px solid rgba(255,215,0,0.3)',
            }}>
              <div style={{ color: '#ffd93d', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                🎁 Reward
              </div>
              <div style={{ color: '#aaa', fontSize: '0.8rem' }}>
                +5000 XP • "Realm Conqueror" Title • Eternal Glory
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quest Complete Celebration */}
      {questComplete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <div style={{
            textAlign: 'center',
            animation: 'dropIn 0.6s ease-out',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: 20 }}>🏆</div>
            <div style={{ 
              color: '#ffd93d', 
              fontSize: '2rem', 
              fontWeight: 700,
              textShadow: '0 0 30px rgba(255,215,0,0.5)',
              marginBottom: 10,
            }}>
              QUEST COMPLETE!
            </div>
            <div style={{ 
              color: '#fff', 
              fontSize: '1.5rem', 
              fontWeight: 600,
              marginBottom: 30,
            }}>
              {questComplete.title}
            </div>
            <div style={{
              display: 'flex',
              gap: 30,
              justifyContent: 'center',
              marginBottom: 30,
            }}>
              <div>
                <div style={{ color: '#888', fontSize: '0.8rem' }}>XP REWARD</div>
                <div style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 700 }}>+{questComplete.xp}</div>
              </div>
              <div>
                <div style={{ color: '#888', fontSize: '0.8rem' }}>TITLE</div>
                <div style={{ color: '#ffd93d', fontSize: '1.2rem', fontWeight: 600 }}>👑 {questComplete.title}</div>
              </div>
            </div>
            <div style={{ 
              color: '#22c55e', 
              fontSize: '1rem',
              animation: 'pulse 1s infinite',
            }}>
              You have conquered all five zone bosses!
            </div>
          </div>
        </div>
      )}

      {/* Spell Drop Notification */}
      {spellDrop && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(20px)',
          padding: isMobile ? '20px' : '30px',
          borderRadius: 20,
          zIndex: 1000,
          minWidth: isMobile ? '280px' : '350px',
          maxWidth: '90vw',
          border: '2px solid #ffd93d',
          textAlign: 'center',
          animation: 'dropIn 0.3s ease-out',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>✨</div>
          <h2 style={{ color: '#ffd93d', margin: '0 0 15px', fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
            Spell Upgrade!
          </h2>
          <p style={{ color: '#888', margin: '0 0 20px', fontSize: '0.85rem' }}>
            From {spellDrop.bossName}
          </p>
          {spellDrop.items.map((item, idx) => {
            const rarityColors = {
              common: '#9ca3af',
              uncommon: '#22c55e',
              rare: '#3b82f6',
              epic: '#a855f7',
              legendary: '#f97316',
            };
            const color = rarityColors[item.rarity] || '#fff';
            return (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 15,
                marginBottom: idx < spellDrop.items.length - 1 ? 10 : 0,
                border: `1px solid ${color}40`,
              }}>
                <div style={{ color, fontSize: '1.1rem', fontWeight: 600, marginBottom: 5 }}>
                  {item.name}
                </div>
                <div style={{ color: color, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 8 }}>
                  {item.rarity} {item.isAlternate ? '• Alternate Spell' : '• Upgrade'}
                </div>
                <div style={{ color: '#ccc', fontSize: '0.85rem' }}>
                  {item.description}
                </div>
              </div>
            );
          })}
          <button
            onClick={() => setSpellDrop(null)}
            style={{
              marginTop: 20,
              padding: '12px 30px',
              background: 'linear-gradient(135deg, #ffd93d, #ff6b35)',
              border: 'none',
              borderRadius: 25,
              color: '#000',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Awesome!
          </button>
        </div>
      )}

      {/* Connection Status - Top right below volume */}
      <div style={styles.connection(connected)}>
        <span style={styles.connDot} />
        <span>{connected ? `${playersOnline} Online` : 'Offline'}</span>
      </div>
      
      {/* Audio unlock indicator for mobile */}
      {isMobile && !audioUnlocked && screen === 'game' && (
        <div 
          onTouchStart={(e) => {
            e.stopPropagation();
            // Create and play sound directly during touch event
            try {
              const AudioContext = window.AudioContext || window.webkitAudioContext;
              if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContext();
              }
              const ctx = audioCtxRef.current;
              if (ctx.state === 'suspended') ctx.resume();
              
              // Play a sound immediately
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.2);
              
              audioReadyRef.current = true;
              setAudioUnlocked(true);
              console.log('🔊 Audio unlocked via button');
            } catch (err) {
              console.log('Audio button error:', err);
            }
          }}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(255,150,0,0.95)',
            color: '#000',
            padding: '14px 18px',
            borderRadius: 10,
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 1000,
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          🔊 TAP FOR SOUND
        </div>
      )}
    </div>
  );
}