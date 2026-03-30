import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGroupContext } from './GroupProvider';
import { useAuth } from '../../context/AuthContext';
import { createOffer } from '../../services/offers';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useProfile } from '../../context/ProfileContext';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'OfferCreate'>;

const schema = z.object({
  itemDescription: z.string().min(1, 'Description is required'),
  condition: z.enum(['new', 'gently_used', 'visibly_used']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const OfferCreateScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const goToFeed = () => {
    // OfferCreate lives inside the FeedTab stack, so we need to pop
    // back to the root (GroupFeed) rather than navigate to FeedTab
    navigation.popToTop();
  };

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemDescription: '',
      condition: 'gently_used',
      notes: '',
    },
  });

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.length) {
      setPhotoUri(res.assets[0].uri);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!currentGroup || !currentMembership || !user) {
      setError('You must be in a group to send an offer.');
      return;
    }
    setError(null);
    try {
      await createOffer(currentGroup.id, route.params.postId, {
        lenderUid: user.uid,
        lenderFirstName: currentMembership.firstName || profile?.firstName || 'Member',
        lenderLastName: currentMembership.lastName || profile?.lastName || '',
        lenderGradeTag: currentMembership.gradeTag || profile?.gradeTag || 'Unknown',
        lenderTrustScore: currentMembership.trustScore ?? 0,
        itemDescription: values.itemDescription.trim(),
        condition: values.condition,
        notes: values.notes?.trim(),
        photoUri,
      });
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send offer.');
    }
  };

  const conditionVal = watch('condition');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* ── Success Modal ── */}
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
            {/* Check icon */}
            <View style={[styles.successIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
              <MaterialCommunityIcons name="check-circle" size={48} color={theme.colors.primary} />
            </View>

            <Text style={styles.modalTitle}>Offer Sent</Text>
            <Text style={styles.modalBody}>
              Your offer has been sent successfully. The borrower will be notified and can accept it from their request.
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

      {/* ── Form ── */}
      <Text style={styles.title}>Send an Offer</Text>
      <Text style={styles.subtitle}>Describe what you're offering to lend</Text>

      {error ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.fieldLabel}>Item Description</Text>
        <Controller
          control={control}
          name="itemDescription"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              mode="outlined"
              placeholder="e.g. Blue TI-84 calculator"
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
              error={!!errors.itemDescription}
              outlineColor={`${theme.colors.outline}40`}
              activeOutlineColor={theme.colors.primary}
              style={styles.input}
            />
          )}
        />
        {errors.itemDescription?.message ? (
          <HelperText type="error" style={{ paddingHorizontal: 0 }}>
            {errors.itemDescription.message}
          </HelperText>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.fieldLabel}>Condition</Text>
        <View style={styles.conditionRow}>
          {(['new', 'gently_used', 'visibly_used'] as const).map((opt) => {
            const selected = opt === conditionVal;
            return (
              <Pressable
                key={opt}
                onPress={() => setValue('condition', opt)}
                style={[
                  styles.conditionChip,
                  {
                    backgroundColor: selected ? theme.colors.primary : 'transparent',
                    borderColor: selected ? theme.colors.primary : `${theme.colors.outline}50`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.conditionChipText,
                    { color: selected ? '#fff' : '#1C1C1E' },
                  ]}
                >
                  {{ new: 'New', gently_used: 'Gently Used', visibly_used: 'Visibly Used' }[opt]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.fieldLabel}>Notes (optional)</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              mode="outlined"
              placeholder="Any extra details..."
              multiline
              numberOfLines={3}
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
              outlineColor={`${theme.colors.outline}40`}
              activeOutlineColor={theme.colors.primary}
              style={[styles.input, { minHeight: 80 }]}
            />
          )}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.fieldLabel}>Photo (optional)</Text>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.image} />
        ) : null}
        <Pressable
          onPress={pickImage}
          style={({ pressed }) => [
            styles.photoButton,
            {
              borderColor: `${theme.colors.primary}40`,
              backgroundColor: pressed ? `${theme.colors.primary}08` : 'transparent',
            },
          ]}
        >
          <MaterialCommunityIcons
            name={photoUri ? 'image-edit' : 'camera-plus-outline'}
            size={20}
            color={theme.colors.primary}
          />
          <Text style={[styles.photoButtonText, { color: theme.colors.primary }]}>
            {photoUri ? 'Change Photo' : 'Add Photo'}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.submitButton,
          {
            backgroundColor: isSubmitting
              ? `${theme.colors.primary}80`
              : pressed
                ? `${theme.colors.primary}DD`
                : theme.colors.primary,
          },
        ]}
      >
        {isSubmitting ? (
          <Text style={styles.submitText}>Sending...</Text>
        ) : (
          <>
            <MaterialCommunityIcons name="send" size={18} color="#fff" />
            <Text style={styles.submitText}>Send Offer</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.sm,
    paddingBottom: 40,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    flex: 1,
  },

  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 15,
  },

  conditionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  conditionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  conditionChipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: RADIUS.md,
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    marginTop: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Success modal */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    borderRadius: RADIUS.xl,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  modalBody: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OfferCreateScreen;
