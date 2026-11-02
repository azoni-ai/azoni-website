import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Blog from './Blog';
import BlogPost from './BlogPost';

let mockSlug = '';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  Navigate: ({ to }) => <p data-navigate={to} />,
  useParams: () => ({ slug: mockSlug }),
}), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
// React hoists a rendered <meta> into document.head, so the mock marks noindex with a plain element.
jest.mock('../components/Seo', () => ({ noIndex }) => (noIndex ? <span data-robots="noindex" /> : null));
jest.mock('../hooks/useVisitTracker', () => () => {});

const NOTE = {
  slug: '2026-11-01-fab-stats-season-filters', title: 'FaB Stats: season filters', excerpt: 'Adds season filters to FaB Stats.',
  tags: ['build-notes'], commitDate: '2026-11-01', publishedAt: '2026-11-01T17:00:00.000Z',
  sourceRepos: ['azoni/fab-stats'], commitCount: 1, generator: 'model',
};
const reply = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.fetch;
});

const render = async (element) => { await act(async () => root.render(element)); };

test('/blog lists automated build notes from the blog-posts function and stays indexable', async () => {
  global.fetch = jest.fn(() => reply({ posts: [NOTE] }));
  await render(<Blog />);
  expect(global.fetch).toHaveBeenCalledWith('/.netlify/functions/blog-posts');
  expect(container.querySelector('h1').textContent).toBe('Build notes');
  expect(container.querySelector('.blog-page-tagline').textContent).toMatch(/generated each day from public commits/);
  expect(container.querySelector('.blog-page-tagline').textContent).toMatch(/a language model writes the title/);
  const card = container.querySelector('.blog-page-card');
  expect(card.getAttribute('href')).toBe(`/blog/${NOTE.slug}`);
  expect(card.textContent).toContain('November 1, 2026');
  expect(card.querySelector('.blog-ai-label').textContent).toBe('Automated · summary written by a language model');
  expect(card.textContent).toContain('FaB Stats');
  expect(container.querySelector('[data-robots="noindex"]')).toBeNull();
});

test('/blog says so when the notes cannot load', async () => {
  global.fetch = jest.fn(() => reply({}, 503));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await render(<Blog />);
  expect(container.textContent).toContain('The build notes could not load.');
  console.error.mockRestore();
});

test('a build note shows its commits and sources and is kept out of search results', async () => {
  mockSlug = NOTE.slug;
  const content = '## FaB Stats\n\nAdds season filters.\n\n- [abc1234](https://github.com/azoni/fab-stats/commit/abc1234abc1234abc1234abc1234abc1234abcd) Add season filters';
  global.fetch = jest.fn(() => reply({ post: { ...NOTE, content } }));
  await render(<BlogPost />);
  expect(global.fetch).toHaveBeenCalledWith(`/.netlify/functions/blog-posts?slug=${NOTE.slug}`);
  expect(container.querySelector('[data-robots="noindex"]')).not.toBeNull();
  expect(container.querySelector('.blog-post-title').textContent).toBe(NOTE.title);
  expect(container.querySelector('.blog-post-content a').getAttribute('href')).toMatch(/^https:\/\/github\.com\/azoni\/fab-stats\/commit\//);
  const sources = container.querySelector('.blog-post-sources');
  expect(sources.querySelector('a').getAttribute('href')).toBe('https://github.com/azoni/fab-stats');
  expect(sources.textContent).toContain('FaB Stats');
  expect(container.querySelector('.blog-ai-label').textContent).toBe('Automated · summary written by a language model');
  expect(container.querySelector('.secondary-notice').textContent).toMatch(/A language model wrote this note/);
});

test('a commit-list note says no model wrote it', async () => {
  mockSlug = NOTE.slug;
  global.fetch = jest.fn(() => reply({ post: { ...NOTE, generator: 'template', content: '- [abc1234](https://github.com/azoni/fab-stats/commit/abc1234abc1234abc1234abc1234abc1234abcd) Add season filters' } }));
  await render(<BlogPost />);
  expect(container.querySelector('.blog-ai-label').textContent).toBe('Automated · commit list');
  expect(container.querySelector('.secondary-notice').textContent).not.toMatch(/language model/);
});

test('retired persona posts redirect to /blog without a fetch', async () => {
  mockSlug = '2026-09-28-leveling-up-with-usurp-the-shadow-throne-in-fab-stats';
  global.fetch = jest.fn();
  await render(<BlogPost />);
  expect(container.querySelector('[data-navigate]').getAttribute('data-navigate')).toBe('/blog');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('an unpublished note is a noindex not-found page', async () => {
  mockSlug = '2026-10-31-held-back-note';
  global.fetch = jest.fn(() => reply({ error: 'Not found' }, 404));
  await render(<BlogPost />);
  expect(container.querySelector('h1').textContent).toBe('This note is not published');
  expect(container.querySelector('[data-robots="noindex"]')).not.toBeNull();
});
