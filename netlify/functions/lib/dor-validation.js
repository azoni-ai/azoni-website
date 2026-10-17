// Validate private reporting metadata without changing the invoice documents.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max, required = false) => typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
const amount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
  && value <= Number.MAX_SAFE_INTEGER / 100 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
const rate = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const day = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
};
const timestamp = value => text(value, 40, true) && /^\d{4}-\d{2}-\d{2}T/.test(value)
  && day(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
const periodKey = value => typeof value === 'string' && /^\d{4}(?:-(?:Q[1-4]|0[1-9]|1[0-2]))?$/.test(value);
const safeKey = value => text(value, 128, true) && !['__proto__', 'constructor', 'prototype'].includes(value);
const classification = value => ['retailing', 'service', 'other'].includes(value);

function validReview(review) {
  return object(review) && ['taxable', 'deducted', 'nonretail'].includes(review.treatment)
    && amount(review.taxableAmount) && text(review.locationCode, 4)
    && (!review.locationCode || /^\d{4}$/.test(review.locationCode))
    && text(review.locationName, 200) && text(review.sourceAddress, 2000)
    && text(review.deductionReason, 2000) && classification(review.boClassification)
    && amount(review.boTaxableAmount) && text(review.boDeductionReason, 2000)
    && text(review.adjustmentNote, 2000) && text(review.sourceFingerprint, 128, true)
    && timestamp(review.reviewedAt);
}

function validLocation(row) {
  return object(row) && /^\d{4}$/.test(row.locationCode || '') && text(row.locationName, 200)
    && rate(row.rate) && ['taxableSales', 'recordedTax', 'expectedTax', 'stateTax', 'localTax'].every(key => amount(row[key]));
}
function validBo(row) {
  return object(row) && classification(row.classification)
    && ['gross', 'taxableGross', 'deductions'].every(key => amount(row[key]));
}
function validFiling(filing) {
  const snapshot = filing?.snapshot;
  return object(filing) && safeKey(filing.id) && periodKey(filing.periodKey)
    && ['monthly', 'quarterly', 'annual'].includes(filing.frequency)
    && ['cash', 'accrual'].includes(filing.basis)
    && (filing.frequency === 'annual' ? /^\d{4}$/.test(filing.periodKey)
      : filing.frequency === 'quarterly' ? /^\d{4}-Q[1-4]$/.test(filing.periodKey)
        : /^\d{4}-\d{2}$/.test(filing.periodKey))
    && day(filing.filedDate) && text(filing.confirmation, 200, true)
    && ['salesTax', 'boTax', 'otherTax'].every(key => amount(filing[key]))
    && text(filing.note, 4000) && timestamp(filing.createdAt)
    && object(snapshot) && text(snapshot.fingerprint, 128, true)
    && ['gross', 'recordedTax', 'taxableSales', 'expectedTax'].every(key => amount(snapshot[key]))
    && Number.isSafeInteger(snapshot.reviewCount) && snapshot.reviewCount >= 0
    && Array.isArray(snapshot.locationRows) && snapshot.locationRows.length <= 500 && snapshot.locationRows.every(validLocation)
    && Array.isArray(snapshot.boRows) && snapshot.boRows.length <= 10 && snapshot.boRows.every(validBo)
    && Array.isArray(snapshot.issues) && snapshot.issues.length <= 500 && snapshot.issues.every(issue => text(issue, 2000));
}

function validDorFields(data) {
  if (data.dorInvoiceReviews !== undefined && (!object(data.dorInvoiceReviews)
    || Object.keys(data.dorInvoiceReviews).length > 2000
    || !Object.entries(data.dorInvoiceReviews).every(([key, value]) => safeKey(key) && validReview(value)))) return false;
  if (data.dorFilings !== undefined && (!Array.isArray(data.dorFilings) || data.dorFilings.length > 2000
    || !data.dorFilings.every(validFiling) || new Set(data.dorFilings.map(filing => filing.id)).size !== data.dorFilings.length)) return false;
  const settings = data.taxSettings;
  if (settings?.waBasis !== undefined && !['', 'cash', 'accrual'].includes(settings.waBasis)) return false;
  if (settings?.waDueOverrides !== undefined && (!object(settings.waDueOverrides)
    || Object.keys(settings.waDueOverrides).length > 200
    || !Object.entries(settings.waDueOverrides).every(([key, value]) => periodKey(key) && object(value)
      && day(value.date) && text(value.note, 2000, true)))) return false;
  return true;
}

const canonical = value => JSON.stringify(value, (_key, item) => object(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

function mergeDorFilings(current = [], incoming = []) {
  const records = new Map(current.map(filing => [filing.id, filing]));
  for (const filing of incoming) {
    const existing = records.get(filing.id);
    if (existing && canonical(existing) !== canonical(filing)) {
      const error = new Error('Recorded DOR filings cannot be changed. Add an amended filing instead.');
      error.code = 'DOR_FILING_IMMUTABLE';
      throw error;
    }
    if (!existing) records.set(filing.id, filing);
  }
  return [...records.values()];
}

module.exports = { validDorFields, mergeDorFilings };
