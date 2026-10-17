/* eslint-disable no-script-url -- These are rejection fixtures and never navigation destinations. */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BusinessAccountsSection from './BusinessAccountsSection';
import {
  BUSINESS_ACCOUNT_CATEGORIES, SEED_BUSINESS_ACCOUNTS, createSeedBusinessAccounts,
  safeAccountUrl, validateBusinessAccount,
} from './business-accounts-lib';

const account = (extra = {}) => ({ id: 'example', name: 'Example account', url: 'https://example.com/login', username: '', category: 'other', notes: '', pinned: false, ...extra });

test('only HTTPS account destinations are accepted and canonicalized', () => {
  expect(safeAccountUrl('HTTPS://EXAMPLE.COM:443/login?next=%2Fhome#signin')).toBe('https://example.com/login?next=%2Fhome#signin');
  for (const value of [null, {}, 42, '', 'http://example.com', '//example.com', '/login', 'javascript:alert(1)', 'data:text/html,test', 'file:///tmp/example', 'https:/example.com', 'https:///example.com', 'https:////example.com', 'https://', 'https://:443/login']) {
    expect(safeAccountUrl(value)).toBeNull();
  }
});

test('rejects userinfo, whitespace, backslashes and URL parser repair cases', () => {
  for (const value of ['https://user:secret@example.com', 'https://user@example.com', 'https://@example.com', 'https://:secret@example.com', 'https://example.com@elsewhere.test', ' https://example.com', 'https://example.com ', 'https://example.com/with space', 'https://example.com\n/route', 'https://example.com\t/route', 'https://example.com\u0000/', 'https://example.com\\elsewhere.test', 'https:\\example.com']) {
    expect(safeAccountUrl(value)).toBeNull();
  }
});

test('enforces raw and canonical URL limits', () => {
  const prefix = 'https://example.com/';
  expect(safeAccountUrl(prefix + 'a'.repeat(2048 - prefix.length))).not.toBeNull();
  expect(safeAccountUrl(prefix + 'a'.repeat(2049 - prefix.length))).toBeNull();
  expect(safeAccountUrl(prefix + '\u00e9'.repeat(1000))).toBeNull();
});

test('blank optional fields stay blank without guessed usernames or account details', () => {
  const result = validateBusinessAccount(account({ name: '  Example account  ', username: '  ', notes: '  ' }));
  expect(result.errors).toEqual([]);
  expect(result.account).toEqual(account());
});

test('bounds field lengths and requires supported category and strict pin type', () => {
  const boundary = account({ id: 'i'.repeat(128), name: 'n'.repeat(120), username: 'u'.repeat(200), notes: 'n'.repeat(2000), pinned: true });
  expect(validateBusinessAccount(boundary).errors).toEqual([]);
  for (const extra of [{ id: 'i'.repeat(129) }, { name: 'n'.repeat(121) }, { username: 'u'.repeat(201) }, { notes: 'n'.repeat(2001) }, { category: 'unknown' }, { pinned: 'true' }, { pinned: 1 }, { name: ' ' }, { id: '' }, { url: '' }]) {
    expect(validateBusinessAccount(account(extra)).account).toBeNull();
  }
  for (const { key } of BUSINESS_ACCOUNT_CATEGORIES) expect(validateBusinessAccount(account({ category: key })).errors).toEqual([]);
});

test('rejects malformed field types and password-like or prototype-polluting extras', () => {
  for (const value of [null, [], 'account', 1]) expect(validateBusinessAccount(value).account).toBeNull();
  for (const extra of [{ username: 123 }, { notes: [] }, { name: {} }, { category: null }, { password: 'do-not-store' }, { secret: 'do-not-store' }]) {
    expect(validateBusinessAccount(account(extra)).account).toBeNull();
  }
  const malicious = JSON.parse(JSON.stringify(account()).replace('"pinned":false', '"pinned":false,"__proto__":{"polluted":true}'));
  expect(validateBusinessAccount(malicious).account).toBeNull();
  expect({}.polluted).toBeUndefined();
});

test('rejects reserved IDs while retaining ordinary imported identifiers', () => {
  for (const id of ['__proto__', 'constructor', 'Constructor', 'prototype', ' PROTOTYPE ']) {
    expect(validateBusinessAccount(account({ id })).account).toBeNull();
  }
  expect(validateBusinessAccount(account({ id: 'Imported account / 2' })).account.id).toBe('Imported account / 2');
});

test('normalization preserves multiline notes without placing a username in the URL', () => {
  const result = validateBusinessAccount(account({ username: ' example-user ', notes: ' First line\nSecond line ', url: 'HTTPS://EXAMPLE.COM/login' }));
  expect(result.account.username).toBe('example-user');
  expect(result.account.notes).toBe('First line\nSecond line');
  expect(result.account.url).toBe('https://example.com/login');
  expect(Object.keys(result.account).sort()).toEqual(['category', 'id', 'name', 'notes', 'pinned', 'url', 'username']);
});

test('public seeds are exactly the two approved links and each new seed list is independent', () => {
  expect(SEED_BUSINESS_ACCOUNTS.map(({ id, url }) => ({ id, url }))).toEqual([
    { id: 'my-dor', url: 'https://secure.dor.wa.gov/home/Login' },
    { id: 'filelocal', url: 'https://www.filelocal-wa.gov/Default_FileLocal.aspx' },
  ]);
  expect(Object.isFrozen(SEED_BUSINESS_ACCOUNTS)).toBe(true);
  for (const seed of SEED_BUSINESS_ACCOUNTS) {
    expect(Object.isFrozen(seed)).toBe(true);
    expect(seed).toMatchObject({ username: '', notes: '', category: 'taxes', pinned: true });
    expect(validateBusinessAccount(seed).errors).toEqual([]);
  }
  const first = createSeedBusinessAccounts();
  const second = createSeedBusinessAccounts();
  first[0].username = 'synthetic-user';
  first.pop();
  expect(second).toEqual(SEED_BUSINESS_ACCOUNTS);
  expect(second[0]).not.toBe(SEED_BUSINESS_ACCOUNTS[0]);
});

describe('private directory actions', () => {
  let root;
  let container;
  const previousClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    if (previousClipboard) Object.defineProperty(navigator, 'clipboard', previousClipboard);
    else delete navigator.clipboard;
    jest.restoreAllMocks();
  });
  const render = async (accounts, mutate = jest.fn()) => { await act(async () => root.render(React.createElement(BusinessAccountsSection, { data: { businessAccounts: accounts }, mutate }))); };
  const click = async (element) => { await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true }))); };

  test('copying uses the stored username while login links remain unchanged', async () => {
    const writeText = jest.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await render([account({ username: 'example-user' })]);
    const link = container.querySelector('.business-account-open');
    expect(link.href).toBe('https://example.com/login');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.target).toBe('_blank');
    await click(container.querySelector('[aria-label="Copy Example account username"]'));
    expect(writeText).toHaveBeenCalledWith('example-user');
    expect(container.querySelector('[role="status"]').textContent).toBe('Username copied.');
    expect(container.querySelector('input[type="password"]')).toBeNull();
  });

  test('clipboard failure selects the username for manual copying and reports the fallback', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockRejectedValue(new Error('Permission denied')) } });
    await render([account({ username: 'example-user' })]);
    await click(container.querySelector('[aria-label="Copy Example account username"]'));
    const input = container.querySelector('[aria-label="Example account username"]');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('example-user'.length);
    expect(container.querySelector('[role="status"]').textContent).toContain('Username selected');
  });

  test('invalid imported URLs never become clickable and deletion requires confirmation', async () => {
    const mutate = jest.fn();
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    await render([account({ url: 'javascript:alert(1)' })], mutate);
    expect(container.querySelector('.business-account-open')).toBeNull();
    await click(container.querySelector('[aria-label="Delete Example account"]'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(mutate).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await click(container.querySelector('[aria-label="Delete Example account"]'));
    const current = { businessAccounts: [account()], unrelated: 'preserved' };
    expect(mutate.mock.calls[0][0](current)).toEqual({ businessAccounts: [], unrelated: 'preserved' });
  });
});
