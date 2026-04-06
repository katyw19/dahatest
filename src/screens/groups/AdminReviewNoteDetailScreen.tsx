import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Membership } from '../../models/membership';
import { getFirebaseDb } from '../../services/firebase';
import { listenUserProfiles } from '../../services/userProfiles';
import { resolveDisplayName } from '../../utils/displayName';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminReviewNoteDetail'>;

const nonEmpty = (v: unknown) => {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t.length ? t : '';
};

const outcomeConfig = (outcome?: string) => {
  switch (outcome) {
    case 'returned_same':
      return { label: 'Returned Same', icon: 'check-circle' as const, color: '#34C759' };
    case 'minor_damage':
      return { label: 'Minor Issue', icon: 'alert-circle' as const, color: '#FF9500' };
    case 'major_damage':
      return { label: 'Major Issue', icon: 'close-circle' as const, color: '#FF3B30' };
    default:
      return { label: outcome ?? 'Unknown', icon: 'help-circle' as const, color: '#8E8E93' };
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

  if (!note) {
    return (
      <Screen noTopPadding>
        <View style={styles.center}>
          <Text style={{ color: '#8E8E93', fontSize: 15 }}>No note found.</Text>
          <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Go Back</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const noteText = nonEmpty(note.noteText) || nonEmpty(note.note) || null;
  const oc = outcomeConfig(note.outcome);

  const reviewerLabel = resolveDisplayName({
    displayName: memberMap[note.reviewerUid]?.displayName || profileMap[note.reviewerUid]?.displayName,
    firstName: memberMap[note.reviewerUid]?.firstName || profileMap[note.reviewerUid]?.firstName,
    lastName: memberMap[note.reviewerUid]?.lastName || profileMap[note.reviewerUid]?.lastName,
    fallbackUid: note.reviewerUid,
  });

  const targetLabel = resolveDisplayName({
    displayName: memberMap[note.targetUid]?.displayName || profileMap[note.targetUid]?.displayName,
    firstName: memberMap[note.targetUid]?.firstName || profileMap[note.targetUid]?.firstName,
    lastName: memberMap[note.targetUid]?.lastName || profileMap[note.targetUid]?.lastName,
    fallbackUid: note.targetUid,
  });

  return (
    <Screen noTopPadding>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Outcome Header ─── */}
        <View style={[styles.outcomeCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.outcomeIconCircle, { backgroundColor: `${oc.color}18` }]}>
            <MaterialCommunityIcons name={oc.icon} size={32} color={oc.color} />
          </View>
          <View style={[styles.outcomeChip, { backgroundColor: `${oc.color}18` }]}>
            <Text style={[styles.outcomeChipText, { color: oc.color }]}>{oc.label}</Text>
          </View>
        </View>

        {/* ─── People Card ─── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={styles.cardLabel}>People</Text>

          <View style={styles.personRow}>
            <View style={[styles.personIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
              <MaterialCommunityIcons name="account-edit" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personRole}>Reviewer</Text>
              <Text style={[styles.personName, { color: '#1C1C1E' }]}>{reviewerLabel}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

          <View style={styles.personRow}>
            <View style={[styles.personIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
              <MaterialCommunityIcons name="account" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personRole}>Target</Text>
              <Text style={[styles.personName, { color: '#1C1C1E' }]}>{targetLabel}</Text>
            </View>
          </View>
        </View>

        {/* ─── Note Card ─── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={styles.cardLabel}>Note</Text>
          <Text style={[styles.noteText, { color: noteText ? '#1C1C1E' : '#8E8E93' }]}>
            {noteText ?? 'No note was provided.'}
          </Text>
        </View>

        {/* ─── Open Thread ─── */}
        {note.threadId ? (
          <Pressable
            onPress={() => navigation.navigate('ChatThread', { threadId: note.threadId })}
            style={({ pressed }) => [
              styles.threadBtn,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="message-text-outline" size={18} color="#fff" />
            <Text style={styles.threadBtnText}>Open Thread</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40, gap: SPACING.sm },

  /* Outcome header */
  outcomeCard: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: RADIUS.lg,
    gap: 12,
  },
  outcomeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  outcomeChipText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* Cards */
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 10,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  /* People */
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  personIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personRole: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },

  /* Note */
  noteText: {
    fontSize: 15,
    lineHeight: 22,
  },

  /* Thread button */
  threadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  threadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AdminReviewNoteDetailScreen;
