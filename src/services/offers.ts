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
    itemDescription?: string;
    condition?: string;
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

  const data: Record<string, any> = {
    lenderUid: payload.lenderUid,
    lenderFirstName: payload.lenderFirstName,
    lenderLastName: payload.lenderLastName,
    lenderGradeTag: payload.lenderGradeTag,
    lenderTrustScore: payload.lenderTrustScore,
    notes: payload.notes ?? '',
    photoUrl: photoUrl ?? '',
    createdAt: serverTimestamp(),
    status: 'pending',
  };

  if (payload.itemDescription) {
    data.itemDescription = payload.itemDescription;
  }
  if (payload.condition) {
    data.condition = payload.condition;
  }

  await addDoc(offersRef, data);
};

export const acceptOffer = async (
  groupId: string,
  postId: string,
  postAuthorUid: string,
  offer: Offer
): Promise<string> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');

  const postSnap = await getDoc(doc(db, `groups/${groupId}/posts/${postId}`));
  const postData: any = postSnap.exists() ? postSnap.data() : {};
  const isDawa = postData.type === 'dawa';

  const offersRef = collection(db, `groups/${groupId}/posts/${postId}/offers`);
  const offersSnap = await getDocs(offersRef);
  const batch = writeBatch(db);

  offersSnap.docs.forEach((docSnap) => {
    const isAccepted = docSnap.id === offer.id;
    batch.update(docSnap.ref, { status: isAccepted ? 'accepted' : 'rejected' });
  });

  batch.update(doc(db, `groups/${groupId}/posts/${postId}`), {
    status: isDawa ? 'claimed' : 'borrowed',
    borrowedAt: serverTimestamp(),
    acceptedOfferId: offer.id,
  });

  const threadRef = doc(collection(db, `groups/${groupId}/threads`));
  batch.set(threadRef, {
    groupId,
    postId,
    offerId: offer.id,
    // For DAWA: post author is the donor (lender), bid maker is the recipient (borrower)
    borrowerUid: isDawa ? offer.lenderUid : postAuthorUid,
    borrowerFirstName: isDawa ? (offer.lenderFirstName ?? '') : (postData.authorFirstName ?? ''),
    borrowerLastName: isDawa ? (offer.lenderLastName ?? '') : (postData.authorLastName ?? ''),
    lenderUid: isDawa ? postAuthorUid : offer.lenderUid,
    lenderFirstName: isDawa ? (postData.authorFirstName ?? '') : (offer.lenderFirstName ?? ''),
    lenderLastName: isDawa ? (postData.authorLastName ?? '') : (offer.lenderLastName ?? ''),
    isOpen: true,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return threadRef.id;
};
