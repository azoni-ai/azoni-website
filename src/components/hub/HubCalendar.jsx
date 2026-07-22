import React, { useMemo, useState } from 'react';

// Month-grid content calendar rendered purely from the cached hub-summary
// payload (calendar[] = last ~45 days of content events) — zero extra reads.

const DAY_MS = 86_400_000;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const dateKey = (d) => d.toISOString().slice(0, 10);

export default function HubCalendar({ calendar = [], sites = [], calendarDays = 45 }) {
  const [channel, setChannel] = useState('all'); // all | social | blog
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month

  const siteById = useMemo(() => {
    const map = {};
    sites.forEach((s) => { map[s.id] = s; });
    return map;
  }, [sites]);

  const events = useMemo(
    () => (channel === 'all' ? calendar : calendar.filter((e) => e.channel === channel)),
    [calendar, channel]
  );

  const byDate = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      (map[e.date] = map[e.date] || []).push(e);
    });
    return map;
  }, [events]);

  // Month being displayed.
  const base = new Date();
  const month = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  const windowStartMs = Date.now() - calendarDays * DAY_MS;
  const canGoBack = new Date(month.getFullYear(), month.getMonth(), 1).getTime() > windowStartMs;
  const canGoForward = monthOffset < 0;

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(Date.UTC(month.getFullYear(), month.getMonth(), d)));
  }

  const todayKey = dateKey(new Date());

  return (
    <section className="hub-calendar" aria-label="Content calendar">
      <header className="hub-calendar-head">
        <h2 className="hub-section-heading">Content calendar</h2>
        <div className="hub-calendar-controls">
          {['all', 'social', 'blog'].map((c) => (
            <button
              key={c}
              type="button"
              className={`hub-pill${channel === c ? ' is-active' : ''}`}
              onClick={() => setChannel(c)}
              aria-pressed={channel === c}
            >
              {c}
            </button>
          ))}
          <span className="hub-calendar-month">
            <button
              type="button"
              className="hub-pill"
              onClick={() => setMonthOffset((o) => o - 1)}
              disabled={!canGoBack}
              aria-label="Previous month"
            >
              ‹
            </button>
            {monthLabel}
            <button
              type="button"
              className="hub-pill"
              onClick={() => setMonthOffset((o) => o + 1)}
              disabled={!canGoForward}
              aria-label="Next month"
            >
              ›
            </button>
          </span>
        </div>
      </header>

      <div className="hub-calendar-grid" role="grid">
        {WEEKDAYS.map((w, i) => (
          <div key={`${w}${i}`} className="hub-calendar-weekday" aria-hidden="true">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="hub-calendar-cell is-pad" />;
          const key = dateKey(day);
          const dayEvents = byDate[key] || [];
          const inWindow = day.getTime() >= windowStartMs - DAY_MS;
          return (
            <div
              key={key}
              className={`hub-calendar-cell${key === todayKey ? ' is-today' : ''}${
                inWindow ? '' : ' is-outside'
              }`}
            >
              <span className="hub-calendar-daynum">{day.getUTCDate()}</span>
              <span className="hub-calendar-dots">
                {dayEvents.slice(0, 4).map((e, j) => {
                  const site = siteById[e.siteId];
                  const dot = (
                    <span
                      className="hub-calendar-dot"
                      style={{ background: site?.color || 'var(--text-warm-muted)' }}
                      title={`${site?.name || e.siteId} · ${e.channel}${e.title ? ` — ${e.title}` : ''}`}
                    />
                  );
                  return e.url ? (
                    <a key={j} href={e.url} target="_blank" rel="noopener noreferrer" aria-label={e.title || 'post'}>
                      {dot}
                    </a>
                  ) : (
                    <span key={j}>{dot}</span>
                  );
                })}
                {dayEvents.length > 4 && <span className="hub-calendar-more">+{dayEvents.length - 4}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
