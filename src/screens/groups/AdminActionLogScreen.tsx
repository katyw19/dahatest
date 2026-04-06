import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { listenAdminActions } from '../../services/adminActions';
import { formatDistanceToNow } from 'date-fns';
import Screen from '../../components/Screen';
import { SPACING } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminActionLog'>;

const actionIcon = (type?: string): string => {
  switch (type) {
    case 'warn':
      return 'alert-outline';
    case 'remove':
      return 'account-remove-outline';
    case 'ban':
      return 'cancel';
    default:
      return 'shield-outline';
  }
};

const actionColor = (type?: string): string => {
  switch (type) {
    case 'warn':
      return '#FF9500';
    case 'remove':
      return '#FF3B30';
    case 'ban':
      return '#FF3B30';
    default:
      return '#8E8E93';
  }
};

const AdminActionLogScreen = ({}: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const [actions, setActions] = useState<any[]>([]);

  useEffect(() => {
    if (!currentGroup || currentMembership?.role !== 'admin') return;
    const unsub = listenAdminActions(currentGroup.id, setActions);
    return () => unsub();
  }, [currentGroup?.id, currentMembership?.role]);

  if (!currentGroup || currentMembership?.role !== 'admin') {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Admins only</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const when = item.createdAt?.toDate
      ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })
      : '';
    const aColor = actionColor(item.type);
    const admin = item.createdByName || item.createdByUid || '';
    const target = item.targetName || item.targetUid || '';
    const notePreview = item.note?.trim()
      ? item.note.length > 100 ? `${item.note.slice(0, 100)}…` : item.note
      : null;

    return (
      <View style={[styles.row, { borderBottomColor: theme.colors.outline }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${aColor}18` }]}>
          <MaterialCommunityIcons name={actionIcon(item.type) as any} size={20} color={aColor} />
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.actionType, { color: aColor }]}>
              {(item.type || 'action').charAt(0).toUpperCase() + (item.type || 'action').slice(1)}
            </Text>
            <Text style={styles.time}>{when}</Text>
          </View>

          <Text style={[styles.detail, { color: theme.colors.onSurface }]} numberOfLines={1}>
            <Text style={styles.bold}>{admin}</Text> → {target}
          </Text>

          {notePreview ? (
            <Text style={[styles.note, { color: theme.colors.onSurface }]} numberOfLines={2}>
              {notePreview}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Screen noTopPadding>
      <FlatList
        data={actions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={40} color="#C7C7CC" />
            <Text style={styles.emptyText}>No admin actions yet.</Text>
          </View>
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: SPACING.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionType: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  time: {
    color: '#8E8E93',
    fontSize: 12,
  },
  detail: {
    fontSize: 14,
  },
  bold: {
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 15,
  },
});

export default AdminActionLogScreen;
