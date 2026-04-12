import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { doc, getDoc } from 'firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// Works from both AppNavigator and GroupShellNavigator
import { getFirebaseDb } from '../../services/firebase';
import type { Group } from '../../models/group';
import { getPostAudienceOptions } from '../../utils/grades';
import {
  getMyJoinRequestStatus,
  requestToJoin,
} from '../../services/groups';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<any, 'GroupPreviewRequestAccess'>;

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gradeTag: z.string().min(1, 'Select your grade'),
});

type FormValues = z.infer<typeof schema>;

const GroupPreviewRequestAccessScreen = ({ route, navigation }: Props) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { groupId } = route.params;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', gradeTag: '' },
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const db = getFirebaseDb();
      if (!db) {
        setError('Firestore not configured. Check env vars.');
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, 'groups', groupId));
      if (!snap.exists()) {
        setError('Group not found.');
        setLoading(false);
        return;
      }
      const data = { ...(snap.data() as Group), id: snap.id } as Group;
      setGroup(data);
      if (user) {
        const status = await getMyJoinRequestStatus(groupId, user.uid);
        if (status) {
          setRequestStatus(status.status);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, user?.uid]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !group) {
      setError('Sign in before requesting to join.');
      return;
    }
    setError(null);
    try {
      await requestToJoin(groupId, {
        requesterUid: user.uid,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        gradeTag: values.gradeTag,
        groupName: group.name,
        inviteCode: group.inviteCode,
      });
      Alert.alert(
        'Request Sent!',
        'Your request to join has been submitted. An admin will review it shortly.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>{error ?? 'Group not found.'}</Text>
      </View>
    );
  }

  const gradeOptions = getPostAudienceOptions(group.gradeTags);
  const disableRequest = requestStatus === 'pending';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        {group.name}
      </Text>
      {group.description ? (
        <Text variant="bodyMedium" style={styles.text}>
          {group.description}
        </Text>
      ) : null}
      {group.rules ? (
        <Text variant="bodyMedium" style={styles.text}>
          Rules: {group.rules}
        </Text>
      ) : null}
      <Text variant="bodySmall" style={styles.subtle}>
        This group is private. Admins must approve join requests.
      </Text>
      {requestStatus ? (
        <Text variant="bodyMedium" style={styles.banner}>
          You already requested to join. Status: {requestStatus}
        </Text>
      ) : null}
      {error ? (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.form}>
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
        <Controller
          control={control}
          name="gradeTag"
          render={({ field: { onChange, value } }) => (
            <View style={styles.select}>
              <Text variant="titleSmall">Your grade (visible to group members)</Text>
              <View style={styles.gradeOptions}>
                {gradeOptions.map((option) => (
                  <Button
                    key={option}
                    mode={value === option ? 'contained' : 'outlined'}
                    onPress={() => onChange(option)}
                    compact
                  >
                    {option}
                  </Button>
                ))}
              </View>
            </View>
          )}
        />
        {errors.gradeTag?.message ? (
          <HelperText type="error">{errors.gradeTag.message}</HelperText>
        ) : null}
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || disableRequest}
          loading={isSubmitting}
        >
          Request to Join
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  text: {
    color: '#111827',
  },
  subtle: {
    color: '#6b7280',
  },
  banner: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
    color: '#92400e',
  },
  form: {
    gap: 12,
  },
  select: {
    gap: 8,
  },
  gradeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  error: {
    color: '#b91c1c',
  },
});

export default GroupPreviewRequestAccessScreen;
