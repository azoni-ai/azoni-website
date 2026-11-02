const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { scanText, scanEnv, mask, PUBLIC_ENV_NAMES } = require('./check-bundle-secrets.cjs');

const SCRIPT = path.join(__dirname, 'check-bundle-secrets.cjs');

// Obviously fake values, assembled at runtime so this file never looks like a leak itself.
const FAKE_OPENROUTER = ['sk', 'or', 'v1', 'f'.repeat(64)].join('-');
const FAKE_OPENAI = ['sk', 'proj', 'FAKEfakeFAKEfake0000FAKEfake'].join('-');
const FAKE_OPENAI_LEGACY = ['sk', 'FAKE0000fake1111FAKE2222fake3333'].join('-');
const FAKE_GITHUB = 'ghp_' + 'F'.repeat(36);
const FAKE_GITHUB_PAT = 'github_pat_' + 'F'.repeat(30);
const FAKE_PEM = ['-----BEGIN', 'PRIVATE', 'KEY-----'].join(' ');
const FAKE_SHAPELESS = 'hunter2x';
const ENV_NAME = ['REACT', 'APP', 'ADMIN', 'PASSWORD'].join('_');

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-secrets-'));
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

// The child never inherits REACT_APP_* vars from the shell running the tests.
function childEnv(extra = {}) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^REACT_APP_/i.test(k)) env[k] = v;
  return { ...env, ...extra };
}

function run(dir, extraEnv) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: childEnv(extraEnv) });
    return { code: 0, out: stdout };
  } catch (err) {
    return { code: err.status, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

test('mask keeps only the first 8 characters and the length', () => {
  assert.equal(mask(FAKE_OPENROUTER), `sk-or-v1... (${FAKE_OPENROUTER.length} chars)`);
});

test('each secret shape is detected under the right rule', () => {
  const rules = (text) => scanText(text).map((f) => f.rule);
  assert.deepEqual(rules(`a="${FAKE_OPENROUTER}"`), ['openrouter-key']);
  assert.deepEqual(rules(`a="${FAKE_OPENAI}"`), ['openai-key']);
  assert.deepEqual(rules(`a="${FAKE_OPENAI_LEGACY}"`), ['openai-key']);
  assert.deepEqual(rules(`a="${FAKE_GITHUB}",b="${FAKE_GITHUB_PAT}"`), ['github-token', 'github-token']);
  assert.deepEqual(rules(`a="${FAKE_PEM}\\nMIIE"`), ['private-key']);
  assert.deepEqual(rules(`{${ENV_NAME}:"x"}`), ['env-name-not-public']);
});

test('any REACT_APP_ name off the public list is flagged, in any case', () => {
  const shown = (text) => scanText(text).map((f) => `${f.rule} ${f.shown}`);
  assert.deepEqual(shown(`{REACT_APP_SOME_TOKEN:"${FAKE_SHAPELESS}"}`), ['env-name-not-public REACT_APP_SOME_TOKEN']);
  assert.deepEqual(shown(`{react_app_admin_key:"${FAKE_SHAPELESS}"}`), ['env-name-not-public react_app_admin_key']);
  assert.deepEqual(scanText(`{${PUBLIC_ENV_NAMES.map((n) => `${n}:"x"`).join(',')}}`), []);
});

test('scanEnv flags unlisted REACT_APP_ variables in the build environment', () => {
  const env = { PATH: '/bin', REACT_APP_GAME_SERVER: 'https://example.test', REACT_APP_SECRET_THING: FAKE_SHAPELESS };
  assert.deepEqual(scanEnv(env).map((f) => f.shown), ['REACT_APP_SECRET_THING']);
  assert.deepEqual(scanEnv({ react_app_lower: 'x' }).map((f) => f.shown), ['react_app_lower']);
});

test('ordinary minified code does not match', () => {
  const code = [
    'var t="task-queue-worker-scheduler-runner";',
    'e.className="disk-usage-indicator-component-wrapper";',
    'const n="mask-image-linear-gradient-overlay";',
    'o.REACT_APP_GAME_SERVER||"https://example.test";',
    'r("sk-")+i;',
  ].join('');
  assert.deepEqual(scanText(code), []);
});

test('CLI exits 1 and prints only masked values for a leaky bundle', () => {
  const dir = fixture({
    'static/js/main.abc123.js': `var e={${ENV_NAME}:"${FAKE_SHAPELESS}",K:"${FAKE_OPENROUTER}"};`,
    'static/js/main.abc123.js.map': `{"sourcesContent":["${FAKE_GITHUB}"]}`,
    'static/css/ignored.css': FAKE_OPENAI,
  });
  const { code, out } = run(dir);
  assert.equal(code, 1);
  assert.match(out, /main\.abc123\.js\s+openrouter-key\s+sk-or-v1\.\.\. \(73 chars\)/);
  assert.match(out, new RegExp(`main\\.abc123\\.js\\s+env-name-not-public\\s+${ENV_NAME}`));
  assert.match(out, /main\.abc123\.js\.map\s+github-token\s+ghp_FFFF\.\.\. \(40 chars\)/);
  assert.ok(!out.includes(FAKE_OPENROUTER), 'full OpenRouter value printed');
  assert.ok(!out.includes(FAKE_GITHUB), 'full GitHub value printed');
  assert.ok(!out.includes(FAKE_SHAPELESS), 'shapeless value printed');
  assert.ok(!out.includes('openai-key'), '.css files are not scanned');
});

test('CLI exits 0 with a one-line OK for a clean bundle', () => {
  const dir = fixture({ 'main.js': 'var t="task-queue-worker-scheduler-runner";', 'main.js.map': '{}' });
  const { code, out } = run(dir, { REACT_APP_GAME_SERVER: 'https://example.test' });
  assert.equal(code, 0);
  assert.equal(out.trim().split('\n').length, 1);
  assert.match(out, /^check-bundle-secrets: OK, no secrets in 2 files/);
});

test('CLI exits 1 for a clean bundle when the build env has an unlisted REACT_APP_ name', () => {
  const dir = fixture({ 'main.js': 'var t=1;' });
  const { code, out } = run(dir, { REACT_APP_SECRET_THING: FAKE_SHAPELESS });
  assert.equal(code, 1);
  assert.match(out, /\(build environment\)\s+env-name-not-public\s+REACT_APP_SECRET_THING/);
  assert.ok(!out.includes(FAKE_SHAPELESS), 'env value printed');
});

test('CLI exits 1 when the directory is missing or has no bundle files', () => {
  assert.equal(run(path.join(os.tmpdir(), 'bundle-secrets-missing-dir')).code, 1);
  assert.equal(run(fixture({ 'index.html': '<html></html>' })).code, 1);
});
