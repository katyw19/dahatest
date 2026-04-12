import { useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { deletePost } from '../../services/posts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { RADIUS, SPACING } from '../../theme/spacing';

const AVATAR_SIZE = 48;

const formatRelative = (dateValue: any) => {
  const date = dateValue?.toDate ? dateValue.toDate() : null;
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

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

  const uid = user?.uid ?? '';
  const offersSafe = offers ?? [];

  const isAuthor = !!uid && !!post?.authorUid && uid === post.authorUid;
  const isDawa = post?.type === 'dawa';
  const isClosed = post?.status === 'borrowed' || post?.status === 'claimed';

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
  const photoURL = authorProfile?.photoURL;

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

  const timeAgo = formatRelative((post as any)?.createdAt);

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

  const handleDeletePost = () => {
    if (!currentGroup) return;
    Alert.alert(
      'Delete post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(currentGroup.id, postId);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete post.');
            }
          },
        },
      ]
    );
  };

  const handleMoreMenu = () => {
    const options = isAuthor
      ? ['Delete Post', 'Report', 'Cancel']
      : ['Report', 'Cancel'];
    const destructiveIndex = isAuthor ? 0 : -1;
    const cancelIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIndex, cancelButtonIndex: cancelIndex },
        (idx) => {
          if (isAuthor) {
            if (idx === 0) handleDeletePost();
            if (idx === 1) navigation.navigate('ReportCreate', {
              type: 'post', postId, targetUid: post?.authorUid,
              targetName: displayName, snippet: post?.text?.slice(0, 140) ?? '',
            });
          } else {
            if (idx === 0) navigation.navigate('ReportCreate', {
              type: 'post', postId, targetUid: post?.authorUid,
              targetName: displayName, snippet: post?.text?.slice(0, 140) ?? '',
            });
          }
        }
      );
    } else {
      // Android fallback
      Alert.alert('Options', undefined, [
        ...(isAuthor ? [{ text: 'Delete Post', style: 'destructive' as const, onPress: handleDeletePost }] : []),
        { text: 'Report', onPress: () => navigation.navigate('ReportCreate', {
          type: 'post', postId, targetUid: post?.authorUid,
          targetName: displayName, snippet: post?.text?.slice(0, 140) ?? '',
        })},
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="dots-horizontal"
          size={22}
          style={{ margin: 0 }}
          iconColor={theme.colors.onSurface}
          onPress={handleMoreMenu}
        />
      ),
    });
  }, [navigation, postId, post?.authorUid, post?.text, displayName, theme.colors.onSurface, isAuthor]);

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

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const subtitleParts: string[] = [];
  if (post.authorGradeTag) subtitleParts.push(post.authorGradeTag);
  if (post.authorRole === 'admin') subtitleParts.push('Admin');
  if (timeAgo) subtitleParts.push(timeAgo);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Author header ────────────────────────────── */}
      <View style={styles.authorRow}>
        <Pressable
          onPress={() => navigation.navigate('UserProfile', { uid: post.authorUid })}
          hitSlop={6}
        >
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.authorInfo}>
          <Pressable
            onPress={() => navigation.navigate('UserProfile', { uid: post.authorUid })}
            hitSlop={4}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <Text style={[styles.authorName, { color: theme.colors.primary }]}>{displayName}</Text>
          </Pressable>
          <Text style={[styles.authorMeta, { color: '#8E8E93' }]}>
            {subtitleParts.join(' · ')}
          </Text>
        </View>

        {/* Status pill */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isClosed ? '#F0F0F0' : `${theme.colors.primary}14`,
              borderColor: isClosed ? '#D1D1D6' : theme.colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isClosed ? '#8E8E93' : theme.colors.primary },
            ]}
          >
            {isClosed ? (isDawa ? 'Claimed' : 'Borrowed') : 'Open'}
          </Text>
        </View>
      </View>

      {/* ── Post body ────────────────────────────────── */}
      <Text style={[styles.postBody, { color: theme.colors.onBackground }]}>{post.text}</Text>

      {/* ── Photo ────────────────────────────────────── */}
      {post.photoUrl ? (
        <Image
          source={{ uri: post.photoUrl }}
          style={[styles.postImage, { borderColor: theme.colors.outline }]}
          resizeMode="cover"
        />
      ) : null}

      {/* ── Tags ─────────────────────────────────────── */}
      {(post.category || post.audienceTag || post.size || post.neededBy || (isDawa && post.condition)) ? (
        <View style={styles.tagsRow}>
          {post.category ? (
            <View style={[styles.tag, { backgroundColor: theme.colors.secondary }]}>
              <Text style={[styles.tagLabel, { color: theme.colors.onSecondary }]}>
                {post.category}
              </Text>
            </View>
          ) : null}
          {post.size ? (
            <View style={[styles.tag, { backgroundColor: theme.colors.secondary }]}>
              <Text style={[styles.tagLabel, { color: theme.colors.onSecondary }]}>
                Size {post.size}
              </Text>
            </View>
          ) : null}
          {post.audienceTag ? (
            <View style={[styles.tag, { backgroundColor: theme.colors.secondary }]}>
              <Text style={[styles.tagLabel, { color: theme.colors.onSecondary }]}>
                {post.audienceTag}
              </Text>
            </View>
          ) : null}
          {post.neededBy ? (
            <View style={[styles.tag, { backgroundColor: theme.colors.secondary }]}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={theme.colors.onSecondary} />
              <Text style={[styles.tagLabel, { color: theme.colors.onSecondary }]}>
                Need by {post.neededBy}
              </Text>
            </View>
          ) : null}
          {isDawa && post.condition ? (
            <View style={[styles.tag, { backgroundColor: theme.colors.secondary }]}>
              <Text style={[styles.tagLabel, { color: theme.colors.onSecondary }]}>
                {{ new: 'New', gently_used: 'Gently Used', visibly_used: 'Visibly Used' }[post.condition] ?? post.condition} condition
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Divider ──────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

      {/* ── Accepted offer info ──────────────────────── */}
      {acceptedOffer ? (
        <View style={styles.acceptedRow}>
          <MaterialCommunityIcons
            name={isDawa ? 'gift-outline' : 'handshake-outline'}
            size={18}
            color={theme.colors.primary}
          />
          <Text style={[styles.acceptedText, { color: theme.colors.onSurface }]}>
            {isDawa ? 'Giving to' : 'Lending from'}{' '}
            <Text style={{ fontWeight: '700' }}>{acceptedLenderName}</Text>
          </Text>
        </View>
      ) : null}

      {/* ── Action buttons ───────────────────────────── */}
      {acceptedOffer && threadId && (isAuthor || user?.uid === acceptedOffer.lenderUid) ? (
        <Pressable
          onPress={() => navigation.navigate('ChatThread', { threadId })}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="chat-outline" size={18} color={theme.colors.onPrimary} />
          <Text style={[styles.primaryBtnText, { color: theme.colors.onPrimary }]}>Open Chat</Text>
        </Pressable>
      ) : null}

      {!isAuthor && !isClosed ? (
        alreadyOffered ? (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#8E8E93" />
            <Text style={styles.infoText}>
              {isDawa ? 'You already requested this item.' : 'You already made an offer on this request.'}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() =>
              navigation.navigate(isDawa ? 'BidCreate' : 'OfferCreate', { postId })
            }
            disabled={!currentMembership}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialCommunityIcons
              name={isDawa ? 'hand-wave-outline' : 'hand-heart-outline'}
              size={18}
              color={theme.colors.onPrimary}
            />
            <Text style={[styles.primaryBtnText, { color: theme.colors.onPrimary }]}>
              {isDawa ? 'I want this' : 'I can lend this'}
            </Text>
          </Pressable>
        )
      ) : null}

      {isAuthor ? (
        <Pressable
          onPress={() =>
            navigation.navigate(isDawa ? 'BidsList' : 'OffersList', {
              postId,
              postAuthorUid: post.authorUid,
            })
          }
          style={({ pressed }) => [
            styles.outlineBtn,
            {
              borderColor: theme.colors.primary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isDawa ? 'hand-wave-outline' : 'gift-outline'}
            size={18}
            color={theme.colors.primary}
          />
          <Text style={[styles.outlineBtnText, { color: theme.colors.primary }]}>
            {isDawa ? `See Requests (${offersSafe.length})` : `See Offers (${offersSafe.length})`}
          </Text>
        </Pressable>
      ) : null}

      {offerError ? (
        <Text style={styles.error} variant="bodySmall">
          {offerError}
        </Text>
      ) : null}

      {offeredSuccess ? (
        <View style={styles.successRow}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />
          <Text style={styles.successText}>Offer sent!</Text>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
    gap: 16,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Author header */
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  authorMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Post body */
  postBody: {
    fontSize: 17,
    lineHeight: 25,
  },

  /* Image */
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },

  /* Tags */
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagLabel: {
    fontSize: 13,
    fontWeight: '500',
  },

  /* Divider */
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },

  /* Accepted offer */
  acceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptedText: {
    fontSize: 14,
  },

  /* Buttons */
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  /* Info / success */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  infoText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  successText: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#b91c1c',
  },

  /* Header icon */
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
