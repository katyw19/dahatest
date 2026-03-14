import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { getDoc } from "firebase/firestore";

export type ReviewOutcome = "returned_same" | "minor_damage" | "major_damage";

/**
 * Everyone starts here.
 * UI shows "80 (default)" until the first review changes it.
 */
export const DEFAULT_TRUST_SCORE = 80;

const LENDER_DELTAS: Record<ReviewOutcome, number> = {
  returned_same: +6,
  minor_damage: -9,
  major_damage: -22,
};

const BORROWER_DELTAS: Record<ReviewOutcome, number> = {
  returned_same: +6,
  minor_damage: -4,
  major_damage: -10,
};

/**
 * Clamp helper — enforces hard bounds.
 * Trust can NEVER exceed 100 or drop below 40.
 */
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Apply trust score update based on a single review.
 * This updates the TARGET user (the one being reviewed).
 */
export const applyTrustFromReview = async (
  groupId: string,
  targetUid: string,
  outcome: ReviewOutcome,
  reviewerRole: "lender" | "borrower",
  opts?: {
    reviewerUid?: string;
    threadId?: string;
    postId?: string;
    acceptedOfferId?: string;
    noteText?: string;
  }
) => {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore not configured.");

  const memberRef = doc(db, `groups/${groupId}/members/${targetUid}`);
  const snap = await getDoc(memberRef);

  if (!snap.exists()) {
    throw new Error("Target membership doc missing");
  }

  const data = snap.data() as any;

  // Use default if missing
  const oldScore: number =
    typeof data.trustScore === "number"
      ? data.trustScore
      : DEFAULT_TRUST_SCORE;

  const delta =
    reviewerRole === "lender" ? LENDER_DELTAS[outcome] : BORROWER_DELTAS[outcome];

  const candidate = oldScore + delta;
  const smoothed = Math.round(oldScore * 0.35 + candidate * 0.65);
  const newScore = clamp(smoothed, 40, 100);

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("Trust updated", {
      reviewerRole,
      targetUid,
      oldScore,
      outcome,
      delta,
      newScore,
    });
  }

  await updateDoc(memberRef, {
    trustScore: newScore,
    trustScoreIsDefault: false,
    lastUpdatedAt: serverTimestamp(),
  });

  // Mirror to adminReviewNotes index for admins
  const noteId = `${opts?.threadId ?? 'thread'}_${opts?.reviewerUid ?? 'user'}`;
  const notesRef = doc(db, `groups/${groupId}/adminReviewNotes/${noteId}`);
  const reviewerSnap = opts?.reviewerUid
    ? await getDoc(doc(db, `groups/${groupId}/members/${opts.reviewerUid}`))
    : null;
  const targetSnap = await getDoc(doc(db, `groups/${groupId}/members/${targetUid}`));
  const reviewerName =
    reviewerSnap?.exists()
      ? `${(reviewerSnap.data() as any).firstName ?? ''} ${(reviewerSnap.data() as any).lastName ?? ''}`.trim()
      : '';
  const targetName =
    targetSnap.exists()
      ? `${(targetSnap.data() as any).firstName ?? ''} ${(targetSnap.data() as any).lastName ?? ''}`.trim()
      : '';
  const finalReviewerName = reviewerName || opts?.reviewerUid || 'Unknown member';
  const finalTargetName = targetName || targetUid || 'Unknown member';

  await setDoc(
    notesRef,
    {
      createdAt: serverTimestamp(),
      groupId,
      threadId: opts?.threadId ?? '',
      postId: opts?.postId ?? '',
      acceptedOfferId: opts?.acceptedOfferId ?? '',
      reviewerUid: opts?.reviewerUid ?? '',
      reviewerRole,
      reviewerName: finalReviewerName,
      targetUid,
      targetName: finalTargetName,
      outcome,
      noteText: opts?.noteText ?? '',
    },
    { merge: true }
  );

// Manual verification checklist (Phase 10 trust)
// 1) Two users in same group with member docs.
// 2) Finish a transaction; user A submits review -> user B's trustScore changes in Firestore.
// 3) User B submits review -> user A's trustScore changes.
// 4) Scores stay within [40,100] and trustScoreIsDefault becomes false after first change.

  return {
    oldScore,
    newScore,
    delta,
  };
};
