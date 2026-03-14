import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { doc, getDoc } from 'firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { getFirebaseDb } from '../../services/firebase';
import type { Group } from '../../models/group';
import { regenerateInviteCode } from '../../services/groups';

type Props = NativeStackScreenProps<GroupStackParamList, 'GroupInvite'>;

const GroupInviteScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadGroup = async () => {
    if (!currentGroup) return;
    setLoading(true);
    setError(null);
    try {
      const db = getFirebaseDb();
      if (!db) {
        setError('Firestore not configured. Check env vars.');
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, 'groups', currentGroup.id));
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

  useEffect(() => {
    loadGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup?.id]);

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
        <Button onPress={loadGroup}>Retry</Button>
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

  const handleRegenerate = async () => {
    if (!currentGroup) return;
    setStatus(null);
    setError(null);
    try {
      const newCode = await regenerateInviteCode(currentGroup.id);
      setGroup({ ...group, inviteCode: newCode });
      setStatus('Invite code regenerated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate invite.');
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
          People can scan the QR code or enter the invite code to request access.
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
        {group.inviteCode && currentMembership?.role === 'admin' ? (
          <Button mode="text" onPress={handleRegenerate}>
            Regenerate
          </Button>
        ) : null}
        <Button mode="text" onPress={() => navigation.goBack()}>
          Go back
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
    textAlign: 'center',
  },
});

export default GroupInviteScreen;
