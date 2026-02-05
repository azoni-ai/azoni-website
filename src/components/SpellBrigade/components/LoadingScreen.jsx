import React from 'react';

/**
 * Loading screen shown while connecting to server
 */
export default function LoadingScreen({ visible, styles }) {
  return (
    <div style={{ ...styles.overlay, ...(!visible ? styles.hidden : {}) }}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Connecting to server...</p>
    </div>
  );
}
