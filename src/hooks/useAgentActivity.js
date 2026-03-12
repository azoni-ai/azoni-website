import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { mapSourceToStation } from '../utils/station-mapping';

export function useAgentActivity() {
  const [stationEvents, setStationEvents] = useState({});
  const [tickerEvents, setTickerEvents] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);
  const [stationHistory, setStationHistory] = useState({});
  const [flashingStations, setFlashingStations] = useState({});
  const isFirstLoadRef = useRef(true);

  // Flash a station when a new event arrives
  const flashStation = useCallback((stationId) => {
    setFlashingStations(prev => ({ ...prev, [stationId]: Date.now() }));
    setTimeout(() => {
      setFlashingStations(prev => {
        const next = { ...prev };
        delete next[stationId];
        return next;
      });
    }, 8000);
  }, []);

  // Stable ref for flashStation to avoid re-subscribing Firebase listener
  const flashStationRef = useRef(flashStation);
  flashStationRef.current = flashStation;

  // Fetch 24h activity history (one-time)
  useEffect(() => {
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 86400000));
    getDocs(query(
      collection(db, 'agent_activity'),
      where('timestamp', '>=', cutoff),
      orderBy('timestamp', 'desc'),
      limit(500)
    )).then(snap => {
      const hist = [];
      const sHist = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        const sid = mapSourceToStation(data.source, data.type) || 'activity';
        const ts = data.timestamp;
        const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
        if (ms) {
          const entry = { title: data.title || data.type, type: data.type, source: data.source, ms };
          hist.push({ stationId: sid, ms });
          if (!sHist[sid]) sHist[sid] = [];
          sHist[sid].push(entry);
          // Activity feed gets ALL events
          if (sid !== 'activity') {
            hist.push({ stationId: 'activity', ms });
            if (!sHist['activity']) sHist['activity'] = [];
            sHist['activity'].push(entry);
          }
        }
      });
      // Sort and cap
      Object.values(sHist).forEach(arr => {
        arr.sort((a, b) => b.ms - a.ms);
        if (arr.length > 20) arr.length = 20;
      });
      setActivityHistory(hist);
      setStationHistory(sHist);
    }).catch(() => {});
  }, []);

  // Firebase real-time listener
  useEffect(() => {
    const q = query(
      collection(db, 'agent_activity'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (isFirstLoadRef.current) {
        const docs = snapshot.docs.map(d => d.data());
        const initial = {};
        docs.forEach(data => {
          const sid = mapSourceToStation(data.source, data.type) || 'activity';
          const ts = data.timestamp;
          const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
          if (!initial[sid]) {
            initial[sid] = { ...data, receivedAt: ms || Date.now() };
          }
          // Activity feed always gets the latest event
          if (sid !== 'activity' && !initial['activity']) {
            initial['activity'] = { ...data, receivedAt: ms || Date.now() };
          }
        });
        setStationEvents(initial);
        setTickerEvents(docs.slice(0, 5));
        isFirstLoadRef.current = false;
        return;
      }
      // New events only
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const stationId = mapSourceToStation(data.source, data.type) || 'activity';
          const ts = data.timestamp;
          const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
          const now = Date.now();
          const entry = { title: data.title || data.type, type: data.type, source: data.source, ms: now };
          // Update the mapped station
          setActivityHistory(prev => {
            const next = [...prev, { stationId, ms: ms || now }];
            if (stationId !== 'activity') next.push({ stationId: 'activity', ms: ms || now });
            return next;
          });
          setStationHistory(prev => {
            const updated = { ...prev };
            const arr = [entry, ...(prev[stationId] || [])];
            if (arr.length > 20) arr.length = 20;
            updated[stationId] = arr;
            // Activity feed gets all events
            if (stationId !== 'activity') {
              const actArr = [entry, ...(prev['activity'] || [])];
              if (actArr.length > 20) actArr.length = 20;
              updated['activity'] = actArr;
            }
            return updated;
          });
          setStationEvents(prev => ({
            ...prev,
            [stationId]: { ...data, receivedAt: now },
            activity: { ...data, receivedAt: now },
          }));
          setTickerEvents(prev => [data, ...prev].slice(0, 5));
          flashStationRef.current(stationId);
          if (stationId !== 'activity') flashStationRef.current('activity');
        }
      });
    });
    return () => unsub();
  }, []);

  // Compute counts + error counts from activity history
  const { activityCounts, errorCounts } = useMemo(() => {
    const now = Date.now();
    const counts = {};
    const errors = {};
    activityHistory.forEach(e => {
      if (!counts[e.stationId]) counts[e.stationId] = { h1: 0, h24: 0 };
      if (now - e.ms < 86400000) counts[e.stationId].h24++;
      if (now - e.ms < 3600000) counts[e.stationId].h1++;
    });
    // Count errors from station history (has type info)
    Object.entries(stationHistory).forEach(([sid, events]) => {
      const errCount = events.filter(e => e.type === 'error_logged').length;
      if (errCount > 0) errors[sid] = errCount;
    });
    return { activityCounts: counts, errorCounts: errors };
  }, [activityHistory, stationHistory]);

  return { stationEvents, tickerEvents, activityCounts, errorCounts, stationHistory, flashingStations, activityHistory };
}
