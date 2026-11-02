// npm run build: the CRA build with only the public REACT_APP_* variables, then the bundle scan.
// CRA inlines every REACT_APP_* variable into the bundle when a dependency reads process.env as
// a whole, so a server secret that carries the prefix would otherwise ship to every browser.
const { spawnSync } = require('child_process');
const { publicBuildEnv, main: checkBundle } = require('./check-bundle-secrets.cjs');

const { env, leftOut } = publicBuildEnv(process.env);
if (leftOut.length) {
  console.warn(`build: left out ${leftOut.join(', ')} (not on the public REACT_APP_ list; server code should read a name without the prefix)`);
}

const build = spawnSync(process.execPath, [require.resolve('react-scripts/bin/react-scripts.js'), 'build'], { stdio: 'inherit', env });
if (build.status !== 0) process.exit(build.status ?? 1);
process.exitCode = checkBundle(process.argv.slice(0, 2), env);
