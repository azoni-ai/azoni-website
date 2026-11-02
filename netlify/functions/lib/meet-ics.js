// Busy intervals from an iCalendar feed. Written for Outlook's published
// calendar ("Can view when I'm busy"), which defines its Windows-named zones in
// VTIMEZONE blocks. All-day and floating times, and zones the feed never
// defines, are read as wall-clock times rather than in the server's zone.

const ICAL = require('ical.js');
const { DateTime, IANAZone } = require('luxon');

// Per series. A daily meeting that started in 1999 is still under this.
const MAX_OCCURRENCES = 10_000;
const NON_BLOCKING = new Set(['FREE', 'WORKINGELSEWHERE']);

function toMillis(time, timezone) {
  if (time.zone !== ICAL.Timezone.localTimezone) return time.toJSDate().getTime();
  const zone = time.timezone && IANAZone.isValidZone(time.timezone) ? time.timezone : timezone;
  const { year, month, day, hour, minute, second } = time;
  return DateTime.fromObject({ year, month, day, hour, minute, second }, { zone }).toMillis();
}

function blocksTime(event) {
  const c = event.component;
  if (String(c.getFirstPropertyValue('status') || '').toUpperCase() === 'CANCELLED') return false;
  // Outlook's busy status is more specific than TRANSP (tentative is still OPAQUE).
  const busyStatus = String(c.getFirstPropertyValue('x-microsoft-cdo-busystatus') || '').toUpperCase();
  if (busyStatus) return !NON_BLOCKING.has(busyStatus);
  return String(c.getFirstPropertyValue('transp') || 'OPAQUE').toUpperCase() !== 'TRANSPARENT';
}

// from / to: epoch ms window. Returns [{ start, end }] in epoch ms.
function busyFromIcs(text, { from, to, timezone }) {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const vtimezone of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(vtimezone);

  const series = new Map();
  const exceptions = [];
  for (const vevent of root.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(vevent);
    if (event.isRecurrenceException()) exceptions.push(event);
    else series.set(event.uid, event);
  }
  // A moved or edited occurrence replaces its slot in the series; one without
  // a recurring parent stands on its own.
  const standalone = [];
  for (const exception of exceptions) {
    const parent = series.get(exception.uid);
    if (parent && parent.isRecurring()) parent.relateException(exception);
    else standalone.push(exception);
  }

  const busy = [];
  const add = (item, startTime, endTime) => {
    if (!blocksTime(item)) return;
    const start = toMillis(startTime, timezone);
    const end = toMillis(endTime, timezone);
    if (end > from && start < to) busy.push({ start, end });
  };

  for (const event of [...series.values(), ...standalone]) {
    if (!event.isRecurring()) {
      add(event, event.startDate, event.endDate);
      continue;
    }
    const occurrences = event.iterator();
    for (let i = 0, next; i < MAX_OCCURRENCES && (next = occurrences.next()); i++) {
      if (toMillis(next, timezone) >= to) break;
      const occurrence = event.getOccurrenceDetails(next);
      add(occurrence.item, occurrence.startDate, occurrence.endDate);
    }
  }
  return busy;
}

// Outlook hands out webcal:// links; they're served over https. A feed that
// stops being a calendar (unpublished, or a sign-in page) must throw rather
// than read as "no busy time".
async function fetchFeed(url) {
  const res = await fetch(url.replace(/^webcal:/i, 'https:'), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Calendar feed returned ${res.status}`);
  const text = await res.text();
  if (!/^﻿?\s*BEGIN:VCALENDAR/i.test(text)) throw new Error('Link did not return a calendar');
  return text;
}

module.exports = { busyFromIcs, fetchFeed };
