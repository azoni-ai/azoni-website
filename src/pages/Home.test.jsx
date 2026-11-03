import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Home from './Home';
import { GITHUB_STATS_URL } from '../utils/githubTelemetry';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);

// The GitHub band asks the github-stats function; keep it loading in tests.
beforeEach(() => { global.fetch = jest.fn(() => new Promise(() => {})); });
afterEach(() => { delete global.fetch; });

function renderHome() {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<Home />));
  return { container, cleanup: () => { act(() => root.unmount()); container.remove(); } };
}

test('a compact hero without a photo or buttons, then FaB Stats, Dustbunny and OLI Fitness, then GitHub activity', () => {
  const { container, cleanup } = renderHome();
  try {
    expect(container.querySelector('h1').textContent).toBe('I build and run AI products and the infrastructure behind them.');
    expect(container.querySelector('.azoni-hero img')).toBeNull();
    expect(container.querySelector('.azoni-hero .consult-button')).toBeNull();
    expect([...container.querySelectorAll('.azoni-hero .consult-text-link')].map(link => link.textContent.trim())).toEqual(['About me', 'LinkedIn']);
    expect(container.querySelector('.azoni-credentials').textContent).toContain('T-MobileCapital OneCo-founder, OLI Fitness');
    expect(container.querySelector('.azoni-proof-caption').textContent).toContain('as of November 2026');
    expect(container.querySelectorAll('.azoni-proof-list dd')).toHaveLength(4);

    const work = [...container.querySelectorAll('.azoni-work-item')];
    expect(work.map(item => item.getAttribute('href'))).toEqual(['/projects/fab-stats', '/projects/dustbunny', '/projects/oli-fitness']);
    expect(work[1].querySelector('img').getAttribute('src')).toBe('/images/dustbunny-photo.jpg');
    expect(work[2].querySelector('.azoni-work-fact').textContent).toContain('CHI 2017');

    expect(container.querySelector('.azoni-consulting a').getAttribute('href')).toBe('/services');
    expect(container.querySelector('.azoni-background a[href="/resume"]').textContent.trim()).toBe('Resume');
    expect(container.querySelector('.commit-band')).not.toBeNull();
    expect(container.querySelector('a[href="/live"]')).not.toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(GITHUB_STATS_URL);

    expect(container.textContent).not.toMatch(/Want to talk|Get in touch|Book a call/);
    expect(container.textContent).not.toMatch(/[éÉ]/);
    expect(container.textContent).not.toMatch(/work better|any size|Built\. Shipped|Curious by nature|a few lines/i);
    expect(container.textContent.match(/for a client as a principal software engineer|with a client as a principal software engineer/gi)).toHaveLength(1);
  } finally {
    cleanup();
  }
});

test('every project link on Home goes to a listed page, not a redirect', () => {
  const { projects } = jest.requireActual('../data/projects');
  const { container, cleanup } = renderHome();
  try {
    const ids = [...container.querySelectorAll('a[href^="/projects/"]')].map(link => link.getAttribute('href').slice('/projects/'.length));
    expect(ids.length).toBeGreaterThan(0);
    ids.forEach(id => {
      const project = projects.find(p => p.id === id);
      expect(project).toBeDefined();
      expect(project.redirectTo).toBeFalsy();
      expect(['featured', 'other', 'earlier']).toContain(project.visibility);
    });
  } finally {
    cleanup();
  }
});
