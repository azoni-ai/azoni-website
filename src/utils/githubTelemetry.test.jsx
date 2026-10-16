import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import CommitStats from '../components/home/CommitStats';
import HeroStats from '../components/home/HeroStats';
import Commits from '../pages/Commits';
import { getCommitAttribution, getContributionTiles, isContributionPayload } from './githubTelemetry';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../hooks/useHomeSummary', () => () => null);

const stats = {
  statsScope: 'github-contributions-with-public-feed', metric: 'contributions', countsAreSample: false,
  totalsAvailable: true, statsYear: 2024, statsDate: '2024-12-31', contributionTimezone: 'America/Los_Angeles',
  today: 0, last7Days: 123, last30Days: 1500, thisMonth: 1400, thisYear: 24000,
  feedScope: 'public-independent-sample', feedAvailable: true,
  commitSplit: { sampleSize: 4, claudeCode: 1, codexCode: 1, both: 1, untagged: 1 },
  recentCommits: [], repos: [],
};

let container;
let root;
const previousFetch = global.fetch;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  global.fetch = previousFetch;
});
const render = async (element) => { await act(async () => root.render(element)); };
const respondWith = (data) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => 'application/json' }, json: async () => data });
};

test('rejects the old sampled-total contract instead of treating it as account totals', () => {
  const old = { ...stats, statsScope: 'public-independent-sample', countsAreSample: true };
  expect(isContributionPayload(old)).toBe(false);
  expect(getContributionTiles(old).every(({ value }) => value === null)).toBe(true);
});

test('keeps reported zero distinct from missing totals and uses the payload year', () => {
  expect(getContributionTiles(stats)[0].value).toBe(0);
  expect(getContributionTiles(stats)[3]).toEqual({ key: 'thisYear', label: 'in 2024', value: 24000 });
  expect(getContributionTiles({ ...stats, today: null })[0].value).toBeNull();
  expect(getContributionTiles({ ...stats, totalsAvailable: false }).every(({ value }) => value === null)).toBe(true);
});

test('uses exclusive AI-tag categories including both and labels old solo data as untagged', () => {
  expect(getCommitAttribution(stats).segments.map(({ value }) => value)).toEqual([1, 1, 1, 1]);
  expect(getCommitAttribution(stats).segments.map(({ label }) => label)).toEqual(['Claude Code', 'Codex', 'Both', 'Untagged']);
  const legacy = { ...stats, commitSplit: { sampleSize: 3, claudeCode: 1, codexCode: 1, solo: 1 } };
  expect(getCommitAttribution(legacy).segments[3]).toMatchObject({ label: 'Untagged', value: 1 });
});

test('withholds misleading attribution when feed is unavailable or counts do not add up', () => {
  expect(getCommitAttribution({ ...stats, feedAvailable: false })).toBeNull();
  expect(getCommitAttribution({ ...stats, commitSplit: { ...stats.commitSplit, both: 3 } })).toBeNull();
});

test('home band shows full contribution totals separately from its four-commit AI sample', async () => {
  await render(<CommitStats githubStats={stats} />);
  expect(container.querySelectorAll('.commit-tile-value')[3].textContent).toBe('24,000');
  expect(container.querySelectorAll('.commit-tile-label')[3].textContent).toBe('contributions in 2024');
  expect(container.querySelector('.commit-split-caption').textContent).toBe('AI tags in 4 recent public commits');
  expect(container.querySelector('.commit-split-legend').textContent).toContain('Both');
  expect(container.querySelector('.commit-split-legend').textContent).toContain('Untagged');
  expect(container.textContent).not.toMatch(/\bSolo\b|\bMine\b/);
  expect(container.querySelector('.commit-scope a').href).toBe('https://github.com/azoni');
});

test('home band keeps the public sample visible when contribution totals are unavailable', async () => {
  await render(<CommitStats githubStats={{ ...stats, totalsAvailable: false, today: null, last7Days: null, thisMonth: null, thisYear: null }} />);
  expect(container.querySelectorAll('.commit-tile-value [aria-label="Unavailable"]')).toHaveLength(4);
  expect(container.querySelector('[role="status"]').textContent).toContain('temporarily unavailable');
  expect(container.querySelector('.commit-split-caption')).not.toBeNull();
});

test('home band distinguishes loading from a failed response without inserting zero', async () => {
  await render(<CommitStats githubStats={null} loading />);
  expect(container.querySelector('.commit-band').getAttribute('aria-busy')).toBe('true');
  expect(container.querySelectorAll('.cs-skel-num')).toHaveLength(4);
  await render(<CommitStats githubStats={null} loading={false} />);
  expect(container.querySelectorAll('.cs-skel-num')).toHaveLength(0);
  expect(container.querySelectorAll('[aria-label="Unavailable"]')).toHaveLength(4);
});

test('hero totals keep contribution labels and payload year and show unavailable values', async () => {
  await render(<HeroStats githubStats={stats} />);
  expect(container.textContent).toContain('contributions in 2024');
  expect(container.textContent).toContain('24,000');
  expect(container.textContent).toContain('Account-wide');
  await render(<HeroStats githubStats={{ ...stats, totalsAvailable: false }} />);
  expect(container.querySelectorAll('.hero-stats-value--status')).toHaveLength(2);
  expect(container.textContent).not.toContain('24,000');
});

test('commit page retains account totals while filtering private and unlisted feed records', async () => {
  const commit = { isPrivate: false, owner: 'azoni-ai', repo: 'azoni-website', message: 'Public change', sha: '1234567', timestamp: '2024-12-31T16:00:00Z', repoUrl: 'https://github.com/azoni-ai/azoni-website' };
  respondWith({ ...stats, recentCommits: [commit, { ...commit, isPrivate: true, message: 'Private change' }, { ...commit, owner: 'unknown', message: 'Unlisted change' }], repos: [{ isPrivate: false, owner: 'azoni-ai', name: 'azoni-website' }] });
  await render(<Commits embedded />);
  expect(container.querySelectorAll('.commits-stat-value')[3].textContent).toBe('24,000');
  expect(container.querySelectorAll('.commits-stat-label')[3].textContent).toBe('in 2024');
  expect(container.querySelectorAll('.commit-item-msg')).toHaveLength(1);
  expect(container.querySelector('.commit-item-msg').textContent).toBe('Public change');
  expect(container.textContent).not.toContain('Private change');
  expect(container.textContent).not.toContain('Unlisted change');
});

test('commit page treats feed failure separately from a successful empty feed', async () => {
  respondWith({ ...stats, feedAvailable: false });
  await render(<Commits embedded />);
  expect(container.querySelector('.commits-empty').textContent).toContain('temporarily unavailable');
  expect(container.querySelectorAll('.commits-stat-value')[3].textContent).toBe('24,000');
});

test('commit page shows unavailable totals and available empty feed without fabricated zeros', async () => {
  respondWith({ ...stats, totalsAvailable: false, today: null, last7Days: null, thisMonth: null, thisYear: null });
  await render(<Commits embedded />);
  expect(container.querySelectorAll('.commits-stat-value [aria-label="Unavailable"]')).toHaveLength(4);
  expect(container.querySelector('.commits-empty').textContent).toBe('No recent commits');
});

test('commit page rejects stale sampled-total payloads instead of misreporting totals', async () => {
  respondWith({ ...stats, statsScope: 'public-independent-sample', countsAreSample: true });
  await render(<Commits embedded />);
  expect(container.querySelectorAll('.commits-stat-value [aria-label="Unavailable"]')).toHaveLength(4);
  expect(container.querySelector('.commits-empty').textContent).toContain('temporarily unavailable');
});

test('commit page reports a failed fetch instead of showing an empty successful feed', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Offline'));
  await render(<Commits embedded />);
  expect(container.querySelectorAll('.commits-stat-value [aria-label="Unavailable"]')).toHaveLength(4);
  expect(container.querySelector('.commits-empty').textContent).toContain('temporarily unavailable');
  expect(container.querySelector('.commits-empty').textContent).not.toContain('No recent commits');
});
