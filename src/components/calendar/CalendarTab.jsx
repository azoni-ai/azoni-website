import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
// Shares the admin card, field and button styles with the AI tools tab.
import '../aitools/aitools-admin.css';
import './calendar-admin.css';

// meet-admin redirects back here with ?google=<result> after Google's sign-in.
const SIGN_IN_RESULTS = {
  connected: { text: 'Google Calendar connected.' },
  cancelled: { text: 'Google sign-in was cancelled.', error: true },
  expired: { text: 'That sign-in took too long or was already used. Connect again.', error: true },
  'no-refresh-token': { text: 'Google didn’t grant ongoing access. Remove the app at myaccount.google.com/permissions, then connect again.', error: true },
  failed: { text: 'Connecting Google failed. Try again.', error: true },
};

async function meetAdmin(action, params = {}) {
  const res = await fetch('/.netlify/functions/meet-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('rag_admin_token') || ''}`,
    },
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `${action} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const shortUrl = (url) => {
  try {
    const { host, pathname } = new URL(url);
    return `${host}/…${pathname.slice(-24)}`;
  } catch {
    return url;
  }
};
const dateLabel = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const CalendarTab = ({ onAuthFailure }) => {
  const [status, setStatus] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [note, setNote] = useState(() => SIGN_IN_RESULTS[new URLSearchParams(window.location.search).get('google')] || null);
  const [feedUrl, setFeedUrl] = useState('');
  const [pending, setPending] = useState('');

  const handleError = useCallback((err) => {
    if (err.status === 401) onAuthFailure?.();
    else setNote({ text: err.message, error: true });
  }, [onAuthFailure]);

  const load = useCallback(async () => {
    try {
      setStatus(await meetAdmin('status'));
      setLoadError('');
    } catch (err) {
      if (err.status === 401) onAuthFailure?.();
      else setLoadError(err.message);
    }
  }, [onAuthFailure]);

  useEffect(() => {
    // Drop ?tab=calendar&google=… so a refresh doesn't repeat the sign-in message.
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
    load();
  }, [load]);

  const run = async (key, work) => {
    setPending(key);
    setNote(null);
    try {
      await work();
    } catch (err) {
      handleError(err);
    } finally {
      setPending('');
    }
  };

  const connectGoogle = () => run('connect', async () => {
    const { url } = await meetAdmin('connectGoogle');
    window.location.assign(url);
  });
  const disconnectGoogle = () => run('disconnect', async () => {
    if (!window.confirm('Disconnect Google? The booking page stops taking bookings until you connect again.')) return;
    await meetAdmin('disconnectGoogle');
    await load();
  });
  const addFeed = (e) => {
    e.preventDefault();
    run('add', async () => {
      const { busyCount } = await meetAdmin('addFeed', { url: feedUrl });
      setFeedUrl('');
      setNote({ text: `Calendar added. It has ${busyCount} busy block${busyCount === 1 ? '' : 's'} in the next two weeks.` });
      await load();
    });
  };
  const removeFeed = (url) => run(`remove:${url}`, async () => {
    await meetAdmin('removeFeed', { url });
    await load();
  });

  if (loadError) return <p className="ait-error">{loadError}</p>;
  if (!status) return <p className="ait-note">Loading calendar settings…</p>;

  const brokenFeed = status.feeds.some((feed) => !feed.working);
  const live = status.clientConfigured && status.google?.working && !brokenFeed;

  return (
    <div className="cal-admin">
      {note && <p className={note.error ? 'ait-error' : 'ait-notice'} role="status">{note.text}</p>}

      <div className="ait-card">
        <div className="ait-card-head">
          <h3>Booking page</h3>
          <a className="cal-admin-link" href="/meet" target="_blank" rel="noopener noreferrer">Open azoni.ai/meet <ArrowUpRight size={14} /></a>
        </div>
        <p className="cal-admin-text">
          <span className={`cal-admin-dot ${live ? 'on' : ''}`} aria-hidden="true" />
          {live
            ? 'Taking bookings. Open times come from the calendars below.'
            : brokenFeed
              ? 'Not taking bookings: a busy-only calendar below can’t be read, so open times can’t be trusted.'
              : 'Not taking bookings yet. Connect Google to turn it on.'}
        </p>
      </div>

      <div className="ait-card">
        <h3>Google Calendar</h3>
        {!status.clientConfigured ? (
          <div className="cal-admin-text">
            <p>One-time setup in Google Cloud before this can connect:</p>
            <ol>
              <li>Enable the Google Calendar API.</li>
              <li>On the OAuth consent screen, click <strong>Publish app</strong>. Left in testing, Google signs you out every 7 days.</li>
              <li>Create an OAuth client of type <strong>Web application</strong> with this authorized redirect URI:</li>
            </ol>
            <code className="cal-admin-code">{status.redirectUri}</code>
            <p>Then add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in Netlify and redeploy.</p>
          </div>
        ) : status.google ? (
          <>
            <p className="cal-admin-text">
              Connected as <strong>{status.google.email || 'your Google account'}</strong> since {dateLabel(status.google.connectedAt)}.
              Bookings are created here and invites are sent from this address.
            </p>
            {!status.google.working && <p className="ait-error">Google no longer accepts this sign-in. Connect again to fix it.</p>}
            <div className="ait-actions cal-admin-actions">
              <button className="ait-btn" disabled={!!pending} onClick={connectGoogle}>{status.google.working ? 'Switch account' : 'Connect again'}</button>
              <button className="ait-btn" disabled={!!pending} onClick={disconnectGoogle}>Disconnect</button>
            </div>
          </>
        ) : (
          <>
            <p className="cal-admin-text">Sign in with the Google account bookings should go to. Its busy times block slots, and invites are sent from it.</p>
            <div className="ait-actions cal-admin-actions">
              <button className="ait-btn primary" disabled={!!pending} onClick={connectGoogle}>{pending === 'connect' ? 'Opening Google…' : 'Connect Google'}</button>
            </div>
          </>
        )}
      </div>

      <div className="ait-card">
        <h3>Busy-only calendars</h3>
        <p className="cal-admin-text">
          Times on these calendars block slots, and nothing is ever written to them. For Outlook on the web: Settings → Calendar →
          Shared calendars → Publish a calendar → <strong>Can view when I’m busy</strong> → Publish, then copy the ICS link.
        </p>
        {status.feeds.length > 0 && (
          <ul className="cal-admin-feeds">
            {status.feeds.map((feed) => (
              <li key={feed.url}>
                <span title={feed.url}>{shortUrl(feed.url)}</span>
                {feed.working
                  ? <span className="cal-admin-muted">added {dateLabel(feed.addedAt)}</span>
                  : <span className="ait-error">Can’t be read: {feed.problem}</span>}
                <button className="ait-btn" disabled={!!pending} onClick={() => removeFeed(feed.url)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <form className="ait-frow" onSubmit={addFeed}>
          <label className="ait-fld grow2">
            <span>Calendar link (ICS)</span>
            <input type="text" required inputMode="url" placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} />
          </label>
          <button className="ait-btn primary" type="submit" disabled={!!pending}>{pending === 'add' ? 'Checking…' : 'Add calendar'}</button>
        </form>
      </div>
    </div>
  );
};

export default CalendarTab;
