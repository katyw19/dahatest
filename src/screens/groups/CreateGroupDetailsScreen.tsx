import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text, TextInput, useTheme } from 'react-native-paper';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { createGroup, setActiveGroupId } from '../../services/groups';
import { DEFAULT_GRADES } from '../../utils/grades';
import { useProfile } from '../../context/ProfileContext';

const schema = z.object({
  name: z.string().min(1, 'Group name is required'),
  description: z.string().optional(),
  rules: z.string().optional(),
  gradeTags: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof schema>;

const CreateGroupDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      rules: '',
      gradeTags: [],
    },
  });

  const selectedGrades = watch('gradeTags') ?? [];

  const toggleGrade = (grade: string) => {
    const current = new Set(selectedGrades);
    if (current.has(grade)) {
      current.delete(grade);
    } else {
      current.add(grade);
    }
    setValue('gradeTags', Array.from(current));
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      setError('Please sign in before creating a group.');
      return;
    }
    setError(null);
    try {
      const group = await createGroup({
        name: values.name.trim(),
        description: values.description?.trim() ?? '',
        rules: values.rules?.trim() ?? '',
        gradeTags: values.gradeTags ?? [],
        createdByUid: user.uid,
        creatorFirstName: profile?.firstName ?? '',
        creatorLastName: profile?.lastName ?? '',
        creatorGradeTag: profile?.gradeTag ?? '',
      });
      await setActiveGroupId(group.id);
      const routeNames = (navigation.getState?.().routeNames as string[]) ?? [];
      if (routeNames.includes('InvitePeople')) {
        navigation.navigate('InvitePeople', { groupId: group.id });
      } else {
        navigation.navigate('Tabs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group.');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} variant="headlineSmall">
        Create a group
      </Text>
      {error ? (
        <Text style={styles.error} variant="bodySmall">
          {error}
        </Text>
      ) : null}
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Group name"
              mode="outlined"
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
              error={!!errors.name}
            />
          )}
        />
        {errors.name?.message ? (
          <Text style={styles.error} variant="bodySmall">
            {errors.name.message}
          </Text>
        ) : null}

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Description (optional)"
              mode="outlined"
              multiline
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="rules"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Rules / expectations (optional)"
              mode="outlined"
              multiline
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <View style={styles.section}>
          <Text variant="titleMedium">Grade tags (optional)</Text>
          <Text variant="bodySmall" style={styles.helperText}>
            Optional: Which grades at your school/group will use DAHA? (Used for
            post audience tags later.)
          </Text>
          <View style={styles.chips}>
            {DEFAULT_GRADES.map((grade) => (
              <Chip
                key={grade}
                selected={selectedGrades.includes(grade)}
                onPress={() => toggleGrade(grade)}
                compact
              >
                {grade}
              </Chip>
            ))}
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || !watch('name')}
          loading={isSubmitting}
        >
          Create Group
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  form: {
    gap: 12,
  },
  title: {
    fontWeight: '700',
  },
  section: {
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperText: {
    color: '#6b7280',
  },
  error: {
    color: '#b91c1c',
  },
});

export default CreateGroupDetailsScreen;
