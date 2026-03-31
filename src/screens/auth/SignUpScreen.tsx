import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../context/AuthContext';
import { SPACING, RADIUS } from '../../theme/spacing';

const MIN_PASSWORD_LEN = 8;

const schema = z
  .object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(MIN_PASSWORD_LEN, `Password must be at least ${MIN_PASSWORD_LEN} characters`),
    confirmPassword: z.string().min(MIN_PASSWORD_LEN, `Password must be at least ${MIN_PASSWORD_LEN} characters`),
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
        setError('An account with this email already exists. Try signing in instead.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 8 characters.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.logoCircle, { backgroundColor: `${theme.colors.primary}15` }]}>
            <MaterialCommunityIcons name="account-plus" size={36} color={theme.colors.primary} />
          </View>
          <Text style={[styles.welcomeTitle, { color: '#1C1C1E' }]}>Create account</Text>
          <Text style={styles.welcomeSub}>Join the community</Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form card */}
        <View style={[styles.formCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onBlur={onBlur}
                  value={value}
                  onChangeText={onChange}
                  error={!!errors.email}
                  outlineColor={`${theme.colors.outline}40`}
                  activeOutlineColor={theme.colors.primary}
                  style={styles.input}
                  left={<TextInput.Icon icon="email-outline" size={18} />}
                />
              )}
            />
            {errors.email?.message ? (
              <Text style={styles.fieldError}>{errors.email.message}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  placeholder="At least 8 characters"
                  secureTextEntry={!showPassword}
                  onBlur={onBlur}
                  value={value}
                  onChangeText={onChange}
                  error={!!errors.password}
                  outlineColor={`${theme.colors.outline}40`}
                  activeOutlineColor={theme.colors.primary}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock-outline" size={18} />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              )}
            />
            <View style={styles.reqRow}>
              <MaterialCommunityIcons
                name={passwordOk ? 'check-circle' : 'circle-outline'}
                size={14}
                color={passwordOk ? '#34C759' : '#C7C7CC'}
              />
              <Text style={[styles.reqText, { color: passwordOk ? '#34C759' : '#8E8E93' }]}>
                At least {MIN_PASSWORD_LEN} characters
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  placeholder="Re-enter your password"
                  secureTextEntry={!showPassword}
                  onBlur={onBlur}
                  value={value}
                  onChangeText={onChange}
                  error={!!errors.confirmPassword}
                  outlineColor={`${theme.colors.outline}40`}
                  activeOutlineColor={theme.colors.primary}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock-check-outline" size={18} />}
                />
              )}
            />
            <View style={styles.reqRow}>
              <MaterialCommunityIcons
                name={matchOk ? 'check-circle' : 'circle-outline'}
                size={14}
                color={matchOk ? '#34C759' : '#C7C7CC'}
              />
              <Text style={[styles.reqText, { color: matchOk ? '#34C759' : '#8E8E93' }]}>
                Passwords match
              </Text>
            </View>
            {errors.confirmPassword?.message ? (
              <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>
            ) : null}
          </View>
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
            {loading ? 'Creating account...' : 'Create Account'}
          </Text>
        </Pressable>

        {/* Sign in link */}
        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('SignIn')}>
            <Text style={[styles.bottomLink, { color: theme.colors.primary }]}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: SPACING.xl,
    paddingTop: 40,
    gap: SPACING.md,
  },

  heroSection: {
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  welcomeSub: {
    fontSize: 15,
    color: '#8E8E93',
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

  formCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  fieldGroup: {
    gap: 6,
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
  fieldError: {
    color: '#DC2626',
    fontSize: 12,
  },

  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  reqText: {
    fontSize: 12,
    fontWeight: '500',
  },

  primaryBtn: {
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
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
