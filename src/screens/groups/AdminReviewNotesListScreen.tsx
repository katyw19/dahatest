import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, Text, ToggleButton, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { listenAdminReviewNotes } from '../../services/adminReviewNotes';
import { formatDistanceToNow } from 'date-fns';
import { listenUserProfiles } from '../../services/userProfiles';
import type { Membership } from '../../models/membership';
import { collection, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../../services/firebase';
import { resolveDisplayName } from '../../utils/displayName';

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminReviewNotesList'>;

const shortUid = (uid?: string) => {
  if (!uid) return '';
  return uid.length <= 8 ? uid : `${uid.slice(0, 6)}…`;
};

const nonEmpty = (v: unknown) => {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t.length ? t : '';
};

const outcomeLabel = (outcome?: string) => {
  switch (outcome) {
    case 'returned_same':
      return 'returned_same';
    case 'minor_damage':
      return 'minor_damage';
    case 'major_damage':
      return 'major_damage';
    default:
      return outcome ?? '';
  }
};

const AdminReviewNotesListScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const [onlyNotes, setOnlyNotes] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, Membership>>({});
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!currentGroup || currentMembership?.role !== 'admin') return;
    const unsub = listenAdminReviewNotes(currentGroup.id, { onlyNotes }, setNotes);
    return () => unsub();
  }, [currentGroup?.id, onlyNotes, currentMembership?.role]);

  useEffect(() => {
    if (!currentGroup) return;
    const db = getFirebaseDb();
    if (!db) return;
    const ref = collection(db, `groups/${currentGroup.id}/members`);
    const unsub = onSnapshot(ref, (snap) => {
      const next: Record<string, Membership> = {};
      snap.docs.forEach((d) => {
        next[d.id] = d.data() as Membership;
      });
      setMemberMap(next);
    });
    return () => unsub();
  }, [currentGroup?.id]);

  const uids = useMemo(
    () =>
      notes
        .flatMap((n) => [n.reviewerUid, n.targetUid])
        .filter(Boolean) as string[],
    [notes]
  );

  useEffect(() => {
    if (!uids.length) return;
    let unsub: (() => void) | undefined;
    try {
      unsub = listenUserProfiles(uids, setProfileMap);
    } catch {
      // ignore
    }
    return () => {
      if (unsub) unsub();
    };
  }, [uids]);

  if (!currentGroup || currentMembership?.role !== 'admin') {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Admins only</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const when =
      item.createdAt?.toDate && typeof item.createdAt.toDate === 'function'
        ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })
        : '';

    // Robust note preview (handles empty string + noteText vs note)
    const noteText =
      nonEmpty(item.noteText) ||
      nonEmpty(item.note) ||
      null;

    const notePreview = noteText ? (noteText.length > 80 ? `${noteText.slice(0, 80)}…` : noteText) : '(no note)';

    // Robust names (handles "" stored in Firestore)
    const reviewerName = nonEmpty(item.reviewerName);
    const targetName = nonEmpty(item.targetName);

    const reviewer =
      resolveDisplayName({
        displayName:
          memberMap[item.reviewerUid]?.displayName ||
          profileMap[item.reviewerUid]?.displayName,
        firstName:
          memberMap[item.reviewerUid]?.firstName ||
          profileMap[item.reviewerUid]?.firstName,
        lastName:
          memberMap[item.reviewerUid]?.lastName ||
          profileMap[item.reviewerUid]?.lastName,
        fallbackUid: item.reviewerUid,
      }) || reviewerName || (item.reviewerUid ? shortUid(item.reviewerUid) : '');

    const target =
      resolveDisplayName({
        displayName:
          memberMap[item.targetUid]?.displayName ||
          profileMap[item.targetUid]?.displayName,
        firstName:
          memberMap[item.targetUid]?.firstName ||
          profileMap[item.targetUid]?.firstName,
        lastName:
          memberMap[item.targetUid]?.lastName ||
          profileMap[item.targetUid]?.lastName,
        fallbackUid: item.targetUid,
      }) || targetName || (item.targetUid ? shortUid(item.targetUid) : '');

    return (
      <Card
        style={styles.card}
        onPress={() => {
          // IMPORTANT: pass the whole note object so detail always has access to noteText immediately.
          navigation.navigate('AdminReviewNoteDetail', { note: item } as any);
        }}
      >
        <Card.Title
          title={`${reviewer} → ${target}`}
          titleNumberOfLines={1}
          subtitle={`${outcomeLabel(item.outcome)} • ${when}`}
          subtitleNumberOfLines={1}
          titleStyle={styles.titleText}
        />
        <Card.Content>
          <Text variant="bodySmall" numberOfLines={2} style={styles.noteText}>
            {notePreview}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        Review Notes
      </Text>

      <ToggleButton.Row
        onValueChange={(value) => setOnlyNotes(value === 'notes')}
        value={onlyNotes ? 'notes' : 'all'}
      >
        <ToggleButton icon="format-list-bulleted" value="all" />
        <ToggleButton icon="note-text" value="notes" />
      </ToggleButton.Row>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.muted}>No review notes yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700' },
  card: { marginTop: 8 },
  titleText: { flexShrink: 1 },
  noteText: { flexShrink: 1 },
  muted: { color: '#6b7280', marginTop: 12 },
});

export default AdminReviewNotesListScreen;
