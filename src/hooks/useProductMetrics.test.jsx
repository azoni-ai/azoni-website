import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useProductMetrics from './useProductMetrics';

jest.mock('../data/sites', () => ({ SITES: [
  { id: 'observed-up', boardProjectId: 'up', url: 'https://example.com' },
  { id: 'observed-down', boardProjectId: 'down', url: 'https://example.com' },
  { id: 'observed-degraded', boardProjectId: 'degraded', url: 'https://example.com' },
  { id: 'unobserved', boardProjectId: 'unobserved', url: 'https://example.com' },
  { id: 'unknown', boardProjectId: 'unknown', url: 'https://example.com' },
  { id: 'unexpected', boardProjectId: 'unexpected', url: 'https://example.com' },
] }));

test('shows observed health and real traffic without treating a configured URL as healthy', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const originalFetch = global.fetch;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let result;
  function Harness() { result = useProductMetrics(); return null; }
  global.fetch = jest.fn(async (url) => ({
    ok: true, headers: { get: () => 'application/json' },
    json: async () => url.endsWith('hub-summary') ? {
      updatedAt: '2026-10-17T12:00:00Z',
      sites: [
        { id: 'observed-up', health: { status: 'up' }, traffic: { d7: 42, d30: 120 } },
        { id: 'observed-down', health: { status: 'down' } },
        { id: 'observed-degraded', health: { status: 'degraded' } },
        { id: 'unknown', health: { status: 'unknown' } },
        { id: 'unexpected', health: { status: 'unchecked' } },
      ],
    } : {},
  }));
  try {
    await act(async () => root.render(<Harness />));
    expect(result.map.up.status).toBe('up');
    expect(result.map.down.status).toBe('down');
    expect(result.map.degraded.status).toBe('degraded');
    expect(result.map.unobserved.status).toBeNull();
    expect(result.map.unknown.status).toBeNull();
    expect(result.map.unexpected.status).toBeNull();
    expect(result.map.up.visitors7d).toBe(42);
    expect(result.map.up.visitors30d).toBe(120);
    expect(result.map.unobserved.visitors7d).toBeNull();
    expect(result.updatedAt).toBe('2026-10-17T12:00:00Z');
  } finally {
    act(() => root.unmount());
    container.remove();
    global.fetch = originalFetch;
  }
});
