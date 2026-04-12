import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGroupContext } from './GroupProvider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useEffect, useState } from 'react';
import { listenMyMemberships } from '../../services/groups';
import { useAuth } from '../../context/AuthContext';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'SwitchGroup'>;

const SwitchGroupScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { memberships, setActiveGroup, currentGroup } = useGroupContext();
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
      renderItem={({ item }) => {
        const isActive = item.groupId === currentGroup?.id;
        return (
          <Pressable
            onPress={() => handleSelect(item.groupId)}
            style={({ pressed }) => [
              styles.groupRow,
              { backgroundColor: pressed ? `${theme.colors.primary}08` : theme.colors.surface },
              isActive && { borderColor: theme.colors.primary, borderWidth: 1.5 },
            ]}
          >
            <View style={[styles.groupIcon, { backgroundColor: `${theme.colors.primary}12` }]}>
              <MaterialCommunityIcons name="account-group" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{item.groupName ?? item.groupId}</Text>
              <Text style={styles.groupRole}>{item.role}</Text>
            </View>
            {isActive ? (
              <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
            )}
          </Pressable>
        );
      }}
      ListFooterComponent={
        <View style={styles.footerButtons}>
          <Pressable
            onPress={() => navigation.navigate('JoinGroup')}
            style={({ pressed }) => [
              styles.actionRow,
              { borderColor: '#DBDBDB', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="key-variant" size={20} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>Join with invite code</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('CreateGroupDetails')}
            style={({ pressed }) => [
              styles.actionRow,
              { borderColor: '#DBDBDB', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>Create a new group</Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialCommunityIcons name="account-group-outline" size={40} color="#D1D1D6" />
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptyHint}>Join or create a group to get started</Text>
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
    padding: SPACING.md,
    gap: 8,
    paddingBottom: 40,
  },

  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADIUS.md,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F0F0F0',
  },
  groupIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
    gap: 2,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  groupRole: {
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },

  footerButtons: {
    gap: 8,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },

  empty: {
    alignItems: 'center',
    paddingTop: 48,
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
  },
});

export default SwitchGroupScreen;
