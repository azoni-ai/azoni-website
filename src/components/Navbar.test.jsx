import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Navbar from './Navbar';
import { bookingCta, meetLive } from '../data/consulting';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/' }),
}), { virtual: true });

test('the header lists the pages, spells Resume plainly, and shows the booking link only once bookings work', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<Navbar />));
    const labels = [...container.querySelectorAll('#site-navigation a')].map(link => link.textContent);
    expect(labels).toEqual(['Work', 'About', 'Resume', 'Consulting', ...(meetLive ? [bookingCta.label] : [])]);
    expect(container.textContent).not.toMatch(/Get in touch/);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
