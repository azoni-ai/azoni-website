import {
  buildDorReport, createDorFiling, dorBoCsv, dorInvoiceCsv, dorLocationCsv,
  invoiceTaxFingerprint, suggestedDorPeriod, validateDorReview,
} from './dor-lib';
import { waPeriods } from './tax-lib';
import { defaultData, normalizeData } from './billing-lib';

const invoice = (extra = {}) => ({
  id: 'invoice-a', number: 'EXAMPLE-001', status: 'paid',
  dateIssued: '2026-09-30', paidDate: '2026-10-01',
  taxRate: 10.55, tax: 10.55, total: 110.55,
  laborSubtotal: Math.round(((extra.total ?? 110.55) - (extra.tax ?? 10.55)) * 100) / 100, taxableExpenses: 0, expensesTotal: 0,
  billTo: { name: 'Example customer', address: 'Example billing address' },
  ...extra,
});
const dataFor = (invoices = [], extra = {}) => ({
  invoices, taxSettings: { waFrequency: 'quarterly', waBasis: 'cash' },
  dorInvoiceReviews: {}, dorFilings: [], taxPayments: [], ...extra,
});
const period = (key = '2026-Q4', frequency = 'quarterly') => ({
  ...waPeriods(key.slice(0, 4), frequency).find((p) => p.key === key), frequency,
});
const reviewInput = (extra = {}) => ({
  treatment: 'taxable', taxableAmount: 100, locationCode: '1726',
  locationName: 'Example location', sourceAddress: 'Example destination address',
  deductionReason: '', boClassification: 'retailing', boTaxableAmount: 100,
  boDeductionReason: '', adjustmentNote: '', ...extra,
});
const reviewedData = (invoices = [invoice()], extra = {}) => {
  const data = dataFor(invoices, extra);
  data.dorInvoiceReviews = Object.fromEntries(invoices.map((inv) => {
    const gross = Math.round((inv.total - inv.tax) * 100) / 100;
    const result = validateDorReview(inv, reviewInput({ taxableAmount: gross, boTaxableAmount: gross }));
    expect(result.errors).toEqual([]);
    return [inv.id, result.review];
  }));
  return data;
};
const filingInput = (extra = {}) => ({ filedDate: '2027-01-20', confirmation: 'EXAMPLE-RETURN', salesTax: '10.55', boTax: '0', otherTax: '0', note: '', ...extra });

test('suggests the last completed quarter without confirming blank settings', () => {
  const data = dataFor([], { taxSettings: {} });
  expect(suggestedDorPeriod(data, '2026-10-17')).toEqual({ year: '2026', frequency: 'quarterly', periodKey: '2026-Q3' });
  expect(suggestedDorPeriod(data, '2026-01-01').periodKey).toBe('2025-Q4');
  expect(buildDorReport(data, period('2026-Q3'))).toMatchObject({ setupConfirmed: false, ready: false, status: 'needs-review' });
  expect(data.taxSettings).toEqual({});
  expect(suggestedDorPeriod(dataFor([], { taxSettings: { waFrequency: 'monthly' } }), '2026-01-01').periodKey).toBe('2025-12');
  expect(suggestedDorPeriod(dataFor([], { taxSettings: { waFrequency: 'annual' } }), '2026-10-17').periodKey).toBe('2025');
});

test('cash uses payment dates while accrual uses issued dates of sent and paid invoices', () => {
  const data = reviewedData([
    invoice(),
    invoice({ id: 'sent', number: 'EXAMPLE-002', status: 'sent', paidDate: null }),
    invoice({ id: 'draft', number: 'EXAMPLE-003', status: 'draft', paidDate: null }),
  ]);
  expect(buildDorReport(data, period('2026-Q3')).rows).toHaveLength(0);
  expect(buildDorReport(data, period()).rows.map((r) => r.id)).toEqual(['invoice-a']);
  data.taxSettings.waBasis = 'accrual';
  expect(buildDorReport(data, period('2026-Q3'), 'accrual').rows.map((r) => r.id)).toEqual(['invoice-a', 'sent']);
  expect(buildDorReport(data, period(), 'accrual').rows).toHaveLength(0);
});

test('period edges are inclusive and leap-day dates are validated', () => {
  const invoices = [
    invoice({ id: 'start', paidDate: '2026-10-01' }), invoice({ id: 'end', paidDate: '2026-12-31' }),
    invoice({ id: 'before', paidDate: '2026-09-30' }), invoice({ id: 'after', paidDate: '2027-01-01' }),
  ];
  expect(buildDorReport(reviewedData(invoices), period()).rows.map((r) => r.id)).toEqual(['start', 'end']);
  const bad = buildDorReport(dataFor([invoice({ paidDate: '2026-02-29' })]), period('2026-Q1'));
  expect(bad.issues.join(' ')).toMatch(/invalid payment date/);
  const leap = invoice({ dateIssued: '2024-02-29', paidDate: '2024-02-29' });
  expect(buildDorReport(reviewedData([leap]), period('2024-Q1')).rows).toHaveLength(1);
});

test('missing dates, duplicate IDs and unsupported payments cannot silently make a complete worksheet', () => {
  const data = dataFor([
    invoice({ paidDate: '' }), invoice({ id: 'same' }), invoice({ id: 'same' }),
    invoice({ id: 'partial', status: 'partially_paid' }),
  ]);
  const report = buildDorReport(data, period());
  expect(report.ready).toBe(false);
  expect(report.totalsComplete).toBe(false);
  expect(report.issues.join(' ')).toMatch(/prevents period allocation/);
  expect(report.issues.join(' ')).toMatch(/Duplicate invoice ID/);
  expect(report.issues.join(' ')).toMatch(/unsupported invoice status/);
  expect(report.locationRows).toEqual([]);
});

test('unreviewed invoices expose gross and tax but never guessed location or B&O lines', () => {
  const report = buildDorReport(dataFor([invoice()]), period());
  expect(report).toMatchObject({ gross: 100, recordedTax: 10.55, unreviewedGross: 100, taxableSales: 0, reviewCount: 0, ready: false });
  expect(report.locationRows).toEqual([]);
  expect(report.boRows).toEqual([]);
  expect(report.rows[0]).toMatchObject({ expectedTax: null, needsReview: true });
});

test('valid reviews stamp the invoice fingerprint and a timestamp without mutating the invoice', () => {
  const inv = invoice();
  const before = JSON.stringify(inv);
  const { review, errors } = validateDorReview(inv, reviewInput({ taxableAmount: '100.00', boTaxableAmount: '100' }));
  expect(errors).toEqual([]);
  expect(review.taxableAmount).toBe(100);
  expect(review.sourceFingerprint).toBe(invoiceTaxFingerprint(inv));
  expect(review.sourceFingerprint.length).toBeLessThan(128);
  expect(Number.isFinite(Date.parse(review.reviewedAt))).toBe(true);
  expect(JSON.stringify(inv)).toBe(before);
});

test.each([
  [{ treatment: '' }, /Choose a sales-tax/],
  [{ taxableAmount: '' }, /Sales-taxable amount/],
  [{ taxableAmount: 100.001 }, /whole cents/],
  [{ taxableAmount: 101 }, /invoice gross/],
  [{ taxableAmount: -1 }, /invoice gross/],
  [{ locationCode: '123' }, /four-digit/],
  [{ sourceAddress: '' }, /destination address/],
  [{ taxableAmount: 90 }, /retail sales deduction/],
  [{ boClassification: '' }, /B&O classification/],
  [{ boTaxableAmount: 50 }, /B&O deduction/],
  [{ boTaxableAmount: 'Infinity' }, /B&O taxable gross/],
])('rejects incomplete review fields %j', (changes, expected) => {
  expect(validateDorReview(invoice(), reviewInput(changes)).errors.join(' ')).toMatch(expected);
});

test('non-taxable treatments require zero taxable sales and cannot conceal collected sales tax', () => {
  const deducted = reviewInput({ treatment: 'deducted', taxableAmount: 0, deductionReason: 'Reviewed deduction', boTaxableAmount: 0, boDeductionReason: 'Reviewed B&O deduction' });
  expect(validateDorReview(invoice({ total: 100, tax: 0, taxRate: 0 }), deducted).errors).toEqual([]);
  expect(validateDorReview(invoice(), deducted).errors.join(' ')).toMatch(/recorded sales tax/);
  const nonretail = reviewInput({ treatment: 'nonretail', taxableAmount: 0, boClassification: 'service' });
  expect(validateDorReview(invoice({ total: 100, tax: 0, taxRate: 0 }), nonretail).errors).toEqual([]);
  expect(validateDorReview(invoice(), reviewInput({ treatment: 'nonretail' })).errors.join(' ')).toMatch(/zero sales-taxable/);
});

test('uses integer cents and original rates, keeping separate rows for rate changes at one location', () => {
  const data = reviewedData([
    invoice({ id: 'old', taxRate: 10, tax: 0.1, total: 1.1 }),
    invoice({ id: 'new', taxRate: 10.55, tax: 10.55, total: 110.55 }),
    invoice({ id: 'tiny', taxRate: 10.55, tax: 0.03, total: 0.33 }),
  ]);
  data.settings = { taxRate: 99 };
  const report = buildDorReport(data, period());
  expect(report).toMatchObject({ gross: 101.3, recordedTax: 10.68, expectedTax: 10.68, taxableSales: 101.3, variance: 0, ready: true });
  expect(report.locationRows).toHaveLength(2);
  expect(report.locationRows[0]).toMatchObject({ rate: 10, taxableSales: 1, expectedTax: 0.1, stateTax: 0.07, localTax: 0.03 });
  expect(report.locationRows[1]).toMatchObject({ rate: 10.55, taxableSales: 100.3, expectedTax: 10.58, stateTax: 6.52, localTax: 4.06 });
  expect(report.boRows).toEqual([{ classification: 'retailing', gross: 101.3, taxableGross: 101.3, deductions: 0 }]);
});

test('deduction amounts remain explicit and business expenses never reduce B&O gross automatically', () => {
  const inv = invoice({ tax: 5.28, total: 105.28 });
  const review = validateDorReview(inv, reviewInput({ taxableAmount: 50, deductionReason: 'Reviewed exempt amount', boTaxableAmount: 80, boDeductionReason: 'Reviewed deduction' })).review;
  const report = buildDorReport(dataFor([inv], { dorInvoiceReviews: { [inv.id]: review }, expenses: [{ amount: 999 }] }), period());
  expect(report.ready).toBe(true);
  expect(report.taxableSales).toBe(50);
  expect(report.boRows).toEqual([{ classification: 'retailing', gross: 100, taxableGross: 80, deductions: 20 }]);
  expect(report.boTax).toBeUndefined();
});

test('flags original rates below state rate and unsupported adjustments without rewriting amounts', () => {
  expect(validateDorReview(invoice({ taxRate: 5 }), reviewInput()).errors.join(' ')).toMatch(/at least 6.5/);
  for (const changes of [{ refundAmount: 1 }, { payments: [{ amount: 20 }] }, { amountPaid: 50 }]) {
    expect(validateDorReview(invoice(changes), reviewInput()).errors.join(' ')).toMatch(/separate reconciliation/);
  }
  const report = buildDorReport(dataFor([invoice({ total: 1, tax: 10 })]), period());
  expect(report.rows[0].gross).toBeNull();
  expect(report.ready).toBe(false);
  expect(report.totalsComplete).toBe(false);
  expect(validateDorReview(invoice({ laborSubtotal: 999 }), reviewInput()).errors.join(' ')).toMatch(/subtotals do not reconcile/);
});

test('tax discrepancies and changed invoice snapshots invalidate a saved review', () => {
  const data = reviewedData();
  data.invoices[0].total = 111.55;
  let report = buildDorReport(data, period());
  expect(report.rows[0].issues.join(' ')).toMatch(/changed after this review/);
  expect(report.locationRows).toEqual([]);
  const inv = invoice({ total: 111, tax: 11 });
  const review = validateDorReview(inv, reviewInput({ adjustmentNote: 'Under review' })).review;
  report = buildDorReport(dataFor([inv], { dorInvoiceReviews: { [inv.id]: review } }), period());
  expect(report.rows[0]).toMatchObject({ expectedTax: 10.55, variance: 0.45, needsReview: true });
  expect(report.ready).toBe(false);
  expect(report.rows[0].invoice.tax).toBe(11);
});

test('no-business periods remain unfiled, and a zero-dollar actual filing can be recorded', () => {
  const data = dataFor();
  const report = buildDorReport(data, period());
  expect(report).toMatchObject({ ready: true, status: 'no-business-unfiled', filingTotal: null, balance: null });
  const result = createDorFiling(report, filingInput({ salesTax: 0 }));
  expect(result.errors).toEqual([]);
  data.dorFilings.push(result.filing);
  expect(buildDorReport(data, period())).toMatchObject({ status: 'filed-no-payment-due', filingTotal: 0, balance: 0, changedSinceFiled: false });
});

test('recorded payments never imply filing and filing does not change the payment ledger', () => {
  const data = reviewedData();
  data.taxPayments = [{ agency: 'wa', period: '2026-Q4', amount: 10.55 }];
  let report = buildDorReport(data, period());
  expect(report).toMatchObject({ status: 'unfiled', paid: 10.55, filingTotal: null });
  const before = JSON.stringify(data);
  const { filing, errors } = createDorFiling(report, filingInput());
  expect(errors).toEqual([]);
  expect(JSON.stringify(data)).toBe(before);
  data.dorFilings.push(filing);
  report = buildDorReport(data, period());
  expect(report).toMatchObject({ status: 'filed-paid', paid: 10.55, filingTotal: 10.55, balance: 0 });
  data.taxPayments = [];
  expect(buildDorReport(data, period()).status).toBe('filed-unpaid');
  data.taxPayments = [{ agency: 'wa', period: '2026-Q4', amount: 1 }];
  expect(buildDorReport(data, period())).toMatchObject({ status: 'filed-partially-paid', balance: 9.55, changedSinceFiled: false });
});

test('historic filing records preserve unresolved issues and earlier snapshots', () => {
  const data = dataFor([invoice()]);
  const report = buildDorReport(data, period());
  const first = createDorFiling(report, filingInput()).filing;
  expect(first.snapshot.issues.length).toBeGreaterThan(0);
  report.issues.push('Changed report only');
  expect(first.snapshot.issues).not.toContain('Changed report only');
  data.dorFilings.push(first);
  data.dorInvoiceReviews[first.id] = {};
  data.dorInvoiceReviews['invoice-a'] = validateDorReview(data.invoices[0], reviewInput()).review;
  const changed = buildDorReport(data, period());
  expect(changed.changedSinceFiled).toBe(true);
  expect(changed.status).toBe('filed-changed');
  const second = createDorFiling(changed, filingInput({ confirmation: 'EXAMPLE-AMENDMENT' })).filing;
  data.dorFilings.push(second);
  expect(data.dorFilings[0]).toBe(first);
  expect(buildDorReport(data, period())).toMatchObject({ latestFiling: second, changedSinceFiled: false });
  data.taxSettings.waBasis = 'accrual';
  expect(buildDorReport(data, period(), 'accrual').changedSinceFiled).toBe(true);
});

test.each([
  { filedDate: '' }, { filedDate: '2026-02-30' }, { confirmation: '' },
  { salesTax: '' }, { salesTax: -1 }, { boTax: undefined }, { otherTax: 0.001 },
])('filing requires actual date/confirmation and all explicit submitted amounts %j', (changes) => {
  const result = createDorFiling(buildDorReport(dataFor(), period()), filingInput(changes));
  expect(result.filing).toBeNull();
  expect(result.errors.length).toBeGreaterThan(0);
});

test('date overrides require supporting notes and never alter standard due dates', () => {
  const data = dataFor();
  const standard = buildDorReport(data, period()).standardDue;
  data.taxSettings.waDueOverrides = { '2026-Q4': { date: '2027-02-15', note: 'Confirmed in DOR account' } };
  expect(buildDorReport(data, period())).toMatchObject({ due: '2027-02-15', standardDue: standard, extensionNote: 'Confirmed in DOR account' });
  data.taxSettings.waDueOverrides['2026-Q4'].note = '';
  const invalid = buildDorReport(data, period());
  expect(invalid.due).toBe(standard);
  expect(invalid.issues.join(' ')).toMatch(/due-date override/);
});

test('preserves verified calendar metadata and marks dates outside that calendar as unverified', () => {
  const report = buildDorReport(dataFor(), period('2026-Q3'));
  expect(report).toMatchObject({ due: '2026-11-02', standardDue: '2026-11-02', period: { dueVerified: true } });
  expect(buildDorReport(dataFor(), period('2030-Q3')).period.dueVerified).toBe(false);
});

test('fingerprints are stable across key/input order and payments, but detect content and review changes', () => {
  const inv = invoice();
  expect(invoiceTaxFingerprint(inv)).toBe(invoiceTaxFingerprint(Object.fromEntries(Object.entries(inv).reverse())));
  expect(invoiceTaxFingerprint(inv)).not.toBe(invoiceTaxFingerprint({ ...inv, billTo: { name: 'Changed' } }));
  const data = reviewedData([inv, invoice({ id: 'other' })]);
  const original = buildDorReport(data, period()).fingerprint;
  data.invoices.reverse();
  expect(buildDorReport(data, period()).fingerprint).toBe(original);
  data.dorInvoiceReviews[inv.id].reviewedAt = '2026-10-17T12:00:00Z';
  expect(buildDorReport(data, period()).fingerprint).toBe(original);
  data.dorInvoiceReviews[inv.id].sourceAddress = 'Changed destination';
  expect(buildDorReport(data, period()).fingerprint).not.toBe(original);
});

test('exports distinguish review scope and neutralize spreadsheet formulas in free text', () => {
  const inv = invoice({ number: '=HYPERLINK("example")' });
  const data = reviewedData([inv]);
  const review = data.dorInvoiceReviews[inv.id];
  review.locationName = '  +SUM(1,1)';
  review.sourceAddress = '@IMPORTDATA("example")';
  review.adjustmentNote = '\t=1+1';
  const report = buildDorReport(data, period());
  const invoices = dorInvoiceCsv(report);
  expect(invoices).toContain('Preparation worksheet — not a DOR upload file');
  expect(invoices).toContain('"\'=HYPERLINK(""example"")"');
  expect(invoices).toContain('"\'@IMPORTDATA(""example"")"');
  expect(invoices).toContain('"\'\t=1+1"');
  review.adjustmentNote = '';
  const grouped = buildDorReport(data, period());
  expect(dorLocationCsv(grouped)).toContain('"\'+SUM(1,1)"');
  expect(dorLocationCsv(grouped)).toContain('Reviewed invoices only');
  expect(dorBoCsv(grouped)).toContain('no B&O tax or credits calculated');
  expect(data.invoices[0].number).toBe('=HYPERLINK("example")');
});

test('a saved adjustment note remains visible but requires manual review outside grouped totals', () => {
  const data = reviewedData();
  const result = validateDorReview(data.invoices[0], reviewInput({ adjustmentNote: 'Manual credit needs reconciliation' }));
  expect(result.errors).toEqual([]);
  data.dorInvoiceReviews['invoice-a'] = result.review;
  const report = buildDorReport(data, period());
  expect(report).toMatchObject({ ready: false, totalsComplete: false, unreviewedGross: 100 });
  expect(report.issues.join(' ')).toMatch(/manual reconciliation/);
  expect(report.locationRows).toEqual([]);
  expect(report.boRows).toEqual([]);
});

test('preview assumptions cannot become actual filing metadata without configured setup', () => {
  const report = buildDorReport(dataFor([], { taxSettings: {} }), period());
  expect(createDorFiling(report, filingInput()).errors.join(' ')).toMatch(/Confirm the filing frequency/);
});

test('normalization preserves added review/filing/settings fields and does not classify legacy invoices', () => {
  const legacy = { settings: {}, entries: [], invoices: [invoice()] };
  const normalized = normalizeData(legacy);
  expect(normalized.dorInvoiceReviews).toEqual({});
  expect(normalized.dorFilings).toEqual([]);
  expect(normalized.taxSettings).toMatchObject({ waBasis: '', waFrequency: '', waDueOverrides: {} });
  expect(normalized.invoices).toEqual(legacy.invoices);
  const data = reviewedData();
  data.taxSettings.waDueOverrides = { '2026-Q4': { date: '2027-02-15', note: 'Confirmed extension' } };
  data.dorFilings.push(createDorFiling(buildDorReport(data, period()), filingInput()).filing);
  expect(normalizeData(JSON.parse(JSON.stringify({ ...defaultData(), ...data })))).toMatchObject(data);
});

test.each([
  { amountPaid: 50 }, { amountPaid: 110.55 }, { paidAmount: 50 },
  { payments: [{ date: '2026-09-01', amount: 50 }] },
  { partialPayments: [{ date: '2026-09-01', amount: 50 }] },
])('cash reports disclose unallocated receipts on sent invoices %j', (paymentFields) => {
  const inv = invoice({ ...paymentFields, status: 'sent', dateIssued: '2026-08-01', paidDate: null });
  const report = buildDorReport(dataFor([inv]), period('2026-Q3'));
  expect(report).toMatchObject({ ready: false, totalsComplete: false, gross: 0 });
  expect(report.rows).toEqual([]);
  expect(report.issues.join(' ')).toMatch(/manual reconciliation/);
  const draft = buildDorReport(dataFor([{ ...inv, status: 'draft' }]), period('2026-Q3'));
  expect(draft).toMatchObject({ ready: true, totalsComplete: true });
});

test('an out-of-period paid invoice refund still prevents a complete period claim', () => {
  const inv = invoice({ paidDate: '2026-06-01', refunds: [{ date: '2026-09-02', amount: 20 }] });
  const report = buildDorReport(dataFor([inv]), period('2026-Q3'));
  expect(report).toMatchObject({ ready: false, totalsComplete: false, gross: 0 });
  expect(report.issues.join(' ')).toMatch(/dates are not allocated/);
  const unpaid = invoice({ status: 'sent', paidDate: null, amountPaid: 0 });
  expect(buildDorReport(dataFor([unpaid]), period('2026-Q3')).issues).toEqual([]);
});

test('an imported extension before the standard due date is rejected without replacing the deadline', () => {
  const data = dataFor([], { taxSettings: { waBasis: 'cash', waFrequency: 'quarterly', waDueOverrides: {
    '2026-Q3': { date: '2026-10-15', note: 'Imported value' },
  } } });
  expect(buildDorReport(data, period('2026-Q3'))).toMatchObject({ due: '2026-11-02', standardDue: '2026-11-02', extensionNote: '', ready: false });
  expect(buildDorReport(data, period('2026-Q3')).issues.join(' ')).toMatch(/on or after the standard deadline/);
});

test.each([
  ['issues', Array(501).fill('Unresolved item'), /500-issue/],
  ['issues', ['x'.repeat(2001)], /2000-character/],
  ['locationRows', Array(501).fill({}), /500-location/],
  ['boRows', Array(11).fill({}), /10-classification/],
])('rejects %s snapshots beyond persistence limits before creating a filing', (field, value, expected) => {
  const report = buildDorReport(dataFor(), period());
  report[field] = value;
  const original = JSON.stringify(report);
  const result = createDorFiling(report, filingInput());
  expect(result.filing).toBeNull();
  expect(result.errors.join(' ')).toMatch(expected);
  expect(JSON.stringify(report)).toBe(original);
});

test('the maximum issue snapshot and ordinary source keys fit the persistence contract', () => {
  const report = buildDorReport(dataFor(), period());
  report.issues = Array(500).fill('Unresolved item');
  report.issues[0] = 'x'.repeat(2000);
  expect(createDorFiling(report, filingInput()).errors).toEqual([]);
  expect(validateDorReview(invoice({ id: 'x'.repeat(129) }), reviewInput()).errors.join(' ')).toMatch(/at most 128/);
  expect(validateDorReview(invoice({ id: '__proto__' }), reviewInput()).errors.join(' ')).toMatch(/review key/);
});
