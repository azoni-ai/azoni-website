// Keeps the sitemap and the edge noindex header in step with the visibility
// field in src/data/projects.js and the pages that render with noIndex.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const visibility = {};
let lastId = null;
for (const line of read('src/data/projects.js').split(/\r?\n/)) {
  const id = line.match(/^ {4}id: '([a-z0-9-]+)',$/);
  if (id) lastId = id[1];
  const vis = line.match(/^ {4}visibility: '([a-z]+)',$/);
  if (vis && lastId) visibility[lastId] = vis[1];
}
const ids = Object.keys(visibility);
const listed = ids.filter((id) => ['featured', 'other', 'earlier'].includes(visibility[id]));
const unlisted = ids.filter((id) => visibility[id] === 'unlisted');
const redirected = new Set(
  read('public/_redirects').split(/\r?\n/).map((l) => l.trim().split(/\s+/)).filter(([, , s]) => s === '301').map(([from]) => from),
);

const sitemap = [...read('public/sitemap.xml').matchAll(/<loc>https:\/\/azoni\.ai([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const edgeSource = read('netlify/edge-functions/noindex-headers.js');
const edgePaths = [...edgeSource.slice(edgeSource.indexOf('path:')).matchAll(/'([^']+)'/g)].map((m) => m[1]);

test('every project has a visibility and the parser found them', () => {
  assert.ok(ids.length >= 20, `only ${ids.length} projects parsed`);
  assert.ok(unlisted.length > 0);
});

test('the sitemap lists each listed project page and no unlisted, merged or redirected one', () => {
  for (const id of listed) {
    if (redirected.has(`/projects/${id}`)) continue;
    assert.ok(sitemap.includes(`/projects/${id}`), `sitemap is missing /projects/${id}`);
  }
  for (const loc of sitemap) {
    const id = loc.startsWith('/projects/') ? loc.slice('/projects/'.length) : null;
    if (id) assert.ok(listed.includes(id), `sitemap lists ${loc}, which is ${visibility[id] || 'not a project'}`);
    assert.ok(!redirected.has(loc), `sitemap lists ${loc}, which redirects`);
  }
});

test('the sitemap leaves out noindex pages', () => {
  for (const loc of sitemap) {
    assert.ok(!edgePaths.some((p) => p === loc || (p.endsWith('/*') && loc.startsWith(p.slice(0, -1)))), `sitemap lists noindex ${loc}`);
  }
  // /chat still renders; it leaves the sitemap until its copy is reworked.
  for (const loc of ['/meet', '/game', '/moltbook', '/chat', '/ai-tools', '/board', '/admin']) assert.ok(!sitemap.includes(loc), `sitemap lists ${loc}`);
  assert.ok(!sitemap.some((loc) => loc.startsWith('/blog/')), 'build notes are noindex and stay out of the sitemap');
});

test('the AI Tools noindex header and sitemap follow UNLISTED in aiToolsMeta.js', () => {
  const flag = read('src/data/aiToolsMeta.js').match(/^const UNLISTED = (true|false);$/m);
  assert.ok(flag, 'could not find UNLISTED in src/data/aiToolsMeta.js');
  const unlistedTools = flag[1] === 'true';
  for (const p of ['/ai-tools', '/ai-tools/*']) assert.equal(edgePaths.includes(p), unlistedTools, `edge noindex for ${p} does not match UNLISTED`);
  assert.equal(sitemap.includes('/ai-tools'), !unlistedTools, 'sitemap /ai-tools does not match UNLISTED');
});

test('the edge function marks every unlisted project noindex and no listed one', () => {
  for (const id of unlisted) assert.ok(edgePaths.includes(`/projects/${id}`), `/projects/${id} is unlisted but has no noindex header`);
  for (const id of listed) assert.ok(!edgePaths.includes(`/projects/${id}`), `/projects/${id} is listed but sent noindex`);
  assert.ok(!edgePaths.includes('/blog'), 'the /blog list stays indexable');
});
