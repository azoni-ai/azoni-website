import { useState, useEffect } from 'react';

/**
 * One-shot fetch of the github-stats Netlify function (recentCommits, repos,
 * bounded public commit counts). Mirrors the fetch in Commits.jsx, silent-fail.
 */
export default function useGithubStats() {
  const [githubStats, setGithubStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/.netlify/functions/github-stats?scope=public-independent-v1')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setGithubStats(data?.statsScope === 'public-independent-sample' ? data : null);
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
