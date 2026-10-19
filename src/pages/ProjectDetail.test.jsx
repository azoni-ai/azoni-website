import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ProjectDetail from './ProjectDetail';

let mockId = 'row-crew';
let mockState = null;
let mockProjects = [];

jest.mock('react-router-dom', () => ({
  Link: ({ to, state, children, ...props }) => <a href={to} data-return={state?.workReturn} {...props}>{children}</a>,
  useParams: () => ({ id: mockId }),
  useLocation: () => ({ state: mockState }),
}), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);
jest.mock('../hooks/useProjects', () => ({ useProjects: () => ({ getProject: (id) => mockProjects.find((project) => project.id === id), allProjects: mockProjects }) }));
jest.mock('../hooks/useVisitTracker', () => () => {});

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.scrollTo = jest.fn();
  mockId = 'row-crew';
  mockState = null;
  mockProjects = [
    { id: 'row-crew', title: 'Row Crew', tagline: 'Track your rows.' },
    { id: 'bench-only', title: 'Bench Only', tagline: 'Track your lifts.' },
  ];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test('returning to a filtered collection preserves its query through project navigation', () => {
  const workReturn = '/projects?q=row&category=web#project-collection';
  mockState = { workReturn };
  act(() => root.render(<ProjectDetail />));
  expect(container.querySelector('.project-detail-back').getAttribute('href')).toBe(workReturn);
  expect(container.querySelector('.project-detail-all-work').getAttribute('href')).toBe(workReturn);
  expect(container.querySelector('.project-detail-foot-link--next').getAttribute('data-return')).toBe(workReturn);
  expect(container.querySelector('.project-detail-foot-link--next').getAttribute('href')).toBe('/projects/bench-only');
});

test.each(['https://example.com', '/projects/bench-only', '/projects-unrelated'])('an unrelated return path %s falls back to the collection', (workReturn) => {
  mockState = { workReturn };
  act(() => root.render(<ProjectDetail />));
  expect(container.querySelector('.project-detail-back').getAttribute('href')).toBe('/projects#project-collection');
  expect(container.querySelector('h1').textContent).toBe('Row Crew');
  expect(container.querySelector('.project-detail-stack')).toBeNull();
});

test('engineering notes start closed again when opening another project', () => {
  const caseStudy = { sections: [{ heading: 'Architecture', body: 'Technical context.' }] };
  mockProjects = mockProjects.map((project) => ({ ...project, caseStudy }));
  act(() => root.render(<ProjectDetail />));
  container.querySelector('.project-implementation').open = true;
  mockId = 'bench-only';
  act(() => root.render(<ProjectDetail />));
  expect(container.querySelector('.project-implementation').open).toBe(false);
  expect(container.querySelector('h1').textContent).toBe('Bench Only');
});
