import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { listenAdminActions } from '../../services/adminActions';
import { formatDistanceToNow } from 'date-fns';

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminActionLog'>;

const AdminActionLogScreen = ({ navigation }: Props) => {
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
    const when = item.createdAt?.toDate ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true }) : '';
    return (
      <Card style={styles.card}>
        <Card.Title
          title={`${item.type} → ${item.targetName || item.targetUid || ''}`}
          subtitle={`${item.createdByName || item.createdByUid || ''} • ${when}`}
        />
        <Card.Content>
          <Text variant="bodySmall">
            {item.note?.trim() ? item.note.slice(0, 120) : '(no note)'}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        Admin Actions
      </Text>
      <FlatList
        data={actions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.muted}>No admin actions yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700' },
  card: { marginTop: 8 },
  muted: { color: '#6b7280', marginTop: 12 },
});

export default AdminActionLogScreen;
