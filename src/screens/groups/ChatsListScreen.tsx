import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { getFirebaseDb } from '../../services/firebase';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { listenUserProfiles } from '../../services/userProfiles';
import type { Membership } from '../../models/membership';
import { resolveDisplayName } from '../../utils/displayName';
import Screen from '../../components/Screen';
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
    const qBorrower = query(threadsCol, where('isOpen', '==', true), where('borrowerUid', '==', uid));
    const qLender = query(threadsCol, where('isOpen', '==', true), where('lenderUid', '==', uid));

    const unsubA = onSnapshot(qBorrower, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ThreadRow[];
      setActive((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        rows.forEach((t) => map.set(t.id, t));
        return Array.from(map.values());
      });
    });

    const unsubB = onSnapshot(qLender, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ThreadRow[];
      setActive((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        rows.forEach((t) => map.set(t.id, t));
        const filtered = Array.from(map.values()).filter(
          (t) => t.isOpen === true && (t.borrowerUid === uid || t.lenderUid === uid)
        );
        return filtered;
      });
    });

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

  const getName = (item: ThreadRow) => {
    const otherUid = uid === item.borrowerUid ? item.lenderUid : item.borrowerUid;
    return resolveDisplayName({
      displayName: memberMap[otherUid]?.displayName || profileMap[otherUid]?.displayName,
      firstName: memberMap[otherUid]?.firstName || profileMap[otherUid]?.firstName,
      lastName: memberMap[otherUid]?.lastName || profileMap[otherUid]?.lastName,
      fallbackUid: otherUid,
    });
  };

  const getInitials = (item: ThreadRow) => {
    const otherUid = uid === item.borrowerUid ? item.lenderUid : item.borrowerUid;
    const first = memberMap[otherUid]?.firstName || profileMap[otherUid]?.firstName || '';
    const last = memberMap[otherUid]?.lastName || profileMap[otherUid]?.lastName || '';
    const initials = `${first.slice(0, 1)}${last.slice(0, 1)}`.trim();
    return initials || otherUid.slice(0, 2).toUpperCase();
  };

  const renderRow = (item: ThreadRow, isPending: boolean) => (
    <Pressable
      key={item.id}
      onPress={() => goThread(item.id)}
      style={({ pressed }) => [
        styles.chatRow,
        { backgroundColor: pressed ? `${theme.colors.primary}08` : theme.colors.surface },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: isPending ? '#FF950020' : `${theme.colors.primary}18` }]}>
        <Text style={[styles.avatarText, { color: isPending ? '#FF9500' : theme.colors.primary }]}>
          {getInitials(item)}
        </Text>
      </View>

      <View style={styles.chatInfo}>
        <Text style={[styles.chatName, { color: '#1C1C1E' }]}>{getName(item)}</Text>
        <Text style={styles.chatSub}>
          {isPending ? 'Needs your review' : 'Tap to open chat'}
        </Text>
      </View>

      {isPending ? (
        <View style={[styles.badge, { backgroundColor: '#FF950020' }]}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#FF9500' }}>Review</Text>
        </View>
      ) : null}

      <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
    </Pressable>
  );

  const pendingEmpty = !pending.length;
  const activeEmpty = !active.length;

  return (
    <Screen>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Pending Reviews */}
            {!pendingEmpty ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: '#FF9500' }]} />
                  <Text style={[styles.sectionTitle, { color: '#1C1C1E' }]}>Pending Reviews</Text>
                  <View style={[styles.countBadge, { backgroundColor: '#FF950020' }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF9500' }}>{pending.length}</Text>
                  </View>
                </View>
                <View style={[styles.listCard, { backgroundColor: theme.colors.surface }]}>
                  {pending.map((item, i) => (
                    <View key={item.id}>
                      {i > 0 ? <View style={[styles.rowDivider, { backgroundColor: theme.colors.outline }]} /> : null}
                      {renderRow(item, true)}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Active Chats */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: '#34C759' }]} />
                <Text style={[styles.sectionTitle, { color: '#1C1C1E' }]}>Active Chats</Text>
                {!activeEmpty ? (
                  <View style={[styles.countBadge, { backgroundColor: '#34C75920' }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#34C759' }}>{active.length}</Text>
                  </View>
                ) : null}
              </View>
              {activeEmpty ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
                  <MaterialCommunityIcons name="chat-outline" size={32} color="#C7C7CC" />
                  <Text style={styles.emptyText}>No active chats</Text>
                  <Text style={styles.emptyHint}>Start a conversation by accepting a borrow request</Text>
                </View>
              ) : (
                <View style={[styles.listCard, { backgroundColor: theme.colors.surface }]}>
                  {active.map((item, i) => (
                    <View key={item.id}>
                      {i > 0 ? <View style={[styles.rowDivider, { backgroundColor: theme.colors.outline }]} /> : null}
                      {renderRow(item, false)}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  section: { gap: 8, marginBottom: SPACING.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  listCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    gap: 12,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },

  chatInfo: {
    flex: 1,
    gap: 2,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
  },
  chatSub: {
    fontSize: 13,
    color: '#8E8E93',
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  emptyCard: {
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptyHint: {
    fontSize: 13,
    color: '#C7C7CC',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default ChatsListScreen;
