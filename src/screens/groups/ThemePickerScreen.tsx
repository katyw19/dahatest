import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeSettings, THEME_PREVIEWS } from '../../theme';
import type { ThemeName } from '../../theme';
import Screen from '../../components/Screen';
import { SPACING } from '../../theme/spacing';

const ThemePickerScreen = () => {
  const { themeName, setThemeName } = useThemeSettings();
  const themes = Object.keys(THEME_PREVIEWS) as ThemeName[];

  return (
    <Screen noTopPadding>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>ACCENT COLOR</Text>
        <Text style={styles.sectionHint}>Choose a color that suits your style.</Text>

        <View style={styles.list}>
          {themes.map((name, idx) => {
            const preview = THEME_PREVIEWS[name];
            const selected = themeName === name;

            return (
              <Pressable
                key={name}
                onPress={() => setThemeName(name)}
                style={({ pressed }) => [
                  styles.row,
                  idx < themes.length - 1 && styles.rowBorder,
                  pressed && { opacity: 0.5 },
                ]}
              >
                <View style={[styles.colorDot, { backgroundColor: preview.primary }]} />
                <Text style={styles.label}>{preview.label}</Text>
                {selected ? (
                  <MaterialCommunityIcons name="check" size={18} color={preview.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#8E8E93',
    marginBottom: 6,
    marginHorizontal: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 24,
    marginHorizontal: 4,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#EBEBEB',
    marginHorizontal: -SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 16,
    gap: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
  },
});

export default ThemePickerScreen;
