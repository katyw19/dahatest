import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { getFirebaseDb } from '../../services/firebase';
import type { JoinRequest } from '../../models/joinRequest';
import { approveJoinRequest, denyJoinRequest } from '../../services/groups';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

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

const AdminTabScreen = () => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    if (!currentGroup) return;
    setLoading(true);
    setError(null);
    try {
      const db = getFirebaseDb();
      if (!db) { setError('Firestore not configured.'); setLoading(false); return; }
      const reqRef = collection(db, `groups/${currentGroup.id}/joinRequests`);
      const q = query(reqRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setRequests(snap.docs.map((d) => ({ ...(d.data() as JoinRequest), id: d.id })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentGroup?.id]);

  if (!currentGroup || currentMembership?.role !== 'admin') {
    return (
      <Screen noTopPadding>
        <View style={styles.center}>
          <Text style={{ color: '#8E8E93' }}>Admins only</Text>
        </View>
      </Screen>
    );
  }

  const handleApprove = async (req: JoinRequest) => {
    if (!user || !currentGroup) return;
    setActingId(req.id);
    setError(null);
    try {
      await approveJoinRequest(currentGroup.id, req.id, user.uid, req.requesterUid, {
        firstName: req.firstName,
        lastName: req.lastName,
        gradeTag: req.gradeTag,
        groupName: currentGroup.name,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setActingId(null);
    }
  };

  const handleDeny = async (req: JoinRequest) => {
    if (!user || !currentGroup) return;
    setActingId(req.id);
    setError(null);
    try {
      await denyJoinRequest(currentGroup.id, req.id, user.uid, req.requesterUid);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deny failed');
    } finally {
      setActingId(null);
    }
  };

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
        <Text style={styles.countText}>
          {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="check-circle-outline" size={40} color="#D1D1D6" />
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyHint}>No pending join requests right now</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {requests.map((req) => {
              const name = `${req.firstName} ${req.lastName}`.trim();
              const initials = `${req.firstName?.[0] ?? ''}${req.lastName?.[0] ?? ''}`.toUpperCase();
              const isActing = actingId === req.id;

              return (
                <View key={req.id} style={[styles.requestCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.requestTop}>
                    <View style={[styles.avatar, { backgroundColor: `${theme.colors.primary}15` }]}>
                      <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{initials}</Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{name}</Text>
                      <Text style={styles.requestMeta}>
                        {req.gradeTag} · {formatRelative((req as any).createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => handleApprove(req)}
                      disabled={isActing}
                      style={({ pressed }) => [
                        styles.approveBtn,
                        { backgroundColor: theme.colors.primary, opacity: pressed || isActing ? 0.6 : 1 },
                      ]}
                    >
                      {isActing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.approveBtnText}>Accept</Text>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeny(req)}
                      disabled={isActing}
                      style={({ pressed }) => [
                        styles.denyBtn,
                        { borderColor: '#DBDBDB', opacity: pressed || isActing ? 0.6 : 1 },
                      ]}
                    >
                      <Text style={styles.denyBtnText}>Decline</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: SPACING.md, paddingBottom: 40, gap: SPACING.sm },

  countText: { fontSize: 13, color: '#8E8E93', fontWeight: '500', paddingHorizontal: 4 },
  errorText: { color: '#FF3B30', fontSize: 13, textAlign: 'center' },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#8E8E93' },
  emptyHint: { fontSize: 13, color: '#C7C7CC' },

  list: { gap: SPACING.sm },

  requestCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 14,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  requestInfo: { flex: 1, gap: 2 },
  requestName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  requestMeta: { fontSize: 13, color: '#8E8E93' },

  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  denyBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  denyBtnText: { color: '#1C1C1E', fontSize: 14, fontWeight: '600' },
});

export default AdminTabScreen;
