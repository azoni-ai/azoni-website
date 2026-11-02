// Open booking slots: the weekly hours from meet-config, minus busy time (padded
// by the buffer), the minimum notice, and days that already hit the cap. Day
// and hour math runs in the owner's zone so DST changes land on the right UTC.

const { DateTime } = require('luxon');

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function at(day, hhmm) {
  const [hour, minute] = hhmm.split(':').map(Number);
  return day.set({ hour, minute });
}

// busy: [{ start, end }] in epoch ms. bookedPerDay: { 'YYYY-MM-DD': count } in
// the owner's zone. Returns slot starts as UTC ISO strings, earliest first.
function freeSlots({ now, busy, bookedPerDay = {}, config }) {
  const { timezone, durationMinutes, stepMinutes, bufferMinutes, minNoticeHours, horizonDays, maxPerDay, hours } = config;
  const earliest = now + minNoticeHours * HOUR;
  const latest = now + horizonDays * DAY;
  const buffer = bufferMinutes * MINUTE;
  const slots = [];

  for (let day = DateTime.fromMillis(now, { zone: timezone }).startOf('day'); day.toMillis() < latest; day = day.plus({ days: 1 })) {
    if ((bookedPerDay[day.toISODate()] || 0) >= maxPerDay) continue;
    for (const [open, close] of hours[day.weekday] || []) {
      const rangeEnd = at(day, close);
      for (let slot = at(day, open); slot.plus({ minutes: durationMinutes }) <= rangeEnd; slot = slot.plus({ minutes: stepMinutes })) {
        const start = slot.toMillis();
        const end = start + durationMinutes * MINUTE;
        if (start < earliest || start >= latest) continue;
        if (busy.some((b) => start - buffer < b.end && end + buffer > b.start)) continue;
        slots.push(new Date(start).toISOString());
      }
    }
  }
  return slots;
}

module.exports = { freeSlots, DAY };
