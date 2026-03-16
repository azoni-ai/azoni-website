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
      limit(1000)
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
          const histEntry = { stationId: sid, ms, type: data.type };
          if (data.type === 'page_view_summary') histEntry.title = data.title;
          hist.push(histEntry);
          if (!sHist[sid]) sHist[sid] = [];
          sHist[sid].push(entry);
          // Activity feed gets ALL events
          if (sid !== 'activity') {
            hist.push({ stationId: 'activity', ms, type: data.type });
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
        // Docs are newest-first. Track latest receivedAt (including visits)
        // and latest non-visit event for display title.
        const latestAt = {};   // stationId → most recent timestamp
        const display = {};    // stationId → first non-visit event data
        docs.forEach(data => {
          const sid = mapSourceToStation(data.source, data.type) || 'activity';
          const ts = data.timestamp;
          const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
          const recAt = ms || Date.now();
          // Track most recent timestamp (any event type)
          if (!latestAt[sid]) latestAt[sid] = recAt;
          if (sid !== 'activity' && !latestAt['activity']) latestAt['activity'] = recAt;
          // Track first non-visit event for display
          if (data.type !== 'site_visit') {
            if (!display[sid]) display[sid] = data;
            if (sid !== 'activity' && !display['activity']) display['activity'] = data;
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
        setTickerEvents(docs.filter(d => d.type !== 'site_visit' && d.type !== 'page_view_summary').slice(0, 5));
        isFirstLoadRef.current = false;
        return;
      }
      // New events only
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const stationId = mapSourceToStation(data.source, data.type) || 'activity';
          lastEventTypeRef.current[stationId] = data.type;
          const ts = data.timestamp;
          const ms = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0;
          const now = Date.now();
          const isVisit = data.type === 'site_visit' || data.type === 'page_view_summary';
          const entry = { title: data.title || data.type, type: data.type, source: data.source, ms: now };
          // Always update history (for counts)
          setActivityHistory(prev => {
            const histEntry = { stationId, ms: ms || now, type: data.type };
            if (data.type === 'page_view_summary') histEntry.title = data.title;
            const next = [...prev, histEntry];
            if (stationId !== 'activity') next.push({ stationId: 'activity', ms: ms || now, type: data.type });
            return next;
          });
          setStationHistory(prev => {
            const updated = { ...prev };
            const arr = [entry, ...(prev[stationId] || [])];
            if (arr.length > 20) arr.length = 20;
            updated[stationId] = arr;
            if (stationId !== 'activity') {
              const actArr = [entry, ...(prev['activity'] || [])];
              if (actArr.length > 20) actArr.length = 20;
              updated['activity'] = actArr;
            }
            return updated;
          });
          if (isVisit) {
            // Visits: update receivedAt (for idle level) + flash, but keep previous display title
            setStationEvents(prev => ({
              ...prev,
              [stationId]: { ...(prev[stationId] || {}), receivedAt: now },
              activity: { ...(prev['activity'] || {}), receivedAt: now },
            }));
          } else {
            // Non-visits: full update including display data + ticker
            setStationEvents(prev => ({
              ...prev,
              [stationId]: { ...data, receivedAt: now },
              activity: { ...data, receivedAt: now },
            }));
            setTickerEvents(prev => [data, ...prev].slice(0, 5));
          }
          flashStationRef.current(stationId);
          if (stationId !== 'activity') flashStationRef.current('activity');
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
  const { activityCounts, errorCounts, visitCounts, pageViewCounts } = useMemo(() => {
    const now = Date.now();
    const counts = {};
    const errors = {};
    const visits = {};
    const pageViews = {};
    activityHistory.forEach(e => {
      if (e.type === 'site_visit') {
        if (now - e.ms < 86400000) {
          if (!visits[e.stationId]) visits[e.stationId] = 0;
          visits[e.stationId]++;
        }
      } else if (e.type === 'page_view_summary') {
        // Extract count from title like "123 page views today"
        if (now - e.ms < 86400000) {
          const match = (e.title || '').match(/^(\d+)/);
          if (match) {
            const count = parseInt(match[1], 10);
            // Keep the highest reported count per station (summaries are cumulative)
            if (!pageViews[e.stationId] || count > pageViews[e.stationId]) {
              pageViews[e.stationId] = count;
            }
          }
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
    return { activityCounts: counts, errorCounts: errors, visitCounts: visits, pageViewCounts: pageViews };
  }, [activityHistory, stationHistory]);

  return { stationEvents, tickerEvents, activityCounts, errorCounts, visitCounts, pageViewCounts, stationHistory, flashingStations, flashTargets, activityHistory, walkQueueRef, lastEventTypeRef };
}
