// Link previews for the AI Tools series. Runs on Netlify's edge (Deno) and
// rewrites the static meta tags from index.html for /ai-tools and /ai-tools/<slug>.
// TITLE and DESCRIPTION mirror src/data/aiToolsMeta.js (edge code cannot import src).
// Any failure returns the upstream response untouched.

export const config = { path: ['/ai-tools', '/ai-tools/*'] };

const TITLE = 'AI Tools · Azoni';
const DESCRIPTION = 'Notes on AI tools: what each one does, pros, cons, what people are saying, and my take.';
const SITE = 'https://azoni.ai';
const IMAGE = `${SITE}/images/ai-tools-og.png`;
const IMAGE_ALT = 'AI Tools notes on azoni.ai';
const SLUG_RE = /^[a-z0-9-]{2,60}$/;
const FETCH_TIMEOUT_MS = 3000;

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Replace an existing tag, or inject it before </head> when missing.
// Function replacers keep "$" sequences in tool names literal.
function upsert(html, findRe, tag) {
  if (findRe.test(html)) return html.replace(findRe, () => tag);
  return html.replace(/<\/head>/i, () => `${tag}\n  </head>`);
}

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\s[^>]*?${attr}=["']${key}["'][^>]*>`, 'i');
  return upsert(html, re, `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`);
}

function setTitle(html, value) {
  return upsert(html, /<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(value)}</title>`);
}

async function fetchTool(origin, slug) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/.netlify/functions/ai-tools?slug=${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    });
    if (res.status !== 200) return null;
    const data = await res.json();
    return data && data.tool && data.tool.name ? data.tool : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function metaFor(pathname, origin) {
  if (pathname === '/ai-tools') {
    return { title: TITLE, description: DESCRIPTION, type: 'website' };
  }
  if (!pathname.startsWith('/ai-tools/')) return null;
  const slug = pathname.slice('/ai-tools/'.length);
  if (!SLUG_RE.test(slug)) return null;
  const tool = await fetchTool(origin, slug);
  if (!tool) return null;
  return {
    title: `${tool.name} · ${TITLE}`,
    description: tool.tagline || tool.verdict || DESCRIPTION,
    type: 'article',
  };
}

const handler = async (request, context) => {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/feed.xml')) return context.next();

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const untouched = response.clone();
  try {
    const pathname = url.pathname.replace(/\/+$/, '');
    const [html, meta] = await Promise.all([response.text(), metaFor(pathname, url.origin)]);
    if (!meta) return untouched;

    let out = html;
    out = setTitle(out, meta.title);
    out = setMeta(out, 'property', 'og:title', meta.title);
    out = setMeta(out, 'property', 'og:description', meta.description);
    out = setMeta(out, 'property', 'og:url', `${SITE}${pathname}`);
    out = setMeta(out, 'property', 'og:type', meta.type);
    out = setMeta(out, 'property', 'og:image', IMAGE);
    out = setMeta(out, 'property', 'og:image:alt', IMAGE_ALT);
    out = setMeta(out, 'name', 'twitter:title', meta.title);
    out = setMeta(out, 'name', 'twitter:description', meta.description);
    out = setMeta(out, 'name', 'twitter:image', IMAGE);

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    // Keep the upstream cache header (max-age=0 for the SPA shell): a browser
    // that caches this HTML would keep pointing at old chunk hashes after a deploy.
    return new Response(out, { status: response.status, headers });
  } catch {
    return untouched;
  }
};

export default handler;
