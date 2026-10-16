import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import useHomeSummary from '../hooks/useHomeSummary';

export default function Activity({ embedded = false }) {
  const summary = useHomeSummary();
  const stats = [
    ['Logged actions', summary?.actionCount30d, 'Last 30 days'],
    ['AI usage cost', summary?.cost30d, 'Last 30 days', 'cost'],
    ['Recorded errors', summary?.errors7d, 'Last 7 days'],
  ];
  const content = <section className="consult-operations" aria-labelledby="operations-heading">
    <h2 id="operations-heading">Agent operations</h2>
    <p>Aggregate activity from the services behind this site and my products.</p>
    <div className="consult-operation-stats">{stats.map(([label, value, period, format]) => <div key={label}><span>{label}</span><strong>{Number.isFinite(value) ? (format === 'cost' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value) : value.toLocaleString()) : '—'}</strong><small>{period}</small></div>)}</div>
    {summary && !Number.isFinite(summary.actionCount30d) && <p role="status">Usage totals are temporarily unavailable.</p>}
    <p className="consult-operations-note">This view shows totals rather than individual conversations or internal logs.</p>
    <Link className="consult-text-link" to="/projects/azoni-mcp">Explore the shared agent infrastructure →</Link>
  </section>;
  return embedded ? content : <Layout><Seo title="Agent operations" path="/activity" /><div className="consult-page consult-container">{content}</div></Layout>;
}
