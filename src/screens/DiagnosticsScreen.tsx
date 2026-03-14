import Constants from 'expo-constants';
import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { AppStackParamList } from '../navigation/AppNavigator';

const DiagnosticsScreen = () => {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const appName = useMemo(
    () => Constants.expoConfig?.name ?? 'DAHA',
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={styles.title} variant="headlineSmall">
        Diagnostics
      </Text>
      <View style={styles.section}>
        <Text variant="bodyLarge">App: {appName}</Text>
        <Text variant="bodyLarge">Platform: {Platform.OS}</Text>
        <Text variant="bodyMedium" style={styles.hint}>
          Reload the app from the dev menu or by pressing refresh in Expo Go.
        </Text>
      </View>
      <Button mode="outlined" onPress={() => navigation.goBack()}>
        Back
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
  },
  section: {
    gap: 8,
  },
  hint: {
    color: '#4b5563',
  },
});

export default DiagnosticsScreen;
