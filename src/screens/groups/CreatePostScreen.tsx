import { useState } from 'react';
import { ScrollView, StyleSheet, View, Image } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
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

type Props = NativeStackScreenProps<GroupStackParamList, 'CreatePost'>;

const schema = z.object({
  text: z.string().min(1, 'Description is required'),
  audienceTag: z.string().min(1, 'Select who you want offers from'),
  category: z.string().optional(),
  size: z.string().optional(),
  neededBy: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const CreatePostScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { currentGroup, currentMembership } = useGroupContext();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError: setFormError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      text: '',
      audienceTag: '',
      category: '',
      size: '',
      neededBy: '',
    },
  });
  const watchedAudienceTag = watch('audienceTag');
  const watchedText = watch('text');

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
      setError('You must be in a group to post.');
      return;
    }
    if (!values.audienceTag) {
      setFormError('audienceTag', { type: 'manual', message: 'Please choose who this request is for.' });
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
        text: values.text.trim(),
        audienceTag: values.audienceTag,
        category: values.category?.trim(),
        size: values.size?.trim(),
        neededBy: values.neededBy?.trim(),
        photoUri,
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post.');
    } finally {
      // ensure loading stops
    }
  };

  const audienceOptions = getPostAudienceOptions(currentGroup?.gradeTags);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="headlineSmall" style={styles.title}>
        New Request
      </Text>
      {error ? (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Controller
          control={control}
          name="text"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="What do you need to borrow?"
              mode="outlined"
              multiline
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
              error={!!errors.text}
            />
          )}
        />
        {errors.text?.message ? (
          <HelperText type="error">{errors.text.message}</HelperText>
        ) : null}

        <Controller
          control={control}
          name="audienceTag"
          render={({ field: { onChange, value } }) => (
            <View style={styles.section}>
              <Text variant="titleSmall">Who do you want offers from?</Text>
              <View style={styles.chips}>
                {audienceOptions.map((option) => (
                  <Button
                    key={option}
                    mode={value === option ? 'contained' : 'outlined'}
                    onPress={() => onChange(option)}
                    compact
                    style={styles.chipButton}
                  >
                    {option}
                  </Button>
                ))}
              </View>
            </View>
          )}
        />
        {errors.audienceTag?.message ? (
          <HelperText type="error">{errors.audienceTag.message}</HelperText>
        ) : null}

        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Category (clothes, school, tech, other)"
              mode="outlined"
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="size"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Size (optional)"
              mode="outlined"
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="neededBy"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Needed by (date or note)"
              mode="outlined"
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <View style={styles.section}>
          <Text variant="titleSmall">Photo (optional)</Text>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.imagePreview} />
          ) : null}
          <Button mode="outlined" onPress={pickImage}>
            {photoUri ? 'Change photo' : 'Add photo'}
          </Button>
        </View>
      </View>

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting || !watchedAudienceTag || !watchedText?.trim()}
        loading={isSubmitting}
      >
        Post Request
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  title: {
    fontWeight: '700',
  },
  card: {
    padding: SPACING.lg,
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  section: {
    gap: SPACING.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chipButton: {
    borderRadius: 999,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
  },
  error: {
    color: '#b91c1c',
  },
});

export default CreatePostScreen;
