#!/usr/bin/env node

/*
 * Fail the build if a secret ships in the client bundle.
 *
 * Create React App inlines REACT_APP_* values into the JS chunks, and when any
 * dependency reads process.env webpack inlines the whole REACT_APP_* environment.
 * So a REACT_APP_ name that is not on the public list below fails the build
 * whatever its value looks like, and so do key-shaped values under any name.
 * Runs after `react-scripts build` (see package.json) and exits 1 on any hit.
 *
 * Usage:
 *   node scripts/check-bundle-secrets.cjs            # scans build/static/js
 *   node scripts/check-bundle-secrets.cjs path/to/dir
 *
 * Output never contains a full value: only the first 8 characters and length.
 * Env names are not secret and are printed in full.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DIR = path.join('build', 'static', 'js');

// Values here are public by design. Add a name only if its value is safe to publish.
const PUBLIC_ENV_NAMES = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID',
  'REACT_APP_GAME_SERVER',
  'REACT_APP_MOLTBOOK_AGENT_URL',
];

// CRA's own prefix test is case-insensitive, so this one is too.
const ENV_NAME_PATTERN = /REACT_APP_[A-Za-z0-9_]+/gi;

const RULES = [
  { name: 'openrouter-key', pattern: /sk-or-v1-[A-Za-z0-9]{20,}/g },
  // The lookbehind keeps minified identifiers such as 'task-...' or 'disk-...' from matching.
  { name: 'openai-key', pattern: /(?<![A-Za-z0-9_-])sk-(?!or-v1-)(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { name: 'github-token', pattern: /(?<![A-Za-z0-9_])(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{22,})/g },
  { name: 'private-key', pattern: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/g },
];

function mask(value) {
  return `${value.slice(0, 8)}... (${value.length} chars)`;
}

function isPublicEnvName(name) {
  return PUBLIC_ENV_NAMES.includes(name);
}

function listFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full));
    else if (/\.(js|map)$/.test(entry.name)) files.push(full);
  }
  return files.sort();
}

function scanText(text) {
  const findings = [];
  const seen = new Set();
  const add = (rule, found, shown) => {
    const key = `${rule}\0${found}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ rule, shown });
  };
  for (const rule of RULES) {
    for (const match of text.matchAll(rule.pattern)) add(rule.name, match[0], mask(match[0]));
  }
  for (const match of text.matchAll(ENV_NAME_PATTERN)) {
    if (!isPublicEnvName(match[0])) add('env-name-not-public', match[0], match[0]);
  }
  return findings;
}

function scanDir(dir) {
  const files = listFiles(dir);
  const findings = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const f of scanText(text)) findings.push({ file: path.relative(dir, file) || path.basename(file), ...f });
  }
  return { files: files.length, findings };
}

// Catches a secret set for the build even if no dependency inlines the env this time.
function scanEnv(env) {
  return Object.keys(env)
    .filter((k) => /^REACT_APP_/i.test(k) && !isPublicEnvName(k))
    .sort()
    .map((k) => ({ file: '(build environment)', rule: 'env-name-not-public', shown: k }));
}

function main(argv, env = process.env) {
  const dir = argv[2] || DEFAULT_DIR;
  let result;
  try {
    if (!fs.statSync(dir).isDirectory()) throw Object.assign(new Error('not a directory'), { code: 'ENOTDIR' });
    result = scanDir(dir);
  } catch (err) {
    // err.message can quote file content for some errors; the code and path are enough.
    console.error(`check-bundle-secrets: cannot scan ${dir} (${err.code || err.name})`);
    return 1;
  }

  if (result.files === 0) {
    console.error(`check-bundle-secrets: no .js or .map files under ${dir}`);
    return 1;
  }

  const findings = [...scanEnv(env), ...result.findings];
  if (findings.length > 0) {
    console.error(`check-bundle-secrets: ${findings.length} problem(s) found for ${dir}`);
    for (const f of findings) console.error(`  ${f.file}  ${f.rule}  ${f.shown}`);
    console.error('Move each secret to a name without the REACT_APP_ prefix and rotate it.');
    console.error('A REACT_APP_ name whose value is public belongs in PUBLIC_ENV_NAMES in scripts/check-bundle-secrets.cjs.');
    return 1;
  }

  console.log(`check-bundle-secrets: OK, no secrets in ${result.files} files under ${dir}`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv);

module.exports = { RULES, PUBLIC_ENV_NAMES, mask, scanText, scanEnv, scanDir, main };
