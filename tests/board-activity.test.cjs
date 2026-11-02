const test = require('node:test');
const assert = require('node:assert/strict');

for (const key of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) delete process.env[key];
const { handler, recentActivity } = require('../netlify/functions/board-activity');

function fakeDb(rows) {
  const calls = [];
  const chain = {
    orderBy: (...a) => { calls.push(['orderBy', ...a]); return chain; },
    limit: (n) => { calls.push(['limit', n]); return chain; },
    select: (...f) => { calls.push(['select', ...f]); return chain; },
    get: async () => ({ docs: rows.map((r) => ({ data: () => r })) }),
  };
  return { calls, collection: (name) => { calls.push(['collection', name]); return chain; } };
}

test('serves only source, type and timestamp, never row text', async () => {
  const db = fakeDb([
    { source: 'azoni-ai', type: 'assistant_chat', title: 'Chat: my salary is...', description: 'reply text', timestamp: { toDate: () => new Date('2026-11-02T10:00:00Z') } },
    { source: 'fabstats', type: 'deploy', timestamp: '2026-11-01T09:00:00Z', metadata: { gapQuery: 'private question' } },
    { type: 'orphan', timestamp: 'not a date' },
  ]);
  const items = await recentActivity(db);
  assert.deepEqual(items, [
    { source: 'azoni-ai', type: 'assistant_chat', timestamp: '2026-11-02T10:00:00.000Z' },
    { source: 'fabstats', type: 'deploy', timestamp: '2026-11-01T09:00:00.000Z' },
    { source: null, type: 'orphan', timestamp: null },
  ]);
  assert.deepEqual(db.calls, [
    ['collection', 'agent_activity'],
    ['orderBy', 'timestamp', 'desc'],
    ['limit', 150],
    ['select', 'source', 'type', 'timestamp'],
  ]);
});

test('rejects writes and degrades to an empty list without Firebase credentials', async () => {
  assert.equal((await handler({ httpMethod: 'POST' })).statusCode, 405);
  const res = await handler({ httpMethod: 'GET' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body).items, []);
  assert.match(res.headers['Cache-Control'], /public/);
});
