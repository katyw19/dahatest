import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../context/AuthContext';

const MIN_PASSWORD_LEN = 8;

const schema = z
  .object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(MIN_PASSWORD_LEN, `At least ${MIN_PASSWORD_LEN} characters`),
    confirmPassword: z.string().min(MIN_PASSWORD_LEN, `At least ${MIN_PASSWORD_LEN} characters`),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  });

type FormValues = z.infer<typeof schema>;

const SignUpScreen = () => {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const passwordValue = watch('password') ?? '';
  const confirmValue = watch('confirmPassword') ?? '';
  const passwordOk = passwordValue.length >= MIN_PASSWORD_LEN;
  const matchOk = passwordValue.length > 0 && passwordValue === confirmValue;

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setLoading(true);
    try {
      await signUp(values.email.trim(), values.password);
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 8 characters.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>Create account</Text>

        {/* Error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Fields */}
        <View style={styles.fields}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNTextInput
                placeholder="Email"
                placeholderTextColor="#A0A0A0"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                value={value}
                onChangeText={onChange}
                style={[
                  styles.input,
                  { borderColor: errors.email ? '#DC2626' : '#DBDBDB' },
                ]}
              />
            )}
          />

          <View style={[styles.passwordWrap, { borderColor: errors.password ? '#DC2626' : '#DBDBDB' }]}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <RNTextInput
                  placeholder="Password"
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry={!showPassword}
                  onBlur={onBlur}
                  value={value}
                  onChangeText={onChange}
                  style={styles.passwordInput}
                />
              )}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Text style={[styles.showBtn, { color: theme.colors.primary }]}>
                {showPassword ? 'hide' : 'show'}
              </Text>
            </Pressable>
          </View>

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNTextInput
                placeholder="Confirm password"
                placeholderTextColor="#A0A0A0"
                secureTextEntry={!showPassword}
                onBlur={onBlur}
                value={value}
                onChangeText={onChange}
                style={[
                  styles.input,
                  { borderColor: errors.confirmPassword ? '#DC2626' : '#DBDBDB' },
                ]}
              />
            )}
          />
        </View>

        {/* Requirements */}
        <View style={styles.reqList}>
          <Text style={[styles.reqText, { color: passwordOk ? '#34C759' : '#A0A0A0' }]}>
            {passwordOk ? '\u2713' : '\u2022'} At least {MIN_PASSWORD_LEN} characters
          </Text>
          <Text style={[styles.reqText, { color: matchOk ? '#34C759' : '#A0A0A0' }]}>
            {matchOk ? '\u2713' : '\u2022'} Passwords match
          </Text>
        </View>

        {/* Submit */}
        <Pressable
          onPress={() => {
            handleSubmit(onSubmit, () => setError('Please fix the highlighted fields.'))();
          }}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: loading
                ? `${theme.colors.primary}80`
                : pressed
                  ? `${theme.colors.primary}DD`
                  : theme.colors.primary,
            },
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {loading ? 'Creating account...' : 'Sign up'}
          </Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Sign in link */}
        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('SignIn')}>
            <Text style={[styles.bottomLink, { color: theme.colors.primary }]}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 14,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1C1C1E',
  },

  error: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },

  fields: {
    gap: 10,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1C1C1E',
    backgroundColor: '#FAFAFA',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingRight: 14,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1C1C1E',
  },
  showBtn: {
    fontSize: 13,
    fontWeight: '600',
  },

  reqList: {
    gap: 4,
    paddingHorizontal: 4,
  },
  reqText: {
    fontSize: 12,
    fontWeight: '500',
  },

  primaryBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DBDBDB',
  },
  dividerText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  bottomText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  bottomLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SignUpScreen;
