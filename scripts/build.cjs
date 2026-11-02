// npm run build: the CRA build with only the public REACT_APP_* variables, then the bundle scan.
// CRA inlines every REACT_APP_* variable into the bundle when a dependency reads process.env as
// a whole, so a server secret that carries the prefix would otherwise ship to every browser.
const { spawnSync } = require('child_process');
const { publicBuildEnv, main: checkBundle } = require('./check-bundle-secrets.cjs');

const path = require('path');

// Route and SEO guards first: _redirects ends in a 404 catch-all, so a route without its own
// 200 rule would ship with a 404 status. Both tests only read files.
const guard = spawnSync(process.execPath, ['--test', ...['route-coverage', 'seo-coverage'].map((name) => path.join(__dirname, '..', 'tests', `${name}.test.cjs`))], { stdio: 'inherit' });
if (guard.status !== 0) process.exit(guard.status ?? 1);

const { env, leftOut } = publicBuildEnv(process.env);
if (leftOut.length) {
  console.warn(`build: left out ${leftOut.join(', ')} (not on the public REACT_APP_ list; server code should read a name without the prefix)`);
}

const build = spawnSync(process.execPath, [require.resolve('react-scripts/bin/react-scripts.js'), 'build'], { stdio: 'inherit', env });
if (build.status !== 0) process.exit(build.status ?? 1);
process.exitCode = checkBundle(process.argv.slice(0, 2), env);
