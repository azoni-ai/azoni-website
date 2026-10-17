import { defaultData } from './billing-lib';
import { buildDorReport, createDorFiling } from './dor-lib';
import { waPeriods } from './tax-lib';
import { buildTaxAgenda, federalDeadlinePeriods, taxAgendaIcs, taxTaskReviewKey } from './tax-tasks-lib';

const TODAY = '2026-10-17';
const dataFor = (extra = {}) => ({
  ...defaultData(),
  taxProfile: { entity: 'unknown', federalPlan: 'unknown', startedOn: '', city: '', cityStatus: 'unknown' },
  taxReminders: [], ...extra,
});
const profile = (extra = {}) => ({ entity: 'sole-proprietor', federalPlan: 'estimated', startedOn: '2026-07-15', city: '', cityStatus: 'unknown', ...extra });
const dorData = (extra = {}) => dataFor({ taxSettings: { waFrequency: 'quarterly', waBasis: 'cash' }, ...extra });
const dorPeriod = key => ({ ...waPeriods(key.slice(0, 4), 'quarterly').find(period => period.key === key), frequency: 'quarterly' });
const recordEmptyFiling = (data, periodKey, amounts = {}) => {
  const report = buildDorReport(data, dorPeriod(periodKey));
  const result = createDorFiling(report, {
    filedDate: '2026-10-17', confirmation: 'SYNTHETIC-CONFIRMATION', salesTax: 0, boTax: 0, otherTax: 0, ...amounts,
  });
  expect(result.errors).toEqual([]);
  data.dorFilings.push(result.filing);
};

test('unknown setup creates review tasks without silently assigning DOR frequency, basis, or federal liability', () => {
  const data = dataFor();
  const before = JSON.stringify(data);
  const agenda = buildTaxAgenda(data, TODAY);
  expect(agenda.profile.entity).toBe('unknown');
  expect(agenda.setupTasks.map(task => task.id)).toEqual(expect.arrayContaining(['federal-setup', 'income-start', 'dor-setup', 'city-setup', 'entity-calendar', 'earlier-records']));
  expect(agenda.tasks.some(task => task.kind === 'dor-return')).toBe(false);
  expect(agenda.tasks.filter(task => task.kind === 'federal-estimate')).toHaveLength(4);
  expect(agenda.tasks.every(task => !task.done && task.applicability === 'review')).toBe(true);
  expect(agenda.past.map(task => task.due)).toEqual(['2026-04-15', '2026-06-15', '2026-09-15']);
  expect(agenda.next[0].due).toBe('2027-01-15');
  expect(agenda.summary.hasPayments).toBe(false);
  expect(JSON.stringify(data)).toBe(before);
});

test('2026 federal schedule has the unequal IRS periods and only published year is verified', () => {
  const rows = federalDeadlinePeriods(2026);
  expect(rows.map(row => [row.start, row.end, row.due])).toEqual([
    ['2026-01-01', '2026-03-31', '2026-04-15'],
    ['2026-04-01', '2026-05-31', '2026-06-15'],
    ['2026-06-01', '2026-08-31', '2026-09-15'],
    ['2026-09-01', '2026-12-31', '2027-01-15'],
  ]);
  expect(rows.every(row => row.dueVerified)).toBe(true);
  expect(federalDeadlinePeriods(2027).every(row => !row.dueVerified)).toBe(true);
});

test('later consulting start explains earlier dates without declaring no tax due or deleting earlier reviews', () => {
  const agenda = buildTaxAgenda(dataFor({ taxProfile: profile() }), TODAY);
  const earlier = agenda.tasks.filter(task => task.kind === 'federal-estimate' && task.beforeIncomeStart);
  expect(earlier.map(task => task.periodKey)).toEqual(['2026-Q1', '2026-Q2']);
  expect(earlier.every(task => task.statusLabel === 'Review applicability' && !task.done)).toBe(true);
  expect(earlier[0].detail).toMatch(/other income or withholding/);
  const third = agenda.tasks.find(task => task.id === 'irs-2026-Q3');
  expect(third.statusLabel).toBe('No payment recorded');
  expect(third.detail).toMatch(/does not establish tax owed/);
  expect(agenda.past[0].id).toBe('irs-2026-Q3');
});

test('a positive IRS payment is a record, never proof of enough tax paid', () => {
  const agenda = buildTaxAgenda(dataFor({
    taxProfile: profile({ startedOn: '2026-01-01' }),
    taxPayments: [{ id: 'example', agency: 'irs', period: '2026-Q1', amount: 1, date: '2026-04-15' }],
  }), TODAY);
  const task = agenda.tasks.find(item => item.id === 'irs-2026-Q1');
  expect(task).toMatchObject({ status: 'payment-recorded', paid: 1, paymentRecorded: true, done: false });
  expect(task.detail).toMatch(/does not establish that the installment was fully covered/);
  expect(agenda.completed).toEqual([]);
  expect(agenda.summary).toMatchObject({ paymentCount: 1, hasPayments: true });
});

test('explicit federal reviews can be completed and reopened independently of payments', () => {
  const data = dataFor({ taxProfile: profile(), taxChecklist: { 2026: { fed: true } } });
  const task = buildTaxAgenda(data, TODAY).tasks.find(item => item.id === 'irs-2026-Q3');
  expect(task.done).toBe(false); // The older broad checklist is not a per-date review.
  const reviewKey = taxTaskReviewKey(task);
  expect(reviewKey).toBe('review:irs-2026-Q3');
  data.taxChecklist[2026][reviewKey] = true;
  const reviewed = buildTaxAgenda(data, TODAY);
  expect(reviewed.completed.find(item => item.id === task.id)).toMatchObject({ done: true, status: 'reviewed', statusLabel: 'Marked reviewed', paymentRecorded: false, reviewRecorded: true });
  expect(reviewed.completed.find(item => item.id === task.id).detail).toMatch(/not proof of filing or payment; recheck if your circumstances change/);
  expect(reviewed.summary.hasPayments).toBe(false);
  expect(taxAgendaIcs(reviewed.tasks, { now: '2026-10-17T20:00:00Z' })).not.toContain('DTSTART;VALUE=DATE:20260915');
  data.taxChecklist[2026][reviewKey] = false;
  expect(buildTaxAgenda(data, TODAY).tasks.find(item => item.id === task.id)).toMatchObject({ done: false, reviewRecorded: false, statusLabel: 'No payment recorded' });
});

test('annual review uses its own year and key without completing DOR or other installments', () => {
  const data = dorData({ taxProfile: profile(), taxChecklist: { 2026: {
    'review:irs-return-2026': true,
    'review:irs-2026-Q1': 'true',
    'review:dor-quarterly-2026-Q3': true,
  } } });
  const agenda = buildTaxAgenda(data, TODAY);
  expect(agenda.completed.map(task => task.id)).toEqual(['irs-return-2026']);
  expect(agenda.completed[0].statusLabel).toBe('Marked reviewed');
  expect(agenda.tasks.find(task => task.id === 'dor-quarterly-2026-Q3').done).toBe(false);
  expect(agenda.tasks.find(task => task.id === 'irs-2026-Q1').done).toBe(false);
});

test('future-dated or invalid payment records cannot complete a federal or DOR task', () => {
  const data = dorData({ taxPayments: [
    { agency: 'irs', period: '2026-Q1', amount: 10, date: '2026-12-01' },
    { agency: 'irs', period: '2026-Q2', amount: 'NaN', date: '2026-06-15' },
    { agency: 'wa', period: '2026-Q3', amount: 10, date: '2026-12-01' },
  ] });
  recordEmptyFiling(data, '2026-Q3', { boTax: 10 });
  const agenda = buildTaxAgenda(data, TODAY);
  expect(agenda.tasks.find(task => task.id === 'irs-2026-Q1')).toMatchObject({ paymentRecorded: false, paymentNeedsReview: true, done: false });
  expect(agenda.tasks.find(task => task.id === 'irs-2026-Q2')).toMatchObject({ paymentRecorded: false, paymentNeedsReview: true, done: false });
  expect(agenda.tasks.find(task => task.id === 'dor-quarterly-2026-Q3')).toMatchObject({ paymentRecorded: false, paymentNeedsReview: true, done: false });
  expect(agenda.summary.hasPayments).toBe(false);
});

test('withholding and adviser plans stay understandable without inventing a payment shortfall', () => {
  const withholding = buildTaxAgenda(dataFor({ taxProfile: profile({ federalPlan: 'withholding' }) }), TODAY);
  expect(withholding.tasks.find(task => task.id === 'irs-2026-Q3').detail).toMatch(/empty payment ledger does not show a shortfall/);
  const adviser = buildTaxAgenda(dataFor({ taxProfile: profile({ federalPlan: 'adviser' }) }), TODAY);
  expect(adviser.tasks.find(task => task.id === 'irs-2026-Q3').detail).toMatch(/Ask your adviser/);
});

test('January keeps the previous tax year final installment and identifies new dates as unverified', () => {
  const agenda = buildTaxAgenda(dataFor(), '2027-01-02');
  expect(agenda.tasks.find(task => task.id === 'irs-2026-Q4')).toMatchObject({ due: '2027-01-15', dueVerified: true });
  expect(agenda.tasks.find(task => task.id === 'irs-2027-Q1')).toMatchObject({ dueVerified: false, status: 'verify-date' });
  const ics = taxAgendaIcs(agenda.tasks, { now: '2027-01-02T20:00:00Z' });
  expect(ics).toContain('DTSTART;VALUE=DATE:20270115');
  expect(ics).not.toContain('DTSTART;VALUE=DATE:20270415');
});

test('DOR agenda covers older completed periods instead of only the most recent one', () => {
  const data = dorData({ taxProfile: profile({ startedOn: '2025-12-01' }) });
  const tasks = buildTaxAgenda(data, TODAY).tasks.filter(task => task.kind === 'dor-return');
  expect(tasks.map(task => task.periodKey)).toEqual(['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
  expect(tasks.find(task => task.periodKey === '2025-Q1')).toMatchObject({ dueVerified: false, done: false });
  expect(tasks.find(task => task.periodKey === '2026-Q3')).toMatchObject({ due: '2026-11-02', dueVerified: true, year: '2026', frequency: 'quarterly', section: 'dor', statusLabel: 'No filing recorded' });
  expect(tasks.find(task => task.periodKey === '2026-Q4')).toMatchObject({ inProgress: true, status: 'period-open' });
  expect(tasks[0].detail).toMatch(/first period you were required to file/);
});

test('DOR basis remains unknown while assigned frequency can supply review dates', () => {
  const agenda = buildTaxAgenda(dorData({ taxSettings: { waFrequency: 'monthly', waBasis: '' } }), TODAY);
  const september = agenda.tasks.find(task => task.periodKey === '2026-09');
  expect(september).toMatchObject({ due: '2026-10-26', dueVerified: true, status: 'setup', done: false });
  expect(september.report.basis).toBe('');
  expect(september.detail).toMatch(/actual cash or accrual/);
});

test('recorded DOR extensions replace standard dates only when report validation accepts them', () => {
  const data = dorData({ taxSettings: { waFrequency: 'quarterly', waBasis: 'cash', waDueOverrides: {
    '2026-Q3': { date: '2026-11-12', note: 'Synthetic approved extension' },
    '2026-Q2': { date: '2026-07-01', note: 'Earlier dates are invalid' },
  } } });
  const agenda = buildTaxAgenda(data, TODAY);
  expect(agenda.tasks.find(task => task.id === 'dor-quarterly-2026-Q3')).toMatchObject({ due: '2026-11-12', dateSource: 'Your saved DOR extension' });
  expect(agenda.tasks.find(task => task.id === 'dor-quarterly-2026-Q2').due).toBe('2026-07-31');
});

test('DOR payment alone cannot establish filing, and filing alone cannot establish payment', () => {
  const paymentOnly = dorData({ taxPayments: [{ agency: 'wa', period: '2026-Q3', amount: 10, date: TODAY }] });
  expect(buildTaxAgenda(paymentOnly, TODAY).tasks.find(task => task.id === 'dor-quarterly-2026-Q3')).toMatchObject({ status: 'no-filing', paymentRecorded: true, done: false });
  const filingOnly = dorData();
  recordEmptyFiling(filingOnly, '2026-Q3', { boTax: 10 });
  expect(buildTaxAgenda(filingOnly, TODAY).tasks.find(task => task.id === 'dor-quarterly-2026-Q3')).toMatchObject({ status: 'payment-review', paymentRecorded: false, done: false });
  filingOnly.taxPayments.push({ agency: 'wa', period: '2026-Q3', amount: 10, date: TODAY });
  expect(buildTaxAgenda(filingOnly, TODAY).tasks.find(task => task.id === 'dor-quarterly-2026-Q3')).toMatchObject({ status: 'records-complete', done: true });
});

test('an unchanged zero-dollar filed DOR return can be complete without a payment', () => {
  const data = dorData();
  recordEmptyFiling(data, '2026-Q3');
  const task = buildTaxAgenda(data, TODAY).tasks.find(item => item.id === 'dor-quarterly-2026-Q3');
  expect(task).toMatchObject({ done: true, paymentRecorded: false });
  data.dorFilings[0].snapshot.fingerprint = 'synthetic-mismatch';
  expect(buildTaxAgenda(data, TODAY).tasks.find(item => item.id === task.id)).toMatchObject({ done: false, status: 'filed-changed' });
});

test('future-dated and prematurely filed DOR returns cannot appear reconciled', () => {
  const future = dorData();
  recordEmptyFiling(future, '2026-Q3', { filedDate: '2026-11-01' });
  expect(buildTaxAgenda(future, TODAY).tasks.find(task => task.id === 'dor-quarterly-2026-Q3')).toMatchObject({ done: false, status: 'filing-date-review', filingDateNeedsReview: true });
  const early = dorData();
  recordEmptyFiling(early, '2026-Q4');
  expect(buildTaxAgenda(early, TODAY).tasks.find(task => task.id === 'dor-quarterly-2026-Q4')).toMatchObject({ done: false, inProgress: true, status: 'period-open', filingDateNeedsReview: true });
});

test('unknown DOR frequency shows the conditional 2026 quarterly date without assigning it', () => {
  const data = dataFor();
  const agenda = buildTaxAgenda(data, TODAY);
  const setup = agenda.setupTasks.find(task => task.id === 'dor-setup');
  expect(setup.detail).toContain('If assigned quarterly, the standard Q3 2026 deadline is November 2, 2026; your schedule may differ.');
  expect(setup.due).toBe('');
  expect(setup.dueVerified).toBe(false);
  expect(agenda.tasks.some(task => task.kind === 'dor-return')).toBe(false);
  expect(buildTaxAgenda(data, '2027-10-17').setupTasks.find(task => task.id === 'dor-setup').detail).not.toContain('Q3 2026');
});

test('annual personal return is separate and corporations are not assigned the individual installment schedule', () => {
  const sole = buildTaxAgenda(dataFor({ taxProfile: profile() }), TODAY);
  expect(sole.tasks.find(task => task.kind === 'federal-annual')).toMatchObject({ due: '2027-04-15', dueVerified: true, done: false });
  const corp = buildTaxAgenda(dataFor({ taxProfile: profile({ entity: 'c-corp' }) }), TODAY);
  expect(corp.tasks.filter(task => task.agency === 'irs')).toEqual([]);
  expect(corp.setupTasks.some(task => task.id === 'entity-calendar')).toBe(true);
});

test('city reminders use confirmed manual dates without inferring a city filing schedule', () => {
  const data = dataFor({ taxProfile: profile({ city: 'Kent', cityStatus: 'required' }), taxReminders: [
    { id: 'kent', title: 'Example city filing', dueDate: '2026-11-30', category: 'city-tax', notes: 'Synthetic date from city notice', completed: false },
    { id: 'renewal', title: 'Example license renewal', dueDate: '2026-10-01', category: 'license', notes: '', completed: true },
  ] });
  const agenda = buildTaxAgenda(data, TODAY);
  expect(agenda.setupTasks.some(task => task.id === 'city-dates')).toBe(false);
  expect(agenda.completed.find(task => task.reminderId === 'renewal')).toMatchObject({ statusLabel: 'Marked complete' });
  expect(agenda.tasks.filter(task => task.agency === 'city').map(task => task.due)).toEqual(['2026-11-30']);
  data.taxReminders[0].completed = true;
  expect(buildTaxAgenda(data, TODAY).setupTasks.some(task => task.id === 'city-dates')).toBe(true);
});

test('calendar exports only open verified or user-entered dates, with next-day all-day end and a seven-day upcoming alarm', () => {
  const tasks = [
    { id: 'past', title: 'Past IRS review', kind: 'federal-estimate', due: '2026-09-15', dueVerified: true },
    { id: 'upcoming', title: 'DOR return', kind: 'dor-return', due: '2026-11-02', dueVerified: true, applicability: 'review' },
    { id: 'future-unverified', title: 'Unverified date', due: '2027-04-15', dueVerified: false },
    { id: 'done', title: 'Complete', due: '2026-11-30', dueVerified: true, done: true },
  ];
  const ics = taxAgendaIcs(tasks, { now: '2026-10-17T20:00:00Z' });
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  expect(ics).toContain('DTSTART;VALUE=DATE:20261102\r\nDTEND;VALUE=DATE:20261103');
  expect(ics).toContain('SUMMARY:Review: DOR return');
  expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1);
  expect(ics).toContain('TRIGGER:-P7D');
  expect(ics).not.toContain('Complete');
  expect(ics).not.toContain('Unverified date');
});

test('calendar escaping, UTF-8 folding, privacy, and stable IDs survive hostile reminder text', () => {
  const title = 'Business, renewal; \\ ' + 'é🚣'.repeat(40) + '\r\nBEGIN:VEVENT';
  const task = { id: 'custom\r\nINJECT', title, notes: 'PRIVATE NOTE', detail: 'PRIVATE DETAIL', username: 'PRIVATE USER', paid: 12345, kind: 'reminder', due: '2026-12-31', dueVerified: true };
  const ics = taxAgendaIcs([task, task], { now: '2026-10-17T20:00:00Z' });
  expect(ics.split('\r\n').filter(line => line === 'BEGIN:VEVENT')).toHaveLength(1);
  expect(ics).toContain('DTEND;VALUE=DATE:20270101');
  const unfolded = ics.replace(/\r\n /g, '');
  expect(unfolded).toContain('SUMMARY:Business\\, renewal\\; \\\\ ');
  expect(unfolded).toContain('\\nBEGIN:VEVENT');
  expect(unfolded).not.toMatch(/PRIVATE NOTE|PRIVATE DETAIL|PRIVATE USER|12345/);
  ics.split('\r\n').forEach(line => expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75));
  expect(taxAgendaIcs([task], { now: '2026-10-18T20:00:00Z' }).match(/UID:([^\r]+)/)[1]).toBe(ics.match(/UID:([^\r]+)/)[1]);
});
