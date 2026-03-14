import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<AppStackParamList, 'RequestSent'>;

const RequestSentScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        Request sent!
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        An admin will approve you soon.
      </Text>
      <Button mode="contained" onPress={() => navigation.navigate('WelcomeNoGroup')}>
        Back to Welcome
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    color: '#4b5563',
  },
});

export default RequestSentScreen;
