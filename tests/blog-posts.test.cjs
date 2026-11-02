const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const FUNCTIONS = path.join(__dirname, '../netlify/functions');
const ADMIN_PATH = require.resolve('firebase-admin', { paths: [FUNCTIONS] });

const note = (slug, overrides = {}) => ({
  slug, title: `Note ${slug}`, excerpt: 'Adds a documented public feature.', content: `## FaB Stats\n\nContent for ${slug}`,
  tags: ['build-notes'], coverImage: 'data:image/svg+xml;base64,PHN2Zy8+', commitDate: slug.slice(0, 10),
  publishedAt: { toDate: () => new Date(`${slug.slice(0, 10)}T17:00:00Z`) }, sourceRepos: ['azoni/fab-stats'],
  commitCount: 2, published: true, policyVersion: 2, generator: 'model', commits: [{ sha: 'abc1234' }], ...overrides,
});

const DOCS = [
  note('2026-10-30-fab-stats-season-filters'),
  note('2026-11-01-row-crew-meters-per-rower', { sourceRepos: ['azoni/rowing-tracker'] }),
  note('2026-10-31-held-back-note', { published: false }),
  note('2026-09-28-leveling-up-with-usurp-the-shadow-throne-in-fab-stats', { policyVersion: undefined }),
  note('2026-10-29-private-source', { sourceRepos: ['azoni/fab-stats', 'azoni/secret-repo'] }),
  note('2026-10-28-names-acme-corp', { content: 'Work for Acme Corp' }),
];

// Loads blog-posts fresh, with firebase-admin swapped for an in-memory
// Firestore that supports the queries the function makes.
function loadFunction(docs = DOCS, env = {}) {
  const queries = [];
  const collection = (name) => {
    const filters = [];
    const chain = {
      where: (field, op, value) => { assert.equal(op, '=='); filters.push([field, value]); return chain; },
      select: () => chain,
      limit: () => chain,
      get: async () => {
        queries.push({ name, filters: [...filters] });
        const matches = name === 'blogPosts' ? docs.filter((doc) => filters.every(([field, value]) => doc[field] === value)) : [];
        return { docs: matches.map((doc) => ({ data: () => doc })) };
      },
    };
    return chain;
  };
  const fakeAdmin = {
    apps: [],
    initializeApp() { this.apps.push({}); },
    credential: { cert: (value) => value },
    firestore: () => ({ collection }),
  };
  Object.assign(process.env, {
    FIREBASE_PROJECT_ID: 'mock', FIREBASE_CLIENT_EMAIL: 'mock@example.com', FIREBASE_PRIVATE_KEY: 'mock',
    BLOG_PRIVATE_TERMS: 'Acme Corp', ...env,
  });
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key];
  for (const key of Object.keys(require.cache)) if (key.includes('netlify')) delete require.cache[key];
  require.cache[ADMIN_PATH] = { id: ADMIN_PATH, filename: ADMIN_PATH, loaded: true, exports: fakeAdmin };
  const { handler } = require('../netlify/functions/blog-posts');
  const get = (params) => handler({ httpMethod: 'GET', queryStringParameters: params });
  return { handler, get, queries };
}

const parse = (response) => JSON.parse(response.body);

test('the list holds only published policy-version-2 notes, newest first, without full content', async () => {
  const { get } = loadFunction();
  const response = await get({});
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['Cache-Control'], /^public, max-age=300/);
  const { posts } = parse(response);
  assert.deepEqual(posts.map((post) => post.slug), ['2026-11-01-row-crew-meters-per-rower', '2026-10-30-fab-stats-season-filters']);
  assert.deepEqual(Object.keys(posts[0]).sort(), ['commitCount', 'commitDate', 'excerpt', 'generator', 'publishedAt', 'slug', 'sourceRepos', 'tags', 'title']);
  assert.equal(posts[0].generator, 'model');
  assert.equal(posts[0].publishedAt, '2026-11-01T17:00:00.000Z');
});

test('one note by slug includes its content and cover; anything else is a 404', async () => {
  const { get } = loadFunction();
  const found = await get({ slug: '2026-10-30-fab-stats-season-filters' });
  assert.equal(found.statusCode, 200);
  const { post } = parse(found);
  assert.match(post.content, /Content for 2026-10-30/);
  assert.equal(post.coverImage, 'data:image/svg+xml;base64,PHN2Zy8+');
  assert.equal(post.commits, undefined);
  assert.equal(post.generator, 'model');
  assert.equal(post.model, undefined);
  for (const slug of ['2026-10-31-held-back-note', '2026-09-28-leveling-up-with-usurp-the-shadow-throne-in-fab-stats', '2026-10-29-private-source', '2026-10-28-names-acme-corp', '2026-01-01-missing']) {
    const response = await get({ slug });
    assert.equal(response.statusCode, 404, slug);
    assert.match(response.headers['Cache-Control'], /^public, max-age=60/);
  }
});

test('malformed input and other methods are rejected before Firestore is read', async () => {
  const { get, handler, queries } = loadFunction();
  for (const slug of ['../etc/passwd', 'NOT-A-SLUG', '2026-10-30-' + 'a'.repeat(80), '']) {
    const response = await get({ slug });
    assert.equal(response.statusCode, 400, slug);
    assert.equal(response.headers['Cache-Control'], 'no-store');
  }
  assert.equal((await handler({ httpMethod: 'POST', body: '{}' })).statusCode, 405);
  assert.equal(queries.length, 0);
});

test('without the private-term list or Firestore credentials nothing is served', async () => {
  const noTerms = loadFunction(DOCS, { BLOG_PRIVATE_TERMS: undefined });
  const response = await noTerms.get({});
  assert.equal(response.statusCode, 503);
  assert.equal(noTerms.queries.length, 0);
  const noDb = loadFunction(DOCS, { FIREBASE_PRIVATE_KEY: undefined });
  assert.equal((await noDb.get({})).statusCode, 503);
});

test.after(() => {
  delete require.cache[ADMIN_PATH];
  for (const key of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'BLOG_PRIVATE_TERMS']) delete process.env[key];
});
