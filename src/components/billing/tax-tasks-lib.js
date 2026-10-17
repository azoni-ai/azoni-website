// A checklist of dates and saved records, never a calculation of tax owed.
// Standard dates do not establish an individual's filing/payment requirement.
import { addDaysISO, todayISO } from './billing-lib';
import { buildDorReport } from './dor-lib';
import { federalQuarters, rollWeekend, waPeriods } from './tax-lib';

export const TAX_TASK_SOURCES = Object.freeze({
  federal: 'https://www.irs.gov/publications/p505',
  federalDates: 'https://www.irs.gov/pub/irs-prior/f1040es--2026.pdf',
  annual: 'https://www.irs.gov/pub/irs-prior/p926--2026.pdf',
  dor: 'https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates/2026-eft-due-dates',
  dorCalendar: 'https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates',
  city: 'https://dor.wa.gov/forms-publications/publications-subject/tax-topics/city-bo-tax',
});

const ENTITIES = ['unknown', 'sole-proprietor', 's-corp', 'c-corp', 'partnership'];
const PLANS = ['unknown', 'estimated', 'withholding', 'adviser'];
const CITY_STATUSES = ['unknown', 'required', 'not-required'];
const FREQUENCIES = ['monthly', 'quarterly', 'annual'];
const BASES = ['cash', 'accrual'];
const array = value => Array.isArray(value) ? value : [];
const text = value => typeof value === 'string' ? value.trim() : '';
const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return value >= '1900-01-01' && value <= '2200-12-31' && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const cents = value => {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(value.trim()))) return null;
  const n = Number(value);
  const amount = Math.round(n * 100);
  return Number.isFinite(n) && n >= 0 && Number.isSafeInteger(amount) && Math.abs(n * 100 - amount) < 0.000001 ? amount : null;
};

const profileFrom = data => ({
  entity: ENTITIES.includes(data.taxProfile?.entity) ? data.taxProfile.entity : 'unknown',
  startedOn: validDate(data.taxProfile?.startedOn) ? data.taxProfile.startedOn : '',
  city: text(data.taxProfile?.city),
  federalPlan: PLANS.includes(data.taxProfile?.federalPlan) ? data.taxProfile.federalPlan : 'unknown',
  cityStatus: CITY_STATUSES.includes(data.taxProfile?.cityStatus) ? data.taxProfile.cityStatus : 'unknown',
});

// Only the published 2026 schedule is marked verified. Weekend arithmetic for
// another year cannot account for holidays, relief, or later IRS changes.
export const federalDeadlinePeriods = year => federalQuarters(year).map((period, index) => ({
  ...period,
  installment: index + 1,
  dueVerified: Number(year) === 2026,
  sourceURL: Number(year) === 2026 ? TAX_TASK_SOURCES.federalDates : TAX_TASK_SOURCES.federal,
}));

// A manual checklist acknowledgement is separate from tax-payment records.
export const taxTaskReviewKey = task => `review:${task.id}`;
const withManualReview = (data, task) => {
  if (!['federal-estimate', 'federal-annual'].includes(task.kind)) return task;
  const reviewed = data.taxChecklist?.[task.year]?.[taxTaskReviewKey(task)] === true;
  return reviewed ? {
    ...task, done: true, reviewRecorded: true, status: 'reviewed', statusLabel: 'Marked reviewed',
    detail: `You marked this review complete. This is not proof of filing or payment; recheck if your circumstances change. ${task.detail}`,
  } : { ...task, reviewRecorded: false };
};

function paymentRecords(data, agency, periodKey, today) {
  const rows = array(data.taxPayments).filter(payment => payment?.agency === agency && payment.period === periodKey);
  const valid = rows.filter(payment => cents(payment.amount) !== null && validDate(payment.date) && payment.date <= today);
  const total = valid.reduce((sum, payment) => sum + cents(payment.amount), 0);
  return {
    paid: Number.isSafeInteger(total) ? total / 100 : null,
    paymentRecorded: valid.some(payment => cents(payment.amount) > 0),
    paymentNeedsReview: valid.length !== rows.length || !Number.isSafeInteger(total),
    paymentCount: valid.filter(payment => cents(payment.amount) > 0).length,
  };
}

function knownYears(data, profile, today) {
  const current = Number(today.slice(0, 4));
  const dates = [profile.startedOn];
  array(data.invoices).forEach(invoice => {
    if (invoice && ['sent', 'paid'].includes(invoice.status)) dates.push(invoice.dateIssued, invoice.paidDate);
  });
  array(data.taxPayments).forEach(payment => {
    if (/^\d{4}(?:-Q[1-4]|-\d{2})?$/.test(payment?.period || '')) dates.push(`${payment.period.slice(0, 4)}-01-01`);
  });
  array(data.dorFilings).forEach(filing => {
    if (/^\d{4}(?:-Q[1-4]|-\d{2})?$/.test(filing?.periodKey || '')) dates.push(`${filing.periodKey.slice(0, 4)}-01-01`);
  });
  const years = dates.filter(date => validDate(date) && date <= today).map(date => Number(date.slice(0, 4)));
  const first = years.length ? Math.min(current, ...years) : current;
  return { first, current, years: Array.from({ length: current - first + 1 }, (_, i) => first + i) };
}

function setupTasks(data, profile, today, range) {
  const tasks = [];
  const add = task => tasks.push({
    kind: 'setup', due: '', dueVerified: false, dateSource: '', status: 'setup', statusLabel: 'Confirm setup',
    section: 'tax-center', button: 'Update tax setup', done: false, applicability: 'review', priority: 0, ...task,
  });
  if (profile.entity === 'unknown' || profile.federalPlan === 'unknown') add({
    id: 'federal-setup', agency: 'irs', title: 'Confirm your federal tax setup',
    detail: 'Confirm how your business is taxed and whether you will use estimated payments, withholding, or an adviser. The dates below are a review calendar, not a bill.',
    sourceURL: TAX_TASK_SOURCES.federal,
  });
  if (!profile.startedOn) add({
    id: 'income-start', agency: 'irs', title: 'Add your first consulting income date',
    detail: 'Earlier IRS dates may need review. A later income start can change which installments apply; other personal income and withholding also matter.',
    sourceURL: TAX_TASK_SOURCES.federal,
  });
  else if (profile.startedOn > today) add({
    id: 'income-start-future', agency: 'irs', title: 'Check your income start date',
    detail: 'Your saved first consulting income date is in the future. Confirm the date before using it to review earlier installments.',
  });
  if (!FREQUENCIES.includes(data.taxSettings?.waFrequency) || !BASES.includes(data.taxSettings?.waBasis)) add({
    id: 'dor-setup', agency: 'wa', title: 'Confirm your DOR setup', section: 'dor', button: 'Confirm DOR setup',
    detail: 'Check your assigned filing frequency in My DOR and confirm your reporting basis. State sales tax and B&O are separate from IRS payments.'
      + (!FREQUENCIES.includes(data.taxSettings?.waFrequency) && today.startsWith('2026-') ? ' If assigned quarterly, the standard Q3 2026 deadline is November 2, 2026; your schedule may differ.' : ''),
    url: 'https://secure.dor.wa.gov/home/Login', sourceURL: TAX_TASK_SOURCES.dorCalendar,
  });
  if (profile.cityStatus === 'unknown') add({
    id: 'city-setup', agency: 'city', title: 'Check city taxes and license renewals',
    detail: 'Confirm the requirements for every city where you do business. Add each confirmed filing or renewal date as a reminder; FileLocal schedules vary by city.',
    sourceURL: TAX_TASK_SOURCES.city,
  });
  else if (profile.cityStatus === 'required' && !array(data.taxReminders).some(reminder => reminder?.category === 'city-tax' && !reminder.completed && validDate(reminder.dueDate) && reminder.dueDate >= today)) add({
    id: 'city-dates', agency: 'city', title: 'Add your next city tax date',
    detail: `${profile.city ? `${profile.city}: ` : ''}You marked city taxes as required. Check the city notice or FileLocal and add the next confirmed deadline.`,
    button: 'Add a reminder', sourceURL: TAX_TASK_SOURCES.city,
  });
  if (profile.entity !== 'sole-proprietor') add({
    id: 'entity-calendar', agency: 'irs', title: 'Confirm annual and business filing dates',
    detail: 'Your entity type and tax year determine the return forms and deadlines. Ask your preparer about business returns, payroll, information returns, and annual renewals, then add the dates that apply.',
    button: 'Add a reminder', sourceURL: 'https://www.irs.gov/publications/p509',
  });
  if (range.first === range.current && !profile.startedOn) add({
    id: 'earlier-records', agency: 'other', title: 'Review any earlier tax years',
    detail: `No earlier activity is dated in this workspace. This agenda starts with ${range.first}; check older notices or account records if your business was active before then.`,
    button: 'Review tax setup',
  });
  return tasks;
}

function federalTasks(data, profile, today, range) {
  // Corporations need their own installment calendar. Pass-through owners may
  // still use 1040-ES personally, but this app does not determine that for them.
  if (profile.entity === 'c-corp') return [];
  const years = new Set(range.years);
  // Keep the previous year's final installment visible in January even when
  // this local ledger contains no earlier records.
  if (today.slice(5, 7) === '01') years.add(range.current - 1);
  return [...years].sort((a, b) => a - b).flatMap(year => federalDeadlinePeriods(year)
    .filter(period => year >= range.first || period.due >= `${range.current}-01-01`)
    .map(period => {
      const payments = paymentRecords(data, 'irs', period.key, today);
      const beforeIncomeStart = !!profile.startedOn && period.end < profile.startedOn;
      const personalConfirmed = profile.entity === 'sole-proprietor';
      const planConfirmed = profile.federalPlan === 'estimated';
      const applicability = personalConfirmed && planConfirmed && !beforeIncomeStart ? 'confirmed' : 'review';
      let detail = `${period.start} to ${period.end}. IRS installment periods are unequal. `;
      if (beforeIncomeStart) detail += 'This period ended before your saved first consulting income. Review whether other income or withholding affected the requirement. ';
      else if (profile.federalPlan === 'withholding') detail += 'You plan to cover federal tax through withholding. Check that it covers the required amount; an empty payment ledger does not show a shortfall. ';
      else if (profile.federalPlan === 'adviser') detail += 'Ask your adviser whether this installment applies and what amount, if any, is required. ';
      else detail += 'Confirm the amount using your full personal tax picture, including withholding, credits, and prior payments. ';
      if (payments.paymentRecorded) detail += 'A payment is recorded; this does not establish that the installment was fully covered.';
      else detail += 'No payment is recorded here. This does not establish tax owed.';
      if (payments.paymentNeedsReview) detail += ' Check the amount and date on the saved payment records.';
      const status = payments.paymentNeedsReview ? 'record-review' : payments.paymentRecorded ? 'payment-recorded'
        : !period.dueVerified ? 'verify-date' : beforeIncomeStart ? 'before-income' : period.due < today ? 'review-past' : 'upcoming';
      const statusLabel = payments.paymentNeedsReview ? 'Check payment record' : payments.paymentRecorded ? 'Payment recorded'
        : !period.dueVerified ? 'Verify date' : beforeIncomeStart ? 'Review applicability' : 'No payment recorded';
      return withManualReview(data, {
        id: `irs-${period.key}`, kind: 'federal-estimate', agency: 'irs',
        title: `IRS estimated tax: ${year} installment ${period.installment}`,
        detail, due: period.due, dueVerified: period.dueVerified, dateSource: period.dueVerified ? 'Standard IRS date' : 'Unverified calendar estimate',
        sourceURL: period.sourceURL, url: 'https://www.irs.gov/payments',
        period, periodKey: period.key, year: String(year), ...payments, beforeIncomeStart, applicability,
        status, statusLabel, section: 'taxes', button: payments.paymentRecorded ? 'Review payment records' : 'Record a payment',
        done: false, priority: period.due < today && !payments.paymentRecorded && !beforeIncomeStart ? 15 : 40,
      });
    }));
}

function annualTasks(data, profile, range, today) {
  if (profile.entity !== 'sole-proprietor') return [];
  return range.years.map(year => {
    const due = rollWeekend(`${year + 1}-04-15`);
    return withManualReview(data, {
      id: `irs-return-${year}`, kind: 'federal-annual', agency: 'irs', title: `${year} personal federal tax return`,
      detail: 'Prepare your annual return and reconcile estimated payments and withholding. Filing an extension generally does not extend the time to pay. Add a personal reminder to track your actual filing or an approved extension.',
      due, dueVerified: year === 2026, dateSource: year === 2026 ? 'Standard IRS date' : 'Unverified calendar estimate',
      sourceURL: year === 2026 ? TAX_TASK_SOURCES.annual : 'https://www.irs.gov/filing/individuals/when-to-file',
      url: 'https://www.irs.gov/filing/individuals/how-to-file', periodKey: String(year), year: String(year),
      status: year === 2026 ? 'review-return' : 'verify-date', statusLabel: 'Review with preparer', section: 'tax-center', button: 'Add a reminder',
      done: false, applicability: 'review', priority: due < today ? 20 : 50,
    });
  });
}

function dorTasks(data, profile, today, range) {
  const frequency = data.taxSettings?.waFrequency;
  if (!FREQUENCIES.includes(frequency)) return [];
  const basis = BASES.includes(data.taxSettings?.waBasis) ? data.taxSettings.waBasis : '';
  const years = new Set(range.years);
  // When no completed period exists this year, show the previous one for
  // review. The first income date is not a DOR registration/start date.
  if (!waPeriods(range.current, frequency).some(period => period.end < today)) years.add(range.current - 1);
  const periods = [...years].sort((a, b) => a - b).flatMap(year => waPeriods(year, frequency))
    .filter(period => period.start <= today && (Number(period.key.slice(0, 4)) >= range.first || period.due >= `${range.current}-01-01`));
  return periods.map(period => {
    const report = buildDorReport(data, { ...period, frequency }, basis);
    const inProgress = period.end >= today;
    const payments = paymentRecords(data, 'wa', period.key, today);
    const filingDateValid = !!report.latestFiling && validDate(report.latestFiling.filedDate)
      && report.latestFiling.filedDate <= today && report.latestFiling.filedDate > period.end;
    const filingDateNeedsReview = !!report.latestFiling && !filingDateValid;
    const done = !inProgress && filingDateValid && report.ready && !report.changedSinceFiled
      && ['filed-paid', 'filed-no-payment-due'].includes(report.status) && !payments.paymentNeedsReview;
    const dueVerified = !!period.dueVerified || !!report.extensionNote;
    let status = report.changedSinceFiled ? 'filed-changed' : done ? 'records-complete'
      : inProgress ? 'period-open' : filingDateNeedsReview ? 'filing-date-review'
        : payments.paymentNeedsReview ? 'record-review' : !report.latestFiling ? 'no-filing'
        : report.balance > 0 ? 'payment-review' : 'worksheet-review';
    if (!basis) status = 'setup';
    const labels = {
      'filed-changed': 'Review changes after filing', 'records-complete': 'Filing and payment reconciled',
      'record-review': 'Check payment record', 'period-open': 'Period in progress', 'no-filing': 'No filing recorded',
      'payment-review': 'Check payment records', 'worksheet-review': 'Review worksheet', setup: 'Confirm reporting basis',
      'filing-date-review': 'Check filing date',
    };
    let detail = !report.latestFiling ? 'Filing and payment are separate. No return is recorded here; a payment alone does not establish filing. '
      : done ? 'The saved return and payment records reconcile for this period. '
        : report.changedSinceFiled ? 'The worksheet changed after the saved return. Review whether an amendment is needed. '
          : 'A return is recorded. Check its submitted total and payment records separately. ';
    if (!profile.startedOn || period.end < profile.startedOn) detail += 'Confirm the first period you were required to file in My DOR, even if there was no income. ';
    if (inProgress) detail += 'This period is still in progress; totals may change. ';
    if (filingDateNeedsReview) detail += 'Check the actual filing date: it must be after the reporting period and cannot be in the future. ';
    if (!basis) detail += 'Choose your actual cash or accrual reporting basis before preparing the worksheet. ';
    if (report.extensionNote) detail += `Saved extension: ${report.extensionNote}`;
    return {
      id: `dor-${frequency}-${period.key}`, kind: 'dor-return', agency: 'wa',
      title: `WA DOR: ${frequency === 'annual' ? period.key : `${period.label} ${period.key.slice(0, 4)}`} return`,
      detail: detail.trim(), due: report.due, dueVerified, dateSource: report.extensionNote ? 'Your saved DOR extension' : period.dueVerified ? 'Standard DOR date' : 'Verify in My DOR',
      sourceURL: period.dueVerified ? TAX_TASK_SOURCES.dor : TAX_TASK_SOURCES.dorCalendar,
      url: 'https://secure.dor.wa.gov/home/Login', periodKey: period.key, year: period.key.slice(0, 4), frequency, period, report,
      ...payments, status, statusLabel: labels[status], section: 'dor', button: done ? 'View return records' : 'Open DOR worksheet',
      done, inProgress, filingDateNeedsReview, applicability: 'review', priority: report.changedSinceFiled ? 10 : !done && dueVerified && report.due < today ? 15 : 35,
    };
  });
}

const reminderTasks = data => array(data.taxReminders).filter(reminder => reminder && text(reminder.id) && text(reminder.title) && validDate(reminder.dueDate)).map(reminder => ({
  id: `reminder-${reminder.id}`, reminderId: reminder.id, kind: 'reminder', agency: reminder.category === 'city-tax' ? 'city' : 'other',
  category: reminder.category, title: text(reminder.title), detail: text(reminder.notes) || 'A date you added from your own account or notice.',
  due: reminder.dueDate, dueVerified: true, dateSource: 'Your reminder', status: reminder.completed ? 'completed' : 'reminder',
  statusLabel: reminder.completed ? 'Marked complete' : 'Your reminder', section: 'tax-center', button: reminder.completed ? 'Reopen reminder' : 'Mark complete',
  done: !!reminder.completed, applicability: 'confirmed', priority: 30,
}));

export const buildTaxAgenda = (data = {}, today = todayISO()) => {
  const date = validDate(today) ? today : todayISO();
  const profile = profileFrom(data);
  const range = knownYears(data, profile, date);
  const tasks = [...federalTasks(data, profile, date, range), ...annualTasks(data, profile, range, date), ...dorTasks(data, profile, date, range), ...reminderTasks(data)]
    .sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
  const past = tasks.filter(task => !task.done && task.due < date)
    .sort((a, b) => a.priority - b.priority || a.due.localeCompare(b.due));
  const next = tasks.filter(task => !task.done && task.due >= date);
  const completed = tasks.filter(task => task.done);
  const paymentCount = array(data.taxPayments).filter(payment => cents(payment?.amount) > 0 && validDate(payment?.date) && payment.date <= date).length;
  return {
    today: date, profile, setupTasks: setupTasks(data, profile, date, range), tasks, past, next, completed,
    scope: `Review calendar from ${range.first}. It uses saved records, not live IRS, DOR, or city account balances. Confirm your first required DOR period and any earlier years; first consulting income does not establish your registration date.`,
    summary: { pastCount: past.length, nextCount: next.length, paymentCount, hasPayments: paymentCount > 0 },
  };
};

const escapeIcs = value => Array.from(String(value ?? '')).filter(character => {
  const code = character.codePointAt(0);
  return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
}).join('').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const octets = character => {
  const code = character.codePointAt(0);
  return code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
};
// RFC 5545 folds at 75 UTF-8 octets, without splitting a code point.
const foldIcs = line => {
  let out = '', bytes = 0;
  for (const character of line) {
    const width = octets(character);
    if (bytes + width > 75) { out += '\r\n '; bytes = 1; }
    out += character;
    bytes += width;
  }
  return out;
};
const uidPart = value => Array.from(String(value)).map(character => character.codePointAt(0).toString(16)).join('-');

// Export has no account IDs, usernames, payment amounts, or credentials.
// Calendar clients manage their own notification preferences after import.
export const taxAgendaIcs = (tasks, { now = new Date() } = {}) => {
  const date = now instanceof Date ? now : new Date(now);
  const generatedAt = Number.isFinite(date.getTime()) ? date : new Date();
  const stamp = generatedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(generatedAt);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Azoni//Business tax reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const ids = new Set();
  array(tasks).filter(task => task && !task.done && task.dueVerified === true && validDate(task.due)).forEach(task => {
    if (ids.has(task.id)) return;
    ids.add(task.id);
    const summary = task.kind === 'reminder' ? task.title : `Review: ${task.title}`;
    // Custom notes may be sensitive. The calendar uses a generic description;
    // private detail remains in the authenticated workspace.
    const description = task.kind === 'reminder'
      ? 'A date you added in the Azoni business workspace. Open your private workspace for details.'
      : `${task.dateSource || 'Standard date'}. Confirm whether this deadline applies and review your saved records. This calendar does not establish tax owed or that a payment was made.`;
    lines.push('BEGIN:VEVENT', `UID:${uidPart(task.id)}@azoni.ai`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${task.due.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDaysISO(task.due, 1).replace(/-/g, '')}`,
      `SUMMARY:${escapeIcs(summary)}`, `DESCRIPTION:${escapeIcs(description)}`, 'CLASS:PRIVATE', 'TRANSP:TRANSPARENT');
    if (task.due >= localToday) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-P7D', `DESCRIPTION:${escapeIcs(summary)}`, 'END:VALARM');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcs).join('\r\n')}\r\n`;
};
