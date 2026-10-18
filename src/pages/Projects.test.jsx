import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getDocs } from 'firebase/firestore';
import Projects from './Projects';

let mockHash = '';
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ hash: mockHash }),
}), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);
jest.mock('../config/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ collection: jest.fn(), getDocs: jest.fn(async () => ({ docs: [] })) }));
jest.mock('../hooks/useProductMetrics', () => () => null);

test('visitors can open the collection, combine search with categories, and recover from no results', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  getDocs.mockResolvedValue({ docs: [] });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const click = (element) => act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  try {
    await act(async () => root.render(<Projects />));
    expect(container.querySelectorAll('.projects-story')).toHaveLength(4);
    expect(container.querySelector('details').open).toBe(false);
    const collection = container.querySelector('details');
    collection.scrollIntoView = jest.fn();
    click(container.querySelector('.projects-collection-link'));
    expect(collection.open).toBe(true);
    expect(collection.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    click(container.querySelector('.projects-collection-link'));
    expect(collection.scrollIntoView).toHaveBeenCalledTimes(2);
    const input = container.querySelector('input[type="search"]');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Kinect');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelectorAll('.product-card')).toHaveLength(1);
    expect(container.querySelector('.product-card').textContent).toContain('OLI Fitness');
    click(Array.from(container.querySelectorAll('.projects-filter')).find(button => button.textContent === 'Games'));
    expect(container.querySelector('.projects-status').textContent).toContain('No projects match');
    click(container.querySelector('.projects-status button'));
    expect(input.value).toBe('');
    expect(container.querySelector('.projects-filter[aria-pressed="true"]').textContent).toBe('All');
    expect(container.querySelectorAll('.product-card').length).toBeGreaterThan(20);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test('a direct collection link opens the projects that would otherwise stay hidden', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  getDocs.mockResolvedValue({ docs: [] });
  mockHash = '#project-collection';
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Projects />));
    expect(container.querySelector('#project-collection').open).toBe(true);
    expect(container.querySelectorAll('.product-card').length).toBeGreaterThan(20);
  } finally {
    act(() => root.unmount());
    container.remove();
    mockHash = '';
  }
});
