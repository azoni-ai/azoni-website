// Link previews for the main pages. Runs on Netlify's edge (Deno) and rewrites
// the static title and og/twitter tags from index.html, so a shared /meet link
// says whose call it is instead of showing the home page card.
// Titles follow src/components/Seo.jsx (edge code cannot import src).
// Any failure returns the upstream response untouched.

const PAGES = {
  '/': {
    title: 'Charlton Smith · Principal software engineer',
    description: 'I build and run AI products and the infrastructure behind them. Principal software engineer in the Seattle area.',
  },
  '/meet': {
    title: 'Book a call with Charlton Smith',
    description: 'A 30-minute call with Charlton Smith, principal software engineer.',
  },
  '/about': {
    title: 'About · Charlton Smith',
    description: 'From college hackathons and co-founding OLI Fitness to T-Mobile, Capital One and the AI products I build and run now.',
  },
  '/resume': {
    title: 'Résumé · Charlton Smith',
    description: 'Experience, skills and education for Charlton Smith, principal software engineer in the Seattle area.',
  },
  '/services': {
    title: 'Consulting · Charlton Smith',
    description: 'Software and AI consulting through Azoni LLC: AI and workflow automation, software for your business, and hands-on engineering help.',
  },
  '/contact': {
    title: 'Contact · Charlton Smith',
    description: 'Email Charlton Smith at charlton@azoni.ai. A few lines is enough.',
  },
  '/projects': {
    title: 'Work · Charlton Smith',
    description: 'Products Charlton Smith builds and runs: FaB Stats, the agent platform behind azoni.ai, Old Ways Today and Row Crew, plus other projects and earlier work.',
  },
};

// Keep in step with PAGES.
export const config = { path: ['/', '/meet', '/about', '/resume', '/services', '/contact', '/projects'] };

const SITE = 'https://azoni.ai';

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Replace an existing tag, or inject it before </head> when missing.
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

function rewrite(html, pathname) {
  const page = PAGES[pathname];
  if (!page) return null;
  let out = html;
  out = setTitle(out, page.title);
  out = setMeta(out, 'property', 'og:title', page.title);
  out = setMeta(out, 'property', 'og:description', page.description);
  out = setMeta(out, 'property', 'og:url', pathname === '/' ? SITE : `${SITE}${pathname}`);
  out = setMeta(out, 'name', 'twitter:title', page.title);
  out = setMeta(out, 'name', 'twitter:description', page.description);
  return out;
}

const handler = async (request, context) => {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const untouched = response.clone();
  try {
    const pathname = new URL(request.url).pathname.replace(/(.)\/+$/, '$1');
    const out = rewrite(await response.text(), pathname);
    if (!out) return untouched;

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
