const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const review = (overrides = {}) => ({
  treatment: 'taxable', taxableAmount: 1000, locationCode: '1700', locationName: 'Reviewed location',
  sourceAddress: 'Customer receipt location documented in contract', deductionReason: '',
  boClassification: 'retailing', boTaxableAmount: 1000, boDeductionReason: '', adjustmentNote: '',
  sourceFingerprint: 'invoice-source-1', reviewedAt: '2026-10-17T18:00:00.000Z', ...overrides,
});
const filing = (overrides = {}) => ({
  id: 'filing-1', periodKey: '2026-Q3', frequency: 'quarterly', basis: 'cash',
  filedDate: '2026-11-02', confirmation: 'TEST-CONFIRMATION', salesTax: 100, boTax: 4.71, otherTax: 0,
  note: 'Test filing record', createdAt: '2026-11-02T18:00:00.000Z',
  snapshot: {
    fingerprint: 'worksheet-1', gross: 1000, recordedTax: 100, taxableSales: 1000, expectedTax: 100,
    locationRows: [{ locationCode: '1700', locationName: 'Reviewed location', rate: 10,
      taxableSales: 1000, recordedTax: 100, expectedTax: 100, stateTax: 65, localTax: 35 }],
    boRows: [{ classification: 'retailing', gross: 1000, taxableGross: 1000, deductions: 0 }],
    reviewCount: 1, issues: [],
  }, ...overrides,
});
const baseData = (overrides = {}) => ({ settings: {}, entries: [], invoices: [], ...overrides });
const existingData = (overrides = {}) => ({
  ...baseData(), rev: 7, dorInvoiceReviews: { 'invoice-1': review() }, dorFilings: [filing()],
  taxSettings: {
    waBasis: 'cash', waDueOverrides: { '2026-Q3': { date: '2026-11-12', note: 'Test approved extension evidence' } },
    federalSetAsidePct: 25,
  }, ...overrides,
});

// No real Firebase configuration or network is available inside this VM.
// Transactions stage their writes and commit only after the callback succeeds.
function loadHandler(initial, { failRead = false } = {}) {
  let stored = clone(initial);
  const calls = { reads: 0, writes: 0, transactions: 0, logs: [] };
  const snapshot = () => ({ exists: stored !== undefined, data: () => clone(stored) });
  const read = async () => {
    calls.reads += 1;
    if (failRead) throw new Error('PRIVATE_BACKEND_DETAILS');
    return snapshot();
  };
  const ref = { get: read };
  const firestore = () => ({
    collection: name => {
      assert.equal(name, 'billing');
      return { doc: id => { assert.equal(id, 'main'); return ref; } };
    },
    runTransaction: async callback => {
      calls.transactions += 1;
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
  const sandbox = {
    module: output, exports: output.exports, Buffer, JSON,
    process: { env: { RAG_ADMIN_KEY: 'mock-owner-token' } },
    console: { error: (...args) => calls.logs.push(args.map(String).join(' ')) },
    require: name => {
      if (name === 'crypto') return require('node:crypto');
      if (name === 'firebase-admin') return { apps: [{}], firestore };
      if (name === './lib/dor-validation') return require('../netlify/functions/lib/dor-validation');
      if (name === './lib/business-accounts-validation') return require('../netlify/functions/lib/business-accounts-validation');
      if (name === './lib/tax-workspace-validation') return require('../netlify/functions/lib/tax-workspace-validation');
      throw new Error(`Unexpected dependency: ${name}`);
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../netlify/functions/billing-admin.js'), 'utf8'), sandbox);
  const request = async (body, token = 'mock-owner-token') => {
    const response = await output.exports.handler({
      httpMethod: 'POST', headers: { authorization: `Bearer ${token}`, 'x-nf-client-connection-ip': '192.0.2.1' },
      body: JSON.stringify(body),
    });
    return { ...response, json: JSON.parse(response.body) };
  };
  return { request, calls, stored: () => clone(stored) };
}

test('DOR invoice reviews, filing records, and explicit tax settings survive save/get roundtrip', async () => {
  const loaded = loadHandler();
  const data = baseData({
    dorInvoiceReviews: { 'invoice-1': review() }, dorFilings: [filing()],
    taxSettings: { waBasis: 'accrual', waDueOverrides: { '2026-Q3': { date: '2026-11-12', note: 'Approved extension recorded by owner' } } },
  });
  const saved = await loaded.request({ action: 'save', data, baseRev: 0 });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json.rev, 1);
  assert.deepEqual(saved.json.dorFilings, data.dorFilings);
  const result = await loaded.request({ action: 'get' });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.json.data.dorInvoiceReviews, data.dorInvoiceReviews);
  assert.deepEqual(result.json.data.dorFilings, data.dorFilings);
  assert.deepEqual(result.json.data.taxSettings, data.taxSettings);
  assert.equal(loaded.calls.writes, 1);
});

test('legacy documents read with empty DOR defaults', async () => {
  const result = await loadHandler({ ...baseData(), rev: 2 }).request({ action: 'get' });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.json.data.dorInvoiceReviews, {});
  assert.deepEqual(result.json.data.dorFilings, []);
});

test('older clients omitting DOR fields preserve reviews, filings, basis, and due-date overrides', async () => {
  for (const taxSettings of [undefined, { federalSetAsidePct: 30 }]) {
    const initial = existingData();
    const loaded = loadHandler(initial);
    const data = baseData(taxSettings === undefined ? {} : { taxSettings });
    const response = await loaded.request({ action: 'save', data, baseRev: 7 });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json.dorFilings, initial.dorFilings);
    const persisted = loaded.stored();
    assert.deepEqual(persisted.dorInvoiceReviews, initial.dorInvoiceReviews);
    assert.deepEqual(persisted.dorFilings, initial.dorFilings);
    assert.equal(persisted.taxSettings.waBasis, initial.taxSettings.waBasis);
    assert.deepEqual(persisted.taxSettings.waDueOverrides, initial.taxSettings.waDueOverrides);
  }
});

test('an explicit review reset can clear reviews while an empty filing array cannot erase history', async () => {
  const initial = existingData();
  const loaded = loadHandler(initial);
  const response = await loaded.request({ action: 'save', baseRev: 7, data: baseData({ dorInvoiceReviews: {}, dorFilings: [] }) });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(loaded.stored().dorInvoiceReviews, {});
  assert.deepEqual(loaded.stored().dorFilings, initial.dorFilings);
});

test('filing saves append new IDs and preserve omitted historical records', async () => {
  const initial = existingData();
  const loaded = loadHandler(initial);
  const added = filing({ id: 'filing-2', periodKey: '2026-Q4', filedDate: '2027-02-01', confirmation: 'SECOND-CONFIRMATION' });
  const response = await loaded.request({ action: 'save', baseRev: 7, data: baseData({ dorFilings: [added] }) });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json.dorFilings, [initial.dorFilings[0], added]);
  assert.deepEqual(loaded.stored().dorFilings, [initial.dorFilings[0], added]);
  assert.equal(loaded.stored().rev, 8);
});

test('replaying the same filing with reordered object keys is idempotent', async () => {
  const initial = existingData();
  const loaded = loadHandler(initial);
  const reversed = Object.fromEntries(Object.entries(initial.dorFilings[0]).reverse());
  reversed.snapshot = Object.fromEntries(Object.entries(reversed.snapshot).reverse());
  const response = await loaded.request({ action: 'save', baseRev: 7, data: baseData({ dorFilings: [reversed] }) });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(loaded.stored().dorFilings, initial.dorFilings);
});

test('saved filing payloads are immutable even when force overwrite is requested', async () => {
  for (const force of [false, true]) {
    const initial = existingData();
    const loaded = loadHandler(initial);
    const changed = filing({ salesTax: 101, note: 'PRIVATE_CHANGED_NOTE' });
    const response = await loaded.request({ action: 'save', baseRev: 7, force, data: baseData({ dorFilings: [changed] }) });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json.code, 'DOR_FILING_IMMUTABLE');
    assert.doesNotMatch(response.body, /PRIVATE_CHANGED_NOTE|TEST-CONFIRMATION/);
    assert.deepEqual(loaded.stored(), initial);
    assert.equal(loaded.calls.writes, 0);
  }
});

test('revision conflicts still require explicit force and a successful overwrite increments current revision', async () => {
  const initial = existingData();
  const loaded = loadHandler(initial);
  const data = baseData({ dorInvoiceReviews: { 'invoice-1': review({ adjustmentNote: 'Reviewed again' }) } });
  const conflict = await loaded.request({ action: 'save', baseRev: 6, data });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.json.rev, 7);
  assert.equal(loaded.calls.writes, 0);
  assert.deepEqual(loaded.stored(), initial);
  const forced = await loaded.request({ action: 'save', baseRev: 6, force: true, data });
  assert.equal(forced.statusCode, 200);
  assert.equal(forced.json.rev, 8);
  assert.deepEqual(forced.json.dorFilings, initial.dorFilings);
  assert.equal(loaded.stored().dorInvoiceReviews['invoice-1'].adjustmentNote, 'Reviewed again');
  assert.deepEqual(loaded.stored().dorFilings, initial.dorFilings);
});

test('invalid nested review fields fail with 400 and never reach a write', async () => {
  const invalidReviews = [
    [], { 'invoice-1': review({ treatment: 'guess' }) }, { 'invoice-1': review({ taxableAmount: -1 }) },
    { 'invoice-1': review({ taxableAmount: 1.001 }) }, { 'invoice-1': review({ taxableAmount: '1000' }) },
    { 'invoice-1': review({ locationCode: '123' }) }, { 'invoice-1': review({ locationCode: 'ABCD' }) },
    { 'invoice-1': review({ boClassification: 'unknown' }) }, { 'invoice-1': review({ boTaxableAmount: -1 }) },
    { 'invoice-1': review({ sourceFingerprint: '' }) }, { 'invoice-1': review({ reviewedAt: 'not-a-timestamp' }) },
    { 'invoice-1': review({ sourceAddress: 'x'.repeat(2001) }) },
    { ['x'.repeat(129)]: review() }, JSON.parse('{"__proto__":' + JSON.stringify(review()) + '}'),
  ];
  for (const dorInvoiceReviews of invalidReviews) {
    const loaded = loadHandler(existingData());
    const response = await loaded.request({ action: 'save', baseRev: 7, data: baseData({ dorInvoiceReviews }) });
    assert.equal(response.statusCode, 400);
    assert.equal(loaded.calls.writes, 0);
  }
});

test('invalid filing records and duplicate IDs fail with 400 without altering history', async () => {
  const invalidFilings = [
    {}, [filing(), filing()], [filing({ id: '' })], [filing({ periodKey: '2026-Q5' })],
    [filing({ frequency: 'weekly' })], [filing({ frequency: 'annual' })],
    [filing({ basis: 'hybrid' })], [filing({ filedDate: '2026-02-30' })],
    [filing({ confirmation: '' })], [filing({ salesTax: -1 })], [filing({ boTax: 1.001 })],
    [filing({ otherTax: '0' })], [filing({ createdAt: 'yesterday' })], [filing({ note: 'x'.repeat(4001) })],
    [filing({ snapshot: { ...filing().snapshot, fingerprint: '' } })],
    [filing({ snapshot: { ...filing().snapshot, gross: -1 } })],
    [filing({ snapshot: { ...filing().snapshot, locationRows: {} } })],
    [filing({ snapshot: { ...filing().snapshot, locationRows: [{ ...filing().snapshot.locationRows[0], rate: 101 }] } })],
    [filing({ snapshot: { ...filing().snapshot, locationRows: [{ ...filing().snapshot.locationRows[0], expectedTax: -1 }] } })],
    [filing({ snapshot: { ...filing().snapshot, locationRows: [{ ...filing().snapshot.locationRows[0], locationCode: '123' }] } })],
    [filing({ snapshot: { ...filing().snapshot, boRows: [{ ...filing().snapshot.boRows[0], classification: 'unknown' }] } })],
    [filing({ snapshot: { ...filing().snapshot, boRows: [{ ...filing().snapshot.boRows[0], deductions: -1 }] } })],
    [filing({ snapshot: { ...filing().snapshot, boRows: Array.from({ length: 11 }, () => ({})) } })],
    [filing({ snapshot: { ...filing().snapshot, reviewCount: 1.5 } })],
    [filing({ snapshot: { ...filing().snapshot, issues: ['x'.repeat(2001)] } })],
  ];
  for (const dorFilings of invalidFilings) {
    const initial = existingData();
    const loaded = loadHandler(initial);
    const response = await loaded.request({ action: 'save', baseRev: 7, data: baseData({ dorFilings }) });
    assert.equal(response.statusCode, 400);
    assert.equal(loaded.calls.writes, 0);
    assert.deepEqual(loaded.stored(), initial);
  }
});

test('invalid accounting basis or undocumented/impossible due-date overrides are rejected', async () => {
  for (const taxSettings of [
    { waBasis: 'hybrid' }, { waDueOverrides: [] },
    { waDueOverrides: { '2026-Q3': { date: '2026-11-12', note: '' } } },
    { waDueOverrides: { '2026-Q3': { date: '2026-02-30', note: 'Invalid date' } } },
    { waDueOverrides: { '2026-Q5': { date: '2026-11-12', note: 'Invalid period' } } },
  ]) {
    const loaded = loadHandler(existingData());
    const response = await loaded.request({ action: 'save', baseRev: 7, data: baseData({ taxSettings }) });
    assert.equal(response.statusCode, 400);
    assert.equal(loaded.calls.writes, 0);
  }
});

test('size enforcement includes historical filings retained by the server merge', async () => {
  const initial = existingData({ dorFilings: Array.from({ length: 80 }, (_, i) => filing({ id: `filing-${i}`, note: 'x'.repeat(4000) })) });
  const loaded = loadHandler(initial);
  const data = baseData({ settings: { reportPadding: 'x'.repeat(600000) } });
  assert.ok(Buffer.byteLength(JSON.stringify(data)) < 900000);
  assert.ok(Buffer.byteLength(JSON.stringify({ ...data, dorFilings: initial.dorFilings })) > 900000);
  const response = await loaded.request({ action: 'save', baseRev: 7, data });
  assert.equal(response.statusCode, 413);
  assert.equal(loaded.calls.writes, 0);
  assert.deepEqual(loaded.stored(), initial);
});

test('unauthenticated requests do not read or write private billing data', async () => {
  const loaded = loadHandler(existingData());
  const result = await loaded.request({ action: 'get' }, 'wrong-token');
  assert.equal(result.statusCode, 401);
  assert.equal(loaded.calls.reads, 0);
  assert.equal(loaded.calls.writes, 0);
  assert.doesNotMatch(result.body, /TEST-CONFIRMATION|invoice-source-1/);
});

test('storage errors return a generic failure without exposing backend details', async () => {
  const loaded = loadHandler(existingData(), { failRead: true });
  const result = await loaded.request({ action: 'get' });
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /PRIVATE_BACKEND_DETAILS|TEST-CONFIRMATION/);
  assert.equal(loaded.calls.writes, 0);
});
