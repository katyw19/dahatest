import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { AdminAction, AdminActionType } from '../models/adminAction';

const ensureDb = () => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured.');
  return db;
};

export const createAdminAction = async (
  groupId: string,
  payload: {
    type: AdminActionType;
    targetUid: string;
    targetName?: string;
    reportId?: string;
    note?: string;
    createdByUid: string;
    createdByName?: string;
  }
) => {
  const db = ensureDb();
  const ref = collection(db, `groups/${groupId}/adminActions`);
  await addDoc(ref, {
    ...payload,
    createdAt: serverTimestamp(),
  });
};

export const listenAdminActions = (
  groupId: string,
  onChange: (actions: AdminAction[]) => void
) => {
  const db = ensureDb();
  const ref = collection(db, `groups/${groupId}/adminActions`);
  const q = query(ref, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ ...(d.data() as AdminAction), id: d.id })));
  });
};
