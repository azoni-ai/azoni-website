// Sends X-Robots-Tag: noindex for pages that are noindex in the app, so
// crawlers that skip JavaScript get the same answer as Seo.jsx gives.
// Keep the project list in step with visibility: 'unlisted' in src/data/projects.js.
// /blog/* covers the build notes only; the /blog list stays indexable.

export const config = {
  path: [
    '/meet',
    '/game',
    // Until the Moltbook agent is kept, paused or retired.
    '/moltbook',
    '/ai-tools',
    '/ai-tools/*',
    '/blog/*',
    '/projects/dayrun',
    '/projects/crypto-tax-2025',
    '/projects/polymarket-tool',
    '/projects/blackdiamond',
    '/projects/image-pipeline-api',
    '/projects/scryfall-ai',
  ],
};

const handler = async (request, context) => {
  const response = await context.next();
  try {
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response;
  }
};

export default handler;
