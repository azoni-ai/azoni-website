import React from 'react';

/**
 * BorderBeam — animated light that travels around an element's border.
 * Inspired by Magic UI. Pure CSS animation using conic-gradient.
 */
const BorderBeam = ({
  size = 200,
  duration = 6,
  delay = 0,
  color = '#ff7a5c',
  colorTo = '#ffb347',
  borderWidth = 1.5,
  className = '',
}) => {
  return (
    <div
      className={`border-beam ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Rotating conic gradient creates the traveling light effect */}
      <div
        style={{
          position: 'absolute',
          inset: `-${borderWidth}px`,
          borderRadius: 'inherit',
          background: `conic-gradient(from 0deg, transparent 0%, transparent 75%, ${color} 85%, ${colorTo} 95%, transparent 100%)`,
          animation: `borderBeamSpin ${duration}s linear ${delay}s infinite`,
          mask: `
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0)
          `,
          WebkitMask: `
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0)
          `,
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: `${borderWidth}px`,
        }}
      />

      {/* Glow effect behind the beam */}
      <div
        style={{
          position: 'absolute',
          inset: `-${borderWidth * 4}px`,
          borderRadius: 'inherit',
          background: `conic-gradient(from 0deg, transparent 0%, transparent 78%, ${color}33 88%, ${colorTo}22 95%, transparent 100%)`,
          animation: `borderBeamSpin ${duration}s linear ${delay}s infinite`,
          filter: `blur(${borderWidth * 3}px)`,
        }}
      />

      <style>{`
        @keyframes borderBeamSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BorderBeam;
