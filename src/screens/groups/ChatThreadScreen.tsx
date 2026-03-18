import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { listenMessages, sendMessage, finishThread } from '../../services/threads';
import type { Message } from '../../models/chat';
import { getFirebaseDb } from '../../services/firebase';
import {
  arrayRemove,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { applyTrustFromReview } from '../../services/trust';
import { RADIUS, SPACING } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'ChatThread'>;

type ReviewOutcome = 'returned_same' | 'minor_damage' | 'major_damage' | '';

const makeName = (m: any) => `${m?.firstName ?? ''} ${m?.lastName ?? ''}`.trim();

const ChatThreadScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { threadId } = route.params;
  const { currentGroup } = useGroupContext();
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [threadOpen, setThreadOpen] = useState(true);
  const [participants, setParticipants] = useState<{ borrowerUid: string; lenderUid: string } | null>(null);
  const [needsReviewBy, setNeedsReviewBy] = useState<string[]>([]);

  // Review modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome>('');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [finishPending, setFinishPending] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const isParticipant = useMemo(() => {
    if (!uid || !participants) return false;
    return uid === participants.borrowerUid || uid === participants.lenderUid;
  }, [uid, participants]);

  const isBorrower = useMemo(() => uid === participants?.borrowerUid, [uid, participants]);
  const isLender = useMemo(() => uid === participants?.lenderUid, [uid, participants]);

  const reviewCopy = useMemo(() => {
    if (isLender) {
      return {
        title: 'Was the item returned in the same condition?',
        same: 'Yes, same condition',
        minor: 'Minor damage',
        major: 'Major damage',
      };
    }
    return {
      title: 'Was the item as described and easy to borrow/return?',
      same: 'Yes',
      minor: 'Minor issue',
      major: 'Major issue',
    };
  }, [isLender]);

  const targetUid = useMemo(() => {
    if (!uid || !participants) return '';
    return uid === participants.borrowerUid ? participants.lenderUid : participants.borrowerUid;
  }, [uid, participants]);

  const shouldPromptReview = useMemo(() => {
    return !!uid && !threadOpen && needsReviewBy.includes(uid);
  }, [uid, threadOpen, needsReviewBy]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: currentGroup?.name ? `${currentGroup.name} chat` : 'Chat' });
  }, [currentGroup?.name, navigation]);

  useEffect(() => {
    if (!currentGroup) { setError('No active group.'); setLoading(false); return; }
    const db = getFirebaseDb();
    if (!db) { setError('Firestore not configured.'); setLoading(false); return; }

    setLoading(true);
    setError(null);

    const threadRef = doc(db, `groups/${currentGroup.id}/threads/${threadId}`);
    const unsubThread = onSnapshot(threadRef, (snap) => {
      if (!mountedRef.current) return;
      if (!snap.exists()) { setError('Thread not found.'); setLoading(false); return; }
      const data: any = snap.data();
      setParticipants({ borrowerUid: data.borrowerUid, lenderUid: data.lenderUid });
      setThreadOpen(data.isOpen !== false);
      setNeedsReviewBy(Array.isArray(data.needsReviewBy) ? data.needsReviewBy : []);
      setLoading(false);
    }, (err) => {
      if (!mountedRef.current) return;
      setError(err.message);
      setLoading(false);
    });

    const unsubMessages = listenMessages(currentGroup.id, threadId, setMessages);
    return () => { unsubThread(); unsubMessages(); };
  }, [currentGroup?.id, threadId]);

  const handleSend = async () => {
    if (!text.trim() || !currentGroup || !uid) return;
    try {
      await sendMessage(currentGroup.id, threadId, { senderUid: uid, text: text.trim() });
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  };

  const resetReviewForm = () => { setReviewError(null); setReviewOutcome(''); setReviewNote(''); };

  const goToChatsList = () => {
    const tab = navigation.getParent()?.getParent?.() ?? navigation.getParent();
    if (tab) { tab.navigate('ChatsTab' as never); } else { navigation.goBack(); }
  };

  const goToFeed = () => {
    const tab = navigation.getParent()?.getParent?.() ?? navigation.getParent();
    if (tab) { tab.navigate('FeedTab' as never); } else { navigation.goBack(); }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="alert-circle-outline"
          style={styles.headerIcon}
          contentStyle={styles.headerIconContent}
          iconColor={theme.colors.onSurface}
          onPress={() =>
            navigation.navigate('ReportCreate', {
              type: 'thread',
              threadId,
              targetUid,
              targetName: '',
              snippet: messages.slice(-1)[0]?.text ?? '',
            })
          }
        />
      ),
    });
  }, [navigation, threadId, targetUid, messages, theme.colors.onSurface]);

  const handleFinish = () => {
    if (!currentGroup || !participants || !isParticipant) return;
    Alert.alert(
      'Confirm item returned',
      'Only finish once the item is back and the transaction is complete. This will close the chat and start the review.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, item returned',
          style: 'default',
          onPress: () => { setFinishPending(true); resetReviewForm(); setReviewOpen(true); },
        },
      ]
    );
  };

  const handleLeaveReview = () => { setFinishPending(false); resetReviewForm(); setReviewOpen(true); };
  const handleReviewCancel = () => { setReviewOpen(false); setFinishPending(false); };

  const handleReviewSubmit = async () => {
    if (!currentGroup || !uid || !participants || !targetUid) return;
    if (!reviewOutcome) { setReviewError('Please select an option.'); return; }

    setReviewError(null);
    setReviewSubmitting(true);

    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Firestore not configured.');

      const threadRef = doc(db, `groups/${currentGroup.id}/threads/${threadId}`);
      const noteText = reviewNote?.trim() || null;

      await setDoc(
        doc(db, `groups/${currentGroup.id}/threads/${threadId}/reviews/${uid}`),
        {
          reviewerUid: uid, targetUid, outcome: reviewOutcome, note: noteText,
          createdAt: serverTimestamp(),
          reviewerRole: isLender ? 'lender' : isBorrower ? 'borrower' : 'unknown',
        },
        { merge: true }
      );

      let reviewerName = 'Unknown member';
      let targetName = 'Unknown member';
      try {
        const reviewerSnap = await getDoc(doc(db, `groups/${currentGroup.id}/members/${uid}`));
        if (reviewerSnap.exists()) reviewerName = makeName(reviewerSnap.data()) || 'Unknown member';
      } catch {}
      try {
        const targetSnap = await getDoc(doc(db, `groups/${currentGroup.id}/members/${targetUid}`));
        if (targetSnap.exists()) targetName = makeName(targetSnap.data()) || 'Unknown member';
      } catch {}

      const mirrorId = `${threadId}_${uid}`;
      await setDoc(
        doc(db, `groups/${currentGroup.id}/adminReviewNotes/${mirrorId}`),
        {
          createdAt: serverTimestamp(), groupId: currentGroup.id, threadId,
          reviewerUid: uid, reviewerName, reviewerRole: isLender ? 'lender' : 'borrower',
          targetUid, targetName, outcome: reviewOutcome, noteText,
        },
        { merge: true }
      );

      try {
        const reviewerRole = isLender ? 'lender' : 'borrower';
        await applyTrustFromReview(currentGroup.id, targetUid, reviewOutcome as any, reviewerRole, {
          reviewerUid: uid, threadId, postId: '', acceptedOfferId: '', noteText: reviewNote ?? '',
        });
      } catch (trustErr) {
        setReviewError(trustErr instanceof Error ? trustErr.message : 'Failed to update trust.');
        setReviewSubmitting(false);
        return;
      }

      if (finishPending) {
        await finishThread(currentGroup.id, threadId, participants.borrowerUid, participants.lenderUid);
      }

      await updateDoc(threadRef, { needsReviewBy: arrayRemove(uid), lastUpdatedAt: serverTimestamp() });

      setReviewOpen(false);
      setFinishPending(false);

      Alert.alert('Review submitted', 'Thanks for your feedback.', [
        { text: 'Back to Feed', onPress: goToFeed },
        { text: 'Back to Chats', onPress: goToChatsList },
      ]);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background, padding: 16 }]}>
        <Text style={{ color: '#1C1C1E' }}>{error}</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!isParticipant) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background, padding: 16 }]}>
        <Text style={{ color: '#1C1C1E' }}>Not allowed to view this chat.</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={64}
    >
      {/* ─── Review Modal ─── */}
      <Modal
        visible={reviewOpen}
        transparent
        animationType="fade"
        onRequestClose={handleReviewCancel}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleReviewCancel}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{reviewCopy.title}</Text>

            {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}

            {(['returned_same', 'minor_damage', 'major_damage'] as const).map((key) => {
              const labels = { returned_same: reviewCopy.same, minor_damage: reviewCopy.minor, major_damage: reviewCopy.major };
              const icons = { returned_same: 'check-circle', minor_damage: 'alert-circle', major_damage: 'close-circle' } as const;
              const colors = { returned_same: '#34C759', minor_damage: '#FF9500', major_damage: '#FF3B30' };
              const selected = reviewOutcome === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setReviewOutcome(key)}
                  style={[
                    styles.reviewOption,
                    {
                      backgroundColor: selected ? `${colors[key]}15` : 'transparent',
                      borderColor: selected ? colors[key] : theme.colors.outline,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name={icons[key]} size={20} color={selected ? colors[key] : '#8E8E93'} />
                  <Text style={[styles.reviewOptionText, { color: selected ? colors[key] : '#1C1C1E' }]}>
                    {labels[key]}
                  </Text>
                </Pressable>
              );
            })}

            <RNTextInput
              placeholder="Add a note (optional)"
              placeholderTextColor="#9ca3af"
              multiline
              value={reviewNote}
              onChangeText={setReviewNote}
              style={[styles.reviewNoteInput, { borderColor: theme.colors.outline, color: '#1C1C1E' }]}
            />

            <View style={styles.reviewActionRow}>
              <Pressable onPress={handleReviewCancel} disabled={reviewSubmitting} style={styles.cancelBtn}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#8E8E93' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleReviewSubmit}
                disabled={!reviewOutcome || reviewSubmitting}
                style={[
                  styles.submitBtn,
                  { backgroundColor: !reviewOutcome || reviewSubmitting ? '#C7C7CC' : theme.colors.primary },
                ]}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                  {reviewSubmitting ? 'Submitting...' : 'Submit'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Messages ─── */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const mine = item.senderUid === uid;
          return (
            <View style={[styles.msgRow, mine ? styles.msgRowEnd : styles.msgRowStart]}>
              <View
                style={[
                  styles.bubble,
                  mine
                    ? [styles.bubbleMine, { backgroundColor: theme.colors.primary }]
                    : [styles.bubbleOther, { backgroundColor: theme.colors.surface }],
                ]}
              >
                <Text style={{ fontSize: 15, lineHeight: 21, color: mine ? '#fff' : '#1C1C1E' }}>
                  {item.text}
                </Text>
                <Text
                  style={[
                    styles.timestamp,
                    { color: mine ? 'rgba(255,255,255,0.65)' : '#8E8E93' },
                  ]}
                >
                  {item.createdAt && (item.createdAt as any).toDate
                    ? new Date((item.createdAt as any).toDate()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* ─── Closed State ─── */}
      {!threadOpen ? (
        <View style={[styles.closedBanner, { backgroundColor: theme.colors.surface }]}>
          {shouldPromptReview ? (
            <>
              <MaterialCommunityIcons name="star-outline" size={20} color={theme.colors.primary} />
              <Text style={{ flex: 1, color: '#1C1C1E', fontSize: 14 }}>
                This chat is closed — please leave a review.
              </Text>
              <Pressable
                onPress={handleLeaveReview}
                style={[styles.reviewNowBtn, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Review</Text>
              </Pressable>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#34C759" />
              <Text style={{ flex: 1, color: '#8E8E93', fontSize: 14 }}>This chat is closed.</Text>
            </>
          )}
        </View>
      ) : null}

      {/* ─── Input ─── */}
      {threadOpen ? (
        <View style={[styles.footer, { borderTopColor: theme.colors.outline }]}>
          <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface }]}>
            <RNTextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#8E8E93"
              editable={!reviewOpen}
              multiline
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || reviewOpen}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: !text.trim() ? '#C7C7CC' : theme.colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      {/* ─── Finish ─── */}
      {threadOpen ? (
        <View style={styles.finishSection}>
          <Pressable
            onPress={handleFinish}
            disabled={reviewOpen}
            style={({ pressed }) => [
              styles.finishBtn,
              { backgroundColor: theme.colors.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="check-all" size={18} color={theme.colors.primary} />
            <Text style={[styles.finishBtnText, { color: theme.colors.primary }]}>
              Item returned — finish
            </Text>
          </Pressable>
          <Text style={styles.finishHint}>Only tap after the item has been returned</Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Messages */
  list: { padding: SPACING.md, gap: 6 },
  msgRow: { flexDirection: 'row' },
  msgRowEnd: { justifyContent: 'flex-end' },
  msgRowStart: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    color: '#1C1C1E',
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
  },

  /* Closed */
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  reviewNowBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },

  /* Finish */
  finishSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: 4,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    width: '100%',
  },
  finishBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  finishHint: {
    fontSize: 11,
    color: '#8E8E93',
  },

  /* Review Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 4,
  },
  reviewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  reviewOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  reviewNoteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 44,
    marginTop: 4,
  },
  reviewActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  errorText: { color: '#FF3B30', fontSize: 13, textAlign: 'center' },

  headerIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerIconContent: {
    alignItems: 'center', justifyContent: 'center',
  },
});

export default ChatThreadScreen;
