import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import About from './About';
import { experience, awards } from '../data/profile';
import { bookingCta } from '../data/consulting';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);

test('renders history and awards from profile.js and ends on two paths', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<About />));
    expect(container.textContent).not.toMatch(/builder at heart|Always learning|These days|any size|a few lines/i);
    // The current-role sentence appears once, in the experience row.
    expect(container.textContent.match(/work with a client as a principal software engineer/gi)).toHaveLength(1);

    const heroButtons = [...container.querySelectorAll('.about-hero .consult-button')].map(link => [link.getAttribute('href'), link.textContent.trim()]);
    expect(heroButtons).toEqual([[bookingCta.to, bookingCta.label], ['/resume', 'Résumé']]);

    const rows = container.querySelectorAll('#experience .about-experience-list > li');
    expect(rows).toHaveLength(experience.length);
    expect(rows[0].querySelector('.about-role').textContent).toBe('Principal software engineer');
    expect(container.querySelector('#experience').textContent).toContain('Nov 2023 – Present');
    expect(container.querySelectorAll('.about-awards > li')).toHaveLength(awards.length);
    expect(container.querySelector('a[href="https://dl.acm.org/doi/abs/10.1145/3027063.3048429"]')).not.toBeNull();

    const closing = [...container.querySelectorAll('.about-closing-actions a')].map(link => link.getAttribute('href'));
    expect(closing).toEqual(['/projects', bookingCta.to]);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
