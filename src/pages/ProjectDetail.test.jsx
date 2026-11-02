import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ProjectDetail, { botReachLine } from './ProjectDetail';
import { projects } from '../data/projects';
import { bookingCta } from '../data/consulting';

let mockId = 'fab-stats';
let mockProjects = [];
let mockReach = null;

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  Navigate: ({ to }) => <p data-navigate={to} />,
  useParams: () => ({ id: mockId }),
}), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
// React hoists a rendered <meta> into document.head, so the mock marks noindex with a plain element.
jest.mock('../components/Seo', () => ({ noIndex }) => (noIndex ? <span data-robots="noindex" /> : null));
jest.mock('../hooks/useProjects', () => ({ useProjects: () => ({ getProject: (id) => mockProjects.find((project) => project.id === id), allProjects: mockProjects }) }));
jest.mock('../hooks/useVisitTracker', () => () => {});
jest.mock('../hooks/useProductMetrics', () => ({ __esModule: true, default: () => null, useBotReach: () => mockReach }));

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.scrollTo = jest.fn();
  mockId = 'fab-stats';
  mockProjects = projects;
  mockReach = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (id) => {
  mockId = id;
  act(() => root.render(<ProjectDetail />));
};
const headings = () => Array.from(container.querySelectorAll('.project-detail-block-heading')).map((node) => node.textContent);

test('a featured page shows its case study openly, with facts, dated numbers and a closing ask', () => {
  render('fab-stats');
  expect(container.querySelector('details')).toBeNull();
  expect(headings()).toEqual(expect.arrayContaining(['The problem', 'Approach and key decisions', 'The Discord bot', 'Outcomes', 'What I’d do differently']));
  const facts = Array.from(container.querySelectorAll('.project-facts dt')).map((node) => node.textContent);
  expect(facts).toEqual(['Dates', 'Role', 'Status', 'Stack', 'Links']);
  expect(container.querySelectorAll('.project-facts-stack li').length).toBeGreaterThan(1);
  expect(container.querySelector('.project-facts').textContent).toContain('2023 – present');
  expect(container.querySelector('.project-proof').textContent).toContain('As of November 2026.');
  expect(container.querySelector('.project-proof').textContent).toContain('3,898');
  expect(container.querySelector('.project-detail-closing h2').textContent).toBe('Need something like this?');
  expect(container.querySelector('.project-detail-closing .project-detail-cta').getAttribute('href')).toBe(bookingCta.to);
  expect(container.querySelector('[data-robots="noindex"]')).toBeNull();
});

test('the Discord line falls back to dated figures and prefers a live report', () => {
  render('fab-stats');
  expect(container.textContent).toContain('As of November 2026, the bot is in 12 servers with 1,309 members.');
  expect(container.textContent).not.toContain('20+');
  expect(botReachLine(projects[0].discordBot, { servers: 14, members: 1500, reportedAt: '2026-12-03T10:00:00Z' })).toBe('As of December 2026, the bot is in 14 servers with 1,500 members.');
  expect(botReachLine(projects[0].discordBot, { servers: 1, members: null, reportedAt: '2026-12-03T10:00:00Z' })).toBe('As of December 2026, the bot is in 1 server.');
});

test('prev and next stay inside the featured set', () => {
  render('fab-stats');
  expect(container.querySelector('.project-detail-foot-link--next').getAttribute('href')).toBe('/projects/azoni-ai');
  render('row-crew');
  expect(container.querySelector('.project-detail-foot-link').getAttribute('href')).toBe('/projects/old-ways-today');
  expect(container.querySelector('.project-detail-foot-link--next')).toBeNull();
});

test('the agent platform links to the assistant only, not back to this site or to /moltbook', () => {
  render('azoni-ai');
  const hrefs = Array.from(container.querySelectorAll('.project-facts-links a')).map((link) => link.getAttribute('href'));
  expect(hrefs).toEqual(['/chat']);
  expect(headings()).toEqual(expect.arrayContaining(['The assistant and its grounding', 'A shared tool API', 'The Moltbook agent']));
  expect(container.textContent).not.toMatch(/on-the-fly|every weekday|MCP server/i);
});

test('merged pages redirect to the page that holds their content', () => {
  render('azoni-mcp');
  expect(container.querySelector('[data-navigate]').getAttribute('data-navigate')).toBe('/projects/azoni-ai');
  render('meeplematch');
  expect(container.querySelector('[data-navigate]').getAttribute('data-navigate')).toBe('/projects/launchpad');
  render('fab-stats-bot');
  expect(container.querySelector('[data-navigate]').getAttribute('data-navigate')).toBe('/projects/fab-stats');
});

test('Launchpad shows the merged apps as a gallery', () => {
  render('launchpad');
  const items = Array.from(container.querySelectorAll('.project-gallery-item h3')).map((node) => node.textContent);
  expect(items).toEqual(['MeepleMatch', 'Benchmark', 'RepMatch', 'MacroMarket']);
  expect(container.querySelector('.project-gallery-note a').getAttribute('href')).toBe('/projects/pyroguard');
  expect(container.textContent).not.toMatch(/one prompt|8 shipped|Eight apps/);
  expect(container.querySelector('a[href="https://launchpad-console.netlify.app"]')).toBeNull();
  expect(container.querySelector('.project-detail-closing')).toBeNull();
});

test('the gallery order holds however the project list is sorted', () => {
  const { getMergedInto, projects } = jest.requireActual('../data/projects');
  const byTitle = [...projects].sort((a, b) => a.title.localeCompare(b.title));
  expect(getMergedInto('launchpad', byTitle).map((project) => project.title)).toEqual(['MeepleMatch', 'Benchmark', 'RepMatch', 'MacroMarket']);
});

test('hobby projects skip the consulting close', () => {
  render('spell-brigade');
  expect(container.querySelector('.project-detail-closing')).toBeNull();
  render('bench-only');
  expect(container.querySelector('.project-detail-closing')).not.toBeNull();
});

test('unlisted pages still render, marked noindex, without the outbound link or prev and next', () => {
  render('dayrun');
  expect(container.querySelector('h1').textContent).toBe('Daily');
  expect(container.querySelector('[data-robots="noindex"]')).not.toBeNull();
  expect(container.querySelector('a[href^="https://dayrun"]')).toBeNull();
  expect(container.querySelector('.project-detail-foot-link')).toBeNull();
  expect(container.querySelector('.project-detail-closing')).toBeNull();
});

test('a missing project is a noindex not-found page', () => {
  render('does-not-exist');
  expect(container.querySelector('h1').textContent).toBe('Project not found.');
  expect(container.querySelector('[data-robots="noindex"]')).not.toBeNull();
});

test('earlier work shows its dates and photo', () => {
  render('dustbunny');
  expect(container.querySelector('.project-facts').textContent).toContain('Sep 2021 – Jun 2022');
  expect(container.querySelector('.project-detail-preview img').getAttribute('src')).toBe('/images/dustbunny-photo.jpg');
  expect(container.textContent).not.toContain('24/7');
});
