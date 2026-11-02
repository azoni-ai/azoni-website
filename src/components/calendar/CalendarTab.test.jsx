import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import CalendarTab from './CalendarTab';

const REDIRECT = 'https://azoni.ai/.netlify/functions/meet-admin';
const json = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });

async function renderTab(replies, props = {}) {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  sessionStorage.setItem('rag_admin_token', 'owner-key');
  global.fetch = jest.fn((_url, init) => replies[JSON.parse(init.body).action](JSON.parse(init.body)));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<CalendarTab {...props} />));
  return { container, cleanup: () => { act(() => root.unmount()); container.remove(); } };
}

test('before Google credentials exist it shows the redirect URI to register', async () => {
  const tab = await renderTab({ status: () => json({ clientConfigured: false, redirectUri: REDIRECT, google: null, feeds: [] }) });
  try {
    expect(tab.container.querySelector('.cal-admin-code').textContent).toBe(REDIRECT);
    expect(tab.container.textContent).toContain('Not taking bookings yet');
    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer owner-key');
  } finally {
    tab.cleanup();
  }
});

test('connected: shows the account, adds a calendar, and reports what it found', async () => {
  let feeds = [];
  const tab = await renderTab({
    status: () => json({ clientConfigured: true, redirectUri: REDIRECT, google: { email: 'me@gmail.com', connectedAt: 0, working: true }, feeds }),
    addFeed: ({ url }) => { feeds = [{ url, addedAt: 0, working: true }]; return json({ ok: true, busyCount: 4 }); },
  });
  try {
    expect(tab.container.textContent).toContain('me@gmail.com');
    expect(tab.container.textContent).toContain('Taking bookings');
    const input = tab.container.querySelector('.cal-admin input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'https://outlook.office365.com/owa/calendar/x/calendar.ics');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => tab.container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(tab.container.textContent).toContain('4 busy blocks in the next two weeks');
    expect(tab.container.querySelectorAll('.cal-admin-feeds li')).toHaveLength(1);
  } finally {
    tab.cleanup();
  }
});

test('a rejected admin session signs out instead of showing an error', async () => {
  const onAuthFailure = jest.fn();
  const tab = await renderTab({ status: () => json({ error: 'Unauthorized' }, 401) }, { onAuthFailure });
  try {
    expect(onAuthFailure).toHaveBeenCalled();
  } finally {
    tab.cleanup();
  }
});
