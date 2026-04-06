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
  const { user } = useAuth();
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
  const lends = stats?.lendsCompleted ?? 0;
  const borrows = stats?.borrowsCompleted ?? 0;
  const trust = stats?.trustScore;

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
        {/* ─── Avatar centered ─── */}
        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickAvatar} style={styles.avatarWrap}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${theme.colors.primary}12` }]}>
                <Text style={[styles.initialsText, { color: theme.colors.primary }]}>{initials}</Text>
              </View>
            )}
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </Pressable>

          <Text style={styles.fullName}>{fullName}</Text>
          {displayName && displayName !== fullName ? (
            <Text style={styles.username}>@{displayName}</Text>
          ) : null}
        </View>

        {/* ─── Bio ─── */}
        {bio ? (
          <Text style={styles.bio}>{bio}</Text>
        ) : (
          <Pressable onPress={() => navigation.navigate('EditProfile')}>
            <Text style={[styles.addBio, { color: theme.colors.primary }]}>+ Add a bio</Text>
          </Pressable>
        )}

        {/* ─── Meta chips ─── */}
        <View style={styles.chipsRow}>
          {gradeTag ? (
            <View style={[styles.chip, { backgroundColor: `${theme.colors.primary}10` }]}>
              <Text style={[styles.chipText, { color: theme.colors.primary }]}>{gradeTag}</Text>
            </View>
          ) : null}
          {pronouns ? (
            <View style={[styles.chip, { backgroundColor: '#F0F0F0' }]}>
              <Text style={[styles.chipText, { color: '#6B7280' }]}>{pronouns}</Text>
            </View>
          ) : null}
          {role === 'admin' ? (
            <View style={[styles.chip, { backgroundColor: `${theme.colors.primary}10` }]}>
              <MaterialCommunityIcons name="shield-check" size={12} color={theme.colors.primary} />
              <Text style={[styles.chipText, { color: theme.colors.primary }]}>Admin</Text>
            </View>
          ) : null}
        </View>

        {/* ─── Edit Profile ─── */}
        <Pressable
          onPress={() => navigation.navigate('EditProfile')}
          style={({ pressed }) => [
            styles.editBtn,
            { borderColor: '#DBDBDB', opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.editBtnText}>Edit profile</Text>
        </Pressable>

        {/* ─── Stats cards ─── */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.statNumber}>{lends}</Text>
            <Text style={styles.statLabel}>Lends</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.statNumber}>{borrows}</Text>
            <Text style={styles.statLabel}>Borrows</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.statNumber}>{trust ?? '—'}</Text>
            <Text style={styles.statLabel}>Trust</Text>
          </View>
        </View>

        {/* ─── About section ─── */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>About</Text>

          <View style={styles.aboutRow}>
            <MaterialCommunityIcons name="account-group-outline" size={18} color="#8E8E93" />
            <Text style={styles.aboutText}>Member of {currentGroup?.name ?? 'Group'}</Text>
          </View>

          {gradeTag ? (
            <View style={styles.aboutRow}>
              <MaterialCommunityIcons name="school-outline" size={18} color="#8E8E93" />
              <Text style={styles.aboutText}>{gradeTag}</Text>
            </View>
          ) : null}

          {pronouns ? (
            <View style={styles.aboutRow}>
              <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#8E8E93" />
              <Text style={styles.aboutText}>{pronouns}</Text>
            </View>
          ) : null}

          <View style={styles.aboutRow}>
            <MaterialCommunityIcons name="hand-heart-outline" size={18} color="#8E8E93" />
            <Text style={styles.aboutText}>
              {lends + borrows} total transactions
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 40, paddingTop: 16 },

  /* Avatar section */
  avatarSection: {
    alignItems: 'center',
    gap: 4,
  },
  avatarWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    marginBottom: 10,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 30,
    fontWeight: '700',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  fullName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  username: {
    fontSize: 14,
    color: '#8E8E93',
  },

  /* Bio */
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3C3C43',
    textAlign: 'center',
    marginTop: 10,
  },
  addBio: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
  },

  /* Chips */
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Edit button */
  editBtn: {
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  /* Stats grid */
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    gap: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },

  /* About */
  aboutSection: {
    marginTop: 20,
    gap: 14,
  },
  aboutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aboutText: {
    fontSize: 14,
    color: '#3C3C43',
  },
});

export default ProfileTabScreen;
