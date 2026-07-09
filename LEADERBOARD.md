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
- **Launchpad reuses its own beacon.** The 8 launchpad apps already fire a
  once-per-session view beacon to the MCP server (`/launchpad/view`, their
  documented standard). We bridge those counts in via `/launchpad/stats` — no
  second logging path, no touching the apps. Only 24h is a true window from MCP,
  so their cards lean on the always-visible total. The fetch is resilient: on a
  Render cold-start miss it keeps the last-known launchpad rows (function timeout
  raised to 26s in `netlify.toml`).
- **Total views per card.** Every card shows all-time total regardless of the
  selected window. For beacon sites the total uses the auto single-field index,
  so it works even before the composite index below exists.
- **Start date.** The board shows "Tracking since 2026-07-05" — visitor logging
  went live that day, so numbers build from there.

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
| rowcrew | beacon in `prediction/Webapp/rowing-tracker/src/index.js` | `rowcrew` | ✅ deployed |
| Launchpad ×8 | their own `/launchpad/view` beacon, bridged via MCP `/launchpad/stats` | (per app) | ✅ auto (not re-instrumented) |

> Notes:
> - benchonly (local was 39 behind + dirty) and fab-stats (feature branch + WIP)
>   were shipped via a `git worktree` off `origin/main` so only the beacon landed.
>   fab-stats already had a `PageVisitTracker` logging one visit/session to the
>   MCP ecosystem; that single log was redirected to the shared sink (not dup'd).
> - **rowcrew** was hiding at `prediction/Webapp/rowing-tracker` (repo
>   `rowing-tracker`), not a rowing-named folder.
> - **Launchpad** apps are NOT beaconed — they already have their own
>   documented once-per-session beacon (`launchpad/CLAUDE.md`). Adding ours would
>   double-log, so we bridge instead. If they don't appear on the board, the MCP
>   read key (`MCP_READ_KEY` / `MCP_ADMIN_KEY`) isn't set in azoni-website's
>   Netlify env, or Render was cold on the last refresh.

## Adding a new site to the board

1. Add the beacon to the site with a unique `source`.
2. Add one row to `BEACON_SITES` in `netlify/functions/leaderboard.js`
   (`key` = source, plus `label`, `url`, `icon`, `color`).
3. Drop an icon in `public/images/` if it isn't there already.
