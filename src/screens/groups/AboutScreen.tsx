import { Linking, StyleSheet, View, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';
import Constants from 'expo-constants';

const AboutScreen = () => {
  const theme = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen noTopPadding>
      <View style={styles.logoSection}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}14` }]}>
          <MaterialCommunityIcons name="hand-heart-outline" size={40} color={theme.colors.primary} />
        </View>
        <Text style={[styles.appName, { color: '#1C1C1E' }]}>DAHA</Text>
        <Text style={styles.tagline}>Lending made easy between communities</Text>
        <Text style={styles.version}>Version {version}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <View style={[styles.row, styles.rowBorder, { borderBottomColor: theme.colors.outline }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: '#1C1C1E' }]}>Built with</Text>
            <Text style={styles.rowDesc}>React Native, Expo, Firebase</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: '#1C1C1E' }]}>Platform</Text>
            <Text style={styles.rowDesc}>iOS & Android</Text>
          </View>
        </View>
      </View>

      <Text style={styles.footer}>
        Made with care. Thank you for being part of the community!
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  logoSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: '#8E8E93',
  },
  version: {
    fontSize: 13,
    color: '#C7C7CC',
    marginTop: 4,
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
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});

export default AboutScreen;
