import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Screen from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  registerForPushNotifications,
  type NotificationPrefs,
} from '../../services/notifications';
import { SPACING, RADIUS } from '../../theme/spacing';

type ToggleRow = {
  label: string;
  description: string;
  key: keyof NotificationPrefs;
};

const NotificationSettingsScreen = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    newOffers: true,
    messages: true,
    reviewReminders: true,
    announcements: true,
    statusUpdates: true,
  });
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Load prefs from Firestore on mount
  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const load = async () => {
      try {
        const saved = await loadNotificationPrefs(uid);
        setPrefs(saved);

        // Also check/register push token
        const token = await registerForPushNotifications(uid);
        setPermissionGranted(token !== null);
      } catch {
        // use defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [uid]);

  const toggle = async (key: keyof NotificationPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    if (uid) {
      try {
        await saveNotificationPrefs(uid, updated);
      } catch {
        // revert on failure
        setPrefs(prefs);
      }
    }
  };

  const rows: ToggleRow[] = [
    { label: 'New Offers', description: 'When someone offers to lend on your request', key: 'newOffers' },
    { label: 'Messages', description: 'New chat messages from other members', key: 'messages' },
    { label: 'Review Reminders', description: 'Reminders to leave a review after lending', key: 'reviewReminders' },
    { label: 'Announcements', description: 'Group announcements from admins', key: 'announcements' },
    { label: 'Status Updates', description: 'When your request status changes', key: 'statusUpdates' },
  ];

  if (loading) {
    return (
      <Screen noTopPadding>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen noTopPadding>
      {permissionGranted === false ? (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Notifications are disabled for this app. Enable them in your device Settings to receive push notifications.
          </Text>
        </View>
      ) : null}

      <Text style={[styles.header, { color: '#8E8E93' }]}>PUSH NOTIFICATIONS</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        {rows.map((row, i) => (
          <View
            key={row.key}
            style={[
              styles.row,
              i < rows.length - 1 && [styles.rowBorder, { borderBottomColor: theme.colors.outline }],
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: '#1C1C1E' }]}>{row.label}</Text>
              <Text style={styles.rowDesc}>{row.description}</Text>
            </View>
            <Switch
              value={prefs[row.key]}
              onValueChange={() => toggle(row.key)}
              trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </View>
      <Text style={styles.footer}>
        Preferences are saved to your account and synced across devices.
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permissionBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  permissionText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  header: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  footer: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: SPACING.sm,
    paddingHorizontal: 4,
  },
});

export default NotificationSettingsScreen;
