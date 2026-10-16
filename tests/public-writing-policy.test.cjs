const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const policy = require('../netlify/functions/lib/public-writing-policy');
const chat = require('../netlify/functions/chat-core');

const approved = (name = 'fab-stats', overrides = {}) => ({
  name, owner: { login: 'azoni' }, isPrivate: false, url: `https://github.com/azoni/${name}`,
  description: 'An independent public project',
  defaultBranchRef: { target: { history: { nodes: [{
    message: 'Add a documented public feature', committedDate: '2026-10-16T10:00:00Z',
    oid: 'abc1234', additions: 10, deletions: 2, author: { user: { login: 'azoni' } },
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

function loadGenerator(repositories) {
  const writes = [];
  const requests = [];
  const firestore = () => ({
    collection: name => {
      const chain = {
        where: () => chain,
        get: async () => ({ empty: true, docs: [] }),
        add: async data => { writes.push({ collection: name, data }); return { id: 'mock-' + name }; },
        doc: () => ({ set: async data => { writes.push({ collection: name, data }); } }),
      };
      return chain;
    },
  });
  firestore.Timestamp = { fromDate: date => date };
  firestore.FieldValue = { serverTimestamp: () => 'MOCK_TIMESTAMP' };
  const admin = { apps: [{}], firestore };
  const output = { exports: {} };
  const sandbox = {
    module: output, exports: output.exports,
    require: name => {
      if (name === 'firebase-admin') return admin;
      if (name === './embed-util') return { embedAndStore: async () => ({ success: false }) };
      if (name === './lib/public-writing-policy') return policy;
      throw new Error('Unexpected dependency: ' + name);
    },
    process: { env: { GITHUB_TOKEN: 'mock', OPENROUTER_API_KEY: 'mock', FIREBASE_PROJECT_ID: 'mock' } },
    console: { log() {}, error() {} }, Buffer,
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      if (url === 'https://api.github.com/graphql') return { json: async () => ({ data: { user: { repositories: { nodes: repositories } } } }) };
      if (url === 'https://openrouter.ai/api/v1/chat/completions') return { json: async () => ({ choices: [{ message: { content: JSON.stringify({ title: 'Public feature update', excerpt: 'A documented update.', content: 'A public feature changed.', tags: ['engineering'] }) } }] }) };
      throw new Error('Unexpected network target: ' + url);
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../netlify/functions/daily-blog.js'), 'utf8'), sandbox);
  return { handler: output.exports.handler, writes, requests };
}

test('scheduled generator excludes rejected text from LLM, cover, posts, RAG, and activity', async () => {
  const privateRepo = approved('benchonly', { isPrivate: true, description: 'PRIVATE_DESCRIPTION' });
  privateRepo.defaultBranchRef.target.history.nodes[0].message = 'PRIVATE_COMMIT';
  const generator = loadGenerator([approved(), privateRepo, approved('unknown-client-work', { description: 'UNKNOWN_DESCRIPTION' })]);
  const response = await generator.handler({ httpMethod: 'POST', body: JSON.stringify({ date: '2026-10-16' }) });
  assert.equal(response.statusCode, 200);
  const modelRequest = generator.requests.find(request => request.url.includes('openrouter'));
  assert.ok(modelRequest);
  assert.match(modelRequest.body.messages[0].content, /azoni\/fab-stats/);
  assert.doesNotMatch(JSON.stringify(modelRequest), /PRIVATE_|UNKNOWN_|unknown-client-work|azoni\/benchonly/);
  assert.doesNotMatch(JSON.stringify(generator.writes), /PRIVATE_|UNKNOWN_|unknown-client-work|azoni\/benchonly/);
  const post = generator.writes.find(write => write.collection === 'blogPosts').data;
  assert.equal(post.sourcePolicy, policy.SOURCE_POLICY);
  assert.deepEqual(Array.from(post.sourceRepos), ['azoni/fab-stats']);
  assert.equal(post.generatedBy, 'daily-blog');
  const cover = Buffer.from(post.coverImage.split(',')[1], 'base64').toString('utf8');
  assert.doesNotMatch(cover, /PRIVATE_|UNKNOWN_|unknown-client-work|benchonly/);
  const rag = generator.writes.find(write => write.collection === 'rag_knowledge_base').data;
  assert.equal(rag.metadata.autoGenerated, true);
  assert.equal(rag.metadata.generatedBy, 'daily-blog');
  assert.equal(chat.isTrustedKnowledgeChunk(rag), false);
});

test('no eligible public source skips without a model call or content publication', async () => {
  const generator = loadGenerator([approved('fab-stats', { isPrivate: true }), approved('unknown-repository')]);
  const response = await generator.handler({ httpMethod: 'POST', body: JSON.stringify({ date: '2026-10-16' }) });
  assert.equal(response.statusCode, 200);
  assert.equal(generator.requests.length, 1);
  assert.equal(generator.writes.some(write => ['blogPosts', 'rag_knowledge_base'].includes(write.collection)), false);
  assert.doesNotMatch(JSON.stringify(generator.writes), /unknown-repository|azoni\/fab-stats/);
});
