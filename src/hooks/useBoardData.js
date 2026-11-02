import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDoc,
  getDocs,
  onSnapshot,
  doc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// agent_activity is closed to browsers (older rows hold visitors' chat text);
// board-activity.js serves the source/type/timestamp the phase logic needs.
const ACTIVITY_URL = '/.netlify/functions/board-activity';
const loadActivity = () =>
  fetch(ACTIVITY_URL)
    .then((res) => (res.ok ? res.json() : { items: [] }))
    .then((data) => data.items || []);

/**
 * Board data: the `tasks` collection, the `boardState/config` owner-config
 * doc, and a recent slice of agent activity (used for epic phase
 * derivation + header counts).
 *
 * Visitors get ONE-SHOT reads — a public page must not hold realtime
 * listeners open on the free tier (the home page once blew the 50k reads/day
 * quota exactly that way; see home-summary.js). Realtime `onSnapshot` is
 * reserved for the owner (`realtime = true`), where live sync after edits
 * actually matters. Activity is a one-shot fetch either way.
 */
export default function useBoardData(realtime = false) {
  const [tasks, setTasks] = useState([]);
  const [boardState, setBoardState] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Visitors only ever query public tasks, so private docs never leave
    // Firestore in the page payload. The owner (realtime) reads everything;
    // board-admin.js has always defaulted visibility to 'public' on create,
    // so the equality filter can't drop legacy docs.
    const tasksQuery = realtime
      ? collection(db, 'tasks')
      : query(collection(db, 'tasks'), where('visibility', '==', 'public'));
    const configRef = doc(db, 'boardState', 'config');
    let cancelled = false;
    loadActivity()
      .then((items) => !cancelled && setActivity(items))
      .catch(() => {});

    const applyTasks = (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // sort client-side so docs missing `order` are not excluded
      items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setTasks(items);
      setLoading(false);
    };

    if (!realtime) {
      getDocs(tasksQuery)
        .then((snap) => !cancelled && applyTasks(snap))
        .catch(() => !cancelled && setLoading(false));
      getDoc(configRef)
        .then((snap) => !cancelled && setBoardState(snap.exists() ? snap.data() : {}))
        .catch(() => !cancelled && setBoardState({}));
      return () => {
        cancelled = true;
      };
    }

    const unsubs = [
      onSnapshot(tasksQuery, applyTasks, () => setLoading(false)),
      onSnapshot(
        configRef,
        (snap) => setBoardState(snap.exists() ? snap.data() : {}),
        () => setBoardState({})
      ),
    ];
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [realtime]);

  return { tasks, boardState: boardState || {}, activity, loading };
}
