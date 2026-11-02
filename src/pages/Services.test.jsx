import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Services from './Services';
import { bookingCta, services } from '../data/consulting';
import { projects } from '../data/projects';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);

test('every service cites labeled real work that links somewhere real', () => {
  const projectIds = new Set(projects.map(project => project.id));
  for (const service of services) {
    expect(service.fit).toBeTruthy();
    expect(service.proof.length).toBeGreaterThan(0);
    for (const item of service.proof) {
      expect(['My own product', 'Earlier employment', 'Current role']).toContain(item.kind);
      const match = item.to.match(/^\/projects\/(.+)$/);
      if (match) expect(projectIds.has(match[1])).toBe(true);
      else expect(item.to).toMatch(/^\/about(#experience)?$/);
    }
  }
});

test('has its own heading, a byline, fit lines and a closing ask', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<Services />));
    expect(container.querySelector('h1').textContent).toBe('Software and AI consulting');
    expect(container.querySelector('.services-byline').textContent).toContain('Charlton Smith');
    expect(container.querySelector('.services-byline a[href="/resume"]')).not.toBeNull();
    expect([...container.querySelectorAll('.services-fit h3')].map(h => h.textContent)).toEqual(services.map(() => 'Good fit if…'));
    expect(container.textContent).not.toMatch(/any size|work better|What this could look like/i);
    const cta = container.querySelector('.services-cta');
    expect(cta.querySelector('.consult-button').getAttribute('href')).toBe(bookingCta.to);
    expect(cta.querySelector('a[href^="mailto:"]')).not.toBeNull();
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
