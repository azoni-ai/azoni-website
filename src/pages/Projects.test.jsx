import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'fs';
import path from 'path';
import Projects from './Projects';
import { projects, VISIBILITIES, getWorkGroups } from '../data/projects';
import { selectedWorkIds, workStories } from '../data/workStories';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);
jest.mock('../config/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ collection: jest.fn(), getDocs: jest.fn(async () => ({ docs: [] })) }));

let container;
let root;

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<Projects />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const titles = (selector) => Array.from(container.querySelectorAll(selector)).map((node) => node.textContent);

test('FaB Stats leads the featured case studies, in the curated order', () => {
  expect(container.querySelector('h1').textContent).toBe('Products I build and run.');
  const stories = Array.from(container.querySelectorAll('.projects-story'));
  expect(stories.map((story) => story.querySelector('.projects-story-main').getAttribute('href'))).toEqual(selectedWorkIds.map((id) => '/projects/' + id));
  expect(stories[0].querySelector('h3').textContent).toBe('FaB Stats');
  expect(stories[0].querySelector('.projects-story-proof').textContent).toBe('3,898 players · 1,634,956 matches tracked · 793 GEM Exporter users, as of November 2026');
  expect(stories[0].textContent).not.toMatch(/helps Flesh and Blood players/);
});

test('the page has no telemetry, project count, search or filters', () => {
  const text = container.textContent;
  expect(container.querySelector('input[type="search"]')).toBeNull();
  expect(container.querySelector('.projects-filter')).toBeNull();
  expect(container.querySelector('details')).toBeNull();
  expect(text).not.toMatch(/visitors \/ 7d|last active|full collection|chatbot requests|20\+/i);
  expect(container.querySelector('[aria-label^="Status:"]')).toBeNull();
});

test('other and earlier work are compact lists, and unlisted or merged entries stay off the page', () => {
  expect(titles('#other-work .product-card-title')).toEqual(['Bench Only', 'EmbedRoute', 'Spell Brigade', 'Launchpad', 'PyroGuard', 'TCGDoku']);
  expect(titles('#earlier-work .product-card-title')).toEqual(['Dustbunny', 'OLI Fitness', 'HashMaps']);
  expect(container.querySelector('#earlier-work').textContent).toContain('Sep 2021 – Jun 2022');
  const tcgdoku = Array.from(container.querySelectorAll('#other-work .product-card')).find((card) => card.textContent.includes('TCGDoku'));
  expect(tcgdoku.getAttribute('href')).toBe('https://tcgdoku.netlify.app');
  const text = container.textContent;
  ['Daily', 'Crypto Tax 2025', 'Polymarket', 'Black Diamond', 'Image Pipeline', 'Scryfall AI', 'Azoni MCP Server', 'Moltbook Agent', 'MeepleMatch', 'RepMatch', 'MacroMarket', 'FaB Stats Discord Bot'].forEach((title) => {
    expect(text).not.toContain(title);
  });
});

test('the at-work strip links to experience and the résumé', () => {
  const links = Array.from(container.querySelectorAll('.projects-atwork a')).map((link) => link.getAttribute('href'));
  expect(links).toEqual(['/about#experience', '/resume']);
  expect(container.querySelector('.projects-atwork').textContent).not.toMatch(/open to|looking for|job/i);
});

describe('project data', () => {
  const redirects = fs.readFileSync(path.join(__dirname, '../../public/_redirects'), 'utf8').split(/\r?\n/);
  const catchAll = redirects.findIndex((line) => line.startsWith('/*'));

  test('every project keeps its entry and has a known visibility', () => {
    expect(projects).toHaveLength(26);
    projects.forEach((project) => expect(VISIBILITIES).toContain(project.visibility));
    expect(getWorkGroups().featured.map((project) => project.id)).toEqual(selectedWorkIds);
    selectedWorkIds.forEach((id) => expect(workStories[id]?.summary).toBeTruthy());
  });

  test('every moved page has a 301 above the SPA catch-all', () => {
    const moved = projects.filter((project) => project.redirectTo);
    expect(moved.map((project) => project.id).sort()).toEqual(['azoni-mcp', 'benchmark', 'fab-stats-bot', 'macromarket', 'meeplematch', 'moltbook-agent', 'repmatch', 'tcgdoku']);
    moved.forEach((project) => {
      const index = redirects.findIndex((line) => line.split(/\s+/)[0] === '/projects/' + project.id);
      expect(index).toBeGreaterThan(-1);
      expect(index).toBeLessThan(catchAll);
      expect(redirects[index].split(/\s+/).slice(1, 3)).toEqual([project.redirectTo, '301']);
    });
  });

  test('disproved claims are gone from public copy', () => {
    const listed = projects.filter((project) => project.visibility !== 'merged');
    const copy = JSON.stringify([listed, workStories]);
    expect(copy).not.toMatch(/20\+ servers|2,900\+|1\.2M\+|on-the-fly knowledge|every weekday|wraps an LLM|8 shipped|Eight apps shipped|one prompt|SedonaOffice, the legacy|24\/7 uptime|helps Flesh and Blood players/);
  });
});
