import React, { useEffect, useRef, useState } from 'react';
import { downloadFile, fmtDate, invoiceNumber, todayISO, validBackup } from './billing-lib';

const flatten = (s) => ({
  fromName: s.from?.name || '',
  fromEmail: s.from?.email || '',
  fromPhone: s.from?.phone || '',
  fromAddress: s.from?.address || '',
  toName: s.billTo?.name || '',
  toEmail: s.billTo?.email || '',
  toPo: s.billTo?.poNumber || '',
  toAddress: s.billTo?.address || '',
  rate: s.rate ?? 0,
  netDays: s.netDays ?? 15,
  prefix: s.invoicePrefix || '',
  nextNumber: s.nextNumber ?? 1,
  taxLabel: s.taxLabel || '',
  taxRate: s.taxRate ?? 0,
  paymentNote: s.paymentNote || '',
});

const BillingSettingsSection = ({ data, mutate, replaceAll }) => {
  const [form, setForm] = useState(() => flatten(data.settings));
  const [formDirty, setFormDirty] = useState(false);
  const fileRef = useRef(null);

  // If the underlying settings change while the form is untouched (conflict
  // reload, backup import), refresh the form from them.
  useEffect(() => {
    if (!formDirty) setForm(flatten(data.settings));
  }, [data.settings, formDirty]);

  const set = (k) => (e) => {
    setFormDirty(true);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const save = (e) => {
    e.preventDefault();
    mutate((d) => ({
      ...d,
      settings: {
        ...d.settings,
        from: {
          name: form.fromName.trim(),
          email: form.fromEmail.trim(),
          phone: form.fromPhone.trim(),
          address: form.fromAddress.trim(),
        },
        billTo: {
          name: form.toName.trim(),
          email: form.toEmail.trim(),
          poNumber: form.toPo.trim(),
          address: form.toAddress.trim(),
        },
        rate: Number(form.rate) || 0,
        netDays: Math.max(0, Math.round(Number(form.netDays) || 0)),
        invoicePrefix: form.prefix,
        nextNumber: Math.max(1, Math.round(Number(form.nextNumber) || 1)),
        taxLabel: form.taxLabel.trim() || 'Sales tax',
        taxRate: Number(form.taxRate) || 0,
        paymentNote: form.paymentNote.trim(),
      },
    }));
    setFormDirty(false);
  };

  const exportBackup = () => {
    const today = todayISO();
    const snapshot = {
      settings: { ...data.settings, lastBackup: today },
      entries: data.entries,
      invoices: data.invoices,
    };
    mutate((d) => ({ ...d, settings: { ...d.settings, lastBackup: today } }));
    downloadFile(`azoni-billing-backup-${today}.json`, JSON.stringify(snapshot, null, 2));
  };

  const importBackup = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!validBackup(parsed)) throw new Error('bad shape');
        if (!window.confirm(
          'Replace ALL billing data on the server with this backup? Export a backup of the current data first if unsure.'
        )) return;
        replaceAll({ settings: parsed.settings, entries: parsed.entries, invoices: parsed.invoices });
        setFormDirty(false);
      } catch {
        window.alert('That file does not look like a billing backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <form onSubmit={save}>
        <div className="billing-card">
          <h3>Your business</h3>
          <div className="billing-frow">
            <label className="billing-fld grow">
              <span>Business name</span>
              <input type="text" value={form.fromName} onChange={set('fromName')} />
            </label>
            <label className="billing-fld grow">
              <span>Email</span>
              <input type="email" value={form.fromEmail} onChange={set('fromEmail')} />
            </label>
            <label className="billing-fld">
              <span>Phone</span>
              <input type="text" value={form.fromPhone} onChange={set('fromPhone')} />
            </label>
          </div>
          <label className="billing-fld full">
            <span>Business address (shown on invoices)</span>
            <textarea rows="2" value={form.fromAddress} onChange={set('fromAddress')} />
          </label>
        </div>

        <div className="billing-card">
          <h3>Bill to</h3>
          <div className="billing-frow">
            <label className="billing-fld grow">
              <span>Client name</span>
              <input type="text" value={form.toName} onChange={set('toName')} />
            </label>
            <label className="billing-fld grow">
              <span>Accounts payable email</span>
              <input type="email" value={form.toEmail} onChange={set('toEmail')} />
            </label>
            <label className="billing-fld">
              <span>PO / vendor number</span>
              <input type="text" value={form.toPo} onChange={set('toPo')} />
            </label>
          </div>
          <label className="billing-fld full">
            <span>Client address</span>
            <textarea rows="2" value={form.toAddress} onChange={set('toAddress')} />
          </label>
        </div>

        <div className="billing-card">
          <h3>Billing</h3>
          <div className="billing-frow">
            <label className="billing-fld">
              <span>Hourly rate ($)</span>
              <input type="number" step="0.01" min="0" value={form.rate} onChange={set('rate')} />
            </label>
            <label className="billing-fld">
              <span>Net terms (days)</span>
              <input type="number" step="1" min="0" value={form.netDays} onChange={set('netDays')} />
            </label>
            <label className="billing-fld">
              <span>Invoice prefix</span>
              <input type="text" value={form.prefix} onChange={set('prefix')} />
            </label>
            <label className="billing-fld">
              <span>Next number</span>
              <input type="number" step="1" min="1" value={form.nextNumber} onChange={set('nextNumber')} />
            </label>
          </div>
          <p className="billing-hint">
            Next invoice will be {invoiceNumber(data.settings)}. Update the prefix at the start of
            each year.
          </p>
        </div>

        <div className="billing-card">
          <h3>Sales tax</h3>
          <div className="billing-frow">
            <label className="billing-fld grow">
              <span>Tax label</span>
              <input type="text" value={form.taxLabel} onChange={set('taxLabel')} />
            </label>
            <label className="billing-fld">
              <span>Rate (%)</span>
              <input type="number" step="0.01" min="0" value={form.taxRate} onChange={set('taxRate')} />
            </label>
          </div>
          <p className="billing-hint">
            Verify the rate for the customer's receiving address with the{' '}
            <a
              href="https://dor.wa.gov/taxes-rates/sales-use-tax-rates"
              target="_blank"
              rel="noopener noreferrer"
            >
              WA DOR rate lookup
            </a>{' '}
            before invoicing.
          </p>
        </div>

        <div className="billing-card">
          <h3>Payment note (printed on every invoice)</h3>
          <label className="billing-fld full">
            <textarea rows="2" value={form.paymentNote} onChange={set('paymentNote')} />
          </label>
          <p className="billing-hint">
            Do not put full bank account details here once the client has them on file.
          </p>
        </div>

        <div className="billing-card">
          <div className="billing-actions">
            <button className="billing-btn primary" type="submit">Save settings</button>
            {formDirty && <span className="billing-hint">Settings form has unapplied edits.</span>}
          </div>
        </div>
      </form>

      <div className="billing-card">
        <h3>Data</h3>
        <div className="billing-actions">
          <button className="billing-btn" onClick={exportBackup}>Download backup (JSON)</button>
          <button className="billing-btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files[0]) importBackup(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </div>
        <p className="billing-hint">
          Data lives in a private Firestore document, readable only through the authenticated
          admin endpoint. Backups use the same JSON format as the desktop app, so either can
          import the other's export. Last backup downloaded:{' '}
          {data.settings.lastBackup ? fmtDate(data.settings.lastBackup) : 'never'}.
        </p>
      </div>
    </>
  );
};

export default BillingSettingsSection;
