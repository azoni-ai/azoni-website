/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { io } from 'socket.io-client';

// Local imports
import { SVG, CLASS_SVG, WIZARD_ICONS } from './constants/icons';
import { COLORS, DEFAULT_CLASSES, DEFAULT_SKINS, SERVER_URL } from './constants/config';
import { WORLD_WIDTH, WORLD_HEIGHT, ZONE_POLYGONS, ZONE_INFO, PORTAL_POSITIONS, BUILDING_DATA, QUEST_NPCS, SANCTUARY_FEATURES, pointInPolygon, getZoneAtPosition } from './constants/zones';
// Note: hooks/useAudio.js is available for future refactoring
import { createStyles } from './styles';

// Extracted UI Components
import { GlobalStyles, LoadingScreen, AuthScreen, DeathScreen, TitleScreen, GameModals } from './components';

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
  const activeModalRef = useRef(null); // Tracks which modal is open for escape key
  const zoomRef = useRef(1);
  const effectsRef = useRef([]);
  const meteorWarningsRef = useRef([]);
  const pendingCustomWizardRef = useRef(null); // Custom wizard to apply after joining game
  const predictedPosRef = useRef({ x: 10500, y: 9000 }); // Client-side prediction position
  const lastFrameTimeRef = useRef(Date.now());
  const cachedNpcsRef = useRef([]); // NPCs cached since server sends them infrequently
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
  const [recallCooldown, setRecallCooldown] = useState(0); // timestamp when ready
  const [cooldownTick, setCooldownTick] = useState(0); // forces re-render for cooldown display
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(() => !(window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)));
  const [unreadChat, setUnreadChat] = useState(0);
  const [adminKey, setAdminKey] = useState('');
  const [adminStartLevel, setAdminStartLevel] = useState(false);
  const adminKeyRef = useRef('');
  const chatContainerRef = useRef(null);
  const showChatRef = useRef(!(window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)));
  const dashCooldownRef = useRef(0);
  const ultCooldownRef = useRef(0);
  const autoAttackRef = useRef(true);
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
  const [invincible, setInvincible] = useState(false); // Admin invincibility toggle
  const [questComplete, setQuestComplete] = useState(null);
  const [npcDialogue, setNpcDialogue] = useState(null); // Current NPC dialogue
  const [nearbyNpc, setNearbyNpc] = useState(null); // NPC player can interact with
  const [nearbyPortal, setNearbyPortal] = useState(null); // Portal player can use
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
  const authStateRef = useRef(authState);
  // Keep refs in sync with state
  sessionTokenRef.current = authState.sessionToken;
  authStateRef.current = authState;
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
      active: true, 
      completed: false,
      reward: { xp: 10000, title: 'Dragon Slayer' },
    },
    // Zone-specific quests (always active - defeat zone bosses for rewards)
    meadow_quest: { id: 'meadow_quest', name: 'Cleanse the Meadow', description: 'Defeat the Blossom Behemoth corrupting the meadow flowers.', zone: 'meadow', bossName: 'Blossom Behemoth', active: true, completed: false, reward: { xp: 500 } },
    forest_quest: { id: 'forest_quest', name: 'Fell the Ancient Treant', description: 'Track and destroy the Ancient Treant terrorizing the forest.', zone: 'forest', bossName: 'Ancient Treant', active: true, completed: false, reward: { xp: 1000 } },
    volcanic_quest: { id: 'volcanic_quest', name: 'Quench the Magma Titan', description: 'Defeat the Magma Titan in the volcanic wastes.', zone: 'volcanic', bossName: 'Magma Titan', active: true, completed: false, reward: { xp: 2000 } },
    frozen_quest: { id: 'frozen_quest', name: 'Slay the Frost Wyrm', description: 'Hunt down the Frost Wyrm in the frozen expanse.', zone: 'frozen', bossName: 'Frost Wyrm', active: true, completed: false, reward: { xp: 3000 } },
    crystal_quest: { id: 'crystal_quest', name: 'Shatter the Crystal Golem', description: 'Destroy the Crystal Golem deep in the crystal caves.', zone: 'crystal_caves', bossName: 'Crystal Golem', active: true, completed: false, reward: { xp: 2500 } },
    abyss_quest: { id: 'abyss_quest', name: 'Banish the Void Overlord', description: 'Confront and banish the Void Overlord from the abyss.', zone: 'abyss', bossName: 'Void Overlord', active: true, completed: false, reward: { xp: 4000 } },
  });
  const [showQuestLog, setShowQuestLog] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeNpcQuests, setActiveNpcQuests] = useState([]); // [{id, name, type, target, zone, required, progress, rewardText}]
  const [completedNpcQuests, setCompletedNpcQuests] = useState([]);
  const [questNotification, setQuestNotification] = useState(null); // {text, color}
  
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
  const [showSpellbook, setShowSpellbook] = useState(false);
  
  // Mobile ultimate aiming mode
  const [ultAimMode, setUltAimMode] = useState(false);
  const ultAimModeRef = useRef(false);

  // Keep settings ref in sync
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Track active modal for escape key (avoids stale closures in keyboard handler)
  useEffect(() => {
    if (npcDialogue) activeModalRef.current = 'npcDialogue';
    else if (showSpellbook) activeModalRef.current = 'spellbook';
    else if (showQuestLog) activeModalRef.current = 'questLog';
    else if (showEmotes) activeModalRef.current = 'emotes';
    else if (showShop) activeModalRef.current = 'shop';
    else if (showSkinSelect) activeModalRef.current = 'skinSelect';
    else if (showCharacterSheet) activeModalRef.current = 'characterSheet';
    else if (showInGameSettings) activeModalRef.current = 'settings';
    else activeModalRef.current = null;
  }, [npcDialogue, showSpellbook, showQuestLog, showEmotes, showShop, showSkinSelect, showCharacterSheet, showInGameSettings]);

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
      
      // Skip session validation if already authenticated (e.g. reconnecting after tab hidden)
      if (authStateRef?.current?.isAuthenticated) {
        console.log('🔌 Already authenticated, skipping session validation');
        return;
      }
      
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
                  setSelectedClass('brute');
                  setSelectedSkin('brute_default');
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
      
      // Load active NPC quests from server
      if (data.player.activeQuests) setActiveNpcQuests(data.player.activeQuests);
      if (data.player.completedQuests) setCompletedNpcQuests(data.player.completedQuests);
      
      // Show tutorial for brand new characters (per-character, not global)
      if (data.player.level <= 1 && (data.player.kills || 0) === 0) {
        const tutorialKey = `spellBrigadeTutorial_${data.playerId}`;
        const tutorialSeen = localStorage.getItem(tutorialKey);
        if (!tutorialSeen) {
          setTimeout(() => setShowTutorial(true), 1200);
        }
      }
      if (data.classes) setClasses(prev => ({ ...prev, ...data.classes }));
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
        isCustomWizard: data.player.isCustomWizard || false,
        customColor: data.player.customColor,
        customSecondaryColor: data.player.customSecondaryColor,
        customClassName: data.player.customClassName,
        customIconStyle: data.player.customIconStyle,
        customBodyStyle: data.player.customBodyStyle,
        customProjectileShape: data.player.customProjectileShape,
        customHeadgear: data.player.customHeadgear,
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
      
      // Reset input state on join to prevent stuck movement
      inputRef.current = { up: false, down: false, left: false, right: false };
      socket.emit('input', inputRef.current);
      
      // Sync quest state from server
      if (data.player.bossKills || data.player.questActive || data.player.questComplete) {
        const bossProgress = {};
        if (data.player.bossKills) {
          for (const zone of Object.keys(data.player.bossKills)) {
            bossProgress[zone] = true;
          }
        }
        setQuestLog(prev => {
          const updated = { ...prev };
          updated.allBosses = {
            ...prev.allBosses,
            active: data.player.questActive || data.player.questComplete || Object.keys(bossProgress).length > 0,
            progress: bossProgress,
            completed: data.player.questComplete || false,
          };
          // Restore zone quest completion from saved bossKills
          const zoneQuestMap = {
            meadow: 'meadow_quest', forest: 'forest_quest', volcanic: 'volcanic_quest',
            frozen: 'frozen_quest', crystal_caves: 'crystal_quest', abyss: 'abyss_quest',
          };
          for (const zone of Object.keys(bossProgress)) {
            const qid = zoneQuestMap[zone];
            if (qid && updated[qid]) {
              updated[qid] = { ...updated[qid], active: true, completed: true };
            }
          }
          return updated;
        });
      }
      
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

    socket.on('gameState', (state) => {
      // Merge self into players array for backward compatibility
      const allPlayers = state.players || [];
      if (state.self) allPlayers.unshift(state.self);
      state.players = allPlayers;
      
      // Cache NPCs (server sends them infrequently)
      if (state.npcs) cachedNpcsRef.current = state.npcs;
      state.npcs = cachedNpcsRef.current;
      
      // Store state
      gameStateRef.current = { ...gameStateRef.current, ...state };
      
      // Reconcile prediction with server position
      if (state.self) {
        const serverX = state.self.x;
        const serverY = state.self.y;
        const pred = predictedPosRef.current;
        const dx = serverX - pred.x;
        const dy = serverY - pred.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 150) {
          // Teleport/big desync - snap to server
          pred.x = serverX;
          pred.y = serverY;
        } else if (dist > 3) {
          // Smooth reconciliation - blend toward server
          pred.x += dx * 0.3;
          pred.y += dy * 0.3;
        }
      }
      
      // Update players online count
      if (state.players) {
        setPlayersOnline(state.players.length);
        
        // Build leaderboard from current online players
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
      
      const me = state.players?.find(p => p.id === playerIdRef.current);
      if (me) {
        playerDataRef.current = me;
        setPlayerInfo(prev => ({ ...prev, ...me }));
        
        // Sync dungeon state from server (update ref immediately for render loop)
        if (me.inDungeon !== inDungeonRef.current) {
          inDungeonRef.current = me.inDungeon || false;
          setInDungeon(me.inDungeon || false);
        }
        
        // Only update zone/buildings/NPCs when NOT in dungeon
        if (!me.inDungeon) {
          updateZone(me);
          
          // Check for nearby buildings (closer range to avoid accidental interaction)
          let foundBuilding = null;
          for (const [id, building] of Object.entries(BUILDING_DATA)) {
            const dx = me.x - building.x;
            const dy = me.y - (building.y - building.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) { // Increased for larger buildings
              foundBuilding = { id, ...building };
              break;
            }
          }
          setNearbyBuilding(foundBuilding);
          
          // Check for nearby NPCs (server-side + client-side quest NPCs)
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
          // Also check quest NPCs (client-side only)
          if (!foundNpc) {
            for (const [qid, qnpc] of Object.entries(QUEST_NPCS)) {
              const dx = me.x - qnpc.x;
              const dy = me.y - qnpc.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 100) {
                foundNpc = { ...qnpc, isQuestGiver: true };
                break;
              }
            }
          }
          setNearbyNpc(foundNpc);
          
          // Check for nearby portals (sanctuary-side + return portals)
          let foundPortal = null;
          for (const [portalId, portal] of Object.entries(PORTAL_POSITIONS)) {
            // Check sanctuary-side portal
            const dx = me.x - portal.from.x;
            const dy = me.y - portal.from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 60) {
              foundPortal = { id: portalId, ...portal };
              break;
            }
            // Check return portal at destination
            if (portal.returnFrom) {
              const rdx = me.x - portal.returnFrom.x;
              const rdy = me.y - portal.returnFrom.y;
              const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
              if (rdist < 60) {
                foundPortal = { id: portalId + '_return', from: portal.returnFrom, to: portal.returnTo, color: portal.color, name: '← Back to Sanctuary', icon: '🏠', level: 0, isReturn: true };
                break;
              }
            }
          }
          setNearbyPortal(foundPortal);
        } else {
          // In dungeon - check for dungeon-specific portals
          setNearbyBuilding(null);
          setNearbyNpc(null);
          
          // Dungeon entrance exit portal (y < 300)
          if (me.y < 300) {
            setNearbyPortal({ id: 'dungeon_exit', name: 'Exit Dungeon', color: '#22c55e', isDungeonExit: true });
          } 
          // Victory portal after dragon defeat
          else if (dungeonVictoryPortalRef.current && dungeonVictoryPortalRef.current.active) {
            const vp = dungeonVictoryPortalRef.current;
            const dx = me.x - vp.x;
            const dy = me.y - vp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              setNearbyPortal({ id: 'dungeon_victory', name: 'Victory Portal', color: '#fbbf24', isDungeonExit: true });
            } else {
              setNearbyPortal(null);
            }
          } else {
            setNearbyPortal(null);
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
      setQuestLog(prev => ({
        ...prev,
        allBosses: { ...prev.allBosses, completed: true },
      }));
      playSound('levelUp');
      setTimeout(() => playSound('levelUp'), 200);
      setTimeout(() => playSound('levelUp'), 400);
      // Auto-hide after 8 seconds
      setTimeout(() => setQuestComplete(null), 8000);
    });

    socket.on('questAccepted', (data) => {
      console.log(`📜 Quest accepted: ${data.name}`);
      const bossProgress = {};
      if (data.bossKills) {
        for (const zone of Object.keys(data.bossKills)) {
          bossProgress[zone] = true;
        }
      }
      setQuestLog(prev => {
        const updated = { ...prev };
        // Activate main quest
        updated.allBosses = { ...prev.allBosses, active: true, progress: bossProgress };
        // Also activate all zone quests
        if (data.activateZoneQuests) {
          const zoneQuests = ['meadow_quest', 'forest_quest', 'volcanic_quest', 'frozen_quest', 'crystal_quest', 'abyss_quest'];
          for (const qid of zoneQuests) {
            if (updated[qid]) {
              updated[qid] = { ...updated[qid], active: true, completed: bossProgress[updated[qid].zone] || false };
            }
          }
        }
        // Activate dragon slayer quest too
        updated.dragonSlayer = { ...prev.dragonSlayer, active: true };
        return updated;
      });
    });

    socket.on('questProgress', (data) => {
      console.log(`📜 Quest progress: boss killed in ${data.zone}`);
      setQuestLog(prev => {
        const updated = { ...prev };
        // Update main Champion quest
        if (updated.allBosses && !updated.allBosses.completed) {
          const newProgress = { ...updated.allBosses.progress };
          if (data.bossKills) {
            for (const zone of Object.keys(data.bossKills)) {
              newProgress[zone] = true;
            }
          }
          updated.allBosses = { ...updated.allBosses, progress: newProgress };
          if (Object.keys(newProgress).length >= 6) {
            updated.allBosses.completed = true;
          }
        }
        // Complete zone-specific quests
        if (data.zone) {
          const zoneQuestMap = {
            meadow: 'meadow_quest',
            forest: 'forest_quest', 
            volcanic: 'volcanic_quest',
            frozen: 'frozen_quest',
            crystal_caves: 'crystal_quest',
            abyss: 'abyss_quest',
          };
          const questId = zoneQuestMap[data.zone];
          if (questId && updated[questId] && updated[questId].active && !updated[questId].completed) {
            updated[questId] = { ...updated[questId], completed: true };
          }
        }
        return updated;
      });
    });

    socket.on('zoneQuestReward', (data) => {
      console.log(`🎉 Zone quest reward: +${data.xp} XP for defeating ${data.bossName}`);
      // Update quest log - mark this zone quest as completed
      const zoneQuestMap = {
        meadow: 'meadow_quest', forest: 'forest_quest', volcanic: 'volcanic_quest',
        frozen: 'frozen_quest', crystal_caves: 'crystal_quest', abyss: 'abyss_quest',
      };
      const qid = zoneQuestMap[data.zone];
      if (qid) {
        setQuestLog(prev => ({
          ...prev,
          [qid]: { ...prev[qid], active: true, completed: true },
        }));
      }
      // Show floating notification
      setQuestComplete({
        quest: data.zone + '_quest',
        title: `${data.bossName} Defeated!`,
        xp: data.xp,
        bonuses: [`Zone Boss Reward`],
      });
      playSound('levelUp');
      setTimeout(() => setQuestComplete(null), 5000);
    });

    // NPC Quest handlers
    socket.on('questAcceptedNpc', (data) => {
      console.log(`📜 Quest accepted: ${data.quest.name}`);
      setActiveNpcQuests(prev => [...prev, data.quest]);
      setQuestNotification({ text: `Quest accepted: ${data.quest.name}`, color: '#ffd93d' });
      setTimeout(() => setQuestNotification(null), 3000);
      playSound('levelUp');
    });

    socket.on('questProgressUpdate', (data) => {
      setActiveNpcQuests(prev => prev.map(q => 
        q.id === data.questId ? { ...q, progress: data.progress } : q
      ));
      if (data.complete) {
        setQuestNotification({ text: `${data.name} complete! Return to NPC.`, color: '#22c55e' });
        setTimeout(() => setQuestNotification(null), 4000);
        playSound('levelUp');
      }
    });

    socket.on('questCompleteNpc', (data) => {
      console.log(`🏆 Quest complete: ${data.name} → ${data.rewardText}`);
      setActiveNpcQuests(prev => prev.filter(q => q.id !== data.questId));
      setCompletedNpcQuests(prev => [...prev, data.questId]);
      setQuestComplete({
        title: data.name,
        xp: data.xp,
        bonuses: [data.rewardText],
      });
      playSound('levelUp');
      setTimeout(() => setQuestComplete(null), 5000);
    });

    socket.on('questAbandoned', (data) => {
      setActiveNpcQuests(prev => prev.filter(q => q.id !== data.questId));
    });

    socket.on('questError', (data) => {
      setQuestNotification({ text: data.message, color: '#ef4444' });
      setTimeout(() => setQuestNotification(null), 3000);
    });

    socket.on('collectiblePickup', (data) => {
      // Add floating text effect for collected item
      const effects = effectsRef.current || [];
      effects.push({
        type: 'castText',
        text: `${data.emoji} Collected!`,
        x: data.x,
        y: data.y,
        color: data.color,
        startTime: Date.now(),
        duration: 1200,
      });
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
      autoAttackRef.current = data.enabled;
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
      
      // Show ability name as floating text for feedback
      if (data.abilityName) {
        const me = playerDataRef.current;
        if (me) {
          effectsRef.current.push({
            type: 'castText',
            text: data.abilityName,
            x: me.x,
            y: me.y - 40,
            color: data.abilityColor || classes[playerInfo?.class]?.color || '#a78bfa',
            startTime: Date.now(),
            duration: 1200,
          });
        }
      }
    });
    
    socket.on('abilityError', (data) => {
      console.log('❌ Ability Error:', data.message);
    });
    
    socket.on('abilityCooldown', (data) => {
      console.log(`⏳ Ability ${data.ability || data.slot || '?'} on cooldown: ${Math.ceil(data.remaining / 1000)}s`);
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
        style: data.style || 'burst',
        x: data.x,
        y: data.y,
        radius: data.radius,
        color: data.color,
        name: data.name,
        startTime: Date.now(),
        duration: data.duration || 3000,
      });
    });

    // Custom ultimate visual effects
    socket.on('customUltWarning', (data) => {
      effectsRef.current.push({
        type: 'customUltWarning',
        x: data.x, y: data.y,
        radius: data.radius,
        color: data.color,
        name: data.name,
        startTime: Date.now(),
        duration: data.delay || 1000,
      });
    });

    socket.on('customUltExplosion', (data) => {
      effectsRef.current.push({
        type: 'customUltExplosion',
        x: data.x, y: data.y,
        radius: data.radius,
        color: data.color,
        name: data.name,
        startTime: Date.now(),
        duration: 1500,
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
      if (e.button === 2) {
        // Right-click: fire secondary spell at cursor
        if (screenRef.current === 'game' && socketRef.current && playerIdRef.current) {
          if (e.target === canvasRef.current) {
            const zoom = zoomRef.current || 1;
            const targetX = (e.clientX / zoom) + cameraRef.current.x;
            const targetY = (e.clientY / zoom) + cameraRef.current.y;
            socketRef.current.emit('manualAttack2', { targetX, targetY });
          }
        }
        return;
      }
      if (e.button !== 0) return;
      initAudio();
      
      if (screenRef.current === 'game' && !isMobile && socketRef.current && playerIdRef.current) {
        // Only fire on canvas clicks (not HUD buttons/panels)
        if (e.target === canvasRef.current) {
          const zoom = zoomRef.current || 1;
          const targetX = (e.clientX / zoom) + cameraRef.current.x;
          const targetY = (e.clientY / zoom) + cameraRef.current.y;
          
          if (!autoAttackRef.current) {
            // Manual attack mode: click fires projectile at cursor
            socketRef.current.emit('manualAttack', { targetX, targetY });
          } else {
            // Auto-attack mode: click to move
            socketRef.current.emit('clickMove', { targetX, targetY });
          }
        }
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
              // Check sanctuary-side portal
              const dx = me.x - portal.from.x;
              const dy = me.y - portal.from.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 80) {
                socketRef.current?.emit('usePortal', { portalId });
                return;
              }
              // Check return portal at destination
              if (portal.returnFrom) {
                const rdx = me.x - portal.returnFrom.x;
                const rdy = me.y - portal.returnFrom.y;
                const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
                if (rdist < 80) {
                  socketRef.current?.emit('usePortal', { portalId: portalId + '_return' });
                  return;
                }
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
          // Check client-side quest NPCs
          if (me) {
            for (const [qid, qnpc] of Object.entries(QUEST_NPCS)) {
              const dx = me.x - qnpc.x;
              const dy = me.y - qnpc.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 100) {
                // Open dialogue client-side with quest acceptance
                const zoneQuestId = qnpc.targetZone.replace('crystal_caves', 'crystal') + '_quest';
                setNpcDialogue({
                  npcType: 'quest_giver',
                  npcName: qnpc.name,
                  emoji: qnpc.icon,
                  dialogue: qnpc.lore,
                  followUp: [qnpc.questPrompt, `Recommended: Level ${qnpc.recommendedLevel}+`, `Target: ${qnpc.targetBoss} in ${qnpc.targetZone === 'crystal_caves' ? 'Crystal Caves' : qnpc.targetZone}`],
                  questGiverColor: qnpc.color,
                  hasChoice: true,
                  prompt: qnpc.questPrompt,
                  questId: zoneQuestId,
                  targetZone: qnpc.targetZone,
                  targetBoss: qnpc.targetBoss,
                });
                return;
              }
            }
          }
          // Check for nearby building -> open shop
          if (me) {
            for (const [id, building] of Object.entries(BUILDING_DATA)) {
              const dx = me.x - building.x;
              const dy = me.y - (building.y - building.height / 2);
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 120) {
                setShowShop(true);
                return;
              }
            }
          }
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

      // Spellbook (B)
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

      // ESC - close open modals or toggle settings
      if (e.code === 'Escape' && playerIdRef.current) {
        const modal = activeModalRef.current;
        if (modal === 'npcDialogue') { setNpcDialogue(null); }
        else if (modal === 'spellbook') { setShowSpellbook(false); }
        else if (modal === 'questLog') { setShowQuestLog(false); }
        else if (modal === 'emotes') { setShowEmotes(false); }
        else if (modal === 'shop') { setShowShop(false); }
        else if (modal === 'skinSelect') { setShowSkinSelect(false); }
        else if (modal === 'characterSheet') { setShowCharacterSheet(false); }
        else if (modal === 'settings') { setShowInGameSettings(false); }
        else { setShowInGameSettings(true); }
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
        const zoom = zoomRef.current || 1;
        const worldX = (touch.clientX / zoom) + cameraRef.current.x;
        const worldY = (touch.clientY / zoom) + cameraRef.current.y;
        
        // Manual attack mode: tap fires at position
        if (!autoAttackRef.current && socketRef.current) {
          socketRef.current.emit('manualAttack', { targetX: worldX, targetY: worldY });
          break;
        }
        
        // Auto-attack mode: tap to move
        touchTargetRef.current.x = worldX;
        touchTargetRef.current.y = worldY;
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

    // Safe wrappers to prevent negative radius crashes
    const _origArc = ctx.arc.bind(ctx);
    ctx.arc = (x, y, r, ...rest) => _origArc(x, y, Math.max(0, r), ...rest);
    const _origEllipse = ctx.ellipse.bind(ctx);
    ctx.ellipse = (x, y, rx, ry, ...rest) => _origEllipse(x, y, Math.max(0, rx), Math.max(0, ry), ...rest);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const lerp = (a, b, t) => a + (b - a) * t;

    const render = () => {
      const { world, players, enemies, projectiles, xpOrbs, collectibles, particles, damageNumbers } = gameStateRef.current;
      
      const me = players?.find(p => p.id === playerIdRef.current);
      const cam = cameraRef.current;
      const shake = screenShakeRef.current;

      // --- Client-side prediction ---
      const now = Date.now();
      const frameDt = Math.min((now - lastFrameTimeRef.current) / 1000, 0.05); // Cap at 50ms
      lastFrameTimeRef.current = now;
      
      if (me && me.health > 0) {
        const input = inputRef.current;
        const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
        
        if (moveX !== 0 || moveY !== 0) {
          const len = Math.sqrt(moveX * moveX + moveY * moveY);
          const baseSpeed = me.baseSpeed || 150;
          const speedMult = me.speedMultiplier || 1;
          const speed = Math.min(baseSpeed * speedMult, me.isAdmin ? 999 : 350);
          
          predictedPosRef.current.x += (moveX / len) * speed * frameDt;
          predictedPosRef.current.y += (moveY / len) * speed * frameDt;
        }
      } else if (me) {
        // Snap prediction when dead or just spawned
        predictedPosRef.current.x = me.x;
        predictedPosRef.current.y = me.y;
      }
      
      const predX = predictedPosRef.current.x;
      const predY = predictedPosRef.current.y;

      // Mobile zoom - zoom out to see more of the world
      const isMobileView = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const zoom = isMobileView ? 0.6 : 1; // 60% zoom on mobile = see ~67% more
      zoomRef.current = zoom;
      
      // Virtual dimensions (what we "see" in world space)
      const width = canvas.width / zoom;
      const height = canvas.height / zoom;

      // Camera follows predicted position (not server position)
      if (me) {
        cam.x = lerp(cam.x, predX - width / 2, 0.15);
        cam.y = lerp(cam.y, predY - height / 2, 0.15);
        
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
      const worldCenterX = 10500;
      const worldCenterY = 9000;

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
      if (inDungeonRef.current) {
        const time = Date.now() / 1000;
        
        // Dungeon layout constants (expanded: 1800 wide x 6000 tall)
        const DUNGEON_WIDTH = 1200;
        const CORRIDOR_MIN_X = 450;
        const CORRIDOR_MAX_X = 750;
        const ROOM_MIN_X = 200;
        const ROOM_MAX_X = 1600;
        
        // Room definitions (expanded with more rooms - wider dungeon)
        const ROOMS = [
          { name: 'Entrance Chamber', yStart: 0, yEnd: 500, theme: 'stone', minX: 400, maxX: 1400 },
          { name: 'Skeleton Crypt', yStart: 700, yEnd: 1500, theme: 'bones', minX: 200, maxX: 1600 },
          { name: 'Wraith Sanctum', yStart: 1700, yEnd: 2500, theme: 'haunted', minX: 200, maxX: 1600 },
          { name: 'Golem Forge', yStart: 2700, yEnd: 3500, theme: 'rocky', minX: 200, maxX: 1600 },
          { name: 'Demon Pit', yStart: 3700, yEnd: 4500, theme: 'infernal', minX: 200, maxX: 1600 },
          { name: 'Shadow Hall', yStart: 4700, yEnd: 5000, theme: 'haunted', minX: 200, maxX: 1600 },
          { name: 'Dragon Lair', yStart: 5000, yEnd: 6000, theme: 'dragon', minX: 50, maxX: 1750 },
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
        if (exitScreenY > -100 && exitScreenY < height + 100 && playerY < 500) {
          const exitScreenX = 900 - cx; // Center of wider dungeon
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
          ctx.fillText(isMobileView ? 'Tap' : 'Press E', exitScreenX, exitScreenY + 62);
        }
        
        // Dragon lair ambient effect
        if (playerY >= 3500) {
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
        if (dungeonVictoryPortalRef.current && dungeonVictoryPortalRef.current.active) {
          const vpX = dungeonVictoryPortalRef.current.x - cx;
          const vpY = dungeonVictoryPortalRef.current.y - cy;
          
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

      // ========== HIGH-QUALITY ZONE DECORATIONS + AMBIENT NPCs ========== (SKIP IN DUNGEON)
      if (!inDungeonRef.current) {
        const tileSize = 140; // Sparser spacing so decor feels intentional, not spammed
        const startX = Math.floor(cx / tileSize) * tileSize;
        const startY = Math.floor(cy / tileSize) * tileSize;
        
        const seededRandom = (x, y, seed = 0) => {
          const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
          return n - Math.floor(n);
        };
        
        const time = Date.now() / 1000;

        // Draw decorations for visible area
        for (let x = startX; x < cx + width + tileSize; x += tileSize) {
          for (let y = startY; y < cy + height + tileSize; y += tileSize) {
            const zone = getZone(x + tileSize/2, y + tileSize/2);
            const rand = seededRandom(x, y);
            const sx = x - cx + tileSize/2;
            const sy = y - cy + tileSize/2;
            
            if (rand > 0.22) continue; // ~22% coverage (down from 45%)
            
            const dr = seededRandom(x, y, 1); // decoration type selector
            const dr2 = seededRandom(x, y, 2); // sub-variation
            const dr3 = seededRandom(x, y, 3); // color variation

            // ===== SANCTUARY =====
            if (zone === 'sanctuary') {
              if (dr > 0.91) {
                // Ornate fountain with water
                ctx.fillStyle = '#78716c';
                ctx.beginPath(); ctx.ellipse(sx, sy + 8, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#a8a29e';
                ctx.beginPath(); ctx.ellipse(sx, sy + 8, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
                // Water in basin
                ctx.fillStyle = `rgba(56,189,248,${0.35 + Math.sin(time * 2) * 0.1})`;
                ctx.beginPath(); ctx.ellipse(sx, sy + 7, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
                // Center pillar
                ctx.fillStyle = '#78716c';
                ctx.fillRect(sx - 2, sy - 6, 4, 14);
                // Top bowl
                ctx.fillStyle = '#a8a29e';
                ctx.beginPath(); ctx.ellipse(sx, sy - 6, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
                // Water streams
                ctx.strokeStyle = `rgba(147,197,253,${0.4 + Math.sin(time * 3) * 0.2})`; ctx.lineWidth = 1.5;
                for (let s = 0; s < 4; s++) {
                  const sa = s * Math.PI / 2;
                  ctx.beginPath(); ctx.moveTo(sx + Math.cos(sa) * 4, sy - 4);
                  ctx.quadraticCurveTo(sx + Math.cos(sa) * 8, sy + 2, sx + Math.cos(sa) * 10, sy + 6); ctx.stroke();
                }
                // Water sparkle
                ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(time * 5 + x) * 0.2})`;
                ctx.beginPath(); ctx.arc(sx + 4, sy + 5, 1, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.84) {
                // Ornate lamp post with warm glow
                const glow = 0.5 + Math.sin(time * 2 + x) * 0.2;
                ctx.fillStyle = '#44403c'; ctx.fillRect(sx - 2, sy - 2, 4, 22);
                ctx.fillStyle = '#57534e'; ctx.fillRect(sx - 5, sy + 18, 10, 4);
                ctx.fillStyle = '#78716c'; ctx.fillRect(sx - 4, sy - 8, 8, 8);
                ctx.fillStyle = '#a8a29e'; ctx.fillRect(sx - 5, sy - 9, 10, 2); ctx.fillRect(sx - 5, sy - 1, 10, 2);
                ctx.fillStyle = `rgba(253,224,71,${glow})`;
                ctx.beginPath(); ctx.arc(sx, sy - 4, 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(253,224,71,${glow * 0.12})`;
                ctx.beginPath(); ctx.arc(sx, sy - 4, 25, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.76) {
                // Statue of a wizard
                ctx.fillStyle = '#94a3b8';
                // Base
                ctx.fillRect(sx - 8, sy + 8, 16, 6);
                ctx.fillRect(sx - 10, sy + 12, 20, 4);
                // Robed body
                ctx.beginPath(); ctx.moveTo(sx - 6, sy + 8); ctx.lineTo(sx - 4, sy - 6); ctx.lineTo(sx, sy - 10); ctx.lineTo(sx + 4, sy - 6); ctx.lineTo(sx + 6, sy + 8); ctx.closePath(); ctx.fill();
                // Head
                ctx.beginPath(); ctx.arc(sx, sy - 14, 5, 0, Math.PI * 2); ctx.fill();
                // Wizard hat
                ctx.fillStyle = '#64748b';
                ctx.beginPath(); ctx.moveTo(sx, sy - 26); ctx.lineTo(sx - 6, sy - 14); ctx.lineTo(sx + 6, sy - 14); ctx.closePath(); ctx.fill();
                // Staff
                ctx.fillStyle = '#78716c'; ctx.fillRect(sx + 7, sy - 18, 2, 26);
                // Orb on staff
                ctx.fillStyle = `rgba(253,224,71,${0.4 + Math.sin(time * 2) * 0.2})`;
                ctx.beginPath(); ctx.arc(sx + 8, sy - 20, 3, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.68) {
                // Stone path segment
                const stones = [{dx: -8, dy: 0, rx: 7, ry: 4}, {dx: 4, dy: -4, rx: 6, ry: 3}, {dx: 6, dy: 4, rx: 5, ry: 3}, {dx: -3, dy: 6, rx: 5, ry: 3}];
                for (const s of stones) {
                  ctx.fillStyle = dr3 > 0.5 ? '#78716c' : '#a8a29e';
                  ctx.beginPath(); ctx.ellipse(sx + s.dx, sy + s.dy, s.rx, s.ry, dr2 * 0.5, 0, Math.PI * 2); ctx.fill();
                  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
                  ctx.beginPath(); ctx.ellipse(sx + s.dx, sy + s.dy, s.rx, s.ry, dr2 * 0.5, 0, Math.PI * 2); ctx.stroke();
                }
              } else if (dr > 0.6) {
                // Garden with trellis and roses
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
                ctx.strokeRect(sx - 8, sy - 12, 16, 20);
                ctx.beginPath(); ctx.moveTo(sx, sy - 12); ctx.lineTo(sx, sy + 8); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sx - 8, sy - 2); ctx.lineTo(sx + 8, sy - 2); ctx.stroke();
                const roseColors = ['#e11d48', '#f472b6', '#fb7185'];
                for (let i = 0; i < 4; i++) {
                  const rx = sx - 6 + (i % 2) * 12 + Math.sin(i * 1.7) * 3;
                  const ry = sy - 10 + Math.floor(i / 2) * 10;
                  ctx.fillStyle = roseColors[i % 3];
                  ctx.beginPath(); ctx.arc(rx, ry, 3.5, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#15803d';
                  ctx.beginPath(); ctx.ellipse(rx + 3, ry + 2, 3, 1.5, 0.5, 0, Math.PI * 2); ctx.fill();
                }
              } else if (dr > 0.52) {
                // Ornamental tree with golden leaves
                ctx.fillStyle = '#78350f'; ctx.fillRect(sx - 3, sy + 4, 6, 14);
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(sx - 3, sy + 16); ctx.lineTo(sx - 8, sy + 20); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sx + 3, sy + 16); ctx.lineTo(sx + 8, sy + 20); ctx.stroke();
                ctx.fillStyle = '#15803d';
                ctx.beginPath(); ctx.arc(sx, sy - 4, 14, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#22c55e';
                ctx.beginPath(); ctx.arc(sx - 5, sy - 8, 9, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(sx + 6, sy - 6, 10, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fbbf24';
                for (let i = 0; i < 3; i++) {
                  ctx.beginPath(); ctx.arc(sx - 8 + i * 7 + Math.sin(time + i) * 2, sy - 10 + Math.cos(time * 0.8 + i) * 3, 2.5, 0, Math.PI * 2); ctx.fill();
                }
              } else if (dr > 0.44) {
                // Wooden bench
                ctx.fillStyle = '#78350f';
                // Legs
                ctx.fillRect(sx - 12, sy + 2, 3, 10);
                ctx.fillRect(sx + 9, sy + 2, 3, 10);
                // Seat
                ctx.fillStyle = '#92400e';
                ctx.fillRect(sx - 14, sy, 28, 4);
                // Backrest
                ctx.fillStyle = '#a16207';
                ctx.fillRect(sx - 12, sy - 10, 2, 12);
                ctx.fillRect(sx + 10, sy - 10, 2, 12);
                ctx.fillRect(sx - 12, sy - 10, 24, 2);
                ctx.fillRect(sx - 12, sy - 5, 24, 2);
              } else if (dr > 0.36) {
                // Market banner / flag
                const flagColors = ['#dc2626', '#2563eb', '#7c3aed', '#059669'];
                const flagColor = flagColors[Math.floor(dr3 * 4)];
                const wave = Math.sin(time * 2 + x * 0.01) * 3;
                ctx.fillStyle = '#78350f'; ctx.fillRect(sx - 1, sy - 14, 3, 28);
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(sx + 0.5, sy - 15, 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = flagColor;
                ctx.beginPath(); ctx.moveTo(sx + 2, sy - 12);
                ctx.quadraticCurveTo(sx + 10, sy - 8 + wave, sx + 18, sy - 10 + wave);
                ctx.lineTo(sx + 16, sy - 2 + wave);
                ctx.quadraticCurveTo(sx + 8, sy + wave, sx + 2, sy - 2); ctx.fill();
              } else if (dr > 0.27) {
                // Barrel stack
                ctx.fillStyle = '#78350f';
                ctx.beginPath(); ctx.ellipse(sx - 5, sy + 4, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#92400e';
                ctx.beginPath(); ctx.ellipse(sx - 5, sy + 4, 8, 10, 0, Math.PI * 1.5, Math.PI * 0.5); ctx.fill();
                // Metal bands
                ctx.strokeStyle = '#57534e'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.ellipse(sx - 5, sy, 8, 2, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.ellipse(sx - 5, sy + 8, 8, 2, 0, 0, Math.PI * 2); ctx.stroke();
                // Stacked barrel
                ctx.fillStyle = '#78350f';
                ctx.beginPath(); ctx.ellipse(sx + 6, sy - 4, 6, 8, 0.3, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#57534e'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(sx + 6, sy - 7, 6, 1.5, 0.3, 0, Math.PI * 2); ctx.stroke();
              } else if (dr > 0.18) {
                // Well-kept flower bed with border
                ctx.fillStyle = '#57534e';
                ctx.beginPath(); ctx.ellipse(sx, sy, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#3f2d1e';
                ctx.beginPath(); ctx.ellipse(sx, sy, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
                const flowerPalette = [['#e11d48','#fcd34d'], ['#7c3aed','#fcd34d'], ['#2563eb','#fff'], ['#f97316','#fcd34d']];
                const palette = flowerPalette[Math.floor(dr3 * 4)];
                for (let i = 0; i < 5; i++) {
                  const fx = sx + Math.cos(i * 1.26) * 6;
                  const fy = sy + Math.sin(i * 1.26) * 4 - 2;
                  ctx.fillStyle = palette[0];
                  ctx.beginPath(); ctx.arc(fx, fy, 2.5, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = palette[1];
                  ctx.beginPath(); ctx.arc(fx, fy, 1, 0, Math.PI * 2); ctx.fill();
                }
              } else if (dr > 0.08) {
                // Hanging lantern string
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(sx - 14, sy - 4);
                ctx.quadraticCurveTo(sx, sy + 2, sx + 14, sy - 4); ctx.stroke();
                for (let l = 0; l < 3; l++) {
                  const lx = sx - 8 + l * 8;
                  const ly = sy - 2 + Math.sin((l - 1) * 0.8) * 2;
                  const lanternGlow = 0.4 + Math.sin(time * 3 + l * 2) * 0.2;
                  ctx.fillStyle = '#fbbf24';
                  ctx.fillRect(lx - 2, ly, 4, 5);
                  ctx.fillStyle = `rgba(253,224,71,${lanternGlow})`;
                  ctx.beginPath(); ctx.arc(lx, ly + 2, 3, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = `rgba(253,224,71,${lanternGlow * 0.2})`;
                  ctx.beginPath(); ctx.arc(lx, ly + 2, 8, 0, Math.PI * 2); ctx.fill();
                }
              } else {
                // Grass clump with butterflies
                ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.5;
                for (let i = 0; i < 4; i++) {
                  const gx = sx - 6 + i * 4;
                  const sway = Math.sin(time * 1.5 + i * 0.8) * 2;
                  ctx.beginPath(); ctx.moveTo(gx, sy + 5); ctx.quadraticCurveTo(gx + sway, sy - 3, gx + sway * 0.5, sy - 8); ctx.stroke();
                }
              }
            }
            // ===== MEADOW =====
            else if (zone === 'meadow') {
              if (dr > 0.91) {
                // Windmill (rare landmark)
                ctx.fillStyle = '#92400e';
                ctx.fillRect(sx - 6, sy - 8, 12, 26);
                ctx.fillStyle = '#a16207';
                ctx.fillRect(sx - 8, sy + 16, 16, 4);
                // Roof
                ctx.fillStyle = '#78350f';
                ctx.beginPath(); ctx.moveTo(sx, sy - 18); ctx.lineTo(sx - 10, sy - 8); ctx.lineTo(sx + 10, sy - 8); ctx.closePath(); ctx.fill();
                // Blades
                ctx.save(); ctx.translate(sx, sy - 12);
                ctx.rotate(time * 1.5);
                ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2;
                for (let b = 0; b < 4; b++) {
                  const ba = b * Math.PI / 2;
                  ctx.beginPath(); ctx.moveTo(0, 0);
                  ctx.lineTo(Math.cos(ba) * 18, Math.sin(ba) * 18); ctx.stroke();
                  // Sail
                  ctx.fillStyle = 'rgba(255,255,255,0.6)';
                  ctx.beginPath(); ctx.moveTo(Math.cos(ba) * 4, Math.sin(ba) * 4);
                  ctx.lineTo(Math.cos(ba) * 16, Math.sin(ba) * 16);
                  ctx.lineTo(Math.cos(ba + 0.25) * 14, Math.sin(ba + 0.25) * 14);
                  ctx.closePath(); ctx.fill();
                }
                ctx.restore();
              } else if (dr > 0.83) {
                // Wooden fence section
                ctx.fillStyle = '#92400e';
                ctx.fillRect(sx - 14, sy, 3, 14);
                ctx.fillRect(sx + 11, sy, 3, 14);
                ctx.fillStyle = '#a16207';
                ctx.fillRect(sx - 15, sy + 2, 30, 3);
                ctx.fillRect(sx - 15, sy + 8, 30, 3);
              } else if (dr > 0.74) {
                // Hay bale
                ctx.fillStyle = '#ca8a04';
                ctx.beginPath(); ctx.ellipse(sx, sy + 4, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#a16207';
                ctx.beginPath(); ctx.ellipse(sx, sy + 4, 14, 10, 0, 0, Math.PI); ctx.fill();
                ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(sx - 10, sy + 2); ctx.lineTo(sx + 10, sy + 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sx - 8, sy + 6); ctx.lineTo(sx + 8, sy + 6); ctx.stroke();
                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(sx + 12, sy); ctx.lineTo(sx + 16, sy - 5); ctx.stroke();
              } else if (dr > 0.66) {
                // Butterfly garden with flowers
                const flColors = ['#ec4899', '#f97316', '#eab308', '#8b5cf6', '#3b82f6'];
                for (let i = 0; i < 5; i++) {
                  const fx = sx - 8 + i * 4 + Math.sin(i * 2.3) * 2;
                  const stemH = 10 + dr2 * 8 + i * 2;
                  const sway = Math.sin(time * 1.5 + i * 0.9) * 2;
                  ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 1.5;
                  ctx.beginPath(); ctx.moveTo(fx, sy + 6); ctx.quadraticCurveTo(fx + sway, sy + 6 - stemH / 2, fx + sway, sy + 6 - stemH); ctx.stroke();
                  ctx.fillStyle = flColors[i];
                  ctx.beginPath(); ctx.arc(fx + sway, sy + 6 - stemH, 3, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#fef08a';
                  ctx.beginPath(); ctx.arc(fx + sway, sy + 6 - stemH, 1.2, 0, Math.PI * 2); ctx.fill();
                }
                // Butterflies
                for (let b = 0; b < 2; b++) {
                  const bx = sx + Math.sin(time * 2 + b * 3) * 16;
                  const by = sy - 10 + Math.cos(time * 1.5 + b * 2) * 8;
                  const wingFlap = Math.sin(time * 12 + b * 5) * 0.6;
                  ctx.fillStyle = b ? '#a855f7' : '#f472b6';
                  ctx.beginPath(); ctx.ellipse(bx - 3, by, 3 * Math.abs(Math.cos(wingFlap)), 4, wingFlap, 0, Math.PI * 2); ctx.fill();
                  ctx.beginPath(); ctx.ellipse(bx + 3, by, 3 * Math.abs(Math.cos(wingFlap)), 4, -wingFlap, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#000';
                  ctx.beginPath(); ctx.ellipse(bx, by, 1, 3, 0, 0, Math.PI * 2); ctx.fill();
                }
              } else if (dr > 0.57) {
                // Well with bucket
                ctx.fillStyle = '#78716c';
                ctx.beginPath(); ctx.ellipse(sx, sy + 4, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#a8a29e';
                ctx.beginPath(); ctx.ellipse(sx, sy + 4, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
                // Water inside
                ctx.fillStyle = 'rgba(56,189,248,0.4)';
                ctx.beginPath(); ctx.ellipse(sx, sy + 4, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
                // Posts and crossbar
                ctx.fillStyle = '#78350f';
                ctx.fillRect(sx - 10, sy - 14, 3, 18);
                ctx.fillRect(sx + 7, sy - 14, 3, 18);
                ctx.fillRect(sx - 10, sy - 16, 20, 3);
                // Bucket rope
                ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1;
                const ropeSwing = Math.sin(time * 0.8) * 3;
                ctx.beginPath(); ctx.moveTo(sx, sy - 14); ctx.quadraticCurveTo(sx + ropeSwing, sy - 6, sx + ropeSwing, sy); ctx.stroke();
              } else if (dr > 0.47) {
                // Large bush with berries
                ctx.fillStyle = '#15803d';
                ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#22c55e';
                ctx.beginPath(); ctx.arc(sx - 5, sy - 3, 8, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(sx + 6, sy - 1, 9, 0, Math.PI * 2); ctx.fill();
                const berryColor = dr3 > 0.5 ? '#dc2626' : '#7c3aed';
                for (let i = 0; i < 4; i++) {
                  ctx.fillStyle = berryColor;
                  ctx.beginPath(); ctx.arc(sx - 4 + i * 3 + Math.sin(i) * 2, sy - 4 + Math.cos(i * 1.5) * 3, 2, 0, Math.PI * 2); ctx.fill();
                }
              } else if (dr > 0.38) {
                // Beehive on branch
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(sx - 16, sy - 6); ctx.lineTo(sx + 6, sy - 6); ctx.stroke();
                // Hive
                ctx.fillStyle = '#ca8a04';
                ctx.beginPath(); ctx.ellipse(sx - 2, sy + 2, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
                // Stripes
                ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1;
                for (let s = -6; s <= 6; s += 4) {
                  ctx.beginPath(); ctx.moveTo(sx - 9, sy + s); ctx.lineTo(sx + 5, sy + s); ctx.stroke();
                }
                // Hole
                ctx.fillStyle = '#78350f';
                ctx.beginPath(); ctx.ellipse(sx - 2, sy + 6, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
                // Flying bees
                for (let b = 0; b < 2; b++) {
                  const bx = sx + Math.sin(time * 4 + b * 4) * 14;
                  const by = sy - 4 + Math.cos(time * 3 + b * 3) * 8;
                  ctx.fillStyle = '#fbbf24';
                  ctx.beginPath(); ctx.ellipse(bx, by, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
                }
              } else if (dr > 0.28) {
                // Stepping stones across grass
                for (let i = 0; i < 3; i++) {
                  ctx.fillStyle = '#a8a29e';
                  ctx.beginPath(); ctx.ellipse(sx - 8 + i * 8, sy + i * 3 - 3, 5, 3.5, dr2 + i * 0.3, 0, Math.PI * 2); ctx.fill();
                  ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
                  ctx.beginPath(); ctx.ellipse(sx - 8 + i * 8, sy + i * 3 - 3, 5, 3.5, dr2 + i * 0.3, 0, Math.PI * 2); ctx.stroke();
                }
              } else if (dr > 0.18) {
                // Tall grass with wind
                for (let i = 0; i < 6; i++) {
                  const bx = sx - 10 + i * 4;
                  const bh = 12 + Math.sin(i * 1.5) * 5;
                  const sway = Math.sin(time * 2.5 + bx * 0.05) * 4;
                  ctx.strokeStyle = i % 2 ? '#86efac' : '#4ade80'; ctx.lineWidth = 2;
                  ctx.beginPath(); ctx.moveTo(bx, sy + 5);
                  ctx.quadraticCurveTo(bx + sway * 0.5, sy + 5 - bh * 0.6, bx + sway, sy + 5 - bh); ctx.stroke();
                }
              } else if (dr > 0.08) {
                // Dandelion puffs (blowing away)
                for (let i = 0; i < 3; i++) {
                  const dx = sx - 6 + i * 6;
                  ctx.strokeStyle = '#86efac'; ctx.lineWidth = 1;
                  ctx.beginPath(); ctx.moveTo(dx, sy + 8); ctx.lineTo(dx, sy - 2); ctx.stroke();
                  // Puff
                  ctx.fillStyle = 'rgba(255,255,255,0.7)';
                  ctx.beginPath(); ctx.arc(dx, sy - 4, 4, 0, Math.PI * 2); ctx.fill();
                  // Floating seeds
                  const seedX = dx + (time * 8 + i * 20) % 30;
                  const seedY = sy - 8 - Math.sin(time * 2 + i) * 5;
                  ctx.fillStyle = 'rgba(255,255,255,0.4)';
                  ctx.beginPath(); ctx.arc(seedX, seedY, 1.5, 0, Math.PI * 2); ctx.fill();
                }
              } else {
                // Small mushroom pair
                const mColors = ['#ef4444', '#f97316', '#eab308'];
                const mc = mColors[Math.floor(dr3 * 3)];
                for (let i = 0; i < 2; i++) {
                  const mx = sx - 4 + i * 8;
                  const ms = 4 + i * 2;
                  ctx.fillStyle = '#fef3c7'; ctx.fillRect(mx - 1, sy + 2, 2, 5);
                  ctx.fillStyle = mc;
                  ctx.beginPath(); ctx.arc(mx, sy + 2, ms, Math.PI, 0); ctx.fill();
                  ctx.fillStyle = '#fff';
                  ctx.beginPath(); ctx.arc(mx - 1, sy, 1.5, 0, Math.PI * 2); ctx.fill();
                }
              }
            }
            // ===== FOREST =====
            else if (zone === 'forest') {
              if (dr > 0.88) {
                // Ancient tree with thick roots and hanging moss
                ctx.fillStyle = '#3e2723';
                for (let i = -2; i <= 2; i++) {
                  ctx.beginPath(); ctx.moveTo(sx + i * 4, sy + 16); ctx.lineTo(sx + i * 7, sy + 22); ctx.lineTo(sx + i * 7 + 3, sy + 22); ctx.lineTo(sx + i * 4 + 2, sy + 16); ctx.fill();
                }
                ctx.fillStyle = '#4a2c17'; ctx.fillRect(sx - 8, sy - 10, 16, 28);
                ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(sx - 5, sy - 8); ctx.lineTo(sx - 3, sy + 14); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sx + 3, sy - 6); ctx.lineTo(sx + 5, sy + 12); ctx.stroke();
                ctx.fillStyle = '#3e2723';
                ctx.beginPath(); ctx.ellipse(sx + 2, sy + 4, 3, 4, 0.3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#14532d';
                ctx.beginPath(); ctx.arc(sx, sy - 18, 18, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#166534';
                ctx.beginPath(); ctx.arc(sx - 8, sy - 24, 12, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(sx + 10, sy - 20, 13, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#15803d';
                ctx.beginPath(); ctx.arc(sx + 3, sy - 28, 8, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#6b8e6b'; ctx.lineWidth = 1.5;
                for (let i = 0; i < 3; i++) {
                  const mx = sx - 10 + i * 10;
                  const mSway = Math.sin(time * 0.8 + i * 1.2) * 2;
                  ctx.beginPath(); ctx.moveTo(mx, sy - 8); ctx.quadraticCurveTo(mx + mSway, sy - 2, mx + mSway * 0.5, sy + 4); ctx.stroke();
                }
              } else if (dr > 0.8) {
                // Wooden signpost (weathered)
                ctx.fillStyle = '#78350f';
                ctx.fillRect(sx - 2, sy - 4, 4, 20);
                // Sign board
                ctx.fillStyle = '#92400e';
                ctx.save(); ctx.translate(sx, sy - 8); ctx.rotate(0.05);
                ctx.fillRect(-14, -6, 28, 12);
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1;
                ctx.strokeRect(-14, -6, 28, 12);
                // Scratches/runes
                ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-4, 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(2, 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(4, -1); ctx.lineTo(8, 1); ctx.stroke();
                ctx.restore();
              } else if (dr > 0.71) {
                // Fallen log with mushrooms
                ctx.fillStyle = '#5c4033';
                ctx.save(); ctx.translate(sx, sy); ctx.rotate(dr2 * 0.5 - 0.25);
                ctx.fillRect(-16, -4, 32, 8);
                ctx.fillStyle = '#4a2c17'; ctx.fillRect(-16, -4, 32, 3);
                ctx.fillStyle = '#4ade80';
                ctx.beginPath(); ctx.ellipse(-6, -3, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(8, -2, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fef3c7'; ctx.fillRect(-2, -7, 2, 4); ctx.fillRect(5, -8, 2, 5);
                ctx.fillStyle = '#ef4444';
                ctx.beginPath(); ctx.arc(-1, -8, 4, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#f97316';
                ctx.beginPath(); ctx.arc(6, -9, 3, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(-2, -9, 1, 0, Math.PI * 2); ctx.arc(5, -10, 0.8, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
              } else if (dr > 0.62) {
                // Enchanted mushroom ring (fairy circle)
                ctx.strokeStyle = 'rgba(134,239,172,0.15)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.stroke();
                const ringGlow = 0.1 + Math.sin(time * 2 + x * 0.01) * 0.05;
                ctx.fillStyle = `rgba(134,239,172,${ringGlow})`;
                ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
                for (let m = 0; m < 6; m++) {
                  const ma = (m / 6) * Math.PI * 2;
                  const mx = sx + Math.cos(ma) * 12;
                  const my = sy + Math.sin(ma) * 12;
                  const mc = m % 3 === 0 ? '#ef4444' : m % 3 === 1 ? '#a855f7' : '#3b82f6';
                  ctx.fillStyle = '#fef3c7'; ctx.fillRect(mx - 0.5, my, 1, 3);
                  ctx.fillStyle = mc;
                  ctx.beginPath(); ctx.arc(mx, my, 2.5, Math.PI, 0); ctx.fill();
                }
                // Center sparkle
                ctx.fillStyle = `rgba(253,224,71,${0.3 + Math.sin(time * 3) * 0.2})`;
                ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.53) {
                // Spider web between trees
                ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.8;
                const webR = 14;
                for (let i = 0; i < 6; i++) {
                  const angle = (i / 6) * Math.PI * 2;
                  ctx.beginPath(); ctx.moveTo(sx, sy);
                  ctx.lineTo(sx + Math.cos(angle) * webR, sy + Math.sin(angle) * webR); ctx.stroke();
                }
                for (let ring = 4; ring <= 12; ring += 4) {
                  ctx.beginPath();
                  for (let a = 0; a <= Math.PI * 2; a += 0.1) {
                    const wx = sx + Math.cos(a) * ring;
                    const wy = sy + Math.sin(a) * ring;
                    a === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
                  }
                  ctx.stroke();
                }
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath(); ctx.arc(sx + 5, sy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.44) {
                // Hollow tree stump with glowing inside
                ctx.fillStyle = '#4a2c17';
                ctx.beginPath(); ctx.ellipse(sx, sy + 6, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(sx - 10, sy - 6, 20, 14);
                // Hollow opening
                ctx.fillStyle = '#1a1205';
                ctx.beginPath(); ctx.ellipse(sx, sy, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
                // Glow from inside
                const hollowGlow = 0.2 + Math.sin(time * 1.5 + y) * 0.1;
                ctx.fillStyle = `rgba(253,224,71,${hollowGlow})`;
                ctx.beginPath(); ctx.ellipse(sx, sy, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
                // Small eyes peeking out
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(sx - 2, sy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(sx + 2, sy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.35) {
                // Moss-covered rock
                ctx.fillStyle = '#57534e';
                ctx.beginPath(); ctx.moveTo(sx - 10, sy + 6); ctx.lineTo(sx - 7, sy - 6); ctx.lineTo(sx + 3, sy - 8); ctx.lineTo(sx + 10, sy - 2); ctx.lineTo(sx + 8, sy + 6); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#4ade80';
                ctx.beginPath(); ctx.ellipse(sx - 2, sy - 5, 8, 3, -0.2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#86efac';
                ctx.beginPath(); ctx.ellipse(sx + 3, sy - 6, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.24) {
                // Fern cluster
                ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2;
                for (let i = 0; i < 4; i++) {
                  const angle = -1.2 + i * 0.6 + Math.sin(time * 1.2 + i) * 0.1;
                  const len = 12 + i * 3;
                  ctx.beginPath(); ctx.moveTo(sx, sy + 4);
                  ctx.quadraticCurveTo(sx + Math.cos(angle) * len * 0.6, sy + 4 + Math.sin(angle) * len * 0.3, sx + Math.cos(angle) * len, sy + 4 + Math.sin(angle) * len * 0.5 - len * 0.8);
                  ctx.stroke();
                  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1;
                  for (let f = 0.3; f < 0.9; f += 0.25) {
                    const px = sx + Math.cos(angle) * len * f;
                    const py = sy + 4 + Math.sin(angle) * len * f * 0.3 - len * 0.8 * f;
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 3); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 4, py - 3); ctx.stroke();
                  }
                  ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2;
                }
              } else if (dr > 0.12) {
                // Thorny vine patch
                ctx.strokeStyle = '#365314'; ctx.lineWidth = 2;
                for (let v = 0; v < 3; v++) {
                  const vx1 = sx - 12 + v * 8;
                  const vx2 = vx1 + 8 + Math.sin(v) * 4;
                  ctx.beginPath(); ctx.moveTo(vx1, sy + 6);
                  ctx.bezierCurveTo(vx1, sy - 8, vx2, sy - 10, vx2, sy + 4); ctx.stroke();
                  // Thorns
                  ctx.fillStyle = '#4d7c0f';
                  for (let t = 0.2; t < 0.8; t += 0.2) {
                    const tx = vx1 + (vx2 - vx1) * t;
                    const ty = sy - 8 * Math.sin(t * Math.PI);
                    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 3, ty - 3); ctx.lineTo(tx + 1, ty); ctx.fill();
                  }
                }
              } else {
                // Firefly cluster (animated)
                for (let i = 0; i < 3; i++) {
                  const fx = sx + Math.sin(time * 1.5 + i * 2.1) * 12;
                  const fy = sy + Math.cos(time * 1.2 + i * 1.7) * 10;
                  const brightness = 0.3 + Math.sin(time * 4 + i * 3) * 0.3;
                  ctx.fillStyle = `rgba(253,224,71,${brightness})`;
                  ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = `rgba(253,224,71,${brightness * 0.3})`;
                  ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
                }
              }
            }
            // ===== VOLCANIC =====
            else if (zone === 'volcanic') {
              if (dr > 0.9) {
                // Ruined stone archway
                ctx.fillStyle = '#44403c';
                ctx.fillRect(sx - 16, sy - 10, 6, 26);
                ctx.fillRect(sx + 10, sy - 10, 6, 26);
                // Arch top (partially collapsed)
                ctx.beginPath(); ctx.moveTo(sx - 16, sy - 10); ctx.quadraticCurveTo(sx, sy - 24, sx + 12, sy - 8); ctx.lineTo(sx + 10, sy - 8); ctx.quadraticCurveTo(sx, sy - 18, sx - 10, sy - 10); ctx.closePath();
                ctx.fillStyle = '#57534e'; ctx.fill();
                // Lava glow through arch
                ctx.fillStyle = `rgba(249,115,22,${0.15 + Math.sin(time * 2) * 0.08})`;
                ctx.beginPath(); ctx.ellipse(sx, sy + 4, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
                // Fallen rubble
                ctx.fillStyle = '#78716c';
                ctx.beginPath(); ctx.arc(sx + 14, sy + 10, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(sx + 18, sy + 8, 3, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.82) {
                // Obsidian spire
                ctx.fillStyle = '#1c1917';
                ctx.beginPath(); ctx.moveTo(sx, sy - 28); ctx.lineTo(sx + 8, sy + 10); ctx.lineTo(sx - 8, sy + 10); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#292524';
                ctx.beginPath(); ctx.moveTo(sx, sy - 28); ctx.lineTo(sx + 8, sy + 10); ctx.lineTo(sx, sy + 10); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(sx - 2, sy - 18); ctx.lineTo(sx + 1, sy - 5); ctx.lineTo(sx - 1, sy + 6); ctx.stroke();
                ctx.fillStyle = `rgba(249,115,22,${0.2 + Math.sin(time * 3) * 0.1})`;
                ctx.beginPath(); ctx.ellipse(sx, sy + 10, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.72) {
                // Lava pool with bubbles
                ctx.fillStyle = '#7f1d1d';
                ctx.beginPath(); ctx.ellipse(sx, sy, 14, 8, dr2 * 0.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#dc2626';
                ctx.beginPath(); ctx.ellipse(sx, sy, 11, 6, dr2 * 0.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f97316';
                ctx.beginPath(); ctx.ellipse(sx, sy - 1, 7, 3.5, dr2 * 0.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.ellipse(sx + 1, sy - 1, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
                const bx = sx + Math.sin(time * 2 + x) * 4;
                const bSize = 2 + Math.sin(time * 3) * 1;
                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(bx, sy - 2 - Math.abs(Math.sin(time * 2)) * 3, bSize, 0, Math.PI * 2); ctx.stroke();
              } else if (dr > 0.62) {
                // Charred dead tree
                ctx.fillStyle = '#292524'; ctx.fillRect(sx - 3, sy - 6, 6, 22);
                ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(sx - 2, sy - 2); ctx.lineTo(sx - 14, sy - 12); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sx + 2, sy); ctx.lineTo(sx + 12, sy - 10); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sx + 1, sy - 5); ctx.lineTo(sx + 8, sy - 18); ctx.stroke();
                ctx.fillStyle = '#f97316';
                ctx.beginPath(); ctx.arc(sx - 12, sy - 14, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(251,191,36,${0.4 + Math.sin(time * 5 + x) * 0.3})`;
                ctx.beginPath(); ctx.arc(sx + 10, sy - 12, 1.5, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.52) {
                // Volcanic vent with steam
                ctx.fillStyle = '#44403c';
                ctx.beginPath(); ctx.ellipse(sx, sy + 4, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#292524';
                ctx.beginPath(); ctx.ellipse(sx, sy + 4, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
                for (let i = 0; i < 3; i++) {
                  const steamY = sy - (time * 15 + i * 12) % 30;
                  const steamX = sx + Math.sin(time * 2 + i * 1.5) * 4;
                  const alpha = 0.3 - ((time * 15 + i * 12) % 30) / 100;
                  if (alpha > 0) {
                    ctx.fillStyle = `rgba(168,162,158,${alpha})`;
                    ctx.beginPath(); ctx.arc(steamX, steamY, 4 + i * 1.5, 0, Math.PI * 2); ctx.fill();
                  }
                }
              } else if (dr > 0.42) {
                // Fire geyser
                const eruptPhase = (time * 0.5 + x * 0.001) % 4;
                ctx.fillStyle = '#44403c';
                ctx.beginPath(); ctx.ellipse(sx, sy + 6, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
                if (eruptPhase < 1.5) {
                  // Erupting
                  const h = eruptPhase * 20;
                  ctx.fillStyle = `rgba(249,115,22,${0.6 - eruptPhase * 0.3})`;
                  ctx.beginPath(); ctx.moveTo(sx - 4, sy + 4); ctx.lineTo(sx - 2 - h * 0.15, sy - h); ctx.lineTo(sx + 2 + h * 0.15, sy - h); ctx.lineTo(sx + 4, sy + 4); ctx.closePath(); ctx.fill();
                  // Sparks
                  for (let s = 0; s < 3; s++) {
                    const sparkY = sy - h + s * 6;
                    const sparkX = sx + Math.sin(time * 8 + s) * (4 + s * 2);
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath(); ctx.arc(sparkX, sparkY, 1.5, 0, Math.PI * 2); ctx.fill();
                  }
                }
              } else if (dr > 0.3) {
                // Lava river segment
                ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 8;
                ctx.beginPath(); ctx.moveTo(sx - 16, sy + 2);
                ctx.bezierCurveTo(sx - 6, sy - 4, sx + 6, sy + 6, sx + 16, sy); ctx.stroke();
                ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.moveTo(sx - 16, sy + 2);
                ctx.bezierCurveTo(sx - 6, sy - 4, sx + 6, sy + 6, sx + 16, sy); ctx.stroke();
                // Bright center flow
                ctx.strokeStyle = `rgba(251,191,36,${0.4 + Math.sin(time * 3) * 0.2})`; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(sx - 14, sy + 2);
                ctx.bezierCurveTo(sx - 6, sy - 3, sx + 6, sy + 5, sx + 14, sy); ctx.stroke();
              } else if (dr > 0.18) {
                // Jagged rocks cluster
                ctx.fillStyle = '#44403c';
                ctx.beginPath(); ctx.moveTo(sx - 10, sy + 6); ctx.lineTo(sx - 6, sy - 8); ctx.lineTo(sx - 1, sy + 3); ctx.lineTo(sx + 5, sy - 12); ctx.lineTo(sx + 10, sy + 6); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#57534e';
                ctx.beginPath(); ctx.moveTo(sx - 1, sy + 3); ctx.lineTo(sx + 5, sy - 12); ctx.lineTo(sx + 10, sy + 6); ctx.closePath(); ctx.fill();
              } else if (dr > 0.08) {
                // Smoldering embers on ground
                for (let i = 0; i < 5; i++) {
                  const ex = sx - 10 + i * 5 + Math.sin(i * 2) * 3;
                  const ey = sy + Math.cos(i * 1.5) * 4;
                  const pulse = 0.3 + Math.sin(time * 4 + i * 2) * 0.3;
                  ctx.fillStyle = `rgba(249,115,22,${pulse})`;
                  ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = `rgba(249,115,22,${pulse * 0.3})`;
                  ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
                }
              } else {
                // Ash drift
                ctx.fillStyle = 'rgba(120,113,108,0.4)';
                ctx.beginPath(); ctx.ellipse(sx, sy + 3, 12, 4, dr2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(168,162,158,0.3)';
                ctx.beginPath(); ctx.ellipse(sx - 4, sy + 1, 6, 2.5, dr2 + 0.3, 0, Math.PI * 2); ctx.fill();
              }
            }
            // ===== FROZEN =====
            else if (zone === 'frozen') {
              if (dr > 0.9) {
                // Frozen warrior statue
                ctx.fillStyle = '#94a3b8';
                // Body
                ctx.fillRect(sx - 6, sy - 14, 12, 22);
                // Head
                ctx.beginPath(); ctx.arc(sx, sy - 18, 7, 0, Math.PI * 2); ctx.fill();
                // Shield arm
                ctx.fillStyle = '#64748b';
                ctx.beginPath(); ctx.ellipse(sx - 12, sy - 4, 6, 10, 0.2, 0, Math.PI * 2); ctx.fill();
                // Sword arm
                ctx.fillRect(sx + 7, sy - 20, 3, 22);
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(sx + 7, sy - 24, 3, 6);
                // Ice coating
                ctx.fillStyle = 'rgba(186,230,253,0.3)';
                ctx.beginPath(); ctx.ellipse(sx, sy - 4, 14, 20, 0, 0, Math.PI * 2); ctx.fill();
                // Ice crystals growing on it
                ctx.fillStyle = '#bae6fd';
                ctx.beginPath(); ctx.moveTo(sx - 8, sy - 10); ctx.lineTo(sx - 12, sy - 20); ctx.lineTo(sx - 5, sy - 12); ctx.closePath(); ctx.fill();
              } else if (dr > 0.82) {
                // Snow-covered pine tree
                ctx.fillStyle = '#5c4033'; ctx.fillRect(sx - 3, sy + 6, 6, 12);
                for (let layer = 0; layer < 3; layer++) {
                  const ly = sy - 4 - layer * 10;
                  const lw = 16 - layer * 3;
                  ctx.fillStyle = '#166534';
                  ctx.beginPath(); ctx.moveTo(sx, ly - 10); ctx.lineTo(sx - lw, ly + 4); ctx.lineTo(sx + lw, ly + 4); ctx.closePath(); ctx.fill();
                  ctx.fillStyle = '#f1f5f9';
                  ctx.beginPath(); ctx.moveTo(sx, ly - 10); ctx.lineTo(sx - lw * 0.6, ly - 2); ctx.lineTo(sx + lw * 0.6, ly - 2); ctx.closePath(); ctx.fill();
                }
              } else if (dr > 0.72) {
                // Frozen pond
                ctx.fillStyle = 'rgba(56,189,248,0.2)';
                ctx.beginPath(); ctx.ellipse(sx, sy, 16, 10, dr2 * 0.4, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(186,230,253,0.4)'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.ellipse(sx, sy, 16, 10, dr2 * 0.4, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = 'rgba(224,242,254,0.5)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(sx - 8, sy - 2); ctx.lineTo(sx + 4, sy + 3); ctx.lineTo(sx + 10, sy - 1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sx + 4, sy + 3); ctx.lineTo(sx + 2, sy + 7); ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath(); ctx.ellipse(sx - 4, sy - 3, 3, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.62) {
                // Ice spike formation
                const spikes = [{dx: 0, h: 22}, {dx: -7, h: 14}, {dx: 6, h: 16}];
                for (const sp of spikes) {
                  ctx.fillStyle = '#bae6fd';
                  ctx.beginPath(); ctx.moveTo(sx + sp.dx, sy - sp.h); ctx.lineTo(sx + sp.dx - 4, sy + 6); ctx.lineTo(sx + sp.dx + 4, sy + 6); ctx.closePath(); ctx.fill();
                  ctx.fillStyle = '#e0f2fe';
                  ctx.beginPath(); ctx.moveTo(sx + sp.dx, sy - sp.h); ctx.lineTo(sx + sp.dx + 4, sy + 6); ctx.lineTo(sx + sp.dx + 1, sy + 6); ctx.closePath(); ctx.fill();
                }
                ctx.fillStyle = 'rgba(186,230,253,0.15)';
                ctx.beginPath(); ctx.ellipse(sx, sy + 6, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.52) {
                // Frozen waterfall (wall of ice)
                ctx.fillStyle = 'rgba(147,197,253,0.4)';
                ctx.fillRect(sx - 10, sy - 18, 20, 30);
                // Ice texture lines
                ctx.strokeStyle = 'rgba(219,234,254,0.3)'; ctx.lineWidth = 1;
                for (let l = 0; l < 4; l++) {
                  ctx.beginPath(); ctx.moveTo(sx - 8 + l * 5, sy - 16);
                  ctx.lineTo(sx - 6 + l * 4, sy + 10); ctx.stroke();
                }
                // Icicles at bottom
                for (let i = 0; i < 5; i++) {
                  const ix = sx - 8 + i * 4;
                  ctx.fillStyle = '#bae6fd';
                  ctx.beginPath(); ctx.moveTo(ix - 1, sy + 10); ctx.lineTo(ix, sy + 16 + (i % 2) * 4); ctx.lineTo(ix + 1, sy + 10); ctx.fill();
                }
                // Shimmer
                ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(time * 2 + x * 0.01) * 0.1})`;
                ctx.beginPath(); ctx.ellipse(sx - 2, sy - 6, 3, 8, 0, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.4) {
                // Snow drift with wind particles
                ctx.fillStyle = '#f8fafc';
                ctx.beginPath(); ctx.ellipse(sx, sy + 4, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f1f5f9';
                ctx.beginPath(); ctx.ellipse(sx - 6, sy + 1, 8, 5, -0.3, 0, Math.PI * 2); ctx.fill();
                for (let i = 0; i < 3; i++) {
                  const px = sx + Math.sin(time * 2 + i * 2) * 12 + i * 4;
                  const py = sy + Math.cos(time * 1.5 + i * 3) * 6 - 8;
                  ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(time * 3 + i) * 0.2})`;
                  ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
                }
              } else if (dr > 0.3) {
                // Aurora borealis reflection on snow
                const auroraPhase = time * 0.5 + x * 0.001;
                for (let a = 0; a < 5; a++) {
                  const ax = sx - 12 + a * 6;
                  const ah = 6 + Math.sin(auroraPhase + a * 0.8) * 4;
                  const hue = (auroraPhase * 30 + a * 40) % 360;
                  ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.12 + Math.sin(time * 2 + a) * 0.06})`;
                  ctx.beginPath(); ctx.ellipse(ax, sy - ah, 4, ah, 0, 0, Math.PI * 2); ctx.fill();
                }
              } else if (dr > 0.18) {
                // Icicle cluster (hanging)
                for (let i = 0; i < 4; i++) {
                  const ix = sx - 6 + i * 4;
                  const ih = 8 + (i % 2) * 6;
                  ctx.fillStyle = '#bae6fd';
                  ctx.beginPath(); ctx.moveTo(ix, sy - 4); ctx.lineTo(ix - 1.5, sy - 4); ctx.lineTo(ix - 0.5, sy - 4 + ih); ctx.lineTo(ix + 0.5, sy - 4 + ih); ctx.lineTo(ix + 1.5, sy - 4); ctx.fill();
                  ctx.fillStyle = 'rgba(255,255,255,0.5)';
                  ctx.fillRect(ix - 0.5, sy - 3, 1, ih * 0.4);
                }
              } else if (dr > 0.08) {
                // Frozen bones/fossils
                ctx.strokeStyle = 'rgba(203,213,225,0.5)'; ctx.lineWidth = 2;
                // Ribcage shape
                ctx.beginPath(); ctx.moveTo(sx - 6, sy - 4); ctx.lineTo(sx + 6, sy - 4); ctx.stroke();
                for (let r = 0; r < 4; r++) {
                  ctx.beginPath();
                  ctx.moveTo(sx - 6 + r * 3, sy - 4);
                  ctx.quadraticCurveTo(sx - 6 + r * 3 - 2, sy + 2, sx - 6 + r * 3, sy + 6);
                  ctx.stroke();
                }
                // Skull
                ctx.fillStyle = 'rgba(203,213,225,0.4)';
                ctx.beginPath(); ctx.ellipse(sx - 10, sy - 4, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
                // Ice over it
                ctx.fillStyle = 'rgba(186,230,253,0.15)';
                ctx.beginPath(); ctx.ellipse(sx, sy, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
              } else {
                // Snowflake particles
                ctx.strokeStyle = 'rgba(186,230,253,0.4)'; ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                  const fx = sx + Math.sin(time + i * 2.1) * 10;
                  const fy = sy + Math.cos(time * 0.8 + i * 1.7) * 8;
                  for (let a = 0; a < 6; a++) {
                    const angle = a * Math.PI / 3;
                    ctx.beginPath(); ctx.moveTo(fx, fy);
                    ctx.lineTo(fx + Math.cos(angle) * 3, fy + Math.sin(angle) * 3); ctx.stroke();
                  }
                }
              }
            }
            // ===== ABYSS =====
            else if (zone === 'abyss') {
              if (dr > 0.88) {
                // Corrupted pillar
                ctx.fillStyle = '#1e1b4b';
                ctx.fillRect(sx - 5, sy - 18, 10, 32);
                ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(sx - 3, sy - 14); ctx.lineTo(sx, sy - 4); ctx.lineTo(sx + 2, sy + 8); ctx.stroke();
                ctx.fillStyle = '#312e81';
                ctx.fillRect(sx - 7, sy - 20, 14, 4);
                const voidPulse = 0.4 + Math.sin(time * 3 + x) * 0.2;
                ctx.fillStyle = `rgba(168,85,247,${voidPulse})`;
                ctx.beginPath(); ctx.arc(sx, sy - 22, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(168,85,247,${voidPulse * 0.3})`;
                ctx.beginPath(); ctx.arc(sx, sy - 22, 10, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.8) {
                // Floating eye (watcher)
                const eyeHover = Math.sin(time * 1.5 + y * 0.01) * 6;
                const eyeRotate = Math.sin(time * 0.8) * 0.3;
                // Aura
                ctx.fillStyle = `rgba(124,58,237,${0.08 + Math.sin(time * 2) * 0.04})`;
                ctx.beginPath(); ctx.arc(sx, sy + eyeHover, 18, 0, Math.PI * 2); ctx.fill();
                // Eye white
                ctx.fillStyle = '#312e81';
                ctx.beginPath(); ctx.ellipse(sx, sy + eyeHover, 12, 10, eyeRotate, 0, Math.PI * 2); ctx.fill();
                // Iris
                ctx.fillStyle = '#7c3aed';
                ctx.beginPath(); ctx.ellipse(sx, sy + eyeHover, 7, 7, 0, 0, Math.PI * 2); ctx.fill();
                // Pupil (tracks slight movement)
                const px = Math.sin(time * 0.5) * 2;
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.ellipse(sx + px, sy + eyeHover, 3 + Math.sin(time * 2) * 1, 5, 0, 0, Math.PI * 2); ctx.fill();
                // Glint
                ctx.fillStyle = '#c084fc';
                ctx.beginPath(); ctx.arc(sx - 3 + px, sy - 3 + eyeHover, 1.5, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.7) {
                // Void tear / rift
                const riftPulse = 0.5 + Math.sin(time * 2.5 + y) * 0.3;
                ctx.save(); ctx.translate(sx, sy); ctx.rotate(dr2 * Math.PI);
                ctx.fillStyle = `rgba(15,3,30,${riftPulse})`;
                ctx.beginPath(); ctx.ellipse(0, 0, 3, 12, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = `rgba(168,85,247,${riftPulse})`; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(0, 0, 3, 12, 0, 0, Math.PI * 2); ctx.stroke();
                for (let i = 0; i < 4; i++) {
                  const angle = time * 2 + i * 1.57;
                  const dist = 8 + Math.sin(time * 3 + i) * 4;
                  ctx.fillStyle = `rgba(139,92,246,${0.4 + Math.sin(time * 4 + i) * 0.2})`;
                  ctx.beginPath(); ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist * 0.3, 1.5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
              } else if (dr > 0.58) {
                // Corrupted altar
                ctx.fillStyle = '#1e1b4b';
                ctx.fillRect(sx - 12, sy + 2, 24, 8);
                ctx.fillRect(sx - 14, sy + 8, 28, 4);
                // Rune circle on top
                ctx.strokeStyle = `rgba(168,85,247,${0.3 + Math.sin(time * 2) * 0.15})`; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(sx, sy + 2, 10, 3, 0, 0, Math.PI * 2); ctx.stroke();
                // Floating dark orb above
                const orbY = sy - 8 + Math.sin(time * 2) * 4;
                ctx.fillStyle = '#0f0014';
                ctx.beginPath(); ctx.arc(sx, orbY, 5, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(sx, orbY, 7, 0, Math.PI * 2); ctx.stroke();
                // Candles
                ctx.fillStyle = '#581c87';
                ctx.fillRect(sx - 14, sy - 2, 2, 6);
                ctx.fillRect(sx + 12, sy - 2, 2, 6);
                ctx.fillStyle = `rgba(168,85,247,${0.5 + Math.sin(time * 6) * 0.3})`;
                ctx.beginPath(); ctx.arc(sx - 13, sy - 4, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(sx + 13, sy - 4, 2, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.46) {
                // Soul flame (purple/dark fire)
                for (let i = 0; i < 4; i++) {
                  const flameH = 12 + Math.sin(time * 8 + i * 2) * 4;
                  const fx = sx - 4 + i * 3;
                  ctx.fillStyle = i % 2 ? '#581c87' : '#7c3aed';
                  ctx.beginPath(); ctx.moveTo(fx - 3, sy + 4); ctx.quadraticCurveTo(fx, sy - flameH, fx + 3, sy + 4); ctx.fill();
                }
                ctx.fillStyle = '#c084fc';
                ctx.beginPath(); ctx.arc(sx, sy + 2, 3, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.34) {
                // Dark tendril roots
                ctx.strokeStyle = '#312e81'; ctx.lineWidth = 2.5;
                for (let i = 0; i < 3; i++) {
                  const angle = -0.8 + i * 0.8;
                  const wave = Math.sin(time * 1.5 + i * 2) * 5;
                  ctx.beginPath(); ctx.moveTo(sx, sy);
                  ctx.quadraticCurveTo(sx + Math.cos(angle) * 12, sy + Math.sin(angle) * 8 + wave, sx + Math.cos(angle) * 22, sy + Math.sin(angle) * 14);
                  ctx.stroke();
                }
                ctx.fillStyle = '#581c87';
                ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.22) {
                // Bone pile
                ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 2;
                for (let b = 0; b < 5; b++) {
                  const bx1 = sx - 10 + b * 4;
                  const by1 = sy + Math.sin(b * 2) * 3;
                  const angle = b * 0.6 + dr2;
                  ctx.beginPath(); ctx.moveTo(bx1, by1);
                  ctx.lineTo(bx1 + Math.cos(angle) * 8, by1 + Math.sin(angle) * 8 - 6); ctx.stroke();
                }
                // Skull
                ctx.fillStyle = '#d4d4d4';
                ctx.beginPath(); ctx.arc(sx, sy - 2, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#312e81';
                ctx.beginPath(); ctx.arc(sx - 1.5, sy - 3, 1, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(sx + 1.5, sy - 3, 1, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.1) {
                // Corrupted ground crack
                ctx.strokeStyle = `rgba(124,58,237,${0.3 + Math.sin(time * 2 + x * 0.01) * 0.15})`; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(sx - 14, sy + 2);
                ctx.lineTo(sx - 6, sy - 1); ctx.lineTo(sx, sy + 3); ctx.lineTo(sx + 8, sy); ctx.lineTo(sx + 14, sy + 2); ctx.stroke();
                // Glow from crack
                ctx.fillStyle = `rgba(124,58,237,${0.05 + Math.sin(time * 3) * 0.03})`;
                ctx.beginPath(); ctx.ellipse(sx, sy + 1, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
              } else {
                // Floating void particles
                for (let i = 0; i < 4; i++) {
                  const ppx = sx + Math.sin(time * 1.2 + i * 1.6) * 14;
                  const ppy = sy + Math.cos(time + i * 2.1) * 10 - Math.sin(time * 0.5 + i) * 5;
                  const alpha = 0.2 + Math.sin(time * 3 + i * 2) * 0.15;
                  ctx.fillStyle = `rgba(139,92,246,${alpha})`;
                  ctx.beginPath(); ctx.arc(ppx, ppy, 2.5, 0, Math.PI * 2); ctx.fill();
                }
              }
            }
            // ===== CRYSTAL CAVES =====
            else if (zone === 'crystal_caves') {
              if (dr > 0.88) {
                // Massive crystal throne formation
                const crystals = [{dx: 0, h: 32, w: 8, color: '#ec4899'}, {dx: -10, h: 20, w: 6, color: '#a855f7'}, {dx: 9, h: 24, w: 7, color: '#f0abfc'}, {dx: -5, h: 14, w: 4, color: '#d946ef'}, {dx: 5, h: 10, w: 3, color: '#c084fc'}];
                for (const cr of crystals) {
                  ctx.fillStyle = cr.color;
                  ctx.beginPath(); ctx.moveTo(sx + cr.dx, sy - cr.h); ctx.lineTo(sx + cr.dx - cr.w, sy + 8); ctx.lineTo(sx + cr.dx + cr.w, sy + 8); ctx.closePath(); ctx.fill();
                  ctx.fillStyle = 'rgba(253,242,248,0.3)';
                  ctx.beginPath(); ctx.moveTo(sx + cr.dx, sy - cr.h); ctx.lineTo(sx + cr.dx + cr.w, sy + 8); ctx.lineTo(sx + cr.dx + cr.w * 0.3, sy + 8); ctx.closePath(); ctx.fill();
                }
                // Sparkles
                for (let s = 0; s < 3; s++) {
                  const sparkleAlpha = 0.5 + Math.sin(time * 5 + x + s * 2) * 0.4;
                  ctx.fillStyle = `rgba(255,255,255,${sparkleAlpha})`;
                  ctx.beginPath(); ctx.arc(sx - 4 + s * 4, sy - 20 + s * 6, 2, 0, Math.PI * 2); ctx.fill();
                }
              } else if (dr > 0.8) {
                // Crystal chandelier (hanging)
                // Chain
                ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(sx, sy - 20); ctx.lineTo(sx, sy - 8); ctx.stroke();
                // Ring
                ctx.strokeStyle = '#d946ef'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(sx, sy - 6, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
                // Hanging crystals
                const hangColors = ['#ec4899', '#a855f7', '#f0abfc', '#d946ef', '#c084fc'];
                for (let h = 0; h < 5; h++) {
                  const hx = sx - 10 + h * 5;
                  const hLen = 6 + (h % 2) * 4;
                  ctx.strokeStyle = 'rgba(168,85,247,0.4)'; ctx.lineWidth = 0.5;
                  ctx.beginPath(); ctx.moveTo(hx, sy - 5); ctx.lineTo(hx, sy - 5 + hLen - 3); ctx.stroke();
                  ctx.fillStyle = hangColors[h];
                  ctx.beginPath(); ctx.moveTo(hx, sy - 5 + hLen - 3); ctx.lineTo(hx - 2, sy - 5 + hLen); ctx.lineTo(hx + 2, sy - 5 + hLen); ctx.closePath(); ctx.fill();
                }
                // Glow
                ctx.fillStyle = `rgba(236,72,153,${0.06 + Math.sin(time * 2) * 0.03})`;
                ctx.beginPath(); ctx.ellipse(sx, sy, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.71) {
                // Gem vein in ground
                ctx.strokeStyle = '#581c87'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(sx - 14, sy + 2); ctx.quadraticCurveTo(sx, sy - 2, sx + 14, sy + 1); ctx.stroke();
                const gemColors = ['#ec4899', '#a855f7', '#f472b6', '#d946ef'];
                for (let i = 0; i < 4; i++) {
                  ctx.fillStyle = gemColors[i];
                  const gx = sx - 10 + i * 7;
                  const gy = sy + Math.sin(i * 1.5) * 2;
                  ctx.beginPath(); ctx.moveTo(gx, gy - 3); ctx.lineTo(gx + 2, gy); ctx.lineTo(gx, gy + 2); ctx.lineTo(gx - 2, gy); ctx.closePath(); ctx.fill();
                }
              } else if (dr > 0.62) {
                // Glowing crystal pool
                const poolPulse = 0.3 + Math.sin(time * 2 + y) * 0.15;
                ctx.fillStyle = `rgba(236,72,153,${poolPulse})`;
                ctx.beginPath(); ctx.ellipse(sx, sy + 2, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(244,114,182,${poolPulse + 0.1})`;
                ctx.beginPath(); ctx.ellipse(sx, sy + 1, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(253,242,248,${poolPulse})`;
                ctx.beginPath(); ctx.ellipse(sx - 2, sy, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
                // Rising bubbles
                for (let b = 0; b < 2; b++) {
                  const bubY = sy - ((time * 12 + b * 15) % 20);
                  const bubX = sx + Math.sin(time * 2 + b * 3) * 4;
                  const bubAlpha = 0.3 - ((time * 12 + b * 15) % 20) / 60;
                  if (bubAlpha > 0) {
                    ctx.fillStyle = `rgba(244,114,182,${bubAlpha})`;
                    ctx.beginPath(); ctx.arc(bubX, bubY, 2, 0, Math.PI * 2); ctx.fill();
                  }
                }
              } else if (dr > 0.53) {
                // Crystal arch
                ctx.fillStyle = '#a855f7';
                // Left pillar
                ctx.beginPath(); ctx.moveTo(sx - 14, sy + 8); ctx.lineTo(sx - 10, sy - 10); ctx.lineTo(sx - 6, sy + 8); ctx.closePath(); ctx.fill();
                // Right pillar
                ctx.beginPath(); ctx.moveTo(sx + 6, sy + 8); ctx.lineTo(sx + 10, sy - 10); ctx.lineTo(sx + 14, sy + 8); ctx.closePath(); ctx.fill();
                // Arch connection
                ctx.fillStyle = '#d946ef';
                ctx.beginPath(); ctx.moveTo(sx - 10, sy - 8); ctx.quadraticCurveTo(sx, sy - 18, sx + 10, sy - 8);
                ctx.lineTo(sx + 8, sy - 6); ctx.quadraticCurveTo(sx, sy - 14, sx - 8, sy - 6); ctx.closePath(); ctx.fill();
                // Glow
                ctx.fillStyle = `rgba(217,70,239,${0.1 + Math.sin(time * 2.5) * 0.06})`;
                ctx.beginPath(); ctx.ellipse(sx, sy - 2, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
              } else if (dr > 0.44) {
                // Stalactite / stalagmite pair
                ctx.fillStyle = '#831843';
                ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(sx - 5, sy + 8); ctx.lineTo(sx + 5, sy + 8); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#9d174d';
                ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(sx + 5, sy + 8); ctx.lineTo(sx + 2, sy + 8); ctx.closePath(); ctx.fill();
                const dripY = sy - 18 + (time * 8 + x) % 10;
                if (dripY < sy - 10) {
                  ctx.fillStyle = 'rgba(236,72,153,0.5)';
                  ctx.beginPath(); ctx.arc(sx, dripY, 1.5, 0, Math.PI * 2); ctx.fill();
                }
              } else if (dr > 0.35) {
                // Crystal tree (organic crystal growth)
                ctx.fillStyle = '#581c87'; ctx.fillRect(sx - 2, sy, 4, 14);
                // Branches
                ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(sx, sy + 2); ctx.lineTo(sx - 10, sy - 8); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sx, sy + 4); ctx.lineTo(sx + 10, sy - 6); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 4, sy - 14); ctx.stroke();
                // Crystal tips
                const tipColors = ['#ec4899', '#f0abfc', '#d946ef'];
                const tips = [{x: -10, y: -8}, {x: 10, y: -6}, {x: -4, y: -14}];
                for (let t2 = 0; t2 < 3; t2++) {
                  ctx.fillStyle = tipColors[t2];
                  ctx.beginPath(); ctx.moveTo(sx + tips[t2].x, sy + tips[t2].y - 6);
                  ctx.lineTo(sx + tips[t2].x - 3, sy + tips[t2].y);
                  ctx.lineTo(sx + tips[t2].x + 3, sy + tips[t2].y); ctx.closePath(); ctx.fill();
                }
              } else if (dr > 0.25) {
                // Light prism effect
                const prismAngle = time * 0.5 + dr2 * Math.PI;
                ctx.fillStyle = '#a855f7';
                ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx - 4, sy + 4); ctx.lineTo(sx + 4, sy + 4); ctx.closePath(); ctx.fill();
                const rainbowColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
                for (let i = 0; i < 6; i++) {
                  const angle = prismAngle + i * 0.3 - 0.9;
                  ctx.strokeStyle = `${rainbowColors[i]}60`; ctx.lineWidth = 1.5;
                  ctx.beginPath(); ctx.moveTo(sx, sy - 1);
                  ctx.lineTo(sx + Math.cos(angle) * 18, sy - 1 + Math.sin(angle) * 18); ctx.stroke();
                }
              } else if (dr > 0.15) {
                // Resonating crystal (vibrating with sound waves)
                const vibrate = Math.sin(time * 8 + x * 0.01) * 1;
                ctx.fillStyle = '#d946ef';
                ctx.beginPath(); ctx.moveTo(sx + vibrate, sy - 16); ctx.lineTo(sx - 5 + vibrate, sy + 6); ctx.lineTo(sx + 5 + vibrate, sy + 6); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(253,242,248,0.3)';
                ctx.beginPath(); ctx.moveTo(sx + vibrate, sy - 16); ctx.lineTo(sx + 5 + vibrate, sy + 6); ctx.lineTo(sx + 2 + vibrate, sy + 6); ctx.closePath(); ctx.fill();
                // Sound waves
                for (let w = 0; w < 3; w++) {
                  const waveR = 8 + w * 6 + (time * 10) % 6;
                  const waveAlpha = 0.2 - w * 0.06;
                  if (waveAlpha > 0) {
                    ctx.strokeStyle = `rgba(217,70,239,${waveAlpha})`; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(sx + vibrate, sy - 4, waveR, 0, Math.PI * 2); ctx.stroke();
                  }
                }
              } else if (dr > 0.06) {
                // Scattered gems with twinkle
                const smColors = ['#ec4899', '#a855f7', '#f472b6'];
                for (let i = 0; i < 3; i++) {
                  ctx.fillStyle = smColors[i];
                  const gx = sx - 6 + i * 6;
                  const gy = sy + Math.sin(i * 2.3) * 4;
                  ctx.beginPath(); ctx.moveTo(gx, gy - 3); ctx.lineTo(gx + 2.5, gy); ctx.lineTo(gx, gy + 3); ctx.lineTo(gx - 2.5, gy); ctx.closePath(); ctx.fill();
                  ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(time * 4 + i * 2) * 0.3})`;
                  ctx.beginPath(); ctx.arc(gx, gy - 1, 1, 0, Math.PI * 2); ctx.fill();
                }
              } else {
                // Ambient crystal dust particles
                for (let p = 0; p < 5; p++) {
                  const pdx = sx + Math.sin(time * 1.2 + p * 1.3) * 14;
                  const pdy = sy + Math.cos(time * 0.9 + p * 1.8) * 10 - Math.sin(time * 0.5 + p) * 6;
                  const pAlpha = 0.15 + Math.sin(time * 3 + p * 2.5) * 0.15;
                  const pColor = p % 2 ? 'rgba(236,72,153,' : 'rgba(168,85,247,';
                  ctx.fillStyle = pColor + pAlpha + ')';
                  ctx.beginPath(); ctx.arc(pdx, pdy, 1.5 + Math.sin(time * 2 + p) * 0.5, 0, Math.PI * 2); ctx.fill();
                }
              }
            }
          }
        }
        
        // ========== AMBIENT NPCs (Sanctuary + Meadow) ==========
        const ambientNpcs = [
          // Sanctuary NPCs - near the tower and paths
          { x: 9800, y: 8800, name: 'Merchant Finn', type: 'merchant', color: '#ca8a04', zone: 'sanctuary' },
          { x: 10200, y: 9400, name: 'Scholar Elara', type: 'scholar', color: '#6366f1', zone: 'sanctuary' },
          { x: 10800, y: 8600, name: 'Guard Marcus', type: 'guard', color: '#64748b', zone: 'sanctuary' },
          { x: 9600, y: 9600, name: 'Healer Sage', type: 'healer', color: '#22c55e', zone: 'sanctuary' },
          { x: 10900, y: 9600, name: 'Bard Lyric', type: 'bard', color: '#f97316', zone: 'sanctuary' },
          { x: 9400, y: 8400, name: 'Blacksmith Orin', type: 'blacksmith', color: '#78716c', zone: 'sanctuary' },
          // Meadow NPCs - wandering travelers
          { x: 8200, y: 6800, name: 'Farmer Giles', type: 'farmer', color: '#65a30d', zone: 'meadow' },
          { x: 12500, y: 7200, name: 'Berry Picker Rose', type: 'gatherer', color: '#e11d48', zone: 'meadow' },
          { x: 9500, y: 11500, name: 'Shepherd Tom', type: 'shepherd', color: '#a16207', zone: 'meadow' },
          { x: 11000, y: 6200, name: 'Ranger Scout', type: 'ranger', color: '#166534', zone: 'meadow' },
          { x: 7800, y: 10500, name: 'Traveling Merchant', type: 'merchant', color: '#b45309', zone: 'meadow' },
        ];
        
        for (const npc of ambientNpcs) {
          const nx = npc.x - cx;
          const ny = npc.y - cy;
          // Cull off-screen
          if (nx < -60 || nx > width + 60 || ny < -60 || ny > height + 60) continue;
          
          const t = Date.now() / 1000;
          const idle = Math.sin(t * 1.5 + npc.x) * 1.5;
          const c = npc.color;
          
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath(); ctx.ellipse(nx, ny + 16, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
          
          // Body / Robe
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.moveTo(nx - 8, ny + 14); ctx.lineTo(nx - 10, ny - 2); ctx.lineTo(nx, ny - 8);
          ctx.lineTo(nx + 10, ny - 2); ctx.lineTo(nx + 8, ny + 14); ctx.closePath(); ctx.fill();
          // Lighter inner
          ctx.fillStyle = c + 'aa';
          ctx.beginPath(); ctx.moveTo(nx - 4, ny + 12); ctx.lineTo(nx - 5, ny); ctx.lineTo(nx, ny - 4);
          ctx.lineTo(nx + 5, ny); ctx.lineTo(nx + 4, ny + 12); ctx.closePath(); ctx.fill();
          
          // Head
          ctx.fillStyle = '#fcd9b6';
          ctx.beginPath(); ctx.arc(nx, ny - 12 + idle, 7, 0, Math.PI * 2); ctx.fill();
          // Hair/hat based on type
          if (npc.type === 'guard') {
            // Helmet
            ctx.fillStyle = '#64748b';
            ctx.beginPath(); ctx.arc(nx, ny - 14 + idle, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(nx - 8, ny - 14 + idle, 16, 3);
          } else if (npc.type === 'scholar') {
            // Hat
            ctx.fillStyle = '#3730a3';
            ctx.beginPath(); ctx.moveTo(nx, ny - 26 + idle); ctx.lineTo(nx - 8, ny - 12 + idle); ctx.lineTo(nx + 8, ny - 12 + idle); ctx.fill();
            // Star on hat
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(nx, ny - 20 + idle, 2, 0, Math.PI * 2); ctx.fill();
          } else if (npc.type === 'merchant' || npc.type === 'blacksmith') {
            // Bandana/cap
            ctx.fillStyle = npc.type === 'blacksmith' ? '#292524' : '#b45309';
            ctx.beginPath(); ctx.arc(nx, ny - 14 + idle, 8, Math.PI + 0.3, -0.3); ctx.fill();
          } else {
            // Simple hair
            ctx.fillStyle = '#92400e';
            ctx.beginPath(); ctx.arc(nx, ny - 14 + idle, 7, Math.PI + 0.5, -0.5); ctx.fill();
          }
          // Eyes
          ctx.fillStyle = '#1c1917';
          ctx.beginPath(); ctx.arc(nx - 2, ny - 12 + idle, 1, 0, Math.PI * 2); ctx.arc(nx + 2, ny - 12 + idle, 1, 0, Math.PI * 2); ctx.fill();
          
          // Type-specific accessories
          if (npc.type === 'guard') {
            // Spear
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(nx + 12, ny - 18); ctx.lineTo(nx + 12, ny + 14); ctx.stroke();
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath(); ctx.moveTo(nx + 12, ny - 22); ctx.lineTo(nx + 10, ny - 16); ctx.lineTo(nx + 14, ny - 16); ctx.fill();
          } else if (npc.type === 'bard') {
            // Lute
            ctx.fillStyle = '#92400e';
            ctx.beginPath(); ctx.ellipse(nx - 10, ny + 2, 5, 7, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(nx - 10, ny - 4); ctx.lineTo(nx - 8, ny - 14); ctx.stroke();
            // Music notes
            const noteAlpha = 0.3 + Math.sin(t * 3 + npc.x) * 0.3;
            ctx.fillStyle = `rgba(251,191,36,${noteAlpha})`;
            ctx.font = '10px Arial';
            ctx.fillText('♪', nx - 16 + Math.sin(t * 2) * 3, ny - 18 + Math.cos(t) * 4);
          } else if (npc.type === 'farmer' || npc.type === 'shepherd') {
            // Pitchfork/staff
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(nx + 11, ny - 14); ctx.lineTo(nx + 11, ny + 14); ctx.stroke();
          } else if (npc.type === 'healer') {
            // Healing glow
            const healGlow = 0.15 + Math.sin(t * 2) * 0.08;
            ctx.fillStyle = `rgba(34,197,94,${healGlow})`;
            ctx.beginPath(); ctx.arc(nx, ny, 18, 0, Math.PI * 2); ctx.fill();
          } else if (npc.type === 'gatherer') {
            // Basket
            ctx.fillStyle = '#a16207';
            ctx.beginPath(); ctx.ellipse(nx + 10, ny + 6, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath(); ctx.arc(nx + 9, ny + 3, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7c3aed';
            ctx.beginPath(); ctx.arc(nx + 12, ny + 4, 1.5, 0, Math.PI * 2); ctx.fill();
          }
          
          // Name
          ctx.fillStyle = c;
          ctx.font = 'bold 8px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(npc.name, nx, ny + 26);
          ctx.textAlign = 'left';
        }
      } // End of if (!inDungeon) for decorations

      // Skip zone-specific visuals when in dungeon
      if (!inDungeonRef.current) {
        // Zone transition rings (subtle gradient borders)
        const centerX = worldCenterX - cx;
        const centerY = worldCenterY - cy;
      const zoneRings = [
        { r: 8000, c: '#581c87' },
        { r: 6500, c: '#0ea5e9' },
        { r: 5000, c: '#dc2626' },
        { r: 3000, c: '#166534' },
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
      }
      } // End of if (!inDungeon) for zone visuals

      // World border (or dungeon walls in dungeon)
      if (!inDungeonRef.current) {
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
      if (!inDungeonRef.current) {
        const sanctuaryCenter = { x: 10500, y: 9000 };
        const scx = sanctuaryCenter.x - cx;
        const scy = sanctuaryCenter.y - cy;
        const healRadius = 380; // Match new sanctuary size
        const time = Date.now() / 1000;
        
        // Only render if on screen
        if (scx > -healRadius - 100 && scx < width + healRadius + 100 && 
            scy > -healRadius - 100 && scy < height + healRadius + 100) {
          
          // ========== HEALING FOUNTAIN (center) ==========
          const fountainRadius = 200;
          const fountainGlow = ctx.createRadialGradient(scx, scy, 0, scx, scy, fountainRadius * 1.5);
          fountainGlow.addColorStop(0, `rgba(74, 222, 128, ${0.4 + Math.sin(time * 4) * 0.1})`);
          fountainGlow.addColorStop(0.5, `rgba(34, 197, 94, ${0.2 + Math.sin(time * 3) * 0.05})`);
          fountainGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = fountainGlow;
          ctx.beginPath();
          ctx.arc(scx, scy, fountainRadius * 1.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Fountain base (stone)
          ctx.fillStyle = '#44403c';
          ctx.beginPath();
          ctx.ellipse(scx, scy + 20, 70, 25, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#57534e';
          ctx.beginPath();
          ctx.ellipse(scx, scy + 10, 55, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Water pool
          ctx.fillStyle = `rgba(74, 222, 128, ${0.6 + Math.sin(time * 2) * 0.1})`;
          ctx.beginPath();
          ctx.ellipse(scx, scy + 5, 45, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Water spout (center)
          ctx.fillStyle = '#44403c';
          ctx.beginPath();
          ctx.ellipse(scx, scy - 10, 12, 30, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Water jet shooting up
          for (let i = 0; i < 5; i++) {
            const jetHeight = 40 + i * 8;
            const jetX = scx + Math.sin(time * 6 + i * 0.5) * 3;
            const jetY = scy - 30 - jetHeight * (0.8 + Math.sin(time * 4 + i) * 0.2);
            const jetAlpha = 0.7 - i * 0.1;
            ctx.fillStyle = `rgba(134, 239, 172, ${jetAlpha})`;
            ctx.beginPath();
            ctx.arc(jetX, jetY, 6 - i, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Water droplets falling
          for (let i = 0; i < 8; i++) {
            const angle = (time * 2 + i * Math.PI / 4) % (Math.PI * 2);
            const dropTime = (time * 3 + i) % 1;
            const dropX = scx + Math.cos(angle) * 20 + Math.sin(time * 5 + i) * 5;
            const dropY = scy - 60 + dropTime * 80;
            const dropAlpha = 1 - dropTime;
            ctx.fillStyle = `rgba(134, 239, 172, ${dropAlpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(dropX, dropY, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Fountain label
          ctx.font = 'bold 11px Arial';
          ctx.fillStyle = `rgba(74, 222, 128, ${0.8 + Math.sin(time * 3) * 0.2})`;
          ctx.textAlign = 'center';
          ctx.fillText('💧 HEALING FOUNTAIN 💧', scx, scy + 55);
          ctx.font = '9px Arial';
          ctx.fillStyle = 'rgba(134, 239, 172, 0.7)';
          ctx.fillText('Stand here for bonus healing', scx, scy + 68);
          
          // Floating healing particles around sanctuary
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
          
          // "Safe Zone" text at top
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = `rgba(34, 197, 94, ${0.6 + Math.sin(time * 2) * 0.2})`;
          ctx.textAlign = 'center';
          ctx.fillText('✨ SANCTUARY ✨', scx, scy - healRadius + 25);
          ctx.font = '10px Arial';
          ctx.fillStyle = 'rgba(74, 222, 128, 0.7)';
          ctx.fillText('Portal Hub • Safe Zone', scx, scy - healRadius + 40);
        }
      }

      // ========== BUILDINGS ========== (skip in dungeon)
      if (!inDungeonRef.current) {
        const time = Date.now() / 1000;
        for (const [id, building] of Object.entries(BUILDING_DATA)) {
        const bx = building.x - cx;
        const by = building.y - cy;
        const w = building.width;
        const h = building.height;
        
        // Skip if off screen
        if (bx < -w*2 || bx > width + w*2 || by < -h*2 || by > height + h*2) continue;
        
        // Building shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(bx + 8, by + 8, w * 0.6, h * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        if (id === 'wizard_tower') {
          // === ARCHMAGE'S TOWER - tall stone tower with glowing windows ===
          // Base stones
          const baseGrad = ctx.createLinearGradient(bx - w/2, by, bx + w/2, by);
          baseGrad.addColorStop(0, '#6b7280'); baseGrad.addColorStop(0.5, '#9ca3af'); baseGrad.addColorStop(1, '#6b7280');
          ctx.fillStyle = baseGrad;
          ctx.fillRect(bx - w/2, by - h, w, h);
          // Stone lines
          ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
          for (let row = 0; row < 6; row++) {
            const ry = by - h + row * (h / 6);
            ctx.beginPath(); ctx.moveTo(bx - w/2, ry); ctx.lineTo(bx + w/2, ry); ctx.stroke();
          }
          // Conical roof
          ctx.beginPath();
          ctx.moveTo(bx, by - h - 80);
          ctx.lineTo(bx - w/2 - 10, by - h);
          ctx.lineTo(bx + w/2 + 10, by - h);
          ctx.closePath();
          const roofGrad = ctx.createLinearGradient(bx, by - h - 80, bx, by - h);
          roofGrad.addColorStop(0, '#7c3aed'); roofGrad.addColorStop(1, '#4c1d95');
          ctx.fillStyle = roofGrad;
          ctx.fill();
          // Glowing windows
          for (let i = 0; i < 4; i++) {
            const wy = by - h + 20 + i * (h / 4.5);
            const glow = Math.sin(time * 2 + i * 0.8) > 0;
            ctx.fillStyle = glow ? '#ffd93d' : '#b8860b';
            ctx.beginPath(); ctx.arc(bx, wy + 10, 10, 0, Math.PI * 2); ctx.fill();
            if (glow) {
              ctx.fillStyle = 'rgba(255,217,61,0.3)';
              ctx.beginPath(); ctx.arc(bx, wy + 10, 25, 0, Math.PI * 2); ctx.fill();
            }
          }
          // Tip orb
          ctx.beginPath(); ctx.arc(bx, by - h - 80, 8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,217,61,${0.6 + Math.sin(time * 3) * 0.3})`;
          ctx.fill();
          ctx.fillStyle = 'rgba(255,217,61,0.2)';
          ctx.beginPath(); ctx.arc(bx, by - h - 80, 20, 0, Math.PI * 2); ctx.fill();
          
        } else if (id === 'forest_ruins') {
          // === ANCIENT RUINS - crumbling stone pillars with vines ===
          const pillarW = w / 6;
          const pillars = [-0.35, -0.1, 0.15, 0.4];
          for (let p = 0; p < pillars.length; p++) {
            const px = bx + pillars[p] * w;
            const pillarH = h * (0.6 + p * 0.1);
            // Cracked pillar
            ctx.fillStyle = '#78716c';
            ctx.fillRect(px - pillarW/2, by - pillarH, pillarW, pillarH);
            // Broken top
            ctx.beginPath();
            ctx.moveTo(px - pillarW/2, by - pillarH);
            ctx.lineTo(px - pillarW/4, by - pillarH - 8 - (p % 2) * 10);
            ctx.lineTo(px + pillarW/4, by - pillarH - 5);
            ctx.lineTo(px + pillarW/2, by - pillarH);
            ctx.closePath();
            ctx.fillStyle = '#a8a29e'; ctx.fill();
            // Vines
            ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, by - pillarH);
            ctx.quadraticCurveTo(px + 15 * Math.sin(time + p), by - pillarH/2, px - 10, by);
            ctx.stroke();
          }
          // Stone base platform
          ctx.fillStyle = '#57534e';
          ctx.fillRect(bx - w/2, by - 10, w, 15);
          // Moss patches
          ctx.fillStyle = 'rgba(34,197,94,0.3)';
          ctx.beginPath(); ctx.arc(bx - w/4, by - 5, 15, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(bx + w/3, by - 5, 12, 0, Math.PI * 2); ctx.fill();
          
        } else if (id === 'volcano_fortress') {
          // === OBSIDIAN FORTRESS - dark fortress with lava rivers ===
          // Main structure
          const fortGrad = ctx.createLinearGradient(bx - w/2, by - h, bx + w/2, by);
          fortGrad.addColorStop(0, '#1c1917'); fortGrad.addColorStop(0.5, '#44403c'); fortGrad.addColorStop(1, '#1c1917');
          ctx.fillStyle = fortGrad;
          ctx.fillRect(bx - w/2, by - h, w, h);
          // Towers on sides
          const towerW = w / 5;
          for (const side of [-1, 1]) {
            const tx = bx + side * (w/2 - towerW/2);
            ctx.fillStyle = '#292524';
            ctx.fillRect(tx - towerW/2, by - h - 40, towerW, h + 40);
            // Battlements
            for (let b = 0; b < 3; b++) {
              ctx.fillRect(tx - towerW/2 + b * (towerW/3), by - h - 55, towerW/4, 15);
            }
          }
          // Lava glow through cracks
          const lavaGlow = 0.4 + Math.sin(time * 2) * 0.2;
          ctx.strokeStyle = `rgba(249,115,22,${lavaGlow})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(bx - w/4, by - h * 0.8); ctx.lineTo(bx - w/6, by - h * 0.3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx + w/5, by - h * 0.7); ctx.lineTo(bx + w/8, by - h * 0.2); ctx.stroke();
          // Lava moat
          ctx.fillStyle = `rgba(234,88,12,${lavaGlow})`;
          ctx.beginPath(); ctx.ellipse(bx, by + 10, w * 0.55, 12, 0, 0, Math.PI * 2); ctx.fill();
          // Gate
          ctx.fillStyle = '#7f1d1d';
          ctx.beginPath();
          ctx.moveTo(bx - 25, by); ctx.lineTo(bx - 25, by - 50); ctx.arc(bx, by - 50, 25, Math.PI, 0);
          ctx.lineTo(bx + 25, by); ctx.closePath(); ctx.fill();
          
        } else if (id === 'ice_citadel') {
          // === ICE CITADEL - crystalline ice palace ===
          // Main ice structure
          const iceGrad = ctx.createLinearGradient(bx - w/2, by - h, bx + w/2, by);
          iceGrad.addColorStop(0, '#bae6fd'); iceGrad.addColorStop(0.5, '#e0f2fe'); iceGrad.addColorStop(1, '#7dd3fc');
          ctx.fillStyle = iceGrad;
          ctx.fillRect(bx - w/2, by - h, w, h);
          // Translucent overlay
          ctx.fillStyle = 'rgba(186,230,253,0.3)';
          ctx.fillRect(bx - w/2, by - h, w, h);
          // Ice spires (5 of them)
          for (let i = 0; i < 5; i++) {
            const spx = bx - w/2 + w * (i + 0.5) / 5;
            const spireH = 30 + (i % 2 === 0 ? 40 : 20);
            ctx.beginPath();
            ctx.moveTo(spx, by - h - spireH);
            ctx.lineTo(spx - 15, by - h);
            ctx.lineTo(spx + 15, by - h);
            ctx.closePath();
            ctx.fillStyle = `rgba(103,232,249,${0.6 + Math.sin(time + i) * 0.2})`;
            ctx.fill();
            ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 1; ctx.stroke();
          }
          // Frost particles
          for (let i = 0; i < 8; i++) {
            const fx = bx + Math.sin(time * 0.5 + i * 1.3) * w * 0.6;
            const fy = by - h/2 + Math.cos(time * 0.7 + i * 0.9) * h * 0.4;
            ctx.fillStyle = `rgba(186,230,253,${0.4 + Math.sin(time + i) * 0.3})`;
            ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
          }
          // Frozen archway
          ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(bx, by - 35, 30, Math.PI, 0); ctx.stroke();
          
        } else if (id === 'void_shrine') {
          // === VOID SHRINE - dark altar with floating void energy ===
          // Stone base
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(bx - w/2, by - 20, w, 25);
          // Altar pillars
          for (const side of [-1, 1]) {
            const px = bx + side * w * 0.35;
            ctx.fillStyle = '#44403c';
            ctx.fillRect(px - 10, by - h, 20, h - 20);
            // Void orb on top
            ctx.beginPath(); ctx.arc(px, by - h - 5, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(168,85,247,${0.5 + Math.sin(time * 2 + side) * 0.3})`;
            ctx.fill();
          }
          // Central void rift
          ctx.save();
          ctx.translate(bx, by - h/2);
          ctx.rotate(time * 0.5);
          const voidGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
          voidGrad.addColorStop(0, 'rgba(88,28,135,0.8)');
          voidGrad.addColorStop(0.5, 'rgba(124,58,237,0.4)');
          voidGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = voidGrad;
          ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
          // Swirling void particles
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time;
            const dist = 25 + Math.sin(time * 2 + i) * 10;
            ctx.beginPath(); ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#c084fc'; ctx.fill();
          }
          ctx.restore();
          
        } else if (id === 'crystal_sanctum') {
          // === CRYSTAL SANCTUM - cluster of giant crystals ===
          const crystals = [
            { ox: -w*0.3, h: h*0.9, w: 30, color: '#f472b6', angle: -0.15 },
            { ox: 0, h: h*1.1, w: 35, color: '#ec4899', angle: 0 },
            { ox: w*0.25, h: h*0.75, w: 28, color: '#f9a8d4', angle: 0.1 },
            { ox: -w*0.15, h: h*0.6, w: 22, color: '#fb7185', angle: -0.08 },
            { ox: w*0.4, h: h*0.5, w: 20, color: '#fda4af', angle: 0.2 },
          ];
          for (const cr of crystals) {
            ctx.save();
            ctx.translate(bx + cr.ox, by);
            ctx.rotate(cr.angle);
            // Crystal body
            ctx.beginPath();
            ctx.moveTo(0, -cr.h);
            ctx.lineTo(-cr.w/2, -cr.h * 0.3);
            ctx.lineTo(-cr.w/2, 0);
            ctx.lineTo(cr.w/2, 0);
            ctx.lineTo(cr.w/2, -cr.h * 0.3);
            ctx.closePath();
            const crGrad = ctx.createLinearGradient(-cr.w/2, -cr.h, cr.w/2, 0);
            crGrad.addColorStop(0, cr.color); crGrad.addColorStop(0.5, cr.color + 'cc'); crGrad.addColorStop(1, cr.color + '88');
            ctx.fillStyle = crGrad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(-cr.w/4, -cr.h * 0.8, cr.w/4, cr.h * 0.3);
            ctx.restore();
          }
          // Sparkles
          for (let i = 0; i < 6; i++) {
            const sparkX = bx + Math.sin(time * 1.5 + i * 2) * w * 0.4;
            const sparkY = by - h * 0.5 + Math.cos(time * 1.2 + i * 1.5) * h * 0.4;
            ctx.fillStyle = `rgba(236,72,153,${0.4 + Math.sin(time * 3 + i) * 0.3})`;
            ctx.beginPath(); ctx.arc(sparkX, sparkY, 2.5, 0, Math.PI * 2); ctx.fill();
          }
        }
        
        // Building name
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
        ctx.fillText(building.name, bx, by + 25);
        ctx.shadowBlur = 0;
      }

      // ========== QUEST NPCs ========== (near portals)
      for (const [qid, qnpc] of Object.entries(QUEST_NPCS)) {
        const qx = qnpc.x - cx;
        const qy = qnpc.y - cy;
        if (qx < -80 || qx > width + 80 || qy < -80 || qy > height + 80) continue;
        
        const qtime = Date.now() / 1000;
        const bob = Math.sin(qtime * 2) * 3;
        const npcColor = qnpc.color;
        
        // Glow aura
        const auraGrad = ctx.createRadialGradient(qx, qy + bob, 0, qx, qy + bob, 40);
        auraGrad.addColorStop(0, npcColor + '30');
        auraGrad.addColorStop(0.6, npcColor + '10');
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(qx, qy + bob, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(qx, qy + 15, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Robe/body (triangular robe shape)
        ctx.fillStyle = npcColor + 'cc';
        ctx.beginPath();
        ctx.moveTo(qx, qy - 14 + bob);
        ctx.lineTo(qx - 14, qy + 14);
        ctx.lineTo(qx + 14, qy + 14);
        ctx.closePath();
        ctx.fill();
        
        // Robe trim
        ctx.strokeStyle = npcColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner robe highlight
        ctx.fillStyle = npcColor + '40';
        ctx.beginPath();
        ctx.moveTo(qx, qy - 10 + bob);
        ctx.lineTo(qx - 6, qy + 8);
        ctx.lineTo(qx + 6, qy + 8);
        ctx.closePath();
        ctx.fill();
        
        // Head
        ctx.beginPath();
        ctx.arc(qx, qy - 20 + bob, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#fcd5ce';
        ctx.fill();
        ctx.strokeStyle = npcColor + '80';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Hood (curved top)
        ctx.beginPath();
        ctx.arc(qx, qy - 22 + bob, 12, Math.PI, 0);
        ctx.fillStyle = npcColor + 'dd';
        ctx.fill();
        
        // Eyes (small dots)
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(qx - 3, qy - 20 + bob, 1.5, 0, Math.PI * 2);
        ctx.arc(qx + 3, qy - 20 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Zone-specific accessory
        if (qnpc.targetZone === 'meadow') {
          // Flower staff
          ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(qx + 16, qy + 10); ctx.lineTo(qx + 20, qy - 25 + bob); ctx.stroke();
          ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.arc(qx + 20, qy - 28 + bob, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(qx + 20, qy - 28 + bob, 2, 0, Math.PI * 2); ctx.fill();
        } else if (qnpc.targetZone === 'forest') {
          // Bow
          ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(qx - 18, qy - 5 + bob, 14, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
          ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(qx - 18, qy - 15 + bob); ctx.lineTo(qx - 18, qy + 5 + bob); ctx.stroke();
        } else if (qnpc.targetZone === 'volcanic') {
          // Hammer
          ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(qx + 15, qy + 8); ctx.lineTo(qx + 22, qy - 18 + bob); ctx.stroke();
          ctx.fillStyle = '#6b7280'; ctx.fillRect(qx + 16, qy - 24 + bob, 12, 8);
        } else if (qnpc.targetZone === 'frozen') {
          // Ice crystal staff
          ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(qx - 16, qy + 10); ctx.lineTo(qx - 20, qy - 22 + bob); ctx.stroke();
          ctx.fillStyle = '#67e8f9'; ctx.beginPath();
          ctx.moveTo(qx - 20, qy - 30 + bob); ctx.lineTo(qx - 24, qy - 22 + bob);
          ctx.lineTo(qx - 16, qy - 22 + bob); ctx.closePath(); ctx.fill();
        } else if (qnpc.targetZone === 'crystal_caves') {
          // Jeweled pendant (glowing)
          const glow = 0.5 + Math.sin(qtime * 3) * 0.3;
          ctx.fillStyle = `rgba(236,72,153,${glow})`; ctx.beginPath();
          ctx.arc(qx, qy - 5 + bob, 4, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(qx - 3, qy - 15 + bob); ctx.lineTo(qx, qy - 5 + bob); ctx.lineTo(qx + 3, qy - 15 + bob); ctx.stroke();
        } else if (qnpc.targetZone === 'abyss') {
          // Floating void orb
          ctx.save();
          const vOrb = ctx.createRadialGradient(qx + 18, qy - 10 + bob, 0, qx + 18, qy - 10 + bob, 8);
          vOrb.addColorStop(0, '#c084fc'); vOrb.addColorStop(1, 'transparent');
          ctx.fillStyle = vOrb; ctx.beginPath(); ctx.arc(qx + 18, qy - 10 + bob, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.arc(qx + 18, qy - 10 + bob, 3, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        
        // Exclamation mark quest indicator
        const exBob = Math.sin(qtime * 4) * 3;
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.shadowColor = 'rgba(251,191,36,0.5)'; ctx.shadowBlur = 8;
        ctx.fillText('!', qx, qy - 36 + bob + exBob);
        ctx.shadowBlur = 0;
        
        // Name
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(qnpc.name, qx, qy + 28);
        ctx.font = '9px Arial';
        ctx.fillStyle = npcColor;
        ctx.fillText(`Lv ${qnpc.recommendedLevel}+ • ${qnpc.targetZone === 'crystal_caves' ? 'Crystal Caves' : qnpc.targetZone.charAt(0).toUpperCase() + qnpc.targetZone.slice(1)}`, qx, qy + 40);
        
        // Interaction prompt when nearby
        if (me) {
          const distToNpc = Math.sqrt(Math.pow(me.x - qnpc.x, 2) + Math.pow(me.y - qnpc.y, 2));
          if (distToNpc < 100) {
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#4ade80';
            ctx.fillText('[E] Talk', qx, qy + 55);
          }
        }
      }

      // ========== CAMPFIRE ==========
      {
        const campX = 10200 - cx;
        const campY = 8600 - cy;
        
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
        } else if (npc.type === 'quest_master') {
          // Quest Master Seraphina - elegant wizard with quest scroll
          const bobY = Math.sin(time * 2 + npc.x) * 2;
          
          // Glow effect
          ctx.shadowColor = '#ffd93d';
          ctx.shadowBlur = 15;
          
          // Robe (elegant dress)
          ctx.fillStyle = '#7c3aed';
          ctx.beginPath();
          ctx.moveTo(nx - 14, ny + bobY - 5);
          ctx.lineTo(nx - 16, ny + bobY + 20);
          ctx.lineTo(nx + 16, ny + bobY + 20);
          ctx.lineTo(nx + 14, ny + bobY - 5);
          ctx.closePath();
          ctx.fill();
          
          // Robe details (gold trim)
          ctx.strokeStyle = '#ffd93d';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(nx - 14, ny + bobY - 5);
          ctx.lineTo(nx - 16, ny + bobY + 20);
          ctx.moveTo(nx + 14, ny + bobY - 5);
          ctx.lineTo(nx + 16, ny + bobY + 20);
          ctx.stroke();
          
          ctx.shadowBlur = 0;
          
          // Body
          ctx.fillStyle = '#f5d0fe';
          ctx.beginPath();
          ctx.ellipse(nx, ny + bobY - 10, 10, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Head
          ctx.fillStyle = '#fde68a';
          ctx.beginPath();
          ctx.arc(nx, ny + bobY - 22, 10, 0, Math.PI * 2);
          ctx.fill();
          
          // Hair (flowing golden)
          ctx.fillStyle = '#fcd34d';
          ctx.beginPath();
          ctx.ellipse(nx, ny + bobY - 28, 12, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(nx - 8, ny + bobY - 18, 4, 12, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(nx + 8, ny + bobY - 18, 4, 12, -0.3, 0, Math.PI * 2);
          ctx.fill();
          
          // Eyes
          ctx.fillStyle = '#7c3aed';
          ctx.beginPath();
          ctx.arc(nx - 4, ny + bobY - 24, 2, 0, Math.PI * 2);
          ctx.arc(nx + 4, ny + bobY - 24, 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Crown/tiara
          ctx.fillStyle = '#ffd93d';
          ctx.beginPath();
          ctx.moveTo(nx - 8, ny + bobY - 32);
          ctx.lineTo(nx - 6, ny + bobY - 38);
          ctx.lineTo(nx - 2, ny + bobY - 34);
          ctx.lineTo(nx, ny + bobY - 40);
          ctx.lineTo(nx + 2, ny + bobY - 34);
          ctx.lineTo(nx + 6, ny + bobY - 38);
          ctx.lineTo(nx + 8, ny + bobY - 32);
          ctx.closePath();
          ctx.fill();
          
          // Quest scroll (held in hand)
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(nx + 12, ny + bobY - 15, 8, 18);
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 1;
          ctx.strokeRect(nx + 12, ny + bobY - 15, 8, 18);
          // Scroll lines
          ctx.strokeStyle = '#78716c';
          ctx.beginPath();
          ctx.moveTo(nx + 14, ny + bobY - 10);
          ctx.lineTo(nx + 18, ny + bobY - 10);
          ctx.moveTo(nx + 14, ny + bobY - 5);
          ctx.lineTo(nx + 18, ny + bobY - 5);
          ctx.moveTo(nx + 14, ny + bobY);
          ctx.lineTo(nx + 18, ny + bobY);
          ctx.stroke();
          
          // Floating quest marker
          const questFloat = Math.sin(time * 3) * 4;
          ctx.fillStyle = '#ffd93d';
          ctx.shadowColor = '#ffd93d';
          ctx.shadowBlur = 10;
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('!', nx, ny + bobY - 50 + questFloat);
          ctx.shadowBlur = 0;
          
          // Name
          ctx.font = 'bold 11px Arial';
          ctx.fillStyle = '#ffd93d';
          ctx.textAlign = 'center';
          ctx.fillText('Quest Master', nx, ny + 30);
          ctx.font = '10px Arial';
          ctx.fillStyle = '#c084fc';
          ctx.fillText('Seraphina', nx, ny + 42);
          
          // Interaction hint
          if (nearbyNpc?.id === npc.id) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#ffd93d';
            ctx.fillText('[E] Accept Quest', nx, ny + 55);
          }
        } else if (npc.type === 'shapeshifter') {
          // Shapeshifter - Mirage - morphing entity with prismatic glow
          const bobY = Math.sin(time * 2.5) * 6;
          const morphPhase = (time * 0.5) % (Math.PI * 2);
          const pulseAlpha = 0.6 + Math.sin(time * 3) * 0.2;
          
          // Outer prismatic glow
          const prismGlow = ctx.createRadialGradient(nx, ny + bobY, 0, nx, ny + bobY, 50);
          prismGlow.addColorStop(0, `rgba(236, 72, 153, ${pulseAlpha * 0.4})`);
          prismGlow.addColorStop(0.3, `rgba(168, 85, 247, ${pulseAlpha * 0.3})`);
          prismGlow.addColorStop(0.6, `rgba(6, 182, 212, ${pulseAlpha * 0.2})`);
          prismGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = prismGlow;
          ctx.beginPath();
          ctx.arc(nx, ny + bobY, 50, 0, Math.PI * 2);
          ctx.fill();
          
          // Morphing body - blob-like shape that shifts
          ctx.fillStyle = npc.color || '#ec4899';
          ctx.beginPath();
          const points = 8;
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const morphOffset = Math.sin(morphPhase + angle * 2) * 5;
            const r = 18 + morphOffset;
            const px = nx + Math.cos(angle) * r;
            const py = ny + bobY - 5 + Math.sin(angle) * r * 0.8;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.fill();
          
          // Inner glow
          const innerGlow = ctx.createRadialGradient(nx, ny + bobY - 5, 0, nx, ny + bobY - 5, 15);
          innerGlow.addColorStop(0, 'rgba(255,255,255,0.8)');
          innerGlow.addColorStop(0.5, `${npc.color || '#ec4899'}80`);
          innerGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = innerGlow;
          ctx.beginPath();
          ctx.arc(nx, ny + bobY - 5, 15, 0, Math.PI * 2);
          ctx.fill();
          
          // Eyes that shift position
          const eyeOffset = Math.sin(time * 2) * 2;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(nx - 5 + eyeOffset, ny + bobY - 8, 4, 0, Math.PI * 2);
          ctx.arc(nx + 5 + eyeOffset, ny + bobY - 8, 4, 0, Math.PI * 2);
          ctx.fill();
          // Pupils
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(nx - 5 + eyeOffset, ny + bobY - 8, 2, 0, Math.PI * 2);
          ctx.arc(nx + 5 + eyeOffset, ny + bobY - 8, 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Floating particles around (prismatic)
          const particleColors = ['#ec4899', '#a855f7', '#06b6d4', '#fbbf24', '#22c55e'];
          for (let i = 0; i < 8; i++) {
            const angle = (time + i * Math.PI / 4) * 0.8;
            const dist = 28 + Math.sin(time * 2 + i) * 6;
            const particleX = nx + Math.cos(angle) * dist;
            const particleY = ny + bobY + Math.sin(angle) * dist * 0.5;
            ctx.beginPath();
            ctx.arc(particleX, particleY, 2 + Math.sin(time * 3 + i) * 1, 0, Math.PI * 2);
            ctx.fillStyle = particleColors[i % particleColors.length] + 'aa';
            ctx.fill();
          }
          
          // Emoji indicator (current form)
          if (npc.emoji) {
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(npc.emoji, nx, ny + bobY - 28);
          }
          
          // Name
          ctx.font = 'bold 11px Arial';
          ctx.fillStyle = '#ec4899';
          ctx.textAlign = 'center';
          ctx.fillText(npc.name || 'Mirage', nx, ny + 30);
          
          // Interaction hint
          if (nearbyNpc?.id === npc.id) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#ffd93d';
            ctx.fillText('[E] Change Skin', nx, ny + 43);
          }
        } else if (npc.type === 'dungeon_architect') {
          // Dungeon Architect - Arcanus the Dreamweaver
          const bobY = Math.sin(time * 2) * 4;
          const npcColor = npc.color || '#8b5cf6';
          
          // Arcane aura
          const auraGlow = ctx.createRadialGradient(nx, ny + bobY, 0, nx, ny + bobY, 45);
          auraGlow.addColorStop(0, `${npcColor}30`);
          auraGlow.addColorStop(0.6, `${npcColor}15`);
          auraGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = auraGlow;
          ctx.beginPath();
          ctx.arc(nx, ny + bobY, 45, 0, Math.PI * 2);
          ctx.fill();
          
          // Shadow
          ctx.beginPath();
          ctx.ellipse(nx, ny + 14, 18, 8, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(139,92,246,0.3)';
          ctx.fill();
          
          // Body/Robe
          ctx.fillStyle = '#2e1065';
          ctx.beginPath();
          ctx.moveTo(nx, ny - 14 + bobY);
          ctx.lineTo(nx - 15, ny + 14);
          ctx.lineTo(nx + 15, ny + 14);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = npcColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          
          // Rune pattern on robe
          ctx.strokeStyle = `${npcColor}80`;
          ctx.lineWidth = 0.8;
          const runeY = ny + 2 + bobY;
          ctx.beginPath();
          ctx.moveTo(nx - 5, runeY); ctx.lineTo(nx + 5, runeY);
          ctx.moveTo(nx - 3, runeY + 4); ctx.lineTo(nx + 3, runeY + 4);
          ctx.moveTo(nx, runeY - 2); ctx.lineTo(nx, runeY + 6);
          ctx.stroke();
          
          // Head
          ctx.beginPath();
          ctx.arc(nx, ny - 18 + bobY, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#ddd6fe';
          ctx.fill();
          
          // Wizard hat with blueprint/star motif
          ctx.fillStyle = '#2e1065';
          ctx.beginPath();
          ctx.moveTo(nx, ny - 44 + bobY);
          ctx.lineTo(nx - 16, ny - 16 + bobY);
          ctx.lineTo(nx + 16, ny - 16 + bobY);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = npcColor;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Star on hat
          ctx.font = '8px Arial';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fbbf24';
          ctx.fillText('★', nx, ny - 26 + bobY);
          
          // Floating blueprint/scroll in hand
          const scrollBob = Math.sin(time * 3) * 2;
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(nx + 14, ny - 8 + bobY + scrollBob, 10, 14);
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(nx + 14, ny - 8 + bobY + scrollBob, 10, 14);
          // Grid lines on scroll
          ctx.strokeStyle = '#8b5cf680';
          ctx.beginPath();
          ctx.moveTo(nx + 16, ny - 4 + bobY + scrollBob);
          ctx.lineTo(nx + 22, ny - 4 + bobY + scrollBob);
          ctx.moveTo(nx + 16, ny - 1 + bobY + scrollBob);
          ctx.lineTo(nx + 22, ny - 1 + bobY + scrollBob);
          ctx.moveTo(nx + 16, ny + 2 + bobY + scrollBob);
          ctx.lineTo(nx + 22, ny + 2 + bobY + scrollBob);
          ctx.stroke();
          
          // Orbiting dimensional particles
          for (let i = 0; i < 5; i++) {
            const angle = time * 1.5 + (i * Math.PI * 2 / 5);
            const orbitR = 28 + Math.sin(time * 2 + i) * 4;
            const px = nx + Math.cos(angle) * orbitR;
            const py = ny + bobY - 5 + Math.sin(angle) * orbitR * 0.4;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#fbbf24', '#67e8f9'][i];
            ctx.fill();
          }
          
          // Name
          ctx.font = 'bold 11px Arial';
          ctx.fillStyle = npcColor;
          ctx.textAlign = 'center';
          ctx.fillText(npc.name || 'Arcanus', nx, ny + 30);
          
          // Interaction hint
          if (nearbyNpc?.id === npc.id) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#ffd93d';
            ctx.fillText('[E] Dungeon Workshop', nx, ny + 43);
          }
        }
      }
      } // End of if (!inDungeon) for buildings/campfire/NPCs

      // ========== PORTALS ========== (skip in dungeon)
      if (!inDungeonRef.current) {
        // Collect all portal render points: sanctuary portals + return portals
        const allPortalRenders = [];
        for (const [portalId, portal] of Object.entries(PORTAL_POSITIONS)) {
          // Sanctuary-side portal
          allPortalRenders.push({ ...portal, pos: portal.from, isReturn: false, portalId });
          // Destination-side return portal
          if (portal.returnFrom) {
            allPortalRenders.push({ ...portal, pos: portal.returnFrom, isReturn: true, portalId: portalId + '_return' });
          }
        }
        
        for (const pr of allPortalRenders) {
        const px = pr.pos.x - cx;
        const py = pr.pos.y - cy;
        
        // Skip if off screen
        if (px < -80 || px > width + 80 || py < -80 || py > height + 80) continue;
        
        const size = 45;
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 3) * 0.2 + 1;
        
        // Outer glow
        const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, size * 1.5 * pulse);
        glowGrad.addColorStop(0, pr.color + '60');
        glowGrad.addColorStop(0.6, pr.color + '20');
        glowGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(px, py, size * 1.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();
        
        // Portal ring
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.strokeStyle = pr.color;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Inner swirl
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(pr.isReturn ? -time * 2 : time * 2);
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
          ctx.strokeStyle = pr.color + '80';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
        
        // Center icon
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pr.isReturn ? '🏠' : pr.icon, px, py);
        
        // Portal name
        ctx.font = '11px Arial';
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'alphabetic';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3;
        ctx.fillText(pr.isReturn ? '← Back to Sanctuary' : pr.name, px, py - size - 8);
        ctx.shadowBlur = 0;
        
        // Level requirement (only for sanctuary-side portals)
        if (!pr.isReturn && pr.level > 0) {
          ctx.font = '10px Arial';
          ctx.fillStyle = me && me.level >= pr.level ? '#4ade80' : '#ef4444';
          ctx.fillText(`Lv ${pr.level}+`, px, py + size + 15);
        }
        
        // Show interaction prompt when player is nearby
        if (me) {
          const distToPortal = Math.sqrt(Math.pow(me.x - pr.pos.x, 2) + Math.pow(me.y - pr.pos.y, 2));
          if (distToPortal < 80) {
            if (pr.isReturn) {
              ctx.font = 'bold 12px Arial';
              ctx.fillStyle = '#4ade80';
              ctx.fillText('[E] Return to Sanctuary', px, py + size + 30);
            } else {
              const canUse = !pr.level || me.level >= pr.level;
              ctx.font = 'bold 12px Arial';
              ctx.fillStyle = canUse ? '#4ade80' : '#ef4444';
              ctx.fillText(canUse ? '[E] Enter' : `Need Lv ${pr.level}`, px, py + size + 30);
            }
          }
        }
      }
      } // End of if (!inDungeon) for PORTALS

      // Enemies (render in both world and dungeon)
      for (const enemy of enemies || []) {
        const sx = enemy.x - cx;
        const sy = enemy.y - cy;
        const cullDist = enemy.isBoss ? 300 : 60;
        if (sx < -cullDist || sx > width + cullDist || sy < -cullDist || sy > height + cullDist) continue;

        const isBoss = enemy.isBoss;
        const bounce = enemy.isFrozen ? 0 : Math.sin((enemy.animFrame || 0) * Math.PI / 2) * 0.8;
        const color = COLORS.enemy[enemy.type] || '#ff0000';
        const size = isBoss ? 6 : 1;

        // Shadow
        ctx.beginPath();
        ctx.ellipse(sx, sy + 8, 12 * size, 6 * size, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        // ========== BOSS UNIQUE DESIGNS ==========
        if (isBoss) {
          const bossType = enemy.type;
          const time = Date.now() / 1000;
          
          // Scale boss rendering from center (dragon already has internal 4x scale)
          const bossScale = (bossType === 'boss_dragon') ? 1 : (bossType === 'custom_boss') ? 1 : 3;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.scale(bossScale, bossScale);
          ctx.translate(-sx, -sy);
          
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
          else if (bossType === 'boss_dragon') {
            // ========== MASSIVE INFERNAL DRAGON BOSS (4x size) ==========
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
            ctx.beginPath();
            ctx.moveTo(sx - 45 * scale, sy + 10 * scale - bodyBob);
            ctx.quadraticCurveTo(sx - 55 * scale, sy + 40 * scale - bodyBob, sx - 50 * scale, sy + 70 * scale - bodyBob);
            ctx.lineTo(sx - 35 * scale, sy + 70 * scale - bodyBob);
            ctx.quadraticCurveTo(sx - 35 * scale, sy + 40 * scale - bodyBob, sx - 30 * scale, sy + 10 * scale - bodyBob);
            ctx.closePath();
            ctx.fill();
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
            ctx.beginPath();
            ctx.moveTo(headX - 15 * scale, headY - 20 * scale);
            ctx.quadraticCurveTo(headX - 30 * scale, headY - 50 * scale, headX - 25 * scale, headY - 70 * scale);
            ctx.lineTo(headX - 15 * scale, headY - 65 * scale);
            ctx.quadraticCurveTo(headX - 20 * scale, headY - 45 * scale, headX - 5 * scale, headY - 18 * scale);
            ctx.closePath();
            ctx.fill();
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
            ctx.fillStyle = '#000';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.ellipse(headX + 22 * scale, headY - 8 * scale, 3 * scale, 6 * scale, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(headX - 3 * scale, headY - 5 * scale, 3 * scale, 6 * scale, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Fire breath from nostrils
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.ellipse(headX + 55 * scale, headY + 2 * scale, 4 * scale, 3 * scale, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(headX + 55 * scale, headY + 12 * scale, 4 * scale, 3 * scale, 0.2, 0, Math.PI * 2);
            ctx.fill();
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
            
            // Restore scale before drawing dragon health bar
            ctx.restore();
            
            // === DRAGON HEALTH BAR (custom, larger) ===
            const dhbW = 200;
            const dhbY = sy - 200 * scale - bodyBob;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(sx - dhbW / 2 - 4, dhbY - 4, dhbW + 8, 24);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(sx - dhbW / 2, dhbY, dhbW, 16);
            
            const healthPct = enemy.health / enemy.maxHealth;
            const hpGrad = ctx.createLinearGradient(sx - dhbW / 2, dhbY, sx - dhbW / 2 + dhbW * healthPct, dhbY);
            hpGrad.addColorStop(0, '#dc2626');
            hpGrad.addColorStop(0.5, '#f97316');
            hpGrad.addColorStop(1, '#fbbf24');
            ctx.fillStyle = hpGrad;
            ctx.fillRect(sx - dhbW / 2, dhbY, dhbW * healthPct, 16);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.ceil(enemy.health)} / ${enemy.maxHealth}`, sx, dhbY + 13);
            
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 18px Arial';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 10;
            ctx.fillText('🐉 INFERNAL DRAGON 🐉', sx, dhbY - 15);
            ctx.shadowBlur = 0;
            
            const phase = enemy.health < enemy.maxHealth * 0.25 ? 3 : 
                          enemy.health < enemy.maxHealth * 0.5 ? 2 : 1;
            if (phase > 1) {
              ctx.fillStyle = phase === 3 ? '#dc2626' : '#f97316';
              ctx.font = 'bold 14px Arial';
              ctx.fillText(`⚠️ PHASE ${phase} ${phase === 3 ? '- ENRAGED!' : ''} ⚠️`, sx, dhbY - 35);
            }
            
            // Skip default health bar for dragon (we drew our own)
            continue;
          }
          else if (bossType === 'custom_boss') {
            // ========== CUSTOM DUNGEON BOSS - Themed creature ==========
            const bossColor = enemy.color || color;
            const bossRadius = Math.min(enemy.radius || 120, 250); // Cap visual size
            const sc = bossRadius / 50;
            const breathe = Math.sin(time * 1.8) * 3 * sc;
            const bodyBob = Math.sin(time * 2.2) * 2 * sc;
            
            // Aura glow
            const auraGrad = ctx.createRadialGradient(sx, sy - bodyBob, bossRadius * 0.3, sx, sy - bodyBob, bossRadius * 1.8);
            auraGrad.addColorStop(0, bossColor + '60');
            auraGrad.addColorStop(0.5, bossColor + '20');
            auraGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(sx, sy - bodyBob, bossRadius * 1.8, 0, Math.PI * 2);
            ctx.fill();
            
            // Orbiting rune particles
            for (let i = 0; i < 6; i++) {
              const oAngle = time * 1.5 + (i * Math.PI * 2 / 6);
              const oDist = bossRadius * 1.2 + Math.sin(time * 3 + i) * 8;
              const ox = sx + Math.cos(oAngle) * oDist;
              const oy = sy - bodyBob + Math.sin(oAngle) * oDist * 0.4;
              ctx.beginPath();
              ctx.arc(ox, oy, 3 * sc, 0, Math.PI * 2);
              ctx.fillStyle = bossColor + 'aa';
              ctx.fill();
            }
            
            // Shadow
            ctx.beginPath();
            ctx.ellipse(sx, sy + 30 * sc, 40 * sc, 12 * sc, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();

            // Wings (behind body)
            for (let wing = -1; wing <= 1; wing += 2) {
              ctx.save();
              ctx.translate(sx + wing * 30 * sc, sy - 15 * sc - bodyBob);
              ctx.rotate(wing * (0.4 + Math.sin(time * 2.5) * 0.2));
              ctx.fillStyle = bossColor + '66';
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.quadraticCurveTo(wing * 40 * sc, -50 * sc, wing * 70 * sc, -20 * sc);
              ctx.quadraticCurveTo(wing * 50 * sc, 10 * sc, 0, 5 * sc);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = bossColor + '88';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              ctx.restore();
            }
            
            // Body
            const bodyGrad = ctx.createRadialGradient(sx, sy - bodyBob, 0, sx, sy - bodyBob, 40 * sc);
            bodyGrad.addColorStop(0, bossColor);
            bodyGrad.addColorStop(0.7, bossColor + 'cc');
            bodyGrad.addColorStop(1, bossColor + '88');
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.ellipse(sx, sy - bodyBob + breathe, 38 * sc, 32 * sc, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2 * sc;
            ctx.stroke();
            
            // Belly lighter area
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + 8 * sc - bodyBob + breathe, 22 * sc, 16 * sc, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Horns/Crown
            for (let h = -1; h <= 1; h += 2) {
              ctx.fillStyle = bossColor + 'dd';
              ctx.beginPath();
              ctx.moveTo(sx + h * 14 * sc, sy - 28 * sc - bodyBob);
              ctx.lineTo(sx + h * 22 * sc, sy - 55 * sc - bodyBob + Math.sin(time * 4 + h) * 3);
              ctx.lineTo(sx + h * 8 * sc, sy - 32 * sc - bodyBob);
              ctx.closePath();
              ctx.fill();
            }
            // Center horn
            ctx.fillStyle = bossColor;
            ctx.beginPath();
            ctx.moveTo(sx - 5 * sc, sy - 30 * sc - bodyBob);
            ctx.lineTo(sx, sy - 60 * sc - bodyBob + Math.sin(time * 3) * 2);
            ctx.lineTo(sx + 5 * sc, sy - 30 * sc - bodyBob);
            ctx.closePath();
            ctx.fill();
            
            // Eyes - menacing
            const eyeGlow = 0.6 + Math.sin(time * 4) * 0.4;
            for (let e = -1; e <= 1; e += 2) {
              // Eye socket
              ctx.fillStyle = 'rgba(0,0,0,0.6)';
              ctx.beginPath();
              ctx.ellipse(sx + e * 12 * sc, sy - 12 * sc - bodyBob, 8 * sc, 7 * sc, 0, 0, Math.PI * 2);
              ctx.fill();
              // Glowing eye
              ctx.fillStyle = `rgba(255,255,255,${eyeGlow})`;
              ctx.beginPath();
              ctx.ellipse(sx + e * 12 * sc, sy - 12 * sc - bodyBob, 5 * sc, 4 * sc, 0, 0, Math.PI * 2);
              ctx.fill();
              // Pupil slit
              ctx.fillStyle = bossColor;
              ctx.beginPath();
              ctx.ellipse(sx + e * 12 * sc, sy - 12 * sc - bodyBob, 2 * sc, 5 * sc, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            
            // Mouth - jagged grin
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1.5 * sc;
            ctx.beginPath();
            ctx.moveTo(sx - 15 * sc, sy + 2 * sc - bodyBob);
            for (let t = 0; t < 6; t++) {
              const tx = sx - 15 * sc + t * 6 * sc;
              ctx.lineTo(tx + 3 * sc, sy + (t % 2 === 0 ? 6 : -1) * sc - bodyBob);
            }
            ctx.stroke();
            
            // Phase indicator particles
            const phase = enemy.phase || 1;
            if (phase >= 2) {
              for (let i = 0; i < 4 * phase; i++) {
                const pAngle = time * 2 + i * 0.7;
                const pDist = bossRadius * 0.8 + Math.sin(time * 5 + i * 2) * 15;
                ctx.beginPath();
                ctx.arc(
                  sx + Math.cos(pAngle) * pDist,
                  sy - bodyBob + Math.sin(pAngle) * pDist * 0.5,
                  2 * sc, 0, Math.PI * 2
                );
                ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(time * 8 + i) * 0.2})`;
                ctx.fill();
              }
            }
            
            // Restore scale before custom boss health bar
            ctx.restore();
            // Re-save so the generic restore below doesn't error
            ctx.save();
            
            // Custom boss health bar (larger than default)
            const cbhW = 80;
            const cbhY = sy - 75 * sc;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(sx - cbhW / 2 - 2, cbhY - 2, cbhW + 4, 12);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(sx - cbhW / 2, cbhY, cbhW, 8);
            const hpRatio = enemy.health / enemy.maxHealth;
            const hpColor = hpRatio > 0.5 ? bossColor : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
            ctx.fillStyle = hpColor;
            ctx.fillRect(sx - cbhW / 2, cbhY, cbhW * hpRatio, 8);
            
            // Boss name
            ctx.fillStyle = bossColor;
            ctx.font = `bold ${12 * sc}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(enemy.name || 'BOSS', sx, cbhY - 6);
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
          
          // Restore canvas scale before drawing health bars
          ctx.restore();
          
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
          const r = 14; // Base radius for regular enemies
          
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
          else if (enemyType === 'fireElemental' || enemyType === 'elemental') {
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
          // ========== MEADOW CREATURES ==========
          else if (enemyType === 'bee') {
            // Buzzing bee with translucent wings
            const buzzX = Math.sin(time * 20) * 2;
            const buzzY = Math.cos(time * 25) * 1.5;
            const wingFlap = Math.sin(time * 30) * 0.5;
            // Wings
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#e0f2fe';
            ctx.save(); ctx.translate(sx - 4 + buzzX, sy - 6 - bounce + buzzY); ctx.rotate(-0.3 + wingFlap);
            ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            ctx.save(); ctx.translate(sx + 4 + buzzX, sy - 6 - bounce + buzzY); ctx.rotate(0.3 - wingFlap);
            ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            ctx.globalAlpha = 1;
            // Body - striped
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.ellipse(sx + buzzX, sy - bounce + buzzY, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(sx - 6 + buzzX, sy - 3 - bounce + buzzY, 12, 2);
            ctx.fillRect(sx - 6 + buzzX, sy + 1 - bounce + buzzY, 12, 2);
            // Eyes
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(sx - 2 + buzzX, sy - 5 - bounce + buzzY, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 2 + buzzX, sy - 5 - bounce + buzzY, 1.5, 0, Math.PI * 2); ctx.fill();
            // Stinger
            ctx.fillStyle = '#1c1917';
            ctx.beginPath(); ctx.moveTo(sx + buzzX, sy + 8 - bounce + buzzY); ctx.lineTo(sx - 1 + buzzX, sy + 12 - bounce + buzzY); ctx.lineTo(sx + 1 + buzzX, sy + 12 - bounce + buzzY); ctx.fill();
          }
          else if (enemyType === 'flower_sprite') {
            // Tiny fairy-like sprite with petal wings
            const float = Math.sin(time * 3) * 4;
            const sparkle = 0.6 + Math.sin(time * 6) * 0.3;
            // Glow aura
            ctx.beginPath(); ctx.arc(sx, sy - bounce + float, 14, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(244,114,182,${sparkle * 0.2})`; ctx.fill();
            // Petal wings
            const petalColors = ['#f9a8d4', '#fbcfe8', '#f472b6'];
            for (let i = 0; i < 5; i++) {
              const angle = (i / 5) * Math.PI * 2 + time * 0.5;
              ctx.fillStyle = petalColors[i % 3];
              ctx.beginPath();
              ctx.ellipse(sx + Math.cos(angle) * 8, sy - 2 - bounce + float + Math.sin(angle) * 6, 5, 3, angle, 0, Math.PI * 2);
              ctx.fill();
            }
            // Body
            ctx.fillStyle = '#fdf2f8';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + float, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
            // Face
            ctx.fillStyle = '#831843';
            ctx.beginPath(); ctx.arc(sx - 1, sy - 2 - bounce + float, 1, 0, Math.PI * 2); ctx.arc(sx + 1, sy - 2 - bounce + float, 1, 0, Math.PI * 2); ctx.fill();
            // Sparkle particles
            ctx.fillStyle = `rgba(255,255,255,${sparkle})`;
            for (let i = 0; i < 3; i++) {
              const px = sx + Math.sin(time * 4 + i * 2.1) * 12;
              const py = sy - bounce + float + Math.cos(time * 3 + i * 1.7) * 10;
              ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
            }
          }
          else if (enemyType === 'mushroom') {
            // Toxic walking mushroom
            const waddle = Math.sin(time * 6) * 3;
            // Legs (little stumps)
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(sx - 5 + waddle, sy + 5 - bounce, 3, 6);
            ctx.fillRect(sx + 2 - waddle, sy + 5 - bounce, 3, 6);
            // Stem
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(sx - 4, sy - 4 - bounce, 8, 14);
            // Cap
            ctx.fillStyle = '#7c3aed';
            ctx.beginPath(); ctx.arc(sx, sy - 6 - bounce, 12, Math.PI, 0); ctx.fill();
            // Cap spots
            ctx.fillStyle = '#e9d5ff';
            ctx.beginPath(); ctx.arc(sx - 5, sy - 10 - bounce, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 3, sy - 12 - bounce, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 6, sy - 8 - bounce, 1.5, 0, Math.PI * 2); ctx.fill();
            // Angry eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(sx - 3, sy - 2 - bounce, 2.5, 0, Math.PI * 2); ctx.arc(sx + 3, sy - 2 - bounce, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(sx - 3, sy - 2 - bounce, 1.2, 0, Math.PI * 2); ctx.arc(sx + 3, sy - 2 - bounce, 1.2, 0, Math.PI * 2); ctx.fill();
            // Toxic spore particles
            ctx.fillStyle = 'rgba(192,132,252,0.4)';
            for (let i = 0; i < 3; i++) {
              const px = sx + Math.sin(time * 2 + i * 2) * 10;
              const py = sy - 14 - bounce + Math.cos(time * 1.5 + i) * 5 - i * 4;
              ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
            }
          }
          // ========== FOREST CREATURES ==========
          else if (enemyType === 'wolf') {
            // Prowling dire wolf
            const prowl = Math.sin(time * 8) * 2;
            // Body
            ctx.fillStyle = '#4b5563';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 2, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#6b7280';
            ctx.beginPath(); ctx.ellipse(sx + 12, sy - 4 - bounce, 8, 7, 0.2, 0, Math.PI * 2); ctx.fill();
            // Ears
            ctx.fillStyle = '#374151';
            ctx.beginPath(); ctx.moveTo(sx + 14, sy - 12 - bounce); ctx.lineTo(sx + 10, sy - 6 - bounce); ctx.lineTo(sx + 16, sy - 6 - bounce); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + 18, sy - 11 - bounce); ctx.lineTo(sx + 14, sy - 6 - bounce); ctx.lineTo(sx + 20, sy - 5 - bounce); ctx.fill();
            // Eyes - glowing
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(sx + 14, sy - 4 - bounce, 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Legs
            ctx.fillStyle = '#374151';
            ctx.fillRect(sx - 8, sy + 6 - bounce, 3, 8 + prowl);
            ctx.fillRect(sx - 2, sy + 6 - bounce, 3, 8 - prowl);
            ctx.fillRect(sx + 5, sy + 6 - bounce, 3, 8 + prowl);
            ctx.fillRect(sx + 10, sy + 5 - bounce, 3, 7 - prowl);
            // Tail
            ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sx - 14, sy - bounce); ctx.quadraticCurveTo(sx - 20, sy - 8 - bounce, sx - 18, sy - 14 - bounce); ctx.stroke();
          }
          else if (enemyType === 'treant') {
            // Slow moving tree creature
            const sway = Math.sin(time * 1.5) * 3;
            // Trunk body
            ctx.fillStyle = '#5c4033';
            ctx.fillRect(sx - 10, sy - 10 - bounce, 20, 28);
            // Bark texture
            ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sx - 6, sy - 8 - bounce); ctx.lineTo(sx - 4, sy + 14 - bounce); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 4, sy - 6 - bounce); ctx.lineTo(sx + 6, sy + 10 - bounce); ctx.stroke();
            // Branch arms
            ctx.strokeStyle = '#5c4033'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(sx - 10, sy - 4 - bounce); ctx.lineTo(sx - 20 + sway, sy - 14 - bounce); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 10, sy - 4 - bounce); ctx.lineTo(sx + 20 - sway, sy - 14 - bounce); ctx.stroke();
            // Leaf crown
            ctx.fillStyle = '#16a34a';
            ctx.beginPath(); ctx.arc(sx + sway, sy - 18 - bounce, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#22c55e';
            ctx.beginPath(); ctx.arc(sx - 6 + sway, sy - 22 - bounce, 8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 8 + sway, sy - 20 - bounce, 9, 0, Math.PI * 2); ctx.fill();
            // Glowing eyes in trunk
            ctx.fillStyle = '#86efac'; ctx.shadowColor = '#86efac'; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.arc(sx - 4, sy - 4 - bounce, 2.5, 0, Math.PI * 2); ctx.arc(sx + 4, sy - 4 - bounce, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Root feet
            ctx.fillStyle = '#5c4033';
            for (let i = -2; i <= 2; i++) {
              ctx.beginPath(); ctx.moveTo(sx + i * 5, sy + 18 - bounce); ctx.lineTo(sx + i * 5 - 3, sy + 22 - bounce); ctx.lineTo(sx + i * 5 + 3, sy + 22 - bounce); ctx.fill();
            }
          }
          else if (enemyType === 'forest_wisp') {
            // Glowing ethereal forest spirit
            const float = Math.sin(time * 2.5) * 5;
            const pulse = 0.5 + Math.sin(time * 4) * 0.3;
            // Outer glow
            ctx.beginPath(); ctx.arc(sx, sy - bounce + float, 16, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(134,239,172,${pulse * 0.15})`; ctx.fill();
            ctx.beginPath(); ctx.arc(sx, sy - bounce + float, 10, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(134,239,172,${pulse * 0.3})`; ctx.fill();
            // Core
            ctx.fillStyle = '#86efac'; ctx.shadowColor = '#86efac'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(sx, sy - bounce + float, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#dcfce7';
            ctx.beginPath(); ctx.arc(sx, sy - bounce + float, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Trailing particles
            for (let i = 0; i < 4; i++) {
              const trail = (time * 2 + i * 1.5) % 6;
              const tx = sx + Math.sin(time + i * 1.3) * 8;
              const ty = sy - bounce + float + trail * 4;
              ctx.fillStyle = `rgba(134,239,172,${0.6 - trail * 0.1})`;
              ctx.beginPath(); ctx.arc(tx, ty, 2 - trail * 0.2, 0, Math.PI * 2); ctx.fill();
            }
          }
          // ========== VOLCANIC CREATURES ==========
          else if (enemyType === 'fire_imp') {
            // Small mischievous fire demon
            const hop = Math.abs(Math.sin(time * 8)) * 4;
            // Body
            ctx.fillStyle = '#dc2626';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce - hop, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
            // Belly
            ctx.fillStyle = '#ff6b35';
            ctx.beginPath(); ctx.ellipse(sx, sy + 2 - bounce - hop, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
            // Horns
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath(); ctx.moveTo(sx - 4, sy - 10 - bounce - hop); ctx.lineTo(sx - 7, sy - 18 - bounce - hop); ctx.lineTo(sx - 2, sy - 10 - bounce - hop); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + 4, sy - 10 - bounce - hop); ctx.lineTo(sx + 7, sy - 18 - bounce - hop); ctx.lineTo(sx + 2, sy - 10 - bounce - hop); ctx.fill();
            // Grinning eyes
            ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(sx - 3, sy - 4 - bounce - hop, 2, 0, Math.PI * 2); ctx.arc(sx + 3, sy - 4 - bounce - hop, 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Flame tail
            for (let i = 0; i < 3; i++) {
              const fh = 6 + Math.sin(time * 12 + i) * 3;
              ctx.fillStyle = i === 0 ? '#fbbf24' : '#f97316';
              ctx.beginPath(); ctx.moveTo(sx - 2 + i * 2, sy + 8 - bounce - hop);
              ctx.quadraticCurveTo(sx - 4 + i * 2, sy + 8 + fh - bounce - hop, sx + i * 2, sy + 8 - bounce - hop); ctx.fill();
            }
          }
          else if (enemyType === 'magma_crawler') {
            // Slow armored lava creature
            // Molten shell
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath(); ctx.arc(sx, sy - 4 - bounce, 18, Math.PI, 0); ctx.lineTo(sx + 18, sy + 8 - bounce); ctx.lineTo(sx - 18, sy + 8 - bounce); ctx.fill();
            // Lava cracks on shell
            ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx - 10, sy - bounce); ctx.lineTo(sx - 3, sy - 10 - bounce); ctx.lineTo(sx + 5, sy - 2 - bounce); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 8, sy - 3 - bounce); ctx.lineTo(sx + 12, sy - 8 - bounce); ctx.stroke();
            // Lava glow underneath
            ctx.fillStyle = `rgba(249,115,22,${0.5 + Math.sin(time * 3) * 0.2})`;
            ctx.beginPath(); ctx.ellipse(sx, sy + 8 - bounce, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
            // Eyes peeking from front
            ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(sx - 6, sy + 2 - bounce, 2.5, 0, Math.PI * 2); ctx.arc(sx + 6, sy + 2 - bounce, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Legs
            ctx.fillStyle = '#991b1b';
            for (let i = -2; i <= 2; i++) {
              const legMove = Math.sin(time * 4 + i * 1.2) * 2;
              ctx.fillRect(sx + i * 7 - 1, sy + 8 - bounce, 3, 5 + legMove);
            }
          }
          else if (enemyType === 'ash_wraith') {
            // Ghostly fire spirit
            const drift = Math.sin(time * 2) * 5;
            const fade = 0.5 + Math.sin(time * 3.5) * 0.2;
            ctx.globalAlpha = fade;
            // Smoky body
            ctx.fillStyle = '#78716c';
            ctx.beginPath(); ctx.arc(sx, sy - 6 - bounce + drift, 10, Math.PI, 0);
            ctx.lineTo(sx + 10, sy + 10 - bounce + drift);
            ctx.quadraticCurveTo(sx + 6, sy + 6, sx + 2, sy + 12);
            ctx.quadraticCurveTo(sx - 2, sy + 6, sx - 6, sy + 12);
            ctx.quadraticCurveTo(sx - 10, sy + 6, sx - 10, sy + 10);
            ctx.fill();
            // Inner ember glow
            ctx.fillStyle = '#f97316';
            ctx.beginPath(); ctx.arc(sx, sy - 2 - bounce + drift, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(sx, sy - 2 - bounce + drift, 3, 0, Math.PI * 2); ctx.fill();
            // Ash particles
            for (let i = 0; i < 5; i++) {
              const ax = sx + Math.sin(time * 1.5 + i * 1.3) * 15;
              const ay = sy - bounce + drift - 10 - (time * 10 + i * 8) % 20;
              ctx.fillStyle = 'rgba(168,162,158,0.5)';
              ctx.beginPath(); ctx.arc(ax, ay, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
          // ========== FROZEN CREATURES ==========
          else if (enemyType === 'frost_wolf') {
            // Arctic wolf with icy coat
            const prowl = Math.sin(time * 8) * 2;
            // Body
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 2, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#f1f5f9';
            ctx.beginPath(); ctx.ellipse(sx + 12, sy - 4 - bounce, 8, 7, 0.2, 0, Math.PI * 2); ctx.fill();
            // Ears
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath(); ctx.moveTo(sx + 14, sy - 12 - bounce); ctx.lineTo(sx + 10, sy - 6 - bounce); ctx.lineTo(sx + 16, sy - 6 - bounce); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + 18, sy - 11 - bounce); ctx.lineTo(sx + 14, sy - 6 - bounce); ctx.lineTo(sx + 20, sy - 5 - bounce); ctx.fill();
            // Ice eyes
            ctx.fillStyle = '#38bdf8'; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.arc(sx + 14, sy - 4 - bounce, 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Frost aura
            ctx.strokeStyle = 'rgba(56,189,248,0.3)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, 22, 16, 0, 0, Math.PI * 2); ctx.stroke();
            // Legs
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(sx - 8, sy + 6 - bounce, 3, 8 + prowl);
            ctx.fillRect(sx - 2, sy + 6 - bounce, 3, 8 - prowl);
            ctx.fillRect(sx + 5, sy + 6 - bounce, 3, 8 + prowl);
            ctx.fillRect(sx + 10, sy + 5 - bounce, 3, 7 - prowl);
          }
          else if (enemyType === 'yeti') {
            // Large tanky ice beast
            // Body
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(sx - 16, sy - 14 - bounce, 32, 32);
            // Fur detail
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(sx - 12, sy - 10 - bounce, 24, 24);
            // Chest
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.arc(sx, sy - 20 - bounce, 12, 0, Math.PI * 2); ctx.fill();
            // Horns
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath(); ctx.moveTo(sx - 8, sy - 26 - bounce); ctx.lineTo(sx - 14, sy - 36 - bounce); ctx.lineTo(sx - 4, sy - 26 - bounce); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + 8, sy - 26 - bounce); ctx.lineTo(sx + 14, sy - 36 - bounce); ctx.lineTo(sx + 4, sy - 26 - bounce); ctx.fill();
            // Eyes
            ctx.fillStyle = '#0ea5e9'; ctx.shadowColor = '#0ea5e9'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(sx - 4, sy - 22 - bounce, 3, 0, Math.PI * 2); ctx.arc(sx + 4, sy - 22 - bounce, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Arms
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(sx - 22, sy - 10 - bounce, 8, 20);
            ctx.fillRect(sx + 14, sy - 10 - bounce, 8, 20);
          }
          else if (enemyType === 'ice_sprite') {
            // Tiny crystalline spirit
            const float = Math.sin(time * 3) * 4;
            const sparkle = 0.6 + Math.sin(time * 5) * 0.3;
            // Outer glow
            ctx.beginPath(); ctx.arc(sx, sy - bounce + float, 12, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(125,211,252,${sparkle * 0.2})`; ctx.fill();
            // Crystal body
            ctx.fillStyle = '#7dd3fc'; ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.moveTo(sx, sy - 10 - bounce + float); ctx.lineTo(sx + 6, sy - bounce + float);
            ctx.lineTo(sx + 3, sy + 8 - bounce + float); ctx.lineTo(sx - 3, sy + 8 - bounce + float);
            ctx.lineTo(sx - 6, sy - bounce + float); ctx.fill();
            ctx.shadowBlur = 0;
            // Inner light
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath(); ctx.moveTo(sx, sy - 6 - bounce + float); ctx.lineTo(sx + 3, sy - bounce + float);
            ctx.lineTo(sx, sy + 4 - bounce + float); ctx.lineTo(sx - 3, sy - bounce + float); ctx.fill();
            // Frost particles
            ctx.fillStyle = `rgba(224,242,254,${sparkle})`;
            for (let i = 0; i < 4; i++) {
              const fx = sx + Math.cos(time * 3 + i * 1.57) * 10;
              const fy = sy - bounce + float + Math.sin(time * 2 + i * 1.57) * 8;
              ctx.beginPath(); ctx.arc(fx, fy, 1.5, 0, Math.PI * 2); ctx.fill();
            }
          }
          // ========== ABYSS CREATURES ==========
          else if (enemyType === 'shadow_wraith') {
            // Ethereal dark spirit
            const drift = Math.sin(time * 2) * 5;
            const phase = 0.4 + Math.sin(time * 4) * 0.2;
            ctx.globalAlpha = phase;
            // Dark body
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath(); ctx.arc(sx, sy - 8 - bounce + drift, 12, Math.PI, 0);
            ctx.lineTo(sx + 14, sy + 12 - bounce + drift);
            ctx.quadraticCurveTo(sx + 8, sy + 6, sx + 3, sy + 14);
            ctx.quadraticCurveTo(sx, sy + 8, sx - 3, sy + 14);
            ctx.quadraticCurveTo(sx - 8, sy + 6, sx - 14, sy + 12);
            ctx.fill();
            ctx.globalAlpha = 1;
            // Eyes - burning purple
            ctx.fillStyle = '#a855f7'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.ellipse(sx - 4, sy - 6 - bounce + drift, 3, 2, 0, 0, Math.PI * 2);
            ctx.ellipse(sx + 4, sy - 6 - bounce + drift, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Void particles
            for (let i = 0; i < 4; i++) {
              const px = sx + Math.sin(time * 2 + i * 1.5) * 16;
              const py = sy - bounce + drift + Math.cos(time * 1.5 + i * 2) * 12;
              ctx.fillStyle = `rgba(88,28,135,${0.5 - i * 0.1})`;
              ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
            }
          }
          else if (enemyType === 'void_crawler') {
            // Massive dark entity with tentacles
            // Main body
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath(); ctx.ellipse(sx, sy - 4 - bounce, 20, 16, 0, 0, Math.PI * 2); ctx.fill();
            // Dark armor plates
            ctx.fillStyle = '#3b0764';
            ctx.beginPath(); ctx.arc(sx, sy - 8 - bounce, 14, Math.PI + 0.3, -0.3); ctx.fill();
            // Tentacles
            ctx.strokeStyle = '#581c87'; ctx.lineWidth = 3;
            for (let i = 0; i < 4; i++) {
              const angle = -0.8 + i * 0.5;
              const wave = Math.sin(time * 3 + i * 1.5) * 8;
              ctx.beginPath(); ctx.moveTo(sx + Math.cos(angle) * 14, sy + 8 - bounce);
              ctx.quadraticCurveTo(sx + Math.cos(angle) * 22, sy + 12 - bounce + wave, sx + Math.cos(angle) * 28, sy + 6 - bounce); ctx.stroke();
            }
            // Eyes
            ctx.fillStyle = '#c084fc'; ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(sx - 6, sy - 8 - bounce, 3, 0, Math.PI * 2); ctx.arc(sx + 6, sy - 8 - bounce, 3, 0, Math.PI * 2); ctx.fill();
            // Third eye
            ctx.beginPath(); ctx.arc(sx, sy - 14 - bounce, 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          else if (enemyType === 'dark_knight') {
            // Armored void warrior
            // Body armor
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath(); ctx.moveTo(sx - 10, sy - 6 - bounce); ctx.lineTo(sx + 10, sy - 6 - bounce);
            ctx.lineTo(sx + 12, sy + 12 - bounce); ctx.lineTo(sx - 12, sy + 12 - bounce); ctx.fill();
            // Helmet
            ctx.fillStyle = '#312e81';
            ctx.beginPath(); ctx.arc(sx, sy - 12 - bounce, 10, 0, Math.PI * 2); ctx.fill();
            // Visor
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(sx - 7, sy - 12 - bounce, 14, 4);
            // Glowing visor slit
            ctx.fillStyle = '#a855f7'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 4;
            ctx.fillRect(sx - 6, sy - 11 - bounce, 12, 2);
            ctx.shadowBlur = 0;
            // Sword
            ctx.fillStyle = '#c4b5fd';
            ctx.fillRect(sx + 12, sy - 20 - bounce, 3, 28);
            ctx.fillStyle = '#6d28d9';
            ctx.fillRect(sx + 10, sy - 4 - bounce, 7, 4);
            // Shield
            ctx.fillStyle = '#312e81';
            ctx.beginPath(); ctx.moveTo(sx - 14, sy - 8 - bounce); ctx.lineTo(sx - 20, sy - bounce);
            ctx.lineTo(sx - 14, sy + 8 - bounce); ctx.lineTo(sx - 8, sy - bounce); ctx.fill();
            ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx - 14, sy - 8 - bounce); ctx.lineTo(sx - 20, sy - bounce);
            ctx.lineTo(sx - 14, sy + 8 - bounce); ctx.lineTo(sx - 8, sy - bounce); ctx.closePath(); ctx.stroke();
          }
          // ========== CRYSTAL CAVE CREATURES ==========
          else if (enemyType === 'crystal_bat') {
            // Crystalline bat with gem wings
            const wingFlap = Math.sin(time * 15) * 0.5;
            // Wings - crystalline
            ctx.fillStyle = '#f0abfc';
            ctx.save(); ctx.translate(sx - 8, sy - bounce); ctx.rotate(-0.3 + wingFlap);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -4); ctx.lineTo(-10, 4); ctx.lineTo(-4, 6); ctx.fill(); ctx.restore();
            ctx.save(); ctx.translate(sx + 8, sy - bounce); ctx.rotate(0.3 - wingFlap);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -4); ctx.lineTo(10, 4); ctx.lineTo(4, 6); ctx.fill(); ctx.restore();
            // Body
            ctx.fillStyle = '#a21caf';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
            // Crystal glow
            ctx.fillStyle = 'rgba(240,171,252,0.3)';
            ctx.beginPath(); ctx.arc(sx, sy - bounce, 12, 0, Math.PI * 2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#fdf4ff';
            ctx.beginPath(); ctx.arc(sx - 2, sy - 3 - bounce, 1.5, 0, Math.PI * 2); ctx.arc(sx + 2, sy - 3 - bounce, 1.5, 0, Math.PI * 2); ctx.fill();
          }
          else if (enemyType === 'gem_beetle') {
            // Armored beetle with gem shell
            const legMove = Math.sin(time * 6);
            // Shell
            ctx.fillStyle = '#86198f';
            ctx.beginPath(); ctx.arc(sx, sy - 4 - bounce, 14, Math.PI, 0); ctx.lineTo(sx + 14, sy + 6 - bounce); ctx.lineTo(sx - 14, sy + 6 - bounce); ctx.fill();
            // Gem inlay
            ctx.fillStyle = '#e879f9';
            ctx.beginPath(); ctx.moveTo(sx, sy - 16 - bounce); ctx.lineTo(sx + 6, sy - 6 - bounce); ctx.lineTo(sx, sy - 2 - bounce); ctx.lineTo(sx - 6, sy - 6 - bounce); ctx.fill();
            // Shell line
            ctx.strokeStyle = '#701a75'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sx, sy - 16 - bounce); ctx.lineTo(sx, sy + 4 - bounce); ctx.stroke();
            // Head
            ctx.fillStyle = '#581c87';
            ctx.beginPath(); ctx.arc(sx, sy + 8 - bounce, 6, 0, Math.PI * 2); ctx.fill();
            // Mandibles
            ctx.strokeStyle = '#a21caf'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx - 3, sy + 12 - bounce); ctx.lineTo(sx - 6, sy + 16 - bounce); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 3, sy + 12 - bounce); ctx.lineTo(sx + 6, sy + 16 - bounce); ctx.stroke();
            // Legs
            ctx.strokeStyle = '#581c87'; ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
              const ly = sy - 2 + i * 4 - bounce;
              ctx.beginPath(); ctx.moveTo(sx - 12, ly); ctx.lineTo(sx - 18, ly + 4 + legMove * (i % 2 ? 2 : -2)); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(sx + 12, ly); ctx.lineTo(sx + 18, ly + 4 - legMove * (i % 2 ? 2 : -2)); ctx.stroke();
            }
          }
          else if (enemyType === 'prism_wisp') {
            // Color-shifting ethereal crystal spirit
            const float = Math.sin(time * 2.5) * 5;
            const hue = (time * 60) % 360;
            const pulse = 0.6 + Math.sin(time * 4) * 0.3;
            // Rainbow glow
            ctx.beginPath(); ctx.arc(sx, sy - bounce + float, 14, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${pulse * 0.2})`; ctx.fill();
            // Core
            ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.8)`; ctx.shadowColor = `hsla(${hue}, 80%, 70%, 1)`; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.moveTo(sx, sy - 8 - bounce + float); ctx.lineTo(sx + 5, sy - bounce + float);
            ctx.lineTo(sx, sy + 6 - bounce + float); ctx.lineTo(sx - 5, sy - bounce + float); ctx.fill();
            ctx.shadowBlur = 0;
            // Inner light
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(sx, sy - 1 - bounce + float, 2, 0, Math.PI * 2); ctx.fill();
            // Orbiting prism shards
            for (let i = 0; i < 3; i++) {
              const angle = time * 3 + i * 2.09;
              const ox = sx + Math.cos(angle) * 10;
              const oy = sy - bounce + float + Math.sin(angle) * 8;
              ctx.fillStyle = `hsla(${(hue + i * 120) % 360}, 80%, 70%, 0.7)`;
              ctx.beginPath(); ctx.arc(ox, oy, 2, 0, Math.PI * 2); ctx.fill();
            }
          }
          // ========== ADDITIONAL CREATURES ==========
          else if (enemyType === 'giant_spider') {
            // Large hairy spider with 8 legs
            const legSpread = r * 1.8;
            // Legs (8)
            ctx.strokeStyle = '#5c3a0e';
            ctx.lineWidth = 2.5;
            for (let i = 0; i < 8; i++) {
              const side = i < 4 ? -1 : 1;
              const idx = i % 4;
              const baseAngle = (-0.5 + idx * 0.33) * side;
              const legX = sx + Math.cos(baseAngle + Math.PI/2) * r * 0.6 * side;
              const legY = sy - bounce + idx * 3 - 4;
              const tipX = sx + side * legSpread * (0.6 + idx * 0.15);
              const tipY = sy - bounce + 6 + Math.sin(time * 8 + idx * 1.5) * 3;
              const midX = (legX + tipX) / 2 + side * 5;
              const midY = Math.min(legY, tipY) - 8;
              ctx.beginPath(); ctx.moveTo(legX, legY); ctx.quadraticCurveTo(midX, midY, tipX, tipY); ctx.stroke();
            }
            // Body (abdomen)
            ctx.fillStyle = '#713f12';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 4, r * 0.9, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
            // Markings
            ctx.fillStyle = '#451a03';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 6, r * 0.4, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#854d0e';
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.5, r * 0.45, 0, Math.PI * 2); ctx.fill();
            // Eyes (6)
            for (let i = 0; i < 6; i++) {
              const ex = sx - 4 + (i % 3) * 4;
              const ey = sy - bounce - r * 0.55 - 2 + Math.floor(i / 3) * 3;
              ctx.fillStyle = '#ef4444';
              ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            // Fangs
            ctx.fillStyle = '#fafafa';
            ctx.beginPath(); ctx.moveTo(sx - 3, sy - bounce - r * 0.3); ctx.lineTo(sx - 5, sy - bounce - r * 0.1); ctx.lineTo(sx - 1, sy - bounce - r * 0.3); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + 3, sy - bounce - r * 0.3); ctx.lineTo(sx + 5, sy - bounce - r * 0.1); ctx.lineTo(sx + 1, sy - bounce - r * 0.3); ctx.fill();
          }
          else if (enemyType === 'meadow_beetle') {
            // Round beetle with shell pattern
            // Legs
            ctx.strokeStyle = '#3f6212';
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
              const side = i < 3 ? -1 : 1;
              const idx = i % 3;
              const lx = sx + side * (r * 0.5 + 4);
              const ly = sy - bounce - 2 + idx * 5;
              const tx = sx + side * (r + 6 + Math.sin(time * 6 + idx) * 2);
              const ty = ly + 4;
              ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); ctx.stroke();
            }
            // Shell
            ctx.fillStyle = '#65a30d';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
            // Shell line
            ctx.strokeStyle = '#3f6212';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sx, sy - bounce - r * 0.7); ctx.lineTo(sx, sy - bounce + r * 0.7); ctx.stroke();
            // Shell spots
            ctx.fillStyle = '#4d7c0f';
            ctx.beginPath(); ctx.arc(sx - 5, sy - bounce - 3, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 5, sy - bounce + 2, 2.5, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#1a2e05';
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.7, r * 0.3, 0, Math.PI * 2); ctx.fill();
            // Antennae
            ctx.strokeStyle = '#1a2e05';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx - 3, sy - bounce - r * 0.9); ctx.lineTo(sx - 8, sy - bounce - r - 6); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 3, sy - bounce - r * 0.9); ctx.lineTo(sx + 8, sy - bounce - r - 6); ctx.stroke();
          }
          else if (enemyType === 'caterpillar') {
            // Segmented caterpillar body
            const segments = 6;
            for (let i = segments - 1; i >= 0; i--) {
              const wave = Math.sin(time * 4 + i * 0.8) * 3;
              const segX = sx - (segments/2 - i) * 7;
              const segY = sy - bounce + wave;
              const segR = r * (0.3 + (i === 0 ? 0.15 : i === segments - 1 ? 0.1 : 0));
              ctx.fillStyle = i % 2 === 0 ? '#a3e635' : '#84cc16';
              ctx.beginPath(); ctx.arc(segX, segY, r * 0.35 + segR, 0, Math.PI * 2); ctx.fill();
              // Tiny legs
              if (i > 0 && i < segments - 1) {
                ctx.fillStyle = '#65a30d';
                ctx.beginPath(); ctx.arc(segX - 4, segY + r * 0.3, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(segX + 4, segY + r * 0.3, 2, 0, Math.PI * 2); ctx.fill();
              }
            }
            // Head (first segment)
            const headX = sx + (segments/2) * 7;
            const headY = sy - bounce + Math.sin(time * 4) * 3;
            ctx.fillStyle = '#4d7c0f';
            ctx.beginPath(); ctx.arc(headX, headY, r * 0.4, 0, Math.PI * 2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(headX + 3, headY - 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(headX + 3, headY + 2, 2, 0, Math.PI * 2); ctx.fill();
            // Antennae
            ctx.strokeStyle = '#4d7c0f';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(headX + 5, headY - 4); ctx.lineTo(headX + 12, headY - 10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(headX + 5, headY + 4); ctx.lineTo(headX + 12, headY + 10); ctx.stroke();
          }
          else if (enemyType === 'forest_troll') {
            // Big hulking troll
            // Body
            ctx.fillStyle = '#4d7c0f';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce - 2, r * 0.7, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
            // Belly
            ctx.fillStyle = '#6b8e23';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 4, r * 0.45, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
            // Arms (thick, hanging low)
            ctx.fillStyle = '#4d7c0f';
            const armSwing = Math.sin(time * 3) * 5;
            ctx.beginPath(); ctx.ellipse(sx - r * 0.7, sy - bounce + 2 + armSwing, 7, 14, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.7, sy - bounce + 2 - armSwing, 7, 14, 0.3, 0, Math.PI * 2); ctx.fill();
            // Fists
            ctx.fillStyle = '#3f6212';
            ctx.beginPath(); ctx.arc(sx - r * 0.8, sy - bounce + 16 + armSwing, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + r * 0.8, sy - bounce + 16 - armSwing, 5, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#4d7c0f';
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.8, r * 0.4, 0, Math.PI * 2); ctx.fill();
            // Eyes (beady, angry)
            ctx.fillStyle = '#fde047';
            ctx.beginPath(); ctx.arc(sx - 5, sy - bounce - r * 0.85, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 5, sy - bounce - r * 0.85, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(sx - 5, sy - bounce - r * 0.85, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 5, sy - bounce - r * 0.85, 1.5, 0, Math.PI * 2); ctx.fill();
            // Teeth
            ctx.fillStyle = '#fafafa';
            ctx.beginPath(); ctx.moveTo(sx - 6, sy - bounce - r * 0.65); ctx.lineTo(sx - 4, sy - bounce - r * 0.55); ctx.lineTo(sx - 2, sy - bounce - r * 0.65); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + 2, sy - bounce - r * 0.65); ctx.lineTo(sx + 4, sy - bounce - r * 0.55); ctx.lineTo(sx + 6, sy - bounce - r * 0.65); ctx.fill();
          }
          else if (enemyType === 'bear') {
            // Large brown bear
            // Body
            ctx.fillStyle = '#92400e';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, r * 0.85, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
            // Front legs
            const walkCycle = Math.sin(time * 5) * 4;
            ctx.fillStyle = '#78350f';
            ctx.beginPath(); ctx.ellipse(sx - r * 0.4, sy - bounce + r * 0.5 + walkCycle, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.4, sy - bounce + r * 0.5 - walkCycle, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
            // Back legs
            ctx.beginPath(); ctx.ellipse(sx - r * 0.5, sy - bounce + r * 0.3 - walkCycle, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.5, sy - bounce + r * 0.3 + walkCycle, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#92400e';
            ctx.beginPath(); ctx.arc(sx + r * 0.5, sy - bounce - r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill();
            // Ears
            ctx.beginPath(); ctx.arc(sx + r * 0.35, sy - bounce - r * 0.65, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + r * 0.65, sy - bounce - r * 0.65, 4, 0, Math.PI * 2); ctx.fill();
            // Muzzle
            ctx.fillStyle = '#b45309';
            ctx.beginPath(); ctx.ellipse(sx + r * 0.7, sy - bounce - r * 0.25, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
            // Nose
            ctx.fillStyle = '#1c1917';
            ctx.beginPath(); ctx.arc(sx + r * 0.75, sy - bounce - r * 0.28, 2.5, 0, Math.PI * 2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(sx + r * 0.4, sy - bounce - r * 0.4, 2, 0, Math.PI * 2); ctx.fill();
          }
          else if (enemyType === 'lava_serpent') {
            // Sinuous fire snake
            const segments = 8;
            for (let i = segments - 1; i >= 0; i--) {
              const wave = Math.sin(time * 5 + i * 0.9) * 6;
              const segX = sx - (segments/2 - i) * 5;
              const segY = sy - bounce + wave;
              const segR = r * (0.25 + (1 - Math.abs(i - segments/2) / (segments/2)) * 0.2);
              // Lava glow
              ctx.fillStyle = i % 2 === 0 ? '#fb923c' : '#f97316';
              ctx.beginPath(); ctx.arc(segX, segY, segR + 2, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#fb923c';
              ctx.beginPath(); ctx.arc(segX, segY, segR, 0, Math.PI * 2); ctx.fill();
            }
            // Head
            const headX = sx + segments/2 * 5;
            const headY = sy - bounce + Math.sin(time * 5) * 6;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(headX, headY, r * 0.35, 0, Math.PI * 2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#fef08a';
            ctx.beginPath(); ctx.arc(headX + 3, headY - 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(headX + 3, headY + 2, 2, 0, Math.PI * 2); ctx.fill();
            // Tongue (forked)
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1;
            const tongueOut = Math.sin(time * 8) > 0.5;
            if (tongueOut) {
              ctx.beginPath(); ctx.moveTo(headX + r * 0.35, headY); ctx.lineTo(headX + r * 0.6, headY - 3); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(headX + r * 0.35, headY); ctx.lineTo(headX + r * 0.6, headY + 3); ctx.stroke();
            }
          }
          else if (enemyType === 'fire_spider') {
            // Spider made of magma/fire - uses same spider shape with fire colors
            const legSpread = r * 1.6;
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
              const side = i < 4 ? -1 : 1;
              const idx = i % 4;
              const lx = sx + side * r * 0.4;
              const ly = sy - bounce + idx * 3 - 4;
              const tx = sx + side * legSpread * (0.5 + idx * 0.15);
              const ty = ly + 5 + Math.sin(time * 7 + idx * 1.2) * 2;
              ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); ctx.stroke();
            }
            // Body glow
            const fireGlow = ctx.createRadialGradient(sx, sy - bounce, 0, sx, sy - bounce, r * 1.2);
            fireGlow.addColorStop(0, 'rgba(251,146,60,0.4)');
            fireGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = fireGlow;
            ctx.beginPath(); ctx.arc(sx, sy - bounce, r * 1.2, 0, Math.PI * 2); ctx.fill();
            // Abdomen
            ctx.fillStyle = '#dc2626';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 3, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
            // Magma cracks
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx - 4, sy - bounce); ctx.lineTo(sx + 2, sy - bounce + 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 3, sy - bounce - 2); ctx.lineTo(sx - 1, sy - bounce + 4); ctx.stroke();
            // Head
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.4, r * 0.35, 0, Math.PI * 2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#fef08a';
            for (let i = 0; i < 4; i++) {
              ctx.beginPath(); ctx.arc(sx - 3 + i * 2, sy - bounce - r * 0.45, 1.5, 0, Math.PI * 2); ctx.fill();
            }
          }
          else if (enemyType === 'ice_spider') {
            // Frost-coated spider
            const legSpread = r * 1.6;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
              const side = i < 4 ? -1 : 1;
              const idx = i % 4;
              const lx = sx + side * r * 0.4;
              const ly = sy - bounce + idx * 3 - 4;
              const tx = sx + side * legSpread * (0.5 + idx * 0.15);
              const ty = ly + 5 + Math.sin(time * 6 + idx * 1.4) * 2;
              ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); ctx.stroke();
            }
            // Frost aura
            ctx.fillStyle = `rgba(186,230,253,${0.15 + Math.sin(time * 3) * 0.05})`;
            ctx.beginPath(); ctx.arc(sx, sy - bounce, r * 1.3, 0, Math.PI * 2); ctx.fill();
            // Abdomen
            ctx.fillStyle = '#7dd3fc';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 3, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
            // Ice pattern
            ctx.fillStyle = '#bae6fd';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 3, r * 0.35, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#0ea5e9';
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.4, r * 0.35, 0, Math.PI * 2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(sx - 3, sy - bounce - r * 0.45, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 3, sy - bounce - r * 0.45, 2, 0, Math.PI * 2); ctx.fill();
          }
          else if (enemyType === 'polar_bear') {
            // Massive white bear
            // Body
            ctx.fillStyle = '#f0f9ff';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, r * 0.85, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
            // Legs
            const walkCycle = Math.sin(time * 4) * 3;
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.ellipse(sx - r * 0.4, sy - bounce + r * 0.5 + walkCycle, 7, 12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.4, sy - bounce + r * 0.5 - walkCycle, 7, 12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx - r * 0.55, sy - bounce + r * 0.3 - walkCycle, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.55, sy - bounce + r * 0.3 + walkCycle, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#f0f9ff';
            ctx.beginPath(); ctx.arc(sx + r * 0.5, sy - bounce - r * 0.35, r * 0.42, 0, Math.PI * 2); ctx.fill();
            // Ears
            ctx.beginPath(); ctx.arc(sx + r * 0.35, sy - bounce - r * 0.7, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + r * 0.65, sy - bounce - r * 0.7, 5, 0, Math.PI * 2); ctx.fill();
            // Nose
            ctx.fillStyle = '#1c1917';
            ctx.beginPath(); ctx.arc(sx + r * 0.78, sy - bounce - r * 0.3, 3, 0, Math.PI * 2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#0c4a6e';
            ctx.beginPath(); ctx.arc(sx + r * 0.42, sy - bounce - r * 0.45, 2.5, 0, Math.PI * 2); ctx.fill();
            // Ice breath particles
            if (Math.sin(time * 6) > 0.3) {
              for (let p = 0; p < 3; p++) {
                const px = sx + r * 0.9 + p * 5;
                const py = sy - bounce - r * 0.3 + Math.sin(time * 8 + p) * 4;
                ctx.fillStyle = `rgba(186,230,253,${0.6 - p * 0.15})`;
                ctx.beginPath(); ctx.arc(px, py, 2 - p * 0.3, 0, Math.PI * 2); ctx.fill();
              }
            }
          }
          else if (enemyType === 'demon') {
            // Classic red demon with horns and wings
            // Wing shadows
            ctx.fillStyle = 'rgba(127,29,29,0.5)';
            const wingFlap = Math.sin(time * 6) * 8;
            ctx.beginPath(); ctx.moveTo(sx - 5, sy - bounce - 5); ctx.lineTo(sx - r - 10, sy - bounce - 15 + wingFlap); ctx.lineTo(sx - r - 5, sy - bounce + 5); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + 5, sy - bounce - 5); ctx.lineTo(sx + r + 10, sy - bounce - 15 - wingFlap); ctx.lineTo(sx + r + 5, sy - bounce + 5); ctx.closePath(); ctx.fill();
            // Body
            ctx.fillStyle = '#991b1b';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, r * 0.6, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
            // Chest
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce - 2, r * 0.35, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#991b1b';
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.7, r * 0.38, 0, Math.PI * 2); ctx.fill();
            // Horns
            ctx.fillStyle = '#451a03';
            ctx.beginPath(); ctx.moveTo(sx - 6, sy - bounce - r - 4); ctx.lineTo(sx - 12, sy - bounce - r - 18); ctx.lineTo(sx - 2, sy - bounce - r - 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + 6, sy - bounce - r - 4); ctx.lineTo(sx + 12, sy - bounce - r - 18); ctx.lineTo(sx + 2, sy - bounce - r - 2); ctx.fill();
            // Eyes (glowing)
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(sx - 4, sy - bounce - r * 0.75, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 4, sy - bounce - r * 0.75, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Mouth
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.6, 4, 0.2, Math.PI - 0.2); ctx.stroke();
            // Tail
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 2;
            const tailWave = Math.sin(time * 4) * 6;
            ctx.beginPath(); ctx.moveTo(sx, sy - bounce + r * 0.7); ctx.quadraticCurveTo(sx + 15, sy - bounce + r + tailWave, sx + 20, sy - bounce + r * 0.5); ctx.stroke();
            // Tail tip (spade)
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath(); ctx.moveTo(sx + 20, sy - bounce + r * 0.5); ctx.lineTo(sx + 17, sy - bounce + r * 0.3); ctx.lineTo(sx + 23, sy - bounce + r * 0.3); ctx.closePath(); ctx.fill();
          }
          else if (enemyType === 'abyssal_spider') {
            // Huge dark void spider
            const legSpread = r * 2;
            // Legs (thick, dark purple)
            ctx.strokeStyle = '#4c1d95';
            ctx.lineWidth = 3;
            for (let i = 0; i < 8; i++) {
              const side = i < 4 ? -1 : 1;
              const idx = i % 4;
              const lx = sx + side * r * 0.5;
              const ly = sy - bounce + idx * 4 - 6;
              const tx = sx + side * legSpread * (0.5 + idx * 0.13);
              const ty = ly + 6 + Math.sin(time * 5 + idx) * 3;
              const midX = (lx + tx) / 2 + side * 6;
              const midY = Math.min(ly, ty) - 10;
              ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(midX, midY, tx, ty); ctx.stroke();
            }
            // Void glow
            ctx.fillStyle = `rgba(88,28,135,${0.2 + Math.sin(time * 2) * 0.08})`;
            ctx.beginPath(); ctx.arc(sx, sy - bounce, r * 1.4, 0, Math.PI * 2); ctx.fill();
            // Abdomen
            ctx.fillStyle = '#581c87';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 4, r * 0.8, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
            // Void markings
            ctx.fillStyle = '#7c3aed';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 5, r * 0.3, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#3b0764';
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.45, r * 0.4, 0, Math.PI * 2); ctx.fill();
            // Multiple glowing eyes
            ctx.fillStyle = '#a855f7';
            ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 5;
            for (let i = 0; i < 6; i++) {
              const ex = sx - 5 + (i % 3) * 5;
              const ey = sy - bounce - r * 0.5 - 2 + Math.floor(i / 3) * 4;
              ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
          }
          else if (enemyType === 'crystal_golem') {
            // Large crystal-encrusted golem
            // Body (chunky)
            ctx.fillStyle = '#86198f';
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.6, sy - bounce + r * 0.5);
            ctx.lineTo(sx - r * 0.5, sy - bounce - r * 0.5);
            ctx.lineTo(sx, sy - bounce - r * 0.7);
            ctx.lineTo(sx + r * 0.5, sy - bounce - r * 0.5);
            ctx.lineTo(sx + r * 0.6, sy - bounce + r * 0.5);
            ctx.closePath(); ctx.fill();
            // Crystal growths
            const crystalColors = ['#e879f9', '#f0abfc', '#d946ef', '#c026d3'];
            for (let i = 0; i < 5; i++) {
              const cx2 = sx + Math.cos(i * 1.26) * r * 0.4;
              const cy2 = sy - bounce - r * 0.3 + Math.sin(i * 1.26) * r * 0.3;
              const ch = 8 + i * 2;
              ctx.fillStyle = crystalColors[i % crystalColors.length];
              ctx.beginPath();
              ctx.moveTo(cx2 - 3, cy2);
              ctx.lineTo(cx2, cy2 - ch);
              ctx.lineTo(cx2 + 3, cy2);
              ctx.closePath(); ctx.fill();
              // Crystal highlight
              ctx.fillStyle = 'rgba(255,255,255,0.3)';
              ctx.beginPath();
              ctx.moveTo(cx2 - 1, cy2);
              ctx.lineTo(cx2, cy2 - ch * 0.6);
              ctx.lineTo(cx2 + 1, cy2 - ch * 0.3);
              ctx.closePath(); ctx.fill();
            }
            // Eyes
            ctx.fillStyle = '#f0abfc';
            ctx.shadowColor = '#f0abfc'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(sx - 6, sy - bounce - r * 0.35, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 6, sy - bounce - r * 0.35, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Arms (rocky)
            const armBob = Math.sin(time * 2) * 3;
            ctx.fillStyle = '#701a75';
            ctx.beginPath(); ctx.ellipse(sx - r * 0.7, sy - bounce + armBob, 8, 12, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.7, sy - bounce - armBob, 8, 12, 0.2, 0, Math.PI * 2); ctx.fill();
          }
          // ========== NEW LARGER ENEMIES ==========
          
          // MEADOW - Giant Toad
          else if (enemyType === 'giant_toad') {
            // Fat body
            ctx.fillStyle = '#4d7c0f';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, r * 0.8, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
            // Belly
            ctx.fillStyle = '#65a30d';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + r * 0.15, r * 0.55, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            // Eyes (bulging on top)
            ctx.fillStyle = '#fef08a';
            ctx.beginPath(); ctx.arc(sx - r * 0.3, sy - bounce - r * 0.45, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + r * 0.3, sy - bounce - r * 0.45, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(sx - r * 0.3, sy - bounce - r * 0.45, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + r * 0.3, sy - bounce - r * 0.45, 3, 0, Math.PI * 2); ctx.fill();
            // Legs
            const toadLeg = Math.sin(time * 3) * 4;
            ctx.fillStyle = '#3f6212';
            ctx.beginPath(); ctx.ellipse(sx - r * 0.6, sy - bounce + r * 0.4 + toadLeg, 8, 5, -0.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.6, sy - bounce + r * 0.4 - toadLeg, 8, 5, 0.4, 0, Math.PI * 2); ctx.fill();
          }
          
          // MEADOW - Moss Golem
          else if (enemyType === 'meadow_golem') {
            // Mossy rock body
            ctx.fillStyle = '#3f6212';
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.5, sy - bounce + r * 0.4);
            ctx.lineTo(sx - r * 0.6, sy - bounce - r * 0.2);
            ctx.lineTo(sx - r * 0.3, sy - bounce - r * 0.7);
            ctx.lineTo(sx + r * 0.3, sy - bounce - r * 0.7);
            ctx.lineTo(sx + r * 0.6, sy - bounce - r * 0.2);
            ctx.lineTo(sx + r * 0.5, sy - bounce + r * 0.4);
            ctx.closePath(); ctx.fill();
            // Moss patches
            ctx.fillStyle = '#84cc16';
            for (let i = 0; i < 4; i++) {
              const mx = sx + Math.cos(i * 1.6 + 0.5) * r * 0.35;
              const my = sy - bounce - r * 0.1 + Math.sin(i * 1.6) * r * 0.25;
              ctx.beginPath(); ctx.arc(mx, my, 5 + i, 0, Math.PI * 2); ctx.fill();
            }
            // Glowing eyes
            ctx.fillStyle = '#a3e635';
            ctx.shadowColor = '#a3e635'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(sx - 7, sy - bounce - r * 0.4, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 7, sy - bounce - r * 0.4, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Arms
            const mgArm = Math.sin(time * 1.5) * 3;
            ctx.fillStyle = '#4d7c0f';
            ctx.beginPath(); ctx.ellipse(sx - r * 0.7, sy - bounce - r * 0.1 + mgArm, 10, 7, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.7, sy - bounce - r * 0.1 - mgArm, 10, 7, 0.3, 0, Math.PI * 2); ctx.fill();
          }
          
          // MEADOW - Cursed Scarecrow
          else if (enemyType === 'scarecrow') {
            // Post
            ctx.fillStyle = '#78350f';
            ctx.fillRect(sx - 2, sy - bounce - r * 0.8, 4, r * 1.4);
            // Crossbar
            ctx.fillRect(sx - r * 0.6, sy - bounce - r * 0.5, r * 1.2, 3);
            // Head (burlap sack)
            ctx.fillStyle = '#a16207';
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.7, r * 0.35, 0, Math.PI * 2); ctx.fill();
            // Hat
            ctx.fillStyle = '#451a03';
            ctx.fillRect(sx - r * 0.4, sy - bounce - r * 1.05, r * 0.8, 4);
            ctx.fillRect(sx - r * 0.25, sy - bounce - r * 1.25, r * 0.5, r * 0.22);
            // Glowing eyes
            ctx.fillStyle = '#f97316';
            ctx.shadowColor = '#f97316'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(sx - 5, sy - bounce - r * 0.72, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 5, sy - bounce - r * 0.72, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Stitched mouth
            ctx.strokeStyle = '#451a03'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx - 4, sy - bounce - r * 0.6); ctx.lineTo(sx + 4, sy - bounce - r * 0.6); ctx.stroke();
            // Tattered cloth
            ctx.fillStyle = '#92400e';
            const scareSway = Math.sin(time * 2) * 3;
            ctx.beginPath(); ctx.moveTo(sx - r * 0.6, sy - bounce - r * 0.47); ctx.lineTo(sx - r * 0.5 + scareSway, sy - bounce + r * 0.1); ctx.lineTo(sx - r * 0.3, sy - bounce - r * 0.47); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + r * 0.6, sy - bounce - r * 0.47); ctx.lineTo(sx + r * 0.5 - scareSway, sy - bounce + r * 0.1); ctx.lineTo(sx + r * 0.3, sy - bounce - r * 0.47); ctx.fill();
          }
          
          // FOREST - Dire Wolf
          else if (enemyType === 'dire_wolf') {
            // Large wolf body
            ctx.fillStyle = '#44403c';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, r * 0.85, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#57534e';
            ctx.beginPath(); ctx.ellipse(sx + r * 0.5 * Math.sign(enemy.vx || 1), sy - bounce - r * 0.2, r * 0.35, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
            // Ears
            const wolfDir = Math.sign(enemy.vx || 1);
            ctx.fillStyle = '#292524';
            ctx.beginPath();
            ctx.moveTo(sx + r * 0.5 * wolfDir - 5, sy - bounce - r * 0.45);
            ctx.lineTo(sx + r * 0.5 * wolfDir - 2, sy - bounce - r * 0.65);
            ctx.lineTo(sx + r * 0.5 * wolfDir + 2, sy - bounce - r * 0.45);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(sx + r * 0.5 * wolfDir + 3, sy - bounce - r * 0.45);
            ctx.lineTo(sx + r * 0.5 * wolfDir + 6, sy - bounce - r * 0.65);
            ctx.lineTo(sx + r * 0.5 * wolfDir + 9, sy - bounce - r * 0.45);
            ctx.fill();
            // Red eyes
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.arc(sx + r * 0.45 * wolfDir, sy - bounce - r * 0.25, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Legs
            ctx.fillStyle = '#292524';
            const wolfRun = Math.sin(time * 6) * 5;
            ctx.fillRect(sx - r * 0.4 - 2, sy - bounce + r * 0.3, 4, r * 0.4 + wolfRun);
            ctx.fillRect(sx + r * 0.4 - 2, sy - bounce + r * 0.3, 4, r * 0.4 - wolfRun);
            // Tail
            ctx.strokeStyle = '#44403c'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sx - r * 0.6 * wolfDir, sy - bounce);
            ctx.quadraticCurveTo(sx - r * 0.9 * wolfDir, sy - bounce - r * 0.3, sx - r * 0.7 * wolfDir, sy - bounce - r * 0.5);
            ctx.stroke();
          }
          
          // FOREST - Ancient Ent
          else if (enemyType === 'ancient_ent') {
            // Massive tree trunk body
            ctx.fillStyle = '#3f6212';
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.4, sy - bounce + r * 0.5);
            ctx.lineTo(sx - r * 0.5, sy - bounce - r * 0.2);
            ctx.lineTo(sx - r * 0.3, sy - bounce - r * 0.8);
            ctx.lineTo(sx + r * 0.3, sy - bounce - r * 0.8);
            ctx.lineTo(sx + r * 0.5, sy - bounce - r * 0.2);
            ctx.lineTo(sx + r * 0.4, sy - bounce + r * 0.5);
            ctx.closePath(); ctx.fill();
            // Bark texture
            ctx.strokeStyle = '#365314'; ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
              const by = sy - bounce - r * 0.6 + i * r * 0.22;
              ctx.beginPath(); ctx.moveTo(sx - r * 0.3, by); ctx.lineTo(sx + r * 0.3, by + 3); ctx.stroke();
            }
            // Canopy (leafy top)
            ctx.fillStyle = '#22c55e';
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.75, r * 0.55, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#16a34a';
            ctx.beginPath(); ctx.arc(sx - r * 0.25, sy - bounce - r * 0.85, r * 0.35, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + r * 0.25, sy - bounce - r * 0.85, r * 0.35, 0, Math.PI * 2); ctx.fill();
            // Glowing eyes in trunk
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(sx - 8, sy - bounce - r * 0.35, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 8, sy - bounce - r * 0.35, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Branch arms
            const entSway = Math.sin(time * 1.2) * 4;
            ctx.strokeStyle = '#3f6212'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(sx - r * 0.5, sy - bounce - r * 0.2);
            ctx.quadraticCurveTo(sx - r * 0.9, sy - bounce - r * 0.4 + entSway, sx - r * 1.0, sy - bounce - r * 0.2);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + r * 0.5, sy - bounce - r * 0.2);
            ctx.quadraticCurveTo(sx + r * 0.9, sy - bounce - r * 0.4 - entSway, sx + r * 1.0, sy - bounce - r * 0.2);
            ctx.stroke();
          }
          
          // FOREST - Swamp Horror
          else if (enemyType === 'swamp_horror') {
            // Blob body
            ctx.fillStyle = '#365314';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + r * 0.1, r * 0.7, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
            // Dripping bits
            ctx.fillStyle = '#4d7c0f';
            for (let i = 0; i < 4; i++) {
              const drip = Math.sin(time * 2 + i * 1.5) * 4;
              ctx.beginPath(); ctx.ellipse(sx + Math.cos(i * 1.57) * r * 0.5, sy - bounce + r * 0.5 + drip, 4, 6 + drip, 0, 0, Math.PI * 2); ctx.fill();
            }
            // Multiple eyes
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 5;
            const eyePositions = [[-8, -r*0.2], [6, -r*0.3], [-2, -r*0.05], [10, -r*0.1]];
            for (const [ex, ey] of eyePositions) {
              ctx.beginPath(); ctx.arc(sx + ex, sy - bounce + ey, 2.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
            // Tentacles
            ctx.strokeStyle = '#365314'; ctx.lineWidth = 3;
            for (let i = 0; i < 3; i++) {
              const ta = (i / 3) * Math.PI - Math.PI * 0.25;
              const tw = Math.sin(time * 3 + i * 2) * 8;
              ctx.beginPath(); ctx.moveTo(sx + Math.cos(ta) * r * 0.5, sy - bounce + r * 0.3);
              ctx.quadraticCurveTo(sx + Math.cos(ta) * r * 0.8 + tw, sy - bounce + r * 0.6, sx + Math.cos(ta) * r, sy - bounce + r * 0.3);
              ctx.stroke();
            }
          }
          
          // VOLCANIC - Magma Giant
          else if (enemyType === 'magma_giant') {
            // Massive rocky body
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.5, sy - bounce + r * 0.5);
            ctx.lineTo(sx - r * 0.6, sy - bounce);
            ctx.lineTo(sx - r * 0.4, sy - bounce - r * 0.7);
            ctx.lineTo(sx, sy - bounce - r * 0.9);
            ctx.lineTo(sx + r * 0.4, sy - bounce - r * 0.7);
            ctx.lineTo(sx + r * 0.6, sy - bounce);
            ctx.lineTo(sx + r * 0.5, sy - bounce + r * 0.5);
            ctx.closePath(); ctx.fill();
            // Magma cracks
            ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
            ctx.shadowColor = '#f97316'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.moveTo(sx - r * 0.2, sy - bounce - r * 0.6); ctx.lineTo(sx - r * 0.1, sy - bounce - r * 0.1); ctx.lineTo(sx + r * 0.1, sy - bounce + r * 0.2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + r * 0.15, sy - bounce - r * 0.5); ctx.lineTo(sx + r * 0.25, sy - bounce); ctx.stroke();
            ctx.shadowBlur = 0;
            // Glowing eyes
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(sx - 8, sy - bounce - r * 0.55, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 8, sy - bounce - r * 0.55, 5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Arms
            const mgaArm = Math.sin(time * 1.5) * 4;
            ctx.fillStyle = '#991b1b';
            ctx.beginPath(); ctx.ellipse(sx - r * 0.75, sy - bounce - r * 0.1 + mgaArm, 12, 9, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.75, sy - bounce - r * 0.1 - mgaArm, 12, 9, 0.3, 0, Math.PI * 2); ctx.fill();
          }
          
          // VOLCANIC - Hell Hound
          else if (enemyType === 'hell_hound') {
            // Fiery dog body
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, r * 0.8, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            const hhDir = Math.sign(enemy.vx || 1);
            ctx.fillStyle = '#991b1b';
            ctx.beginPath(); ctx.ellipse(sx + r * 0.5 * hhDir, sy - bounce - r * 0.15, r * 0.3, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
            // Fire mane
            ctx.fillStyle = '#f97316';
            ctx.shadowColor = '#f97316'; ctx.shadowBlur = 8;
            for (let i = 0; i < 5; i++) {
              const fx = sx + Math.cos(i * 0.7 + time * 5) * r * 0.3;
              const fy = sy - bounce - r * 0.3 - Math.abs(Math.sin(time * 6 + i)) * 8;
              ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
            // Eyes
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.arc(sx + r * 0.45 * hhDir, sy - bounce - r * 0.2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Legs
            ctx.fillStyle = '#450a0a';
            const hhRun = Math.sin(time * 7) * 5;
            ctx.fillRect(sx - r * 0.4 - 2, sy - bounce + r * 0.3, 4, r * 0.35 + hhRun);
            ctx.fillRect(sx + r * 0.3 - 2, sy - bounce + r * 0.3, 4, r * 0.35 - hhRun);
          }
          
          // VOLCANIC - Flame Wyrm
          else if (enemyType === 'flame_wyrm') {
            // Serpentine body segments
            ctx.fillStyle = '#dc2626';
            for (let i = 0; i < 5; i++) {
              const segX = sx - i * 8 + Math.sin(time * 4 + i * 0.8) * 4;
              const segY = sy - bounce + Math.cos(time * 3 + i * 0.8) * 3;
              const segR = Math.max(1, r * 0.35 - i * 1.5);
              ctx.beginPath(); ctx.arc(segX, segY, segR, 0, Math.PI * 2); ctx.fill();
            }
            // Head
            ctx.fillStyle = '#f97316';
            ctx.beginPath(); ctx.ellipse(sx + r * 0.3, sy - bounce - r * 0.1, r * 0.35, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
            // Fire breath effect
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(sx + r * 0.6, sy - bounce - r * 0.1, 5 + Math.sin(time * 8) * 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Eye
            ctx.fillStyle = '#fef08a';
            ctx.beginPath(); ctx.arc(sx + r * 0.35, sy - bounce - r * 0.2, 3, 0, Math.PI * 2); ctx.fill();
            // Wings (small)
            ctx.fillStyle = 'rgba(249,115,22,0.4)';
            const fwWing = Math.sin(time * 5) * 5;
            ctx.beginPath(); ctx.moveTo(sx, sy - bounce);
            ctx.lineTo(sx - r * 0.5, sy - bounce - r * 0.5 - fwWing);
            ctx.lineTo(sx + r * 0.1, sy - bounce - r * 0.1);
            ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx, sy - bounce);
            ctx.lineTo(sx - r * 0.5, sy - bounce + r * 0.3 + fwWing);
            ctx.lineTo(sx + r * 0.1, sy - bounce + r * 0.1);
            ctx.fill();
          }
          
          // FROZEN - Woolly Mammoth
          else if (enemyType === 'mammoth') {
            // Huge furry body
            ctx.fillStyle = '#57534e';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, r * 0.85, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
            // Fur texture
            ctx.fillStyle = '#78716c';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce - r * 0.1, r * 0.75, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#44403c';
            ctx.beginPath(); ctx.ellipse(sx + r * 0.4, sy - bounce - r * 0.3, r * 0.4, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
            // Tusks
            ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(sx + r * 0.5, sy - bounce - r * 0.1);
            ctx.quadraticCurveTo(sx + r * 0.9, sy - bounce + r * 0.1, sx + r * 0.7, sy - bounce - r * 0.3);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + r * 0.5, sy - bounce);
            ctx.quadraticCurveTo(sx + r * 0.85, sy - bounce + r * 0.2, sx + r * 0.65, sy - bounce - r * 0.15);
            ctx.stroke();
            // Trunk
            ctx.strokeStyle = '#44403c'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(sx + r * 0.6, sy - bounce - r * 0.15);
            ctx.quadraticCurveTo(sx + r * 0.8, sy - bounce + r * 0.3, sx + r * 0.6, sy - bounce + r * 0.4);
            ctx.stroke();
            // Eye
            ctx.fillStyle = '#a8a29e';
            ctx.beginPath(); ctx.arc(sx + r * 0.35, sy - bounce - r * 0.35, 3, 0, Math.PI * 2); ctx.fill();
            // Legs
            ctx.fillStyle = '#44403c';
            const mamWalk = Math.sin(time * 2) * 3;
            ctx.fillRect(sx - r * 0.4 - 4, sy - bounce + r * 0.4, 8, r * 0.4 + mamWalk);
            ctx.fillRect(sx - r * 0.1 - 4, sy - bounce + r * 0.4, 8, r * 0.4 - mamWalk);
            ctx.fillRect(sx + r * 0.2 - 4, sy - bounce + r * 0.4, 8, r * 0.4 + mamWalk);
          }
          
          // FROZEN - Frost Wraith
          else if (enemyType === 'frost_wraith') {
            // Ghostly icy form
            ctx.fillStyle = 'rgba(125,211,252,0.5)';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, r * 0.6, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
            // Inner glow
            ctx.fillStyle = 'rgba(186,230,253,0.3)';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce - r * 0.1, r * 0.4, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
            // Ice crystals floating around
            ctx.fillStyle = '#bae6fd';
            ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 8;
            for (let i = 0; i < 4; i++) {
              const ix = sx + Math.cos(time * 2 + i * 1.57) * r * 0.7;
              const iy = sy - bounce + Math.sin(time * 2 + i * 1.57) * r * 0.5;
              ctx.beginPath();
              ctx.moveTo(ix, iy - 5); ctx.lineTo(ix + 3, iy); ctx.lineTo(ix, iy + 5); ctx.lineTo(ix - 3, iy);
              ctx.closePath(); ctx.fill();
            }
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(sx - 5, sy - bounce - r * 0.2, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 5, sy - bounce - r * 0.2, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Wispy tail
            ctx.strokeStyle = 'rgba(125,211,252,0.3)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sx, sy - bounce + r * 0.5);
            ctx.quadraticCurveTo(sx + Math.sin(time * 3) * 10, sy - bounce + r * 0.9, sx + Math.sin(time * 2) * 15, sy - bounce + r * 1.1);
            ctx.stroke();
          }
          
          // FROZEN - Ice Golem
          else if (enemyType === 'ice_golem') {
            // Chunky ice body
            ctx.fillStyle = '#7dd3fc';
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.5, sy - bounce + r * 0.4);
            ctx.lineTo(sx - r * 0.6, sy - bounce - r * 0.3);
            ctx.lineTo(sx - r * 0.2, sy - bounce - r * 0.7);
            ctx.lineTo(sx + r * 0.2, sy - bounce - r * 0.7);
            ctx.lineTo(sx + r * 0.6, sy - bounce - r * 0.3);
            ctx.lineTo(sx + r * 0.5, sy - bounce + r * 0.4);
            ctx.closePath(); ctx.fill();
            // Ice sheen
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.3, sy - bounce - r * 0.6);
            ctx.lineTo(sx, sy - bounce - r * 0.7);
            ctx.lineTo(sx + r * 0.2, sy - bounce - r * 0.3);
            ctx.lineTo(sx - r * 0.1, sy - bounce - r * 0.2);
            ctx.closePath(); ctx.fill();
            // Eyes
            ctx.fillStyle = '#0ea5e9';
            ctx.shadowColor = '#0ea5e9'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(sx - 7, sy - bounce - r * 0.4, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 7, sy - bounce - r * 0.4, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Arms
            const igArm = Math.sin(time * 1.5) * 3;
            ctx.fillStyle = '#bae6fd';
            ctx.beginPath(); ctx.ellipse(sx - r * 0.7, sy - bounce - r * 0.1 + igArm, 10, 8, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.7, sy - bounce - r * 0.1 - igArm, 10, 8, 0.3, 0, Math.PI * 2); ctx.fill();
          }
          
          // ABYSS - Shadow Titan
          else if (enemyType === 'shadow_titan') {
            // Dark massive body
            ctx.fillStyle = '#3b0764';
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.5, sy - bounce + r * 0.5);
            ctx.lineTo(sx - r * 0.6, sy - bounce);
            ctx.lineTo(sx - r * 0.3, sy - bounce - r * 0.8);
            ctx.lineTo(sx, sy - bounce - r * 0.95);
            ctx.lineTo(sx + r * 0.3, sy - bounce - r * 0.8);
            ctx.lineTo(sx + r * 0.6, sy - bounce);
            ctx.lineTo(sx + r * 0.5, sy - bounce + r * 0.5);
            ctx.closePath(); ctx.fill();
            // Dark energy wisps
            ctx.fillStyle = 'rgba(168,85,247,0.3)';
            for (let i = 0; i < 5; i++) {
              const wx = sx + Math.sin(time * 2 + i * 1.26) * r * 0.7;
              const wy = sy - bounce - r * 0.3 + Math.cos(time * 1.5 + i) * r * 0.4;
              ctx.beginPath(); ctx.arc(wx, wy, 4 + Math.sin(time * 3 + i) * 2, 0, Math.PI * 2); ctx.fill();
            }
            // Crown/horns
            ctx.fillStyle = '#581c87';
            ctx.beginPath(); ctx.moveTo(sx - r * 0.25, sy - bounce - r * 0.8); ctx.lineTo(sx - r * 0.35, sy - bounce - r * 1.2); ctx.lineTo(sx - r * 0.15, sy - bounce - r * 0.85); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + r * 0.25, sy - bounce - r * 0.8); ctx.lineTo(sx + r * 0.35, sy - bounce - r * 1.2); ctx.lineTo(sx + r * 0.15, sy - bounce - r * 0.85); ctx.fill();
            // Glowing eyes
            ctx.fillStyle = '#e879f9';
            ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(sx - 8, sy - bounce - r * 0.55, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 8, sy - bounce - r * 0.55, 5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Arms
            ctx.fillStyle = '#4c1d95';
            const stArm = Math.sin(time * 1.5) * 5;
            ctx.beginPath(); ctx.ellipse(sx - r * 0.75, sy - bounce - r * 0.1 + stArm, 14, 10, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.75, sy - bounce - r * 0.1 - stArm, 14, 10, 0.3, 0, Math.PI * 2); ctx.fill();
          }
          
          // ABYSS - Mind Flayer
          else if (enemyType === 'mind_flayer') {
            // Robed body
            ctx.fillStyle = '#581c87';
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.5, sy - bounce + r * 0.5);
            ctx.lineTo(sx - r * 0.3, sy - bounce - r * 0.3);
            ctx.lineTo(sx + r * 0.3, sy - bounce - r * 0.3);
            ctx.lineTo(sx + r * 0.5, sy - bounce + r * 0.5);
            ctx.closePath(); ctx.fill();
            // Head (bulbous)
            ctx.fillStyle = '#a855f7';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce - r * 0.4, r * 0.35, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            // Tentacle face
            ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
              const ta = (i / 4) * 0.8 - 0.4;
              const tw = Math.sin(time * 3 + i * 1.5) * 5;
              ctx.beginPath(); ctx.moveTo(sx + Math.sin(ta) * 5, sy - bounce - r * 0.2);
              ctx.quadraticCurveTo(sx + Math.sin(ta) * 8 + tw, sy - bounce + r * 0.1, sx + Math.sin(ta) * 3 + tw * 0.5, sy - bounce + r * 0.25);
              ctx.stroke();
            }
            // Eyes (three)
            ctx.fillStyle = '#e879f9';
            ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(sx - 6, sy - bounce - r * 0.5, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 6, sy - bounce - r * 0.5, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx, sy - bounce - r * 0.6, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          
          // ABYSS - Abyssal Worm
          else if (enemyType === 'abyssal_worm') {
            // Segmented worm body
            ctx.fillStyle = '#3b0764';
            for (let i = 0; i < 6; i++) {
              const segX = sx + Math.sin(time * 3 + i * 0.8) * (6 - i) * 2;
              const segY = sy - bounce + i * 7 - 15;
              const segR = r * 0.4 - i * 1;
              ctx.beginPath(); ctx.arc(segX, segY, Math.max(segR, 4), 0, Math.PI * 2); ctx.fill();
            }
            // Head
            ctx.fillStyle = '#581c87';
            ctx.beginPath(); ctx.arc(sx + Math.sin(time * 3) * 6, sy - bounce - 15, r * 0.45, 0, Math.PI * 2); ctx.fill();
            // Maw (ring of teeth)
            ctx.fillStyle = '#d8b4fe';
            for (let i = 0; i < 6; i++) {
              const ta = (i / 6) * Math.PI * 2 + time * 2;
              const tx = sx + Math.sin(time * 3) * 6 + Math.cos(ta) * r * 0.3;
              const ty = sy - bounce - 15 + Math.sin(ta) * r * 0.3;
              ctx.beginPath(); ctx.moveTo(tx, ty);
              ctx.lineTo(tx + Math.cos(ta) * 5, ty + Math.sin(ta) * 5);
              ctx.lineTo(tx + Math.cos(ta + 0.3) * 2, ty + Math.sin(ta + 0.3) * 2);
              ctx.fill();
            }
            // Eye
            ctx.fillStyle = '#e879f9';
            ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(sx + Math.sin(time * 3) * 6, sy - bounce - 18, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          
          // CRYSTAL - Crystal Drake
          else if (enemyType === 'crystal_drake') {
            // Dragon-like body
            ctx.fillStyle = '#a21caf';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce, r * 0.7, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#c026d3';
            ctx.beginPath(); ctx.ellipse(sx + r * 0.5, sy - bounce - r * 0.25, r * 0.3, r * 0.25, -0.3, 0, Math.PI * 2); ctx.fill();
            // Crystal spines along back
            const spineColors = ['#f0abfc', '#e879f9', '#d946ef', '#f5d0fe'];
            for (let i = 0; i < 5; i++) {
              const spX = sx - r * 0.3 + i * r * 0.2;
              const spH = 10 + Math.sin(time * 3 + i) * 3;
              ctx.fillStyle = spineColors[i % spineColors.length];
              ctx.beginPath();
              ctx.moveTo(spX - 3, sy - bounce - r * 0.35);
              ctx.lineTo(spX, sy - bounce - r * 0.35 - spH);
              ctx.lineTo(spX + 3, sy - bounce - r * 0.35);
              ctx.closePath(); ctx.fill();
            }
            // Wings
            ctx.fillStyle = 'rgba(217,70,239,0.3)';
            const cdWing = Math.sin(time * 4) * 6;
            ctx.beginPath(); ctx.moveTo(sx - r * 0.1, sy - bounce - r * 0.2);
            ctx.lineTo(sx - r * 0.7, sy - bounce - r * 0.8 - cdWing);
            ctx.lineTo(sx - r * 0.3, sy - bounce + r * 0.1);
            ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + r * 0.1, sy - bounce - r * 0.2);
            ctx.lineTo(sx + r * 0.5, sy - bounce - r * 0.7 - cdWing);
            ctx.lineTo(sx + r * 0.3, sy - bounce + r * 0.1);
            ctx.fill();
            // Eye
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#fef08a'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(sx + r * 0.55, sy - bounce - r * 0.3, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Tail
            ctx.strokeStyle = '#86198f'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(sx - r * 0.5, sy - bounce);
            ctx.quadraticCurveTo(sx - r * 0.9, sy - bounce + Math.sin(time * 2) * 8, sx - r * 0.7, sy - bounce + r * 0.3);
            ctx.stroke();
          }
          
          // CRYSTAL - Geode Golem
          else if (enemyType === 'geode_golem') {
            // Giant rocky exterior
            ctx.fillStyle = '#6b21a8';
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.5, sy - bounce + r * 0.5);
            ctx.lineTo(sx - r * 0.65, sy - bounce);
            ctx.lineTo(sx - r * 0.4, sy - bounce - r * 0.7);
            ctx.lineTo(sx, sy - bounce - r * 0.85);
            ctx.lineTo(sx + r * 0.4, sy - bounce - r * 0.7);
            ctx.lineTo(sx + r * 0.65, sy - bounce);
            ctx.lineTo(sx + r * 0.5, sy - bounce + r * 0.5);
            ctx.closePath(); ctx.fill();
            // Inner crystal cavity (geode)
            ctx.fillStyle = '#581c87';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce - r * 0.15, r * 0.35, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            // Crystal formations inside
            const geodeColors = ['#f0abfc', '#e879f9', '#d946ef', '#c084fc', '#fbbf24'];
            for (let i = 0; i < 6; i++) {
              const ga = (i / 6) * Math.PI * 2;
              const gx = sx + Math.cos(ga) * r * 0.2;
              const gy = sy - bounce - r * 0.15 + Math.sin(ga) * r * 0.25;
              const gh = 6 + i * 1.5 + Math.sin(time * 2 + i) * 2;
              ctx.fillStyle = geodeColors[i % geodeColors.length];
              ctx.shadowColor = geodeColors[i % geodeColors.length]; ctx.shadowBlur = 4;
              ctx.beginPath();
              ctx.moveTo(gx - 2, gy);
              ctx.lineTo(gx, gy - gh);
              ctx.lineTo(gx + 2, gy);
              ctx.closePath(); ctx.fill();
            }
            ctx.shadowBlur = 0;
            // Eyes
            ctx.fillStyle = '#f0abfc';
            ctx.shadowColor = '#f0abfc'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(sx - 9, sy - bounce - r * 0.5, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 9, sy - bounce - r * 0.5, 5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Arms
            ctx.fillStyle = '#7e22ce';
            const ggArm = Math.sin(time * 1.3) * 4;
            ctx.beginPath(); ctx.ellipse(sx - r * 0.8, sy - bounce + ggArm, 14, 10, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + r * 0.8, sy - bounce - ggArm, 14, 10, 0.2, 0, Math.PI * 2); ctx.fill();
          }
          
          // CRYSTAL - Shard Swarm
          else if (enemyType === 'shard_swarm') {
            // Cluster of flying crystal shards
            ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 6;
            for (let i = 0; i < 7; i++) {
              const sa = (i / 7) * Math.PI * 2 + time * 3;
              const sd = r * 0.3 + Math.sin(time * 4 + i * 2) * 4;
              const shx = sx + Math.cos(sa) * sd;
              const shy = sy - bounce + Math.sin(sa) * sd * 0.6;
              const shRot = sa + time * 2;
              ctx.fillStyle = ['#e879f9', '#f0abfc', '#d946ef', '#c084fc', '#f5d0fe', '#fbbf24', '#ec4899'][i];
              ctx.save();
              ctx.translate(shx, shy);
              ctx.rotate(shRot);
              ctx.beginPath();
              ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0);
              ctx.closePath(); ctx.fill();
              ctx.restore();
            }
            ctx.shadowBlur = 0;
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
          // === NEW LARGE ENEMIES ===
          else if (enemyType === 'giant_hornet') {
            const wingFlap = Math.sin(time * 20) * 0.4;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.ellipse(sx - 10, sy - 14 - bounce, 14, 7, wingFlap - 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sx + 10, sy - 14 - bounce, 14, 7, -wingFlap + 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.ellipse(sx, sy - bounce, 16, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1c1917';
            for (let s = -8; s <= 8; s += 6) { ctx.fillRect(sx + s - 2, sy - 8 - bounce, 3, 16); }
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.moveTo(sx + 16, sy - bounce); ctx.lineTo(sx + 26, sy - bounce); ctx.lineTo(sx + 16, sy + 3 - bounce); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath(); ctx.arc(sx - 8, sy - 4 - bounce, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 8, sy - 4 - bounce, 3, 0, Math.PI * 2); ctx.fill();
          }
          else if (enemyType === 'bramble_beast') {
            const pulse = Math.sin(time * 2) * 2;
            const spikes = 10;
            ctx.beginPath();
            for (let i = 0; i < spikes; i++) {
              const a = (i / spikes) * Math.PI * 2;
              const rr = 22 + pulse;
              ctx.lineTo(sx + Math.cos(a) * rr, sy - bounce + Math.sin(a) * rr * 0.7);
              const a2 = ((i + 0.5) / spikes) * Math.PI * 2;
              ctx.lineTo(sx + Math.cos(a2) * (32 + pulse), sy - bounce + Math.sin(a2) * (32 + pulse) * 0.7);
            }
            ctx.closePath(); ctx.fillStyle = '#4d7c0f'; ctx.fill();
            ctx.strokeStyle = '#365314'; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.arc(sx, sy - bounce, 14, 0, Math.PI * 2); ctx.fillStyle = '#65a30d'; ctx.fill();
            ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(sx - 6, sy - 4 - bounce, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 6, sy - 4 - bounce, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          else if (enemyType === 'moss_golem') {
            ctx.fillStyle = '#4d7c0f';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 2, 28, 24, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#57534e';
            ctx.beginPath(); ctx.arc(sx - 10, sy - 6 - bounce, 10, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 8, sy + 4 - bounce, 8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx - 2, sy - 16 - bounce, 9, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
            for (let v = 0; v < 4; v++) {
              const vx = sx - 15 + v * 10;
              ctx.beginPath(); ctx.moveTo(vx, sy - 10 - bounce);
              ctx.quadraticCurveTo(vx + Math.sin(time * 3 + v) * 8, sy - 24 - bounce, vx + 4, sy - 30 - bounce); ctx.stroke();
            }
            ctx.fillStyle = '#22c55e'; ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(sx - 8, sy - 8 - bounce, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 8, sy - 8 - bounce, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          else if (enemyType === 'shadow_panther') {
            const run = Math.sin(time * 8) * 3;
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath(); ctx.ellipse(sx, sy - bounce + run * 0.3, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx - 16, sy - 6 - bounce, 8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx - 22, sy - 12 - bounce); ctx.lineTo(sx - 26, sy - 22 - bounce); ctx.lineTo(sx - 18, sy - 14 - bounce); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx - 12, sy - 12 - bounce); ctx.lineTo(sx - 10, sy - 22 - bounce); ctx.lineTo(sx - 16, sy - 14 - bounce); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sx + 20, sy - 2 - bounce); ctx.quadraticCurveTo(sx + 30, sy - 18 - bounce + Math.sin(time * 4) * 6, sx + 24, sy - 22 - bounce); ctx.stroke();
            ctx.fillStyle = '#a855f7'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.ellipse(sx - 20, sy - 8 - bounce, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx - 14, sy - 8 - bounce, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          else if (enemyType === 'obsidian_sentinel') {
            const pulse = Math.sin(time * 2) * 0.1;
            ctx.fillStyle = '#292524';
            ctx.beginPath(); ctx.rect(sx - 18, sy - 40 - bounce, 36, 48); ctx.fill();
            ctx.fillRect(sx - 28, sy - 35 - bounce, 56, 14);
            ctx.fillRect(sx - 10, sy - 52 - bounce, 20, 16);
            ctx.strokeStyle = `rgba(255,100,0,${0.6 + pulse})`; ctx.shadowColor = '#ff6400'; ctx.shadowBlur = 6; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx - 8, sy - 38 - bounce); ctx.lineTo(sx - 2, sy - 20 - bounce); ctx.lineTo(sx + 6, sy - 5 - bounce); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 10, sy - 35 - bounce); ctx.lineTo(sx + 4, sy - 15 - bounce); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ff6400'; ctx.shadowColor = '#ff6400'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(sx - 4, sy - 46 - bounce, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 4, sy - 46 - bounce, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          else if (enemyType === 'pyroclast') {
            const flicker = Math.sin(time * 10) * 3;
            ctx.fillStyle = `rgba(255,107,0,${0.2 + Math.sin(time * 6) * 0.1})`;
            ctx.beginPath(); ctx.arc(sx, sy - bounce, 26 + flicker, 0, Math.PI * 2); ctx.fill();
            const grad = ctx.createRadialGradient(sx, sy - bounce, 0, sx, sy - bounce, 20);
            grad.addColorStop(0, '#fff7ed'); grad.addColorStop(0.4, '#ff6b00'); grad.addColorStop(1, '#7f1d1d');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(sx, sy - bounce, 18, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
            for (let f = 0; f < 5; f++) {
              const a = (f / 5) * Math.PI * 2 + time * 3;
              ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 16, sy - bounce + Math.sin(a) * 16);
              ctx.lineTo(sx + Math.cos(a) * (26 + Math.sin(time * 8 + f) * 5), sy - bounce + Math.sin(a) * (26 + Math.sin(time * 8 + f) * 5)); ctx.stroke();
            }
            ctx.fillStyle = '#1c1917';
            ctx.beginPath(); ctx.arc(sx - 5, sy - 4 - bounce, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 5, sy - 4 - bounce, 3, 0, Math.PI * 2); ctx.fill();
          }
          else if (enemyType === 'glacier_elemental') {
            const shimmer = Math.sin(time * 3) * 0.15;
            ctx.fillStyle = `rgba(191,219,254,${0.8 + shimmer})`;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 6; ctx.lineTo(sx + Math.cos(a) * 28, sy - bounce + Math.sin(a) * 28); }
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#dbeafe';
            [[-12, -22], [0, -30], [12, -22]].forEach(([spx, spy]) => {
              ctx.beginPath(); ctx.moveTo(sx + spx - 6, sy + spy + 10 - bounce); ctx.lineTo(sx + spx, sy + spy - 12 - bounce); ctx.lineTo(sx + spx + 6, sy + spy + 10 - bounce); ctx.closePath(); ctx.fill();
            });
            ctx.fillStyle = 'rgba(96,165,250,0.3)'; ctx.beginPath(); ctx.arc(sx, sy - bounce, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1e3a5f';
            ctx.beginPath(); ctx.arc(sx - 7, sy - 4 - bounce, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 7, sy - 4 - bounce, 4, 0, Math.PI * 2); ctx.fill();
          }
          else if (enemyType === 'blizzard_phantom') {
            const drift = Math.sin(time * 3) * 4;
            const alpha = 0.6 + Math.sin(time * 4) * 0.2;
            ctx.fillStyle = `rgba(224,242,254,${alpha})`;
            ctx.beginPath(); ctx.ellipse(sx + drift, sy - bounce, 16, 22, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(186,230,253,${alpha * 0.5})`; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(sx - 8 + drift, sy + 10 - bounce); ctx.quadraticCurveTo(sx - 14 + drift, sy + 28 - bounce, sx - 20 + drift, sy + 34 - bounce); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 8 + drift, sy + 10 - bounce); ctx.quadraticCurveTo(sx + 14 + drift, sy + 28 - bounce, sx + 20 + drift, sy + 34 - bounce); ctx.stroke();
            ctx.fillStyle = '#e0f2fe';
            for (let p = 0; p < 6; p++) { const pa = time * 2 + p; const pr = 20 + Math.sin(time * 3 + p) * 5; ctx.beginPath(); ctx.arc(sx + Math.cos(pa) * pr + drift, sy - bounce + Math.sin(pa) * pr, 2, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = '#1e3a5f';
            ctx.beginPath(); ctx.arc(sx - 5 + drift, sy - 6 - bounce, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 5 + drift, sy - 6 - bounce, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#93c5fd';
            ctx.beginPath(); ctx.arc(sx - 5 + drift, sy - 6 - bounce, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 5 + drift, sy - 6 - bounce, 2, 0, Math.PI * 2); ctx.fill();
          }
          else if (enemyType === 'eldritch_horror') {
            const writhe = time * 2;
            ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4;
            for (let t = 0; t < 8; t++) {
              const a = (t / 8) * Math.PI * 2;
              ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 16, sy - bounce + Math.sin(a) * 16);
              ctx.quadraticCurveTo(sx + Math.cos(a) * 28 + Math.sin(writhe + t * 2) * 8, sy - bounce + Math.sin(a) * 28 + Math.cos(writhe + t * 2) * 8, sx + Math.cos(a) * 38, sy - bounce + Math.sin(a) * 38); ctx.stroke();
            }
            ctx.fillStyle = '#4c1d95'; ctx.shadowColor = '#7c3aed'; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(sx, sy - bounce, 20, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(sx, sy - bounce, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.ellipse(sx, sy - bounce, 5 + Math.sin(time * 3) * 2, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(sx, sy - bounce, 3, 8, 0, 0, Math.PI * 2); ctx.fill();
          }
          else if (enemyType === 'doom_stalker') {
            const stalk = Math.sin(time * 6) * 2;
            ctx.fillStyle = '#581c87';
            ctx.beginPath(); ctx.moveTo(sx, sy - 24 - bounce + stalk); ctx.lineTo(sx - 18, sy - 4 - bounce); ctx.lineTo(sx - 14, sy + 10 - bounce); ctx.lineTo(sx + 14, sy + 10 - bounce); ctx.lineTo(sx + 18, sy - 4 - bounce); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx - 16, sy - 2 - bounce); ctx.lineTo(sx, sy - 10 - bounce); ctx.lineTo(sx + 16, sy - 2 - bounce); ctx.stroke();
            ctx.fillStyle = '#7c3aed';
            ctx.beginPath(); ctx.moveTo(sx - 18, sy - 4 - bounce); ctx.lineTo(sx - 30, sy - 18 - bounce + Math.sin(time * 5) * 4); ctx.lineTo(sx - 20, sy - bounce); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + 18, sy - 4 - bounce); ctx.lineTo(sx + 30, sy - 18 - bounce + Math.sin(time * 5 + 1) * 4); ctx.lineTo(sx + 20, sy - bounce); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#c084fc'; ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(sx - 6, sy - 12 - bounce + stalk, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx + 6, sy - 12 - bounce + stalk, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          else if (enemyType === 'prismatic_hydra') {
            const sway = time * 1.5;
            ctx.fillStyle = '#7e22ce'; ctx.beginPath(); ctx.ellipse(sx, sy - bounce + 4, 24, 18, 0, 0, Math.PI * 2); ctx.fill();
            const headColors = ['#ec4899', '#a855f7', '#6366f1'];
            for (let h = 0; h < 3; h++) {
              const a = ((h - 1) / 3) * 1.2 + Math.sin(sway + h * 2) * 0.2;
              const neckLen = 28;
              const hx = sx + Math.sin(a) * neckLen;
              const hy = sy - bounce - 16 + Math.cos(a) * -neckLen * 0.4;
              ctx.strokeStyle = headColors[h]; ctx.lineWidth = 5;
              ctx.beginPath(); ctx.moveTo(sx, sy - 10 - bounce); ctx.quadraticCurveTo(sx + Math.sin(a) * neckLen * 0.5, hy + 10, hx, hy); ctx.stroke();
              ctx.fillStyle = headColors[h]; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
            }
          }
          else if (enemyType === 'crystal_sentinel') {
            const hover = Math.sin(time * 3) * 5;
            const spin = time * 2;
            ctx.fillStyle = '#f0abfc';
            for (let o = 0; o < 6; o++) {
              const a = spin + (o / 6) * Math.PI * 2;
              ctx.save(); ctx.translate(sx + Math.cos(a) * 24, sy - bounce + hover + Math.sin(a) * 24); ctx.rotate(a + time * 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();
            }
            ctx.fillStyle = '#d946ef'; ctx.beginPath();
            ctx.moveTo(sx, sy - 22 - bounce + hover); ctx.lineTo(sx - 14, sy - bounce + hover); ctx.lineTo(sx, sy + 14 - bounce + hover); ctx.lineTo(sx + 14, sy - bounce + hover); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = 'rgba(240,171,252,0.4)'; ctx.beginPath(); ctx.arc(sx, sy - 4 - bounce + hover, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.shadowColor = '#f0abfc'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(sx, sy - 6 - bounce + hover, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          }
          else {
            // Default circle enemy (fallback)
            ctx.beginPath();
            ctx.arc(sx, sy - bounce, r || 14, 0, Math.PI * 2);
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
          const radius = isBoss ? 150 : 22;
          
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
        // ========== VOIDLORD SPELLS ==========
        else if (ownerClass === 'voidlord') {
          if (spellId === 'voidBolt') {
            // Void Bolt - dark energy with swirling void particles
            const pulse = Math.sin(time * 15) * 0.15 + 1;
            
            // Outer void distortion field
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 25, 0, Math.PI * 2);
            const voidField = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 25);
            voidField.addColorStop(0, 'rgba(255,0,255,0.3)');
            voidField.addColorStop(0.5, 'rgba(26,10,46,0.2)');
            voidField.addColorStop(1, 'transparent');
            ctx.fillStyle = voidField;
            ctx.fill();
            
            // Swirling void particles
            for (let i = 0; i < 6; i++) {
              const angle = time * 8 + (i * Math.PI * 2 / 6);
              const dist = baseRadius + 8 + Math.sin(time * 12 + i) * 4;
              const vx = px + Math.cos(angle) * dist;
              const vy = py + Math.sin(angle) * dist;
              const pSize = 2.5 + Math.sin(time * 10 + i * 2) * 1;
              ctx.beginPath();
              ctx.arc(vx, vy, pSize, 0, Math.PI * 2);
              ctx.fillStyle = i % 2 === 0 ? '#ff00ff' : '#bf00ff';
              ctx.fill();
            }
            
            // Inner void ring
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,0,255,0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Core - dark void center with magenta edge
            ctx.beginPath();
            ctx.arc(px, py, baseRadius * pulse, 0, Math.PI * 2);
            const voidCore = ctx.createRadialGradient(px, py, 0, px, py, baseRadius);
            voidCore.addColorStop(0, '#000');
            voidCore.addColorStop(0.5, '#1a0a2e');
            voidCore.addColorStop(0.8, '#8b00ff');
            voidCore.addColorStop(1, '#ff00ff');
            ctx.fillStyle = voidCore;
            ctx.fill();
            
            // Eye of void center
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
          } else if (spellId === 'annihilate') {
            // Annihilate AOE - massive void explosion
            const expand = Math.sin(time * 6) * 0.2 + 1;
            ctx.beginPath();
            ctx.arc(px, py, baseRadius * expand, 0, Math.PI * 2);
            const aniGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius * expand);
            aniGrad.addColorStop(0, 'rgba(0,0,0,0.8)');
            aniGrad.addColorStop(0.4, 'rgba(139,0,255,0.6)');
            aniGrad.addColorStop(0.7, 'rgba(255,0,255,0.3)');
            aniGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = aniGrad;
            ctx.fill();
            
            // Lightning tendrils
            for (let i = 0; i < 8; i++) {
              const angle = time * 3 + (i * Math.PI / 4);
              const len = baseRadius * 0.7;
              ctx.beginPath();
              ctx.moveTo(px, py);
              const mx = px + Math.cos(angle + Math.sin(time * 20 + i) * 0.3) * len * 0.5;
              const my = py + Math.sin(angle + Math.sin(time * 20 + i) * 0.3) * len * 0.5;
              ctx.quadraticCurveTo(mx, my, px + Math.cos(angle) * len, py + Math.sin(angle) * len);
              ctx.strokeStyle = `rgba(255,0,255,${0.3 + Math.sin(time * 15 + i) * 0.2})`;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          } else {
            // Other voidlord spells (soul drain etc)
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 10, 0, Math.PI * 2);
            const vGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 10);
            vGrad.addColorStop(0, '#ff00ff');
            vGrad.addColorStop(0.5, '#8b00ff');
            vGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = vGrad;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#1a0a2e';
            ctx.fill();
          }
        }
        // ========== SHADOW ARCHER SPELLS ==========
        else if (ownerClass === 'shadowarcher') {
          if (spellId === 'shadowArrow' || spellId === 'huntersMark' || spellId === 'deathArrow') {
            // Arrow projectile - elongated with trail
            const angle = Math.atan2(proj.vy || 0, proj.vx || 0);
            const isDeathArrow = spellId === 'deathArrow';
            const isHuntersMark = spellId === 'huntersMark';
            const arrowLen = isDeathArrow ? 28 : 18;
            const pulse = Math.sin(time * 12) * 0.15 + 1;
            
            // Trailing shadow particles
            for (let i = 1; i <= 4; i++) {
              const trailX = px - Math.cos(angle) * i * 8;
              const trailY = py - Math.sin(angle) * i * 8;
              const trailAlpha = 0.4 - i * 0.08;
              ctx.beginPath();
              ctx.arc(trailX, trailY, 3 - i * 0.5, 0, Math.PI * 2);
              ctx.fillStyle = isDeathArrow 
                ? `rgba(220,38,38,${trailAlpha})` 
                : isHuntersMark 
                  ? `rgba(220,38,38,${trailAlpha})`
                  : `rgba(15,23,42,${trailAlpha + 0.1})`;
              ctx.fill();
            }
            
            // Outer glow
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + (isDeathArrow ? 18 : 10), 0, Math.PI * 2);
            const arrowGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + (isDeathArrow ? 18 : 10));
            arrowGlow.addColorStop(0, isDeathArrow ? 'rgba(220,38,38,0.5)' : 'rgba(220,38,38,0.25)');
            arrowGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = arrowGlow;
            ctx.fill();
            
            // Arrow shaft
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            
            // Shaft body
            ctx.beginPath();
            ctx.moveTo(-arrowLen, 0);
            ctx.lineTo(arrowLen * 0.5, 0);
            ctx.strokeStyle = isDeathArrow ? '#000' : '#0f172a';
            ctx.lineWidth = isDeathArrow ? 3 : 2;
            ctx.stroke();
            
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(arrowLen * 0.5 + 6, 0);
            ctx.lineTo(arrowLen * 0.5 - 2, -4);
            ctx.lineTo(arrowLen * 0.5 - 2, 4);
            ctx.closePath();
            ctx.fillStyle = isDeathArrow ? '#dc2626' : '#991b1b';
            ctx.fill();
            
            // Fletching
            ctx.beginPath();
            ctx.moveTo(-arrowLen, -3);
            ctx.lineTo(-arrowLen + 6, 0);
            ctx.lineTo(-arrowLen, 3);
            ctx.fillStyle = isDeathArrow ? '#dc2626' : '#64748b';
            ctx.fill();
            
            ctx.restore();
            
            // Death Arrow: spinning dark runes around it
            if (isDeathArrow) {
              for (let i = 0; i < 4; i++) {
                const runeAngle = time * 6 + (i * Math.PI / 2);
                const dist = baseRadius + 10;
                const rx = px + Math.cos(runeAngle) * dist;
                const ry = py + Math.sin(runeAngle) * dist;
                ctx.beginPath();
                ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(220,38,38,${0.5 + Math.sin(time * 10 + i) * 0.3})`;
                ctx.fill();
              }
            }
            
            // Hunter's Mark: pulsing red crosshair effect
            if (isHuntersMark) {
              ctx.strokeStyle = `rgba(220,38,38,${0.3 + Math.sin(time * 8) * 0.2})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(px, py, baseRadius + 8 * pulse, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else if (spellId === 'piercingVolley') {
            // Volley AOE - rain of arrows effect
            const expand = Math.sin(time * 5) * 0.15 + 1;
            ctx.beginPath();
            ctx.arc(px, py, baseRadius * expand, 0, Math.PI * 2);
            const volGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius * expand);
            volGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
            volGrad.addColorStop(0.5, 'rgba(220,38,38,0.3)');
            volGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = volGrad;
            ctx.fill();
            
            // Arrow rain particles
            for (let i = 0; i < 8; i++) {
              const aAngle = time * 2 + (i * Math.PI / 4);
              const dist = baseRadius * 0.3 + Math.sin(time * 8 + i * 3) * baseRadius * 0.4;
              const ax = px + Math.cos(aAngle) * dist;
              const ay = py + Math.sin(aAngle) * dist;
              ctx.save();
              ctx.translate(ax, ay);
              ctx.rotate(-Math.PI / 4 + Math.sin(time * 5 + i) * 0.3);
              ctx.beginPath();
              ctx.moveTo(-5, 0);
              ctx.lineTo(5, 0);
              ctx.strokeStyle = `rgba(220,38,38,${0.5 + Math.sin(time * 10 + i) * 0.3})`;
              ctx.lineWidth = 1.5;
              ctx.stroke();
              // Tiny arrowhead
              ctx.beginPath();
              ctx.moveTo(5, 0);
              ctx.lineTo(3, -2);
              ctx.lineTo(3, 2);
              ctx.closePath();
              ctx.fillStyle = '#dc2626';
              ctx.fill();
              ctx.restore();
            }
          } else {
            // Default shadow archer spell
            ctx.beginPath();
            ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = proj.color || '#0f172a';
            ctx.fill();
          }
        }
        // ========== BRUTE SPELLS ==========
        else if (ownerClass === 'brute') {
          if (spellId === 'dumbbellThrow') {
            // Spinning dumbbell projectile
            const angle = time * 12; // Fast spin
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            // Bar
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(-14, -2, 28, 4);
            // Weights (golden)
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(-14, 0, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(14, 0, 6, 0, Math.PI * 2); ctx.fill();
            // Weight shine
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath(); ctx.arc(-14, -2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(14, -2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            // Trail
            for (let i = 1; i <= 3; i++) {
              const trailAngle = Math.atan2(proj.vy || 0, proj.vx || 0);
              const tx = px - Math.cos(trailAngle) * i * 10;
              const ty = py - Math.sin(trailAngle) * i * 10;
              ctx.beginPath();
              ctx.arc(tx, ty, 4 - i, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(251,191,36,${0.3 - i * 0.08})`;
              ctx.fill();
            }
            // Impact glow
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 8, 0, Math.PI * 2);
            const dbGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 8);
            dbGlow.addColorStop(0, 'rgba(251,191,36,0.4)');
            dbGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = dbGlow;
            ctx.fill();
          } else if (spellId === 'groundPound' || spellId === 'barbellSpin' || spellId === 'ultimateFlex') {
            // AOE shockwave - golden expanding ring
            const expand = Math.sin(time * 6) * 0.1 + 1;
            ctx.beginPath();
            ctx.arc(px, py, baseRadius * expand, 0, Math.PI * 2);
            const gpGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius * expand);
            gpGrad.addColorStop(0, 'rgba(251,191,36,0.5)');
            gpGrad.addColorStop(0.3, 'rgba(180,83,9,0.3)');
            gpGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = gpGrad;
            ctx.fill();
            // Crack lines radiating outward
            ctx.strokeStyle = 'rgba(251,191,36,0.6)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 + time;
              ctx.beginPath();
              ctx.moveTo(px + Math.cos(a) * baseRadius * 0.2, py + Math.sin(a) * baseRadius * 0.2);
              ctx.lineTo(px + Math.cos(a) * baseRadius * 0.7 * expand, py + Math.sin(a) * baseRadius * 0.7 * expand);
              ctx.stroke();
            }
            // Flying dumbbells for barbell spin
            if (spellId === 'barbellSpin') {
              for (let i = 0; i < 4; i++) {
                const a = time * 5 + (i * Math.PI / 2);
                const d = baseRadius * 0.5;
                const dx = px + Math.cos(a) * d;
                const dy = py + Math.sin(a) * d;
                ctx.fillStyle = '#9ca3af';
                ctx.fillRect(dx - 5, dy - 1.5, 10, 3);
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(dx - 5, dy, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(dx + 5, dy, 3, 0, Math.PI * 2); ctx.fill();
              }
            }
          } else {
            // Default brute spell
            ctx.beginPath();
            ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = proj.color || '#fbbf24';
            ctx.fill();
          }
        }
        // ========== SWORDSMAN SPELLS ==========
        else if (ownerClass === 'swordsman') {
          if (spellId === 'daggerThrow') {
            // Spinning dagger
            const spin = time * 12;
            // Trail
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 6, 0, Math.PI * 2);
            const slashGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 6);
            slashGlow.addColorStop(0, `rgba(148,163,184,${0.4 + glowBonus * 0.2})`);
            slashGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = slashGlow;
            ctx.fill();
            // Blade shape (elongated diamond)
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(spin);
            ctx.beginPath();
            ctx.moveTo(0, -baseRadius * 1.8);
            ctx.lineTo(baseRadius * 0.4, 0);
            ctx.lineTo(0, baseRadius * 1.8);
            ctx.lineTo(-baseRadius * 0.4, 0);
            ctx.closePath();
            const bladeGrad = ctx.createLinearGradient(0, -baseRadius, 0, baseRadius);
            bladeGrad.addColorStop(0, '#e2e8f0');
            bladeGrad.addColorStop(0.5, '#fff');
            bladeGrad.addColorStop(1, '#94a3b8');
            ctx.fillStyle = bladeGrad;
            ctx.fill();
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
          } else if (spellId === 'axeHurl') {
            // Spinning heavy axe
            const spin = time * 8;
            // Glow
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 10, 0, Math.PI * 2);
            const axeGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 10);
            axeGlow.addColorStop(0, `rgba(192,192,192,${0.3 + glowBonus * 0.15})`);
            axeGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = axeGlow;
            ctx.fill();
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(spin);
            // Handle
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-1.5, -baseRadius * 1.2, 3, baseRadius * 2.4);
            // Axe head (double sided)
            ctx.fillStyle = '#c0c0c0';
            ctx.beginPath();
            ctx.moveTo(1, -baseRadius * 0.8);
            ctx.quadraticCurveTo(baseRadius * 1.5, -baseRadius * 0.5, baseRadius * 1.3, 0);
            ctx.quadraticCurveTo(baseRadius * 1.5, baseRadius * 0.5, 1, baseRadius * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-1, -baseRadius * 0.8);
            ctx.quadraticCurveTo(-baseRadius * 1.5, -baseRadius * 0.5, -baseRadius * 1.3, 0);
            ctx.quadraticCurveTo(-baseRadius * 1.5, baseRadius * 0.5, -1, baseRadius * 0.8);
            ctx.closePath();
            ctx.fill();
            // Edge highlight
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
          } else {
            // Default swordsman: steel arc slash
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(time * 6);
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius, -0.8, 0.8);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fillStyle = '#e2e8f0';
            ctx.fill();
            ctx.restore();
          }
        }
        // ========== CUSTOM WIZARD / DEFAULT SPELLS ==========
        else {
          const shape = proj.projectileShape || 'orb';
          const pColor = proj.color || '#fff';
          
          if (shape === 'bolt') {
            // Elongated energy bolt
            const angle = Math.atan2(proj.vy || 0, proj.vx || 0);
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            // Trail glow
            ctx.beginPath();
            ctx.ellipse(0, 0, baseRadius + 12, baseRadius + 4, 0, 0, Math.PI * 2);
            const bGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius + 12);
            bGlow.addColorStop(0, pColor + '60');
            bGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = bGlow;
            ctx.fill();
            // Core bolt shape
            ctx.beginPath();
            ctx.moveTo(baseRadius + 6, 0);
            ctx.lineTo(0, -baseRadius * 0.6);
            ctx.lineTo(-baseRadius - 3, 0);
            ctx.lineTo(0, baseRadius * 0.6);
            ctx.closePath();
            ctx.fillStyle = pColor;
            ctx.fill();
            // White core
            ctx.beginPath();
            ctx.ellipse(2, 0, baseRadius * 0.5, baseRadius * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.restore();
          } else if (shape === 'thrown') {
            // Spinning thrown object (pizza slice, chair, rock, etc.)
            const spin = time * 10;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(spin);
            // Outer glow
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius + 8, 0, Math.PI * 2);
            const tGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius + 8);
            tGlow.addColorStop(0, pColor + '40');
            tGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = tGlow;
            ctx.fill();
            // Irregular thrown shape (chunky, asymmetric)
            ctx.fillStyle = pColor;
            ctx.beginPath();
            ctx.moveTo(-baseRadius, -baseRadius * 0.5);
            ctx.lineTo(-baseRadius * 0.3, -baseRadius);
            ctx.lineTo(baseRadius * 0.8, -baseRadius * 0.6);
            ctx.lineTo(baseRadius, baseRadius * 0.3);
            ctx.lineTo(baseRadius * 0.2, baseRadius);
            ctx.lineTo(-baseRadius * 0.7, baseRadius * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            // Detail dot
            ctx.fillStyle = proj.trailColor || '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (shape === 'shard') {
            // Angular crystal shard
            const spin = time * 4;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(spin);
            // Glow
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius + 10, 0, Math.PI * 2);
            const sGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius + 10);
            sGlow.addColorStop(0, pColor + '50');
            sGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = sGlow;
            ctx.fill();
            // Crystal shape (elongated diamond)
            ctx.fillStyle = pColor;
            ctx.beginPath();
            ctx.moveTo(0, -baseRadius - 4);
            ctx.lineTo(baseRadius * 0.6, -2);
            ctx.lineTo(baseRadius * 0.3, baseRadius + 2);
            ctx.lineTo(-baseRadius * 0.3, baseRadius + 2);
            ctx.lineTo(-baseRadius * 0.6, -2);
            ctx.closePath();
            ctx.fill();
            // Facet highlight
            ctx.fillStyle = '#ffffff80';
            ctx.beginPath();
            ctx.moveTo(0, -baseRadius - 2);
            ctx.lineTo(baseRadius * 0.3, -1);
            ctx.lineTo(0, baseRadius * 0.5);
            ctx.lineTo(-baseRadius * 0.15, -1);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else if (shape === 'wisp') {
            // Ghostly trail wisp
            const flicker = Math.sin(time * 8 + px * 0.1) * 0.3 + 0.7;
            // Outer ghost trail
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 12, 0, Math.PI * 2);
            const wGlow = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 12);
            wGlow.addColorStop(0, pColor + '50');
            wGlow.addColorStop(0.5, pColor + '20');
            wGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = wGlow;
            ctx.fill();
            // Flickering core (asymmetric)
            ctx.beginPath();
            ctx.ellipse(px, py, baseRadius * flicker, baseRadius * (1.3 - flicker * 0.3), time * 2, 0, Math.PI * 2);
            ctx.fillStyle = pColor + 'cc';
            ctx.fill();
            // Inner bright spot
            ctx.beginPath();
            ctx.arc(px + Math.sin(time * 6) * 2, py + Math.cos(time * 5) * 2, baseRadius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
          } else if (shape === 'arrow') {
            // Pointed arrow/dart
            const angle = Math.atan2(proj.vy || 0, proj.vx || 0);
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            // Trail
            ctx.beginPath();
            ctx.ellipse(-4, 0, baseRadius + 6, baseRadius * 0.4, 0, 0, Math.PI * 2);
            const arGlow = ctx.createRadialGradient(-4, 0, 0, -4, 0, baseRadius + 6);
            arGlow.addColorStop(0, pColor + '40');
            arGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = arGlow;
            ctx.fill();
            // Arrow body
            ctx.fillStyle = pColor;
            ctx.beginPath();
            ctx.moveTo(baseRadius + 8, 0);
            ctx.lineTo(baseRadius, -baseRadius * 0.5);
            ctx.lineTo(-baseRadius - 2, -baseRadius * 0.25);
            ctx.lineTo(-baseRadius - 2, baseRadius * 0.25);
            ctx.lineTo(baseRadius, baseRadius * 0.5);
            ctx.closePath();
            ctx.fill();
            // Tip highlight
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(baseRadius + 8, 0);
            ctx.lineTo(baseRadius + 2, -2);
            ctx.lineTo(baseRadius + 2, 2);
            ctx.closePath();
            ctx.fill();
            // Fletching
            ctx.fillStyle = proj.trailColor || pColor;
            ctx.beginPath();
            ctx.moveTo(-baseRadius, -baseRadius * 0.25);
            ctx.lineTo(-baseRadius - 5, -baseRadius * 0.6);
            ctx.lineTo(-baseRadius + 3, -baseRadius * 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-baseRadius, baseRadius * 0.25);
            ctx.lineTo(-baseRadius - 5, baseRadius * 0.6);
            ctx.lineTo(-baseRadius + 3, baseRadius * 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else {
            // Default orb shape
            ctx.beginPath();
            ctx.arc(px, py, baseRadius + 10, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius + 10);
            grad.addColorStop(0, pColor);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
          }
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

      // Collectible Items (quest items)
      for (const col of collectibles || []) {
        const colX = col.x - cx;
        const colY = col.y - cy;
        if (colX < -30 || colX > width + 30 || colY < -30 || colY > height + 30) continue;

        const pulse = Math.sin(Date.now() / 300 + col.x * 0.1) * 0.3 + 0.7;
        const bob = Math.sin(Date.now() / 500 + col.y * 0.05) * 4;

        // Glow ring
        ctx.beginPath();
        ctx.arc(colX, colY + bob, 16, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(colX, colY + bob, 0, colX, colY + bob, 16);
        glow.addColorStop(0, col.color + 'aa');
        glow.addColorStop(0.6, col.color + '44');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fill();

        // Core sparkle
        ctx.beginPath();
        ctx.arc(colX, colY + bob, 8, 0, Math.PI * 2);
        ctx.fillStyle = col.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Floating sparkle particles
        for (let s = 0; s < 3; s++) {
          const angle = (Date.now() / 800 + s * 2.1) % (Math.PI * 2);
          const dist = 10 + Math.sin(Date.now() / 400 + s) * 4;
          ctx.beginPath();
          ctx.arc(colX + Math.cos(angle) * dist, colY + bob + Math.sin(angle) * dist, 1.5 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
        }
      }

      // Players
      for (const player of players || []) {
        if (player.health <= 0) continue;
        const isMe = player.id === playerIdRef.current;
        // Use predicted position for self, server position for others
        const playerWorldX = isMe ? predictedPosRef.current.x : player.x;
        const playerWorldY = isMe ? predictedPosRef.current.y : player.y;
        const px = playerWorldX - cx;
        const py = playerWorldY - cy;
        if (px < -50 || px > width + 50 || py < -50 || py > height + 50) continue;
        // Use skin color if available, otherwise class color, or custom wizard color
        const skin = DEFAULT_SKINS.find(s => s.id === player.selectedSkin);
        const classColor = player.customColor || skin?.color || (classes[player.class] || DEFAULT_CLASSES[player.class])?.color || '#fff';
        const secondaryColor = player.customSecondaryColor || skin?.secondaryColor || classColor;
        const isVoidlord = player.class === 'voidlord';
        const isShadowArcher = player.class === 'shadowarcher';
        const isBrute = player.class === 'brute';
        const isSwordsman = player.class === 'swordsman';
        const isCustomWizard = player.isCustomWizard || false;
        const isSpecialClass = isVoidlord || isShadowArcher || isBrute || isSwordsman || isCustomWizard;
        const customBodyStyle = isCustomWizard ? (player.customBodyStyle || 'wizard') : null;
        const customHeadgear = isCustomWizard ? (player.customHeadgear || 'pointyHat') : null;
        const bob = player.state === 'walk' ? Math.sin((player.animFrame || 0) * Math.PI / 2) * 2 : 0;
        const time = Date.now() / 1000;
        
        // ========== SKIN EFFECTS ==========
        
        // AURA EFFECT (glowing ring around player)
        if (skin?.aura) {
          const auraRadius = skin.aura.radius || 30;
          const auraColor = skin.aura.color || classColor;
          const pulse = skin.aura.pulse ? Math.sin(time * 3) * 5 : 0;
          
          const gradient = ctx.createRadialGradient(px, py, 0, px, py, auraRadius + pulse);
          gradient.addColorStop(0, `${auraColor}40`);
          gradient.addColorStop(0.5, `${auraColor}20`);
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(px, py, auraRadius + pulse, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
        
        // WINGS EFFECT (feathered/energy wings)
        if (skin?.wings) {
          const wingSpread = 12 + Math.sin(time * 4) * 3;
          const wingColor = secondaryColor;
          
          // Left wing
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = wingColor;
          ctx.beginPath();
          ctx.moveTo(px - 10, py - 5);
          ctx.quadraticCurveTo(px - 35 - wingSpread, py - 25, px - 40 - wingSpread, py - 5);
          ctx.quadraticCurveTo(px - 35 - wingSpread, py + 10, px - 10, py + 5);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = classColor;
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Right wing
          ctx.beginPath();
          ctx.moveTo(px + 10, py - 5);
          ctx.quadraticCurveTo(px + 35 + wingSpread, py - 25, px + 40 + wingSpread, py - 5);
          ctx.quadraticCurveTo(px + 35 + wingSpread, py + 10, px + 10, py + 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        
        // HALO EFFECT (floating ring above head)
        if (skin?.halo) {
          const haloY = py - 50 - bob + Math.sin(time * 2) * 2;
          ctx.save();
          ctx.strokeStyle = '#fcd34d';
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.ellipse(px, haloY, 12, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        
        // CROWN EFFECT
        if (skin?.crown) {
          ctx.save();
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          
          // Crown base
          const crownY = py - 42 - bob;
          ctx.beginPath();
          ctx.moveTo(px - 8, crownY);
          ctx.lineTo(px - 10, crownY - 8);
          ctx.lineTo(px - 5, crownY - 4);
          ctx.lineTo(px, crownY - 12);
          ctx.lineTo(px + 5, crownY - 4);
          ctx.lineTo(px + 10, crownY - 8);
          ctx.lineTo(px + 8, crownY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Gems
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(px, crownY - 9, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        // HORNS EFFECT
        if (skin?.horns) {
          ctx.save();
          ctx.fillStyle = '#1f1f1f';
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 1;
          
          // Left horn
          ctx.beginPath();
          ctx.moveTo(px - 12, py - 22 - bob);
          ctx.quadraticCurveTo(px - 18, py - 35 - bob, px - 22, py - 45 - bob);
          ctx.lineTo(px - 14, py - 22 - bob);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Right horn
          ctx.beginPath();
          ctx.moveTo(px + 12, py - 22 - bob);
          ctx.quadraticCurveTo(px + 18, py - 35 - bob, px + 22, py - 45 - bob);
          ctx.lineTo(px + 14, py - 22 - bob);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        
        // ICE ARMOR EFFECT
        if (skin?.iceArmor) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = '#67e8f9';
          ctx.lineWidth = 3;
          
          // Draw crystalline armor overlay
          ctx.beginPath();
          ctx.moveTo(px - 16, py + 14);
          ctx.lineTo(px - 20, py - 5);
          ctx.lineTo(px - 12, py - 15 - bob);
          ctx.lineTo(px, py - 20 - bob);
          ctx.lineTo(px + 12, py - 15 - bob);
          ctx.lineTo(px + 20, py - 5);
          ctx.lineTo(px + 16, py + 14);
          ctx.stroke();
          ctx.restore();
        }
        
        // FLOATING RUNES EFFECT
        if (skin?.floatingRunes) {
          ctx.save();
          ctx.font = 'bold 8px sans-serif';
          ctx.fillStyle = secondaryColor;
          ctx.globalAlpha = 0.6 + Math.sin(time * 2) * 0.3;
          
          const runes = ['✧', '⚝', '✦', '⟡'];
          for (let i = 0; i < 4; i++) {
            const angle = time + (i * Math.PI / 2);
            const runeX = px + Math.cos(angle) * 28;
            const runeY = py - 5 + Math.sin(angle) * 18 + Math.sin(time * 3 + i) * 3;
            ctx.fillText(runes[i], runeX, runeY);
          }
          ctx.restore();
        }
        
        // CLOCKWORK EFFECT (for Chronomancer skin)
        if (skin?.clockwork) {
          ctx.save();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.5;
          
          // Rotating gear
          const gearX = px + 20;
          const gearY = py - 10;
          ctx.translate(gearX, gearY);
          ctx.rotate(time * 2);
          
          // Draw gear teeth
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const innerR = 6;
            const outerR = 10;
            ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
            ctx.lineTo(Math.cos(angle + 0.2) * innerR, Math.sin(angle + 0.2) * innerR);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
        
        // PARTICLE TRAIL (spawn when moving)
        if (skin?.trail && player.state === 'walk') {
          const trailColor = skin.trail.color || classColor;
          const particleCount = skin.trail.particles || 2;
          const particleSize = skin.trail.size || 3;
          
          // Add trail particles to effects
          if (Math.random() < 0.4) {
            for (let i = 0; i < particleCount; i++) {
              effectsRef.current.push({
                type: 'skinTrail',
                x: player.x + (Math.random() - 0.5) * 10,
                y: player.y + (Math.random() - 0.5) * 10 + 5,
                color: trailColor,
                size: particleSize + Math.random() * 2,
                startTime: Date.now(),
                duration: 500,
                snowflake: skin.trail.snowflakes,
                star: skin.trail.stars,
              });
            }
          }
        }

        // Voidlord special aura (legacy - now handled by skin system too)
        if (isVoidlord && !skin?.aura) {
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

        // Shadow Archer special aura
        if (isShadowArcher && !skin?.aura) {
          const pulseSize = 30 + Math.sin(time * 4) * 5;
          
          // Dark crimson aura
          const saGrad = ctx.createRadialGradient(px, py, 0, px, py, pulseSize);
          saGrad.addColorStop(0, 'rgba(220,38,38,0.2)');
          saGrad.addColorStop(0.5, 'rgba(15,23,42,0.15)');
          saGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = saGrad;
          ctx.fill();
          
          // Orbiting shadow wisps
          for (let i = 0; i < 3; i++) {
            const angle = time * 3 + (i * Math.PI * 2 / 3);
            const orbitX = px + Math.cos(angle) * 22;
            const orbitY = py + Math.sin(angle) * 12 - 8;
            ctx.beginPath();
            ctx.arc(orbitX, orbitY, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220,38,38,${0.4 + Math.sin(time * 5 + i) * 0.2})`;
            ctx.fill();
          }
        }

        // The Brute special aura - golden muscle energy
        if (isBrute && !skin?.aura) {
          const pulseSize = 35 + Math.sin(time * 3) * 8;
          const bruteGrad = ctx.createRadialGradient(px, py, 0, px, py, pulseSize);
          bruteGrad.addColorStop(0, 'rgba(251,191,36,0.25)');
          bruteGrad.addColorStop(0.5, 'rgba(180,83,9,0.15)');
          bruteGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = bruteGrad;
          ctx.fill();
          // Floating dumbbells orbiting
          for (let i = 0; i < 2; i++) {
            const angle = time * 2.5 + i * Math.PI;
            const ox = px + Math.cos(angle) * 24;
            const oy = py + Math.sin(angle) * 10 - 5;
            ctx.fillStyle = '#6b7280';
            ctx.fillRect(ox - 6, oy - 1.5, 12, 3);
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(ox - 6, oy, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(ox + 6, oy, 3, 0, Math.PI * 2); ctx.fill();
          }
        }

        // Swordsman steel aura
        if (isSwordsman && !skin?.aura) {
          const swordPulse = 28 + Math.sin(time * 3) * 5;
          const swordGrad = ctx.createRadialGradient(px, py, 0, px, py, swordPulse);
          swordGrad.addColorStop(0, 'rgba(148,163,184,0.2)');
          swordGrad.addColorStop(0.5, 'rgba(100,116,139,0.1)');
          swordGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(px, py, swordPulse, 0, Math.PI * 2);
          ctx.fillStyle = swordGrad;
          ctx.fill();
          // Spinning blade sparks
          for (let i = 0; i < 3; i++) {
            const angle = time * 3 + i * Math.PI * 2 / 3;
            const sx = px + Math.cos(angle) * 20;
            const sy = py + Math.sin(angle) * 10 - 4;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(time * 6 + i);
            ctx.fillStyle = '#e2e8f0';
            ctx.globalAlpha = 0.5 + Math.sin(time * 4 + i) * 0.3;
            ctx.fillRect(-3, -0.5, 6, 1);
            ctx.fillRect(-0.5, -3, 1, 6);
            ctx.restore();
          }
        }

        // Custom AI Wizard special aura - themed glow + orbiting sparkles
        if (isCustomWizard && !isVoidlord && !isShadowArcher && !isBrute && !isSwordsman && !skin?.aura) {
          const cwColor = player.customColor || classColor;
          const pulseSize = 32 + Math.sin(time * 2.5) * 6;
          
          // Themed aura glow
          const cwGrad = ctx.createRadialGradient(px, py, 0, px, py, pulseSize);
          cwGrad.addColorStop(0, cwColor + '35');
          cwGrad.addColorStop(0.5, cwColor + '18');
          cwGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = cwGrad;
          ctx.fill();
          
          // Orbiting sparkle particles (3 particles, rotating)
          for (let i = 0; i < 3; i++) {
            const angle = time * 2 + (i * Math.PI * 2 / 3);
            const orbitX = px + Math.cos(angle) * 22;
            const orbitY = py + Math.sin(angle) * 13 - 6;
            const sparkleSize = 2.5 + Math.sin(time * 4 + i * 2) * 1;
            
            // Diamond/star shape
            ctx.save();
            ctx.translate(orbitX, orbitY);
            ctx.rotate(time * 3 + i);
            ctx.fillStyle = cwColor;
            ctx.globalAlpha = 0.6 + Math.sin(time * 3 + i) * 0.3;
            ctx.beginPath();
            ctx.moveTo(0, -sparkleSize);
            ctx.lineTo(sparkleSize * 0.4, 0);
            ctx.lineTo(0, sparkleSize);
            ctx.lineTo(-sparkleSize * 0.4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }

        // Shadow
        ctx.beginPath();
        ctx.ellipse(px, py + 12, isSpecialClass ? 20 : 16, isSpecialClass ? 10 : 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = isVoidlord ? 'rgba(255,0,255,0.4)' : isShadowArcher ? 'rgba(220,38,38,0.35)' : isBrute ? 'rgba(180,83,9,0.4)' : isCustomWizard ? (player.customColor || classColor) + '40' : 'rgba(0,0,0,0.3)';
        ctx.fill();

        // Body (Robe for wizards, cloak for archer, muscular torso for brute, armored for swordsman)
        const cwColor = player.customColor || classColor;
        const bodyType = isBrute ? 'hulk' : isSwordsman ? 'warrior' : isShadowArcher ? 'archer' : 
          isCustomWizard ? (customBodyStyle || 'wizard') : 'wizard';
        
        ctx.fillStyle = isVoidlord ? '#1a0a2e' : isShadowArcher ? '#0f172a' : isBrute ? '#d4a574' : 
          isSwordsman ? '#64748b' : isCustomWizard ? cwColor : classColor;
        ctx.beginPath();
        
        if (bodyType === 'hulk') {
          // Muscular V-shaped torso
          ctx.moveTo(px - 16, py + 14);
          ctx.lineTo(px - 18, py - 2 - bob);
          ctx.quadraticCurveTo(px - 14, py - 12 - bob, px, py - 14 - bob);
          ctx.quadraticCurveTo(px + 14, py - 12 - bob, px + 18, py - 2 - bob);
          ctx.lineTo(px + 16, py + 14);
          ctx.closePath();
          ctx.fill();
          // Chest definition
          ctx.strokeStyle = isBrute ? '#c49560' : cwColor + '80';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px, py - 12 - bob); ctx.lineTo(px, py + 8); ctx.stroke();
          ctx.beginPath(); ctx.arc(px - 6, py - 6 - bob, 5, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(px + 6, py - 6 - bob, 5, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px - 5, py + 2); ctx.lineTo(px + 5, py + 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px - 4, py + 7); ctx.lineTo(px + 4, py + 7); ctx.stroke();
          // Buff arms
          ctx.fillStyle = isBrute ? '#d4a574' : cwColor;
          ctx.beginPath();
          ctx.moveTo(px - 18, py - 4 - bob);
          ctx.quadraticCurveTo(px - 28, py - 12 - bob, px - 24, py - 20 - bob);
          ctx.lineTo(px - 20, py - 18 - bob);
          ctx.quadraticCurveTo(px - 24, py - 8 - bob, px - 16, py - 2 - bob);
          ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(px + 18, py - 4 - bob);
          ctx.quadraticCurveTo(px + 28, py - 12 - bob, px + 24, py - 20 - bob);
          ctx.lineTo(px + 20, py - 18 - bob);
          ctx.quadraticCurveTo(px + 24, py - 8 - bob, px + 16, py - 2 - bob);
          ctx.closePath(); ctx.fill();
          // Bicep highlights
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath(); ctx.arc(px - 24, py - 14 - bob, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px + 24, py - 14 - bob, 4, 0, Math.PI * 2); ctx.fill();
          // Shorts/belt
          ctx.fillStyle = isBrute ? '#1e293b' : '#1e1e1e';
          ctx.fillRect(px - 12, py + 8, 24, 8);
          ctx.fillStyle = isBrute ? '#fbbf24' : cwColor;
          ctx.fillRect(px - 13, py + 7, 26, 3);
          ctx.fillStyle = isBrute ? '#f59e0b' : secondaryColor;
          ctx.fillRect(px - 3, py + 6, 6, 4);
          // Glow edge
          ctx.strokeStyle = isBrute ? '#fbbf24' : cwColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px - 16, py + 14);
          ctx.lineTo(px - 18, py - 2 - bob);
          ctx.quadraticCurveTo(px - 14, py - 12 - bob, px, py - 14 - bob);
          ctx.quadraticCurveTo(px + 14, py - 12 - bob, px + 18, py - 2 - bob);
          ctx.lineTo(px + 16, py + 14);
          ctx.stroke();
        } else if (bodyType === 'warrior') {
          // Armored torso — wider shoulders, plate mail
          ctx.moveTo(px - 15, py + 12);
          ctx.lineTo(px - 17, py - 4 - bob);
          ctx.lineTo(px - 12, py - 12 - bob);
          ctx.lineTo(px, py - 14 - bob);
          ctx.lineTo(px + 12, py - 12 - bob);
          ctx.lineTo(px + 17, py - 4 - bob);
          ctx.lineTo(px + 15, py + 12);
          ctx.closePath();
          ctx.fill();
          // Armor highlights
          ctx.strokeStyle = isSwordsman ? '#94a3b8' : cwColor + 'aa';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px - 12, py - 6 - bob); ctx.lineTo(px + 12, py - 6 - bob); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px - 10, py + 2); ctx.lineTo(px + 10, py + 2); ctx.stroke();
          // Shoulder plates
          ctx.fillStyle = isSwordsman ? '#475569' : cwColor;
          ctx.beginPath(); ctx.arc(px - 16, py - 8 - bob, 6, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px + 16, py - 8 - bob, 6, 0, Math.PI * 2); ctx.fill();
          // Belt
          ctx.fillStyle = isSwordsman ? '#78350f' : secondaryColor;
          ctx.fillRect(px - 14, py + 6, 28, 3);
          // Sword on back (swordsman only)
          if (isSwordsman) {
            ctx.save();
            ctx.translate(px + 8, py - 5 - bob);
            ctx.rotate(-0.4);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(-2, -22, 4, 28);
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-4, 4, 8, 4);
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(0, 6, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
          // Glow edge
          ctx.strokeStyle = isSwordsman ? '#94a3b8' : cwColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px - 15, py + 12); ctx.lineTo(px - 17, py - 4 - bob);
          ctx.lineTo(px - 12, py - 12 - bob); ctx.lineTo(px, py - 14 - bob);
          ctx.lineTo(px + 12, py - 12 - bob); ctx.lineTo(px + 17, py - 4 - bob);
          ctx.lineTo(px + 15, py + 12); ctx.stroke();
        } else if (bodyType === 'archer') {
          // Slim cloak shape
          ctx.moveTo(px, py - 14 - bob);
          ctx.lineTo(px - 12, py + 12);
          ctx.lineTo(px + 12, py + 12);
          ctx.closePath();
          ctx.fill();
        } else if (bodyType === 'beast') {
          // Animal body — round and furry
          ctx.ellipse(px, py, 16, 14, 0, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = cwColor;
          ctx.fill();
          // Belly patch
          ctx.beginPath();
          ctx.ellipse(px, py + 2, 10, 9, 0, 0, Math.PI * 2);
          ctx.fillStyle = secondaryColor + 'aa';
          ctx.fill();
          // Little legs
          ctx.fillStyle = cwColor;
          ctx.fillRect(px - 10, py + 10, 5, 6);
          ctx.fillRect(px + 5, py + 10, 5, 6);
          // Tail
          ctx.strokeStyle = cwColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(px + 14, py);
          ctx.quadraticCurveTo(px + 22, py - 8 - bob, px + 18, py - 16 - bob);
          ctx.stroke();
        } else if (bodyType === 'elemental') {
          // Pure energy being — wavering form
          const wave1 = Math.sin(time * 4) * 3;
          const wave2 = Math.sin(time * 5 + 1) * 2;
          ctx.moveTo(px, py - 14 - bob);
          ctx.quadraticCurveTo(px - 16 + wave1, py - 2, px - 13 + wave2, py + 12);
          ctx.lineTo(px + 13 - wave2, py + 12);
          ctx.quadraticCurveTo(px + 16 - wave1, py - 2, px, py - 14 - bob);
          ctx.closePath();
          ctx.fillStyle = cwColor + 'cc';
          ctx.fill();
          // Inner glow core
          ctx.beginPath();
          ctx.ellipse(px, py - 2 - bob, 7 + Math.sin(time * 6) * 2, 9, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = 0.6;
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (bodyType === 'creature') {
          // Alien/weird — blobby with appendages
          ctx.moveTo(px, py - 16 - bob);
          ctx.bezierCurveTo(px - 18, py - 12 - bob, px - 16, py + 10, px - 8, py + 14);
          ctx.lineTo(px + 8, py + 14);
          ctx.bezierCurveTo(px + 16, py + 10, px + 18, py - 12 - bob, px, py - 16 - bob);
          ctx.closePath();
          ctx.fillStyle = cwColor;
          ctx.fill();
          // Tentacles/appendages
          for (let t = 0; t < 3; t++) {
            const tx = px - 8 + t * 8;
            const phase = time * 3 + t * 1.5;
            ctx.strokeStyle = cwColor;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(tx, py + 12);
            ctx.quadraticCurveTo(tx + Math.sin(phase) * 8, py + 20, tx + Math.sin(phase + 1) * 6, py + 26);
            ctx.stroke();
          }
        } else {
          // Default wizard robe
          ctx.moveTo(px, py - 12 - bob);
          ctx.lineTo(px - 14, py + 14);
          ctx.lineTo(px + 14, py + 14);
          ctx.closePath();
          ctx.fill();
        }
        
        // Special class glow edges
        if (isVoidlord) {
          ctx.strokeStyle = '#ff00ff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isShadowArcher) {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (isSwordsman) {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (isCustomWizard) {
          ctx.strokeStyle = player.customColor || classColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Head
        ctx.beginPath();
        const headSize = (bodyType === 'hulk') ? 13 : (bodyType === 'beast') ? 12 : 11;
        ctx.arc(px, py - 18 - bob, headSize, 0, Math.PI * 2);
        ctx.fillStyle = isVoidlord ? '#2d1b4e' : isShadowArcher ? '#1e293b' : isBrute ? '#d4a574' : 
          isSwordsman ? '#fcd5ce' : (bodyType === 'beast' || bodyType === 'creature') ? cwColor : 
          bodyType === 'elemental' ? (cwColor + 'dd') : '#fcd5ce';
        ctx.fill();

        // Hat/Hood/Hair/Headgear
        const headgearType = isBrute ? 'headband' : isSwordsman ? 'helmet' : isShadowArcher ? 'hood' : 
          isCustomWizard ? (customHeadgear || 'pointyHat') : 'pointyHat';
        
        if (headgearType === 'headband') {
          // Buzz cut / flat top hair (Brute)
          ctx.fillStyle = '#44403c';
          ctx.beginPath();
          ctx.arc(px, py - 20 - bob, 13, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = '#d4a574';
          ctx.fillRect(px - 6, py - 8 - bob, 12, 6);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(px - 14, py - 22 - bob, 28, 3);
          ctx.strokeStyle = '#44403c'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(px - 8, py - 22 - bob); ctx.lineTo(px - 3, py - 20 - bob); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px + 8, py - 22 - bob); ctx.lineTo(px + 3, py - 20 - bob); ctx.stroke();
        } else if (headgearType === 'helmet') {
          // Knight/warrior helmet
          const hColor = isSwordsman ? '#475569' : cwColor;
          ctx.fillStyle = hColor;
          ctx.beginPath();
          ctx.arc(px, py - 20 - bob, 14, Math.PI, 0, false);
          ctx.lineTo(px + 14, py - 16 - bob);
          ctx.lineTo(px - 14, py - 16 - bob);
          ctx.closePath();
          ctx.fill();
          // Visor slit
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px - 8, py - 20 - bob, 16, 3);
          // Plume/crest
          ctx.strokeStyle = isSwordsman ? '#dc2626' : secondaryColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(px, py - 33 - bob);
          ctx.quadraticCurveTo(px + 8, py - 30 - bob, px + 12, py - 22 - bob);
          ctx.stroke();
        } else if (headgearType === 'hood') {
          // Hood (Shadow Archer / rogues)
          ctx.fillStyle = isShadowArcher ? '#0f172a' : cwColor;
          ctx.beginPath();
          ctx.arc(px, py - 20 - bob, 14, Math.PI, 0, false);
          ctx.lineTo(px + 16, py - 14 - bob);
          ctx.lineTo(px - 16, py - 14 - bob);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = isShadowArcher ? '#dc2626' : secondaryColor;
          ctx.lineWidth = 1;
          ctx.stroke();
          // Bow on back (archer only)
          if (isShadowArcher) {
            ctx.save();
            ctx.translate(px + 10, py - 10 - bob);
            ctx.rotate(0.3);
            ctx.beginPath();
            ctx.arc(0, 0, 14, -1.2, 1.2, false);
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(Math.cos(-1.2) * 14, Math.sin(-1.2) * 14);
            ctx.lineTo(Math.cos(1.2) * 14, Math.sin(1.2) * 14);
            ctx.strokeStyle = '#d4d4d8';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();
          }
        } else if (headgearType === 'crown') {
          // Royal crown
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          const crY = py - 30 - bob;
          ctx.beginPath();
          ctx.moveTo(px - 10, crY + 6);
          ctx.lineTo(px - 12, crY - 2);
          ctx.lineTo(px - 5, crY + 2);
          ctx.lineTo(px, crY - 6);
          ctx.lineTo(px + 5, crY + 2);
          ctx.lineTo(px + 12, crY - 2);
          ctx.lineTo(px + 10, crY + 6);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          // Gems
          ctx.fillStyle = '#ef4444';
          ctx.beginPath(); ctx.arc(px, crY - 3, 2, 0, Math.PI * 2); ctx.fill();
        } else if (headgearType === 'horns') {
          // Demon/beast horns
          ctx.fillStyle = isCustomWizard ? secondaryColor : '#1f1f1f';
          ctx.beginPath();
          ctx.moveTo(px - 12, py - 22 - bob);
          ctx.quadraticCurveTo(px - 20, py - 36 - bob, px - 22, py - 44 - bob);
          ctx.lineTo(px - 14, py - 22 - bob);
          ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(px + 12, py - 22 - bob);
          ctx.quadraticCurveTo(px + 20, py - 36 - bob, px + 22, py - 44 - bob);
          ctx.lineTo(px + 14, py - 22 - bob);
          ctx.closePath(); ctx.fill();
        } else if (headgearType === 'antlers') {
          // Branching antlers
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2.5;
          // Left antler
          ctx.beginPath();
          ctx.moveTo(px - 10, py - 26 - bob);
          ctx.lineTo(px - 18, py - 40 - bob);
          ctx.moveTo(px - 14, py - 34 - bob);
          ctx.lineTo(px - 22, py - 38 - bob);
          ctx.stroke();
          // Right antler
          ctx.beginPath();
          ctx.moveTo(px + 10, py - 26 - bob);
          ctx.lineTo(px + 18, py - 40 - bob);
          ctx.moveTo(px + 14, py - 34 - bob);
          ctx.lineTo(px + 22, py - 38 - bob);
          ctx.stroke();
        } else if (headgearType === 'halo') {
          // Floating golden ring
          ctx.save();
          ctx.strokeStyle = '#fcd34d';
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.ellipse(px, py - 34 - bob + Math.sin(time * 2) * 2, 12, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (headgearType === 'ears') {
          // Animal ears
          ctx.fillStyle = cwColor;
          // Left ear
          ctx.beginPath();
          ctx.moveTo(px - 8, py - 26 - bob);
          ctx.lineTo(px - 14, py - 40 - bob);
          ctx.lineTo(px - 2, py - 28 - bob);
          ctx.closePath(); ctx.fill();
          // Right ear
          ctx.beginPath();
          ctx.moveTo(px + 8, py - 26 - bob);
          ctx.lineTo(px + 14, py - 40 - bob);
          ctx.lineTo(px + 2, py - 28 - bob);
          ctx.closePath(); ctx.fill();
          // Inner ear
          ctx.fillStyle = secondaryColor + 'aa';
          ctx.beginPath();
          ctx.moveTo(px - 7, py - 28 - bob);
          ctx.lineTo(px - 12, py - 37 - bob);
          ctx.lineTo(px - 3, py - 29 - bob);
          ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(px + 7, py - 28 - bob);
          ctx.lineTo(px + 12, py - 37 - bob);
          ctx.lineTo(px + 3, py - 29 - bob);
          ctx.closePath(); ctx.fill();
        } else if (headgearType === 'none') {
          // No headgear — maybe a subtle hair tuft for creatures/elementals
          if (bodyType === 'elemental') {
            // Energy wisps rising from head
            ctx.save();
            ctx.globalAlpha = 0.5;
            for (let w = 0; w < 3; w++) {
              const wx = px - 4 + w * 4 + Math.sin(time * 5 + w) * 3;
              const wy = py - 32 - bob + Math.sin(time * 4 + w * 2) * 4;
              ctx.beginPath();
              ctx.arc(wx, wy, 2.5, 0, Math.PI * 2);
              ctx.fillStyle = cwColor;
              ctx.fill();
            }
            ctx.restore();
          }
        } else {
          // Default: Wizard pointed hat
          ctx.fillStyle = isVoidlord ? '#1a0a2e' : isCustomWizard ? cwColor : classColor;
          ctx.beginPath();
          ctx.moveTo(px, py - 42 - bob);
          ctx.lineTo(px - 16, py - 16 - bob);
          ctx.lineTo(px + 16, py - 16 - bob);
          ctx.closePath();
          ctx.fill();
          if (isVoidlord) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (isCustomWizard) {
            ctx.strokeStyle = cwColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Eyes
        ctx.fillStyle = isVoidlord ? '#ff00ff' : isShadowArcher ? '#dc2626' : isBrute ? '#b45309' : 
          isSwordsman ? '#1e293b' : isCustomWizard ? (player.customColor || classColor) : '#333';
        if (bodyType !== 'elemental') {
          ctx.beginPath();
          ctx.arc(px - 3, py - 19 - bob, isSpecialClass ? 3 : 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px + 3, py - 19 - bob, isSpecialClass ? 3 : 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Elemental: glowing eye dots
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = 0.8 + Math.sin(time * 5) * 0.2;
          ctx.beginPath(); ctx.arc(px - 3, py - 19 - bob, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px + 3, py - 19 - bob, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Name & level
        if (isVoidlord) {
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
        } else if (isShadowArcher) {
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👑 ' + player.name, px, py + 28);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#dc2626';
          ctx.font = '10px sans-serif';
          ctx.fillText('SHADOW ARCHER', px, py + 40);
        } else if (isBrute) {
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💪 ' + player.name, px, py + 28);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#f59e0b';
          ctx.font = '10px sans-serif';
          ctx.fillText('THE BRUTE', px, py + 40);
        } else if (isSwordsman) {
          ctx.shadowColor = '#94a3b8';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚔️ ' + player.name, px, py + 28);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#64748b';
          ctx.font = '10px sans-serif';
          ctx.fillText('SWORDSMAN', px, py + 40);
        } else if (isCustomWizard) {
          const cwColor = player.customColor || classColor;
          ctx.shadowColor = cwColor;
          ctx.shadowBlur = 8;
          ctx.fillStyle = cwColor;
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✨ ' + player.name, px, py + 28);
          ctx.shadowBlur = 0;
          ctx.fillStyle = cwColor;
          ctx.globalAlpha = 0.8;
          ctx.font = '9px sans-serif';
          ctx.fillText((player.customClassName || 'CUSTOM').toUpperCase(), px, py + 40);
          ctx.globalAlpha = 1;
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
          
          // Dance animation for dance emote (sparkles)
          if (player.emote === 'dance') {
            // Add sparkles around dancing player
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
          : dmg.color
          ? dmg.color
          : `rgba(255,255,255,${dmg.alpha || 1})`;
        ctx.fillText(dmg.amount, dx, dy);
      }

      // Meteor warnings
      const nowMs = Date.now();
      meteorWarningsRef.current = meteorWarningsRef.current.filter(m => {
        const elapsed = nowMs - m.startTime;
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
        const elapsed = now - (ef.startTime || ef.createdAt || now);
        if (elapsed > ef.duration) return false;
        // Safety cap: kill any effect older than 15 seconds regardless
        if (elapsed > 15000) return false;

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
        } else if (ef.type === 'arrowStorm') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const time = elapsed / 1000;
          const baseRadius = ef.radius * Math.min(1, progress * 4);
          
          // Dark zone indicator
          ctx.beginPath();
          ctx.arc(ex, ey, baseRadius, 0, Math.PI * 2);
          const stormGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, baseRadius);
          stormGrad.addColorStop(0, `rgba(220,38,38,${0.15 * alpha})`);
          stormGrad.addColorStop(0.7, `rgba(15,23,42,${0.2 * alpha})`);
          stormGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = stormGrad;
          ctx.fill();
          
          // Rain of arrows
          for (let i = 0; i < 12; i++) {
            const seed = i * 1.37;
            const ax = ex + Math.sin(seed * 5 + time * 3) * baseRadius * 0.7;
            const ay = ey + Math.cos(seed * 7 + time * 4) * baseRadius * 0.7;
            const fallOffset = ((time * 200 + seed * 80) % 60) - 30;
            
            ctx.save();
            ctx.translate(ax, ay + fallOffset);
            ctx.rotate(-Math.PI / 4 + Math.sin(time * 2 + i) * 0.2);
            
            // Arrow shaft
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.lineTo(8, 0);
            ctx.strokeStyle = `rgba(220,38,38,${0.6 * alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(5, -3);
            ctx.lineTo(5, 3);
            ctx.closePath();
            ctx.fillStyle = `rgba(220,38,38,${0.8 * alpha})`;
            ctx.fill();
            
            ctx.restore();
          }
          
          // Outer ring
          ctx.beginPath();
          ctx.arc(ex, ey, baseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(220,38,38,${0.3 * alpha})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (ef.type === 'multishot') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          // Quick burst ring
          const burstR = 30 + progress * 100;
          ctx.beginPath();
          ctx.arc(ex, ey, burstR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(220,38,38,${0.6 * alpha})`;
          ctx.lineWidth = 3 * alpha;
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
        
        // === DRAGON AWAKENS EFFECT ===
        else if (ef.type === 'dragonAwakens') {
          const dx = ef.x - cx;
          const dy = ef.y - cy;
          
          // Red/orange flash
          const flashAlpha = (1 - progress) * 0.3 * alpha;
          ctx.fillStyle = `rgba(220, 38, 38, ${flashAlpha})`;
          ctx.fillRect(0, 0, width, height);
          
          // Ominous glow from dragon's location
          const glowRadius = 300 + progress * 200;
          const glowGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, glowRadius);
          glowGrad.addColorStop(0, `rgba(255, 100, 0, ${0.5 * alpha})`);
          glowGrad.addColorStop(0.5, `rgba(220, 38, 38, ${0.3 * alpha})`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(dx, dy, glowRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Warning text
          if (progress < 0.7) {
            const textAlpha = Math.min(1, progress * 3) * alpha * (1 - progress / 0.7);
            ctx.font = 'bold 36px Arial';
            ctx.fillStyle = `rgba(220, 38, 38, ${textAlpha})`;
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.fillText('🐉 THE DRAGON AWAKENS! 🐉', width / 2, height / 2);
            ctx.shadowBlur = 0;
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
        
        // SKIN TRAIL PARTICLES
        else if (ef.type === 'skinTrail') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const size = ef.size * alpha;
          
          if (ef.snowflake) {
            // Snowflake particle
            ctx.save();
            ctx.translate(ex, ey);
            ctx.rotate(elapsed / 500);
            ctx.strokeStyle = ef.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = alpha;
            for (let i = 0; i < 6; i++) {
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(0, -size);
              ctx.stroke();
              ctx.rotate(Math.PI / 3);
            }
            ctx.restore();
          } else if (ef.star) {
            // Star particle
            ctx.save();
            ctx.translate(ex, ey);
            ctx.rotate(elapsed / 300);
            ctx.fillStyle = ef.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
              const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
              const x = Math.cos(angle) * size;
              const y = Math.sin(angle) * size;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else {
            // Regular glowing particle
            ctx.beginPath();
            ctx.arc(ex, ey, size, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(ex, ey, 0, ex, ey, size);
            gradient.addColorStop(0, ef.color);
            gradient.addColorStop(0.5, ef.color + '80');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }

        else if (ef.type === 'customAbility') {
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const progress = elapsed / (ef.duration || 3000);
          const fadeAlpha = Math.max(0, 1 - progress);
          const style = ef.style || 'burst';
          
          if (style === 'targeted_warning') {
            // Pulsing warning circle shrinking inward
            const pulse = 0.6 + 0.4 * Math.sin(elapsed * 0.015);
            const shrink = 1 - progress * 0.3;
            ctx.beginPath();
            ctx.arc(ex, ey, ef.radius * shrink, 0, Math.PI * 2);
            ctx.strokeStyle = ef.color + Math.floor(pulse * 180).toString(16).padStart(2, '0');
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
            // Fill warning zone
            ctx.beginPath();
            ctx.arc(ex, ey, ef.radius * shrink, 0, Math.PI * 2);
            ctx.fillStyle = ef.color + Math.floor(pulse * 30).toString(16).padStart(2, '0');
            ctx.fill();
            // Converging particles
            for (let i = 0; i < 6; i++) {
              const a = (elapsed / 300) + (i * Math.PI * 2 / 6);
              const d = ef.radius * (1 - progress);
              const px2 = ex + Math.cos(a) * d;
              const py2 = ey + Math.sin(a) * d;
              ctx.beginPath();
              ctx.arc(px2, py2, 2.5, 0, Math.PI * 2);
              ctx.fillStyle = ef.color;
              ctx.fill();
            }
          } else if (style === 'targeted_impact') {
            // Explosive impact ring + shockwave
            const ringRadius = ef.radius * Math.min(1, progress * 4);
            ctx.beginPath();
            ctx.arc(ex, ey, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = ef.color + Math.floor(fadeAlpha * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = 6 * fadeAlpha;
            ctx.stroke();
            // Inner flash
            if (progress < 0.3) {
              const flashAlpha = (1 - progress / 0.3);
              const gr = ctx.createRadialGradient(ex, ey, 0, ex, ey, ringRadius * 0.8);
              gr.addColorStop(0, ef.color + Math.floor(flashAlpha * 160).toString(16).padStart(2, '0'));
              gr.addColorStop(0.6, ef.color + Math.floor(flashAlpha * 60).toString(16).padStart(2, '0'));
              gr.addColorStop(1, 'transparent');
              ctx.fillStyle = gr;
              ctx.beginPath();
              ctx.arc(ex, ey, ringRadius * 0.8, 0, Math.PI * 2);
              ctx.fill();
            }
            // Debris particles flying outward
            for (let i = 0; i < 10; i++) {
              const a = (i * Math.PI * 2 / 10) + 0.3;
              const d = ringRadius * (0.3 + progress * 0.7);
              const px2 = ex + Math.cos(a) * d;
              const py2 = ey + Math.sin(a) * d;
              ctx.beginPath();
              ctx.arc(px2, py2, 3 * fadeAlpha, 0, Math.PI * 2);
              ctx.fillStyle = ef.color + Math.floor(fadeAlpha * 200).toString(16).padStart(2, '0');
              ctx.fill();
            }
          } else if (style === 'sustained') {
            // Persistent pulsing zone with rotating energy
            const pulse = 0.7 + 0.3 * Math.sin(elapsed * 0.008);
            const baseRadius = ef.radius * Math.min(1, progress * 5);
            // Outer ring
            ctx.beginPath();
            ctx.arc(ex, ey, baseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = ef.color + Math.floor(fadeAlpha * pulse * 180).toString(16).padStart(2, '0');
            ctx.lineWidth = 2;
            ctx.stroke();
            // Pulsing fill
            const gr = ctx.createRadialGradient(ex, ey, 0, ex, ey, baseRadius);
            gr.addColorStop(0, ef.color + Math.floor(fadeAlpha * pulse * 50).toString(16).padStart(2, '0'));
            gr.addColorStop(0.7, ef.color + Math.floor(fadeAlpha * pulse * 25).toString(16).padStart(2, '0'));
            gr.addColorStop(1, 'transparent');
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(ex, ey, baseRadius, 0, Math.PI * 2);
            ctx.fill();
            // Rotating energy arcs
            for (let i = 0; i < 3; i++) {
              const arcAngle = (elapsed / 600) + (i * Math.PI * 2 / 3);
              const arcStart = arcAngle;
              const arcEnd = arcAngle + 0.8;
              ctx.beginPath();
              ctx.arc(ex, ey, baseRadius * 0.6, arcStart, arcEnd);
              ctx.strokeStyle = ef.color + Math.floor(fadeAlpha * 200).toString(16).padStart(2, '0');
              ctx.lineWidth = 3;
              ctx.stroke();
            }
            // Orbiting sparks
            for (let i = 0; i < 12; i++) {
              const a = (elapsed / 400) + (i * Math.PI * 2 / 12);
              const d = baseRadius * (0.3 + 0.5 * Math.sin(elapsed / 200 + i));
              const px2 = ex + Math.cos(a) * d;
              const py2 = ey + Math.sin(a) * d;
              ctx.beginPath();
              ctx.arc(px2, py2, 2, 0, Math.PI * 2);
              ctx.fillStyle = ef.color + Math.floor(fadeAlpha * 220).toString(16).padStart(2, '0');
              ctx.fill();
            }
          } else {
            // Burst: quick expanding ring with shockwave
            const ringRadius = ef.radius * Math.min(1, progress * 4);
            ctx.beginPath();
            ctx.arc(ex, ey, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = ef.color + Math.floor(fadeAlpha * 220).toString(16).padStart(2, '0');
            ctx.lineWidth = 4 * fadeAlpha;
            ctx.stroke();
            // Bright flash at start
            if (progress < 0.3) {
              const flashAlpha = (1 - progress / 0.3);
              const gr = ctx.createRadialGradient(ex, ey, 0, ex, ey, ringRadius);
              gr.addColorStop(0, ef.color + Math.floor(flashAlpha * 120).toString(16).padStart(2, '0'));
              gr.addColorStop(0.5, ef.color + Math.floor(flashAlpha * 40).toString(16).padStart(2, '0'));
              gr.addColorStop(1, 'transparent');
              ctx.fillStyle = gr;
              ctx.beginPath();
              ctx.arc(ex, ey, ringRadius, 0, Math.PI * 2);
              ctx.fill();
            }
            // Burst particles
            for (let i = 0; i < 8; i++) {
              const a = (i * Math.PI * 2 / 8) + 0.5;
              const d = ringRadius * progress;
              const px2 = ex + Math.cos(a) * d;
              const py2 = ey + Math.sin(a) * d;
              ctx.beginPath();
              ctx.arc(px2, py2, 3 * fadeAlpha, 0, Math.PI * 2);
              ctx.fillStyle = ef.color + Math.floor(fadeAlpha * 255).toString(16).padStart(2, '0');
              ctx.fill();
            }
          }
        }
        else if (ef.type === 'customUltWarning') {
          // Pulsing warning circle before custom ultimate hits
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const progress = elapsed / (ef.duration || 1000);
          const pulse = 0.7 + 0.3 * Math.sin(progress * Math.PI * 6);
          const alpha = Math.min(1, progress * 2) * pulse;
          
          // Warning ring
          ctx.beginPath();
          ctx.arc(ex, ey, ef.radius, 0, Math.PI * 2);
          ctx.strokeStyle = ef.color + Math.floor(alpha * 160).toString(16).padStart(2, '0');
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Fill with translucent color
          ctx.beginPath();
          ctx.arc(ex, ey, ef.radius, 0, Math.PI * 2);
          ctx.fillStyle = ef.color + Math.floor(alpha * 30).toString(16).padStart(2, '0');
          ctx.fill();
          
          // Ability name above
          ctx.fillStyle = ef.color + Math.floor(alpha * 200).toString(16).padStart(2, '0');
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(ef.name || 'Ultimate', ex, ey - ef.radius - 8);
        }
        else if (ef.type === 'customUltExplosion') {
          // Big explosion burst for custom ultimate
          const ex = ef.x - cx;
          const ey = ef.y - cy;
          const progress = elapsed / (ef.duration || 1500);
          const fadeAlpha = Math.max(0, 1 - progress);
          const expandRadius = ef.radius * (0.5 + progress * 0.8);
          
          // Shockwave ring
          ctx.beginPath();
          ctx.arc(ex, ey, expandRadius, 0, Math.PI * 2);
          ctx.strokeStyle = ef.color + Math.floor(fadeAlpha * 220).toString(16).padStart(2, '0');
          ctx.lineWidth = 4 * fadeAlpha;
          ctx.stroke();
          
          // Inner flash
          if (progress < 0.3) {
            const flashAlpha = (0.3 - progress) / 0.3;
            const flashGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, ef.radius);
            flashGrad.addColorStop(0, ef.color + Math.floor(flashAlpha * 150).toString(16).padStart(2, '0'));
            flashGrad.addColorStop(0.5, ef.color + Math.floor(flashAlpha * 60).toString(16).padStart(2, '0'));
            flashGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = flashGrad;
            ctx.beginPath();
            ctx.arc(ex, ey, ef.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Scattered sparks
          for (let i = 0; i < 12; i++) {
            const sparkAngle = (i * Math.PI * 2 / 12) + progress * 2;
            const sparkDist = expandRadius * (0.3 + Math.random() * 0.7);
            const sx = ex + Math.cos(sparkAngle) * sparkDist;
            const sy = ey + Math.sin(sparkAngle) * sparkDist;
            ctx.beginPath();
            ctx.arc(sx, sy, 2 * fadeAlpha, 0, Math.PI * 2);
            ctx.fillStyle = '#fff' + Math.floor(fadeAlpha * 200).toString(16).padStart(2, '0');
            ctx.fill();
          }
          
          // Name text
          if (progress < 0.5) {
            ctx.fillStyle = '#fff' + Math.floor((1 - progress * 2) * 255).toString(16).padStart(2, '0');
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = ef.color;
            ctx.shadowBlur = 10;
            ctx.fillText(ef.name || 'Ultimate', ex, ey - ef.radius - 12);
            ctx.shadowBlur = 0;
          }
        }
        
        // === CAST TEXT (ability name float) ===
        else if (ef.type === 'castText') {
          const tx = ef.x - cx;
          const ty = ef.y - cy - progress * 40; // Float upward
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = `${ef.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
          ctx.shadowColor = ef.color;
          ctx.shadowBlur = 6;
          ctx.fillText(ef.text || '', tx, ty);
          ctx.shadowBlur = 0;
        }

        return true;
      });

      // Minimap
      if (settingsRef.current.showMinimap && minimapRef.current) {
        const mm = minimapRef.current;
        const mmCtx = mm.getContext('2d');
        const mmW = mm.width;
        const mmH = mm.height;
        
        // Clear minimap with dark background
        mmCtx.fillStyle = '#0a0a15';
        mmCtx.fillRect(0, 0, mmW, mmH);
        
        if (inDungeonRef.current) {
          // ========== DUNGEON MINIMAP ==========
          const dungeonHeight = 5000;
          const dungeonWidth = 1200;
          const scale = Math.min(mmW / dungeonWidth, mmH / dungeonHeight);
          const offsetX = (mmW - dungeonWidth * scale) / 2;
          const offsetY = 0;
          
          // Room colors
          const roomColors = {
            stone: '#2a2520',
            bones: '#252218',
            haunted: '#1a1a25',
            rocky: '#252520',
            infernal: '#2a1515',
            dragon: '#2a1a0a',
            corridor: '#1a1515',
          };
          
          // Draw dungeon rooms (matching expanded 1800x6000 dungeon)
          const rooms = [
            { yStart: 0, yEnd: 500, minX: 400, maxX: 1400, theme: 'stone' },
            { yStart: 500, yEnd: 700, minX: 550, maxX: 1250, theme: 'corridor' },
            { yStart: 700, yEnd: 1500, minX: 200, maxX: 1600, theme: 'bones' },
            { yStart: 1500, yEnd: 1700, minX: 550, maxX: 1250, theme: 'corridor' },
            { yStart: 1700, yEnd: 2500, minX: 200, maxX: 1600, theme: 'haunted' },
            { yStart: 2500, yEnd: 2700, minX: 550, maxX: 1250, theme: 'corridor' },
            { yStart: 2700, yEnd: 3500, minX: 200, maxX: 1600, theme: 'rocky' },
            { yStart: 3500, yEnd: 3700, minX: 550, maxX: 1250, theme: 'corridor' },
            { yStart: 3700, yEnd: 4500, minX: 200, maxX: 1600, theme: 'infernal' },
            { yStart: 4500, yEnd: 4700, minX: 550, maxX: 1250, theme: 'corridor' },
            { yStart: 4700, yEnd: 5000, minX: 200, maxX: 1600, theme: 'haunted' },
            { yStart: 5000, yEnd: 6000, minX: 50, maxX: 1750, theme: 'dragon' },
          ];
          
          for (const room of rooms) {
            mmCtx.fillStyle = roomColors[room.theme] || '#1a1515';
            mmCtx.fillRect(
              offsetX + room.minX * scale,
              offsetY + room.yStart * scale,
              (room.maxX - room.minX) * scale,
              (room.yEnd - room.yStart) * scale
            );
            
            // Room border
            mmCtx.strokeStyle = 'rgba(255,255,255,0.2)';
            mmCtx.lineWidth = 1;
            mmCtx.strokeRect(
              offsetX + room.minX * scale,
              offsetY + room.yStart * scale,
              (room.maxX - room.minX) * scale,
              (room.yEnd - room.yStart) * scale
            );
          }
          
          // Draw exit portal at entrance
          mmCtx.beginPath();
          mmCtx.arc(offsetX + 900 * scale, offsetY + 200 * scale, 4, 0, Math.PI * 2);
          mmCtx.fillStyle = '#22c55e';
          mmCtx.fill();
          
          // Draw dragon lair marker
          mmCtx.beginPath();
          mmCtx.arc(offsetX + 900 * scale, offsetY + 5500 * scale, 6, 0, Math.PI * 2);
          mmCtx.fillStyle = '#f97316';
          mmCtx.fill();
          mmCtx.strokeStyle = '#fbbf24';
          mmCtx.lineWidth = 2;
          mmCtx.stroke();
          
          // Enemies on minimap
          for (const e of enemies || []) {
            mmCtx.beginPath();
            mmCtx.arc(offsetX + e.x * scale, offsetY + e.y * scale, e.isBoss ? 5 : e.isMiniBoss ? 3 : 2, 0, Math.PI * 2);
            mmCtx.fillStyle = e.isBoss ? '#fbbf24' : e.isMiniBoss ? '#f97316' : '#ef4444';
            mmCtx.fill();
          }
          
          // Players on minimap
          for (const p of players || []) {
            if (p.health <= 0) continue;
            const isMe = p.id === playerIdRef.current;
            mmCtx.beginPath();
            mmCtx.arc(offsetX + p.x * scale, offsetY + p.y * scale, isMe ? 4 : 3, 0, Math.PI * 2);
            mmCtx.fillStyle = isMe ? '#00ffff' : '#60a5fa';
            mmCtx.fill();
            if (isMe) {
              mmCtx.strokeStyle = '#ffffff';
              mmCtx.lineWidth = 1.5;
              mmCtx.stroke();
            }
          }
          
          // Victory portal if active
          if (dungeonVictoryPortalRef.current && dungeonVictoryPortalRef.current.active) {
            mmCtx.beginPath();
            mmCtx.arc(offsetX + dungeonVictoryPortalRef.current.x * scale, offsetY + dungeonVictoryPortalRef.current.y * scale, 5, 0, Math.PI * 2);
            mmCtx.fillStyle = '#fbbf24';
            mmCtx.fill();
            mmCtx.strokeStyle = '#fff';
            mmCtx.lineWidth = 2;
            mmCtx.stroke();
          }
          
          // Dungeon label
          mmCtx.fillStyle = '#f97316';
          mmCtx.font = 'bold 10px Arial';
          mmCtx.textAlign = 'center';
          mmCtx.fillText('DUNGEON', mmW / 2, mmH - 5);
          
        } else {
          // ========== NORMAL WORLD MINIMAP ==========
          // Scale to fit world in minimap
          const scale = mmW / WORLD_WIDTH;

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
          const tileSize = 400; // Larger tiles for expanded world
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
          
          // Draw portals on minimap (both sanctuary-side and return portals)
          for (const portal of Object.values(PORTAL_POSITIONS)) {
            // Sanctuary portal
            mmCtx.beginPath();
            mmCtx.arc(portal.from.x * scale, portal.from.y * scale, 3, 0, Math.PI * 2);
            mmCtx.fillStyle = portal.color;
            mmCtx.fill();
            // Return portal at destination
            if (portal.returnFrom) {
              mmCtx.beginPath();
              mmCtx.arc(portal.returnFrom.x * scale, portal.returnFrom.y * scale, 2.5, 0, Math.PI * 2);
              mmCtx.fillStyle = portal.color + 'aa';
              mmCtx.fill();
              mmCtx.strokeStyle = '#fff';
              mmCtx.lineWidth = 0.5;
              mmCtx.stroke();
            }
          }
          
          // Draw buildings on minimap as markers
          for (const [bid, bld] of Object.entries(BUILDING_DATA)) {
            mmCtx.fillStyle = bld.color;
            mmCtx.fillRect(bld.x * scale - 2, bld.y * scale - 2, 4, 4);
            mmCtx.strokeStyle = '#fff';
            mmCtx.lineWidth = 0.5;
            mmCtx.strokeRect(bld.x * scale - 2, bld.y * scale - 2, 4, 4);
          }

          // Enemies on minimap - red dots, bosses are yellow/gold and larger
          for (const e of enemies || []) {
            mmCtx.beginPath();
            mmCtx.arc(e.x * scale, e.y * scale, e.isBoss ? 6 : 1.5, 0, Math.PI * 2);
            mmCtx.fillStyle = e.isBoss ? '#fbbf24' : '#ef4444';
            mmCtx.fill();
          }

          // Players on minimap - CYAN for self (distinct from yellow bosses), blue for others
          for (const p of players || []) {
            if (p.health <= 0) continue;
            const isMe = p.id === playerIdRef.current;
            mmCtx.beginPath();
            mmCtx.arc(p.x * scale, p.y * scale, isMe ? 4 : 3, 0, Math.PI * 2);
            mmCtx.fillStyle = isMe ? '#00ffff' : (p.isCustomWizard && p.customColor ? p.customColor : '#60a5fa');
            mmCtx.fill();
            // White border for self to make it stand out
            if (isMe) {
              mmCtx.strokeStyle = '#ffffff';
              mmCtx.lineWidth = 1.5;
              mmCtx.stroke();
            }
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
    
    const charId = savedPlayer.id || null;
    const skinToUse = selectedSkin || savedPlayer.selectedSkin;
    
    const joinData = {
      playerId: charId,
      playerName: savedPlayer.name,
      playerClass: savedPlayer.class,
      selectedSkin: skinToUse,
      adminKey: adminKeyRef.current || undefined,
      sessionToken: sessionTokenRef.current || null,
      isCustomWizard: savedPlayer.isCustomWizard || false,
      customIconStyle: savedPlayer.customIconStyle || null,
      startLevel: adminStartLevel ? 30 : undefined,
    };
    
    const doJoin = () => {
      if (!socketRef.current?.connected) {
        socketRef.current?.connect();
        socketRef.current?.once('connect', () => {
          socketRef.current?.emit('join', joinData);
        });
      } else {
        socketRef.current?.emit('join', joinData);
      }
    };
    
    // If already in game, leave first then rejoin after server processes it
    // If already in game, leave first then rejoin after server confirms
    if (playerIdRef.current) {
      socketRef.current?.emit('leave');
      playerIdRef.current = null;
      const fallback = setTimeout(doJoin, 500);
      socketRef.current?.once('left', () => {
        clearTimeout(fallback);
        doJoin();
      });
    } else {
      doJoin();
    }
  };

  const handleNewCharacter = () => {
    initAudio();
    setPlayerName('');
    // Admin defaults to brute
    if (adminKey === 'azoni-voidlord-2026') {
      setSelectedClass('brute');
      setSelectedSkin('brute_default');
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
    
    const name = playerName.trim() || generateWizardName();
    
    const joinData = {
      playerId: null, // Always null = create new character
      playerName: name,
      playerClass: customClassId || selectedClass,
      selectedSkin: customClassId ? (customClassId + '_default') : selectedSkin,
      adminKey: adminKeyRef.current || undefined,
      sessionToken: sessionTokenRef.current || null,
      isCustomWizard: !!customClassId,
      startLevel: adminStartLevel ? 30 : undefined,
    };
    
    console.log('🎮 Joining with:', joinData.playerClass, customClassId ? '(custom wizard)' : '');
    
    const doJoin = () => {
      if (!socketRef.current?.connected) {
        socketRef.current?.connect();
        socketRef.current?.once('connect', () => {
          socketRef.current?.emit('join', joinData);
        });
      } else {
        socketRef.current?.emit('join', joinData);
      }
    };
    
    // If already in game, leave first then rejoin after server confirms
    if (socketRef.current?.connected && playerIdRef.current) {
      socketRef.current.emit('leave');
      playerIdRef.current = null;
      const fallback = setTimeout(doJoin, 500);
      socketRef.current.once('left', () => {
        clearTimeout(fallback);
        doJoin();
      });
    } else {
      doJoin();
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
        style={{ ...styles.canvas, cursor: (!autoAttack && screen === 'game') ? 'crosshair' : undefined }} 
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
        setTab={setTab}
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
        adminStartLevel={adminStartLevel}
        setAdminStartLevel={setAdminStartLevel}
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
        adminKeyRef={adminKeyRef}
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

              isCustomWizard: playerInfo.isCustomWizard || false,

              customColor: playerInfo.customColor,

              customSecondaryColor: playerInfo.customSecondaryColor,

              customClassName: playerInfo.customClassName,

            };

            setSavedPlayer(charSummary);

            setCharacters(prev => prev.map(c => c.id === charSummary.id ? charSummary : c));

            setSelectedSkin(playerInfo.selectedSkin || '');

          }

          // Emit leave so server removes player (keep socket connected for character switching)
          socketRef.current?.emit('leave');
          
          // Clear player state
          playerIdRef.current = null;

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
                  <div style={styles.avatar(playerInfo.isCustomWizard ? (playerInfo.customColor || playerInfo.color || '#a78bfa') : (classes[playerInfo.class]?.color || '#fff'))}>
                    <span style={styles.avatarIcon}>{playerInfo.isCustomWizard ? (
                      WIZARD_ICONS[playerInfo.customIconStyle] || WIZARD_ICONS.star
                    ) : CLASS_SVG[playerInfo.class] || SVG.arcane}</span>
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

                {/* Fountain Speed Boost Indicator */}
                {playerInfo.fountainBoostRemaining > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: 6, padding: '4px 10px', marginTop: 4,
                    fontSize: '0.75rem', color: '#22c55e', fontWeight: 600,
                  }}>
                    <span>⚡</span> 2x Speed <span style={{ color: '#4ade80' }}>{playerInfo.fountainBoostRemaining}s</span>
                  </div>
                )}

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

                {/* Action buttons row - Settings & Leaderboard */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button 
                    onClick={() => setShowInGameSettings(true)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      color: '#888', fontSize: '0.7rem',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                    Settings
                  </button>
                  <button 
                    onClick={() => setShowLeaderboard(p => !p)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer',
                      background: showLeaderboard ? 'rgba(255,215,61,0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${showLeaderboard ? 'rgba(255,215,61,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      color: showLeaderboard ? '#ffd93d' : '#888', fontSize: '0.7rem',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/></svg>
                    Ranks
                  </button>
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
                  brute: { 1: 'Protein Shake', 2: 'Barbell Spin', 3: 'Ultimate Flex' },
                  swordsman: { 1: 'Riposte', 2: "Executioner's Strike", 3: 'Bladestorm' },
                };
                const abilityDescs = {
                  pyromancer: { 1: 'Damage aura around you', 2: 'Delayed AOE at target', 3: 'Massive explosion' },
                  cryomancer: { 1: 'Freeze nearby enemies', 2: 'Piercing ice bolt', 3: 'Blizzard zone' },
                  arcanist: { 1: 'Teleport forward', 2: 'Homing missiles', 3: 'Speed boost' },
                  stormcaller: { 1: 'Chain lightning', 2: 'Bouncing orb', 3: 'Storm avatar' },
                  voidlord: { 1: 'Pull enemies', 2: 'Lifesteal', 3: 'Devastation' },
                  shadowarcher: { 1: 'Piercing shot', 2: 'Arrow burst', 3: 'Lethal strike' },
                  brute: { 1: 'Heal + speed boost', 2: 'Spinning AOE', 3: 'Shockwave flex' },
                  swordsman: { 1: 'Parry & counter', 2: 'Devastating overhead', 3: 'Whirlwind of steel' },
                };
                const abilityIcons = {
                  pyromancer: { 1: '🔥', 2: '☄️', 3: '💥' },
                  cryomancer: { 1: '❄️', 2: '🧊', 3: '🌨️' },
                  arcanist: { 1: '✨', 2: '💫', 3: '⏳' },
                  stormcaller: { 1: '⚡', 2: '🔮', 3: '🌩️' },
                  voidlord: { 1: '🕳️', 2: '💀', 3: '☠️' },
                  shadowarcher: { 1: '🎯', 2: '🏹', 3: '💀' },
                  brute: { 1: '🥤', 2: '🏋️', 3: '💪' },
                  swordsman: { 1: '🛡️', 2: '⚔️', 3: '🌀' },
                };
                const abilityColors = {
                  pyromancer: '#ff6b35',
                  cryomancer: '#00ffff',
                  arcanist: '#9b5de5',
                  stormcaller: '#ffff00',
                  voidlord: '#ff00ff',
                  shadowarcher: '#dc2626',
                  brute: '#fbbf24',
                  swordsman: '#708090',
                };
                
                // Check for custom wizard ability data
                let abilityName = abilityNames[playerInfo.class]?.[slot];
                let abilityDesc = abilityDescs[playerInfo.class]?.[slot];
                let abilityIcon = abilityIcons[playerInfo.class]?.[slot];
                let color = abilityColors[playerInfo.class];
                
                // Custom wizard - look up from server-sent class data first (works after reconnect)
                if (!abilityName && classes[playerInfo.class]?.classAbilities) {
                  const ab = classes[playerInfo.class].classAbilities[slot - 1];
                  if (ab) {
                    abilityName = ab.name;
                    abilityDesc = ab.description || '';
                    color = ab.color || classes[playerInfo.class]?.color;
                  }
                }
                // Fallback to generatedWizard (current session only)
                if (!abilityName && generatedWizard?.spellDefs) {
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
              
              {/* Auto-Attack Toggle */}
              <div
                onClick={() => {
                  if (socketRef.current) socketRef.current.emit('toggleAutoAttack');
                }}
                title={`Auto-Attack: ${autoAttack ? 'ON (½ dmg)' : 'OFF (click to aim)'} (X)`}
                style={{
                  width: 52,
                  height: 65,
                  borderRadius: 10,
                  background: autoAttack 
                    ? 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(251,191,36,0.1))'
                    : 'linear-gradient(135deg, rgba(100,100,100,0.3), rgba(60,60,60,0.1))',
                  border: `2px solid ${autoAttack ? '#fbbf24' : '#555'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ position: 'absolute', top: 3, left: 5, fontSize: '0.55rem', color: '#fff80', fontWeight: 'bold' }}>X</div>
                <span style={{ fontSize: '1.1rem' }}>{autoAttack ? '⚔️' : '🎯'}</span>
                <div style={{ fontSize: '0.45rem', color: autoAttack ? '#fbbf24' : '#888', textAlign: 'center', lineHeight: 1.1, fontWeight: 600 }}>
                  {autoAttack ? 'AUTO' : 'AIM'}
                </div>
                {!autoAttack && (
                  <div style={{
                    position: 'absolute', top: -2, right: -2, width: 8, height: 8,
                    borderRadius: '50%', background: '#22c55e',
                    boxShadow: '0 0 4px #22c55e',
                  }} />
                )}
              </div>
              
              <div
                onClick={() => setShowSpellbook(prev => !prev)}
                style={{
                  width: 42, height: 42, borderRadius: 8, cursor: 'pointer',
                  background: showSpellbook ? 'rgba(251,191,36,0.3)' : 'rgba(0,0,0,0.5)',
                  border: `2px solid ${showSpellbook ? '#fbbf24' : 'rgba(255,255,255,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
                title="Spellbook (B)"
              >📖</div>
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
                  <div style={styles.mobileAvatar(playerInfo.isCustomWizard ? (playerInfo.customColor || playerInfo.color || '#a78bfa') : (classes[playerInfo.class]?.color || '#fff'))}>
                    <span style={styles.mobileAvatarIcon}>{playerInfo.isCustomWizard ? (
                      WIZARD_ICONS[playerInfo.customIconStyle] || WIZARD_ICONS.star
                    ) : CLASS_SVG[playerInfo.class] || SVG.arcane}</span>
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
                  {/* Spellbook button */}
                  <button
                    onClick={() => setShowSpellbook(prev => !prev)}
                    style={{
                      background: showSpellbook ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.15)',
                      border: `1px solid ${showSpellbook ? '#fbbf24' : 'rgba(251,191,36,0.3)'}`,
                      borderRadius: 6,
                      padding: '4px 8px',
                      color: '#fbbf24',
                      fontSize: '0.85rem',
                    }}
                  >📖</button>
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

                {/* Settings + Leaderboard row - removed from nameplate, settings accessible via ESC key */}
                {/* Compact online player count */}
                {leaderboardData.length > 0 && (
                  <div style={{ fontSize: '0.5rem', color: '#555', textAlign: 'center', marginTop: 2 }}>
                    {leaderboardData.length} player{leaderboardData.length !== 1 ? 's' : ''} online
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

          {/* Mobile Settings Gear - floating top-right */}
          {isMobile && (
            <button
              onClick={() => setShowInGameSettings(true)}
              style={{
                position: 'fixed',
                top: 8,
                right: 8,
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#888',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58z"/>
              </svg>
            </button>
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
                  {/* Auto-Attack Toggle (all classes) */}
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
                    <span style={{ fontSize: '0.9rem' }}>{autoAttack ? '⚔️' : '🎯'}</span>
                    <span style={{ fontSize: '0.45rem', color: autoAttack ? '#fbbf24' : '#aaa', fontWeight: 600 }}>
                      {autoAttack ? 'AUTO' : 'AIM'}
                    </span>
                  </button>
                  {/* PvP Toggle (for PvP classes) */}
                  {(playerInfo?.class === 'voidlord' || playerInfo?.class === 'shadowarcher' || playerInfo?.class === 'brute') && (
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

      {/* New Player Tutorial Overlay */}
      {showTutorial && screen === 'game' && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 5000 }} onClick={() => { setShowTutorial(false); localStorage.setItem(`spellBrigadeTutorial_${playerIdRef.current}`, '1'); }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, rgba(15,15,30,0.98), rgba(25,20,45,0.98))',
            border: '2px solid rgba(255,217,61,0.5)', borderRadius: 20,
            padding: '28px 32px', zIndex: 5001, maxWidth: 480, width: '92%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 8, fontWeight: 800, color: '#ffd93d', letterSpacing: 2 }}>SPELL BRIGADE</div>
              <h2 style={{ color: '#ffd93d', fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Welcome, Wizard</h2>
              <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 6 }}>Here's how to survive the wilderness</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'WASD / Arrow Keys', desc: 'Move your wizard around the world', icon: '⬆⬇', iconBg: '#3b82f6' },
                { key: 'Left-Click', desc: 'Fire primary spell at cursor — full damage, manual aim', icon: 'I', iconBg: '#ef4444' },
                { key: 'Right-Click', desc: 'Fire secondary spell — AOE blast or special projectile', icon: 'II', iconBg: '#f97316' },
                { key: 'X — Auto-Attack', desc: 'Toggle auto-targeting nearest enemy (50% damage)', icon: 'AT', iconBg: '#eab308' },
                { key: 'SPACE', desc: 'Dash ability — dodge attacks or close gaps', icon: '»', iconBg: '#06b6d4' },
                { key: 'Q', desc: 'Ultimate ability — powerful cooldown spell', icon: 'Q', iconBg: '#a855f7' },
                { key: '1 / 2 / 3', desc: 'Class abilities — unlock at levels 10, 20, 30', icon: '✦', iconBg: '#22c55e' },
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    background: item.iconBg + '33', border: `1.5px solid ${item.iconBg}88`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 800, color: item.iconBg,
                    fontFamily: 'monospace', letterSpacing: '-1px',
                  }}>{item.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#ffd93d', fontWeight: 700, fontSize: '0.85rem' }}>{item.key}</span>
                    <span style={{ color: '#999', fontSize: '0.8rem' }}> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{
              marginTop: 16, padding: '10px 14px',
              background: 'rgba(255,217,61,0.08)', border: '1px solid rgba(255,217,61,0.2)',
              borderRadius: 10, textAlign: 'center',
            }}>
              <div style={{ color: '#ffd93d', fontSize: '0.8rem', fontWeight: 600 }}>Tips</div>
              <div style={{ color: '#aaa', fontSize: '0.75rem', marginTop: 4, lineHeight: 1.5 }}>
                Stay in the <span style={{ color: '#4ade80' }}>Meadow</span> until you level up.
                Visit the <span style={{ color: '#67e8f9' }}>Healing Fountain</span> in Sanctuary to recover.
                Talk to <span style={{ color: '#ffd93d' }}>NPCs</span> for quests and dungeons.
                Higher zones = harder monsters = more XP!
              </div>
            </div>
            
            <button
              onClick={() => { setShowTutorial(false); localStorage.setItem(`spellBrigadeTutorial_${playerIdRef.current}`, '1'); }}
              style={{
                width: '100%', marginTop: 18, padding: '14px 20px',
                background: 'linear-gradient(135deg, #ffd93d, #f97316)',
                border: 'none', borderRadius: 10, color: '#000',
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Got it — let's go!
            </button>
          </div>
        </>
      )}

      {/* Quest Complete Celebration */}
      {questComplete && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(15,15,30,0.95), rgba(40,30,10,0.95))',
          border: '2px solid rgba(255,217,61,0.6)',
          borderRadius: 16,
          padding: '16px 28px',
          zIndex: 2000,
          textAlign: 'center',
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          animation: 'dropIn 0.4s ease-out',
          pointerEvents: 'auto',
          cursor: 'pointer',
        }} onClick={() => setQuestComplete(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
            <div>
              <div style={{ color: '#ffd93d', fontSize: '1rem', fontWeight: 700 }}>
                {questComplete.title}
              </div>
              <div style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: 600 }}>
                +{questComplete.xp} XP
                {questComplete.bonuses?.map((b, i) => (
                  <span key={i} style={{ color: '#22c55e', marginLeft: 8 }}>{b}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 6 }}>click to dismiss</div>
        </div>
      )}

      {/* Quest Notification Banner */}
      {questNotification && screen === 'game' && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          background: `${questNotification.color}20`, border: `1px solid ${questNotification.color}60`,
          borderRadius: 10, padding: '8px 20px', zIndex: 1500,
          color: questNotification.color, fontWeight: 600, fontSize: '0.85rem',
          boxShadow: `0 4px 16px ${questNotification.color}30`,
        }}>
          {questNotification.text}
        </div>
      )}

      {/* Active Quest Tracker */}
      {activeNpcQuests.length > 0 && screen === 'game' && !showQuestLog && (
        <div style={{
          position: 'fixed', top: isMobile ? 55 : 12, right: 12,
          background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '8px 12px', zIndex: 900,
          maxWidth: 200, pointerEvents: 'none',
        }}>
          <div style={{ color: '#ffd93d', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4 }}>📜 QUESTS</div>
          {activeNpcQuests.slice(0, 3).map(q => (
            <div key={q.id} style={{ marginBottom: 4 }}>
              <div style={{ 
                color: q.progress >= q.required ? '#4ade80' : '#ccc', 
                fontSize: '0.7rem', fontWeight: 600,
              }}>
                {q.name} {q.progress >= q.required && '✅'}
              </div>
              <div style={{
                height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 2,
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${Math.min(100, (q.progress / q.required) * 100)}%`,
                  background: q.progress >= q.required ? '#4ade80' : '#fbbf24',
                }} />
              </div>
              <div style={{ color: '#888', fontSize: '0.6rem' }}>{q.progress}/{q.required}</div>
            </div>
          ))}
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