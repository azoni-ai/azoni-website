import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Meet from './Meet';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);

const SLOTS = ['2026-11-03T17:00:00.000Z', '2026-11-03T18:00:00.000Z', '2026-11-04T17:00:00.000Z'];
const json = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });

function type(input, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const openTimes = (slots = SLOTS) => json({ timezone: 'America/Los_Angeles', durationMinutes: 30, slots });

async function renderMeet(postReply, getReply = () => openTimes()) {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.fetch = jest.fn((_url, init) => (init?.method === 'POST' ? postReply() : getReply()));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<Meet />));
  const click = (el) => act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const cleanup = () => { act(() => root.unmount()); container.remove(); };
  return { container, click, cleanup };
}

async function pickFirstTimeAndSubmit({ container, click }) {
  await click(container.querySelector('.az-meet-time'));
  const [name, email] = container.querySelectorAll('.az-meet-form input');
  await act(async () => { type(name, 'Jane Doe'); type(email, 'jane@example.com'); });
  await act(async () => container.querySelector('.az-meet-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}

test('groups open times by day, books the picked slot, and confirms it', async () => {
  const page = await renderMeet(() => json({ ok: true, meetLink: 'https://meet.google.com/abc-defg-hij', location: null }));
  try {
    expect(page.container.querySelectorAll('.az-meet-day')).toHaveLength(2);
    expect(page.container.querySelectorAll('.az-meet-time')).toHaveLength(2);
    expect(page.container.querySelector('.az-meet-form')).toBeNull();
    expect(page.container.querySelector('.az-meet-privacy')).toBeNull();

    await page.click(page.container.querySelector('.az-meet-time'));
    expect(page.container.querySelector('.az-meet-privacy a').getAttribute('href')).toBe('/privacy');

    await pickFirstTimeAndSubmit(page);
    const [, init] = global.fetch.mock.calls.find(([, i]) => i?.method === 'POST');
    expect(JSON.parse(init.body)).toMatchObject({ start: SLOTS[0], name: 'Jane Doe', email: 'jane@example.com', website: '' });
    expect(page.container.textContent).toContain('You’re booked.');
    expect(page.container.textContent).toContain('jane@example.com');
    expect(page.container.querySelector('a[href="https://meet.google.com/abc-defg-hij"]')).not.toBeNull();
  } finally {
    page.cleanup();
  }
});

test('a slot taken in the meantime refreshes the times and says so', async () => {
  const page = await renderMeet(() => json({ error: 'That time was just taken. Please pick another.', code: 'slot_taken' }, 409));
  try {
    await pickFirstTimeAndSubmit(page);
    expect(global.fetch.mock.calls.filter(([, i]) => !i)).toHaveLength(2);
    expect(page.container.querySelector('.az-meet-form')).toBeNull();
    expect(page.container.textContent).toContain('That time was just taken');
  } finally {
    page.cleanup();
  }
});

test('says whose call it is and links the resume and LinkedIn', async () => {
  const page = await renderMeet(() => json({}));
  try {
    const heading = page.container.querySelector('.az-meet-heading').textContent;
    expect(heading).toContain('A 30-minute call with Charlton Smith, principal software engineer in the Seattle area.');
    const host = page.container.querySelector('.az-meet-host');
    expect(host.querySelector('img').getAttribute('src')).toBe('/images/charlton-linkedin.jpg');
    expect(host.textContent).toContain('Principal software engineer');
    expect(host.querySelector('a[href="/resume"]')).not.toBeNull();
    expect(host.querySelector('a[href="https://www.linkedin.com/in/charltonsmith"]')).not.toBeNull();
  } finally {
    page.cleanup();
  }
});

const expectWaiting = (container, message) => {
  expect(container.querySelector('.az-meet-details')).toBeNull();
  expect(container.querySelector('.az-meet-main').classList.contains('is-waiting')).toBe(true);
  expect(container.querySelector('.az-meet-waiting').textContent).toContain(message);
  expect(container.querySelector('.az-meet-waiting a[href="mailto:charlton@azoni.ai"]')).not.toBeNull();
};

test('while times load, the details column stays hidden and email is offered', async () => {
  const page = await renderMeet(() => json({}), () => new Promise(() => {}));
  try {
    expectWaiting(page.container, 'Loading open times');
  } finally {
    page.cleanup();
  }
});

test('a failed load shows one message with the email fallback and no details column', async () => {
  const page = await renderMeet(() => json({}), () => json({ error: 'Calendar unavailable' }, 503));
  try {
    expectWaiting(page.container, 'Open times couldn’t be loaded right now.');
    expect(page.container.querySelectorAll('.az-meet-time')).toHaveLength(0);
  } finally {
    page.cleanup();
  }
});

test('no open times shows one message with the email fallback and no details column', async () => {
  const page = await renderMeet(() => json({}), () => openTimes([]));
  try {
    expectWaiting(page.container, 'Nothing is open in the next two weeks.');
  } finally {
    page.cleanup();
  }
});

test('when the last open time is taken, the reason stays visible beside the email fallback', async () => {
  let gets = 0;
  const page = await renderMeet(
    () => json({ error: 'That time was just taken. Please pick another.', code: 'slot_taken' }, 409),
    () => openTimes(gets++ ? [] : SLOTS),
  );
  try {
    await pickFirstTimeAndSubmit(page);
    expectWaiting(page.container, 'Nothing is open in the next two weeks.');
    expect(page.container.querySelector('.az-meet-waiting').textContent).toContain('That time was just taken');
  } finally {
    page.cleanup();
  }
});
