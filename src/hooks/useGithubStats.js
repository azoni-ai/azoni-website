import { useState, useEffect } from 'react';
import { GITHUB_STATS_URL, PUBLIC_FEED_SCOPE, isContributionPayload } from '../utils/githubTelemetry';

/**
 * One-shot fetch of the github-stats Netlify function (recentCommits, repos,
 * account contribution totals and sampled public commits). Silent-fail.
 */
export default function useGithubStats() {
  const [githubStats, setGithubStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(GITHUB_STATS_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setGithubStats(isContributionPayload(data) && data?.feedScope === PUBLIC_FEED_SCOPE ? data : null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { githubStats, loading };
}
