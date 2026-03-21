import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { listenPostsByAuthor } from '../../services/posts';
import type { PostRequest, PostType } from '../../models/postRequest';
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
  const [activeTab, setActiveTab] = useState<PostType>('daha');
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
      unsub = listenPostsByAuthor(currentGroup.id, user.uid, (data) => {
        setPosts(data);
        setLoading(false);
      }, activeTab);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
      setLoading(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [currentGroup?.id, user?.uid, activeTab]);

  const openPosts = useMemo(() => posts.filter((p) => p.status === 'open'), [posts]);
  const closedPosts = useMemo(
    () => posts.filter((p) => p.status === 'borrowed' || p.status === 'claimed'),
    [posts]
  );

  const isDawa = activeTab === 'dawa';

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const renderPostRow = (item: PostRequest) => {
    const isOpen = item.status === 'open';
    const statusLabel = isOpen ? 'Open' : isDawa ? 'Claimed' : 'Borrowed';

    return (
      <Pressable
        key={item.id}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        style={({ pressed }) => [
          styles.postRow,
          { backgroundColor: pressed ? `${theme.colors.primary}08` : theme.colors.surface },
        ]}
      >
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnailPlaceholder, { backgroundColor: `${theme.colors.primary}12` }]}>
            <MaterialCommunityIcons
              name={isDawa ? 'gift-outline' : 'package-variant'}
              size={22}
              color={theme.colors.primary}
            />
          </View>
        )}

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

        <View style={styles.postRight}>
          <Text style={styles.statusText}>{statusLabel}</Text>
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
        posts.length === 0 ? styles.empty : undefined,
      ]}
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <View style={styles.content}>
          {/* Tab switcher */}
          <View style={[styles.tabSwitcher, { backgroundColor: theme.colors.surface }]}>
            <Pressable
              onPress={() => setActiveTab('daha')}
              style={[
                styles.tabButton,
                activeTab === 'daha' && { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'daha' ? '#fff' : '#8E8E93' }]}>
                My Requests
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('dawa')}
              style={[
                styles.tabButton,
                activeTab === 'dawa' && { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'dawa' ? '#fff' : '#8E8E93' }]}>
                My Donations
              </Text>
            </Pressable>
          </View>

          {/* Stats summary */}
          <View style={[styles.statsRow, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{posts.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{openPosts.length}</Text>
              <Text style={styles.statLabel}>Open</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{closedPosts.length}</Text>
              <Text style={styles.statLabel}>{isDawa ? 'Claimed' : 'Borrowed'}</Text>
            </View>
          </View>

          {/* Open posts */}
          {openPosts.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#8E8E93' }]}>
                {isDawa ? 'Active Donations' : 'Open Requests'}
              </Text>
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

          {/* Closed posts */}
          {closedPosts.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#8E8E93' }]}>
                {isDawa ? 'Claimed' : 'Borrowed'}
              </Text>
              <View style={[styles.listCard, { backgroundColor: theme.colors.surface }]}>
                {closedPosts.map((item, i) => (
                  <View key={item.id}>
                    {i > 0 ? <View style={[styles.rowDivider, { backgroundColor: theme.colors.outline }]} /> : null}
                    {renderPostRow(item)}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* All empty */}
          {posts.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <MaterialCommunityIcons
                name={isDawa ? 'gift-outline' : 'package-variant-closed'}
                size={40}
                color="#C7C7CC"
              />
              <Text style={styles.emptyTitle}>
                {isDawa ? 'No donations yet' : 'No requests yet'}
              </Text>
              <Text style={styles.emptyHint}>
                {isDawa
                  ? 'Your donations will show up here'
                  : 'Your borrow requests will show up here'}
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

  /* Tab switcher */
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
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
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
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
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
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
