import React from 'react';
import TitleHeader from './TitleHeader';
import TabNavigation from './TabNavigation';
import CreateTab from './CreateTab';
import PlayTab from './PlayTab';
import TutorialTab from './TutorialTab';
import SettingsTab from './SettingsTab';

/**
 * Main Title Screen component
 */
export default function TitleScreen({
  visible,
  styles,
  isMobile,
  tab,
  setTab,
  playersOnline,
  // Create tab props
  classes,
  selectedClass,
  playerName,
  setPlayerName,
  savedPlayer,
  setSavedPlayer,
  characters,
  setCharacters,
  selectedCharIdx,
  setSelectedCharIdx,
  authState,
  setAuthState,
  playerInfo,
  adminKey,
  setAdminKey,
  wizardPrompt,
  setWizardPrompt,
  wizardGenerating,
  setWizardGenerating,
  wizardStatus,
  wizardError,
  setWizardError,
  generatedWizard,
  setGeneratedWizard,
  socketRef,
  sessionTokenRef,
  screenRef,
  pendingCustomWizardRef,
  handleJoin,
  handleClassChange,
  // Play tab props
  selectedSkin,
  setSelectedSkin,
  confirmDeleteId,
  setConfirmDeleteId,
  setScreen,
  playerIdRef,
  handleNewCharacter,
  resetGameState,
  // Settings props
  settings,
  setSettings,
  // Icons
  SVG,
  CLASS_SVG,
  DEFAULT_CLASSES,
  DEFAULT_SKINS,
  SERVER_URL,
}) {
  return (
    <div style={{ 
      ...styles.overlay, 
      ...(!visible ? styles.hidden : {}), 
      flexDirection: 'column',
      justifyContent: 'flex-start',
      padding: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y',
      background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0f0f1a 50%, #080812 100%)',
    }}>
      {/* Ambient particles background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 4 + Math.random() * 4,
            height: 4 + Math.random() * 4,
            borderRadius: '50%',
            background: ['#ffd93d', '#a78bfa', '#60a5fa', '#f87171'][i % 4],
            opacity: 0.15 + Math.random() * 0.2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }} />
        ))}
      </div>

      <TitleHeader isMobile={isMobile} playersOnline={playersOnline} />
      
      <TabNavigation tab={tab} setTab={setTab} isMobile={isMobile} />
      
      {/* Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: isMobile ? '0 15px 80px' : '0 40px 40px',
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
      }}>
        {tab === 'create' && (
          <CreateTab
            isMobile={isMobile}
            classes={classes}
            selectedClass={selectedClass}
            playerName={playerName}
            setPlayerName={setPlayerName}
            savedPlayer={savedPlayer}
            setSavedPlayer={setSavedPlayer}
            characters={characters}
            authState={authState}
            playerInfo={playerInfo}
            adminKey={adminKey}
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
            setTab={setTab}
            SVG={SVG}
            CLASS_SVG={CLASS_SVG}
          />
        )}

        {tab === 'play' && (
          <PlayTab
            isMobile={isMobile}
            styles={styles}
            classes={classes}
            characters={characters}
            setCharacters={setCharacters}
            savedPlayer={savedPlayer}
            setSavedPlayer={setSavedPlayer}
            selectedCharIdx={selectedCharIdx}
            setSelectedCharIdx={setSelectedCharIdx}
            selectedSkin={selectedSkin}
            setSelectedSkin={setSelectedSkin}
            authState={authState}
            setAuthState={setAuthState}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
            setScreen={setScreen}
            setTab={setTab}
            socketRef={socketRef}
            playerIdRef={playerIdRef}
            handleNewCharacter={handleNewCharacter}
            resetGameState={resetGameState}
            setAdminKey={setAdminKey}
            SVG={SVG}
            CLASS_SVG={CLASS_SVG}
            DEFAULT_CLASSES={DEFAULT_CLASSES}
            DEFAULT_SKINS={DEFAULT_SKINS}
            SERVER_URL={SERVER_URL}
            sessionTokenRef={sessionTokenRef}
          />
        )}

        {tab === 'tutorial' && (
          <TutorialTab styles={styles} SVG={SVG} />
        )}

        {tab === 'settings' && (
          <SettingsTab
            styles={styles}
            settings={settings}
            setSettings={setSettings}
            SVG={SVG}
            authState={authState}
            setAuthState={() => {}}
            setScreen={setScreen}
            setSavedPlayer={setSavedPlayer}
            setCharacters={setCharacters}
            setAdminKey={() => {}}
          />
        )}
      </div>
    </div>
  );
}