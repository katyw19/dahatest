import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { UserProfile } from '../models/userProfile';

export const listenUserProfiles = (
  uids: string[],
  onChange: (map: Record<string, UserProfile | null>) => void
) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured.');

  const unique = Array.from(new Set(uids.filter(Boolean)));
  const profiles: Record<string, UserProfile | null> = {};
  const unsubs = unique.map((uid) => {
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, (snap) => {
      profiles[uid] = snap.exists() ? (snap.data() as UserProfile) : null;
      onChange({ ...profiles });
    });
  });

  return () => {
    unsubs.forEach((u) => u());
  };
};
