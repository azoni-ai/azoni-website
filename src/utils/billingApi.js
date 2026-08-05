// Client for the token-gated billing-admin function. Billing data never touches
// client-side Firestore — the collection has no allow rule; this endpoint (with
// the Admin SDK behind it) is the only data plane.

const ENDPOINT = '/.netlify/functions/billing-admin';

const call = async (payload) => {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('rag_admin_token') || ''}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `billing-admin failed (${res.status})`);
    err.status = res.status;
    if (body.rev !== undefined) err.rev = body.rev;
    throw err;
  }
  return body;
};

export const getBilling = () => call({ action: 'get' });

export const saveBilling = (data, baseRev, force = false) =>
  call({ action: 'save', data, baseRev, force });
