import {
  addDoc,
  arrayRemove,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { ChatThread, Message } from '../models/chat';
import { getFirebaseDb } from './firebase';
import { awardBadgesIfNeeded, incrementUserBorrows, incrementUserLends } from './badges';

const ensureDb = () => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured');
  return db;
};

export const getThread = async (groupId: string, threadId: string): Promise<ChatThread | null> => {
  const db = ensureDb();
  const ref = doc(db, `groups/${groupId}/threads/${threadId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  return { ...(snap.data() as ChatThread), id: snap.id };
};

export const getThreadByOfferId = async (
  groupId: string,
  offerId: string
): Promise<ChatThread | null> => {
  const db = ensureDb();
  const threadsRef = collection(db, `groups/${groupId}/threads`);
  const q = query(threadsRef, where('offerId', '==', offerId));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  return { ...(docSnap.data() as ChatThread), id: docSnap.id };
};

export const listenOpenThreadsForUser = (
  groupId: string,
  uid: string,
  onChange: (threads: ChatThread[]) => void
) => {
  const db = ensureDb();
  const threadsRef = collection(db, `groups/${groupId}/threads`);

  const q = query(threadsRef, where('isOpen', '==', true));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs
      .map((docSnap) => ({ ...(docSnap.data() as ChatThread), id: docSnap.id }))
      .filter((t) => t.borrowerUid === uid || t.lenderUid === uid)
      .sort((a, b) => {
        const ta: any = (a as any).createdAt;
        const tb: any = (b as any).createdAt;
        const da = ta?.toDate ? ta.toDate().getTime() : 0;
        const dbt = tb?.toDate ? tb.toDate().getTime() : 0;
        return dbt - da;
      });

    onChange(data);
  });
};

export const listenPendingReviewThreadsForUser = (
  groupId: string,
  uid: string,
  onChange: (threads: ChatThread[]) => void
) => {
  const db = ensureDb();
  const threadsRef = collection(db, `groups/${groupId}/threads`);

  const q = query(
    threadsRef,
    where('isOpen', '==', false),
    where('needsReviewBy', 'array-contains', uid)
  );

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs
      .map((docSnap) => ({ ...(docSnap.data() as ChatThread), id: docSnap.id }))
      .sort((a, b) => {
        const ta: any = (a as any).closedAt ?? (a as any).createdAt;
        const tb: any = (b as any).closedAt ?? (b as any).createdAt;
        const da = ta?.toDate ? ta.toDate().getTime() : 0;
        const dbt = tb?.toDate ? tb.toDate().getTime() : 0;
        return dbt - da;
      });

    onChange(data);
  });
};

export const listenMessages = (
  groupId: string,
  threadId: string,
  onChange: (messages: Message[]) => void
) => {
  const db = ensureDb();
  const messagesRef = collection(db, `groups/${groupId}/threads/${threadId}/messages`);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Message),
        id: docSnap.id,
      }))
    );
  });
};

export const sendMessage = async (
  groupId: string,
  threadId: string,
  payload: { senderUid: string; text: string }
) => {
  const db = ensureDb();
  const messagesRef = collection(db, `groups/${groupId}/threads/${threadId}/messages`);
  await addDoc(messagesRef, {
    senderUid: payload.senderUid,
    text: payload.text,
    createdAt: serverTimestamp(),
  });
  // Update thread's lastMessageAt so chat list can detect new messages
  const threadRef = doc(db, `groups/${groupId}/threads/${threadId}`);
  await updateDoc(threadRef, { lastMessageAt: serverTimestamp() });
};

export const closeThread = async (groupId: string, threadId: string) => {
  const db = ensureDb();
  const ref = doc(db, `groups/${groupId}/threads/${threadId}`);
  await updateDoc(ref, {
    isOpen: false,
    closedAt: serverTimestamp(),
  });
};

export const finishThread = async (
  groupId: string,
  threadId: string,
  borrowerUid: string,
  lenderUid: string
) => {
  const db = ensureDb();
  const threadRef = doc(db, `groups/${groupId}/threads/${threadId}`);
  const borrowerMemberRef = doc(db, `groups/${groupId}/members/${borrowerUid}`);
  const lenderMemberRef = doc(db, `groups/${groupId}/members/${lenderUid}`);
  const borrowerMirrorRef = doc(db, `users/${borrowerUid}/memberships/${groupId}`);
  const lenderMirrorRef = doc(db, `users/${lenderUid}/memberships/${groupId}`);

  const batch = writeBatch(db);

  // Close thread + mark both users as still needing to review
  batch.update(threadRef, {
    isOpen: false,
    closedAt: serverTimestamp(),
    needsReviewBy: [borrowerUid, lenderUid],
    lastUpdatedAt: serverTimestamp(),
  });

  // Group membership counters (group-scoped)
  batch.set(
    borrowerMemberRef,
    { borrowsCompleted: increment(1), lastUpdatedAt: serverTimestamp() },
    { merge: true }
  );
  batch.set(
    lenderMemberRef,
    { lendsCompleted: increment(1), lastUpdatedAt: serverTimestamp() },
    { merge: true }
  );

  // Mirror membership counters (also group-scoped)
  batch.set(
    borrowerMirrorRef,
    { borrowsCompleted: increment(1), lastUpdatedAt: serverTimestamp() },
    { merge: true }
  );
  batch.set(
    lenderMirrorRef,
    { lendsCompleted: increment(1), lastUpdatedAt: serverTimestamp() },
    { merge: true }
  );

  await batch.commit();

  // ✅ User-level stats + badges (personal)
  // Borrower: borrows go up, but NO lend badges.
  // Lender: lends go up and can earn lend badges.
  try {
    await Promise.all([
      incrementUserLends(lenderUid, 1),
      incrementUserBorrows(borrowerUid, 1),
    ]);

    // badges only for lender, based on totalLends
    await awardBadgesIfNeeded(groupId, lenderUid);
  } catch (err) {
    console.warn('Badge awarding failed', err);
  }
};

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

export const submitReview = async (
  groupId: string,
  threadId: string,
  reviewerUid: string,
  outcome: 'returned_same' | 'minor_damage' | 'major_damage',
  note?: string
) => {
  const db = ensureDb();

  const thread = await getThread(groupId, threadId);
  if (!thread) throw new Error('Thread not found');

  const targetUid = reviewerUid === thread.borrowerUid ? thread.lenderUid : thread.borrowerUid;
  if (!targetUid) throw new Error('Invalid thread participants');

  const reviewRef = doc(db, `groups/${groupId}/threads/${threadId}/reviews/${reviewerUid}`);
  const threadRef = doc(db, `groups/${groupId}/threads/${threadId}`);

  const targetMemberRef = doc(db, `groups/${groupId}/members/${targetUid}`);
  const targetMirrorRef = doc(db, `users/${targetUid}/memberships/${groupId}`);

  const targetSnap = await getDoc(targetMemberRef);
  const currentScore =
    (targetSnap.exists() && (targetSnap.data() as any).trustScore != null
      ? Number((targetSnap.data() as any).trustScore)
      : 80) || 80;

  const delta = outcome === 'returned_same' ? 1 : outcome === 'minor_damage' ? -2 : -6;

  const smoothed = clamp(Math.round(currentScore * 0.9 + (currentScore + delta) * 0.1), 40, 100);

  const batch = writeBatch(db);

  batch.set(
    reviewRef,
    {
      reviewerUid,
      targetUid,
      outcome,
      note: note?.trim() || null,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  batch.set(
    targetMemberRef,
    { trustScore: smoothed, lastUpdatedAt: serverTimestamp() },
    { merge: true }
  );
  batch.set(
    targetMirrorRef,
    { trustScore: smoothed, lastUpdatedAt: serverTimestamp() },
    { merge: true }
  );

  batch.update(threadRef, {
    needsReviewBy: arrayRemove(reviewerUid),
    lastUpdatedAt: serverTimestamp(),
  });

  if (outcome === 'major_damage') {
    const reportsRef = collection(db, `groups/${groupId}/reports`);
    const reportDoc = doc(reportsRef);
    batch.set(reportDoc, {
      threadId,
      reporterUid: reviewerUid,
      targetUid,
      reason: 'major_damage',
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
};

export const ensureThreadOpen = async (groupId: string, threadId: string) => {
  const db = ensureDb();
  const ref = doc(db, `groups/${groupId}/threads/${threadId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...(snap.data() as ChatThread), id: snap.id };
};
