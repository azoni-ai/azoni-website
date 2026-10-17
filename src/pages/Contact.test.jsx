import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Contact from './Contact';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);

test('blocked clipboard access still selects the address and preserves direct email and Gmail options', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const originalExecCommand = document.execCommand;
  document.execCommand = jest.fn(() => false);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<Contact />));
    const email = container.querySelector('.az-contact-address');
    expect(email.getAttribute('href')).toBe('mailto:charlton@azoni.ai');
    const gmail = container.querySelector('a[href^="https://mail.google.com/"]');
    expect(new URL(gmail.href).searchParams.get('to')).toBe('charlton@azoni.ai');
    await act(async () => container.querySelector('.az-contact-copy').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(window.getSelection().toString()).toBe('charlton@azoni.ai');
    expect(container.querySelector('[role="status"]').textContent).toContain('Email selected');
  } finally {
    act(() => root.unmount());
    container.remove();
    document.execCommand = originalExecCommand;
  }
});
