/**
 * Owner setup for /meet, used by the admin Calendar tab.
 *
 * POST /.netlify/functions/meet-admin
 * Auth: Authorization: Bearer <RAG_ADMIN_KEY> (the admin panel's session token).
 * Body: { action, ...payload }
 *   status           -> what is connected, plus the redirect URI Google needs
 *   connectGoogle    -> { url } to send the browser to Google's sign-in
 *   disconnectGoogle
 *   addFeed { url }  -> fetches and parses the feed before saving it
 *   removeFeed { url }
 *
 * GET /.netlify/functions/meet-admin?code&state
 *   Google's redirect after sign-in. It can't carry the admin token, so it
 *   only accepts the one-time state that connectGoogle stored moments before.
 */

const crypto = require('crypto');
const config = require('./lib/meet-config');
const google = require('./lib/google-calendar');
const settings = require('./lib/meet-settings');
const { busyFromIcs, fetchFeed } = require('./lib/meet-ics');
const { DAY } = require('./lib/meet-slots');

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (statusCode, data) => ({ statusCode, headers, body: JSON.stringify(data) });

const STATE_MS = 10 * 60_000;
const MAX_FEEDS = 10;

const siteUrl = () => process.env.URL || 'https://azoni.ai';
// Must match an "Authorized redirect URI" on the Google OAuth client exactly.
const redirectUri = () => `${siteUrl()}/.netlify/functions/meet-admin`;

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function ownerOk(event) {
  const secret = process.env.RAG_ADMIN_KEY;
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return !!secret && !!token && safeEqual(token, secret);
}

async function finishGoogleSignIn(query) {
  const back = (result) => ({
    statusCode: 302,
    headers: { Location: `${siteUrl()}/admin?tab=calendar&google=${result}`, 'Cache-Control': 'no-store' },
    body: '',
  });
  const { code, state, error } = query;
  const pending = (await settings.load()).pendingState;
  if (!state || !pending || Date.now() - pending.createdAt > STATE_MS || !safeEqual(state, pending.value)) {
    return back('expired');
  }
  await settings.update({ pendingState: null });
  if (error || !code) return back('cancelled');

  try {
    const { refreshToken, email } = await google.exchangeCode({ code, redirectUri: redirectUri() });
    if (!refreshToken) return back('no-refresh-token');
    await settings.update({ google: { refreshToken, email, connectedAt: Date.now() } });
    return back('connected');
  } catch (err) {
    console.error('[meet-admin] Google sign-in failed:', err.message);
    return back('failed');
  }
}

async function status() {
  const saved = await settings.load();
  let connected = null;
  if (saved.google?.refreshToken) {
    connected = { email: saved.google.email, connectedAt: saved.google.connectedAt, working: true };
    try {
      await google.calendar(saved.google.refreshToken).check();
    } catch (err) {
      console.error('[meet-admin] saved Google sign-in rejected:', err.message);
      connected.working = false;
    }
  }
  // A broken feed takes the booking page down (it fails closed), so say which one.
  const feeds = await Promise.all((saved.feeds || []).map(async ({ url, addedAt }) => {
    try {
      const now = Date.now();
      busyFromIcs(await fetchFeed(url), { from: now, to: now + DAY, timezone: config.timezone });
      return { url, addedAt, working: true };
    } catch (err) {
      return { url, addedAt, working: false, problem: err.message };
    }
  }));
  return { clientConfigured: google.clientConfigured(), redirectUri: redirectUri(), google: connected, feeds };
}

async function addFeed(rawUrl) {
  const url = String(rawUrl || '').trim().replace(/^webcal:/i, 'https:');
  if (!/^https:\/\/\S+$/i.test(url) || url.length > 2000) {
    return reply(400, { error: 'Paste the full calendar link (it starts with https:// or webcal://).' });
  }
  const feeds = (await settings.load()).feeds || [];
  if (feeds.some((f) => f.url === url)) return reply(409, { error: 'That calendar is already added.' });
  if (feeds.length >= MAX_FEEDS) return reply(400, { error: `You can add up to ${MAX_FEEDS} calendars.` });

  let busyCount;
  try {
    const now = Date.now();
    busyCount = busyFromIcs(await fetchFeed(url), { from: now, to: now + config.horizonDays * DAY, timezone: config.timezone }).length;
  } catch (err) {
    return reply(400, { error: `Couldn't read a calendar at that link (${err.message}).` });
  }
  await settings.update({ feeds: [...feeds, { url, addedAt: Date.now() }] });
  return reply(200, { ok: true, busyCount });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') return await finishGoogleSignIn(event.queryStringParameters || {});
    if (event.httpMethod !== 'POST') return reply(405, { error: 'GET or POST only' });
    if (!ownerOk(event)) return reply(401, { error: 'Unauthorized' });
    if (!settings.db) return reply(503, { error: 'Firestore unavailable' });

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return reply(400, { error: 'Invalid JSON' });
    }

    switch (payload.action) {
      case 'status':
        return reply(200, await status());
      case 'connectGoogle': {
        if (!google.clientConfigured()) {
          return reply(503, { error: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Netlify first.' });
        }
        const state = crypto.randomBytes(24).toString('base64url');
        await settings.update({ pendingState: { value: state, createdAt: Date.now() } });
        return reply(200, { url: google.authUrl({ redirectUri: redirectUri(), state }) });
      }
      case 'disconnectGoogle': {
        const saved = await settings.load();
        if (saved.google?.refreshToken) await google.revoke(saved.google.refreshToken);
        await settings.update({ google: null });
        return reply(200, { ok: true });
      }
      case 'addFeed':
        return await addFeed(payload.url);
      case 'removeFeed': {
        const feeds = (await settings.load()).feeds || [];
        await settings.update({ feeds: feeds.filter((f) => f.url !== payload.url) });
        return reply(200, { ok: true });
      }
      default:
        return reply(400, { error: 'Unknown action' });
    }
  } catch (err) {
    console.error('[meet-admin] failed:', err.message);
    return reply(500, { error: 'Something went wrong. Try again.' });
  }
};
