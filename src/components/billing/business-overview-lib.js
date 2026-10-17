import { fmtDate, hoursFmt, round2, todayISO } from './billing-lib';
import { buildDorReport, suggestedDorPeriod } from './dor-lib';
import { waPeriods } from './tax-lib';
import { safeAccountUrl, SEED_BUSINESS_ACCOUNTS } from './business-accounts-lib';

const validDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const amount = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const sumMoney = (rows) => rows.every((row) => amount(row.total))
  ? rows.reduce((total, row) => total + Math.round(row.total * 100), 0) / 100 : null;
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const hasPaymentDetail = (inv) => ['amountPaid', 'paidAmount'].some((key) => Number(inv[key]) > 0) ||
  ['payments', 'partialPayments', 'paymentHistory'].some((key) => Array.isArray(inv[key]) && inv[key].length > 0);

function moneySummary(data, today) {
  const entries = (data.entries || []).filter((entry) => entry && !entry.invoiceId);
  const validHours = entries.every((entry) => amount(entry.hours));
  const hours = validHours ? round2(entries.reduce((sum, entry) => sum + entry.hours, 0)) : null;
  const rate = data.settings?.rate;
  const needsRate = hours > 0 && (!amount(rate) || rate === 0);
  const sent = (data.invoices || []).filter((inv) => inv?.status === 'sent');
  const unknownPayments = sent.some(hasPaymentDetail);
  const year = today.slice(0, 4);
  const paid = (data.invoices || []).filter((inv) => inv?.status === 'paid' && validDate(inv.paidDate) && inv.paidDate.startsWith(year));
  const missingPaidDate = (data.invoices || []).some((inv) => inv?.status === 'paid' && !validDate(inv.paidDate));
  return {
    unbilled: {
      amount: hours === null || needsRate ? null : round2(hours * (amount(rate) ? rate : 0)), hours, needsRate,
      detail: hours === null ? 'Check time entries' : needsRate ? `${hoursFmt(hours)} hours · set your hourly rate` : `${hoursFmt(hours)} hours · estimate at current rate`,
      section: needsRate ? 'settings' : 'time',
    },
    awaiting: {
      amount: unknownPayments ? null : sumMoney(sent), count: sent.length,
      detail: unknownPayments ? 'Reconcile partial-payment records' : `${plural(sent.length, 'sent invoice')} · includes sales tax`,
      section: 'invoices',
    },
    paid: {
      amount: missingPaidDate ? null : sumMoney(paid), count: paid.length, year,
      detail: missingPaidDate ? 'Check missing payment dates' : `${plural(paid.length, 'paid invoice')} · includes sales tax`,
      section: 'invoices',
    },
  };
}

function dorSummary(data, today) {
  const settings = data.taxSettings || {};
  const configured = ['monthly', 'quarterly', 'annual'].includes(settings.waFrequency) && ['cash', 'accrual'].includes(settings.waBasis);
  if (!configured) return {
    configured: false, report: null, periodLabel: null, deadline: null,
    summary: 'Confirm your assigned filing frequency and the accounting basis you use for reporting.',
    scope: '',
    action: { id: 'dor-setup', priority: 0, section: 'dor', title: 'Confirm your DOR setup', detail: 'Choose your assigned filing frequency and accounting basis so this workspace can show the right period.', button: 'Confirm DOR setup', tone: 'attention' },
  };
  const suggestion = suggestedDorPeriod(data, today);
  const period = waPeriods(suggestion.year, suggestion.frequency).find((item) => item.key === suggestion.periodKey);
  const report = buildDorReport({ ...data, invoices: data.invoices || [], taxPayments: data.taxPayments || [] }, { ...period, frequency: suggestion.frequency }, settings.waBasis);
  const periodLabel = suggestion.frequency === 'annual' ? suggestion.year : `${period.label} ${suggestion.year}`;
  const scope = 'Latest completed period only; other returns are not checked here.';
  const deadline = report.extensionNote ? `Recorded extension: ${fmtDate(report.due)}`
    : report.period.dueVerified ? `Standard deadline: ${fmtDate(report.due)}` : 'Verify this period’s deadline in My DOR';
  let action = null;
  let summary;
  if (report.changedSinceFiled) {
    summary = 'The worksheet has changed since the recorded filing.';
    action = { id: 'dor-changed', priority: 10, title: `Review changes to ${periodLabel}`, detail: 'Compare the current DOR worksheet with the saved filing. The earlier return record is preserved.', button: 'Compare worksheet', tone: 'attention' };
  } else if (!report.latestFiling) {
    const overdue = (report.period.dueVerified || report.extensionNote) && validDate(report.due) && report.due < today;
    summary = 'No filing is recorded for this period.';
    const detail = report.rows.length === 0 && report.ready
      ? 'No invoices appear in this period. Check your filing requirement in My DOR; no return is recorded here.'
      : report.ready ? 'Worksheet reviews are complete. Filing and payment still need their own records.'
        : 'Review the period’s invoices and tax treatment. No return is recorded here.';
    action = { id: 'dor-unfiled', priority: overdue ? 15 : 50, title: `Review your ${periodLabel} DOR return`, detail, button: 'Open WA DOR', tone: overdue ? 'attention' : 'normal' };
  } else if (!report.ready || report.filingTotal === null) {
    summary = 'A filing is recorded; the worksheet still needs review.';
    action = { id: 'dor-review', priority: 25, title: `Review the ${periodLabel} worksheet`, detail: 'The filing record is saved. Resolve the remaining worksheet issues before relying on its totals.', button: 'Review worksheet', tone: 'attention' };
  } else if (report.balance > 0) {
    summary = report.paid > 0 ? 'Filing recorded; payment records cover part of the submitted total.' : 'Filing recorded; no matching payment is recorded.';
    action = { id: 'dor-payment', priority: 30, title: `Check the ${periodLabel} DOR payment`, detail: 'Check your actual payment, then reconcile the payment record separately from the filed return.', button: 'Review payment records', tone: 'normal' };
  } else {
    summary = report.filingTotal === 0 ? 'Filing recorded with zero submitted tax.' : 'Filing and matching payment records are saved for this period.';
  }
  return { configured, report, periodLabel, deadline, summary, scope, action: action ? { ...action, section: 'dor', deadline, scope } : null };
}

function invoiceActions(data, today) {
  const sent = (data.invoices || []).filter((inv) => inv?.status === 'sent');
  const dated = sent.filter((inv) => validDate(inv.dueDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = dated.filter((inv) => inv.dueDate < today);
  const upcoming = dated.find((inv) => inv.dueDate >= today);
  const actions = [];
  if (overdue.length) actions.push({
    id: 'invoices-overdue', priority: 20, section: 'invoices',
    title: `Follow up on ${plural(overdue.length, 'overdue invoice')}`,
    detail: `${overdue[0].number || 'The oldest invoice'} was due ${fmtDate(overdue[0].dueDate)}. Check payment before following up.`,
    button: 'Open invoices', tone: 'attention',
  });
  if (sent.length !== dated.length) actions.push({
    id: 'invoice-dates', priority: 35, section: 'invoices', title: 'Check invoice due dates',
    detail: `${plural(sent.length - dated.length, 'sent invoice')} has a missing or invalid due date.`, button: 'Review invoices', tone: 'attention',
  });
  if (upcoming && !overdue.length) actions.push({
    id: 'invoice-upcoming', priority: 40, section: 'invoices', title: `${upcoming.number || 'Next invoice'} is ${upcoming.dueDate === today ? 'due today' : 'due next'}`,
    detail: `Payment due ${fmtDate(upcoming.dueDate)}, from the saved invoice.`, button: 'Open invoices', tone: 'normal',
  });
  const drafts = (data.invoices || []).filter((inv) => inv?.status === 'draft');
  if (drafts.length) actions.push({
    id: 'invoice-drafts', priority: 60, section: 'invoices', title: `Finish ${plural(drafts.length, 'draft invoice')}`,
    detail: 'Review the saved drafts before sending them to your client.', button: 'Review drafts', tone: 'normal',
  });
  return actions;
}

function accountSummary(data) {
  const accounts = Array.isArray(data.businessAccounts) ? data.businessAccounts : SEED_BUSINESS_ACCOUNTS;
  const pinned = accounts.filter((account) => account && account.pinned).slice(0, 4).map((account) => {
    const href = safeAccountUrl(account.url);
    const url = href ? new URL(href) : null;
    return {
      id: account.id, name: account.name, href,
      displayUrl: url ? `${url.host}${url.pathname === '/' ? '' : url.pathname}` : 'Check the saved website address',
      username: typeof account.username === 'string' ? account.username.trim() : '',
    };
  });
  return { pinned, needsUsernames: pinned.some((account) => !account.username), count: accounts.length };
}

// A small view model for the private dashboard; no fetching or persisted defaults.
export const buildBusinessOverview = (data = {}, today = todayISO()) => {
  const date = validDate(today) ? today : todayISO();
  const metrics = moneySummary(data, date);
  const dor = dorSummary(data, date);
  const actions = [...invoiceActions(data, date)];
  if (dor.action) actions.push(dor.action);
  if (metrics.unbilled.hours > 0) actions.push({
    id: 'unbilled-work', priority: 70, section: metrics.unbilled.needsRate ? 'settings' : 'time',
    title: metrics.unbilled.needsRate ? 'Set your hourly rate' : 'Review unbilled work',
    detail: `${hoursFmt(metrics.unbilled.hours)} hours are not attached to an invoice.`,
    button: metrics.unbilled.needsRate ? 'Open settings' : 'Open time log', tone: 'normal',
  });
  if (!actions.length) actions.push({
    id: 'log-work', priority: 100, section: 'calendar', title: 'Log your next work session',
    detail: 'Keep your hours current so the next invoice is ready to prepare.', button: 'Log work', tone: 'normal',
  });
  return { today: date, metrics, dor, accounts: accountSummary(data), nextActions: actions.sort((a, b) => a.priority - b.priority).slice(0, 3) };
};
