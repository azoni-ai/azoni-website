const test = require('node:test');
const assert = require('node:assert/strict');
const { getContributionRanges, buildContributionStats } = require('../netlify/functions/lib/github-contributions');

const NOW = new Date('2026-10-16T18:00:00Z');
const metrics = ['today', 'last7Days', 'last30Days', 'thisMonth', 'thisYear'];
function calendar(from, to, count = 1) {
  const contributionDays = [];
  for (let date = Date.parse(`${from}T00:00:00Z`); date <= Date.parse(`${to}T00:00:00Z`); date += 86400000) {
    contributionDays.push({ date: new Date(date).toISOString().slice(0, 10), contributionCount: count });
  }
  return { weeks: [{ contributionDays }] };
}
function assertUnavailable(result) {
  assert.equal(result.totalsAvailable, false);
  for (const key of metrics) assert.equal(result[key], null, key);
}

test('calendar totals cover the full year independently of a 300-commit feed cap', () => {
  const result = buildContributionStats([calendar('2026-01-01', '2026-10-16', 25)], NOW);
  assert.equal(result.totalsAvailable, true);
  assert.deepEqual(metrics.map(key => result[key]), [25, 175, 750, 400, 7225]);
  assert.equal(result.metric, 'contributions');
  assert.equal(result.statsDate, '2026-10-16');
  assert.equal(result.statsYear, 2026);
});

test('January rolling windows include the previous year without adding it to month or year totals', () => {
  const now = new Date('2027-01-01T20:00:00Z');
  const result = buildContributionStats([
    calendar('2026-12-03', '2026-12-31', 2), calendar('2027-01-01', '2027-01-01', 2),
  ], now);
  assert.deepEqual(metrics.map(key => result[key]), [2, 14, 60, 2, 2]);
  assertUnavailable(buildContributionStats([calendar('2027-01-01', '2027-01-01', 2)], now));
});

test('reporting date and query year remain Pacific when UTC has entered a new year', () => {
  const result = getContributionRanges(new Date('2027-01-01T04:00:00Z'));
  assert.equal(result.statsDate, '2026-12-31');
  assert.equal(result.statsYear, 2026);
  assert.deepEqual(result.ranges, [{
    name: 'year', from: '2026-01-01T00:00:00.000Z', to: '2026-12-31T23:59:59.999Z',
  }]);
  const leapYear = getContributionRanges(new Date('2025-01-01T04:00:00Z'));
  assert.equal(leapYear.statsYear, 2024);
  assert.ok(Date.parse(leapYear.ranges[0].to) < Date.parse('2025-01-01T00:00:00Z'));
});

test('January query requests only the previous days needed for a complete 30-day window', () => {
  const result = getContributionRanges(new Date('2027-01-01T20:00:00Z'));
  assert.deepEqual(result.ranges, [
    { name: 'year', from: '2027-01-01T00:00:00.000Z', to: '2027-01-01T20:00:00.000Z' },
    { name: 'previous', from: '2026-12-03T00:00:00.000Z', to: '2026-12-31T23:59:59.999Z' },
  ]);
  assert.equal(getContributionRanges(new Date('2027-01-29T20:00:00Z')).ranges.length, 2);
  assert.equal(getContributionRanges(new Date('2027-01-30T20:00:00Z')).ranges.length, 1);
});

for (const [day, instant] of [
  ['2026-03-08', '2026-03-08T10:30:00Z'],
  ['2026-11-01', '2026-11-01T09:30:00Z'],
  ['2024-03-01', '2024-03-01T20:00:00Z'],
]) {
  test(`inclusive 7/30-day windows survive DST and leap-day boundaries: ${day}`, () => {
    const result = buildContributionStats([calendar(`${day.slice(0, 4)}-01-01`, day)], new Date(instant));
    assert.equal(result.totalsAvailable, true);
    assert.equal(result.today, 1);
    assert.equal(result.last7Days, 7);
    assert.equal(result.last30Days, 30);
    if (day === '2024-03-01') assert.equal(result.thisYear, 61);
  });
}

test('complete zero activity is valid while missing calendars or days are unavailable', () => {
  const zero = buildContributionStats([calendar('2026-01-01', '2026-10-16', 0)], NOW);
  assert.equal(zero.totalsAvailable, true);
  assert.deepEqual(metrics.map(key => zero[key]), [0, 0, 0, 0, 0]);
  for (const calendars of [[], [null], [{ weeks: [] }], [calendar('2026-01-02', '2026-10-16')]]) {
    assertUnavailable(buildContributionStats(calendars, NOW));
  }
  const missingInteriorDay = calendar('2026-01-01', '2026-10-16');
  missingInteriorDay.weeks[0].contributionDays.splice(100, 1);
  assertUnavailable(buildContributionStats([missingInteriorDay], NOW));
});

test('overlapping identical dates are deduplicated but conflicting counts fail closed', () => {
  const full = calendar('2026-01-01', '2026-10-16');
  assert.equal(buildContributionStats([full, calendar('2026-10-10', '2026-10-16')], NOW).thisYear, 289);
  assertUnavailable(buildContributionStats([full, calendar('2026-10-10', '2026-10-16', 2)], NOW));
});

test('invalid date keys and counts cannot inflate otherwise complete calendar totals', () => {
  for (const invalid of [
    { date: '2026-02-30', contributionCount: 1000 },
    { date: '2026-02-02T00:00:00Z', contributionCount: 1 },
    { date: '2026-02-02', contributionCount: -1 },
    { date: '2026-02-02', contributionCount: 1.5 },
    { date: '2026-02-02', contributionCount: '2' },
    { date: '2026-02-02', contributionCount: Number.NaN },
  ]) {
    const full = calendar('2026-01-01', '2026-10-16');
    full.weeks[0].contributionDays.push(invalid);
    assertUnavailable(buildContributionStats([full], NOW));
  }
});

test('calendar padding and future dates do not increase the requested reporting totals', () => {
  const result = buildContributionStats([
    calendar('2025-12-28', '2025-12-31', 100), calendar('2026-01-01', '2026-10-16'),
    calendar('2026-10-17', '2026-10-20', 100),
  ], NOW);
  assert.deepEqual(metrics.map(key => result[key]), [1, 7, 30, 16, 289]);
});
