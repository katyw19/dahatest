import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme, FAB, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGroupContext } from './GroupProvider';
import { listenPosts } from '../../services/posts';
import type { PostRequest, PostType } from '../../models/postRequest';
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
import StatusPill from '../../components/StatusPill';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

const AVATAR_SIZE = 44;

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

  const [activeTab, setActiveTab] = useState<PostType>('daha');
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
      const aOpen = a.status === 'open';
      const bOpen = b.status === 'open';
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      const ta: any = (a as any).createdAt;
      const tb: any = (b as any).createdAt;
      const da = ta?.toDate ? ta.toDate().getTime() : 0;
      const dbt = tb?.toDate ? tb.toDate().getTime() : 0;
      return dbt - da;
    });
    return sorted;
  }, [filteredPosts]);

  const firstClosedIndex = useMemo(() => {
    return sortedPosts.findIndex((p) => p.status === 'borrowed' || p.status === 'claimed');
  }, [sortedPosts]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: -4 }}>
          {currentMembership?.role === 'admin' ? (
            <IconButton icon="account-plus" size={22} onPress={() => navigation.navigate('GroupInvite')} style={{ margin: 0 }} />
          ) : null}
          <IconButton icon="chat" size={22} onPress={() => navigation.navigate('ChatsList')} style={{ margin: 0 }} />
          {currentMembership?.role === 'admin' ? (
            <IconButton icon="dots-vertical" size={22} onPress={() => navigation.navigate('AdminTools')} style={{ margin: 0 }} />
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
      }, activeTab);

      unsubAnn = listenPinnedAnnouncements(currentGroup.id, (data) => {
        setAnnouncements(data);
        setLoading(false);
      });

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
  }, [currentGroup?.id, activeTab]);

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
      <View
        key={item.id}
        style={[
          styles.announcementWrap,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.annTopRow}>
          <MaterialCommunityIcons name="pin" size={13} color="#8E8E93" />
          <Text style={styles.annMeta}>
            {item.createdByName || 'Admin'} · {when}
          </Text>
          {currentMembership?.role === 'admin' ? (
            <View style={styles.annAdminRow}>
              <Pressable
                onPress={() => currentGroup && unpinAnnouncement(currentGroup.id, item.id)}
                hitSlop={6}
                style={({ pressed }) => pressed && { opacity: 0.5 }}
              >
                <Text style={styles.annAdminText}>Unpin</Text>
              </Pressable>
              <Text style={{ color: '#D1D1D6' }}>·</Text>
              <Pressable
                onPress={() => currentGroup && deleteAnnouncement(currentGroup.id, item.id)}
                hitSlop={6}
                style={({ pressed }) => pressed && { opacity: 0.5 }}
              >
                <Text style={styles.annAdminText}>Remove</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <Text style={[styles.annBody, { color: '#1C1C1E' }]}>{item.text}</Text>
      </View>
    );
  };

  const getInitials = (displayName: string) => {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
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
    const photoURL = profile?.photoURL;
    const timeAgo = formatRelative((item as any).createdAt);

    // Build the subtitle pieces: grade · Admin · 3h ago
    const subtitleParts: string[] = [];
    if (item.authorGradeTag) subtitleParts.push(item.authorGradeTag);
    if (item.authorRole === 'admin') subtitleParts.push('Admin');
    if (timeAgo) subtitleParts.push(timeAgo);

    return (
      <Pressable
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        style={({ pressed }) => [
          styles.postRow,
          { borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline },
          pressed && { backgroundColor: theme.colors.surfaceVariant ?? '#f5f5f5' },
        ]}
      >
        {/* Avatar */}
        <Pressable
          onPress={() => navigation.navigate('UserProfile', { uid: item.authorUid })}
          hitSlop={4}
        >
          <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.avatarInitials, { color: theme.colors.onPrimary }]}>
              {getInitials(name)}
            </Text>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            ) : null}
          </View>
        </Pressable>

        {/* Content */}
        <View style={styles.postContent}>
          {/* Name row */}
          <View style={styles.nameRow}>
            <View style={styles.nameGroup}>
              <Pressable
                onPress={() => navigation.navigate('UserProfile', { uid: item.authorUid })}
                hitSlop={4}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Text style={[styles.displayName, { color: '#1C1C1E' }]} numberOfLines={1}>{name}</Text>
              </Pressable>
              <Text style={[styles.subtitle, { color: '#6B7280' }]} numberOfLines={1}>
                {subtitleParts.join(' · ')}
              </Text>
            </View>
            <StatusPill status={item.status ?? 'open'} />
          </View>

          {/* Post text */}
          <Text style={styles.postText}>{item.text}</Text>

          {/* Post photo */}
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={[styles.postImage, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}
              resizeMode="cover"
            />
          ) : null}

          {/* Tags row */}
          {(item.category || item.audienceTag || item.size) ? (
            <View style={styles.tagsRow}>
              {item.category ? (
                <View style={[styles.tag, { backgroundColor: theme.colors.secondaryContainer ?? theme.colors.surface }]}>
                  <Text style={[styles.tagText, { color: theme.colors.onSecondaryContainer ?? theme.colors.onSurface }]}>
                    {item.category}
                  </Text>
                </View>
              ) : null}
              {item.size ? (
                <View style={[styles.tag, { backgroundColor: theme.colors.secondaryContainer ?? theme.colors.surface }]}>
                  <Text style={[styles.tagText, { color: theme.colors.onSecondaryContainer ?? theme.colors.onSurface }]}>
                    {item.size}
                  </Text>
                </View>
              ) : null}
              {item.audienceTag ? (
                <View style={[styles.tag, { backgroundColor: theme.colors.secondaryContainer ?? theme.colors.surface }]}>
                  <Text style={[styles.tagText, { color: theme.colors.onSecondaryContainer ?? theme.colors.onSurface }]}>
                    {item.audienceTag}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Screen noTopPadding>
      {/* Fixed tab switcher - always visible */}
      <View style={[styles.tabBar, { borderBottomColor: `${theme.colors.outline}30` }]}>
        <Pressable
          onPress={() => setActiveTab('daha')}
          style={[
            styles.tabItem,
            activeTab === 'daha' && [styles.tabItemActive, { borderBottomColor: theme.colors.primary }],
          ]}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'daha' ? theme.colors.primary : '#8E8E93' },
            ]}
          >
            DAHA
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('dawa')}
          style={[
            styles.tabItem,
            activeTab === 'dawa' && [styles.tabItemActive, { borderBottomColor: theme.colors.primary }],
          ]}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'dawa' ? theme.colors.primary : '#8E8E93' },
            ]}
          >
            DAWA
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={[styles.error, { padding: 12 }]} variant="bodySmall">
          {error}
        </Text>
      ) : null}

      <FlatList
        data={sortedPosts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <TextInput
              placeholder={activeTab === 'daha' ? 'Search requests…' : 'Search donations…'}
              mode="outlined"
              dense
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ backgroundColor: theme.colors.surface }}
              outlineStyle={{ borderRadius: RADIUS.xl }}
              left={<TextInput.Icon icon="magnify" />}
              right={
                searchQuery ? (
                  <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} />
                ) : null
              }
            />
            {activeTab === 'daha' && activeAnnouncements.length ? (
              <View style={{ gap: SPACING.sm }}>
                {activeAnnouncements.map(renderAnnouncement)}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <>
            {index === firstClosedIndex && firstClosedIndex !== -1 ? (
              <View style={[styles.sectionDivider, { borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline }]}>
                <Text style={[styles.sectionLabel, { color: '#6B7280' }]}>
                  {activeTab === 'daha' ? 'Borrowed' : 'Claimed'}
                </Text>
              </View>
            ) : null}
            {renderPostCard(item)}
          </>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <MaterialCommunityIcons
              name={activeTab === 'daha' ? 'package-variant-closed' : 'gift-outline'}
              size={40}
              color="#C7C7CC"
            />
            <Text variant="titleMedium" style={{ color: '#8E8E93' }}>
              {activeTab === 'daha' ? 'No requests yet' : 'No donations yet'}
            </Text>
            <Text variant="bodyMedium" style={{ color: '#C7C7CC', textAlign: 'center' }}>
              {activeTab === 'daha'
                ? 'Be the first to ask for something!'
                : 'Be the first to share something!'}
            </Text>
          </View>
        }
      />

      <FAB
        icon={activeTab === 'daha' ? 'plus' : 'gift-outline'}
        onPress={() =>
          navigation.navigate(activeTab === 'daha' ? 'CreatePost' : 'CreateDonation')
        }
        label={activeTab === 'daha' ? 'Request' : 'Donate'}
        style={[
          styles.fab,
          { backgroundColor: theme.colors.primary },
        ]}
        color={theme.colors.onPrimary}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingBottom: 80,
  },
  listHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  postRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    ...StyleSheet.absoluteFillObject,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  postContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameGroup: {
    flex: 1,
    marginRight: 8,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  announcementWrap: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  annTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  annMeta: {
    fontSize: 12,
    color: '#8E8E93',
    flex: 1,
  },
  annAdminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  annAdminText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  annBody: {
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: 18,
  },
  sectionDivider: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  error: {
    color: '#b91c1c',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
});

export default GroupFeedScreen;
