import { doc, getDoc, increment, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { BADGE_DEFINITIONS } from '../constants/badges';
import { getFirebaseDb } from './firebase';

const ensureDb = () => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');
  return db;
};

export const computeEarnedBadges = (totalLends: number) => {
  return BADGE_DEFINITIONS.filter((b) => totalLends >= b.threshold).map((b) => b.id);
};

/**
 * User-level stats live on users/{uid}
 */
export const listenUserBadgeState = (
  uid: string,
  onChange: (state: { totalLends: number; badgesEarned: Record<string, boolean> }) => void
) => {
  const db = ensureDb();
  const ref = doc(db, 'users', uid);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      onChange({ totalLends: 0, badgesEarned: {} });
      return;
    }
    const data = snap.data() as any;
    onChange({
      totalLends: data.totalLends ?? 0,
      badgesEarned: data.badgesEarned ?? {},
    });
  });
};

export const incrementUserLends = async (uid: string, amount = 1) => {
  const db = ensureDb();
  const userRef = doc(db, 'users', uid);
  await setDoc(
    userRef,
    {
      totalLends: increment(amount),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const incrementUserBorrows = async (uid: string, amount = 1) => {
  const db = ensureDb();
  const userRef = doc(db, 'users', uid);

  await setDoc(
    userRef,
    {
      totalBorrows: increment(amount),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
};

/**
 * Award lend badges based on users/{uid}.totalLends.
 * Stores badges in users/{uid}.badgesEarned as an object map:
 * { sharing_starter: true, ... }
 *
 * Your UI can treat missing/false as locked.
 */
export const awardBadgesIfNeeded = async (_groupId: string, uid: string) => {
  const db = ensureDb();
  const userRef = doc(db, 'users', uid);

  const snap = await getDoc(userRef);
  const data: any = snap.exists() ? snap.data() : {};

  const totalLends = Number(data.totalLends ?? 0) || 0;
  const earnedMap: Record<string, boolean> = (data.badgesEarned as any) ?? {};

  const updates: Record<string, any> = {};
  let changed = false;

  for (const b of BADGE_DEFINITIONS) {
    if (totalLends >= b.threshold && !earnedMap[b.id]) {
      updates[`badgesEarned.${b.id}`] = true;
      if (__DEV__) {
        console.log('Badge awarded', b.id);
      }
      changed = true;
    }
  }

  if (!changed) return;

  updates.updatedAt = serverTimestamp();

  await setDoc(userRef, updates, { merge: true });
};
