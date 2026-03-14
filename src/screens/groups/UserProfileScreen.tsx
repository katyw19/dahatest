import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { doc, onSnapshot } from 'firebase/firestore';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { getFirebaseDb } from '../../services/firebase';
import type { UserProfile } from '../../models/userProfile';
import type { Membership } from '../../models/membership';
import { BADGE_DEFINITIONS } from '../../constants/badges';
import { useGroupContext } from './GroupProvider';
import AppCard from '../../components/AppCard';


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

  const totalLends = profile?.totalLends ?? 0;
  const badgesEarned = profile?.badgesEarned ?? {};

  const earnedSet = useMemo(() => new Set(Object.keys(badgesEarned).filter((id) => badgesEarned[id])), [badgesEarned]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        {profile?.photoURL ? (
          <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text variant="titleMedium">No Photo</Text>
          </View>
        )}
      </View>
      <Text variant="headlineSmall" style={styles.name}>
        {fullName || 'Member'}
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
            <Text variant="headlineSmall">{membership?.lendsCompleted ?? 0}</Text>
            <Text variant="bodySmall">Lends</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineSmall">{membership?.borrowsCompleted ?? 0}</Text>
            <Text variant="bodySmall">Borrows</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineSmall">{membership?.trustScore ?? '—'}</Text>
            <Text variant="bodySmall">Trust</Text>
          </View>
        </View>
      </AppCard>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Badges
      </Text>
      <View style={styles.grid}>
        {BADGE_DEFINITIONS.map((badge) => {
          const unlocked = earnedSet.has(badge.id) || totalLends >= badge.threshold;
          return (
            <Card
              key={badge.id}
              mode="outlined"
              style={[
                styles.badgeCard,
                {
                  backgroundColor: unlocked ? `${badge.color}22` : theme.colors.surface,
                  borderColor: unlocked ? badge.color : theme.colors.outline,
                },
              ]}
            >
              <Card.Content>
                <Text variant="titleSmall" style={styles.badgeTitle} numberOfLines={2}>
                  {badge.title}
                </Text>
                <Text variant="bodySmall" style={{ color: unlocked ? '#0f172a' : '#6b7280' }}>
                  {unlocked ? 'Unlocked' : `${Math.min(totalLends, badge.threshold)} / ${badge.threshold} lends`}
                </Text>
              </Card.Content>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  header: { alignItems: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  name: { fontWeight: '700', textAlign: 'center' },
  displayName: { textAlign: 'center', color: '#6b7280' },
  pronouns: { textAlign: 'center', color: '#6b7280' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  statsCard: {
    paddingVertical: 6,
    marginTop: 12,
  },
  statItem: { alignItems: 'center' },
  sectionTitle: { marginTop: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  badgeCard: { width: '47%', borderRadius: 14 },
  badgeTitle: { fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default UserProfileScreen;
