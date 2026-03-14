import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { listenReportsForAdmin } from '../../services/reports';
import type { ReportStatus } from '../../models/report';
import { formatDistanceToNow } from 'date-fns';

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminReportsInbox'>;

const AdminReportsInboxScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const [statusFilter, setStatusFilter] = useState<ReportStatus>('open');
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (!currentGroup || currentMembership?.role !== 'admin') return;
    const unsub = listenReportsForAdmin(currentGroup.id, statusFilter, setReports);
    return () => unsub();
  }, [currentGroup?.id, statusFilter, currentMembership?.role]);

  if (!currentGroup || currentMembership?.role !== 'admin') {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Admins only</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const created = (item.createdAt as any)?.toDate?.() ?? null;
    const when = created ? formatDistanceToNow(created, { addSuffix: true }) : '';
    const badge =
      item.status === 'resolved'
        ? 'Resolved'
        : item.status === 'in_review'
        ? 'In review'
        : 'Open';
    const assigned = item.assignedToName || item.assignedToUid || '';
    const target = item.target?.targetName || item.target?.targetUid || '';
    return (
      <Card style={styles.card} onPress={() => navigation.navigate('AdminReportDetail', { reportId: item.id })}>
        <Card.Title title={`${item.reason} • ${item.type}`} subtitle={when} />
        <Card.Content>
          <Text variant="bodySmall">Reporter: {item.createdByName || item.createdByUid}</Text>
          {target ? <Text variant="bodySmall">Target: {target}</Text> : null}
          {assigned ? <Text variant="bodySmall">Assigned: {assigned}</Text> : null}
          <Text style={styles.badge}>{badge}</Text>
          {item.evidence?.postTextSnippet ? (
            <Text variant="bodySmall" numberOfLines={2}>
              {item.evidence.postTextSnippet}
            </Text>
          ) : null}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        Reports
      </Text>
      <SegmentedButtons
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as ReportStatus)}
        buttons={[
          { value: 'open', label: 'Open' },
          { value: 'in_review', label: 'In Review' },
          { value: 'resolved', label: 'Resolved' },
        ]}
      />
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.muted}>No reports in this status.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700' },
  card: { marginTop: 8 },
  muted: { color: '#6b7280', marginTop: 12 },
  badge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
});

export default AdminReportsInboxScreen;
