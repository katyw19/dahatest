import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { createOffer } from '../../services/offers';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useProfile } from '../../context/ProfileContext';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'BidCreate'>;

const BidCreateScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const goToFeed = () => {
    navigation.popToTop();
  };

  const onSubmit = async () => {
    if (!currentGroup || !currentMembership || !user) {
      setError('You must be in a group.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createOffer(currentGroup.id, route.params.postId, {
        lenderUid: user.uid,
        lenderFirstName: currentMembership.firstName || profile?.firstName || 'Member',
        lenderLastName: currentMembership.lastName || profile?.lastName || '',
        lenderGradeTag: currentMembership.gradeTag || profile?.gradeTag || 'Unknown',
        lenderTrustScore: currentMembership.trustScore ?? 0,
        notes: notes.trim() || undefined,
      });
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Success Modal */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccess(false);
          goToFeed();
        }}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.successIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
              <MaterialCommunityIcons name="check-circle" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Request Sent</Text>
            <Text style={styles.modalBody}>
              The donor will be notified. If they choose you, a chat will open up.
            </Text>
            <Pressable
              onPress={() => {
                setShowSuccess(false);
                goToFeed();
              }}
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: pressed ? `${theme.colors.primary}DD` : theme.colors.primary },
              ]}
            >
              <Text style={styles.modalButtonText}>Back to Feed</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Form */}
      <Text style={styles.title}>Request This Item</Text>
      <Text style={styles.subtitle}>Let the donor know you're interested</Text>

      {error ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.fieldLabel}>Why do you want this? (optional)</Text>
        <TextInput
          mode="outlined"
          placeholder="Add a note to the donor..."
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          outlineColor={`${theme.colors.outline}40`}
          activeOutlineColor={theme.colors.primary}
          style={[styles.input, { minHeight: 100 }]}
        />
        <Text style={styles.charCount}>{notes.length}/300</Text>
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        style={({ pressed }) => [
          styles.submitButton,
          {
            backgroundColor: submitting
              ? `${theme.colors.primary}80`
              : pressed
                ? `${theme.colors.primary}DD`
                : theme.colors.primary,
          },
        ]}
      >
        {submitting ? (
          <Text style={styles.submitText}>Submitting...</Text>
        ) : (
          <>
            <MaterialCommunityIcons name="hand-wave-outline" size={18} color="#fff" />
            <Text style={styles.submitText}>I Want This</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#8E8E93', marginBottom: 4 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },
  card: { borderRadius: RADIUS.lg, padding: SPACING.md, gap: 8 },
  fieldLabel: {
    fontSize: 13, fontWeight: '600', color: '#8E8E93',
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  input: { backgroundColor: 'transparent', fontSize: 15 },
  charCount: { fontSize: 12, color: '#C7C7CC', textAlign: 'right' },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: RADIUS.lg, marginTop: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalCard: {
    width: '100%', borderRadius: RADIUS.xl, padding: 28, alignItems: 'center', gap: 12,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#1C1C1E' },
  modalBody: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  modalButton: { width: '100%', paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default BidCreateScreen;
