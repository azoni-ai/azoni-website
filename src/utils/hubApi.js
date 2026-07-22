// Client helper for the gated hub-admin Netlify function (mirror of
// boardApi.js). The token is the same owner password used by the board —
// held only in sessionStorage at runtime, verified server-side.

const ENDPOINT = '/.netlify/functions/hub-admin';

export async function hubWrite(token, action, payload = {}) {
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
