# SpellBrigade Component

A modular React game component for a multiplayer wizard survival game.

## Structure

```
SpellBrigade/
├── index.jsx           # Main component (3,825 lines)
├── styles.js           # Style factory (774 lines)
├── constants/
│   ├── index.js        # Re-exports all constants
│   ├── icons.jsx       # SVG icons (95 lines)
│   ├── config.js       # Colors, classes, skins (75 lines)
│   └── zones.js        # Zone data, portals, buildings (89 lines)
└── hooks/
    └── useAudio.js     # Audio system (350 lines)
```

**Total: ~5,200 lines** (down from 4,865 monolithic)

## Installation

1. Install dependency:
```bash
npm install socket.io-client
```

2. Copy the `SpellBrigade/` folder to your components directory.

3. Import and use:
```jsx
import SpellBrigade from './components/SpellBrigade';

function App() {
  return <SpellBrigade />;
}
```

## Configuration

Set your game server URL in `.env`:
```
REACT_APP_GAME_SERVER=https://your-server.railway.app
```

If not set, defaults to `http://localhost:3001`

## Module Breakdown

### `index.jsx`
Main component containing:
- State management (refs, useState)
- Socket.IO connection and handlers
- Input handling (keyboard, mouse, touch)
- Game render loop (canvas drawing)
- UI components (title screen, HUD, etc.)

### `styles.js`
Style factory function that generates all styles based on:
- `isMobile` - responsive design
- `settings` - user preferences
- `screen` - current screen state

### `constants/`
Pure data modules:
- **icons.jsx** - All SVG icons used in the UI
- **config.js** - Game colors, class definitions, skin unlocks
- **zones.js** - Zone polygons, portals, buildings, detection helpers

### `hooks/useAudio.js`
Audio system including:
- Sound effects (spell, hit, level up, etc.)
- Zone-based procedural music
- Mobile audio unlock handling

## Notes

- The component is self-contained and doesn't require external assets
- All audio is procedurally generated (no audio files needed)
- Fully supports both desktop and mobile
- Canvas-based rendering for performance
