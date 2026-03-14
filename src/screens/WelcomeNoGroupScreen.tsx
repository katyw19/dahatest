import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useEffect, useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { listenMyJoinRequests } from '../services/groups';

const WelcomeNoGroupScreen = () => {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { signOut, user } = useAuth();
  const [pending, setPending] = useState<
    { groupId: string; groupName?: string; status?: string }[]
  >([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          mode="text"
          onPress={() => {
            signOut().catch((error) =>
              console.warn('Sign out failed', error)
            );
          }}
        >
          Sign out
        </Button>
      ),
    });
  }, [navigation, signOut]);

  useEffect(() => {
    if (!user) {
      setPending([]);
      return;
    }
    const unsub = listenMyJoinRequests(user.uid, (reqs) => setPending(reqs));
    return () => unsub();
  }, [user?.uid]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.textBlock}>
        <Text style={styles.title} variant="headlineLarge">
          Welcome to DAHA!
        </Text>
        <Text style={styles.subtitle} variant="titleMedium">
          Borrow and lend items safely within your school or community.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('JoinGroup')}
          style={styles.button}
        >
          Join a Group
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('CreateGroupDetails')}
          style={styles.button}
        >
          Create a Group
        </Button>
        {__DEV__ ? (
          <Button
            mode="text"
            onPress={() => navigation.navigate('Debug')}
            style={styles.button}
          >
            Debug
          </Button>
        ) : null}
      </View>
      {pending.length > 0 ? (
        <View style={styles.pendingSection}>
          <Text variant="titleMedium">Pending requests</Text>
          {pending.map((req) => (
            <View key={req.groupId} style={styles.pendingItemRow}>
              <Text style={styles.pendingItem}>
                {req.groupName ?? req.groupId} — {req.status ?? 'pending'}
              </Text>
              {req.status === 'denied' ? (
                <Text style={styles.pendingHint}>Ask an admin if this was a mistake.</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  textBlock: {
    gap: 12,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    color: '#4b5563',
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
  pendingSection: {
    marginTop: 16,
    gap: 4,
  },
  pendingItem: {
    color: '#4b5563',
  },
  pendingItemRow: {
    gap: 2,
  },
  pendingHint: {
    color: '#9ca3af',
    fontSize: 12,
  },
});

export default WelcomeNoGroupScreen;
