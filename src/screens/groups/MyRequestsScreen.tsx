import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { listenPosts } from '../../services/posts';
import type { PostRequest } from '../../models/postRequest';
import { SPACING, RADIUS } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<GroupStackParamList>;

const formatRelative = (dateValue: any) => {
  const date = dateValue?.toDate ? dateValue.toDate() : dateValue instanceof Date ? dateValue : null;
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const MyRequestsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { currentGroup } = useGroupContext();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentGroup || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let unsub: (() => void) | undefined;
    try {
      unsub = listenPosts(currentGroup.id, (data) => {
        setPosts(data);
        setLoading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
      setLoading(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [currentGroup?.id, user?.uid]);

  const myPosts = useMemo(
    () => posts.filter((p) => p.authorUid === user?.uid),
    [posts, user?.uid]
  );

  const openPosts = useMemo(() => myPosts.filter((p) => p.status === 'open'), [myPosts]);
  const borrowedPosts = useMemo(() => myPosts.filter((p) => p.status === 'borrowed'), [myPosts]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const renderPostRow = (item: PostRequest) => {
    const isOpen = item.status === 'open';
    const statusColor = isOpen ? '#34C759' : '#FF9500';
    const statusLabel = isOpen ? 'Open' : 'Borrowed';
    const statusIcon = isOpen ? 'clock-outline' : 'check-circle-outline';

    return (
      <Pressable
        key={item.id}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        style={({ pressed }) => [
          styles.postRow,
          { backgroundColor: pressed ? `${theme.colors.primary}08` : theme.colors.surface },
        ]}
      >
        {/* Thumbnail or icon */}
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnailPlaceholder, { backgroundColor: `${theme.colors.primary}12` }]}>
            <MaterialCommunityIcons name="package-variant" size={22} color={theme.colors.primary} />
          </View>
        )}

        {/* Info */}
        <View style={styles.postInfo}>
          <Text style={[styles.postTitle, { color: '#1C1C1E' }]} numberOfLines={1}>
            {item.text}
          </Text>
          <View style={styles.postMeta}>
            {item.audienceTag ? (
              <View style={[styles.tag, { backgroundColor: `${theme.colors.primary}12` }]}>
                <Text style={[styles.tagText, { color: theme.colors.primary }]}>{item.audienceTag}</Text>
              </View>
            ) : null}
            {item.category ? (
              <View style={[styles.tag, { backgroundColor: '#8E8E9315' }]}>
                <Text style={[styles.tagText, { color: '#8E8E93' }]}>{item.category}</Text>
              </View>
            ) : null}
            {item.createdAt ? (
              <Text style={styles.timeText}>{formatRelative(item.createdAt)}</Text>
            ) : null}
          </View>
        </View>

        {/* Status + chevron */}
        <View style={styles.postRight}>
          <View style={[styles.statusChip, { backgroundColor: `${statusColor}15` }]}>
            <MaterialCommunityIcons name={statusIcon as any} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.list,
        myPosts.length === 0 ? styles.empty : undefined,
      ]}
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <View style={styles.content}>
          {/* Stats summary */}
          <View style={[styles.statsRow, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{myPosts.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>{openPosts.length}</Text>
              <Text style={styles.statLabel}>Open</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#FF9500' }]}>{borrowedPosts.length}</Text>
              <Text style={styles.statLabel}>Borrowed</Text>
            </View>
          </View>

          {/* Open requests */}
          {openPosts.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: '#34C759' }]} />
                <Text style={[styles.sectionTitle, { color: '#1C1C1E' }]}>Open Requests</Text>
                <View style={[styles.countBadge, { backgroundColor: '#34C75920' }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#34C759' }}>{openPosts.length}</Text>
                </View>
              </View>
              <View style={[styles.listCard, { backgroundColor: theme.colors.surface }]}>
                {openPosts.map((item, i) => (
                  <View key={item.id}>
                    {i > 0 ? <View style={[styles.rowDivider, { backgroundColor: theme.colors.outline }]} /> : null}
                    {renderPostRow(item)}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Borrowed */}
          {borrowedPosts.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: '#FF9500' }]} />
                <Text style={[styles.sectionTitle, { color: '#1C1C1E' }]}>Borrowed</Text>
                <View style={[styles.countBadge, { backgroundColor: '#FF950020' }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF9500' }}>{borrowedPosts.length}</Text>
                </View>
              </View>
              <View style={[styles.listCard, { backgroundColor: theme.colors.surface }]}>
                {borrowedPosts.map((item, i) => (
                  <View key={item.id}>
                    {i > 0 ? <View style={[styles.rowDivider, { backgroundColor: theme.colors.outline }]} /> : null}
                    {renderPostRow(item)}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* All empty */}
          {myPosts.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <MaterialCommunityIcons name="package-variant-closed" size={40} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptyHint}>
                Your borrow requests will show up here
              </Text>
            </View>
          ) : null}
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 80,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flexGrow: 1,
  },
  content: {
    gap: SPACING.sm,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 18,
    borderRadius: RADIUS.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },

  /* Sections */
  section: {
    gap: 8,
  },
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
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },

  /* Post row */
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    gap: 12,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  thumbnailPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postInfo: {
    flex: 1,
    gap: 4,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  postRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Empty */
  emptyCard: {
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
    marginTop: SPACING.md,
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
});

export default MyRequestsScreen;
