// Private billing data plane for the /admin Billing tab (time tracking + invoices).
// ALL reads and writes go through this function with the Admin SDK — the `billing`
// collection has no allow rule in firestore.rules, so browsers can never read it
// directly (unlike /board tasks, whose privacy is cosmetic). Auth reuses the admin
// panel bearer token (RAG_ADMIN_KEY) with a constant-time hash compare and the
// same per-IP failure throttle owner-auth-util uses.
//
// The whole dataset lives in one doc (billing/main) as { settings, entries,
// invoices, rev, updatedAt } — the same JSON shape the standalone desktop app
// exports, so backups round-trip. `rev` is optimistic concurrency: saves carry
// the rev they loaded, and a mismatch returns 409 so a second tab can't
// silently clobber the first.

const crypto = require('crypto');
const admin = require('firebase-admin');

if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest();

// Hash both sides before timingSafeEqual: constant-time and no length leak.
const tokenOk = (token) => {
  const secret = process.env.RAG_ADMIN_KEY;
  if (!secret || !token) return false;
  return crypto.timingSafeEqual(sha256(token), sha256(secret));
};

// Per-IP failed-auth throttle (per warm lambda instance).
const FAILURES = new Map();
const MAX_FAILURES = 10;
const WINDOW_MS = 10 * 60 * 1000;

const clientIp = (event) =>
  event.headers['x-nf-client-connection-ip'] ||
  (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  'unknown';

const throttled = (ip) => {
  const rec = FAILURES.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    FAILURES.delete(ip);
    return false;
  }
  return rec.count >= MAX_FAILURES;
};

const recordFailure = (ip) => {
  if (FAILURES.size > 500) FAILURES.clear();
  const rec = FAILURES.get(ip);
  if (rec && Date.now() - rec.first <= WINDOW_MS) rec.count += 1;
  else FAILURES.set(ip, { count: 1, first: Date.now() });
};

// Firestore docs cap at 1 MiB; refuse well before that so a save never
// half-succeeds. Years of entries fit comfortably under this.
const MAX_BYTES = 900000;

const validShape = (d) =>
  d && typeof d === 'object' && !Array.isArray(d) &&
  d.settings && typeof d.settings === 'object' && !Array.isArray(d.settings) &&
  Array.isArray(d.entries) && d.entries.length <= 20000 &&
  Array.isArray(d.invoices) && d.invoices.length <= 2000 &&
  // Newer fields; optional so pre-journal backups still import.
  (d.dayNotes === undefined ||
    (d.dayNotes && typeof d.dayNotes === 'object' && !Array.isArray(d.dayNotes) &&
     Object.keys(d.dayNotes).length <= 5000)) &&
  (d.companyNotes === undefined ||
    (typeof d.companyNotes === 'string' && d.companyNotes.length <= 200000));

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };
  }
  if (!process.env.RAG_ADMIN_KEY) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Admin key not configured' }) };
  }
  if (!admin.apps.length) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Firebase not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // The throttle only ever blocks FAILED auth attempts — a valid token is
  // always let through, so bad-token floods from a shared IP (CGNAT, office
  // NAT) can't lock the owner out.
  const ip = clientIp(event);
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!tokenOk(token)) {
    if (throttled(ip)) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many attempts. Try again later.' }) };
    }
    recordFailure(ip);
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const db = admin.firestore();
  const ref = db.collection('billing').doc('main');

  try {
    if (body.action === 'get') {
      const snap = await ref.get();
      if (!snap.exists) {
        return { statusCode: 200, headers, body: JSON.stringify({ exists: false, rev: 0, data: null }) };
      }
      const d = snap.data();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          exists: true,
          rev: d.rev || 0,
          updatedAt: d.updatedAt || null,
          data: {
            settings: d.settings || {},
            entries: d.entries || [],
            invoices: d.invoices || [],
            dayNotes: d.dayNotes || {},
            companyNotes: d.companyNotes || '',
          },
        }),
      };
    }

    if (body.action === 'save') {
      const { data, baseRev = 0, force = false } = body;
      if (!validShape(data)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad data shape' }) };
      }
      if (Buffer.byteLength(JSON.stringify(data), 'utf8') > MAX_BYTES) {
        return { statusCode: 413, headers, body: JSON.stringify({ error: 'Data too large' }) };
      }

      try {
        const rev = await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const currentRev = snap.exists ? snap.data().rev || 0 : 0;
          if (snap.exists && Number(baseRev) !== currentRev && !force) {
            const conflict = new Error('conflict');
            conflict.code = 'BILLING_CONFLICT';
            conflict.rev = currentRev;
            throw conflict;
          }
          const nextRev = currentRev + 1;
          tx.set(ref, {
            settings: data.settings,
            entries: data.entries,
            invoices: data.invoices,
            dayNotes: data.dayNotes || {},
            companyNotes: data.companyNotes || '',
            rev: nextRev,
            updatedAt: new Date().toISOString(),
          });
          return nextRev;
        });
        return { statusCode: 200, headers, body: JSON.stringify({ rev }) };
      } catch (err) {
        if (err.code === 'BILLING_CONFLICT') {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ error: 'Saved elsewhere since you loaded. Reload or overwrite.', rev: err.rev }),
          };
        }
        throw err;
      }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    console.error('[billing-admin]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
