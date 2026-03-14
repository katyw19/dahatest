import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { getFirebaseDb } from '../../services/firebase';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { listenUserProfiles } from '../../services/userProfiles';
import type { Membership } from '../../models/membership';
import { resolveDisplayName } from '../../utils/displayName';
import AppCard from '../../components/AppCard';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'ChatsList'>;

type ThreadRow = {
  id: string;
  isOpen: boolean;
  borrowerUid: string;
  lenderUid: string;
  borrowerFirstName?: string;
  borrowerLastName?: string;
  lenderFirstName?: string;
  lenderLastName?: string;
  needsReviewBy?: string[];
  createdAt?: any;
};

const ChatsListScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup } = useGroupContext();
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  const [active, setActive] = useState<ThreadRow[]>([]);
  const [pending, setPending] = useState<ThreadRow[]>([]);

  useEffect(() => {
    if (!currentGroup || !uid) return;

    const db = getFirebaseDb();
    if (!db) return;

    const threadsCol = collection(db, `groups/${currentGroup.id}/threads`);

    // Active threads: we do 2 listeners (borrower OR lender), merge client-side.
    const qBorrower = query(threadsCol, where('isOpen', '==', true), where('borrowerUid', '==', uid));
    const qLender = query(threadsCol, where('isOpen', '==', true), where('lenderUid', '==', uid));

    const unsubA = onSnapshot(qBorrower, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ThreadRow[];
      setActive((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        rows.forEach((t) => map.set(t.id, t));
        // remove any that are no longer open borrower threads
        // (we’ll re-merge with lender snapshot below)
        return Array.from(map.values());
      });
    });

    const unsubB = onSnapshot(qLender, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ThreadRow[];
      setActive((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        rows.forEach((t) => map.set(t.id, t));
        // keep only open threads where uid is borrower or lender
        const filtered = Array.from(map.values()).filter(
          (t) => t.isOpen === true && (t.borrowerUid === uid || t.lenderUid === uid)
        );
        return filtered;
      });
    });

    // Pending reviews: closed threads where needsReviewBy contains uid
    const qPending = query(
      threadsCol,
      where('isOpen', '==', false),
      where('needsReviewBy', 'array-contains', uid),
      orderBy('closedAt', 'desc')
    );

    const unsubP = onSnapshot(qPending, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ThreadRow[];
      setPending(rows);
    });

    return () => {
      unsubA();
      unsubB();
      unsubP();
    };
  }, [currentGroup?.id, uid]);

  const otherUids = useMemo(
    () =>
      [...active, ...pending]
        .map((t) => (uid === t.borrowerUid ? t.lenderUid : t.borrowerUid))
        .filter(Boolean) as string[],
    [active, pending, uid]
  );
  const [memberMap, setMemberMap] = useState<Record<string, Membership>>({});
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!currentGroup) return;
    const db = getFirebaseDb();
    if (!db) return;
    const ref = collection(db, `groups/${currentGroup.id}/members`);
    const unsub = onSnapshot(ref, (snap) => {
      const next: Record<string, Membership> = {};
      snap.docs.forEach((d) => {
        next[d.id] = d.data() as Membership;
      });
      setMemberMap(next);
    });
    return () => unsub();
  }, [currentGroup?.id]);

  useEffect(() => {
    if (!otherUids.length) return;
    let unsub: (() => void) | undefined;
    try {
      unsub = listenUserProfiles(otherUids, setProfileMap);
    } catch {
      // ignore
    }
    return () => {
      if (unsub) unsub();
    };
  }, [otherUids]);

  const goThread = (threadId: string) => navigation.navigate('ChatThread', { threadId });

  const pendingEmpty = !pending.length;
  const activeEmpty = !active.length;
  const displayName = (item: ThreadRow) => {
    const otherUid = uid === item.borrowerUid ? item.lenderUid : item.borrowerUid;
    return resolveDisplayName({
      displayName: memberMap[otherUid]?.displayName || profileMap[otherUid]?.displayName,
      firstName: memberMap[otherUid]?.firstName || profileMap[otherUid]?.firstName,
      lastName: memberMap[otherUid]?.lastName || profileMap[otherUid]?.lastName,
      fallbackUid: otherUid,
    });
  };

  const initialsFor = (item: ThreadRow) => {
    const otherUid = uid === item.borrowerUid ? item.lenderUid : item.borrowerUid;
    const first = memberMap[otherUid]?.firstName || profileMap[otherUid]?.firstName || '';
    const last = memberMap[otherUid]?.lastName || profileMap[otherUid]?.lastName || '';
    const initials = `${first.slice(0, 1)}${last.slice(0, 1)}`.trim();
    return initials || otherUid.slice(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        Chats
      </Text>

      <Text variant="titleMedium" style={styles.section}>
        Pending Reviews
      </Text>
      {pendingEmpty ? (
        <Text style={styles.muted}>No pending reviews.</Text>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <AppCard
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
              onPress={() => goThread(item.id)}
            >
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.secondary }]}>
                  <Text style={styles.avatarText}>{initialsFor(item)}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.bold}>{displayName(item)}</Text>
                  <Text style={styles.muted}>Review needed — tap to open.</Text>
                </View>
              </View>
            </AppCard>
          )}
        />
      )}

      <Text variant="titleMedium" style={styles.section}>
        Active Chats
      </Text>
      {activeEmpty ? (
        <Text style={styles.muted}>No active chats currently.</Text>
      ) : (
        <FlatList
          data={active}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <AppCard
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
              onPress={() => goThread(item.id)}
            >
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.secondary }]}>
                  <Text style={styles.avatarText}>{initialsFor(item)}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.bold}>{displayName(item)}</Text>
                  <Text style={styles.muted}>Tap to open chat.</Text>
                </View>
              </View>
            </AppCard>
          )}
        />
      )}

      <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 8 }}>
        Back
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.lg, gap: SPACING.sm },
  title: { fontWeight: '700' },
  section: { marginTop: SPACING.sm, fontWeight: '700' },
  card: { marginTop: SPACING.sm },
  bold: { fontWeight: '700' },
  muted: { color: '#6b7280', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowText: { flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#1f2937', fontWeight: '700' },
});

export default ChatsListScreen;
