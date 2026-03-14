import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useThemeSettings, THEME_PREVIEWS } from '../../theme';
import type { ThemeName } from '../../theme';
import AppCard from '../../components/AppCard';
import Screen from '../../components/Screen';
import { RADIUS, SPACING } from '../../theme/spacing';

const ThemePickerScreen = () => {
  const theme = useTheme();
  const { themeName, setThemeName } = useThemeSettings();

  const themes = Object.keys(THEME_PREVIEWS) as ThemeName[];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {themes.map((name) => {
          const preview = THEME_PREVIEWS[name];
          const selected = themeName === name;
          return (
            <AppCard
              key={name}
              style={[
                styles.themeCard,
                {
                  backgroundColor: preview.surface,
                  borderColor: selected ? theme.colors.primary : theme.colors.outline,
                  borderWidth: selected ? 2 : 1,
                },
              ]}
              onPress={() => setThemeName(name)}
            >
              <View style={styles.row}>
                <View style={styles.swatchRow}>
                  <View style={[styles.swatch, { backgroundColor: preview.background }]} />
                  <View style={[styles.swatch, { backgroundColor: preview.surface }]} />
                  <View style={[styles.swatch, { backgroundColor: preview.primary }]} />
                </View>
                <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
                  {preview.label}
                </Text>
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </View>
            </AppCard>
          );
        })}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  themeCard: {
    borderRadius: RADIUS.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  title: {
    flexShrink: 1,
  },
  check: {
    fontWeight: '700',
    color: '#16a34a',
  },
});

export default ThemePickerScreen;
