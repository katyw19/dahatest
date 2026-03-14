import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { doc, getDoc } from 'firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getFirebaseDb } from '../../services/firebase';
import type { Group } from '../../models/group';

type Props = NativeStackScreenProps<AppStackParamList, 'InvitePeople'>;

const InvitePeopleScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { groupId } = route.params;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const db = getFirebaseDb();
        if (!db) {
          setError('Firestore not configured. Check env vars.');
          setLoading(false);
          return;
        }
        const snap = await getDoc(doc(db, 'groups', groupId));
        if (!snap.exists()) {
          setError('Group not found.');
          setLoading(false);
          return;
        }
        setGroup({ ...(snap.data() as Group), id: snap.id });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [groupId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge">{error ?? 'Group not found.'}</Text>
      </View>
    );
  }

  const deepLink = `daha://join?code=${group.inviteCode}`;

  const copyCode = async () => {
    setStatus(null);
    setError(null);
    await Clipboard.setStringAsync(group.inviteCode);
    setStatus('Invite code copied.');
  };

  const shareInvite = async () => {
    setStatus(null);
    setError(null);
    try {
      await Share.share({
        message: `Join my DAHA group "${group.name}" with code ${group.inviteCode}.\n${deepLink}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to share invite.');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Invite people
      </Text>
      <Text variant="titleMedium">{group.name}</Text>
      <Text variant="headlineMedium" style={styles.code}>
        {group.inviteCode}
      </Text>
      <View style={styles.qrContainer}>
        <QRCode value={deepLink} size={200} />
        <Text variant="bodySmall" style={styles.linkText}>
          {deepLink}
        </Text>
      </View>
      {status ? (
        <Text style={styles.success} variant="bodySmall">
          {status}
        </Text>
      ) : null}
      {error ? (
        <Text style={styles.error} variant="bodySmall">
          {error}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button mode="contained" onPress={copyCode}>
          Copy code
        </Button>
        <Button mode="outlined" onPress={shareInvite}>
          Share invite
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()}>
          Go to group
        </Button>
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
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  code: {
    letterSpacing: 2,
    fontWeight: '700',
  },
  qrContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  success: {
    color: '#15803d',
  },
  error: {
    color: '#b91c1c',
  },
  linkText: {
    color: '#4b5563',
  },
});

export default InvitePeopleScreen;
