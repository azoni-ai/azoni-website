const test = require('node:test');
const assert = require('node:assert/strict');
const { publicSummary } = require('../netlify/functions/lib/public-summary');
test('cached and fresh summaries cannot expose free-text logs or unknown sources', () => {
 const output = publicSummary({ actionCount30d: 12, cost30d: 0.5, errors7d: 2, updatedAt: '2026-10-16T00:00:00Z', recentFeed: [{ title: 'Unreviewed internal detail' }], latestBlog: { title: 'Unreviewed article' }, secret: 'hidden', bySource: [{ source: 'rowcrew', value: 0.2, title: 'unreviewed' }, { source: 'unlisted-client', value: 0.3 }] });
 assert.deepEqual(output.recentFeed, []); assert.equal(output.latestBlog, null);
 assert.deepEqual(output.bySource, [{ source: 'rowcrew', value: 0.2 }]);
 assert.equal(output.actionCount30d, 12); assert.ok(!JSON.stringify(output).includes('unreviewed')); assert.ok(!('secret' in output));
});
test('invalid values remain unavailable rather than plausible counts', () => {
 const output = publicSummary({ cost30d: '4', actionCount30d: -1, errors7d: NaN, bySource: [null, { source: 'rowcrew', value: Infinity }] });
 assert.equal(output.cost30d, null); assert.equal(output.actionCount30d, null); assert.equal(output.errors7d, null); assert.deepEqual(output.bySource, []);
});
