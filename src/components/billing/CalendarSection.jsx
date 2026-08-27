import React, { useMemo, useState } from 'react';
import { dateToISO, hoursFmt, parseISO, periodForDate, round2, todayISO } from './billing-lib';
import DayEditor from './DayEditor';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Month calendar over the work journal: each day shows logged hours (amber
// unbilled, green when fully billed), a dot when the day has notes, and a
// coral top edge where a billing period starts. Clicking a day opens it in
// the editor below.
const CalendarSection = ({ data, mutate }) => {
  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(today.slice(0, 8) + '01');

  const cells = useMemo(() => {
    const first = parseISO(cursor);
    const y = first.getFullYear();
    const m = first.getMonth();
    const startOffset = new Date(y, m, 1).getDay();
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(y, m, 1 - startOffset + i);
      return { iso: dateToISO(d), day: d.getDate(), inMonth: d.getMonth() === m };
    });
  }, [cursor]);

  const dayInfo = useMemo(() => {
    const map = new Map();
    const get = (k) => {
      if (!map.has(k)) map.set(k, { hours: 0, entries: 0, billed: 0, hasNote: false });
      return map.get(k);
    };
    data.entries.forEach((e) => {
      const r = get(e.date);
      r.hours += e.hours || 0;
      r.entries += 1;
      if (e.invoiceId) r.billed += 1;
    });
    Object.keys(data.dayNotes).forEach((k) => {
      if (data.dayNotes[k]) get(k).hasNote = true;
    });
    return map;
  }, [data.entries, data.dayNotes]);

  const moveMonth = (n) => {
    const f = parseISO(cursor);
    setCursor(dateToISO(new Date(f.getFullYear(), f.getMonth() + n, 1)));
  };

  const pick = (cell) => {
    setSelected(cell.iso);
    if (!cell.inMonth) setCursor(cell.iso.slice(0, 8) + '01');
  };

  const goToday = () => {
    setSelected(today);
    setCursor(today.slice(0, 8) + '01');
  };

  const anchor = data.settings.cycleAnchor;
  const isPeriodStart = (iso) =>
    !!anchor && iso >= anchor && periodForDate(anchor, iso).start === iso;

  const monthLabel = parseISO(cursor).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  return (
    <>
      <div className="billing-card">
        <div className="billing-card-head">
          <div className="billing-daynav">
            <button className="billing-btn small" onClick={() => moveMonth(-1)}>{'←'}</button>
            <span className="billing-dayname">{monthLabel}</span>
            <button className="billing-btn small" onClick={() => moveMonth(1)}>{'→'}</button>
            {(selected !== today || cursor !== today.slice(0, 8) + '01') && (
              <button className="billing-btn small" onClick={goToday}>Today</button>
            )}
          </div>
          <span className="billing-periodline">
            Coral edge marks a new billing period. Dot marks a day with notes.
          </span>
        </div>

        <div className="billing-cal-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="billing-cal-dow">{w}</div>
          ))}
          {cells.map((cell) => {
            const info = dayInfo.get(cell.iso);
            const classes = [
              'billing-cal-cell',
              cell.inMonth ? '' : 'out',
              cell.iso === today ? 'today' : '',
              cell.iso === selected ? 'selected' : '',
              isPeriodStart(cell.iso) ? 'pstart' : '',
            ].filter(Boolean).join(' ');
            return (
              <button key={cell.iso} className={classes} onClick={() => pick(cell)}>
                <span className="bc-day">{cell.day}</span>
                {info && info.hasNote && <span className="bc-note" />}
                {info && info.entries > 0 && (
                  <span
                    className={`bc-hours ${
                      info.hours === 0 ? 'zero' : info.billed === info.entries ? 'billed' : ''
                    }`}
                  >
                    {hoursFmt(round2(info.hours))}h
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <DayEditor date={selected} data={data} mutate={mutate} />
    </>
  );
};

export default CalendarSection;
