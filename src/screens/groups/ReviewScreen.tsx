import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, RadioButton, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useAuth } from '../../context/AuthContext';
import { useGroupContext } from './GroupProvider';
import { getThread } from '../../services/threads';
import { getFirebaseDb } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { submitReview } from '../../services/threads';

type Props = NativeStackScreenProps<GroupStackParamList, 'Review'>;

const ReviewScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { currentGroup } = useGroupContext();
  const { threadId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [outcome, setOutcome] = useState<'returned_same' | 'minor_damage' | 'major_damage' | ''>(
    ''
  );
  const [note, setNote] = useState('');
  const [targetUid, setTargetUid] = useState<string | null>(null);
  const [targetTrust, setTargetTrust] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!currentGroup || !user) {
        setError('Not signed in or no group.');
        setLoading(false);
        return;
      }
      const db = getFirebaseDb();
      if (!db) {
        setError('Firestore not configured.');
        setLoading(false);
        return;
      }
      setError(null);
      try {
        const thread = await getThread(currentGroup.id, threadId);
        if (!thread) {
          setError('Thread not found.');
          setLoading(false);
          return;
        }
        if (user.uid !== thread.borrowerUid && user.uid !== thread.lenderUid) {
          setError('Not allowed to review this transaction.');
          setLoading(false);
          return;
        }
        const other = user.uid === thread.borrowerUid ? thread.lenderUid : thread.borrowerUid;
        setTargetUid(other);
        const memberSnap = await getDoc(doc(db, `groups/${currentGroup.id}/members/${other}`));
        if (memberSnap.exists()) {
          const data = memberSnap.data() as any;
          if (data.trustScore != null) setTargetTrust(Number(data.trustScore));
        }

        const reviewSnap = await getDoc(
          doc(db, `groups/${currentGroup.id}/threads/${threadId}/reviews/${user.uid}`)
        );
        if (reviewSnap.exists()) {
          setAlreadyReviewed(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load review.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentGroup?.id, threadId, user?.uid]);

  const handleSubmit = async () => {
    if (!currentGroup || !user || !targetUid) return;
    if (!outcome) {
      setError('Please select an option.');
      return;
    }
    setError(null);
    try {
      await submitReview(currentGroup.id, threadId, user.uid, outcome, note);
      let newTrust: number | null = null;
      const db = getFirebaseDb();
      if (db && targetUid) {
        const snap = await getDoc(doc(db, `groups/${currentGroup.id}/members/${targetUid}`));
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data.trustScore != null) {
            newTrust = Number(data.trustScore);
            setTargetTrust(newTrust);
          }
        }
      }
      console.log('[Review] submitted review');
      Alert.alert(
        'Thanks!',
        newTrust != null
          ? `Review submitted. Updated trust score: ${newTrust}`
          : 'Review submitted.',
        [{ text: 'OK', onPress: () => navigation.getParent()?.getParent?.()?.navigate('FeedTab') }]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Loading...</Text>
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

  if (alreadyReviewed) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background, padding: 16 }]}>
        <Text>Thanks — review already submitted.</Text>
        <Button onPress={() => navigation.getParent()?.getParent?.()?.navigate('FeedTab')}>Back to feed</Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Was the item returned in the same condition?
      </Text>
      {targetTrust != null ? (
        <Text variant="bodySmall">Current trust score: {targetTrust}</Text>
      ) : null}
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}
      <RadioButton.Group
        onValueChange={(v) => setOutcome(v as any)}
        value={outcome}
      >
        <RadioButton.Item label="Yes, same condition" value="returned_same" />
        <RadioButton.Item label="Minor damage" value="minor_damage" />
        <RadioButton.Item label="Major damage" value="major_damage" />
      </RadioButton.Group>
      <TextInput
        label="Optional note"
        mode="outlined"
        multiline
        value={note}
        onChangeText={setNote}
      />
      <Button mode="contained" onPress={handleSubmit} disabled={!outcome}>
        Submit review
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReviewScreen;
