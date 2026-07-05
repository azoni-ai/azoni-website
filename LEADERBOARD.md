# Traffic Leaderboard

Cross-site visitor leaderboard at **/leaderboard**. Ranks every site I run by
visitors, with 24h / 7d / 30d windows and per-site icons.

## How it works (one log path per site)

```
each site  ──(1 session beacon)──►  azoni.ai/.netlify/functions/log-visit
                                          │  writes ONE tiny row
                                          ▼
                                   Firestore `site_visits`  { source, ts, ttl }
                                          │
   /leaderboard page ◄── leaderboard.js ─┤  count() per site × window (cached 15m)
                                          └── + launchpad views from MCP /launchpad/stats
```

- **One beacon per site.** Each site fires exactly one visit per session to the
  shared `log-visit` endpoint. No double-logging.
- **Dedicated collection.** Visits live in `site_visits`, NOT `agent_activity`,
  so the ops feed and homepage cost reads stay lean.
- **Cheap aggregation.** `leaderboard.js` uses Firestore `count()` aggregations
  (≈1 read per site per window) and caches the whole board in
  `settings/leaderboard` for 15 min. The page fetches ONE endpoint.
- **Launchpad reuses existing data.** The 10 launchpad apps are already tracked
  by the MCP server, so they're merged in via `/launchpad/stats` (no second
  logging path). Their 24h count is real; 7d/30d fall back to lifetime total
  (flagged `total` in the UI).

## One-time setup (Firebase console — not in repo)

This repo has no `firebase.json`, so these are done in the console once:

1. **Composite index** for the count query. On first load the function logs a
   `FAILED_PRECONDITION` with a direct "create index" link — click it. Or create
   manually: collection `site_visits`, fields `source` (Asc) + `ts` (Asc).
   Until it exists, beacon sites show `—` (the endpoint still returns 200).
2. **TTL policy** (optional, keeps the collection small & free to clean):
   Firestore → TTL → add policy on collection `site_visits`, field `ttl`.
   Rows self-delete ~40 days out; we only ever aggregate the last 30.

No new env vars — reuses the existing `FIREBASE_*` and `MCP_*` values.

## Per-site instrumentation status

| Site | How it reports | Source key | Status |
|---|---|---|---|
| azoni.ai | top-level beacon in `App.jsx` → `/log-visit` | `azoni` | ✅ deployed |
| benchpressonly.com | module beacon in `benchonly/src/main.jsx` | `benchpressonly` | ✅ deployed |
| oldwaystoday.com | `VisitTracker.jsx` in Next layout (CSP allows https:) | `oldwaystoday` | ✅ deployed |
| fabstats.net | existing `PageVisitTracker` redirected → same-origin proxy `log-visit.mts` (strict CSP) | `fabstats` | ✅ deployed |
| embedroute.com | `VisitTracker.tsx` → Next route forwards once | `embedroute` | ✅ deployed |
| **rowcrew** | repo not in Meme — needs the snippet below | `rowcrew` | ⚠️ pending |
| Launchpad ×8 | existing MCP `/launchpad/stats` | (per app) | ✅ auto |

> Note: benchonly (local was 39 behind + dirty) and fab-stats (feature branch +
> WIP) were shipped via a `git worktree` off `origin/main` so only the beacon
> landed — no local WIP was committed. fab-stats already had a `PageVisitTracker`
> logging one visit/session to the MCP ecosystem; that single log was redirected
> to the shared sink (not duplicated).

## rowcrew snippet (drop into the rowing-tracker repo)

React/Vite entry (`src/main.jsx`) — same pattern as benchonly:

```js
if (typeof window !== 'undefined' && !sessionStorage.getItem('_av_lb')) {
  sessionStorage.setItem('_av_lb', '1')
  fetch('https://azoni.ai/.netlify/functions/log-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'rowcrew' }),
  }).catch(() => {})
}
```

If rowcrew has a restrictive CSP `connect-src`, either add `https://azoni.ai`
to it, or proxy through a same-origin function (see fab-stats' `log-visit.mts`).

## Adding a new site to the board

1. Add the beacon to the site with a unique `source`.
2. Add one row to `BEACON_SITES` in `netlify/functions/leaderboard.js`
   (`key` = source, plus `label`, `url`, `icon`, `color`).
3. Drop an icon in `public/images/` if it isn't there already.
