// Formatting and form helpers for the AI Tools admin tab. Pure functions only.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parseDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const two = (n) => String(n).padStart(2, '0');

export const fmtDate = (iso) => {
  const d = parseDate(iso);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '';
};

export const fmtDateTime = (iso) => {
  const d = parseDate(iso);
  return d ? `${fmtDate(iso)} ${two(d.getHours())}:${two(d.getMinutes())}` : '';
};

// "4 min ago" within the last week, a plain date after that.
export const relativeTime = (iso, now = Date.now()) => {
  const d = parseDate(iso);
  if (!d) return '';
  const mins = Math.round((now - d.getTime()) / 60000);
  if (mins < 1) return 'under a minute ago';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return fmtDate(iso);
};

export const errorMessage = (e) => {
  if (e && e.status === 401) return 'Session rejected. Log out and back in.';
  return (e && e.message) || 'Request failed.';
};

export const isHttpUrl = (s) => /^https?:\/\//i.test(String(s || '').trim());

// Images (logo, hero, product tiles) may be an http(s) URL or a path on this
// site. The negative lookahead keeps protocol-relative values like //evil.test
// out: those are remote, not site-relative. Mirrors the server sanitizer.
export const isAssetUrl = (s) => {
  const v = String(s || '').trim();
  return isHttpUrl(v) || /^\/(?![/\\])[\w\-./]{1,280}$/.test(v);
};

// Stable keys for editable rows (products, voices, sources) so removing one
// does not shuffle input state between neighbours.
let rowSeq = 0;
export const rowId = () => `r${++rowSeq}`;

const str = (v) => (v == null ? '' : String(v));
const joinLines = (list) => (Array.isArray(list) ? list.map(str).join('\n') : '');

// Doc -> editable form. Arrays become one-per-line text or keyed rows.
export const toForm = (tool) => ({
  name: str(tool.name),
  maker: str(tool.maker),
  url: str(tool.url),
  site: str(tool.links && tool.links.site),
  docs: str(tool.links && tool.links.docs),
  pricingUrl: str(tool.links && tool.links.pricing),
  logo: str(tool.logo),
  heroImage: str(tool.heroImage),
  category: str(tool.category),
  tags: Array.isArray(tool.tags) ? tool.tags.map(str).join(', ') : '',
  tagline: str(tool.tagline),
  summary: str(tool.summary),
  pricing: str(tool.pricing),
  pros: joinLines(tool.pros),
  cons: joinLines(tool.cons),
  products: (Array.isArray(tool.products) ? tool.products : []).map((p) => ({
    id: rowId(),
    name: str(p && p.name),
    description: str(p && p.description),
    image: str(p && p.image),
    url: str(p && p.url),
  })),
  voices: (Array.isArray(tool.voices) ? tool.voices : []).map((v) => ({
    id: rowId(),
    summary: str(v && v.summary),
    source: str(v && v.source),
    url: str(v && v.url),
  })),
  sources: (Array.isArray(tool.sources) ? tool.sources : []).map((s) => ({
    id: rowId(),
    title: str(s && s.title),
    url: str(s && s.url),
  })),
  verdict: str(tool.verdict),
  myTake: str(tool.myTake),
});

const splitLines = (text) =>
  str(text)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

// Form -> the `fields` payload for the update action. The server sanitizes
// again (lengths, url schemes, caps); this only shapes the data.
export const parseForm = (form) => ({
  name: form.name.trim(),
  maker: form.maker.trim(),
  url: form.url.trim(),
  links: { site: form.site.trim(), docs: form.docs.trim(), pricing: form.pricingUrl.trim() },
  logo: form.logo.trim(),
  heroImage: form.heroImage.trim(),
  category: form.category.trim(),
  tags: [...new Set(form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))],
  tagline: form.tagline.trim(),
  summary: form.summary.trim(),
  pricing: form.pricing.trim(),
  pros: splitLines(form.pros),
  cons: splitLines(form.cons),
  // A row with anything typed in it is kept so validateFields can point at a
  // missing name. The server drops nameless rows; blank rows go quietly.
  products: form.products
    .map((p) => ({
      name: p.name.trim(),
      description: p.description.trim(),
      image: p.image.trim(),
      url: p.url.trim(),
    }))
    .filter((p) => p.name || p.description || p.image || p.url),
  voices: form.voices
    .map((v) => ({ summary: v.summary.trim(), source: v.source.trim(), url: v.url.trim() }))
    .filter((v) => v.summary || v.source || v.url),
  sources: form.sources
    .map((s) => ({ title: s.title.trim(), url: s.url.trim() }))
    .filter((s) => s.title || s.url),
  verdict: form.verdict.trim(),
  myTake: form.myTake.trim(),
});

// List rows carry the trimmed shape of the list action; derive it from a full
// doc so the table updates after a save without a second request.
export const toListItem = (tool) => ({
  slug: tool.slug,
  name: tool.name,
  maker: tool.maker,
  category: tool.category,
  logo: tool.logo || '',
  tags: Array.isArray(tool.tags) ? tool.tags : [],
  tagline: tool.tagline,
  verdict: tool.verdict,
  status: tool.status,
  createdAt: tool.createdAt,
  updatedAt: tool.updatedAt,
  publishedAt: tool.publishedAt,
  sharedOn: Array.isArray(tool.sharedOn) ? tool.sharedOn : [],
  research: tool.research ? { at: tool.research.at, mode: tool.research.mode } : null,
  hasTake: !!(tool.myTake && String(tool.myTake).trim()),
});

export const sharedVenues = (sharedOn) =>
  [...new Set((sharedOn || []).map((s) => s && s.venue).filter(Boolean))].join(', ');

// Sort comparator for {at} entries, newest first.
export const byNewest = (a, b) => str(b && b.at).localeCompare(str(a && a.at));

// Unsaved editor form, kept per tool in sessionStorage so switching admin
// tabs (which unmounts the editor) does not lose typing. Cleared on save,
// delete, or a confirmed discard.
const DRAFT_PREFIX = 'ait-draft:';
export const readDraft = (slug) => {
  try {
    const raw = sessionStorage.getItem(DRAFT_PREFIX + slug);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};
export const writeDraft = (slug, form) => {
  try {
    sessionStorage.setItem(DRAFT_PREFIX + slug, JSON.stringify(form));
  } catch {
    // Storage full or blocked: the in-memory form still works.
  }
};
export const clearDraft = (slug) => {
  try {
    sessionStorage.removeItem(DRAFT_PREFIX + slug);
  } catch {
    // ignore
  }
};

// Mirrors the server's keep rules so nothing typed is dropped silently on
// Save. Returns '' when the parsed fields are fine, else one plain sentence.
export const validateFields = (fields) => {
  const problems = [];
  const linkLabels = { site: 'site link', docs: 'docs link', pricing: 'pricing link' };
  Object.entries(fields.links || {}).forEach(([key, value]) => {
    if (value && !isHttpUrl(value)) problems.push(`${linkLabels[key] || key} needs http:// or https://`);
  });
  const assetLabels = { logo: 'logo', heroImage: 'hero image' };
  Object.entries(assetLabels).forEach(([key, label]) => {
    if (fields[key] && !isAssetUrl(fields[key])) problems.push(`${label} needs https:// or a path like /images/tools/name.png`);
  });
  (fields.products || []).forEach((p, i) => {
    if (!p.name) problems.push(`product ${i + 1} needs a name`);
    if (p.image && !isAssetUrl(p.image)) {
      problems.push(`product ${i + 1} image needs https:// or a path like /images/tools/name.png`);
    }
    if (p.url && !isHttpUrl(p.url)) problems.push(`product ${i + 1} link needs http:// or https://`);
  });
  (fields.voices || []).forEach((v, i) => {
    if (!v.summary) problems.push(`voice ${i + 1} needs a summary`);
    if (v.url && !isHttpUrl(v.url)) problems.push(`voice ${i + 1} link needs http:// or https://`);
  });
  (fields.sources || []).forEach((s, i) => {
    if (!isHttpUrl(s.url)) problems.push(`source ${i + 1} needs an http:// or https:// link`);
  });
  return problems.length ? `Fix before saving: ${problems.join('; ')}.` : '';
};
