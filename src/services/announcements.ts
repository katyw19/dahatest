import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { Announcement } from '../models/announcement';

const ensureDb = () => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured.');
  return db;
};

export const createAnnouncement = async (
  groupId: string,
  payload: { text: string; createdByUid: string; createdByName?: string; pinned?: boolean; expiresAt?: Date | null }
) => {
  const db = ensureDb();
  const ref = collection(db, `groups/${groupId}/announcements`);
  await addDoc(ref, {
    text: payload.text,
    createdByUid: payload.createdByUid,
    createdByName: payload.createdByName ?? '',
    pinned: payload.pinned ?? true,
    createdAt: serverTimestamp(),
    expiresAt: payload.expiresAt ?? null,
  });
};

export const listenPinnedAnnouncements = (groupId: string, onChange: (items: Announcement[]) => void) => {
  const db = ensureDb();
  const ref = collection(db, `groups/${groupId}/announcements`);
  const q = query(ref, where('pinned', '==', true), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ ...(d.data() as Announcement), id: d.id })));
  });
};

export const unpinAnnouncement = async (groupId: string, id: string) => {
  const db = ensureDb();
  await updateDoc(doc(db, `groups/${groupId}/announcements/${id}`), { pinned: false });
};

export const deleteAnnouncement = async (groupId: string, id: string) => {
  const db = ensureDb();
  await deleteDoc(doc(db, `groups/${groupId}/announcements/${id}`));
};
