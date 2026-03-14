import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
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
import AppCard from '../../components/AppCard';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'OffersList'>;

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
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Authors only</Text>
      </View>
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Offers
      </Text>
      {error ? (
        <Text style={styles.error} variant="bodySmall">
          {error}
        </Text>
      ) : null}
      {offers.length === 0 ? (
        <Text>No offers yet.</Text>
      ) : (
        offers.map((offer) => (
          <AppCard key={offer.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Pressable
              onPress={() => navigation.navigate('UserProfile', { uid: offer.lenderUid })}
              style={({ pressed }) => [
                styles.namePill,
                { backgroundColor: theme.colors.secondary, borderColor: theme.colors.outline },
                pressed ? styles.namePillPressed : null,
              ]}
            >
              <Text variant="titleMedium" style={[styles.nameText, { color: theme.colors.onSecondary }]}>
                {resolveDisplayName({
                  displayName:
                    memberMap[offer.lenderUid]?.displayName ||
                    profileMap[offer.lenderUid]?.displayName,
                  firstName:
                    memberMap[offer.lenderUid]?.firstName ||
                    profileMap[offer.lenderUid]?.firstName,
                  lastName:
                    memberMap[offer.lenderUid]?.lastName ||
                    profileMap[offer.lenderUid]?.lastName,
                  fallbackUid: offer.lenderUid,
                })}
              </Text>
            </Pressable>
            <Text style={styles.subtle}>
              {offer.lenderGradeTag ?? ''} • Trust: {offer.lenderTrustScore ?? 'N/A'}
            </Text>
            <Text style={styles.sectionText}>{offer.itemDescription}</Text>
            <Text style={styles.subtle}>Condition: {offer.condition}</Text>
            {offer.notes ? <Text style={styles.subtle}>Notes: {offer.notes}</Text> : null}
            <Text style={styles.subtle}>Status: {offer.status}</Text>
            {offer.photoUrl ? <Image source={{ uri: offer.photoUrl }} style={styles.image} /> : null}
            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={() => handleAccept(offer)}
                loading={actingId === offer.id}
                disabled={actingId === offer.id || offer.status !== 'pending'}
              >
                Accept Offer
              </Button>
              {offer.status === 'accepted' ? (
                <Button mode="contained" onPress={handleOpenChat}>
                  Message
                </Button>
              ) : (
                <Button mode="outlined" disabled>
                  Accept to start chat
                </Button>
              )}
            </View>
          </AppCard>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  card: {
    borderRadius: RADIUS.lg,
  },
  namePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  namePillPressed: {
    opacity: 0.8,
  },
  nameText: {
    fontWeight: '600',
  },
  subtle: {
    color: '#6b7280',
    marginTop: SPACING.xs,
  },
  sectionText: {
    marginTop: SPACING.sm,
  },
  actions: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  error: {
    color: '#b91c1c',
  },
});

export default OffersListScreen;
