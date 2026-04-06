import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeSettings, THEME_PREVIEWS } from '../../theme';
import type { ThemeName } from '../../theme';
import Screen from '../../components/Screen';
import { RADIUS, SPACING } from '../../theme/spacing';

const ThemePickerScreen = () => {
  const theme = useTheme();
  const { themeName, setThemeName } = useThemeSettings();

  const themes = Object.keys(THEME_PREVIEWS) as ThemeName[];

  return (
    <Screen noTopPadding>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {themes.map((name) => {
          const preview = THEME_PREVIEWS[name];
          const selected = themeName === name;
          return (
            <Pressable
              key={name}
              onPress={() => setThemeName(name)}
              style={({ pressed }) => [
                styles.themeCard,
                {
                  backgroundColor: preview.surface,
                  borderColor: selected ? preview.primary : '#E5E5E5',
                  borderWidth: selected ? 2 : 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.row}>
                {/* Color swatches */}
                <View style={styles.swatchRow}>
                  <View style={[styles.swatch, { backgroundColor: preview.background }]} />
                  <View style={[styles.swatchLarge, { backgroundColor: preview.primary }]} />
                </View>

                <View style={styles.labelWrap}>
                  <Text style={[styles.label, { color: selected ? preview.primary : '#1C1C1E' }]}>
                    {preview.label}
                  </Text>
                </View>

                {selected ? (
                  <View style={[styles.checkCircle, { backgroundColor: preview.primary }]}>
                    <MaterialCommunityIcons name="check" size={14} color="#fff" />
                  </View>
                ) : null}
              </View>
            </Pressable>
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
    padding: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 14,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  swatchLarge: {
    width: 24,
    height: 24,
    borderRadius: 8,
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemePickerScreen;
