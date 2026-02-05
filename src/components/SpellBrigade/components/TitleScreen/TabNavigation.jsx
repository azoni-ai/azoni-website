import React from 'react';

const TABS = [
  { id: 'play', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>, label: 'Play' },
  { id: 'create', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>, label: 'Create' },
  { id: 'tutorial', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>, label: 'Guide' },
  { id: 'settings', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>, label: 'Settings' },
];

/**
 * Navigation tabs for title screen
 */
export default function TabNavigation({ tab, setTab, isMobile }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: isMobile ? 6 : 10,
      padding: '0 20px 20px',
    }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          padding: isMobile ? '10px 16px' : '12px 24px',
          background: tab === t.id 
            ? 'linear-gradient(180deg, rgba(255,217,61,0.2) 0%, rgba(255,217,61,0.05) 100%)' 
            : 'rgba(255,255,255,0.03)',
          border: tab === t.id 
            ? '1px solid rgba(255,217,61,0.5)' 
            : '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          color: tab === t.id ? '#ffd93d' : '#666',
          fontSize: isMobile ? '0.8rem' : '0.9rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: tab === t.id ? '0 4px 20px rgba(255,217,61,0.15)' : 'none',
        }}>
          <span style={{ opacity: tab === t.id ? 1 : 0.6 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
