import React from 'react';

/**
 * Settings tab with volume, SFX, and display toggles
 */
export default function SettingsTab({ 
  styles, 
  settings, 
  setSettings, 
  SVG,
  // Optional: for music control
  musicIntervalRef,
  lastZoneRef,
  startZoneMusic,
}) {
  return (
    <div style={{ ...styles.content, ...styles.settingsContent }}>
      <div style={styles.settingRow}>
        <label style={styles.settingLabel}>
          <span style={styles.settingIcon}>{SVG?.volume}</span> SFX Volume
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.volume * 100}
            onChange={(e) => setSettings(s => ({ ...s, volume: e.target.value / 100 }))}
            style={{ width: 100 }}
          />
          <span style={{ color: '#aaa', fontSize: '0.8rem', minWidth: 36 }}>{Math.round(settings.volume * 100)}%</span>
        </div>
      </div>

      <div style={styles.settingRow}>
        <label style={styles.settingLabel}>
          <span style={styles.settingIcon}>{SVG?.music}</span> Music Volume
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min="0"
            max="100"
            value={(settings.musicVolume || 0.3) * 100}
            onChange={(e) => setSettings(s => ({ ...s, musicVolume: e.target.value / 100 }))}
            style={{ width: 100 }}
          />
          <span style={{ color: '#aaa', fontSize: '0.8rem', minWidth: 36 }}>{Math.round((settings.musicVolume || 0.3) * 100)}%</span>
        </div>
      </div>

      <div style={styles.settingRow}>
        <label style={styles.settingLabel}>
          <span style={styles.settingIcon}>{SVG?.volume}</span> Sound Effects
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
          <span style={styles.settingIcon}>{SVG?.music}</span> Zone Music
        </label>
        <div
          style={styles.toggle(settings.musicEnabled)}
          onClick={() => {
            setSettings(s => {
              const newEnabled = !s.musicEnabled;
              if (!newEnabled && musicIntervalRef?.current) {
                clearInterval(musicIntervalRef.current);
                musicIntervalRef.current = null;
              } else if (newEnabled && lastZoneRef?.current && startZoneMusic) {
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
          <span style={styles.settingIcon}>{SVG?.home}</span> Zone Names
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
          <span style={styles.settingIcon}>{SVG?.star}</span> Minimap
        </label>
        <div
          style={styles.toggle(settings.showMinimap)}
          onClick={() => setSettings(s => ({ ...s, showMinimap: !s.showMinimap }))}
        >
          <div style={styles.toggleKnob(settings.showMinimap)} />
        </div>
      </div>
    </div>
  );
}
