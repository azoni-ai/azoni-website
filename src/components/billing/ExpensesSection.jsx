import React, { useMemo, useState } from 'react';
import {
  EXPENSE_CATEGORIES, RECURRENCE, downloadFile, expenseCategory, expenseDeductible,
  expenseFromRecurring, expenseSummary, expenseYears, expensesCsv, fmtDate, money,
  nextRecurringDate, parseISO, pendingRecurring, recurringLabel, recurringOccurrences,
  round2, sortedExpenses, todayISO, uid,
} from './billing-lib';

const monthLabel = (date) =>
  parseISO(`${date.slice(0, 7)}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const emptyForm = () => ({
  date: todayISO(),
  vendor: '',
  description: '',
  category: 'supplies',
  amount: '',
  pct: '100',
  paidFrom: 'business',
  receipt: '',
  repeat: 'once',
});

const pendingKey = (p) => `${p.template.id}|${p.key}`;

const ExpensesSection = ({ data, mutate }) => {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [catFilter, setCatFilter] = useState('all');
  // Amount overrides typed into the Due list before confirming a month.
  const [pendingAmounts, setPendingAmounts] = useState({});

  const today = todayISO();
  const years = useMemo(() => expenseYears(data), [data]);
  const summary = useMemo(() => expenseSummary(data, year), [data, year]);
  const pending = useMemo(() => pendingRecurring(data, today), [data, today]);

  const rows = useMemo(() => {
    let r = sortedExpenses(data).filter((x) => (x.date || '').startsWith(year));
    if (catFilter !== 'all') r = r.filter((x) => expenseCategory(x.category).key === catFilter);
    return r;
  }, [data, year, catFilter]);

  // Months newest-first (rows are already date-desc, so insertion order holds).
  const monthGroups = useMemo(() => {
    const map = new Map();
    rows.forEach((x) => {
      const m = x.date.slice(0, 7);
      if (!map.has(m)) map.set(m, []);
      map.get(m).push(x);
    });
    return [...map.entries()].map(([month, list]) => ({
      month,
      rows: list,
      total: round2(list.reduce((s, x) => s + (Number(x.amount) || 0), 0)),
    }));
  }, [rows]);

  const shownTotal = round2(rows.reduce((s, x) => s + (Number(x.amount) || 0), 0));
  const shownDeductible = round2(rows.reduce((s, x) => s + expenseDeductible(x), 0));

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Changing category resets the deductible share to that category's default
  // (meals 50%, everything else 100%); the field stays editable afterwards.
  const setCategory = (e) => {
    const key = e.target.value;
    setForm((f) => ({ ...f, category: key, pct: String(expenseCategory(key).pct) }));
  };

  const resetForm = () => {
    setEditingId(null);
    setEditingTemplateId(null);
    setForm(emptyForm());
  };

  const submit = (e) => {
    e.preventDefault();
    const amount = round2(Number(form.amount));
    // Blank share means fully deductible; otherwise clamp to 0..100.
    const pct = form.pct === '' ? 100 : Math.min(100, Math.max(0, Math.round(Number(form.pct))));
    if (!form.date || form.amount === '' || !Number.isFinite(amount) || amount < 0) return;
    if (!Number.isFinite(pct)) return;
    const fields = {
      vendor: form.vendor.trim(),
      description: form.description.trim(),
      category: expenseCategory(form.category).key,
      amount,
      pct,
      paidFrom: form.paidFrom === 'personal' ? 'personal' : 'business',
    };
    const repeat = RECURRENCE.some((r) => r.key === form.repeat) ? form.repeat : 'once';

    if (editingTemplateId) {
      // Template edits change future occurrences only; logged months stay.
      mutate((d) => ({
        ...d,
        recurringExpenses: d.recurringExpenses.map((t) =>
          t.id === editingTemplateId
            ? { ...t, ...fields, frequency: repeat === 'once' ? t.frequency : repeat, startDate: form.date }
            : t
        ),
      }));
    } else if (editingId) {
      mutate((d) => ({
        ...d,
        expenses: d.expenses.map((x) =>
          x.id === editingId ? { ...x, ...fields, date: form.date, receipt: form.receipt.trim() } : x
        ),
      }));
    } else if (repeat !== 'once') {
      // Log this occurrence now and remember the template for the next ones.
      const template = {
        id: uid(), created: Date.now(), ...fields,
        frequency: repeat, startDate: form.date, endDate: null, active: true, skipped: [],
      };
      const first = recurringOccurrences(template, form.date)[0];
      const entry = first
        ? { ...expenseFromRecurring(template, first, amount), receipt: form.receipt.trim() }
        : null;
      mutate((d) => ({
        ...d,
        recurringExpenses: [...d.recurringExpenses, template],
        expenses: entry ? [...d.expenses, entry] : d.expenses,
      }));
    } else {
      mutate((d) => ({
        ...d,
        expenses: [
          ...d.expenses,
          { id: uid(), created: Date.now(), date: form.date, receipt: form.receipt.trim(), ...fields },
        ],
      }));
    }
    resetForm();
    if (!form.date.startsWith(year)) setYear(form.date.slice(0, 4));
  };

  const fillFrom = (x, date) => ({
    date,
    vendor: x.vendor || '',
    description: x.description || '',
    category: expenseCategory(x.category).key,
    amount: String(x.amount ?? ''),
    pct: String(x.pct ?? 100),
    paidFrom: x.paidFrom === 'personal' ? 'personal' : 'business',
    receipt: x.receipt || '',
    repeat: 'once',
  });

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const startEdit = (x) => {
    setEditingTemplateId(null);
    setEditingId(x.id);
    setForm(fillFrom(x, x.date));
    scrollTop();
  };

  // One-off re-log of a past row, dated today.
  const copy = (x) => {
    setEditingId(null);
    setEditingTemplateId(null);
    setForm({ ...fillFrom(x, today), receipt: '' });
    scrollTop();
  };

  const startEditTemplate = (t) => {
    setEditingId(null);
    setEditingTemplateId(t.id);
    setForm({ ...fillFrom(t, t.startDate || today), receipt: '', repeat: t.frequency || 'monthly' });
    scrollTop();
  };

  const remove = (x) => {
    const what = [x.vendor, x.description].filter(Boolean).join(' · ') || 'this expense';
    if (!window.confirm(`Delete ${what} (${money(x.amount)}) on ${fmtDate(x.date)}?`)) return;
    if (editingId === x.id) resetForm();
    mutate((d) => ({ ...d, expenses: d.expenses.filter((y) => y.id !== x.id) }));
  };

  const setTemplateActive = (t, active) =>
    mutate((d) => ({
      ...d,
      recurringExpenses: d.recurringExpenses.map((r) => (r.id === t.id ? { ...r, active } : r)),
    }));

  const removeTemplate = (t) => {
    const what = [t.vendor, t.description].filter(Boolean).join(' · ') || 'this recurring expense';
    if (!window.confirm(`Stop tracking ${what}? Months already logged stay in the ledger.`)) return;
    if (editingTemplateId === t.id) resetForm();
    mutate((d) => ({ ...d, recurringExpenses: d.recurringExpenses.filter((r) => r.id !== t.id) }));
  };

  const pendingAmount = (p) => {
    const v = pendingAmounts[pendingKey(p)];
    return v === undefined ? String(p.template.amount ?? '') : v;
  };

  const forgetPending = (keys) =>
    setPendingAmounts((m) => {
      const next = { ...m };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  const addPending = (p) => {
    const amount = round2(Number(pendingAmount(p)));
    if (!Number.isFinite(amount) || amount < 0) return;
    mutate((d) => ({
      ...d,
      expenses: [...d.expenses, expenseFromRecurring(p.template, { key: p.key, date: p.date }, amount)],
    }));
    forgetPending([pendingKey(p)]);
  };

  const addAllPending = () => {
    const entries = pending
      .map((p) => ({ p, amount: round2(Number(pendingAmount(p))) }))
      .filter(({ amount }) => Number.isFinite(amount) && amount >= 0)
      .map(({ p, amount }) => expenseFromRecurring(p.template, { key: p.key, date: p.date }, amount));
    if (!entries.length) return;
    mutate((d) => ({ ...d, expenses: [...d.expenses, ...entries] }));
    forgetPending(pending.map(pendingKey));
  };

  const skipPending = (p) => {
    mutate((d) => ({
      ...d,
      recurringExpenses: d.recurringExpenses.map((t) =>
        t.id === p.template.id ? { ...t, skipped: [...(t.skipped || []), p.key] } : t
      ),
    }));
    forgetPending([pendingKey(p)]);
  };

  const cat = expenseCategory(form.category);
  const templates = [...data.recurringExpenses].sort(
    (a, b) => (a.vendor || '').localeCompare(b.vendor || '') || (a.created || 0) - (b.created || 0)
  );
  const heading = editingTemplateId ? 'Edit recurring expense' : editingId ? 'Edit expense' : 'Log expense';

  return (
    <>
      {pending.length > 0 && (
        <div className="billing-card">
          <div className="billing-card-head">
            <h3>Due</h3>
            <div className="billing-actions">
              <span className="billing-hint nowrap">
                {pending.length} recurring bill{pending.length === 1 ? '' : 's'} to confirm
              </span>
              {pending.length > 1 && (
                <button className="billing-btn small" onClick={addAllPending}>Add all</button>
              )}
            </div>
          </div>
          <div className="billing-tablewrap">
            <table className="billing-table">
              <tbody>
                {pending.map((p) => (
                  <tr key={pendingKey(p)}>
                    <td className="nowrap">{fmtDate(p.date)}</td>
                    <td>{[p.template.vendor, p.template.description].filter(Boolean).join(' · ')}</td>
                    <td className="nowrap">{expenseCategory(p.template.category).label}</td>
                    <td className="num">
                      <input
                        className="billing-inline-amt"
                        type="number" step="0.01" min="0" inputMode="decimal"
                        aria-label="Amount"
                        value={pendingAmount(p)}
                        onChange={(e) =>
                          setPendingAmounts((m) => ({ ...m, [pendingKey(p)]: e.target.value }))
                        }
                      />
                    </td>
                    <td className="num nowrap">
                      <button className="billing-btn small primary" onClick={() => addPending(p)}>Add</button>{' '}
                      <button className="billing-linkish" onClick={() => skipPending(p)}>Skip</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="billing-hint">
            Adjust the amount if the bill changed, then Add. Skip drops that one month for good.
          </p>
        </div>
      )}

      <div className="billing-card">
        <h3>{heading}</h3>
        <form onSubmit={submit}>
          <div className="billing-frow">
            <label className="billing-fld">
              <span>{editingTemplateId ? 'First bill date' : 'Date'}</span>
              <input type="date" required value={form.date} onChange={set('date')} />
            </label>
            <label className="billing-fld grow">
              <span>Vendor</span>
              <input type="text" placeholder="Amazon" value={form.vendor} onChange={set('vendor')} />
            </label>
            <label className="billing-fld grow2">
              <span>What it was</span>
              <input
                type="text" placeholder="Replacement battery for work laptop"
                value={form.description} onChange={set('description')}
              />
            </label>
          </div>
          <div className="billing-frow" style={{ marginTop: '10px' }}>
            <label className="billing-fld grow">
              <span>Category</span>
              <select value={form.category} onChange={setCategory}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label} (line {c.line})</option>
                ))}
              </select>
            </label>
            <label className="billing-fld amt">
              <span>Amount ($)</span>
              <input
                type="number" step="0.01" min="0" required placeholder="0.00"
                value={form.amount} onChange={set('amount')}
              />
            </label>
            <label className="billing-fld pct">
              <span>Business %</span>
              <input type="number" step="1" min="0" max="100" value={form.pct} onChange={set('pct')} />
            </label>
            <label className="billing-fld">
              <span>Paid from</span>
              <select value={form.paidFrom} onChange={set('paidFrom')}>
                <option value="business">Business account</option>
                <option value="personal">Personal (owner paid)</option>
              </select>
            </label>
            {!editingId && (
              <label className="billing-fld">
                <span>Repeats</span>
                <select value={form.repeat} onChange={set('repeat')}>
                  {RECURRENCE.filter((r) => !editingTemplateId || r.key !== 'once').map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </label>
            )}
            {!editingTemplateId && (
              <label className="billing-fld grow">
                <span>Receipt (link or where it is)</span>
                <input
                  type="text" placeholder="Amazon order 111-2223334, Gmail"
                  value={form.receipt} onChange={set('receipt')}
                />
              </label>
            )}
          </div>
          <div className="billing-actions" style={{ marginTop: '12px' }}>
            <button className="billing-btn primary" type="submit">
              {editingId || editingTemplateId ? 'Save' : 'Add'}
            </button>
            {(editingId || editingTemplateId) && (
              <button className="billing-btn" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
            {!editingId && !editingTemplateId && form.repeat !== 'once' ? (
              <span className="billing-hint">
                Logs this one now. Each later {form.repeat === 'yearly' ? 'year' : 'month'} shows up in
                Due at the top until you confirm or skip it.
              </span>
            ) : (
              cat.hint && <span className="billing-hint">{cat.hint}</span>
            )}
          </div>
        </form>
        <p className="billing-hint">
          Categories follow the Schedule C line numbers. Keep the receipt itself in email or a
          folder; this is the ledger that points to it. Check treatment with your preparer.
        </p>
      </div>

      {templates.length > 0 && (
        <div className="billing-card">
          <h3>Recurring</h3>
          <div className="billing-tablewrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Category</th>
                  <th className="num">Amount</th>
                  <th>Schedule</th>
                  <th>Next</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => {
                  const next = nextRecurringDate(t, today);
                  return (
                    <tr key={t.id}>
                      <td>
                        {[t.vendor, t.description].filter(Boolean).join(' · ')}
                        {t.paidFrom === 'personal' && <>{' '}<span className="billing-pill">personal</span></>}
                      </td>
                      <td className="nowrap">{expenseCategory(t.category).label}</td>
                      <td className="num">{money(t.amount)}</td>
                      <td className="nowrap">{recurringLabel(t)}</td>
                      <td className="nowrap">
                        {t.active === false ? <span className="billing-pill">stopped</span> : next ? fmtDate(next) : ''}
                      </td>
                      <td className="num nowrap">
                        <button className="billing-linkish" onClick={() => startEditTemplate(t)}>Edit</button>{' '}
                        {t.active === false ? (
                          <button className="billing-linkish" onClick={() => setTemplateActive(t, true)}>Resume</button>
                        ) : (
                          <button className="billing-linkish" onClick={() => setTemplateActive(t, false)}>Stop</button>
                        )}{' '}
                        <button className="billing-linkish danger" onClick={() => removeTemplate(t)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="billing-hint">
            Stop pauses future months. Deleting a logged month brings it back to Due; use Skip to drop
            a month instead.
          </p>
        </div>
      )}

      <div className="billing-card">
        <div className="billing-card-head">
          <h3>Expenses</h3>
          <div className="billing-actions">
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">All categories</option>
              {summary.lines.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <button
              className="billing-btn small"
              disabled={!summary.count}
              onClick={() => downloadFile(`azoni-expenses-${year}.csv`, expensesCsv(data, year), 'text/csv')}
            >
              Export {year} CSV
            </button>
          </div>
        </div>
        {rows.length ? (
          <>
            <div className="billing-tablewrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th></th>
                    <th>Category</th>
                    <th className="num">Amount</th>
                    <th className="num">Deductible</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {monthGroups.map((group) => (
                    <React.Fragment key={group.month}>
                      <tr className="billing-dayhead">
                        <td colSpan={3}>{monthLabel(group.month)}</td>
                        <td className="num">{money(group.total)}</td>
                        <td colSpan={2}></td>
                      </tr>
                      {group.rows.map((x) => {
                        const c = expenseCategory(x.category);
                        return (
                          <tr key={x.id}>
                            <td className="nowrap">{fmtDate(x.date)}</td>
                            <td>
                              {[x.vendor, x.description].filter(Boolean).join(' · ')}
                              {x.recurringId && (
                                <>{' '}<span className="billing-pill">recurring</span></>
                              )}
                              {x.paidFrom === 'personal' && (
                                <>{' '}<span className="billing-pill">personal</span></>
                              )}
                              {x.receipt && (
                                <div className="billing-hint">
                                  {/^https?:\/\//i.test(x.receipt) ? (
                                    <a href={x.receipt} target="_blank" rel="noopener noreferrer">receipt</a>
                                  ) : (
                                    x.receipt
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="nowrap">{c.label}</td>
                            <td className="num">{money(x.amount)}</td>
                            <td className="num">
                              {money(expenseDeductible(x))}
                              {(x.pct ?? 100) !== 100 && (
                                <div className="billing-hint">{x.pct}%</div>
                              )}
                            </td>
                            <td className="num nowrap">
                              <button className="billing-linkish" onClick={() => startEdit(x)}>
                                Edit
                              </button>{' '}
                              <button className="billing-linkish" onClick={() => copy(x)}>
                                Copy
                              </button>{' '}
                              <button className="billing-linkish danger" onClick={() => remove(x)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="billing-tfoot">
              {rows.length} expense{rows.length === 1 ? '' : 's'}, {money(shownTotal)} spent,{' '}
              {money(shownDeductible)} deductible
            </div>
          </>
        ) : (
          <div className="billing-empty">
            {summary.count
              ? 'Nothing in this category.'
              : `No expenses logged for ${year}. Add one above.`}
          </div>
        )}
      </div>

      {summary.count > 0 && (
        <div className="billing-card">
          <h3>Schedule C summary for {year}</h3>
          <div className="billing-tablewrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Category</th>
                  <th className="num">Count</th>
                  <th className="num">Spent</th>
                  <th className="num">Deductible</th>
                </tr>
              </thead>
              <tbody>
                {summary.lines.map((c) => (
                  <tr key={c.key}>
                    <td className="nowrap">{c.line}</td>
                    <td>{c.label}</td>
                    <td className="num">{c.count}</td>
                    <td className="num">{money(c.total)}</td>
                    <td className="num">{money(c.deductible)}</td>
                  </tr>
                ))}
                <tr className="billing-dayhead">
                  <td colSpan={2}>Total</td>
                  <td className="num">{summary.count}</td>
                  <td className="num">{money(summary.total)}</td>
                  <td className="num">{money(summary.deductible)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="billing-hint">
            {summary.personal > 0
              ? `${money(summary.personal)} of this was paid from personal funds. Record it as an owner contribution or reimburse yourself from the business account.`
              : 'Everything here was paid from the business account.'}
          </p>
        </div>
      )}
    </>
  );
};

export default ExpensesSection;
