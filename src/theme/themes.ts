import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

export type ThemeName =
  | 'default'
  | 'blossom'
  | 'sky'
  | 'mint'
  | 'sunset'
  | 'lavender'
  | 'peach';

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

const palette = {
  default: {
    light: {
      background: '#F7F8FB',
      surface: '#FFFFFF',
      primary: '#4C6FFF',
      secondary: '#DDE5FF',
      outline: '#D5DBE7',
      onSurface: '#1F2A44',
      onBackground: '#1F2A44',
      onPrimary: '#ffffff',
      onSecondary: '#1F2A44',
      error: '#D04545',
    },
    dark: {
      background: '#F7F8FB',
      surface: '#FFFFFF',
      primary: '#4C6FFF',
      secondary: '#DDE5FF',
      outline: '#D5DBE7',
      onSurface: '#1F2A44',
      onBackground: '#1F2A44',
      onPrimary: '#ffffff',
      onSecondary: '#1F2A44',
      error: '#D04545',
    },
  },
  blossom: {
    light: {
      background: '#FFF7FA',
      surface: '#FFFFFF',
      primary: '#F37AA9',
      secondary: '#FDE0EB',
      outline: '#F1C1D4',
      onSurface: '#3B2F2F',
      onBackground: '#3B2F2F',
      onPrimary: '#ffffff',
      onSecondary: '#3B2F2F',
      error: '#D04545',
    },
    dark: {
      background: '#FFF7FA',
      surface: '#FFFFFF',
      primary: '#F37AA9',
      secondary: '#FDE0EB',
      outline: '#F1C1D4',
      onSurface: '#3B2F2F',
      onBackground: '#3B2F2F',
      onPrimary: '#ffffff',
      onSecondary: '#3B2F2F',
      error: '#D04545',
    },
  },
  sky: {
    light: {
      background: '#F2F7FF',
      surface: '#FFFFFF',
      primary: '#4B7BFF',
      secondary: '#DCE8FF',
      outline: '#C7D8FF',
      onSurface: '#1F2A44',
      onBackground: '#1F2A44',
      onPrimary: '#ffffff',
      onSecondary: '#1F2A44',
      error: '#D04545',
    },
    dark: {
      background: '#F2F7FF',
      surface: '#FFFFFF',
      primary: '#4B7BFF',
      secondary: '#DCE8FF',
      outline: '#C7D8FF',
      onSurface: '#1F2A44',
      onBackground: '#1F2A44',
      onPrimary: '#ffffff',
      onSecondary: '#1F2A44',
      error: '#D04545',
    },
  },
  mint: {
    light: {
      background: '#F6FBF5',
      surface: '#FFFFFF',
      primary: '#67C8A4',
      secondary: '#DDF5EC',
      outline: '#B9E6D4',
      onSurface: '#1E2E23',
      onBackground: '#1E2E23',
      onPrimary: '#ffffff',
      onSecondary: '#1E2E23',
      error: '#D04545',
    },
    dark: {
      background: '#F6FBF5',
      surface: '#FFFFFF',
      primary: '#67C8A4',
      secondary: '#DDF5EC',
      outline: '#B9E6D4',
      onSurface: '#1E2E23',
      onBackground: '#1E2E23',
      onPrimary: '#ffffff',
      onSecondary: '#1E2E23',
      error: '#D04545',
    },
  },
  sunset: {
    light: {
      background: '#FFF6F0',
      surface: '#FFFFFF',
      primary: '#FF8A5B',
      secondary: '#FFE0D1',
      outline: '#F4C1A7',
      onSurface: '#3B2A24',
      onBackground: '#3B2A24',
      onPrimary: '#ffffff',
      onSecondary: '#3B2A24',
      error: '#D04545',
    },
    dark: {
      background: '#FFF6F0',
      surface: '#FFFFFF',
      primary: '#FF8A5B',
      secondary: '#FFE0D1',
      outline: '#F4C1A7',
      onSurface: '#3B2A24',
      onBackground: '#3B2A24',
      onPrimary: '#ffffff',
      onSecondary: '#3B2A24',
      error: '#D04545',
    },
  },
  lavender: {
    light: {
      background: '#F9F6FF',
      surface: '#FFFFFF',
      primary: '#9C7CF2',
      secondary: '#E6DFFF',
      outline: '#D4C9FF',
      onSurface: '#2C2440',
      onBackground: '#2C2440',
      onPrimary: '#ffffff',
      onSecondary: '#2C2440',
      error: '#D04545',
    },
    dark: {
      background: '#F9F6FF',
      surface: '#FFFFFF',
      primary: '#9C7CF2',
      secondary: '#E6DFFF',
      outline: '#D4C9FF',
      onSurface: '#2C2440',
      onBackground: '#2C2440',
      onPrimary: '#ffffff',
      onSecondary: '#2C2440',
      error: '#D04545',
    },
  },
  peach: {
    light: {
      background: '#FFF7F2',
      surface: '#FFFFFF',
      primary: '#FF9D7D',
      secondary: '#FFE0D4',
      outline: '#F3C9BC',
      onSurface: '#3A2A26',
      onBackground: '#3A2A26',
      onPrimary: '#ffffff',
      onSecondary: '#3A2A26',
      error: '#D04545',
    },
    dark: {
      background: '#FFF7F2',
      surface: '#FFFFFF',
      primary: '#FF9D7D',
      secondary: '#FFE0D4',
      outline: '#F3C9BC',
      onSurface: '#3A2A26',
      onBackground: '#3A2A26',
      onPrimary: '#ffffff',
      onSecondary: '#3A2A26',
      error: '#D04545',
    },
  },
};

type ThemeOptions = {
  isDark: boolean;
  accentColor?: string | null;
};

export const getTheme = (themeName: ThemeName, options: ThemeOptions): MD3Theme => {
  const base = options.isDark ? MD3DarkTheme : MD3LightTheme;
  const swatch = options.isDark ? palette[themeName].dark : palette[themeName].light;
  const primary = options.accentColor || swatch.primary;

  return {
    ...base,
    roundness: 18,
    colors: {
      ...base.colors,
      primary,
      secondary: swatch.secondary,
      background: swatch.background,
      surface: swatch.surface,
      outline: swatch.outline,
      onSurface: swatch.onSurface,
      onBackground: swatch.onBackground,
      onPrimary: swatch.onPrimary,
      onSecondary: swatch.onSecondary,
      error: swatch.error,
    },
    fonts: configureFonts({ config: fontConfig }),
  };
};

export const THEME_PREVIEWS: Record<
  ThemeName,
  { label: string; background: string; surface: string; primary: string }
> = {
  default: {
    label: 'Default',
    background: palette.default.light.background,
    surface: palette.default.light.surface,
    primary: palette.default.light.primary,
  },
  blossom: {
    label: 'Blossom',
    background: palette.blossom.light.background,
    surface: palette.blossom.light.surface,
    primary: palette.blossom.light.primary,
  },
  sky: {
    label: 'Sky',
    background: palette.sky.light.background,
    surface: palette.sky.light.surface,
    primary: palette.sky.light.primary,
  },
  mint: {
    label: 'Mint',
    background: palette.mint.light.background,
    surface: palette.mint.light.surface,
    primary: palette.mint.light.primary,
  },
  sunset: {
    label: 'Sunset',
    background: palette.sunset.light.background,
    surface: palette.sunset.light.surface,
    primary: palette.sunset.light.primary,
  },
  lavender: {
    label: 'Lavender',
    background: palette.lavender.light.background,
    surface: palette.lavender.light.surface,
    primary: palette.lavender.light.primary,
  },
  peach: {
    label: 'Peach',
    background: palette.peach.light.background,
    surface: palette.peach.light.surface,
    primary: palette.peach.light.primary,
  },
};
