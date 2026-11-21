import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { firebaseConfig } from '../firebase-config.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function createAccount(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutAccount() {
  return signOut(auth);
}

export async function readProgress(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() && snapshot.data().progress && typeof snapshot.data().progress === 'object'
    ? snapshot.data().progress
    : null;
}

export async function writeProgress(uid, progress) {
  await setDoc(doc(db, 'users', uid), { progress, updatedAt: serverTimestamp() });
  const entry = doc(db, 'leaderboard', uid);
  if (progress.leaderboardOptIn === true) {
    const xp = Math.max(0, Math.min(1000000000, Math.floor(Number(progress.xp) || 0)));
    const level = Math.max(1, Math.floor(Math.sqrt(xp / 60)) + 1);
    await setDoc(entry, {
      name: String(progress.name || 'Player').trim().slice(0, 24) || 'Player',
      avatar: progress.avatar || {}, xp, level, updatedAt: serverTimestamp()
    });
  } else {
    await deleteDoc(entry);
  }
}

export async function deleteProgress(uid) {
  await Promise.all([deleteDoc(doc(db, 'users', uid)), deleteDoc(doc(db, 'leaderboard', uid))]);
}

export function watchLeaderboard(onChange, onError) {
  const board = query(collection(db, 'leaderboard'), orderBy('xp', 'desc'), limit(50));
  return onSnapshot(board, snapshot => onChange(snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }))), onError);
}
