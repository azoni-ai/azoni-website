import React from 'react';
import { timeAgo } from '../../utils/boardStatus';

const fmtCost = (v) => (v == null ? null : v >= 10 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`);

export default function HubTotalsBar({ totals, updatedAt }) {
  if (!totals) return null;
  const updatedMs = updatedAt ? new Date(updatedAt).getTime() : null;
  const items = [
    { label: 'sites', value: totals.sites },
    { label: 'posts this week', value: totals.posts7d },
    {
      label: 'stale channels',
      value: totals.staleChannels,
      tone: totals.staleChannels > 0 ? 'warn' : 'good',
    },
    { label: 'open tasks', value: totals.openTasks },
    { label: 'AI spend 30d', value: fmtCost(totals.cost30d) },
  ].filter((i) => i.value != null);

  return (
    <div className="hub-totals" role="list">
      {items.map((i) => (
        <div key={i.label} className={`hub-total${i.tone ? ` is-${i.tone}` : ''}`} role="listitem">
          <span className="hub-total-value">{i.value}</span>
          <span className="hub-total-label">{i.label}</span>
        </div>
      ))}
      {updatedMs && (
        <span className="hub-updated" title={new Date(updatedMs).toLocaleString()}>
          updated {timeAgo(updatedMs)} ago
        </span>
      )}
    </div>
  );
}
