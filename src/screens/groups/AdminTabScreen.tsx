import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { getFirebaseDb } from '../../services/firebase';
import type { JoinRequest } from '../../models/joinRequest';
import { approveJoinRequest, denyJoinRequest } from '../../services/groups';

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
      if (!db) {
        setError('Firestore not configured.');
        setLoading(false);
        return;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup?.id]);

  if (!currentGroup || currentMembership?.role !== 'admin') {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Admins only</Text>
      </View>
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
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const formatDate = (req: JoinRequest) => {
    const ts: any = (req as any).createdAt;
    if (ts?.toDate) {
      return ts.toDate().toLocaleString();
    }
    return '';
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Pending requests
      </Text>
      {error ? (
        <Text style={styles.error} variant="bodySmall">
          {error}
        </Text>
      ) : null}
      {requests.length === 0 ? (
        <Text>No pending requests.</Text>
      ) : (
        requests.map((req) => (
          <Card key={req.id} style={styles.card} mode="outlined">
            <Card.Title
              title={`${req.firstName} ${req.lastName}`}
              subtitle={`${req.gradeTag} • ${formatDate(req)}`}
            />
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => handleApprove(req)}
                loading={actingId === req.id}
                disabled={actingId === req.id}
              >
                Approve
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleDeny(req)}
                loading={actingId === req.id}
                disabled={actingId === req.id}
              >
                Deny
              </Button>
            </Card.Actions>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  card: {
    borderRadius: 8,
  },
  error: {
    color: '#b91c1c',
  },
});

export default AdminTabScreen;
