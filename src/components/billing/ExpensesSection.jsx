import React, { useMemo, useState } from 'react';
import {
  EXPENSE_CATEGORIES, downloadFile, expenseCategory, expenseDeductible, expenseSummary,
  expenseYears, expensesCsv, fmtDate, money, parseISO, round2, sortedExpenses, todayISO, uid,
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
});

const ExpensesSection = ({ data, mutate }) => {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [catFilter, setCatFilter] = useState('all');

  const years = useMemo(() => expenseYears(data), [data]);
  const summary = useMemo(() => expenseSummary(data, year), [data, year]);

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

  const submit = (e) => {
    e.preventDefault();
    const amount = round2(Number(form.amount));
    // Blank share means fully deductible; otherwise clamp to 0..100.
    const pct = form.pct === '' ? 100 : Math.min(100, Math.max(0, Math.round(Number(form.pct))));
    if (!form.date || form.amount === '' || !Number.isFinite(amount) || amount < 0) return;
    if (!Number.isFinite(pct)) return;
    const fields = {
      date: form.date,
      vendor: form.vendor.trim(),
      description: form.description.trim(),
      category: expenseCategory(form.category).key,
      amount,
      pct,
      paidFrom: form.paidFrom === 'personal' ? 'personal' : 'business',
      receipt: form.receipt.trim(),
    };
    if (editingId) {
      mutate((d) => ({
        ...d,
        expenses: d.expenses.map((x) => (x.id === editingId ? { ...x, ...fields } : x)),
      }));
      setEditingId(null);
    } else {
      mutate((d) => ({
        ...d,
        expenses: [...d.expenses, { id: uid(), created: Date.now(), ...fields }],
      }));
    }
    setForm(emptyForm());
    if (!fields.date.startsWith(year)) setYear(fields.date.slice(0, 4));
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
  });

  const startEdit = (x) => {
    setEditingId(x.id);
    setForm(fillFrom(x, x.date));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Recurring charges (hosting, domains, subscriptions): same row, today's date.
  const copy = (x) => {
    setEditingId(null);
    setForm({ ...fillFrom(x, todayISO()), receipt: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const remove = (x) => {
    const what = [x.vendor, x.description].filter(Boolean).join(' · ') || 'this expense';
    if (!window.confirm(`Delete ${what} (${money(x.amount)}) on ${fmtDate(x.date)}?`)) return;
    if (editingId === x.id) cancelEdit();
    mutate((d) => ({ ...d, expenses: d.expenses.filter((y) => y.id !== x.id) }));
  };

  const cat = expenseCategory(form.category);

  return (
    <>
      <div className="billing-card">
        <h3>{editingId ? 'Edit expense' : 'Log expense'}</h3>
        <form onSubmit={submit}>
          <div className="billing-frow">
            <label className="billing-fld">
              <span>Date</span>
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
            <label className="billing-fld grow">
              <span>Receipt (link or where it is)</span>
              <input
                type="text" placeholder="Amazon order 111-2223334, Gmail"
                value={form.receipt} onChange={set('receipt')}
              />
            </label>
          </div>
          <div className="billing-actions" style={{ marginTop: '12px' }}>
            <button className="billing-btn primary" type="submit">
              {editingId ? 'Save' : 'Add'}
            </button>
            {editingId && (
              <button className="billing-btn" type="button" onClick={cancelEdit}>
                Cancel
              </button>
            )}
            {cat.hint && <span className="billing-hint">{cat.hint}</span>}
          </div>
        </form>
        <p className="billing-hint">
          Categories follow the Schedule C line numbers. Keep the receipt itself in email or a
          folder; this is the ledger that points to it. Check treatment with your preparer.
        </p>
      </div>

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
