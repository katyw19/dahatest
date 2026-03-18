import { useEffect, useMemo, useState, useCallback } from 'react';
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
import { getLastReadBatch } from '../../services/unread';
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
  lastMessageAt?: any;
};

const ChatsListScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup } = useGroupContext();
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  const [active, setActive] = useState<ThreadRow[]>([]);
  const [pending, setPending] = useState<ThreadRow[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

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

  // Listen to messages for each active thread and count unread
  useEffect(() => {
    if (!currentGroup || !uid || !active.length) {
      setUnreadCounts({});
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    let cancelled = false;

    const setupListeners = async () => {
      const threadIds = active.map((t) => t.id);
      const lastReadMap = await getLastReadBatch(uid, threadIds);
      if (cancelled) return;

      const unsubs: (() => void)[] = [];

      for (const thread of active) {
        const messagesRef = collection(db, `groups/${currentGroup.id}/threads/${thread.id}/messages`);
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsub = onSnapshot(q, (snap) => {
          if (cancelled) return;
          const lastRead = lastReadMap[thread.id] ?? 0;
          let count = 0;
          snap.docs.forEach((d) => {
            const data = d.data();
            // Don't count own messages as unread
            if (data.senderUid === uid) return;
            const ts = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : 0;
            if (ts > lastRead) count++;
          });
          setUnreadCounts((prev) => {
            if (prev[thread.id] === count) return prev;
            return { ...prev, [thread.id]: count };
          });
        });

        unsubs.push(unsub);
      }

      return unsubs;
    };

    let unsubs: (() => void)[] | undefined;
    setupListeners().then((u) => { unsubs = u; });

    return () => {
      cancelled = true;
      unsubs?.forEach((u) => u());
    };
  }, [currentGroup?.id, uid, active.map((t) => t.id).join(',')]);

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

  const totalUnread = useMemo(
    () => Object.values(unreadCounts).reduce((sum, c) => sum + c, 0),
    [unreadCounts]
  );

  const renderRow = (item: ThreadRow, isPending: boolean) => {
    const unread = unreadCounts[item.id] ?? 0;
    const hasUnread = !isPending && unread > 0;

    return (
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
          <Text style={[styles.chatName, { color: '#1C1C1E', fontWeight: hasUnread ? '700' : '600' }]}>
            {getName(item)}
          </Text>
          <Text style={[styles.chatSub, hasUnread && { color: '#1C1C1E' }]}>
            {isPending
              ? 'Needs your review'
              : hasUnread
                ? `${unread} new message${unread > 1 ? 's' : ''}`
                : 'Tap to open chat'}
          </Text>
        </View>

        {isPending ? (
          <View style={[styles.badge, { backgroundColor: '#FF950020' }]}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#FF9500' }}>Review</Text>
          </View>
        ) : hasUnread ? (
          <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.unreadBadgeText}>{unread}</Text>
          </View>
        ) : null}

        <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
      </Pressable>
    );
  };

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
                <Text style={[styles.sectionTitle, { color: '#1C1C1E' }]}>Active Chats</Text>
                {totalUnread > 0 ? (
                  <View style={[styles.countBadge, { backgroundColor: `${theme.colors.primary}18` }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary }}>{totalUnread}</Text>
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
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
