import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { Membership } from '../models/membership';

const ensureDb = () => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firestore is not ready. Check Firebase configuration.');
  }
  return db;
};

export const getMyMembership = async (groupId: string, uid: string) => {
  const db = ensureDb();
  const ref = doc(db, `groups/${groupId}/members/${uid}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Membership;
};

export const isAdmin = (membership: Membership | null | undefined) =>
  membership?.role === 'admin';

export const softRemoveMember = async (
  groupId: string,
  targetUid: string,
  adminUid: string,
  reason: string,
  adminName?: string
) => {
  const db = ensureDb();
  const memberRef = doc(db, `groups/${groupId}/members/${targetUid}`);
  const mirrorRef = doc(db, `users/${targetUid}/memberships/${groupId}`);

  const removalData = {
    isRemoved: true,
    removedAt: serverTimestamp(),
    removedByUid: adminUid,
    removedByName: adminName ?? '',
    removedReason: reason,
  };

  await setDoc(memberRef, removalData, { merge: true });
  await setDoc(mirrorRef, removalData, { merge: true });
};
