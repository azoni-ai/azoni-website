import React, { useMemo, useState } from 'react';
import {
  fmtDate, hoursFmt, invoiceDateFor, parseISO, periodForDate, round2, todayISO, uid,
} from './billing-lib';

const emptyForm = () => ({ hours: '' });

// Edits one day: its journal note and its time entries. The calendar above
// picks the date.
const DayEditor = ({ date, data, mutate }) => {
  const [form, setForm] = useState(emptyForm);

  const anchor = data.settings.cycleAnchor;
  const note = data.dayNotes[date] || '';

  const dayEntries = useMemo(
    () =>
      data.entries
        .filter((e) => e.date === date)
        .sort((a, b) => (a.created || 0) - (b.created || 0)),
    [data.entries, date]
  );
  const dayHours = round2(dayEntries.reduce((s, e) => s + (e.hours || 0), 0));

  let periodLine = null;
  if (anchor && date >= anchor) {
    const p = periodForDate(anchor, date);
    const dayN = Math.round((parseISO(date) - parseISO(p.start)) / 86400000) + 1;
    periodLine = `Day ${dayN} of 14 · period ${fmtDate(p.start)} to ${fmtDate(p.end)} · invoice ${fmtDate(invoiceDateFor(p.end))}`;
  } else if (anchor) {
    periodLine = `Before the ${fmtDate(anchor)} commencement date`;
  }

  const setNote = (text) => {
    mutate((d) => {
      const dayNotes = { ...d.dayNotes };
      if (text) dayNotes[date] = text;
      else delete dayNotes[date];
      return { ...d, dayNotes };
    });
  };

  const addEntry = (e) => {
    e.preventDefault();
    const hours = round2(Number(form.hours));
    // 0 is allowed: it records a day with no work. Invoices exclude 0-hour rows.
    if (form.hours === '' || !Number.isFinite(hours) || hours < 0) return;
    mutate((d) => ({
      ...d,
      entries: [
        ...d.entries,
        // Entries are just date + hours now; the narrative lives in the day
        // notes and the invoice's per-cycle work summary.
        { id: uid(), created: Date.now(), invoiceId: null, date, project: '', description: '', hours },
      ],
    }));
    setForm({ hours: '' });
  };

  const removeEntry = (entry) => {
    if (!window.confirm(`Delete ${hoursFmt(entry.hours)} hours (${entry.project || 'no project'})?`)) return;
    mutate((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== entry.id) }));
  };

  return (
    <>
      <div className="billing-card">
        <div className="billing-card-head">
          <h3>
            {parseISO(date).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
            {date === todayISO() ? ' (today)' : ''}
          </h3>
          {periodLine && <span className="billing-periodline">{periodLine}</span>}
        </div>

        <label className="billing-fld full">
          <span>Notes for the day</span>
          <textarea
            className="billing-daynote"
            rows={6}
            placeholder="What happened today: meetings, decisions, blockers, random things worth remembering."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>

      <div className="billing-card">
        <div className="billing-card-head">
          <h3>Time</h3>
          <span className="billing-hint nowrap">{hoursFmt(dayHours)} hours logged</span>
        </div>
        <form onSubmit={addEntry} className="billing-frow">
          <label className="billing-fld hours">
            <span>Hours</span>
            <input
              type="number" step="0.25" min="0" max="24" required
              value={form.hours}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
            />
          </label>
          <button className="billing-btn primary" type="submit">Add</button>
        </form>
        <p className="billing-hint">
          Log 0 hours to record a day with no work. Zero-hour entries stay off invoices.
        </p>

        {dayEntries.length > 0 && (
          <div className="billing-tablewrap" style={{ marginTop: '12px' }}>
            <table className="billing-table">
              <tbody>
                {dayEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{[entry.project, entry.description].filter(Boolean).join(' · ')}</td>
                    <td className="num">{hoursFmt(entry.hours)}</td>
                    <td className="num">
                      {entry.invoiceId ? (
                        <span className="billing-pill">billed</span>
                      ) : (
                        <button className="billing-linkish danger" onClick={() => removeEntry(entry)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default DayEditor;
