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
import { createPost } from '../../services/posts';
import { getPostAudienceOptions } from '../../utils/grades';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import { useProfile } from '../../context/ProfileContext';
import { resolveDisplayName } from '../../utils/displayName';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'CreateDonation'>;

const schema = z.object({
  text: z.string().min(1, 'Description is required'),
  audienceTag: z.string().min(1, 'Select who can request this'),
  condition: z.enum(['new', 'like_new', 'used']),
  category: z.string().optional(),
  size: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const CreateDonationScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    setError: setFormError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      text: '',
      audienceTag: '',
      condition: 'like_new',
      category: '',
      size: '',
    },
  });
  const watchedAudienceTag = watch('audienceTag');
  const watchedText = watch('text');
  const conditionVal = watch('condition');

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.length) {
      setPhotoUri(res.assets[0].uri);
    }
  };

  const goToFeed = () => {
    navigation.popToTop();
  };

  const onSubmit = async (values: FormValues) => {
    if (!currentGroup || !currentMembership || !user) {
      setError('You must be in a group to post.');
      return;
    }
    if (!values.audienceTag) {
      setFormError('audienceTag', { type: 'manual', message: 'Please choose who can request this.' });
      return;
    }
    setError(null);
    try {
      const authorDisplayName = resolveDisplayName({
        displayName: (currentMembership as any)?.displayName || profile?.displayName,
        firstName: currentMembership.firstName || profile?.firstName,
        lastName: currentMembership.lastName || profile?.lastName,
        fallbackUid: user.uid,
      });
      await createPost(currentGroup.id, {
        authorUid: user.uid,
        authorDisplayName,
        authorFirstName: currentMembership.firstName || profile?.firstName || 'Member',
        authorLastName: currentMembership.lastName || profile?.lastName || '',
        authorGradeTag: currentMembership.gradeTag || profile?.gradeTag || 'Unknown',
        authorRole: currentMembership.role,
        type: 'dawa',
        text: values.text.trim(),
        audienceTag: values.audienceTag,
        condition: values.condition,
        category: values.category?.trim(),
        size: values.size?.trim(),
        photoUri,
      });
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create donation.');
    }
  };

  const audienceOptions = getPostAudienceOptions(currentGroup?.gradeTags);

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
            <Text style={styles.modalTitle}>Donation Posted</Text>
            <Text style={styles.modalBody}>
              Your donation has been posted. Others can now request it.
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
      <Text style={styles.title}>New Donation</Text>
      <Text style={styles.subtitle}>Share something you'd like to give away</Text>

      {error ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.fieldLabel}>What are you giving away?</Text>
        <Controller
          control={control}
          name="text"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              mode="outlined"
              placeholder="e.g. Graphing calculator, winter jacket..."
              multiline
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
              error={!!errors.text}
              outlineColor={`${theme.colors.outline}40`}
              activeOutlineColor={theme.colors.primary}
              style={styles.input}
            />
          )}
        />
        {errors.text?.message ? (
          <HelperText type="error" style={{ paddingHorizontal: 0 }}>{errors.text.message}</HelperText>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.fieldLabel}>Condition</Text>
        <View style={styles.conditionRow}>
          {(['new', 'like_new', 'used'] as const).map((opt) => {
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
                  {opt === 'like_new' ? 'Like New' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.fieldLabel}>Who can request this?</Text>
        <Controller
          control={control}
          name="audienceTag"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chips}>
              {audienceOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => onChange(option)}
                  style={[
                    styles.audienceChip,
                    {
                      backgroundColor: value === option ? theme.colors.primary : 'transparent',
                      borderColor: value === option ? theme.colors.primary : `${theme.colors.outline}50`,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: value === option ? '#fff' : '#1C1C1E',
                    }}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />
        {errors.audienceTag?.message ? (
          <HelperText type="error" style={{ paddingHorizontal: 0 }}>{errors.audienceTag.message}</HelperText>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.fieldLabel}>Category (optional)</Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              mode="outlined"
              placeholder="clothes, school, tech, other"
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
              outlineColor={`${theme.colors.outline}40`}
              activeOutlineColor={theme.colors.primary}
              style={styles.input}
            />
          )}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.fieldLabel}>Size (optional)</Text>
        <Controller
          control={control}
          name="size"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              mode="outlined"
              placeholder="e.g. Medium, 8.5, etc."
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
              outlineColor={`${theme.colors.outline}40`}
              activeOutlineColor={theme.colors.primary}
              style={styles.input}
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
        disabled={isSubmitting || !watchedAudienceTag || !watchedText?.trim()}
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
          <Text style={styles.submitText}>Posting...</Text>
        ) : (
          <>
            <MaterialCommunityIcons name="gift-outline" size={18} color="#fff" />
            <Text style={styles.submitText}>Post Donation</Text>
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
  conditionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  conditionChip: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
    borderWidth: 1.5, alignItems: 'center',
  },
  conditionChipText: { fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  audienceChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5,
  },
  photoButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed',
  },
  photoButtonText: { fontSize: 14, fontWeight: '600' },
  image: { width: '100%', height: 200, borderRadius: RADIUS.md },
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

export default CreateDonationScreen;
