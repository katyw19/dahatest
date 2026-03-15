import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { listenReportsForAdmin } from '../../services/reports';
import type { ReportStatus } from '../../models/report';
import { formatDistanceToNow } from 'date-fns';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

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

  const getStatusIcon = (status: string) => {
    if (status === 'resolved') return 'check-circle-outline';
    if (status === 'in_review') return 'progress-clock';
    return 'alert-circle-outline';
  };

  const getStatusColor = (status: string) => {
    if (status === 'resolved') return '#34C759';
    if (status === 'in_review') return '#FF9500';
    return theme.colors.primary;
  };

  const renderItem = ({ item }: { item: any }) => {
    const created = (item.createdAt as any)?.toDate?.() ?? null;
    const when = created ? formatDistanceToNow(created, { addSuffix: true }) : '';
    const statusColor = getStatusColor(item.status);
    const target = item.target?.targetName || '';
    const reporter = item.createdByName || item.createdByUid || '';

    return (
      <Pressable
        onPress={() => navigation.navigate('AdminReportDetail', { reportId: item.id })}
        style={({ pressed }) => [
          styles.reportRow,
          { borderBottomColor: theme.colors.outline },
          pressed && { backgroundColor: `${theme.colors.primary}08` },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${statusColor}18` }]}>
          <MaterialCommunityIcons name={getStatusIcon(item.status)} size={20} color={statusColor} />
        </View>

        <View style={styles.reportContent}>
          <View style={styles.topRow}>
            <Text style={[styles.reason, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {item.reason}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: theme.colors.secondary }]}>
              <Text style={[styles.typeText, { color: theme.colors.onSecondary }]}>{item.type}</Text>
            </View>
          </View>

          {target ? (
            <Text style={[styles.meta, { color: '#8E8E93' }]} numberOfLines={1}>
              Target: {target}
            </Text>
          ) : null}

          <Text style={[styles.meta, { color: '#8E8E93' }]} numberOfLines={1}>
            {reporter} · {when}
          </Text>

          {item.evidence?.postTextSnippet ? (
            <Text style={[styles.snippet, { color: theme.colors.onSurface }]} numberOfLines={1}>
              "{item.evidence.postTextSnippet}"
            </Text>
          ) : null}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
      </Pressable>
    );
  };

  return (
    <Screen>
      <SegmentedButtons
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as ReportStatus)}
        buttons={[
          { value: 'open', label: 'Open' },
          { value: 'in_review', label: 'In Review' },
          { value: 'resolved', label: 'Resolved' },
        ]}
        style={styles.segmented}
      />
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="inbox-outline" size={40} color="#C7C7CC" />
            <Text style={styles.emptyText}>No reports in this status.</Text>
          </View>
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segmented: { marginBottom: SPACING.sm },
  list: { paddingBottom: SPACING.xl },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  reportContent: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reason: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
  },
  snippet: {
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

export default AdminReportsInboxScreen;
