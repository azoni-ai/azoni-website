import React, { useState } from 'react';
import {
  buildInvoice, cycleIndexOf, defaultDraft, draftTotals, fmtDate, hoursFmt,
  invoiceById, invoiceDateFor, invoiceNumber, isOverdue, money, periodAt,
  periodCoverage, addDaysISO, todayISO,
} from './billing-lib';
import InvoiceDoc from './InvoiceDoc';

const StatusPill = ({ inv }) => {
  if (inv.status === 'paid') return <span className="billing-pill paid">{'✓'} Paid</span>;
  if (isOverdue(inv)) return <span className="billing-pill overdue">{'⚠'} Overdue</span>;
  if (inv.status === 'sent') return <span className="billing-pill sent">Sent</span>;
  return <span className="billing-pill">Draft</span>;
};

const InvoicesSection = ({ data, mutate }) => {
  const [view, setView] = useState({ mode: 'list', id: null });
  const [draft, setDraft] = useState(null);

  const openNew = () => {
    setDraft(defaultDraft(data));
    setView({ mode: 'new', id: null });
  };

  const create = () => {
    const t = draftTotals(data, draft);
    if (!t.entries.length && !t.expensesTotal) {
      window.alert('Nothing to invoice: no unbilled time in this period and no expenses.');
      return;
    }
    let created = null;
    mutate((d) => {
      const { invoice, includedIds } = buildInvoice(d, draft);
      created = invoice;
      return {
        ...d,
        settings: { ...d.settings, nextNumber: (d.settings.nextNumber || 1) + 1 },
        entries: d.entries.map((e) =>
          includedIds.has(e.id) ? { ...e, invoiceId: invoice.id } : e
        ),
        invoices: [...d.invoices, invoice],
      };
    });
    setDraft(null);
    setView({ mode: 'detail', id: created.id });
  };

  const setStatus = (inv, status) =>
    mutate((d) => ({
      ...d,
      invoices: d.invoices.map((i) =>
        i.id === inv.id
          ? { ...i, status, paidDate: status === 'paid' ? i.paidDate || todayISO() : null }
          : i
      ),
    }));

  const removeInvoice = (inv) => {
    if (!window.confirm(
      `Delete invoice ${inv.number}? Its time entries return to unbilled. The number is not reused.`
    )) return;
    mutate((d) => ({
      ...d,
      entries: d.entries.map((e) => (e.invoiceId === inv.id ? { ...e, invoiceId: null } : e)),
      invoices: d.invoices.filter((i) => i.id !== inv.id),
    }));
    setView({ mode: 'list', id: null });
  };

  const printInvoice = (inv) => {
    const old = document.title;
    document.title = inv.number;
    window.addEventListener('afterprint', () => { document.title = old; }, { once: true });
    window.print();
  };

  /* ---------- new invoice ---------- */
  if (view.mode === 'new' && draft) {
    const s = data.settings;
    const t = draftTotals(data, draft);
    const due = addDaysISO(draft.invoiceDate, s.netDays || 0);
    const setD = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
    const setExpense = (i, k, v) =>
      setDraft((d) => ({
        ...d,
        expenses: d.expenses.map((x, j) => (j === i ? { ...x, [k]: v } : x)),
      }));

    return (
      <>
        <div className="billing-card">
          <h3>New invoice {invoiceNumber(s)}</h3>
          <div className="billing-frow">
            <label className="billing-fld">
              <span>Period start</span>
              <input type="date" value={draft.periodStart} onChange={setD('periodStart')} />
            </label>
            <label className="billing-fld">
              <span>Period end</span>
              <input type="date" value={draft.periodEnd} onChange={setD('periodEnd')} />
            </label>
            <label className="billing-fld">
              <span>Invoice date</span>
              <input type="date" value={draft.invoiceDate} onChange={setD('invoiceDate')} />
            </label>
            <label className="billing-fld">
              <span>Due (Net {s.netDays})</span>
              <input type="text" disabled value={fmtDate(due)} />
            </label>
          </div>
          <p className="billing-hint">Unbilled entries inside the period are included automatically.</p>
        </div>

        {(() => {
          const byDate = new Map();
          t.entries.forEach((e) => {
            byDate.set(e.date, (byDate.get(e.date) || 0) + (e.hours || 0));
          });
          const dayRows = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
          return (
            <div className="billing-card">
              <h3>
                Included time ({dayRows.length} day{dayRows.length === 1 ? '' : 's'},{' '}
                {hoursFmt(t.hoursTotal)} hours)
              </h3>
              {dayRows.length ? (
                <div className="billing-tablewrap">
                  <table className="billing-table totals">
                    <thead>
                      <tr><th>Date</th><th className="num">Hours</th></tr>
                    </thead>
                    <tbody>
                      {dayRows.map(([date, hours]) => (
                        <tr key={date}>
                          <td className="nowrap">{fmtDate(date)}</td>
                          <td className="num">{hoursFmt(hours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="billing-empty">No unbilled entries in this period.</div>
              )}
            </div>
          );
        })()}

        <div className="billing-card">
          <div className="billing-card-head">
            <h3>Work performed (printed on the invoice)</h3>
            <button
              className="billing-btn small"
              onClick={() => {
                const parts = Object.keys(data.dayNotes)
                  .sort()
                  .filter((k) => k >= draft.periodStart && k <= draft.periodEnd && data.dayNotes[k])
                  .map((k) => `${fmtDate(k)}: ${data.dayNotes[k].trim()}`);
                if (!parts.length) {
                  window.alert('No day notes in this period.');
                  return;
                }
                setDraft((d) => ({
                  ...d,
                  workSummary: (d.workSummary ? `${d.workSummary}\n\n` : '') + parts.join('\n'),
                }));
              }}
            >
              Insert day notes
            </button>
          </div>
          <label className="billing-fld full">
            <textarea
              className="billing-daynote"
              rows={6}
              placeholder="One summary of the work performed this billing cycle."
              value={draft.workSummary || ''}
              onChange={(e) => setDraft((d) => ({ ...d, workSummary: e.target.value }))}
            />
          </label>
          <p className="billing-hint">
            Day notes are your private journal. Inserting copies them here to edit down; only this
            text prints on the invoice.
          </p>
        </div>

        <div className="billing-card">
          <h3>Reimbursable expenses (preapproved only)</h3>
          {draft.expenses.map((x, i) => (
            <div className="billing-frow expense-row" key={i}>
              <label className="billing-fld grow">
                <span>Description</span>
                <input
                  type="text" value={x.description}
                  onChange={(e) => setExpense(i, 'description', e.target.value)}
                />
              </label>
              <label className="billing-fld">
                <span>Amount</span>
                <input
                  type="number" step="0.01" min="0" placeholder="0.00" value={x.amount}
                  onChange={(e) => setExpense(i, 'amount', e.target.value)}
                />
              </label>
              <label className="billing-check">
                <input
                  type="checkbox" checked={!!x.taxable}
                  onChange={(e) => setExpense(i, 'taxable', e.target.checked)}
                />
                taxable
              </label>
              <button
                className="billing-btn small"
                onClick={() => setDraft((d) => ({ ...d, expenses: d.expenses.filter((_, j) => j !== i) }))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="billing-btn small"
            onClick={() => setDraft((d) => ({
              ...d,
              expenses: [...d.expenses, { description: '', amount: '', taxable: false }],
            }))}
          >
            Add expense
          </button>
          <p className="billing-hint">
            Mark an expense taxable only if it belongs in the sales tax base. Confirm treatment
            before invoicing expenses.
          </p>
        </div>

        <div className="billing-card">
          <h3>Totals</h3>
          <table className="billing-table totals">
            <tbody>
              <tr>
                <td>Labor ({hoursFmt(t.hoursTotal)} hr × {money(s.rate)})</td>
                <td className="num">{money(t.laborSubtotal)}</td>
              </tr>
              {t.expensesTotal > 0 && (
                <tr><td>Expenses</td><td className="num">{money(t.expensesTotal)}</td></tr>
              )}
              <tr>
                <td>{s.taxLabel} ({s.taxRate}%)</td>
                <td className="num">{money(t.tax)}</td>
              </tr>
              <tr className="strong">
                <td>Total</td>
                <td className="num">{money(t.total)}</td>
              </tr>
            </tbody>
          </table>
          <div className="billing-actions" style={{ marginTop: '14px' }}>
            <button className="billing-btn primary" onClick={create}>Create invoice</button>
            <button
              className="billing-btn"
              onClick={() => { setDraft(null); setView({ mode: 'list', id: null }); }}
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="billing-card">
          <div className="billing-card-head">
            <h3>Preview</h3>
            <span className="billing-hint nowrap" style={{ margin: 0 }}>
              Nothing is saved and no number is used until you create it.
            </span>
          </div>
        </div>
        <InvoiceDoc inv={buildInvoice(data, draft).invoice} />
      </>
    );
  }

  /* ---------- detail ---------- */
  if (view.mode === 'detail') {
    const inv = invoiceById(data, view.id);
    if (!inv) {
      setView({ mode: 'list', id: null });
      return null;
    }
    return (
      <>
        <div className="billing-card">
          <div className="billing-card-head">
            <div className="billing-actions">
              <button className="billing-btn" onClick={() => setView({ mode: 'list', id: null })}>
                {'←'} All invoices
              </button>
              <StatusPill inv={inv} />
              {inv.status === 'paid' && inv.paidDate && (
                <span className="billing-hint nowrap">paid {fmtDate(inv.paidDate)}</span>
              )}
            </div>
            <div className="billing-actions">
              <select value={inv.status} onChange={(e) => setStatus(inv, e.target.value)}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
              <button className="billing-btn primary" onClick={() => printInvoice(inv)}>
                Print / save PDF
              </button>
              <button className="billing-btn danger" onClick={() => removeInvoice(inv)}>
                Delete
              </button>
            </div>
          </div>
        </div>
        <InvoiceDoc inv={inv} />
      </>
    );
  }

  /* ---------- list ---------- */
  const invoices = [...data.invoices].sort(
    (a, b) => b.dateIssued.localeCompare(a.dateIssued) || b.number.localeCompare(a.number)
  );

  // Billing schedule derived from the cycle anchor: a few cycles around today,
  // each marked invoiced / current / ready / upcoming.
  const today = todayISO();
  const anchor = data.settings.cycleAnchor;
  let scheduleRows = [];
  if (anchor && today >= anchor) {
    const cur = cycleIndexOf(anchor, today);
    for (let i = Math.max(0, cur - 2); i <= cur + 3; i++) {
      const p = periodAt(anchor, i);
      // Coverage by date-range overlap, not exact period dates — merged or
      // partial invoices must not leave a false "ready" (or a false check).
      const cov = periodCoverage(data, p);
      const status = cov.covered
        ? 'invoiced'
        : p.end < today ? 'ready' : p.start <= today ? 'current' : 'upcoming';
      scheduleRows.push({ ...p, inv: cov.invoice, through: cov.through, status });
    }
  }

  const invoicePeriod = (row) => {
    const start = row.through && row.through >= row.start ? addDaysISO(row.through, 1) : row.start;
    setDraft({ periodStart: start, periodEnd: row.end, invoiceDate: today, expenses: [], workSummary: '' });
    setView({ mode: 'new', id: null });
  };

  return (
    <>
    {scheduleRows.length > 0 && (
      <div className="billing-card">
        <h3>Billing schedule (two-week cycles from {fmtDate(anchor)})</h3>
        <div className="billing-tablewrap">
          <table className="billing-table">
            <thead>
              <tr><th>Work covered</th><th>Invoice date</th><th>Net {data.settings.netDays} due</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {scheduleRows.map((row) => (
                <tr key={row.start} className={row.status === 'current' ? 'billing-schedule-current' : ''}>
                  <td className="nowrap">{fmtDate(row.start)} to {fmtDate(row.end)}</td>
                  <td className="nowrap">{fmtDate(invoiceDateFor(row.end))}</td>
                  <td className="nowrap">{fmtDate(addDaysISO(invoiceDateFor(row.end), data.settings.netDays || 0))}</td>
                  <td>
                    {row.status === 'invoiced' && <span className="billing-pill paid">{'✓'} {row.inv.number}</span>}
                    {row.status === 'current' && <span className="billing-pill sent">Current</span>}
                    {row.status === 'ready' && <span className="billing-pill overdue">Ready to invoice</span>}
                    {row.status === 'upcoming' && <span className="billing-hint nowrap" style={{ margin: 0 }}>upcoming</span>}
                  </td>
                  <td className="num">
                    {row.status === 'ready' && (
                      <button className="billing-btn small" onClick={() => invoicePeriod(row)}>
                        Invoice this period
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
    <div className="billing-card">
      <div className="billing-card-head">
        <h3>Invoices</h3>
        <button className="billing-btn primary" onClick={openNew}>New invoice</button>
      </div>
      {invoices.length ? (
        <div className="billing-tablewrap">
          <table className="billing-table">
            <thead>
              <tr>
                <th>Number</th><th>Service period</th><th>Issued</th><th>Due</th>
                <th className="num">Total</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="billing-rowlink"
                  onClick={() => setView({ mode: 'detail', id: inv.id })}
                >
                  <td className="nowrap"><b>{inv.number}</b></td>
                  <td className="nowrap">{fmtDate(inv.periodStart)} to {fmtDate(inv.periodEnd)}</td>
                  <td className="nowrap">{fmtDate(inv.dateIssued)}</td>
                  <td className="nowrap">{fmtDate(inv.dueDate)}</td>
                  <td className="num">{money(inv.total)}</td>
                  <td><StatusPill inv={inv} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="billing-empty">No invoices yet. Log time, then create your first invoice.</div>
      )}
    </div>
    </>
  );
};

export default InvoicesSection;
