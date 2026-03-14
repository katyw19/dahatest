import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, RadioButton, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { createAnnouncement } from '../../services/announcements';
import { addDays } from 'date-fns';

const EXPIRIES = [
  { label: 'None', days: 0 },
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
];

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminAnnouncementCreate'>;

const AdminAnnouncementCreateScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const { user } = useAuth();

  const [textValue, setTextValue] = useState('');
  const [pinned, setPinned] = useState(true);
  const [expiryDays, setExpiryDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!currentGroup || !user) return;
    if (!textValue.trim()) {
      setError('Announcement text is required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const expiresAt = expiryDays > 0 ? addDays(new Date(), expiryDays) : null;
      const adminName = currentMembership
        ? `${currentMembership.firstName ?? ''} ${currentMembership.lastName ?? ''}`.trim() || user.email || user.uid
        : user.email || user.uid;
      await createAnnouncement(currentGroup.id, {
        text: textValue.trim(),
        pinned,
        expiresAt,
        createdByUid: user.uid,
        createdByName: adminName,
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentGroup || currentMembership?.role !== 'admin') {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}> 
        <Text>Admins only</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Post Announcement
      </Text>
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}
      <TextInput
        label="Announcement text"
        mode="outlined"
        value={textValue}
        onChangeText={setTextValue}
        multiline
        style={{ minHeight: 140 }}
      />
      <View style={styles.rowBetween}>
        <Text>Pin to top</Text>
        <Switch value={pinned} onValueChange={setPinned} />
      </View>

      <Text style={styles.label}>Expiry</Text>
      <RadioButton.Group onValueChange={(v) => setExpiryDays(Number(v))} value={String(expiryDays)}>
        {EXPIRIES.map((opt) => (
          <RadioButton.Item key={opt.label} label={opt.label} value={String(opt.days)} />
        ))}
      </RadioButton.Group>

      <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting}>
        Post
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { marginTop: 8, marginBottom: 4, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default AdminAnnouncementCreateScreen;
