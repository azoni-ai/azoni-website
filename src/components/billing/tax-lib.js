// Pure helpers for the Taxes tab: federal estimated-payment periods, Washington
// excise-return periods, cash-basis income per period, and the year rollup.
//
// Everything is cash basis: income counts on the invoice's paidDate, expenses
// on their date. Nothing here is tax advice; the "rough payment" is a planning
// number (net profit × set-aside %) and the safe harbor is the prior-year rule.

import {
  addDaysISO, csvCell, expenseDeductible, parseISO, round2, todayISO,
} from './billing-lib';

export const TAX_AGENCIES = [
  { key: 'irs', label: 'IRS (1040-ES)' },
  { key: 'wa', label: 'WA DOR (excise return)' },
  { key: 'seattle', label: 'City of Seattle' },
  { key: 'kent', label: 'City of Kent' },
  { key: 'other', label: 'Other' },
];

export const agencyLabel = (key) =>
  (TAX_AGENCIES.find((a) => a.key === key) || TAX_AGENCIES[TAX_AGENCIES.length - 1]).label;

export const WA_FREQUENCIES = [
  { key: '', label: 'Not set yet' },
  { key: 'monthly', label: 'Monthly (due the 25th of the next month)' },
  { key: 'quarterly', label: 'Quarterly (due the end of the next month)' },
  { key: 'annual', label: 'Annual (due April 15)' },
];

// Per-year filing checklist. Ticks persist in data.taxChecklist[year][key].
export const TAX_CHECKLIST = [
  { key: 'income', label: 'Paid-invoice subtotal for the year matches the client 1099-NEC' },
  { key: 'expenses', label: 'Expenses CSV exported and every receipt is in one folder' },
  { key: 'bank', label: 'Business bank statements for the year saved' },
  { key: 'fed', label: 'All four federal estimated payments recorded below' },
  { key: 'wa', label: 'WA excise return filed for every period and sales tax remitted' },
  { key: 'city', label: 'Seattle and Kent license tax filed, or confirmed under the threshold' },
  { key: 'licenses', label: 'WA, Seattle, and Kent business licenses renewed' },
  { key: 'homeoffice', label: 'Home office square footage measured, if claiming it' },
  { key: 'mileage', label: 'Mileage log complete, if claiming a vehicle' },
  { key: 'health', label: 'Health insurance premiums for the year totaled' },
  { key: 'retirement', label: 'Retirement contributions made, if any' },
  { key: 'prior', label: 'Prior-year return on hand for the preparer' },
];

/* ---------- dates ---------- */

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const lastDay = (y, m) => new Date(y, m, 0).getDate();

// Due dates that land on a weekend move to Monday. Federal holidays can push
// a date one more day; the tables say so.
export const rollWeekend = (s) => {
  const dow = parseISO(s).getDay();
  if (dow === 6) return addDaysISO(s, 2);
  if (dow === 0) return addDaysISO(s, 1);
  return s;
};

export const fmtRange = (start, end) => {
  const opts = { month: 'short', day: 'numeric' };
  return `${parseISO(start).toLocaleDateString('en-US', opts)} to ${parseISO(end).toLocaleDateString('en-US', opts)}`;
};

// IRS estimated-tax periods are uneven: 3, 2, 3 and 4 months.
export const federalQuarters = (year) => {
  const y = Number(year);
  return [
    { key: `${y}-Q1`, label: 'Q1', start: iso(y, 1, 1), end: iso(y, 3, 31), due: rollWeekend(iso(y, 4, 15)) },
    { key: `${y}-Q2`, label: 'Q2', start: iso(y, 4, 1), end: iso(y, 5, 31), due: rollWeekend(iso(y, 6, 15)) },
    { key: `${y}-Q3`, label: 'Q3', start: iso(y, 6, 1), end: iso(y, 8, 31), due: rollWeekend(iso(y, 9, 15)) },
    { key: `${y}-Q4`, label: 'Q4', start: iso(y, 9, 1), end: iso(y, 12, 31), due: rollWeekend(iso(y + 1, 1, 15)) },
  ];
};

export const waPeriods = (year, frequency) => {
  const y = Number(year);
  if (frequency === 'monthly') {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const ny = m === 12 ? y + 1 : y;
      const nm = m === 12 ? 1 : m + 1;
      return {
        key: `${y}-${String(m).padStart(2, '0')}`,
        label: parseISO(iso(y, m, 1)).toLocaleDateString('en-US', { month: 'short' }),
        start: iso(y, m, 1),
        end: iso(y, m, lastDay(y, m)),
        due: rollWeekend(iso(ny, nm, 25)),
      };
    });
  }
  if (frequency === 'quarterly') {
    return [1, 2, 3, 4].map((q) => {
      const sm = (q - 1) * 3 + 1;
      const em = sm + 2;
      const ny = q === 4 ? y + 1 : y;
      const nm = q === 4 ? 1 : em + 1;
      return {
        key: `${y}-Q${q}`,
        label: `Q${q}`,
        start: iso(y, sm, 1),
        end: iso(y, em, lastDay(y, em)),
        due: rollWeekend(iso(ny, nm, lastDay(ny, nm))),
      };
    });
  }
  if (frequency === 'annual') {
    return [{ key: `${y}`, label: String(y), start: iso(y, 1, 1), end: iso(y, 12, 31), due: rollWeekend(iso(y + 1, 4, 15)) }];
  }
  return [];
};

/* ---------- cash-basis income and expenses per period ---------- */

export const paidInvoicesIn = (data, start, end) =>
  data.invoices.filter(
    (i) => i.status === 'paid' && i.paidDate && i.paidDate >= start && i.paidDate <= end
  );

// Gross receipts exclude the sales tax collected (that money belongs to DOR).
// Reimbursed expenses billed to the client are income; the underlying
// purchases are deductions on the Expenses tab.
export const incomeIn = (data, start, end) => {
  const invoices = paidInvoicesIn(data, start, end);
  const salesTax = round2(invoices.reduce((s, i) => s + (i.tax || 0), 0));
  const gross = round2(invoices.reduce((s, i) => s + ((i.total || 0) - (i.tax || 0)), 0));
  return { invoices, gross, salesTax };
};

export const deductibleIn = (data, start, end) =>
  round2(
    data.expenses
      .filter((x) => x.date >= start && x.date <= end)
      .reduce((s, x) => s + expenseDeductible(x), 0)
  );

export const paymentsFor = (data, agency, periodKey) =>
  round2(
    data.taxPayments
      .filter((p) => p.agency === agency && p.period === periodKey)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  );

const paymentsInYear = (data, agencies, year) =>
  round2(
    data.taxPayments
      .filter((p) => agencies.includes(p.agency) && String(p.period || '').startsWith(String(year)))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  );

// Prior-year safe harbor: 100% of last year's total tax, 110% when AGI was
// over $150k. Paying a quarter of it by each date avoids the penalty.
export const safeHarborAnnual = (ts) =>
  round2((Number(ts.priorYearTax) || 0) * (ts.highIncome ? 1.1 : 1));

export const periodStatus = (period, target, paid) => {
  const today = todayISO();
  if (paid > 0 && paid >= target) return 'paid';
  if (today <= period.end) return 'upcoming';
  if (target <= 0) return 'none';
  if (today <= period.due) return 'open';
  return 'overdue';
};

export const STATUS_LABEL = {
  paid: 'paid', upcoming: 'upcoming', none: 'nothing due', open: 'due', overdue: 'late',
};
export const STATUS_PILL = { paid: 'paid', open: 'sent', overdue: 'overdue', upcoming: '', none: '' };

// One row per federal quarter with income, planning numbers, and payments.
export const federalRows = (data, year) => {
  const ts = data.taxSettings;
  const pct = Number(ts.setAsidePct) || 0;
  const harbor = safeHarborAnnual(ts);
  return federalQuarters(year).map((q) => {
    const { gross } = incomeIn(data, q.start, q.end);
    const deductible = deductibleIn(data, q.start, q.end);
    const net = round2(gross - deductible);
    const rough = round2(Math.max(0, net) * pct / 100);
    const safe = harbor > 0 ? round2(harbor / 4) : null;
    // Either amount satisfies the rule, so the lower one is the target.
    const target = safe !== null ? Math.min(rough, safe) : rough;
    const paid = paymentsFor(data, 'irs', q.key);
    return { ...q, gross, deductible, net, rough, safe, target, paid, status: periodStatus(q, target, paid) };
  });
};

export const waRows = (data, year) => {
  const ts = data.taxSettings;
  const boRate = Number(ts.boRate) || 0;
  return waPeriods(year, ts.waFrequency).map((p) => {
    const { gross, salesTax } = incomeIn(data, p.start, p.end);
    const bo = round2(gross * boRate / 100);
    const target = round2(salesTax + bo);
    const paid = paymentsFor(data, 'wa', p.key);
    return { ...p, gross, salesTax, bo, target, paid, status: periodStatus(p, target, paid) };
  });
};

export const taxYearSummary = (data, year) => {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const { invoices, gross, salesTax } = incomeIn(data, start, end);
  const deductible = deductibleIn(data, start, end);
  const net = round2(gross - deductible);
  const ts = data.taxSettings;
  const setAside = round2(Math.max(0, net) * (Number(ts.setAsidePct) || 0) / 100);
  const fedPaid = paymentsInYear(data, ['irs'], year);
  const waPaid = paymentsInYear(data, ['wa'], year);
  const cityPaid = paymentsInYear(data, ['seattle', 'kent'], year);
  const bo = round2(gross * (Number(ts.boRate) || 0) / 100);
  return {
    invoiceCount: invoices.length, gross, salesTax, deductible, net, setAside,
    fedPaid, waPaid, cityPaid, bo, remaining: round2(Math.max(0, setAside - fedPaid)),
  };
};

// Years with any paid invoice, expense, or payment, plus the current year.
export const taxYears = (data) => {
  const years = new Set();
  data.invoices.forEach((i) => { if (i.status === 'paid' && i.paidDate) years.add(i.paidDate.slice(0, 4)); });
  data.expenses.forEach((x) => { if (x.date) years.add(x.date.slice(0, 4)); });
  data.taxPayments.forEach((p) => { if (p.date) years.add(p.date.slice(0, 4)); });
  years.add(String(new Date().getFullYear()));
  return [...years].filter(Boolean).sort().reverse();
};

/* ---------- preparer exports ---------- */

export const incomeCsv = (data, year) => {
  const head = 'invoice,date_issued,paid_date,period_start,period_end,labor,reimbursed_expenses,subtotal,sales_tax,total';
  const lines = paidInvoicesIn(data, `${year}-01-01`, `${year}-12-31`)
    .sort((a, b) => a.paidDate.localeCompare(b.paidDate))
    .map((i) => [
      csvCell(i.number), i.dateIssued, i.paidDate, i.periodStart, i.periodEnd,
      round2(i.laborSubtotal || 0).toFixed(2), round2(i.expensesTotal || 0).toFixed(2),
      round2((i.total || 0) - (i.tax || 0)).toFixed(2), round2(i.tax || 0).toFixed(2),
      round2(i.total || 0).toFixed(2),
    ].join(','));
  return `${head}\n${lines.join('\n')}`;
};

export const taxPaymentsCsv = (data, year) => {
  const head = 'date,agency,period,amount,confirmation,note';
  const lines = data.taxPayments
    .filter((p) => (p.date || '').startsWith(String(year)) || String(p.period || '').startsWith(String(year)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => [
      p.date, csvCell(agencyLabel(p.agency)), csvCell(p.period),
      round2(Number(p.amount) || 0).toFixed(2), csvCell(p.confirmation), csvCell(p.note),
    ].join(','));
  return `${head}\n${lines.join('\n')}`;
};
