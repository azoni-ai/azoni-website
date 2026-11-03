// Local `npm start` only: Create React App loads this for the dev server and
// never puts it in the build. Public read-only function calls go to the live
// site, so the GitHub band and other widgets show real data; every other call
// under /.netlify/functions (visit logging, chat, admin, booking) gets an empty
// local reply and never reaches production.
const { createProxyMiddleware } = require('http-proxy-middleware');

const LIVE_READS = ['github-stats', 'board-activity', 'blog-posts', 'home-summary', 'hub-summary', 'leaderboard', 'discord-bots', 'extensions', 'ai-tools', 'app-stats']
  .map((name) => `/.netlify/functions/${name}`);
const isLiveRead = (pathname, req) => req.method === 'GET' && LIVE_READS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

module.exports = function setupProxy(app) {
  app.use(createProxyMiddleware(isLiveRead, { target: 'https://azoni.ai', changeOrigin: true, logLevel: 'warn' }));
  app.use('/.netlify/functions', (req, res) => res.status(204).end());
};
