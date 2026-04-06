import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { useGroupContext } from './GroupProvider';
import { getFirebaseDb, getFirebaseStorage } from '../../services/firebase';
import { listenPostsByAuthor } from '../../services/posts';
import type { UserProfile } from '../../models/userProfile';
import type { PostRequest } from '../../models/postRequest';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'Profile'>;

const formatRelative = (dateValue: any) => {
  const date = dateValue?.toDate ? dateValue.toDate() : null;
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const ProfileTabScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { currentGroup, currentMembership } = useGroupContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [membershipStats, setMembershipStats] = useState<typeof currentMembership | null>(null);
  const [myPosts, setMyPosts] = useState<PostRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'donations'>('requests');

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

  useEffect(() => {
    if (!currentGroup || !user) return;
    const unsub = listenPostsByAuthor(
      currentGroup.id,
      user.uid,
      setMyPosts,
      activeTab === 'donations' ? 'dawa' : 'daha'
    );
    return () => { if (unsub) unsub(); };
  }, [currentGroup?.id, user?.uid, activeTab]);

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

  const renderPostItem = ({ item }: { item: PostRequest }) => {
    const isClosed = item.status === 'borrowed' || item.status === 'claimed';
    return (
      <Pressable
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        style={({ pressed }) => [
          styles.postItem,
          { borderBottomColor: '#F0F0F0', opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.postItemLeft}>
          <Text style={styles.postItemText} numberOfLines={2}>{item.text}</Text>
          <View style={styles.postItemMeta}>
            {item.audienceTag ? <Text style={styles.postItemTag}>{item.audienceTag}</Text> : null}
            {item.audienceTag ? <Text style={styles.postItemDot}>·</Text> : null}
            <Text style={styles.postItemTime}>{formatRelative((item as any).createdAt)}</Text>
          </View>
        </View>
        <View style={[styles.postItemStatus, { backgroundColor: isClosed ? '#F0F0F0' : `${theme.colors.primary}12` }]}>
          <Text style={[styles.postItemStatusText, { color: isClosed ? '#8E8E93' : theme.colors.primary }]}>
            {item.status === 'claimed' ? 'Claimed' : item.status === 'borrowed' ? 'Borrowed' : 'Open'}
          </Text>
        </View>
      </Pressable>
    );
  };

  const headerComponent = (
    <>
      {/* ─── Top section: avatar + stats ─── */}
      <View style={styles.topSection}>
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

        <View style={styles.metaRow}>
          {gradeTag ? <Text style={styles.metaText}>{gradeTag}</Text> : null}
          {gradeTag && (pronouns || role === 'admin') ? <Text style={styles.metaDot}>·</Text> : null}
          {pronouns ? <Text style={styles.metaText}>{pronouns}</Text> : null}
          {pronouns && role === 'admin' ? <Text style={styles.metaDot}>·</Text> : null}
          {role === 'admin' ? <Text style={[styles.metaText, { color: theme.colors.primary }]}>Admin</Text> : null}
        </View>

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

      {/* ─── Tab bar ─── */}
      <View style={[styles.tabBar, { borderBottomColor: '#EBEBEB' }]}>
        <Pressable
          onPress={() => setActiveTab('requests')}
          style={[
            styles.tab,
            activeTab === 'requests' && [styles.tabActive, { borderBottomColor: '#1C1C1E' }],
          ]}
        >
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={22}
            color={activeTab === 'requests' ? '#1C1C1E' : '#C7C7CC'}
          />
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('donations')}
          style={[
            styles.tab,
            activeTab === 'donations' && [styles.tabActive, { borderBottomColor: '#1C1C1E' }],
          ]}
        >
          <MaterialCommunityIcons
            name="gift-outline"
            size={22}
            color={activeTab === 'donations' ? '#1C1C1E' : '#C7C7CC'}
          />
        </Pressable>
      </View>
    </>
  );

  return (
    <Screen noTopPadding>
      <FlatList
        data={myPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPostItem}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={
          <View style={styles.emptySection}>
            <MaterialCommunityIcons
              name={activeTab === 'requests' ? 'package-variant-closed' : 'gift-outline'}
              size={36}
              color="#D1D1D6"
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'requests' ? 'No requests yet' : 'No donations yet'}
            </Text>
            <Text style={styles.emptyHint}>
              {activeTab === 'requests'
                ? 'Your borrow requests will appear here'
                : 'Items you donate will appear here'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 40 },

  /* Top: avatar + stats */
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
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
    paddingHorizontal: SPACING.md,
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
    marginHorizontal: SPACING.md,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomWidth: 1.5,
  },

  /* Post items */
  postItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  postItemLeft: {
    flex: 1,
    gap: 3,
  },
  postItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    lineHeight: 19,
  },
  postItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postItemTag: {
    fontSize: 12,
    color: '#8E8E93',
  },
  postItemDot: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  postItemTime: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  postItemStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  postItemStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Empty */
  emptySection: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptyHint: {
    fontSize: 13,
    color: '#C7C7CC',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default ProfileTabScreen;
