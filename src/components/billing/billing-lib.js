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

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
  },
  entries: [],
  invoices: [],
});

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
  const last = [...data.invoices].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
  const un = unbilledEntries(data).map((e) => e.date).sort();
  const start = last ? addDaysISO(last.periodEnd, 1) : un[0] || addDaysISO(todayISO(), -13);
  return { periodStart: start, periodEnd: todayISO(), invoiceDate: todayISO(), expenses: [] };
};

export const draftEntries = (data, draft) =>
  unbilledEntries(data)
    .filter((e) => e.date >= draft.periodStart && e.date <= draft.periodEnd)
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
    lines: t.entries.map((e) => ({
      date: e.date, project: e.project, description: e.description, hours: e.hours,
    })),
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
