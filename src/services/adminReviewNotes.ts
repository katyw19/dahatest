import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

type AdminReviewNote = {
  id: string;
  createdAt?: any;
  groupId: string;
  threadId: string;
  postId?: string;
  acceptedOfferId?: string;
  reviewerUid: string;
  reviewerRole: 'borrower' | 'lender';
  reviewerName?: string;
  targetUid: string;
  targetName?: string;
  outcome: 'returned_same' | 'minor_damage' | 'major_damage';
  noteText?: string;
};

export const listenAdminReviewNotes = (
  groupId: string,
  opts: { onlyNotes?: boolean } | undefined,
  onChange: (notes: AdminReviewNote[]) => void
) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured.');
  const ref = collection(db, `groups/${groupId}/adminReviewNotes`);
  const q = query(ref, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    let data = snap.docs.map((d) => ({ ...(d.data() as AdminReviewNote), id: d.id }));
    if (opts?.onlyNotes) {
      data = data.filter((n) => !!n.noteText && n.noteText.trim().length > 0);
    }
    onChange(data);
  });
};
