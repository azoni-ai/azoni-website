import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FloatingAssistant from './FloatingAssistant';

let mockPathname = '/';
const mockMount = jest.fn();
const mockUnmount = jest.fn();
const mockRequest = jest.fn();

jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mockPathname }) }), { virtual: true });
jest.mock('./home/HeroChatPrompt', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function MockAssistantChat({ autoFocus }) {
      const [draft, setDraft] = React.useState('');
      const [messages, setMessages] = React.useState([]);
      React.useEffect(() => { mockMount(); return () => mockUnmount(); }, []);
      return <form onSubmit={event => {
        event.preventDefault();
        mockRequest(draft);
        setMessages(previous => [...previous, draft]);
        setDraft('');
      }}>
        <label htmlFor="test-assistant-input">Question</label>
        <input id="test-assistant-input" autoFocus={autoFocus} value={draft} onChange={event => setDraft(event.target.value)} />
        <button type="submit">Send question</button>
        <div role="log">{messages.map((message, index) => <p key={index}>{message}</p>)}</div>
      </form>;
    },
  };
});

let container;
let root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockPathname = '/';
  mockMount.mockClear();
  mockUnmount.mockClear();
  mockRequest.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() { await act(async () => { root.render(<FloatingAssistant />); }); }
async function click(element) { await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); }
function launcher() { return container.querySelector('.assistant-launcher'); }
function panel() { return container.querySelector('[role="dialog"]'); }
function type(value) {
  const input = container.querySelector('input');
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

test('starts as a single launcher and does not mount chat or send a request until requested', async () => {
  await render();
  expect(launcher().getAttribute('aria-label')).toBe('Ask Azoni AI');
  expect(launcher().getAttribute('aria-expanded')).toBe('false');
  expect(panel()).toBeNull();
  expect(mockMount).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();

  await click(launcher());
  expect(mockMount).toHaveBeenCalledTimes(1);
  expect(panel().hidden).toBe(false);
  expect(launcher().getAttribute('aria-expanded')).toBe('true');
  expect(launcher().getAttribute('aria-controls')).toBe(panel().id);
  expect(panel().getAttribute('aria-labelledby')).toBe('azoni-assistant-title');
  expect(document.activeElement).toBe(container.querySelector('input'));
  expect(mockRequest).not.toHaveBeenCalled();
});

test('close and reopen retain the conversation and unsent draft without remounting chat', async () => {
  await render();
  await click(launcher());
  type('Could AI help my business?');
  await click(container.querySelector('button[type="submit"]'));
  type('Here is a follow-up draft');

  await click(container.querySelector('[aria-label="Close assistant"]'));
  expect(panel().hidden).toBe(true);
  expect(document.activeElement).toBe(launcher());
  expect(mockUnmount).not.toHaveBeenCalled();

  await click(launcher());
  expect(panel().hidden).toBe(false);
  expect(container.querySelector('input').value).toBe('Here is a follow-up draft');
  expect(container.querySelector('[role="log"]').textContent).toBe('Could AI help my business?');
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(mockMount).toHaveBeenCalledTimes(1);
});

test('Escape closes the panel and restores keyboard focus to the launcher', async () => {
  await render();
  await click(launcher());
  container.querySelector('input').focus();
  act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  expect(panel().hidden).toBe(true);
  expect(launcher().getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(launcher());
});

test('public-page navigation closes the panel but preserves its draft and conversation', async () => {
  mockPathname = '/services';
  await render();
  await click(launcher());
  type('What has Charlton built?');
  await click(container.querySelector('button[type="submit"]'));
  type('An unsent follow-up');

  mockPathname = '/about';
  await render();
  expect(panel().hidden).toBe(true);
  expect(launcher().getAttribute('aria-expanded')).toBe('false');
  expect(mockUnmount).not.toHaveBeenCalled();
  await click(launcher());
  expect(container.querySelector('input').value).toBe('An unsent follow-up');
  expect(container.querySelector('[role="log"]').textContent).toBe('What has Charlton built?');
  expect(mockMount).toHaveBeenCalledTimes(1);
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

test.each(['/admin', '/admin/invoices', '/chat', '/chat/', '/game', '/game/'])('does not expose the launcher or panel on %s', async pathname => {
  mockPathname = pathname;
  await render();
  expect(launcher()).toBeNull();
  expect(panel()).toBeNull();
  expect(mockMount).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();
});

test('entering the admin from an open assistant removes all public chat controls', async () => {
  await render();
  await click(launcher());
  mockPathname = '/admin';
  await render();
  expect(container.childElementCount).toBe(0);
  expect(mockUnmount).toHaveBeenCalledTimes(1);
  mockPathname = '/projects';
  await render();
  expect(launcher().getAttribute('aria-expanded')).toBe('false');
  expect(panel().hidden).toBe(true);
});
