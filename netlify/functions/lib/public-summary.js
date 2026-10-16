const SOURCES = new Set(['orchestrator', 'daily-blog', 'azoni-ai', 'azoni', 'moltbook-agent', 'benchpressonly', 'rowcrew', 'spell-brigade', 'oldwaystoday', 'old-ways-today', 'embedroute', 'launchpad', 'medic', 'ai-tools']);
function publicSummary(data = {}) {
  const output = {};
  for (const key of ['agentCount24h', 'cost30d', 'actionCount30d', 'errors7d']) output[key] = Number.isFinite(data[key]) && data[key] >= 0 ? data[key] : null;
  output.bySource = Array.isArray(data.bySource) ? data.bySource.filter(item => item && SOURCES.has(item.source) && Number.isFinite(item.value) && item.value >= 0).map(({ source, value }) => ({ source, value })) : [];
  output.updatedAt = typeof data.updatedAt === 'string' && Number.isFinite(Date.parse(data.updatedAt)) ? new Date(data.updatedAt).toISOString() : null;
  // Preserve empty fields for older clients without returning raw log content.
  output.recentFeed = [];
  output.latestBlog = null;
  return output;
}
module.exports = { publicSummary };
