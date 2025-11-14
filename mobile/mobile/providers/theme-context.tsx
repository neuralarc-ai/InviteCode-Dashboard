import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  colorScheme: 'light' | 'dark';
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('theme');
        if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system')) {
          setThemeState(storedTheme as Theme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setMounted(true);
      }
    };

    loadTheme();
  }, []);

  // Update color scheme based on theme
  useEffect(() => {
    if (!mounted) return;

    // Update colorScheme synchronously when theme changes
    if (theme === 'system') {
      // Use system preference (would need react-native-appearance or similar)
      // For now, default to light
      setColorScheme('light');
    } else {
      setColorScheme(theme);
    }
  }, [theme, mounted]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    try {
      // Update state immediately for responsive UI
      setThemeState(newTheme);
      // Save to storage asynchronously
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
      // Revert on error
      try {
        const storedTheme = await AsyncStorage.getItem('theme');
        if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system')) {
          setThemeState(storedTheme as Theme);
        }
      } catch (revertError) {
        console.error('Error reverting theme:', revertError);
      }
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    // Toggle between light and dark (skip system for toggle)
    // Use current colorScheme to determine next theme
    const currentScheme = colorScheme;
    const newTheme: Theme = currentScheme === 'light' ? 'dark' : 'light';
    await setTheme(newTheme);
  }, [colorScheme]);

  const contextValue = useMemo(
    () => ({
      theme,
      colorScheme,
      setTheme,
      toggleTheme,
    }),
    [theme, colorScheme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

