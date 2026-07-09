import { useState, useEffect } from 'react';

/**
 * One-shot fetch of the github-stats Netlify function (recentCommits, repos,
 * contribution tallies). Mirrors the inline fetch in Commits.jsx, silent-fail.
 */
export default function useGithubStats() {
  const [githubStats, setGithubStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/.netlify/functions/github-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setGithubStats(data);
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
