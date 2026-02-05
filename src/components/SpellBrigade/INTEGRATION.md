# SpellBrigade Component Refactor - Integration Guide

## File Structure
```
SpellBrigade/
├── index.jsx              # Main component (modify as shown below)
├── styles.js              # Style definitions  
├── constants/
│   ├── config.js          # DEFAULT_CLASSES, DEFAULT_SKINS, SERVER_URL
│   ├── icons.jsx          # SVG, CLASS_SVG
│   ├── zones.js           # ZONE_POLYGONS, ZONE_INFO, etc.
│   └── index.js
└── components/
    ├── index.js           # Component exports
    ├── GlobalStyles.jsx   # Keyframe animations
    ├── LoadingScreen.jsx  # Loading overlay
    ├── AuthScreen.jsx     # Login/signup/guest
    ├── DeathScreen.jsx    # Death/respawn
    └── TitleScreen/
        ├── index.jsx      # Main TitleScreen
        ├── TitleHeader.jsx
        ├── TabNavigation.jsx
        ├── CreateTab.jsx
        ├── PlayTab.jsx
        ├── TutorialTab.jsx
        └── SettingsTab.jsx
```

## Step 1: Add Import

At the top of `index.jsx`, add this import after the existing imports:

```javascript
// Local imports
import { SVG, CLASS_SVG } from './constants/icons';
import { COLORS, DEFAULT_CLASSES, DEFAULT_SKINS, SERVER_URL } from './constants/config';
import { WORLD_WIDTH, WORLD_HEIGHT, ZONE_POLYGONS, ZONE_INFO, PORTAL_POSITIONS, BUILDING_DATA, pointInPolygon, getZoneAtPosition } from './constants/zones';
import { createStyles } from './styles';

// ADD THIS LINE:
import { GlobalStyles, LoadingScreen, AuthScreen, DeathScreen, TitleScreen } from './components';
```

## Step 2: Replace JSX Sections

In the return statement of the main component, replace each section as follows:

### 2a. Add GlobalStyles (after opening return div)
Find: `<div ref={containerRef}...`
Add right after the opening div:
```jsx
<GlobalStyles screen={screen} />
```

### 2b. Replace Loading Screen (~line 8479-8547)
Find: `{/* Loading Screen */}` section
Replace entire section with:
```jsx
<LoadingScreen visible={screen === 'loading'} styles={styles} />
```

### 2c. Replace Auth Screen (~line 8548-9002)
Find: `{/* Auth Screen */}` section (about 455 lines)
Replace entire section with:
```jsx
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
```

### 2d. Replace Title Screen (~line 9003-10190)
Find: `{/* Title Screen */}` section (about 1188 lines)
Replace entire section with:
```jsx
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
  selectedSkin={selectedSkin}
  setSelectedSkin={setSelectedSkin}
  confirmDeleteId={confirmDeleteId}
  setConfirmDeleteId={setConfirmDeleteId}
  setScreen={setScreen}
  playerIdRef={playerIdRef}
  handleNewCharacter={() => { setSavedPlayer(null); setTab('create'); }}
  settings={settings}
  setSettings={setSettings}
  SVG={SVG}
  CLASS_SVG={CLASS_SVG}
  DEFAULT_CLASSES={DEFAULT_CLASSES}
  DEFAULT_SKINS={DEFAULT_SKINS}
  SERVER_URL={SERVER_URL}
/>
```

### 2e. Replace Death Screen (~line 10191-10251)
Find: `{/* Death Screen */}` section
Replace entire section with:
```jsx
<DeathScreen
  visible={screen === 'dead'}
  styles={styles}
  SVG={SVG}
  deathInfo={deathInfo}
  playerInfo={playerInfo}
  handleRespawn={handleRespawn}
  onReturnToMenu={() => {
    setDeathInfo(null);
    socketRef.current?.disconnect();
    inDungeonRef.current = false;
    setInDungeon(false);
    if (playerInfo) {
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
    setTab('play');
    setScreen('title');
  }}
/>
```

## Lines Saved

| Component     | Lines Removed | Lines Added |
|---------------|---------------|-------------|
| GlobalStyles  | 70            | 1           |
| LoadingScreen | 70            | 1           |
| AuthScreen    | 455           | 25          |
| TitleScreen   | 1188          | 55          |
| DeathScreen   | 60            | 30          |
| **Total**     | **~1843**     | **~112**    |

**Net reduction: ~1730 lines from main index.jsx**

## Notes

1. The extracted components are self-contained and can be edited independently
2. TitleScreen is further split into sub-components (CreateTab, PlayTab, etc.) for easier editing
3. State and refs remain in the main component - only JSX rendering is extracted
4. The components receive props for everything they need
