import { useEffect, useState, useCallback } from 'react';

// Shared, deduped fetch of the cached hub-summary endpoint (mirror of
// useHomeSummary). The /hub page reads this single cached payload — one
// network call per page load (usually a CDN hit), zero client Firestore reads.

let cache = null;
let inflight = null;
const subscribers = new Set();

function load(force = false) {
  if (cache && !force) return Promise.resolve(cache);
  if (inflight) return inflight;
  const qs = force ? '?refresh=1' : '';
  inflight = fetch(`/.netlify/functions/hub-summary${qs}`)
    .then((res) => {
      if (!res.ok) throw new Error('bad status');
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('not json');
      return res.json();
    })
    .then((data) => {
      cache = data && !data.error ? data : {};
      subscribers.forEach((fn) => fn(cache));
      return cache;
    })
    .catch(() => {
      cache = cache || {};
      subscribers.forEach((fn) => fn(cache));
      return cache;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export default function useHubSummary() {
  const [summary, setSummary] = useState(cache);

  useEffect(() => {
    let alive = true;
    const update = (data) => { if (alive) setSummary(data); };
    subscribers.add(update);
    if (cache) update(cache);
    else load();
    return () => { alive = false; subscribers.delete(update); };
  }, []);

  // Owner action: force a server-side rebuild (e.g. after editing site state).
  const refresh = useCallback(() => load(true), []);

  return { summary, refresh };
}
