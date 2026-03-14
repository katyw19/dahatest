import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useAuth } from '../../context/AuthContext';
import { useGroupContext } from './GroupProvider';
import { getFirebaseDb } from '../../services/firebase';

type Props = NativeStackScreenProps<GroupStackParamList, 'EditProfile'>;

const EditProfileScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { currentGroup } = useGroupContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // We store first/last separately so posts/chats can show it consistently.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Optional: allow a custom display name override, but by default we derive from first/last.
  const [displayNameOverride, setDisplayNameOverride] = useState('');

  const [pronouns, setPronouns] = useState('');
  const [error, setError] = useState<string | null>(null);

  const derivedDisplayName = useMemo(() => {
    const full = `${firstName.trim()} ${lastName.trim()}`.trim();
    return full;
  }, [firstName, lastName]);

  const displayNameToSave = useMemo(() => {
    // If the user typed an override, use it. Otherwise use derived.
    const override = displayNameOverride.trim();
    return override.length ? override : derivedDisplayName;
  }, [displayNameOverride, derivedDisplayName]);

  useEffect(() => {
    if (!user) return;

    const db = getFirebaseDb();
    if (!db) {
      setError('Firestore not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data: any = snap.exists() ? snap.data() : {};

        setFirstName(String(data.firstName ?? ''));
        setLastName(String(data.lastName ?? ''));

        // If older data only had displayName, try to keep it as override
        // (so you don’t accidentally wipe a custom name).
        const existingDisplayName = String(data.displayName ?? '');
        const existingFirst = String(data.firstName ?? '');
        const existingLast = String(data.lastName ?? '');
        const existingDerived = `${existingFirst.trim()} ${existingLast.trim()}`.trim();

        if (existingDisplayName && existingDisplayName !== existingDerived) {
          setDisplayNameOverride(existingDisplayName);
        } else {
          setDisplayNameOverride('');
        }

        setPronouns(String(data.pronouns ?? ''));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const onSave = async () => {
    if (!user) return;

    const first = firstName.trim();
    const last = lastName.trim();
    const displayName = displayNameToSave.trim();
    const pron = pronouns.trim();

    if (!first || !last) {
      setError('First and last name are required.');
      return;
    }
    if (!displayName) {
      setError('Display name is required.');
      return;
    }
    if (!currentGroup?.id) {
      setError('No active group selected. Switch to a group, then try again.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Firestore not configured.');

      // 1) Global profile
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          firstName: first,
          lastName: last,
          displayName,
          pronouns: pron.length ? pron : null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 2) Group membership mirror (THIS is what most group UIs should use)
      await setDoc(
        doc(db, `groups/${currentGroup.id}/members/${user.uid}`),
        {
          uid: user.uid,
          firstName: first,
          lastName: last,
          displayName,
          pronouns: pron.length ? pron : null,
          lastUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Edit profile
      </Text>

      {error ? <HelperText type="error">{error}</HelperText> : null}

      <TextInput
        label="First name"
        mode="outlined"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
      />

      <TextInput
        label="Last name"
        mode="outlined"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
      />

      <HelperText type="info">
        Display name will default to "{derivedDisplayName || 'First Last'}".
        You can override it below.
      </HelperText>

      <TextInput
        label="Display name override (optional)"
        mode="outlined"
        value={displayNameOverride}
        onChangeText={setDisplayNameOverride}
      />

      <TextInput
        label="Pronouns (optional)"
        mode="outlined"
        value={pronouns}
        onChangeText={setPronouns}
      />

      <View style={styles.actions}>
        <Button mode="outlined" onPress={() => navigation.goBack()} disabled={saving}>
          Cancel
        </Button>
        <Button mode="contained" onPress={onSave} loading={saving} disabled={saving}>
          Save
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default EditProfileScreen;
