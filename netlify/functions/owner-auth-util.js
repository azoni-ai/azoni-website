// Shared owner-auth helpers for the gated admin functions (board-admin,
// hub-admin). One server-only password (BOARD_ADMIN_PASSWORD) covers every
// owner surface, so one sign-in unlocks both /board and /hub.
//
// Helper module only — not a function endpoint (same pattern as chat-core.js
// and embed-util.js living in this directory).

const crypto = require('crypto');

// Constant-time password check.
function tokenOk(token) {
  const secret = process.env.BOARD_ADMIN_PASSWORD;
  if (!secret || typeof token !== 'string' || !token) return false;
  const a = crypto.createHash('sha256').update(token).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

// Best-effort brute-force throttle (per warm lambda instance): after 10
// failures from an IP within 10 minutes, reject before comparing.
const failedAuth = new Map();

function throttled(ip) {
  const rec = failedAuth.get(ip);
  return !!rec && rec.count >= 10 && Date.now() - rec.first < 10 * 60 * 1000;
}

function recordFailure(ip) {
  const now = Date.now();
  const rec = failedAuth.get(ip);
  if (!rec || now - rec.first > 10 * 60 * 1000) {
    failedAuth.set(ip, { count: 1, first: now });
  } else {
    rec.count += 1;
  }
  if (failedAuth.size > 500) failedAuth.clear(); // cap memory on hot instances
}

function clientIp(event) {
  return (
    event.headers['x-nf-client-connection-ip'] ||
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

module.exports = { tokenOk, throttled, recordFailure, clientIp };
