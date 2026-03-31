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

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

const SignInScreen = () => {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / welcome area */}
        <View style={styles.heroSection}>
          <View style={[styles.logoCircle, { backgroundColor: `${theme.colors.primary}15` }]}>
            <MaterialCommunityIcons name="hand-heart" size={36} color={theme.colors.primary} />
          </View>
          <Text style={[styles.welcomeTitle, { color: '#1C1C1E' }]}>Welcome back</Text>
          <Text style={styles.welcomeSub}>Sign in to your account</Text>
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
                  placeholder="Enter your password"
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
            {errors.password?.message ? (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotRow}
          >
            <Text style={[styles.forgotText, { color: theme.colors.primary }]}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Sign in button */}
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: isSubmitting
                ? `${theme.colors.primary}80`
                : pressed
                  ? `${theme.colors.primary}DD`
                  : theme.colors.primary,
            },
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Text>
        </Pressable>

        {/* Sign up link */}
        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Don't have an account?</Text>
          <Pressable onPress={() => navigation.navigate('SignUp')}>
            <Text style={[styles.bottomLink, { color: theme.colors.primary }]}>Sign Up</Text>
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
    paddingTop: 60,
    gap: SPACING.md,
  },

  heroSection: {
    alignItems: 'center',
    marginBottom: 12,
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

  forgotRow: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
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

export default SignInScreen;
