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
  const [flashTargets, setFlashTargets] = useState({});
  const isFirstLoadRef = useRef(true);
  const walkQueueRef = useRef({});
  const lastEventTypeRef = useRef({});

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
        const sid = mapSourceToStation(data.source, data.type) || 'tools';
        const ts = data.timestamp;
        const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
        if (ms) {
          const entry = { title: data.title || data.type, type: data.type, source: data.source, ms };
          hist.push({ stationId: sid, ms, type: data.type });
          if (!sHist[sid]) sHist[sid] = [];
          sHist[sid].push(entry);
          // Activity feed gets ALL events
          if (sid !== 'tools') {
            hist.push({ stationId: 'tools', ms, type: data.type });
            if (!sHist['tools']) sHist['tools'] = [];
            sHist['tools'].push(entry);
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
        // Docs are newest-first. Track latest receivedAt (including visits)
        // and latest non-visit event for display title.
        const latestAt = {};   // stationId → most recent timestamp
        const display = {};    // stationId → first non-visit event data
        docs.forEach(data => {
          const sid = mapSourceToStation(data.source, data.type) || 'tools';
          const ts = data.timestamp;
          const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
          const recAt = ms || Date.now();
          // Track most recent timestamp (any event type)
          if (!latestAt[sid]) latestAt[sid] = recAt;
          if (sid !== 'tools' && !latestAt['tools']) latestAt['tools'] = recAt;
          // Track first non-visit event for display
          if (data.type !== 'site_visit') {
            if (!display[sid]) display[sid] = data;
            if (sid !== 'tools' && !display['tools']) display['tools'] = data;
          }
        });
        // Merge: display data with visit-aware receivedAt
        Object.keys(latestAt).forEach(sid => {
          const d = display[sid];
          initial[sid] = d
            ? { ...d, receivedAt: latestAt[sid] }
            : { type: 'site_visit', title: 'Site visit', receivedAt: latestAt[sid] };
        });
        setStationEvents(initial);
        setTickerEvents(docs.filter(d => d.type !== 'site_visit').slice(0, 5));
        isFirstLoadRef.current = false;
        return;
      }
      // New events only
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const stationId = mapSourceToStation(data.source, data.type) || 'tools';
          lastEventTypeRef.current[stationId] = data.type;
          const ts = data.timestamp;
          const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
          const now = Date.now();
          const isVisit = data.type === 'site_visit';
          const entry = { title: data.title || data.type, type: data.type, source: data.source, ms: now };
          // Always update history (for counts)
          setActivityHistory(prev => {
            const next = [...prev, { stationId, ms: ms || now, type: data.type }];
            if (stationId !== 'tools') next.push({ stationId: 'tools', ms: ms || now, type: data.type });
            return next;
          });
          setStationHistory(prev => {
            const updated = { ...prev };
            const arr = [entry, ...(prev[stationId] || [])];
            if (arr.length > 20) arr.length = 20;
            updated[stationId] = arr;
            if (stationId !== 'tools') {
              const actArr = [entry, ...(prev['tools'] || [])];
              if (actArr.length > 20) actArr.length = 20;
              updated['tools'] = actArr;
            }
            return updated;
          });
          if (isVisit) {
            // Visits: update receivedAt (for idle level) + flash, but keep previous display title
            setStationEvents(prev => ({
              ...prev,
              [stationId]: { ...(prev[stationId] || {}), receivedAt: now },
              tools: { ...(prev['tools'] || {}), receivedAt: now },
            }));
          } else {
            // Non-visits: full update including display data + ticker
            setStationEvents(prev => ({
              ...prev,
              [stationId]: { ...data, receivedAt: now },
              tools: { ...data, receivedAt: now },
            }));
            setTickerEvents(prev => [data, ...prev].slice(0, 5));
          }
          flashStationRef.current(stationId);
          if (stationId !== 'tools') flashStationRef.current('tools');
          // Track walk targets for station-to-station walking (e.g., chatbot → app)
          if (data.metadata?.targetStation) {
            setFlashTargets(prev => ({ ...prev, [stationId]: data.metadata.targetStation }));
            setTimeout(() => {
              setFlashTargets(prev => {
                const next = { ...prev };
                delete next[stationId];
                return next;
              });
            }, 15000);
          }
          // Walk queue for sequential walks (e.g., blog visiting stations)
          if (data.type === 'blog_generated' && data.metadata?.visitedStations?.length) {
            walkQueueRef.current[stationId] = [...data.metadata.visitedStations];
          }
        }
      });
    });
    return () => unsub();
  }, []);

  // Compute counts (excluding visits) + visit counts + error counts
  const { activityCounts, errorCounts, visitCounts } = useMemo(() => {
    const now = Date.now();
    const counts = {};
    const errors = {};
    const visits = {};
    activityHistory.forEach(e => {
      if (e.type === 'site_visit') {
        if (now - e.ms < 86400000) {
          if (!visits[e.stationId]) visits[e.stationId] = 0;
          visits[e.stationId]++;
        }
      } else {
        if (!counts[e.stationId]) counts[e.stationId] = { h1: 0, h24: 0 };
        if (now - e.ms < 86400000) counts[e.stationId].h24++;
        if (now - e.ms < 3600000) counts[e.stationId].h1++;
      }
    });
    // Count errors from station history (has type info)
    Object.entries(stationHistory).forEach(([sid, events]) => {
      const errCount = events.filter(e => e.type === 'error_logged').length;
      if (errCount > 0) errors[sid] = errCount;
    });
    return { activityCounts: counts, errorCounts: errors, visitCounts: visits };
  }, [activityHistory, stationHistory]);

  return { stationEvents, tickerEvents, activityCounts, errorCounts, visitCounts, stationHistory, flashingStations, flashTargets, activityHistory, walkQueueRef, lastEventTypeRef };
}
