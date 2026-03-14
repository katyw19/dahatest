import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { useGroupContext } from './GroupProvider';
import { getFirebaseDb, getFirebaseStorage } from '../../services/firebase';
import type { UserProfile } from '../../models/userProfile';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import AppCard from '../../components/AppCard';
import Screen from '../../components/Screen';
import { SPACING } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'Profile'>;

const ProfileTabScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { signOut, user } = useAuth();
  const { currentGroup, currentMembership } = useGroupContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [membershipStats, setMembershipStats] = useState<typeof currentMembership | null>(null);

  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);


  useEffect(() => {
    if (!user || !currentGroup) {
      setMembershipStats(null);
      return;
    }
    const db = getFirebaseDb();
    if (!db) return;
    const ref = doc(db, 'groups', currentGroup.id, 'members', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setMembershipStats(snap.exists() ? (snap.data() as typeof currentMembership) : null);
    });
    return () => unsub();
  }, [currentGroup?.id, user?.uid]);

  const handlePickAvatar = async () => {
    if (!user) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return;
    const uri = res.assets[0].uri;
    try {
      setUploading(true);
      const storage = getFirebaseStorage();
      const db = getFirebaseDb();
      if (!storage || !db) throw new Error('Firebase not configured.');
      const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      const blob = await (await fetch(uri)).blob();
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await setDoc(
        doc(db, 'users', user.uid),
        { photoURL: url, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.warn(err);
    } finally {
      setUploading(false);
    }
  };

  const fullName =
    `${membershipStats?.firstName ?? profile?.firstName ?? ''} ${membershipStats?.lastName ?? profile?.lastName ?? ''}`.trim() ||
    `${currentMembership?.firstName ?? ''} ${currentMembership?.lastName ?? ''}`.trim() ||
    'Member';
  const displayName = profile?.displayName?.trim() ?? '';
  const pronouns = profile?.pronouns?.trim();
  const stats = membershipStats ?? currentMembership;

  return (
    <Screen>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Pressable
              style={[styles.avatarWrap, { borderColor: theme.colors.outline }]}
              onPress={handlePickAvatar}
            >
              {profile?.photoURL ? (
                <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
                  <Text variant="titleMedium">Add Photo</Text>
                </View>
              )}
              {uploading ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#111827" />
                </View>
              ) : null}
            </Pressable>
          </View>
          <Text variant="headlineSmall" style={styles.name}>
            {fullName}
          </Text>
          {displayName ? (
            <Text variant="bodySmall" style={styles.displayName}>
              {displayName}
            </Text>
          ) : null}
          {pronouns ? (
            <Text variant="bodySmall" style={styles.pronouns}>
              {pronouns}
            </Text>
          ) : null}

          <AppCard style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="headlineSmall">{stats?.lendsCompleted ?? 0}</Text>
                <Text variant="bodySmall">Lends</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="headlineSmall">{stats?.borrowsCompleted ?? 0}</Text>
                <Text variant="bodySmall">Borrows</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="headlineSmall">{stats?.trustScore ?? '—'}</Text>
                <Text variant="bodySmall">
                  Trust{stats?.trustScoreIsDefault ? ' (default)' : ''}
                </Text>
              </View>
            </View>
          </AppCard>

          <View style={styles.buttonRow}>
            <Button mode="contained" onPress={() => navigation.navigate('EditProfile')}>
              Edit profile
            </Button>
            <Button mode="outlined" onPress={() => navigation.navigate('Settings')}>
              Settings
            </Button>
            <Button mode="text" onPress={() => signOut().catch(() => {})}>
              Sign out
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: SPACING.md,
  },
  header: {
    alignItems: 'center',
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  name: {
    fontWeight: '700',
    textAlign: 'center',
  },
  displayName: {
    textAlign: 'center',
    color: '#6b7280',
  },
  pronouns: {
    textAlign: 'center',
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.sm,
  },
  statsCard: {
    paddingVertical: 6,
  },
  statItem: {
    alignItems: 'center',
  },
  buttonRow: {
    gap: SPACING.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProfileTabScreen;
