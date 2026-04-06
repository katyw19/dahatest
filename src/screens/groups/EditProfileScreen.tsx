import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useAuth } from '../../context/AuthContext';
import { useGroupContext } from './GroupProvider';
import { getFirebaseDb, getFirebaseStorage } from '../../services/firebase';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'EditProfile'>;

const EditProfileScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { currentGroup } = useGroupContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayNameOverride, setDisplayNameOverride] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const derivedDisplayName = useMemo(() => {
    return `${firstName.trim()} ${lastName.trim()}`.trim();
  }, [firstName, lastName]);

  const displayNameToSave = useMemo(() => {
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
        setPronouns(String(data.pronouns ?? ''));
        setBio(String(data.bio ?? ''));
        setPhotoURL(data.photoURL ?? null);

        const existingDisplayName = String(data.displayName ?? '');
        const existingFirst = String(data.firstName ?? '');
        const existingLast = String(data.lastName ?? '');
        const existingDerived = `${existingFirst.trim()} ${existingLast.trim()}`.trim();
        if (existingDisplayName && existingDisplayName !== existingDerived) {
          setDisplayNameOverride(existingDisplayName);
        } else {
          setDisplayNameOverride('');
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const handlePickPhoto = async () => {
    if (!user) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return;
    const uri = res.assets[0].uri;
    try {
      setUploading(true);
      const storage = getFirebaseStorage();
      const db = getFirebaseDb();
      if (!storage || !db) throw new Error('Firebase not configured.');
      const sRef = storageRef(storage, `users/${user.uid}/profile.jpg`);
      const blob = await (await fetch(uri)).blob();
      await uploadBytes(sRef, blob);
      const url = await getDownloadURL(sRef);
      await setDoc(
        doc(db, 'users', user.uid),
        { photoURL: url, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setPhotoURL(url);
    } catch (err) {
      console.warn(err);
      setError('Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!user) return;
    const first = firstName.trim();
    const last = lastName.trim();
    const displayName = displayNameToSave.trim();
    const pron = pronouns.trim();
    const bioText = bio.trim();

    if (!first || !last) {
      setError('First and last name are required.');
      return;
    }
    if (!displayName) {
      setError('Display name is required.');
      return;
    }
    if (!currentGroup?.id) {
      setError('No active group selected.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Firestore not configured.');

      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          firstName: first,
          lastName: last,
          displayName,
          pronouns: pron.length ? pron : null,
          bio: bioText.length ? bioText : null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

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
    <Screen noTopPadding>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {error ? <HelperText type="error">{error}</HelperText> : null}

        {/* Profile photo */}
        <View style={styles.photoSection}>
          <Pressable
            onPress={handlePickPhoto}
            style={[styles.photoWrap, { borderColor: theme.colors.outline }]}
          >
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.photo} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: theme.colors.secondary }]}>
                <MaterialCommunityIcons name="camera-plus-outline" size={32} color={theme.colors.primary} />
              </View>
            )}
            {uploading ? (
              <View style={styles.photoOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={handlePickPhoto}>
            <Text style={[styles.changePhotoText, { color: theme.colors.primary }]}>
              {photoURL ? 'Change photo' : 'Add photo'}
            </Text>
          </Pressable>
        </View>

        {/* Fields */}
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
          Display name defaults to "{derivedDisplayName || 'First Last'}". Override below if you want.
        </HelperText>

        <TextInput
          label="Display name (optional override)"
          mode="outlined"
          value={displayNameOverride}
          onChangeText={setDisplayNameOverride}
        />

        <TextInput
          label="Pronouns (optional)"
          mode="outlined"
          value={pronouns}
          onChangeText={setPronouns}
          placeholder="e.g. she/her, he/him, they/them"
        />

        <TextInput
          label="Bio"
          mode="outlined"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          placeholder="Tell people a little about yourself..."
          maxLength={200}
        />
        <HelperText type="info">{bio.length}/200</HelperText>

        {/* Actions */}
        <View style={styles.actions}>
          <Button mode="outlined" onPress={() => navigation.goBack()} disabled={saving} style={styles.actionBtn}>
            Cancel
          </Button>
          <Button mode="contained" onPress={onSave} loading={saving} disabled={saving} style={styles.actionBtn}>
            Save
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.md, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  photoWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
  },
});

export default EditProfileScreen;
