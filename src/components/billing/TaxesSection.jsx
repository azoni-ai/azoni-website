import React, { useEffect, useMemo, useRef, useState } from 'react';
import { downloadFile, expensesCsv, fmtDate, money, todayISO, uid } from './billing-lib';
import {
  TAX_AGENCIES, TAX_CHECKLIST, agencyLabel,
  federalQuarters, federalRows, fmtRange, incomeCsv, safeHarborAnnual, taxPaymentsCsv,
  taxYearSummary, taxYears, waPeriods,
} from './tax-lib';
import '../../styles/tax-payments.css';

const CUSTOM = '__custom';
const validAgency = (agency) => TAX_AGENCIES.some((item) => item.key === agency);
const emptyPayment = (agency = 'irs') => ({
  date: todayISO(), agency: validAgency(agency) ? agency : 'irs', period: '', periodCustom: '', amount: '', confirmation: '', note: '',
});
const focusedFederalPeriod = (agency, value) => {
  if (agency !== 'irs' || typeof value !== 'string' || !/^\d{4}-Q[1-4]$/.test(value)) return null;
  const year = value.slice(0, 4);
  if (Number(year) < 1900 || Number(year) > 2200) return null;
  return federalQuarters(year).some((period) => period.key === value) ? { year, key: value } : null;
};
const flattenSettings = (settings = {}) => ({
  setAsidePct: settings.setAsidePct ?? 30,
  priorYearTax: settings.priorYearTax ?? '',
  highIncome: !!settings.highIncome,
});

const TaxesSection = ({ data, mutate, onOpenDor, focusAgency, focusPeriod }) => {
  const [year, setYear] = useState(() => focusedFederalPeriod(focusAgency, focusPeriod)?.year || String(new Date().getFullYear()));
  const [form, setForm] = useState(() => ({ ...emptyPayment(focusAgency), period: focusedFederalPeriod(focusAgency, focusPeriod)?.key || '' }));
  const [formOpen, setFormOpen] = useState(() => validAgency(focusAgency));
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState(() => flattenSettings(data.taxSettings));
  const [settingsDirty, setSettingsDirty] = useState(false);
  const formRef = useRef(null);
  const recordButtonRef = useRef(null);

  useEffect(() => {
    if (!settingsDirty) setSettings(flattenSettings(data.taxSettings));
  }, [data.taxSettings, settingsDirty]);

  useEffect(() => {
    if (validAgency(focusAgency)) {
      const period = focusedFederalPeriod(focusAgency, focusPeriod);
      setEditingId(null);
      if (period) setYear(period.year);
      setForm({ ...emptyPayment(focusAgency), period: period?.key || '' });
      setFormOpen(true);
    }
  }, [focusAgency, focusPeriod]);

  useEffect(() => {
    if (formOpen) formRef.current?.querySelector('input')?.focus();
  }, [formOpen, editingId]);

  const years = useMemo(() => [...new Set([...taxYears(data), year])].sort().reverse(), [data, year]);
  const summary = useMemo(() => taxYearSummary(data, year), [data, year]);
  const fed = useMemo(() => federalRows(data, year), [data, year]);
  const priorYearBenchmark = safeHarborAnnual(data.taxSettings);
  const pct = Number(data.taxSettings.setAsidePct) || 0;
  const hasActivity = summary.invoiceCount > 0 || data.expenses.some((expense) => (expense.date || '').startsWith(year));
  const payments = useMemo(() => data.taxPayments
    .filter((payment) => (payment.date || '').startsWith(year) || String(payment.period || '').startsWith(year))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0)), [data.taxPayments, year]);

  const periodOptions = useMemo(() => {
    if (form.agency === 'irs') {
      return federalQuarters(year).map((period) => ({ key: period.key, label: `${period.label} ${year}` }));
    }
    if (form.agency === 'wa') {
      return waPeriods(year, data.taxSettings.waFrequency).map((period) => ({ key: period.key, label: `${period.label} ${year}` }));
    }
    return [{ key: year, label: `${year} annual` }];
  }, [form.agency, year, data.taxSettings.waFrequency]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const closeForm = () => {
    setEditingId(null);
    setForm(emptyPayment(focusAgency));
    setFormOpen(false);
    recordButtonRef.current?.focus();
  };
  const submit = (event) => {
    event.preventDefault();
    const amount = Math.round((Number(form.amount) + Number.EPSILON) * 100) / 100;
    const period = form.period === CUSTOM ? form.periodCustom.trim() : form.period;
    if (!form.date || form.date > todayISO() || !period || form.amount === '' || !Number.isFinite(amount) || amount < 0) return;
    const fields = {
      date: form.date, agency: validAgency(form.agency) ? form.agency : 'other', period, amount,
      confirmation: form.confirmation.trim(), note: form.note.trim(),
    };
    mutate((current) => ({
      ...current,
      taxPayments: editingId
        ? current.taxPayments.map((payment) => payment.id === editingId ? { ...payment, ...fields } : payment)
        : [...current.taxPayments, { id: uid(), created: Date.now(), ...fields }],
    }));
    setNotice(editingId ? 'Payment record updated.' : 'Payment record added. No payment was sent from this website.');
    closeForm();
  };
  const startEdit = (payment) => {
    setEditingId(payment.id);
    const known = (payment.agency === 'irs'
      ? federalQuarters(year).map((period) => period.key)
      : payment.agency === 'wa'
        ? waPeriods(year, data.taxSettings.waFrequency).map((period) => period.key)
        : [year]).includes(payment.period);
    setForm({
      date: payment.date, agency: payment.agency, period: known ? payment.period : CUSTOM,
      periodCustom: known ? '' : payment.period, amount: String(payment.amount ?? ''),
      confirmation: payment.confirmation || '', note: payment.note || '',
    });
    setNotice('');
    setFormOpen(true);
  };
  const remove = (payment) => {
    if (!window.confirm(`Delete the record of ${money(payment.amount)} to ${agencyLabel(payment.agency)} on ${fmtDate(payment.date)}? This does not cancel the actual payment.`)) return;
    if (editingId === payment.id) closeForm();
    mutate((current) => ({ ...current, taxPayments: current.taxPayments.filter((item) => item.id !== payment.id) }));
    setNotice('Payment record deleted. The actual payment has not changed.');
  };

  const checked = (key) => !!data.taxChecklist[year]?.[key];
  const toggle = (key) => (event) => {
    const on = event.target.checked;
    mutate((current) => {
      const yearMap = { ...(current.taxChecklist[year] || {}) };
      if (on) yearMap[key] = true;
      else delete yearMap[key];
      return { ...current, taxChecklist: { ...current.taxChecklist, [year]: yearMap } };
    });
  };
  const doneCount = TAX_CHECKLIST.filter((item) => checked(item.key)).length;
  const setSetting = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettingsDirty(true);
    setSettings((current) => ({ ...current, [key]: value }));
  };
  const saveSettings = (event) => {
    event.preventDefault();
    mutate((current) => ({
      ...current,
      taxSettings: {
        ...current.taxSettings,
        setAsidePct: Math.min(100, Math.max(0, Number(settings.setAsidePct) || 0)),
        priorYearTax: Math.max(0, Number(settings.priorYearTax) || 0),
        highIncome: !!settings.highIncome,
      },
    }));
    setSettingsDirty(false);
    setNotice('Planning settings saved. These do not set an amount due.');
  };

  return (
    <div className="tax-payments">
      <section className="billing-card" aria-labelledby="payment-records-heading">
        <div className="billing-card-head">
          <h3 id="payment-records-heading">Payment records</h3>
          <div className="billing-actions">
            <label className="tax-payment-year">Year
              <select aria-label="Payment records year" value={year} onChange={(event) => setYear(event.target.value)}>
                {years.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <button className="billing-btn small" type="button" disabled={!payments.length}
              onClick={() => downloadFile(`azoni-tax-payments-${year}.csv`, taxPaymentsCsv(data, year), 'text/csv')}>Payments CSV</button>
          </div>
        </div>
        <p className="billing-hint tax-payment-intro">Pay through the IRS, My DOR, or the appropriate city portal first. Then save the payment details here. A record does not send money, prove a filing, or confirm that you have paid enough.</p>
        <div className="billing-actions tax-payment-actions">
          <button ref={recordButtonRef} className="billing-btn primary" type="button" aria-expanded={formOpen} aria-controls="tax-payment-form"
            onClick={() => { setEditingId(null); setForm(emptyPayment(focusAgency)); setNotice(''); setFormOpen(true); }}>Record a payment</button>
          {onOpenDor && <button className="billing-btn" type="button" onClick={onOpenDor}>Open DOR worksheet</button>}
        </div>
        <p className="tax-payment-notice" role="status">{notice}</p>

        {formOpen && <form ref={formRef} id="tax-payment-form" className="tax-payment-form" onSubmit={submit}>
          <h4>{editingId ? 'Edit payment record' : 'Payment details'}</h4>
          <div className="tax-payment-fields">
            <label className="billing-fld"><span>Date paid</span><input type="date" required max={todayISO()} value={form.date} onChange={set('date')} /></label>
            <label className="billing-fld"><span>Agency</span><select value={form.agency} onChange={(event) => setForm((current) => ({ ...current, agency: event.target.value, period: '', periodCustom: '' }))}>
              {TAX_AGENCIES.map((agency) => <option key={agency.key} value={agency.key}>{agency.label}</option>)}
            </select></label>
            <label className="billing-fld"><span>Tax period</span><select value={form.period} onChange={set('period')} required>
              <option value="">Choose a period</option>{periodOptions.map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}<option value={CUSTOM}>Other period or annual return</option>
            </select></label>
            {form.period === CUSTOM && <label className="billing-fld"><span>Period label</span><input required type="text" placeholder="2026 annual" value={form.periodCustom} onChange={set('periodCustom')} /></label>}
            <label className="billing-fld"><span>Amount paid ($)</span><input type="number" step="0.01" min="0" required placeholder="0.00" value={form.amount} onChange={set('amount')} /></label>
            <label className="billing-fld"><span>Confirmation number (optional)</span><input type="text" value={form.confirmation} onChange={set('confirmation')} /></label>
            <label className="billing-fld"><span>Note (optional)</span><input type="text" placeholder="Payment type or other details" value={form.note} onChange={set('note')} /></label>
          </div>
          {form.agency === 'wa' && !data.taxSettings.waFrequency && <p className="billing-hint">Confirm your filing frequency in the DOR worksheet, or choose Other period to copy the period from your payment confirmation.</p>}
          {form.agency === 'irs' && <p className="billing-hint">The Q1–Q4 choices track individual estimated payments. For another federal payment type, choose Other period and describe the payment in the note.</p>}
          <div className="billing-actions tax-payment-actions"><button className="billing-btn primary" type="submit">{editingId ? 'Save record' : 'Add record'}</button><button className="billing-btn" type="button" onClick={closeForm}>Cancel</button></div>
        </form>}

        {payments.length ? <ul className="tax-payment-list" aria-label={`Payments recorded for ${year}`}>
          {payments.map((payment) => <li key={payment.id}>
            <div className="tax-payment-record-main"><strong>{agencyLabel(payment.agency)}</strong><span className="tax-payment-amount">{money(payment.amount)}</span></div>
            <p className="tax-payment-meta">{fmtDate(payment.date)} <span aria-hidden="true">·</span> {payment.period}</p>
            {payment.confirmation && <p className="tax-payment-meta">Confirmation: {payment.confirmation}</p>}
            {payment.note && <p className="tax-payment-meta">{payment.note}</p>}
            <div className="tax-payment-record-actions"><button type="button" className="billing-linkish" onClick={() => startEdit(payment)}>Edit</button><button type="button" className="billing-linkish danger" onClick={() => remove(payment)}>Delete</button></div>
          </li>)}
        </ul> : <div className="tax-payment-empty"><strong>No payments recorded for {year} yet.</strong><p>Open Dates &amp; next steps to review deadlines and confirm your setup. If you already paid elsewhere, add the date, amount, and confirmation here.</p></div>}
      </section>

      <details className="billing-card tax-payment-details">
        <summary>Year-end checklist <span>{doneCount} of {TAX_CHECKLIST.length}</span></summary>
        <div className="tax-payment-details-body"><p className="billing-hint">Use this as a preparation list for {year}. These checkmarks do not change your deadline or filing records.</p>
          {TAX_CHECKLIST.map((item) => <label key={item.key} className="billing-check tax-payment-check"><input type="checkbox" checked={checked(item.key)} onChange={toggle(item.key)} />{item.label}</label>)}
        </div>
      </details>

      <details className="billing-card tax-payment-details">
        <summary>Planning tools (optional)</summary>
        <div className="tax-payment-details-body">
          <p className="billing-hint">These figures help you budget and prepare records. They do not calculate your tax bill or determine whether a payment is required.</p>
          <form onSubmit={saveSettings} className="tax-payment-planning-form">
            <h4>Budget settings</h4>
            <div className="tax-payment-fields">
              <label className="billing-fld"><span>Set-aside percentage</span><input type="number" step="1" min="0" max="100" value={settings.setAsidePct} onChange={setSetting('setAsidePct')} /></label>
              <label className="billing-fld"><span>Prior-year total tax for comparison ($)</span><input type="number" step="1" min="0" placeholder="From your prior-year return" value={settings.priorYearTax} onChange={setSetting('priorYearTax')} /></label>
            </div>
            <label className="billing-check tax-payment-check"><input type="checkbox" checked={settings.highIncome} onChange={setSetting('highIncome')} />Use the 110% prior-year benchmark</label>
            <p className="billing-hint">Settings are shared across years; check the prior-year amount for {year}. The 110% benchmark generally applies when prior-year adjusted gross income exceeded $150,000 ($75,000 if married filing separately). <a href="https://www.irs.gov/publications/p505" target="_blank" rel="noopener noreferrer">IRS estimated-tax guidance</a></p>
            <div className="billing-actions tax-payment-actions"><button className="billing-btn" type="submit">Save planning settings</button>{settingsDirty && <span className="billing-hint">Unapplied edits.</span>}</div>
          </form>

          <h4>Recorded activity, {year}</h4>
          <div className="billing-tablewrap"><table className="billing-table totals"><tbody>
            <tr><td>Receipts from {summary.invoiceCount} paid invoice{summary.invoiceCount === 1 ? '' : 's'}, excluding sales tax</td><td className="num">{money(summary.gross)}</td></tr>
            <tr><td>Tracked deductible expenses</td><td className="num">{money(summary.deductible)}</td></tr>
            <tr><td>Net from recorded activity</td><td className="num">{money(summary.net)}</td></tr>
            <tr><td>Set-aside estimate at {pct}%</td><td className="num">{hasActivity ? money(summary.setAside) : '—'}</td></tr>
            <tr><td>Federal payments recorded</td><td className="num">{money(summary.fedPaid)}</td></tr>
            <tr><td>Sales tax recorded on paid invoices</td><td className="num">{money(summary.salesTax)}</td></tr>
            <tr><td>WA DOR payments recorded</td><td className="num">{money(summary.waPaid)}</td></tr>
            {summary.cityPaid > 0 && <tr><td>City payments recorded</td><td className="num">{money(summary.cityPaid)}</td></tr>}
          </tbody></table></div>
          <p className="billing-hint">Uses the paid date on invoices and the date on expenses. Partial payments, other income, and adjustments need separate reconciliation. A zero here does not mean no tax is due.</p>
          <div className="billing-actions tax-payment-actions">
            <button className="billing-btn small" type="button" disabled={!summary.invoiceCount} onClick={() => downloadFile(`azoni-income-${year}.csv`, incomeCsv(data, year), 'text/csv')}>Income CSV</button>
            <button className="billing-btn small" type="button" onClick={() => downloadFile(`azoni-expenses-${year}.csv`, expensesCsv(data, year), 'text/csv')}>Expenses CSV</button>
          </div>

          <h4>Federal budgeting by period</h4>
          <div className="billing-tablewrap" tabIndex="0" role="region" aria-label="Federal budgeting table, scroll horizontally if needed"><table className="billing-table">
            <thead><tr><th>Period</th><th>{year === '2026' ? 'Standard 2026 deadline' : 'Estimated date · verify with IRS'}</th><th className="num">Recorded net</th><th className="num">Set-aside ({pct}%)</th>{priorYearBenchmark > 0 && <th className="num">Prior-year benchmark / 4</th>}<th className="num">Recorded payments</th></tr></thead>
            <tbody>{fed.map((row) => <tr key={row.key}><td>{row.label} · {fmtRange(row.start, row.end)}</td><td className="nowrap">{fmtDate(row.due)}</td><td className="num">{money(row.net)}</td><td className="num">{hasActivity ? money(row.rough) : '—'}</td>{priorYearBenchmark > 0 && <td className="num">{money(row.safe)}</td>}<td className="num">{money(row.paid)}</td></tr>)}</tbody>
          </table></div>
          {year !== '2026' && <p className="billing-hint">Dates outside the verified 2026 schedule only adjust for weekends. Check federal holidays and any relief in IRS guidance before relying on them.</p>}
          <p className="billing-hint">Set-aside figures use positive recorded net times your percentage. {priorYearBenchmark > 0 ? `The comparison benchmark is ${data.taxSettings.highIncome ? '110%' : '100%'} of the prior-year tax you entered, divided by four. ` : 'Enter prior-year total tax to display a comparison benchmark. '}Neither figure is your required payment. This comparison excludes withholding, current-year credits, and annualized-income rules. Eligibility, payment timing, and other income matter. Confirm amounts and any deadline adjustments with your preparer or <a href="https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes" target="_blank" rel="noopener noreferrer">IRS guidance</a>.</p>
        </div>
      </details>
    </div>
  );
};

export default TaxesSection;
