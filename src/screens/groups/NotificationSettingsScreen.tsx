import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

type ToggleRow = {
  label: string;
  description: string;
  key: string;
};

const NotificationSettingsScreen = () => {
  const theme = useTheme();

  // Local state — in the future these can be persisted to Firestore or AsyncStorage
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    newOffers: true,
    messages: true,
    reviewReminders: true,
    announcements: true,
    statusUpdates: true,
  });

  const toggle = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const rows: ToggleRow[] = [
    { label: 'New Offers', description: 'When someone offers to lend on your request', key: 'newOffers' },
    { label: 'Messages', description: 'New chat messages from other members', key: 'messages' },
    { label: 'Review Reminders', description: 'Reminders to leave a review after lending', key: 'reviewReminders' },
    { label: 'Announcements', description: 'Group announcements from admins', key: 'announcements' },
    { label: 'Status Updates', description: 'When your request status changes', key: 'statusUpdates' },
  ];

  return (
    <Screen noTopPadding>
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
        Notification preferences are stored locally on this device.
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
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
