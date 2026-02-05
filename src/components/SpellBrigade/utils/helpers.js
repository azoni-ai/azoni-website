/**
 * Game utility functions - pure functions with no React dependencies
 */

// Generate a random wizard name
export function generateWizardName() {
  const prefixes = ['Shadow', 'Storm', 'Frost', 'Fire', 'Void', 'Star', 'Crystal', 'Thunder', 'Moon', 'Sun', 'Iron', 'Silver', 'Dark', 'Light', 'Ancient'];
  const suffixes = ['walker', 'weaver', 'keeper', 'bringer', 'caster', 'mage', 'sage', 'warden', 'hunter', 'seeker', 'blade', 'heart', 'soul', 'wind', 'fire'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const num = Math.floor(Math.random() * 100);
  return `${prefix}${suffix}${num}`;
}

// Linear interpolation
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Distance between two points
export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Normalize a vector
export function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

// Clamp a value between min and max
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Format number with K/M suffix
export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Format time as MM:SS
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get color with alpha
export function withAlpha(hexColor, alpha) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// HSL to RGB conversion
export function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// Ease functions for animations
export const ease = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// Get XP required for level
export function getXpForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Calculate level from total XP
export function getLevelFromXp(totalXp) {
  let level = 1;
  let xpNeeded = 100;
  let xpAccum = 0;
  while (xpAccum + xpNeeded <= totalXp) {
    xpAccum += xpNeeded;
    level++;
    xpNeeded = getXpForLevel(level);
  }
  return { level, xpInLevel: totalXp - xpAccum, xpForNextLevel: xpNeeded };
}

// Random integer in range
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random element from array
export function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Shuffle array (Fisher-Yates)
export function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Deep clone object
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Debounce function
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle function
export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
