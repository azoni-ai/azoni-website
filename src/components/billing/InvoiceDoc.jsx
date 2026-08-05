import React, { useEffect } from 'react';
import { fmtDate, hoursFmt2, money } from './billing-lib';

// The printable invoice document. Rendered as white paper regardless of the
// site theme; the print stylesheet in billing-warm.css hides everything else.
// The body class scopes those print rules: billing-warm.css stays loaded for
// the rest of the SPA session, and without the class its "hide everything"
// print block would blank printing on every other page.
const InvoiceDoc = ({ inv }) => {
  useEffect(() => {
    document.body.classList.add('billing-has-doc');
    return () => document.body.classList.remove('billing-has-doc');
  }, []);

  const contact = [inv.from.email, inv.from.phone].filter(Boolean).join(' · ');
  return (
    <div className="billing-print-area">
      <div className="billing-invoice-doc">
        <div className="inv-head">
          <div>
            <div className="inv-biz">{inv.from.name}</div>
            <div className="inv-addr">
              {inv.from.address}
              {inv.from.address ? '\n' : ''}
              {contact}
            </div>
          </div>
          <div className="inv-meta">
            <div className="inv-title">INVOICE</div>
            <div><span>Number</span><b>{inv.number}</b></div>
            <div><span>Date</span>{fmtDate(inv.dateIssued)}</div>
            <div><span>Due</span>{fmtDate(inv.dueDate)} (Net {inv.netDays})</div>
            {inv.poNumber && <div><span>PO / vendor no.</span>{inv.poNumber}</div>}
          </div>
        </div>

        <div className="inv-parties">
          <div>
            <h4>Bill to</h4>
            <div className="inv-who">
              {inv.billTo.name}
              {inv.billTo.address ? `\n${inv.billTo.address}` : ''}
              {inv.billTo.email ? `\n${inv.billTo.email}` : ''}
            </div>
          </div>
          <div>
            <h4>Service period</h4>
            {fmtDate(inv.periodStart)} to {fmtDate(inv.periodEnd)}
          </div>
        </div>

        {inv.lines.length > 0 && (
          <table className="inv-table">
            <thead>
              <tr>
                <th>Date</th><th>Project</th><th>Description</th><th className="num">Hours</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((line, i) => (
                <tr key={i}>
                  <td className="nowrap">{fmtDate(line.date)}</td>
                  <td>{line.project}</td>
                  <td>{line.description}</td>
                  <td className="num">{hoursFmt2(line.hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {inv.expenses.length > 0 && (
          <table className="inv-table inv-expenses">
            <thead>
              <tr><th>Expense</th><th className="num">Amount</th></tr>
            </thead>
            <tbody>
              {inv.expenses.map((x, i) => (
                <tr key={i}>
                  <td>{x.description}{x.taxable ? ' *' : ''}</td>
                  <td className="num">{money(x.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="inv-summary">
          <table>
            <tbody>
              <tr>
                <td>Labor ({hoursFmt2(inv.hoursTotal)} hr × {money(inv.rate)}/hr)</td>
                <td className="num">{money(inv.laborSubtotal)}</td>
              </tr>
              {inv.expensesTotal > 0 && (
                <tr>
                  <td>Expenses</td>
                  <td className="num">{money(inv.expensesTotal)}</td>
                </tr>
              )}
              <tr>
                <td>{inv.taxLabel} ({inv.taxRate}%)</td>
                <td className="num">{money(inv.tax)}</td>
              </tr>
              <tr className="total">
                <td>Total due</td>
                <td className="num">{money(inv.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {inv.taxableExpenses > 0 && (
          <div className="inv-taxnote">* included in the sales tax base</div>
        )}

        <div className="inv-note">
          {inv.paymentNote}
          {inv.from.email ? `\nQuestions: ${inv.from.email}` : ''}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDoc;
