import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseDb, getFirebaseStorage } from './firebase';
import type { Offer } from '../models/offer';

export const listenOffersForPost = (
  groupId: string,
  postId: string,
  onChange: (offers: Offer[]) => void
) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');
  const offersRef = collection(db, `groups/${groupId}/posts/${postId}/offers`);
  // Avoid index: pull all and sort client side
  return onSnapshot(offersRef, (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as Offer),
      id: docSnap.id,
    }));
    data.sort((a, b) => {
      const ta: any = (a as any).createdAt;
      const tb: any = (b as any).createdAt;
      const da = ta?.toDate ? ta.toDate().getTime() : 0;
      const dbt = tb?.toDate ? tb.toDate().getTime() : 0;
      return dbt - da;
    });
    onChange(data);
  });
};

export const createOffer = async (
  groupId: string,
  postId: string,
  payload: {
    lenderUid: string;
    lenderFirstName: string;
    lenderLastName: string;
    lenderGradeTag: string;
    lenderTrustScore: number;
    itemDescription: string;
    condition: string;
    notes?: string;
    photoUri?: string;
  }
) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');
  const offersRef = collection(db, `groups/${groupId}/posts/${postId}/offers`);

  const existingSnap = await getDocs(query(offersRef, where('lenderUid', '==', payload.lenderUid)));
  const hasExisting = existingSnap.docs.some((docSnap) => {
    const status = (docSnap.data() as Offer).status;
    return status !== 'rejected';
  });
  if (hasExisting) {
    throw new Error('You already made an offer on this request.');
  }

  let photoUrl: string | undefined;
  if (payload.photoUri) {
    const storage = getFirebaseStorage();
    if (!storage) throw new Error('Storage not configured');
    const response = await fetch(payload.photoUri);
    const blob = await response.blob();
    const storageRef = ref(
      storage,
      `groups/${groupId}/posts/${postId}/offers/${payload.lenderUid}-${Date.now()}`
    );
    await uploadBytes(storageRef, blob);
    photoUrl = await getDownloadURL(storageRef);
  }

  await addDoc(offersRef, {
    lenderUid: payload.lenderUid,
    lenderFirstName: payload.lenderFirstName,
    lenderLastName: payload.lenderLastName,
    lenderGradeTag: payload.lenderGradeTag,
    lenderTrustScore: payload.lenderTrustScore,
    itemDescription: payload.itemDescription,
    condition: payload.condition,
    notes: payload.notes ?? '',
    photoUrl: photoUrl ?? '',
    createdAt: serverTimestamp(),
    status: 'pending',
  });
};

export const acceptOffer = async (
  groupId: string,
  postId: string,
  postAuthorUid: string,
  offer: Offer
): Promise<string> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');

  // Pull post to capture borrower names for the thread
  const postSnap = await getDoc(doc(db, `groups/${groupId}/posts/${postId}`));
  const postData: any = postSnap.exists() ? postSnap.data() : {};

  const offersRef = collection(db, `groups/${groupId}/posts/${postId}/offers`);
  const offersSnap = await getDocs(offersRef);
  const batch = writeBatch(db);

  offersSnap.docs.forEach((docSnap) => {
    const isAccepted = docSnap.id === offer.id;
    batch.update(docSnap.ref, { status: isAccepted ? 'accepted' : 'rejected' });
  });

  batch.update(doc(db, `groups/${groupId}/posts/${postId}`), {
    status: 'borrowed',
    borrowedAt: serverTimestamp(),
    acceptedOfferId: offer.id,
  });

  const threadRef = doc(collection(db, `groups/${groupId}/threads`));
  batch.set(threadRef, {
    groupId,
    postId,
    offerId: offer.id,
    borrowerUid: postAuthorUid,
    borrowerFirstName: postData.authorFirstName ?? '',
    borrowerLastName: postData.authorLastName ?? '',
    lenderUid: offer.lenderUid,
    lenderFirstName: offer.lenderFirstName ?? '',
    lenderLastName: offer.lenderLastName ?? '',
    isOpen: true,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return threadRef.id;
};

// Manual test checklist (Phase 8)
// 1) Member A creates a post in Group X.
// 2) Member B opens the post and sends an offer (with or without photo).
// 3) Member A opens "See Offers" and views the pending offer.
// 4) Member A accepts the offer; post becomes Borrowed and other offers show Rejected.
// 5) PostDetail now shows Borrowed and "I can lend this" is disabled for everyone.
// 6) groups/{groupId}/threads has a new thread document linking post+offer.
