/**
 * Per-section visit tracking is intentionally a no-op.
 *
 * The portfolio now uses ONE site-level beacon per site (see App.jsx, which
 * POSTs a single visit to /log-visit → the `site_visits` collection). Firing
 * extra per-route visits here would double-write for azoni.ai and muddy the
 * traffic leaderboard, so this hook no longer logs.
 *
 * Kept as a stable no-op so existing `useVisitTracker(source)` call sites don't
 * need to change. If per-section analytics are wanted later, wire them to a
 * separate collection, not the site-visit sink.
 */
export default function useVisitTracker(_source) {
  // no-op by design — see comment above
}
