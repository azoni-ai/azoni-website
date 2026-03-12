import { useEffect } from 'react';

/**
 * Tracks a single visit per session for a specific source.
 * Uses a source-specific sessionStorage key so sub-apps
 * (SpellBrigade, Moltbook, Blog) track independently.
 */
export default function useVisitTracker(source) {
  useEffect(() => {
    const key = '_av_' + source;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      fetch('/.netlify/functions/log-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      }).catch(() => {});
    }
  }, [source]);
}
