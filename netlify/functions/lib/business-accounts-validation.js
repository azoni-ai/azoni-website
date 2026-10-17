// Public portal URLs and private account labels only; no credential fields.
const FIELDS = new Set(['id', 'name', 'url', 'username', 'category', 'notes', 'pinned']);
const CATEGORIES = new Set(['taxes', 'banking', 'insurance', 'software', 'operations', 'other']);
const RESERVED_IDS = new Set(['__proto__', 'constructor', 'prototype']);
const text = (value, max, required = false) => typeof value === 'string'
  && value.length <= max && (!required || value.trim().length > 0);

function validAccountUrl(value) {
  if (!text(value, 2048, true) || /[\s\u0000-\u001f\u007f\\]/.test(value)) return false;
  const authority = /^https:\/\/([^/?#]+)(?:[/?#]|$)/i.exec(value)?.[1];
  if (!authority || authority.includes('@')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password && url.href.length <= 2048;
  } catch { return false; }
}

function validAccount(account) {
  return account !== null && typeof account === 'object' && !Array.isArray(account)
    && Object.keys(account).every(key => FIELDS.has(key))
    && text(account.id, 128, true) && !RESERVED_IDS.has(account.id.trim().toLowerCase())
    && text(account.name, 120, true) && validAccountUrl(account.url)
    && text(account.username, 200) && text(account.notes, 2000)
    && CATEGORIES.has(account.category) && typeof account.pinned === 'boolean';
}

function validBusinessAccounts(accounts) {
  return Array.isArray(accounts) && accounts.length <= 100 && accounts.every(validAccount)
    && new Set(accounts.map(account => account.id.trim())).size === accounts.length;
}

module.exports = { validAccountUrl, validBusinessAccounts };
