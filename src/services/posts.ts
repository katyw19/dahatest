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
import type { PostType } from '../models/postRequest';

export const listenPosts = (
  groupId: string,
  onChange: (posts: PostRequest[]) => void,
  type: PostType = 'daha'
) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');
  const postsRef = collection(db, `groups/${groupId}/posts`);

  // For 'dawa', query explicitly. For 'daha', get all and filter client-side
  // to support legacy posts without a type field.
  const q =
    type === 'dawa'
      ? query(postsRef, where('type', '==', 'dawa'), orderBy('createdAt', 'desc'))
      : query(postsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    let posts = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as PostRequest),
      id: docSnap.id,
    }));
    // For daha, filter out dawa posts (legacy posts without type are treated as daha)
    if (type === 'daha') {
      posts = posts.filter((p) => !p.type || p.type === 'daha');
    }
    onChange(posts);
  });
};

export const listenPostsByAuthor = (
  groupId: string,
  authorUid: string,
  onChange: (posts: PostRequest[]) => void,
  type?: PostType
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
    let posts = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as PostRequest),
      id: docSnap.id,
    }));
    if (type === 'dawa') {
      posts = posts.filter((p) => p.type === 'dawa');
    } else if (type === 'daha') {
      posts = posts.filter((p) => !p.type || p.type === 'daha');
    }
    onChange(posts);
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
    type?: PostType;
    category?: string;
    size?: string;
    neededBy?: string;
    condition?: string;
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
  const data: Record<string, any> = {
    authorUid: payload.authorUid,
    authorDisplayName: payload.authorDisplayName ?? '',
    authorFirstName: payload.authorFirstName,
    authorLastName: payload.authorLastName,
    authorGradeTag: payload.authorGradeTag,
    authorRole: payload.authorRole,
    type: payload.type ?? 'daha',
    text: payload.text,
    audienceTag: payload.audienceTag,
    category: payload.category ?? '',
    size: payload.size ?? '',
    photoUrl: photoUrl ?? '',
    status: 'open',
    createdAt: serverTimestamp(),
  };

  // DAHA-specific fields
  if (payload.type !== 'dawa') {
    data.neededBy = payload.neededBy ?? '';
  }

  // DAWA-specific fields
  if (payload.type === 'dawa' && payload.condition) {
    data.condition = payload.condition;
  }

  await addDoc(postsRef, data);
};
