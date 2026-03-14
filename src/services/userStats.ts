import { doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

/**
 * Increments user-level stats stored on users/{uid}
 * This matches BadgesScreen reading users/{uid}.totalLends
 */
export const incrementUserLends = async (uid: string, amount = 1) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured.');

  // ✅ valid doc path
  const userRef = doc(db, 'users', uid);

  await updateDoc(userRef, {
    totalLends: increment(amount),
    updatedAt: serverTimestamp(),
  });
};

export const incrementUserBorrows = async (uid: string, amount = 1) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured.');

  const userRef = doc(db, 'users', uid);

  await updateDoc(userRef, {
    totalBorrows: increment(amount),
    updatedAt: serverTimestamp(),
  });
};
