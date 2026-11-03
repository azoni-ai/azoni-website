// Unknown URLs return HTTP 404 (public/_redirects ends with `/* /index.html 404`),
// so every real route needs its own 200 rule above that line. This test reads the
// routes from src/App.jsx and the project ids from src/data/projects.js and fails
// when one of them would be served as a 404.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const routes = [...read('src/App.jsx').matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
const projectIds = [...read('src/data/projects.js').matchAll(/^ {4}id: '([a-z0-9-]+)',\r?$/gm)].map((m) => m[1]);
const rules = read('public/_redirects')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [from, to, status = '301'] = line.split(/\s+/);
    return { from, to, status: status.replace(/!$/, '') };
  });

const catchAllIndex = rules.findIndex((r) => r.from === '/*');
const beforeCatchAll = rules.slice(0, catchAllIndex);
const appRule = (from) => beforeCatchAll.find((r) => r.from === from && r.to === '/index.html' && r.status === '200');
const ruleFor = (from) => beforeCatchAll.find((r) => r.from === from);

test('the parsers found the routes, the project ids and the rules', () => {
  assert.ok(routes.length >= 20, `only ${routes.length} routes parsed from App.jsx`);
  assert.ok(routes.includes('*'), 'App.jsx should keep its NotFound catch-all');
  assert.ok(projectIds.length >= 20, `only ${projectIds.length} project ids parsed from projects.js`);
  assert.ok(rules.length > 0);
});

test('unknown URLs get the app shell with a 404 status, and nothing follows that rule', () => {
  assert.notEqual(catchAllIndex, -1, 'missing the /* catch-all');
  assert.deepEqual(rules[catchAllIndex], { from: '/*', to: '/index.html', status: '404' });
  assert.equal(catchAllIndex, rules.length - 1, 'the /* rule must be the last rule');
  assert.equal(rules.filter((r) => r.from === '/*').length, 1);
});

test('every static route in App.jsx has a 200 rule', () => {
  const missing = routes.filter((r) => r !== '*' && !r.includes(':')).filter((r) => !appRule(r));
  assert.deepEqual(missing, [], `routes without a 200 rule: ${missing.join(', ')}`);
});

test('every route with a parameter has a 200 rule, or a rule for each project page', () => {
  const missing = [];
  for (const route of routes.filter((r) => r.includes(':'))) {
    const prefix = route.slice(0, route.indexOf('/:'));
    if (appRule(`${prefix}/*`)) continue;
    if (prefix === '/projects') {
      for (const id of projectIds) if (!ruleFor(`/projects/${id}`)) missing.push(`/projects/${id}`);
      continue;
    }
    missing.push(route);
  }
  assert.deepEqual(missing, [], `no rule for: ${missing.join(', ')}`);
});

test('every project page is served directly or redirected to a served page', () => {
  for (const id of projectIds) {
    const rule = ruleFor(`/projects/${id}`) || appRule('/projects/*');
    assert.ok(rule, `/projects/${id} has no rule`);
    if (rule.status === '200') continue;
    assert.equal(rule.status, '301', `/projects/${id} should be a 200 or a 301`);
    assert.ok(appRule(rule.to), `/projects/${id} redirects to ${rule.to}, which has no 200 rule`);
  }
});

test('internal 301 targets are pages that are served', () => {
  const internal = beforeCatchAll.filter((r) => r.status === '301' && r.to.startsWith('/') && !/\.[a-z]+$/i.test(r.to));
  const broken = internal.filter((r) => !appRule(r.to)).map((r) => `${r.from} -> ${r.to}`);
  assert.deepEqual(broken, [], `redirects to unserved pages: ${broken.join(', ')}`);
});

test('every 200 rule to the app shell belongs to a route or a project page', () => {
  const known = new Set(routes.filter((r) => r !== '*' && !r.includes(':')));
  for (const route of routes.filter((r) => r.includes(':'))) known.add(`${route.slice(0, route.indexOf('/:'))}/*`);
  for (const id of projectIds) known.add(`/projects/${id}`);
  const stale = beforeCatchAll.filter((r) => r.to === '/index.html' && r.status === '200' && !known.has(r.from)).map((r) => r.from);
  assert.deepEqual(stale, [], `200 rules for routes that no longer exist: ${stale.join(', ')}`);
});
