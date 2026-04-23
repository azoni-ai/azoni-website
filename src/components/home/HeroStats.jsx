import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PROJECT_STORIES } from '../../data/project-stories';

const HeroStats = ({ githubStats }) => {
  const [agentCount24h, setAgentCount24h] = useState(null);

  useEffect(() => {
    const since = Timestamp.fromDate(new Date(Date.now() - 86_400_000));
    const q = query(
      collection(db, 'agent_activity'),
      where('timestamp', '>=', since)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setAgentCount24h(snap.size),
      (err) => console.error('hero stats agent count failed', err)
    );
    return () => unsub();
  }, []);

  const stats = [
    {
      value: String(PROJECT_STORIES.length),
      label: 'projects shipped',
    },
    {
      value: githubStats?.last7Days != null ? String(githubStats.last7Days) : '—',
      label: 'commits · this week',
    },
    {
      value: agentCount24h != null ? String(agentCount24h) : '—',
      label: 'agent actions · 24h',
    },
  ];

  return (
    <dl className="hero-stats" aria-label="Live stats">
      {stats.map((s, i) => (
        <div key={i} className="hero-stats-item">
          <dt className="hero-stats-label">{s.label}</dt>
          <dd className="hero-stats-value">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default HeroStats;
