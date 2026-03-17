import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { doc, onSnapshot } from 'firebase/firestore';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { getFirebaseDb } from '../../services/firebase';
import type { UserProfile } from '../../models/userProfile';
import type { Membership } from '../../models/membership';
import { BADGE_DEFINITIONS } from '../../constants/badges';
import { useGroupContext } from './GroupProvider';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'UserProfile'>;

const UserProfileScreen = ({ route }: Props) => {
  const theme = useTheme();
  const { uid } = route.params;
  const { currentGroup } = useGroupContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    const userRef = doc(db, 'users', uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      setLoading(false);
    });
    return () => unsubUser();
  }, [uid]);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    if (!currentGroup?.id) return;
    const memberRef = doc(db, 'groups', currentGroup.id, 'members', uid);
    const unsubMember = onSnapshot(memberRef, (snap) => {
      setMembership(snap.exists() ? (snap.data() as Membership) : null);
    });
    return () => unsubMember();
  }, [uid, currentGroup?.id]);

  const fullName =
    `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
    `${membership?.firstName ?? ''} ${membership?.lastName ?? ''}`.trim();
  const displayName = profile?.displayName?.trim();
  const pronouns = profile?.pronouns?.trim();
  const bio = (profile as any)?.bio?.trim?.() ?? '';
  const gradeTag = profile?.gradeTag ?? (membership as any)?.gradeTag;
  const role = membership?.role;
  const totalLends = profile?.totalLends ?? 0;
  const badgesEarned = profile?.badgesEarned ?? {};
  const earnedSet = useMemo(() => new Set(Object.keys(badgesEarned).filter((id) => badgesEarned[id])), [badgesEarned]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Header Card ─── */}
        <View style={[styles.headerCard, { backgroundColor: theme.colors.surface }]}>
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
              <MaterialCommunityIcons name="account" size={36} color={theme.colors.primary} />
            </View>
          )}

          <Text style={[styles.fullName, { color: '#1C1C1E' }]}>{fullName || 'Member'}</Text>
          {displayName && displayName !== fullName ? (
            <Text style={styles.username}>@{displayName}</Text>
          ) : null}

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

          {bio ? <Text style={[styles.bio, { color: '#3C3C43' }]}>{bio}</Text> : null}
        </View>

        {/* ─── Stats Row ─── */}
        <View style={[styles.statsRow, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{membership?.lendsCompleted ?? 0}</Text>
            <Text style={styles.statLabel}>Lends</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{membership?.borrowsCompleted ?? 0}</Text>
            <Text style={styles.statLabel}>Borrows</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#1C1C1E' }]}>{membership?.trustScore ?? '—'}</Text>
            <Text style={styles.statLabel}>Trust</Text>
          </View>
        </View>

        {/* ─── Badges ─── */}
        <View style={[styles.badgesCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: '#1C1C1E' }]}>Badges</Text>
          <View style={styles.badgeGrid}>
            {BADGE_DEFINITIONS.map((badge) => {
              const unlocked = earnedSet.has(badge.id) || totalLends >= badge.threshold;
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeItem,
                    {
                      backgroundColor: unlocked ? `${badge.color}18` : `${theme.colors.outline}20`,
                      borderColor: unlocked ? badge.color : theme.colors.outline,
                    },
                  ]}
                >
                  <Text style={[styles.badgeTitle, { color: unlocked ? '#1C1C1E' : '#8E8E93' }]} numberOfLines={1}>
                    {badge.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: unlocked ? '#34C759' : '#8E8E93' }}>
                    {unlocked ? 'Unlocked' : `${Math.min(totalLends, badge.threshold)}/${badge.threshold}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40, gap: SPACING.sm },

  headerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.sm,
    gap: 6,
  },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 8 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45, marginBottom: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  fullName: { fontSize: 22, fontWeight: '700' },
  username: { fontSize: 14, color: '#8E8E93' },
  metaRow: {
    flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  metaChipText: { fontSize: 12, fontWeight: '500' },
  bio: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, paddingHorizontal: 12 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 18, borderRadius: RADIUS.lg, marginHorizontal: SPACING.sm,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  statDivider: { width: 1, height: 32 },

  badgesCard: {
    borderRadius: RADIUS.lg, marginHorizontal: SPACING.sm, padding: SPACING.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeItem: {
    width: '47%',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: RADIUS.md, borderWidth: 1,
  },
  badgeTitle: { fontSize: 13, fontWeight: '600' },
});

export default UserProfileScreen;
