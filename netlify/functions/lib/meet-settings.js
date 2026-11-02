// Calendar connections for /meet, kept in one server-only Firestore doc:
//   { google: { refreshToken, email, connectedAt } | null,
//     feeds: [{ url, addedAt }],
//     pendingState: { value, createdAt } | null }
// No rule in firestore.rules matches meet_settings, so clients can never read
// the Google refresh token. meet-admin writes this doc; meet reads it.

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
}

const db = admin.apps.length ? admin.firestore() : null;
const ref = () => db.collection('meet_settings').doc('connections');

async function load() {
  if (!db) return {};
  const snap = await ref().get();
  return snap.exists ? snap.data() : {};
}

async function update(fields) {
  if (!db) throw new Error('Firestore is not configured');
  await ref().set(fields, { merge: true });
}

module.exports = { db, load, update };
