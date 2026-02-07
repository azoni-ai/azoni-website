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
  showSpellbook,
  setShowSpellbook,
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
        playerInfo={playerInfo}
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
          playerIdRef={playerIdRef}
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

      {/* Spellbook Modal */}
      {showSpellbook && playerInfo && (
        <SpellbookContent
          styles={styles}
          playerInfo={playerInfo}
          classes={classes}
          onClose={() => setShowSpellbook(false)}
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
function InteractionPrompts({ isMobile, nearbyBuilding, nearbyNpc, nearbyPortal, playerInfo, showShop, npcDialogue, showSkinSelect, setShowShop, socketRef, setDungeonVictoryPortal, dungeonVictoryPortalRef }) {
  if (showShop || npcDialogue || showSkinSelect) return null;

  // Check if building is locked (boss not defeated)
  const bossZoneMap = {
    forest_ruins: 'forest', volcano_fortress: 'volcanic', ice_citadel: 'frozen',
    void_shrine: 'abyss', crystal_sanctum: 'crystal_caves',
  };
  const bossKills = playerInfo?.bossKills || {};
  const buildingBossZone = nearbyBuilding ? bossZoneMap[nearbyBuilding.id] : null;
  const isBuildingLocked = buildingBossZone && !bossKills[buildingBossZone];

  return (
    <>
      {nearbyBuilding && (
        <div style={{
          position: 'fixed', bottom: isMobile ? 180 : 100, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', padding: '12px 25px',
          borderRadius: 15, zIndex: 800, border: `2px solid ${isBuildingLocked ? '#ef4444' : nearbyBuilding.color}`,
          textAlign: 'center', cursor: 'pointer',
        }} onClick={() => setShowShop(true)}>
          <div style={{ color: isBuildingLocked ? '#ef4444' : nearbyBuilding.color, fontWeight: 'bold', fontSize: '0.9rem' }}>
            {isBuildingLocked ? '🔒 ' : ''}{nearbyBuilding.name}
          </div>
          <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
            {isBuildingLocked
              ? 'Defeat the zone boss to unlock'
              : (isMobile ? 'Tap to interact' : 'Press E or Click to interact')
            }
          </div>
        </div>
      )}

      {nearbyNpc && !nearbyBuilding && (
        <div style={{
          position: 'fixed', bottom: isMobile ? 180 : 100, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', padding: '12px 25px',
          borderRadius: 15, zIndex: 800,
          border: `2px solid ${nearbyNpc.isQuestGiver ? nearbyNpc.color : nearbyNpc.type === 'guide' ? '#67e8f9' : nearbyNpc.type === 'shapeshifter' ? '#ec4899' : nearbyNpc.type === 'quest_master' ? '#ffd93d' : '#a8a29e'}`,
          textAlign: 'center', cursor: 'pointer',
        }} onClick={() => {
          if (nearbyNpc.isQuestGiver) {
            // Handle quest NPC dialogue client-side
            const qnpc = nearbyNpc;
            // Use the setNpcDialogue from parent - emit a custom event
            socketRef.current?.emit('interactNpc', { npcId: qnpc.id, isQuestGiver: true });
          } else {
            socketRef.current?.emit('interactNpc', { npcId: nearbyNpc.id });
          }
        }}>
          <div style={{ color: nearbyNpc.isQuestGiver ? nearbyNpc.color : nearbyNpc.type === 'guide' ? '#67e8f9' : nearbyNpc.type === 'shapeshifter' ? '#ec4899' : nearbyNpc.type === 'quest_master' ? '#ffd93d' : '#a8a29e', fontWeight: 'bold', fontSize: '0.9rem' }}>
            {(nearbyNpc.emoji || nearbyNpc.icon) && <span style={{ marginRight: 6 }}>{nearbyNpc.emoji || nearbyNpc.icon}</span>}
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
  const [showUpgrade, setShowUpgrade] = React.useState(false);
  
  const upgradeMap = {
    forest_ruins: { type: 'health', icon: '❤️', name: 'Max Health +5', desc: 'Permanently increase max health', baseCost: 1000, color: '#ef4444', flavorText: 'Ancient vitality courses through the stone walls.' },
    volcano_fortress: { type: 'damage', icon: '⚔️', name: 'Damage +1%', desc: 'Increase all spell damage', baseCost: 1500, color: '#f97316', flavorText: 'The forge burns with unstoppable fury.' },
    ice_citadel: { type: 'cooldown', icon: '⏱️', name: 'Cooldown -1%', desc: 'Cast abilities more often', baseCost: 2000, color: '#3b82f6', flavorText: 'Time itself freezes at your command.' },
    void_shrine: { type: 'speed', icon: '👟', name: 'Speed +1%', desc: 'Move faster (max 3x)', baseCost: 1200, color: '#7c3aed', flavorText: 'The void bends space around you.', maxLevel: 200 },
    crystal_sanctum: { type: 'attackSpeed', icon: '⚡', name: 'Attack Speed +2%', desc: 'Auto-attack fires faster', baseCost: 1500, color: '#ec4899', flavorText: 'Crystal energy quickens your reflexes.' },
  };

  // Building lore and info
  const buildingLore = {
    wizard_tower: {
      emoji: '🏰',
      keeper: 'The Archmage',
      lore: [
        "Welcome to the Archmage's Tower, heart of the Sanctuary.",
        "From here, I have watched the corruption spread across every zone.",
        "Six ancient bosses guard the land — each must be defeated to unlock the buildings in their domain.",
        "Prove your worth, young wizard, and the power of each stronghold shall be yours.",
      ],
      warning: null, // Always accessible
      bossZone: null,
    },
    forest_ruins: {
      emoji: '🏚️',
      keeper: 'The Runekeeper',
      lore: [
        "These ruins predate even the oldest trees of the forest.",
        "The Ancient Treant wrapped its roots through the walls, sealing the vitality magic within.",
        "Only those who have felled the Treant may draw upon its ancient power.",
      ],
      warning: 'The Ancient Treant\'s roots seal this ruin. Defeat it to unlock.',
      bossZone: 'forest',
    },
    volcano_fortress: {
      emoji: '🏯',
      keeper: 'The Forgemaster',
      lore: [
        "This fortress was built upon a river of magma by the first fire wizards.",
        "The Magma Titan claimed it as its throne — melting all who dared approach.",
        "Only those who have toppled the Titan may wield the forge's power.",
      ],
      warning: 'The Magma Titan guards this fortress. Defeat it to unlock.',
      bossZone: 'volcanic',
    },
    ice_citadel: {
      emoji: '🏔️',
      keeper: 'The Frostweaver',
      lore: [
        "The Ice Citadel once housed the greatest chronomancers in the realm.",
        "The Frost Wyrm's breath froze them mid-spell — their magic lingers still.",
        "Slay the Wyrm to shatter the ice and claim mastery over time itself.",
      ],
      warning: 'The Frost Wyrm\'s ice seals this citadel. Defeat it to unlock.',
      bossZone: 'frozen',
    },
    void_shrine: {
      emoji: '🕳️',
      keeper: 'The Void Speaker',
      lore: [
        "This shrine exists between dimensions — a tear in reality itself.",
        "The Void Colossus feeds on the rift's energy, growing stronger each day.",
        "Destroy the Colossus and the shrine's power over space will be yours.",
      ],
      warning: 'The Void Colossus guards this rift. Defeat it to unlock.',
      bossZone: 'abyss',
    },
    crystal_sanctum: {
      emoji: '💎',
      keeper: 'The Crystal Oracle',
      lore: [
        "Deep within the caves, this sanctum pulses with prismatic energy.",
        "The Crystal Golem has absorbed most of it — shattering the balance.",
        "Break the Golem and the sanctum will amplify your reflexes beyond mortal limits.",
      ],
      warning: 'The Crystal Golem guards this sanctum. Defeat it to unlock.',
      bossZone: 'crystal_caves',
    },
  };

  const lore = buildingLore[nearbyBuilding.id] || { emoji: '🏛️', keeper: 'Unknown', lore: ['An ancient structure...'], warning: null, bossZone: null };
  const bossKills = playerInfo?.bossKills || {};
  const isLocked = lore.bossZone && !bossKills[lore.bossZone];
  const upgrade = upgradeMap[nearbyBuilding.id];

  return (
    <>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={{ ...styles.modal, maxWidth: 440, maxHeight: '85vh', overflowY: 'auto' }}>
        <button style={styles.modalClose} onClick={onClose}>×</button>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{lore.emoji}</div>
          <h3 style={{ ...styles.modalTitle, color: nearbyBuilding.color, margin: 0 }}>{nearbyBuilding.name}</h3>
          <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>{lore.keeper}</div>
        </div>

        {/* Lore Section */}
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${nearbyBuilding.color}15` }}>
          {lore.lore.map((line, i) => (
            <p key={i} style={{ color: '#bbb', fontSize: '0.85rem', lineHeight: 1.7, margin: i === 0 ? 0 : '8px 0 0', fontStyle: 'italic' }}>
              "{line}"
            </p>
          ))}
        </div>

        {/* Locked Warning */}
        {isLocked && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 10, padding: '14px 18px', marginBottom: 16, textAlign: 'center',
          }}>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>
              🔒 Sealed
            </div>
            <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{lore.warning}</div>
          </div>
        )}

        {/* Wizard Tower - special hub content */}
        {nearbyBuilding.id === 'wizard_tower' && (() => {
          const allBossesDefeated = ['meadow', 'forest', 'volcanic', 'frozen', 'crystal_caves', 'abyss'].every(z => bossKills[z]);
          return (
            <>
              {/* Stronghold Status */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#ffd93d', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, textAlign: 'center' }}>
                  Stronghold Status
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { id: 'forest_ruins', name: 'Ancient Ruins', zone: 'forest', color: '#78716c', upgrade: 'Health' },
                    { id: 'volcano_fortress', name: 'Obsidian Fortress', zone: 'volcanic', color: '#7f1d1d', upgrade: 'Damage' },
                    { id: 'ice_citadel', name: 'Ice Citadel', zone: 'frozen', color: '#0284c7', upgrade: 'Cooldown' },
                    { id: 'void_shrine', name: 'Void Shrine', zone: 'abyss', color: '#7c3aed', upgrade: 'Speed' },
                    { id: 'crystal_sanctum', name: 'Crystal Sanctum', zone: 'crystal_caves', color: '#ec4899', upgrade: 'Atk Speed' },
                  ].map(b => {
                    const unlocked = bossKills[b.zone];
                    return (
                      <div key={b.id} style={{
                        background: unlocked ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${unlocked ? '#22c55e' : '#333'}40`,
                        borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                      }}>
                        <div style={{ color: unlocked ? '#22c55e' : '#555', fontSize: '0.7rem', fontWeight: 600 }}>
                          {unlocked ? '✓' : '🔒'} {b.name}
                        </div>
                        <div style={{ color: unlocked ? b.color : '#444', fontSize: '0.6rem', marginTop: 2 }}>
                          {unlocked ? `+${b.upgrade}` : 'Defeat boss'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enter Tower Button */}
              {!showUpgrade ? (
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => setShowUpgrade(true)}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,217,61,0.2), rgba(255,217,61,0.05))',
                      border: '2px solid #ffd93d',
                      borderRadius: 12, padding: '16px 40px', color: '#ffd93d',
                      fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                      transition: 'all 0.2s',
                    }}
                  >
                    🏰 Enter the Tower
                  </button>
                  <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 8 }}>
                    Explore the Archmage's sanctum
                  </div>
                </div>
              ) : (
                <div>
                  {/* Tower Interior */}
                  <div style={{ background: 'rgba(255,217,61,0.04)', border: '1px solid rgba(255,217,61,0.15)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <div style={{ textAlign: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🧙‍♂️</div>
                      <div style={{ color: '#ffd93d', fontWeight: 600, fontSize: '0.9rem' }}>The Archmage's Chamber</div>
                      <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
                        Enchanted scrolls line the walls. A crystal orb pulses with arcane energy.
                      </div>
                    </div>

                    {/* Boss Progress Summary */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                      <div style={{ color: '#ccc', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                        📜 Your Journey — {Object.keys(bossKills).filter(z => bossKills[z]).length}/6 Bosses Defeated
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, transition: 'width 0.3s',
                          width: `${(Object.keys(bossKills).filter(z => bossKills[z]).length / 6) * 100}%`,
                          background: allBossesDefeated ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #ffd93d, #f59e0b)',
                        }} />
                      </div>
                    </div>

                    {/* Dragon Warning or Congratulations */}
                    {allBossesDefeated ? (
                      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                        <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>🐉 The Dragon Awaits</div>
                        <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: 4 }}>
                          All six strongholds are unsealed. Seek the Dragon Gate in the Sanctuary center.
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                        <div style={{ color: '#888', fontSize: '0.75rem', lineHeight: 1.6 }}>
                          The Archmage speaks: <span style={{ color: '#ffd93d', fontStyle: 'italic' }}>"Defeat all six zone bosses to unlock the path to the Dragon."</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button onClick={() => setShowUpgrade(false)} style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '8px 20px', color: '#888', fontSize: '0.8rem', cursor: 'pointer',
                    }}>
                      ← Back
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Enter Building / Shop Section */}
        {!isLocked && upgrade && !showUpgrade && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setShowUpgrade(true)}
              style={{
                background: `linear-gradient(135deg, ${nearbyBuilding.color}40, ${nearbyBuilding.color}20)`,
                border: `2px solid ${nearbyBuilding.color}`,
                borderRadius: 12, padding: '14px 32px', color: nearbyBuilding.color,
                fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              ⚡ Enter & Upgrade
            </button>
          </div>
        )}

        {/* Upgrade Panel - shown after clicking Enter */}
        {!isLocked && upgrade && showUpgrade && (() => {
          const currentLevel = playerInfo?.upgrades?.[upgrade.type] || 0;
          const cost = Math.floor(upgrade.baseCost * (1 + currentLevel * 0.15));
          const isMaxed = upgrade.maxLevel && currentLevel >= upgrade.maxLevel;
          return (
            <div style={{ padding: '0' }}>
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: 16, textAlign: 'center', fontStyle: 'italic' }}>{upgrade.flavorText}</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 16px', marginBottom: 12, textAlign: 'center', border: `1px solid ${upgrade.color}20` }}>
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

        {/* XP Display */}
        <div style={{ marginTop: 20, textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>
          Your XP: <span style={{ color: '#ffd93d', fontWeight: 'bold' }}>{(playerInfo?.totalXp || 0).toLocaleString()}</span>
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
    : npcDialogue.npcType === 'quest_giver' ? (npcDialogue.questGiverColor || '#4ade80')
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
          npcDialogue.npcType === 'quest_giver' ? 'linear-gradient(135deg, rgba(20,35,20,0.98), rgba(30,50,35,0.98))' :
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

function QuestLogContent({ styles, questLog, onClose }) {
  // questLog may be an object {allBosses: {...}, dragonSlayer: {...}} — convert to array
  const quests = Array.isArray(questLog) ? questLog : Object.values(questLog || {});
  return (
    <>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={{ ...styles.modal, maxWidth: 400 }}>
        <button style={styles.modalClose} onClick={onClose}>×</button>
        <h3 style={{ ...styles.modalTitle, color: '#ffd93d' }}>
          📜 Quest Log
        </h3>
        {(!quests || quests.length === 0) ? (
          <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>No active quests. Talk to NPCs to find quests!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {quests.filter(q => q && q.active).map(q => (
              <div key={q.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${q.completed ? '#22c55e' : '#ffd93d'}30`, borderRadius: 10, padding: 14 }}>
                <div style={{ color: q.completed ? '#22c55e' : '#ffd93d', fontWeight: 600, fontSize: '0.95rem', marginBottom: 6 }}>
                  {q.completed ? '✓ ' : ''}{q.name || q.title}
                </div>
                <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>{q.description}</p>
                {q.bosses && !q.completed && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {q.bosses.map(b => {
                        const done = q.progress?.[b];
                        return (
                          <span key={b} style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                            background: done ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${done ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            color: done ? '#22c55e' : '#666',
                          }}>
                            {done ? '✓' : '○'} {b}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {quests.filter(q => q && !q.active).length > 0 && (
              <div style={{ color: '#555', fontSize: '0.75rem', textAlign: 'center', marginTop: 8 }}>
                Talk to NPCs to discover more quests
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function InGameSettingsContent({ styles, SVG, isMobile, settings, setSettings, playerInfo, socketRef, playerIdRef, sessionTokenRef, setScreen, setSavedPlayer, setCharacters, setAdminKey, setAuthState, onClose }) {
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
        
        {/* Key Mappings */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600, letterSpacing: '0.05em' }}>
            ⌨️ Key Bindings
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            {[
              ['WASD / Arrows', 'Move'],
              ['Left Click', 'Attack'],
              ['Right Click', 'Secondary'],
              ['Space', 'Dash'],
              ['Q', 'Ultimate'],
              ['1 / 2 / 3', 'Abilities'],
              ['E', 'Interact / NPC'],
              ['B', 'Spellbook'],
              ['T', 'Emotes'],
              ['ESC', 'Settings / Close'],
            ].map(([key, action]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: '0.65rem',
                  color: '#ccc',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  minWidth: 28,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}>{key}</span>
                <span style={{ color: '#888', fontSize: '0.7rem' }}>{action}</span>
              </div>
            ))}
          </div>
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
  if (!showLeaderboard || !leaderboardData.length) return null;
  return (
    <div style={{ position: 'fixed', top: 20, left: 260, zIndex: 50 }}>
      <div style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderRadius: 12, border: '1px solid rgba(255,215,61,0.2)', padding: 12, minWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: '0.7rem', color: '#ffd93d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Top Players</div>
            <button onClick={() => setShowLeaderboard(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
          </div>
          {leaderboardData.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: i < leaderboardData.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <span style={{ width: 16, fontSize: '0.7rem', fontWeight: 700, color: i === 0 ? '#ffd93d' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#666' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: '0.8rem', color: p.name === playerInfo?.name ? '#ffd93d' : '#ddd', fontWeight: p.name === playerInfo?.name ? 600 : 400 }}>{p.name}</span>
              <span style={{ fontSize: '0.65rem', color: '#888' }}>Lv{p.level}</span>
              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>{p.kills}</span>
            </div>
          ))}
        </div>
    </div>
  );
}
// Build spellbook data dynamically from server-sent class data (for custom wizards)
function buildCustomSpellData(classData) {
  if (!classData || !classData.spellName) return null;
  
  const fmtCd = (ms) => ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1).replace(/\.0$/, '') + 's';
  
  const result = {
    autoAttack: {
      name: classData.spellName || 'Primary',
      icon: '✨',
      damage: String(classData.spellDamage || '?'),
      cooldown: classData.spellCooldown ? fmtCd(classData.spellCooldown) : '?',
      range: String(classData.spellRange || '?'),
      desc: classData.spellDescription || 'Primary attack.',
    },
    secondary: {
      name: classData.secondaryName || 'Secondary',
      icon: '🔮',
      damage: String(classData.secondaryDamage || '?') + (classData.secondaryRange ? '' : ' AOE'),
      cooldown: classData.secondaryCooldown ? fmtCd(classData.secondaryCooldown) : '?',
      range: String(classData.secondaryRange || '?'),
      desc: classData.secondaryDescription || 'Secondary attack.',
    },
    dash: {
      name: classData.dash || classData.dashAbility?.name || 'Dash',
      icon: '💨',
      cooldown: classData.dashCooldown ? fmtCd(classData.dashCooldown) : '3s',
      distance: String(classData.dashAbility?.distance || 200),
      desc: classData.dashAbility?.description || 'Quick movement ability.',
    },
    ultimate: {
      name: classData.ultimate || classData.ultimateAbility?.name || 'Ultimate',
      icon: '⚡',
      damage: String(classData.ultimateAbility?.damage || '?'),
      cooldown: classData.ultimateCooldown ? fmtCd(classData.ultimateCooldown) : '30s',
      radius: String(classData.ultimateAbility?.radius || '?'),
      desc: classData.ultimateAbility?.description || 'Powerful ultimate ability.',
    },
    abilities: {},
  };
  
  // Build abilities from classAbilities array
  if (classData.classAbilities) {
    const levels = [10, 20, 30];
    classData.classAbilities.forEach((ab, i) => {
      if (ab) {
        result.abilities[i + 1] = {
          name: ab.name || `Ability ${i + 1}`,
          icon: '✨',
          damage: String(ab.damage || '?'),
          cooldown: ab.cooldown ? fmtCd(ab.cooldown) : '?',
          radius: ab.isAoe ? String(ab.aoeRadius || '?') : undefined,
          range: !ab.isAoe ? String(ab.range || '?') : undefined,
          level: levels[i],
          desc: ab.description || '',
        };
      }
    });
  }
  
  return result;
}

function SpellbookContent({ styles, playerInfo, classes, onClose }) {
  const classId = playerInfo?.class;
  const classData = classes?.[classId];
  const level = playerInfo?.level || 1;
  const classColor = classData?.color || '#888';
  
  // All spell data per class
  const spellData = {
    pyromancer: {
      autoAttack: { name: 'Fireball', icon: '🔥', damage: '28', cooldown: '0.9s', range: '320', desc: 'Launches a fiery projectile that explodes on impact.' },
      secondary: { name: 'Flame Wave', icon: '🌊', damage: '22 AOE', cooldown: '3s', range: '200', desc: 'Sends a wave of fire around you.' },
      dash: { name: 'Fire Dash', icon: '💨', cooldown: '4s', distance: '200', desc: 'Dash forward leaving a trail of fire that burns enemies.' },
      ultimate: { name: 'Meteor Strike', icon: '☄️', damage: '100', cooldown: '20s', radius: '150', desc: 'Call down a massive meteor that explodes on impact.' },
      abilities: {
        1: { name: 'Flame Shield', icon: '🔥', damage: '15/tick', cooldown: '12s', radius: '80', level: 10, desc: 'Creates a damage aura around you.' },
        2: { name: 'Meteor Strike', icon: '☄️', damage: '60', cooldown: '15s', radius: '120', level: 20, desc: 'Delayed AOE explosion at target location.' },
        3: { name: 'Inferno', icon: '💥', damage: '100', cooldown: '25s', radius: '200', level: 30, desc: 'Massive fire explosion that incinerates everything.' },
      },
    },
    cryomancer: {
      autoAttack: { name: 'Frostbolt', icon: '❄️', damage: '22', cooldown: '1s', range: '300', desc: 'Icy projectile that slows enemies on hit.' },
      secondary: { name: 'Blizzard', icon: '🌨️', damage: '18 AOE', cooldown: '4s', range: '180', desc: 'Creates a freezing zone around you.' },
      dash: { name: 'Frost Step', icon: '💨', cooldown: '5s', distance: '180', desc: 'Teleport forward and freeze nearby enemies on arrival.' },
      ultimate: { name: 'Ice Nova', icon: '💎', damage: '50', cooldown: '25s', radius: '200', desc: 'Explosion of ice that freezes all enemies in range.' },
      abilities: {
        1: { name: 'Frost Nova', icon: '❄️', damage: '30', cooldown: '12s', radius: '120', level: 10, desc: 'Freeze nearby enemies solid.' },
        2: { name: 'Ice Lance', icon: '🧊', damage: '45', cooldown: '10s', range: '500', level: 20, desc: 'Piercing ice bolt that shatters through enemies.' },
        3: { name: 'Glacial Storm', icon: '🌨️', damage: '40/s', cooldown: '25s', radius: '250', level: 30, desc: 'Summon a devastating blizzard zone.' },
      },
    },
    arcanist: {
      autoAttack: { name: 'Arcane Blast', icon: '💫', damage: '25', cooldown: '1.1s', range: '280', desc: 'Pure arcane energy bolt with splash damage.' },
      secondary: { name: 'Magic Missile', icon: '✨', damage: '20', cooldown: '2s', range: '350', desc: 'Homing arcane missile that tracks enemies.' },
      dash: { name: 'Blink', icon: '💨', cooldown: '6s', distance: '250', desc: 'Instantly teleport forward with brief invulnerability.' },
      ultimate: { name: 'Arcane Barrage', icon: '💫', damage: '20×12', cooldown: '18s', radius: 'Homing', desc: 'Unleash a barrage of homing arcane missiles.' },
      abilities: {
        1: { name: 'Blink', icon: '✨', damage: '-', cooldown: '8s', range: '200', level: 10, desc: 'Short teleport forward.' },
        2: { name: 'Arcane Barrage', icon: '💫', damage: '20×6', cooldown: '12s', range: 'Homing', level: 20, desc: 'Launch homing missiles at nearby enemies.' },
        3: { name: 'Time Warp', icon: '⏳', damage: '-', cooldown: '20s', radius: 'Self', level: 30, desc: 'Massive speed and attack boost.' },
      },
    },
    stormcaller: {
      autoAttack: { name: 'Lightning Bolt', icon: '⚡', damage: '24', cooldown: '0.8s', range: '350', desc: 'A bolt of lightning that chains to nearby enemies.' },
      secondary: { name: 'Thunderclap', icon: '🌩️', damage: '20 AOE', cooldown: '3s', range: '180', desc: 'Thunder explosion around you.' },
      dash: { name: 'Storm Dash', icon: '💨', cooldown: '5s', distance: '200', desc: 'Ride the storm forward, shocking enemies on arrival.' },
      ultimate: { name: 'Tempest', icon: '🌪️', damage: '80', cooldown: '20s', radius: '250', desc: 'Summon a raging tempest that devastates the area.' },
      abilities: {
        1: { name: 'Static Field', icon: '⚡', damage: '25', cooldown: '10s', radius: '150', level: 10, desc: 'Chain lightning that jumps between enemies.' },
        2: { name: 'Ball Lightning', icon: '🔮', damage: '30', cooldown: '12s', range: '300', level: 20, desc: 'Bouncing orb of lightning.' },
        3: { name: 'Thunder God', icon: '🌩️', damage: '60', cooldown: '25s', radius: '300', level: 30, desc: 'Become a storm avatar with massive power.' },
      },
    },
    voidlord: {
      autoAttack: { name: 'Void Bolt', icon: '🕳️', damage: '30', cooldown: '0.8s', range: '350', desc: 'Dark void energy that pierces through enemies.' },
      secondary: { name: 'Annihilate', icon: '💀', damage: '35 AOE', cooldown: '3s', range: '200', desc: 'Area void detonation around you.' },
      dash: { name: 'Void Shift', icon: '💨', cooldown: '5s', distance: '200', desc: 'Phase through the void, invulnerable, dealing damage on arrival.' },
      ultimate: { name: 'Void Rift', icon: '🌀', damage: '80', cooldown: '22s', radius: '200', desc: 'Tear open a rift that pulls enemies in and devastates them.' },
      abilities: {
        1: { name: 'Void Rift', icon: '🕳️', damage: '40', cooldown: '15s', radius: '150', level: 10, desc: 'Pull enemies toward a void singularity.' },
        2: { name: 'Soul Drain', icon: '💀', damage: '35', cooldown: '12s', range: '200', level: 20, desc: 'Lifesteal attack that heals you.' },
        3: { name: 'Apocalypse', icon: '☠️', damage: '120', cooldown: '30s', radius: '300', level: 30, desc: 'Devastating void explosion.' },
      },
    },
    shadowarcher: {
      autoAttack: { name: 'Shadow Arrow', icon: '🏹', damage: '26', cooldown: '0.55s', range: '500', desc: 'Piercing shadow arrow that passes through enemies.' },
      secondary: { name: 'Piercing Volley', icon: '🎯', damage: '45 AOE', cooldown: '2s', range: '400', desc: 'Rain of arrows in an area.' },
      dash: { name: 'Shadow Step', icon: '💨', cooldown: '5s', distance: '220', desc: 'Vanish into shadow and reappear at target.' },
      ultimate: { name: 'Arrow Storm', icon: '⛈️', damage: '70', cooldown: '22s', radius: '250', desc: 'Rain down a storm of shadow arrows.' },
      abilities: {
        1: { name: "Hunter's Mark", icon: '🎯', damage: '25', cooldown: '8s', range: '400', level: 10, desc: 'Mark a target for bonus damage.' },
        2: { name: 'Multishot', icon: '🏹', damage: '25 AOE', cooldown: '12s', radius: '200', level: 20, desc: 'Fire arrows in all directions.' },
        3: { name: 'Death Arrow', icon: '💀', damage: '120', cooldown: '30s', range: '600', level: 30, desc: 'A devastating arrow that obliterates its target.' },
      },
    },
    brute: {
      autoAttack: { name: 'Dumbbell Throw', icon: '🏋️', damage: '60', cooldown: '0.4s', range: '450', desc: 'Hurl a spinning dumbbell that pierces through enemies.' },
      secondary: { name: 'Ground Pound', icon: '💪', damage: '90 AOE', cooldown: '1.8s', range: '200', desc: 'Smash the ground with devastating force.' },
      dash: { name: 'Shoulder Charge', icon: '💨', cooldown: '2.5s', distance: '350', desc: 'Charge forward like a freight train, flattening everything.' },
      ultimate: { name: 'GAINS MODE', icon: '🔱', damage: '120', cooldown: '12s', radius: '300', desc: 'Flex so hard reality bends. Massive buff.' },
      abilities: {
        1: { name: 'Protein Shake', icon: '🥤', damage: 'Heal 30%', cooldown: '15s', radius: 'Self', level: 10, desc: 'Chug a protein shake - heal HP and gain speed.' },
        2: { name: 'Barbell Spin', icon: '🏋️', damage: '80 AOE', cooldown: '10s', radius: '250', level: 20, desc: 'Spin a barbell around you, crushing everything.' },
        3: { name: 'Ultimate Flex', icon: '💪', damage: '200 AOE', cooldown: '35s', radius: '350', level: 30, desc: 'Flex so hard it creates a shockwave.' },
      },
    },
  };
  
  const data = spellData[classId] || buildCustomSpellData(classData) || spellData.pyromancer;
  
  const SpellRow = ({ spell, label, unlockLevel, isUnlocked }) => (
    <div style={{
      display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 8,
      background: isUnlocked ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)',
      opacity: isUnlocked ? 1 : 0.5,
      border: `1px solid ${isUnlocked ? classColor + '40' : 'rgba(255,255,255,0.05)'}`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isUnlocked ? classColor + '30' : 'rgba(0,0,0,0.4)',
        border: `2px solid ${isUnlocked ? classColor : '#444'}`,
        fontSize: '1.2rem', flexShrink: 0,
      }}>
        {spell.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ color: isUnlocked ? classColor : '#666', fontWeight: 'bold', fontSize: '0.85rem' }}>
            {spell.name}
          </span>
          <span style={{ color: '#666', fontSize: '0.7rem' }}>
            {label}{unlockLevel ? ` • Lv ${unlockLevel}` : ''}
          </span>
        </div>
        <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: 4 }}>{spell.desc}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {spell.damage && <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>⚔️ {spell.damage}</span>}
          {spell.cooldown && <span style={{ color: '#60a5fa', fontSize: '0.7rem' }}>⏱️ {spell.cooldown}</span>}
          {spell.range && <span style={{ color: '#4ade80', fontSize: '0.7rem' }}>📏 {spell.range}</span>}
          {spell.radius && <span style={{ color: '#fbbf24', fontSize: '0.7rem' }}>💫 {spell.radius}</span>}
          {spell.distance && <span style={{ color: '#c084fc', fontSize: '0.7rem' }}>🏃 {spell.distance}</span>}
          {!isUnlocked && unlockLevel && <span style={{ color: '#f87171', fontSize: '0.7rem' }}>🔒 Locked</span>}
        </div>
      </div>
    </div>
  );
  
  return (
    <>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={{
        ...styles.modal, maxWidth: 480, maxHeight: '80vh', overflow: 'auto',
        background: `linear-gradient(135deg, rgba(20,15,30,0.98), rgba(30,20,45,0.98))`,
        border: `2px solid ${classColor}60`,
      }}>
        <button style={styles.modalClose} onClick={onClose}>×</button>
        
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>📖</div>
          <h3 style={{ margin: 0, color: classColor, fontSize: '1.1rem' }}>
            {classData?.name || 'Wizard'} Spellbook
          </h3>
          <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>Level {level} • All abilities and spells</div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Base Spells</div>
          <SpellRow spell={data.autoAttack} label="LMB" isUnlocked={true} />
          <SpellRow spell={data.secondary} label="RMB" isUnlocked={true} />
          
          <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>Movement</div>
          <SpellRow spell={data.dash} label="Shift" isUnlocked={true} />
          
          <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>Ultimate</div>
          <SpellRow spell={data.ultimate} label="Q" isUnlocked={true} />
          
          <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>Class Abilities</div>
          {[1, 2, 3].map(slot => (
            <SpellRow
              key={slot}
              spell={data.abilities[slot]}
              label={`Key ${slot}`}
              unlockLevel={data.abilities[slot].level}
              isUnlocked={level >= data.abilities[slot].level}
            />
          ))}
        </div>
        
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, textAlign: 'center' }}>
          <span style={{ color: '#666', fontSize: '0.7rem' }}>Tip: Damage scales with level (+5% per level) and shop upgrades</span>
        </div>
      </div>
    </>
  );
}
