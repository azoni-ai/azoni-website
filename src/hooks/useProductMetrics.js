import { useEffect, useState } from 'react';
import { SITES } from '../data/sites';

// Joins the live-data endpoints (hub-summary for traffic/status/activity,
// app-stats for the headline impact number) onto projects.js ids, so a single
// product card can show marketing + live metrics. The bridge is
// sites.js.boardProjectId (= the projects.js id) → site.id (= the live-data key).

const fmtCount = (n) => {
  if (!Number.isFinite(n)) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString();
};

// site.id → live headline impact resolver over the app-stats payload.
const IMPACT = {
  fabstats: (a) =>
    a?.fabstats?.matches > 0 ? { value: fmtCount(a.fabstats.matches), label: 'matches tracked' } : null,
  rowcrew: (a) =>
    a?.rowcrew?.kilometers > 0
      ? { value: `${Math.round(a.rowcrew.kilometers).toLocaleString()} km`, label: 'rowed collectively' }
      : null,
  benchpressonly: (a) =>
    a?.benchpressonly?.workoutsLogged > 0
      ? { value: fmtCount(a.benchpressonly.workoutsLogged), label: 'workouts logged' }
      : null,
  oldwaystoday: (a) =>
    a?.oldwaystoday?.requests > 0
      ? { value: fmtCount(a.oldwaystoday.requests), label: 'chatbot requests' }
      : null,
};

let cache = null;
let inflight = null;
const subscribers = new Set();

function load() {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  const grab = (url) =>
    fetch(url)
      .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
      .catch(() => null);

  inflight = Promise.all([
    grab('/.netlify/functions/hub-summary'),
    grab('/.netlify/functions/app-stats'),
  ])
    .then(([hub, app]) => {
      const bySite = {};
      (hub?.sites || []).forEach((s) => {
        bySite[s.id] = s;
      });

      const map = {};
      SITES.forEach((site) => {
        const pid = site.boardProjectId;
        if (!pid) return;
        const hs = bySite[site.id] || null;
        const impactFn = IMPACT[site.id];
        // Real degraded/down wins; otherwise a site with a live URL reads as
        // "up" (no active health check just means we're not probing it).
        const rawStatus = hs?.health?.status;
        const status =
          rawStatus && rawStatus !== 'unknown' ? rawStatus : site.url ? 'up' : null;
        map[pid] = {
          siteId: site.id,
          hasLiveData: !!hs || !!impactFn,
          status,
          visitors7d: hs?.traffic?.d7 ?? null,
          visitors30d: hs?.traffic?.d30 ?? null,
          visitorsTotal: hs?.traffic?.total ?? null,
          lastActivityMs: hs?.lastSeenMs || null,
          cost30d: hs?.cost30d ?? null,
          impact: impactFn ? impactFn(app) : null,
        };
      });

      cache = { map, updatedAt: hub?.updatedAt || app?.updatedAt || null };
      subscribers.forEach((fn) => fn(cache));
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export default function useProductMetrics() {
  const [data, setData] = useState(cache);
  useEffect(() => {
    let alive = true;
    const update = (d) => alive && setData(d);
    subscribers.add(update);
    if (cache) update(cache);
    else load();
    return () => {
      alive = false;
      subscribers.delete(update);
    };
  }, []);
  return data; // { map: { [projectId]: metrics }, updatedAt } | null
}
