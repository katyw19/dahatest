import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';
import { TextInput as RNTextInput, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ChangePasswordScreen = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChange = async () => {
    setError(null);
    if (!user || !user.email) {
      setError('You must be signed in with email to change password.');
      return;
    }
    if (!currentPw.trim()) {
      setError('Enter your current password.');
      return;
    }
    if (newPw.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      Alert.alert('Success', 'Your password has been updated.');
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setError('Current password is incorrect.');
      } else if (err?.code === 'auth/requires-recent-login') {
        setError('Please sign out and sign back in, then try again.');
      } else {
        setError(err?.message || 'Failed to update password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen noTopPadding>
      <View style={styles.form}>
        <Text style={[styles.label, { color: '#1C1C1E' }]}>Current Password</Text>
        <View style={[styles.inputWrap, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}>
          <RNTextInput
            style={[styles.input, { color: '#1C1C1E' }]}
            value={currentPw}
            onChangeText={setCurrentPw}
            secureTextEntry={!showCurrent}
            placeholder="Enter current password"
            placeholderTextColor="#C7C7CC"
            autoCapitalize="none"
          />
          <Pressable onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
            <MaterialCommunityIcons
              name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#8E8E93"
            />
          </Pressable>
        </View>

        <Text style={[styles.label, { color: '#1C1C1E' }]}>New Password</Text>
        <View style={[styles.inputWrap, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}>
          <RNTextInput
            style={[styles.input, { color: '#1C1C1E' }]}
            value={newPw}
            onChangeText={setNewPw}
            secureTextEntry={!showNew}
            placeholder="At least 6 characters"
            placeholderTextColor="#C7C7CC"
            autoCapitalize="none"
          />
          <Pressable onPress={() => setShowNew(!showNew)} hitSlop={8}>
            <MaterialCommunityIcons
              name={showNew ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#8E8E93"
            />
          </Pressable>
        </View>

        <Text style={[styles.label, { color: '#1C1C1E' }]}>Confirm New Password</Text>
        <View style={[styles.inputWrap, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}>
          <RNTextInput
            style={[styles.input, { color: '#1C1C1E' }]}
            value={confirmPw}
            onChangeText={setConfirmPw}
            secureTextEntry={!showNew}
            placeholder="Re-enter new password"
            placeholderTextColor="#C7C7CC"
            autoCapitalize="none"
          />
        </View>

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        {success ? (
          <Text style={styles.success}>Password updated successfully!</Text>
        ) : null}

        <Pressable
          onPress={handleChange}
          disabled={loading}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.colors.primary, opacity: loading || pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            {loading ? 'Updating…' : 'Update Password'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: SPACING.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  error: {
    color: '#FF3B30',
    fontSize: 13,
  },
  success: {
    color: '#34C759',
    fontSize: 13,
  },
  button: {
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChangePasswordScreen;
