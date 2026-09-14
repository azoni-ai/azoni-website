import React, { useMemo, useRef, useState } from 'react';
import {
  addDaysISO, dateToISO, hoursFmt, parseISO, periodForDate, round2, todayISO, uid,
} from './billing-lib';
import DayEditor from './DayEditor';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Month calendar over the work journal. Each in-month day carries a small
// hours field: type a number and blur, or press Enter to save and move to the
// next day. The field edits the day's UNBILLED hours (billed ones are frozen
// on an invoice and show as a label). A dot marks a day with notes, a coral
// top edge marks a billing period start. Clicking a day opens it below.
const CalendarSection = ({ data, mutate }) => {
  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(today.slice(0, 8) + '01');
  // The one field being typed in: { iso, value }. Mirrored in a ref so a blur
  // that fires during Enter's focus-next can't commit the same value twice.
  const [editing, setEditing] = useState(null);
  const editingRef = useRef(null);
  const inputsRef = useRef({});

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
      if (!map.has(k)) map.set(k, { unbilled: 0, unbilledEntries: 0, billed: 0, hasNote: false });
      return map.get(k);
    };
    data.entries.forEach((e) => {
      const r = get(e.date);
      if (e.invoiceId) {
        r.billed = round2(r.billed + (e.hours || 0));
      } else {
        r.unbilled = round2(r.unbilled + (e.hours || 0));
        r.unbilledEntries += 1;
      }
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

  // Shown value: the draft while typing, else the day's unbilled total
  // (blank when the day has no unbilled entries).
  const fieldValue = (iso) => {
    if (editing && editing.iso === iso) return editing.value;
    const info = dayInfo.get(iso);
    return info && info.unbilledEntries > 0 ? hoursFmt(info.unbilled) : '';
  };

  const startEdit = (iso) => {
    const next = { iso, value: fieldValue(iso) };
    editingRef.current = next;
    setEditing(next);
    setSelected(iso);
  };

  const changeEdit = (value) => {
    const next = { ...editingRef.current, value };
    editingRef.current = next;
    setEditing(next);
  };

  const cancelEdit = () => {
    editingRef.current = null;
    setEditing(null);
  };

  // Blank clears the day's unbilled entries; a number becomes the day's
  // unbilled total. Several unbilled entries on one day collapse into the
  // earliest one, since entries are just date + hours now.
  const commit = () => {
    const cur = editingRef.current;
    if (!cur) return;
    editingRef.current = null;
    setEditing(null);
    const { iso } = cur;
    const raw = cur.value.trim();
    const info = dayInfo.get(iso) || { unbilled: 0, unbilledEntries: 0 };

    if (raw === '') {
      if (!info.unbilledEntries) return;
      mutate((d) => ({
        ...d,
        entries: d.entries.filter((e) => !(e.date === iso && !e.invoiceId)),
      }));
      return;
    }

    const hours = round2(Number(raw));
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) return;
    if (info.unbilledEntries === 1 && info.unbilled === hours) return;
    if (!info.unbilledEntries) {
      mutate((d) => ({
        ...d,
        entries: [
          ...d.entries,
          { id: uid(), created: Date.now(), invoiceId: null, date: iso, project: '', description: '', hours },
        ],
      }));
      return;
    }
    mutate((d) => {
      const mine = d.entries
        .filter((e) => e.date === iso && !e.invoiceId)
        .sort((a, b) => (a.created || 0) - (b.created || 0));
      if (!mine.length) {
        return {
          ...d,
          entries: [
            ...d.entries,
            { id: uid(), created: Date.now(), invoiceId: null, date: iso, project: '', description: '', hours },
          ],
        };
      }
      const keepId = mine[0].id;
      return {
        ...d,
        entries: d.entries
          .filter((e) => e.date !== iso || e.invoiceId || e.id === keepId)
          .map((e) => (e.id === keepId ? { ...e, hours } : e)),
      };
    });
  };

  const onKeyDown = (e, iso) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
      // Next in-month day, if any; otherwise just leave the field.
      const next = inputsRef.current[addDaysISO(iso, 1)];
      if (next) next.focus();
      else e.target.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
      e.target.blur();
    }
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
            Type hours into a day. Enter saves and moves to the next day. Coral edge starts a billing period.
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
            const value = cell.inMonth ? fieldValue(cell.iso) : '';
            const zero = info && info.unbilledEntries > 0 && info.unbilled === 0;
            return (
              <div
                key={cell.iso}
                className={classes}
                role="button"
                tabIndex={cell.inMonth ? -1 : 0}
                onClick={() => pick(cell)}
                onKeyDown={(e) => {
                  if (!cell.inMonth && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    pick(cell);
                  }
                }}
              >
                <span className="bc-day">{cell.day}</span>
                {info && info.hasNote && <span className="bc-note" />}
                {cell.inMonth ? (
                  <input
                    ref={(el) => {
                      if (el) inputsRef.current[cell.iso] = el;
                      else delete inputsRef.current[cell.iso];
                    }}
                    className={`bc-hours-input ${zero && !(editing && editing.iso === cell.iso) ? 'zero' : ''}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="–"
                    aria-label={`Hours on ${cell.iso}`}
                    value={value}
                    onFocus={() => startEdit(cell.iso)}
                    onChange={(e) => changeEdit(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => onKeyDown(e, cell.iso)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  info && (info.unbilledEntries > 0 || info.billed > 0) && (
                    <span className="bc-hours">{hoursFmt(round2(info.unbilled + info.billed))}h</span>
                  )
                )}
                {cell.inMonth && info && info.billed > 0 && (
                  <span className="bc-billed">{hoursFmt(info.billed)}h billed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <DayEditor date={selected} data={data} mutate={mutate} />
    </>
  );
};

export default CalendarSection;
