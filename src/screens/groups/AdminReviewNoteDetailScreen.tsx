import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Membership } from '../../models/membership';
import { getFirebaseDb } from '../../services/firebase';
import { listenUserProfiles } from '../../services/userProfiles';
import { resolveDisplayName } from '../../utils/displayName';

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminReviewNoteDetail'>;

const shortUid = (uid?: string) => {
  if (!uid) return '';
  return uid.length <= 8 ? uid : `${uid.slice(0, 6)}…`;
};

const nonEmpty = (v: unknown) => {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t.length ? t : '';
};

const prettyOutcome = (outcome?: string) => {
  switch (outcome) {
    case 'returned_same':
      return 'Yes / Returned same';
    case 'minor_damage':
      return 'Minor issue';
    case 'major_damage':
      return 'Major issue';
    default:
      return outcome ?? '';
  }
};

const AdminReviewNoteDetailScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { note } = route.params as any;
  const [memberMap, setMemberMap] = useState<Record<string, Membership>>({});
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!note?.groupId) return;
    const db = getFirebaseDb();
    if (!db) return;
    const ref = collection(db, `groups/${note.groupId}/members`);
    const unsub = onSnapshot(ref, (snap) => {
      const next: Record<string, Membership> = {};
      snap.docs.forEach((d) => {
        next[d.id] = d.data() as Membership;
      });
      setMemberMap(next);
    });
    return () => unsub();
  }, [note?.groupId]);

  useEffect(() => {
    const uids = [note?.reviewerUid, note?.targetUid].filter(Boolean);
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
  }, [note?.reviewerUid, note?.targetUid]);

  // If route param is missing entirely
  if (!note) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>No note found.</Text>
        <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          Back
        </Button>
      </View>
    );
  }

  // Robust note text resolution (handles noteText vs note, trims, empty strings)
  const noteText =
    nonEmpty(note.noteText) ||
    nonEmpty(note.note) ||
    null;

  const reviewerLabel = resolveDisplayName({
    displayName:
      memberMap[note.reviewerUid]?.displayName ||
      profileMap[note.reviewerUid]?.displayName,
    firstName:
      memberMap[note.reviewerUid]?.firstName ||
      profileMap[note.reviewerUid]?.firstName,
    lastName:
      memberMap[note.reviewerUid]?.lastName ||
      profileMap[note.reviewerUid]?.lastName,
    fallbackUid: note.reviewerUid,
  });

  const targetLabel = resolveDisplayName({
    displayName:
      memberMap[note.targetUid]?.displayName ||
      profileMap[note.targetUid]?.displayName,
    firstName:
      memberMap[note.targetUid]?.firstName ||
      profileMap[note.targetUid]?.firstName,
    lastName:
      memberMap[note.targetUid]?.lastName ||
      profileMap[note.targetUid]?.lastName,
    fallbackUid: note.targetUid,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card mode="outlined">
        <Card.Title
          title={`${reviewerLabel} → ${targetLabel}`}
          subtitle={prettyOutcome(note.outcome)}
        />
        <Card.Content>
          <Text variant="bodyMedium">{noteText ?? '(no note)'}</Text>

          {note.threadId ? (
            <Button
              mode="text"
              style={{ marginTop: 8 }}
              onPress={() => navigation.navigate('ChatThread', { threadId: note.threadId })}
            >
              Open Thread
            </Button>
          ) : null}
        </Card.Content>
      </Card>

      <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
        Back
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default AdminReviewNoteDetailScreen;
