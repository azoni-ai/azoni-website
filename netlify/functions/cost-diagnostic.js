// netlify/functions/cost-diagnostic.js
//
// One-off diagnostic: returns per-source counts and cost-sums over the last 30 days
// of agent_activity. Lets us tell at a glance whether an app's docs are missing
// entirely, arriving without cost, or arriving with cost > 0.
//
// Auth: pass ?secret=<AGENT_WEBHOOK_SECRET> as query param (same secret the apps
// use to write activity, so no new env var needed).

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  const secret = event.queryStringParameters?.secret;
  if (!secret || secret !== process.env.AGENT_WEBHOOK_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'invalid secret' }) };
  }

  try {
    const cutoff = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 86_400_000));
    const snapshot = await db
      .collection('agent_activity')
      .where('timestamp', '>=', cutoff)
      .get();

    const bySource = new Map();

    for (const doc of snapshot.docs) {
      const data = doc.data() || {};
      const src = data.source || '__missing_source__';
      const c = data.cost;
      const hasCost = Number.isFinite(c);
      const positiveCost = hasCost && c > 0;

      const stat = bySource.get(src) || {
        docs: 0,
        docsWithCostField: 0,
        docsWithCostGt0: 0,
        costSum: 0,
        sampleWithoutCost: null,
        sampleWithCost: null,
      };
      stat.docs += 1;
      if (hasCost) stat.docsWithCostField += 1;
      if (positiveCost) {
        stat.docsWithCostGt0 += 1;
        stat.costSum += c;
        if (!stat.sampleWithCost) {
          stat.sampleWithCost = {
            id: doc.id,
            type: data.type,
            title: data.title?.slice(0, 80),
            cost: c,
            model: data.model || null,
          };
        }
      } else if (!stat.sampleWithoutCost) {
        stat.sampleWithoutCost = {
          id: doc.id,
          type: data.type,
          title: data.title?.slice(0, 80),
          rawCost: c === undefined ? 'undefined' : c === null ? 'null' : String(c),
          model: data.model || null,
          metadataCost: data.metadata?.cost ?? null,
        };
      }
      bySource.set(src, stat);
    }

    const sources = Array.from(bySource.entries())
      .map(([source, stat]) => ({ source, ...stat, costSum: Number(stat.costSum.toFixed(6)) }))
      .sort((a, b) => b.docs - a.docs);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(
        {
          windowDays: 30,
          totalDocs: snapshot.size,
          totalSources: sources.length,
          sources,
        },
        null,
        2
      ),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message, stack: error.stack }),
    };
  }
};
