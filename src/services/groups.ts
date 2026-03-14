import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  Firestore,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { Group } from '../models/group';
import type { Membership } from '../models/membership';
import type { JoinRequest } from '../models/joinRequest';
import type { UserProfile } from '../models/userProfile';

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACTIVE_GROUP_KEY = 'activeGroupId';

// ✅ Trust defaults
const DEFAULT_TRUST_SCORE = 80;

const ensureDb = (): Firestore => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firestore is not ready. Check Firebase configuration.');
  }
  return db;
};

export const generateInviteCode = () => {
  const length = 6 + Math.floor(Math.random() * 3); // 6-8 chars
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return code;
};

export const regenerateInviteCode = async (groupId: string) => {
  const db = ensureDb();
  const newCode = generateInviteCode();
  const groupRef = doc(db, 'groups', groupId);
  await setDoc(groupRef, { inviteCode: newCode }, { merge: true });
  return newCode;
};

export const createGroup = async (params: {
  name: string;
  description?: string;
  rules?: string;
  gradeTags: string[];
  createdByUid: string;
  inviteCode?: string;
  creatorFirstName?: string;
  creatorLastName?: string;
  creatorGradeTag?: string;
}) => {
  const db = ensureDb();
  const groupRef = doc(collection(db, 'groups'));
  const groupId = groupRef.id;
  const inviteCode = params.inviteCode ?? generateInviteCode();

  const groupData: Group = {
    id: groupId,
    name: params.name,
    description: params.description ?? '',
    rules: params.rules ?? '',
    gradeTags: params.gradeTags ?? [],
    createdAt: null,
    createdByUid: params.createdByUid,
    inviteCode,
    isPrivate: true,
  };

  const membershipData: Membership = {
    groupId,
    role: 'admin',
    firstName: params.creatorFirstName ?? '',
    lastName: params.creatorLastName ?? '',
    gradeTag: params.creatorGradeTag ?? '',
    joinedAt: null,
    isRemoved: false,

    // ✅ fixed defaults
    trustScore: DEFAULT_TRUST_SCORE,
    trustScoreIsDefault: true,

    borrowsCompleted: 0,
    lendsCompleted: 0,
    badges: [],
    badgesEarned: [],
    yesCount: 0,
    minorCount: 0,
    majorCount: 0,
  };

  const membershipRef = doc(db, `groups/${groupId}/members/${params.createdByUid}`);
  const userMembershipRef = doc(db, `users/${params.createdByUid}/memberships/${groupId}`);

  await setDoc(groupRef, { ...groupData, createdAt: serverTimestamp() });
  await setDoc(
    membershipRef,
    { ...membershipData, joinedAt: serverTimestamp() },
    { merge: true }
  );
  await setDoc(userMembershipRef, {
    ...membershipData,
    groupName: params.name,
    joinedAt: serverTimestamp(),
  });

  return { ...groupData };
};

export const getGroupByInviteCode = async (code: string) => {
  const db = ensureDb();
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('inviteCode', '==', code));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { ...(docSnap.data() as Group), id: docSnap.id } as Group;
};

export const requestToJoin = async (
  groupId: string,
  form: {
    requesterUid: string;
    firstName: string;
    lastName: string;
    gradeTag: string;
    groupName: string;
    inviteCode: string;
  }
) => {
  const db = ensureDb();
  const reqRef = doc(collection(db, `groups/${groupId}/joinRequests`));
  const userMirrorRef = doc(db, `users/${form.requesterUid}/joinRequests/${groupId}`);
  const data: JoinRequest = {
    id: reqRef.id,
    groupId,
    requesterUid: form.requesterUid,
    firstName: form.firstName,
    lastName: form.lastName,
    gradeTag: form.gradeTag,
    createdAt: null,
    status: 'pending',
  };
  await setDoc(reqRef, { ...data, createdAt: serverTimestamp() });
  await setDoc(userMirrorRef, {
    ...data,
    groupName: form.groupName,
    inviteCode: form.inviteCode,
    createdAt: serverTimestamp(),
  });
  return data;
};

export const listMyMemberships = async (uid: string) => {
  const db = ensureDb();
  const membershipsRef = collection(db, `users/${uid}/memberships`);
  const snapshot = await getDocs(membershipsRef);
  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as Membership),
    groupId: docSnap.id,
  }));
};

export const listenMyMemberships = (
  uid: string,
  onChange: (m: Membership[]) => void,
  onRemoved?: (removed: Membership[]) => void
) => {
  const db = ensureDb();
  const membershipsRef = collection(db, `users/${uid}/memberships`);
  return onSnapshot(membershipsRef, (snapshot) => {
    const mapped = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as Membership),
      groupId: docSnap.id,
    }));
    const removed = mapped.filter((m: any) => m.isRemoved);
    const active = mapped.filter((m: any) => !m.isRemoved);
    onChange(active);
    if (onRemoved && removed.length) {
      onRemoved(removed);
    }
  });
};

export const setActiveGroupId = async (groupId: string) => {
  try {
    await AsyncStorage.setItem(ACTIVE_GROUP_KEY, groupId);
  } catch (error) {
    console.warn('Failed to set active group id', error);
  }
};

export const getActiveGroupId = async () => {
  try {
    return await AsyncStorage.getItem(ACTIVE_GROUP_KEY);
  } catch (error) {
    console.warn('Failed to read active group id', error);
    return null;
  }
};

export const clearActiveGroupId = async () => {
  try {
    await AsyncStorage.removeItem(ACTIVE_GROUP_KEY);
  } catch (error) {
    console.warn('Failed to clear active group id', error);
  }
};

export const listMyJoinRequests = async (uid: string) => {
  const db = ensureDb();
  const reqRef = collection(db, `users/${uid}/joinRequests`);
  const snapshot = await getDocs(reqRef);
  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as JoinRequest),
    groupId: docSnap.id,
  }));
};

export const listenMyJoinRequests = (uid: string, onChange: (r: JoinRequest[]) => void) => {
  const db = ensureDb();
  const reqRef = collection(db, `users/${uid}/joinRequests`);
  return onSnapshot(reqRef, (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as JoinRequest),
      groupId: docSnap.id,
    }));
    onChange(data);
  });
};

export const getMyJoinRequestStatus = async (groupId: string, uid: string) => {
  const db = ensureDb();
  const mirrorRef = doc(db, `users/${uid}/joinRequests/${groupId}`);
  const mirrorSnap = await getDoc(mirrorRef);
  if (mirrorSnap.exists()) {
    return mirrorSnap.data() as JoinRequest;
  }

  const reqRef = collection(db, `groups/${groupId}/joinRequests`);
  const q = query(reqRef, where('requesterUid', '==', uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as JoinRequest;
};

export const approveJoinRequest = async (
  groupId: string,
  requestId: string,
  adminUid: string,
  requesterUid: string,
  payload: {
    firstName: string;
    lastName: string;
    gradeTag: string;
    groupName: string;
  }
) => {
  const db = ensureDb();
  const requestRef = doc(db, `groups/${groupId}/joinRequests/${requestId}`);
  const membershipRef = doc(db, `groups/${groupId}/members/${requesterUid}`);
  const userMembershipRef = doc(db, `users/${requesterUid}/memberships/${groupId}`);
  const userJoinRef = doc(db, `users/${requesterUid}/joinRequests/${groupId}`);

  const membershipData: Membership = {
    groupId,
    role: 'member',
    firstName: payload.firstName,
    lastName: payload.lastName,
    gradeTag: payload.gradeTag,
    joinedAt: null,
    isRemoved: false,

    // ✅ fixed defaults
    trustScore: DEFAULT_TRUST_SCORE,
    trustScoreIsDefault: true,

    borrowsCompleted: 0,
    lendsCompleted: 0,
    badges: [],
    badgesEarned: [],
    yesCount: 0,
    minorCount: 0,
    majorCount: 0,
  };

  await setDoc(
    requestRef,
    {
      status: 'approved',
      reviewedByUid: adminUid,
      reviewedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const existingMember = await getDoc(membershipRef);
  if (existingMember.exists()) {
    await setDoc(
      membershipRef,
      {
        ...membershipData,
        trustScore: (existingMember.data() as any).trustScore ?? membershipData.trustScore,
        trustScoreIsDefault:
          (existingMember.data() as any).trustScoreIsDefault ?? membershipData.trustScoreIsDefault,
        joinedAt: (existingMember.data() as any).joinedAt ?? serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    await setDoc(
      membershipRef,
      {
        ...membershipData,
        joinedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  await setDoc(
    userMembershipRef,
    {
      ...membershipData,
      groupName: payload.groupName,
      joinedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    userJoinRef,
    {
      status: 'approved',
      reviewedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const denyJoinRequest = async (
  groupId: string,
  requestId: string,
  adminUid: string,
  requesterUid: string
) => {
  const db = ensureDb();
  const requestRef = doc(db, `groups/${groupId}/joinRequests/${requestId}`);
  const userJoinRef = doc(db, `users/${requesterUid}/joinRequests/${groupId}`);

  await setDoc(
    requestRef,
    {
      status: 'denied',
      reviewedByUid: adminUid,
      reviewedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    userJoinRef,
    {
      status: 'denied',
      reviewedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const ensureUserMembershipMirror = async (
  groupId: string,
  uid: string,
  profile?: UserProfile | null
) => {
  const db = ensureDb();
  const memberRef = doc(db, `groups/${groupId}/members/${uid}`);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;
  const membershipData = memberSnap.data() as Membership;
  const firstName = membershipData.firstName || profile?.firstName || '';
  const lastName = membershipData.lastName || profile?.lastName || '';

  // Patch membership with profile-backed names if missing
  if (!membershipData.firstName || !membershipData.lastName) {
    await setDoc(
      memberRef,
      {
        firstName,
        lastName,
      },
      { merge: true }
    );
  }

  // Ensure user mirror exists (with group name if available)
  const userMembershipRef = doc(db, `users/${uid}/memberships/${groupId}`);
  const userMembershipSnap = await getDoc(userMembershipRef);
  let groupName = (membershipData as any).groupName || '';
  if (!groupName) {
    const groupSnap = await getDoc(doc(db, 'groups', groupId));
    if (groupSnap.exists()) {
      groupName = (groupSnap.data() as Group).name ?? '';
    }
  }
  await setDoc(
    userMembershipRef,
    {
      ...membershipData,
      firstName,
      lastName,
      groupName,
      joinedAt: membershipData.joinedAt ?? serverTimestamp(),
    },
    { merge: true }
  );
};
