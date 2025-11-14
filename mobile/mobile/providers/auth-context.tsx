import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type AuthSignInOptions = {
  readonly correlationId?: string;
};

type AuthSuccess = {
  readonly success: true;
};

type AuthFailure = {
  readonly success: false;
  readonly errorMessage: string;
};

export type AuthResult = AuthSuccess | AuthFailure;

type AuthContextValue = {
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly signIn: (password: string, options?: AuthSignInOptions) => Promise<AuthResult>;
  readonly signOut: (options?: AuthSignInOptions) => Promise<void>;
};

const AUTH_FLAG_KEY = 'invitecode_admin_is_authenticated';
const AUTH_LOGIN_TIMESTAMP_KEY = 'invitecode_admin_login_timestamp';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const adminPassword = process.env.EXPO_PUBLIC_ADMIN_PASSWORD;

  useEffect(() => {
    let isMounted = true;

    const restoreAuthState = async () => {
      try {
        const isStorageAvailable = await SecureStore.isAvailableAsync();

        if (!isStorageAvailable) {
          console.warn('Secure storage unavailable. Authentication state will not persist across sessions.', {
            event: 'auth-storage-unavailable',
            platform: Platform.OS,
            timestamp: new Date().toISOString(),
          });
        }

        if (isStorageAvailable) {
          const storedFlag = await SecureStore.getItemAsync(AUTH_FLAG_KEY);

          if (storedFlag === 'true' && isMounted) {
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Failed to restore authentication state.', {
          event: 'auth-restore-failed',
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreAuthState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!adminPassword) {
      console.error('Missing EXPO_PUBLIC_ADMIN_PASSWORD environment variable.', {
        event: 'auth-configuration-missing',
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      });
    }
  }, [adminPassword]);

  const signIn = useCallback(
    async (password: string, options?: AuthSignInOptions): Promise<AuthResult> => {
      const correlationId = options?.correlationId ?? `auth-sign-in-${Date.now()}`;
      const context = {
        event: 'auth-sign-in-attempt',
        correlationId,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      };

      const trimmedPassword = password.trim();

      if (!adminPassword) {
        console.error('Authentication failed due to missing configuration.', context);
        return {
          success: false,
          errorMessage: 'Authentication is temporarily unavailable. Please contact support.',
        };
      }

      if (trimmedPassword.length === 0) {
        console.warn('Authentication attempt blocked: empty password provided.', context);
        return {
          success: false,
          errorMessage: 'Password is required.',
        };
      }

      if (trimmedPassword !== adminPassword) {
        console.warn('Authentication failed: invalid password provided.', context);
        return {
          success: false,
          errorMessage: 'Invalid password. Please try again.',
        };
      }

      try {
        const isStorageAvailable = await SecureStore.isAvailableAsync();

        if (isStorageAvailable) {
          await SecureStore.setItemAsync(AUTH_FLAG_KEY, 'true');
          await SecureStore.setItemAsync(AUTH_LOGIN_TIMESTAMP_KEY, new Date().toISOString());
        } else {
          console.warn('Secure storage unavailable. Authentication state will not persist across sessions.', {
            ...context,
            event: 'auth-storage-unavailable',
          });
        }

        setIsAuthenticated(true);

        console.info('Authentication successful.', {
          ...context,
          event: 'auth-sign-in-success',
        });

        return { success: true };
      } catch (error) {
        console.error('Failed to persist authentication state.', {
          ...context,
          event: 'auth-sign-in-persist-failed',
          error: error instanceof Error ? error.message : String(error),
        });
        setIsAuthenticated(false);
        return {
          success: false,
          errorMessage: 'Unable to sign in. Please try again.',
        };
      }
    },
    [adminPassword],
  );

  const signOut = useCallback(
    async (options?: AuthSignInOptions): Promise<void> => {
      const correlationId = options?.correlationId ?? `auth-sign-out-${Date.now()}`;
      const context = {
        event: 'auth-sign-out',
        correlationId,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      };

      try {
        const isStorageAvailable = await SecureStore.isAvailableAsync();

        if (isStorageAvailable) {
          await SecureStore.deleteItemAsync(AUTH_FLAG_KEY);
          await SecureStore.deleteItemAsync(AUTH_LOGIN_TIMESTAMP_KEY);
        } else {
          console.warn('Secure storage unavailable while signing out.', {
            ...context,
            event: 'auth-storage-unavailable',
          });
        }
      } catch (error) {
        console.error('Failed to clear authentication state.', {
          ...context,
          event: 'auth-sign-out-failed',
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsAuthenticated(false);
        console.info('User signed out.', {
          ...context,
          event: 'auth-sign-out-success',
        });
      }
    },
    [],
  );

  const value: AuthContextValue = {
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

