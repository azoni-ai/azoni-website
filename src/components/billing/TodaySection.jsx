import React, { useMemo, useState } from 'react';
import {
  addDaysISO, fmtDate, hoursFmt, invoiceDateFor, parseISO, periodForDate,
  round2, todayISO, uid,
} from './billing-lib';

const emptyForm = () => ({ project: '', description: '', hours: '' });

// The daily driver: pick a day (defaults to today), write what the day was,
// and log billable time right there. Recent days below for quick review.
const TodaySection = ({ data, mutate }) => {
  const [viewDate, setViewDate] = useState(todayISO());
  const [form, setForm] = useState(emptyForm);

  const anchor = data.settings.cycleAnchor;
  const note = data.dayNotes[viewDate] || '';

  const dayEntries = useMemo(
    () =>
      data.entries
        .filter((e) => e.date === viewDate)
        .sort((a, b) => (a.created || 0) - (b.created || 0)),
    [data.entries, viewDate]
  );
  const dayHours = round2(dayEntries.reduce((s, e) => s + (e.hours || 0), 0));

  const projects = useMemo(
    () => [...new Set(data.entries.map((e) => e.project).filter(Boolean))],
    [data.entries]
  );

  // Period context line for the viewed day.
  let periodLine = null;
  if (anchor && viewDate >= anchor) {
    const p = periodForDate(anchor, viewDate);
    const dayN = Math.round((parseISO(viewDate) - parseISO(p.start)) / 86400000) + 1;
    periodLine = `Day ${dayN} of 14 · period ${fmtDate(p.start)} to ${fmtDate(p.end)} · invoice ${fmtDate(invoiceDateFor(p.end))}`;
  } else if (anchor) {
    periodLine = `Before the ${fmtDate(anchor)} commencement date`;
  }

  const setNote = (text) => {
    mutate((d) => {
      const dayNotes = { ...d.dayNotes };
      if (text) dayNotes[viewDate] = text;
      else delete dayNotes[viewDate];
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
        {
          id: uid(),
          created: Date.now(),
          invoiceId: null,
          date: viewDate,
          project: form.project.trim(),
          description: form.description.trim(),
          hours,
        },
      ],
    }));
    // Keep the project (usually the same all day); clear the rest.
    setForm((f) => ({ ...f, description: '', hours: '' }));
  };

  const removeEntry = (entry) => {
    if (!window.confirm(`Delete ${hoursFmt(entry.hours)} hours (${entry.project || 'no project'})?`)) return;
    mutate((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== entry.id) }));
  };

  // Recent days: any day with a note or logged time, newest first.
  const recentDays = useMemo(() => {
    const dates = new Set(Object.keys(data.dayNotes).filter((k) => data.dayNotes[k]));
    data.entries.forEach((e) => dates.add(e.date));
    return [...dates]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 14)
      .map((date) => {
        const dateEntries = data.entries.filter((e) => e.date === date);
        const hours = round2(dateEntries.reduce((s, e) => s + (e.hours || 0), 0));
        const firstLine =
          (data.dayNotes[date] || '').split('\n').find((l) => l.trim()) ||
          dateEntries.map((e) => e.description).find(Boolean) || '';
        return { date, hours, hasEntries: dateEntries.length > 0, preview: firstLine.slice(0, 90) };
      });
  }, [data.dayNotes, data.entries]);

  return (
    <>
      <div className="billing-card">
        <div className="billing-card-head">
          <div className="billing-daynav">
            <button className="billing-btn small" onClick={() => setViewDate(addDaysISO(viewDate, -1))}>
              {'←'}
            </button>
            <input
              type="date"
              value={viewDate}
              onChange={(e) => e.target.value && setViewDate(e.target.value)}
            />
            <button className="billing-btn small" onClick={() => setViewDate(addDaysISO(viewDate, 1))}>
              {'→'}
            </button>
            {viewDate !== todayISO() && (
              <button className="billing-btn small" onClick={() => setViewDate(todayISO())}>
                Today
              </button>
            )}
            <span className="billing-dayname">
              {parseISO(viewDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          {periodLine && <span className="billing-periodline">{periodLine}</span>}
        </div>

        <label className="billing-fld full">
          <span>Notes for the day</span>
          <textarea
            className="billing-daynote"
            rows={7}
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
          <label className="billing-fld grow">
            <span>Project or task</span>
            <input
              type="text"
              list="billing-projects-today"
              placeholder="Project"
              value={form.project}
              onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
            />
            <datalist id="billing-projects-today">
              {projects.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label className="billing-fld grow2">
            <span>Description</span>
            <input
              type="text"
              placeholder="What you worked on"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
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
                    <td>{entry.project}</td>
                    <td>{entry.description}</td>
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

      {recentDays.length > 0 && (
        <div className="billing-card">
          <h3>Recent days</h3>
          <div className="billing-recent">
            {recentDays.map((d) => (
              <button
                key={d.date}
                className={`billing-recent-row ${d.date === viewDate ? 'active' : ''}`}
                onClick={() => setViewDate(d.date)}
              >
                <span className="br-date">{fmtDate(d.date)}</span>
                <span className="br-hours">{d.hasEntries || d.hours ? `${hoursFmt(d.hours)} h` : ''}</span>
                <span className="br-preview">{d.preview}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default TodaySection;
