import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { listenPosts } from '../../services/posts';
import type { PostRequest } from '../../models/postRequest';

type Nav = NativeStackNavigationProp<GroupStackParamList>;

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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.list,
        myPosts.length === 0 ? styles.empty : undefined,
      ]}
      data={myPosts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Card
          mode="outlined"
          style={styles.card}
          onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        >
          <Card.Title title={item.text} subtitle={item.audienceTag} />
        </Card>
      )}
      ListHeaderComponent={
        <Text variant="bodySmall" style={styles.headerNote}>
          Showing requests in: {currentGroup?.name ?? 'Group'}
        </Text>
      }
      ListEmptyComponent={
        <Text variant="bodyMedium">
          You haven&apos;t posted any requests in this group yet.
        </Text>
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 12,
    gap: 8,
  },
  card: {
    borderRadius: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNote: {
    color: '#6b7280',
    marginBottom: 8,
  },
});

export default MyRequestsScreen;
