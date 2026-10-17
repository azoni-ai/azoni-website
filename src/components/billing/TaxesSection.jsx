import React, { useEffect, useMemo, useState } from 'react';
import { downloadFile, expensesCsv, fmtDate, money, todayISO, uid } from './billing-lib';
import {
  TAX_AGENCIES, TAX_CHECKLIST, agencyLabel,
  federalQuarters, federalRows, fmtRange, incomeCsv, safeHarborAnnual, taxPaymentsCsv,
  taxYearSummary, taxYears, waPeriods,
} from './tax-lib';

const CUSTOM = '__custom';

const emptyPayment = () => ({
  date: todayISO(), agency: 'irs', period: '', periodCustom: '', amount: '', confirmation: '', note: '',
});

const flattenSettings = (ts = {}) => ({
  setAsidePct: ts.setAsidePct ?? 30,
  priorYearTax: ts.priorYearTax ?? 0,
  highIncome: !!ts.highIncome,
});

const TaxesSection = ({ data, mutate, onOpenDor }) => {
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [form, setForm] = useState(emptyPayment);
  const [editingId, setEditingId] = useState(null);
  const [settings, setSettings] = useState(() => flattenSettings(data.taxSettings));
  const [settingsDirty, setSettingsDirty] = useState(false);

  useEffect(() => {
    if (!settingsDirty) setSettings(flattenSettings(data.taxSettings));
  }, [data.taxSettings, settingsDirty]);

  const years = useMemo(() => taxYears(data), [data]);
  const summary = useMemo(() => taxYearSummary(data, year), [data, year]);
  const fed = useMemo(() => federalRows(data, year), [data, year]);
  const priorYearBenchmark = safeHarborAnnual(data.taxSettings);
  const pct = Number(data.taxSettings.setAsidePct) || 0;

  const payments = useMemo(
    () =>
      data.taxPayments
        .filter((p) => (p.date || '').startsWith(year) || String(p.period || '').startsWith(year))
        .sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0)),
    [data.taxPayments, year]
  );

  // Period choices follow the agency: federal quarters, the DOR schedule, or
  // just the year for city filings. Anything else goes in as free text.
  const periodOptions = useMemo(() => {
    if (form.agency === 'irs') {
      return federalQuarters(year).map((q) => ({ key: q.key, label: `${q.label} ${year}, due ${fmtDate(q.due)}` }));
    }
    if (form.agency === 'wa') {
      return waPeriods(year, data.taxSettings.waFrequency).map((p) => ({
        key: p.key, label: `${p.label} ${year}, due ${fmtDate(p.due)}`,
      }));
    }
    return [{ key: year, label: `${year} annual` }];
  }, [form.agency, year, data.taxSettings.waFrequency]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setAgency = (e) => {
    const agency = e.target.value;
    setForm((f) => ({ ...f, agency, period: '', periodCustom: '' }));
  };

  const submit = (e) => {
    e.preventDefault();
    const amount = Math.round((Number(form.amount) + Number.EPSILON) * 100) / 100;
    const period = form.period === CUSTOM ? form.periodCustom.trim() : form.period;
    if (!form.date || !period || form.amount === '' || !Number.isFinite(amount) || amount < 0) return;
    const fields = {
      date: form.date,
      agency: TAX_AGENCIES.some((a) => a.key === form.agency) ? form.agency : 'other',
      period,
      amount,
      confirmation: form.confirmation.trim(),
      note: form.note.trim(),
    };
    if (editingId) {
      mutate((d) => ({
        ...d,
        taxPayments: d.taxPayments.map((p) => (p.id === editingId ? { ...p, ...fields } : p)),
      }));
      setEditingId(null);
    } else {
      mutate((d) => ({
        ...d,
        taxPayments: [...d.taxPayments, { id: uid(), created: Date.now(), ...fields }],
      }));
    }
    setForm(emptyPayment());
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    const known = (p.agency === 'irs'
      ? federalQuarters(year).map((q) => q.key)
      : p.agency === 'wa'
        ? waPeriods(year, data.taxSettings.waFrequency).map((q) => q.key)
        : [year]
    ).includes(p.period);
    setForm({
      date: p.date,
      agency: p.agency,
      period: known ? p.period : CUSTOM,
      periodCustom: known ? '' : p.period,
      amount: String(p.amount ?? ''),
      confirmation: p.confirmation || '',
      note: p.note || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyPayment());
  };

  const remove = (p) => {
    if (!window.confirm(`Delete the ${money(p.amount)} payment to ${agencyLabel(p.agency)} on ${fmtDate(p.date)}?`)) return;
    if (editingId === p.id) cancelEdit();
    mutate((d) => ({ ...d, taxPayments: d.taxPayments.filter((x) => x.id !== p.id) }));
  };

  const checked = (key) => !!(data.taxChecklist[year] && data.taxChecklist[year][key]);
  const toggle = (key) => (e) => {
    const on = e.target.checked;
    mutate((d) => {
      const yearMap = { ...(d.taxChecklist[year] || {}) };
      if (on) yearMap[key] = true;
      else delete yearMap[key];
      return { ...d, taxChecklist: { ...d.taxChecklist, [year]: yearMap } };
    });
  };
  const doneCount = TAX_CHECKLIST.filter((c) => checked(c.key)).length;

  const setS = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSettingsDirty(true);
    setSettings((s) => ({ ...s, [k]: v }));
  };

  const saveSettings = (e) => {
    e.preventDefault();
    mutate((d) => ({
      ...d,
      taxSettings: {
        ...d.taxSettings,
        setAsidePct: Math.min(100, Math.max(0, Number(settings.setAsidePct) || 0)),
        priorYearTax: Math.max(0, Number(settings.priorYearTax) || 0),
        highIncome: !!settings.highIncome,
      },
    }));
    setSettingsDirty(false);
  };

  const fedTotals = fed.reduce(
    (t, r) => ({ gross: t.gross + r.gross, net: t.net + r.net, rough: t.rough + r.rough, paid: t.paid + r.paid }),
    { gross: 0, net: 0, rough: 0, paid: 0 }
  );

  return (
    <>
      <div className="billing-card">
        <div className="billing-card-head">
          <h3>Cash activity overview, {year}</h3>
          <div className="billing-actions">
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              className="billing-btn small"
              disabled={!summary.invoiceCount}
              onClick={() => downloadFile(`azoni-income-${year}.csv`, incomeCsv(data, year), 'text/csv')}
            >
              Income CSV
            </button>
            <button
              className="billing-btn small"
              onClick={() => downloadFile(`azoni-expenses-${year}.csv`, expensesCsv(data, year), 'text/csv')}
            >
              Expenses CSV
            </button>
            <button
              className="billing-btn small"
              disabled={!payments.length}
              onClick={() => downloadFile(`azoni-tax-payments-${year}.csv`, taxPaymentsCsv(data, year), 'text/csv')}
            >
              Payments CSV
            </button>
          </div>
        </div>
        <div className="billing-tablewrap">
          <table className="billing-table totals">
            <tbody>
              <tr>
                <td>Gross receipts ({summary.invoiceCount} paid invoice{summary.invoiceCount === 1 ? '' : 's'})</td>
                <td className="num">{money(summary.gross)}</td>
              </tr>
              <tr>
                <td>Tracked deductible expenses</td>
                <td className="num">{money(summary.deductible)}</td>
              </tr>
              <tr className="strong">
                <td>Net from recorded activity</td>
                <td className="num">{money(summary.net)}</td>
              </tr>
              <tr>
                <td>Annual reserve estimate at {pct}%</td>
                <td className="num">{money(summary.setAside)}</td>
              </tr>
              <tr>
                <td>Federal payments recorded</td>
                <td className="num">{money(summary.fedPaid)}</td>
              </tr>
              <tr className="strong">
                <td>Remaining planning reserve</td>
                <td className="num">{money(summary.remaining)}</td>
              </tr>
              <tr>
                <td>Sales tax recorded on paid invoices</td>
                <td className="num">{money(summary.salesTax)}</td>
              </tr>
              <tr>
                <td>WA DOR payments recorded</td>
                <td className="num">{money(summary.waPaid)}</td>
              </tr>
              {summary.cityPaid > 0 && (
                <tr>
                  <td>Seattle and Kent payments recorded</td>
                  <td className="num">{money(summary.cityPaid)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="billing-hint">
          This overview uses the paid date on invoices marked paid and the date on each tracked expense.
          Gross receipts exclude recorded sales tax. Partial payments, other income, and adjustments
          need separate reconciliation. The reserve is a planning estimate, not your tax liability.
        </p>
      </div>

      <div className="billing-card">
        <h3>Federal payment planning, {year}</h3>
        <div className="billing-tablewrap">
          <table className="billing-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Scheduled deadline</th>
                <th className="num">Recorded receipts</th>
                <th className="num">Recorded net</th>
                <th className="num">Period reserve ({pct}%)</th>
                {priorYearBenchmark > 0 && <th className="num">Prior-year benchmark / 4</th>}
                <th className="num">Payments recorded</th>
              </tr>
            </thead>
            <tbody>
              {fed.map((r) => (
                <tr key={r.key}>
                  <td className="nowrap">{r.label} · {fmtRange(r.start, r.end)}</td>
                  <td className="nowrap">{fmtDate(r.due)}</td>
                  <td className="num">{money(r.gross)}</td>
                  <td className="num">{money(r.net)}</td>
                  <td className="num">{money(r.rough)}</td>
                  {priorYearBenchmark > 0 && <td className="num">{money(r.safe)}</td>}
                  <td className="num">{money(r.paid)}</td>
                </tr>
              ))}
              <tr className="billing-dayhead">
                <td colSpan={2}>Period totals</td>
                <td className="num">{money(fedTotals.gross)}</td>
                <td className="num">{money(fedTotals.net)}</td>
                <td className="num">{money(fedTotals.rough)}</td>
                {priorYearBenchmark > 0 && <td className="num">{money(priorYearBenchmark)}</td>}
                <td className="num">{money(fedTotals.paid)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="billing-hint">
          Each period reserve is positive recorded net times your chosen percentage; a loss gives a zero reserve.
          {priorYearBenchmark > 0
            ? ` The benchmark is ${data.taxSettings.highIncome ? '110%' : '100%'} of the entered prior-year tax, divided into four equal amounts.`
            : ' Enter prior-year total tax below to display a comparison benchmark.'}
          {' '}These figures do not calculate required payments or establish protection from underpayment penalties.
          Withholding, credits, total tax, eligibility, and payment timing affect your requirements.
          {' '}Confirm amounts and deadlines, including holidays, with{' '}
          <a href="https://www.irs.gov/faqs/estimated-tax" target="_blank" rel="noopener noreferrer">IRS guidance</a>
          {' '}or your tax preparer, then record payments below.
        </p>
      </div>

      <div className="billing-card">
        <h3>Washington DOR filing workspace</h3>
        <p className="billing-hint">
          Review invoice tax, sourcing locations, B&amp;O classifications, and recorded filings in the DOR tab.
          Confirm your assigned filing frequency and reporting basis there before preparing a return.
        </p>
        {onOpenDor && (
          <button type="button" className="billing-btn primary" onClick={onOpenDor}>Open DOR worksheet</button>
        )}
      </div>

      <div className="billing-card">
        <h3>{editingId ? 'Edit payment' : 'Record a payment'}</h3>
        <p className="billing-hint">Payment records track transfers. They do not confirm that a return was filed or that all tax has been paid.</p>
        <form onSubmit={submit}>
          <div className="billing-frow">
            <label className="billing-fld">
              <span>Date paid</span>
              <input type="date" required value={form.date} onChange={set('date')} />
            </label>
            <label className="billing-fld grow">
              <span>Agency</span>
              <select value={form.agency} onChange={setAgency}>
                {TAX_AGENCIES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </label>
            <label className="billing-fld grow">
              <span>Period</span>
              <select value={form.period} onChange={set('period')} required>
                <option value="">Choose</option>
                {periodOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                <option value={CUSTOM}>Other</option>
              </select>
            </label>
            {form.period === CUSTOM && (
              <label className="billing-fld">
                <span>Period label</span>
                <input type="text" placeholder="2026-Q4" value={form.periodCustom} onChange={set('periodCustom')} />
              </label>
            )}
            <label className="billing-fld amt">
              <span>Amount ($)</span>
              <input
                type="number" step="0.01" min="0" required placeholder="0.00"
                value={form.amount} onChange={set('amount')}
              />
            </label>
          </div>
          <div className="billing-frow" style={{ marginTop: '10px' }}>
            <label className="billing-fld grow">
              <span>Confirmation number</span>
              <input type="text" value={form.confirmation} onChange={set('confirmation')} />
            </label>
            <label className="billing-fld grow2">
              <span>Note</span>
              <input type="text" value={form.note} onChange={set('note')} />
            </label>
            <button className="billing-btn primary" type="submit">{editingId ? 'Save' : 'Add'}</button>
            {editingId && (
              <button className="billing-btn" type="button" onClick={cancelEdit}>Cancel</button>
            )}
          </div>
        </form>
        {payments.length ? (
          <div className="billing-tablewrap" style={{ marginTop: '14px' }}>
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Agency</th>
                  <th>Period</th>
                  <th className="num">Amount</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="nowrap">{fmtDate(p.date)}</td>
                    <td>{agencyLabel(p.agency)}</td>
                    <td className="nowrap">{p.period}</td>
                    <td className="num">{money(p.amount)}</td>
                    <td>{[p.confirmation, p.note].filter(Boolean).join(' · ')}</td>
                    <td className="num nowrap">
                      <button className="billing-linkish" onClick={() => startEdit(p)}>Edit</button>{' '}
                      <button className="billing-linkish danger" onClick={() => remove(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="billing-empty" style={{ marginTop: '14px' }}>
            No payments recorded for {year} yet.
          </div>
        )}
      </div>

      <div className="billing-card">
        <div className="billing-card-head">
          <h3>Filing checklist, {year}</h3>
          <span className="billing-hint nowrap">{doneCount} of {TAX_CHECKLIST.length}</span>
        </div>
        {TAX_CHECKLIST.map((c) => (
          <label key={c.key} className="billing-check" style={{ display: 'flex', margin: '6px 0' }}>
            <input type="checkbox" checked={checked(c.key)} onChange={toggle(c.key)} />
            {c.label}
          </label>
        ))}
      </div>

      <form onSubmit={saveSettings}>
        <div className="billing-card">
          <h3>Federal planning settings</h3>
          <div className="billing-frow">
            <label className="billing-fld pct">
              <span>Planning reserve (%)</span>
              <input type="number" step="1" min="0" max="100" value={settings.setAsidePct} onChange={setS('setAsidePct')} />
            </label>
            <label className="billing-fld amt">
              <span>Prior-year total tax for comparison ($)</span>
              <input type="number" step="1" min="0" value={settings.priorYearTax} onChange={setS('priorYearTax')} />
            </label>
            <label className="billing-check">
              <input type="checkbox" checked={settings.highIncome} onChange={setS('highIncome')} />
              Use the 110% prior-year benchmark
            </label>
          </div>
          <div className="billing-frow" style={{ marginTop: '10px' }}>
            <button className="billing-btn primary" type="submit">Save</button>
            {settingsDirty && <span className="billing-hint">Unapplied edits.</span>}
          </div>
          <p className="billing-hint">
            These settings are shared across years; verify the entered prior-year tax for the year you are viewing.
            The 110% prior-year rule generally applies when prior-year AGI exceeded $150,000
            ($75,000 if married filing separately). A chosen reserve percentage is for budgeting;
            it does not calculate income or self-employment tax.
          </p>
        </div>
      </form>
    </>
  );
};

export default TaxesSection;
