/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { io } from 'socket.io-client';

// Local imports
import { SVG, CLASS_SVG } from './constants/icons';
import { COLORS, DEFAULT_CLASSES, DEFAULT_SKINS, SERVER_URL } from './constants/config';
import { WORLD_WIDTH, WORLD_HEIGHT, ZONE_POLYGONS, ZONE_INFO, PORTAL_POSITIONS, BUILDING_DATA, pointInPolygon, getZoneAtPosition } from './constants/zones';
// Note: hooks/useAudio.js is available for future refactoring
import { createStyles } from './styles';

// Extracted UI Components
import { GlobalStyles, LoadingScreen, AuthScreen, DeathScreen, TitleScreen, GameModals } from './components';

// Rendering modules
import { drawDungeon } from './rendering/drawDungeon';
import { drawWorld, drawWorldOverlay } from './rendering/drawWorld';
import { drawEnvironment } from './rendering/drawEnvironment';
import { drawNpcs } from './rendering/drawNpcs';
import { drawPortals } from './rendering/drawPortals';
import { drawEnemies } from './rendering/drawEnemies';
import { drawProjectiles } from './rendering/drawProjectiles';
import { drawEntities } from './rendering/drawEntities';
import { drawEffects } from './rendering/drawEffects';
import { drawMinimap } from './rendering/drawMinimap';


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
  const pendingCustomWizardRef = useRef(null); // Custom wizard to apply after joining game
  const settingsRef = useRef({ volume: 0.5, sfxEnabled: true, musicEnabled: true, musicVolume: 0.3, showZoneNames: true, showMinimap: true });

  // State
  const [screen, setScreen] = useState('loading'); // loading, title, game, dead
  const screenRef = useRef('loading'); // Ref version for socket handlers
  const [tab, setTab] = useState('play');
  const [connected, setConnected] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedClass, setSelectedClass] = useState('pyromancer');
  const [selectedSkin, setSelectedSkin] = useState('pyromancer_default');
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [savedPlayer, setSavedPlayer] = useState(null);
  const [characters, setCharacters] = useState([]); // All characters for this account
  const [selectedCharIdx, setSelectedCharIdx] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deathInfo, setDeathInfo] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [spellDrop, setSpellDrop] = useState(null);
  const [bossAlert, setBossAlert] = useState(null);
  const [showSkinSelect, setShowSkinSelect] = useState(false);
  const [showDungeonBrowser, setShowDungeonBrowser] = useState(false);
  const [customDungeonList, setCustomDungeonList] = useState([]);
  const [dungeonPromptText, setDungeonPromptText] = useState('');
  const [dungeonBrowserTab, setDungeonBrowserTab] = useState('browse'); // browse | create
  const [dungeonBrowserError, setDungeonBrowserError] = useState('');
  const [wizardPrompt, setWizardPrompt] = useState('');
  const [wizardGenerating, setWizardGenerating] = useState(false);
  const [generatedWizard, setGeneratedWizard] = useState(null);
  const [wizardStatus, setWizardStatus] = useState('');
  const [wizardError, setWizardError] = useState('');
  const customDungeonConfigRef = useRef(null); // current custom dungeon config for rendering
  const [nearbyBuilding, setNearbyBuilding] = useState(null);
  const nearbyBuildingRef = useRef(null); // Ref for change detection
  const [showShop, setShowShop] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);
  const playerInfoThrottleRef = useRef(0); // Throttle playerInfo setState
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
  const [recallCooldown, setRecallCooldown] = useState(0); // timestamp when ready
  const [cooldownTick, setCooldownTick] = useState(0); // forces re-render for cooldown display
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(() => !(window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)));
  const [unreadChat, setUnreadChat] = useState(0);
  const [adminKey, setAdminKey] = useState('');
  const adminKeyRef = useRef('');
  const chatContainerRef = useRef(null);
  const showChatRef = useRef(!(window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)));
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
  const playersOnlineRef = useRef(0);
  const [autoAttack, setAutoAttack] = useState(true);
  const [pvpEnabled, setPvpEnabled] = useState(false); // Voidlord PvP toggle - OFF by default
  const [invincible, setInvincible] = useState(false); // Admin invincibility toggle
  const [questComplete, setQuestComplete] = useState(null);
  const [npcDialogue, setNpcDialogue] = useState(null); // Current NPC dialogue
  const [nearbyNpc, setNearbyNpc] = useState(null); // NPC player can interact with
  const nearbyNpcRef = useRef(null); // Ref for change detection
  const [nearbyPortal, setNearbyPortal] = useState(null); // Portal player can use
  const nearbyPortalRef = useRef(null); // Ref for change detection
  const [inDungeon, setInDungeon] = useState(false); // In dungeon mode
  const inDungeonRef = useRef(false); // Ref version for render loop
  const [dungeonVictoryPortal, setDungeonVictoryPortal] = useState(null); // Portal after dragon death
  const dungeonVictoryPortalRef = useRef(null); // Ref version for render loop
  const [dungeonProgress, setDungeonProgress] = useState(0);
  const joystickRef = useRef({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const joystickBaseRef = useRef(null);
  const joystickKnobRef = useRef(null);
  
  // Auth state
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isGuest: false,
    user: null,
    sessionToken: null,
  });
  const sessionTokenRef = useRef(null);
  // Keep ref in sync with state
  sessionTokenRef.current = authState.sessionToken;
  const [authScreen, setAuthScreen] = useState('main'); // main, login, signup
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Boss death banner
  const [bossDeathBanner, setBossDeathBanner] = useState(null);
  
  // Quest log
  const [questLog, setQuestLog] = useState({
    allBosses: { 
      id: 'allBosses',
      name: 'Champion of the Realm', 
      description: 'Defeat all 6 zone bosses to prove your worth.',
      active: true, 
      progress: {}, 
      completed: false,
      reward: { xp: 5000, title: 'Champion' },
      bosses: ['meadow', 'forest', 'volcanic', 'frozen', 'crystal_caves', 'abyss'],
    },
    dragonSlayer: { 
      id: 'dragonSlayer',
      name: 'Dragon Slayer', 
      description: 'Enter the Dragon\'s Gauntlet and slay the Infernal Dragon.',
      active: false, 
      completed: false,
      reward: { xp: 10000, title: 'Dragon Slayer' },
    },
  });
  const [showQuestLog, setShowQuestLog] = useState(false);
  
  // In-game settings modal
  const [showInGameSettings, setShowInGameSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  
  // Admin panel
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPlayers, setAdminPlayers] = useState([]);
  const [notification, setNotification] = useState(null); // { text, color }
  
  // Character sheet
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  
  // Spellbook panel
  const [showSpellbook, setShowSpellbook] = useState(false);
  
  // Modal state ref - keeps ESC handler (in [] dep useEffect) aware of open modals
  const modalRef = useRef({
    emotes: false, shop: false, skinSelect: false, questLog: false,
    npcDialogue: null, characterSheet: false, spellbook: false,
    inGameSettings: false, chat: false,
  });
  
  // Mobile ultimate aiming mode
  const [ultAimMode, setUltAimMode] = useState(false);
  const ultAimModeRef = useRef(false);

  // Keep settings ref in sync
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Keep dungeon refs in sync for render loop
  useEffect(() => {
    inDungeonRef.current = inDungeon;
  }, [inDungeon]);
  
  useEffect(() => {
    dungeonVictoryPortalRef.current = dungeonVictoryPortal;
  }, [dungeonVictoryPortal]);
  
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  
  useEffect(() => {
    adminKeyRef.current = adminKey;
  }, [adminKey]);

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
    
    // NOTE: No global touchmove preventDefault. Scroll prevention is handled by CSS:
    // - html,body get position:fixed + overflow:hidden during game (in style tag)
    // - canvas gets touch-action:none (in style tag)
    // - overscroll-behavior:none on html,body prevents pull-to-refresh
    // - Menu overlays scroll naturally with overflowY:auto + touch-action:pan-y
    
    return () => {
      document.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, []);
  
  // Sync showChat ref and clear unread
  useEffect(() => {
    showChatRef.current = showChat;
    if (showChat) setUnreadChat(0);
  }, [showChat]);

  // Sync modal ref for ESC handler (which runs in [] dep useEffect)
  useEffect(() => {
    modalRef.current = {
      emotes: showEmotes, shop: showShop, skinSelect: showSkinSelect,
      questLog: showQuestLog, npcDialogue, characterSheet: showCharacterSheet,
      spellbook: showSpellbook, inGameSettings: showInGameSettings,
      chat: showChat,
    };
  });

  // Tick cooldown display every 250ms while any cooldown is active
  useEffect(() => {
    const now = Date.now();
    const hasActive = dashCooldownRef.current > now || ultCooldownRef.current > now || 
      Object.values(abilityCooldowns).some(cd => cd > now);
    if (!hasActive) return;
    const iv = setInterval(() => {
      const n = Date.now();
      const stillActive = dashCooldownRef.current > n || ultCooldownRef.current > n ||
        Object.values(abilityCooldowns).some(cd => cd > n);
      if (stillActive) {
        setCooldownTick(t => t + 1);
      } else {
        clearInterval(iv);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [dashCooldown, ultCooldown, abilityCooldowns]);

  // Save settings to server when they change (for logged-in users)
  useEffect(() => {
    if (authState.isAuthenticated && !authState.isGuest && authState.sessionToken) {
      // Debounce save to avoid too many requests
      const timer = setTimeout(() => {
        fetch(`${SERVER_URL}/auth/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: sessionTokenRef.current,
            settings: settings,
          }),
        }).catch(() => {}); // Silently fail
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [settings, authState]);

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
        gameEnter: () => {
          // Magical ascending arpeggio - welcome to the game
          osc.type = 'sine';
          // C5 -> E5 -> G5 -> C6 (major chord arpeggio)
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.setValueAtTime(659, now + 0.12);
          osc.frequency.setValueAtTime(784, now + 0.24);
          osc.frequency.setValueAtTime(1047, now + 0.36);
          osc.frequency.setValueAtTime(1319, now + 0.48);
          gain.gain.setValueAtTime(vol * 0.6, now);
          gain.gain.setValueAtTime(vol * 0.8, now + 0.24);
          gain.gain.setValueAtTime(vol * 1.0, now + 0.36);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
          osc.start(now);
          osc.stop(now + 0.8);
        },
      };

      if (sounds[type]) sounds[type]();
    } catch (e) {
      // Ignore audio errors
    }
  };

  const updateZone = (me) => {
    if (!me) return;
    
    // Don't update zone info when in dungeon
    if (inDungeonRef.current) return;
    
    const zoneName = getZoneAtPosition(me.x, me.y);
    
    // Start zone music if zone changed
    if (zoneName !== lastZoneRef.current) {
      lastZoneRef.current = zoneName;
      setCurrentZone(ZONE_INFO[zoneName] || ZONE_INFO.sanctuary);
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
    dungeon: {
      baseFreq: 98, // Low G - ominous
      scale: [0, 1, 5, 6, 7, 12], // Diminished/chromatic - tension
      tempo: 1.2, // Faster, urgent
      waveType: 'sawtooth',
      volume: 0.1,
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
      console.log('🔌 Socket connected');
      setConnected(true);
      // Check for returning player
      const savedSession = localStorage.getItem('spellBrigadeSession');
      const savedId = localStorage.getItem('spellBrigadePlayerId');
      
      if (savedSession) {
        try {
          const { token, isGuest } = JSON.parse(savedSession);
          // Validate session with server
          fetch(`${SERVER_URL}/auth/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: token }),
          })
            .then(res => res.json())
            .then(data => {
              if (data.valid) {
                setAuthState({ 
                  isAuthenticated: true, 
                  isGuest: data.isGuest || isGuest, 
                  user: data.user || null, 
                  sessionToken: token 
                });
                // Auto-enable admin for azoni
                if (data.user?.username?.toLowerCase() === 'azoni') {
                  setAdminKey('azoni-voidlord-2026');
                  setSelectedClass('shadowarcher');
                  setSelectedSkin('shadowarcher_default');
                  // Pre-authenticate socket for wizard creator before joining game
                  socket.emit('authenticateAdmin', { sessionToken: token });
                  // Listen for auth result - retry if it fails
                  socket.on('adminAuthenticated', (result) => {
                    if (result.success) {
                      console.log('🔑 Admin pre-auth confirmed');
                    } else {
                      console.log('🔑 Admin pre-auth failed, retrying in 1s...');
                      setTimeout(() => {
                        socket.emit('authenticateAdmin', { sessionToken: token });
                      }, 1000);
                    }
                  });
                }
                // Restore user settings if present
                if (data.user?.settings) {
                  setSettings(prev => ({ ...prev, ...data.user.settings }));
                }
                // Restore quest progress
                if (data.user?.quests) {
                  setQuestLog(prev => ({ ...prev, ...data.user.quests }));
                }
                // Check for saved character
                if (data.user?.characters?.length > 0) {
                  setCharacters(data.user.characters);
                  // Try to find the last-played character
                  const lastIdx = savedId ? data.user.characters.findIndex(c => c.id === savedId) : 0;
                  const idx = lastIdx >= 0 ? lastIdx : 0;
                  setSelectedCharIdx(idx);
                  setSavedPlayer(data.user.characters[idx]);
                  setScreen('title');
                } else if (savedId) {
                  // Valid session but character not linked - clear stale ID
                  localStorage.removeItem('spellBrigadePlayerId');
                  setScreen('title');
                } else {
                  setScreen('title');
                }
              } else {
                // Session expired - clear stale data and go to auth
                localStorage.removeItem('spellBrigadeSession');
                localStorage.removeItem('spellBrigadePlayerId');
                setScreen('auth');
              }
            })
            .catch(() => {
              // Network error - go to auth to be safe
              localStorage.removeItem('spellBrigadeSession');
              localStorage.removeItem('spellBrigadePlayerId');
              setScreen('auth');
            });
        } catch {
          // Corrupted session data - clear and go to auth
          localStorage.removeItem('spellBrigadeSession');
          localStorage.removeItem('spellBrigadePlayerId');
          setScreen('auth');
        }
      } else if (savedId) {
        // No session but has a player ID - stale data, clear it
        localStorage.removeItem('spellBrigadePlayerId');
      } else {
        // Truly new player - go to auth screen
        setScreen('auth');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnected(false);
      playerIdRef.current = null; // Clear player ID on disconnect
    });
    
    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
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
        // Add to characters list if not already there
        setCharacters(prev => {
          const exists = prev.find(c => c.id === data.player.id);
          if (exists) return prev.map(c => c.id === data.player.id ? data.player : c);
          return [...prev, data.player];
        });
        setScreen('title');
      } else {
        localStorage.removeItem('spellBrigadePlayerId');
        const savedSession = localStorage.getItem('spellBrigadeSession');
        if (savedSession) {
          setScreen('title');
        } else {
          setScreen('auth');
        }
      }
    });

    socket.on('joined', (data) => {
      playerIdRef.current = data.playerId;
      playerDataRef.current = data.player;
      localStorage.setItem('spellBrigadePlayerId', data.playerId);
      setPlayerInfo(data.player);
      setScreen('game');
      setTimeout(() => playSound('gameEnter'), 200);
      if (data.classes) setClasses(data.classes);
      if (data.world) gameStateRef.current.world = data.world;
      
      // Update saved player and characters list
      const charSummary = {
        id: data.playerId,
        name: data.player.name,
        class: data.player.class,
        level: data.player.level,
        totalXp: data.player.totalXp || 0,
        kills: data.player.kills || 0,
        selectedSkin: data.player.selectedSkin,
        bossKills: data.player.bossKills || {},
        upgrades: data.player.upgrades || {},
      };
      setSavedPlayer(charSummary);
      setCharacters(prev => {
        const exists = prev.findIndex(c => c.id === data.playerId);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = charSummary;
          return updated;
        }
        return [...prev, charSummary];
      });
      
      // Auto-enable admin from server flag only
      if (data.player?.isAdmin) {
        setAdminKey('azoni-voidlord-2026');
      }
      
      // Reset dungeon state on join
      inDungeonRef.current = false;
      setInDungeon(false);
      setDungeonProgress(0);
      setDungeonVictoryPortal(null);
      dungeonVictoryPortalRef.current = null;
      setNpcDialogue(null);
      setNearbyNpc(null);
      setNearbyBuilding(null);
      setNearbyPortal(null);
      setShowSpellbook(false);
      setShowCharacterSheet(false);
      setShowInGameSettings(false);
      
      // Reset input state on join to prevent stuck movement
      inputRef.current = { up: false, down: false, left: false, right: false };
      socket.emit('input', inputRef.current);
      
      // Link character to account if logged in
      const savedSession = localStorage.getItem('spellBrigadeSession');
      if (savedSession) {
        try {
          const { token, isGuest } = JSON.parse(savedSession);
          if (!isGuest && token) {
            fetch(`${SERVER_URL}/auth/link-character`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionToken: token, characterId: data.playerId }),
            }).catch(() => {});
          }
        } catch {}
      }
      
      // Auto-apply pending custom wizard if one was selected before joining
      if (pendingCustomWizardRef.current) {
        const classId = pendingCustomWizardRef.current;
        console.log('🧙 Applying pending custom wizard:', classId);
        pendingCustomWizardRef.current = null;
        // Small delay to ensure player is fully initialized on server
        setTimeout(() => {
          console.log('🧙 Emitting selectCustomWizard for:', classId);
          socket.emit('selectCustomWizard', { classId });
        }, 500);
      }
    });

    // Handle being kicked or join errors
    socket.on('kicked', (data) => {
      console.log('⚠️ Kicked from server:', data?.reason || 'Unknown reason');
      playerIdRef.current = null;
      setScreen('title');
      alert(data?.reason || 'You were disconnected from the server.');
    });
    
    socket.on('joinError', (data) => {
      console.log('⚠️ Join error:', data?.message || 'Unknown error');
      playerIdRef.current = null;
      setScreen('title');
      alert(data?.message || 'Failed to join the game. Please try again.');
    });

    let lastLeaderboardUpdate = 0;
    socket.on('gameState', (state) => {
      // Store state directly - no interpolation (was causing freeze on teleport)
      gameStateRef.current = { ...gameStateRef.current, ...state };
      
      const now = Date.now();
      
      // Update players online count (only when changed)
      if (state.players) {
        if (state.players.length !== playersOnlineRef.current) {
          playersOnlineRef.current = state.players.length;
          setPlayersOnline(state.players.length);
        }
        
        // Throttle leaderboard rebuild (kills don't change every tick)
        if (now - lastLeaderboardUpdate > 2000) {
          lastLeaderboardUpdate = now;
          const lb = [...state.players]
            .sort((a, b) => (b.kills || 0) - (a.kills || 0) || (b.level || 1) - (a.level || 1))
            .slice(0, 8)
            .map(p => ({ name: p.name, kills: p.kills || 0, level: p.level || 1, class: p.class }));
          setLeaderboardData(lb);
          
          // Update admin player list if admin
          if (adminKey === 'azoni-voidlord-2026') {
            setAdminPlayers(state.players.map(p => ({
              id: p.id,
              name: p.name,
              level: p.level,
              class: p.class,
              health: p.health,
              maxHealth: p.maxHealth,
              kills: p.kills,
              x: Math.round(p.x),
              y: Math.round(p.y),
            })));
          }
        }
      }
      
      const me = state.players?.find(p => p.id === playerIdRef.current);
      if (me) {
        playerDataRef.current = me;
        
        // Throttle playerInfo setState to ~4 Hz (canvas uses playerDataRef at full rate)
        if (now - playerInfoThrottleRef.current > 250) {
          playerInfoThrottleRef.current = now;
          setPlayerInfo(prev => {
            // Skip update if key display fields haven't changed
            if (prev && prev.health === me.health && prev.maxHealth === me.maxHealth &&
                prev.mana === me.mana && prev.maxMana === me.maxMana &&
                prev.level === me.level && prev.xp === me.xp &&
                prev.kills === me.kills && prev.x === me.x && prev.y === me.y) {
              return prev;
            }
            return { ...prev, ...me };
          });
        }
        
        // Sync dungeon state from server (update ref immediately for render loop)
        if (me.inDungeon !== inDungeonRef.current) {
          inDungeonRef.current = me.inDungeon || false;
          setInDungeon(me.inDungeon || false);
        }
        
        // Only update zone/buildings/NPCs when NOT in dungeon
        if (!me.inDungeon) {
          updateZone(me);
          
          // Check for nearby buildings (closer range to avoid accidental interaction)
          let foundBuildingId = null;
          let foundBuilding = null;
          for (const [id, building] of Object.entries(BUILDING_DATA)) {
            const dx = me.x - building.x;
            const dy = me.y - (building.y - building.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 60) { // Reduced from 100 to prevent walk-through interaction
              foundBuildingId = id;
              foundBuilding = { id, ...building };
              break;
            }
          }
          if (foundBuildingId !== nearbyBuildingRef.current) {
            nearbyBuildingRef.current = foundBuildingId;
            setNearbyBuilding(foundBuilding);
          }
          
          // Check for nearby NPCs
          let foundNpcId = null;
          let foundNpc = null;
          if (state.npcs) {
            for (const npc of state.npcs) {
              const dx = me.x - npc.x;
              const dy = me.y - npc.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < (npc.interactRange || 80)) {
                foundNpcId = npc.id;
                foundNpc = npc;
                break;
              }
            }
          }
          if (foundNpcId !== nearbyNpcRef.current) {
            nearbyNpcRef.current = foundNpcId;
            setNearbyNpc(foundNpc);
          }
          
          // Check for nearby portals
          let foundPortalId = null;
          let foundPortal = null;
          for (const [portalId, portal] of Object.entries(PORTAL_POSITIONS)) {
            const dx = me.x - portal.from.x;
            const dy = me.y - portal.from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 60) {
              foundPortalId = portalId;
              foundPortal = { id: portalId, ...portal };
              break;
            }
          }
          if (foundPortalId !== nearbyPortalRef.current) {
            nearbyPortalRef.current = foundPortalId;
            setNearbyPortal(foundPortal);
          }
        } else {
          // In dungeon - check for dungeon-specific portals
          if (nearbyBuildingRef.current !== null) {
            nearbyBuildingRef.current = null;
            setNearbyBuilding(null);
          }
          if (nearbyNpcRef.current !== null) {
            nearbyNpcRef.current = null;
            setNearbyNpc(null);
          }
          
          // Dungeon entrance exit portal (y < 300)
          if (me.y < 300) {
            if (nearbyPortalRef.current !== 'dungeon_exit') {
              nearbyPortalRef.current = 'dungeon_exit';
              setNearbyPortal({ id: 'dungeon_exit', name: 'Exit Dungeon', color: '#22c55e', isDungeonExit: true });
            }
          } 
          // Victory portal after dragon defeat
          else if (dungeonVictoryPortalRef.current && dungeonVictoryPortalRef.current.active) {
            const vp = dungeonVictoryPortalRef.current;
            const dx = me.x - vp.x;
            const dy = me.y - vp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              if (nearbyPortalRef.current !== 'dungeon_victory') {
                nearbyPortalRef.current = 'dungeon_victory';
                setNearbyPortal({ id: 'dungeon_victory', name: 'Victory Portal', color: '#fbbf24', isDungeonExit: true });
              }
            } else {
              if (nearbyPortalRef.current !== null) {
                nearbyPortalRef.current = null;
                setNearbyPortal(null);
              }
            }
          } else {
            if (nearbyPortalRef.current !== null) {
              nearbyPortalRef.current = null;
              setNearbyPortal(null);
            }
          }
        }
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
    
    socket.on('arrowStorm', (data) => {
      effectsRef.current.push({
        type: 'arrowStorm',
        x: data.x,
        y: data.y,
        radius: data.radius,
        startTime: Date.now(),
        duration: data.duration,
        playerId: data.playerId,
      });
    });
    
    socket.on('multishot', (data) => {
      effectsRef.current.push({
        type: 'multishot',
        x: data.x,
        y: data.y,
        startTime: Date.now(),
        duration: 600,
      });
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
      // Store victory portal location (update ref immediately for render loop)
      const victoryPortal = { x: data.x, y: data.y - 100, active: true };
      dungeonVictoryPortalRef.current = victoryPortal;
      setDungeonVictoryPortal(victoryPortal);
    });
    
    socket.on('dragonSlayerReward', (data) => {
      console.log(`🏆 Dragonslayer reward: ${data.xp} XP, Title: ${data.title}`);
      // Show unlock notification
      if (data.voidlordUnlocked) {
        effectsRef.current.push({
          type: 'announcement',
          text: '🏆 DRAGONSLAYER! Void Lord class unlocked!',
          subtext: '+20,000 XP',
          startTime: Date.now(),
          duration: 5000,
          color: '#ff00ff',
        });
      }
    });
    
    // Dragon awakens when player enters lair
    socket.on('dragonAwakens', (data) => {
      if (screenRef.current !== 'game') return;
      console.log('🐉 THE DRAGON AWAKENS!');
      effectsRef.current.push({
        type: 'dragonAwakens',
        x: data.x,
        y: data.y,
        startTime: Date.now(),
        duration: 3000,
      });
      screenShakeRef.current = { intensity: 20, duration: 2000, startTime: Date.now() };
      playSound('bossSpawn');
    });
    
    // Mini-boss events
    socket.on('minotaurCharge', (data) => {
      if (screenRef.current !== 'game') return;
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
      // Ignore notifications when not in game
      if (screenRef.current !== 'game') return;
      // Ignore world boss notifications when player is in dungeon
      if (inDungeonRef.current && data?.zone !== 'dungeon') {
        return;
      }
      
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
      // Ignore notifications when not in game
      if (screenRef.current !== 'game') return;
      console.log(`Boss defeated: ${data?.name} by ${data?.killerName}!`);
      
      // Ignore world boss notifications when player is in dungeon
      if (inDungeonRef.current && data.zone !== 'dungeon') {
        return;
      }
      
      // Show death banner (not respawn)
      setBossDeathBanner({
        name: data.name,
        zone: data.zone,
        bossType: data.bossType,
        killerName: data.killerName,
        dropsCount: data.dropsCount,
      });
      
      // Auto-hide after 5 seconds
      setTimeout(() => setBossDeathBanner(null), 5000);
      
      // Update quest progress
      if (data.zone && data.bossType) {
        setQuestLog(prev => {
          const updated = { ...prev };
          if (updated.allBosses && !updated.allBosses.completed) {
            updated.allBosses = {
              ...updated.allBosses,
              progress: {
                ...updated.allBosses.progress,
                [data.zone]: true,
              },
            };
            // Check if all bosses defeated
            const defeatedCount = Object.keys(updated.allBosses.progress).length;
            if (defeatedCount >= 6) {
              updated.allBosses.completed = true;
            }
          }
          return updated;
        });
      }
      
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
      console.log('Entered dungeon!', data);
      inDungeonRef.current = true; // Update ref immediately for render loop
      setInDungeon(true);
      setDungeonProgress(0);
      setNpcDialogue(null); // Close any open NPC dialogue
      setNearbyNpc(null); // Clear nearby NPC
      setNearbyBuilding(null); // Clear nearby building
      setNearbyPortal(null); // Clear nearby portal
      setShowDungeonBrowser(false); // Close dungeon browser
      // Store custom dungeon config if present
      customDungeonConfigRef.current = data.customDungeon || null;
      // Reset camera to dungeon start position - center horizontally
      const screenWidth = canvasRef.current?.width || 800;
      const screenHeight = canvasRef.current?.height || 600;
      const zoom = window.innerWidth < 768 ? 0.6 : 1;
      const viewWidth = screenWidth / zoom;
      const viewHeight = screenHeight / zoom;
      // Center camera on player in dungeon
      cameraRef.current = { 
        x: data.x - viewWidth / 2, 
        y: data.y - viewHeight / 2 
      };
      playSound('portalEnter');
      // Start dungeon music
      startZoneMusic('dungeon');
    });

    socket.on('exitedDungeon', (data) => {
      console.log('Exited dungeon');
      inDungeonRef.current = false; // Update ref immediately for render loop
      setInDungeon(false);
      customDungeonConfigRef.current = null; // Clear custom dungeon config
      // Reset camera to exit position
      if (data.x && data.y) {
        cameraRef.current = { x: data.x - 400, y: data.y - 300 };
      }
      setDungeonProgress(0);
      dungeonVictoryPortalRef.current = null; // Clear ref immediately
      setDungeonVictoryPortal(null); // Clear victory portal
      playSound('portalEnter');
      // Restore sanctuary music
      startZoneMusic('sanctuary');
    });

    socket.on('dungeonWarning', (data) => {
      console.log('⚠️ Dungeon warning:', data.message);
    });
    
    // Custom dungeon events
    socket.on('customDungeonCreated', (data) => {
      console.log('🏗️ Dungeon created:', data.dungeon?.name);
      setCustomDungeonList(prev => [data.dungeon, ...prev].slice(0, 20));
      setDungeonBrowserTab('browse');
      setDungeonPromptText('');
      setDungeonBrowserError('');
    });
    
    socket.on('customDungeonList', (data) => {
      setCustomDungeonList(data.dungeons || []);
    });
    
    socket.on('customDungeonError', (data) => {
      setDungeonBrowserError(data.message || 'Something went wrong.');
    });

    // Custom dungeon status (LLM generating)
    socket.on('customDungeonStatus', (data) => {
      setDungeonBrowserError(data.message || '');
    });

    // AI Wizard Creator
    socket.on('wizardGenerated', (data) => {
      console.log('🧙 Wizard generated:', data.classDef?.name);
      setGeneratedWizard(data);
      setWizardGenerating(false);
      setWizardStatus('');
      setWizardError('');
    });

    socket.on('wizardGenerateStatus', (data) => {
      setWizardStatus(data.message || 'Generating...');
    });

    socket.on('wizardGenerateError', (data) => {
      setWizardError(data.message || 'Something went wrong.');
      setWizardGenerating(false);
      setWizardStatus('');
    });

    socket.on('wizardApplied', (data) => {
      console.log('🧙 Wizard applied:', data.className);
      setWizardStatus(`✅ You are now a ${data.className}!`);
      setTimeout(() => setWizardStatus(''), 3000);
    });

    // Custom wizard ability visual effects
    socket.on('customAbilityEffect', (data) => {
      effectsRef.current.push({
        type: 'customAbility',
        x: data.x,
        y: data.y,
        radius: data.radius,
        color: data.color,
        name: data.name,
        startTime: Date.now(),
        duration: data.duration || 3000,
      });
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
      setPlayerInfo(prev => ({ 
        ...prev, 
        totalXp: data.totalXp, 
        upgrades: data.upgrades,
        damageMultiplier: data.damageMultiplier,
        maxHealth: data.maxHealth != null ? data.maxHealth : prev.maxHealth,
        health: data.health != null ? data.health : prev.health,
        speedMultiplier: data.speedMultiplier,
        cooldownMultiplier: data.cooldownMultiplier,
        attackSpeedMultiplier: data.attackSpeedMultiplier,
      }));
      playSound('levelUp');
    });

    socket.on('shopError', (data) => {
      console.log('Shop error:', data.message);
      setNotification({ text: data.message || 'Not enough XP!', color: '#ef4444' });
      setTimeout(() => setNotification(null), 3000);
    });

    // Chat messages
    socket.on('chatMessage', (msg) => {
      setChatMessages(prev => {
        const updated = [...prev, msg];
        if (updated.length > 50) updated.shift();
        return updated;
      });
      // Track unread when chat hidden
      if (!showChatRef.current) {
        setUnreadChat(prev => prev + 1);
      }
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

    // Emit leave when page is closed/refreshed
    const handleBeforeUnload = () => {
      if (playerIdRef.current && socket.connected) {
        socket.emit('leave');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      if (playerIdRef.current) {
        socket.emit('leave');
      }
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
      
      // Click to move (only on canvas, not UI elements)
      if (screen === 'game' && !isMobile && e.target?.tagName === 'CANVAS' && socketRef.current && playerIdRef.current) {
        const zoom = zoomRef.current || 1;
        const targetX = (e.clientX / zoom) + cameraRef.current.x;
        const targetY = (e.clientY / zoom) + cameraRef.current.y;
        socketRef.current.emit('clickMove', { targetX, targetY });
      }
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

      // Interact (E) - NPC dialogue, shop, portal, or dungeon exit
      if (e.code === 'KeyE') {
        // Close dialogue if open
        if (npcDialogue) {
          setNpcDialogue(null);
          return;
        }
        
        // Check for dungeon exit first (use ref to avoid stale closure)
        if (inDungeonRef.current) {
          const me = playerDataRef.current;
          if (me && me.y < 300) {
            // Near entrance exit portal
            socketRef.current?.emit('exitDungeon');
            return;
          }
          
          // Check for victory portal (after dragon defeat) - use ref
          const vp = dungeonVictoryPortalRef.current;
          if (me && vp && vp.active) {
            const dx = me.x - vp.x;
            const dy = me.y - vp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              // Use victory portal
              socketRef.current?.emit('exitDungeon');
              setDungeonVictoryPortal(null);
              dungeonVictoryPortalRef.current = null;
              return;
            }
          }
        }
        
        // Check for nearby portal (not in dungeon)
        if (!inDungeonRef.current) {
          const me = playerDataRef.current;
          if (me) {
            for (const [portalId, portal] of Object.entries(PORTAL_POSITIONS)) {
              const dx = me.x - portal.from.x;
              const dy = me.y - portal.from.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 60) {
                socketRef.current?.emit('usePortal', { portalId });
                return;
              }
            }
          }
        }
        
        // Check for nearby NPC first (not in dungeon)
        if (!inDungeonRef.current) {
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
        }
        
        // Otherwise toggle shop (only outside dungeon)
        if (!inDungeonRef.current) {
          setShowShop(prev => !prev);
        }
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
      if (e.code === 'KeyI' && socketRef.current && playerIdRef.current && adminKeyRef.current === 'azoni-voidlord-2026') {
        socketRef.current.emit('toggleInvincible');
        // Show feedback
        const newState = !playerDataRef.current?.invincible;
        setNotification({ text: `Invincibility ${newState ? 'ON' : 'OFF'}`, color: newState ? '#22c55e' : '#ef4444' });
        setTimeout(() => setNotification(null), 2000);
      }
      
      // Toggle Admin Panel (P) - Admin only
      if (e.code === 'KeyP' && adminKeyRef.current === 'azoni-voidlord-2026') {
        setShowAdminPanel(prev => !prev);
      }
      
      // Character Sheet (C)
      if (e.code === 'KeyC') {
        setShowCharacterSheet(prev => !prev);
      }

      // Spellbook toggle
      if (e.code === 'KeyB') {
        setShowSpellbook(prev => !prev);
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

      // ESC - close open panels, or toggle settings
      if (e.code === 'Escape' && playerIdRef.current) {
        const m = modalRef.current;
        
        // If typing in chat, blur input AND close chat panel - don't open settings
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          document.activeElement.blur();
          // Also close chat panel if it's the chat input
          if (showChatRef.current) {
            setShowChat(false);
          }
          return;
        }
        
        // Close any open modal first (don't open settings)
        if (m.npcDialogue) {
          setNpcDialogue(null);
        } else if (m.chat) {
          setShowChat(false);
        } else if (m.emotes || m.shop || m.skinSelect || m.questLog || m.characterSheet || m.spellbook) {
          setShowEmotes(false);
          setShowShop(false);
          setShowSkinSelect(false);
          setShowQuestLog(false);
          setShowCharacterSheet(false);
          setShowSpellbook(false);
        } else if (m.inGameSettings) {
          setShowInGameSettings(false);
        } else {
          // Nothing open - toggle settings
          setShowInGameSettings(prev => !prev);
        }
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
    
    // On mobile, enter aim mode instead of immediately firing
    if (isMobile) {
      if (ultCooldownRef.current > Date.now()) return; // Don't enter aim mode if on cooldown
      setUltAimMode(true);
      ultAimModeRef.current = true;
      return;
    }
    
    // Desktop: Cast ultimate in movement direction or forward
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

  // Fire ultimate at target position (used by mobile aim mode)
  const fireUltimateAt = (targetX, targetY) => {
    if (!socketRef.current || !playerIdRef.current) return;
    socketRef.current.emit('ultimate', { targetX, targetY });
    setUltAimMode(false);
    ultAimModeRef.current = false;
  };

  // Cancel ultimate aim mode
  const cancelUltAim = () => {
    setUltAimMode(false);
    ultAimModeRef.current = false;
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
    const joystickBounds = { left: 0, right: 180, top: window.innerHeight - 300, bottom: window.innerHeight };
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
    
    // If in ultimate aim mode, fire at tap location
    if (ultAimModeRef.current) {
      const touch = e.changedTouches[0];
      if (touch && !isInControlArea(touch.clientX, touch.clientY)) {
        const zoom = zoomRef.current || 1;
        const targetX = (touch.clientX / zoom) + cameraRef.current.x;
        const targetY = (touch.clientY / zoom) + cameraRef.current.y;
        fireUltimateAt(targetX, targetY);
        return;
      }
    }
    
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

    // Cache mobile detection (only changes on resize)
    let cachedIsMobileView = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cachedIsMobileView = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    };
    resize();
    window.addEventListener('resize', resize);

    const lerp = (a, b, t) => a + (b - a) * t;

    // Persistent zone cache (zones never change, cache across frames)
    const zoneCache = new Map();

    const render = () => {
      const { world, players, enemies, projectiles, xpOrbs, particles, damageNumbers } = gameStateRef.current;
      
      // Cache time once per frame (was 24+ Date.now() calls)
      const now = Date.now();
      const time = now / 1000;

      const me = players?.find(p => p.id === playerIdRef.current);
      const cam = cameraRef.current;
      const shake = screenShakeRef.current;

      // Mobile zoom - zoom out to see more of the world
      const isMobileView = cachedIsMobileView;
      const zoom = isMobileView ? 0.6 : 1; // 60% zoom on mobile = see ~67% more
      zoomRef.current = zoom;
      
      // Virtual dimensions (what we "see" in world space)
      const width = canvas.width / zoom;
      const height = canvas.height / zoom;

      // Camera follow player
      if (me) {
        cam.x = lerp(cam.x, me.x - width / 2, 0.15);
        cam.y = lerp(cam.y, me.y - height / 2, 0.15);
        
        // Different bounds for dungeon vs world
        if (inDungeonRef.current) {
          // Dungeon bounds: 1800 wide, 6000 tall (expanded)
          const dungeonWidth = 1800;
          const dungeonHeight = 6000;
          
          // If dungeon is narrower than screen, center it
          if (dungeonWidth < width) {
            cam.x = (dungeonWidth - width) / 2; // Center horizontally
          } else {
            cam.x = Math.max(0, Math.min(dungeonWidth - width, cam.x));
          }
          
          // Vertical bounds always apply
          if (dungeonHeight < height) {
            cam.y = (dungeonHeight - height) / 2;
          } else {
            cam.y = Math.max(0, Math.min(dungeonHeight - height, cam.y));
          }
        } else {
          cam.x = Math.max(0, Math.min(world.width - width, cam.x));
          cam.y = Math.max(0, Math.min(world.height - height, cam.y));
        }
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

      // PERFORMANCE: Zone cache persists across frames (zones never move)
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


      // Build render context for extracted rendering modules
      const rc = {
        ctx, cx, cy, width, height, now, time, zoom, isMobileView, me,
        players, enemies, projectiles, xpOrbs, particles, damageNumbers,
        world, getZone, classes,
        inDungeonRef, dungeonVictoryPortalRef, effectsRef, meteorWarningsRef,
        playerIdRef, settingsRef, touchTargetRef, minimapRef, gameStateRef,
        nearbyNpcId: nearbyNpcRef.current,
      };

      // Terrain
      if (inDungeonRef.current) {
        drawDungeon(rc);
      } else {
        drawWorld(rc);
      }

      // World overlay (border, touch target)
      drawWorldOverlay(rc);

      // Environment (sanctuary, buildings, campfire)
      drawEnvironment(rc);

      // NPCs
      drawNpcs(rc);

      // Portals
      drawPortals(rc);

      // Enemies (all types)
      drawEnemies(rc);

      // Projectiles
      drawProjectiles(rc);

      // Entities (XP orbs, players, particles, damage numbers)
      drawEntities(rc);

      // Visual effects (meteor warnings, explosions, abilities)
      drawEffects(rc);

      // Minimap
      drawMinimap(rc);

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
  // Full state reset for logout/account switch - prevents stale data leaking between sessions
  const resetGameState = () => {
    // Clear player identity
    playerIdRef.current = null;
    playerDataRef.current = null;
    setPlayerInfo(null);
    setSavedPlayer(null);
    setCharacters([]);
    setSelectedCharIdx(0);
    setPlayerName('');
    setSelectedSkin('');
    
    // Clear game world state
    gameStateRef.current = { players: {}, enemies: [], world: { width: 5000, height: 5000 } };
    setLeaderboardData([]);
    setChatMessages([]);
    setChatInput('');
    setPlayersOnline(0);
    
    // Clear dungeon state
    inDungeonRef.current = false;
    setInDungeon(false);
    setDungeonProgress(0);
    setDungeonVictoryPortal(null);
    dungeonVictoryPortalRef.current = null;
    
    // Clear modal/interaction state
    setNpcDialogue(null);
    setNearbyNpc(null);
    setNearbyBuilding(null);
    setNearbyPortal(null);
    setShowEmotes(false);
    setShowShop(false);
    setShowSkinSelect(false);
    setShowQuestLog(false);
    setShowCharacterSheet(false);
    setShowSpellbook(false);
    setShowInGameSettings(false);
    setShowLeaderboard(false);
    setShowChat(false);
    setBossDeathBanner(null);
    setQuestComplete(null);
    
    // Clear wizard creator state
    setGeneratedWizard(null);
    setWizardPrompt('');
    setWizardGenerating(false);
    setWizardError('');
    
    // Clear admin
    setAdminKey('');
    adminKeyRef.current = '';
    
    // Clear tracking refs for perf guards
    playersOnlineRef.current = 0;
    nearbyBuildingRef.current = null;
    nearbyNpcRef.current = null;
    nearbyPortalRef.current = null;
    
    // Disconnect socket if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave');
      socketRef.current.disconnect();
    }
    
    // Clear localStorage
    localStorage.removeItem('spellBrigadeSession');
    localStorage.removeItem('spellBrigadePlayerId');
  };

  const handleContinue = () => {
    initAudio();
    if (!savedPlayer) return;
    
    const charId = savedPlayer.id || null;
    const skinToUse = selectedSkin || savedPlayer.selectedSkin;
    
    // Ensure socket is connected
    if (!socketRef.current?.connected) {
      socketRef.current?.connect();
      socketRef.current?.once('connect', () => {
        socketRef.current?.emit('join', {
          playerId: charId,
          playerName: savedPlayer.name,
          playerClass: savedPlayer.class,
          selectedSkin: skinToUse,
          sessionToken: sessionTokenRef.current || null,
        });
      });
    } else {
      socketRef.current?.emit('join', {
        playerId: charId,
        playerName: savedPlayer.name,
        playerClass: savedPlayer.class,
        selectedSkin: skinToUse,
        sessionToken: sessionTokenRef.current || null,
      });
    }
  };

  const handleNewCharacter = () => {
    initAudio();
    setPlayerName('');
    // Admin defaults to shadow archer
    if (adminKey === 'azoni-voidlord-2026') {
      setSelectedClass('shadowarcher');
      setSelectedSkin('shadowarcher_default');
    } else {
      setSelectedClass('pyromancer');
      setSelectedSkin('pyromancer_default');
    }
    setTab('create');
  };

  const handleDeleteCharacter = async (charId) => {
    if (!authState.sessionToken || !charId) return;
    try {
      const res = await fetch(`${SERVER_URL}/auth/delete-character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: sessionTokenRef.current, characterId: charId }),
      });
      const data = await res.json();
      if (data.success) {
        setCharacters(data.characters || []);
        if (savedPlayer?.id === charId) {
          setSavedPlayer(data.characters?.[0] || null);
          setSelectedCharIdx(0);
        }
      }
    } catch (err) {
      console.error('Delete character error:', err);
    }
  };

  const handleJoin = (customClassId = null) => {
    initAudio();
    
    // If already connected with a player, leave first
    if (socketRef.current?.connected && playerIdRef.current) {
      socketRef.current.emit('leave');
    }
    
    // Clear any existing player state before joining
    playerIdRef.current = null;
    
    const name = playerName.trim() || generateWizardName();
    
    const joinData = {
      playerId: null, // Always null = create new character
      playerName: name,
      playerClass: customClassId || selectedClass,
      selectedSkin: customClassId ? (customClassId + '_default') : selectedSkin,
      sessionToken: sessionTokenRef.current || null,
      isCustomWizard: !!customClassId,
    };
    
    console.log('🎮 Joining with:', joinData.playerClass, customClassId ? '(custom wizard)' : '');
    
    if (!socketRef.current?.connected) {
      socketRef.current?.connect();
      socketRef.current?.once('connect', () => {
        socketRef.current?.emit('join', joinData);
      });
    } else {
      // Small delay to let leave process
      setTimeout(() => {
        socketRef.current?.emit('join', joinData);
      }, 100);
    }
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
      {/* Mobile Minimap Toggle Button */}
      {isMobile && settings.showMinimap && (
        <button
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '0.6rem',
            zIndex: 100,
          }}
          onTouchStart={(e) => { 
            e.preventDefault(); 
            setSettings(s => ({ ...s, showMinimap: false })); 
          }}
        >
          ×
        </button>
      )}
      {/* Mobile Minimap Show Button (when collapsed) */}
      {isMobile && !settings.showMinimap && screen === 'game' && (
        <button
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '6px 10px',
            borderRadius: 8,
            border: '2px solid rgba(255,255,255,0.3)',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            fontSize: '0.7rem',
            zIndex: 100,
          }}
          onTouchStart={(e) => { 
            e.preventDefault(); 
            setSettings(s => ({ ...s, showMinimap: true })); 
          }}
        >
          Map
        </button>
      )}

      {/* Global Styles */}

      <GlobalStyles screen={screen} />
      {/* Loading Screen */}

      <LoadingScreen visible={screen === 'loading'} styles={styles} />
      {/* Auth Screen */}

      <AuthScreen

        visible={screen === 'auth'}
        styles={styles}
        isMobile={isMobile}
        authScreen={authScreen}
        setAuthScreen={setAuthScreen}
        authLoading={authLoading}
        setAuthLoading={setAuthLoading}
        authError={authError}
        setAuthError={setAuthError}
        setAuthState={setAuthState}
        setAdminKey={setAdminKey}
        setSelectedClass={setSelectedClass}
        setSelectedSkin={setSelectedSkin}
        setSettings={setSettings}
        setQuestLog={setQuestLog}
        setCharacters={setCharacters}
        setSavedPlayer={setSavedPlayer}
        setSelectedCharIdx={setSelectedCharIdx}
        setScreen={setScreen}
        playersOnline={playersOnline}
        socketRef={socketRef}
        sessionTokenRef={sessionTokenRef}
        SERVER_URL={SERVER_URL}
      />

      {/* Title Screen */}

      <TitleScreen
        visible={screen === 'title'}
        styles={styles}
        isMobile={isMobile}
        tab={tab}
        setTab={setTab}
        playersOnline={playersOnline}
        classes={classes}
        selectedClass={selectedClass}
        playerName={playerName}
        setPlayerName={setPlayerName}
        savedPlayer={savedPlayer}
        setSavedPlayer={setSavedPlayer}
        characters={characters}
        setCharacters={setCharacters}
        selectedCharIdx={selectedCharIdx}
        setSelectedCharIdx={setSelectedCharIdx}
        authState={authState}
        setAuthState={setAuthState}
        playerInfo={playerInfo}
        adminKey={adminKey}
        setAdminKey={setAdminKey}
        wizardPrompt={wizardPrompt}
        setWizardPrompt={setWizardPrompt}
        wizardGenerating={wizardGenerating}
        setWizardGenerating={setWizardGenerating}
        wizardStatus={wizardStatus}
        wizardError={wizardError}
        setWizardError={setWizardError}
        generatedWizard={generatedWizard}
        setGeneratedWizard={setGeneratedWizard}
        socketRef={socketRef}
        sessionTokenRef={sessionTokenRef}
        screenRef={screenRef}
        pendingCustomWizardRef={pendingCustomWizardRef}
        handleJoin={handleJoin}
        handleClassChange={handleClassChange}
        selectedSkin={selectedSkin}
        setSelectedSkin={setSelectedSkin}
        confirmDeleteId={confirmDeleteId}
        setConfirmDeleteId={setConfirmDeleteId}
        setScreen={setScreen}
        playerIdRef={playerIdRef}
        handleNewCharacter={() => { setSavedPlayer(null); setTab('create'); }}
        resetGameState={resetGameState}
        settings={settings}
        setSettings={setSettings}
        SVG={SVG}
        CLASS_SVG={CLASS_SVG}
        DEFAULT_CLASSES={DEFAULT_CLASSES}
        DEFAULT_SKINS={DEFAULT_SKINS}
        SERVER_URL={SERVER_URL}
      />

      {/* Death Screen */}

      <DeathScreen

        visible={screen === 'dead'}
        styles={styles}
        SVG={SVG}
        deathInfo={deathInfo}
        playerInfo={playerInfo}
        handleRespawn={handleRespawn}
        onReturnToMenu={() => {

          setDeathInfo(null);

          // Save character info before clearing player ID
          if (playerInfo && playerIdRef.current) {

            const charSummary = {

              id: playerIdRef.current,

              name: playerInfo.name,

              class: playerInfo.class,

              level: playerInfo.level,

              totalXp: playerInfo.totalXp || 0,

              kills: playerInfo.kills || 0,

              selectedSkin: playerInfo.selectedSkin,

              bossKills: playerInfo.bossKills || {},

              upgrades: playerInfo.upgrades || {},

            };

            setSavedPlayer(charSummary);

            setCharacters(prev => prev.map(c => c.id === charSummary.id ? charSummary : c));

            setSelectedSkin(playerInfo.selectedSkin || '');

          }

          // Emit leave before disconnecting so server removes player
          socketRef.current?.emit('leave');
          
          // Clear player state BEFORE disconnecting to prevent reconnection attempts
          playerIdRef.current = null;
          
          // Small delay to let leave process on server
          setTimeout(() => {
            socketRef.current?.disconnect();
          }, 100);

          inDungeonRef.current = false;

          setInDungeon(false);

          setTab('play');

          setScreen('title');

        }}

      />

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
            <span style={{ width: 18, height: 18, display: 'inline-flex', color: '#f97316' }}>{SVG.dragon}</span> Dragon's Gauntlet
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
              width: `${Math.min(100, (playerInfo.y || 200) / 60)}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
          
          <div style={{ color: '#a8a29e', fontSize: '0.8rem' }}>
            Depth: {Math.min(7, Math.floor((playerInfo.y || 200) / 800))} / 7
            {playerInfo.y > 5000 && (
              <span style={{ color: '#f97316', marginLeft: 10 }}>⚠️ DRAGON LAIR</span>
            )}
          </div>
          
          {/* Exit button (mobile) */}
          {isMobile && playerInfo.y < 400 && (
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
              <span style={{ width: 16, height: 16, display: 'inline-flex' }}>{SVG.home}</span> Exit Dungeon
            </button>
          )}
        </div>
      )}

      {/* Game HUD */}
      {screen === 'game' && playerInfo && (
        <>
          {/* Admin Notification */}
          {notification && (
            <div style={{
              position: 'fixed',
              top: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              background: `${notification.color}20`,
              border: `2px solid ${notification.color}`,
              borderRadius: 10,
              padding: '12px 24px',
              zIndex: 1100,
              color: notification.color,
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: `0 0 20px ${notification.color}40`,
            }}>
              {notification.text}
            </div>
          )}
          
          {/* Stats Panel - Desktop */}
          {!isMobile && (
            <div style={styles.hud}>
              <div style={styles.hudPanel}>
                <div style={styles.playerHeader}>
                  <div style={styles.avatar(classes[playerInfo.class]?.color || '#fff')}>
                    <span style={styles.avatarIcon}>{CLASS_SVG[playerInfo.class] || SVG.arcane}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playerInfo.name}</div>
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

                {/* Skin Change - mobile only button */}
                {isMobile && (
                  <button
                    style={{
                      marginTop: 12,
                      padding: '8px 12px',
                      background: 'rgba(236,72,153,0.15)',
                      border: '1px solid rgba(236,72,153,0.3)',
                      borderRadius: 8,
                      color: '#ec4899',
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
                )}

                {/* Quest Progress - Compact */}
                <div 
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: '1px solid rgba(255,215,0,0.15)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowQuestLog(true)}
                >
                  {(() => {
                    const bossKills = playerInfo.bossKills || {};
                    const zones = ['meadow', 'forest', 'volcanic', 'frozen', 'crystal_caves', 'abyss'];
                    const defeated = zones.filter(z => bossKills[z]).length;
                    const allDone = defeated === 6;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#ffd93d', fontSize: '0.65rem' }}>📜</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#ffd93d', fontSize: '0.6rem', fontWeight: 600, marginBottom: 3 }}>
                            {allDone ? '🐉 Dragon Slayer' : `⭐ ${defeated}/6 Bosses`}
                          </div>
                          <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(defeated / 6) * 100}%`, background: allDone ? '#22c55e' : '#ffd93d', borderRadius: 1 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
              gap: 8,
              zIndex: 100,
              background: 'rgba(0,0,0,0.4)',
              padding: '10px 15px',
              borderRadius: 12,
              backdropFilter: 'blur(5px)',
            }}>
              {/* Dash Button */}
              {(() => {
                const classData = classes[playerInfo.class];
                const dashCd = classData?.dashCooldown || 3000;
                const onCooldown = dashCooldownRef.current > Date.now();
                const cdRemaining = onCooldown ? Math.ceil((dashCooldownRef.current - Date.now()) / 1000) : 0;
                const color = classes[playerInfo.class]?.color || '#888';
                
                return (
                  <div
                    onClick={() => {
                      if (!onCooldown && socketRef.current) {
                        socketRef.current.emit('dash');
                      }
                    }}
                    title={`${classData?.dash || 'Dash'} - Quick movement ability (SPACE)`}
                    style={{
                      width: 65,
                      height: 65,
                      borderRadius: 10,
                      background: onCooldown ? 'rgba(50,50,50,0.9)' : `linear-gradient(135deg, ${color}40, ${color}20)`,
                      border: `2px solid ${color}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: onCooldown ? 'not-allowed' : 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: 3, left: 5, fontSize: '0.6rem', color: '#fff', fontWeight: 'bold' }}>SPACE</div>
                    <div style={{ fontSize: '0.65rem', color: '#fff', textAlign: 'center', marginTop: 8 }}>
                      {classData?.dash || 'Dash'}
                    </div>
                    {onCooldown && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 'bold', color: '#f87171',
                      }}>{cdRemaining}</div>
                    )}
                  </div>
                );
              })()}
              
              {/* Ultimate Button */}
              {(() => {
                const classData = classes[playerInfo.class];
                const ultCd = classData?.ultimateCooldown || 30000;
                const onCooldown = ultCooldownRef.current > Date.now();
                const cdRemaining = onCooldown ? Math.ceil((ultCooldownRef.current - Date.now()) / 1000) : 0;
                const color = classes[playerInfo.class]?.secondaryColor || classes[playerInfo.class]?.color || '#888';
                
                return (
                  <div
                    onClick={() => {
                      if (!onCooldown && socketRef.current) {
                        const me = playerDataRef.current;
                        const canvas = canvasRef.current;
                        const cx = (me?.x || 0) - (canvas?.width || 800) / 2;
                        const cy = (me?.y || 0) - (canvas?.height || 600) / 2;
                        const targetX = mouseRef.current ? cx + mouseRef.current.x : me?.x;
                        const targetY = mouseRef.current ? cy + mouseRef.current.y : me?.y;
                        socketRef.current.emit('ultimate', { targetX, targetY });
                      }
                    }}
                    title={`${classData?.ultimate || 'Ultimate'} - Powerful ability (Q)`}
                    style={{
                      width: 65,
                      height: 65,
                      borderRadius: 10,
                      background: onCooldown ? 'rgba(50,50,50,0.9)' : `linear-gradient(135deg, ${color}40, ${color}20)`,
                      border: `2px solid ${color}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: onCooldown ? 'not-allowed' : 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: 3, left: 5, fontSize: '0.6rem', color: '#fff', fontWeight: 'bold' }}>Q</div>
                    <div style={{ fontSize: '0.65rem', color: '#fff', textAlign: 'center', marginTop: 8 }}>
                      {classData?.ultimate || 'Ultimate'}
                    </div>
                    {onCooldown && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 'bold', color: '#f87171',
                      }}>{cdRemaining}</div>
                    )}
                  </div>
                );
              })()}
              
              {/* Divider */}
              <div style={{ width: 2, background: 'rgba(255,255,255,0.1)', margin: '5px 5px' }} />
              {/* Class Abilities 1-3 */}
              {[1, 2, 3].map(slot => {
                const levelReqs = { 1: 10, 2: 20, 3: 30 };
                const abilityNames = {
                  pyromancer: { 1: 'Flame Shield', 2: 'Meteor Strike', 3: 'Inferno' },
                  cryomancer: { 1: 'Frost Nova', 2: 'Ice Lance', 3: 'Glacial Storm' },
                  arcanist: { 1: 'Blink', 2: 'Arcane Barrage', 3: 'Time Warp' },
                  stormcaller: { 1: 'Static Field', 2: 'Ball Lightning', 3: 'Thunder God' },
                  voidlord: { 1: 'Void Rift', 2: 'Soul Drain', 3: 'Apocalypse' },
                  shadowarcher: { 1: "Hunter's Mark", 2: 'Multishot', 3: 'Death Arrow' },
                };
                const abilityDescs = {
                  pyromancer: { 1: 'Damage aura around you', 2: 'Delayed AOE at target', 3: 'Massive explosion' },
                  cryomancer: { 1: 'Freeze nearby enemies', 2: 'Piercing ice bolt', 3: 'Blizzard zone' },
                  arcanist: { 1: 'Teleport forward', 2: 'Homing missiles', 3: 'Speed boost' },
                  stormcaller: { 1: 'Chain lightning', 2: 'Bouncing orb', 3: 'Storm avatar' },
                  voidlord: { 1: 'Pull enemies', 2: 'Lifesteal', 3: 'Devastation' },
                  shadowarcher: { 1: 'Piercing shot', 2: 'Arrow burst', 3: 'Lethal strike' },
                };
                const abilityIcons = {
                  pyromancer: { 1: '🔥', 2: '☄️', 3: '💥' },
                  cryomancer: { 1: '❄️', 2: '🧊', 3: '🌨️' },
                  arcanist: { 1: '✨', 2: '💫', 3: '⏳' },
                  stormcaller: { 1: '⚡', 2: '🔮', 3: '🌩️' },
                  voidlord: { 1: '🕳️', 2: '💀', 3: '☠️' },
                  shadowarcher: { 1: '🎯', 2: '🏹', 3: '💀' },
                };
                const abilityColors = {
                  pyromancer: '#ff6b35',
                  cryomancer: '#00ffff',
                  arcanist: '#9b5de5',
                  stormcaller: '#ffff00',
                  voidlord: '#ff00ff',
                  shadowarcher: '#dc2626',
                };
                
                // Check for custom wizard ability data
                let abilityName = abilityNames[playerInfo.class]?.[slot];
                let abilityDesc = abilityDescs[playerInfo.class]?.[slot];
                let abilityIcon = abilityIcons[playerInfo.class]?.[slot];
                let color = abilityColors[playerInfo.class];
                
                if (!abilityName && generatedWizard?.spellDefs) {
                  // Custom wizard - look up ability from generated data
                  const abilityId = generatedWizard.classDef?.abilities?.[slot];
                  if (abilityId && generatedWizard.spellDefs[abilityId]) {
                    const ab = generatedWizard.spellDefs[abilityId];
                    abilityName = ab.name;
                    abilityDesc = ab.description || '';
                    color = ab.color || generatedWizard.classDef?.color;
                  }
                }
                abilityName = abilityName || `Ability ${slot}`;
                abilityDesc = abilityDesc || '';
                abilityIcon = abilityIcon || '✨';
                color = color || classes[playerInfo.class]?.color || '#888';
                
                const unlocked = playerInfo.level >= levelReqs[slot];
                const cooldownEnd = abilityCooldowns[slot] || 0;
                const onCooldown = cooldownEnd > Date.now();
                const cdRemaining = onCooldown ? Math.ceil((cooldownEnd - Date.now()) / 1000) : 0;
                
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
                    title={unlocked ? `${abilityName} - ${abilityDesc} (Key: ${slot})` : `Unlocks at Level ${levelReqs[slot]}`}
                    style={{
                      width: 65,
                      height: 65,
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
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', top: 3, left: 5, fontSize: '0.55rem', color: '#fff80', fontWeight: 'bold' }}>{slot}</div>
                    <span style={{ fontSize: '1.1rem', filter: onCooldown ? 'grayscale(1) brightness(0.4)' : 'none' }}>{unlocked ? abilityIcon : '🔒'}</span>
                    <div style={{ fontSize: '0.5rem', color: unlocked ? '#fff' : '#666', textAlign: 'center', lineHeight: 1.1 }}>
                      {unlocked ? abilityName : `Lv${levelReqs[slot]}`}
                    </div>
                    {onCooldown && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color }}>{cdRemaining}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Spellbook Button */}
              <div style={{ width: 2, background: 'rgba(255,255,255,0.1)', margin: '5px 3px' }} />
              <div
                onClick={() => setShowSpellbook(prev => !prev)}
                title="Spellbook (B)"
                style={{
                  width: 45, height: 65, borderRadius: 10,
                  background: showSpellbook ? 'rgba(255,215,61,0.2)' : 'rgba(50,50,50,0.6)',
                  border: `2px solid ${showSpellbook ? '#ffd93d' : 'rgba(255,255,255,0.15)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>📖</span>
                <div style={{ fontSize: '0.45rem', color: showSpellbook ? '#ffd93d' : '#888', fontWeight: 600, marginTop: 2 }}>B</div>
              </div>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playerInfo.name}</div>
                    <div style={{ fontSize: '.65rem', color: '#888' }}>Lv {playerInfo.level}</div>
                  </div>
                  {/* Quest Log button */}
                  <button
                    onClick={() => setShowQuestLog(true)}
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                  </button>
                  {/* Character Sheet button */}
                  <button
                    onClick={() => setShowCharacterSheet(prev => !prev)}
                    style={{
                      background: 'rgba(103,232,249,0.2)',
                      border: '1px solid rgba(103,232,249,0.4)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      color: '#67e8f9',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </button>
                  {/* Settings button - moved to below bars */}
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
                <div style={{ marginBottom: 8 }}>
                  <div style={{ ...styles.barBg, height: 6 }}>
                    <div style={styles.barFill(
                      playerInfo.xp / (playerInfo.xpToLevel || 100) * 100,
                      'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                    )} />
                  </div>
                </div>

                {/* Quest Progress - Mobile Compact */}
                <div 
                  style={{
                    marginBottom: 8,
                    paddingBottom: 6,
                    borderBottom: '1px solid rgba(255,215,0,0.1)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowQuestLog(true)}
                >
                  {(() => {
                    const bossKills = playerInfo.bossKills || {};
                    const zones = ['meadow', 'forest', 'volcanic', 'frozen', 'crystal_caves', 'abyss'];
                    const defeated = zones.filter(z => bossKills[z]).length;
                    const allDone = defeated === 6;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#ffd93d', fontSize: '0.6rem' }}>📜</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#ffd93d', fontSize: '0.55rem', fontWeight: 600, marginBottom: 2 }}>
                            {allDone ? '🐉 Dragon!' : `⭐ ${defeated}/6`}
                          </div>
                          <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(defeated / 6) * 100}%`, background: allDone ? '#22c55e' : '#ffd93d', borderRadius: 1 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Settings + Leaderboard row - positioned below quest section */}
                <div style={{ display: 'flex', gap: 6, marginTop: 4, marginBottom: 6 }}>
                  <button
                    onClick={() => setShowInGameSettings(true)}
                    style={{
                      background: 'rgba(100,100,100,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 6,
                      padding: '5px 10px',
                      color: '#aaa',
                      fontSize: '0.6rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58z"/>
                    </svg>
                  </button>
                  <div style={{ flex: 1, fontSize: '0.55rem', color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/></svg>
                    <span style={{ color: '#ffd93d', fontWeight: 600 }}>LEADERBOARD</span>
                  </div>
                </div>

                {/* Always-visible compact leaderboard */}
                {leaderboardData.length > 0 && (
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 8,
                    border: '1px solid rgba(255,215,61,0.1)',
                    padding: '4px 6px',
                  }}>
                    {leaderboardData.slice(0, 5).map((p, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '2px 0',
                        borderBottom: i < Math.min(leaderboardData.length, 5) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      }}>
                        <span style={{
                          width: 12,
                          fontSize: '0.55rem',
                          fontWeight: 700,
                          color: i === 0 ? '#ffd93d' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#555',
                          textAlign: 'center',
                        }}>
                          {i + 1}
                        </span>
                        <span style={{
                          flex: 1,
                          fontSize: '0.6rem',
                          color: p.name === playerInfo?.name ? '#ffd93d' : '#bbb',
                          fontWeight: p.name === playerInfo?.name ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: '0.5rem', color: '#777' }}>Lv{p.level}</span>
                        <span style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 600, minWidth: 18, textAlign: 'right' }}>
                          {p.kills}
                        </span>
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="#ef4444" style={{ flexShrink: 0 }}>
                          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                )}
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
                bottom: 80,
                right: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                pointerEvents: 'auto',
                touchAction: 'none',
              }}>
                {/* Row 1: Secondary buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Auto-Attack Toggle (for PvP classes) */}
                  {(playerInfo?.class === 'voidlord' || playerInfo?.class === 'shadowarcher') && (
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
                  {/* PvP Toggle (for PvP classes) */}
                  {(playerInfo?.class === 'voidlord' || playerInfo?.class === 'shadowarcher') && (
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
                      position: 'relative',
                    }}
                    onTouchStart={(e) => { e.preventDefault(); setShowChat(prev => !prev); }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>💬</span>
                    {unreadChat > 0 && !showChat && (
                      <div style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(0,0,0,0.5)',
                      }}>
                        {unreadChat > 9 ? '9+' : unreadChat}
                      </div>
                    )}
                  </button>
                </div>

                {/* Row 2: Main action buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {/* Dash Button */}
                  <div style={{ position: 'relative' }}>
                    {(() => {
                      const onCd = dashCooldownRef.current > Date.now();
                      const cdSec = onCd ? Math.ceil((dashCooldownRef.current - Date.now()) / 1000) : 0;
                      return (
                    <button
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 12,
                        border: `2px solid ${onCd ? 'rgba(78,205,196,0.3)' : '#4ecdc4'}`,
                        background: onCd ? 'rgba(0,0,0,0.7)' : 'linear-gradient(145deg, rgba(78,205,196,0.25), rgba(78,205,196,0.1))',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        boxShadow: onCd ? 'none' : '0 0 15px rgba(78,205,196,0.3)',
                      }}
                      onTouchStart={(e) => { e.preventDefault(); handleDashButton(); }}
                    >
                      <span style={{ width: 22, height: 22, color: onCd ? '#666' : '#4ecdc4' }}>{SVG.dash}</span>
                      {onCd ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4ecdc4' }}>
                          {cdSec}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.55rem', color: '#4ecdc4', fontWeight: 600 }}>DASH</span>
                      )}
                    </button>
                      );
                    })()}
                  </div>
                  {/* Ultimate Button */}
                  <div style={{ position: 'relative' }}>
                    {(() => {
                      const onCd = ultCooldownRef.current > Date.now();
                      const cdSec = onCd ? Math.ceil((ultCooldownRef.current - Date.now()) / 1000) : 0;
                      return (
                    <button
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 12,
                        border: `2px solid ${onCd ? 'rgba(255,107,53,0.3)' : ultAimMode ? '#ffd93d' : '#ff6b35'}`,
                        background: onCd ? 'rgba(0,0,0,0.7)' : ultAimMode 
                          ? 'linear-gradient(145deg, rgba(255,215,61,0.4), rgba(255,107,53,0.2))' 
                          : 'linear-gradient(145deg, rgba(255,107,53,0.25), rgba(255,107,53,0.1))',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        transform: ultAimMode ? 'scale(1.08)' : 'scale(1)',
                        boxShadow: ultAimMode ? '0 0 20px rgba(255,215,0,0.5)' : onCd ? 'none' : '0 0 15px rgba(255,107,53,0.3)',
                        transition: 'all 0.15s',
                      }}
                      onTouchStart={(e) => { e.preventDefault(); handleUltimateButton(); }}
                    >
                      <span style={{ width: 22, height: 22, color: onCd ? '#666' : ultAimMode ? '#ffd93d' : '#ff6b35' }}>{SVG.warning}</span>
                      {onCd && !ultAimMode ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ff6b35' }}>
                          {cdSec}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.55rem', color: ultAimMode ? '#ffd93d' : '#ff6b35', fontWeight: 600 }}>
                          {ultAimMode ? 'TAP!' : 'ULT'}
                        </span>
                      )}
                    </button>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Row 3: Class Abilities (unlocked at levels 10, 20, 30) */}
                {playerInfo && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {[1, 2, 3].map(slot => {
                      const levelReq = { 1: 10, 2: 20, 3: 30 }[slot];
                      const unlocked = playerInfo.level >= levelReq;
                      let classColor = classes[playerInfo.class]?.color || '#888';
                      const cooldownEnd = abilityCooldowns[slot] || 0;
                      const now = Date.now();
                      const onCooldown = cooldownEnd > now;
                      const remainingMs = onCooldown ? cooldownEnd - now : 0;
                      const cdSec = Math.ceil(remainingMs / 1000);
                      
                      // Ability icons per class/slot
                      const abilityIcons = {
                        pyromancer: { 1: '🔥', 2: '☄️', 3: '💥' },
                        cryomancer: { 1: '❄️', 2: '🧊', 3: '🌨️' },
                        arcanist: { 1: '✨', 2: '💫', 3: '⏳' },
                        stormcaller: { 1: '⚡', 2: '🔮', 3: '🌩️' },
                        voidlord: { 1: '🕳️', 2: '💀', 3: '☠️' },
                        shadowarcher: { 1: '🎯', 2: '🏹', 3: '💀' },
                      };
                      let icon = abilityIcons[playerInfo.class]?.[slot];
                      
                      // Custom wizard ability icon/color
                      if (!icon && generatedWizard?.spellDefs) {
                        const abilityId = generatedWizard.classDef?.abilities?.[slot];
                        if (abilityId && generatedWizard.spellDefs[abilityId]) {
                          classColor = generatedWizard.spellDefs[abilityId].color || classColor;
                        }
                      }
                      icon = icon || '✨';
                      
                      return (
                        <button
                          key={slot}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            border: `2px solid ${unlocked ? (onCooldown ? `${classColor}40` : classColor) : '#444'}`,
                            background: unlocked 
                              ? (onCooldown ? 'rgba(0,0,0,0.7)' : `linear-gradient(145deg, ${classColor}20, ${classColor}08)`)
                              : 'rgba(0,0,0,0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: unlocked ? 1 : 0.4,
                            pointerEvents: unlocked ? 'auto' : 'none',
                            boxShadow: unlocked && !onCooldown ? `0 0 10px ${classColor}30` : 'none',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            if (unlocked && !onCooldown) {
                              const me = playerDataRef.current;
                              if (me) {
                                const targetX = me.x + (me.facing === 'right' ? 100 : me.facing === 'left' ? -100 : 0);
                                const targetY = me.y + (me.facing === 'down' ? 100 : me.facing === 'up' ? -100 : 0);
                                socketRef.current?.emit('classAbility', { abilitySlot: slot, targetX, targetY });
                              }
                            }
                          }}
                        >
                          {unlocked ? (
                            <>
                              <span style={{ fontSize: '1.2rem', filter: onCooldown ? 'grayscale(1) brightness(0.5)' : 'none' }}>{icon}</span>
                              {onCooldown && (
                                <div style={{
                                  position: 'absolute', inset: 0,
                                  background: 'rgba(0,0,0,0.5)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  borderRadius: 8,
                                }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: classColor }}>{cdSec}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.9rem', filter: 'grayscale(1)', opacity: 0.4 }}>{icon}</span>
                              <span style={{ fontSize: '0.4rem', color: '#555', position: 'absolute', bottom: 2 }}>Lv{levelReq}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ultimate Aim Mode Overlay */}
          {ultAimMode && isMobile && (
            <>
              {/* Semi-transparent overlay - more subtle */}
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255,107,53,0.05)',
                pointerEvents: 'none',
                zIndex: 150,
                border: '3px solid rgba(255,107,53,0.4)',
                boxSizing: 'border-box',
              }} />
              
              {/* Compact instruction banner */}
              <div style={{
                position: 'fixed',
                top: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid rgba(255,107,53,0.5)',
                zIndex: 151,
                textAlign: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{ color: '#ff6b35', fontSize: '0.9rem', fontWeight: 600 }}>
                  TAP TO AIM ULTIMATE
                </div>
              </div>
              
              {/* Cancel button */}
              <button
                onTouchStart={(e) => { e.preventDefault(); cancelUltAim(); }}
                style={{
                  position: 'fixed',
                  bottom: 200,
                  right: 15,
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  borderRadius: 6,
                  padding: '8px 14px',
                  color: '#ef4444',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  zIndex: 152,
                }}
              >
                CANCEL
              </button>
            </>
          )}
        </>
      )}

      {/* Game Modals - Extracted to components/Modals/GameModals.jsx */}
      <GameModals
        screen={screen}
        showSkinSelect={showSkinSelect}
        setShowSkinSelect={setShowSkinSelect}
        showShop={showShop}
        setShowShop={setShowShop}
        showDungeonBrowser={showDungeonBrowser}
        setShowDungeonBrowser={setShowDungeonBrowser}
        npcDialogue={npcDialogue}
        setNpcDialogue={setNpcDialogue}
        showQuestLog={showQuestLog}
        setShowQuestLog={setShowQuestLog}
        showInGameSettings={showInGameSettings}
        setShowInGameSettings={setShowInGameSettings}
        showCharacterSheet={showCharacterSheet}
        setShowCharacterSheet={setShowCharacterSheet}
        showSpellbook={showSpellbook}
        setShowSpellbook={setShowSpellbook}
        showAdminPanel={showAdminPanel}
        setShowAdminPanel={setShowAdminPanel}
        showEmotes={showEmotes}
        setShowEmotes={setShowEmotes}
        showChat={showChat}
        setShowChat={setShowChat}
        showLeaderboard={showLeaderboard}
        setShowLeaderboard={setShowLeaderboard}
        styles={styles}
        isMobile={isMobile}
        SVG={SVG}
        CLASS_SVG={CLASS_SVG}
        DEFAULT_SKINS={DEFAULT_SKINS}
        classes={classes}
        playerInfo={playerInfo}
        nearbyBuilding={nearbyBuilding}
        nearbyNpc={nearbyNpc}
        nearbyPortal={nearbyPortal}
        questLog={questLog}
        setQuestLog={setQuestLog}
        settings={settings}
        setSettings={setSettings}
        adminKey={adminKey}
        leaderboardData={leaderboardData}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        chatContainerRef={chatContainerRef}
        bossAlert={bossAlert}
        levelUp={levelUp}
        notification={notification}
        dungeonBrowserTab={dungeonBrowserTab}
        setDungeonBrowserTab={setDungeonBrowserTab}
        dungeonBrowserError={dungeonBrowserError}
        setDungeonBrowserError={setDungeonBrowserError}
        dungeonPromptText={dungeonPromptText}
        setDungeonPromptText={setDungeonPromptText}
        customDungeonList={customDungeonList}
        dungeonVictoryPortal={dungeonVictoryPortal}
        setDungeonVictoryPortal={setDungeonVictoryPortal}
        dungeonVictoryPortalRef={dungeonVictoryPortalRef}
        handleChangeSkin={handleChangeSkin}
        socketRef={socketRef}
        playerIdRef={playerIdRef}
        playSound={playSound}
        sessionTokenRef={sessionTokenRef}
        setScreen={setScreen}
        setSavedPlayer={setSavedPlayer}
        setCharacters={setCharacters}
        setAdminKey={setAdminKey}
        setAuthState={setAuthState}
      />

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
            <div style={{ fontSize: '4rem', marginBottom: 20 }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="35" fill="#ffd93d" stroke="#b8860b" strokeWidth="3"/>
                <path d="M40 20 L45 35 L60 35 L48 45 L53 60 L40 50 L27 60 L32 45 L20 35 L35 35 Z" fill="#b8860b"/>
              </svg>
            </div>
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
                <div style={{ color: '#888', fontSize: '0.8rem' }}>TITLE UNLOCKED</div>
                <div style={{ color: '#ffd93d', fontSize: '1.2rem', fontWeight: 600 }}>{questComplete.title}</div>
              </div>
            </div>
            <div style={{ 
              color: '#22c55e', 
              fontSize: '1rem',
              animation: 'pulse 1s infinite',
            }}>
              You have conquered all zone bosses!
            </div>
          </div>
        </div>
      )}

      {/* Boss Death Banner - Subtle notification */}
      {bossDeathBanner && screen === 'game' && (
        <div style={{
          position: 'fixed',
          top: isMobile ? 60 : 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)',
          padding: '10px 20px',
          borderRadius: 8,
          zIndex: 200,
          animation: 'fadeInDown 0.3s ease-out',
          border: '1px solid rgba(255,215,61,0.4)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <style>{`
            @keyframes fadeInDown {
              from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
              to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.2rem' }}>💀</span>
            <div>
              <div style={{
                color: '#ffd93d',
                fontSize: isMobile ? '0.85rem' : '0.95rem',
                fontWeight: 600,
              }}>
                {bossDeathBanner.name} Defeated
              </div>
              <div style={{
                color: '#888',
                fontSize: isMobile ? '0.7rem' : '0.75rem',
              }}>
                by <span style={{ color: '#4ade80' }}>{bossDeathBanner.killerName}</span>
                {bossDeathBanner.dropsCount > 0 && (
                  <span style={{ color: '#a855f7' }}> • {bossDeathBanner.dropsCount} drop{bossDeathBanner.dropsCount > 1 ? 's' : ''}</span>
                )}
              </div>
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