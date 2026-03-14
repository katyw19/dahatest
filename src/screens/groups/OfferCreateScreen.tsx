import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
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
import { Dialog, Portal } from 'react-native-paper';

type Props = NativeStackScreenProps<GroupStackParamList, 'OfferCreate'>;

const schema = z.object({
  itemDescription: z.string().min(1, 'Description is required'),
  condition: z.enum(['new', 'good', 'used']),
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
    const nav: any = navigation;
    const p1 = nav.getParent?.();
    const p2 = p1?.getParent?.();
    (p2 ?? p1 ?? nav).navigate('FeedTab');
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
      condition: 'good',
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Portal>
        <Dialog visible={showSuccess} onDismiss={() => setShowSuccess(false)}>
          <Dialog.Title>Offer sent!</Dialog.Title>
          <Dialog.Content>
            <Text>Your offer was sent successfully.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowSuccess(false);
                navigation.navigate('PostDetail', { postId: route.params.postId, offeredSuccess: true });
              }}
            >
              Back to request
            </Button>
            <Button
              onPress={() => {
                setShowSuccess(false);
                goToFeed();
              }}
            >
              Go to Feed
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Text variant="headlineSmall" style={styles.title}>
        Send an offer
      </Text>
      {error ? (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Controller
        control={control}
        name="itemDescription"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Item description"
            mode="outlined"
            onBlur={onBlur}
            value={value}
            onChangeText={onChange}
            error={!!errors.itemDescription}
          />
        )}
      />
      {errors.itemDescription?.message ? (
        <HelperText type="error">{errors.itemDescription.message}</HelperText>
      ) : null}

      <View style={styles.section}>
        <Text variant="titleSmall">Condition</Text>
        <View style={styles.chips}>
          {['new', 'good', 'used'].map((opt) => (
            <Button
              key={opt}
              mode={opt === watch('condition') ? 'contained' : 'outlined'}
              onPress={() => setValue('condition', opt as FormValues['condition'])}
              compact
            >
              {opt}
            </Button>
          ))}
        </View>
        {errors.condition?.message ? (
          <HelperText type="error">{errors.condition.message}</HelperText>
        ) : null}
      </View>

      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Notes (optional)"
            mode="outlined"
            multiline
            onBlur={onBlur}
            value={value}
            onChangeText={onChange}
          />
        )}
      />

      <View style={styles.section}>
        <Text variant="titleSmall">Photo (optional)</Text>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.image} /> : null}
        <Button mode="outlined" onPress={pickImage}>
          {photoUri ? 'Change photo' : 'Add photo'}
        </Button>
      </View>

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        loading={isSubmitting}
      >
        Send Offer
      </Button>
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
  title: {
    fontWeight: '700',
  },
  section: {
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  error: {
    color: '#b91c1c',
  },
});

export default OfferCreateScreen;
