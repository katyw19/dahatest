import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_GRADES } from '../../utils/grades';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gradeTag: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const ProfileSetupScreen = () => {
  const { profile, saveProfile } = useProfile();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      gradeTag: profile?.gradeTag ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setError(null);
    try {
      await saveProfile({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        gradeTag: values.gradeTag ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Complete your profile
      </Text>
      {error ? (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Controller
        control={control}
        name="firstName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="First name"
            mode="outlined"
            onBlur={onBlur}
            value={value}
            onChangeText={onChange}
            error={!!errors.firstName}
          />
        )}
      />
      {errors.firstName?.message ? (
        <HelperText type="error">{errors.firstName.message}</HelperText>
      ) : null}
      <Controller
        control={control}
        name="lastName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Last name"
            mode="outlined"
            onBlur={onBlur}
            value={value}
            onChangeText={onChange}
            error={!!errors.lastName}
          />
        )}
      />
      {errors.lastName?.message ? (
        <HelperText type="error">{errors.lastName.message}</HelperText>
      ) : null}
      <View style={styles.section}>
        <Text variant="titleSmall">Grade (optional)</Text>
        <View style={styles.chips}>
          {DEFAULT_GRADES.map((grade) => (
            <Button
              key={grade}
              mode={watch('gradeTag') === grade ? 'contained' : 'outlined'}
              onPress={() => setValue('gradeTag', grade)}
              compact
            >
              {grade}
            </Button>
          ))}
        </View>
      </View>
      <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} disabled={isSubmitting}>
        Save
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  error: {
    color: '#b91c1c',
  },
});

export default ProfileSetupScreen;
