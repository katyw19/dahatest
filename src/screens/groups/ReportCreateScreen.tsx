import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, RadioButton, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { createReport } from '../../services/reports';
import { resolveDisplayName } from '../../utils/displayName';

type Props = NativeStackScreenProps<GroupStackParamList, 'ReportCreate'>;

const reasons = [
  { value: 'damage', label: 'Damage to item' },
  { value: 'non_return', label: 'Item not returned' },
  { value: 'inappropriate', label: 'Inappropriate behavior' },
  { value: 'scam', label: 'Scam / suspicious' },
  { value: 'other', label: 'Other' },
] as const;

const ReportCreateScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!currentGroup || !user) {
      setError('You must be signed in and in a group to report.');
      return;
    }
    if (!reason) {
      setError('Please select a reason.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createReport(currentGroup.id, {
        createdByUid: user.uid,
        createdByName: resolveDisplayName({
          displayName: currentMembership?.displayName || profile?.displayName,
          firstName: currentMembership?.firstName || profile?.firstName,
          lastName: currentMembership?.lastName || profile?.lastName,
          fallbackUid: user.uid,
        }),
        type: route.params.type,
        reason: reason as any,
        detailsText: details.trim(),
        targetUid: route.params.targetUid,
        targetName: route.params.targetName,
        postId: route.params.postId,
        threadId: route.params.threadId,
        reviewId: route.params.type === 'thread' ? route.params.threadId : route.params.postId,
        postTextSnippet: route.params.snippet ?? '',
      });
      Alert.alert('Report sent', 'Report sent to admins.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Report {route.params.type === 'post' ? 'Post' : 'Chat'}
      </Text>
      <Text variant="bodySmall" style={styles.muted}>
        Reports go to your group admins. Mistakes happen — this helps keep borrowing safe.
      </Text>
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}

      <Text variant="titleMedium">Reason</Text>
      <RadioButton.Group onValueChange={(v) => setReason(v)} value={reason}>
        {reasons.map((r) => (
          <RadioButton.Item key={r.value} label={r.label} value={r.value} />
        ))}
      </RadioButton.Group>
      {!reason && error ? (
        <HelperText type="error" visible>
          Please select a reason.
        </HelperText>
      ) : null}

      <TextInput
        label="Add details (optional)"
        mode="outlined"
        multiline
        numberOfLines={4}
        value={details}
        onChangeText={setDetails}
        style={styles.input}
      />

      <View style={styles.actions}>
        <Button mode="contained" onPress={handleSubmit} loading={submitting} disabled={submitting}>
          Submit report
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()} disabled={submitting}>
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontWeight: '700',
  },
  muted: {
    color: '#6b7280',
  },
  input: {
    marginTop: 8,
  },
  actions: {
    gap: 8,
    marginTop: 12,
  },
});

export default ReportCreateScreen;
