import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { useGroupContext } from './GroupProvider';
import { getFirebaseDb, getFirebaseStorage } from '../../services/firebase';
import type { UserProfile } from '../../models/userProfile';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'Profile'>;

const ProfileTabScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { currentGroup, currentMembership } = useGroupContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [membershipStats, setMembershipStats] = useState<typeof currentMembership | null>(null);

  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) { setLoading(false); return; }
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !currentGroup) { setMembershipStats(null); return; }
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
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (res.canceled || !res.assets?.length) return;
    const uri = res.assets[0].uri;
    try {
      setUploading(true);
      const storage = getFirebaseStorage();
      const db = getFirebaseDb();
      if (!storage || !db) throw new Error('Firebase not configured.');
      const sRef = storageRef(storage, `users/${user.uid}/profile.jpg`);
      const blob = await (await fetch(uri)).blob();
      await uploadBytes(sRef, blob);
      const url = await getDownloadURL(sRef);
      await setDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() }, { merge: true });
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
  const bio = (profile as any)?.bio?.trim?.() ?? '';
  const stats = membershipStats ?? currentMembership;
  const gradeTag = profile?.gradeTag ?? (stats as any)?.gradeTag;
  const role = stats?.role;

  const initials = (fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?').toUpperCase();

  if (loading) {
    return (
      <Screen noTopPadding>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen noTopPadding>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Top section: avatar + stats side by side ─── */}
        <View style={styles.topSection}>
          {/* Avatar */}
          <Pressable onPress={handlePickAvatar} style={styles.avatarWrap}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Text style={[styles.initialsText, { color: theme.colors.primary }]}>{initials}</Text>
              </View>
            )}
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </Pressable>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{stats?.lendsCompleted ?? 0}</Text>
              <Text style={styles.statLabel}>Lends</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{stats?.borrowsCompleted ?? 0}</Text>
              <Text style={styles.statLabel}>Borrows</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{stats?.trustScore ?? '—'}</Text>
              <Text style={styles.statLabel}>Trust</Text>
            </View>
          </View>
        </View>

        {/* ─── Name + meta ─── */}
        <View style={styles.infoSection}>
          <Text style={[styles.fullName, { color: '#1C1C1E' }]}>{fullName}</Text>
          {displayName && displayName !== fullName ? (
            <Text style={styles.username}>@{displayName}</Text>
          ) : null}

          {/* Meta inline */}
          <View style={styles.metaRow}>
            {gradeTag ? <Text style={styles.metaText}>{gradeTag}</Text> : null}
            {gradeTag && (pronouns || role === 'admin') ? <Text style={styles.metaDot}>·</Text> : null}
            {pronouns ? <Text style={styles.metaText}>{pronouns}</Text> : null}
            {pronouns && role === 'admin' ? <Text style={styles.metaDot}>·</Text> : null}
            {role === 'admin' ? <Text style={[styles.metaText, { color: theme.colors.primary }]}>Admin</Text> : null}
          </View>

          {/* Bio */}
          {bio ? (
            <Text style={styles.bio}>{bio}</Text>
          ) : (
            <Pressable onPress={() => navigation.navigate('EditProfile')}>
              <Text style={[styles.addBio, { color: theme.colors.primary }]}>Add a bio</Text>
            </Pressable>
          )}
        </View>

        {/* ─── Edit Profile Button ─── */}
        <Pressable
          onPress={() => navigation.navigate('EditProfile')}
          style={({ pressed }) => [
            styles.editBtn,
            { backgroundColor: theme.colors.surface, borderColor: '#DBDBDB', opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.editBtnText}>Edit profile</Text>
        </Pressable>

        {/* ─── Divider ─── */}
        <View style={[styles.divider, { backgroundColor: '#EBEBEB' }]} />

        {/* ─── Sign Out ─── */}
        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.signOutRow, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: SPACING.md, paddingBottom: 40, paddingTop: 12 },

  /* Top: avatar + stats */
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 26,
    fontWeight: '700',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },

  /* Info */
  infoSection: {
    marginTop: 12,
    gap: 2,
  },
  fullName: {
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    fontSize: 13,
    color: '#8E8E93',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  metaDot: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  bio: {
    fontSize: 14,
    lineHeight: 19,
    color: '#1C1C1E',
    marginTop: 4,
  },
  addBio: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },

  /* Edit button */
  editBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  /* Divider */
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 16,
    marginBottom: 4,
  },

  /* Sign out */
  signOutRow: {
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
});

export default ProfileTabScreen;
