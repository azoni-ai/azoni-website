import { useEffect, useState } from 'react';

// Shared, deduped fetch of the cached home-summary endpoint. Every home-page
// component that used to open its own real-time `agent_activity` listener now
// reads this single cached payload instead — one network call per page load
// (and usually a CDN hit), zero client-side Firestore reads.

let cache = null;
let inflight = null;
const subscribers = new Set();

function load() {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch('/.netlify/functions/home-summary')
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
      cache = {};
      subscribers.forEach((fn) => fn(cache));
      return cache;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export default function useHomeSummary() {
  const [summary, setSummary] = useState(cache);

  useEffect(() => {
    let alive = true;
    const update = (data) => { if (alive) setSummary(data); };
    subscribers.add(update);
    if (cache) update(cache);
    else load();
    return () => { alive = false; subscribers.delete(update); };
  }, []);

  return summary;
}
