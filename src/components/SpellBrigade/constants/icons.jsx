import React from 'react';

export const SVG = {
  fire: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8 6 4 10 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8c0-4-4-8-8-12zm0 18c-3.31 0-6-2.69-6-6 0-2 2-4 3-5 0 2 1 3 2 3s2-1 2-3c1 1 3 3 3 5 0 3.31-2.69 6-6 6z"/>
    </svg>
  ),
  ice: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z"/>
    </svg>
  ),
  arcane: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
    </svg>
  ),
  dash: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  ),
  sword: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.92 5H5L14 14l-1.5 1.5L5 8v1.92l8 8L22 9l-3-3-7.08 7.08L6.92 5z"/>
    </svg>
  ),
  skull: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  ),
  volume: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    </svg>
  ),
  volumeMute: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  ),
  controls: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z"/>
    </svg>
  ),
};

export const CLASS_SVG = {
  pyromancer: SVG.fire,
  cryomancer: SVG.ice,
  arcanist: SVG.arcane,
  voidlord: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.2"/>
      <ellipse cx="12" cy="12" rx="3" ry="6" fill="currentColor"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.8"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  shadowarcher: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2L4 22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M20 2L14 4L16 6Z" fill="currentColor"/>
      <path d="M5 7C5 7 3 12 5 17" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <line x1="5" y1="9" x2="9" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="15" x2="9" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};
