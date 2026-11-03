import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { consulting, resumePath } from '../data/consulting';
import { profile } from '../data/profile';
import '../styles/meet.css';

const API = '/.netlify/functions/meet';
const EMPTY_FORM = { name: '', email: '', company: '', location: '', notes: '', website: '' };

// Every label uses the visitor's zone; the server only ever deals in UTC.
const visitorZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const zoneName = new Intl.DateTimeFormat(undefined, { timeZone: visitorZone, timeZoneName: 'long' })
  .formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value || visitorZone.replace(/_/g, ' ');
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: visitorZone, year: 'numeric', month: '2-digit', day: '2-digit' });
const weekday = new Intl.DateTimeFormat(undefined, { timeZone: visitorZone, weekday: 'short' });
const monthDay = new Intl.DateTimeFormat(undefined, { timeZone: visitorZone, month: 'short', day: 'numeric' });
const clock = new Intl.DateTimeFormat(undefined, { timeZone: visitorZone, hour: 'numeric', minute: '2-digit' });
const longDate = new Intl.DateTimeFormat(undefined, {
  timeZone: visitorZone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

function groupByDay(slots) {
  const days = new Map();
  for (const slot of slots) {
    const key = dayKey.format(new Date(slot));
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(slot);
  }
  return [...days.entries()].map(([key, times]) => ({ key, date: new Date(times[0]), times }));
}

export default function Meet() {
  const [availability, setAvailability] = useState({ status: 'loading', slots: [], durationMinutes: 30 });
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submit, setSubmit] = useState({ status: 'idle', message: '' });
  const [booked, setBooked] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAvailability({ status: 'ready', slots: data.slots, durationMinutes: data.durationMinutes });
      setDay((current) => (current && data.slots.some((s) => dayKey.format(new Date(s)) === current)
        ? current
        : data.slots[0] && dayKey.format(new Date(data.slots[0]))));
    } catch {
      setAvailability((a) => ({ ...a, status: 'error' }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => groupByDay(availability.slots), [availability.slots]);
  const times = days.find((d) => d.key === day)?.times || [];
  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const book = async (e) => {
    e.preventDefault();
    setSubmit({ status: 'sending', message: '' });
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, start: slot }),
      });
      const data = await res.json();
      if (res.ok) {
        setBooked({ start: slot, email: form.email, meetLink: data.meetLink, location: data.location });
        return;
      }
      if (data.code === 'slot_taken') {
        setSlot(null);
        load();
      }
      setSubmit({ status: 'error', message: data.error || 'Something went wrong. Please try again.' });
    } catch {
      setSubmit({ status: 'error', message: 'Something went wrong. Please try again.' });
    }
  };

  const emailFallback = <a className="consult-text-link" href={`mailto:${consulting.email}`}>Email {consulting.email} <ArrowUpRight size={16} /></a>;
  // Until there is a time to pick, the details column has nothing to offer.
  const hasTimes = days.length > 0;
  const waitingMessage = {
    loading: 'Loading open times…',
    error: 'Open times couldn’t be loaded right now. Email me and we’ll find a time.',
    ready: 'Nothing is open in the next two weeks. Email me and we’ll find a time.',
  }[availability.status];

  return <Layout>
    <Seo title="Book a call with Charlton Smith" path="/meet" description="A 30-minute call with Charlton Smith, principal software engineer." noIndex />
    <div className="az-meet consult-container">
      <header className="az-meet-heading">
        <div className="az-meet-intro">
          <p className="consult-eyebrow">Book a call</p>
          <h1>Pick a time<br /><span>that works for you.</span></h1>
          <p>A {availability.durationMinutes}-minute call with Charlton Smith, principal software engineer in the Seattle area. Times are shown in {zoneName}.</p>
        </div>
        <aside className="az-meet-host" aria-label="Who you’re meeting">
          <img src={profile.photo} alt="" width="64" height="64" />
          <div>
            <p className="az-meet-host-name">{profile.name}</p>
            <p className="az-meet-host-title">Principal software engineer</p>
            <p className="az-meet-host-links">
              <Link to={resumePath}>Resume</Link>
              <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn (opens in a new tab)">LinkedIn <ArrowUpRight size={14} aria-hidden="true" /></a>
            </p>
          </div>
        </aside>
      </header>

      {booked ? (
        <section className="az-meet-main az-meet-done" aria-live="polite">
          <div>
            <h2><Check size={18} aria-hidden="true" /> You&rsquo;re booked.</h2>
            <p className="az-meet-selected">{longDate.format(new Date(booked.start))}</p>
            <p>A calendar invite is on its way to {booked.email}.</p>
            {booked.meetLink && <p>Google Meet: <a className="consult-text-link" href={booked.meetLink}>{booked.meetLink}</a></p>}
            {booked.location && <p>Joining at: {booked.location}</p>}
          </div>
        </section>
      ) : (
        <div className={`az-meet-main${hasTimes ? '' : ' is-waiting'}`}>
          <section aria-labelledby="az-meet-pick-title">
            <h2 id="az-meet-pick-title">Choose a day and time.</h2>
            {!hasTimes && <div className="az-meet-note az-meet-waiting">
              <p role="status">{waitingMessage}</p>
              {emailFallback}
              {/* A taken slot can empty the list; its reason still has to show. */}
              {submit.message && <p role="alert" className="az-meet-status">{submit.message}</p>}
            </div>}
            {hasTimes && <>
              <div className="az-meet-days" role="group" aria-label="Days">
                {days.map((d) => (
                  <button type="button" key={d.key} className="az-meet-day" aria-pressed={d.key === day} onClick={() => { setDay(d.key); setSlot(null); }}>
                    <span>{weekday.format(d.date)}</span><strong>{monthDay.format(d.date)}</strong>
                  </button>
                ))}
              </div>
              <div className="az-meet-times" role="group" aria-label="Times">
                {times.map((t) => (
                  <button type="button" key={t} className="az-meet-time" aria-pressed={t === slot} onClick={() => { setSlot(t); setSubmit({ status: 'idle', message: '' }); }}>
                    {clock.format(new Date(t))}
                  </button>
                ))}
              </div>
            </>}
          </section>

          {hasTimes && <section className="az-meet-details" aria-labelledby="az-meet-details-title">
            <h2 id="az-meet-details-title">Your details.</h2>
            {!slot ? <p className="az-meet-note">Pick a time to continue.</p> : <>
              <form className="az-meet-form" onSubmit={book}>
                <p className="az-meet-selected">{longDate.format(new Date(slot))}</p>
                <label><span>Name</span><input required autoComplete="name" maxLength={100} value={form.name} onChange={update('name')} /></label>
                <label><span>Email</span><input required type="email" autoComplete="email" maxLength={200} value={form.email} onChange={update('email')} /></label>
                <label><span>Company <span className="az-meet-optional">(optional)</span></span><input autoComplete="organization" maxLength={100} value={form.company} onChange={update('company')} /></label>
                <label>
                  <span>Meeting link or phone <span className="az-meet-optional">(optional)</span></span>
                  <input maxLength={300} value={form.location} onChange={update('location')} aria-describedby="az-meet-location-hint" />
                  <span id="az-meet-location-hint" className="az-meet-hint">Using Zoom or Teams? Paste your link. Leave it blank and the invite includes a Google Meet.</span>
                </label>
                <label><span>Anything I should know? <span className="az-meet-optional">(optional)</span></span><textarea maxLength={1000} value={form.notes} onChange={update('notes')} /></label>
                <div className="az-meet-hp" aria-hidden="true">
                  <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} /></label>
                </div>
                <button type="submit" className="consult-button" disabled={submit.status === 'sending'}>
                  {submit.status === 'sending' ? 'Booking…' : 'Book this time'}
                </button>
              </form>
              <p className="az-meet-privacy">Your details go into the calendar invite for this call. <Link to="/privacy">Privacy notice</Link></p>
            </>}
            {/* Outside the form: a taken slot clears the selection, and the reason must stay visible. */}
            <p role="status" className="az-meet-status">{submit.message}</p>
          </section>}
        </div>
      )}
    </div>
  </Layout>;
}
