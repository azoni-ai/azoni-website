const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../netlify/functions/lib/meet-config');
const { freeSlots } = require('../netlify/functions/lib/meet-slots');
const { busyFromIcs } = require('../netlify/functions/lib/meet-ics');

const ms = (iso) => Date.parse(iso);
const rules = { ...config, timezone: 'America/Los_Angeles' };
const onDay = (slots, prefix) => slots.filter((s) => s.startsWith(prefix));

// Outlook's published-calendar shape: Windows zone names defined in VTIMEZONE,
// busy status in X-MICROSOFT-CDO-BUSYSTATUS.
const OUTLOOK_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:Microsoft Exchange Server 2010
BEGIN:VTIMEZONE
TZID:Pacific Standard Time
BEGIN:STANDARD
DTSTART:16010101T020000
TZOFFSETFROM:-0700
TZOFFSETTO:-0800
RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=1SU;BYMONTH=11
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:16010101T020000
TZOFFSETFROM:-0800
TZOFFSETTO:-0700
RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=2SU;BYMONTH=3
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:standup
SUMMARY:Busy
DTSTART;TZID=Pacific Standard Time:20260901T100000
DTEND;TZID=Pacific Standard Time:20260901T103000
RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=TU
EXDATE;TZID=Pacific Standard Time:20261110T100000
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
END:VEVENT
BEGIN:VEVENT
UID:standup
SUMMARY:Busy
RECURRENCE-ID;TZID=Pacific Standard Time:20261117T100000
DTSTART;TZID=Pacific Standard Time:20261117T140000
DTEND;TZID=Pacific Standard Time:20261117T143000
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
END:VEVENT
BEGIN:VEVENT
UID:focus
SUMMARY:Free
DTSTART;TZID=Pacific Standard Time:20261104T090000
DTEND;TZID=Pacific Standard Time:20261104T120000
TRANSP:TRANSPARENT
X-MICROSOFT-CDO-BUSYSTATUS:FREE
END:VEVENT
BEGIN:VEVENT
UID:cancelled
DTSTART;TZID=Pacific Standard Time:20261105T130000
DTEND;TZID=Pacific Standard Time:20261105T140000
STATUS:CANCELLED
END:VEVENT
BEGIN:VEVENT
UID:pto
SUMMARY:Away
DTSTART;VALUE=DATE:20261106
DTEND;VALUE=DATE:20261107
X-MICROSOFT-CDO-BUSYSTATUS:OOF
END:VEVENT
BEGIN:VEVENT
UID:east-coast
DTSTART;TZID=America/New_York:20261109T130000
DTEND;TZID=America/New_York:20261109T140000
END:VEVENT
BEGIN:VEVENT
UID:utc
DTSTART:20261112T200000Z
DTEND:20261112T210000Z
END:VEVENT
END:VCALENDAR`;

test('slots follow Pacific wall-clock hours across the end of daylight time', () => {
  const slots = freeSlots({ now: ms('2026-10-29T19:00:00Z'), busy: [], config: rules });
  // 9:00 PDT on Friday, then 9:00 PST on Monday after the Nov 1 change.
  assert.equal(onDay(slots, '2026-10-30')[0], '2026-10-30T16:00:00.000Z');
  assert.equal(onDay(slots, '2026-11-02')[0], '2026-11-02T17:00:00.000Z');
  // Last slot is 16:30 PST, which is after midnight UTC.
  assert.ok(slots.includes('2026-11-03T00:30:00.000Z'));
  assert.equal(onDay(slots, '2026-10-31').length + onDay(slots, '2026-11-01').length, 0, 'no weekend slots');
});

test('slots follow Pacific wall-clock hours across the start of daylight time', () => {
  const slots = freeSlots({ now: ms('2026-03-05T20:00:00Z'), busy: [], config: rules });
  assert.equal(onDay(slots, '2026-03-06')[0], '2026-03-06T17:00:00.000Z');
  assert.equal(onDay(slots, '2026-03-09')[0], '2026-03-09T16:00:00.000Z');
});

test('minimum notice, horizon, buffer, and the daily cap all remove slots', () => {
  const now = ms('2026-11-02T16:00:00Z'); // Monday 08:00 PST
  const busy = [{ start: ms('2026-11-03T18:00:00Z'), end: ms('2026-11-03T18:30:00Z') }]; // Tue 10:00-10:30
  const slots = freeSlots({ now, busy, bookedPerDay: { '2026-11-04': 3 }, config: rules });
  assert.equal(onDay(slots, '2026-11-02').length, 0, '12h notice rules out the rest of today');
  assert.deepEqual(onDay(slots, '2026-11-03T1').slice(0, 3),
    ['2026-11-03T17:00:00.000Z', '2026-11-03T19:00:00.000Z', '2026-11-03T19:30:00.000Z'],
    '9:30, 10:00 and 10:30 are inside the 15-minute buffer');
  assert.equal(onDay(slots, '2026-11-04T1').length, 0, 'a capped day offers nothing');
  assert.ok(slots.every((s) => ms(s) < now + 14 * 86_400_000));
});

test('Outlook feed: series, exceptions, busy status, all-day, and undeclared zones', () => {
  const busy = busyFromIcs(OUTLOOK_ICS, {
    from: ms('2026-11-02T00:00:00Z'), to: ms('2026-11-20T00:00:00Z'), timezone: 'America/Los_Angeles',
  }).map((b) => [new Date(b.start).toISOString(), new Date(b.end).toISOString()])
    .sort(([a], [b]) => a.localeCompare(b));

  assert.deepEqual(busy, [
    ['2026-11-03T18:00:00.000Z', '2026-11-03T18:30:00.000Z'], // weekly series, now on PST
    ['2026-11-06T08:00:00.000Z', '2026-11-07T08:00:00.000Z'], // all-day OOF, Pacific midnight to midnight
    ['2026-11-09T18:00:00.000Z', '2026-11-09T19:00:00.000Z'], // New York zone with no VTIMEZONE
    ['2026-11-12T20:00:00.000Z', '2026-11-12T21:00:00.000Z'], // UTC
    ['2026-11-17T22:00:00.000Z', '2026-11-17T22:30:00.000Z'], // occurrence moved to 14:00
  ]);
  // Nov 10 is excluded, the Nov 4 "free" block and the cancelled Nov 5 meeting never block.
});

// --- endpoint, with Google and the feed stubbed ---------------------------

const ICS_URL = 'https://outlook.office365.com/owa/calendar/abc/def/calendar.ics';

function stubNetwork({ googleBusy = [], booked = [], icsStatus = 200 } = {}) {
  const inserted = [];
  global.fetch = async (input, init = {}) => {
    const url = String(input);
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status });
    if (url.startsWith('https://oauth2.googleapis.com/token')) return json({ access_token: 'token', expires_in: 3600 });
    if (url.endsWith('/freeBusy')) return json({ calendars: { primary: { busy: googleBusy } } });
    if (url.includes('/calendars/primary/events') && (init.method || 'GET') === 'GET') return json({ items: booked });
    if (url.includes('/calendars/primary/events')) {
      const body = JSON.parse(init.body);
      inserted.push({ url, body });
      return json({ id: 'evt', hangoutLink: body.conferenceData ? 'https://meet.google.com/abc-defg-hij' : undefined });
    }
    if (url === ICS_URL) return new Response(OUTLOOK_ICS, { status: icsStatus });
    throw new Error(`unexpected fetch ${url}`);
  };
  return inserted;
}

// Loads a function fresh with the Firestore-backed settings doc swapped for `store`.
function loadFunction(name, store, { db = null } = {}) {
  Object.assign(process.env, { GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret', RAG_ADMIN_KEY: 'owner-key', URL: 'https://azoni.ai' });
  for (const key of Object.keys(require.cache)) if (key.includes('netlify')) delete require.cache[key];
  const settings = require('../netlify/functions/lib/meet-settings');
  Object.assign(settings, {
    db,
    load: async () => structuredClone(store),
    update: async (fields) => { Object.assign(store, fields); },
  });
  return require(`../netlify/functions/${name}`).handler;
}

const loadHandler = () => loadFunction('meet', {
  google: { refreshToken: 'refresh', email: 'me@gmail.com', connectedAt: 0 }, feeds: [{ url: ICS_URL, addedAt: 0 }],
});

const post = (body, ip = '203.0.113.1') => ({
  httpMethod: 'POST', headers: { 'x-nf-client-connection-ip': ip }, body: JSON.stringify(body),
});

test('endpoint', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: ms('2026-11-02T16:00:00Z') });
  const realFetch = global.fetch;
  t.after(() => { global.fetch = realFetch; });
  // Tuesday 13:00-14:00 PST on the personal calendar; the feed adds 10:00-10:30.
  const googleBusy = [{ start: '2026-11-03T21:00:00Z', end: '2026-11-03T22:00:00Z' }];

  await t.test('GET merges Google and Outlook busy time', async () => {
    stubNetwork({ googleBusy });
    const res = await loadHandler()({ httpMethod: 'GET', headers: {} });
    const { slots, timezone, durationMinutes } = JSON.parse(res.body);
    assert.equal(res.statusCode, 200);
    assert.equal(timezone, 'America/Los_Angeles');
    assert.equal(durationMinutes, 30);
    assert.ok(!slots.includes('2026-11-03T18:00:00.000Z'), 'Outlook standup blocks 10:00');
    assert.ok(!slots.includes('2026-11-03T21:00:00.000Z'), 'Google event blocks 13:00');
    assert.ok(slots.includes('2026-11-03T17:00:00.000Z'));
    assert.equal(onDay(slots, '2026-11-06T1').length, 0, 'Outlook PTO blocks Friday');
  });

  await t.test('POST books a free slot with a Meet link and emails the guest', async () => {
    const inserted = stubNetwork({ googleBusy });
    const res = await loadHandler()(post({ start: '2026-11-03T17:00:00.000Z', name: 'Jane Doe', email: 'Jane@Example.com', company: 'Acme' }));
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).meetLink, 'https://meet.google.com/abc-defg-hij');
    const [{ url, body }] = inserted;
    assert.match(url, /sendUpdates=all/);
    assert.equal(body.summary, 'Charlton Smith <> Jane Doe (Acme)');
    assert.deepEqual(body.attendees, [{ email: 'jane@example.com', displayName: 'Jane Doe' }]);
    assert.equal(body.end.dateTime, '2026-11-03T17:30:00.000Z');
    assert.ok(body.conferenceData.createRequest.requestId);
  });

  await t.test('POST uses the guest\'s own link instead of creating a Meet', async () => {
    const inserted = stubNetwork();
    const res = await loadHandler()(post({ start: '2026-11-03T17:00:00.000Z', name: 'Sam', email: 'sam@corp.io', location: 'https://corp.zoom.us/j/123' }, '203.0.113.2'));
    assert.equal(res.statusCode, 200);
    assert.equal(inserted[0].body.location, 'https://corp.zoom.us/j/123');
    assert.equal(inserted[0].body.conferenceData, undefined);
  });

  await t.test('POST refuses busy, unoffered, and duplicate bookings', async () => {
    const booked = [{
      start: { dateTime: '2026-11-04T17:00:00Z' }, attendees: [{ email: 'jane@example.com', responseStatus: 'accepted' }],
      extendedProperties: { private: { azoniMeet: '1', azoniMeetGuest: 'jane@example.com' } },
    }];
    const inserted = stubNetwork({ googleBusy, booked });
    const handler = loadHandler();
    assert.equal((await handler(post({ start: '2026-11-03T18:00:00.000Z', name: 'A', email: 'a@x.co' }, '203.0.113.3'))).statusCode, 409);
    assert.equal((await handler(post({ start: '2026-11-03T17:10:00.000Z', name: 'A', email: 'a@x.co' }, '203.0.113.3'))).statusCode, 409);
    assert.equal((await handler(post({ start: '2026-11-03T17:00:00.000Z', name: 'Jane', email: 'jane@example.com' }, '203.0.113.3'))).statusCode, 409);
    assert.equal(inserted.length, 0);
  });

  await t.test('POST ignores the honeypot and rejects bad input', async () => {
    const inserted = stubNetwork();
    const handler = loadHandler();
    assert.equal((await handler(post({ start: '2026-11-03T17:00:00.000Z', name: 'Bot', email: 'b@x.co', website: 'spam' }, '203.0.113.4'))).statusCode, 200);
    assert.equal((await handler(post({ start: '2026-11-03T17:00:00.000Z', name: 'A', email: 'nope' }, '203.0.113.4'))).statusCode, 400);
    assert.equal(inserted.length, 0);
  });

  await t.test('an unreadable work calendar fails closed instead of showing everything open', async () => {
    stubNetwork({ icsStatus: 500 });
    assert.equal((await loadHandler()({ httpMethod: 'GET', headers: {} })).statusCode, 502);
  });

  await t.test('nothing is offered until Google is connected', async () => {
    stubNetwork();
    assert.equal((await loadFunction('meet', {})({ httpMethod: 'GET', headers: {} })).statusCode, 503);
  });
});

test('meet-admin', async (t) => {
  const realFetch = global.fetch;
  t.after(() => { global.fetch = realFetch; });
  const owner = (action, extra = {}, key = 'owner-key') => ({
    httpMethod: 'POST', headers: { authorization: `Bearer ${key}` }, body: JSON.stringify({ action, ...extra }),
  });
  const callback = (query) => ({ httpMethod: 'GET', headers: {}, queryStringParameters: query });

  await t.test('every action needs the owner token', async () => {
    const handler = loadFunction('meet-admin', {}, { db: {} });
    assert.equal((await handler(owner('status', {}, 'wrong'))).statusCode, 401);
    assert.equal((await handler({ httpMethod: 'POST', headers: {}, body: '{"action":"connectGoogle"}' })).statusCode, 401);
  });

  await t.test('Google sign-in stores the refresh token only for the state it issued, once', async () => {
    const store = {};
    const handler = loadFunction('meet-admin', store, { db: {} });
    const idToken = ['header', Buffer.from(JSON.stringify({ email: 'me@gmail.com' })).toString('base64url'), 'sig'].join('.');
    let exchanged;
    global.fetch = async (_url, init) => {
      exchanged = new URLSearchParams(init.body);
      return new Response(JSON.stringify({ refresh_token: 'rt', access_token: 'at', expires_in: 3600, id_token: idToken }));
    };

    const auth = new URL(JSON.parse((await handler(owner('connectGoogle'))).body).url);
    assert.equal(auth.searchParams.get('redirect_uri'), 'https://azoni.ai/.netlify/functions/meet-admin');
    assert.equal(auth.searchParams.get('access_type'), 'offline');
    const state = auth.searchParams.get('state');

    assert.match((await handler(callback({ code: 'c', state: 'guessed' }))).headers.Location, /google=expired$/);
    assert.equal(store.google, undefined, 'a forged state stores nothing');

    const res = await handler(callback({ code: 'the-code', state }));
    assert.equal(res.statusCode, 302);
    assert.equal(res.headers.Location, 'https://azoni.ai/admin?tab=calendar&google=connected');
    assert.equal(exchanged.get('code'), 'the-code');
    assert.equal(exchanged.get('redirect_uri'), 'https://azoni.ai/.netlify/functions/meet-admin');
    assert.equal(store.google.refreshToken, 'rt');
    assert.equal(store.google.email, 'me@gmail.com');
    assert.equal(store.pendingState, null);
    assert.match((await handler(callback({ code: 'the-code', state }))).headers.Location, /google=expired$/, 'no replay');
  });

  await t.test('a sign-in started more than 10 minutes ago is refused', async () => {
    const store = { pendingState: { value: 'old-state', createdAt: Date.now() - 11 * 60_000 } };
    const handler = loadFunction('meet-admin', store, { db: {} });
    assert.match((await handler(callback({ code: 'c', state: 'old-state' }))).headers.Location, /google=expired$/);
    assert.equal(store.google, undefined);
  });

  await t.test('addFeed only saves links that return a calendar', async () => {
    const store = { feeds: [] };
    const handler = loadFunction('meet-admin', store, { db: {} });
    global.fetch = async (url) => new Response(String(url) === ICS_URL ? OUTLOOK_ICS : '<html><a href="https://login">Sign in</a></html>');
    assert.equal((await handler(owner('addFeed', { url: 'not a link' }))).statusCode, 400);
    assert.equal((await handler(owner('addFeed', { url: 'https://outlook.office365.com/owa/signin' }))).statusCode, 400);
    const added = await handler(owner('addFeed', { url: ICS_URL.replace('https:', 'webcal:') }));
    assert.equal(added.statusCode, 200);
    assert.deepEqual(store.feeds.map((f) => f.url), [ICS_URL]);
    assert.equal((await handler(owner('addFeed', { url: ICS_URL }))).statusCode, 409);

    const { feeds } = JSON.parse((await handler(owner('status'))).body);
    assert.equal(feeds[0].working, true);
    await handler(owner('removeFeed', { url: ICS_URL }));
    assert.deepEqual(store.feeds, []);
  });

  await t.test('status flags a Google sign-in that stopped working; disconnect revokes it', async () => {
    const store = { google: { refreshToken: 'dead', email: 'me@gmail.com', connectedAt: 0 }, feeds: [] };
    const handler = loadFunction('meet-admin', store, { db: {} });
    const calls = [];
    global.fetch = async (url) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: String(url).includes('/revoke') ? 200 : 400 });
    };
    const { google } = JSON.parse((await handler(owner('status'))).body);
    assert.equal(google.working, false);
    await handler(owner('disconnectGoogle'));
    assert.ok(calls.some((u) => u.startsWith('https://oauth2.googleapis.com/revoke?token=dead')));
    assert.equal(store.google, null);
  });
});
