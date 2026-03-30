import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

type Props = NativeStackScreenProps<GroupStackParamList, 'OffersList'>;

const conditionLabel = (c?: string) => {
  switch (c) {
    case 'new': return 'New';
    case 'like_new': return 'Like New';
    case 'good': return 'Good';
    case 'used': return 'Used';
    default: return c ?? '';
  }
};

const OffersListScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup } = useGroupContext();
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [memberMap, setMemberMap] = useState<Record<string, Membership>>({});
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});
  const lenderUids = useMemo(
    () => offers.map((o) => o.lenderUid).filter(Boolean) as string[],
    [offers]
  );

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
    if (!lenderUids.length) return;
    let unsub: (() => void) | undefined;
    try {
      unsub = listenUserProfiles(lenderUids, setProfileMap);
    } catch {
      // ignore
    }
    return () => {
      if (unsub) unsub();
    };
  }, [lenderUids]);

  const [threadId, setThreadId] = useState<string | null>(null);
  const isAuthor = user?.uid === route.params.postAuthorUid;

  useEffect(() => {
    if (!currentGroup || !isAuthor) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let unsub: (() => void) | undefined;
    try {
      unsub = listenOffersForPost(currentGroup.id, route.params.postId, (data) => {
        setOffers(data);
        setLoading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers.');
      setLoading(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [currentGroup?.id, route.params.postId, isAuthor]);

  useEffect(() => {
    const loadThread = async () => {
      if (!currentGroup) return;
      const accepted = offers.find((o) => o.status === 'accepted');
      if (accepted) {
        const thread = await getThreadByOfferId(currentGroup.id, accepted.id);
        if (thread) setThreadId(thread.id);
      }
    };
    loadThread();
  }, [offers, currentGroup?.id]);

  if (!isAuthor) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={{ color: '#8E8E93' }}>Authors only</Text>
        </View>
      </Screen>
    );
  }

  const handleAccept = async (offer: Offer) => {
    if (!currentGroup || !user || offer.status !== 'pending') return;
    setActingId(offer.id);
    setError(null);
    try {
      const tid = await acceptOffer(currentGroup.id, route.params.postId, user.uid, offer);
      setThreadId(tid);
      navigation.navigate('ChatThread', { threadId: tid });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept offer.');
    } finally {
      setActingId(null);
    }
  };

  const handleOpenChat = async () => {
    if (!currentGroup) return;
    if (threadId) {
      navigation.navigate('ChatThread', { threadId });
      return;
    }
    const accepted = offers.find((o) => o.status === 'accepted');
    if (!accepted) return;
    try {
      const thread = await getThreadByOfferId(currentGroup.id, accepted.id);
      if (thread) {
        setThreadId(thread.id);
        navigation.navigate('ChatThread', { threadId: thread.id });
      } else {
        setError('No chat available yet. Try again.');
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
      {/* Header */}
      <Text style={[styles.offerCount, { color: '#8E8E93' }]}>
        {offers.length} {offers.length === 1 ? 'offer' : 'offers'}
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {offers.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons name="hand-extended-outline" size={36} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No offers yet</Text>
          <Text style={styles.emptyHint}>When someone offers to lend, it will appear here</Text>
        </View>
      ) : (
        <View style={styles.offersList}>
          {offers.map((offer) => {
            const isPending = offer.status === 'pending';
            const isAccepted = offer.status === 'accepted';

            return (
              <View key={offer.id} style={[styles.offerCard, { backgroundColor: theme.colors.surface }]}>
                {/* Person row */}
                <Pressable
                  onPress={() => navigation.navigate('UserProfile', { uid: offer.lenderUid })}
                  style={({ pressed }) => [styles.personRow, pressed && { opacity: 0.7 }]}
                >
                  <View style={[styles.avatar, { backgroundColor: `${theme.colors.primary}15` }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                      {getInitials(offer.lenderUid)}
                    </Text>
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: '#1C1C1E' }]}>{getName(offer.lenderUid)}</Text>
                    <View style={styles.personMeta}>
                      {offer.lenderGradeTag ? (
                        <Text style={styles.metaText}>{offer.lenderGradeTag}</Text>
                      ) : null}
                      {offer.lenderGradeTag && offer.lenderTrustScore != null ? (
                        <Text style={styles.metaDot}>·</Text>
                      ) : null}
                      {offer.lenderTrustScore != null ? (
                        <Text style={styles.metaText}>Trust {offer.lenderTrustScore}</Text>
                      ) : null}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
                </Pressable>

                <View style={[styles.cardDivider, { backgroundColor: theme.colors.outline }]} />

                {/* Item details */}
                <View style={styles.detailsSection}>
                  <Text style={[styles.itemDesc, { color: '#1C1C1E' }]}>{offer.itemDescription}</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Condition</Text>
                    <Text style={[styles.detailValue, { color: '#1C1C1E' }]}>{conditionLabel(offer.condition)}</Text>
                  </View>

                  {offer.notes ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={[styles.detailValue, { color: '#1C1C1E' }]} numberOfLines={3}>{offer.notes}</Text>
                    </View>
                  ) : null}

                  {offer.photoUrl ? (
                    <Image source={{ uri: offer.photoUrl }} style={styles.offerImage} />
                  ) : null}
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {isPending ? (
                    <Pressable
                      onPress={() => handleAccept(offer)}
                      disabled={actingId === offer.id}
                      style={({ pressed }) => [
                        styles.acceptBtn,
                        { backgroundColor: theme.colors.primary, opacity: pressed || actingId === offer.id ? 0.7 : 1 },
                      ]}
                    >
                      {actingId === offer.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="check" size={16} color="#fff" />
                          <Text style={styles.acceptBtnText}>Accept Offer</Text>
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

                  {/* Status indicator */}
                  <Text style={[styles.statusLabel, { color: isAccepted ? '#34C759' : '#8E8E93' }]}>
                    {isAccepted ? 'Accepted' : isPending ? 'Pending' : offer.status}
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
  scroll: {
    padding: SPACING.md,
    paddingBottom: 40,
    gap: SPACING.sm,
  },

  offerCount: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    textAlign: 'center',
  },

  /* Empty */
  emptyCard: {
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptyHint: {
    fontSize: 13,
    color: '#C7C7CC',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  /* Offers list */
  offersList: {
    gap: SPACING.sm,
  },
  offerCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },

  /* Person row */
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  personInfo: {
    flex: 1,
    gap: 2,
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
  },
  personMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  metaDot: {
    fontSize: 13,
    color: '#C7C7CC',
  },

  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.md,
  },

  /* Details */
  detailsSection: {
    padding: SPACING.md,
    gap: 10,
  },
  itemDesc: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  offerImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
  },

  /* Actions */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: 12,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 'auto',
  },
});

export default OffersListScreen;
