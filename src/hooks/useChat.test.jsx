import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getDoc, addDoc } from 'firebase/firestore';
import { useChat } from './useChat';

jest.mock('../config/firebase', () => ({ db: {} }));
jest.mock('../utils/chatSession', () => ({ getJourneyId: () => 'test-journey', getChatSessionId: () => 'test-session' }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), doc: jest.fn(), serverTimestamp: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve()), getDoc: jest.fn(),
}));

let container;
let root;
let current;
let resolveSettings;
let originalFetch;
let originalScrollIntoView;
function Harness() {
  current = useChat();
  return <div role="log"><div ref={current.messagesEndRef} /></div>;
}
const snapshot = model => ({ exists: () => true, data: () => ({ model }) });
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  getDoc.mockImplementation(() => new Promise(resolve => { resolveSettings = resolve; }));
  addDoc.mockResolvedValue({ id: 'mock-log' });
  originalFetch = global.fetch;
  global.fetch = jest.fn(() => Promise.reject(new Error('Unexpected network access')));
  originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = jest.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Harness />));
});
afterEach(() => {
  if (root) act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
  global.fetch = originalFetch;
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

test('an offline settings read releases seeded chat after three seconds and ignores late settings', async () => {
  expect(current.modelReady).toBe(false);
  act(() => jest.advanceTimersByTime(2999));
  expect(current.modelReady).toBe(false);
  act(() => jest.advanceTimersByTime(1));
  expect(current.modelReady).toBe(true);
  expect(current.model).toBe('openai/gpt-5-mini');
  await act(async () => resolveSettings(snapshot('openai/gpt-5-nano')));
  expect(current.model).toBe('openai/gpt-5-mini');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a prompt settings result applies an allowed model and cancels the startup timer', async () => {
  await act(async () => resolveSettings(snapshot('openai/gpt-5-nano')));
  expect(current.model).toBe('openai/gpt-5-nano');
  expect(current.modelReady).toBe(true);
  act(() => jest.runAllTicks());
  expect(jest.getTimerCount()).toBe(0);
});

test('unsupported saved models leave the local default ready to use', async () => {
  await act(async () => resolveSettings(snapshot('unsupported/provider-model')));
  expect(current.model).toBe('openai/gpt-5-mini');
  expect(current.modelReady).toBe(true);
});

test('a visitor model choice wins over a pending default setting', async () => {
  act(() => current.changeModel('openai/gpt-4o-mini'));
  expect(current.modelReady).toBe(true);
  await act(async () => resolveSettings(snapshot('openai/gpt-5-nano')));
  expect(current.model).toBe('openai/gpt-4o-mini');
  act(() => current.changeModel('unsupported/provider-model'));
  expect(current.model).toBe('openai/gpt-4o-mini');
});

test('a conversation started before settings resolve retains its active model', async () => {
  global.fetch.mockImplementation(async url => {
    if (url.endsWith('/chat-stream')) return { ok: false };
    if (url.endsWith('/chat')) return { json: async () => ({ choices: [{ message: { content: 'Mock response' } }] }) };
    throw new Error('Unexpected request: ' + url);
  });
  await act(async () => current.sendMessage('Can you help with our project?'));
  expect(global.fetch).toHaveBeenCalledTimes(2);
  await act(async () => resolveSettings(snapshot('openai/gpt-5-nano')));
  expect(current.model).toBe('openai/gpt-5-mini');
  expect(current.messages.some(message => message.content === 'Mock response')).toBe(true);
});

test('seeded conversation locks the model and scrolls only its own log', async () => {
  const log = container.querySelector('[role="log"]');
  Object.defineProperty(log, 'scrollHeight', { value: 900 });
  expect(log.scrollTop).toBe(0);
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  act(() => current.seedThread([{ role: 'user', content: 'Earlier project question' }], 'hero-session'));
  expect(log.scrollTop).toBe(900);
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  await act(async () => resolveSettings(snapshot('openai/gpt-5-nano')));
  expect(current.model).toBe('openai/gpt-5-mini');
});

test('unmount clears the deadline and safely ignores a later settings result', async () => {
  expect(jest.getTimerCount()).toBe(1);
  act(() => root.unmount());
  root = null;
  expect(jest.getTimerCount()).toBe(0);
  await act(async () => resolveSettings(snapshot('openai/gpt-5-nano')));
  expect(current.modelReady).toBe(false);
  expect(global.fetch).not.toHaveBeenCalled();
});
