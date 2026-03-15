import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Dialog,
  IconButton,
  Portal,
  Text,
  TextInput as PaperTextInput,
  useTheme,
} from 'react-native-paper';
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
  const [participants, setParticipants] = useState<{ borrowerUid: string; lenderUid: string } | null>(
    null
  );
  const [needsReviewBy, setNeedsReviewBy] = useState<string[]>([]);

  // Review modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome>('');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // If true, we’re the one who pressed “Finish transaction”.
  // IMPORTANT: we still do NOT close the thread until after review submit.
  const [finishPending, setFinishPending] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isParticipant = useMemo(() => {
    if (!uid || !participants) return false;
    return uid === participants.borrowerUid || uid === participants.lenderUid;
  }, [uid, participants]);

  const isBorrower = useMemo(() => {
    if (!uid || !participants) return false;
    return uid === participants.borrowerUid;
  }, [uid, participants]);

  const isLender = useMemo(() => {
    if (!uid || !participants) return false;
    return uid === participants.lenderUid;
  }, [uid, participants]);

  // ✅ ROLE-BASED COPY
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
    if (!currentGroup) {
      setError('No active group.');
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setError('Firestore not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const threadRef = doc(db, `groups/${currentGroup.id}/threads/${threadId}`);
    const unsubThread = onSnapshot(
      threadRef,
      (snap) => {
        if (!mountedRef.current) return;

        if (!snap.exists()) {
          setError('Thread not found.');
          setLoading(false);
          return;
        }

        const data: any = snap.data();
        setParticipants({
          borrowerUid: data.borrowerUid,
          lenderUid: data.lenderUid,
        });
        setThreadOpen(data.isOpen !== false);
        setNeedsReviewBy(Array.isArray(data.needsReviewBy) ? data.needsReviewBy : []);
        setLoading(false);
      },
      (err) => {
        if (!mountedRef.current) return;
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubMessages = listenMessages(currentGroup.id, threadId, setMessages);

    return () => {
      unsubThread();
      unsubMessages();
    };
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

  const resetReviewForm = () => {
    setReviewError(null);
    setReviewOutcome('');
    setReviewNote('');
  };

  // Nav helpers — walk up to the tab navigator
  const goToChatsList = () => {
    const tab = navigation.getParent()?.getParent?.() ?? navigation.getParent();
    if (tab) {
      tab.navigate('ChatsTab' as never);
    } else {
      navigation.goBack();
    }
  };

  const goToFeed = () => {
    const tab = navigation.getParent()?.getParent?.() ?? navigation.getParent();
    if (tab) {
      tab.navigate('FeedTab' as never);
    } else {
      navigation.goBack();
    }
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
              targetName: '', // optional: can be filled later, not needed for Phase 11
              snippet: messages.slice(-1)[0]?.text ?? '',
            })
          }
        />
      ),
    });
  }, [navigation, threadId, targetUid, messages, theme.colors.onSurface]);

  // ✅ SAFE finish flow
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
          onPress: () => {
            setFinishPending(true);
            resetReviewForm();
            setReviewOpen(true);
          },
        },
      ]
    );
  };

  const handleLeaveReview = () => {
    setFinishPending(false);
    resetReviewForm();
    setReviewOpen(true);
  };

  const handleReviewCancel = () => {
    setReviewOpen(false);
    setFinishPending(false);
  };

  const handleReviewSubmit = async () => {
    if (!currentGroup || !uid || !participants || !targetUid) return;

    if (!reviewOutcome) {
      setReviewError('Please select an option.');
      return;
    }

    setReviewError(null);
    setReviewSubmitting(true);

    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Firestore not configured.');

      const threadRef = doc(db, `groups/${currentGroup.id}/threads/${threadId}`);

      // 1) Write review doc (per-user)
      const noteText = reviewNote?.trim() || null;

      await setDoc(
        doc(db, `groups/${currentGroup.id}/threads/${threadId}/reviews/${uid}`),
        {
          reviewerUid: uid,
          targetUid,
          outcome: reviewOutcome,
          note: noteText,
          createdAt: serverTimestamp(),
          reviewerRole: isLender ? 'lender' : isBorrower ? 'borrower' : 'unknown',
        },
        { merge: true }
      );

      // 1.25) ✅ Mirror to adminReviewNotes WITH REAL NAMES
      // Fetch member docs so admin UI can display names instead of UIDs.
      let reviewerName = 'Unknown member';
      let targetName = 'Unknown member';

      try {
        const reviewerSnap = await getDoc(
          doc(db, `groups/${currentGroup.id}/members/${uid}`)
        );
        if (reviewerSnap.exists()) {
          reviewerName = makeName(reviewerSnap.data()) || 'Unknown member';
        }
      } catch {}

      try {
        const targetSnap = await getDoc(
          doc(db, `groups/${currentGroup.id}/members/${targetUid}`)
        );
        if (targetSnap.exists()) {
          targetName = makeName(targetSnap.data()) || 'Unknown member';
        }
      } catch {}

      const mirrorId = `${threadId}_${uid}`;
      await setDoc(
        doc(db, `groups/${currentGroup.id}/adminReviewNotes/${mirrorId}`),
        {
          createdAt: serverTimestamp(),
          groupId: currentGroup.id,
          threadId,
          reviewerUid: uid,
          reviewerName,
          reviewerRole: isLender ? 'lender' : 'borrower',
          targetUid,
          targetName,
          outcome: reviewOutcome,
          noteText: noteText, // IMPORTANT: this is what your admin screens read
        },
        { merge: true }
      );

      // 1.5) ✅ Update TARGET trust score
      try {
        const reviewerRole = isLender ? 'lender' : 'borrower';
        await applyTrustFromReview(currentGroup.id, targetUid, reviewOutcome as any, reviewerRole, {
          reviewerUid: uid,
          threadId,
          postId: '',
          acceptedOfferId: '',
          noteText: reviewNote ?? '',
        });
      } catch (trustErr) {
        setReviewError(trustErr instanceof Error ? trustErr.message : 'Failed to update trust.');
        setReviewSubmitting(false);
        return;
      }

      // 2) Close thread if we are the closer
      if (finishPending) {
        await finishThread(
          currentGroup.id,
          threadId,
          participants.borrowerUid,
          participants.lenderUid
        );
      }

      // 3) Remove myself from needsReviewBy
      await updateDoc(threadRef, {
        needsReviewBy: arrayRemove(uid),
        lastUpdatedAt: serverTimestamp(),
      });

      // 4) Close modal
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
        <Text>{error}</Text>
        <Button onPress={() => navigation.goBack()}>Back</Button>
      </View>
    );
  }

  if (!isParticipant) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background, padding: 16 }]}>
        <Text>Not allowed to view this chat.</Text>
        <Button onPress={() => navigation.goBack()}>Back</Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={64}
    >
      {/* REVIEW MODAL */}
      <Portal>
        <Dialog visible={reviewOpen} dismissable={false} style={styles.reviewDialog}>
          <View style={styles.reviewBody}>
            <Text style={styles.reviewTitle}>{reviewCopy.title}</Text>

            {reviewError ? <Text style={styles.error}>{reviewError}</Text> : null}

            <Pressable
              onPress={() => setReviewOutcome('returned_same')}
              style={[
                styles.reviewOption,
                {
                  backgroundColor: reviewOutcome === 'returned_same' ? theme.colors.primary : 'transparent',
                  borderColor: reviewOutcome === 'returned_same' ? theme.colors.primary : theme.colors.outlineVariant ?? '#ddd',
                },
              ]}
            >
              <Text style={[
                styles.reviewOptionText,
                { color: reviewOutcome === 'returned_same' ? theme.colors.onPrimary : theme.colors.onSurface },
              ]}>
                {reviewCopy.same}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setReviewOutcome('minor_damage')}
              style={[
                styles.reviewOption,
                {
                  backgroundColor: reviewOutcome === 'minor_damage' ? theme.colors.primary : 'transparent',
                  borderColor: reviewOutcome === 'minor_damage' ? theme.colors.primary : theme.colors.outlineVariant ?? '#ddd',
                },
              ]}
            >
              <Text style={[
                styles.reviewOptionText,
                { color: reviewOutcome === 'minor_damage' ? theme.colors.onPrimary : theme.colors.onSurface },
              ]}>
                {reviewCopy.minor}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setReviewOutcome('major_damage')}
              style={[
                styles.reviewOption,
                {
                  backgroundColor: reviewOutcome === 'major_damage' ? theme.colors.primary : 'transparent',
                  borderColor: reviewOutcome === 'major_damage' ? theme.colors.primary : theme.colors.outlineVariant ?? '#ddd',
                },
              ]}
            >
              <Text style={[
                styles.reviewOptionText,
                { color: reviewOutcome === 'major_damage' ? theme.colors.onPrimary : theme.colors.onSurface },
              ]}>
                {reviewCopy.major}
              </Text>
            </Pressable>

            <RNTextInput
              placeholder="Add a note (optional)"
              placeholderTextColor="#9ca3af"
              multiline
              value={reviewNote}
              onChangeText={setReviewNote}
              style={[styles.reviewNoteInput, { borderColor: theme.colors.outlineVariant ?? '#ddd', color: theme.colors.onSurface }]}
            />

            <View style={styles.reviewActionRow}>
              <Pressable onPress={handleReviewCancel} disabled={reviewSubmitting} style={styles.reviewCancelBtn}>
                <Text style={[styles.reviewCancelText, { color: theme.colors.outline }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleReviewSubmit}
                disabled={!reviewOutcome || reviewSubmitting}
                style={[
                  styles.reviewSubmitBtn,
                  { backgroundColor: !reviewOutcome || reviewSubmitting ? '#ccc' : theme.colors.primary },
                ]}
              >
                <Text style={[styles.reviewSubmitText, { color: theme.colors.onPrimary }]}>
                  {reviewSubmitting ? 'Submitting...' : 'Submit'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Dialog>
      </Portal>

      {/* MESSAGES */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const mine = item.senderUid === uid;
          return (
            <View style={[styles.row, mine ? styles.rowEnd : styles.rowStart]}>
              <Card
                style={[
                  styles.bubble,
                  { backgroundColor: mine ? theme.colors.primary : theme.colors.surface },
                ]}
              >
                <Card.Content style={styles.bubbleContent}>
                  <Text style={{ color: mine ? theme.colors.onPrimary : theme.colors.onSurface }}>
                    {item.text}
                  </Text>
                  <Text
                    style={[
                      styles.timestamp,
                      { color: mine ? theme.colors.onPrimary : theme.colors.onSurface },
                    ]}
                  >
                    {item.createdAt && (item.createdAt as any).toDate
                      ? new Date((item.createdAt as any).toDate()).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </Text>
                </Card.Content>
              </Card>
            </View>
          );
        }}
      />

      {/* CLOSED STATE + REVIEW PROMPT */}
      {!threadOpen ? (
        <View style={[styles.closedBanner, { backgroundColor: theme.colors.secondary }]}>
          {shouldPromptReview ? (
            <>
              <Text style={{ marginBottom: 6 }}>This chat is closed — please leave a review.</Text>
              <Button mode="contained" onPress={handleLeaveReview}>
                Leave review
              </Button>
            </>
          ) : (
            <Text>This chat is closed.</Text>
          )}
        </View>
      ) : null}

      {/* INPUT */}
      <View style={styles.footer}>
        <RNTextInput
          style={[
            styles.input,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
          ]}
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          editable={threadOpen && !reviewOpen}
        />
        <Button
          mode="contained"
          onPress={handleSend}
          disabled={!text.trim() || !threadOpen || reviewOpen}
        >
          Send
        </Button>
      </View>

      {/* FINISH */}
      {threadOpen ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
          <Text variant="bodySmall" style={styles.helperText}>
            Only tap this after the item has been returned and everything is done.
          </Text>
          <Button
            mode="contained-tonal"
            onPress={handleFinish}
            style={styles.finishBtn}
            disabled={reviewOpen}
          >
            Item returned — finish
          </Button>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.lg, gap: SPACING.sm },
  row: { flexDirection: 'row' },
  rowEnd: { justifyContent: 'flex-end' },
  rowStart: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: RADIUS.md },
  bubbleContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  timestamp: { fontSize: 10, marginTop: 4, opacity: 0.7 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  finishBtn: { marginHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  helperText: { color: '#6b7280' },
  closedBanner: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    margin: SPACING.lg,
  },
  optionBtn: { marginTop: SPACING.sm },
  reviewDialog: {
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 0,
  },
  reviewBody: {
    padding: 24,
    gap: 12,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  reviewOption: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
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
  reviewCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  reviewCancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  reviewSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  reviewSubmitText: {
    fontSize: 15,
    fontWeight: '600',
  },
  error: { color: '#b91c1c', marginBottom: 4, textAlign: 'center', fontSize: 13 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatThreadScreen;
