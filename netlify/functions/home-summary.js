// netlify/functions/home-summary.js
// One cached endpoint that feeds every live stat on the home page, so visitors
// no longer open real-time listeners that stream the whole `agent_activity`
// collection (that was blowing the Firestore free-tier read quota).
//
// Everything here is a cheap count()/sum() aggregation or a bounded 30-doc read,
// computed once server-side and cached in `settings/home_summary`. The response
// is also CDN-cached (Cache-Control below), so most visitors never touch
// Firestore at all.

let admin = null;
let db = null;

const CACHE_DOC = { collection: 'settings', id: 'home_summary' };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const ERROR_TYPES = ['error_logged', 'error_reviewed', 'health_alert'];

// Sources that carry AI cost, for the "where it goes" breakdown. New paying
// sources need adding here (same as the frontend SOURCE_DISPLAY map).
const COST_SOURCES = [
  'orchestrator', 'daily-blog', 'azoni-ai', 'azoni', 'moltbook-agent',
  'benchpressonly', 'rowcrew', 'spell-brigade', 'oldwaystoday', 'old-ways-today',
  'embedroute', 'launchpad', 'medic',
];

function initFirebase() {
  if (db) return true;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return false;
  try {
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
    db = admin.firestore();
    return true;
  } catch {
    return false;
  }
}

function asNumber(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function tsAgo(days) { return admin.firestore.Timestamp.fromMillis(Date.now() - days * 86_400_000); }

const activity = () => db.collection('agent_activity');
const AF = () => admin.firestore.AggregateField;

async function countSince(days) {
  try {
    const snap = await activity().where('timestamp', '>=', tsAgo(days)).count().get();
    return asNumber(snap.data().count);
  } catch (err) {
    console.error(`[home-summary] countSince(${days}) failed:`, err.message);
    return null;
  }
}

// Total AI cost + action count over 30d in one aggregate query (index-safe).
async function costAndCount30d() {
  try {
    const snap = await activity()
      .where('timestamp', '>=', tsAgo(30))
      .aggregate({ cost: AF().sum('cost'), count: AF().count() })
      .get();
    return { cost: asNumber(snap.data().cost), count: asNumber(snap.data().count) };
  } catch (err) {
    console.error('[home-summary] cost/count 30d failed:', err.message);
    return { cost: null, count: null };
  }
}

// Errors in last 7d. Needs a (type, timestamp) composite index; if it's missing
// this returns null and the UI simply hides the stat.
async function errors7d() {
  try {
    const snap = await activity()
      .where('type', 'in', ERROR_TYPES)
      .where('timestamp', '>=', tsAgo(7))
      .count()
      .get();
    return asNumber(snap.data().count);
  } catch (err) {
    console.error('[home-summary] errors7d failed:', err.message);
    return null;
  }
}

// Cost per source over 30d, via one small sum() per known source. Uses the
// (source, timestamp) index the Activity page already relies on.
async function costBySource() {
  const results = await Promise.all(
    COST_SOURCES.map(async (source) => {
      try {
        const snap = await activity()
          .where('source', '==', source)
          .where('timestamp', '>=', tsAgo(30))
          .aggregate({ cost: AF().sum('cost') })
          .get();
        return { source, value: asNumber(snap.data().cost) };
      } catch {
        return { source, value: 0 };
      }
    })
  );
  return results.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
}

// Recent activity for the pulse strip — bounded 30-doc read, no live listener.
async function recentFeed() {
  try {
    const snap = await activity().orderBy('timestamp', 'desc').limit(30).get();
    return snap.docs.map((d) => {
      const a = d.data() || {};
      const ms = a.timestamp?.toMillis ? a.timestamp.toMillis() : null;
      return {
        id: d.id,
        type: a.type || null,
        title: a.title || a.description || a.type || null,
        source: a.source || null,
        slug: a.metadata?.slug || null,
        ms,
      };
    });
  } catch (err) {
    console.error('[home-summary] recentFeed failed:', err.message);
    return [];
  }
}

async function build() {
  const [agentCount24h, cc30, errCount, bySource, feed] = await Promise.all([
    countSince(1),
    costAndCount30d(),
    errors7d(),
    costBySource(),
    recentFeed(),
  ]);
  const lb = feed.find((f) => f.type === 'blog_published');
  return {
    agentCount24h,
    cost30d: cc30.cost,
    actionCount30d: cc30.count,
    errors7d: errCount,
    bySource,
    recentFeed: feed,
    latestBlog: lb ? { title: lb.title, slug: lb.slug } : null,
    updatedAt: new Date().toISOString(),
  };
}

// Cap a promise so a quota-stalled Firestore op (SDK retries ~20s) can't hang
// the request. Resolves to `fallback` on timeout or error.
function fast(promise, ms = 5000, fallback = null) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    // Serve instantly from CDN and refresh in the background — a slow rebuild
    // never blocks the home page.
    'Cache-Control': 'public, max-age=120, stale-while-revalidate=600',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (!initFirebase()) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'no-db' }) };
  }

  const ref = db.collection(CACHE_DOC.collection).doc(CACHE_DOC.id);

  const cached = await fast(ref.get());
  if (cached && cached.exists) {
    const data = cached.data();
    const age = Date.now() - new Date(data.updatedAt || 0).getTime();
    if (age >= 0 && age < CACHE_TTL_MS) {
      return { statusCode: 200, headers, body: JSON.stringify({ ...data, cached: true }) };
    }
  }

  // Build with an overall cap; individual queries already swallow errors.
  const summary = await fast(build(), 9000, null);
  if (!summary) {
    // Couldn't rebuild in time — serve stale cache if we have it.
    if (cached && cached.exists) {
      return { statusCode: 200, headers, body: JSON.stringify({ ...cached.data(), cached: true, stale: true }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'timeout' }) };
  }

  await fast(ref.set(summary)); // time-capped write
  return { statusCode: 200, headers, body: JSON.stringify({ ...summary, cached: false }) };
};
