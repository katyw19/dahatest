import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text, ToggleButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import Screen from '../../components/Screen';
import { SPACING } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminReviewNotesList'>;

const nonEmpty = (v: unknown) => {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t.length ? t : '';
};

const outcomeIcon = (outcome?: string): string => {
  switch (outcome) {
    case 'returned_same':
      return 'check-circle-outline';
    case 'minor_damage':
      return 'alert-circle-outline';
    case 'major_damage':
      return 'close-circle-outline';
    default:
      return 'help-circle-outline';
  }
};

const outcomeColor = (outcome?: string): string => {
  switch (outcome) {
    case 'returned_same':
      return '#34C759';
    case 'minor_damage':
      return '#FF9500';
    case 'major_damage':
      return '#FF3B30';
    default:
      return '#8E8E93';
  }
};

const outcomeLabel = (outcome?: string) => {
  switch (outcome) {
    case 'returned_same':
      return 'Returned same';
    case 'minor_damage':
      return 'Minor damage';
    case 'major_damage':
      return 'Major damage';
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

    const noteText = nonEmpty(item.noteText) || nonEmpty(item.note) || null;
    const notePreview = noteText
      ? noteText.length > 80 ? `${noteText.slice(0, 80)}…` : noteText
      : null;

    const reviewer = resolveDisplayName({
      displayName: memberMap[item.reviewerUid]?.displayName || profileMap[item.reviewerUid]?.displayName,
      firstName: memberMap[item.reviewerUid]?.firstName || profileMap[item.reviewerUid]?.firstName,
      lastName: memberMap[item.reviewerUid]?.lastName || profileMap[item.reviewerUid]?.lastName,
      fallbackUid: item.reviewerUid,
    });

    const target = resolveDisplayName({
      displayName: memberMap[item.targetUid]?.displayName || profileMap[item.targetUid]?.displayName,
      firstName: memberMap[item.targetUid]?.firstName || profileMap[item.targetUid]?.firstName,
      lastName: memberMap[item.targetUid]?.lastName || profileMap[item.targetUid]?.lastName,
      fallbackUid: item.targetUid,
    });

    const oColor = outcomeColor(item.outcome);

    return (
      <Pressable
        onPress={() => navigation.navigate('AdminReviewNoteDetail', { note: item } as any)}
        style={({ pressed }) => [
          styles.row,
          { borderBottomColor: theme.colors.outline },
          pressed && { backgroundColor: `${theme.colors.primary}08` },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${oColor}18` }]}>
          <MaterialCommunityIcons name={outcomeIcon(item.outcome) as any} size={20} color={oColor} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.names, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {reviewer} <Text style={styles.arrow}>→</Text> {target}
          </Text>

          <View style={styles.metaRow}>
            <Text style={[styles.outcome, { color: oColor }]}>{outcomeLabel(item.outcome)}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.time}>{when}</Text>
          </View>

          {notePreview ? (
            <Text style={[styles.note, { color: theme.colors.onSurface }]} numberOfLines={2}>
              {notePreview}
            </Text>
          ) : null}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
      </Pressable>
    );
  };

  return (
    <Screen noTopPadding>
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
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="note-outline" size={40} color="#C7C7CC" />
            <Text style={styles.emptyText}>No review notes yet.</Text>
          </View>
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: SPACING.xl, paddingTop: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  names: {
    fontSize: 15,
    fontWeight: '600',
  },
  arrow: {
    fontWeight: '400',
    color: '#8E8E93',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  outcome: {
    fontSize: 13,
    fontWeight: '500',
  },
  dot: {
    color: '#8E8E93',
    fontSize: 13,
  },
  time: {
    color: '#8E8E93',
    fontSize: 13,
  },
  note: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 15,
  },
});

export default AdminReviewNotesListScreen;
