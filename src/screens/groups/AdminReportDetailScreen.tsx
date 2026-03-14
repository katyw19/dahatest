import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { listenReportById, updateReport } from '../../services/reports';
import type { Report, ReportStatus } from '../../models/report';
import { format } from 'date-fns';
import { serverTimestamp } from 'firebase/firestore';
import { createAdminAction } from '../../services/adminActions';
import { softRemoveMember } from '../../services/members';

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminReportDetail'>;

const AdminReportDetailScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const { user } = useAuth();
  const { reportId } = route.params;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resNote, setResNote] = useState('');
  const [actSubmitting, setActSubmitting] = useState(false);
  const [resError, setResError] = useState<string | null>(null);
  const [warnNote, setWarnNote] = useState('');
  const [removeNote, setRemoveNote] = useState('');
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!currentGroup || !currentMembership || currentMembership.role !== 'admin') {
      setError('Admins only');
      setLoading(false);
      return;
    }
    const unsub = listenReportById(currentGroup.id, reportId, (r) => {
      setReport(r);
      setLoading(false);
    });
    return () => unsub();
  }, [currentGroup?.id, reportId, currentMembership?.role]);

  const updateStatus = async (status: ReportStatus, requireNote: boolean, resolutionAction?: string) => {
    if (!currentGroup || !report) return;
    if (requireNote && !resNote.trim()) {
      setResError('Resolution note required.');
      return;
    }
    setResError(null);
    setActSubmitting(true);
    try {
      const adminName = currentMembership
        ? `${currentMembership.firstName ?? ''} ${currentMembership.lastName ?? ''}`.trim() ||
          user?.email ||
          user?.uid ||
          ''
        : user?.email || user?.uid || '';
      await updateReport(currentGroup.id, report.id, {
        status,
        resolutionAction: status === 'resolved' ? resolutionAction ?? 'no_action' : report.resolutionAction ?? null,
        resolutionNote: status === 'resolved' ? resNote.trim() : report.resolutionNote ?? '',
        resolvedByUid: status === 'resolved' ? user?.uid ?? '' : report.resolvedByUid ?? '',
        resolvedByName: status === 'resolved' ? adminName : report.resolvedByName ?? '',
        resolvedAt: status === 'resolved' ? serverTimestamp() : report.resolvedAt ?? null,
        lastUpdatedAt: serverTimestamp(),
      } as any);
      if (status === 'resolved') navigation.goBack();
    } catch (err) {
      setResError(err instanceof Error ? err.message : 'Failed to update.');
    } finally {
      setActSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Loading…</Text>
      </View>
    );
  }

  if (!report || error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>{error ?? 'Report not found.'}</Text>
      </View>
    );
  }

  const target = report.target ?? {};
  const created = (report.createdAt as any)?.toDate?.()
    ? format((report.createdAt as any).toDate(), 'PP p')
    : '';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {report.reason} • {report.type}
      </Text>
      <Text>Status: {report.status}</Text>
      <Text variant="bodySmall">Reported: {created}</Text>
      <Text variant="bodySmall">Reporter: {report.createdByName || report.createdByUid}</Text>
      {target.targetName ? (
        <Text variant="bodySmall">Target: {target.targetName}</Text>
      ) : null}
      {report.detailsText ? <Text style={{ marginTop: 8 }}>{report.detailsText}</Text> : null}
      {report.evidence?.postTextSnippet ? (
        <Text variant="bodySmall" style={styles.muted}>
          Snippet: {report.evidence.postTextSnippet}
        </Text>
      ) : null}
      {resError ? (
        <HelperText type="error" visible>
          {resError}
        </HelperText>
      ) : null}

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={async () => {
            if (!currentGroup || !user) return;
            const adminName = currentMembership
              ? `${currentMembership.firstName ?? ''} ${currentMembership.lastName ?? ''}`.trim() ||
                user.email ||
                user.uid
              : user.email || user.uid;
            await updateReport(currentGroup.id, report.id, {
              status: 'in_review',
              assignedToUid: user.uid,
              assignedToName: adminName,
            } as any);
          }}
          disabled={actSubmitting}
        >
          Assign to me
        </Button>
        <Button
          mode="outlined"
          onPress={() =>
            updateReport(currentGroup!.id, report.id, {
              assignedToUid: '',
              assignedToName: '',
              status: report?.status === 'resolved' ? 'resolved' : 'open',
              lastUpdatedAt: serverTimestamp(),
            } as any)
          }
          disabled={actSubmitting}
        >
          Unassign
        </Button>
      </View>

      <TextInput
        label="Warning / Resolution note"
        mode="outlined"
        value={warnNote}
        onChangeText={setWarnNote}
        multiline
        style={{ marginTop: 8 }}
      />

      <TextInput
        label="Resolution note (required to resolve)"
        mode="outlined"
      value={resNote}
      onChangeText={setResNote}
      multiline
      style={{ marginTop: 8 }}
    />

      <TextInput
        label="Removal reason (required to remove member)"
        mode="outlined"
        value={removeNote}
        onChangeText={setRemoveNote}
        multiline
        style={{ marginTop: 8 }}
      />

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => updateStatus('resolved', true, 'no_action')}
          loading={actSubmitting}
          disabled={actSubmitting}
        >
          Resolve (no action)
        </Button>
        <Button
          mode="text"
          onPress={() => updateStatus('open', false)}
          disabled={actSubmitting}
        >
          Reopen
        </Button>
      </View>

      <View style={styles.actions}>
        <Button
          mode="contained-tonal"
          onPress={async () => {
            if (!currentGroup || !report || !report.target?.targetUid || !user) return;
            if (!warnNote.trim()) {
              setResError('Warning note required.');
              return;
            }
            setResError(null);
            setActSubmitting(true);
            try {
              const adminName = currentMembership
                ? `${currentMembership.firstName ?? ''} ${currentMembership.lastName ?? ''}`.trim() ||
                  user.email ||
                  user.uid
                : user.email || user.uid;
              await createAdminAction(currentGroup.id, {
                type: 'warn',
                targetUid: report.target.targetUid,
                targetName: report.target.targetName ?? '',
                reportId: report.id,
                note: warnNote.trim(),
                createdByUid: user.uid,
                createdByName: adminName,
              });
              await updateReport(currentGroup.id, report.id, {
                status: 'resolved',
                resolutionAction: 'warned',
                resolutionNote: warnNote.trim(),
                resolvedByUid: user.uid,
                resolvedByName: adminName,
                resolvedAt: serverTimestamp(),
                lastUpdatedAt: serverTimestamp(),
              } as any);
              navigation.goBack();
            } catch (err) {
              setResError(err instanceof Error ? err.message : 'Failed to warn user.');
            } finally {
              setActSubmitting(false);
            }
          }}
          disabled={actSubmitting}
        >
          Warn user (resolve)
        </Button>
      </View>

      <View style={styles.actions}>
        <Button
          mode="contained"
          buttonColor="#b91c1c"
          textColor="#fff"
          onPress={() => {
            const targetUid = target.targetUid;
            if (!currentGroup || !targetUid || !user) return;
            if (!removeNote.trim()) {
              setResError('Removal reason required.');
              return;
            }
            Alert.alert(
              'Remove member',
              `Remove ${target.targetName || 'member'} from the group?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: async () => {
                    setResError(null);
                    setRemoving(true);
                    try {
                      const adminName =
                        (currentMembership
                          ? `${currentMembership.firstName ?? ''} ${currentMembership.lastName ?? ''}`.trim()
                          : '') ||
                        user.email ||
                        user.uid;
                      await softRemoveMember(
                        currentGroup.id,
                        targetUid,
                        user.uid,
                        removeNote.trim(),
                        adminName
                      );
                      await createAdminAction(currentGroup.id, {
                        type: 'remove',
                        targetUid,
                        targetName: target.targetName ?? '',
                        reportId: report.id,
                        note: removeNote.trim(),
                        createdByUid: user.uid,
                        createdByName: adminName,
                      });
                      await updateReport(currentGroup.id, report.id, {
                        status: 'resolved',
                        resolutionAction: 'removed',
                        resolutionNote: removeNote.trim(),
                        resolvedByUid: user.uid,
                        resolvedByName: adminName,
                        resolvedAt: serverTimestamp(),
                        lastUpdatedAt: serverTimestamp(),
                      } as any);
                      navigation.goBack();
                    } catch (err) {
                      setResError(err instanceof Error ? err.message : 'Failed to remove member.');
                    } finally {
                      setRemoving(false);
                    }
                  },
                },
              ]
            );
          }}
          disabled={removing || actSubmitting}
          loading={removing}
        >
          Remove from group
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#6b7280' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
});

export default AdminReportDetailScreen;
