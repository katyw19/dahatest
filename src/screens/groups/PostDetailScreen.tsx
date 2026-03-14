import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { getFirebaseDb } from '../../services/firebase';
import type { PostRequest } from '../../models/postRequest';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { listenOffersForPost } from '../../services/offers';
import type { Offer } from '../../models/offer';
import { getThreadByOfferId } from '../../services/threads';
import { useLayoutEffect } from 'react';
import type { Membership } from '../../models/membership';
import { listenUserProfiles } from '../../services/userProfiles';
import { resolveDisplayName } from '../../utils/displayName';
import AppCard from '../../components/AppCard';
import TagChip from '../../components/TagChip';
import { RADIUS, SPACING } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'PostDetail'>;

const PostDetailScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { postId, offeredSuccess } = route.params;
  const { currentGroup, currentMembership } = useGroupContext();
  const { user } = useAuth();

  const [post, setPost] = useState<PostRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [memberMap, setMemberMap] = useState<Record<string, Membership>>({});
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});

  // ✅ IMPORTANT: compute derived values BEFORE any early returns
  const uid = user?.uid ?? '';
  const offersSafe = offers ?? [];

  const isAuthor = !!uid && !!post?.authorUid && uid === post.authorUid;
  const isBorrowed = post?.status === 'borrowed';

  const alreadyOffered = useMemo(() => {
    if (!uid) return false;
    return offersSafe.some((o) => o.lenderUid === uid && o.status !== 'rejected');
  }, [offersSafe, uid]);

  const acceptedOffer = useMemo(() => {
    if (!post?.acceptedOfferId) return undefined;
    return offersSafe.find((o) => o.id === post.acceptedOfferId);
  }, [offersSafe, post?.acceptedOfferId]);

  const nameUids = useMemo(
    () => [post?.authorUid, acceptedOffer?.lenderUid].filter(Boolean) as string[],
    [post?.authorUid, acceptedOffer?.lenderUid]
  );
  const authorMember = post?.authorUid ? memberMap[post.authorUid] : undefined;
  const authorProfile = post?.authorUid ? profileMap[post.authorUid] : undefined;
  const displayName = resolveDisplayName({
    displayName: authorMember?.displayName || authorProfile?.displayName || post?.authorDisplayName,
    firstName: authorMember?.firstName || authorProfile?.firstName || post?.authorFirstName,
    lastName: authorMember?.lastName || authorProfile?.lastName || post?.authorLastName,
    fallbackUid: post?.authorUid,
  });
  const acceptedLenderName = acceptedOffer
    ? resolveDisplayName({
        displayName:
          memberMap[acceptedOffer.lenderUid]?.displayName ||
          profileMap[acceptedOffer.lenderUid]?.displayName,
        firstName:
          memberMap[acceptedOffer.lenderUid]?.firstName ||
          profileMap[acceptedOffer.lenderUid]?.firstName,
        lastName:
          memberMap[acceptedOffer.lenderUid]?.lastName ||
          profileMap[acceptedOffer.lenderUid]?.lastName,
        fallbackUid: acceptedOffer.lenderUid,
      })
    : '';

  useEffect(() => {
    if (!currentGroup) {
      setError('No active group.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const db = getFirebaseDb();
    if (!db) {
      setError('Firestore not configured.');
      setLoading(false);
      return;
    }

    const ref = doc(db, `groups/${currentGroup.id}/posts/${postId}`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setError('Post not found.');
          setPost(null);
          setLoading(false);
          return;
        }
        setPost({ ...(snap.data() as PostRequest), id: snap.id });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [postId, currentGroup?.id]);

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
    if (!nameUids.length) return;
    let unsub: (() => void) | undefined;
    try {
      unsub = listenUserProfiles(nameUids, setProfileMap);
    } catch {
      // ignore
    }
    return () => {
      if (unsub) unsub();
    };
  }, [nameUids]);

  useEffect(() => {
    if (!currentGroup) return;

    setOfferError(null);
    let unsub: (() => void) | undefined;

    try {
      unsub = listenOffersForPost(currentGroup.id, postId, setOffers);
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'Failed to load offers.');
    }

    return () => {
      if (unsub) unsub();
    };
  }, [currentGroup?.id, postId]);

  useEffect(() => {
    const loadThread = async () => {
      if (!currentGroup) return;
      if (post?.acceptedOfferId) {
        const thread = await getThreadByOfferId(currentGroup.id, post.acceptedOfferId);
        if (thread) setThreadId(thread.id);
      }
    };
    loadThread();
  }, [post?.acceptedOfferId, currentGroup?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="alert-circle-outline"
          style={styles.headerIcon}
          contentStyle={styles.headerIconContent}
          iconColor={theme.colors.onSurface}
          onPress={() =>
            navigation.navigate('ReportCreate', {
              type: 'post',
              postId,
              targetUid: post?.authorUid,
              targetName: displayName,
              snippet: post?.text?.slice(0, 140) ?? '',
            })
          }
        />
      ),
    });
  }, [navigation, postId, post?.authorUid, post?.text, displayName, theme.colors.onSurface]);

  // ✅ Early returns happen AFTER hooks + memos
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>{error ?? 'Post not found.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Request
      </Text>

      <AppCard style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.row}>
          <Pressable onPress={() => navigation.navigate('UserProfile', { uid: post.authorUid })}>
            <Text variant="bodyMedium" style={styles.authorName}>
              {displayName}
            </Text>
          </Pressable>
          {post.authorRole === 'admin' ? <Text style={styles.adminTag}>Admin</Text> : null}
        </View>
        <Text variant="bodySmall" style={styles.subtle}>
          {post.authorGradeTag ? `${post.authorGradeTag} • ` : ''}
          Audience: {post.audienceTag || 'Anyone'}
        </Text>

        <Text variant="titleMedium" style={styles.text}>
          {post.text}
        </Text>

        <View style={styles.tags}>
          {post.category ? <TagChip label={`Category: ${post.category}`} /> : null}
          {post.size ? <TagChip label={`Size: ${post.size}`} /> : null}
          {post.neededBy ? <TagChip label={`Needed by: ${post.neededBy}`} /> : null}
        </View>

        {post.photoUrl ? <Image source={{ uri: post.photoUrl }} style={styles.image} /> : null}

        <Text style={[styles.statusLabel, { color: post.status === 'borrowed' ? '#6b7280' : theme.colors.primary }]}>
          {post.status === 'borrowed' ? 'Borrowed' : 'Open'}
        </Text>

        {acceptedOffer ? (
          <Text variant="bodySmall">
            Accepted offer: {acceptedLenderName}
          </Text>
        ) : null}
        {acceptedOffer && threadId && (isAuthor || user?.uid === acceptedOffer.lenderUid) ? (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('ChatThread', { threadId })}
          >
            Open Chat
          </Button>
        ) : null}
      </AppCard>

      {offerError ? (
        <Text style={styles.error} variant="bodySmall">
          {offerError}
        </Text>
      ) : null}

      {!isAuthor && !isBorrowed ? (
        alreadyOffered ? (
          <Text style={styles.subtle}>You already made an offer on this request.</Text>
        ) : (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('OfferCreate', { postId })}
            disabled={!currentMembership}
          >
            I can lend this
          </Button>
        )
      ) : null}

      {isAuthor ? (
        <Button
          mode="outlined"
          onPress={() =>
            navigation.navigate('OffersList', { postId, postAuthorUid: post.authorUid })
          }
        >
          See Offers
        </Button>
      ) : null}

      {offeredSuccess ? (
        <Text style={styles.success} variant="bodySmall">
          Offer sent!
        </Text>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  card: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  authorName: { fontWeight: '700' },
  adminTag: { color: '#4b5563', fontSize: 12 },
  text: { marginVertical: SPACING.sm },
  image: { width: '100%', height: 240, borderRadius: RADIUS.lg },
  subtle: { color: '#6b7280' },
  error: { color: '#b91c1c' },
  success: { color: '#15803d' },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PostDetailScreen;
