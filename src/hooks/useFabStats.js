import { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getCountFromServer, getAggregateFromServer, sum } from 'firebase/firestore';

// FabStats Firebase config (public — embedded in client bundle)
const FABSTATS_CONFIG = {
  apiKey: "AIzaSyAT1dymWqysGaLip6dL8m0F6UDfqnIpoS8",
  authDomain: "fab-stats-fc757.firebaseapp.com",
  projectId: "fab-stats-fc757",
  storageBucket: "fab-stats-fc757.firebasestorage.app",
  messagingSenderId: "769863611057",
  appId: "1:769863611057:web:a1908af50e8e149b22e890",
};

let fabDb = null;
try {
  const existing = getApps().find(a => a.name === 'fabstats');
  const fabApp = existing || initializeApp(FABSTATS_CONFIG, 'fabstats');
  fabDb = getFirestore(fabApp);
} catch {
  // silently fail if Firebase init fails
}

export function useFabStats() {
  const [users, setUsers] = useState(0);
  const [matches, setMatches] = useState(0);

  useEffect(() => {
    if (!fabDb) return;

    const fetchStats = async () => {
      try {
        const [userSnap, matchSnap] = await Promise.all([
          getCountFromServer(collection(fabDb, 'usernames')),
          getAggregateFromServer(collection(fabDb, 'leaderboard'), { total: sum('totalMatches') }),
        ]);
        setUsers(userSnap.data().count);
        setMatches(matchSnap.data().total);
      } catch (err) {
        console.error('FabStats fetch error:', err);
      }
    };

    fetchStats();
  }, []);

  return { users, matches };
}
