import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Copy, Pencil, Pin, Plus, Search, Trash2 } from 'lucide-react';
import { uid } from './billing-lib';
import {
  BUSINESS_ACCOUNT_CATEGORIES, MAX_BUSINESS_ACCOUNTS, SEED_BUSINESS_ACCOUNTS,
  safeAccountUrl, validateBusinessAccount,
} from './business-accounts-lib';
import '../../styles/business-accounts.css';

const SUGGESTIONS = [
  ...SEED_BUSINESS_ACCOUNTS,
  { name: 'WA Secretary of State', url: 'https://ccfs.sos.wa.gov/', category: 'operations' },
  { name: 'IRS individual tax account', url: 'https://www.irs.gov/payments/online-account-for-individuals', category: 'taxes' },
  { name: 'Kent TaxFile (B&O)', url: 'https://taxfile.kentwa.gov/', category: 'taxes' },
  { name: 'GitHub', url: 'https://github.com/login', category: 'software' },
  { name: 'Netlify', url: 'https://app.netlify.com/', category: 'software' },
];
const EMPTY_ACCOUNTS = [];
const categoryLabel = (key) => BUSINESS_ACCOUNT_CATEGORIES.find((category) => category.key === key)?.label || 'Other';
const blankAccount = () => ({ id: uid(), name: '', url: '', username: '', category: 'other', notes: '', pinned: false });

function AccountCard({ account, onEdit, onDelete, onPin, onNavigate }) {
  const [copyStatus, setCopyStatus] = useState('');
  const usernameRef = useRef(null);
  const url = safeAccountUrl(account.url);
  useEffect(() => { setCopyStatus(''); }, [account.username]);
  const copyUsername = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(account.username);
      setCopyStatus('Username copied.');
    } catch {
      usernameRef.current?.focus();
      usernameRef.current?.select();
      setCopyStatus('Username selected. Use your device\u2019s Copy action.');
    }
  };
  return <article className="business-account-card billing-card">
    <div className="business-account-card-head"><div><span className="business-account-category">{categoryLabel(account.category)}</span><h4>{account.name}</h4></div><button type="button" className={`business-account-pin${account.pinned ? ' is-pinned' : ''}`} aria-label={`${account.pinned ? 'Unpin' : 'Pin'} ${account.name}`} aria-pressed={account.pinned} onClick={onPin}><Pin size={17} aria-hidden="true" /></button></div>
    {url ? <a href={url} className="business-account-open" target="_blank" rel="noopener noreferrer"><span><strong>Open account</strong><small>{new URL(url).hostname}</small></span><ArrowUpRight size={19} aria-hidden="true" /></a> : <p className="business-account-invalid">Add a valid HTTPS link to open this account.</p>}
    <div className="business-account-username"><span className="business-account-field-label">Username</span>{account.username ? <div className="business-account-copy-row"><input ref={usernameRef} aria-label={`${account.name} username`} value={account.username} readOnly autoComplete="off" spellCheck={false} onFocus={(event) => event.target.select()} /><button type="button" className="billing-btn small" onClick={copyUsername} aria-label={`Copy ${account.name} username`}><Copy size={14} aria-hidden="true" /> Copy</button></div> : <button type="button" className="billing-linkish business-account-add-username" onClick={onEdit}>Add username</button>}<p className="business-account-copy-status" role="status">{copyStatus}</p></div>
    {account.notes && <p className="business-account-notes">{account.notes}</p>}
    <div className="business-account-card-actions"><button type="button" className="billing-linkish" onClick={onEdit}><Pencil size={14} aria-hidden="true" /> Edit</button>{account.id === 'my-dor' && onNavigate && <button type="button" className="billing-linkish" onClick={() => onNavigate('dor')}>Prepare DOR return</button>}<button type="button" className="billing-linkish danger" onClick={onDelete} aria-label={`Delete ${account.name}`}><Trash2 size={14} aria-hidden="true" /> Delete</button></div>
  </article>;
}

export default function BusinessAccountsSection({ data, mutate, onNavigate }) {
  const accounts = Array.isArray(data.businessAccounts) ? data.businessAccounts : EMPTY_ACCOUNTS;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const nameRef = useRef(null);
  const draftId = draft?.id;
  useEffect(() => { if (draftId) nameRef.current?.focus(); }, [draftId]);
  const visible = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return accounts.filter((account) => (category === 'all' || account.category === category)
      && (!pinnedOnly || account.pinned)
      && (!search || [account.name, account.username, account.url, account.notes, categoryLabel(account.category)].some((value) => String(value || '').toLocaleLowerCase().includes(search))))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name));
  }, [accounts, query, category, pinnedOnly]);
  const suggestions = SUGGESTIONS.filter((template) => !accounts.some((account) => safeAccountUrl(account.url) === template.url));
  const closeEditor = () => { setDraft(null); setEditingId(null); setErrors([]); };
  const openNew = (template) => {
    const account = blankAccount();
    if (template) Object.assign(account, { name: template.name, url: template.url, category: template.category });
    if (template?.id && !accounts.some((saved) => saved.id === template.id)) account.id = template.id;
    setEditingId(null); setDraft(account); setErrors([]); setNotice('');
  };
  const openEdit = (account) => { setDraft({ ...account }); setEditingId(account.id); setErrors([]); setNotice(''); };
  const change = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const save = (event) => {
    event.preventDefault();
    const result = validateBusinessAccount(draft);
    if (result.errors.length) { setErrors(result.errors); return; }
    let conflict = '';
    mutate((current) => {
      const saved = current.businessAccounts || [];
      if (editingId) {
        if (!saved.some((account) => account.id === editingId)) { conflict = 'This account was removed. Close the editor and add it again if needed.'; return current; }
        if (saved.some((account) => account.id !== editingId && account.id === result.account.id)) { conflict = 'Another account has the same ID. Close the editor and try again.'; return current; }
        return { ...current, businessAccounts: saved.map((account) => account.id === editingId ? result.account : account) };
      }
      if (saved.length >= MAX_BUSINESS_ACCOUNTS) { conflict = 'The directory has reached its 100-account limit.'; return current; }
      if (saved.some((account) => account.id === result.account.id)) { conflict = 'This account was already added. Close the editor to view it.'; return current; }
      return { ...current, businessAccounts: [...saved, result.account] };
    });
    if (conflict) { setErrors([conflict]); return; }
    closeEditor(); setNotice(editingId ? 'Account updated.' : 'Account added.');
  };
  const remove = (account) => {
    if (!window.confirm(`Remove ${account.name} from your business accounts? This only removes this saved link; it does not close the account with the provider.`)) return;
    mutate((current) => ({ ...current, businessAccounts: (current.businessAccounts || []).filter((item) => item.id !== account.id) }));
    if (editingId === account.id) closeEditor();
    setNotice('Account removed from the directory.');
  };
  const togglePin = (account) => mutate((current) => ({ ...current, businessAccounts: (current.businessAccounts || []).map((item) => item.id === account.id ? { ...item, pinned: !item.pinned } : item) }));

  return <section className="business-accounts" aria-labelledby="business-accounts-heading">
    <div className="business-accounts-header"><div><h3 id="business-accounts-heading">Business accounts</h3><p>Store usernames here; keep passwords in your password manager.</p></div><button type="button" className="billing-btn primary" onClick={() => openNew()} disabled={accounts.length >= MAX_BUSINESS_ACCOUNTS}><Plus size={16} aria-hidden="true" /> Add account</button></div>
    {notice && <p className="business-accounts-notice" role="status">{notice}</p>}
    {accounts.length >= MAX_BUSINESS_ACCOUNTS && <p className="billing-hint">100-account limit reached. Remove an unused link before adding another.</p>}
    {draft && <form className="business-account-editor billing-card" onSubmit={save} aria-labelledby="business-account-editor-heading"><div className="billing-card-head"><h4 id="business-account-editor-heading">{editingId ? 'Edit account' : 'Add account'}</h4><button type="button" className="billing-btn small" onClick={closeEditor}>Cancel</button></div><div className="business-account-form-grid"><label className="billing-fld"><span>Account name</span><input ref={nameRef} required maxLength={120} value={draft.name} onChange={change('name')} autoComplete="off" /></label><label className="billing-fld"><span>Category</span><select value={draft.category} onChange={change('category')}>{BUSINESS_ACCOUNT_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label className="billing-fld business-account-full"><span>Login or account URL</span><input type="url" required maxLength={2048} placeholder="https://example.com/login" value={draft.url} onChange={change('url')} autoComplete="off" spellCheck={false} /></label><label className="billing-fld business-account-full"><span>Username (optional)</span><input maxLength={200} value={draft.username} onChange={change('username')} autoComplete="off" spellCheck={false} /></label><label className="billing-fld business-account-full"><span>Notes (optional)</span><textarea rows={3} maxLength={2000} value={draft.notes} onChange={change('notes')} /></label></div><label className="billing-check"><input type="checkbox" checked={draft.pinned} onChange={change('pinned')} />Pin this account</label>{errors.length > 0 && <ul className="business-account-errors" role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}<button type="submit" className="billing-btn primary">{editingId ? 'Save account' : 'Add account'}</button></form>}
    <div className="business-account-filters"><label className="business-account-search"><Search size={17} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search business accounts" placeholder="Search accounts" autoComplete="off" /></label><label className="billing-fld"><span className="business-account-visually-hidden">Filter by category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{BUSINESS_ACCOUNT_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label className="billing-check business-account-pinned-filter"><input type="checkbox" checked={pinnedOnly} onChange={(event) => setPinnedOnly(event.target.checked)} />Pinned only</label></div>
    <p className="business-account-result-count">{visible.length} of {accounts.length} account{accounts.length === 1 ? '' : 's'}{!pinnedOnly && accounts.some((account) => account.pinned) ? ' / Pinned first' : ''}</p>
    {visible.length ? <div className="business-account-grid">{visible.map((account) => <AccountCard key={account.id} account={account} onEdit={() => openEdit(account)} onDelete={() => remove(account)} onPin={() => togglePin(account)} onNavigate={onNavigate} />)}</div> : <div className="business-account-empty"><p>{accounts.length ? 'No accounts match these filters.' : 'Add the accounts you use to run your business.'}</p>{accounts.length > 0 && <button type="button" className="billing-btn small" onClick={() => { setQuery(''); setCategory('all'); setPinnedOnly(false); }}>Clear filters</button>}</div>}
    {suggestions.length > 0 && accounts.length < MAX_BUSINESS_ACCOUNTS && <aside className="business-account-suggestions"><h4>Suggested links</h4><p>Add a link if you use it.</p><div>{suggestions.map((template) => <button type="button" key={template.url} className="billing-btn small" onClick={() => openNew(template)}><Plus size={14} aria-hidden="true" /> {template.name}</button>)}</div></aside>}
  </section>;
}
