// netlify/functions/blog-posts.js
// Public reader for /blog. The blogPosts collection is closed to clients
// (firestore.rules), so the site reads build notes only through here, and only
// notes that passed the policy-version-2 validation gate in daily-blog.
//
// GET /.netlify/functions/blog-posts             -> { posts: [...] }, newest first
// GET /.netlify/functions/blog-posts?slug=<slug> -> { post } or 404

const { POLICY_VERSION, SLUG_PATTERN, isCompliantPost, parsePrivateTerms, findPrivateTerm } = require('./lib/build-notes');

let admin = null;
let db = null;

const LIST_LIMIT = 60;
const LIST_FIELDS = ['slug', 'title', 'excerpt', 'tags', 'publishedAt', 'commitDate', 'sourceRepos', 'commitCount', 'generator', 'published', 'policyVersion'];
const GENERATORS = ['model', 'template'];

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

const iso = (value) => {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

const strings = (list) => (Array.isArray(list) ? list.filter((item) => typeof item === 'string') : []);

// Only these fields ever leave the function.
function summary(post) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || '',
    tags: strings(post.tags),
    publishedAt: iso(post.publishedAt),
    commitDate: typeof post.commitDate === 'string' ? post.commitDate : null,
    sourceRepos: strings(post.sourceRepos),
    commitCount: Number.isFinite(post.commitCount) ? post.commitCount : null,
    // Lets the page say whether a language model wrote the summaries.
    generator: GENERATORS.includes(post.generator) ? post.generator : null,
  };
}

// A term added to BLOG_PRIVATE_TERMS later also hides notes already published.
const isServable = (post, terms) => isCompliantPost(post) &&
  findPrivateTerm([post.title, post.excerpt, post.content, ...strings(post.tags), post.slug], terms) === -1;

exports.handler = async (event = {}) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
  };
  const noStore = { ...headers, 'Cache-Control': 'no-store' };
  const reply = (statusCode, data, replyHeaders = headers) => ({ statusCode, headers: replyHeaders, body: JSON.stringify(data) });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod && event.httpMethod !== 'GET') return reply(405, { error: 'Method not allowed' }, noStore);

  const params = event.queryStringParameters || {};
  const slug = params.slug;
  if (slug !== undefined && (typeof slug !== 'string' || !SLUG_PATTERN.test(slug))) {
    return reply(400, { error: 'Invalid slug' }, noStore);
  }

  // Fail closed: without the private-term list nothing is shown.
  const terms = parsePrivateTerms(process.env.BLOG_PRIVATE_TERMS);
  if (!terms.length || !initFirebase()) return reply(503, { error: 'Build notes are temporarily unavailable' }, noStore);

  try {
    if (slug) {
      // Single-field equality queries need no composite index.
      const snapshot = await db.collection('blogPosts').where('slug', '==', slug).limit(5).get();
      const post = snapshot.docs.map((doc) => doc.data()).find((data) => isServable(data, terms));
      if (!post) return reply(404, { error: 'Not found' }, { ...headers, 'Cache-Control': 'public, max-age=60' });
      return reply(200, {
        post: {
          ...summary(post),
          // The cover is a generated SVG; only that exact form is passed on.
          coverImage: typeof post.coverImage === 'string' && post.coverImage.startsWith('data:image/svg+xml;base64,') ? post.coverImage : null,
          content: typeof post.content === 'string' ? post.content : '',
        },
      });
    }

    const snapshot = await db.collection('blogPosts')
      .where('policyVersion', '==', POLICY_VERSION)
      .select(...LIST_FIELDS, 'content')
      .get();
    const posts = snapshot.docs
      .map((doc) => doc.data())
      .filter((data) => isServable(data, terms))
      .map(summary)
      .sort((a, b) => (b.commitDate || '').localeCompare(a.commitDate || '') || (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, LIST_LIMIT);
    return reply(200, { posts });
  } catch (err) {
    console.error('[blog-posts] Read failed:', err.message);
    return reply(500, { error: 'Build notes could not load' }, noStore);
  }
};
