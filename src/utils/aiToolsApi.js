// Client for the token-gated ai-tools-admin function. The aiTools collection
// has no client read rule; this endpoint (Admin SDK behind it) is the only
// data plane for the admin tab. Public pages read the separate ai-tools GET
// function instead.

const ENDPOINT = '/.netlify/functions/ai-tools-admin';

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
    const err = new Error(body.error || `ai-tools-admin failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
};

export const listTools = () => call({ action: 'list' });

export const getTool = (slug) => call({ action: 'get', slug });

export const createTool = ({ name, url, category, notes }) =>
  call({ action: 'create', name, url, category, notes });

export const researchTool = (slug, mode) => call({ action: 'research', slug, mode });

export const updateTool = (slug, fields) => call({ action: 'update', slug, fields });

export const publishTool = (slug) => call({ action: 'publish', slug });

export const unpublishTool = (slug) => call({ action: 'unpublish', slug });

export const deleteTool = (slug) => call({ action: 'delete', slug });

export const shareTool = (slug, venue, url) => call({ action: 'share', slug, venue, url });

export const refreshToolsCache = () => call({ action: 'refresh-cache' });

// Creates the starter entries from src/data/aiToolsSeed.js as drafts. Tools
// that already exist are skipped, never overwritten.
export const importSeed = () => call({ action: 'import-seed' });
