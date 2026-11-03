import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Navbar from './Navbar';

let mockMeetLive = false;
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/' }),
}), { virtual: true });
jest.mock('../data/consulting', () => {
  const actual = jest.requireActual('../data/consulting');
  return {
    ...actual,
    get meetLive() { return mockMeetLive; },
    get bookingCta() { return mockMeetLive ? { to: '/meet', label: 'Book a call' } : { to: '/contact', label: 'Get in touch' }; },
  };
});

function renderLinks() {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<Navbar />));
  const links = [...container.querySelectorAll('#site-navigation a')].map(link => [link.textContent, link.getAttribute('href')]);
  act(() => root.unmount());
  container.remove();
  return links;
}

afterEach(() => { mockMeetLive = false; });

test('the header lists the pages, spells Resume plainly and has no Get in touch button', () => {
  expect(renderLinks()).toEqual([['Work', '/projects'], ['About', '/about'], ['Resume', '/resume'], ['Consulting', '/services']]);
});

test('once /meet takes bookings, a Book a call link takes the spot for availability', () => {
  mockMeetLive = true;
  expect(renderLinks()).toEqual([['Work', '/projects'], ['About', '/about'], ['Resume', '/resume'], ['Consulting', '/services'], ['Book a call', '/meet']]);
});
