import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, Text, useTheme } from 'react-native-paper';
import { useGroupContext } from './GroupProvider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useEffect, useState } from 'react';
import { listenMyMemberships } from '../../services/groups';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<GroupStackParamList, 'SwitchGroup'>;

const SwitchGroupScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { memberships, setActiveGroup } = useGroupContext();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [localMemberships, setLocalMemberships] = useState(memberships);

  useEffect(() => {
    setLocalMemberships(memberships);
  }, [memberships]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenMyMemberships(user.uid, (ms) => setLocalMemberships(ms));
    return () => unsub();
  }, [user?.uid]);

  const handleSelect = async (groupId: string) => {
    await setActiveGroup(groupId);
    navigation.goBack();
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      data={localMemberships}
      keyExtractor={(item) => item.groupId}
      ListHeaderComponent={
        <Text variant="headlineSmall" style={styles.title}>
          Switch group
        </Text>
      }
      renderItem={({ item }) => (
        <Card style={styles.card} mode="outlined">
          <Card.Title title={item.groupName ?? item.groupId} subtitle={`Role: ${item.role}`} />
          <Card.Actions>
            <Button mode="contained" onPress={() => handleSelect(item.groupId)}>
              Switch
            </Button>
          </Card.Actions>
        </Card>
      )}
      ListFooterComponent={
        <View style={styles.footer}>
          <Divider />
          <Button
            mode="outlined"
            icon="plus"
            onPress={() => navigation.navigate('CreateGroupDetails')}
          >
            Create a new group
          </Button>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text>No memberships found. If you were just approved, try pulling to refresh.</Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            if (user) {
              const unsub = listenMyMemberships(user.uid, (ms) => {
                setLocalMemberships(ms);
                setRefreshing(false);
                unsub();
              });
            } else {
              setRefreshing(false);
            }
          }}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  card: {
    borderRadius: 8,
    marginBottom: 8,
  },
  empty: {
    alignItems: 'center',
    marginTop: 24,
  },
  footer: {
    marginTop: 12,
    gap: 8,
  },
});

export default SwitchGroupScreen;
