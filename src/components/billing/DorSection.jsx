import React, { useEffect, useMemo, useState } from 'react';
import { downloadFile, fmtDate, money, todayISO, uid } from './billing-lib';
import { fmtRange, taxYears, waPeriods } from './tax-lib';
import {
  DOR_LINKS, buildDorReport, createDorFiling, dorBoCsv, dorInvoiceCsv,
  dorLocationCsv, invoiceTaxFingerprint, suggestedDorPeriod, validateDorReview,
} from './dor-lib';
import '../../styles/dor-admin.css';

const FREQUENCIES = [{ key: 'monthly', label: 'Monthly' }, { key: 'quarterly', label: 'Quarterly' }, { key: 'annual', label: 'Annual' }];
const BO_LABELS = { retailing: 'Retailing', service: 'Service & other activities', other: 'Other classification' };
const STATUS_LABELS = {
  'needs-review': 'Needs review', unfiled: 'Not recorded as filed', 'no-business-unfiled': 'No invoices / not filed',
  'filed-unpaid': 'Filed / payment not recorded', 'filed-partially-paid': 'Filed / partly paid',
  'filed-paid': 'Filed / paid', 'filed-no-payment-due': 'Filed / no payment due', 'filed-changed': 'Changed since filing', 'filed-needs-review': 'Filing record needs review',
};
const amount = (value) => Number.isFinite(value) ? money(value) : '\u2014';
const percent = (value) => Number.isFinite(value) ? `${value.toLocaleString('en-US', { maximumFractionDigits: 4 })}%` : '\u2014';
const asInput = (value) => value == null ? '' : String(value);
const selectedPeriod = (year, frequency) => {
  const periods = waPeriods(year, frequency);
  return [...periods].reverse().find((period) => period.end < todayISO()) || periods[0];
};

function Issues({ items, title = 'Review needed' }) {
  if (!items?.length) return null;
  return <div className="dor-issues" role="alert"><strong>{title}</strong><ul>{items.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul></div>;
}

function Field({ label, children, className = '' }) {
  return <label className={`billing-fld ${className}`}><span>{label}</span>{children}</label>;
}

function LocationTable({ rows }) {
  if (!rows?.length) return <p className="billing-hint">No reviewed taxable retail sales to group yet.</p>;
  return <div className="billing-tablewrap"><table className="billing-table dor-location-table"><thead><tr><th>Location / rate</th><th className="num">Taxable sales</th><th className="num">State tax</th><th className="num">Local tax</th><th className="num">Expected tax</th><th className="num">Recorded tax</th><th className="num">Difference</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.locationCode}-${row.rate}-${index}`}><td><strong>{row.locationCode}</strong>{row.locationName && <span className="dor-cell-note">{row.locationName}</span>}<span className="dor-cell-note">{percent(row.rate)}</span></td><td className="num">{amount(row.taxableSales)}</td><td className="num">{amount(row.stateTax)}</td><td className="num">{amount(row.localTax)}</td><td className="num">{amount(row.expectedTax)}</td><td className="num">{amount(row.recordedTax)}</td><td className="num">{Number.isFinite(row.recordedTax) && Number.isFinite(row.expectedTax) ? money(row.recordedTax - row.expectedTax) : '\u2014'}</td></tr>)}</tbody></table></div>;
}

function BoTable({ rows }) {
  if (!rows?.length) return <p className="billing-hint">B&amp;O groups appear after invoices are reviewed.</p>;
  return <div className="billing-tablewrap"><table className="billing-table"><thead><tr><th>B&amp;O classification</th><th className="num">Gross</th><th className="num">Deductions</th><th className="num">Taxable gross</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.classification}-${index}`}><td>{BO_LABELS[row.classification] || row.classification}</td><td className="num">{amount(row.gross)}</td><td className="num">{amount(row.deductions)}</td><td className="num">{amount(row.taxableGross)}</td></tr>)}</tbody></table></div>;
}

function ReviewEditor({ row, onSave, onCancel }) {
  const review = row.review || {};
  const [form, setForm] = useState(() => ({
    treatment: review.treatment || '', taxableAmount: asInput(review.taxableAmount),
    locationCode: review.locationCode || '', locationName: review.locationName || '', sourceAddress: review.sourceAddress || '',
    deductionReason: review.deductionReason || '', boClassification: review.boClassification || '',
    boTaxableAmount: asInput(review.boTaxableAmount), boDeductionReason: review.boDeductionReason || '', adjustmentNote: review.adjustmentNote || '',
  }));
  const [errors, setErrors] = useState([]);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    const result = validateDorReview(row.invoice, form);
    if (result.errors.length) { setErrors(result.errors); return; }
    const saveErrors = onSave(row.id, form);
    if (saveErrors?.length) setErrors(saveErrors);
  };
  const stale = review.sourceFingerprint && review.sourceFingerprint !== invoiceTaxFingerprint(row.invoice);
  return <form className="dor-review-editor" onSubmit={submit}>
    <div className="billing-card-head"><h4>Review {row.number || row.id}</h4><button type="button" className="billing-btn small" onClick={onCancel}>Close review</button></div>
    <p className="billing-hint">Review metadata is saved separately. The invoice and its PDF stay unchanged.</p>
    {stale && <p className="dor-warning">The invoice changed after its last review. Verify the amounts and classification again.</p>}
    <dl className="dor-invoice-facts"><div><dt>Saved pretax total</dt><dd>{amount(row.gross)}</dd></div><div><dt>Saved sales tax</dt><dd>{amount(row.tax)}</dd></div><div><dt>Original combined rate</dt><dd>{percent(row.rate)}</dd></div><div><dt>Saved invoice total</dt><dd>{amount(row.invoice?.total)}</dd></div></dl>
    {row.invoice?.billTo?.address && <p className="billing-hint dor-preserve-lines"><strong>Invoice billing address:</strong> {row.invoice.billTo.address}</p>}
    <fieldset><legend>Sales tax treatment</legend><div className="dor-form-grid">
      <Field label="Treatment"><select required value={form.treatment} onChange={(event) => { const treatment = event.target.value; setForm((current) => ({ ...current, treatment, taxableAmount: treatment === 'deducted' || treatment === 'nonretail' ? '0' : current.taxableAmount })); }}><option value="">Choose a treatment</option><option value="taxable">Taxable retail sale</option><option value="deducted">Retail sale with full deduction</option><option value="nonretail">Non-retail activity</option></select></Field>
      <Field label="Reviewed taxable sales ($)"><input type="number" step="0.01" min="0" required value={form.taxableAmount} onChange={change('taxableAmount')} /></Field>
      <Field label="Location code (4 digits)"><input inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={form.locationCode} onChange={change('locationCode')} required={form.treatment === 'taxable'} autoComplete="off" /></Field>
      <Field label="Location name (optional)"><input maxLength={200} value={form.locationName} onChange={change('locationName')} /></Field>
      <Field label="Verified sourcing address" className="dor-span-all"><textarea rows={2} maxLength={2000} value={form.sourceAddress} onChange={change('sourceAddress')} required={form.treatment === 'taxable'} /></Field>
      <Field label="Sales-tax deduction / non-retail reason" className="dor-span-all"><input maxLength={2000} value={form.deductionReason} onChange={change('deductionReason')} /></Field>
    </div><p className="billing-hint">Use the applicable destination and period when checking the <a href={DOR_LINKS.rates} target="_blank" rel="noopener noreferrer">DOR rate lookup</a>. Expected tax uses the original invoice rate.</p></fieldset>
    <fieldset><legend>B&amp;O treatment</legend><div className="dor-form-grid">
      <Field label="B&O classification"><select required value={form.boClassification} onChange={change('boClassification')}><option value="">Choose a classification</option>{Object.entries(BO_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      <Field label="B&O taxable gross ($)"><input type="number" step="0.01" min="0" required value={form.boTaxableAmount} onChange={change('boTaxableAmount')} /></Field>
      <Field label="B&O deduction reason, if below pretax gross" className="dor-span-all"><input maxLength={2000} value={form.boDeductionReason} onChange={change('boDeductionReason')} /></Field>
    </div><p className="billing-hint">Classify B&amp;O separately from sales tax. Calculate rates and applicable credits in My DOR.</p></fieldset>
    <Field label="Adjustment or unresolved issue" className="dor-span-all"><textarea rows={2} maxLength={2000} value={form.adjustmentNote} onChange={change('adjustmentNote')} placeholder="Refund, partial payment, correction, or other item requiring manual review" /></Field>
    <p className="billing-hint">An adjustment note flags this invoice for manual review; it does not change reported amounts.</p>
    <Issues items={errors} title="Review could not be saved" />
    <div className="billing-actions dor-form-actions"><button className="billing-btn primary" type="submit">Save invoice review</button><button className="billing-btn" type="button" onClick={onCancel}>Cancel</button></div>
  </form>;
}

function FilingRecord({ filing, latest }) {
  const snapshot = filing.snapshot || {};
  const total = [filing.salesTax, filing.boTax, filing.otherTax].every(Number.isFinite) ? filing.salesTax + filing.boTax + filing.otherTax : null;
  return <details className="dor-history-record" open={latest}>
    <summary><span>{fmtDate(filing.filedDate)}{latest ? ' / Latest record' : ''}</span><strong>{amount(total)}</strong></summary>
    <p className="billing-hint">Confirmation: <strong>{filing.confirmation || 'Not recorded'}</strong></p>
    <dl className="dor-invoice-facts"><div><dt>Submitted sales tax</dt><dd>{amount(filing.salesTax)}</dd></div><div><dt>Submitted B&amp;O tax</dt><dd>{amount(filing.boTax)}</dd></div><div><dt>Submitted other tax</dt><dd>{amount(filing.otherTax)}</dd></div><div><dt>Snapshot pretax gross</dt><dd>{amount(snapshot.gross)}</dd></div></dl>
    {filing.note && <p className="billing-hint dor-preserve-lines">{filing.note}</p>}
    <details className="dor-snapshot"><summary>Worksheet captured with this filing</summary><p className="billing-hint">{snapshot.reviewCount ?? 0} invoices reviewed. Taxable sales: {amount(snapshot.taxableSales)}. Recorded tax: {amount(snapshot.recordedTax)}. Expected tax: {amount(snapshot.expectedTax)}.</p><LocationTable rows={snapshot.locationRows} /><BoTable rows={snapshot.boRows} /><Issues items={snapshot.issues} title="Issues recorded with this snapshot" /></details>
  </details>;
}

function FilingForm({ report, data, mutate, onNotice }) {
  const [form, setForm] = useState({ filedDate: '', confirmation: '', salesTax: '', boTax: '', otherTax: '', note: '' });
  const [alreadyFiled, setAlreadyFiled] = useState(false);
  const [errors, setErrors] = useState([]);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    if (!alreadyFiled) { setErrors(['Confirm this return has already been filed in My DOR.']); return; }
    if (!report.setupConfirmed) { setErrors(['Confirm your assigned DOR frequency and reporting basis before recording a filing.']); return; }
    let result;
    mutate((current) => {
      const currentReport = buildDorReport(current, report.period, report.basis);
      if (!currentReport.setupConfirmed) { result = { errors: ['DOR settings changed. Confirm the frequency and reporting basis before recording a filing.'] }; return current; }
      result = createDorFiling(currentReport, form);
      return result.errors.length ? current : { ...current, dorFilings: [...(current.dorFilings || []), result.filing] };
    });
    if (result.errors.length) { setErrors(result.errors); return; }
    setErrors([]); setForm({ filedDate: '', confirmation: '', salesTax: '', boTax: '', otherTax: '', note: '' }); setAlreadyFiled(false);
    onNotice('Filing record added. Payments are recorded separately.');
  };
  return <details className="dor-form-details" open={!report.latestFiling}>
    <summary>{report.latestFiling ? 'Add an amendment already filed in My DOR' : 'Record a return already filed in My DOR'}</summary>
    <form onSubmit={submit} className="dor-form-content">
      <p className="billing-hint">Enter the actual submitted amounts, including zero. This records the return; it does not file it or make a payment. {data.dorFilings?.length ? 'Earlier filing records are retained.' : ''}</p>
      <div className="dor-form-grid"><Field label="Date filed"><input type="date" required max={todayISO()} value={form.filedDate} onChange={change('filedDate')} /></Field><Field label="My DOR confirmation"><input required maxLength={200} value={form.confirmation} onChange={change('confirmation')} /></Field><Field label="Submitted sales tax ($)"><input type="number" min="0" step="0.01" required value={form.salesTax} onChange={change('salesTax')} /></Field><Field label="Submitted B&O tax ($)"><input type="number" min="0" step="0.01" required value={form.boTax} onChange={change('boTax')} /></Field><Field label="Submitted other tax ($)"><input type="number" min="0" step="0.01" required value={form.otherTax} onChange={change('otherTax')} /></Field><Field label="Filing note"><input maxLength={4000} value={form.note} onChange={change('note')} /></Field></div>
      <label className="billing-check dor-confirm"><input type="checkbox" checked={alreadyFiled} onChange={(event) => setAlreadyFiled(event.target.checked)} required />I already filed this return in My DOR.</label>
      {!report.ready && <p className="dor-warning">The worksheet still has review issues. They will be captured with this filing record.</p>}
      {!report.setupConfirmed && <p className="dor-warning">Confirm the assigned frequency and reporting basis above before recording a filing.</p>}
      <Issues items={errors} title="Filing could not be recorded" /><button type="submit" className="billing-btn primary" disabled={!report.setupConfirmed}>{report.latestFiling ? 'Add amendment record' : 'Record filed return'}</button>
    </form>
  </details>;
}

function PaymentForm({ periodKey, mutate, onNotice }) {
  const [form, setForm] = useState({ date: '', amount: '', confirmation: '', note: '' });
  const [error, setError] = useState('');
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    const paid = Math.round(Number(form.amount) * 100) / 100;
    if (!form.date || !Number.isFinite(paid) || paid <= 0) { setError('Enter the payment date and an amount greater than zero.'); return; }
    mutate((current) => ({ ...current, taxPayments: [...(current.taxPayments || []), { id: uid(), created: Date.now(), agency: 'wa', period: periodKey, date: form.date, amount: paid, confirmation: form.confirmation.trim(), note: form.note.trim() }] }));
    setError(''); setForm({ date: '', amount: '', confirmation: '', note: '' }); onNotice(`WA DOR payment added for ${periodKey}.`);
  };
  return <details className="dor-form-details"><summary>Record a WA DOR payment</summary><form className="dor-form-content" onSubmit={submit}><p className="billing-hint">For {periodKey}. Only record money already paid; filing and payment are separate.</p><div className="dor-form-grid"><Field label="Date paid"><input type="date" required max={todayISO()} value={form.date} onChange={change('date')} /></Field><Field label="Amount paid ($)"><input type="number" step="0.01" min="0.01" required value={form.amount} onChange={change('amount')} /></Field><Field label="Payment confirmation"><input maxLength={200} value={form.confirmation} onChange={change('confirmation')} /></Field><Field label="Payment note"><input maxLength={4000} value={form.note} onChange={change('note')} /></Field></div><Issues items={error ? [error] : []} title="Payment could not be recorded" /><button className="billing-btn primary" type="submit">Add payment record</button></form></details>;
}

function ExtensionForm({ period, override, mutate, onNotice }) {
  const [form, setForm] = useState({ date: override?.date || '', note: override?.note || '' });
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if ((form.date && !form.note.trim()) || (!form.date && form.note.trim())) { setError('Enter both the approved extension date and a note, or clear both.'); return; }
    if (form.note.trim().length > 2000) { setError('Keep the extension note to 2,000 characters or fewer.'); return; }
    if (form.date && form.date < period.due) { setError('An extension date cannot precede the standard deadline.'); return; }
    mutate((current) => {
      const overrides = { ...(current.taxSettings?.waDueOverrides || {}) };
      if (form.date) overrides[period.key] = { date: form.date, note: form.note.trim() };
      else delete overrides[period.key];
      return { ...current, taxSettings: { ...current.taxSettings, waDueOverrides: overrides } };
    });
    setError(''); onNotice(form.date ? 'Approved extension recorded.' : 'Extension override cleared.');
  };
  return <details className="dor-extension"><summary>{override?.date ? 'Edit recorded extension' : 'Record an approved extension'}</summary><form onSubmit={submit}><p className="billing-hint">Only enter an extension already approved by DOR. The standard deadline remains visible.</p><div className="dor-form-grid"><Field label="Approved extension date"><input type="date" min={period.due} value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></Field><Field label="Approval / extension note"><input maxLength={2000} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} /></Field></div><Issues items={error ? [error] : []} /><button type="submit" className="billing-btn small">Save extension details</button></form></details>;
}

export default function DorSection({ data, mutate }) {
  const [selection, setSelection] = useState(() => suggestedDorPeriod(data));
  const [previewBasis, setPreviewBasis] = useState(data.taxSettings?.waBasis || 'cash');
  const [setup, setSetup] = useState({ waFrequency: data.taxSettings?.waFrequency || '', waBasis: data.taxSettings?.waBasis || '' });
  const [setupDirty, setSetupDirty] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!setupDirty) setSetup({ waFrequency: data.taxSettings?.waFrequency || '', waBasis: data.taxSettings?.waBasis || '' }); }, [data.taxSettings, setupDirty]);
  const years = useMemo(() => [...new Set([...taxYears(data), selection.year, ...(data.invoices || []).filter((invoice) => /^\d{4}-\d{2}-\d{2}$/.test(invoice.dateIssued || '')).map((invoice) => invoice.dateIssued.slice(0, 4))])].sort().reverse(), [data, selection.year]);
  const periods = useMemo(() => waPeriods(selection.year, selection.frequency), [selection.year, selection.frequency]);
  const period = useMemo(() => ({ ...(periods.find((item) => item.key === selection.periodKey) || periods[0]), frequency: selection.frequency }), [periods, selection.periodKey, selection.frequency]);
  const report = useMemo(() => buildDorReport(data, period, previewBasis), [data, period, previewBasis]);
  const editingRow = report.rows.find((row) => row.id === editingId);
  const payments = (data.taxPayments || []).filter((payment) => payment.agency === 'wa' && payment.period === period.key).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const status = STATUS_LABELS[report.status] || 'Needs review';
  const override = data.taxSettings?.waDueOverrides?.[period.key];
  const choose = (year, frequency, periodKey) => { setSelection({ year, frequency, periodKey: periodKey || selectedPeriod(year, frequency)?.key }); setEditingId(null); setNotice(''); };
  const saveSetup = (event) => {
    event.preventDefault();
    if (!setup.waFrequency || !setup.waBasis) return;
    mutate((current) => ({ ...current, taxSettings: { ...current.taxSettings, waFrequency: setup.waFrequency, waBasis: setup.waBasis } }));
    choose(selection.year, setup.waFrequency, selection.frequency === setup.waFrequency ? period.key : undefined);
    setPreviewBasis(setup.waBasis); setSetupDirty(false); setNotice('DOR frequency and reporting basis updated.');
  };
  const saveReview = (id, form) => {
    let errors = [];
    mutate((current) => {
      const invoice = current.invoices.find((item) => item.id === id);
      if (!invoice) { errors = ['This invoice is no longer in the ledger.']; return current; }
      const result = validateDorReview(invoice, form);
      errors = result.errors;
      return errors.length ? current : { ...current, dorInvoiceReviews: { ...(current.dorInvoiceReviews || {}), [id]: result.review } };
    });
    if (!errors.length) { setEditingId(null); setNotice('Invoice review updated. Original invoice unchanged.'); }
    return errors;
  };
  const exportCsv = (kind, build) => downloadFile(`azoni-wa-dor-${period.key}-${previewBasis}-${kind}.csv`, build(report), 'text/csv;charset=utf-8');

  return <div className="dor-admin">
    {!report.setupConfirmed && <div className="dor-getting-started">
      <strong>First, confirm your DOR setup</strong>
      <p>Your DOR welcome letter lists your assigned filing frequency. Check your existing bookkeeping or accountant for cash versus accrual reporting, then save both below. Until then, the dates and totals shown here are a preview.</p>
    </div>}
    {report.setupConfirmed && <div className="dor-getting-started">
      <strong>Review invoices, file in My DOR, then record the confirmation</strong>
      <p>Use the worksheet and exports below to prepare your return. Filing and payment happen in My DOR; keep their confirmations here.</p>
    </div>}
    <section className="billing-card dor-period-card">
      <div className="billing-card-head"><h3>Washington DOR</h3><a className="billing-btn primary" href={DOR_LINKS.login} target="_blank" rel="noopener noreferrer">Open My DOR {'\u2197'}</a></div>
      <div className="dor-period-controls"><Field label="Year"><select value={selection.year} onChange={(event) => choose(event.target.value, selection.frequency)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></Field><Field label="Frequency preview"><select value={selection.frequency} onChange={(event) => choose(selection.year, event.target.value)}>{FREQUENCIES.map((frequency) => <option key={frequency.key} value={frequency.key}>{frequency.label}</option>)}</select></Field><Field label="Period"><select value={period.key} onChange={(event) => choose(selection.year, selection.frequency, event.target.value)}>{periods.map((item) => <option key={item.key} value={item.key}>{item.label} / {fmtRange(item.start, item.end)}</option>)}</select></Field><Field label="Basis preview"><select value={previewBasis} onChange={(event) => { setPreviewBasis(event.target.value); setEditingId(null); setNotice(''); }}><option value="cash">Cash / paid date</option><option value="accrual">Accrual / issued date</option></select></Field></div>
      <div className="dor-deadline"><div><span>{period.label}{period.label === selection.year ? '' : ` ${selection.year}`} &middot; {fmtRange(period.start, period.end)}</span><strong>{!report.setupConfirmed ? 'Preview deadline:' : override?.date ? 'Extended due' : 'Due'} {fmtDate(report.due)}</strong><p>Standard deadline: {fmtDate(report.standardDue || period.due)}. <a href={DOR_LINKS.calendar} target="_blank" rel="noopener noreferrer">DOR calendar {'\u2197'}</a></p>{report.extensionNote && <p>{report.extensionNote}</p>}{!period.dueVerified && <p>Verify this period&rsquo;s deadline in My DOR or the published calendar.</p>}</div><span className={`billing-pill ${report.changedSinceFiled ? 'overdue' : report.ready ? 'paid' : 'sent'}`}>{status}</span></div>
      <p className="billing-hint dor-basis-note">{previewBasis === 'cash' ? 'Cash preview includes fully paid invoices by their paid date. Partial payments need separate reconciliation.' : 'Accrual preview uses the invoice issue date as a proxy. Verify the reporting date if the right to payment or service timing differs.'} Invalid amounts are excluded from known totals.</p>
      {!report.setupConfirmed && <p className="dor-warning">Preview only. Confirm the filing frequency assigned by DOR and your reporting basis below; changing the preview does not save those settings.</p>}
      <details className="dor-setup" open={!data.taxSettings?.waFrequency || !data.taxSettings?.waBasis}><summary>DOR account settings{report.setupConfirmed ? ' / Confirmed' : ''}</summary><form onSubmit={saveSetup}><div className="dor-form-grid"><Field label="Assigned filing frequency"><select required value={setup.waFrequency} onChange={(event) => { setSetupDirty(true); setSetup((current) => ({ ...current, waFrequency: event.target.value })); }}><option value="">Confirm in My DOR</option>{FREQUENCIES.map((frequency) => <option key={frequency.key} value={frequency.key}>{frequency.label}</option>)}</select></Field><Field label="Reporting basis"><select required value={setup.waBasis} onChange={(event) => { setSetupDirty(true); setSetup((current) => ({ ...current, waBasis: event.target.value })); }}><option value="">Choose your reporting basis</option><option value="cash">Cash</option><option value="accrual">Accrual</option></select></Field></div><button className="billing-btn" type="submit">Save DOR settings</button>{setupDirty && <span className="billing-hint dor-inline-hint">Unapplied settings.</span>}</form></details>
      <ExtensionForm key={`${period.key}-${override?.date || ''}-${override?.note || ''}`} period={period} override={override} mutate={mutate} onNotice={setNotice} />
    </section>

    <div className="dor-ledger-scope"><strong>This worksheet covers this invoice ledger only.</strong><p>Reconcile other receipts, partial payments, refunds, and adjustments before filing. Reviewed invoices do not establish that the whole return is complete.</p></div>
    {notice && <p className="dor-notice" role="status">{notice}</p>}
    <div className="dor-summary"><div className="billing-tile"><div className="bt-label">{report.totalsComplete === false ? 'Known pretax gross' : 'Pretax invoice gross'}</div><div className="bt-value">{amount(report.gross)}</div><div className="bt-sub">{report.totalsComplete === false ? 'Incomplete records / known amounts only' : `${report.rows.length} invoice${report.rows.length === 1 ? '' : 's'} in this period`}</div></div><div className="billing-tile"><div className="bt-label">Reviewed taxable sales</div><div className="bt-value">{amount(report.taxableSales)}</div><div className="bt-sub">Sales tax base</div></div><div className="billing-tile"><div className="bt-label">{report.totalsComplete === false ? 'Known recorded sales tax' : 'Recorded sales tax'}</div><div className="bt-value">{amount(report.recordedTax)}</div><div className="bt-sub">{report.totalsComplete === false ? 'Incomplete records / known amounts only' : 'From saved invoices'}</div></div><div className="billing-tile"><div className="bt-label">Invoice review</div><div className="bt-value">{report.reviewCount} / {report.rows.length}</div><div className="bt-sub">{report.ready ? 'Invoice review complete' : 'Needs review'}</div></div></div>
    <Issues items={report.issues} title="Items to resolve or verify" />

    <section className="billing-card"><div className="billing-card-head"><h3>Invoice review</h3><button className="billing-btn small" onClick={() => exportCsv('invoices', dorInvoiceCsv)} disabled={!report.rows.length}>Invoice CSV</button></div>
      {report.rows.length ? <div className="billing-tablewrap"><table className="billing-table dor-review-table"><thead><tr><th>Invoice / reporting date</th><th className="num">Saved pretax</th><th className="num">Reviewed taxable</th><th className="num">Saved tax / rate</th><th>Review</th><th></th></tr></thead><tbody>{report.rows.map((row) => {
        const stale = row.review?.sourceFingerprint && row.review.sourceFingerprint !== invoiceTaxFingerprint(row.invoice);
        return <tr key={row.id}><td><strong>{row.number || row.id}</strong><span className="dor-cell-note">{fmtDate(row.date)}</span></td><td className="num">{amount(row.gross)}</td><td className="num">{amount(row.taxableAmount)}</td><td className="num">{amount(row.tax)}<span className="dor-cell-note">{percent(row.rate)}</span>{Number.isFinite(row.expectedTax) && <span className="dor-cell-note">Expected {amount(row.expectedTax)}</span>}{Number.isFinite(row.variance) && row.variance !== 0 && <span className="dor-cell-note dor-tax-difference">Difference {money(row.variance)}</span>}</td><td><span className={`billing-pill ${row.needsReview ? 'sent' : 'paid'}`}>{stale ? 'Stale review' : row.needsReview ? 'Needs review' : 'Reviewed'}</span>{row.issues?.length > 0 && <span className="dor-cell-note">{row.issues.length} item{row.issues.length === 1 ? '' : 's'} to check</span>}</td><td><button className="billing-btn small" aria-expanded={editingId === row.id} onClick={() => { setEditingId(editingId === row.id ? null : row.id); setNotice(''); }}>{editingId === row.id ? 'Close' : 'Review'}</button></td></tr>;
      })}</tbody></table></div> : <p className="billing-empty">No invoices are allocated to this period. Check other receipts before filing a no-business return.</p>}
      {editingRow && <><Issues items={editingRow.issues} title={`${editingRow.number || editingRow.id}: review items`} /><ReviewEditor key={`${editingRow.id}-${editingRow.review?.reviewedAt || ''}`} row={editingRow} onSave={saveReview} onCancel={() => setEditingId(null)} /></>}
    </section>

    <section className="billing-card"><div className="billing-card-head"><h3>Sales tax by location and original rate</h3><button className="billing-btn small" disabled={!report.locationRows.length} onClick={() => exportCsv('locations', dorLocationCsv)}>Location CSV</button></div><LocationTable rows={report.locationRows} /><p className="billing-hint">Completed reviews only. {amount(report.unreviewedGross)} of pretax gross is awaiting review. Difference = recorded tax minus expected tax; discrepancies appear in the invoice rows above. Per-invoice rounding may differ from My DOR; verify the return totals.</p></section>
    <section className="billing-card"><div className="billing-card-head"><h3>B&amp;O worksheet</h3><button className="billing-btn small" disabled={!report.boRows.length} onClick={() => exportCsv('bo', dorBoCsv)}>B&amp;O CSV</button></div><BoTable rows={report.boRows} /><p className="billing-hint">Completed reviews only: gross, deductions, and taxable gross. Apply the appropriate B&amp;O rate and any credits in My DOR; this worksheet does not calculate B&amp;O tax due.</p></section>

    <section className="billing-card"><div className="billing-card-head"><h3>Filing and payment records / {period.key}</h3><span className="billing-pill">{status}</span></div>
      {report.changedSinceFiled && <p className="dor-warning">The invoice worksheet changed after the latest filing record. Compare it with the submitted return; an amendment may be needed. Earlier snapshots remain unchanged.</p>}
      <dl className="dor-filing-totals"><div><dt>Latest submitted total</dt><dd>{amount(report.filingTotal)}</dd></div><div><dt>WA payments recorded</dt><dd>{amount(report.paid)}</dd></div><div><dt>{Number.isFinite(report.balance) && report.balance < 0 ? 'Recorded overpayment' : 'Submitted balance'}</dt><dd>{Number.isFinite(report.balance) && report.balance < 0 ? money(-report.balance) : amount(report.balance)}</dd></div></dl>
      {!report.latestFiling && <p className="billing-hint">A balance appears after a filed return is recorded. An empty ledger or a payment alone does not mean a return was filed.</p>}
      {report.filings.length > 0 && <div className="dor-history">{[...report.filings].reverse().map((filing) => <FilingRecord key={filing.id} filing={filing} latest={filing.id === report.latestFiling?.id} />)}</div>}
      <FilingForm key={`filing-${period.key}-${previewBasis}`} report={report} data={data} mutate={mutate} onNotice={setNotice} />
      <PaymentForm key={`payment-${period.key}`} periodKey={period.key} mutate={mutate} onNotice={setNotice} />
      {payments.length > 0 && <div className="billing-tablewrap dor-payments"><table className="billing-table"><caption>Payments for {period.key}</caption><thead><tr><th>Date paid</th><th className="num">Amount</th><th>Confirmation / note</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{fmtDate(payment.date)}</td><td className="num">{amount(payment.amount)}</td><td>{payment.confirmation || '\u2014'}{payment.note && <span className="dor-cell-note">{payment.note}</span>}</td></tr>)}</tbody></table></div>}
      <p className="billing-hint">Existing payment records are shared with Tax planning, where they can be corrected. Payment status here compares recorded payments with the latest submitted return.</p>
    </section>
    <nav className="dor-source-links" aria-label="Washington DOR references"><a href={DOR_LINKS.calendar} target="_blank" rel="noopener noreferrer">Filing calendar {'\u2197'}</a><a href={DOR_LINKS.rates} target="_blank" rel="noopener noreferrer">Sales tax lookup {'\u2197'}</a><a href={DOR_LINKS.software} target="_blank" rel="noopener noreferrer">Software tax guidance {'\u2197'}</a><a href={DOR_LINKS.bo} target="_blank" rel="noopener noreferrer">B&amp;O guidance {'\u2197'}</a></nav>
  </div>;
}
