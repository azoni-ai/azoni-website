import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Chat from './Chat';
import { useChat } from '../hooks/useChat';

const mockNavigate = jest.fn();
let mockLocation = { pathname: '/chat', search: '', state: null };
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../components/Seo', () => () => null);
jest.mock('../hooks/useVisitTracker', () => () => {});
jest.mock('../hooks/useChat', () => ({
  AVAILABLE_MODELS: [{ id: 'test-model', name: 'Test model' }],
  useChat: jest.fn(),
}));

let container;
let root;
let chat;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockLocation = { pathname: '/chat', search: '', state: null };
  mockNavigate.mockClear();
  chat = {
    messages: [{ role: 'assistant', content: 'How can I help with your project?', rag: null }],
    input: '', setInput: jest.fn(), isLoading: false, chatMode: 'professional',
    model: 'test-model', modelReady: true, messagesEndRef: { current: null },
    sendMessage: jest.fn(), seedThread: jest.fn(), changeMode: jest.fn(), changeModel: jest.fn(),
  };
  useChat.mockImplementation(() => chat);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
function render() { act(() => root.render(<Chat />)); }
function button(label) { return Array.from(container.querySelectorAll('button')).find(item => item.textContent.includes(label)); }
function click(element) { act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true }))); }

test('keeps Azoni AI visible with varied exploration and direct contact', () => {
  render();
  expect(container.querySelector('h1').textContent.trim()).toBe('Azoni AI');
  expect(container.querySelectorAll('.chat-suggestion')).toHaveLength(4);
  expect(container.querySelector('.chat-direct-links a').href).toBe('mailto:charlton@azoni.ai');
  expect(container.querySelector('#chat-model')).toBeNull();
  expect(container.querySelector('.chat-architecture')).not.toBeNull();
  expect(container.querySelector('textarea').getAttribute('aria-label')).toBe('Your question or idea');
  expect(container.querySelector('.chat-disclaimer').textContent).toContain('aren’t sent as email');
  expect(button('Model & tone').textContent).toContain('Test model');
  click(button('What could AI improve in my business?'));
  expect(chat.sendMessage).toHaveBeenCalledWith('What could AI improve in my business?');
});

test('optional settings have labelled controls and stay out of the default conversation', () => {
  render();
  click(button('Model & tone'));
  expect(button('Model & tone').getAttribute('aria-expanded')).toBe('true');
  expect(container.querySelector('label[for="chat-model"]').textContent).toBe('Model');
  expect(container.querySelector('label[for="chat-tone"]').textContent).toBe('Tone');
});

test('visitors can explore the pipeline without sending a paid chat request', () => {
  render();
  click(button('See how Azoni AI works'));
  expect(button('See how Azoni AI works').getAttribute('aria-expanded')).toBe('true');
  expect(container.querySelector('.chat-pipeline-explanation').textContent).toContain('Curated background');
  click(button('Your question'));
  expect(button('Your question').getAttribute('aria-pressed')).toBe('true');
  expect(container.querySelector('.chat-pipeline-explanation').textContent).toContain('Follow-up questions');
  expect(chat.sendMessage).not.toHaveBeenCalled();
});

test('topic selection and more ideas restore browsable questions without automatic sends', () => {
  render();
  click(button('Charlton & his work'));
  expect(button('Charlton & his work').getAttribute('aria-pressed')).toBe('true');
  expect(container.querySelector('.chat-suggestions').textContent).toContain('college hackathons');
  const first = container.querySelector('.chat-suggestion').textContent;
  click(container.querySelector('[aria-label="More question ideas"]'));
  expect(container.querySelector('.chat-suggestion').textContent).not.toBe(first);
  expect(chat.sendMessage).not.toHaveBeenCalled();
});

test('submits a multiline project brief and prevents duplicate sends while loading', () => {
  chat.input = 'We need a knowledge assistant.\nOur content lives in a private help center.';
  render();
  act(() => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(chat.sendMessage).toHaveBeenCalledWith(chat.input);
  chat.isLoading = true;
  render();
  expect(container.querySelector('textarea').disabled).toBe(true);
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  act(() => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(chat.sendMessage).toHaveBeenCalledTimes(1);
});

test('keeps source information available with technical details collapsed', () => {
  chat.messages.push({ role: 'user', content: 'What can he build?' }, {
    role: 'assistant', content: 'Relevant product work.',
    rag: { intent: 'projects', topChunks: [{ title: 'EmbedRoute' }], retrievalMethod: 'keyword' },
    usage: { modelName: 'Test model', total_tokens: 50, totalCost: '0.001' },
  });
  render();
  const sources = container.querySelector('.chat-answer-sources');
  expect(sources.open).toBe(false);
  expect(sources.textContent).toContain('EmbedRoute');
  expect(container.querySelector('.chat-technical-details').open).toBe(false);
  expect(container.querySelectorAll('.chat-suggestion')).toHaveLength(2);
});

test('waits for model selection before sending a shared question, then sends only once', () => {
  mockLocation = { pathname: '/chat', search: '?q=What%20services%3F', state: null };
  chat.modelReady = false;
  render();
  expect(chat.sendMessage).not.toHaveBeenCalled();
  expect(container.querySelector('textarea').disabled).toBe(true);
  chat.modelReady = true;
  render();
  expect(chat.sendMessage).toHaveBeenCalledWith('What services?');
  expect(mockNavigate).toHaveBeenCalledWith('/chat', { replace: true });
  render();
  expect(chat.sendMessage).toHaveBeenCalledTimes(1);
});
