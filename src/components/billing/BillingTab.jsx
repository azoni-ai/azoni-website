import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getBilling, saveBilling } from '../../utils/billingApi';
import { computeStats, defaultData, hoursFmt, moneyWhole } from './billing-lib';
import TimeLogSection from './TimeLogSection';
import InvoicesSection from './InvoicesSection';
import BillingSettingsSection from './BillingSettingsSection';
import '../../styles/billing-warm.css';

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
  const [section, setSection] = useState('time');

  const revRef = useRef(0);
  const dataRef = useRef(null);
  const timerRef = useRef(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const dirtyRef = useRef(false);

  const load = useCallback(async () => {
    // Reloading discards local changes, so drop any pending debounced save —
    // otherwise it fires after the reload and re-saves or re-conflicts.
    clearTimeout(timerRef.current);
    pendingRef.current = false;
    setStatus('loading');
    setLoadError('');
    try {
      const res = await getBilling();
      const d = res.data || defaultData();
      revRef.current = res.rev || 0;
      dataRef.current = d;
      dirtyRef.current = false;
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
      savingRef.current = false;
      if (pendingRef.current || dataRef.current !== snapshot) {
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
      if (e.status === 409) setSaveState('conflict');
      else if (e.status === 401) setSaveState('auth');
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
      setSaveState('dirty');
      scheduleSave();
    },
    [scheduleSave]
  );

  // Backup import: replace everything and save right away.
  const replaceAll = useCallback(
    (next) => {
      clearTimeout(timerRef.current);
      dataRef.current = next;
      dirtyRef.current = true;
      setData(next);
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

  return (
    <div className="billing-root">
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
          <div className="bt-sub">from paid invoices, owed to DOR</div>
        </div>
      </div>

      <div className="billing-bar">
        <div className="billing-subtabs">
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

      {section === 'time' && <TimeLogSection data={data} mutate={mutate} />}
      {section === 'invoices' && <InvoicesSection data={data} mutate={mutate} />}
      {section === 'settings' && (
        <BillingSettingsSection data={data} mutate={mutate} replaceAll={replaceAll} />
      )}
    </div>
  );
};

export default BillingTab;
