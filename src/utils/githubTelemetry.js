export const GITHUB_STATS_SCOPE = 'github-contributions-with-public-feed';
export const PUBLIC_FEED_SCOPE = 'public-independent-sample';
export const GITHUB_STATS_URL = '/.netlify/functions/github-stats?scope=contributions-v2';

const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

export const isContributionPayload = (data) => data?.statsScope === GITHUB_STATS_SCOPE
  && data.metric === 'contributions' && data.countsAreSample === false;

export function getContributionTiles(data) {
  const valid = isContributionPayload(data);
  const year = valid && Number.isInteger(data.statsYear) ? data.statsYear : null;
  return [
    { key: 'today', label: 'today' },
    { key: 'last7Days', label: 'past 7 days' },
    { key: 'thisMonth', label: 'this month' },
    { key: 'thisYear', label: year ? `in ${year}` : 'this year' },
  ].map((tile) => ({ ...tile, value: valid && data.totalsAvailable === true && isCount(data[tile.key]) ? data[tile.key] : null }));
}

export function getContributionDate(data) {
  if (!isContributionPayload(data) || !/^\d{4}-\d{2}-\d{2}$/.test(data.statsDate || '')) return null;
  const date = new Date(`${data.statsDate}T12:00:00Z`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
  }) : null;
}

export function getCommitAttribution(data) {
  if (data?.feedScope !== PUBLIC_FEED_SCOPE || data.feedAvailable !== true) return null;
  const split = data.commitSplit;
  if (!split || !isCount(split.sampleSize) || split.sampleSize === 0) return null;
  // Older payloads called untagged commits "solo"; absence of a tag does not
  // establish whether an author used AI, so never present that interpretation.
  const untagged = split.untagged ?? split.solo;
  const segments = [
    { key: 'claude', label: 'Claude Code', value: split.claudeCode },
    { key: 'codex', label: 'Codex', value: split.codexCode },
    { key: 'both', label: 'Both', value: split.both ?? 0 },
    { key: 'solo', label: 'Untagged', value: untagged },
  ];
  if (segments.some(({ value }) => !isCount(value))) return null;
  if (segments.reduce((sum, { value }) => sum + value, 0) !== split.sampleSize) return null;
  return { sampleSize: split.sampleSize, segments };
}
