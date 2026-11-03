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

const JS_CHUNK = 'https://azoni.ai/static/js/412.8c1f.chunk.js';
const CSS_CHUNK = 'https://azoni.ai/static/css/412.0b2e.chunk.css';

// The shapes webpack 5 and mini-css-extract-plugin give a chunk that a newer
// deploy has removed.
const chunkError = (url = JS_CHUNK) => Object.assign(new Error(`Loading chunk 412 failed.\n(error: ${url})`), { name: 'ChunkLoadError', type: 'error', request: url });
const cssChunkError = () => Object.assign(new Error(`Loading CSS chunk 412 failed.\n(error: ${CSS_CHUNK})`), { name: 'ChunkLoadError', code: 'CSS_CHUNK_LOAD_FAILED', type: 'error', request: CSS_CHUNK });
const rememberReload = (chunk, msAgo) => window.sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ chunk, at: Date.now() - msAgo }));
const MINUTE = 60 * 1000;

test('a page chunk from an older deploy reloads the page once and shows nothing meanwhile', () => {
  const { container, cleanup } = renderWith(chunkError());
  try {
    expect(reload).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)).chunk).toBe(JS_CHUNK);
    expect(container.innerHTML).toBe('');
  } finally {
    cleanup();
  }
});

test('a stylesheet chunk that fails to load reloads too', () => {
  const { cleanup } = renderWith(cssChunkError());
  try {
    expect(reload).toHaveBeenCalledTimes(1);
  } finally {
    cleanup();
  }
});

test('an error that only says a chunk failed to load reloads too', () => {
  const { cleanup } = renderWith(new Error('Loading chunk 412 failed.'));
  try {
    expect(reload).toHaveBeenCalledTimes(1);
  } finally {
    cleanup();
  }
});

test('the same chunk failing again right after the reload shows the error page instead of reloading', () => {
  rememberReload(JS_CHUNK, 2000);
  const { container, cleanup } = renderWith(chunkError());
  try {
    expect(reload).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Something went wrong');
  } finally {
    cleanup();
  }
});

test('the same chunk failing again minutes later, as on a stalled connection, does not reload again', () => {
  rememberReload(JS_CHUNK, 3 * MINUTE);
  const { container, cleanup } = renderWith(chunkError());
  try {
    expect(reload).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Something went wrong');
  } finally {
    cleanup();
  }
});

test('a tab left open across a later deploy reloads again, because the chunk URL changed', () => {
  rememberReload('https://azoni.ai/static/js/412.0000.chunk.js', MINUTE);
  const { cleanup } = renderWith(chunkError());
  try {
    expect(reload).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)).chunk).toBe(JS_CHUNK);
  } finally {
    cleanup();
  }
});

test('the same chunk may reload once more after ten minutes, and a value from an older build is ignored', () => {
  rememberReload(JS_CHUNK, 11 * MINUTE);
  const first = renderWith(chunkError());
  first.cleanup();
  window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  const second = renderWith(chunkError());
  second.cleanup();
  expect(reload).toHaveBeenCalledTimes(2);
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
