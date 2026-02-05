import React from 'react';

/**
 * Death screen shown when player dies
 */
export default function DeathScreen({
  visible,
  styles,
  SVG,
  deathInfo,
  playerInfo,
  handleRespawn,
  onReturnToMenu,
}) {
  return (
    <div style={{ ...styles.overlay, ...(!visible ? styles.hidden : {}) }}>
      <span style={{ color: '#ef4444', width: 64, height: 64 }}>{SVG.skull}</span>
      <h1 style={{ color: '#ef4444', fontSize: '2.2rem', margin: '15px 0' }}>You Died!</h1>
      <p style={{ color: '#888' }}>
        Killed by <span style={{ color: '#fff' }}>{deathInfo?.killedBy || 'enemy'}</span>
      </p>

      <div style={styles.deathStats}>
        <div style={styles.deathStat}>
          <div style={styles.deathValue}>{deathInfo?.level || 1}</div>
          <div style={styles.deathLabel}>Level</div>
        </div>
        <div style={styles.deathStat}>
          <div style={styles.deathValue}>{playerInfo?.kills || 0}</div>
          <div style={styles.deathLabel}>Kills</div>
        </div>
        <div style={styles.deathStat}>
          <div style={styles.deathValue}>{playerInfo?.totalXp || 0}</div>
          <div style={styles.deathLabel}>XP</div>
        </div>
      </div>

      <button style={styles.btn} onClick={handleRespawn}>
        <span style={styles.btnIcon}>{SVG.refresh}</span> Respawn
      </button>
      
      <button 
        style={{ ...styles.btn, background: 'rgba(100,100,100,0.3)', marginTop: 10 }} 
        onClick={onReturnToMenu}
      >
        <span style={styles.btnIcon}>{SVG.home}</span> Return to Menu
      </button>
    </div>
  );
}
