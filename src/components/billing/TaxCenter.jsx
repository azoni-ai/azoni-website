import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, ChevronRight } from 'lucide-react';
import { defaultTaxProfile, downloadFile, fmtDate, todayISO, uid, validTaxWorkspace } from './billing-lib';
import { fmtRange } from './tax-lib';
import { buildTaxAgenda, taxAgendaIcs, taxTaskReviewKey } from './tax-tasks-lib';
import '../../styles/tax-center.css';

const LINKS = {
  irs: 'https://www.irs.gov/payments',
  estimates: 'https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes',
  dor: 'https://secure.dor.wa.gov/home/Login',
  dorDates: 'https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates/2026-excise-tax-return-due-dates',
  filelocal: 'https://www.filelocal-wa.gov/Default_FileLocal.aspx',
  kent: 'https://taxfile.kentwa.gov/',
  kentGuide: 'https://www.kentwa.gov/pay-and-apply/file-city-taxes',
  seattle: 'https://www.seattle.gov/city-finance/business-taxes-and-licenses/business-taxes/seattle-shield-business-and-occupation-(bando)-tax-changes',
  licenses: 'https://www.kentwa.gov/pay-and-apply/apply-for-a-business-license',
  sos: 'https://ccfs.sos.wa.gov/',
  llcGuide: 'https://www.sos.wa.gov/corporations-charities/business-entities/limited-liability-company-llc-professional-llc-pllc-filing-resource-page',
};
const CATEGORIES = { 'city-tax': 'City tax', license: 'License / renewal', 'annual-filing': 'Annual filing', other: 'Other deadline' };
const emptyReminder = () => ({ title: '', dueDate: '', category: 'city-tax', notes: '', completed: false });
const isRecordedDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= todayISO();
};
const Field = ({ label, children }) => <label className="billing-fld"><span>{label}</span>{children}</label>;
const External = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={14} aria-hidden="true" /></a>;

function TaxTask({ task, onNavigate, onReview }) {
  return <article className={`tax-task ${task.done ? 'is-recorded' : ''}`}>
    <div className="tax-task-date"><CalendarDays size={17} aria-hidden="true" /><time dateTime={task.due}>{fmtDate(task.due)}</time><span>{task.dueVerified ? task.dateSource || 'Your reminder' : 'Verify date'}</span></div>
    <div className="tax-task-copy"><span className="tax-task-status">{task.statusLabel}</span><h4>{task.title}</h4>{task.kind === 'federal-estimate' && <p>Income period: {fmtRange(task.period.start, task.period.end)}</p>}<details className="tax-task-details"><summary>What to check</summary><p>{task.detail}</p></details></div>
    <div className="tax-task-actions"><button type="button" className="billing-btn small" onClick={() => onNavigate(task.section || 'tax-center', task)}>{task.kind === 'reminder' ? 'Review reminder' : task.button || 'Review'}<ChevronRight size={14} aria-hidden="true" /></button>{['federal-estimate', 'federal-annual'].includes(task.kind) && <button type="button" className="tax-task-review" onClick={() => onReview(task)}>{task.done ? 'Reopen review' : 'Mark reviewed'}</button>}</div>
  </article>;
}

export default function TaxCenter({ data, mutate, onNavigate }) {
  const agenda = useMemo(() => buildTaxAgenda(data), [data]);
  const [profile, setProfile] = useState(() => ({ ...defaultTaxProfile(), ...data.taxProfile }));
  const [profileDirty, setProfileDirty] = useState(false);
  useEffect(() => { if (!profileDirty) setProfile({ ...defaultTaxProfile(), ...data.taxProfile }); }, [data.taxProfile, profileDirty]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [reminder, setReminder] = useState(emptyReminder);
  const [editingId, setEditingId] = useState(null);
  const setupRef = useRef(null);
  const remindersRef = useRef(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const earliestPayment = (data.invoices || []).filter(invoice => invoice.status === 'paid' && isRecordedDate(invoice.paidDate)).map(invoice => invoice.paidDate).sort()[0];
  const kent = /^kent(?:\s*,?\s*(?:wa|washington))?$/i.test(data.taxProfile?.city?.trim() || '');
  const reminders = data.taxReminders || [];
  const go = (section, task) => {
    if (task?.kind === 'reminder' || task?.kind === 'federal-annual' || task?.agency === 'city' || task?.button === 'Add a reminder') {
      if (task?.kind === 'federal-annual') { setEditingId(null); setReminder({ ...emptyReminder(), title: task.title, dueDate: task.due, category: 'annual-filing', notes: 'Prepare and file the annual return; reconcile estimated payments and withholding.' }); }
      setReminderOpen(true); remindersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
    if (section === 'tax-center') { setSetupOpen(true); setupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    onNavigate(section, task);
  };
  const changeProfile = key => event => { setProfileDirty(true); setProfile(current => ({ ...current, [key]: event.target.value })); };
  const saveProfile = event => {
    event.preventDefault();
    const next = { ...profile, city: profile.city.trim() };
    if (!validTaxWorkspace({ taxProfile: next }) || (next.startedOn && next.startedOn > todayISO())) { setError('Check your setup. The first payment date must be a real date on or before today.'); return; }
    mutate(current => ({ ...current, taxProfile: next }));
    setProfile(next); setProfileDirty(false); setError(''); setNotice('Tax setup updated. Your timeline now uses these details.'); setSetupOpen(false);
  };
  const changeReminder = key => event => setReminder(current => ({ ...current, [key]: event.target.value }));
  const saveReminder = event => {
    event.preventDefault();
    const next = { ...reminder, id: editingId || uid(), title: reminder.title.trim(), notes: reminder.notes.trim() };
    const records = editingId ? reminders.map(item => item.id === editingId ? next : item) : [...reminders, next];
    if (!validTaxWorkspace({ taxReminders: records })) { setError('Enter a title and a valid date. Up to 200 reminders can be saved.'); return; }
    if (reminders.some(item => item.id !== editingId && item.title === next.title && item.dueDate === next.dueDate)) { setError('That reminder is already in your list.'); return; }
    mutate(current => ({ ...current, taxReminders: records }));
    setReminder(emptyReminder()); setEditingId(null); setError(''); setNotice('Reminder saved. Download a new calendar copy if you use calendar reminders.');
  };
  const removeReminder = item => {
    if (!window.confirm(`Remove the reminder "${item.title}"? This does not change any tax or payment record.`)) return;
    mutate(current => ({ ...current, taxReminders: current.taxReminders.filter(row => row.id !== item.id) }));
    if (editingId === item.id) { setEditingId(null); setReminder(emptyReminder()); }
  };
  const addTemplate = event => {
    const templates = {
      kentQuarter: { title: 'Kent B&O: Q3 2026 return and payment', dueDate: '2026-11-02', category: 'city-tax', notes: 'Use only if Kent assigns quarterly filing. Verify your requirement and amount in Kent TaxFile.' },
      kentAnnual: { title: 'Kent B&O: 2026 annual return', dueDate: '2027-04-30', category: 'city-tax', notes: 'Use only if Kent approved annual filing. Verify in Kent TaxFile.' },
      seattleAnnual: { title: 'Seattle B&O: 2026 annual return', dueDate: '2027-04-30', category: 'city-tax', notes: 'Use only if Seattle requires an annual return. Filing may still be required when no tax is owed.' },
    };
    if (templates[event.target.value]) { setEditingId(null); setReminder({ ...emptyReminder(), ...templates[event.target.value] }); }
    event.target.value = '';
  };
  const exportCalendar = () => {
    downloadFile('azoni-tax-deadlines.ics', taxAgendaIcs(agenda.tasks, { now: new Date() }), 'text/calendar;charset=utf-8');
    setNotice('Calendar downloaded. Import it into your calendar and enable its reminders. This copy does not update automatically.');
  };
  const openTasks = agenda.next || [];
  const reviewTask = task => {
    if (!task.done && !window.confirm(`Mark "${task.title}" reviewed? Confirm the filing or payment requirement and any needed action with your records or tax preparer first. This checkmark does not file a return, send money, or establish that enough tax was paid.`)) return;
    const key = taxTaskReviewKey(task);
    mutate(current => ({ ...current, taxChecklist: { ...current.taxChecklist, [task.year]: { ...(current.taxChecklist[task.year] || {}), [key]: !task.done } } }));
    setNotice(task.done ? 'Review reopened.' : 'Marked reviewed. Reopen this item if your circumstances or records change.');
  };
  const taskRow = task => <TaxTask key={task.id} task={task} onNavigate={go} onReview={reviewTask} />;
  const setupTasks = agenda.setupTasks.filter(task => ['dor-setup', 'city-setup', 'city-dates'].includes(task.id));
  const federalSetup = agenda.setupTasks.find(task => task.agency === 'irs' && task.id !== 'entity-calendar');
  if (federalSetup) setupTasks.unshift({ ...federalSetup, title: 'Confirm your federal setup', detail: 'Check your first payment date and how you will cover federal taxes. Your paid invoices can help fill this in.' });
  return <section className="tax-center" aria-labelledby="tax-center-title">
    <header className="tax-center-heading"><div><p className="business-overview-eyebrow">One place to stay on top of it</p><h2 id="tax-center-title">Taxes & deadlines</h2><p>Check the date. Review what applies. Pay or file with the agency, then keep the record here.</p></div><button type="button" className="billing-btn" onClick={exportCalendar} disabled={!agenda.tasks.some(task => task.dueVerified && !task.done)}><CalendarDays size={16} aria-hidden="true" />Download calendar</button></header>
    <p className="tax-center-calendar-note">Calendar downloads are a snapshot with reminders. This website does not send alerts while it is closed or submit payments.</p>
    {notice && <p className="dor-notice" role="status">{notice}</p>}{error && <p className="dor-warning" role="alert">{error}</p>}

    {!agenda.summary.hasPayments && <div className="tax-start-note"><strong>No tax payments recorded yet</strong><p>Start with your setup and the earlier dates below. A past date needs a check; the amount owed depends on your income, withholding, and filing requirements.</p><External href={LINKS.estimates}>How IRS estimates work</External></div>}

    <details className="tax-explanation billing-card"><summary>How IRS, DOR & city taxes differ</summary><div className="tax-explainers">
      <article><span>01 / Federal</span><h3>IRS</h3><p>Income tax and self-employment tax. Estimated payments count toward your annual return.</p><External href={LINKS.irs}>IRS payment options</External></article>
      <article><span>02 / Washington</span><h3>WA DOR</h3><p>Pass on collected sales tax and report business B&amp;O tax. Filing and payment have separate records.</p><button type="button" onClick={() => onNavigate('dor')}>Prepare DOR return<ChevronRight size={14} aria-hidden="true" /></button></article>
      <article><span>03 / Local</span><h3>{kent ? 'Kent & other cities' : 'City taxes & licenses'}</h3><p>City returns and license renewals have their own rules. A zero tax bill can still require a return.</p><button type="button" onClick={() => { setReminderOpen(true); remindersRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>Review city requirements<ChevronRight size={14} aria-hidden="true" /></button></article>
    </div></details>

    <details ref={setupRef} className="tax-setup billing-card" open={setupOpen} onToggle={event => setSetupOpen(event.currentTarget.open)}>
      <summary><span>Your tax setup</span><span>{agenda.setupTasks.length ? 'A few details to confirm' : 'Review or change'}</span></summary>
      <div className="tax-details-body">
        <p className="billing-hint">“Not sure yet” is fine. Unknown details stay visible as review items.</p>
        <form onSubmit={saveProfile}>
          <div className="tax-form-grid">
            <Field label="How your business is taxed"><select value={profile.entity} onChange={changeProfile('entity')}><option value="unknown">Not sure yet</option><option value="sole-proprietor">Sole proprietor / single-member LLC</option><option value="s-corp">S corporation</option><option value="c-corp">C corporation</option><option value="partnership">Partnership</option></select></Field>
            <Field label="First consulting payment received"><input type="date" value={profile.startedOn} max={todayISO()} onChange={changeProfile('startedOn')} /></Field>
            <Field label="Business city"><input value={profile.city} maxLength={120} placeholder="Your business location" onChange={changeProfile('city')} /></Field>
            <Field label="How you cover federal taxes"><select value={profile.federalPlan} onChange={changeProfile('federalPlan')}><option value="unknown">Not sure yet</option><option value="estimated">Estimated payments to IRS</option><option value="withholding">Extra paycheck withholding</option><option value="adviser">Working this out with my tax preparer</option></select></Field>
            <Field label="City filing requirements"><select value={profile.cityStatus} onChange={changeProfile('cityStatus')}><option value="unknown">Still need to check</option><option value="required">Confirmed: I have city returns to file</option><option value="not-required">Confirmed: no city tax returns required</option></select></Field>
          </div>
          {earliestPayment ? <div className="tax-date-suggestion"><p>Earliest paid invoice in your records: <strong>{fmtDate(earliestPayment)}</strong>. Confirm there were no earlier payments outside this ledger.</p><button type="button" className="billing-btn small" onClick={() => { setProfileDirty(true); setProfile(current => ({ ...current, startedOn: earliestPayment })); }}>Use earliest recorded payment</button></div> : <p className="billing-hint">No paid invoice date is recorded yet. Add the payment date in Invoices, or enter your first consulting receipt above.</p>}
          <p className="billing-hint">This date helps review federal installments. Your first required DOR return can begin earlier; check the periods in My DOR.</p>
          <button className="billing-btn primary" type="submit">Save tax setup</button>
        </form>
        <div className="tax-setup-next"><strong>Also confirm with DOR</strong><p>Your assigned filing frequency and accounting basis determine the DOR dates and worksheet.</p><button type="button" className="billing-btn small" onClick={() => onNavigate('dor')}>Confirm DOR setup</button></div>
      </div>
    </details>

    {setupTasks.length > 0 && <section className="tax-review-list" aria-label="Setup to confirm">{setupTasks.map(task => <article key={task.id}><div><strong>{task.title}</strong><p>{task.detail}</p></div><button className="billing-btn small" type="button" onClick={() => go(task.section, task)}>{task.button || 'Review setup'}</button></article>)}</section>}

    <section className="tax-timeline billing-card" aria-labelledby="tax-next-title"><div className="billing-card-head"><h3 id="tax-next-title">Coming up</h3><span className="billing-hint">{openTasks.length} dates to review</span></div>
      {openTasks.length ? openTasks.slice(0, 3).map(taskRow) : <p className="billing-hint">No upcoming dates can be shown from this setup. Confirm the agency schedules above.</p>}
      {openTasks.length > 3 && <details className="tax-more"><summary>See {openTasks.length - 3} more dates</summary>{openTasks.slice(3).map(taskRow)}</details>}
    </section>
    {agenda.past.length > 0 && <details className="tax-timeline tax-past billing-card" open><summary><span>Review earlier dates</span><span>{agenda.past.length} items</span></summary><p className="billing-hint">These dates have passed. Check whether a payment or filing was required and whether your records are complete. A recorded payment alone does not establish that enough was paid.</p>{agenda.past.slice(0, 3).map(taskRow)}{agenda.past.length > 3 && <details className="tax-more"><summary>See {agenda.past.length - 3} more earlier dates</summary>{agenda.past.slice(3).map(taskRow)}</details>}</details>}
    {agenda.completed.length > 0 && <details className="tax-timeline billing-card"><summary><span>Recorded / completed</span><span>{agenda.completed.length} items</span></summary>{agenda.completed.map(taskRow)}</details>}
    <p className="billing-hint tax-scope">{agenda.scope} Standard dates do not include individual disaster relief or extensions unless you record them. <External href={LINKS.dorDates}>DOR calendar</External></p>

    <details className="tax-reminders billing-card" ref={remindersRef} open={reminderOpen} onToggle={event => setReminderOpen(event.currentTarget.open)}><summary><span>City, license & other reminders</span><span>Add dates from your notices</span></summary><div className="tax-details-body">
      {kent && <div className="tax-city-guide"><h3>Your Kent business</h3><p>Kent uses <External href={LINKS.kent}>Kent TaxFile for B&amp;O returns</External> and <External href={LINKS.filelocal}>FileLocal for business licensing</External>. Confirm whether Kent assigned quarterly, annual, or approved non-reporting status.</p><p>For quarterly filers, the Q3 2026 standard date is <strong>November 2, 2026</strong>. Approved annual filers have an April 30, 2027 date for 2026. <External href={LINKS.kentGuide}>Kent rules</External></p><p>A Seattle client is a reason to check Seattle’s licensing and filing rules. The 2026 B&amp;O threshold is $2 million, but a required return can still be due below that amount. <External href={LINKS.seattle}>Seattle rules</External></p><p><External href={LINKS.licenses}>Check Kent license renewal</External></p></div>}
      <p className="billing-hint">Add the date shown in your city account, license notice, or tax preparer’s instructions. These reminders do not replace filing or payment records.</p>
      <p className="billing-hint"><strong>For an LLC:</strong> check your annual report expiration date in <External href={LINKS.sos}>WA Secretary of State / CCFS</External> and add it here. This is separate from tax returns and license renewals. <External href={LINKS.llcGuide}>LLC filing guidance</External></p>
      <button type="button" className="billing-btn small" onClick={() => { setEditingId(null); setReminder({ ...emptyReminder(), title: 'WA LLC annual report', category: 'annual-filing', notes: 'Check the entity expiration date in WA Secretary of State / CCFS, then file the annual report.' }); }}>Add LLC annual report reminder</button>
      {reminders.length > 0 && <div className="tax-reminder-list">{[...reminders].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(item => <article key={item.id}><label className="billing-check"><input type="checkbox" checked={item.completed} onChange={event => { const completed = event.target.checked; mutate(current => ({ ...current, taxReminders: current.taxReminders.map(row => row.id === item.id ? { ...row, completed } : row) })); }} /><span>{item.completed && <Check size={14} aria-hidden="true" />} {item.title}<small>{fmtDate(item.dueDate)} · {CATEGORIES[item.category]} · {item.completed ? 'Marked complete' : 'Open'}</small></span></label><div className="billing-actions"><button type="button" className="billing-btn small" onClick={() => { setEditingId(item.id); const { id, ...fields } = item; setReminder(fields); }}>Edit</button><button type="button" className="billing-btn small danger" onClick={() => removeReminder(item)}>Remove</button></div></article>)}</div>}
      <form className="tax-reminder-form" onSubmit={saveReminder}><h4>{editingId ? 'Edit reminder' : 'Add a reminder'}</h4>
        {kent && !editingId && <Field label="Optional city date template"><select defaultValue="" onChange={addTemplate}><option value="">Choose only if it matches your assigned schedule</option><option value="kentQuarter">Kent: Q3 2026 quarterly return</option><option value="kentAnnual">Kent: 2026 annual return</option><option value="seattleAnnual">Seattle: 2026 annual return</option></select></Field>}
        <div className="tax-form-grid"><Field label="Reminder title"><input required maxLength={160} value={reminder.title} onChange={changeReminder('title')} placeholder="e.g. Renew business license" /></Field><Field label="Due date"><input required type="date" value={reminder.dueDate} onChange={changeReminder('dueDate')} /></Field><Field label="Reminder type"><select value={reminder.category} onChange={changeReminder('category')}>{Object.entries(CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="Reminder notes"><textarea rows={2} maxLength={2000} value={reminder.notes} onChange={changeReminder('notes')} placeholder="Where to file, notice details, or what to check" /></Field></div><div className="billing-actions"><button type="submit" className="billing-btn primary">{editingId ? 'Save reminder' : 'Add reminder'}</button>{editingId && <button type="button" className="billing-btn" onClick={() => { setEditingId(null); setReminder(emptyReminder()); }}>Cancel edit</button>}</div>
      </form>
    </div></details>
    <div className="tax-center-footer"><p>Use your tax preparer to confirm the first IRS payment amount, any catch-up payment, and city requirements. This workspace keeps the dates and records together.</p><button type="button" className="billing-btn" onClick={() => onNavigate('taxes')}>View payment records</button></div>
  </section>;
}
