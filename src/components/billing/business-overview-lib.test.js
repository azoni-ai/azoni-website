import { defaultData, normalizeData } from './billing-lib';
import { buildBusinessOverview } from './business-overview-lib';
import { buildDorReport, createDorFiling, validateDorReview } from './dor-lib';
import { waPeriods } from './tax-lib';

const TODAY = '2026-10-17';
const inv = (extra = {}) => ({
  id: 'example', number: 'EXAMPLE-001', status: 'paid', dateIssued: '2026-09-01',
  paidDate: '2026-09-15', dueDate: '2026-09-16', total: 110.55, tax: 10.55,
  taxRate: 10.55, laborSubtotal: 100, expensesTotal: 0, taxableExpenses: 0,
  ...extra,
});
const confirmedData = (invoices = []) => ({
  ...defaultData(), invoices, taxSettings: { ...defaultData().taxSettings, waFrequency: 'quarterly', waBasis: 'cash' },
});
const q3 = () => ({ ...waPeriods('2026', 'quarterly').find((p) => p.key === '2026-Q3'), frequency: 'quarterly' });
function recordFiling(data, { paid = false, salesTax = 0, boTax = 0 } = {}) {
  const report = buildDorReport(data, q3());
  const result = createDorFiling(report, { filedDate: '2026-10-10', confirmation: 'LOCAL-EXAMPLE', salesTax, boTax, otherTax: 0, note: '' });
  expect(result.errors).toEqual([]);
  return { ...data, dorFilings: [result.filing], taxPayments: paid ? [{ agency: 'wa', period: '2026-Q3', amount: salesTax + boTax }] : [] };
}
const review = (invoice) => validateDorReview(invoice, {
  treatment: 'taxable', taxableAmount: 100, locationCode: '1726', locationName: 'Example location',
  sourceAddress: 'Example destination', deductionReason: '', boClassification: 'retailing', boTaxableAmount: 100, boDeductionReason: '', adjustmentNote: '',
}).review;

test('actual default and legacy states show DOR setup first without an assumed quarter or deadline', () => {
  const states = [defaultData(), { settings: {}, entries: [], invoices: [] }, normalizeData({ settings: {}, entries: [], invoices: [] })];
  states.forEach((data) => {
    const before = JSON.stringify(data);
    const overview = buildBusinessOverview(data, TODAY);
    expect(overview.nextActions[0]).toMatchObject({ id: 'dor-setup', section: 'dor', title: 'Confirm your DOR setup' });
    expect(overview.dor).toMatchObject({ configured: false, report: null, periodLabel: null, deadline: null });
    expect(overview.metrics.unbilled.amount).toBe(0);
    expect(overview.metrics.awaiting.amount).toBe(0);
    expect(overview.metrics.paid.amount).toBe(0);
    expect(JSON.stringify(data)).toBe(before);
  });
});

test('setup stays primary over overdue invoices until both frequency and basis are confirmed', () => {
  const data = confirmedData([inv({ status: 'sent', paidDate: null })]);
  data.taxSettings.waBasis = '';
  expect(buildBusinessOverview(data, TODAY).nextActions.map((action) => action.id)).toEqual(['dor-setup', 'invoices-overdue']);
  data.taxSettings.waBasis = 'cash';
  data.taxSettings.waFrequency = '';
  expect(buildBusinessOverview(data, TODAY).nextActions[0].id).toBe('dor-setup');
});

test('confirmed setup summarizes only the latest completed period and never treats an empty worksheet as filed', () => {
  const overview = buildBusinessOverview(confirmedData(), TODAY);
  expect(overview.dor).toMatchObject({ configured: true, periodLabel: 'Q3 2026', summary: 'No filing is recorded for this period.' });
  expect(overview.dor.deadline).toContain('Nov 2, 2026');
  expect(overview.dor.scope).toMatch(/other returns are not checked/);
  expect(overview.nextActions[0]).toMatchObject({ id: 'dor-unfiled', section: 'dor' });
  expect(overview.nextActions[0].detail).toMatch(/No invoices/);
});

test('overdue client invoices surface before routine DOR preparation and name the actual oldest due date', () => {
  const data = confirmedData([
    inv({ id: 'newer', number: 'EXAMPLE-002', status: 'sent', paidDate: null, dueDate: '2026-10-15' }),
    inv({ id: 'older', number: 'EXAMPLE-001', status: 'sent', paidDate: null, dueDate: '2026-10-01' }),
  ]);
  const overview = buildBusinessOverview(data, TODAY);
  expect(overview.nextActions[0]).toMatchObject({ id: 'invoices-overdue', section: 'invoices', title: 'Follow up on 2 overdue invoices' });
  expect(overview.nextActions[0].detail).toContain('EXAMPLE-001 was due Oct 1, 2026');
  expect(overview.nextActions.some((action) => action.id === 'dor-unfiled')).toBe(true);
});

test('verified overdue DOR period precedes overdue invoices, without claiming all returns are checked', () => {
  const data = confirmedData([inv({ status: 'sent', paidDate: null })]);
  const overview = buildBusinessOverview(data, '2026-11-03');
  expect(overview.nextActions[0]).toMatchObject({ id: 'dor-unfiled', tone: 'attention' });
  expect(overview.nextActions[0].scope).toMatch(/Latest completed period only/);
});

test('a filed no-business period removes the preparation action and leaves a concise recorded status', () => {
  const overview = buildBusinessOverview(recordFiling(confirmedData()), TODAY);
  expect(overview.dor.summary).toBe('Filing recorded with zero submitted tax.');
  expect(overview.dor.action).toBeNull();
  expect(overview.nextActions[0].id).toBe('log-work');
});

test('filing and payment records remain distinct in the next action', () => {
  const invoice = inv();
  const data = confirmedData([invoice]);
  data.dorInvoiceReviews[invoice.id] = review(invoice);
  const unpaid = buildBusinessOverview(recordFiling(data, { salesTax: 10.55 }), TODAY);
  expect(unpaid.nextActions[0]).toMatchObject({ id: 'dor-payment', section: 'dor' });
  expect(unpaid.dor.summary).toMatch(/no matching payment is recorded/);
  const paid = buildBusinessOverview(recordFiling(data, { salesTax: 10.55, paid: true }), TODAY);
  expect(paid.dor.action).toBeNull();
  expect(paid.dor.summary).toMatch(/matching payment records are saved for this period/);
  const paymentOnly = buildBusinessOverview({ ...data, taxPayments: [{ agency: 'wa', period: '2026-Q3', amount: 10.55 }] }, TODAY);
  expect(paymentOnly.dor.summary).toBe('No filing is recorded for this period.');
});

test('changed filing snapshots take priority over overdue invoices even when payment is recorded', () => {
  const data = recordFiling(confirmedData());
  data.invoices.push(inv(), inv({ id: 'sent', status: 'sent', paidDate: null }));
  const overview = buildBusinessOverview(data, TODAY);
  expect(overview.nextActions[0]).toMatchObject({ id: 'dor-changed', section: 'dor' });
  expect(overview.dor.summary).toMatch(/changed since the recorded filing/);
});

test('an upcoming invoice uses its saved due date, including due today, and paid invoices never become overdue actions', () => {
  const data = recordFiling(confirmedData());
  data.invoices.push(inv({ status: 'sent', paidDate: null, dateIssued: '2026-10-01', dueDate: TODAY }));
  const overview = buildBusinessOverview(data, TODAY);
  expect(overview.nextActions[0]).toMatchObject({ id: 'invoice-upcoming', title: 'EXAMPLE-001 is due today' });
  expect(overview.nextActions[0].detail).toContain('Oct 17, 2026');
  data.invoices[0] = { ...data.invoices[0], status: 'paid', paidDate: TODAY };
  expect(buildBusinessOverview(data, TODAY).nextActions.some((action) => action.id.startsWith('invoice-'))).toBe(false);
});

test('money tiles use the private ledger and selected current year, with tax inclusion explicit', () => {
  const data = confirmedData([
    inv(), inv({ id: 'prior-year', paidDate: '2025-12-31', total: 500 }),
    inv({ id: 'sent', status: 'sent', paidDate: null, total: 200 }),
    inv({ id: 'draft', status: 'draft', paidDate: null, total: 300 }),
  ]);
  data.settings.rate = 125;
  data.entries = [{ hours: 1.25 }, { hours: 2.5 }, { hours: 0 }, { hours: 10, invoiceId: 'example' }];
  const { metrics } = buildBusinessOverview(data, TODAY);
  expect(metrics.unbilled).toMatchObject({ amount: 468.75, hours: 3.75 });
  expect(metrics.awaiting).toMatchObject({ amount: 200, count: 1 });
  expect(metrics.paid).toMatchObject({ amount: 110.55, count: 1, year: '2026' });
  expect(metrics.awaiting.detail).toMatch(/includes sales tax/);
  expect(metrics.paid.detail).toMatch(/includes sales tax/);
});

test('unknown rates, missing payment dates and partial receipts do not become invented money totals', () => {
  const data = confirmedData([inv({ paidDate: null }), inv({ id: 'partial', status: 'sent', paidDate: null, amountPaid: 50 })]);
  data.entries = [{ hours: 4 }];
  data.settings.rate = 0;
  const { metrics } = buildBusinessOverview(data, TODAY);
  expect(metrics.unbilled).toMatchObject({ amount: null, hours: 4, needsRate: true, section: 'settings' });
  expect(metrics.awaiting.amount).toBeNull();
  expect(metrics.paid.amount).toBeNull();
});

test('pinned account shortcuts expose safe URLs and usernames, never notes or invented identities', () => {
  const data = confirmedData();
  data.businessAccounts = [
    { id: 'known', name: 'Example account', url: 'https://example.com/login', username: 'owner@example.com', notes: 'Do not show this note', pinned: true },
    { id: 'missing', name: 'FileLocal', url: 'https://www.filelocal-wa.gov/', username: '', pinned: true },
    { id: 'unsafe', name: 'Unsafe example', url: 'http://example.com/login', username: '', pinned: true },
    { id: 'hidden', name: 'Unpinned', url: 'https://example.com/', username: '', pinned: false },
  ];
  const overview = buildBusinessOverview(data, TODAY);
  expect(overview.accounts.pinned).toHaveLength(3);
  expect(overview.accounts.pinned[0]).toMatchObject({ href: 'https://example.com/login', displayUrl: 'example.com/login', username: 'owner@example.com' });
  expect(overview.accounts.pinned[2].href).toBeNull();
  expect(JSON.stringify(overview.accounts)).not.toContain('Do not show this note');
  expect(overview.accounts.needsUsernames).toBe(true);
  expect(overview.nextActions.some((action) => action.section === 'accounts')).toBe(false);
});

test('blank usernames stay one compact action, shortcuts are capped, and explicit empty accounts stay empty', () => {
  const data = confirmedData();
  data.businessAccounts = Array.from({ length: 100 }, (_, index) => ({ id: String(index), name: `Example ${index}`, url: 'https://example.com/', username: '', pinned: true }));
  let overview = buildBusinessOverview(data, TODAY);
  expect(overview.accounts).toMatchObject({ count: 100, needsUsernames: true });
  expect(overview.accounts.pinned).toHaveLength(4);
  expect(overview.nextActions).toHaveLength(1);
  overview = buildBusinessOverview({ ...data, businessAccounts: [] }, TODAY);
  expect(overview.accounts).toEqual({ count: 0, needsUsernames: false, pinned: [] });
  const legacy = buildBusinessOverview({ settings: {}, invoices: [], entries: [] }, TODAY);
  expect(legacy.accounts.pinned.map((account) => account.name)).toEqual(['My DOR', 'FileLocal']);
  expect(legacy.accounts.pinned.every((account) => account.username === '')).toBe(true);
});

test('unknown-year deadlines are not presented as confirmed and FileLocal gets no calculated tax deadline', () => {
  const overview = buildBusinessOverview(confirmedData(), '2030-10-17');
  expect(overview.dor.deadline).toBe('Verify this period’s deadline in My DOR');
  expect(JSON.stringify(overview.accounts)).not.toMatch(/deadline|dueDate/);
});
