import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { Report, ReportReason, ReportStatus, ReportType } from '../models/report';

const ensureDb = () => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not configured.');
  return db;
};

export const createReport = async (
  groupId: string,
  payload: {
    createdByUid: string;
    createdByName?: string;
    type: ReportType;
    reason: ReportReason;
    detailsText?: string;
    targetUid?: string;
    targetName?: string;
    postId?: string;
    threadId?: string;
    reviewId?: string;
    lastMessageSnippet?: string;
    postTextSnippet?: string;
  }
) => {
  const db = ensureDb();
  const reportsRef = collection(db, `groups/${groupId}/reports`);
  const ref = await addDoc(reportsRef, {
    createdByUid: payload.createdByUid,
    createdByName: payload.createdByName ?? '',
    type: payload.type,
    reason: payload.reason,
    detailsText: payload.detailsText ?? '',
    status: 'open',
    target: {
      targetUid: payload.targetUid ?? '',
      targetName: payload.targetName ?? '',
      postId: payload.postId ?? '',
      threadId: payload.threadId ?? '',
      reviewId: payload.reviewId ?? '',
    },
    evidence: {
      lastMessageSnippet: payload.lastMessageSnippet ?? '',
      postTextSnippet: payload.postTextSnippet ?? '',
    },
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const listenReportsForAdmin = (
  groupId: string,
  status: ReportStatus | 'all',
  onChange: (reports: Report[]) => void
) => {
  const db = ensureDb();
  const reportsRef = collection(db, `groups/${groupId}/reports`);
  const q =
    status === 'all'
      ? query(reportsRef, orderBy('createdAt', 'desc'))
      : query(reportsRef, where('status', '==', status), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ ...(d.data() as Report), id: d.id }));
    onChange(data);
  });
};

export const listenReportById = (
  groupId: string,
  reportId: string,
  onChange: (report: Report | null) => void
) => {
  const db = ensureDb();
  const ref = doc(db, `groups/${groupId}/reports/${reportId}`);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    onChange({ ...(snap.data() as Report), id: snap.id });
  });
};

export const updateReport = async (
  groupId: string,
  reportId: string,
  patch: Partial<Report>
) => {
  const db = ensureDb();
  const ref = doc(db, `groups/${groupId}/reports/${reportId}`);
  await updateDoc(ref, {
    ...patch,
    lastUpdatedAt: serverTimestamp(),
  });
};
