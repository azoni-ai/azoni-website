/**
 * Socket event handlers - extracted from main component
 * Call this function inside useEffect to set up all socket listeners
 */

export function setupSocketHandlers(socket, {
  // State setters
  setConnected,
  setAuthState,
  setAdminKey,
  setSelectedClass,
  setSelectedSkin,
  setSettings,
  setQuestLog,
  setCharacters,
  setSavedPlayer,
  setSelectedCharIdx,
  setScreen,
  setClasses,
  setPlayersOnline,
  setLeaderboard,
  setPlayerInfo,
  setInventory,
  setChatMessages,
  setWizardStatus,
  setWizardError,
  setGeneratedWizard,
  setWizardGenerating,
  setNpcDialogOpen,
  setCurrentNpc,
  setShowDeathScreen,
  setDeathInfo,
  setDungeonState,
  setShowDungeonComplete,
  setDungeonRewards,
  setAvailableDungeons,
  setShowQuestPopup,
  setActiveToast,
  // Refs
  sessionTokenRef,
  playerIdRef,
  playerDataRef,
  gameStateRef,
  effectsRef,
  meteorWarningsRef,
  pendingCustomWizardRef,
  screenRef,
  // Other
  SERVER_URL,
  initAudio,
}) {
  socket.on('connect', () => {
    setConnected(true);
    // Check for returning player
    const savedSession = localStorage.getItem('spellBrigadeSession');
    
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
              sessionTokenRef.current = token;
              // Auto-enable admin for azoni
              if (data.user?.username?.toLowerCase() === 'azoni') {
                setAdminKey('azoni-voidlord-2026');
                setSelectedClass('shadowarcher');
                setSelectedSkin('shadowarcher_default');
                socket.emit('authenticateAdmin', { sessionToken: token });
              }
              // Restore settings
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
                const lastChar = data.user.characters[0];
                setSavedPlayer(lastChar);
                setSelectedCharIdx(0);
                if (lastChar.class) {
                  setSelectedClass(lastChar.class);
                  setSelectedSkin(lastChar.selectedSkin || lastChar.class + '_default');
                }
              }
              setScreen('title');
              screenRef.current = 'title';
            } else {
              localStorage.removeItem('spellBrigadeSession');
              setScreen('auth');
              screenRef.current = 'auth';
            }
          })
          .catch(() => {
            setScreen('auth');
            screenRef.current = 'auth';
          });
      } catch {
        localStorage.removeItem('spellBrigadeSession');
        setScreen('auth');
        screenRef.current = 'auth';
      }
    } else {
      setScreen('auth');
      screenRef.current = 'auth';
    }
  });

  socket.on('disconnect', () => {
    setConnected(false);
  });

  socket.on('classes', (serverClasses) => {
    setClasses(serverClasses);
  });

  socket.on('playersOnline', ({ count }) => {
    setPlayersOnline(count);
  });

  socket.on('leaderboard', (data) => {
    setLeaderboard(data);
  });

  socket.on('joined', (data) => {
    playerIdRef.current = data.playerId;
    playerDataRef.current = data;
    setPlayerInfo(data);
    setScreen('game');
    screenRef.current = 'game';
    initAudio();
    
    // Save player ID
    localStorage.setItem('spellBrigadePlayerId', data.playerId);
    
    // Restore inventory if sent
    if (data.inventory) {
      setInventory(data.inventory);
    }
    
    // Restore chat history if available
    if (data.chatHistory) {
      try {
        setChatMessages(data.chatHistory.slice(-50));
      } catch {}
    }
    
    // Auto-apply pending custom wizard
    if (pendingCustomWizardRef.current) {
      const classId = pendingCustomWizardRef.current;
      console.log('🧙 Applying pending custom wizard:', classId);
      pendingCustomWizardRef.current = null;
      setTimeout(() => {
        console.log('🧙 Emitting selectCustomWizard for:', classId);
        socket.emit('selectCustomWizard', { classId });
      }, 500);
    }
  });

  socket.on('gameState', (state) => {
    gameStateRef.current = { ...gameStateRef.current, ...state };
    if (state.players) {
      setPlayersOnline(Object.keys(state.players).length);
    }
  });

  socket.on('playerUpdate', (update) => {
    if (playerIdRef.current && update.id === playerIdRef.current) {
      playerDataRef.current = { ...playerDataRef.current, ...update };
      setPlayerInfo(prev => prev ? { ...prev, ...update } : update);
    }
  });

  socket.on('levelUp', (data) => {
    setActiveToast({ 
      message: `Level Up! You are now level ${data.level}`, 
      type: 'levelup', 
      level: data.level 
    });
    setTimeout(() => setActiveToast(null), 3000);
    
    if (data.newAbility) {
      setTimeout(() => {
        setActiveToast({ 
          message: `New ability unlocked: ${data.newAbility}!`, 
          type: 'ability' 
        });
        setTimeout(() => setActiveToast(null), 3000);
      }, 3500);
    }
  });

  socket.on('xpGained', (data) => {
    if (playerDataRef.current) {
      playerDataRef.current.xp = data.xp;
      playerDataRef.current.level = data.level;
    }
  });

  socket.on('inventoryUpdate', (data) => {
    setInventory(data.inventory);
  });

  socket.on('questUpdate', (data) => {
    setQuestLog(prev => ({ ...prev, ...data }));
  });

  socket.on('questComplete', (data) => {
    setShowQuestPopup({ quest: data.quest, rewards: data.rewards });
    setTimeout(() => setShowQuestPopup(null), 5000);
  });

  socket.on('chat', (msg) => {
    setChatMessages(prev => [...prev.slice(-49), msg]);
  });

  socket.on('effect', (effect) => {
    effectsRef.current.push({ ...effect, createdAt: Date.now() });
  });

  socket.on('explosion', (data) => {
    effectsRef.current.push({ 
      type: 'explosion', 
      ...data, 
      createdAt: Date.now(), 
      duration: 500 
    });
  });

  socket.on('meteorWarning', (data) => {
    meteorWarningsRef.current.push({ ...data, createdAt: Date.now() });
  });

  socket.on('iceNova', (data) => {
    effectsRef.current.push({ 
      type: 'iceNova', 
      ...data, 
      createdAt: Date.now(), 
      duration: 600 
    });
  });

  socket.on('screenShake', (data) => {
    // Handled in render loop
  });

  socket.on('died', (data) => {
    setShowDeathScreen(true);
    setDeathInfo(data);
  });

  socket.on('respawned', () => {
    setShowDeathScreen(false);
    setDeathInfo(null);
  });

  // Dungeon events
  socket.on('dungeonEntered', (data) => {
    setDungeonState({ active: true, ...data });
  });

  socket.on('dungeonProgress', (data) => {
    setDungeonState(prev => ({ ...prev, ...data }));
  });

  socket.on('dungeonComplete', (data) => {
    setShowDungeonComplete(true);
    setDungeonRewards(data);
  });

  socket.on('exitedDungeon', () => {
    setDungeonState({ active: false });
    setShowDungeonComplete(false);
  });

  socket.on('dungeonsList', (dungeons) => {
    setAvailableDungeons(dungeons);
  });

  // NPC dialog
  socket.on('npcDialog', (data) => {
    setNpcDialogOpen(true);
    setCurrentNpc(data);
  });

  // Wizard generator events
  socket.on('wizardGenerateStatus', (data) => {
    setWizardStatus(data.message);
  });

  socket.on('wizardGenerateError', (data) => {
    setWizardError(data.message);
    setWizardGenerating(false);
    setWizardStatus('');
  });

  socket.on('wizardGenerated', (data) => {
    console.log('🧙 Wizard generated:', data.classDef?.name);
    setGeneratedWizard(data);
    setWizardGenerating(false);
    setWizardStatus('');
  });

  socket.on('wizardApplied', (data) => {
    console.log('🧙 Wizard applied:', data.className);
    setWizardStatus(`✅ You are now a ${data.className}!`);
    setTimeout(() => setWizardStatus(''), 3000);
  });

  // Custom ability effects
  socket.on('customAbilityEffect', (data) => {
    effectsRef.current.push({
      type: 'customAbility',
      x: data.x,
      y: data.y,
      radius: data.radius,
      color: data.color,
      name: data.name,
      createdAt: Date.now(),
      duration: data.duration || 2000,
    });
  });

  // Return cleanup function
  return () => {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('classes');
    socket.off('playersOnline');
    socket.off('leaderboard');
    socket.off('joined');
    socket.off('gameState');
    socket.off('playerUpdate');
    socket.off('levelUp');
    socket.off('xpGained');
    socket.off('inventoryUpdate');
    socket.off('questUpdate');
    socket.off('questComplete');
    socket.off('chat');
    socket.off('effect');
    socket.off('explosion');
    socket.off('meteorWarning');
    socket.off('iceNova');
    socket.off('screenShake');
    socket.off('died');
    socket.off('respawned');
    socket.off('dungeonEntered');
    socket.off('dungeonProgress');
    socket.off('dungeonComplete');
    socket.off('exitedDungeon');
    socket.off('dungeonsList');
    socket.off('npcDialog');
    socket.off('wizardGenerateStatus');
    socket.off('wizardGenerateError');
    socket.off('wizardGenerated');
    socket.off('wizardApplied');
    socket.off('customAbilityEffect');
  };
}
