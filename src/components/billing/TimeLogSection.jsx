import React, { useMemo, useState } from 'react';
import {
  downloadFile, entriesCsv, fmtDate, hoursFmt, invoiceById,
  round2, sortedEntries, todayISO, uid,
} from './billing-lib';

const emptyForm = () => ({ date: todayISO(), project: '', description: '', hours: '' });

const TimeLogSection = ({ data, mutate }) => {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');

  const projects = useMemo(
    () => [...new Set(data.entries.map((e) => e.project).filter(Boolean))],
    [data.entries]
  );

  const rows = useMemo(() => {
    let r = sortedEntries(data);
    if (filter === 'unbilled') r = r.filter((e) => !e.invoiceId);
    if (filter === 'billed') r = r.filter((e) => e.invoiceId);
    return r;
  }, [data, filter]);

  const shownHours = round2(rows.reduce((s, e) => s + (e.hours || 0), 0));

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const hours = round2(Number(form.hours));
    if (!form.date || !(hours > 0)) return;
    const fields = {
      date: form.date,
      project: form.project.trim(),
      description: form.description.trim(),
      hours,
    };
    if (editingId) {
      mutate((d) => ({
        ...d,
        entries: d.entries.map((x) =>
          x.id === editingId && !x.invoiceId ? { ...x, ...fields } : x
        ),
      }));
      setEditingId(null);
    } else {
      mutate((d) => ({
        ...d,
        entries: [...d.entries, { id: uid(), created: Date.now(), invoiceId: null, ...fields }],
      }));
    }
    setForm(emptyForm());
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      date: entry.date,
      project: entry.project || '',
      description: entry.description || '',
      hours: String(entry.hours),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const remove = (entry) => {
    if (!window.confirm(`Delete ${hoursFmt(entry.hours)} hours on ${fmtDate(entry.date)}?`)) return;
    if (editingId === entry.id) cancelEdit();
    mutate((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== entry.id) }));
  };

  return (
    <>
      <div className="billing-card">
        <h3>{editingId ? 'Edit entry' : 'Log time'}</h3>
        <form onSubmit={submit} className="billing-frow">
          <label className="billing-fld">
            <span>Date</span>
            <input type="date" required value={form.date} onChange={set('date')} />
          </label>
          <label className="billing-fld grow">
            <span>Project or task</span>
            <input
              type="text"
              list="billing-projects"
              placeholder="Project"
              value={form.project}
              onChange={set('project')}
            />
            <datalist id="billing-projects">
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
              onChange={set('description')}
            />
          </label>
          <label className="billing-fld hours">
            <span>Hours</span>
            <input
              type="number" step="0.25" min="0.25" max="24" required
              value={form.hours} onChange={set('hours')}
            />
          </label>
          <button className="billing-btn primary" type="submit">
            {editingId ? 'Save' : 'Add'}
          </button>
          {editingId && (
            <button className="billing-btn" type="button" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="billing-card">
        <div className="billing-card-head">
          <h3>Entries</h3>
          <div className="billing-actions">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="unbilled">Unbilled</option>
              <option value="billed">Billed</option>
            </select>
            <button
              className="billing-btn small"
              onClick={() => downloadFile(`azoni-time-log-${todayISO()}.csv`, entriesCsv(data), 'text/csv')}
            >
              Export CSV
            </button>
          </div>
        </div>
        {rows.length ? (
          <>
            <div className="billing-tablewrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Project</th><th>Description</th>
                    <th className="num">Hours</th><th>Invoice</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => {
                    const inv = entry.invoiceId ? invoiceById(data, entry.invoiceId) : null;
                    return (
                      <tr key={entry.id}>
                        <td className="nowrap">{fmtDate(entry.date)}</td>
                        <td>{entry.project}</td>
                        <td>{entry.description}</td>
                        <td className="num">{hoursFmt(entry.hours)}</td>
                        <td>{inv ? <span className="billing-pill">{inv.number}</span> : ''}</td>
                        <td className="num">
                          {!entry.invoiceId && (
                            <>
                              <button className="billing-linkish" onClick={() => startEdit(entry)}>
                                Edit
                              </button>{' '}
                              <button className="billing-linkish danger" onClick={() => remove(entry)}>
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="billing-tfoot">
              {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}, {hoursFmt(shownHours)} hours
            </div>
          </>
        ) : (
          <div className="billing-empty">No entries here yet. Log hours above.</div>
        )}
      </div>
    </>
  );
};

export default TimeLogSection;
