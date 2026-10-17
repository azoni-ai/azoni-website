import React, { useMemo } from 'react';
import { ArrowRight, ArrowUpRight, Clock3, FileText, Receipt, PanelsTopLeft } from 'lucide-react';
import { fmtDate, money } from './billing-lib';
import { buildBusinessOverview } from './business-overview-lib';
import '../../styles/business-overview.css';

const QUICK_ACTIONS = [
  { label: 'Log work', section: 'calendar', icon: Clock3 },
  { label: 'Invoices', section: 'invoices', icon: FileText },
  { label: 'Add an expense', section: 'expenses', icon: Receipt },
  { label: 'Accounts', section: 'accounts', icon: PanelsTopLeft },
];

export default function BusinessOverview({ data, onNavigate }) {
  const overview = useMemo(() => buildBusinessOverview(data), [data]);
  const { metrics, nextActions, accounts, dor } = overview;
  const tiles = [
    { label: 'Unbilled work', ...metrics.unbilled },
    { label: 'Awaiting payment', ...metrics.awaiting },
    { label: `Paid in ${metrics.paid.year}`, ...metrics.paid },
  ];
  const showDorSummary = !nextActions.some((action) => action.section === 'dor');
  return <section className="business-overview" aria-labelledby="business-overview-title">
    <header className="business-overview-heading">
      <div><p className="business-overview-eyebrow">Your business</p><h2 id="business-overview-title">Overview</h2></div>
      <time dateTime={overview.today}>{fmtDate(overview.today)}</time>
    </header>

    <div className="business-overview-money">
      {tiles.map((tile) => <button type="button" key={tile.label} className="business-overview-tile" onClick={() => onNavigate(tile.section)}>
        <span className="business-overview-tile-label">{tile.label}<ArrowUpRight size={15} aria-hidden="true" /></span>
        <strong>{Number.isFinite(tile.amount) ? money(tile.amount) : '—'}</strong>
        <span className="business-overview-tile-detail">{tile.detail}</span>
      </button>)}
    </div>

    <nav className="business-overview-quick" aria-label="Business quick actions">
      {QUICK_ACTIONS.map(({ label, section, icon: Icon }) => <button type="button" key={section} onClick={() => onNavigate(section)}><Icon size={18} aria-hidden="true" /><span>{label}</span><ArrowRight className="business-overview-quick-arrow" size={15} aria-hidden="true" /></button>)}
    </nav>

    <div className="business-overview-columns">
      <section className="business-overview-panel" aria-labelledby="business-next-title">
        <div className="business-overview-panel-heading"><h3 id="business-next-title">Next up</h3><span>From your saved records</span></div>
        <div className="business-overview-next">
          {nextActions.map((action, index) => <article key={action.id} className={`business-overview-action ${index === 0 ? 'is-primary' : ''} ${action.tone === 'attention' ? 'needs-attention' : ''}`}>
            <div><h4>{action.title}</h4><p>{action.detail}</p>{action.deadline && <p className="business-overview-deadline">{action.deadline}</p>}{action.scope && <p className="business-overview-scope">{action.scope}</p>}</div>
            <button type="button" className={index === 0 ? 'billing-btn primary' : 'business-overview-text-link'} onClick={() => onNavigate(action.section)}>{action.button}<ArrowRight size={15} aria-hidden="true" /></button>
          </article>)}
        </div>
        {showDorSummary && dor.configured && <div className="business-overview-dor-summary"><span>WA DOR · {dor.periodLabel}</span><p>{dor.summary}</p><p className="business-overview-scope">{dor.scope}</p><button type="button" className="business-overview-text-link" onClick={() => onNavigate('dor')}>Open WA DOR<ArrowRight size={15} aria-hidden="true" /></button></div>}
      </section>

      <section className="business-overview-panel" aria-labelledby="business-accounts-title">
        <div className="business-overview-panel-heading"><h3 id="business-accounts-title">Pinned accounts</h3><button type="button" className="business-overview-text-link" onClick={() => onNavigate('accounts')}>Manage<ArrowRight size={14} aria-hidden="true" /></button></div>
        {accounts.pinned.length ? <div className="business-overview-accounts">{accounts.pinned.map((account, index) => <article className="business-overview-account" key={account.id || index}>
          <div className="business-overview-account-title"><h4>{account.name}</h4>{account.href ? <a href={account.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${account.name} in a new tab`}><ArrowUpRight size={18} aria-hidden="true" /></a> : <button type="button" onClick={() => onNavigate('accounts')} aria-label={`Edit ${account.name} website`}><ArrowRight size={18} aria-hidden="true" /></button>}</div>
          <p className="business-overview-account-url">{account.displayUrl}</p>
          <div className="business-overview-username"><span>Username</span><code>{account.username || 'Not added'}</code></div>
        </article>)}</div> : <p className="business-overview-empty">Pin the accounts you use most for quick access here.</p>}
        <button type="button" className="business-overview-text-link business-overview-account-edit" onClick={() => onNavigate('accounts')}>{accounts.needsUsernames ? 'Add your usernames' : accounts.pinned.length ? 'View all accounts' : 'Choose pinned accounts'}<ArrowRight size={15} aria-hidden="true" /></button>
      </section>
    </div>
  </section>;
}
