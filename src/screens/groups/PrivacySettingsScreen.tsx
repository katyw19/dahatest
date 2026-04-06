import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

const PrivacySettingsScreen = () => {
  const theme = useTheme();
  const [showProfile, setShowProfile] = useState(true);
  const [showActivity, setShowActivity] = useState(true);

  return (
    <Screen noTopPadding>
      <Text style={[styles.header, { color: '#8E8E93' }]}>VISIBILITY</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <View style={[styles.row, styles.rowBorder, { borderBottomColor: theme.colors.outline }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: '#1C1C1E' }]}>Show Profile to Members</Text>
            <Text style={styles.rowDesc}>Let other group members see your full profile</Text>
          </View>
          <Switch
            value={showProfile}
            onValueChange={setShowProfile}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: '#1C1C1E' }]}>Show Lending Activity</Text>
            <Text style={styles.rowDesc}>Display your lending stats on your profile</Text>
          </View>
          <Switch
            value={showActivity}
            onValueChange={setShowActivity}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <Text style={[styles.header, { color: '#8E8E93', marginTop: SPACING.lg }]}>DATA</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: '#1C1C1E' }]}>Your data is stored securely</Text>
            <Text style={styles.rowDesc}>
              We use Firebase with encryption at rest. Your data is never sold or shared with third parties.
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.footer}>
        Privacy settings are stored locally. Contact support for data deletion requests.
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

export default PrivacySettingsScreen;
