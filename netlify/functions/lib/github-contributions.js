const TIMEZONE = 'America/Los_Angeles';
const METRIC_FIELDS = ['today', 'last7Days', 'last30Days', 'thisMonth', 'thisYear'];
const dayKey = date => new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(date));
const offsetDay = (day, offset) => new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);

function getContributionRanges(now = new Date()) {
  const statsDate = dayKey(now);
  const statsYear = Number(statsDate.slice(0, 4));
  const yearStart = `${statsYear}-01-01`;
  const recentStart = offsetDay(statsDate, -29);
  // Separate calendar years keep every query below GitHub's one-year range
  // limit, even on Dec 31 in Pacific time after UTC has entered the next year.
  const ranges = [{
    name: 'year', from: `${yearStart}T00:00:00.000Z`,
    to: new Date(Math.min(new Date(now).getTime(), Date.parse(`${statsYear}-12-31T23:59:59.999Z`))).toISOString(),
  }];
  if (recentStart < yearStart) ranges.push({
    name: 'previous', from: `${recentStart}T00:00:00.000Z`,
    to: `${statsYear - 1}-12-31T23:59:59.999Z`,
  });
  return { statsDate, statsYear, ranges };
}

function buildContributionStats(calendars = [], now = new Date()) {
  const { statsDate, statsYear } = getContributionRanges(now);
  const unavailable = {
    ...Object.fromEntries(METRIC_FIELDS.map(field => [field, null])),
    totalsAvailable: false, statsDate, statsYear,
    metric: 'contributions', contributionTimezone: TIMEZONE,
  };
  if (!Array.isArray(calendars) || !calendars.length) return unavailable;
  const yearStart = `${statsYear}-01-01`;
  const monthStart = `${statsDate.slice(0, 7)}-01`;
  const sevenStart = offsetDay(statsDate, -6);
  const thirtyStart = offsetDay(statsDate, -29);
  const requiredStart = yearStart < thirtyStart ? yearStart : thirtyStart;
  const days = new Map();
  for (const calendar of calendars) {
    if (!Array.isArray(calendar?.weeks)) return unavailable;
    for (const week of calendar.weeks) {
      if (!Array.isArray(week?.contributionDays)) return unavailable;
      for (const day of week.contributionDays) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day?.date || '')) return unavailable;
        const dateMs = Date.parse(day.date + 'T00:00:00Z');
        if (!Number.isFinite(dateMs) || new Date(dateMs).toISOString().slice(0, 10) !== day.date) return unavailable;
        if (day.date < requiredStart || day.date > statsDate) continue;
        if (!Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0) return unavailable;
        if (days.has(day.date) && days.get(day.date) !== day.contributionCount) return unavailable;
        days.set(day.date, day.contributionCount);
      }
    }
  }
  // A missing/partial calendar is unavailable, not a convincing zero or an
  // understated total. A complete all-zero calendar is valid.
  for (let date = requiredStart; date <= statsDate; date = offsetDay(date, 1)) {
    if (!days.has(date)) return unavailable;
  }
  const countSince = start => [...days].reduce((sum, [date, count]) => sum + (date >= start && date <= statsDate ? count : 0), 0);
  return {
    ...unavailable, totalsAvailable: true,
    today: days.get(statsDate), last7Days: countSince(sevenStart), last30Days: countSince(thirtyStart),
    thisMonth: countSince(monthStart), thisYear: countSince(yearStart),
  };
}

module.exports = { TIMEZONE, dayKey, getContributionRanges, buildContributionStats };
