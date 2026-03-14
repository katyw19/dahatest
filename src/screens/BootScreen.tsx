import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { getEnvironment } from '../utils/env';
import type { AppStackParamList } from '../navigation/AppNavigator';

const BootScreen = () => {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const environment = useMemo(() => getEnvironment(), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={styles.title} variant="headlineLarge">
        DAHA ({environment})
      </Text>
      <Text style={styles.subtitle} variant="titleMedium">
        Scaffold running.
      </Text>
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('WelcomeNoGroup')}
        >
          Continue
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Diagnostics')}
        >
          Diagnostics
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#4b5563',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default BootScreen;
