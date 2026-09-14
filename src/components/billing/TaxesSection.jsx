import React, { useEffect, useMemo, useState } from 'react';
import { downloadFile, expensesCsv, fmtDate, money, todayISO, uid } from './billing-lib';
import {
  STATUS_LABEL, STATUS_PILL, TAX_AGENCIES, TAX_CHECKLIST, WA_FREQUENCIES, agencyLabel,
  federalQuarters, federalRows, fmtRange, incomeCsv, safeHarborAnnual, taxPaymentsCsv,
  taxYearSummary, taxYears, waPeriods, waRows,
} from './tax-lib';

const CUSTOM = '__custom';

const StatusPill = ({ status }) => (
  <span className={`billing-pill ${STATUS_PILL[status] || ''}`}>{STATUS_LABEL[status]}</span>
);

const emptyPayment = () => ({
  date: todayISO(), agency: 'irs', period: '', periodCustom: '', amount: '', confirmation: '', note: '',
});

const flattenSettings = (ts) => ({
  setAsidePct: ts.setAsidePct ?? 30,
  priorYearTax: ts.priorYearTax ?? 0,
  highIncome: !!ts.highIncome,
  waFrequency: ts.waFrequency || '',
  boRate: ts.boRate ?? 0.471,
});

const TaxesSection = ({ data, mutate }) => {
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
  const wa = useMemo(() => waRows(data, year), [data, year]);
  const harbor = safeHarborAnnual(data.taxSettings);
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
        waFrequency: WA_FREQUENCIES.some((f) => f.key === settings.waFrequency) ? settings.waFrequency : '',
        boRate: Math.max(0, Number(settings.boRate) || 0),
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
          <h3>Tax year {year}</h3>
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
                <td>Deductible expenses</td>
                <td className="num">{money(summary.deductible)}</td>
              </tr>
              <tr className="strong">
                <td>Net profit (Schedule C)</td>
                <td className="num">{money(summary.net)}</td>
              </tr>
              <tr>
                <td>Set aside for federal at {pct}%</td>
                <td className="num">{money(summary.setAside)}</td>
              </tr>
              <tr>
                <td>Federal estimates paid</td>
                <td className="num">{money(summary.fedPaid)}</td>
              </tr>
              <tr className="strong">
                <td>Still to pay the IRS, roughly</td>
                <td className="num">{money(summary.remaining)}</td>
              </tr>
              <tr>
                <td>Sales tax collected, owed to DOR</td>
                <td className="num">{money(summary.salesTax)}</td>
              </tr>
              <tr>
                <td>Retailing B&amp;O estimate, before the small business credit</td>
                <td className="num">{money(summary.bo)}</td>
              </tr>
              <tr>
                <td>Paid to WA DOR</td>
                <td className="num">{money(summary.waPaid)}</td>
              </tr>
              {summary.cityPaid > 0 && (
                <tr>
                  <td>Paid to Seattle and Kent</td>
                  <td className="num">{money(summary.cityPaid)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="billing-hint">
          Cash basis: income counts when the invoice is marked paid, expenses on their date.
          Gross receipts leave out sales tax, which is DOR's money passing through.
          The annual return (Form 1040 with Schedule C and SE) is due {fmtDate(`${Number(year) + 1}-04-15`)}.
        </p>
      </div>

      <div className="billing-card">
        <h3>Federal estimated payments, {year}</h3>
        <div className="billing-tablewrap">
          <table className="billing-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Due</th>
                <th className="num">Received</th>
                <th className="num">Net</th>
                <th className="num">Rough ({pct}%)</th>
                {harbor > 0 && <th className="num">Safe harbor</th>}
                <th className="num">Paid</th>
                <th></th>
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
                  {harbor > 0 && <td className="num">{money(r.safe)}</td>}
                  <td className="num">{money(r.paid)}</td>
                  <td><StatusPill status={r.status} /></td>
                </tr>
              ))}
              <tr className="billing-dayhead">
                <td colSpan={2}>Total</td>
                <td className="num">{money(fedTotals.gross)}</td>
                <td className="num">{money(fedTotals.net)}</td>
                <td className="num">{money(fedTotals.rough)}</td>
                {harbor > 0 && <td className="num">{money(harbor)}</td>}
                <td className="num">{money(fedTotals.paid)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="billing-hint">
          Rough is net profit received in the period times the set-aside rate.
          {harbor > 0
            ? ' Safe harbor is a quarter of last year\'s tax; paying the lower of the two by each due date avoids the underpayment penalty.'
            : ' Enter last year\'s total tax in the settings below to see the safe-harbor amount.'}
          {' '}Pay at IRS Direct Pay, reason "Estimated tax", form 1040-ES, tax year {year}, then record it below.
          A federal holiday can move a due date by a day.
        </p>
      </div>

      <div className="billing-card">
        <h3>Washington excise returns, {year}</h3>
        {wa.length ? (
          <>
            <div className="billing-tablewrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Due</th>
                    <th className="num">Gross</th>
                    <th className="num">Sales tax</th>
                    <th className="num">B&amp;O est.</th>
                    <th className="num">Remitted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {wa.map((r) => (
                    <tr key={r.key}>
                      <td className="nowrap">{r.label} · {fmtRange(r.start, r.end)}</td>
                      <td className="nowrap">{fmtDate(r.due)}</td>
                      <td className="num">{money(r.gross)}</td>
                      <td className="num">{money(r.salesTax)}</td>
                      <td className="num">{money(r.bo)}</td>
                      <td className="num">{money(r.paid)}</td>
                      <td><StatusPill status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="billing-hint">
              File the Combined Excise Tax Return in My DOR. Report the gross under Retailing B&amp;O,
              retail sales tax, and local sales tax, since custom software and customization of
              prewritten software are retail sales in Washington. A period with nothing received
              still needs a no-business return.
            </p>
          </>
        ) : (
          <p className="billing-hint">
            Set your DOR filing frequency in the settings below. It is in My DOR under the
            business account, assigned when the UBI was registered.
          </p>
        )}
      </div>

      <div className="billing-card">
        <h3>{editingId ? 'Edit payment' : 'Record a payment'}</h3>
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
          <h3>Tax settings</h3>
          <div className="billing-frow">
            <label className="billing-fld pct">
              <span>Set aside (%)</span>
              <input type="number" step="1" min="0" max="100" value={settings.setAsidePct} onChange={setS('setAsidePct')} />
            </label>
            <label className="billing-fld amt">
              <span>Last year's total tax ($)</span>
              <input type="number" step="1" min="0" value={settings.priorYearTax} onChange={setS('priorYearTax')} />
            </label>
            <label className="billing-check">
              <input type="checkbox" checked={settings.highIncome} onChange={setS('highIncome')} />
              last year's AGI was over $150k
            </label>
          </div>
          <div className="billing-frow" style={{ marginTop: '10px' }}>
            <label className="billing-fld grow">
              <span>WA DOR filing frequency</span>
              <select value={settings.waFrequency} onChange={setS('waFrequency')}>
                {WA_FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </label>
            <label className="billing-fld pct">
              <span>B&amp;O rate (%)</span>
              <input type="number" step="0.001" min="0" value={settings.boRate} onChange={setS('boRate')} />
            </label>
            <button className="billing-btn primary" type="submit">Save</button>
            {settingsDirty && <span className="billing-hint">Unapplied edits.</span>}
          </div>
          <p className="billing-hint">
            Set aside covers self-employment tax plus income tax; 25 to 30 percent of net profit is
            the usual range. Total tax is the "total tax" line on last year's 1040. Retailing B&amp;O
            is 0.471 percent; the small business credit usually removes most of it at this size.
          </p>
        </div>
      </form>
    </>
  );
};

export default TaxesSection;
