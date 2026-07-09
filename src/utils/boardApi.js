// Client helper for the gated board-admin Netlify function.
// The token is the owner's board password, held only in sessionStorage at
// runtime (never baked into the bundle), and verified server-side against
// BOARD_ADMIN_PASSWORD.

const ENDPOINT = '/.netlify/functions/board-admin';

export async function boardWrite(token, action, payload = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token, ...payload }),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore parse error */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.json().catch(() => ({}));
}
