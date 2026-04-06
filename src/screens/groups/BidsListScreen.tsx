import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { listenOffersForPost, acceptOffer } from '../../services/offers';
import type { Offer } from '../../models/offer';
import { getThreadByOfferId } from '../../services/threads';
import { listenUserProfiles } from '../../services/userProfiles';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Membership } from '../../models/membership';
import { resolveDisplayName } from '../../utils/displayName';
import { getFirebaseDb } from '../../services/firebase';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'BidsList'>;

const BidsListScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup } = useGroupContext();
  const { user } = useAuth();
  const [bids, setBids] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [memberMap, setMemberMap] = useState<Record<string, Membership>>({});
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});
  const [threadId, setThreadId] = useState<string | null>(null);

  const bidderUids = useMemo(
    () => bids.map((b) => b.lenderUid).filter(Boolean) as string[],
    [bids]
  );

  const isAuthor = user?.uid === route.params.postAuthorUid;

  useEffect(() => {
    if (!currentGroup) return;
    const db = getFirebaseDb();
    if (!db) return;
    const ref = collection(db, `groups/${currentGroup.id}/members`);
    const unsub = onSnapshot(ref, (snap) => {
      const next: Record<string, Membership> = {};
      snap.docs.forEach((d) => { next[d.id] = d.data() as Membership; });
      setMemberMap(next);
    });
    return () => unsub();
  }, [currentGroup?.id]);

  useEffect(() => {
    if (!bidderUids.length) return;
    let unsub: (() => void) | undefined;
    try { unsub = listenUserProfiles(bidderUids, setProfileMap); } catch {}
    return () => { if (unsub) unsub(); };
  }, [bidderUids]);

  useEffect(() => {
    if (!currentGroup || !isAuthor) { setLoading(false); return; }
    setLoading(true);
    let unsub: (() => void) | undefined;
    try {
      unsub = listenOffersForPost(currentGroup.id, route.params.postId, (data) => {
        setBids(data);
        setLoading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests.');
      setLoading(false);
    }
    return () => { if (unsub) unsub(); };
  }, [currentGroup?.id, route.params.postId, isAuthor]);

  useEffect(() => {
    const loadThread = async () => {
      if (!currentGroup) return;
      const accepted = bids.find((b) => b.status === 'accepted');
      if (accepted) {
        const thread = await getThreadByOfferId(currentGroup.id, accepted.id);
        if (thread) setThreadId(thread.id);
      }
    };
    loadThread();
  }, [bids, currentGroup?.id]);

  if (!isAuthor) {
    return (
      <Screen noTopPadding>
        <View style={styles.center}>
          <Text style={{ color: '#8E8E93' }}>Donors only</Text>
        </View>
      </Screen>
    );
  }

  const handleAccept = async (bid: Offer) => {
    if (!currentGroup || !user || bid.status !== 'pending') return;
    setActingId(bid.id);
    setError(null);
    try {
      const tid = await acceptOffer(currentGroup.id, route.params.postId, user.uid, bid);
      setThreadId(tid);
      navigation.navigate('ChatThread', { threadId: tid });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept.');
    } finally {
      setActingId(null);
    }
  };

  const handleOpenChat = async () => {
    if (!currentGroup) return;
    if (threadId) { navigation.navigate('ChatThread', { threadId }); return; }
    const accepted = bids.find((b) => b.status === 'accepted');
    if (!accepted) return;
    try {
      const thread = await getThreadByOfferId(currentGroup.id, accepted.id);
      if (thread) {
        setThreadId(thread.id);
        navigation.navigate('ChatThread', { threadId: thread.id });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open chat.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const getName = (uid: string) =>
    resolveDisplayName({
      displayName: memberMap[uid]?.displayName || profileMap[uid]?.displayName,
      firstName: memberMap[uid]?.firstName || profileMap[uid]?.firstName,
      lastName: memberMap[uid]?.lastName || profileMap[uid]?.lastName,
      fallbackUid: uid,
    });

  const getInitials = (uid: string) => {
    const first = memberMap[uid]?.firstName || profileMap[uid]?.firstName || '';
    const last = memberMap[uid]?.lastName || profileMap[uid]?.lastName || '';
    const initials = `${first.slice(0, 1)}${last.slice(0, 1)}`.trim();
    return initials || uid.slice(0, 2).toUpperCase();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.bidCount, { color: '#8E8E93' }]}>
        {bids.length} {bids.length === 1 ? 'request' : 'requests'}
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {bids.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons name="hand-wave-outline" size={36} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptyHint}>When someone wants this item, their request will appear here</Text>
        </View>
      ) : (
        <View style={styles.bidsList}>
          {bids.map((bid) => {
            const isPending = bid.status === 'pending';
            const isAccepted = bid.status === 'accepted';

            return (
              <View key={bid.id} style={[styles.bidCard, { backgroundColor: theme.colors.surface }]}>
                {/* Person row */}
                <Pressable
                  onPress={() => navigation.navigate('UserProfile', { uid: bid.lenderUid })}
                  style={({ pressed }) => [styles.personRow, pressed && { opacity: 0.7 }]}
                >
                  <View style={[styles.avatar, { backgroundColor: `${theme.colors.primary}15` }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                      {getInitials(bid.lenderUid)}
                    </Text>
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: '#1C1C1E' }]}>{getName(bid.lenderUid)}</Text>
                    <View style={styles.personMeta}>
                      {bid.lenderGradeTag ? (
                        <Text style={styles.metaText}>{bid.lenderGradeTag}</Text>
                      ) : null}
                      {bid.lenderGradeTag && bid.lenderTrustScore != null ? (
                        <Text style={styles.metaDot}>·</Text>
                      ) : null}
                      {bid.lenderTrustScore != null ? (
                        <Text style={styles.metaText}>Trust {bid.lenderTrustScore}</Text>
                      ) : null}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
                </Pressable>

                {/* Note from requester */}
                {bid.notes ? (
                  <>
                    <View style={[styles.cardDivider, { backgroundColor: theme.colors.outline }]} />
                    <View style={styles.noteSection}>
                      <Text style={styles.noteLabel}>Their note</Text>
                      <Text style={[styles.noteText, { color: '#1C1C1E' }]} numberOfLines={4}>{bid.notes}</Text>
                    </View>
                  </>
                ) : null}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {isPending ? (
                    <Pressable
                      onPress={() => handleAccept(bid)}
                      disabled={actingId === bid.id}
                      style={({ pressed }) => [
                        styles.acceptBtn,
                        { backgroundColor: theme.colors.primary, opacity: pressed || actingId === bid.id ? 0.7 : 1 },
                      ]}
                    >
                      {actingId === bid.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="gift-outline" size={16} color="#fff" />
                          <Text style={styles.acceptBtnText}>Give to {getName(bid.lenderUid).split(' ')[0]}</Text>
                        </>
                      )}
                    </Pressable>
                  ) : isAccepted ? (
                    <Pressable
                      onPress={handleOpenChat}
                      style={({ pressed }) => [
                        styles.acceptBtn,
                        { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <MaterialCommunityIcons name="message-text-outline" size={16} color="#fff" />
                      <Text style={styles.acceptBtnText}>Message</Text>
                    </Pressable>
                  ) : null}

                  <Text style={[styles.statusLabel, { color: isAccepted ? '#34C759' : '#8E8E93' }]}>
                    {isAccepted ? 'Chosen' : isPending ? 'Pending' : bid.status}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: SPACING.md, paddingBottom: 40, gap: SPACING.sm },
  bidCount: { fontSize: 13, fontWeight: '500', paddingHorizontal: 4 },
  errorText: { color: '#FF3B30', fontSize: 13, textAlign: 'center' },
  emptyCard: { borderRadius: RADIUS.lg, alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#8E8E93' },
  emptyHint: { fontSize: 13, color: '#C7C7CC', textAlign: 'center', paddingHorizontal: 24 },
  bidsList: { gap: SPACING.sm },
  bidCard: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  personRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  personInfo: { flex: 1, gap: 2 },
  personName: { fontSize: 15, fontWeight: '600' },
  personMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#8E8E93' },
  metaDot: { fontSize: 13, color: '#C7C7CC' },
  cardDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: SPACING.md },
  noteSection: { padding: SPACING.md, gap: 4 },
  noteLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.3 },
  noteText: { fontSize: 14, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: 12 },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.md,
  },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statusLabel: { fontSize: 13, fontWeight: '500', marginLeft: 'auto' },
});

export default BidsListScreen;
