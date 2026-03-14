import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  getActiveGroupId,
  listenMyMemberships,
  setActiveGroupId,
  ensureUserMembershipMirror,
  clearActiveGroupId,
} from '../../services/groups';
import { useAuth } from '../../context/AuthContext';
import type { Membership } from '../../models/membership';
import { getFirebaseDb } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Group } from '../../models/group';
import { useProfile } from '../../context/ProfileContext';

type GroupContextValue = {
  memberships: Membership[];
  currentMembership: Membership | null;
  currentGroup: Group | null;
  loadingMembership: boolean;
  setActiveGroup: (groupId: string) => Promise<void>;
};

const GroupContext = createContext<GroupContextValue | undefined>(undefined);

export const GroupProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(true);
  const removalAlerted = useRef(false);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setCurrentMembership(null);
      setCurrentGroup(null);
      setLoadingMembership(false);
      return;
    }

    let unsub: (() => void) | undefined;
    try {
      unsub = listenMyMemberships(
        user.uid,
        (data) => {
          setMemberships(data);
        },
        async (removed) => {
          if (removed.length) {
            const activeId = await getActiveGroupId();
            const affectedActive = activeId && removed.some((m) => m.groupId === activeId);
            if (affectedActive) {
              await clearActiveGroupId();
              setCurrentMembership(null);
              setCurrentGroup(null);
            }
            if (!removalAlerted.current) {
              removalAlerted.current = true;
              Alert.alert('Removed from group', 'You were removed from this group.', [
                { text: 'OK', onPress: () => { removalAlerted.current = false; } },
              ]);
            }
          }
        }
      );
    } catch (err) {
      console.warn('Failed to listen memberships', err);
      setLoadingMembership(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [user?.uid]);

  const membershipsRef = useRef(memberships);
  membershipsRef.current = memberships;

  // Use a serialised key to avoid re-running when the memberships array identity
  // changes but the actual group IDs haven't changed.
  const membershipKey = memberships.map((m) => m.groupId).join(',');

  useEffect(() => {
    const loadActive = async () => {
      if (!user) return;
      setLoadingMembership(true);
      const currentMemberships = membershipsRef.current;
      try {
        const activeId = await getActiveGroupId();
        let selected: Membership | null = null;

        if (activeId) {
          selected = currentMemberships.find((m) => m.groupId === activeId) ?? null;
        }

        // Fallback: if mirror is missing, try reading membership doc directly
        if (!selected && activeId && user) {
          const db = getFirebaseDb();
          if (db) {
            const memberSnap = await getDoc(doc(db, 'groups', activeId, 'members', user.uid));
            if (memberSnap.exists()) {
              const data = memberSnap.data() as Membership;
              selected = { ...data, groupId: activeId };
              setMemberships((prev) => {
                if (prev.some((m) => m.groupId === activeId)) return prev;
                return [selected!, ...prev];
              });
              await ensureUserMembershipMirror(activeId, user.uid, profile);
              await setActiveGroupId(activeId);
            }
          }
        }

        if (!selected && currentMemberships.length > 0) {
          selected = currentMemberships[0];
          await setActiveGroupId(selected.groupId);
        }
        if (!selected) {
          await clearActiveGroupId();
        }

        setCurrentMembership(selected);

        if (selected) {
          await ensureUserMembershipMirror(selected.groupId, user.uid, profile);
          const db = getFirebaseDb();
          if (db) {
            const snap = await getDoc(doc(db, 'groups', selected.groupId));
            if (snap.exists()) {
              setCurrentGroup({ ...(snap.data() as Group), id: snap.id });
            } else {
              setCurrentGroup(null);
            }
          }
        } else {
          setCurrentGroup(null);
        }
      } catch (err) {
        console.warn('Failed to load active group', err);
        setCurrentMembership(null);
        setCurrentGroup(null);
      } finally {
        setLoadingMembership(false);
      }
    };
    loadActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipKey, user?.uid, profile?.firstName, profile?.lastName, profile?.gradeTag]);

  const setActiveGroup = async (groupId: string) => {
    let found = memberships.find((m) => m.groupId === groupId) ?? null;
    const db = getFirebaseDb();
    if (!found && user && db) {
      const memberSnap = await getDoc(doc(db, 'groups', groupId, 'members', user.uid));
      if (memberSnap.exists()) {
        found = { ...(memberSnap.data() as Membership), groupId };
        setMemberships([found, ...memberships.filter((m) => m.groupId !== groupId)]);
        await ensureUserMembershipMirror(groupId, user.uid, profile);
      }
    }
    setCurrentMembership(found ?? null);
    await setActiveGroupId(groupId);
    if (found && user) {
      await ensureUserMembershipMirror(groupId, user.uid, profile);
    }
    if (db) {
      const snap = await getDoc(doc(db, 'groups', groupId));
      if (snap.exists()) {
        setCurrentGroup({ ...(snap.data() as Group), id: snap.id });
      } else {
        setCurrentGroup(null);
      }
    }
  };

  const value: GroupContextValue = {
    memberships,
    currentMembership,
    currentGroup,
    loadingMembership,
    setActiveGroup,
  };

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
};

export const useGroupContext = () => {
  const ctx = useContext(GroupContext);
  if (!ctx) {
    throw new Error('useGroupContext must be used within GroupProvider');
  }
  return ctx;
};
