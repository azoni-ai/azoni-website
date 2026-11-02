/**
 * Public booking for /meet.
 *
 * GET  /.netlify/functions/meet -> { timezone, durationMinutes, slots }
 * POST /.netlify/functions/meet -> books one slot
 * Body: { start, name, email, company?, location?, notes?, website? }
 *
 * Calendars are connected from the admin Calendar tab (meet-admin) and stored
 * by meet-settings. Busy time comes from the connected Google account (which
 * bookings are written to, plus any MEET_GOOGLE_CALENDAR_IDS) and from every
 * busy-only feed (the Outlook work calendar). If any source can't be read the
 * endpoint fails instead of offering times that might not be free.
 *
 * `website` is a honeypot field the page never shows.
 */

const crypto = require('crypto');
const { DateTime } = require('luxon');
const config = require('./lib/meet-config');
const google = require('./lib/google-calendar');
const settings = require('./lib/meet-settings');
const { busyFromIcs, fetchFeed } = require('./lib/meet-ics');
const { freeSlots, DAY } = require('./lib/meet-slots');
const { clientIp } = require('./owner-auth-util');

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (statusCode, data) => ({ statusCode, headers, body: JSON.stringify(data) });

// Every event this page creates carries these private properties, which is how
// the per-day cap and the one-upcoming-call-per-guest rule find them again.
const BOOKED_TAG = 'azoniMeet=1';
const ICS_CACHE_MS = 2 * 60_000;
const CLAIM_MS = 2 * 60_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function listEnv(name, fallback = '') {
  return (process.env[name] || fallback).split(',').map((s) => s.trim()).filter(Boolean);
}

// Slot lists may come from a feed fetched in the last couple of minutes;
// bookings always re-fetch.
const icsCache = new Map();

async function fetchIcs(url, { fresh }) {
  const hit = icsCache.get(url);
  if (!fresh && hit && Date.now() - hit.at < ICS_CACHE_MS) return hit.text;
  const text = await fetchFeed(url);
  icsCache.set(url, { at: Date.now(), text });
  return text;
}

const guestOf = (event) => event.extendedProperties?.private?.azoniMeetGuest;

async function availability(now, cal, feeds, { fresh = false } = {}) {
  const dayStart = DateTime.fromMillis(now, { zone: config.timezone }).startOf('day').toMillis();
  const to = now + (config.horizonDays + 1) * DAY;
  const timeMin = new Date(now).toISOString();
  const timeMax = new Date(to).toISOString();

  const [googleBusy, feedBusy, booked] = await Promise.all([
    cal.busyTimes(timeMin, timeMax, listEnv('MEET_GOOGLE_CALENDAR_IDS', 'primary')),
    Promise.all(feeds.map(async ({ url }) =>
      busyFromIcs(await fetchIcs(url, { fresh }), { from: now, to, timezone: config.timezone }))),
    // From the start of today so calls earlier today still count toward the cap.
    cal.listEvents(new Date(dayStart).toISOString(), timeMax, BOOKED_TAG),
  ]);

  // A call the guest declined no longer counts toward the cap.
  const live = booked.filter((event) => !(event.attendees || []).some(
    (a) => a.email?.toLowerCase() === guestOf(event) && a.responseStatus === 'declined'));
  const bookedPerDay = {};
  for (const event of live) {
    if (!event.start?.dateTime) continue;
    const day = DateTime.fromISO(event.start.dateTime, { zone: config.timezone }).toISODate();
    bookedPerDay[day] = (bookedPerDay[day] || 0) + 1;
  }

  const busy = [...googleBusy, ...feedBusy.flat()];
  return { slots: freeSlots({ now, busy, bookedPerDay, config }), booked: live };
}

// Best-effort per warm instance (same approach as owner-auth-util): five
// booking attempts per IP per hour.
const attempts = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < 60 * 60_000);
  recent.push(now);
  attempts.set(ip, recent);
  if (attempts.size > 500) attempts.clear();
  return recent.length > 5;
}

// Two people submitting the same slot at once can both pass the availability
// check, so a short-lived Firestore claim lets only one through. Once the event
// exists it shows up as busy, so the claim can lapse on its own.
async function claimSlot(start) {
  const unclaimed = { ok: true, release: async () => {} };
  const { db } = settings;
  if (!db) return unclaimed;
  const ref = db.collection('meet_slot_claims').doc(start);
  try {
    const ok = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists && Date.now() - snap.get('claimedAt') < CLAIM_MS) return false;
      tx.set(ref, { claimedAt: Date.now() });
      return true;
    });
    return { ok, release: () => ref.delete().catch(() => {}) };
  } catch (err) {
    console.error('[meet] slot claim failed, booking without it:', err.message);
    return unclaimed;
  }
}

function text(value, max, { multiline = false } = {}) {
  if (typeof value !== 'string') return '';
  const flattened = multiline ? value.replace(/\r\n?/g, '\n') : value.replace(/\s+/g, ' ');
  return flattened.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
}

function readBooking(body) {
  const booking = {
    name: text(body.name, 100),
    email: text(body.email, 200).toLowerCase(),
    company: text(body.company, 100),
    location: text(body.location, 300),
    notes: text(body.notes, 1000, { multiline: true }),
  };
  const start = Date.parse(body.start);
  if (!booking.name) return { error: 'Please add your name.' };
  if (!EMAIL.test(booking.email)) return { error: 'Please add a valid email address.' };
  if (!Number.isFinite(start)) return { error: 'Please pick a time.' };
  return { booking: { ...booking, start: new Date(start).toISOString() } };
}

function calendarEvent(booking, end) {
  const guest = booking.company ? `${booking.name} (${booking.company})` : booking.name;
  const notify = process.env.MEET_NOTIFY_EMAIL;
  return {
    summary: `${config.ownerName} <> ${guest}`,
    description: [booking.notes && `Notes from ${booking.name}:\n${booking.notes}`, 'Booked through azoni.ai/meet.']
      .filter(Boolean).join('\n\n'),
    start: { dateTime: booking.start },
    end: { dateTime: end },
    attendees: [{ email: booking.email, displayName: booking.name }, ...(notify ? [{ email: notify }] : [])],
    // The guest's own meeting link or phone number wins; otherwise attach a Google Meet.
    ...(booking.location
      ? { location: booking.location }
      : { conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } } }),
    extendedProperties: { private: { azoniMeet: '1', azoniMeetGuest: booking.email } },
  };
}

// Read per request so changes made in the admin tab apply immediately.
async function connections() {
  const saved = await settings.load();
  if (!google.clientConfigured() || !saved.google?.refreshToken) return null;
  return { cal: google.calendar(saved.google.refreshToken), feeds: saved.feeds || [] };
}

exports.handler = async (event) => {
  let connected;
  try {
    connected = await connections();
  } catch (err) {
    console.error('[meet] settings unavailable:', err.message);
    return reply(502, { error: 'Could not load open times right now.' });
  }
  if (!connected) return reply(503, { error: 'Booking is not set up yet.' });
  const { cal, feeds } = connected;

  if (event.httpMethod === 'GET') {
    try {
      const { slots } = await availability(Date.now(), cal, feeds);
      return reply(200, { timezone: config.timezone, durationMinutes: config.durationMinutes, slots });
    } catch (err) {
      console.error('[meet] availability failed:', err.message);
      return reply(502, { error: 'Could not load open times right now.' });
    }
  }
  if (event.httpMethod !== 'POST') return reply(405, { error: 'GET or POST only' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return reply(400, { error: 'Invalid JSON' });
  }
  // Pretend it worked so bots that fill every field don't learn anything.
  if (body.website) return reply(200, { ok: true });
  if (rateLimited(clientIp(event))) return reply(429, { error: 'Too many booking attempts. Please try again later.' });
  const { booking, error } = readBooking(body);
  if (error) return reply(400, { error });

  let claim;
  try {
    const now = Date.now();
    const { slots, booked } = await availability(now, cal, feeds, { fresh: true });
    if (booked.some((e) => guestOf(e) === booking.email && Date.parse(e.start?.dateTime) > now)) {
      return reply(409, { error: 'You already have a call booked. Use your calendar invite to reschedule.' });
    }
    if (!slots.includes(booking.start)) {
      return reply(409, { error: 'That time was just taken. Please pick another.', code: 'slot_taken' });
    }
    claim = await claimSlot(booking.start);
    if (!claim.ok) return reply(409, { error: 'That time was just taken. Please pick another.', code: 'slot_taken' });

    const end = new Date(Date.parse(booking.start) + config.durationMinutes * 60_000).toISOString();
    const created = await cal.insertEvent(calendarEvent(booking, end));
    return reply(200, {
      ok: true,
      start: booking.start,
      end,
      location: booking.location || null,
      meetLink: created.hangoutLink || null,
    });
  } catch (err) {
    if (claim?.ok) await claim.release();
    console.error('[meet] booking failed:', err.message);
    return reply(502, { error: 'Could not book that time. Please try again, or email charlton@azoni.ai.' });
  }
};
