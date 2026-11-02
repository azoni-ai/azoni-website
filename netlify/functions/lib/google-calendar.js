// Minimal Google Calendar client for /meet. The owner signs in once from the
// admin Calendar tab (meet-admin); the refresh token that produces is traded
// for short-lived access tokens here.

const API = 'https://www.googleapis.com/calendar/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
// openid + email only so the admin tab can say which account is connected.
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

function clientConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function authUrl({ redirectUri, state }) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    // offline + consent is what makes Google hand back a refresh token every time.
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return url.toString();
}

async function tokenRequest(params) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      ...params,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google token request failed: ${data.error || res.status}`);
  return data;
}

// The id_token comes straight from Google's token endpoint over TLS, so its
// payload can be read without verifying the signature.
async function exchangeCode({ code, redirectUri }) {
  const data = await tokenRequest({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' });
  const claims = data.id_token
    ? JSON.parse(Buffer.from(data.id_token.split('.')[1], 'base64url').toString('utf8'))
    : {};
  return { refreshToken: data.refresh_token || null, email: claims.email || null };
}

async function revoke(token) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' })
    .catch(() => {});
}

const accessTokens = new Map(); // refresh token -> { token, expiresAt }

async function accessToken(refreshToken) {
  const cached = accessTokens.get(refreshToken);
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const data = await tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' });
  accessTokens.set(refreshToken, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}

function calendar(refreshToken) {
  async function call(path, { method = 'GET', query = {}, body } = {}) {
    const url = new URL(API + path);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${await accessToken(refreshToken)}`, ...(body && { 'Content-Type': 'application/json' }) },
      body: body && JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Google Calendar ${method} ${path} failed: ${data.error?.message || res.status}`);
    return data;
  }

  return {
    // Throws if Google no longer accepts the saved sign-in.
    check: () => accessToken(refreshToken),

    // Returns [{ start, end }] in epoch ms across every listed calendar.
    async busyTimes(timeMin, timeMax, calendarIds) {
      const data = await call('/freeBusy', {
        method: 'POST',
        body: { timeMin, timeMax, items: calendarIds.map((id) => ({ id })) },
      });
      const busy = [];
      for (const [id, cal] of Object.entries(data.calendars || {})) {
        // A calendar Google can't read comes back with errors and no busy times.
        // Treating that as "free" would offer slots that aren't, so fail instead.
        if (cal.errors?.length) throw new Error(`Google free/busy failed for ${id}: ${cal.errors[0].reason}`);
        for (const b of cal.busy || []) busy.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
      }
      return busy;
    },

    async listEvents(timeMin, timeMax, privateExtendedProperty) {
      const data = await call('/calendars/primary/events', {
        query: { timeMin, timeMax, privateExtendedProperty, singleEvents: 'true', maxResults: '250' },
      });
      return data.items || [];
    },

    // sendUpdates=all is what emails the invite to the guest.
    insertEvent: (event) => call('/calendars/primary/events', {
      method: 'POST',
      query: { sendUpdates: 'all', conferenceDataVersion: '1' },
      body: event,
    }),
  };
}

module.exports = { clientConfigured, authUrl, exchangeCode, revoke, calendar };
