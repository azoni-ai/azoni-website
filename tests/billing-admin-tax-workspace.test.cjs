const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { validTaxWorkspace } = require('../netlify/functions/lib/tax-workspace-validation');

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const profile = (overrides = {}) => ({
  entity: 'sole-proprietor', startedOn: '2026-08-11', city: 'Example city',
  federalPlan: 'estimated', cityStatus: 'required', ...overrides,
});
const reminder = (overrides = {}) => ({
  id: 'reminder-1', title: 'Check city renewal notice', dueDate: '2026-12-31',
  category: 'license', notes: 'Synthetic reference note.\nUse the date on the notice.', completed: false, ...overrides,
});
const baseData = (overrides = {}) => ({ settings: {}, entries: [], invoices: [], ...overrides });

// No real Firebase, browser session, or network credentials are loaded.
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
      if (name === './lib/tax-workspace-validation') return require('../netlify/functions/lib/tax-workspace-validation');
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const request = async (body, token = 'mock-owner-token') => {
    const response = await output.exports.handler({ httpMethod: 'POST',
      headers: { authorization: `Bearer ${token}`, 'x-nf-client-connection-ip': '192.0.2.3' }, body: JSON.stringify(body) });
    return { ...response, json: JSON.parse(response.body) };
  };
  return { request, calls, stored: () => clone(stored) };
}

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

test('authenticated tax workspace roundtrip stores setup and reminders without inventing payments or filings', async () => {
  const loaded = loadHandler();
  const taxReminders = [reminder(), reminder({ id: 'reminder-2', category: 'city-tax', completed: true })];
  const data = baseData({ taxProfile: profile(), taxReminders });
  const saved = await loaded.request({ action: 'save', baseRev: 0, data });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json.rev, 1);
  assert.deepEqual(saved.json.dorFilings, []);
  const result = await loaded.request({ action: 'get' });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.json.data.taxProfile, data.taxProfile);
  assert.deepEqual(result.json.data.taxReminders, taxReminders);
  assert.deepEqual(result.json.data.taxPayments, []);
  assert.deepEqual(result.json.data.dorFilings, []);
  assert.deepEqual(result.json.data.taxChecklist, {});
});

test('legacy reads and saves seed only the owner-confirmed entity and city while leaving reminders absent', async () => {
  const loaded = loadHandler({ ...baseData(), rev: 2 });
  const before = await loaded.request({ action: 'get' });
  const confirmed = { entity: 'sole-proprietor', city: 'Kent', startedOn: '', federalPlan: 'unknown', cityStatus: 'unknown' };
  assert.deepEqual(before.json.data.taxProfile, confirmed);
  assert.equal(loaded.calls.writes, 0);
  assert.equal(Object.hasOwn(before.json.data, 'taxReminders'), false);
  assert.equal((await loaded.request({ action: 'save', baseRev: 2, data: baseData() })).statusCode, 200);
  const after = await loaded.request({ action: 'get' });
  assert.deepEqual(after.json.data.taxProfile, confirmed);
  assert.deepEqual(loaded.stored().taxProfile, confirmed);
  assert.equal(Object.hasOwn(after.json.data, 'taxReminders'), false);
});

test('older clients preserve omitted setup and reminders, including on an explicit forced save', async () => {
  const initial = { ...baseData({ taxProfile: profile(), taxReminders: [reminder()] }), rev: 4 };
  const loaded = loadHandler(initial);
  const response = await loaded.request({ action: 'save', baseRev: 3, force: true, data: baseData() });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(loaded.stored().taxProfile, initial.taxProfile);
  assert.deepEqual(loaded.stored().taxReminders, initial.taxReminders);
  assert.equal(loaded.stored().rev, 5);
});

test('explicit empty reminders clear the list while an omitted profile is retained', async () => {
  const loaded = loadHandler({ ...baseData({ taxProfile: profile(), taxReminders: [reminder()] }), rev: 3 });
  assert.equal((await loaded.request({ action: 'save', baseRev: 3, data: baseData({ taxReminders: [] }) })).statusCode, 200);
  assert.deepEqual(loaded.stored().taxReminders, []);
  const result = await loaded.request({ action: 'get' });
  assert.deepEqual(result.json.data.taxReminders, []);
  assert.deepEqual(result.json.data.taxProfile, profile());
});

test('unknown setup can be explicitly restored without erasing owner-entered reminders', async () => {
  const { defaultTaxProfile } = loadFrontend('src/components/billing/billing-lib.js');
  const loaded = loadHandler({ ...baseData({ taxProfile: profile(), taxReminders: [reminder()] }), rev: 1 });
  const response = await loaded.request({ action: 'save', baseRev: 1, data: baseData({ taxProfile: defaultTaxProfile() }) });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(loaded.stored().taxProfile, defaultTaxProfile());
  assert.deepEqual(loaded.stored().taxReminders, [reminder()]);
  assert.deepEqual((await loaded.request({ action: 'get' })).json.data.taxProfile, defaultTaxProfile());
});

test('invalid setup and unrecognized fields are rejected by both server and backup validation', async () => {
  const { validBackup, validTaxWorkspace: browserValid } = loadFrontend('src/components/billing/billing-lib.js');
  const invalid = [null, [], {}, 'unknown', profile({ entity: 'llc' }), profile({ entity: null }),
    profile({ federalPlan: 'none' }), profile({ cityStatus: true }), profile({ city: 'x'.repeat(121) }),
    profile({ city: 1 }), profile({ city: 'Example\u0000city' }), profile({ password: 'PRIVATE-SECRET' }),
    ...['2026-02-29', '2026-04-31', '2026-1-01', '2026-13-01', '2026-00-00', '2026-10-17T00:00:00Z', '1899-12-31', '2201-01-01', null].map(startedOn => profile({ startedOn })),
  ];
  for (const taxProfile of invalid) {
    const data = baseData({ taxProfile });
    assert.equal(validTaxWorkspace(data), false);
    assert.equal(browserValid(data), false);
    assert.equal(validBackup(data), false);
    const loaded = loadHandler();
    const result = await loaded.request({ action: 'save', data });
    assert.equal(result.statusCode, 400);
    assert.equal(loaded.calls.writes, 0);
    assert.doesNotMatch(result.body, /PRIVATE-SECRET/);
  }
});

test('reminders reject duplicate or reserved IDs, invalid dates and types, unsupported fields, and size excess', async () => {
  const { validBackup, validTaxWorkspace: browserValid } = loadFrontend('src/components/billing/billing-lib.js');
  const invalid = [null, {}, [null], [reminder(), reminder()], [reminder(), reminder({ id: ' reminder-1 ' })],
    ...['', ' ', '__proto__', 'constructor', 'prototype', ' Constructor ', 'x'.repeat(129)].map(id => [reminder({ id })]),
    [reminder({ title: '' })], [reminder({ title: 'x'.repeat(161) })], [reminder({ notes: 'x'.repeat(2001) })],
    [reminder({ notes: null })], [reminder({ title: 'No\u0007control' })], [reminder({ category: 'federal' })],
    [reminder({ completed: 'true' })], [reminder({ amount: 100 })], [reminder({ password: 'PRIVATE-SECRET' })],
    ...['', '2026-02-29', '2026-11-31', '2026-1-1', 'tomorrow', '0000-01-01', '2201-01-01', null].map(dueDate => [reminder({ dueDate })]),
    Array.from({ length: 201 }, (_, i) => reminder({ id: `reminder-${i}` })),
  ];
  for (const taxReminders of invalid) {
    const data = baseData({ taxReminders });
    assert.equal(validTaxWorkspace(data), false);
    assert.equal(browserValid(data), false);
    assert.equal(validBackup(data), false);
    const loaded = loadHandler();
    assert.equal((await loaded.request({ action: 'save', data })).statusCode, 400);
    assert.equal(loaded.calls.writes, 0);
  }
});

test('schema boundaries and all supported profile and reminder options are accepted consistently', async () => {
  const { validBackup, validTaxWorkspace: browserValid } = loadFrontend('src/components/billing/billing-lib.js');
  const entities = ['unknown', 'sole-proprietor', 's-corp', 'c-corp', 'partnership'];
  const federalPlans = ['unknown', 'estimated', 'withholding', 'adviser'];
  const cityStatuses = ['unknown', 'required', 'not-required'];
  const categories = ['city-tax', 'license', 'annual-filing', 'other'];
  for (let i = 0; i < entities.length; i += 1) {
    const data = baseData({ taxProfile: profile({ entity: entities[i], federalPlan: federalPlans[i % federalPlans.length],
      cityStatus: cityStatuses[i % cityStatuses.length], city: 'c'.repeat(120), startedOn: ['1900-01-01', '2000-02-29', '2028-02-29', '2200-12-31', ''][i] }),
    taxReminders: Array.from({ length: 200 }, (_, index) => reminder({ id: `r-${index}`,
      category: categories[index % categories.length], completed: index % 2 === 0 })) });
    data.taxReminders[0] = reminder({ id: 'i'.repeat(128), title: 't'.repeat(160), notes: 'n'.repeat(2000), dueDate: '2028-02-29' });
    assert.equal(validTaxWorkspace(data), true);
    assert.equal(browserValid(data), true);
    assert.equal(validBackup(data), true);
    const loaded = loadHandler();
    assert.equal((await loaded.request({ action: 'save', data })).statusCode, 200);
    assert.deepEqual(loaded.stored().taxReminders, data.taxReminders);
  }
});

test('stale revision cannot overwrite private tax setup or completed reminders', async () => {
  const initial = { ...baseData({ taxProfile: profile(), taxReminders: [reminder({ completed: true })] }), rev: 5 };
  const loaded = loadHandler(initial);
  const response = await loaded.request({ action: 'save', baseRev: 4,
    data: baseData({ taxProfile: profile({ cityStatus: 'unknown' }), taxReminders: [] }) });
  assert.equal(response.statusCode, 409);
  assert.equal(loaded.calls.writes, 0);
  assert.deepEqual(loaded.stored(), initial);
});

test('retained reminders count toward the document size limit before a legacy save commits', async () => {
  const initial = { ...baseData({ taxReminders: Array.from({ length: 200 }, (_, i) => reminder({ id: `reminder-${i}`, notes: 'x'.repeat(2000) })) }), rev: 1 };
  const data = baseData({ settings: { padding: 'x'.repeat(600000) } });
  assert.ok(Buffer.byteLength(JSON.stringify(data)) < 900000);
  assert.ok(Buffer.byteLength(JSON.stringify({ ...data, taxReminders: initial.taxReminders })) > 900000);
  const loaded = loadHandler(initial);
  assert.equal((await loaded.request({ action: 'save', baseRev: 1, data })).statusCode, 413);
  assert.equal(loaded.calls.writes, 0);
  assert.deepEqual(loaded.stored(), initial);
});

test('unauthorized requests cannot read or change private tax details', async () => {
  const initial = { ...baseData({ taxProfile: profile(), taxReminders: [reminder()] }), rev: 1 };
  const loaded = loadHandler(initial);
  for (const body of [{ action: 'get' }, { action: 'save', baseRev: 1, data: baseData({ taxReminders: [] }) }]) {
    const result = await loaded.request(body, 'wrong-token');
    assert.equal(result.statusCode, 401);
    assert.doesNotMatch(result.body, /Example city|Synthetic reference|2026-08-11/);
  }
  assert.equal(loaded.calls.reads, 0);
  assert.equal(loaded.calls.writes, 0);
  assert.deepEqual(loaded.stored(), initial);
});

test('fresh and legacy normalization defaults stay unknown, independent, and free of assumed payment records', () => {
  const { defaultData, defaultTaxProfile, normalizeData, validBackup } = loadFrontend('src/components/billing/billing-lib.js');
  const first = defaultData();
  const second = defaultData();
  const legacy = normalizeData(baseData());
  assert.deepEqual(first.taxProfile, defaultTaxProfile());
  assert.deepEqual(legacy.taxProfile, defaultTaxProfile());
  assert.deepEqual(first.taxReminders, []);
  assert.deepEqual(legacy.taxReminders, []);
  first.taxProfile.city = 'Only first copy';
  first.taxReminders.push(reminder());
  assert.equal(second.taxProfile.city, '');
  assert.deepEqual(second.taxReminders, []);
  assert.deepEqual(legacy.taxPayments, []);
  assert.deepEqual(legacy.dorFilings, []);
  assert.equal(validBackup(baseData()), true);
});

test('backup normalization keeps recorded reminder state and clones records without mutating imports', () => {
  const { normalizeData, validBackup } = loadFrontend('src/components/billing/billing-lib.js');
  const imported = baseData({ taxProfile: profile(), taxReminders: [reminder({ completed: true })] });
  assert.equal(validBackup(imported), true);
  const normalized = normalizeData(imported);
  assert.equal(validTaxWorkspace(normalized), true);
  assert.deepEqual(normalized.taxProfile, imported.taxProfile);
  assert.deepEqual(normalized.taxReminders, imported.taxReminders);
  normalized.taxProfile.city = 'Edited city';
  normalized.taxReminders[0].title = 'Edited title';
  assert.equal(imported.taxProfile.city, 'Example city');
  assert.equal(imported.taxReminders[0].title, 'Check city renewal notice');
  assert.deepEqual(normalizeData(baseData({ taxReminders: [] })).taxReminders, []);
});
