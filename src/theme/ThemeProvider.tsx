import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaperProvider } from 'react-native-paper';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { getTheme, type ThemeName } from './themes';

type ThemeContextValue = {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  accentColor: string | null;
  setAccentColor: (color: string | null) => void;
  isDark: boolean;
  toggleDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_THEME = 'daha_theme';
const STORAGE_DARK = 'daha_dark';
const STORAGE_ACCENT = 'daha_accent';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeNameState] = useState<ThemeName>('default');
  const [accentColor, setAccentColorState] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Fredoka_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
  });

  useEffect(() => {
    const load = async () => {
      const storedTheme = await AsyncStorage.getItem(STORAGE_THEME);
      const storedDark = await AsyncStorage.getItem(STORAGE_DARK);
      const storedAccent = await AsyncStorage.getItem(STORAGE_ACCENT);
      if (
        storedTheme === 'default' ||
        storedTheme === 'blossom' ||
        storedTheme === 'sky' ||
        storedTheme === 'mint' ||
        storedTheme === 'sunset' ||
        storedTheme === 'lavender' ||
        storedTheme === 'peach'
      ) {
        setThemeNameState(storedTheme);
      }
      if (storedDark === 'true' || storedDark === 'false') {
        setIsDark(storedDark === 'true');
      }
      if (storedAccent) {
        setAccentColorState(storedAccent);
      }
      setReady(true);
    };
    load();
  }, []);

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
    AsyncStorage.setItem(STORAGE_THEME, name).catch(() => undefined);
  }, []);

  const setAccentColor = useCallback((color: string | null) => {
    setAccentColorState(color);
    if (color) {
      AsyncStorage.setItem(STORAGE_ACCENT, color).catch(() => undefined);
    } else {
      AsyncStorage.removeItem(STORAGE_ACCENT).catch(() => undefined);
    }
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_DARK, String(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const theme = useMemo(
    () => getTheme(themeName, { isDark, accentColor }),
    [themeName, isDark, accentColor]
  );

  const value = useMemo(
    () => ({ themeName, setThemeName, accentColor, setAccentColor, isDark, toggleDark }),
    [themeName, setThemeName, accentColor, setAccentColor, isDark, toggleDark]
  );

  if (!ready || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeSettings = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeSettings must be used within ThemeProvider');
  }
  return ctx;
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
