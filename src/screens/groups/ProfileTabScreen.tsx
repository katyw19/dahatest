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
        {/* ─── Header Card ─── */}
        <View style={[styles.headerCard, { backgroundColor: theme.colors.surface }]}>
          {/* Avatar */}
          <Pressable onPress={handlePickAvatar} style={styles.avatarWrap}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Text style={[styles.initialsText, { color: theme.colors.primary }]}>
                  {(fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?').toUpperCase()}
                </Text>
              </View>
            )}
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
            <View style={[styles.cameraBadge, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="pencil" size={12} color="#fff" />
            </View>
          </Pressable>

          {/* Name + subtitle */}
          <Text style={[styles.fullName, { color: '#1C1C1E' }]}>{fullName}</Text>
          {displayName && displayName !== fullName ? (
            <Text style={styles.username}>@{displayName}</Text>
          ) : null}

          {/* Meta tags row */}
          <View style={styles.metaRow}>
            {pronouns ? (
              <View style={[styles.metaChip, { backgroundColor: theme.colors.secondary }]}>
                <Text style={[styles.metaChipText, { color: theme.colors.onSecondary }]}>{pronouns}</Text>
              </View>
            ) : null}
            {gradeTag ? (
              <View style={[styles.metaChip, { backgroundColor: theme.colors.secondary }]}>
                <Text style={[styles.metaChipText, { color: theme.colors.onSecondary }]}>{gradeTag}</Text>
              </View>
            ) : null}
            {role === 'admin' ? (
              <View style={[styles.metaChip, { backgroundColor: `${theme.colors.primary}20` }]}>
                <MaterialCommunityIcons name="shield-check" size={12} color={theme.colors.primary} />
                <Text style={[styles.metaChipText, { color: theme.colors.primary }]}>Admin</Text>
              </View>
            ) : null}
          </View>

          {/* Bio */}
          {bio ? (
            <Text style={[styles.bio, { color: '#3C3C43' }]}>{bio}</Text>
          ) : (
            <Pressable onPress={() => navigation.navigate('EditProfile')}>
              <Text style={[styles.addBio, { color: theme.colors.primary }]}>+ Add a bio</Text>
            </Pressable>
          )}
        </View>

        {/* ─── Stats Row ─── */}
        <View style={[styles.statsRow, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{stats?.lendsCompleted ?? 0}</Text>
            <Text style={styles.statLabel}>Lends</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{stats?.borrowsCompleted ?? 0}</Text>
            <Text style={styles.statLabel}>Borrows</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{stats?.trustScore ?? '—'}</Text>
            <Text style={styles.statLabel}>
              Trust{stats?.trustScoreIsDefault ? ' (new)' : ''}
            </Text>
          </View>
        </View>

        {/* ─── Action Buttons ─── */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="pencil-outline" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Edit Profile</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outline, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="cog-outline" size={14} color={'#1C1C1E'} />
            <Text style={[styles.actionBtnText, { color: '#1C1C1E' }]}>Settings</Text>
          </Pressable>
        </View>

        {/* ─── Quick Links ─── */}
        <View style={[styles.linksCard, { backgroundColor: theme.colors.surface }]}>
          <Pressable
            onPress={() => {
              const tab = navigation.getParent?.();
              if (tab) {
                tab.navigate('BadgesTab' as never);
              }
            }}
            style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: `${theme.colors.primary}08` }]}
          >
            <View style={[styles.linkIcon, { backgroundColor: '#FFD60A20' }]}>
              <MaterialCommunityIcons name="trophy-outline" size={16} color="#FFD60A" />
            </View>
            <Text style={[styles.linkText, { color: '#1C1C1E' }]}>Badges</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
          </Pressable>

          <View style={[styles.linkDivider, { backgroundColor: theme.colors.outline }]} />

          <Pressable
            onPress={() => navigation.navigate('ThemePicker')}
            style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: `${theme.colors.primary}08` }]}
          >
            <View style={[styles.linkIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
              <MaterialCommunityIcons name="palette-outline" size={16} color={theme.colors.primary} />
            </View>
            <Text style={[styles.linkText, { color: '#1C1C1E' }]}>Theme</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
          </Pressable>
        </View>

        {/* ─── Sign Out ─── */}
        <Pressable
          onPress={signOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40, gap: 8 },

  /* Header card */
  headerCard: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.sm,
    marginTop: 12,
    gap: 4,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 26,
    fontWeight: '700',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  fullName: {
    fontSize: 18,
    fontWeight: '700',
  },
  username: {
    fontSize: 13,
    color: '#8E8E93',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 2,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bio: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
    color: '#3C3C43',
  },
  addBio: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
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
  statDivider: {
    width: 1,
    height: 24,
  },

  /* Actions */
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  /* Links */
  linksCard: {
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  linkIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  linkDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },

  /* Sign out */
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: SPACING.sm,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfileTabScreen;
