const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { validBusinessAccounts } = require('../netlify/functions/lib/business-accounts-validation');

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const account = (overrides = {}) => ({
  id: 'account-1', name: 'Example business portal', url: 'https://example.com/account?tab=home',
  username: 'owner@example.test', category: 'operations', notes: 'Synthetic reference note.\nSecond line.', pinned: true,
  ...overrides,
});
const baseData = (overrides = {}) => ({ settings: {}, entries: [], invoices: [], ...overrides });

function loadHandler(initial) {
  let stored = clone(initial);
  const calls = { reads: 0, writes: 0 };
  const read = async () => { calls.reads += 1; return { exists: stored !== undefined, data: () => clone(stored) }; };
  const ref = { get: read };
  const firestore = () => ({
    collection: name => {
      assert.equal(name, 'billing');
      return { doc: id => { assert.equal(id, 'main'); return ref; } };
    },
    runTransaction: async callback => {
      let pending;
      const result = await callback({
        get: async requested => { assert.equal(requested, ref); return read(); },
        set: (requested, value) => { assert.equal(requested, ref); pending = clone(value); },
      });
      if (pending !== undefined) { stored = pending; calls.writes += 1; }
      return result;
    },
  });
  const output = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../netlify/functions/billing-admin.js'), 'utf8'), {
    module: output, exports: output.exports, Buffer, JSON,
    process: { env: { RAG_ADMIN_KEY: 'mock-owner-token' } }, console: { error() {} },
    require: name => {
      if (name === 'crypto') return require('node:crypto');
      if (name === 'firebase-admin') return { apps: [{}], firestore };
      if (name === './lib/dor-validation') return require('../netlify/functions/lib/dor-validation');
      if (name === './lib/business-accounts-validation') return require('../netlify/functions/lib/business-accounts-validation');
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const request = async (body, token = 'mock-owner-token') => {
    const response = await output.exports.handler({ httpMethod: 'POST',
      headers: { authorization: `Bearer ${token}`, 'x-nf-client-connection-ip': '192.0.2.1' }, body: JSON.stringify(body) });
    return { ...response, json: JSON.parse(response.body) };
  };
  return { request, calls, stored: () => clone(stored) };
}

test('authenticated account save/get roundtrip preserves all permitted fields and DOR response contract', async () => {
  const loaded = loadHandler();
  const accounts = [account(), account({ id: 'account-2', category: 'taxes', username: '', notes: '', pinned: false })];
  const saved = await loaded.request({ action: 'save', baseRev: 0, data: baseData({ businessAccounts: accounts }) });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json.rev, 1);
  assert.deepEqual(saved.json.dorFilings, []);
  const result = await loaded.request({ action: 'get' });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.json.data.businessAccounts, accounts);
  assert.equal(loaded.calls.writes, 1);
});

test('legacy reads and older-client saves preserve field absence so the frontend can seed defaults', async () => {
  const loaded = loadHandler({ ...baseData(), rev: 2 });
  const initial = await loaded.request({ action: 'get' });
  assert.equal(Object.hasOwn(initial.json.data, 'businessAccounts'), false);
  assert.equal((await loaded.request({ action: 'save', baseRev: 2, data: baseData() })).statusCode, 200);
  assert.equal(Object.hasOwn(loaded.stored(), 'businessAccounts'), false);
  assert.equal(Object.hasOwn((await loaded.request({ action: 'get' })).json.data, 'businessAccounts'), false);
});

test('an older client omitting accounts cannot erase stored account references', async () => {
  const initial = { ...baseData({ businessAccounts: [account()] }), rev: 4 };
  const loaded = loadHandler(initial);
  const response = await loaded.request({ action: 'save', baseRev: 4, data: baseData() });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(loaded.stored().businessAccounts, initial.businessAccounts);
  assert.equal(loaded.stored().rev, 5);
});

test('an explicit empty list clears accounts and remains empty on subsequent reads', async () => {
  const loaded = loadHandler({ ...baseData({ businessAccounts: [account()] }), rev: 3 });
  assert.equal((await loaded.request({ action: 'save', baseRev: 3, data: baseData({ businessAccounts: [] }) })).statusCode, 200);
  assert.deepEqual(loaded.stored().businessAccounts, []);
  assert.deepEqual((await loaded.request({ action: 'get' })).json.data.businessAccounts, []);
});

test('unsafe, ambiguous, and credential-bearing URLs are rejected before any write', async () => {
  for (const url of [
    'javascript:alert(1)', 'data:text/html,hello', 'http://example.com', '//example.com', '/account',
    'https://user@example.com', 'https://user:password@example.com', 'https://@example.com',
    'https://%75ser@example.com', 'https:///example.com', 'https://',
    ' https://example.com', 'https://example.com/a b', 'https://exam\nple.com',
    'https://example.com\\account', 'https://example.com/\u007f', null,
  ]) {
    const loaded = loadHandler();
    const response = await loaded.request({ action: 'save', data: baseData({ businessAccounts: [account({ url })] }) });
    assert.equal(response.statusCode, 400, `Unexpected acceptance: ${String(url)}`);
    assert.equal(loaded.calls.writes, 0);
    assert.doesNotMatch(response.body, /owner@example|password|Synthetic reference/);
  }
});

test('duplicate IDs, reserved IDs, invalid types, unsupported fields, and overlong records are rejected', async () => {
  const invalid = [
    {}, null, [null], [account(), account()], [account(), account({ id: ' account-1 ' })], [account({ id: '' })], [account({ id: ' ' })],
    ...['__proto__', 'constructor', 'prototype', 'Constructor', ' constructor '].map(id => [account({ id })]),
    [account({ id: 'x'.repeat(129) })], [account({ name: '' })], [account({ name: 'x'.repeat(121) })],
    [account({ url: 'https://example.com/' + 'x'.repeat(2048) })],
    [account({ username: 'x'.repeat(201) })], [account({ username: 123 })],
    [account({ notes: 'x'.repeat(2001) })], [account({ notes: null })],
    [account({ category: 'unrecognized' })], [account({ pinned: 'true' })],
    [account({ password: 'SHOULD_NOT_BE_STORED' })],
    Array.from({ length: 101 }, (_, i) => account({ id: `account-${i}` })),
  ];
  for (const businessAccounts of invalid) {
    const loaded = loadHandler();
    const response = await loaded.request({ action: 'save', data: baseData({ businessAccounts }) });
    assert.equal(response.statusCode, 400);
    assert.equal(loaded.calls.writes, 0);
    assert.doesNotMatch(response.body, /SHOULD_NOT_BE_STORED/);
  }
});

test('boundary-sized valid records, all categories, and a 100-account list are accepted', async () => {
  const categories = ['taxes', 'banking', 'insurance', 'software', 'operations', 'other'];
  const accounts = Array.from({ length: 100 }, (_, i) => account({ id: `account-${i}`, category: categories[i % categories.length] }));
  const prefix = 'https://example.com/';
  accounts[0] = account({ id: 'x'.repeat(128), name: 'n'.repeat(120), url: prefix + 'x'.repeat(2048 - prefix.length),
    username: 'u'.repeat(200), notes: 'n'.repeat(2000), pinned: false });
  const loaded = loadHandler();
  assert.equal((await loaded.request({ action: 'save', data: baseData({ businessAccounts: accounts }) })).statusCode, 200);
  assert.deepEqual(loaded.stored().businessAccounts, accounts);
});

test('revision conflict and explicit force behavior remain intact for account edits', async () => {
  const initial = { ...baseData({ businessAccounts: [account()] }), rev: 5 };
  const loaded = loadHandler(initial);
  const data = baseData({ businessAccounts: [account({ name: 'Updated portal' })] });
  const stale = await loaded.request({ action: 'save', baseRev: 4, data });
  assert.equal(stale.statusCode, 409);
  assert.deepEqual(loaded.stored(), initial);
  const forced = await loaded.request({ action: 'save', baseRev: 4, force: true, data });
  assert.equal(forced.statusCode, 200);
  assert.equal(forced.json.rev, 6);
  assert.equal(loaded.stored().businessAccounts[0].name, 'Updated portal');
});

test('merged document size accounts for references retained from older-client saves', async () => {
  const initial = { ...baseData({ businessAccounts: Array.from({ length: 100 }, (_, i) => account({ id: `account-${i}`, notes: 'x'.repeat(2000) })) }), rev: 1 };
  const data = baseData({ settings: { padding: 'x'.repeat(750000) } });
  assert.ok(Buffer.byteLength(JSON.stringify(data)) < 900000);
  assert.ok(Buffer.byteLength(JSON.stringify({ ...data, businessAccounts: initial.businessAccounts })) > 900000);
  const loaded = loadHandler(initial);
  const response = await loaded.request({ action: 'save', baseRev: 1, data });
  assert.equal(response.statusCode, 413);
  assert.equal(loaded.calls.writes, 0);
  assert.deepEqual(loaded.stored(), initial);
});

test('unauthorized reads and writes cannot access account usernames or notes', async () => {
  const initial = { ...baseData({ businessAccounts: [account()] }), rev: 1 };
  const loaded = loadHandler(initial);
  for (const body of [{ action: 'get' }, { action: 'save', baseRev: 1, data: baseData({ businessAccounts: [] }) }]) {
    const response = await loaded.request(body, 'wrong-token');
    assert.equal(response.statusCode, 401);
    assert.doesNotMatch(response.body, /owner@example|Synthetic reference/);
  }
  assert.equal(loaded.calls.reads, 0);
  assert.equal(loaded.calls.writes, 0);
  assert.deepEqual(loaded.stored(), initial);
});

// Load the browser's pure helpers in memory to check migration/backup behavior
// against the server validator. No browser, network, or real data is involved.
const frontendCache = new Map();
function loadFrontend(relative) {
  const file = path.resolve(__dirname, '..', relative);
  if (frontendCache.has(file)) return frontendCache.get(file);
  const result = { exports: {} };
  frontendCache.set(file, result.exports);
  const code = require('@babel/core').transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  new Function('require', 'module', 'exports', code)(name => {
    if (!name.startsWith('.')) throw new Error(`Unexpected browser helper dependency: ${name}`);
    return loadFrontend(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(file), `${name}.js`)));
  }, result, result.exports);
  frontendCache.set(file, result.exports);
  return result.exports;
}

test('fresh and legacy defaults clone portal seeds while explicit empty account lists stay empty', () => {
  const { defaultData, normalizeData } = loadFrontend('src/components/billing/billing-lib.js');
  const first = defaultData();
  const second = defaultData();
  assert.equal(first.businessAccounts.length, 2);
  assert.equal(validBusinessAccounts(first.businessAccounts), true);
  first.businessAccounts[0].name = 'Only this copy';
  assert.notEqual(second.businessAccounts[0].name, 'Only this copy');
  assert.notEqual(normalizeData(baseData()).businessAccounts[0].name, 'Only this copy');
  assert.deepEqual(normalizeData(baseData({ businessAccounts: [] })).businessAccounts, []);
});

test('backup account normalization and validation produce server-compatible records', () => {
  const { normalizeData, validBackup } = loadFrontend('src/components/billing/billing-lib.js');
  const imported = baseData({ businessAccounts: [account({ url: 'HTTPS://EXAMPLE.COM', name: ' Example portal ' })] });
  assert.equal(validBackup(imported), true);
  const normalized = normalizeData(imported);
  assert.equal(validBusinessAccounts(normalized.businessAccounts), true);
  assert.equal(normalized.businessAccounts[0].url, 'https://example.com/');
  assert.equal(validBackup(baseData()), true);
  assert.equal(validBackup(baseData({ businessAccounts: [] })), true);
  for (const businessAccounts of [
    [account({ url: 'javascript:alert(1)' })], [account(), account()],
    [account({ password: 'DO_NOT_IMPORT' })], [account({ pinned: 'true' })],
  ]) assert.equal(validBackup(baseData({ businessAccounts })), false);
});
