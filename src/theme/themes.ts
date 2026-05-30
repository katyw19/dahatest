import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

export type ThemeName =
  | 'default'
  | 'blossom'
  | 'sky'
  | 'mint'
  | 'sunset'
  | 'lavender'
  | 'peach'
  | 'ocean'
  | 'berry'
  | 'sage'
  | 'mocha';

const headingFont = 'Fredoka_600SemiBold';
const bodyFont = 'Nunito_400Regular';
const bodyFontMedium = 'Nunito_600SemiBold';

const fontConfig = {
  displayLarge: { fontFamily: headingFont },
  displayMedium: { fontFamily: headingFont },
  displaySmall: { fontFamily: headingFont },
  headlineLarge: { fontFamily: headingFont },
  headlineMedium: { fontFamily: headingFont },
  headlineSmall: { fontFamily: headingFont },
  titleLarge: { fontFamily: headingFont },
  titleMedium: { fontFamily: headingFont },
  titleSmall: { fontFamily: headingFont },
  bodyLarge: { fontFamily: bodyFont },
  bodyMedium: { fontFamily: bodyFont },
  bodySmall: { fontFamily: bodyFont },
  labelLarge: { fontFamily: bodyFontMedium },
  labelMedium: { fontFamily: bodyFontMedium },
  labelSmall: { fontFamily: bodyFontMedium },
};

// Minimalist palette: background == surface (same warm off-white),
// thin gray outlines, accent color used sparingly.
const BG = '#FAFAFA';
const SURFACE = '#FAFAFA';
const OUTLINE = '#EBEBEB';
const ON_SURFACE = '#1C1C1E';

const makeMinimalTheme = (primary: string, secondary: string) => ({
  background: BG,
  surface: SURFACE,
  primary,
  secondary,
  outline: OUTLINE,
  onSurface: ON_SURFACE,
  onBackground: ON_SURFACE,
  onPrimary: '#ffffff',
  onSecondary: ON_SURFACE,
  error: '#D04545',
});

const palette = {
  default: {
    light: makeMinimalTheme('#4C6FFF', '#F0F0F0'),
    dark: makeMinimalTheme('#4C6FFF', '#F0F0F0'),
  },
  blossom: {
    light: makeMinimalTheme('#C9567E', '#F0F0F0'),
    dark: makeMinimalTheme('#C9567E', '#F0F0F0'),
  },
  sky: {
    light: makeMinimalTheme('#4B7BFF', '#F0F0F0'),
    dark: makeMinimalTheme('#4B7BFF', '#F0F0F0'),
  },
  mint: {
    light: makeMinimalTheme('#67C8A4', '#F0F0F0'),
    dark: makeMinimalTheme('#67C8A4', '#F0F0F0'),
  },
  sunset: {
    light: makeMinimalTheme('#FF8A5B', '#F0F0F0'),
    dark: makeMinimalTheme('#FF8A5B', '#F0F0F0'),
  },
  lavender: {
    light: makeMinimalTheme('#9C7CF2', '#F0F0F0'),
    dark: makeMinimalTheme('#9C7CF2', '#F0F0F0'),
  },
  peach: {
    light: makeMinimalTheme('#FF9D7D', '#F0F0F0'),
    dark: makeMinimalTheme('#FF9D7D', '#F0F0F0'),
  },
  ocean: {
    light: makeMinimalTheme('#2B8A9E', '#F0F0F0'),
    dark: makeMinimalTheme('#2B8A9E', '#F0F0F0'),
  },
  berry: {
    light: makeMinimalTheme('#8B3A7C', '#F0F0F0'),
    dark: makeMinimalTheme('#8B3A7C', '#F0F0F0'),
  },
  sage: {
    light: makeMinimalTheme('#6B8F6B', '#F0F0F0'),
    dark: makeMinimalTheme('#6B8F6B', '#F0F0F0'),
  },
  mocha: {
    light: makeMinimalTheme('#8B6F5C', '#F0F0F0'),
    dark: makeMinimalTheme('#8B6F5C', '#F0F0F0'),
  },
};

export const getTheme = (name: ThemeName = 'default'): MD3Theme => {
  const swatch = palette[name].light;
  const base = MD3LightTheme;
  const primary = swatch.primary;

  return {
    ...base,
    fonts: configureFonts({ config: fontConfig as any }),
    colors: {
      ...base.colors,
      primary,
      onPrimary: swatch.onPrimary,
      primaryContainer: swatch.secondary,
      onPrimaryContainer: swatch.onSurface,
      secondary: primary,
      onSecondary: swatch.onPrimary,
      secondaryContainer: swatch.secondary,
      onSecondaryContainer: swatch.onSurface,
      tertiary: primary,
      onTertiary: swatch.onPrimary,
      tertiaryContainer: swatch.secondary,
      onTertiaryContainer: swatch.onSurface,
      background: swatch.background,
      onBackground: swatch.onBackground,
      surface: swatch.surface,
      onSurface: swatch.onSurface,
      surfaceVariant: swatch.surface,
      onSurfaceVariant: swatch.onSurface,
      surfaceDisabled: '#F5F5F5',
      onSurfaceDisabled: '#C7C7CC',
      outline: swatch.outline,
      outlineVariant: swatch.outline,
      backdrop: 'rgba(0,0,0,0.4)',
      scrim: 'rgba(0,0,0,0.5)',
      inverseSurface: '#1C1C1E',
      inverseOnSurface: '#FFFFFF',
      inversePrimary: primary,
      shadow: 'transparent',
      error: swatch.error,
      onError: '#ffffff',
      errorContainer: '#FEF2F2',
      onErrorContainer: swatch.error,
      elevation: {
        level0: 'transparent',
        level1: swatch.surface,
        level2: swatch.surface,
        level3: swatch.surface,
        level4: swatch.surface,
        level5: swatch.surface,
      },
    },
  };
};
