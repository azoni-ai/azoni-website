const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const policy = require('../netlify/functions/lib/public-writing-policy');
const buildNotes = require('../netlify/functions/lib/build-notes');
const chat = require('../netlify/functions/chat-core');

const approved = (name = 'fab-stats', overrides = {}) => ({
  name, owner: { login: 'azoni' }, isPrivate: false, url: `https://github.com/azoni/${name}`,
  description: 'An independent public project',
  defaultBranchRef: { target: { history: { nodes: [{
    message: 'Add a documented public feature', committedDate: '2026-10-16T10:00:00Z',
    oid: 'abc1234'.repeat(6).slice(0, 40), additions: 10, deletions: 2, author: { user: { login: 'azoni' } },
  }] } } }, ...overrides,
});

test('only an explicitly approved repository with affirmative public metadata is eligible', () => {
  assert.equal(policy.isPublicIndependentRepository(approved()), true);
  assert.equal(policy.isPublicIndependentRepository(approved('fab-stats', { isPrivate: true })), false);
  assert.equal(policy.isPublicIndependentRepository(approved('fab-stats', { isPrivate: undefined })), false);
  assert.equal(policy.isPublicIndependentRepository(approved('fab-stats', { isPrivate: 'false' })), false);
  assert.equal(policy.isPublicIndependentRepository(approved('fab-stats', { visibility: 'INTERNAL' })), false);
  assert.equal(policy.isPublicIndependentRepository(approved('fab-stats', { owner: { login: 'another-owner' } })), false);
  assert.equal(policy.isPublicIndependentRepository(approved('unknown-public-project')), false);
  assert.equal(policy.isPublicIndependentRepository({ name: 'fab-stats', isPrivate: false }), false);
});

test('source selection excludes unknown and private repositories before commit extraction', () => {
  const result = policy.selectPublicRepositories([
    approved(), approved('benchonly', { isPrivate: true }), approved('unknown-public-project'),
    approved('spell-brigade', { isPrivate: undefined }),
  ]);
  assert.deepEqual(result.map(policy.getRepositoryFullName), ['azoni/fab-stats']);
  const website = approved('azoni-website', { owner: { login: 'azoni-ai' } });
  assert.equal(policy.isPublicIndependentRepository(website), true);
  assert.deepEqual(policy.selectWritingRepositories([website, approved()]).map(policy.getRepositoryFullName), ['azoni/fab-stats']);
});

test('mixed, empty, or unverifiable generation inputs cannot claim public provenance', () => {
  const sources = { 'azoni/fab-stats': { repoFullName: 'azoni/fab-stats', isPrivate: false, commits: [{}] } };
  assert.deepEqual(policy.assertPublicCommitSources(sources), ['azoni/fab-stats']);
  assert.throws(() => policy.assertPublicCommitSources({}), /source policy/);
  assert.throws(() => policy.assertPublicCommitSources({ ...sources, 'azoni/unknown': { repoFullName: 'azoni/unknown', isPrivate: false, commits: [{}] } }), /source policy/);
  assert.throws(() => policy.assertPublicCommitSources({ 'azoni/fab-stats': { ...sources['azoni/fab-stats'], isPrivate: true } }), /source policy/);
  assert.equal(policy.hasPublicSourceProof({ sourcePolicy: policy.SOURCE_POLICY, sourceRepos: ['azoni/fab-stats'] }), true);
  assert.equal(policy.hasPublicSourceProof({ sourcePolicy: policy.SOURCE_POLICY, sourceRepos: ['azoni/fab-stats', 'azoni/unknown'] }), false);
  assert.equal(policy.hasPublicSourceProof({ sourceRepos: ['azoni/fab-stats'] }), false);
  assert.equal(policy.hasPublicSourceProof({ sourcePolicy: policy.SOURCE_POLICY, sourceRepos: [] }), false);
  assert.equal(policy.hasPublicSourceProof({ sourcePolicy: policy.SOURCE_POLICY, sourceRepos: ['azoni-ai/azoni-website'] }), false);
});

test('historical generated blog knowledge is excluded even if generated flags are missing', () => {
  for (const source of [
    { category: 'blog' }, { type: 'blog' }, { title: 'Blog: Old post' },
    { metadata: { blogId: 'old-document' } }, { metadata: { blogDate: '2026-01-01' } },
    { source: 'daily-blog' }, { metadata: { source: 'daily-blog' } },
  ]) assert.equal(chat.isTrustedKnowledgeChunk({ content: 'Old generated claim', ...source }), false);
});

test('chat projects old activity payloads to safe aggregates before using them as context', async () => {
  const originalFetch = global.fetch;
  global.fetch = async url => {
    assert.match(url, /\/\.netlify\/functions\/home-summary$/);
    return { ok: true, json: async () => ({
      agentCount24h: 4, cost30d: 1.25, actionCount30d: 80, errors7d: 0,
      bySource: [{ source: 'azoni-ai', value: 1.25 }, { source: 'UNKNOWN_INTERNAL_SYSTEM', value: 50 }],
      recentFeed: [{ title: 'PRIVATE_OPERATION', description: 'PRIVATE_DETAILS' }],
      latestBlog: { title: 'PRIVATE_BUSINESS_TITLE' },
    }) };
  };
  try {
    const result = await chat.getActivityContext('What is the recent AI activity?');
    assert.equal(result.context[0].data.cost30d, 1.25);
    assert.deepEqual(result.context[0].data.recentFeed, []);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|UNKNOWN_INTERNAL/);
  } finally { global.fetch = originalFetch; }
});

// ---- daily-blog generator, with Firestore, GitHub and the model stubbed ----

const yesterday = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const PRIVATE_TERMS = 'Acme Corp,\nsecret-take-home';
const plain = value => JSON.parse(JSON.stringify(value));
const run = (generator, body = { date: yesterday() }) => generator.handler({ httpMethod: 'POST', body: JSON.stringify(body) });

// The Firestore stub keeps every added document, so where/get see seeded rows
// and the run's own writes, filtered the way Firestore would filter them.
const OPS = { '==': (a, b) => a === b, '>=': (a, b) => a >= b, '<': (a, b) => a < b };

function loadGenerator(repositories, { env = {}, model, seed = {} } = {}) {
  const writes = [];
  const requests = [];
  const store = Object.fromEntries(Object.entries(seed).map(([name, docs]) => [name, docs.map(plain)]));
  const firestore = () => ({
    collection: name => {
      const query = filters => ({
        where: (field, op, value) => {
          if (!OPS[op]) throw new Error('Unsupported operator in stub: ' + op);
          return query([...filters, [field, op, value]]);
        },
        get: async () => {
          const docs = (store[name] || []).filter(data => filters.every(([field, op, value]) => OPS[op](data[field], value)));
          return { empty: docs.length === 0, docs: docs.map(data => ({ data: () => data })) };
        },
      });
      return {
        ...query([]),
        add: async data => {
          writes.push({ collection: name, data });
          (store[name] = store[name] || []).push(data);
          return { id: 'mock-' + name };
        },
        doc: () => ({ set: async data => { writes.push({ collection: name, data }); } }),
      };
    },
  });
  firestore.Timestamp = { fromDate: date => date };
  firestore.FieldValue = { serverTimestamp: () => 'MOCK_TIMESTAMP' };
  const admin = { apps: [{}], firestore };
  const output = { exports: {} };
  const modelReply = model || {
    title: 'FaB Stats: a documented public feature',
    excerpt: 'Adds a documented public feature to FaB Stats.',
    sections: [{ repo: 'azoni/fab-stats', summary: 'Adds a documented public feature.' }],
    tags: ['engineering'],
  };
  const sandbox = {
    module: output, exports: output.exports,
    require: name => {
      if (name === 'firebase-admin') return admin;
      if (name === './embed-util') return { embedAndStore: async () => ({ success: false }) };
      if (name === './lib/public-writing-policy') return policy;
      if (name === './lib/build-notes') return buildNotes;
      throw new Error('Unexpected dependency: ' + name);
    },
    process: { env: { GITHUB_TOKEN: 'mock', OPENROUTER_API_KEY: 'mock', FIREBASE_PROJECT_ID: 'mock', BLOG_PRIVATE_TERMS: PRIVATE_TERMS, ...env } },
    console: { log() {}, error() {} }, Buffer,
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      // Even if GitHub returned other repositories, the policy filter drops them.
      if (url === 'https://api.github.com/graphql') return { json: async () => ({ data: Object.fromEntries(repositories.map((repo, index) => ['repo' + index, repo])) }) };
      if (url === 'https://openrouter.ai/api/v1/chat/completions') return { json: async () => ({ choices: [{ message: { content: JSON.stringify(modelReply) } }] }) };
      throw new Error('Unexpected network target: ' + url);
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../netlify/functions/daily-blog.js'), 'utf8'), sandbox);
  const written = collection => writes.filter(write => write.collection === collection).map(write => write.data);
  return { handler: output.exports.handler, writes, requests, written };
}

test('the generator asks GitHub only for allowlisted repositories, by name', async () => {
  const generator = loadGenerator([approved()]);
  await run(generator);
  const query = generator.requests.find(request => request.url === 'https://api.github.com/graphql').body.query;
  const named = [...query.matchAll(/repository\(owner: "([^"]+)", name: "([^"]+)"\)/g)].map(match => `${match[1]}/${match[2]}`);
  assert.deepEqual(named.sort(), [...buildNotes.WRITING_REPOSITORIES].sort());
  assert.doesNotMatch(query, /repositories\(|user\(|viewer/);
});

test('scheduled generator excludes rejected text from the model, cover, posts, RAG, and activity', async () => {
  const privateRepo = approved('benchonly', { isPrivate: true, description: 'PRIVATE_DESCRIPTION' });
  privateRepo.defaultBranchRef.target.history.nodes[0].message = 'PRIVATE_COMMIT';
  const generator = loadGenerator([approved(), privateRepo, approved('unknown-client-work', { description: 'UNKNOWN_DESCRIPTION' })]);
  const response = await run(generator);
  assert.equal(response.statusCode, 200);
  const modelRequest = generator.requests.find(request => request.url.includes('openrouter'));
  assert.ok(modelRequest);
  assert.match(modelRequest.body.messages[0].content, /azoni\/fab-stats/);
  assert.doesNotMatch(JSON.stringify(modelRequest), /PRIVATE_|UNKNOWN_|unknown-client-work|azoni\/benchonly/);
  assert.doesNotMatch(JSON.stringify(generator.writes), /PRIVATE_|UNKNOWN_|unknown-client-work|azoni\/benchonly/);
  const [post] = generator.written('blogPosts');
  assert.equal(post.published, true);
  assert.equal(post.policyVersion, 2);
  assert.equal(post.sourcePolicy, policy.SOURCE_POLICY);
  assert.deepEqual(plain(post.sourceRepos), ['azoni/fab-stats']);
  assert.equal(post.generatedBy, 'daily-blog');
  assert.equal(post.generator, 'model');
  assert.ok(post.content.includes(`https://github.com/azoni/fab-stats/commit/${'abc1234'.repeat(6).slice(0, 40)}`));
  assert.deepEqual(generator.written('blogPostDrafts'), []);
  const cover = Buffer.from(post.coverImage.split(',')[1], 'base64').toString('utf8');
  assert.doesNotMatch(cover, /PRIVATE_|UNKNOWN_|unknown-client-work|benchonly/);
  const [rag] = generator.written('rag_knowledge_base');
  assert.equal(rag.metadata.autoGenerated, true);
  assert.equal(rag.metadata.generatedBy, 'daily-blog');
  assert.equal(chat.isTrustedKnowledgeChunk(rag), false);
  const activity = generator.written('agent_activity');
  assert.ok(activity.some(row => row.type === 'blog_generated'));
  for (const row of activity) for (const repo of row.metadata.repos || []) assert.ok(policy.isApprovedWritingRepository(repo));
});

const FAILING_MODEL = {
  title: 'FaB Stats: shipped the Acme Corp import',
  excerpt: 'I finally shipped the import that had been bugging me for weeks.',
  sections: [{ repo: 'azoni/fab-stats', summary: 'Adds a documented public feature.' }],
  tags: ['engineering'],
};

test('a model note that fails validation falls back to the commit list and keeps the model draft private', async () => {
  const generator = loadGenerator([approved()], { model: FAILING_MODEL });
  const response = await run(generator);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).published, true);
  const [post] = generator.written('blogPosts');
  assert.equal(post.generator, 'template');
  assert.equal(post.model, null);
  assert.equal(post.title, 'FaB Stats: Add a documented public feature');
  assert.doesNotMatch(JSON.stringify(post), /acme|bugging|shipped the/i);
  const [draft] = generator.written('blogPostDrafts');
  assert.equal(draft.published, false);
  assert.equal(draft.generator, 'model');
  assert.equal(draft.supersededBy, post.slug);
  assert.ok(draft.rejectionReasons.includes('uses first-person narrative'));
  assert.ok(draft.rejectionReasons.some(reason => /^contains private term #1$/.test(reason)));
  assert.equal(typeof draft.rejectionReason, 'string');
  for (const rag of generator.written('rag_knowledge_base')) assert.doesNotMatch(JSON.stringify(rag), /acme|bugging/i);
  const activity = generator.written('agent_activity');
  assert.ok(activity.some(row => row.type === 'blog_generated'));
  assert.doesNotMatch(JSON.stringify(activity), /acme|bugging|shipped the/i);
});

test('a note is held back as an unpublished draft when the commit list fails too', async () => {
  const repo = approved();
  repo.defaultBranchRef.target.history.nodes[0].message = 'Port the parser from azoni/old-parser';
  const generator = loadGenerator([repo], { model: FAILING_MODEL });
  const response = await run(generator);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).rejected, true);
  assert.deepEqual(generator.written('blogPosts'), []);
  assert.deepEqual(generator.written('rag_knowledge_base'), []);
  const [draft, ...rest] = generator.written('blogPostDrafts');
  assert.deepEqual(rest, []);
  assert.equal(draft.published, false);
  assert.equal(draft.policyVersion, 2);
  assert.equal(draft.supersededBy, undefined);
  assert.ok(draft.rejectionReasons.includes('names a repository outside the fetched allowlist'));
  const activity = generator.written('agent_activity');
  assert.ok(activity.some(row => row.type === 'blog_rejected'));
  assert.doesNotMatch(JSON.stringify(activity), /acme|bugging|shipped the/i);
});

test('without BLOG_PRIVATE_TERMS nothing is fetched or written and the run returns 503', async () => {
  const generator = loadGenerator([approved()], { env: { BLOG_PRIVATE_TERMS: undefined } });
  const response = await run(generator);
  assert.equal(response.statusCode, 503);
  assert.equal(generator.requests.length, 0);
  assert.equal(generator.writes.some(write => ['blogPosts', 'blogPostDrafts', 'rag_knowledge_base'].includes(write.collection)), false);
  const states = generator.written('agent_state');
  assert.equal(states[states.length - 1].status, 'error');
});

const onDate = (suffix, data = {}) => ({ slug: `${yesterday()}-${suffix}`, ...data });

test('a published policy-version-2 note for the date is not written twice', async () => {
  const generator = loadGenerator([approved()], { seed: { blogPosts: [onDate('fab-stats-earlier-note', { policyVersion: 2, published: true })] } });
  const body = JSON.parse((await run(generator)).body);
  assert.equal(body.skipped, true);
  assert.equal(body.existingSlug, `${yesterday()}-fab-stats-earlier-note`);
  assert.deepEqual(generator.written('blogPosts'), []);
});

test('a legacy persona post on the same date does not block a build note', async () => {
  const generator = loadGenerator([approved()], { seed: { blogPosts: [onDate('leveling-up-my-stats', { published: true })] } });
  await run(generator);
  assert.equal(generator.written('blogPosts').length, 1);
});

test('a draft held for a real reason blocks its date until a manual retry', async () => {
  const seed = { blogPostDrafts: [onDate('held-note', { published: false, rejectionReasons: ['uses first-person narrative'] })] };
  const blocked = loadGenerator([approved()], { seed });
  assert.equal(JSON.parse((await run(blocked)).body).skipped, true);
  assert.deepEqual(blocked.written('blogPosts'), []);

  const retried = loadGenerator([approved()], { seed });
  await run(retried, { date: yesterday(), retry: true });
  assert.equal(retried.written('blogPosts').length, 1);
});

test('a draft held only for missing configuration, or superseded, does not block its date', async () => {
  for (const draft of [
    onDate('config-only', { published: false, rejectionReasons: ['BLOG_PRIVATE_TERMS is not configured'] }),
    onDate('superseded', { published: false, rejectionReasons: ['uses first-person narrative'], supersededBy: 'elsewhere' }),
  ]) {
    const generator = loadGenerator([approved()], { seed: { blogPostDrafts: [draft] } });
    await run(generator);
    assert.equal(generator.written('blogPosts').length, 1, draft.slug);
  }
});

test('the dedupe range bound is an escape, not an invisible character', () => {
  const source = fs.readFileSync(path.join(__dirname, '../netlify/functions/daily-blog.js'), 'utf8');
  assert.ok(source.includes("targetDate + '\\uf8ff'"));
  assert.equal(source.includes('\uf8ff'), false);
});

test('without a model key the plain commit list is published', async () => {
  const generator = loadGenerator([approved()], { env: { OPENROUTER_API_KEY: undefined } });
  await run(generator);
  const [post] = generator.written('blogPosts');
  assert.equal(post.generator, 'template');
  assert.equal(post.title, 'FaB Stats: Add a documented public feature');
  assert.equal(post.published, true);
});

test('no eligible public source skips without a model call or content publication', async () => {
  const generator = loadGenerator([approved('fab-stats', { isPrivate: true }), approved('unknown-repository')]);
  const response = await run(generator);
  assert.equal(response.statusCode, 200);
  assert.equal(generator.requests.length, 1);
  assert.equal(generator.writes.some(write => ['blogPosts', 'blogPostDrafts', 'rag_knowledge_base'].includes(write.collection)), false);
  assert.doesNotMatch(JSON.stringify(generator.writes), /unknown-repository|azoni\/fab-stats/);
});

test('manual runs reject malformed, future, or old dates before any work', async () => {
  const later = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  for (const date of ['2026-13-40', 'not-a-date', '2020-01-01', later, 20261101]) {
    const generator = loadGenerator([approved()]);
    const response = await run(generator, { date });
    assert.equal(response.statusCode, 400, String(date));
    assert.equal(generator.requests.length, 0);
    assert.equal(generator.writes.length, 0);
  }
});

