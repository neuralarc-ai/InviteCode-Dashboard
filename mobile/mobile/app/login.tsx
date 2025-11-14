import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/providers/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen(): ReactElement {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, signIn } = useAuth();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [password, setPassword] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const correlationId = useMemo(() => `admin-login-${Date.now()}`, []);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  }, [errorMessage]);

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible((previous) => !previous);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || isAuthLoading) {
      return;
    }

    const trimmedPassword = password.trim();

    if (trimmedPassword.length === 0) {
      setErrorMessage('Password is required.');
      console.warn('Admin login attempt blocked: empty password', {
        correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await signIn(trimmedPassword, { correlationId });

      if (!result.success) {
        setErrorMessage(result.errorMessage);
        return;
      }

      router.replace('/dashboard');
    } catch (error) {
      console.error('Admin login failed', {
        correlationId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      setErrorMessage('Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [correlationId, isAuthLoading, isSubmitting, password, router, signIn]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
              <RemixIcon name="lock-fill" size={32} color={colors.iconAccentLight} />
            </View>
            <ThemedText type="subtitle" style={styles.title} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
              Admin Login
            </ThemedText>
            <ThemedText
              style={styles.subtitle}
              lightColor={colors.textSecondary}
              darkColor={colors.textSecondary}>
              Enter your password to access the dashboard
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText
                type="defaultSemiBold"
                style={styles.label}
                lightColor={colors.textPrimary}
                darkColor={colors.textPrimary}>
                Password
              </ThemedText>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <TextInput
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="Enter admin password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  accessibilityLabel="Admin password"
                  style={[styles.input, { color: colors.textPrimary }]}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                  editable={!isSubmitting && !isAuthLoading}
                />
                <Pressable
                  onPress={togglePasswordVisibility}
                  accessibilityRole="button"
                  accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                  hitSlop={12}
                  style={styles.visibilityToggle}>
                  <RemixIcon
                    name={isPasswordVisible ? 'eye-off-line' : 'eye-line'}
                    size={22}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {errorMessage ? (
              <ThemedText
                style={styles.errorText}
                lightColor={colors.error}
                darkColor={colors.error}
                accessibilityRole="alert">
                {errorMessage}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              accessibilityRole="button"
              accessibilityLabel="Sign in to admin dashboard"
              disabled={isSubmitting || isAuthLoading}
              style={({ pressed }) => [
                styles.signInButton,
                { backgroundColor: pressed ? colors.accentPressed : colors.accent },
                isSubmitting ? styles.signInButtonDisabled : null,
              ]}>
              {isSubmitting || isAuthLoading ? (
                <ActivityIndicator color={colors.iconAccentLight} />
              ) : (
                <ThemedText type="defaultSemiBold" style={styles.signInText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                  Sign In
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
    fontSize: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  visibilityToggle: {
    marginLeft: 8,
  },
  errorText: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  signInButton: {
    marginTop: 16,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInText: {
    fontSize: 17,
  },
});

