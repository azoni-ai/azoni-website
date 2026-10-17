import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getBilling, saveBilling } from '../../utils/billingApi';
import {
  addDaysISO, computeStats, fmtDate, hoursFmt, invoiceDateFor, moneyWhole,
  normalizeData, periodForDate, todayISO,
} from './billing-lib';
import CalendarSection from './CalendarSection';
import TimeLogSection from './TimeLogSection';
import InvoicesSection from './InvoicesSection';
import ExpensesSection from './ExpensesSection';
import TaxesSection from './TaxesSection';
import DorSection from './DorSection';
import { suggestedDorPeriod } from './dor-lib';
import { waPeriods } from './tax-lib';
import CompanySection from './CompanySection';
import BillingSettingsSection from './BillingSettingsSection';
import '../../styles/billing-warm.css';
import '../../styles/dor-admin.css';

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

const BillingTab = () => {
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [data, setData] = useState(null);
  const [saveState, setSaveState] = useState('idle');
  const [section, setSection] = useState('calendar');

  const revRef = useRef(0);
  const dataRef = useRef(null);
  const timerRef = useRef(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const dirtyRef = useRef(false);
  // An unresolved 409: only "Load latest" or "Overwrite" clears it. Tracked in
  // a ref so a keystroke's mutate() can't downgrade the banner to 'dirty' and
  // resume autosaves that are guaranteed to 409 against the stale rev.
  const conflictRef = useRef(false);
  const filingConflictRef = useRef(false);

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
      }
    } catch (e) {
      savingRef.current = false;
      pendingRef.current = false;
      if (e.code === 'DOR_FILING_IMMUTABLE') {
        filingConflictRef.current = true;
        setSaveState('filing-conflict');
      } else if (e.status === 409) {
        conflictRef.current = true;
        setSaveState('conflict');
      } else if (e.status === 401) setSaveState('auth');
      else setSaveState('error');
    }
  }, []);

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

  // Flush unsaved work if the user switches admin tabs mid-edit. With a save
  // in flight, setting pendingRef makes its completion chain persist(), which
  // re-reads dataRef — the refs and closures outlive the component.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      if (!dirtyRef.current || !dataRef.current) return;
      if (conflictRef.current || filingConflictRef.current) return;
      if (savingRef.current) {
        pendingRef.current = true;
      } else {
        saveBilling(dataRef.current, revRef.current).catch(() => {});
      }
    },
    []
  );

  if (status === 'loading') {
    return <div className="billing-note">Loading billing data...</div>;
  }
  if (status === 'error') {
    return (
      <div className="billing-note">
        <p>Could not load billing data: {loadError}</p>
        <button className="billing-btn" onClick={load}>Retry</button>
      </div>
    );
  }

  const stats = computeStats(data);
  const dorSuggested = suggestedDorPeriod(data);
  const dorPeriod = waPeriods(dorSuggested.year, dorSuggested.frequency).find((p) => p.key === dorSuggested.periodKey);
  const dorSetupConfirmed = !!data.taxSettings.waFrequency && !!data.taxSettings.waBasis;
  const dorOverride = data.taxSettings.waDueOverrides?.[dorPeriod.key];

  // Current-cycle context line: period, invoice date, due date.
  const anchor = data.settings.cycleAnchor;
  const today = todayISO();
  let cycleLine = null;
  if (anchor && today >= anchor) {
    const p = periodForDate(anchor, today);
    const invDate = invoiceDateFor(p.end);
    cycleLine = `Current period ${fmtDate(p.start)} to ${fmtDate(p.end)} · invoice ${fmtDate(invDate)} · due ${fmtDate(addDaysISO(invDate, data.settings.netDays || 0))}`;
  }

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

      <div className="billing-tiles">
        <div className="billing-tile">
          <div className="bt-label">Unbilled</div>
          <div className="bt-value">{moneyWhole(stats.uAmt)}</div>
          <div className="bt-sub">{hoursFmt(stats.uHours)} hours</div>
        </div>
        <div className="billing-tile">
          <div className="bt-label">Outstanding</div>
          <div className="bt-value">{moneyWhole(stats.oAmt)}</div>
          <div className="bt-sub">
            {stats.oCount} invoice{stats.oCount === 1 ? '' : 's'}
            {stats.overdue > 0 && (
              <span className="bt-flag"> {'⚠'} {stats.overdue} overdue</span>
            )}
          </div>
        </div>
        <div className="billing-tile">
          <div className="bt-label">Paid in {stats.year}</div>
          <div className="bt-value">{moneyWhole(stats.pAmt)}</div>
          <div className="bt-sub">{stats.pCount} invoice{stats.pCount === 1 ? '' : 's'}</div>
        </div>
        <div className="billing-tile">
          <div className="bt-label">Sales tax collected</div>
          <div className="bt-value">{moneyWhole(stats.tAmt)}</div>
          <div className="bt-sub">recorded on paid invoices, before remittances</div>
        </div>
        <div className="billing-tile">
          <div className="bt-label">Expenses in {stats.year}</div>
          <div className="bt-value">{moneyWhole(stats.xDeductible)}</div>
          <div className="bt-sub">
            deductible from {stats.xCount} expense{stats.xCount === 1 ? '' : 's'}
            {stats.xTotal !== stats.xDeductible && `, ${moneyWhole(stats.xTotal)} spent`}
          </div>
        </div>
      </div>

      {cycleLine && <div className="billing-cycleline">{cycleLine}</div>}

      {section !== 'dor' && (
        <div className="billing-dor-callout">
          <div>
            <strong>WA DOR · {dorPeriod.label} {dorSuggested.year}</strong>
            <p>
              {dorSetupConfirmed ? '' : 'Preview — confirm your filing schedule and accounting basis. '}
              {dorOverride ? `Recorded extension: ${fmtDate(dorOverride.date)}. ` : ''}
              {dorPeriod.dueVerified ? 'Standard deadline' : 'Estimated deadline — verify with DOR'}: {fmtDate(dorPeriod.due)}.
            </p>
          </div>
          <button className="billing-btn primary" onClick={() => setSection('dor')}>Prepare return</button>
        </div>
      )}

      <div className="billing-bar">
        <div className="billing-subtabs">
          <button
            className={`billing-subtab ${section === 'calendar' ? 'active' : ''}`}
            onClick={() => setSection('calendar')}
          >
            Calendar
          </button>
          <button
            className={`billing-subtab ${section === 'time' ? 'active' : ''}`}
            onClick={() => setSection('time')}
          >
            Time log
          </button>
          <button
            className={`billing-subtab ${section === 'invoices' ? 'active' : ''}`}
            onClick={() => setSection('invoices')}
          >
            Invoices
          </button>
          <button
            className={`billing-subtab ${section === 'expenses' ? 'active' : ''}`}
            onClick={() => setSection('expenses')}
          >
            Expenses
          </button>
          <button
            className={`billing-subtab ${section === 'dor' ? 'active' : ''}`}
            onClick={() => setSection('dor')}
          >
            WA DOR
          </button>
          <button
            className={`billing-subtab ${section === 'taxes' ? 'active' : ''}`}
            onClick={() => setSection('taxes')}
          >
            Tax planning
          </button>
          <button
            className={`billing-subtab ${section === 'company' ? 'active' : ''}`}
            onClick={() => setSection('company')}
          >
            Company
          </button>
          <button
            className={`billing-subtab ${section === 'settings' ? 'active' : ''}`}
            onClick={() => setSection('settings')}
          >
            Settings
          </button>
        </div>
        <div className="billing-savestate-wrap">
          <span className={`billing-savestate ${saveState}`}>{SAVE_LABELS[saveState]}</span>
          {saveState === 'error' && (
            <button className="billing-btn small" onClick={() => persist()}>Retry</button>
          )}
        </div>
      </div>

      {section === 'calendar' && <CalendarSection data={data} mutate={mutate} />}
      {section === 'time' && <TimeLogSection data={data} mutate={mutate} />}
      {section === 'invoices' && <InvoicesSection data={data} mutate={mutate} onOpenDor={() => setSection('dor')} />}
      {section === 'expenses' && <ExpensesSection data={data} mutate={mutate} />}
      {section === 'dor' && <DorSection data={data} mutate={mutate} />}
      {section === 'taxes' && <TaxesSection data={data} mutate={mutate} onOpenDor={() => setSection('dor')} />}
      {section === 'company' && <CompanySection data={data} mutate={mutate} />}
      {section === 'settings' && (
        <BillingSettingsSection data={data} mutate={mutate} replaceAll={replaceAll} />
      )}
    </div>
  );
};

export default BillingTab;
