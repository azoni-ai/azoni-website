import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Realtime board data: the `tasks` collection, the `boardState/config`
 * owner-config doc, and a recent slice of `agent_activity` (used for epic
 * phase derivation + header counts). Mirrors the onSnapshot pattern in
 * Activity.jsx / Comments.jsx.
 */
export default function useBoardData() {
  const [tasks, setTasks] = useState([]);
  const [boardState, setBoardState] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [];

    // tasks — sort client-side so docs missing `order` are not excluded
    unsubs.push(
      onSnapshot(
        collection(db, 'tasks'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setTasks(items);
          setLoading(false);
        },
        () => setLoading(false)
      )
    );

    // owner board config (phase overrides, epic order, hidden projects)
    unsubs.push(
      onSnapshot(
        doc(db, 'boardState', 'config'),
        (snap) => setBoardState(snap.exists() ? snap.data() : {}),
        () => setBoardState({})
      )
    );

    // recent activity for phase derivation + header counts
    unsubs.push(
      onSnapshot(
        query(collection(db, 'agent_activity'), orderBy('timestamp', 'desc'), limit(150)),
        (snap) => setActivity(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {}
      )
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  return { tasks, boardState: boardState || {}, activity, loading };
}
