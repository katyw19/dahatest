import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Divider, Text, useTheme } from 'react-native-paper';
import { useThemeSettings, THEME_PREVIEWS } from '../../theme';
import type { ThemeName } from '../../theme';
import AppCard from '../../components/AppCard';
import Screen from '../../components/Screen';
import { SPACING } from '../../theme/spacing';

const SettingsScreen = () => {
  const theme = useTheme();
  const { themeName, setThemeName } = useThemeSettings();

  const themeOptions = useMemo(
    () =>
      ['default', 'blossom', 'sky', 'mint', 'sunset', 'lavender', 'peach'] as ThemeName[],
    []
  );

  return (
    <Screen>
      <Text variant="headlineSmall" style={styles.title}>
        Settings
      </Text>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Theme
      </Text>
      <View style={styles.themeGrid}>
        {themeOptions.map((name) => {
          const preview = THEME_PREVIEWS[name];
          const selected = themeName === name;
          return (
            <Pressable key={name} onPress={() => setThemeName(name)} style={styles.themeItem}>
              <AppCard
                style={[
                  styles.themeCard,
                  {
                    borderColor: selected ? theme.colors.primary : theme.colors.outline,
                    borderWidth: selected ? 2 : 1,
                    backgroundColor: preview.surface,
                  },
                ]}
              >
                <View style={styles.swatchRow}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: preview.background, borderColor: theme.colors.outline },
                    ]}
                  />
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: preview.surface, borderColor: theme.colors.outline },
                    ]}
                  />
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: preview.primary, borderColor: theme.colors.outline },
                    ]}
                  />
                </View>
                <View style={styles.themeLabelRow}>
                  <Text variant="titleSmall">{preview.label}</Text>
                  {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
              </AppCard>
            </Pressable>
          );
        })}
      </View>

      <Divider style={styles.divider} />
      <Text variant="bodySmall" style={styles.helper}>
        Theme changes apply instantly and stay saved on this device.
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: SPACING.sm,
    fontWeight: '700',
  },
  divider: {
    marginVertical: SPACING.md,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  themeItem: {
    width: '48%',
  },
  themeCard: {
    padding: SPACING.md,
    borderRadius: 12,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
  },
  themeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkMark: {
    color: '#16a34a',
    fontWeight: '700',
  },
  helper: {
    color: '#6b7280',
  },
});

export default SettingsScreen;
