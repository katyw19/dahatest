import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/RootNavigator";
import { useAuth } from "../../context/AuthContext";

const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

type FormValues = z.infer<typeof schema>;

const MIN_PASSWORD_LEN = 8;

const SignUpScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signUp } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    mode: "onChange",
  });

  // Live values for inline requirements UI
  const passwordValue = watch("password") ?? "";
  const confirmValue = watch("confirmPassword") ?? "";
  const passwordOk = passwordValue.length >= MIN_PASSWORD_LEN;
  const confirmOk = confirmValue.length >= MIN_PASSWORD_LEN;
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

  const requirementStyle = (ok: boolean) => [
    styles.requirement,
    ok ? styles.requirementOk : styles.requirementMuted,
  ];

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Create account
      </Text>

      <Text variant="bodySmall" style={styles.subtle}>
        Requirements:
        {"\n"}• Use a valid email address
        {"\n"}• Password must be at least {MIN_PASSWORD_LEN} characters
        {"\n"}• Passwords must match
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
              right={
                <TextInput.Affix
                  text={`${Math.min(value.length, MIN_PASSWORD_LEN)}/${MIN_PASSWORD_LEN}`}
                />
              }
            />
          )}
        />
        {/* Always show requirement helper (not only errors) */}
        <Text variant="bodySmall" style={requirementStyle(passwordOk)}>
          • At least {MIN_PASSWORD_LEN} characters
        </Text>
        {errors.password?.message ? (
          <Text variant="bodySmall" style={styles.error}>
            {errors.password.message}
          </Text>
        ) : null}

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Confirm password"
              mode="outlined"
              secureTextEntry
              onBlur={onBlur}
              value={value}
              onChangeText={onChange}
              error={!!errors.confirmPassword}
            />
          )}
        />
        <Text variant="bodySmall" style={requirementStyle(confirmOk)}>
          • Confirm password is at least {MIN_PASSWORD_LEN} characters
        </Text>
        <Text variant="bodySmall" style={requirementStyle(matchOk)}>
          • Passwords match
        </Text>
        {errors.confirmPassword?.message ? (
          <Text variant="bodySmall" style={styles.error}>
            {errors.confirmPassword.message}
          </Text>
        ) : null}

        {/* Keep your debug-style submit wrapper (works + shows why it fails) */}
        <Button
          mode="contained"
          onPress={() => {
            handleSubmit(
              async (values) => {
                await onSubmit(values);
              },
              () => {
                setError("Please fix the highlighted fields.");
              }
            )();
          }}
          disabled={loading}
          loading={loading}
        >
          Create Account
        </Button>

        <Button
          mode="text"
          disabled={loading}
          onPress={() => navigation.navigate("SignIn")}
        >
          Already have an account? Sign in
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
    fontWeight: "700",
  },
  subtle: {
    color: "#6b7280",
    lineHeight: 18,
  },
  form: {
    gap: 12,
  },
  error: {
    color: "#b91c1c",
  },
  requirement: {
    marginTop: -6,
    lineHeight: 16,
  },
  requirementMuted: {
    color: "#6b7280",
  },
  requirementOk: {
    color: "#15803d",
  },
});

export default SignUpScreen;
