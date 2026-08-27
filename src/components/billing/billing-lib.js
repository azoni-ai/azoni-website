// Pure helpers and domain logic for the admin Billing tab. The data shape
// ({ settings, entries, invoices }) is identical to the standalone desktop app
// (Desktop/Meme/azoni-invoices), so JSON backups round-trip between the two.
//
// Defaults here ship in the public JS bundle — keep client names, rates, and
// any other contract terms out of them. Real values live only in the private
// Firestore doc.

export const round2 = (n) => Math.round(((n || 0) + Number.EPSILON) * 100) / 100;

const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const money = (n) => moneyFmt.format(round2(n));

const wholeFmt = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
});
export const moneyWhole = (n) => wholeFmt.format(Math.round(n || 0));

export const hoursFmt = (n) =>
  (Math.round((n || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });

// Invoice-document variant: fixed two decimals so a column of 8.00 / 6.50 /
// 7.25 reads uniformly on the client-facing PDF.
export const hoursFmt2 = (n) =>
  (Math.round((n || 0) * 100) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const dateToISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayISO = () => dateToISO(new Date());

export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const fmtDate = (s) => {
  if (!s || typeof s !== 'string') return '';
  return parseISO(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const addDaysISO = (s, days) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

export const defaultData = () => ({
  settings: {
    from: { name: 'Azoni LLC', address: '', email: '', phone: '' },
    billTo: { name: '', address: '', email: '', poNumber: '' },
    rate: 0,
    netDays: 15,
    taxLabel: 'WA retail sales tax',
    taxRate: 10.55,
    invoicePrefix: 'AZONI-2026-',
    nextNumber: 1,
    paymentNote: 'Payment by ACH using banking information on file.',
    lastBackup: null,
    // Two-week billing periods count from this date (the commencement date).
    cycleAnchor: '2026-08-11',
  },
  entries: [],
  invoices: [],
  // Per-day journal, keyed by ISO date: what the day was, meetings, random notes.
  dayNotes: {},
  // Free-form reference notes outside the daily log: people, processes, links.
  companyNotes: '',
});

// Older saves and desktop-app backups predate dayNotes/companyNotes/cycleAnchor;
// fill the gaps so every consumer can assume the full shape.
export const normalizeData = (d) => {
  const base = defaultData();
  return {
    settings: { ...base.settings, ...(d.settings || {}) },
    entries: Array.isArray(d.entries) ? d.entries : [],
    invoices: Array.isArray(d.invoices) ? d.invoices : [],
    dayNotes: d.dayNotes && typeof d.dayNotes === 'object' && !Array.isArray(d.dayNotes) ? d.dayNotes : {},
    companyNotes: typeof d.companyNotes === 'string' ? d.companyNotes : '',
  };
};

/* ---------- billing cycles (two-week periods from the anchor date) ---------- */

const DAY_MS = 86400000;

export const cycleIndexOf = (anchor, dateISO) => {
  // Round the day difference first so a DST hour can't skew the division.
  const days = Math.round((parseISO(dateISO) - parseISO(anchor)) / DAY_MS);
  return Math.floor(days / 14);
};

export const periodAt = (anchor, index) => ({
  index,
  start: addDaysISO(anchor, index * 14),
  end: addDaysISO(anchor, index * 14 + 13),
});

export const periodForDate = (anchor, dateISO) => periodAt(anchor, cycleIndexOf(anchor, dateISO));

// Schedule rule: invoice the day after the period ends; due netDays later.
export const invoiceDateFor = (periodEnd) => addDaysISO(periodEnd, 1);

// How much of a grid period existing invoices cover. Invoice period dates are
// freely editable (merged or partial periods happen), so match by date-range
// overlap, never by exact periodStart equality: `covered` means some invoice
// reaches the period's end; `through` is the latest invoiced date touching it.
export const periodCoverage = (data, p) => {
  const overlapping = data.invoices.filter(
    (i) => i.periodStart <= p.end && i.periodEnd >= p.start
  );
  if (!overlapping.length) return { covered: false, through: null, invoice: null };
  const through = overlapping.reduce(
    (m, i) => (i.periodEnd > m ? i.periodEnd : m),
    overlapping[0].periodEnd
  );
  return {
    covered: through >= p.end,
    through,
    invoice: overlapping.find((i) => i.periodEnd === through) || null,
  };
};

export const validBackup = (d) =>
  !!(d && typeof d === 'object' && !Array.isArray(d) &&
     d.settings && typeof d.settings === 'object' && !Array.isArray(d.settings) &&
     Array.isArray(d.entries) && Array.isArray(d.invoices));

export const unbilledEntries = (data) => data.entries.filter((e) => !e.invoiceId);

export const isOverdue = (inv) => inv.status === 'sent' && todayISO() > inv.dueDate;

export const invoiceById = (data, id) => data.invoices.find((i) => i.id === id);

export const sortedEntries = (data) =>
  [...data.entries].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0)
  );

export const computeStats = (data) => {
  const un = unbilledEntries(data);
  const uHours = round2(un.reduce((s, e) => s + (e.hours || 0), 0));
  const uAmt = round2(uHours * (data.settings.rate || 0));
  const outstanding = data.invoices.filter((i) => i.status === 'sent');
  const oAmt = round2(outstanding.reduce((s, i) => s + (i.total || 0), 0));
  const overdue = outstanding.filter(isOverdue).length;
  const year = String(new Date().getFullYear());
  const paid = data.invoices.filter(
    (i) => i.status === 'paid' && i.paidDate && i.paidDate.startsWith(year)
  );
  const pAmt = round2(paid.reduce((s, i) => s + (i.total || 0), 0));
  const tAmt = round2(paid.reduce((s, i) => s + (i.tax || 0), 0));
  return {
    uHours, uAmt,
    oCount: outstanding.length, oAmt, overdue,
    pCount: paid.length, pAmt, tAmt, year,
  };
};

export const defaultDraft = (data) => {
  const today = todayISO();
  const anchor = data.settings.cycleAnchor;

  if (anchor && today >= anchor) {
    const cur = cycleIndexOf(anchor, today);
    // Zero-hour (day-off) entries must not make a period look billable.
    const unbilledDates = unbilledEntries(data)
      .filter((e) => e.hours > 0)
      .map((e) => e.date);

    // The uninvoiced remainder of a period, or null when invoices already
    // reach its end. A partial invoice (created mid-cycle) must not mark the
    // whole period handled — later hours would be stranded forever.
    const remainderDraft = (p) => {
      const cov = periodCoverage(data, p);
      if (cov.covered) return null;
      const start = cov.through && cov.through >= p.start ? addDaysISO(cov.through, 1) : p.start;
      return { periodStart: start, periodEnd: p.end, invoiceDate: today, expenses: [], workSummary: '' };
    };

    // Earliest completed cycle whose uncovered remainder still has unbilled time.
    for (let i = 0; i < cur; i++) {
      const draft = remainderDraft(periodAt(anchor, i));
      if (draft && unbilledDates.some((d) => d >= draft.periodStart && d <= draft.periodEnd)) {
        return draft;
      }
    }
    // Otherwise the most recent completed cycle, if not fully invoiced
    // (covers an expenses-only invoice).
    if (cur > 0) {
      const draft = remainderDraft(periodAt(anchor, cur - 1));
      if (draft) return draft;
    }
    // Mid-cycle with nothing owed from earlier: current period to date,
    // starting after whatever has already been invoiced.
    const p = periodAt(anchor, cur);
    const cov = periodCoverage(data, p);
    const start = cov.through && cov.through >= p.start ? addDaysISO(cov.through, 1) : p.start;
    return { periodStart: start, periodEnd: p.end < today ? p.end : today, invoiceDate: today, expenses: [], workSummary: '' };
  }

  // No anchor configured: fall back to the old heuristic.
  const last = [...data.invoices].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
  const un = unbilledEntries(data).map((e) => e.date).sort();
  const start = last ? addDaysISO(last.periodEnd, 1) : un[0] || addDaysISO(today, -13);
  return { periodStart: start, periodEnd: today, invoiceDate: today, expenses: [], workSummary: '' };
};

// Zero-hour entries are personal day-off records — they never go on an invoice.
export const draftEntries = (data, draft) =>
  unbilledEntries(data)
    .filter((e) => e.hours > 0 && e.date >= draft.periodStart && e.date <= draft.periodEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

export const draftTotals = (data, draft) => {
  const s = data.settings;
  const entries = draftEntries(data, draft);
  const hoursTotal = round2(entries.reduce((t, e) => t + (e.hours || 0), 0));
  const laborSubtotal = round2(hoursTotal * (s.rate || 0));
  const expenses = draft.expenses.filter((x) => x.description || x.amount);
  const expensesTotal = round2(expenses.reduce((t, x) => t + (Number(x.amount) || 0), 0));
  const taxableExpenses = round2(
    expenses.filter((x) => x.taxable).reduce((t, x) => t + (Number(x.amount) || 0), 0)
  );
  const taxBase = round2(laborSubtotal + taxableExpenses);
  const tax = round2((taxBase * (s.taxRate || 0)) / 100);
  const total = round2(laborSubtotal + expensesTotal + tax);
  return { entries, hoursTotal, laborSubtotal, expenses, expensesTotal, taxableExpenses, taxBase, tax, total };
};

export const invoiceNumber = (settings) =>
  (settings.invoicePrefix || '') + String(settings.nextNumber || 1).padStart(3, '0');

// Builds the frozen invoice snapshot from the current data + draft. Settings
// changes after creation never alter this invoice.
export const buildInvoice = (data, draft) => {
  const s = data.settings;
  const t = draftTotals(data, draft);
  const id = uid();
  const invoice = {
    id,
    number: invoiceNumber(s),
    dateIssued: draft.invoiceDate,
    dueDate: addDaysISO(draft.invoiceDate, s.netDays || 0),
    periodStart: draft.periodStart,
    periodEnd: draft.periodEnd,
    rate: s.rate || 0,
    netDays: s.netDays || 0,
    taxLabel: s.taxLabel || 'Sales tax',
    taxRate: s.taxRate || 0,
    poNumber: (s.billTo && s.billTo.poNumber) || '',
    from: { ...s.from },
    billTo: {
      name: (s.billTo && s.billTo.name) || '',
      address: (s.billTo && s.billTo.address) || '',
      email: (s.billTo && s.billTo.email) || '',
    },
    paymentNote: s.paymentNote || '',
    // One summary paragraph for the whole cycle; the itemization is just
    // date + hours (entries aggregated per day).
    workSummary: (draft.workSummary || '').trim(),
    lines: (() => {
      const byDate = new Map();
      t.entries.forEach((e) => {
        byDate.set(e.date, round2((byDate.get(e.date) || 0) + (e.hours || 0)));
      });
      return [...byDate.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, hours]) => ({ date, hours }));
    })(),
    expenses: t.expenses.map((x) => ({
      description: x.description, amount: round2(Number(x.amount) || 0), taxable: !!x.taxable,
    })),
    hoursTotal: t.hoursTotal,
    laborSubtotal: t.laborSubtotal,
    expensesTotal: t.expensesTotal,
    taxableExpenses: t.taxableExpenses,
    tax: t.tax,
    total: t.total,
    status: 'draft',
    paidDate: null,
  };
  return { invoice, includedIds: new Set(t.entries.map((e) => e.id)) };
};

export const downloadFile = (filename, text, type = 'application/json') => {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const entriesCsv = (data) => {
  const head = 'date,project,description,hours,invoice';
  const lines = sortedEntries(data).map((e) => {
    const inv = e.invoiceId ? invoiceById(data, e.invoiceId) : null;
    return [e.date, csvCell(e.project), csvCell(e.description), e.hours, inv ? inv.number : ''].join(',');
  });
  return `${head}\n${lines.join('\n')}`;
};
