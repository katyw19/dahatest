import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import {
  createGroup,
  listMyMemberships,
  setActiveGroupId,
} from '../services/groups';

const DebugScreen = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [memberships, setMemberships] = useState<string>('[]');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMemberships = async () => {
    if (!user) return;
    try {
      setError(null);
      const data = await listMyMemberships(user.uid);
      setMemberships(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memberships');
    }
  };

  useEffect(() => {
    loadMemberships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleCreateTestGroup = async () => {
    if (!user) {
      setError('Sign in to create a test group.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const group = await createGroup({
        name: 'DAHA Test Group',
        description: 'Dev-only group',
        rules: '',
        gradeTags: ['Anyone'],
        createdByUid: user.uid,
      });
      await setActiveGroupId(group.id);
      await loadMemberships();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test group');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Debug
      </Text>
      <Text variant="bodyMedium">UID: {user?.uid ?? 'signed out'}</Text>
      <Text variant="bodyMedium">Email: {user?.email ?? 'n/a'}</Text>
      {error ? (
        <Text style={styles.error} variant="bodySmall">
          {error}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleCreateTestGroup}
          disabled={!user || busy}
          loading={busy}
        >
          Create Test Group
        </Button>
        <Button mode="outlined" onPress={loadMemberships} disabled={!user || busy}>
          Refresh memberships
        </Button>
        <Button
          mode="text"
          onPress={() => signOut().catch((e) => console.warn('Sign out failed', e))}
        >
          Sign out
        </Button>
      </View>
      <Text variant="titleMedium">Memberships</Text>
      <View style={styles.codeBlock}>
        <Text selectable variant="bodySmall">
          {memberships}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  codeBlock: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
  },
  error: {
    color: '#b91c1c',
  },
});

export default DebugScreen;
