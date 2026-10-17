import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBilling, saveBilling } from '../../utils/billingApi';
import { normalizeData } from './billing-lib';
import BusinessOverview from './BusinessOverview';
import BusinessAccountsSection from './BusinessAccountsSection';
import CalendarSection from './CalendarSection';
import TimeLogSection from './TimeLogSection';
import InvoicesSection from './InvoicesSection';
import ExpensesSection from './ExpensesSection';
import TaxesSection from './TaxesSection';
import TaxCenter from './TaxCenter';
import DorSection from './DorSection';
import CompanySection from './CompanySection';
import BillingSettingsSection from './BillingSettingsSection';
import '../../styles/billing-warm.css';
import '../../styles/dor-admin.css';
import '../../styles/business-workspace.css';

const NAV_GROUPS = [
  { label: 'Overview', sections: ['overview'] },
  { label: 'Work', sections: ['calendar', 'time'], labels: ['Calendar', 'Time log'] },
  { label: 'Invoices', sections: ['invoices'] },
  { label: 'Expenses', sections: ['expenses'] },
  { label: 'Taxes', sections: ['tax-center', 'dor', 'taxes'], labels: ['Dates & next steps', 'WA DOR worksheet', 'Payment records'] },
  { label: 'Accounts', sections: ['accounts'] },
  { label: 'Business details', sections: ['settings', 'company'], labels: ['Invoice settings & backups', 'Business notes'] },
];
const SECTIONS = new Set(NAV_GROUPS.flatMap((group) => group.sections));

const SAVE_DEBOUNCE_MS = 1200;

const SAVE_LABELS = {
  idle: '',
  dirty: 'Unsaved changes',
  saving: 'Saving...',
  saved: 'Saved',
  conflict: '',
  auth: 'Session rejected. Log out and back in.',
  error: 'Save failed',
};

const BillingTab = ({ onBeforeLeaveChange }) => {
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [data, setData] = useState(null);
  const [saveState, setSaveState] = useState('idle');
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const section = SECTIONS.has(requestedSection) ? requestedSection : 'overview';
  const setSection = (next, task) => {
    if (!SECTIONS.has(next)) return;
    const params = new URLSearchParams(searchParams);
    if (next === 'overview') params.delete('section');
    else params.set('section', next);
    ['taxPeriod', 'taxYear', 'taxFrequency', 'taxAgency'].forEach(key => params.delete(key));
    if (task?.periodKey) params.set('taxPeriod', task.periodKey);
    if (task?.year) params.set('taxYear', task.year);
    if (task?.frequency) params.set('taxFrequency', task.frequency);
    if (task?.agency) params.set('taxAgency', task.agency);
    setSearchParams(params);
  };

  const revRef = useRef(0);
  const dataRef = useRef(null);
  const timerRef = useRef(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const dirtyRef = useRef(false);
  const flushWaitersRef = useRef([]);
  const discardedRef = useRef(false);
  // An unresolved 409: only "Load latest" or "Overwrite" clears it. Tracked in
  // a ref so a keystroke's mutate() can't downgrade the banner to 'dirty' and
  // resume autosaves that are guaranteed to 409 against the stale rev.
  const conflictRef = useRef(false);
  const filingConflictRef = useRef(false);
  const settleFlush = useCallback((saved) => {
    const waiters = flushWaitersRef.current;
    flushWaitersRef.current = [];
    waiters.forEach((resolve) => resolve(saved));
  }, []);

  const load = useCallback(async () => {
    // Reloading discards local changes, so drop any pending debounced save —
    // otherwise it fires after the reload and re-saves or re-conflicts.
    clearTimeout(timerRef.current);
    pendingRef.current = false;
    setStatus('loading');
    setLoadError('');
    try {
      const res = await getBilling();
      const d = normalizeData(res.data || {});
      revRef.current = res.rev || 0;
      dataRef.current = d;
      dirtyRef.current = false;
      conflictRef.current = false;
      filingConflictRef.current = false;
      setData(d);
      setSaveState('idle');
      setStatus('ready');
    } catch (e) {
      setLoadError(
        e.status === 401
          ? 'Your session token was rejected. Log out of the admin panel and log in again.'
          : e.message
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(async (force = false) => {
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    savingRef.current = true;
    setSaveState('saving');
    // Snapshot what this request actually sends: an edit landing mid-flight
    // replaces dataRef (immutably), so `dataRef.current !== snapshot` detects
    // it and chains another save instead of wrongly reporting "Saved".
    const snapshot = dataRef.current;
    try {
      const res = await saveBilling(snapshot, revRef.current, force);
      if (discardedRef.current) {
        savingRef.current = false;
        return;
      }
      revRef.current = res.rev;
      const editedDuringSave = pendingRef.current || dataRef.current !== snapshot;
      // The server retains filing history even after a stale-tab overwrite.
      // Reconcile that canonical history without discarding edits still in flight.
      if (Array.isArray(res.dorFilings)) {
        const savedIds = new Set(res.dorFilings.map((f) => f.id));
        const dorFilings = [...res.dorFilings, ...(dataRef.current.dorFilings || []).filter((f) => !savedIds.has(f.id))];
        const next = { ...dataRef.current, dorFilings };
        dataRef.current = next;
        setData(next);
      }
      conflictRef.current = false;
      filingConflictRef.current = false;
      savingRef.current = false;
      if (editedDuringSave) {
        pendingRef.current = false;
        clearTimeout(timerRef.current);
        persist();
      } else {
        dirtyRef.current = false;
        setSaveState('saved');
        settleFlush(true);
      }
    } catch (e) {
      savingRef.current = false;
      pendingRef.current = false;
      clearTimeout(timerRef.current);
      settleFlush(false);
      if (discardedRef.current) return;
      if (e.code === 'DOR_FILING_IMMUTABLE') {
        filingConflictRef.current = true;
        setSaveState('filing-conflict');
      } else if (e.status === 409) {
        conflictRef.current = true;
        setSaveState('conflict');
      } else if (e.status === 401) setSaveState('auth');
      else setSaveState('error');
    }
  }, [settleFlush]);

  // Admin navigation waits for the last save, including edits made while a
  // request is in flight. Merely waiting must not queue a redundant save.
  const beforeLeave = useCallback(({ discard = false } = {}) => {
    clearTimeout(timerRef.current);
    if (discard) {
      discardedRef.current = true;
      dirtyRef.current = false;
      pendingRef.current = false;
      settleFlush(false);
      return Promise.resolve(true);
    }
    if (!dirtyRef.current && !savingRef.current) return Promise.resolve(true);
    if (!savingRef.current && (conflictRef.current || filingConflictRef.current)) return Promise.resolve(false);
    return new Promise((resolve) => {
      flushWaitersRef.current.push(resolve);
      if (!savingRef.current) persist();
    });
  }, [persist, settleFlush]);

  useEffect(() => {
    onBeforeLeaveChange?.(beforeLeave);
    return () => onBeforeLeaveChange?.(null);
  }, [beforeLeave, onBeforeLeaveChange]);

  const scheduleSave = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(), SAVE_DEBOUNCE_MS);
  }, [persist]);

  // Every mutation goes through here: updater(current) returns the next data
  // object; the change shows immediately and saves after a short debounce.
  const mutate = useCallback(
    (updater) => {
      const next = updater(dataRef.current);
      dataRef.current = next;
      dirtyRef.current = true;
      setData(next);
      if (filingConflictRef.current) {
        setSaveState('filing-conflict');
      } else if (conflictRef.current) {
        // Keep editing locally, but the banner stays and no save is scheduled
        // until the conflict is resolved one way or the other.
        setSaveState('conflict');
      } else {
        setSaveState('dirty');
        scheduleSave();
      }
    },
    [scheduleSave]
  );

  // Backup import: replace everything and save right away. Normalized so
  // pre-journal backups (and desktop-app exports) gain the newer fields.
  const replaceAll = useCallback(
    (next) => {
      clearTimeout(timerRef.current);
      const normalized = normalizeData(next);
      // An older backup has no account directory to restore; retain the current one.
      if (next.businessAccounts === undefined) normalized.businessAccounts = dataRef.current?.businessAccounts || normalized.businessAccounts;
      for (const key of ['taxProfile', 'taxReminders']) {
        if (next[key] === undefined && dataRef.current?.[key] !== undefined) normalized[key] = dataRef.current[key];
      }
      // Backups can add history, but cannot rewrite an already recorded filing.
      const existing = dataRef.current?.dorFilings || [];
      const existingIds = new Set(existing.map((f) => f.id));
      normalized.dorFilings = [...existing, ...normalized.dorFilings.filter((f) => !existingIds.has(f.id))];
      dataRef.current = normalized;
      dirtyRef.current = true;
      setData(normalized);
      persist();
    },
    [persist]
  );

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirtyRef.current || savingRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Admin tab changes/sign-out use beforeLeave above. Keep the best-effort
  // flush for other app navigation; explicit discard must never restart it.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      settleFlush(false);
      if (discardedRef.current) return;
      if (!dirtyRef.current || !dataRef.current) return;
      if (conflictRef.current || filingConflictRef.current) return;
      if (savingRef.current) {
        pendingRef.current = true;
      } else {
        saveBilling(dataRef.current, revRef.current).catch(() => {});
      }
    },
    [settleFlush]
  );

  if (status === 'loading') {
    return <div className="billing-note">Loading your business workspace...</div>;
  }
  if (status === 'error') {
    return (
      <div className="billing-note">
        <p>Could not load your business workspace: {loadError}</p>
        <button className="billing-btn" onClick={load}>Retry</button>
      </div>
    );
  }

  const activeGroup = NAV_GROUPS.find((group) => group.sections.includes(section));

  return (
    <div className="billing-root">
      {saveState === 'filing-conflict' && (
        <div className="billing-conflict" role="alert">
          <span>A recorded DOR filing cannot be overwritten. Load the saved history, then record an amendment as a new filing.</span>
          <button className="billing-btn" onClick={load}>Load latest (discards changes here)</button>
        </div>
      )}
      {saveState === 'conflict' && (
        <div className="billing-conflict">
          <span>
            This data was saved from somewhere else after you loaded it (another tab or device).
          </span>
          <div className="billing-conflict-actions">
            <button className="billing-btn" onClick={load}>
              Load latest (discards changes here)
            </button>
            <button className="billing-btn primary" onClick={() => persist(true)}>
              Overwrite with this version
            </button>
          </div>
        </div>
      )}

      <div className="business-navigation">
        <nav className="business-primary-nav" aria-label="Business sections">
          {NAV_GROUPS.map((group) => (
            <button key={group.label} className={group === activeGroup ? 'active' : ''}
              aria-current={group === activeGroup ? 'page' : undefined}
              onClick={() => setSection(group.sections.includes(section) ? section : group.sections[0])}>
              {group.label}
            </button>
          ))}
        </nav>
        <div className="billing-savestate-wrap" aria-live="polite">
          <span className={'billing-savestate ' + saveState}>{SAVE_LABELS[saveState]}</span>
          {saveState === 'error' && <button className="billing-btn small" onClick={() => persist()}>Retry save</button>}
        </div>
      </div>
      {activeGroup.sections.length > 1 && (
        <nav className="business-secondary-nav" aria-label={activeGroup.label + ' views'}>
          {activeGroup.sections.map((key, index) => (
            <button key={key} className={key === section ? 'active' : ''}
              aria-current={key === section ? 'page' : undefined} onClick={() => setSection(key)}>
              {activeGroup.labels[index]}
            </button>
          ))}
        </nav>
      )}
      {section === 'overview' && <BusinessOverview data={data} onNavigate={setSection} />}
      {section === 'accounts' && <BusinessAccountsSection data={data} mutate={mutate} onNavigate={setSection} />}

      {section === 'calendar' && <CalendarSection data={data} mutate={mutate} />}
      {section === 'time' && <TimeLogSection data={data} mutate={mutate} />}
      {section === 'invoices' && <InvoicesSection data={data} mutate={mutate} onOpenDor={() => setSection('dor')} />}
      {section === 'expenses' && <ExpensesSection data={data} mutate={mutate} />}
      {section === 'tax-center' && <TaxCenter data={data} mutate={mutate} onNavigate={setSection} />}
      {section === 'dor' && <DorSection key={searchParams.get('taxPeriod') || 'default'} data={data} mutate={mutate} initialPeriod={{ periodKey: searchParams.get('taxPeriod'), year: searchParams.get('taxYear'), frequency: searchParams.get('taxFrequency') }} />}
      {section === 'taxes' && <TaxesSection data={data} mutate={mutate} focusAgency={searchParams.get('taxAgency')} focusPeriod={searchParams.get('taxPeriod')} onOpenDor={() => setSection('dor')} />}
      {section === 'company' && <CompanySection data={data} mutate={mutate} />}
      {section === 'settings' && (
        <BillingSettingsSection data={data} mutate={mutate} replaceAll={replaceAll} />
      )}
    </div>
  );
};

export default BillingTab;
