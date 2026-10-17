// Public link templates only. Actual usernames and notes live in private billing data.
export const MAX_BUSINESS_ACCOUNTS = 100;
export const BUSINESS_ACCOUNT_CATEGORIES = Object.freeze([
  { key: 'taxes', label: 'Taxes & licenses' },
  { key: 'banking', label: 'Banking' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'software', label: 'Software' },
  { key: 'operations', label: 'Operations' },
  { key: 'other', label: 'Other' },
].map(Object.freeze));

export const SEED_BUSINESS_ACCOUNTS = Object.freeze([
  { id: 'my-dor', name: 'My DOR', url: 'https://secure.dor.wa.gov/home/Login', username: '', category: 'taxes', notes: '', pinned: true },
  { id: 'filelocal', name: 'FileLocal', url: 'https://www.filelocal-wa.gov/Default_FileLocal.aspx', username: '', category: 'taxes', notes: '', pinned: true },
].map(Object.freeze));

export const createSeedBusinessAccounts = () => SEED_BUSINESS_ACCOUNTS.map((account) => ({ ...account }));

export function safeAccountUrl(value) {
  // eslint-disable-next-line no-control-regex -- Reject control characters before the URL parser can silently discard them.
  if (typeof value !== 'string' || value.length > 2048 || /[\s\u0000-\u001f\u007f\\]/.test(value)) return null;
  const authority = /^https:\/\/([^/?#]+)/i.exec(value)?.[1];
  if (!authority || authority.includes('@')) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password || parsed.href.length > 2048) return null;
    return parsed.href;
  } catch { return null; }
}

const FIELDS = new Set(['id', 'name', 'url', 'username', 'category', 'notes', 'pinned']);
const RESERVED_IDS = new Set(['__proto__', 'prototype', 'constructor']);

export function validateBusinessAccount(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { account: null, errors: ['Account details must be an object.'] };
  if (Object.keys(input).some((key) => !FIELDS.has(key))) errors.push('Only account names, links, usernames, categories, notes, and pin settings are supported.');
  const read = (key, label, max, required = false) => {
    const value = input[key];
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
      errors.push(`${label} ${required ? 'is required and ' : ''}must be text of ${max} characters or fewer.`);
      return '';
    }
    return value.trim();
  };
  const id = read('id', 'Account ID', 128, true);
  if (RESERVED_IDS.has(id.toLowerCase())) errors.push('Choose a different account ID.');
  const name = read('name', 'Account name', 120, true);
  const url = safeAccountUrl(input.url);
  if (!url) errors.push('Enter a complete HTTPS link without spaces or embedded login credentials.');
  const username = read('username', 'Username', 200);
  const notes = read('notes', 'Notes', 2000);
  const category = input.category;
  if (!BUSINESS_ACCOUNT_CATEGORIES.some((item) => item.key === category)) errors.push('Choose an account category.');
  if (typeof input.pinned !== 'boolean') errors.push('The pin setting must be on or off.');
  return { account: errors.length ? null : { id, name, url, username, category, notes, pinned: input.pinned }, errors };
}
