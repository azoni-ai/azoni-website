import React from 'react';

/**
 * Global CSS styles and keyframe animations
 * Extracted from main component for cleaner organization
 */
export default function GlobalStyles({ screen }) {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes dropIn { 
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateX(-50%) translateY(-30px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes pulse { 
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      @keyframes floatSlow {
        0%, 100% { transform: translateY(0) rotate(-5deg); }
        50% { transform: translateY(-15px) rotate(5deg); }
      }
      /* Mobile-specific styles to prevent zoom and selection */
      * {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
      html, body {
        touch-action: manipulation;
        overscroll-behavior: none;
        -webkit-user-select: none;
        user-select: none;
        width: 100%;
        margin: 0;
        padding: 0;
        ${screen === 'game' ? `
          overflow: hidden;
          position: fixed;
          height: 100%;
        ` : `
          overflow: visible;
          position: relative;
          min-height: 100%;
        `}
      }
      canvas {
        touch-action: none;
      }
      input, textarea, select {
        -webkit-user-select: text;
        user-select: text;
        touch-action: manipulation;
      }
      @supports (padding-bottom: env(safe-area-inset-bottom)) {
        .mobile-controls-area {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      }
    `}</style>
  );
}
