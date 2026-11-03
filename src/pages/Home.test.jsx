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

test('a compact hero, GitHub activity right under it, then BumbleJax, FaB Stats and Old Ways Today', () => {
  const { container, cleanup } = renderHome();
  try {
    expect(container.querySelector('h1').textContent).toBe('I build software people use, and I keep it running.');
    expect(container.querySelector('.azoni-hero-intro').textContent).toBe('I’m Charlton Smith, a principal software engineer in the Seattle area. Most of my work is in AI, from client platforms to products I run myself through Azoni.');
    expect(container.querySelector('.azoni-hero img')).toBeNull();
    expect(container.querySelector('.azoni-hero .consult-button')).toBeNull();
    expect([...container.querySelectorAll('.azoni-hero .consult-text-link')].map(link => link.textContent.trim())).toEqual(['About me', 'LinkedIn']);
    expect(container.querySelector('.azoni-credentials').textContent).toContain('T-MobileCapital OneCo-founder, OLI Fitness');

    // The GitHub band replaced the FaB Stats counts and comes straight after the hero.
    const blocks = [...container.querySelector('.home-consulting').children];
    expect(blocks[0].querySelector('.azoni-hero')).not.toBeNull();
    expect(blocks[1].classList.contains('azoni-telemetry')).toBe(true);
    expect(blocks[1].querySelector('.commit-band')).not.toBeNull();
    expect(container.querySelector('.azoni-proof')).toBeNull();
    expect(container.textContent).not.toMatch(/players on FaB Stats|matches tracked on FaB Stats/);

    expect(container.querySelector('#selected-work-heading').textContent).toBe('What I’ve built and maintained');
    const features = [...container.querySelectorAll('.azoni-work-feature')];
    expect(features.map(card => card.querySelector('h3').textContent)).toEqual(['BumbleJax', 'FaB Stats', 'Old Ways Today']);
    expect(features.map(card => card.getAttribute('href'))).toEqual(['https://www.bumblejax.com/', '/projects/fab-stats', '/projects/old-ways-today']);
    expect(features[0].getAttribute('target')).toBe('_blank');
    expect(features[0].querySelector('img').getAttribute('src')).toBe('/images/work-bumblejax.jpg');
    expect(features.map(card => [...card.querySelectorAll('.azoni-work-stats dd')].map(dd => dd.textContent)))
      .toEqual([['15K+', '90K+', '99%'], ['3,898', '1.6M', '793'], ['265', '22', '5,784']]);
    expect(features.map(card => card.querySelector('.azoni-work-source').textContent))
      .toEqual(['Figures from bumblejax.com.', 'As of November 2026.', 'As of November 2026.']);
    expect(features.map(card => card.classList.contains('azoni-work-feature--flip'))).toEqual([false, true, false]);
    expect(features.every(card => card.querySelector('img'))).toBe(true);

    expect(container.querySelector('.azoni-consulting a').getAttribute('href')).toBe('/services');
    expect(container.querySelector('.azoni-background a[href="/resume"]').textContent.trim()).toBe('Resume');
    expect(container.querySelector('.commit-band')).not.toBeNull();
    expect(container.querySelector('a[href="/live"]')).not.toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(GITHUB_STATS_URL);

    expect(container.textContent).not.toMatch(/Want to talk|Get in touch|Book a call/);
    expect(container.textContent).not.toMatch(/[éÉ]/);
    expect(container.textContent).not.toMatch(/work better|any size|Built\. Shipped|Curious by nature|a few lines/i);
    expect(container.textContent).not.toMatch(/for a client as a principal software engineer|with a client as a principal software engineer/i);
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
