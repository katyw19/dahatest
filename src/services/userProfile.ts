import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { UserProfile } from '../models/userProfile';

/**
 * Get user profile from users/{uid}
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const db = getFirebaseDb();
  if (!db) return null;

  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  return snap.data() as UserProfile;
};

/**
 * Create or update user profile
 * (stats live directly on users/{uid})
 */
export const upsertUserProfile = async (
  profile: Partial<UserProfile> & { uid: string }
) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');

  const ref = doc(db, 'users', profile.uid);

  await setDoc(
    ref,
    {
      uid: profile.uid,
      email: profile.email ?? '',
      displayName: profile.displayName ?? '',
      pronouns: profile.pronouns ?? '',
      photoURL: profile.photoURL ?? '',

      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      grade: profile.grade ?? null,

      totalLends: profile.totalLends ?? 0,
      totalBorrows: profile.totalBorrows ?? 0,

      trustScore: profile.trustScore ?? 100,
      trustScoreIsDefault: profile.trustScoreIsDefault ?? true,

      createdAt: profile.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

/**
 * Increment lend / borrow counters safely
 */
export const incrementUserStats = async (
  uid: string,
  updates: { lends?: number; borrows?: number }
) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');

  const ref = doc(db, 'users', uid);

  const patch: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.lends) patch.totalLends = increment(updates.lends);
  if (updates.borrows) patch.totalBorrows = increment(updates.borrows);

  await updateDoc(ref, patch);
};
