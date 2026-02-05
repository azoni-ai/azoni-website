import React from 'react';

/**
 * All in-game modal overlays - extracted from main component
 * Includes: Skin Selector, Shop, Dungeon Browser, NPC Dialogue, 
 * Quest Log, Settings, Character Sheet, Admin Panel
 */
export default function GameModals({
  // Visibility states
  screen,
  showSkinSelect,
  setShowSkinSelect,
  showShop,
  setShowShop,
  showDungeonBrowser,
  setShowDungeonBrowser,
  npcDialogue,
  setNpcDialogue,
  showQuestLog,
  setShowQuestLog,
  showInGameSettings,
  setShowInGameSettings,
  showCharacterSheet,
  setShowCharacterSheet,
  showAdminPanel,
  setShowAdminPanel,
  showEmotes,
  setShowEmotes,
  showChat,
  setShowChat,
  showLeaderboard,
  setShowLeaderboard,
  // Data
  styles,
  isMobile,
  SVG,
  CLASS_SVG,
  DEFAULT_SKINS,
  classes,
  playerInfo,
  nearbyBuilding,
  questLog,
  setQuestLog,
  settings,
  setSettings,
  adminKey,
  leaderboardData,
  chatMessages,
  chatInput,
  setChatInput,
  chatContainerRef,
  bossAlert,
  levelUp,
  notification,
  nearbyNpc,
  nearbyPortal,
  dungeonBrowserTab,
  setDungeonBrowserTab,
  dungeonBrowserError,
  setDungeonBrowserError,
  dungeonPromptText,
  setDungeonPromptText,
  customDungeonList,
  dungeonVictoryPortal,
  setDungeonVictoryPortal,
  dungeonVictoryPortalRef,
  // Handlers
  handleChangeSkin,
  socketRef,
  playerIdRef,
  playSound,
  sessionTokenRef,
  setScreen,
  setSavedPlayer,
  setCharacters,
  setAdminKey,
  setAuthState,
}) {
  if (screen !== 'game') return null;

  return (
    <>
      {/* Level Up Popup */}
      {levelUp && (
        <div style={styles.levelUpPopup}>
          <span style={{ color: '#ffd93d', display: 'flex', alignItems: 'center', gap: 8, fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 600 }}>
            <span style={{ width: 20, height: 20 }}>{SVG.star}</span>
            Level {levelUp}!
          </span>
        </div>
      )}

      {/* Boss Spawn Alert */}
      {bossAlert && (
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
          border: `1px solid ${bossAlert.color}60`,
          boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 15px ${bossAlert.color}20`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.2rem' }}>{bossAlert.emoji}</span>
            <div>
              <div style={{ color: bossAlert.color, fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 600 }}>
                {bossAlert.name} Awakens!
              </div>
              <div style={{ color: '#888', fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                Boss spawned in {bossAlert.zone?.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Prompts */}
      <InteractionPrompts
        isMobile={isMobile}
        nearbyBuilding={nearbyBuilding}
        nearbyNpc={nearbyNpc}
        nearbyPortal={nearbyPortal}
        showShop={showShop}
        npcDialogue={npcDialogue}
        showSkinSelect={showSkinSelect}
        setShowShop={setShowShop}
        socketRef={socketRef}
        setDungeonVictoryPortal={setDungeonVictoryPortal}
        dungeonVictoryPortalRef={dungeonVictoryPortalRef}
      />

      {/* Skin Selector Modal */}
      {showSkinSelect && (
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
                      width: 70, height: 70, flexDirection: 'column', padding: 5,
                    }}
                    onClick={() => isUnlocked && handleChangeSkin(skin.id)}
                  >
                    <div style={{ ...styles.skinOptionInner(skin.color), width: 36, height: 36 }} />
                    <span style={{ fontSize: '.6rem', color: '#888', marginTop: 4 }}>{skin.name}</span>
                    {!isUnlocked && (
                      <div style={styles.skinLock}><span style={{ width: 12, height: 12 }}>{SVG.lock}</span></div>
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

      {/* Shop Modal */}
      {showShop && nearbyBuilding && (
        <ShopModalContent
          styles={styles}
          nearbyBuilding={nearbyBuilding}
          playerInfo={playerInfo}
          socketRef={socketRef}
          playSound={playSound}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* Dungeon Browser Modal */}
      {showDungeonBrowser && (
        <DungeonBrowserContent
          styles={styles}
          dungeonBrowserTab={dungeonBrowserTab}
          setDungeonBrowserTab={setDungeonBrowserTab}
          dungeonBrowserError={dungeonBrowserError}
          dungeonPromptText={dungeonPromptText}
          setDungeonPromptText={setDungeonPromptText}
          customDungeonList={customDungeonList}
          socketRef={socketRef}
          onClose={() => setShowDungeonBrowser(false)}
        />
      )}

      {/* Emote Wheel */}
      {showEmotes && (
        <EmoteWheel
          socketRef={socketRef}
          playSound={playSound}
          onClose={() => setShowEmotes(false)}
        />
      )}

      {/* Chat Box */}
      {showChat && (
        <ChatBox
          isMobile={isMobile}
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          chatContainerRef={chatContainerRef}
          classes={classes}
          socketRef={socketRef}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Chat Toggle Button - Desktop */}
      {!showChat && !isMobile && (
        <button
          onClick={() => setShowChat(true)}
          style={{
            position: 'fixed', bottom: 20, left: 20,
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}
        >💬</button>
      )}

      {/* NPC Dialogue Modal */}
      {npcDialogue && (
        <NPCDialogueContent
          styles={styles}
          npcDialogue={npcDialogue}
          playerInfo={playerInfo}
          questLog={questLog}
          setQuestLog={setQuestLog}
          classes={classes}
          socketRef={socketRef}
          playSound={playSound}
          setShowSkinSelect={setShowSkinSelect}
          setShowDungeonBrowser={setShowDungeonBrowser}
          setDungeonBrowserTab={setDungeonBrowserTab}
          setDungeonBrowserError={setDungeonBrowserError}
          onClose={() => setNpcDialogue(null)}
        />
      )}

      {/* Quest Log Modal */}
      {showQuestLog && (
        <QuestLogContent
          styles={styles}
          SVG={SVG}
          questLog={questLog}
          onClose={() => setShowQuestLog(false)}
        />
      )}

      {/* In-Game Settings Modal */}
      {showInGameSettings && (
        <InGameSettingsContent
          styles={styles}
          SVG={SVG}
          isMobile={isMobile}
          settings={settings}
          setSettings={setSettings}
          playerInfo={playerInfo}
          socketRef={socketRef}
          sessionTokenRef={sessionTokenRef}
          setScreen={setScreen}
          setSavedPlayer={setSavedPlayer}
          setCharacters={setCharacters}
          setAdminKey={setAdminKey}
          setAuthState={setAuthState}
          onClose={() => setShowInGameSettings(false)}
        />
      )}

      {/* Character Sheet Modal */}
      {showCharacterSheet && playerInfo && (
        <CharacterSheetContent
          styles={styles}
          SVG={SVG}
          CLASS_SVG={CLASS_SVG}
          playerInfo={playerInfo}
          classes={classes}
          onClose={() => setShowCharacterSheet(false)}
        />
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && adminKey && (
        <AdminPanelContent
          styles={styles}
          socketRef={socketRef}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {/* Settings & Leaderboard - Desktop */}
      {playerInfo && !isMobile && (
        <DesktopSidePanel
          showLeaderboard={showLeaderboard}
          setShowLeaderboard={setShowLeaderboard}
          showInGameSettings={showInGameSettings}
          setShowInGameSettings={setShowInGameSettings}
          leaderboardData={leaderboardData}
          playerInfo={playerInfo}
        />
      )}
    </>
  );
}

// Sub-components
function InteractionPrompts({ isMobile, nearbyBuilding, nearbyNpc, nearbyPortal, showShop, npcDialogue, showSkinSelect, setShowShop, socketRef, setDungeonVictoryPortal, dungeonVictoryPortalRef }) {
  if (showShop || npcDialogue || showSkinSelect) return null;

  return (
    <>
      {nearbyBuilding && (
        <div style={{
          position: 'fixed', bottom: isMobile ? 180 : 100, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', padding: '12px 25px',
          borderRadius: 15, zIndex: 800, border: `2px solid ${nearbyBuilding.color}`,
          textAlign: 'center', cursor: 'pointer',
        }} onClick={() => setShowShop(true)}>
          <div style={{ color: nearbyBuilding.color, fontWeight: 'bold', fontSize: '0.9rem' }}>{nearbyBuilding.name}</div>
          <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
            {isMobile ? 'Tap to interact' : 'Press E or Click to interact'}
          </div>
        </div>
      )}

      {nearbyNpc && !nearbyBuilding && (
        <div style={{
          position: 'fixed', bottom: isMobile ? 180 : 100, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', padding: '12px 25px',
          borderRadius: 15, zIndex: 800,
          border: `2px solid ${nearbyNpc.type === 'guide' ? '#67e8f9' : nearbyNpc.type === 'shapeshifter' ? '#ec4899' : nearbyNpc.type === 'quest_master' ? '#ffd93d' : '#a8a29e'}`,
          textAlign: 'center', cursor: 'pointer',
        }} onClick={() => socketRef.current?.emit('interactNpc', { npcId: nearbyNpc.id })}>
          <div style={{ color: nearbyNpc.type === 'guide' ? '#67e8f9' : nearbyNpc.type === 'shapeshifter' ? '#ec4899' : nearbyNpc.type === 'quest_master' ? '#ffd93d' : '#a8a29e', fontWeight: 'bold', fontSize: '0.9rem' }}>
            {nearbyNpc.emoji && <span style={{ marginRight: 6 }}>{nearbyNpc.emoji}</span>}
            {nearbyNpc.name}
          </div>
          <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
            {isMobile ? 'Tap to talk' : 'Press E to talk'}
          </div>
        </div>
      )}

      {nearbyPortal && !nearbyBuilding && !nearbyNpc && (
        <div style={{
          position: 'fixed', bottom: isMobile ? 180 : 100, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', padding: '12px 25px',
          borderRadius: 15, zIndex: 800, border: `2px solid ${nearbyPortal.color || '#a855f7'}`,
          textAlign: 'center', cursor: 'pointer',
        }} onClick={() => {
          if (nearbyPortal.isDungeonExit) {
            socketRef.current?.emit('exitDungeon');
            if (nearbyPortal.id === 'dungeon_victory') {
              setDungeonVictoryPortal?.(null);
              if (dungeonVictoryPortalRef) dungeonVictoryPortalRef.current = null;
            }
          } else {
            socketRef.current?.emit('usePortal', { portalId: nearbyPortal.id });
          }
        }}>
          <div style={{ color: nearbyPortal.color || '#a855f7', fontWeight: 'bold', fontSize: '0.9rem' }}>
            🌀 {nearbyPortal.name || 'Portal'}
          </div>
          <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
            {isMobile ? 'Tap to enter' : 'Press E to enter'}
          </div>
        </div>
      )}
    </>
  );
}

function ShopModalContent({ styles, nearbyBuilding, playerInfo, socketRef, playSound, onClose }) {
  const upgradeMap = {
    forest_ruins: { type: 'health', icon: '❤️', name: 'Max Health +5', desc: 'Permanently increase max health', baseCost: 1000, color: '#ef4444', flavorText: 'Ancient vitality courses through the stone walls.' },
    volcano_fortress: { type: 'damage', icon: '⚔️', name: 'Damage +1%', desc: 'Increase all spell damage', baseCost: 1500, color: '#f97316', flavorText: 'The forge burns with unstoppable fury.' },
    ice_citadel: { type: 'cooldown', icon: '⏱️', name: 'Cooldown -1%', desc: 'Cast abilities more often', baseCost: 2000, color: '#3b82f6', flavorText: 'Time itself freezes at your command.' },
    void_shrine: { type: 'speed', icon: '👟', name: 'Speed +1%', desc: 'Move faster (max 3x)', baseCost: 1200, color: '#7c3aed', flavorText: 'The void bends space around you.', maxLevel: 200 },
    crystal_sanctum: { type: 'attackSpeed', icon: '⚡', name: 'Attack Speed +2%', desc: 'Auto-attack fires faster', baseCost: 1500, color: '#ec4899', flavorText: 'Crystal energy quickens your reflexes.' },
  };

  return (
    <>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={{ ...styles.modal, maxWidth: 420, maxHeight: '80vh', overflowY: 'auto' }}>
        <button style={styles.modalClose} onClick={onClose}>×</button>
        <h3 style={{ ...styles.modalTitle, color: nearbyBuilding.color }}>{nearbyBuilding.name}</h3>
        
        {nearbyBuilding.id === 'wizard_tower' ? (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 15 }}>🧙‍♂️</div>
            <div style={{ color: '#ffd93d', fontWeight: 600, fontSize: '1rem', marginBottom: 12 }}>The Archmage speaks...</div>
            <div style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 15 }}>
              "Seek the buildings scattered across the realm to grow stronger, young wizard."
            </div>
          </div>
        ) : (() => {
          const upgrade = upgradeMap[nearbyBuilding.id];
          if (!upgrade) return <div style={{ color: '#888', textAlign: 'center', padding: 20 }}>Nothing to offer here.</div>;
          const currentLevel = playerInfo?.upgrades?.[upgrade.type] || 0;
          const cost = Math.floor(upgrade.baseCost * (1 + currentLevel * 0.15));
          const isMaxed = upgrade.maxLevel && currentLevel >= upgrade.maxLevel;
          return (
            <div style={{ padding: '10px 0' }}>
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: 20, textAlign: 'center', fontStyle: 'italic' }}>{upgrade.flavorText}</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 16px', marginBottom: 15, textAlign: 'center', border: `1px solid ${upgrade.color}20` }}>
                <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Current Level</div>
                <div style={{ color: upgrade.color, fontSize: '1.6rem', fontWeight: 700 }}>{currentLevel}{upgrade.maxLevel ? ` / ${upgrade.maxLevel}` : ''}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 18, border: `1px solid ${upgrade.color}40` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: upgrade.color, fontWeight: 'bold', fontSize: '1rem' }}>{upgrade.icon} {upgrade.name}</div>
                    <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>{upgrade.desc}</div>
                  </div>
                  {isMaxed ? (
                    <div style={{ padding: '10px 18px', background: 'rgba(100,100,100,0.3)', borderRadius: 8, color: '#888', fontWeight: 'bold', fontSize: '0.9rem' }}>MAXED</div>
                  ) : (
                    <button style={{ background: `linear-gradient(135deg, ${upgrade.color}, ${upgrade.color}cc)`, border: 'none', borderRadius: 8, padding: '10px 18px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                      onClick={() => { socketRef.current?.emit('buyUpgrade', { type: upgrade.type, buildingId: nearbyBuilding.id }); playSound?.('levelUp'); }}>
                      {cost.toLocaleString()} XP
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        <div style={{ marginTop: 20, textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>
          Your XP: <span style={{ color: '#ffd93d', fontWeight: 'bold' }}>{playerInfo?.totalXp || 0}</span>
        </div>
      </div>
    </>
  );
}

function DungeonBrowserContent({ styles, dungeonBrowserTab, setDungeonBrowserTab, dungeonBrowserError, dungeonPromptText, setDungeonPromptText, customDungeonList, socketRef, onClose }) {
  return (
    <>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={{ ...styles.modal, maxWidth: 500, maxHeight: '85vh', overflowY: 'auto' }}>
        <button style={styles.modalClose} onClick={onClose}>×</button>
        <h3 style={{ ...styles.modalTitle, color: '#8b5cf6' }}>🏗️ Dungeon Workshop</h3>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
          {['create', 'browse'].map(t => (
            <button key={t} onClick={() => setDungeonBrowserTab(t)} style={{
              padding: '8px 20px',
              background: dungeonBrowserTab === t ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
              border: dungeonBrowserTab === t ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: dungeonBrowserTab === t ? '#a78bfa' : '#888',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            }}>
              {t === 'create' ? '✨ Create' : '⚔️ Browse'}
            </button>
          ))}
        </div>
        
        {dungeonBrowserError && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 15, color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>
            {dungeonBrowserError}
          </div>
        )}
        
        {dungeonBrowserTab === 'create' ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 15, lineHeight: 1.6 }}>
              Describe your dungeon and it will be brought to life!<br/>
              <span style={{ color: '#666', fontSize: '0.75rem' }}>Try: "a frozen crypt", "fire and chaos nightmare"</span>
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
              <input type="text" value={dungeonPromptText} onChange={(e) => setDungeonPromptText(e.target.value)}
                placeholder="Describe your dungeon..." maxLength={150}
                style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                onKeyDown={(e) => { if (e.key === 'Enter' && dungeonPromptText.trim().length >= 3) socketRef.current?.emit('createCustomDungeon', { prompt: dungeonPromptText.trim() }); }}
              />
              <button disabled={dungeonPromptText.trim().length < 3}
                onClick={() => { if (dungeonPromptText.trim().length >= 3) socketRef.current?.emit('createCustomDungeon', { prompt: dungeonPromptText.trim() }); }}
                style={{ padding: '12px 20px', background: dungeonPromptText.trim().length >= 3 ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(50,50,50,0.5)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: dungeonPromptText.trim().length >= 3 ? 'pointer' : 'not-allowed', fontSize: '0.85rem' }}>
                Generate
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Fire Depths', 'Frozen Crypt', 'Bone Tombs', 'Nature Maze', 'Void Rift'].map(preset => (
                <button key={preset} onClick={() => setDungeonPromptText(preset)}
                  style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#888', fontSize: '0.7rem', cursor: 'pointer' }}>
                  {preset}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {customDungeonList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#666' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🏚️</div>
                <p>No dungeons yet. Be the first to create one!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {customDungeonList.map(d => (
                  <div key={d.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${d.boss?.color || '#666'}30`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <div style={{ color: d.boss?.color || '#fff', fontWeight: 700, fontSize: '0.95rem' }}>{d.name}</div>
                        <div style={{ color: '#666', fontSize: '0.7rem' }}>by {d.creator} · {d.roomCount} rooms · {d.difficulty}</div>
                      </div>
                      <button onClick={() => { socketRef.current?.emit('enterCustomDungeon', { dungeonId: d.id }); onClose(); }}
                        style={{ padding: '8px 16px', background: `linear-gradient(135deg, ${d.boss?.color || '#8b5cf6'}, ${d.boss?.color || '#8b5cf6'}cc)`, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
                        Enter
                      </button>
                    </div>
                    {d.boss && <div style={{ color: d.boss.color, fontSize: '0.7rem' }}>Boss: {d.boss.name}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function EmoteWheel({ socketRef, playSound, onClose }) {
  const emotes = [
    { id: 'wave', emoji: '👋', label: 'Wave', angle: 0 },
    { id: 'dance', emoji: '💃', label: 'Dance', angle: 60 },
    { id: 'cheer', emoji: '🎉', label: 'Cheer', angle: 120 },
    { id: 'spin', emoji: '🌀', label: 'Spin', angle: 180 },
    { id: 'sit', emoji: '🧘', label: 'Sit', angle: 240 },
    { id: 'laugh', emoji: '😂', label: 'Laugh', angle: 300 },
  ];
  const radius = 100;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
        {emotes.map(emote => {
          const rad = (emote.angle - 90) * Math.PI / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          return (
            <button key={emote.id}
              style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`, width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,0,0,0.9)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onClick={() => { socketRef.current?.emit('emote', { type: emote.id }); onClose(); playSound?.('dash'); }}>
              <span style={{ fontSize: '1.5rem' }}>{emote.emoji}</span>
              <span style={{ fontSize: '0.6rem', color: '#888', marginTop: 2 }}>{emote.label}</span>
            </button>
          );
        })}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.95)', borderRadius: '50%', width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,217,61,0.5)' }}>
          <span style={{ color: '#888', fontSize: '0.7rem', textAlign: 'center' }}>Press T<br/>to close</span>
        </div>
      </div>
    </>
  );
}

function ChatBox({ isMobile, chatMessages, chatInput, setChatInput, chatContainerRef, classes, socketRef, onClose }) {
  return (
    <div style={{
      position: 'fixed', bottom: isMobile ? 170 : 20, left: isMobile ? 10 : 20,
      width: isMobile ? 260 : 320, maxHeight: isMobile ? 180 : 200,
      background: isMobile ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(5px)', borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', flexDirection: 'column', zIndex: 50, overflow: 'hidden',
    }}>
      <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: '#888' }}>Chat</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
      </div>
      <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: isMobile ? 120 : 120 }}>
        {chatMessages.map(msg => {
          let nameColor = classes[msg.playerClass]?.color || '#fff';
          if (nameColor?.toLowerCase().startsWith('#0') || nameColor?.toLowerCase().startsWith('#1')) {
            nameColor = classes[msg.playerClass]?.secondaryColor || '#a78bfa';
          }
          return (
            <div key={msg.id} style={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
              {msg.type === 'system' ? (
                <span style={{ color: '#888', fontStyle: 'italic' }}>{msg.text}</span>
              ) : (
                <>
                  <span style={{ color: nameColor, fontWeight: 600 }}>{msg.playerName}:</span>
                  <span style={{ color: '#ccc', marginLeft: 6 }}>{msg.text}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (chatInput.trim()) { socketRef.current?.emit('chat', chatInput.trim()); setChatInput(''); } }}
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
          placeholder="Press Enter to chat..." maxLength={200}
          style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: '0.75rem', outline: 'none' }} />
      </form>
    </div>
  );
}

function NPCDialogueContent({ 
  styles, 
  npcDialogue, 
  playerInfo, 
  questLog, 
  setQuestLog,
  classes, 
  socketRef, 
  playSound,
  setShowSkinSelect,
  setShowDungeonBrowser,
  setDungeonBrowserTab,
  setDungeonBrowserError,
  onClose 
}) {
  const npcColor = npcDialogue.npcType === 'guide' ? '#67e8f9' 
    : npcDialogue.npcType === 'quest_master' ? '#ffd93d' 
    : npcDialogue.npcType === 'shapeshifter' ? '#ec4899' 
    : npcDialogue.npcType === 'knight' ? '#dc2626'
    : npcDialogue.npcType === 'dungeon_architect' ? '#8b5cf6'
    : '#a8a29e';
  
  return (
    <>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={{
        ...styles.modal, maxWidth: 450,
        background: npcDialogue.npcType === 'guide' ? 'linear-gradient(135deg, rgba(20,30,40,0.98), rgba(30,60,80,0.98))' :
          npcDialogue.npcType === 'quest_master' ? 'linear-gradient(135deg, rgba(40,30,50,0.98), rgba(60,40,70,0.98))' :
          npcDialogue.npcType === 'shapeshifter' ? 'linear-gradient(135deg, rgba(60,20,50,0.98), rgba(80,30,60,0.98))' :
          npcDialogue.npcType === 'knight' ? 'linear-gradient(135deg, rgba(40,20,20,0.98), rgba(60,25,25,0.98))' :
          npcDialogue.npcType === 'dungeon_architect' ? 'linear-gradient(135deg, rgba(30,20,50,0.98), rgba(50,30,70,0.98))' :
          'linear-gradient(135deg, rgba(30,25,20,0.98), rgba(50,40,30,0.98))',
        border: `2px solid ${npcColor}80`,
      }}>
        <button style={styles.modalClose} onClick={onClose}>×</button>
        
        {/* NPC Avatar & Name */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ 
            width: 60, height: 60, borderRadius: '50%', 
            background: `linear-gradient(135deg, ${npcColor}, ${npcColor}cc)`, 
            margin: '0 auto 10px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '1.8rem', 
            boxShadow: `0 0 20px ${npcColor}50` 
          }}>
            {npcDialogue.npcType === 'guide' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ) : npcDialogue.npcType === 'quest_master' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            ) : npcDialogue.npcType === 'knight' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 3.9l1.71 3.6 3.88.3-2.95 2.52.88 3.78L12 13.4l-3.52 1.7.88-3.78-2.95-2.52 3.88-.3L12 4.9z"/>
              </svg>
            ) : npcDialogue.npcType === 'dungeon_architect' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
              </svg>
            ) : npcDialogue.npcType === 'shapeshifter' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            ) : (
              <span>{npcDialogue.emoji || '🧙'}</span>
            )}
          </div>
          <h3 style={{ margin: 0, color: npcColor, fontSize: '1.1rem' }}>{npcDialogue.npcName}</h3>
        </div>
        
        {/* Dialogue Text - handle both array and string */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
          {Array.isArray(npcDialogue.dialogue) ? (
            npcDialogue.dialogue.map((line, i) => (
              <p key={i} style={{ 
                color: '#e5e5e5', 
                margin: i === npcDialogue.dialogue.length - 1 ? 0 : '0 0 10px 0',
                lineHeight: 1.5,
                fontSize: '0.9rem',
              }}>
                "{line}"
              </p>
            ))
          ) : (
            <p style={{ color: '#ddd', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              {npcDialogue.dialogue}
            </p>
          )}
        </div>
        
        {/* Follow-up dialogue */}
        {npcDialogue.followUp && (
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 10,
            padding: 15,
            marginBottom: 15,
            borderLeft: `3px solid ${npcDialogue.npcType === 'quest_master' ? '#ffd93d' : '#f97316'}`,
          }}>
            {npcDialogue.followUp.map((line, i) => (
              <p key={i} style={{ 
                color: npcDialogue.npcType === 'quest_master' ? '#fcd34d' : '#fbbf24', 
                margin: i === npcDialogue.followUp.length - 1 ? 0 : '0 0 8px 0',
                lineHeight: 1.4,
                fontSize: '0.85rem',
              }}>
                {line}
              </p>
            ))}
          </div>
        )}
        
        {/* Quest Master - Accept Quest */}
        {npcDialogue.npcType === 'quest_master' && npcDialogue.hasChoice && npcDialogue.prompt && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: '#fff', textAlign: 'center', marginBottom: 15, fontWeight: 600 }}>
              {npcDialogue.prompt}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setQuestLog?.(prev => ({
                    ...prev,
                    allBosses: { ...prev?.allBosses, active: true },
                  }));
                  onClose();
                  playSound?.('levelUp');
                }}
                style={{
                  padding: '12px 25px',
                  background: 'linear-gradient(135deg, #ffd93d, #f97316)',
                  border: 'none', borderRadius: 8, color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                Accept Quest
              </button>
              <button onClick={onClose} style={{
                padding: '12px 25px', background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
              }}>
                Maybe later
              </button>
            </div>
          </div>
        )}
        
        {/* Knight - Dragon Dungeon */}
        {npcDialogue.npcType === 'knight' && npcDialogue.hasChoice && npcDialogue.prompt && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: '#fff', textAlign: 'center', marginBottom: 15, fontWeight: 600 }}>
              {npcDialogue.prompt}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  socketRef.current?.emit('enterDungeon');
                  setQuestLog?.(prev => ({
                    ...prev,
                    dragonSlayer: { ...prev?.dragonSlayer, active: true },
                  }));
                  onClose();
                }}
                style={{
                  padding: '12px 25px',
                  background: npcDialogue.playerLevel >= npcDialogue.recommendedLevel
                    ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                    : 'linear-gradient(135deg, #78716c, #57534e)',
                  border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                Enter the Gauntlet
                {npcDialogue.playerLevel < npcDialogue.recommendedLevel && (
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#fbbf24', marginTop: 4 }}>
                    (Lv {npcDialogue.playerLevel} / Rec: {npcDialogue.recommendedLevel})
                  </span>
                )}
              </button>
              <button onClick={onClose} style={{
                padding: '12px 25px', background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
              }}>
                Not yet
              </button>
            </div>
          </div>
        )}
        
        {/* Shapeshifter - Change Appearance */}
        {npcDialogue.npcType === 'shapeshifter' && npcDialogue.hasChoice && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: '#fff', textAlign: 'center', marginBottom: 15, fontWeight: 600 }}>
              {npcDialogue.prompt}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  onClose();
                  setShowSkinSelect?.(true);
                }}
                style={{
                  padding: '12px 25px',
                  background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                  border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                🎨 Change Appearance
              </button>
              <button onClick={onClose} style={{
                padding: '12px 25px', background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
              }}>
                Not now
              </button>
            </div>
          </div>
        )}
        
        {/* Dungeon Architect - Create/Browse Dungeons */}
        {npcDialogue.npcType === 'dungeon_architect' && npcDialogue.hasChoice && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  onClose();
                  setShowDungeonBrowser?.(true);
                  setDungeonBrowserTab?.('create');
                  setDungeonBrowserError?.('');
                  socketRef.current?.emit('listCustomDungeons');
                }}
                style={{
                  padding: '12px 20px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                🏗️ Create Dungeon
              </button>
              <button
                onClick={() => {
                  onClose();
                  setShowDungeonBrowser?.(true);
                  setDungeonBrowserTab?.('browse');
                  setDungeonBrowserError?.('');
                  socketRef.current?.emit('listCustomDungeons');
                }}
                style={{
                  padding: '12px 20px', background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                  border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                ⚔️ Browse Dungeons
              </button>
              <button onClick={onClose} style={{
                padding: '12px 20px', background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
              }}>
                Leave
              </button>
            </div>
          </div>
        )}
        
        {/* Simple close for guide or no-choice NPCs */}
        {!npcDialogue.hasChoice && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 30px',
                background: npcDialogue.npcType === 'quest_master'
                  ? 'rgba(255, 215, 61, 0.2)'
                  : 'rgba(103, 232, 249, 0.2)',
                border: npcDialogue.npcType === 'quest_master'
                  ? '1px solid rgba(255, 215, 61, 0.4)'
                  : '1px solid rgba(103, 232, 249, 0.4)',
                borderRadius: 8,
                color: npcDialogue.npcType === 'quest_master' ? '#ffd93d' : '#67e8f9',
                cursor: 'pointer',
              }}
            >
              Farewell
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function QuestLogContent({ styles, SVG, questLog, onClose }) {
  return (
    <>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={{ ...styles.modal, maxWidth: 400 }}>
        <button style={styles.modalClose} onClick={onClose}>×</button>
        <h3 style={{ ...styles.modalTitle, color: '#ffd93d' }}>
          <span style={{ width: 24, height: 24 }}>{SVG.scroll}</span> Quest Log
        </h3>
        {(!questLog || questLog.length === 0) ? (
          <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>No active quests. Talk to NPCs to find quests!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questLog.map(q => (
              <div key={q.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${q.completed ? '#22c55e' : '#ffd93d'}30`, borderRadius: 10, padding: 14 }}>
                <div style={{ color: q.completed ? '#22c55e' : '#ffd93d', fontWeight: 600, fontSize: '0.95rem', marginBottom: 6 }}>
                  {q.completed ? '✓ ' : ''}{q.title}
                </div>
                <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>{q.description}</p>
                {q.progress !== undefined && !q.completed && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                      <div style={{ height: '100%', background: '#ffd93d', borderRadius: 2, width: `${(q.progress / q.target) * 100}%` }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 4 }}>{q.progress}/{q.target}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function InGameSettingsContent({ styles, SVG, isMobile, settings, setSettings, playerInfo, socketRef, sessionTokenRef, setScreen, setSavedPlayer, setCharacters, setAdminKey, setAuthState, onClose }) {
  return (
    <>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={{ ...styles.modal, maxWidth: 380 }}>
        <button style={styles.modalClose} onClick={onClose}>×</button>
        <h3 style={styles.modalTitle}>
          <span style={{ width: 24, height: 24 }}>{SVG.settings}</span> Settings
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SettingRow label="SFX Volume" icon={SVG.volume}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="range" min="0" max="100" value={settings.volume * 100} onChange={(e) => setSettings(s => ({ ...s, volume: e.target.value / 100 }))} style={{ width: 80 }} />
              <span style={{ color: '#aaa', fontSize: '0.75rem', minWidth: 32 }}>{Math.round(settings.volume * 100)}%</span>
            </div>
          </SettingRow>
          <SettingRow label="Music Volume" icon={SVG.music}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="range" min="0" max="100" value={(settings.musicVolume || 0.3) * 100} onChange={(e) => setSettings(s => ({ ...s, musicVolume: e.target.value / 100 }))} style={{ width: 80 }} />
              <span style={{ color: '#aaa', fontSize: '0.75rem', minWidth: 32 }}>{Math.round((settings.musicVolume || 0.3) * 100)}%</span>
            </div>
          </SettingRow>
          <SettingRow label="Sound Effects" icon={SVG.volume}>
            <Toggle value={settings.sfxEnabled} onChange={() => setSettings(s => ({ ...s, sfxEnabled: !s.sfxEnabled }))} />
          </SettingRow>
          <SettingRow label="Zone Music" icon={SVG.music}>
            <Toggle value={settings.musicEnabled} onChange={() => setSettings(s => ({ ...s, musicEnabled: !s.musicEnabled }))} />
          </SettingRow>
          <SettingRow label="Zone Names" icon={SVG.home}>
            <Toggle value={settings.showZoneNames} onChange={() => setSettings(s => ({ ...s, showZoneNames: !s.showZoneNames }))} />
          </SettingRow>
          <SettingRow label="Minimap" icon={SVG.star}>
            <Toggle value={settings.showMinimap} onChange={() => setSettings(s => ({ ...s, showMinimap: !s.showMinimap }))} />
          </SettingRow>
        </div>
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 10 }}>
          <button onClick={() => { 
            socketRef.current?.emit('leave');
            playerIdRef.current = null; 
            setTimeout(() => socketRef.current?.disconnect(), 100);
            setScreen('title'); 
            onClose(); 
          }}
            style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#888', cursor: 'pointer', fontSize: '0.85rem' }}>
            Return to Menu
          </button>
          <button onClick={() => {
            setAuthState?.({ isAuthenticated: false, isGuest: false, user: null, sessionToken: null });
            localStorage.removeItem('spellBrigadeSession');
            setSavedPlayer?.(null); setCharacters?.([]); setAdminKey?.('');
            socketRef.current?.emit('leave');
            playerIdRef.current = null;
            setTimeout(() => socketRef.current?.disconnect(), 100);
            setScreen('auth'); onClose();
          }}
            style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

function SettingRow({ label, icon, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 18, height: 18, color: '#888' }}>{icon}</span> {label}
      </span>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#22c55e' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
      <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 3, left: value ? 23 : 3, transition: 'left 0.2s' }} />
    </div>
  );
}

function CharacterSheetContent({ styles, SVG, CLASS_SVG, playerInfo, classes, onClose }) {
  const classData = classes[playerInfo.class] || {};
  return (
    <>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={{ ...styles.modal, maxWidth: 400 }}>
        <button style={styles.modalClose} onClick={onClose}>×</button>
        <h3 style={{ ...styles.modalTitle, color: classData.color }}>
          <span style={{ width: 24, height: 24 }}>{CLASS_SVG[playerInfo.class] || SVG.arcane}</span>
          {playerInfo.name}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatCard label="Level" value={playerInfo.level} color="#ffd93d" />
          <StatCard label="Class" value={classData.name || playerInfo.class} color={classData.color} />
          <StatCard label="Total XP" value={(playerInfo.totalXp || 0).toLocaleString()} color="#22c55e" />
          <StatCard label="Kills" value={playerInfo.kills || 0} color="#ef4444" />
          <StatCard label="Max HP" value={playerInfo.maxHealth} color="#ef4444" />
          <StatCard label="Speed" value={Math.round(playerInfo.speed || classData.baseSpeed || 150)} color="#60a5fa" />
        </div>
        {playerInfo.upgrades && Object.keys(playerInfo.upgrades).length > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: 8, textTransform: 'uppercase' }}>Upgrades</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(playerInfo.upgrades).map(([type, level]) => (
                <div key={type} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: '0.75rem', color: '#aaa' }}>
                  {type}: +{level}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
      <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: '1.2rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function AdminPanelContent({ styles, socketRef, onClose }) {
  const [adminCmd, setAdminCmd] = React.useState('');
  return (
    <>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={{ ...styles.modal, maxWidth: 400 }}>
        <button style={styles.modalClose} onClick={onClose}>×</button>
        <h3 style={{ ...styles.modalTitle, color: '#ff00ff' }}>⚡ Admin Panel</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
          <input type="text" value={adminCmd} onChange={(e) => setAdminCmd(e.target.value)}
            placeholder="Command..." style={{ flex: 1, padding: '10px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,0,255,0.3)', borderRadius: 8, color: '#fff', fontSize: '0.9rem', outline: 'none' }}
            onKeyDown={(e) => { if (e.key === 'Enter' && adminCmd.trim()) { socketRef.current?.emit('adminCommand', { command: adminCmd.trim() }); setAdminCmd(''); } }} />
          <button onClick={() => { if (adminCmd.trim()) { socketRef.current?.emit('adminCommand', { command: adminCmd.trim() }); setAdminCmd(''); } }}
            style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #ff00ff, #8b00ff)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Run
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['spawnBoss dragon', 'heal', 'levelup 10', 'speed 300', 'killall'].map(cmd => (
            <button key={cmd} onClick={() => socketRef.current?.emit('adminCommand', { command: cmd })}
              style={{ padding: '6px 12px', background: 'rgba(255,0,255,0.1)', border: '1px solid rgba(255,0,255,0.3)', borderRadius: 6, color: '#ff88ff', fontSize: '0.75rem', cursor: 'pointer' }}>
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function DesktopSidePanel({ showLeaderboard, setShowLeaderboard, showInGameSettings, setShowInGameSettings, leaderboardData, playerInfo }) {
  return (
    <div style={{ position: 'fixed', top: 220, left: 20, zIndex: 50 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setShowInGameSettings(true)}
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#888"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
        </button>
        <button onClick={() => setShowLeaderboard(p => !p)}
          style={{ background: showLeaderboard ? 'rgba(255,215,61,0.15)' : 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: 10, borderRadius: 10, border: `1px solid ${showLeaderboard ? 'rgba(255,215,61,0.4)' : 'rgba(255,255,255,0.15)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={showLeaderboard ? '#ffd93d' : '#888'}><path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/></svg>
        </button>
      </div>
      {showLeaderboard && leaderboardData.length > 0 && (
        <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderRadius: 12, border: '1px solid rgba(255,215,61,0.2)', padding: 12, minWidth: 200 }}>
          <div style={{ fontSize: '0.7rem', color: '#ffd93d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Top Players</div>
          {leaderboardData.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: i < leaderboardData.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <span style={{ width: 16, fontSize: '0.7rem', fontWeight: 700, color: i === 0 ? '#ffd93d' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#666' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: '0.8rem', color: p.name === playerInfo?.name ? '#ffd93d' : '#ddd', fontWeight: p.name === playerInfo?.name ? 600 : 400 }}>{p.name}</span>
              <span style={{ fontSize: '0.65rem', color: '#888' }}>Lv{p.level}</span>
              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>{p.kills}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
