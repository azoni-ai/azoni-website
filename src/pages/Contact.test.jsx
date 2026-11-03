import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Contact from './Contact';

let mockMeetLive = false;
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);
jest.mock('../data/consulting', () => {
  const actual = jest.requireActual('../data/consulting');
  return { ...actual, get meetLive() { return mockMeetLive; } };
});

function renderContact() {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<Contact />));
  return { container, cleanup: () => { act(() => root.unmount()); container.remove(); } };
}

afterEach(() => { mockMeetLive = false; });

test('blocked clipboard access still selects the address and preserves direct email and Gmail options', async () => {
  const originalExecCommand = document.execCommand;
  document.execCommand = jest.fn(() => false);
  const { container, cleanup } = renderContact();
  try {
    const email = container.querySelector('.az-contact-address');
    expect(email.getAttribute('href')).toBe('mailto:charlton@azoni.ai');
    const gmail = container.querySelector('a[href^="https://mail.google.com/"]');
    expect(new URL(gmail.href).searchParams.get('to')).toBe('charlton@azoni.ai');
    await act(async () => container.querySelector('.az-contact-copy').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(window.getSelection().toString()).toBe('charlton@azoni.ai');
    expect(container.querySelector('[role="status"]').textContent).toContain('Email selected');
  } finally {
    cleanup();
    document.execCommand = originalExecCommand;
  }
});

test('offers one mailto link, a plain heading and routes to work, consulting and the resume', () => {
  const { container, cleanup } = renderContact();
  try {
    expect(container.querySelector('h1').textContent).toBe('Get in touch');
    expect(container.querySelectorAll('a[href^="mailto:"]')).toHaveLength(1);
    expect(container.textContent).not.toMatch(/Open email app|any size|work better/i);
    expect(container.textContent).toContain('A few lines is enough.');
    // Written for anyone, not only clients: the project brief is one conditional sentence.
    expect(container.querySelector('.az-contact-heading p').textContent).not.toMatch(/business|workflow/i);
    expect(container.querySelector('.az-contact-start').textContent).toMatch(/^A few lines is enough\.If it’s a project,/);
    const more = [...container.querySelectorAll('.az-contact-more-links a')].map(link => link.getAttribute('href'));
    expect(more).toEqual(['/projects', '/services', '/resume']);
  } finally {
    cleanup();
  }
});

test('the call option appears only once booking is live', () => {
  let view = renderContact();
  try {
    expect(view.container.querySelector('a[href="/meet"]')).toBeNull();
  } finally {
    view.cleanup();
  }
  mockMeetLive = true;
  view = renderContact();
  try {
    const call = view.container.querySelector('.az-contact-call');
    expect(call.textContent).toBe('Prefer to talk? Book a 30-minute call.');
    expect(call.querySelector('a').getAttribute('href')).toBe('/meet');
  } finally {
    view.cleanup();
  }
});
