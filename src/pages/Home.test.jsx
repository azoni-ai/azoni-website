import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Home from './Home';
import { bookingCta } from '../data/consulting';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);

test('leads with the person, dated proof and two next steps, and ends on a call to action', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<Home />));
    expect(container.querySelector('h1').textContent).toBe('I build and run AI products and the infrastructure behind them.');
    expect(container.querySelector('.azoni-person-photo').getAttribute('src')).toBe('/images/charlton-linkedin.jpg');
    expect(container.querySelector('.azoni-person-role').textContent).toContain('Principal software engineer');
    expect(container.querySelector('.azoni-credentials').textContent).toContain('T-MobileCapital OneCo-founder, OLI Fitness');

    const heroButtons = [...container.querySelectorAll('.azoni-hero .consult-button')].map(link => [link.getAttribute('href'), link.textContent.trim()]);
    expect(heroButtons).toEqual([[bookingCta.to, bookingCta.label], ['/resume', 'Résumé']]);
    expect(container.querySelector('.azoni-proof-caption').textContent).toContain('as of November 2026');
    expect(container.querySelectorAll('.azoni-proof-list dd')).toHaveLength(4);

    expect(container.querySelector('.azoni-work-item').getAttribute('href')).toBe('/projects/fab-stats');
    expect(container.querySelector('.azoni-consulting a').getAttribute('href')).toBe('/services');
    expect(container.querySelector('.commit-band')).toBeNull();
    expect(container.querySelector('a[href="/live"]')).toBeNull();
    expect(container.textContent).not.toMatch(/work better|any size|Built\. Shipped|Curious by nature|a few lines/i);
    expect(container.textContent.match(/for a client as a principal software engineer|with a client as a principal software engineer/gi)).toHaveLength(1);

    const sections = container.querySelectorAll('.home-consulting > section');
    const last = sections[sections.length - 1];
    expect(last.querySelector('.consult-button').getAttribute('href')).toBe(bookingCta.to);
    expect(last.querySelector('a[href^="mailto:"]').textContent).toContain('charlton@azoni.ai');
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test('every project link on Home goes to a listed page, not a redirect', () => {
  const { projects } = jest.requireActual('../data/projects');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<Home />));
    const ids = [...container.querySelectorAll('a[href^="/projects/"]')].map(link => link.getAttribute('href').slice('/projects/'.length));
    expect(ids.length).toBeGreaterThan(0);
    ids.forEach(id => {
      const project = projects.find(p => p.id === id);
      expect(project).toBeDefined();
      expect(project.redirectTo).toBeFalsy();
      expect(['featured', 'other', 'earlier']).toContain(project.visibility);
    });
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
