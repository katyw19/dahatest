import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../context/AuthContext';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

const SignInScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await signIn(values.email, values.password);
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Incorrect email or password. Please try again.');
      } else if (code === 'auth/user-not-found') {
        setError('No account found with that email.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Sign in
      </Text>
      {error ? (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Email"
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
              error={!!errors.email}
            />
          )}
        />
        {errors.email?.message ? (
          <Text variant="bodySmall" style={styles.error}>
            {errors.email.message}
          </Text>
        ) : null}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Password"
              mode="outlined"
              secureTextEntry
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
              error={!!errors.password}
            />
          )}
        />
        {errors.password?.message ? (
          <Text variant="bodySmall" style={styles.error}>
            {errors.password.message}
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Sign In
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('SignUp')}
        >
          Create account
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          Forgot password?
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontWeight: '700',
  },
  form: {
    gap: 12,
  },
  error: {
    color: '#b91c1c',
  },
});

export default SignInScreen;
