// DOR preparation helpers. These reconcile saved invoice snapshots; they do
// not classify services, change invoices, calculate B&O due, or file a return.
/* global BigInt */
import { todayISO, uid } from './billing-lib';
import { waPeriods } from './tax-lib';

export const DOR_LINKS = {
  login: 'https://secure.dor.wa.gov/home/Login',
  calendar: 'https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates',
  rates: 'https://webgis.dor.wa.gov/taxratelookup/salestax.aspx',
  software: 'https://dor.wa.gov/taxes-rates/sales-custom-software-and-customization-prewritten-software',
  bo: 'https://dor.wa.gov/taxes-rates/business-occupation-tax',
};

const FREQUENCIES = ['monthly', 'quarterly', 'annual'];
const BASES = ['cash', 'accrual'];
const TREATMENTS = ['taxable', 'deducted', 'nonretail'];
const BO_CLASSES = ['retailing', 'service', 'other'];
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v) => typeof v === 'string' ? v.trim() : '';
const unique = (values) => [...new Set(values)];
const dollars = (cents) => cents === null ? null : cents / 100;

// Reject blanks, nonfinite values, fractional cents and unsafe integers.
// All aggregation is integer cents; rates use integer millionths of a percent.
const scaled = (value, places) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  const result = Math.round(n * (10 ** places));
  return Number.isSafeInteger(result) && Math.abs(n * (10 ** places) - result) < 0.000001 ? result : null;
};
const cents = (value) => scaled(value, 2);
const rateUnits = (value) => {
  const result = scaled(value, 6);
  return result !== null && result <= 100000000 ? result : null;
};
const taxCents = (amount, rate) => {
  if (amount === null || rate === null) return null;
  const denominator = BigInt(100000000);
  return Number((BigInt(amount) * BigInt(rate) + denominator / BigInt(2)) / denominator);
};
const validDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const validTimestamp = (value) => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) && validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value));

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value === undefined ? null : value);
};

// Compact 128-bit deterministic change detector, not an authorization token or
// cryptographic signature. Server-side invoice locking is a separate concern.
const fingerprint = (prefix, value) => {
  const source = canonical(value);
  let a = 1779033703, b = 3144134277, c = 1013904242, d = 2773480762;
  for (let i = 0; i < source.length; i += 1) {
    const n = source.charCodeAt(i);
    a = b ^ Math.imul(a ^ n, 597399067);
    b = c ^ Math.imul(b ^ n, 2869860233);
    c = d ^ Math.imul(c ^ n, 951274213);
    d = a ^ Math.imul(d ^ n, 2716044179);
  }
  a = Math.imul(c ^ (a >>> 18), 597399067);
  b = Math.imul(d ^ (b >>> 22), 2869860233);
  c = Math.imul(a ^ (c >>> 17), 951274213);
  d = Math.imul(b ^ (d >>> 19), 2716044179);
  return `${prefix}:${[a ^ b ^ c ^ d, b ^ a, c ^ a, d ^ a].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('')}`;
};

export const invoiceTaxFingerprint = (invoice) => fingerprint('dor-invoice-v1', invoice);

const invoiceAmounts = (invoice) => {
  const total = cents(invoice?.total);
  const tax = cents(invoice?.tax);
  const gross = total !== null && tax !== null && total >= tax ? total - tax : null;
  return { total, tax, gross, rate: rateUnits(invoice?.taxRate) };
};

const unsupportedAdjustment = (invoice) => {
  const present = (v) => Array.isArray(v) ? v.length > 0 : object(v) ? Object.keys(v).length > 0 : !!v;
  if (['payments', 'paymentHistory', 'partialPayments', 'refunds', 'credits', 'adjustments'].some((k) => present(invoice[k]))) return true;
  if (['refundAmount', 'creditAmount', 'discount', 'discountAmount', 'adjustmentAmount'].some((k) => invoice[k] !== undefined && cents(invoice[k]) !== 0)) return true;
  return ['amountPaid', 'paidAmount'].some((key) => {
    if (invoice[key] === undefined) return false;
    const paid = cents(invoice[key]);
    return paid === null || (invoice.status === 'paid' ? paid !== cents(invoice.total) : paid > 0);
  });
};

const invoiceIssues = (invoice) => {
  const errors = [];
  const a = invoiceAmounts(invoice);
  if (!text(invoice?.id)) errors.push('Invoice ID is missing.');
  else if (invoice.id.length > 128 || ['__proto__', 'constructor', 'prototype'].includes(invoice.id)) errors.push('Invoice ID cannot be used as a review key; use an ordinary identifier of at most 128 characters.');
  if (!validDate(invoice?.dateIssued)) errors.push('Invoice issue date is missing or invalid.');
  if (invoice?.status === 'paid' && !validDate(invoice.paidDate)) errors.push('Payment date is missing or invalid.');
  if (a.gross === null) errors.push('Saved invoice total and tax must be nonnegative amounts in cents, with tax no greater than total.');
  if (invoice?.laborSubtotal !== undefined || invoice?.expensesTotal !== undefined) {
    const labor = cents(invoice.laborSubtotal);
    const expenses = cents(invoice.expensesTotal);
    if (labor === null || expenses === null || (a.gross !== null && labor + expenses !== a.gross)) errors.push('Saved labor and expense subtotals do not reconcile to the invoice gross.');
    if (invoice.taxableExpenses !== undefined && (cents(invoice.taxableExpenses) === null || (expenses !== null && cents(invoice.taxableExpenses) > expenses))) errors.push('Saved taxable expenses do not reconcile to total expenses.');
  }
  if (a.rate === null) errors.push('Saved invoice tax rate is missing or invalid.');
  if (unsupportedAdjustment(invoice || {})) errors.push('Partial payments, refunds, credits, or other adjustments require separate reconciliation; this worksheet does not allocate them.');
  return errors;
};

const reviewValues = (input) => ({
  treatment: text(input?.treatment),
  taxableAmount: dollars(cents(input?.taxableAmount)),
  locationCode: text(input?.locationCode),
  locationName: text(input?.locationName),
  sourceAddress: text(input?.sourceAddress),
  deductionReason: text(input?.deductionReason),
  boClassification: text(input?.boClassification),
  boTaxableAmount: dollars(cents(input?.boTaxableAmount)),
  boDeductionReason: text(input?.boDeductionReason),
  adjustmentNote: text(input?.adjustmentNote),
});

const reviewErrors = (invoice, review) => {
  const errors = invoiceIssues(invoice);
  const amounts = invoiceAmounts(invoice);
  const taxable = cents(review.taxableAmount);
  const boTaxable = cents(review.boTaxableAmount);
  Object.entries({ locationName: 200, sourceAddress: 2000, deductionReason: 2000, boDeductionReason: 2000, adjustmentNote: 2000 }).forEach(([key, max]) => {
    if (review[key].length > max) errors.push(`${key} must contain no more than ${max} characters.`);
  });
  if (review.locationCode && !/^\d{4}$/.test(review.locationCode)) errors.push('A supplied DOR location code must contain four digits.');
  if (!TREATMENTS.includes(review.treatment)) errors.push('Choose a sales-tax treatment.');
  if (taxable === null || (amounts.gross !== null && taxable > amounts.gross)) errors.push('Sales-taxable amount must be between zero and the invoice gross, in whole cents.');
  if (review.treatment === 'taxable') {
    if (!/^\d{4}$/.test(review.locationCode)) errors.push('A taxable sale needs a four-digit DOR location code.');
    if (!review.sourceAddress) errors.push('A taxable sale needs the reviewed destination address.');
    if (amounts.rate === null || amounts.rate < 6500000) errors.push('A taxable sale needs its original saved combined tax rate of at least 6.5%.');
  }
  if (['deducted', 'nonretail'].includes(review.treatment)) {
    if (taxable !== 0) errors.push('Deducted and nonretail sales must have a zero sales-taxable amount.');
    if (amounts.tax > 0) errors.push('The invoice recorded sales tax but this treatment is not taxable; reconcile the discrepancy without changing the saved invoice.');
  }
  if (['taxable', 'deducted'].includes(review.treatment) && (review.treatment === 'deducted' || (taxable !== null && amounts.gross !== null && taxable < amounts.gross)) && !review.deductionReason) {
    errors.push('Explain the retail sales deduction.');
  }
  if (!BO_CLASSES.includes(review.boClassification)) errors.push('Choose a B&O classification.');
  if (boTaxable === null || (amounts.gross !== null && boTaxable > amounts.gross)) errors.push('B&O taxable gross must be between zero and the invoice gross, in whole cents.');
  if (boTaxable !== null && amounts.gross !== null && boTaxable < amounts.gross && !review.boDeductionReason) errors.push('Explain the B&O deduction.');
  return unique(errors);
};

export const validateDorReview = (invoice, input) => {
  const review = reviewValues(input);
  const errors = reviewErrors(invoice, review);
  return { review: { ...review, sourceFingerprint: invoiceTaxFingerprint(invoice), reviewedAt: new Date().toISOString() }, errors };
};

export const suggestedDorPeriod = (data, today = todayISO()) => {
  const frequency = FREQUENCIES.includes(data?.taxSettings?.waFrequency) ? data.taxSettings.waFrequency : 'quarterly';
  const anchor = validDate(today) ? today : todayISO();
  const year = Number(anchor.slice(0, 4));
  const periods = [year - 1, year].flatMap((y) => waPeriods(String(y), frequency));
  const period = periods.filter((p) => p.end < anchor).pop();
  return { year: period.key.slice(0, 4), frequency, periodKey: period.key };
};

const periodFrequency = (period) => {
  if (FREQUENCIES.includes(period?.frequency)) return period.frequency;
  if (/^\d{4}-Q[1-4]$/.test(period?.key)) return 'quarterly';
  if (/^\d{4}-\d{2}$/.test(period?.key)) return 'monthly';
  if (/^\d{4}$/.test(period?.key)) return 'annual';
  return '';
};

/**
 * Totals are USD numbers derived from integer cents. gross/recordedTax include
 * all identifiable invoices in the selected basis/period. Worksheet groups and
 * expectedTax include only complete, current reviews with no discrepancies.
 * Rows with invalid amounts expose null (never silently claim a zero balance).
 * issues are blocking worksheet strings; ready is review completeness only.
 * A filing is a separate historical record, and payments do not prove filing.
 */
export const buildDorReport = (data, inputPeriod, basis = data?.taxSettings?.waBasis || 'cash') => {
  const settings = data?.taxSettings || {};
  const frequency = periodFrequency(inputPeriod);
  const period = { ...inputPeriod, frequency };
  const issues = [];
  let totalsComplete = true;
  const expectedPeriod = validDate(period.start) && frequency
    ? waPeriods(period.start.slice(0, 4), frequency).find((p) => p.key === period.key) : null;
  const validPeriod = !!expectedPeriod && period.start === expectedPeriod.start && period.end === expectedPeriod.end;
  if (!validPeriod) issues.push('Choose a valid DOR reporting period.');
  const setupConfirmed = FREQUENCIES.includes(settings.waFrequency) && settings.waFrequency === frequency && BASES.includes(settings.waBasis) && settings.waBasis === basis;
  if (!setupConfirmed) issues.push('Confirm the filing frequency and accounting basis in tax settings; this is a preview.');
  if (!BASES.includes(basis)) issues.push('Choose cash or accrual reporting.');
  const standardDue = expectedPeriod?.due || period.due || '';
  const override = settings.waDueOverrides?.[period.key];
  let due = standardDue;
  let extensionNote = '';
  if (override !== undefined) {
    if (validDate(override?.date) && text(override?.note) && (!validDate(standardDue) || override.date >= standardDue)) {
      due = override.date;
      extensionNote = text(override.note);
    } else issues.push('The due-date override needs a valid date on or after the standard deadline and a note describing the DOR confirmation.');
  }
  if (expectedPeriod) period.dueVerified = !!expectedPeriod.dueVerified;

  const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
  const idCounts = new Map();
  invoices.forEach((inv) => { if (text(inv?.id)) idCounts.set(inv.id, (idCounts.get(inv.id) || 0) + 1); });
  idCounts.forEach((count, id) => { if (count > 1) { totalsComplete = false; issues.push(`Duplicate invoice ID: ${id}.`); } });
  const rows = [];
  invoices.forEach((invoice, index) => {
    if (!object(invoice)) { totalsComplete = false; issues.push(`Invoice record ${index + 1} is invalid.`); return; }
    if (!['draft', 'sent', 'paid'].includes(invoice.status)) {
      totalsComplete = false;
      issues.push(`${invoice.number || invoice.id || `Invoice ${index + 1}`}: unsupported invoice status; review payment or adjustment handling.`);
      return;
    }
    if (invoice.status === 'draft') return;
    // Adjustment/payment dates cannot safely be assigned from the invoice's
    // original issue/paid date. Surface them before either basis/period filter,
    // including partial receipts on sent invoices and later refunds on old ones.
    if (unsupportedAdjustment(invoice)) {
      totalsComplete = false;
      issues.push(`${invoice.number || invoice.id || `Invoice ${index + 1}`}: payment history or adjustments require manual reconciliation before this period can be complete; their dates are not allocated by this worksheet.`);
    }
    if (basis === 'cash' && invoice.status !== 'paid') return;
    const date = basis === 'accrual' ? invoice.dateIssued : invoice.paidDate;
    if (!validDate(date)) {
      totalsComplete = false;
      issues.push(`${invoice.number || invoice.id || `Invoice ${index + 1}`}: missing or invalid ${basis === 'accrual' ? 'issue' : 'payment'} date prevents period allocation.`);
      return;
    }
    if (!validPeriod || date < period.start || date > period.end) return;
    const amounts = invoiceAmounts(invoice);
    if (amounts.gross === null || amounts.tax === null || unsupportedAdjustment(invoice)) totalsComplete = false;
    const saved = data?.dorInvoiceReviews?.[invoice.id];
    const review = object(saved) ? saved : null;
    const rowIssues = invoiceIssues(invoice);
    if ((idCounts.get(invoice.id) || 0) > 1) rowIssues.push('Duplicate invoice ID prevents a reliable review.');
    if (!review) rowIssues.push('Review this invoice’s tax treatment, destination, and B&O classification.');
    else {
      rowIssues.push(...reviewErrors(invoice, reviewValues(review)));
      if (review.sourceFingerprint !== invoiceTaxFingerprint(invoice)) rowIssues.push('The saved invoice changed after this review; review it again.');
      if (!validTimestamp(review.reviewedAt)) rowIssues.push('The review date is missing or invalid.');
      if (text(review.adjustmentNote)) {
        totalsComplete = false;
        rowIssues.push('This review describes an adjustment that requires manual reconciliation outside the grouped worksheet.');
      }
    }
    const taxable = review ? cents(review.taxableAmount) : null;
    const expected = review && TREATMENTS.includes(review.treatment)
      ? review.treatment === 'taxable' ? taxCents(taxable, amounts.rate) : 0 : null;
    const variance = expected !== null && amounts.tax !== null ? amounts.tax - expected : null;
    if (variance !== null && variance !== 0) rowIssues.push('Recorded sales tax differs from the reviewed amount at the original saved rate; reconcile this difference separately.');
    const row = {
      invoice, id: invoice.id || '', number: invoice.number || invoice.id || `Invoice ${index + 1}`, date,
      gross: dollars(amounts.gross), tax: dollars(amounts.tax), rate: amounts.rate === null ? null : amounts.rate / 1000000,
      review, taxableAmount: dollars(taxable), expectedTax: dollars(expected), variance: dollars(variance),
      issues: unique(rowIssues), needsReview: rowIssues.length > 0,
    };
    rows.push(row);
  });
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number) || a.id.localeCompare(b.id));
  rows.forEach((row) => issues.push(...row.issues.map((issue) => `${row.number}: ${issue}`)));
  const reviewed = rows.filter((row) => !row.needsReview);
  const sum = (items, key) => items.reduce((total, row) => total + (cents(row[key]) || 0), 0);
  const gross = dollars(sum(rows, 'gross'));
  const recordedTax = dollars(sum(rows, 'tax'));
  const taxableSales = dollars(sum(reviewed, 'taxableAmount'));
  const expectedTax = dollars(sum(reviewed, 'expectedTax'));
  const unreviewedGross = dollars(sum(rows.filter((row) => row.needsReview), 'gross'));
  const locations = new Map();
  const classifications = new Map();
  reviewed.forEach((row) => {
    const r = row.review;
    if (r.treatment === 'taxable') {
      const key = `${r.locationCode}|${row.rate}`;
      const item = locations.get(key) || { locationCode: text(r.locationCode), locationName: text(r.locationName), rate: row.rate, taxableSales: 0, recordedTax: 0, expectedTax: 0, stateTax: 0, localTax: 0 };
      const taxable = cents(row.taxableAmount);
      const expected = cents(row.expectedTax);
      const state = taxCents(taxable, 6500000);
      item.taxableSales += taxable;
      item.recordedTax += cents(row.tax);
      item.expectedTax += expected;
      item.stateTax += state;
      item.localTax += expected - state;
      locations.set(key, item);
    }
    const item = classifications.get(r.boClassification) || { classification: r.boClassification, gross: 0, taxableGross: 0, deductions: 0 };
    const rowGross = cents(row.gross);
    const boTaxable = cents(r.boTaxableAmount);
    item.gross += rowGross;
    item.taxableGross += boTaxable;
    item.deductions += rowGross - boTaxable;
    classifications.set(r.boClassification, item);
  });
  const locationRows = [...locations.values()].sort((a, b) => a.locationCode.localeCompare(b.locationCode) || a.rate - b.rate).map((row) => ({ ...row, ...Object.fromEntries(['taxableSales', 'recordedTax', 'expectedTax', 'stateTax', 'localTax'].map((key) => [key, dollars(row[key])])) }));
  const boRows = [...classifications.values()].sort((a, b) => a.classification.localeCompare(b.classification)).map((row) => ({ ...row, gross: dollars(row.gross), taxableGross: dollars(row.taxableGross), deductions: dollars(row.deductions) }));
  let paidCents = 0;
  (data?.taxPayments || []).filter((payment) => payment?.agency === 'wa' && payment.period === period.key).forEach((payment) => {
    const amount = cents(payment.amount);
    if (amount === null) issues.push('A recorded DOR payment has an invalid amount.');
    else paidCents += amount;
  });
  const allIssues = unique(issues).sort();
  const reportFingerprint = fingerprint('dor-report-v1', {
    period: { key: period.key, start: period.start, end: period.end, frequency }, basis,
    rows: rows.map((row) => ({ id: row.id, date: row.date, source: invoiceTaxFingerprint(row.invoice), review: row.review ? reviewValues(row.review) : null, issues: row.issues })),
    gross, recordedTax, taxableSales, expectedTax, locationRows, boRows, issues: allIssues,
  });
  const filings = (Array.isArray(data?.dorFilings) ? data.dorFilings : []).filter((filing) => filing?.periodKey === period.key && filing.frequency === frequency);
  const latestFiling = filings.length ? filings[filings.length - 1] : null;
  const changedSinceFiled = !!latestFiling && latestFiling.snapshot?.fingerprint !== reportFingerprint;
  const filedAmounts = latestFiling ? ['salesTax', 'boTax', 'otherTax'].map((key) => cents(latestFiling[key])) : [];
  const filingTotal = latestFiling && filedAmounts.every((value) => value !== null) ? dollars(filedAmounts.reduce((sum, value) => sum + value, 0)) : null;
  const paid = dollars(paidCents);
  const balance = filingTotal === null ? null : dollars(cents(filingTotal) - paidCents);
  const ready = setupConfirmed && validPeriod && allIssues.length === 0;
  let status = rows.length ? 'unfiled' : 'no-business-unfiled';
  if (!ready) status = 'needs-review';
  if (latestFiling) {
    status = changedSinceFiled ? 'filed-changed' : filingTotal === null ? 'filed-needs-review' : filingTotal === 0 ? 'filed-no-payment-due' : balance <= 0 ? 'filed-paid' : paid > 0 ? 'filed-partially-paid' : 'filed-unpaid';
  }
  return {
    period, basis, due, standardDue, extensionNote, setupConfirmed, rows, gross, recordedTax,
    taxableSales, expectedTax, variance: dollars(sum(rows, 'tax') - sum(reviewed, 'expectedTax')),
    unreviewedGross, locationRows, boRows, issues: allIssues, reviewCount: reviewed.length,
    ready, fingerprint: reportFingerprint, filings, latestFiling, changedSinceFiled,
    paid, filingTotal, balance, status, totalsComplete,
  };
};

// Records what the owner actually submitted, even if the worksheet had open
// issues. It never asserts that filing occurred or modifies the payment ledger.
export const createDorFiling = (report, input) => {
  const errors = [];
  if (!validDate(input?.filedDate)) errors.push('Enter the actual filing date.');
  if (!text(input?.confirmation)) errors.push('Enter the DOR filing confirmation.');
  if (text(input?.confirmation).length > 200) errors.push('Filing confirmation must contain no more than 200 characters.');
  if (text(input?.note).length > 4000) errors.push('Filing note must contain no more than 4000 characters.');
  if (!report?.setupConfirmed) errors.push('Confirm the filing frequency and accounting basis before recording an actual return.');
  if (!FREQUENCIES.includes(report?.period?.frequency) || !BASES.includes(report?.basis)) errors.push('Choose the reporting frequency and basis for the filed return.');
  const period = report?.period;
  const validPeriod = validDate(period?.start) && waPeriods(period.start.slice(0, 4), period.frequency).some((p) => p.key === period.key && p.start === period.start && p.end === period.end);
  if (!validPeriod) errors.push('Choose the reporting period for the filed return.');
  if (!Array.isArray(report?.issues) || report.issues.length > 500) errors.push('This worksheet exceeds the 500-issue filing snapshot limit. Resolve source-data issues before recording the filing; export the worksheet for reference.');
  else if (report.issues.some((issue) => typeof issue !== 'string' || issue.length > 2000)) errors.push('A worksheet issue exceeds the 2000-character filing snapshot limit. Shorten the source identifier or note before recording the filing.');
  if (!Array.isArray(report?.locationRows) || report.locationRows.length > 500) errors.push('This worksheet exceeds the 500-location filing snapshot limit. Reconcile its location/rate groups before recording the filing.');
  if (!Array.isArray(report?.boRows) || report.boRows.length > 10) errors.push('This worksheet exceeds the 10-classification filing snapshot limit. Reconcile its B&O groups before recording the filing.');
  const values = {};
  ['salesTax', 'boTax', 'otherTax'].forEach((key) => {
    const amount = cents(input?.[key]);
    if (amount === null) errors.push(`Enter an explicit nonnegative ${key === 'boTax' ? 'B&O tax' : key === 'salesTax' ? 'sales tax' : 'other tax'} amount in whole cents; enter 0 when none was submitted.`);
    values[key] = dollars(amount);
  });
  if (errors.length) return { filing: null, errors };
  const snapshot = JSON.parse(JSON.stringify({
    fingerprint: report.fingerprint, gross: report.gross, recordedTax: report.recordedTax,
    taxableSales: report.taxableSales, expectedTax: report.expectedTax,
    locationRows: report.locationRows, boRows: report.boRows, reviewCount: report.reviewCount, issues: report.issues,
  }));
  return { errors: [], filing: {
    id: uid(), periodKey: period.key, frequency: period.frequency, basis: report.basis,
    filedDate: input.filedDate, confirmation: text(input.confirmation), ...values, note: text(input.note),
    snapshot, createdAt: new Date().toISOString(),
  } };
};

// Quote every cell and neutralize spreadsheet formulas, including a leading
// whitespace/control-character prefix. These are review exports, not DOR uploads.
const csvCell = (value) => {
  let result = value === null || value === undefined ? '' : String(value);
  let start = 0;
  while (start < result.length && (result.charCodeAt(start) <= 32 || /\s/.test(result[start]))) start += 1;
  if (typeof value === 'string' && (['=', '+', '-', '@'].includes(result[start]) || /^[\t\r\n]/.test(result))) result = `'${result}`;
  return `"${result.replace(/"/g, '""')}"`;
};
const csv = (head, rows) => [head, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
const amountCell = (amount) => amount === null || amount === undefined ? '' : amount.toFixed(2);
const scope = (report) => ['Preparation worksheet — not a DOR upload file', report.period.key, report.basis];
const prefix = ['scope', 'period', 'accounting_basis'];

export const dorInvoiceCsv = (report) => csv(
  [...prefix, 'invoice', 'reporting_date', 'gross_excluding_sales_tax', 'recorded_sales_tax', 'saved_rate_percent', 'review_status', 'treatment', 'reviewed_taxable_sales', 'expected_sales_tax', 'variance', 'location_code', 'location_name', 'source_address', 'sales_deduction_reason', 'bo_classification', 'bo_taxable_gross', 'bo_deduction_reason', 'adjustment_note', 'issues'],
  report.rows.map((row) => [...scope(report), row.number, row.date, amountCell(row.gross), amountCell(row.tax), row.rate, row.needsReview ? 'Needs review — excluded from grouped lines' : 'Reviewed', row.review?.treatment, amountCell(row.taxableAmount), amountCell(row.expectedTax), amountCell(row.variance), row.review?.locationCode, row.review?.locationName, row.review?.sourceAddress, row.review?.deductionReason, row.review?.boClassification, amountCell(row.review ? dollars(cents(row.review.boTaxableAmount)) : null), row.review?.boDeductionReason, row.review?.adjustmentNote, row.issues.join(' | ')]),
);
export const dorLocationCsv = (report) => csv(
  [...prefix, 'review_scope', 'location_code', 'location_name', 'saved_rate_percent', 'taxable_sales', 'recorded_sales_tax', 'expected_sales_tax', 'state_tax_at_6_5_percent', 'local_tax_remainder'],
  report.locationRows.map((row) => [...scope(report), 'Reviewed invoices only; verify DOR rounding', row.locationCode, row.locationName, row.rate, ...['taxableSales', 'recordedTax', 'expectedTax', 'stateTax', 'localTax'].map((key) => amountCell(row[key]))]),
);
export const dorBoCsv = (report) => csv(
  [...prefix, 'review_scope', 'classification', 'gross_receipts', 'deductions', 'taxable_gross'],
  report.boRows.map((row) => [...scope(report), 'Reviewed invoices only; no B&O tax or credits calculated', row.classification, amountCell(row.gross), amountCell(row.deductions), amountCell(row.taxableGross)]),
);
