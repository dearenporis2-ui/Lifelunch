const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { createHash } = require('node:crypto');

initializeApp();
const db = getFirestore();

const allowed = {
  presentation: ['feminine', 'masculine'],
  skin: ['light', 'warm', 'golden', 'deep', 'rich'],
  hairStyle: ['swoop', 'bob', 'curls', 'crop', 'waves', 'puff', 'sidepart', 'texture', 'fade', 'buzz', 'curlytop', 'longflow', 'manbun'],
  hairColor: ['espresso', 'midnight', 'copper', 'plum', 'honey'],
  expression: ['happy', 'confident', 'curious', 'focused'],
  outfitStyle: ['hoodie', 'varsity', 'overalls', 'sweater', 'suit'],
  outfitColor: ['lagoon', 'coral', 'violet', 'sunshine', 'black']
};

function publicAvatar(input = {}) {
  const avatar = {};
  for (const [key, values] of Object.entries(allowed)) {
    avatar[key] = values.includes(input[key]) ? input[key] : (key === 'presentation' ? 'feminine' : key === 'skin' ? 'warm' : key === 'hairStyle' ? 'swoop' : key === 'hairColor' ? 'espresso' : key === 'expression' ? 'happy' : key === 'outfitStyle' ? 'hoodie' : 'lagoon');
  }
  return avatar;
}

exports.publishLeaderboardEntry = onDocumentWritten({
  document: 'users/{userId}',
  region: 'us-central1',
  retry: true
}, async event => {
  const uid = event.params.userId;
  const publicId = createHash('sha256').update(uid).digest('hex');
  const entryRef = db.collection('leaderboard').doc(publicId);
  const after = event.data?.after;
  if (!after?.exists) {
    await entryRef.delete().catch(() => {});
    return;
  }

  const progress = after.data()?.progress || {};
  if (progress.leaderboardOptIn !== true) {
    const before = event.data?.before;
    if (before?.exists && before.data()?.progress?.leaderboardOptIn === true) await entryRef.delete().catch(() => {});
    return;
  }

  const xp = Math.max(0, Math.min(1000000000, Math.floor(Number(progress.xp) || 0)));
  const name = String(progress.name || 'Player').trim().replace(/[<>]/g, '').slice(0, 24) || 'Player';
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 60)) + 1);
  const publicEntry = { name, avatar: publicAvatar(progress.avatar), xp, level };
  const existing = await entryRef.get();
  if (existing.exists) {
    const prior = existing.data();
    if (prior.name === publicEntry.name && prior.xp === publicEntry.xp && prior.level === publicEntry.level && JSON.stringify(prior.avatar) === JSON.stringify(publicEntry.avatar)) return;
  }
  await entryRef.set({ ...publicEntry, updatedAt: FieldValue.serverTimestamp() });
});
