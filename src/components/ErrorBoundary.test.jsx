import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary, { CHUNK_RELOAD_KEY } from './ErrorBoundary';

const originalLocation = window.location;
let reload;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.sessionStorage.clear();
  reload = jest.fn();
  delete window.location;
  window.location = { ...originalLocation, reload };
  // React reports every caught error to console.error; these are expected.
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  window.location = originalLocation;
  jest.restoreAllMocks();
});

function Throw({ error }) {
  throw error;
}

function renderWith(error) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<ErrorBoundary><Throw error={error} /></ErrorBoundary>));
  return { container, cleanup: () => { act(() => root.unmount()); container.remove(); } };
}

// The shape webpack gives a page chunk that a newer deploy has removed.
const chunkError = () => Object.assign(new Error('Loading chunk 412 failed.\n(error: https://azoni.ai/static/js/412.8c1f.chunk.js)'), { name: 'ChunkLoadError' });

test('a page chunk from an older deploy reloads the page once and shows nothing meanwhile', () => {
  const { container, cleanup } = renderWith(chunkError());
  try {
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeTruthy();
    expect(container.innerHTML).toBe('');
  } finally {
    cleanup();
  }
});

test('a stylesheet chunk that fails to load reloads too', () => {
  const { cleanup } = renderWith(new Error('Loading CSS chunk 412 failed.\n(/static/css/412.0b2e.chunk.css)'));
  try {
    expect(reload).toHaveBeenCalledTimes(1);
  } finally {
    cleanup();
  }
});

test('a chunk that still fails after the reload shows the error page instead of reloading again', () => {
  window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  const { container, cleanup } = renderWith(chunkError());
  try {
    expect(reload).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Something went wrong');
  } finally {
    cleanup();
  }
});

test('other errors show the error page and never reload', () => {
  const { container, cleanup } = renderWith(new Error('Cannot read properties of undefined'));
  try {
    expect(reload).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
    expect(container.textContent).toContain('Something went wrong');
  } finally {
    cleanup();
  }
});

test('with session storage blocked it shows the error page rather than risk a reload loop', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  const { container, cleanup } = renderWith(chunkError());
  try {
    expect(reload).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Something went wrong');
  } finally {
    cleanup();
  }
});
