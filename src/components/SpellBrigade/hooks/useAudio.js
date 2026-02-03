import { useRef, useEffect, useState, useCallback } from 'react';

export const ZONE_MUSIC_CONFIG = {
  sanctuary: {
    baseFreq: 220,
    scale: [0, 4, 7, 12, 16],
    tempo: 0.4,
    waveType: 'sine',
    volume: 0.12,
  },
  meadow: {
    baseFreq: 262,
    scale: [0, 2, 4, 7, 9],
    tempo: 0.6,
    waveType: 'sine',
    volume: 0.1,
  },
  forest: {
    baseFreq: 196,
    scale: [0, 3, 5, 7, 10],
    tempo: 0.5,
    waveType: 'triangle',
    volume: 0.1,
  },
  volcanic: {
    baseFreq: 110,
    scale: [0, 1, 4, 5, 7],
    tempo: 0.8,
    waveType: 'sawtooth',
    volume: 0.08,
  },
  frozen: {
    baseFreq: 330,
    scale: [0, 2, 3, 7, 8],
    tempo: 0.35,
    waveType: 'sine',
    volume: 0.1,
  },
  abyss: {
    baseFreq: 82,
    scale: [0, 1, 3, 6, 7],
    tempo: 0.25,
    waveType: 'sawtooth',
    volume: 0.06,
  },
  crystal_caves: {
    baseFreq: 440,
    scale: [0, 4, 7, 11, 12],
    tempo: 0.5,
    waveType: 'sine',
    volume: 0.08,
  },
};

export function useAudio(settingsRef) {
  const audioCtxRef = useRef(null);
  const audioReadyRef = useRef(false);
  const musicIntervalRef = useRef(null);
  const musicGainRef = useRef(null);
  const lastZoneRef = useRef(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const initAudio = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      
      const ctx = audioCtxRef.current;
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      if (ctx.state === 'running' && !audioReadyRef.current) {
        audioReadyRef.current = true;
        setAudioUnlocked(true);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const unlock = () => initAudio();
    const events = ['touchstart', 'touchend', 'mousedown', 'click', 'keydown'];
    events.forEach(ev => document.addEventListener(ev, unlock, { passive: true, capture: true }));
    
    const checkAudio = setInterval(() => {
      if (audioCtxRef.current?.state === 'running' && !audioReadyRef.current) {
        audioReadyRef.current = true;
        setAudioUnlocked(true);
      }
    }, 500);
    
    return () => {
      events.forEach(ev => document.removeEventListener(ev, unlock, { capture: true }));
      clearInterval(checkAudio);
      if (musicIntervalRef.current) clearInterval(musicIntervalRef.current);
    };
  }, [initAudio]);

  const playSound = useCallback((type) => {
    const s = settingsRef.current;
    if (!s?.sfxEnabled || s?.volume === 0) return;
    
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
        itemDrop: () => {
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
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
          gain.gain.setValueAtTime(vol * 0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
        },
      };

      if (sounds[type]) sounds[type]();
    } catch (e) {
      // Ignore audio errors
    }
  }, [settingsRef]);

  const startZoneMusic = useCallback((zoneId) => {
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
        
        const scaleNote = musicConfig.scale[noteIndex % musicConfig.scale.length];
        const freq = musicConfig.baseFreq * Math.pow(2, scaleNote / 12);
        const octaveShift = Math.random() < 0.15 ? (Math.random() < 0.5 ? 2 : 0.5) : 1;
        
        osc.type = musicConfig.waveType;
        osc.frequency.setValueAtTime(freq * octaveShift, ctx.currentTime);
        
        const now = ctx.currentTime;
        const noteDuration = 1 / musicConfig.tempo;
        
        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.5, now + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration * 0.9);
        
        osc.start(now);
        osc.stop(now + noteDuration);
        
        noteIndex++;
        if (Math.random() < 0.25) noteIndex++;
      } catch (e) {
        // Ignore
      }
    };
    
    const intervalMs = 1000 / musicConfig.tempo;
    musicIntervalRef.current = setInterval(playNote, intervalMs);
    setTimeout(playNote, 100);
  }, [settingsRef]);

  const stopMusic = useCallback(() => {
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
  }, []);

  const updateMusicVolume = useCallback((volume) => {
    if (musicGainRef.current && audioCtxRef.current) {
      const config = ZONE_MUSIC_CONFIG[lastZoneRef.current] || ZONE_MUSIC_CONFIG.sanctuary;
      musicGainRef.current.gain.setValueAtTime(config.volume * volume, audioCtxRef.current.currentTime);
    }
  }, []);

  return {
    playSound,
    startZoneMusic,
    stopMusic,
    updateMusicVolume,
    audioUnlocked,
    lastZoneRef,
    musicIntervalRef,
  };
}
