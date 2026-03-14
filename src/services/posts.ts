import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseDb, getFirebaseStorage } from './firebase';
import type { PostRequest } from '../models/postRequest';

export const listenPosts = (groupId: string, onChange: (posts: PostRequest[]) => void) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');
  const postsRef = collection(db, `groups/${groupId}/posts`);
  const q = query(postsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as PostRequest),
        id: docSnap.id,
      }))
    );
  });
};

export const listenPostsByAuthor = (
  groupId: string,
  authorUid: string,
  onChange: (posts: PostRequest[]) => void
) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');
  const postsRef = collection(db, `groups/${groupId}/posts`);
  const q = query(
    postsRef,
    where('authorUid', '==', authorUid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as PostRequest),
        id: docSnap.id,
      }))
    );
  });
};

export const createPost = async (
  groupId: string,
  payload: {
    authorUid: string;
    authorDisplayName?: string;
    authorFirstName: string;
    authorLastName: string;
    authorGradeTag: string;
    authorRole: 'admin' | 'member';
    text: string;
    audienceTag: string;
    category?: string;
    size?: string;
    neededBy?: string;
    photoUri?: string;
  }
) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');

  let photoUrl: string | undefined;
  if (payload.photoUri) {
    const storage = getFirebaseStorage();
    if (!storage) throw new Error('Storage not configured');
    const response = await fetch(payload.photoUri);
    const blob = await response.blob();
    const storageRef = ref(
      storage,
      `groups/${groupId}/posts/${payload.authorUid}-${Date.now()}`
    );
    await uploadBytes(storageRef, blob);
    photoUrl = await getDownloadURL(storageRef);
  }

  const postsRef = collection(db, `groups/${groupId}/posts`);
  await addDoc(postsRef, {
    authorUid: payload.authorUid,
    authorDisplayName: payload.authorDisplayName ?? '',
    authorFirstName: payload.authorFirstName,
    authorLastName: payload.authorLastName,
    authorGradeTag: payload.authorGradeTag,
    authorRole: payload.authorRole,
    text: payload.text,
    audienceTag: payload.audienceTag,
    category: payload.category ?? '',
    size: payload.size ?? '',
    neededBy: payload.neededBy ?? '',
    photoUrl: photoUrl ?? '',
    status: 'open',
    createdAt: serverTimestamp(),
  });
};
