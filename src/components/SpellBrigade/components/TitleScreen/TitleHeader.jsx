import React from 'react';

/**
 * Title screen header with logo, title, and online count
 */
export default function TitleHeader({ isMobile, playersOnline }) {
  return (
    <div style={{
      position: 'relative',
      flexShrink: 0,
      padding: isMobile ? '30px 20px 20px' : '40px 40px 25px',
      textAlign: 'center',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 15, marginBottom: 6 }}>
        <div style={{ position: 'relative' }}>
          <svg width={isMobile ? 44 : 56} height={isMobile ? 44 : 56} viewBox="0 0 48 48">
            <defs>
              <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd93d"/>
                <stop offset="100%" stopColor="#f59e0b"/>
              </linearGradient>
              <filter id="starGlow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <path d="M24 4L28 16H40L30 24L34 36L24 28L14 36L18 24L8 16H20L24 4Z" fill="url(#starGrad)" filter="url(#starGlow)"/>
            <circle cx="24" cy="22" r="5" fill="#ff6b35"/>
          </svg>
        </div>
        <div>
          <h1 style={{ 
            color: '#ffd93d', 
            fontSize: isMobile ? '2rem' : '2.8rem', 
            fontWeight: 800, 
            margin: 0,
            textShadow: '0 0 30px rgba(255,217,61,0.4), 0 2px 10px rgba(0,0,0,0.5)',
            letterSpacing: '-0.02em',
          }}>Spell Brigade</h1>
        </div>
      </div>
      <p style={{ color: '#b0b0b8', fontSize: isMobile ? '0.85rem' : '0.95rem', margin: 0, letterSpacing: 1.5, fontWeight: 500 }}>
        Multiplayer Wizard Arena
      </p>
      
      {/* Online indicator */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        padding: '6px 14px',
        background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: 20,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
        <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>{playersOnline} Online</span>
      </div>
    </div>
  );
}