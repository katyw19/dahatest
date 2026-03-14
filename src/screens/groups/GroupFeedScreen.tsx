import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Card, IconButton, Text, useTheme, FAB, Button, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGroupContext } from './GroupProvider';
import { listenPosts } from '../../services/posts';
import type { PostRequest } from '../../models/postRequest';
import {
  listenPinnedAnnouncements,
  unpinAnnouncement,
  deleteAnnouncement,
} from '../../services/announcements';
import type { Announcement } from '../../models/announcement';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Membership } from '../../models/membership';
import { listenUserProfiles } from '../../services/userProfiles';
import { resolveDisplayName } from '../../utils/displayName';
import { getFirebaseDb } from '../../services/firebase';
import AppCard from '../../components/AppCard';
import TagChip from '../../components/TagChip';
import StatusPill from '../../components/StatusPill';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

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

type Nav = NativeStackNavigationProp<GroupStackParamList>;

const GroupFeedScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { currentGroup, currentMembership } = useGroupContext();

  const [posts, setPosts] = useState<PostRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberMap, setMemberMap] = useState<Record<string, Membership>>({});
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});
  const authorUids = useMemo(
    () => posts.map((p) => p.authorUid).filter(Boolean) as string[],
    [posts]
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
    if (!authorUids.length) return;
    let unsub: (() => void) | undefined;
    try {
      unsub = listenUserProfiles(authorUids, setProfileMap);
    } catch {
      // ignore
    }
    return () => {
      if (unsub) unsub();
    };
  }, [authorUids]);

  // ✅ Hooks MUST be above all early returns.
  const activeAnnouncements = useMemo(() => {
    const now = Date.now();
    return announcements.filter((a) => {
      const expires = (a as any).expiresAt?.toDate ? (a as any).expiresAt.toDate().getTime() : null;
      return !expires || expires > now;
    });
  }, [announcements]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      const member = memberMap[p.authorUid];
      const profile = profileMap[p.authorUid];
      const authorName = resolveDisplayName({
        displayName: member?.displayName || profile?.displayName || p.authorDisplayName,
        firstName: member?.firstName || profile?.firstName || p.authorFirstName,
        lastName: member?.lastName || profile?.lastName || p.authorLastName,
        fallbackUid: p.authorUid,
      }).toLowerCase();
      return [
        p.text,
        p.category,
        p.size,
        p.audienceTag,
        authorName,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [posts, searchQuery, memberMap, profileMap]);

  const sortedPosts = useMemo(() => {
    const sorted = [...filteredPosts].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'open' ? -1 : 1; // Open before borrowed
      }
      const ta: any = (a as any).createdAt;
      const tb: any = (b as any).createdAt;
      const da = ta?.toDate ? ta.toDate().getTime() : 0;
      const dbt = tb?.toDate ? tb.toDate().getTime() : 0;
      return dbt - da; // newest first within each section
    });
    return sorted;
  }, [filteredPosts]);

  const firstBorrowedIndex = useMemo(() => {
    return sortedPosts.findIndex((p) => p.status === 'borrowed');
  }, [sortedPosts]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {currentMembership?.role === 'admin' ? (
            <IconButton icon="account-plus" onPress={() => navigation.navigate('GroupInvite')} />
          ) : null}
          <IconButton icon="chat" onPress={() => navigation.navigate('ChatsList')} />
          {currentMembership?.role === 'admin' ? (
            <IconButton icon="dots-vertical" onPress={() => navigation.navigate('AdminTools')} />
          ) : null}
        </View>
      ),
    });
  }, [navigation, currentMembership?.role]);

  useEffect(() => {
    if (!currentGroup) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let unsubPosts: (() => void) | undefined;
    let unsubAnn: (() => void) | undefined;

    try {
      unsubPosts = listenPosts(currentGroup.id, (data) => {
        setPosts(data);
        // We do not setLoading(false) here because announcements may still be loading.
      });

      unsubAnn = listenPinnedAnnouncements(currentGroup.id, (data) => {
        setAnnouncements(data);
        // Once we receive announcements (even empty), feed can be considered loaded.
        setLoading(false);
      });

      // Fallback: if announcements listener never fires for some reason, stop loading after a moment.
      const t = setTimeout(() => setLoading(false), 1500);

      return () => {
        clearTimeout(t);
        if (unsubPosts) unsubPosts();
        if (unsubAnn) unsubAnn();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
      setLoading(false);
      return () => {
        if (unsubPosts) unsubPosts();
        if (unsubAnn) unsubAnn();
      };
    }
  }, [currentGroup?.id]);

  // ✅ Early returns AFTER hooks
  if (!currentGroup || !currentMembership) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Join a group to view the feed.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const renderAnnouncement = (item: Announcement) => {
    const when = formatRelative((item as any).createdAt);
    return (
      <Card key={item.id} style={styles.announcementCard} mode="outlined">
        <Card.Title title="Announcement" subtitle={`${item.createdByName || ''} ${when}`} />
        <Card.Content>
          <Text variant="bodyMedium">{item.text}</Text>
        </Card.Content>
        {currentMembership?.role === 'admin' ? (
          <Card.Actions>
            <Button
              compact
              onPress={() => currentGroup && unpinAnnouncement(currentGroup.id, item.id)}
            >
              Unpin
            </Button>
            <Button
              compact
              textColor="#b91c1c"
              onPress={() => currentGroup && deleteAnnouncement(currentGroup.id, item.id)}
            >
              Delete
            </Button>
          </Card.Actions>
        ) : null}
      </Card>
    );
  };

  const renderPostCard = (item: PostRequest) => {
    const member = memberMap[item.authorUid];
    const profile = profileMap[item.authorUid];
    const name = resolveDisplayName({
      displayName: member?.displayName || profile?.displayName || item.authorDisplayName,
      firstName: member?.firstName || profile?.firstName || item.authorFirstName,
      lastName: member?.lastName || profile?.lastName || item.authorLastName,
      fallbackUid: item.authorUid,
    });

    return (
      <AppCard
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
      >
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => navigation.navigate('UserProfile', { uid: item.authorUid })}
            style={({ pressed }) => [
              styles.namePill,
              { backgroundColor: theme.colors.secondary, borderColor: theme.colors.outline },
              pressed ? styles.namePillPressed : null,
            ]}
          >
            <Text variant="titleSmall" style={[styles.nameText, { color: theme.colors.onSecondary }]}>
              {name}
            </Text>
          </Pressable>
          {item.authorGradeTag ? <TagChip label={item.authorGradeTag} /> : null}
          {item.authorRole === 'admin' ? <Text style={styles.adminBadge}>Admin</Text> : null}
        </View>
        <Text variant="bodySmall" style={styles.subtle}>
          {formatRelative((item as any).createdAt)}
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: SPACING.xs }}>
          {item.text}
        </Text>
        <View style={styles.tags}>
          <TagChip label={`Audience: ${item.audienceTag || 'Anyone'}`} />
          <StatusPill status={item.status ?? 'open'} />
        </View>
      </AppCard>
    );
  };

  return (
    <Screen>
      {error ? (
        <Text style={[styles.error, { padding: 12 }]} variant="bodySmall">
          {error}
        </Text>
      ) : null}

      <FlatList
        data={sortedPosts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ gap: SPACING.sm, marginBottom: SPACING.sm }}>
            <TextInput
              placeholder="Search requests…"
              mode="outlined"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ backgroundColor: theme.colors.surface }}
              right={
                searchQuery ? (
                  <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} />
                ) : null
              }
            />
            {activeAnnouncements.length ? (
              <View style={{ gap: SPACING.sm }}>
                {activeAnnouncements.map(renderAnnouncement)}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <>
            {index === firstBorrowedIndex && firstBorrowedIndex !== -1 ? (
              <Text style={styles.sectionLabel}>Borrowed (closed)</Text>
            ) : null}
            {renderPostCard(item)}
          </>
        )}
        contentContainerStyle={[
          styles.list,
          sortedPosts.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={<Text variant="bodyMedium">No requests yet. Be the first to ask!</Text>}
      />

      <FAB
        icon="plus"
        onPress={() => navigation.navigate('CreatePost')}
        label="New Request"
        style={[
          styles.fab,
          { backgroundColor: theme.colors.primary }, // ✅ forces theme color
        ]}
        color={theme.colors.onPrimary}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.lg,
  },
  announcementCard: {
    marginBottom: SPACING.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  namePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  namePillPressed: {
    opacity: 0.8,
  },
  nameText: {
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tags: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  adminBadge: {
    backgroundColor: '#e0e7ff',
    color: '#312e81',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    fontSize: 12,
  },
  error: {
    color: '#b91c1c',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    color: '#4b5563',
  },
  subtle: {
    color: '#6b7280',
  },
});

export default GroupFeedScreen;
